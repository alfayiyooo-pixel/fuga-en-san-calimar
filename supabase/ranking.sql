-- =====================================================================
-- FUGA EN SAN CALIMAR — Cuentas (solo apodo) y ranking global
-- Pega TODO este archivo en Supabase → SQL Editor → New query → Run.
-- Se puede volver a ejecutar: borra y recrea las funciones (no los datos).
--
-- Seguridad:
--   · Las tablas tienen RLS activado y NINGUNA política: con la clave pública
--     (anon) no se pueden leer, insertar, cambiar ni borrar filas directamente.
--   · Todo pasa por funciones (RPC) que comprueban el código secreto de la
--     cuenta: nadie puede tocar las puntuaciones de otro.
--   · Antitrampas: distancia frente a duración de la partida y velocidad
--     máxima del juego, límites razonables y máximo de envíos por minuto.
--   · No se guarda ningún dato personal: solo el apodo. El código de
--     recuperación se guarda cifrado (hash SHA-256), nunca en claro.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- TABLAS
-- ---------------------------------------------------------------------
create table if not exists public.players (
  id         uuid primary key default gen_random_uuid(),
  nick       text not null check (char_length(nick) between 3 and 16),
  code_hash  text not null unique,             -- SHA-256 del código de recuperación
  prestige   smallint not null default 0,      -- insignia de prestigio (0-10)
  banned     boolean not null default false,   -- tramposo: oculto y sin poder enviar
  created_at timestamptz not null default now()
);
create unique index if not exists players_nick_unique on public.players (lower(nick));

create table if not exists public.scores (
  id         bigint generated always as identity primary key,
  player_id  uuid not null references public.players (id) on delete cascade,
  distance   integer not null check (distance between 1 and 1000000),  -- metros
  duration   real not null check (duration > 0),                       -- segundos jugados
  hero       text not null default 'base',       -- personaje: base | veteran | pilot | wild
  prestige   smallint not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists scores_player_time on public.scores (player_id, created_at desc);
create index if not exists scores_time on public.scores (created_at);

-- RLS activado y sin políticas = acceso directo cerrado para anon/authenticated
alter table public.players enable row level security;
alter table public.scores  enable row level security;
revoke all on table public.players from anon, authenticated;
revoke all on table public.scores  from anon, authenticated;

-- ---------------------------------------------------------------------
-- AJUSTES DEL ANTITRAMPAS (cámbialos aquí si cambias el juego)
--   max_mps: velocidad máxima del juego en m/s (820 px/s ÷ 32 px/m = 25,6)
--   margin:  holgura para nitro, rampas, etc. (×1,25)
--   bonus_m: metros extra permitidos (arranque rápido de 500 m)
--   per_min: envíos máximos por jugador y minuto
-- ---------------------------------------------------------------------
create or replace function public.sc_limits()
returns table (max_mps real, margin real, bonus_m integer, per_min integer, min_duration real, max_duration real)
language sql immutable as $$
  select 25.6::real, 1.25::real, 600, 3, 3::real, 21600::real
$$;

-- Inicio de la semana del ranking: lunes 00:00, hora de España
create or replace function public.sc_week_start()
returns timestamptz language sql stable as $$
  select date_trunc('week', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid'
$$;

-- Apodo válido: 3-16 caracteres permitidos y sin palabras ofensivas (ES/EN).
-- La comparación ignora mayúsculas, tildes, espacios y "leet" (0→o, 1→i, 3→e…).
create or replace function public.sc_nick_ok(p_nick text)
returns boolean language plpgsql immutable as $$
declare
  norm text;
  w text;
  banned text[] := array[
    -- español
    'puta','puto','mierda','cabron','gilipollas','pendejo','maricon','marica','follar','joder',
    'zorra','hijoputa','mamon','culero','verga','chinga','subnormal','retrasado','mongolo',
    'negrata','sudaca','polla','cojon','mamada','putita','malparido','huevon',
    -- inglés
    'fuck','shit','bitch','cunt','dick','cock','pussy','whore','slut','nigg','fag','retard',
    'rape','asshole','bastard','wank','twat','penis','vagina','porn','sex',
    -- odio
    'nazi','hitler','kkk','isis'
  ];
begin
  if p_nick is null or p_nick <> btrim(p_nick) then return false; end if;
  if char_length(p_nick) not between 3 and 16 then return false; end if;
  if p_nick !~ '^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ _.-]+$' then return false; end if;
  norm := translate(lower(p_nick), 'áéíóúüñ013457@$', 'aeiouunoieastas');
  norm := regexp_replace(norm, '[^a-z]', '', 'g');
  foreach w in array banned loop
    if position(w in norm) > 0 then return false; end if;
  end loop;
  return true;
end $$;

-- Mejor distancia de cada jugador desde una fecha (sin tramposos)
create or replace function public.sc_bests(p_since timestamptz)
returns table (player_id uuid, distance integer, hero text, prestige smallint, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select distinct on (s.player_id) s.player_id, s.distance, s.hero, s.prestige, s.created_at
  from scores s join players p on p.id = s.player_id
  where not p.banned and s.created_at >= p_since
  order by s.player_id, s.distance desc, s.created_at asc
$$;

create or replace function public.sc_since(p_period text)
returns timestamptz language sql stable as $$
  select case when p_period = 'week' then public.sc_week_start() else '-infinity'::timestamptz end
$$;

-- ---------------------------------------------------------------------
-- FUNCIONES PÚBLICAS (RPC)
-- ---------------------------------------------------------------------

-- Crea una cuenta con un apodo. Devuelve { id, nick, code } (el código solo se ve aquí).
create or replace function public.create_player(p_nick text)
returns json language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  raw bytea := gen_random_bytes(12);
  code text := '';
  i int;
  new_id uuid;
begin
  if not sc_nick_ok(p_nick) then raise exception 'bad_nick'; end if;
  -- freno global contra la creación masiva de cuentas
  if (select count(*) from players where created_at > now() - interval '1 minute') >= 30 then
    raise exception 'busy';
  end if;
  for i in 0..11 loop
    code := code || substr(alphabet, (get_byte(raw, i) % 32) + 1, 1);
    if i in (3, 7) then code := code || '-'; end if;
  end loop;
  begin
    insert into players (nick, code_hash) values (p_nick, encode(digest(code, 'sha256'), 'hex'))
    returning id into new_id;
  exception when unique_violation then
    raise exception 'nick_taken';
  end;
  return json_build_object('id', new_id, 'nick', p_nick, 'code', code);
end $$;

-- Recupera una cuenta con su código (otro dispositivo). Devuelve { id, nick, prestige }.
create or replace function public.recover_player(p_code text)
returns json language plpgsql stable security definer set search_path = public, extensions as $$
declare
  pl players;
begin
  select * into pl from players
  where code_hash = encode(digest(upper(btrim(coalesce(p_code, ''))), 'sha256'), 'hex');
  if pl.id is null then raise exception 'bad_code'; end if;
  return json_build_object('id', pl.id, 'nick', pl.nick, 'prestige', pl.prestige);
end $$;

-- Sube una puntuación. Rechaza las imposibles y el exceso de envíos.
-- Devuelve { rank_all, rank_week, best_all, best_week }.
create or replace function public.submit_score(
  p_id uuid, p_code text, p_distance integer, p_duration real, p_hero text, p_prestige integer
) returns json language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  pl players;
  lim record;
  r_all bigint;
  r_week bigint;
  b_all integer;
  b_week integer;
begin
  select * into lim from sc_limits();
  select * into pl from players where id = p_id;
  if pl.id is null or pl.code_hash <> encode(digest(upper(btrim(coalesce(p_code, ''))), 'sha256'), 'hex') then
    raise exception 'bad_account';
  end if;
  if pl.banned then raise exception 'banned'; end if;
  if p_hero is null or p_hero not in ('base', 'veteran', 'pilot', 'wild') then
    raise exception 'bad_score';
  end if;
  if p_prestige is null or p_prestige not between 0 and 10 then raise exception 'bad_score'; end if;
  if p_distance is null or p_duration is null
     or p_distance not between 1 and 1000000
     or p_duration < lim.min_duration or p_duration > lim.max_duration
     or p_distance > lim.bonus_m + p_duration * lim.max_mps * lim.margin then
    raise exception 'impossible_score';
  end if;
  if (select count(*) from scores where player_id = p_id and created_at > now() - interval '1 minute') >= lim.per_min then
    raise exception 'rate_limited';
  end if;

  insert into scores (player_id, distance, duration, hero, prestige)
  values (p_id, p_distance, p_duration, p_hero, p_prestige);
  update players set prestige = p_prestige where id = p_id;

  select b.distance into b_all from sc_bests('-infinity') b where b.player_id = p_id;
  select b.distance into b_week from sc_bests(sc_week_start()) b where b.player_id = p_id;
  select count(*) + 1 into r_all from sc_bests('-infinity') b where b.distance > b_all;
  select count(*) + 1 into r_week from sc_bests(sc_week_start()) b where b.distance > b_week;
  return json_build_object('rank_all', r_all, 'rank_week', r_week, 'best_all', b_all, 'best_week', b_week);
end $$;

-- Top 100. p_period: 'all' (todos los tiempos) o 'week' (esta semana).
create or replace function public.leaderboard(p_period text default 'all')
returns table (rank bigint, nick text, distance integer, hero text, prestige smallint)
language sql stable security definer set search_path = public as $$
  select rank() over (order by b.distance desc), p.nick, b.distance, b.hero, b.prestige
  from sc_bests(sc_since(p_period)) b join players p on p.id = b.player_id
  order by b.distance desc, b.created_at asc
  limit 100
$$;

-- Tu posición (aunque no estés en el top 100). Necesita tu código.
create or replace function public.my_rank(p_id uuid, p_code text, p_period text default 'all')
returns json language plpgsql stable security definer set search_path = public, extensions as $$
declare
  pl players;
  mine record;
  r bigint;
  total bigint;
begin
  select * into pl from players where id = p_id;
  if pl.id is null or pl.code_hash <> encode(digest(upper(btrim(coalesce(p_code, ''))), 'sha256'), 'hex') then
    raise exception 'bad_account';
  end if;
  select * into mine from sc_bests(sc_since(p_period)) b where b.player_id = p_id;
  select count(*) into total from sc_bests(sc_since(p_period));
  if mine.player_id is null then
    return json_build_object('rank', null, 'total', total, 'nick', pl.nick);
  end if;
  select count(*) + 1 into r from sc_bests(sc_since(p_period)) b where b.distance > mine.distance;
  return json_build_object('rank', r, 'total', total, 'nick', pl.nick, 'distance', mine.distance,
                           'hero', mine.hero, 'prestige', mine.prestige);
end $$;

-- ---------------------------------------------------------------------
-- PERMISOS: solo las 5 funciones públicas se pueden llamar con la clave anon
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.create_player(text) to anon, authenticated;
grant execute on function public.recover_player(text) to anon, authenticated;
grant execute on function public.submit_score(uuid, text, integer, real, text, integer) to anon, authenticated;
grant execute on function public.leaderboard(text) to anon, authenticated;
grant execute on function public.my_rank(uuid, text, text) to anon, authenticated;
