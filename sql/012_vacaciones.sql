-- =====================================================================
-- Permisos UT · 012 · Vacaciones y dias festivos
-- Pegar COMPLETO en Supabase > SQL Editor > New query > Run.
-- Se puede correr dos veces sin romper nada. Correr DESPUES del 011.
--
-- Reglas (07 RESPUESTAS, 26-oct):
--  · Cuentan solo dias habiles L-V; los festivos no.
--  · Cada aniversario tocan los dias de ley segun los años cumplidos; se toman dentro del
--    año laboral (aniversario a aniversario) y NO se acumulan (lo que sobra se vence).
--    Si alguien quedo en negativo por una excepcion, se le descuenta de su siguiente año.
--  · Paso 1 "Pedir vacaciones": va directo a Laura, sin formato; si aprueba, los dias quedan apartados.
--  · Paso 2 "Falte a cuenta de vacaciones" (el formato de siempre): al aprobarlo Laura se
--    descuentan los dias reales y lo apartado que no se uso se libera.
--  · Pavel no lleva conteo.
-- =====================================================================

-- ---------- Empleados: fecha de ingreso y si lleva vacaciones ----------
alter table public.empleados add column if not exists fecha_ingreso date;
alter table public.empleados add column if not exists lleva_vacaciones boolean not null default true;
update public.empleados set lleva_vacaciones = false where iniciales = 'PMR' and lleva_vacaciones;

-- ---------- Tabla de ley (Vacaciones Dignas) ----------
create table if not exists public.vac_ley (anios_desde int primary key, dias int not null);
insert into public.vac_ley (anios_desde, dias) values
  (1, 12), (2, 14), (3, 16), (4, 18), (5, 20), (6, 22), (11, 24), (16, 26), (21, 28), (26, 30)
on conflict (anios_desde) do nothing;
alter table public.vac_ley enable row level security;
drop policy if exists vac_ley_leer on public.vac_ley;
create policy vac_ley_leer on public.vac_ley for select to authenticated using (true);
revoke insert, update, delete on public.vac_ley from anon, authenticated;

-- ---------- Dias festivos (los cargan Gaby y Valen; los ven todos) ----------
create table if not exists public.festivos (
  id         uuid primary key default gen_random_uuid(),
  fecha      date not null unique,
  nombre     text not null,
  origen     text not null default 'uniterra' check (origen in ('ley', 'uniterra')),
  creado_por uuid references public.empleados(id),
  creado_at  timestamptz not null default now()
);
alter table public.festivos enable row level security;
drop policy if exists festivos_leer on public.festivos;
create policy festivos_leer on public.festivos for select to authenticated using (true);
revoke insert, update, delete on public.festivos from anon, authenticated;
drop trigger if exists festivos_cambios on public.festivos;
create trigger festivos_cambios after insert or update or delete on public.festivos for each row execute function public._registrar_cambio();

-- ---------- Paso 1: vacaciones pedidas (apartadas cuando Laura aprueba) ----------
create table if not exists public.vac_pedidos (
  id           uuid primary key default gen_random_uuid(),
  empleado_id  uuid not null references public.empleados(id),
  fecha_inicio date not null,
  fecha_fin    date not null,
  dias         numeric(5,1) not null,          -- habiles al pedirlas (informativo)
  excepcion    boolean not null default false, -- pidio mas dias de los que tenia
  hablado_con  text check (hablado_con in ('laura', 'gaby', 'jefe')),
  motivo       text,
  estado       text not null default 'espera_laura' check (estado in ('espera_laura', 'aprobada', 'rechazada', 'cancelada', 'usada')),
  comentario   text,
  decidido_por uuid references public.empleados(id),
  decidido_at  timestamptz,
  usada_en     uuid references public.solicitudes(id),
  es_prueba    boolean not null default false,
  creado_por   uuid references public.empleados(id),
  creado_at    timestamptz not null default now(),
  check (fecha_fin >= fecha_inicio)
);
create index if not exists vac_pedidos_empleado on public.vac_pedidos (empleado_id, fecha_inicio);
alter table public.vac_pedidos enable row level security;
revoke insert, update, delete on public.vac_pedidos from anon, authenticated;
drop trigger if exists vac_pedidos_cambios on public.vac_pedidos;
create trigger vac_pedidos_cambios after insert or update or delete on public.vac_pedidos for each row execute function public._registrar_cambio();

-- ---------- Movimientos de dias (append-only: se corrigen con reverso o ajuste) ----------
create table if not exists public.vac_movimientos (
  id             bigserial primary key,
  empleado_id    uuid not null references public.empleados(id),
  tipo           text not null check (tipo in ('inicial', 'tomadas', 'reverso', 'ajuste')),
  dias           numeric(5,1) not null,          -- con signo: + suma, - resta
  fecha          date not null,                  -- decide a que año laboral pertenece
  solicitud_id   uuid references public.solicitudes(id),
  referencia     text,
  revierte_a     bigint references public.vac_movimientos(id),
  es_prueba      boolean not null default false,
  registrado_por uuid references public.empleados(id),
  registrado_at  timestamptz not null default now()
);
create index if not exists vac_movimientos_empleado on public.vac_movimientos (empleado_id, id);
alter table public.vac_movimientos enable row level security;
revoke insert, update, delete on public.vac_movimientos from anon, authenticated;

create or replace function public._vac_movimientos_candado()
returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('ut.borrando_pruebas', true), '') = '1' and old.es_prueba then return old; end if;
  raise exception 'Los movimientos de vacaciones no se editan ni se borran: se corrigen con un ajuste';
end $$;
drop trigger if exists vac_movimientos_candado on public.vac_movimientos;
create trigger vac_movimientos_candado before update or delete on public.vac_movimientos
for each row execute function public._vac_movimientos_candado();

-- ---------- Formato (paso 2): con que vacaciones se liga y si fue excepcion ----------
alter table public.solicitudes add column if not exists vac_pedido_id   uuid references public.vac_pedidos(id);
alter table public.solicitudes add column if not exists vac_excepcion   boolean not null default false;
alter table public.solicitudes add column if not exists vac_hablado_con text;
alter table public.solicitudes add column if not exists vac_motivo      text;
alter table public.solicitudes add column if not exists vac_dias        numeric(5,1);

-- ---------- Quien ve que ----------
-- Prueba: solo admin. Real: la persona, el jefe de su area, Gaby, Laura y admin.
create or replace function public.puedo_ver_vac(p_emp uuid, p_prueba boolean)
returns boolean language sql stable security definer set search_path = public as $$
  select case when p_prueba then public.tengo_rol('admin')
    else p_emp = public.mi_empleado_id()
      or public.tengo_rol('admin') or public.tengo_rol('filtro') or public.tengo_rol('final')
      or exists (select 1 from public.empleados e join public.jefes_area j on j.area_id = e.area_id
                 where e.id = p_emp and j.jefe_id = public.mi_empleado_id())
    end;
$$;
drop policy if exists vac_pedidos_leer on public.vac_pedidos;
create policy vac_pedidos_leer on public.vac_pedidos for select to authenticated using (public.puedo_ver_vac(empleado_id, es_prueba));
drop policy if exists vac_movimientos_leer on public.vac_movimientos;
create policy vac_movimientos_leer on public.vac_movimientos for select to authenticated using (public.puedo_ver_vac(empleado_id, es_prueba));

-- ---------- Calculos base ----------
-- Hoy en Guadalajara
create or replace function public._hoy_mx()
returns date language sql stable as $$ select (now() at time zone 'America/Mexico_City')::date $$;

-- Dias de ley para k años cumplidos (0 antes del primer año)
create or replace function public._vac_ley(k int)
returns int language sql stable security definer set search_path = public as $$
  select case when k < 1 then 0 else coalesce((select l.dias from public.vac_ley l where l.anios_desde <= k order by l.anios_desde desc limit 1), 0) end;
$$;

-- Año laboral de una fecha: años cumplidos ese dia (0 = antes del primer aniversario)
create or replace function public._vac_anio(p_ing date, p_f date)
returns int language sql immutable as $$
  select case when p_ing is null or p_f < p_ing then 0 else extract(year from age(p_f, p_ing))::int end;
$$;

-- Dias habiles (L-V sin festivos) entre dos fechas, inclusive
create or replace function public._vac_habiles(p_ini date, p_fin date)
returns table (dia date) language sql stable security definer set search_path = public as $$
  select g::date from generate_series(p_ini, p_fin, interval '1 day') g
  where extract(isodow from g) < 6 and not exists (select 1 from public.festivos f where f.fecha = g::date)
  order by 1;
$$;

-- Saldo por año laboral de una persona.
--  base: si en ese año hay "inicial" (lo que dio Gaby al arrancar) manda ese numero; si no, los dias
--        de ley mas el negativo que arrastre del año anterior (prestamo). Lo positivo no se arrastra.
--  movs: tomadas, reversos y ajustes de ese año. final = base + movs.
--  apartados: dias de vacaciones aprobadas (paso 1) que todavia no se usan; en_espera: las que esperan a Laura.
--  Se incluyen pruebas solo si quien pregunta es admin y no pidio verlas sin pruebas.
create or replace function public._vac_anios(p_emp uuid, p_sin_pruebas boolean default false, p_hasta int default null)
returns table (k int, desde date, hasta date, ley int, base numeric, movs numeric, final numeric,
               apartados numeric, en_espera numeric, tiene_inicial boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_ing date := (select e.fecha_ingreso from public.empleados e where e.id = p_emp);
  v_pr boolean := public.tengo_rol('admin') and not p_sin_pruebas;
  v_hoy int; v_ini int; v_max int; i int; v_prev numeric := null; v_tiene boolean; v_base numeric; v_movs numeric;
begin
  if v_ing is null then return; end if;
  v_hoy := public._vac_anio(v_ing, public._hoy_mx());
  v_ini := coalesce((select min(public._vac_anio(v_ing, m.fecha)) from public.vac_movimientos m
                     where m.empleado_id = p_emp and m.tipo = 'inicial' and (v_pr or not m.es_prueba)), 0);
  v_max := greatest(v_hoy,
    coalesce((select max(public._vac_anio(v_ing, m.fecha)) from public.vac_movimientos m where m.empleado_id = p_emp), 0),
    coalesce((select max(public._vac_anio(v_ing, p.fecha_fin)) from public.vac_pedidos p
              where p.empleado_id = p_emp and p.estado in ('espera_laura', 'aprobada')), 0),
    coalesce(p_hasta, 0));
  i := v_ini;
  while i <= v_max loop
    v_tiene := exists (select 1 from public.vac_movimientos m where m.empleado_id = p_emp and m.tipo = 'inicial'
                       and (v_pr or not m.es_prueba) and public._vac_anio(v_ing, m.fecha) = i);
    if v_tiene then
      v_base := (select coalesce(sum(m.dias), 0) from public.vac_movimientos m where m.empleado_id = p_emp and m.tipo = 'inicial'
                 and (v_pr or not m.es_prueba) and public._vac_anio(v_ing, m.fecha) = i);
    else
      v_base := public._vac_ley(i) + least(0, coalesce(v_prev, 0));
    end if;
    v_movs := (select coalesce(sum(m.dias), 0) from public.vac_movimientos m where m.empleado_id = p_emp and m.tipo <> 'inicial'
               and (v_pr or not m.es_prueba) and public._vac_anio(v_ing, m.fecha) = i);
    k := i;
    desde := (v_ing + make_interval(years => i))::date;
    hasta := (v_ing + make_interval(years => i + 1))::date - 1;
    ley := public._vac_ley(i);
    base := v_base; movs := v_movs; final := v_base + v_movs; tiene_inicial := v_tiene;
    apartados := (select count(*) from public.vac_pedidos p, public._vac_habiles(p.fecha_inicio, p.fecha_fin) h
                  where p.empleado_id = p_emp and p.estado = 'aprobada' and (v_pr or not p.es_prueba)
                    and public._vac_anio(v_ing, h.dia) = i);
    en_espera := (select count(*) from public.vac_pedidos p, public._vac_habiles(p.fecha_inicio, p.fecha_fin) h
                  where p.empleado_id = p_emp and p.estado = 'espera_laura' and (v_pr or not p.es_prueba)
                    and public._vac_anio(v_ing, h.dia) = i);
    return next;
    v_prev := v_base + v_movs;
    i := i + 1;
  end loop;
end $$;

-- Vista previa de unas fechas: cuantos dias habiles, de que año salen y si alcanzan.
-- p_excluir: el pedido que no se cuenta como comprometido (el que se esta revisando o el que se usa).
create or replace function public.vac_preview(p_emp uuid, p_ini date, p_fin date, p_excluir uuid default null, p_sin_pruebas boolean default false)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_ing date := (select e.fecha_ingreso from public.empleados e where e.id = p_emp);
  v_pr boolean := public.tengo_rol('admin') and not p_sin_pruebas;
begin
  if not public.puedo_ver_vac(p_emp, false) then raise exception 'No puedes ver las vacaciones de esa persona'; end if;
  if p_ini is null or p_fin is null or p_fin < p_ini then raise exception 'Revisa las fechas'; end if;
  if p_fin - p_ini > 120 then raise exception 'Son demasiados dias: pide hasta 4 meses a la vez'; end if;
  return (
    with dias as (select h.dia, public._vac_anio(v_ing, h.dia) k from public._vac_habiles(p_ini, p_fin) h),
    fest as (select f.fecha, f.nombre from public.festivos f where f.fecha between p_ini and p_fin and extract(isodow from f.fecha) < 6),
    anios as (select a.* from public._vac_anios(p_emp, p_sin_pruebas, (select max(d.k) from dias d)) a),
    ped as (  -- dias comprometidos en otros pedidos (aprobados o en espera), por año
      select public._vac_anio(v_ing, h.dia) k, count(*) n
      from public.vac_pedidos p, public._vac_habiles(p.fecha_inicio, p.fecha_fin) h
      where p.empleado_id = p_emp and p.estado in ('aprobada', 'espera_laura') and p.id is distinct from p_excluir
        and (v_pr or not p.es_prueba)
      group by 1),
    por as (
      select d.k, count(*) dias, coalesce(min(a.final), public._vac_ley(d.k)) quedan, coalesce(max(pd.n), 0) comprometidos,
             min(a.desde) desde, min(a.hasta) hasta
      from dias d left join anios a on a.k = d.k left join ped pd on pd.k = d.k
      group by d.k)
    select json_build_object(
      'tiene_ingreso', v_ing is not null,
      'k_hoy', case when v_ing is null then null else public._vac_anio(v_ing, public._hoy_mx()) end,
      'dias', (select count(*) from dias),
      'lista', coalesce((select json_agg(d.dia order by d.dia) from dias d), '[]'),
      'festivos', coalesce((select json_agg(json_build_object('fecha', f.fecha, 'nombre', f.nombre) order by f.fecha) from fest f), '[]'),
      'por_anio', coalesce((select json_agg(json_build_object('k', p.k, 'dias', p.dias, 'quedan', p.quedan, 'comprometidos', p.comprometidos,
                            'despues', p.quedan - p.comprometidos - p.dias, 'desde', p.desde, 'hasta', p.hasta) order by p.k) from por p), '[]'),
      'alcanza', v_ing is not null and (select count(*) from dias) > 0 and not exists (select 1 from por p where p.quedan - p.comprometidos - p.dias < 0)
    ));
end $$;

-- ---------- Resumen de una persona (Mis vacaciones / detalle) ----------
create or replace function public.vac_resumen(p_emp uuid, p_sin_pruebas boolean default false)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  e public.empleados%rowtype;
  v_pr boolean := public.tengo_rol('admin') and not p_sin_pruebas;
begin
  if not public.puedo_ver_vac(p_emp, false) then raise exception 'No puedes ver las vacaciones de esa persona'; end if;
  e := (select x from public.empleados x where x.id = p_emp);
  return json_build_object(
    'empleado_id', e.id, 'lleva', e.lleva_vacaciones, 'fecha_ingreso', e.fecha_ingreso, 'hoy', public._hoy_mx(),
    'k_hoy', case when e.fecha_ingreso is null then null else public._vac_anio(e.fecha_ingreso, public._hoy_mx()) end,
    'anios', coalesce((select json_agg(row_to_json(a) order by a.k) from public._vac_anios(p_emp, p_sin_pruebas) a), '[]'),
    'movimientos', coalesce((select json_agg(json_build_object('id', m.id, 'tipo', m.tipo, 'dias', m.dias, 'fecha', m.fecha,
        'k', public._vac_anio(e.fecha_ingreso, m.fecha), 'referencia', m.referencia, 'revierte_a', m.revierte_a, 'es_prueba', m.es_prueba,
        'anulado', exists (select 1 from public.vac_movimientos r where r.revierte_a = m.id), 'registrado_at', m.registrado_at,
        'por', m.registrado_por) order by m.fecha, m.id)
      from public.vac_movimientos m where m.empleado_id = p_emp and (v_pr or not m.es_prueba)), '[]'),
    'pedidos', coalesce((select json_agg(json_build_object('id', p.id, 'fecha_inicio', p.fecha_inicio, 'fecha_fin', p.fecha_fin, 'dias', p.dias,
        'estado', p.estado, 'excepcion', p.excepcion, 'hablado_con', p.hablado_con, 'motivo', p.motivo, 'comentario', p.comentario,
        'es_prueba', p.es_prueba, 'creado_at', p.creado_at, 'usada_en', p.usada_en,
        'con_formato', exists (select 1 from public.solicitudes s where s.vac_pedido_id = p.id and s.estado_global <> 'rechazada')) order by p.fecha_inicio)
      from public.vac_pedidos p where p.empleado_id = p_emp and (v_pr or not p.es_prueba)), '[]'));
end $$;

-- ---------- Resumen de todos los que puedo ver (Vacaciones de todos) ----------
create or replace function public.vac_resumen_todos(p_sin_pruebas boolean default false)
returns json language plpgsql stable security definer set search_path = public as $$
declare v_hoy date := public._hoy_mx();
begin
  return coalesce((
    select json_agg(json_build_object(
      'empleado_id', e.id, 'lleva', e.lleva_vacaciones, 'fecha_ingreso', e.fecha_ingreso,
      'k', a.k, 'le_tocan', a.base, 'ley', a.ley, 'tiene_inicial', a.tiene_inicial,
      'tomadas', coalesce((select -sum(m.dias) from public.vac_movimientos m where m.empleado_id = e.id and m.tipo in ('tomadas', 'reverso')
                           and (not m.es_prueba or (public.tengo_rol('admin') and not p_sin_pruebas))
                           and public._vac_anio(e.fecha_ingreso, m.fecha) = a.k), 0),
      'quedan', a.final, 'apartados', a.apartados, 'en_espera', a.en_espera, 'hasta', a.hasta,
      'aniversario', case when e.fecha_ingreso is null then null else a.hasta + 1 end))
    from public.empleados e
    left join lateral (select x.* from public._vac_anios(e.id, p_sin_pruebas) x
                       where x.k = public._vac_anio(e.fecha_ingreso, v_hoy)) a on true
    where e.activo and public.puedo_ver_vac(e.id, false)), '[]');
end $$;

-- ---------- Paso 1: pedir vacaciones ----------
-- p: { empleado_id?, fecha_inicio, fecha_fin, excepcion, hablado_con, motivo, es_prueba }
create or replace function public.vac_pedir(p jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare
  yo uuid := public.mi_empleado_id();
  v_emp uuid := coalesce(nullif(p->>'empleado_id', '')::uuid, yo);
  e public.empleados%rowtype;
  v_ini date := (p->>'fecha_inicio')::date;
  v_fin date := coalesce(nullif(p->>'fecha_fin', '')::date, (p->>'fecha_inicio')::date);
  v_exc boolean := coalesce((p->>'excepcion')::boolean, false);
  v_con text := nullif(p->>'hablado_con', '');
  v_mot text := nullif(trim(coalesce(p->>'motivo', '')), '');
  v_prueba boolean := coalesce((p->>'es_prueba')::boolean, false);
  v_prev json; v_id uuid;
begin
  if yo is null then raise exception 'Tu sesion no esta ligada a ninguna persona'; end if;
  e := (select x from public.empleados x where x.id = v_emp and x.activo);
  if e.id is null then raise exception 'No encontre a esa persona (o esta inactiva)'; end if;
  if e.id <> yo and not (public.tengo_rol('admin') or public.tengo_rol('altas')) then
    raise exception 'Solo Gaby o Valen pueden pedir vacaciones a nombre de otra persona';
  end if;
  if not e.lleva_vacaciones then raise exception 'Esta persona no lleva conteo de vacaciones'; end if;
  if e.fecha_ingreso is null then raise exception 'Falta la fecha de ingreso de % (la captura Gaby en Personas)', e.nombre_oficial; end if;
  if v_prueba and not public.tengo_rol('admin') then raise exception 'Solo un administrador puede hacer pruebas'; end if;
  v_prev := public.vac_preview(v_emp, v_ini, v_fin, null, not v_prueba and public.tengo_rol('admin'));
  if (v_prev->>'dias')::int = 0 then raise exception 'En esas fechas no hay dias habiles (son fin de semana o festivos)'; end if;
  if not (v_prev->>'alcanza')::boolean then
    if not v_exc then raise exception 'No te alcanzan los dias. Si ya lo hablaste en persona, marca "Pedir como excepcion"'; end if;
    if v_con is null or v_mot is null then raise exception 'Para la excepcion di con quien lo hablaste y el motivo'; end if;
  else
    v_exc := false; v_con := null; v_mot := null;
  end if;
  if exists (select 1 from public.vac_pedidos x where x.empleado_id = v_emp and x.estado in ('espera_laura', 'aprobada')
             and x.es_prueba = v_prueba and x.fecha_inicio <= v_fin and x.fecha_fin >= v_ini) then
    raise exception 'Ya tienes vacaciones pedidas que se cruzan con esas fechas';
  end if;
  insert into public.vac_pedidos (empleado_id, fecha_inicio, fecha_fin, dias, excepcion, hablado_con, motivo, es_prueba, creado_por)
  values (v_emp, v_ini, v_fin, (v_prev->>'dias')::numeric, v_exc, v_con, v_mot, v_prueba, yo);
  v_id := (select x.id from public.vac_pedidos x where x.empleado_id = v_emp and x.fecha_inicio = v_ini and x.fecha_fin = v_fin
           and x.estado = 'espera_laura' order by x.creado_at desc limit 1);
  return json_build_object('id', v_id, 'dias', (v_prev->>'dias')::int, 'excepcion', v_exc);
end $$;

-- ---------- Paso 1: Laura decide ----------
create or replace function public.vac_decidir(p_pedido uuid, p_decision text, p_comentario text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  yo uuid := public.mi_empleado_id();
  x public.vac_pedidos%rowtype;
  v_com text := nullif(trim(coalesce(p_comentario, '')), '');
begin
  if yo is null then raise exception 'Tu sesion no esta ligada a ninguna persona'; end if;
  if p_decision not in ('aprobada', 'rechazada') then raise exception 'Decision no valida'; end if;
  perform 1 from public.vac_pedidos v where v.id = p_pedido for update;
  x := (select v from public.vac_pedidos v where v.id = p_pedido);
  if x.id is null or not public.puedo_ver_vac(x.empleado_id, x.es_prueba) then raise exception 'No encontre esas vacaciones'; end if;
  if x.es_prueba then
    if not public.tengo_rol('admin') then raise exception 'No te toca decidir esas vacaciones'; end if;
  elsif not public.tengo_rol('final') or exists (select 1 from public.empleados e where e.id = yo and e.decide_solo_pruebas) then
    raise exception 'Solo Laura aprueba vacaciones';
  end if;
  if x.estado not in ('espera_laura', 'aprobada', 'rechazada') then raise exception 'Esas vacaciones ya estan %', replace(x.estado, '_', ' '); end if;
  if p_decision = 'rechazada' and v_com is null then raise exception 'Escribe el comentario: la persona necesita saber por que'; end if;
  update public.vac_pedidos set estado = p_decision, comentario = v_com, decidido_por = yo, decidido_at = now() where id = x.id;
  return json_build_object('id', x.id, 'estado', p_decision);
end $$;

-- ---------- Paso 1: cancelar (la persona, o Gaby/Valen) ----------
create or replace function public.vac_cancelar(p_pedido uuid)
returns json language plpgsql security definer set search_path = public as $$
declare yo uuid := public.mi_empleado_id(); x public.vac_pedidos%rowtype;
begin
  perform 1 from public.vac_pedidos v where v.id = p_pedido for update;
  x := (select v from public.vac_pedidos v where v.id = p_pedido);
  if x.id is null or not public.puedo_ver_vac(x.empleado_id, x.es_prueba) then raise exception 'No encontre esas vacaciones'; end if;
  if x.empleado_id <> yo and not (public.tengo_rol('admin') or public.tengo_rol('altas')) then raise exception 'Solo puedes cancelar tus vacaciones'; end if;
  if x.estado not in ('espera_laura', 'aprobada') then raise exception 'Esas vacaciones ya estan %', replace(x.estado, '_', ' '); end if;
  if exists (select 1 from public.solicitudes s where s.vac_pedido_id = x.id and s.estado_global <> 'rechazada') then
    raise exception 'Ya hay un formato ligado a esas vacaciones';
  end if;
  update public.vac_pedidos set estado = 'cancelada' where id = x.id;
  return json_build_object('id', x.id, 'estado', 'cancelada');
end $$;

-- ---------- Paso 2: el formato de "Falte a cuenta de vacaciones" ----------
-- Crea la solicitud de siempre (crear_solicitud) y le liga las vacaciones, en la misma transaccion.
-- v: { pedido_id, excepcion, hablado_con, motivo }
create or replace function public.crear_solicitud_vac(p jsonb, v jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_res json; v_id uuid; s public.solicitudes%rowtype; e public.empleados%rowtype; x public.vac_pedidos%rowtype;
  v_ped uuid := nullif(v->>'pedido_id', '')::uuid;
  v_exc boolean := coalesce((v->>'excepcion')::boolean, false);
  v_con text := nullif(v->>'hablado_con', '');
  v_mot text := nullif(trim(coalesce(v->>'motivo', '')), '');
  v_prev json;
begin
  if p->>'tipo' <> 'ausencia' or p->>'justificacion' <> 'vacaciones' then raise exception 'Este formato es solo para faltas a cuenta de vacaciones'; end if;
  v_res := public.crear_solicitud(p);
  v_id := (v_res->>'id')::uuid;
  s := (select t from public.solicitudes t where t.id = v_id);
  e := (select t from public.empleados t where t.id = s.empleado_id);
  if not e.lleva_vacaciones then return v_res; end if;
  if e.fecha_ingreso is null then raise exception 'Falta la fecha de ingreso de % (la captura Gaby en Personas)', e.nombre_oficial; end if;
  if v_ped is not null then
    x := (select t from public.vac_pedidos t where t.id = v_ped);
    if x.id is null or x.empleado_id <> s.empleado_id or x.es_prueba <> s.es_prueba then raise exception 'Esas vacaciones apartadas no son de esta persona'; end if;
    if x.estado <> 'aprobada' then raise exception 'Esas vacaciones no estan apartadas (estan %)', replace(x.estado, '_', ' '); end if;
  end if;
  v_prev := public.vac_preview(s.empleado_id, s.fecha_inicio, s.fecha_fin, v_ped, not s.es_prueba and public.tengo_rol('admin'));
  if (v_prev->>'dias')::int = 0 then raise exception 'En esas fechas no hay dias habiles (son fin de semana o festivos)'; end if;
  if not (v_prev->>'alcanza')::boolean then
    if not v_exc then raise exception 'No te alcanzan los dias. Si ya lo hablaste en persona, marca "Pedir como excepcion"'; end if;
    if coalesce(v_con, '') not in ('laura', 'gaby', 'jefe') or v_mot is null then raise exception 'Para la excepcion di con quien lo hablaste y el motivo'; end if;
  else
    v_exc := false; v_con := null; v_mot := null;
  end if;
  update public.solicitudes set vac_pedido_id = v_ped, vac_excepcion = v_exc, vac_hablado_con = v_con, vac_motivo = v_mot,
    vac_dias = (v_prev->>'dias')::numeric where id = v_id;
  return v_res;
end $$;

-- ---------- Al aprobar Laura el formato: se descuentan los dias reales ----------
create or replace function public._vac_revertir(p_sol uuid, p_motivo text)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.vac_movimientos (empleado_id, tipo, dias, fecha, solicitud_id, referencia, revierte_a, es_prueba, registrado_por)
  select m.empleado_id, 'reverso', -m.dias, m.fecha, m.solicitud_id, 'Reverso: ' || p_motivo, m.id, m.es_prueba, public.mi_empleado_id()
  from public.vac_movimientos m
  where m.solicitud_id = p_sol and m.tipo <> 'reverso'
    and not exists (select 1 from public.vac_movimientos r where r.revierte_a = m.id);
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public._vac_registrar(p_sol uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  s public.solicitudes%rowtype; e public.empleados%rowtype; a uuid; v_ped uuid;
begin
  s := (select t from public.solicitudes t where t.id = p_sol);
  if s.id is null or s.tipo <> 'ausencia' or s.justificacion is distinct from 'vacaciones' then return; end if;
  e := (select t from public.empleados t where t.id = s.empleado_id);
  if not e.lleva_vacaciones or e.fecha_ingreso is null then return; end if;
  -- Si es una correccion, se cancela lo que habian descontado las anteriores (B2)
  a := s.corrige_a;
  v_ped := s.vac_pedido_id;
  while a is not null loop
    perform public._vac_revertir(a, 'se corrigió en ' || s.folio);
    v_ped := coalesce(v_ped, (select t.vac_pedido_id from public.solicitudes t where t.id = a));
    a := (select t.corrige_a from public.solicitudes t where t.id = a);
  end loop;
  -- anti-duplicado
  if exists (select 1 from public.vac_movimientos m where m.solicitud_id = s.id and m.tipo <> 'reverso'
             and not exists (select 1 from public.vac_movimientos r where r.revierte_a = m.id)) then return; end if;
  -- un renglon por año laboral (si las vacaciones cruzan el aniversario)
  insert into public.vac_movimientos (empleado_id, tipo, dias, fecha, solicitud_id, referencia, es_prueba, registrado_por)
  select s.empleado_id, 'tomadas', -count(*), min(h.dia), s.id, s.folio, s.es_prueba, public.mi_empleado_id()
  from public._vac_habiles(s.fecha_inicio, s.fecha_fin) h
  group by public._vac_anio(e.fecha_ingreso, h.dia);
  -- las apartadas que uso quedan como "usadas" (lo que no tomo se libera)
  if v_ped is not null then
    update public.vac_pedidos set estado = 'usada', usada_en = s.id where id = v_ped and estado = 'aprobada';
  end if;
end $$;

create or replace function public._vac_al_decidir()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.etapa = 'laura' and new.decision = 'aprobado' and old.decision is distinct from 'aprobado' then
    perform public._vac_registrar(new.solicitud_id);
  end if;
  return new;
end $$;
drop trigger if exists decisiones_vacaciones on public.decisiones;
create trigger decisiones_vacaciones after update of decision on public.decisiones
for each row execute function public._vac_al_decidir();

-- ---------- Ajuste a mano y saldo de arranque (solo Gaby; Valen solo en pruebas) ----------
-- p_tipo: 'ajuste' (+ suma, - resta) o 'inicial' (los dias que tiene HOY en su año laboral, del Excel de Gaby)
create or replace function public.vac_ajuste(p_empleado uuid, p_tipo text, p_dias numeric, p_motivo text)
returns json language plpgsql security definer set search_path = public as $$
declare
  yo uuid := public.mi_empleado_id(); v_prueba boolean; e public.empleados%rowtype;
  v_mot text := nullif(trim(coalesce(p_motivo, '')), '');
begin
  if not public.tengo_rol('filtro') then raise exception 'Solo Gaby puede hacer ajustes a mano'; end if;
  v_prueba := exists (select 1 from public.empleados x where x.id = yo and x.decide_solo_pruebas);
  e := (select x from public.empleados x where x.id = p_empleado);
  if e.id is null then raise exception 'No encontre a esa persona'; end if;
  if not e.lleva_vacaciones then raise exception 'Esta persona no lleva conteo de vacaciones'; end if;
  if e.fecha_ingreso is null then raise exception 'Primero captura su fecha de ingreso (Personas)'; end if;
  if p_tipo not in ('ajuste', 'inicial') then raise exception 'Tipo no valido'; end if;
  if p_dias is null or abs(p_dias) > 60 or (p_tipo = 'ajuste' and p_dias = 0) then raise exception 'Escribe los dias (+ suma, - resta)'; end if;
  if p_dias <> round(p_dias * 2) / 2 then raise exception 'Los dias van enteros o en medios (0.5)'; end if;
  if p_tipo = 'inicial' and exists (select 1 from public.vac_movimientos m where m.empleado_id = e.id and m.tipo = 'inicial' and m.es_prueba = v_prueba
      and not exists (select 1 from public.vac_movimientos r where r.revierte_a = m.id)) then
    raise exception 'Ya tiene saldo de arranque: para cambiarlo usa un ajuste';
  end if;
  if v_mot is null then v_mot := case when p_tipo = 'inicial' then 'Saldo de arranque' end; end if;
  if v_mot is null then raise exception 'Escribe el motivo del ajuste'; end if;
  insert into public.vac_movimientos (empleado_id, tipo, dias, fecha, referencia, es_prueba, registrado_por)
  values (e.id, p_tipo, p_dias, public._hoy_mx(), v_mot, v_prueba, yo);
  return json_build_object('ok', true, 'prueba', v_prueba);
end $$;

-- ---------- Festivos: agregar y quitar (Gaby y Valen) ----------
create or replace function public.festivo_agregar(p_fecha date, p_nombre text, p_origen text default 'uniterra')
returns json language plpgsql security definer set search_path = public as $$
declare v_nom text := nullif(trim(coalesce(p_nombre, '')), '');
begin
  if not (public.puedo_editar() or public.tengo_rol('filtro')) then raise exception 'Solo Gaby o Valen cargan festivos'; end if;
  if p_fecha is null or v_nom is null then raise exception 'Falta la fecha o el nombre'; end if;
  if exists (select 1 from public.festivos f where f.fecha = p_fecha) then raise exception 'Ese dia ya es festivo'; end if;
  insert into public.festivos (fecha, nombre, origen, creado_por) values (p_fecha, v_nom, coalesce(nullif(p_origen, ''), 'uniterra'), public.mi_empleado_id());
  -- formatos de vacaciones ya aprobados que incluyen ese dia (a esas personas Gaby les regresa el dia con un ajuste)
  return json_build_object('afectadas', (select count(*) from public.vac_movimientos m join public.solicitudes s on s.id = m.solicitud_id
    where m.tipo = 'tomadas' and not m.es_prueba and p_fecha between s.fecha_inicio and s.fecha_fin
      and not exists (select 1 from public.vac_movimientos r where r.revierte_a = m.id)));
end $$;

create or replace function public.festivo_quitar(p_fecha date)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not (public.puedo_editar() or public.tengo_rol('filtro')) then raise exception 'Solo Gaby o Valen quitan festivos'; end if;
  delete from public.festivos where fecha = p_fecha;
  return json_build_object('ok', true);
end $$;

-- ---------- Avisos: vacaciones que ya pasaron y no tienen formato ----------
-- A la persona le salen las suyas; a Gaby (y admin) las de todos.
create or replace function public.vac_sin_formato(p_sin_pruebas boolean default false)
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('id', p.id, 'empleado_id', p.empleado_id, 'fecha_inicio', p.fecha_inicio,
    'fecha_fin', p.fecha_fin, 'dias', p.dias, 'es_prueba', p.es_prueba) order by p.fecha_fin), '[]')
  from public.vac_pedidos p
  where p.estado = 'aprobada' and p.fecha_fin < public._hoy_mx()
    and (case when p.es_prueba then public.tengo_rol('admin') and not p_sin_pruebas
         else p.empleado_id = public.mi_empleado_id() or public.tengo_rol('filtro') or public.tengo_rol('admin') end)
    and not exists (select 1 from public.solicitudes s where s.vac_pedido_id = p.id and s.estado_global <> 'rechazada');
$$;

-- ---------- Contador de "Mi bandeja": ahora tambien las vacaciones que esperan a Laura ----------
create or replace function public.contar_pendientes()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'jefe',  count(*) filter (where s.estado_global = 'nueva_espera_jefe' and public.puedo_decidir(s, 'jefe')),
    'gaby',  count(*) filter (where s.estado_global = 'espera_gaby'       and public.puedo_decidir(s, 'gaby')),
    'laura', count(*) filter (where s.estado_global = 'espera_laura'      and public.puedo_decidir(s, 'laura')),
    'vac',   (select count(*) from public.vac_pedidos p where p.estado = 'espera_laura'
              and case when p.es_prueba then public.tengo_rol('admin')
                       else public.tengo_rol('final') and not exists (select 1 from public.empleados e
                            where e.id = public.mi_empleado_id() and e.decide_solo_pruebas) end))
  from public.solicitudes s
  where public.puedo_ver_solicitud(s);
$$;

-- ---------- Borrar pruebas: ahora tambien vacaciones de prueba ----------
create or replace function public.borrar_pruebas(p_confirmar boolean default false)
returns json language plpgsql security definer set search_path = public as $$
declare v_sol int; v_mov int; v_bit int; v_doc int; v_vac int;
begin
  if not public.tengo_rol('admin') then raise exception 'Solo un administrador puede borrar pruebas'; end if;
  v_sol := (select count(*) from public.solicitudes where es_prueba);
  v_mov := (select count(*) from public.movimientos where es_prueba);
  v_bit := (select count(*) from public.bitacoras where es_prueba);
  v_doc := (select count(*) from public.documentos where es_prueba);
  v_vac := (select count(*) from public.vac_pedidos where es_prueba) + (select count(*) from public.vac_movimientos where es_prueba);
  if not p_confirmar then return json_build_object('solicitudes', v_sol, 'movimientos', v_mov, 'bitacoras', v_bit, 'pdfs', v_doc, 'vacaciones', v_vac, 'borrado', false); end if;
  perform set_config('ut.borrando_pruebas', '1', true);
  delete from public.documentos where es_prueba;
  delete from public.avisos where es_prueba;
  delete from public.movimientos where es_prueba and revierte_a is not null;
  delete from public.movimientos where es_prueba;
  delete from public.bitacoras where es_prueba;
  delete from public.vac_movimientos where es_prueba and revierte_a is not null;
  delete from public.vac_movimientos where es_prueba;
  delete from public.decision_eventos where solicitud_id in (select id from public.solicitudes where es_prueba);
  delete from public.decisiones where solicitud_id in (select id from public.solicitudes where es_prueba);
  update public.solicitudes set corregida_por = null, corrige_a = null, vac_pedido_id = null where es_prueba;
  update public.vac_pedidos set usada_en = null where es_prueba;
  delete from public.solicitudes where es_prueba;
  delete from public.vac_pedidos where es_prueba;
  perform set_config('ut.borrando_pruebas', '', true);
  return json_build_object('solicitudes', v_sol, 'movimientos', v_mov, 'bitacoras', v_bit, 'pdfs', v_doc, 'vacaciones', v_vac, 'borrado', true);
end $$;

-- ---------- Permisos ----------
revoke all on function public._vac_movimientos_candado() from public, anon, authenticated;
revoke all on function public._vac_ley(int) from public, anon, authenticated;
revoke all on function public._vac_habiles(date, date) from public, anon, authenticated;
revoke all on function public._vac_anios(uuid, boolean, int) from public, anon, authenticated;
revoke all on function public._vac_revertir(uuid, text) from public, anon, authenticated;
revoke all on function public._vac_registrar(uuid) from public, anon, authenticated;
revoke all on function public._vac_al_decidir() from public, anon, authenticated;
revoke all on function public.puedo_ver_vac(uuid, boolean) from public, anon;
revoke all on function public.vac_preview(uuid, date, date, uuid, boolean) from public, anon;
revoke all on function public.vac_resumen(uuid, boolean) from public, anon;
revoke all on function public.vac_resumen_todos(boolean) from public, anon;
revoke all on function public.vac_pedir(jsonb) from public, anon;
revoke all on function public.vac_decidir(uuid, text, text) from public, anon;
revoke all on function public.vac_cancelar(uuid) from public, anon;
revoke all on function public.crear_solicitud_vac(jsonb, jsonb) from public, anon;
revoke all on function public.vac_ajuste(uuid, text, numeric, text) from public, anon;
revoke all on function public.festivo_agregar(date, text, text) from public, anon;
revoke all on function public.festivo_quitar(date) from public, anon;
revoke all on function public.vac_sin_formato(boolean) from public, anon;
grant execute on function public.puedo_ver_vac(uuid, boolean) to authenticated;
grant execute on function public.vac_preview(uuid, date, date, uuid, boolean) to authenticated;
grant execute on function public.vac_resumen(uuid, boolean) to authenticated;
grant execute on function public.vac_resumen_todos(boolean) to authenticated;
grant execute on function public.vac_pedir(jsonb) to authenticated;
grant execute on function public.vac_decidir(uuid, text, text) to authenticated;
grant execute on function public.vac_cancelar(uuid) to authenticated;
grant execute on function public.crear_solicitud_vac(jsonb, jsonb) to authenticated;
grant execute on function public.vac_ajuste(uuid, text, numeric, text) to authenticated;
grant execute on function public.festivo_agregar(date, text, text) to authenticated;
grant execute on function public.festivo_quitar(date) to authenticated;
grant execute on function public.vac_sin_formato(boolean) to authenticated;

-- Comprobacion: debe salir 1 renglon con "si" en todo.
select case when exists (select 1 from pg_class where relname = 'vac_movimientos') then 'si' else 'no' end as vacaciones,
       case when exists (select 1 from pg_class where relname = 'festivos') then 'si' else 'no' end as festivos,
       case when exists (select 1 from pg_trigger where tgname = 'decisiones_vacaciones') then 'si' else 'no' end as descuento_al_aprobar_laura,
       (select lleva_vacaciones from public.empleados where iniciales = 'PMR') is false as pavel_sin_conteo;
