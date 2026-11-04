-- =====================================================================
-- FUGA EN SAN CALIMAR — Marcas de otros jugadores en el recorrido
-- Ejecuta ANTES supabase/ranking.sql (usa sus tablas). Luego pega este
-- archivo en Supabase → SQL Editor → New query → Run. Se puede repetir.
--
-- Devuelve unos pocos jugadores para pintar su bandera durante la partida:
-- los p_near que están justo por encima de tu récord y los p_top primeros
-- del ranking (sin tramposos y sin ti). Solo apodo y distancia, que ya son
-- públicos en el ranking.
-- =====================================================================

create or replace function public.ghost_marks(
  p_best integer default 0, p_near integer default 3, p_top integer default 10, p_id uuid default null
) returns table (nick text, distance integer)
language sql stable security definer set search_path = public as $$
  with b as (
    select p.nick, s.distance
    from sc_bests('-infinity') s join players p on p.id = s.player_id
    where p_id is null or s.player_id <> p_id
  ),
  top as (select * from b order by distance desc limit least(greatest(coalesce(p_top, 0), 0), 10)),
  near as (select * from b where distance > coalesce(p_best, 0) order by distance asc limit least(greatest(coalesce(p_near, 0), 0), 5))
  select nick, distance from (select * from top union select * from near) x order by distance asc
$$;

revoke execute on function public.ghost_marks(integer, integer, integer, uuid) from public;
grant execute on function public.ghost_marks(integer, integer, integer, uuid) to anon, authenticated;
