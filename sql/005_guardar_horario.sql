-- =====================================================================
-- Permisos UT · 005 · Guardar horario en un solo paso (con errores claros)
-- Pegar COMPLETO en Supabase > SQL Editor > New query > Run.
-- Se puede correr dos veces sin romper nada.
-- =====================================================================

create or replace function public.guardar_horario(
  p_empleado uuid, p_horario uuid, p_periodo text, p_desde date, p_por_revisar boolean, p_dias jsonb)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare v uuid := p_horario; d jsonb;
begin
  if not public.puedo_editar() then
    raise exception 'Sin permiso para editar horarios (tu usuario no tiene rol de altas o admin)';
  end if;
  if p_desde is null then raise exception 'Falta la fecha de vigente desde'; end if;
  if p_dias is null or jsonb_array_length(p_dias) <> 5 then raise exception 'Faltan dias del horario'; end if;

  if v is null then
    insert into public.horarios (empleado_id, periodo, vigente_desde, por_revisar)
    values (p_empleado, nullif(trim(coalesce(p_periodo, '')), ''), p_desde, coalesce(p_por_revisar, false))
    returning id into v;
  else
    update public.horarios
       set periodo = nullif(trim(coalesce(p_periodo, '')), ''), vigente_desde = p_desde,
           por_revisar = coalesce(p_por_revisar, false)
     where id = v and empleado_id = p_empleado;
    if not found then raise exception 'No encontre ese horario para esa persona'; end if;
  end if;

  for d in select * from jsonb_array_elements(p_dias) loop
    insert into public.horario_dias (horario_id, dia, entrada, salida)
    values (v, (d->>'dia')::smallint, nullif(d->>'entrada', '')::time, nullif(d->>'salida', '')::time)
    on conflict (horario_id, dia) do update set entrada = excluded.entrada, salida = excluded.salida;
  end loop;

  return v;
end $$;

revoke all on function public.guardar_horario(uuid, uuid, text, date, boolean, jsonb) from public, anon;
grant execute on function public.guardar_horario(uuid, uuid, text, date, boolean, jsonb) to authenticated;

-- Diagnostico (solo lectura): ultimos 15 cambios guardados en la base.
select at at time zone 'America/Mexico_City' as cuando, tabla, accion, registro
from public.cambios order by at desc limit 15;
