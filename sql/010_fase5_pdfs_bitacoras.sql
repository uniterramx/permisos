-- =====================================================================
-- Permisos UT · 010 · Fase 5 (bitacoras, PDFs guardados y espacio)
-- Pegar COMPLETO en Supabase > SQL Editor > New query > Run.
-- Se puede correr dos veces sin romper nada. Correr DESPUES del 009.
-- =====================================================================

-- ---------- Bitacoras (solo las CERRADAS viven aqui; la activa = movimientos del banco sin estampa) ----------
do $$ begin create type public.motivo_cierre as enum ('15_movimientos','manual');
exception when duplicate_object then null; end $$;

create table if not exists public.bitacoras (
  id             uuid primary key default gen_random_uuid(),
  folio          text not null unique,            -- B-INI-AAAA-NNNN (prueba: PRUEBA-B-INI-NN)
  empleado_id    uuid not null references public.empleados(id),
  anio           int not null,                    -- año del primer movimiento del lote
  es_prueba      boolean not null default false,
  saldo_anterior numeric(7,2),                    -- null = no hereda ("—")
  saldo_final    numeric(7,2) not null,
  movimientos    int not null,
  motivo         public.motivo_cierre not null,
  cerrada_por    uuid references public.empleados(id),
  cerrada_at     timestamptz not null default now()
);
create index if not exists bitacoras_empleado on public.bitacoras (empleado_id, cerrada_at);
alter table public.bitacoras enable row level security;
revoke insert, update, delete on public.bitacoras from anon, authenticated;

do $$ begin
  alter table public.movimientos add constraint movimientos_bitacora_fk foreign key (bitacora_id) references public.bitacoras(id);
exception when duplicate_object then null; end $$;

alter table public.avisos add column if not exists bitacora_id uuid references public.bitacoras(id);

-- El candado de movimientos ahora deja poner la "estampa" UNA vez (solo eso, solo desde el cierre)
create or replace function public._movimientos_candado()
returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('ut.borrando_pruebas', true), '') = '1' and old.es_prueba then return old; end if;
  if tg_op = 'UPDATE' and coalesce(current_setting('ut.estampando', true), '') = '1'
     and old.bitacora_id is null and new.bitacora_id is not null
     and (to_jsonb(new) - 'bitacora_id') = (to_jsonb(old) - 'bitacora_id') then
    return new;
  end if;
  raise exception 'Los movimientos del banco no se editan ni se borran: se corrigen con un ajuste';
end $$;

-- ---------- Quien ve que ----------
-- Prueba: solo admin. Real: el empleado, Gaby, Laura, admin y el jefe de su area (como el banco).
create or replace function public.puedo_ver_bitacora(b public.bitacoras)
returns boolean language sql stable security definer set search_path = public as $$
  select case when b.es_prueba then public.tengo_rol('admin')
    else b.empleado_id = public.mi_empleado_id()
      or public.tengo_rol('admin') or public.tengo_rol('filtro') or public.tengo_rol('final')
      or exists (select 1 from public.empleados e join public.jefes_area j on j.area_id = e.area_id
                 where e.id = b.empleado_id and j.jefe_id = public.mi_empleado_id())
    end;
$$;
drop policy if exists bitacoras_leer on public.bitacoras;
create policy bitacoras_leer on public.bitacoras for select to authenticated using (public.puedo_ver_bitacora(bitacoras));

-- ---------- Folio y saldo anterior de la siguiente bitacora de una persona ----------
create or replace function public._siguiente_bitacora(p_emp uuid, p_prueba boolean)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_ini text; v_anio int; v_n int; v_prev numeric; v_folio text; v_primero timestamptz;
begin
  v_ini := (select iniciales from public.empleados where id = p_emp);
  v_primero := (select min(registrado_at) from public.movimientos
   where empleado_id = p_emp and cuenta = 'banco' and bitacora_id is null and es_prueba = p_prueba);
  v_anio := extract(year from coalesce(v_primero, now()) at time zone 'America/Mexico_City');
  -- saldo con que cerro la anterior (null si no hay anterior)
  v_prev := (select saldo_final from public.bitacoras where empleado_id = p_emp and es_prueba = p_prueba
   order by cerrada_at desc, folio desc limit 1);
  if p_prueba then
    v_n := (select count(*) + 1 from public.bitacoras where empleado_id = p_emp and es_prueba);
    v_folio := 'PRUEBA-B-' || v_ini || '-' || lpad(v_n::text, 2, '0');
  else
    v_n := (select coalesce(max(substring(folio from '-([0-9]+)$')::int), 0) + 1
      from public.bitacoras where empleado_id = p_emp and anio = v_anio and not es_prueba);
    v_folio := 'B-' || v_ini || '-' || v_anio || '-' || lpad(v_n::text, 4, '0');
  end if;
  return json_build_object('folio', v_folio, 'anio', v_anio,
    'saldo_anterior', case when v_prev is null or v_prev = 0 then null else v_prev end);
end $$;

-- Lo que la app necesita para imprimir la bitacora activa (folio provisional, año, saldo anterior)
create or replace function public.bitacora_activa(p_empleado uuid, p_prueba boolean default false)
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if p_prueba and not public.tengo_rol('admin') then raise exception 'No encontre esa bitacora'; end if;
  if not p_prueba and not (p_empleado = public.mi_empleado_id() or public.tengo_rol('admin') or public.tengo_rol('filtro')
     or public.tengo_rol('final') or exists (select 1 from public.empleados e join public.jefes_area j on j.area_id = e.area_id
        where e.id = p_empleado and j.jefe_id = public.mi_empleado_id())) then
    raise exception 'No encontre esa bitacora';
  end if;
  return public._siguiente_bitacora(p_empleado, p_prueba);
end $$;

-- ---------- Cerrar el lote activo (a los 15 movimientos, o a mano) ----------
create or replace function public._cerrar_bitacora(p_emp uuid, p_prueba boolean, p_motivo public.motivo_cierre)
returns public.bitacoras language plpgsql security definer set search_path = public as $$
declare
  v_sig json; v_n int; v_suma numeric; v_ant numeric; b public.bitacoras%rowtype; v_emp text; g record; v_id uuid := gen_random_uuid();
begin
  perform pg_advisory_xact_lock(hashtext('bitacora-' || p_emp::text || p_prueba::text));
  v_n := (select count(*) from public.movimientos
   where empleado_id = p_emp and cuenta = 'banco' and bitacora_id is null and es_prueba = p_prueba);
  v_suma := (select coalesce(sum(horas), 0) from public.movimientos
   where empleado_id = p_emp and cuenta = 'banco' and bitacora_id is null and es_prueba = p_prueba);
  if p_motivo = '15_movimientos' and v_n < 15 then return null; end if;  -- otra transaccion ya la cerro
  if v_n = 0 then raise exception 'No hay movimientos nuevos para cerrar la bitacora'; end if;
  v_sig := public._siguiente_bitacora(p_emp, p_prueba);
  v_ant := nullif(v_sig->>'saldo_anterior', '')::numeric;
  insert into public.bitacoras (id, folio, empleado_id, anio, es_prueba, saldo_anterior, saldo_final, movimientos, motivo, cerrada_por)
  values (v_id, v_sig->>'folio', p_emp, (v_sig->>'anio')::int, p_prueba, v_ant, coalesce(v_ant, 0) + v_suma, v_n, p_motivo, public.mi_empleado_id());
  b := (select x from public.bitacoras x where x.id = v_id);
  perform set_config('ut.estampando', '1', true);
  update public.movimientos set bitacora_id = b.id
   where empleado_id = p_emp and cuenta = 'banco' and bitacora_id is null and es_prueba = p_prueba;
  perform set_config('ut.estampando', '', true);
  -- Al cerrarse sola: aviso a Gaby para imprimirla y recoger la firma (P6). La de prueba: aviso a quien la cerro.
  if p_motivo = '15_movimientos' then
    v_emp := (select coalesce(nombre_corto, nombre_oficial) from public.empleados where id = p_emp);
    if p_prueba then
      if public.mi_empleado_id() is not null then
        insert into public.avisos (para, texto, es_prueba, bitacora_id)
        values (public.mi_empleado_id(), 'Se cerró la bitácora ' || b.folio || ' de ' || v_emp || ' (15 movimientos). Imprímela y recoge su firma.', true, b.id);
      end if;
    else
      for g in select e.id from public.empleados e where e.activo and 'filtro' = any(e.roles) and not e.decide_solo_pruebas loop
        insert into public.avisos (para, texto, bitacora_id)
        values (g.id, 'Se cerró la bitácora ' || b.folio || ' de ' || v_emp || ' (15 movimientos). Imprímela y recoge su firma.', b.id);
      end loop;
    end if;
  end if;
  return b;
end $$;

-- Se cierra sola al llegar a 15 movimientos sin estampa
create or replace function public._bitacora_al_insertar()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.cuenta = 'banco' and (select count(*) from public.movimientos
       where empleado_id = new.empleado_id and cuenta = 'banco' and bitacora_id is null and es_prueba = new.es_prueba) >= 15 then
    perform public._cerrar_bitacora(new.empleado_id, new.es_prueba, '15_movimientos');
  end if;
  return null;
end $$;
drop trigger if exists movimientos_bitacora on public.movimientos;
create trigger movimientos_bitacora after insert on public.movimientos
for each row execute function public._bitacora_al_insertar();

-- Gaby la cierra a mano (fin de año, alguien que se va...). Valen solo cierra las de prueba.
create or replace function public.cerrar_bitacora(p_empleado uuid)
returns json language plpgsql security definer set search_path = public as $$
declare v_prueba boolean; b public.bitacoras%rowtype;
begin
  if not public.tengo_rol('filtro') then raise exception 'Solo Gaby puede cerrar una bitacora a mano'; end if;
  v_prueba := exists (select 1 from public.empleados e where e.id = public.mi_empleado_id() and e.decide_solo_pruebas);
  b := public._cerrar_bitacora(p_empleado, v_prueba, 'manual');
  return json_build_object('id', b.id, 'folio', b.folio, 'movimientos', b.movimientos, 'prueba', v_prueba);
end $$;

-- ---------- PDFs guardados (Storage, bucket privado "pdfs") ----------
create table if not exists public.documentos (
  id           bigserial primary key,
  tipo         text not null check (tipo in ('solicitud','bitacora')),
  solicitud_id uuid unique references public.solicitudes(id),
  bitacora_id  uuid unique references public.bitacoras(id),
  ruta         text not null unique,
  bytes        int not null default 0,
  con_logo     boolean not null default false,
  es_prueba    boolean not null default false,
  generado_por uuid references public.empleados(id),
  generado_at  timestamptz not null default now(),
  check ((tipo = 'solicitud' and solicitud_id is not null and bitacora_id is null)
      or (tipo = 'bitacora' and bitacora_id is not null and solicitud_id is null))
);
alter table public.documentos enable row level security;
revoke insert, update, delete on public.documentos from anon, authenticated;

-- Ruta esperada de cada PDF (solo el folio; las de prueba en "pruebas/")
create or replace function public._ruta_pdf(p_tipo text, p_folio text, p_prueba boolean)
returns text language sql immutable as $$
  select case when p_prueba then 'pruebas/' else '' end || case p_tipo when 'solicitud' then 'solicitudes/' else 'bitacoras/' end || p_folio || '.pdf';
$$;

-- Quien descarga (P5a: el empleado, Gaby y Laura; + admin). Los jefes no.
create or replace function public.puedo_leer_pdf(p_ruta text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.solicitudes s
                 where public._ruta_pdf('solicitud', s.folio, s.es_prueba) = p_ruta
                   and case when s.es_prueba then public.tengo_rol('admin')
                       else s.empleado_id = public.mi_empleado_id() or public.tengo_rol('filtro') or public.tengo_rol('final') or public.tengo_rol('admin') end)
      or exists (select 1 from public.bitacoras b
                 where public._ruta_pdf('bitacora', b.folio, b.es_prueba) = p_ruta
                   and case when b.es_prueba then public.tengo_rol('admin')
                       else b.empleado_id = public.mi_empleado_id() or public.tengo_rol('filtro') or public.tengo_rol('final') or public.tengo_rol('admin') end);
$$;

-- Quien guarda: Gaby, Laura o admin, y solo lo que ya quedo congelado (solicitud aprobada por Laura / bitacora cerrada)
create or replace function public.puedo_subir_pdf(p_ruta text)
returns boolean language sql stable security definer set search_path = public as $$
  select (public.tengo_rol('filtro') or public.tengo_rol('final') or public.tengo_rol('admin'))
    and (exists (select 1 from public.solicitudes s where s.congelada
                 and public._ruta_pdf('solicitud', s.folio, s.es_prueba) = p_ruta and (not s.es_prueba or public.tengo_rol('admin')))
      or exists (select 1 from public.bitacoras b
                 where public._ruta_pdf('bitacora', b.folio, b.es_prueba) = p_ruta and (not b.es_prueba or public.tengo_rol('admin'))));
$$;

drop policy if exists documentos_leer on public.documentos;
create policy documentos_leer on public.documentos for select to authenticated using (public.puedo_leer_pdf(ruta));

insert into storage.buckets (id, name, public) values ('pdfs', 'pdfs', false) on conflict (id) do nothing;
drop policy if exists "pdfs leer" on storage.objects;
create policy "pdfs leer" on storage.objects for select to authenticated
  using (bucket_id = 'pdfs' and public.puedo_leer_pdf(name));
drop policy if exists "pdfs subir" on storage.objects;
create policy "pdfs subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'pdfs' and public.puedo_subir_pdf(name));
-- Nada se reemplaza ni se borra (lo impreso queda congelado), salvo las pruebas (admin)
drop policy if exists "pdfs borrar pruebas" on storage.objects;
create policy "pdfs borrar pruebas" on storage.objects for delete to authenticated
  using (bucket_id = 'pdfs' and name like 'pruebas/%' and public.tengo_rol('admin'));

-- Registrar un PDF ya subido (el tamaño se toma de Storage)
create or replace function public.registrar_pdf(p_tipo text, p_id uuid, p_con_logo boolean)
returns json language plpgsql security definer set search_path = public as $$
declare v_folio text; v_prueba boolean; v_ruta text; v_bytes int; v_nuevo boolean;
begin
  if p_tipo = 'solicitud' then
    v_folio := (select folio from public.solicitudes where id = p_id);
    v_prueba := (select es_prueba from public.solicitudes where id = p_id);
  elsif p_tipo = 'bitacora' then
    v_folio := (select folio from public.bitacoras where id = p_id);
    v_prueba := (select es_prueba from public.bitacoras where id = p_id);
  else raise exception 'Tipo de PDF no valido'; end if;
  if v_folio is null then raise exception 'No encontre ese folio'; end if;
  v_ruta := public._ruta_pdf(p_tipo, v_folio, v_prueba);
  if not public.puedo_subir_pdf(v_ruta) then raise exception 'No puedes guardar el PDF de %', v_folio; end if;
  v_bytes := (select (metadata->>'size')::int from storage.objects where bucket_id = 'pdfs' and name = v_ruta);
  if v_bytes is null then raise exception 'El PDF de % no llego a Storage', v_folio; end if;
  v_nuevo := not exists (select 1 from public.documentos where ruta = v_ruta);
  insert into public.documentos (tipo, solicitud_id, bitacora_id, ruta, bytes, con_logo, es_prueba, generado_por)
  values (p_tipo, case when p_tipo = 'solicitud' then p_id end, case when p_tipo = 'bitacora' then p_id end,
          v_ruta, v_bytes, coalesce(p_con_logo, false), v_prueba, public.mi_empleado_id())
  on conflict (ruta) do nothing;
  return json_build_object('ruta', v_ruta, 'nuevo', v_nuevo);
end $$;

-- Espacio usado en Storage (plan gratis: 1 GB). Lo ven Gaby, Laura y admin.
create or replace function public.espacio_pdfs()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.tengo_rol('filtro') or public.tengo_rol('final') or public.tengo_rol('admin')) then raise exception 'No tienes acceso'; end if;
  return (select json_build_object('archivos', count(*), 'bytes', coalesce(sum((metadata->>'size')::bigint), 0), 'limite', 1073741824)
          from storage.objects where bucket_id = 'pdfs');
end $$;

-- ---------- Borrar pruebas: ahora tambien bitacoras y registros de PDFs de prueba ----------
-- (los archivos de prueba los borra la app de Storage antes de llamar a esto)
create or replace function public.borrar_pruebas(p_confirmar boolean default false)
returns json language plpgsql security definer set search_path = public as $$
declare v_sol int; v_mov int; v_bit int; v_doc int;
begin
  if not public.tengo_rol('admin') then raise exception 'Solo un administrador puede borrar pruebas'; end if;
  v_sol := (select count(*) from public.solicitudes where es_prueba);
  v_mov := (select count(*) from public.movimientos where es_prueba);
  v_bit := (select count(*) from public.bitacoras where es_prueba);
  v_doc := (select count(*) from public.documentos where es_prueba);
  if not p_confirmar then return json_build_object('solicitudes', v_sol, 'movimientos', v_mov, 'bitacoras', v_bit, 'pdfs', v_doc, 'borrado', false); end if;
  perform set_config('ut.borrando_pruebas', '1', true);
  delete from public.documentos where es_prueba;
  delete from public.avisos where es_prueba;
  delete from public.movimientos where es_prueba and revierte_a is not null;
  delete from public.movimientos where es_prueba;
  delete from public.bitacoras where es_prueba;
  delete from public.decision_eventos where solicitud_id in (select id from public.solicitudes where es_prueba);
  delete from public.decisiones where solicitud_id in (select id from public.solicitudes where es_prueba);
  update public.solicitudes set corregida_por = null, corrige_a = null where es_prueba;
  delete from public.solicitudes where es_prueba;
  perform set_config('ut.borrando_pruebas', '', true);
  return json_build_object('solicitudes', v_sol, 'movimientos', v_mov, 'bitacoras', v_bit, 'pdfs', v_doc, 'borrado', true);
end $$;

-- ---------- Permisos ----------
revoke all on function public._siguiente_bitacora(uuid, boolean) from public, anon, authenticated;
revoke all on function public._cerrar_bitacora(uuid, boolean, public.motivo_cierre) from public, anon, authenticated;
revoke all on function public._bitacora_al_insertar() from public, anon, authenticated;
revoke all on function public.puedo_ver_bitacora(public.bitacoras) from public, anon;
revoke all on function public.bitacora_activa(uuid, boolean) from public, anon;
revoke all on function public.cerrar_bitacora(uuid) from public, anon;
revoke all on function public.puedo_leer_pdf(text) from public, anon;
revoke all on function public.puedo_subir_pdf(text) from public, anon;
revoke all on function public.registrar_pdf(text, uuid, boolean) from public, anon;
revoke all on function public.espacio_pdfs() from public, anon;
grant execute on function public.puedo_ver_bitacora(public.bitacoras) to authenticated;
grant execute on function public.bitacora_activa(uuid, boolean) to authenticated;
grant execute on function public.cerrar_bitacora(uuid) to authenticated;
grant execute on function public.puedo_leer_pdf(text) to authenticated;
grant execute on function public.puedo_subir_pdf(text) to authenticated;
grant execute on function public.registrar_pdf(text, uuid, boolean) to authenticated;
grant execute on function public.espacio_pdfs() to authenticated;

-- Comprobacion: debe salir 1 renglon con "si" en todo.
select case when exists (select 1 from pg_class where relname = 'bitacoras') then 'si' else 'no' end as bitacoras,
       case when exists (select 1 from pg_class where relname = 'documentos') then 'si' else 'no' end as documentos,
       case when exists (select 1 from storage.buckets where id = 'pdfs') then 'si' else 'no' end as carpeta_pdfs;
