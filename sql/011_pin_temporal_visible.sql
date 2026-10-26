-- =====================================================================
-- Permisos UT · 011 · Ver el PIN temporal en la ficha (hasta que la persona elige el suyo)
-- Pegar COMPLETO en Supabase > SQL Editor > New query > Run.
-- Se puede correr dos veces sin romper nada. Correr DESPUES del 010.
-- El PIN que la persona ELIGE nunca se guarda (solo su huella): no se puede ver.
-- =====================================================================

alter table public.accesos add column if not exists pin_temporal    text;         -- solo mientras debe cambiarlo
alter table public.accesos add column if not exists pin_cambiado_at timestamptz;  -- cuando eligio el suyo

-- Cuando la persona cambia su PIN (deja de ser temporal): se borra el temporal y se anota la fecha
create or replace function public._accesos_pin_elegido()
returns trigger language plpgsql as $$
begin
  if new.pin_hash is distinct from old.pin_hash and not new.debe_cambiar then
    new.pin_temporal := null;
    new.pin_cambiado_at := now();
  end if;
  return new;
end $$;
drop trigger if exists accesos_pin_elegido on public.accesos;
create trigger accesos_pin_elegido before update on public.accesos
for each row execute function public._accesos_pin_elegido();

-- Dar PIN temporal: ahora tambien se guarda para mostrarlo en la ficha
create or replace function public.admin_pin_temporal(p_empleado uuid, p_pin text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.puedo_editar() then raise exception 'Sin permiso'; end if;
  perform public._dar_pin(p_empleado, p_pin);
  update public.accesos set debe_cambiar = true, pin_temporal = p_pin, pin_cambiado_at = null where empleado_id = p_empleado;
end $$;

-- Estado de acceso de cada persona (solo Valen y Gaby): + el temporal y la fecha en que eligio el suyo
drop function if exists public.admin_accesos();
create function public.admin_accesos()
returns table (empleado_id uuid, estado text, pin_temporal text, pin_cambiado_at timestamptz)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.puedo_editar() then raise exception 'Sin permiso'; end if;
  return query
    select e.id,
           case when x.pin_hash is null then 'sin_pin'
                when x.bloqueado then 'bloqueado'
                when x.debe_cambiar then 'temporal'
                else 'activo' end,
           case when x.debe_cambiar then x.pin_temporal end,
           x.pin_cambiado_at
    from public.empleados e left join public.accesos x on x.empleado_id = e.id;
end $$;
revoke all on function public.admin_accesos() from public, anon;
grant execute on function public.admin_accesos() to authenticated;
revoke all on function public.admin_pin_temporal(uuid, text) from public, anon;
grant execute on function public.admin_pin_temporal(uuid, text) to authenticated;

-- Comprobacion: debe salir 1 renglon con "si" en todo.
select case when exists (select 1 from information_schema.columns where table_name = 'accesos' and column_name = 'pin_temporal') then 'si' else 'no' end as pin_temporal,
       case when exists (select 1 from pg_trigger where tgname = 'accesos_pin_elegido') then 'si' else 'no' end as aviso_cambio;
