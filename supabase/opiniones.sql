-- =====================================================================
-- FUGA EN SAN CALIMAR — Opiniones de los jugadores ("Danos tu opinión")
-- Ejecuta ANTES supabase/ranking.sql (usa la tabla de jugadores). Luego
-- pega este archivo en Supabase → SQL Editor → New query → Run. Se puede repetir.
--
-- Seguridad:
--   · RLS activado y SIN políticas + REVOKE: con la clave pública nadie puede
--     leer, cambiar ni borrar opiniones. Solo se pueden ESCRIBIR, a través de
--     la función send_feedback. Tú las lees desde el panel (Table Editor o SQL).
--   · Si el jugador tiene cuenta, el apodo se toma del servidor (comprobando su
--     código secreto): nadie puede firmar con el apodo de otro.
--   · Antispam: como mucho 3 opiniones por cuenta y hora, 1 por minuto, un
--     tope global por minuto, y no se aceptan mensajes repetidos.
--   · No se guarda ningún dato personal: valoración, texto, versión, idioma,
--     fecha y (si hay cuenta) el apodo.
-- =====================================================================

create table if not exists public.feedback (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  rating     smallint not null check (rating between 1 and 5),
  message    text not null default '' check (char_length(message) <= 500),
  version    text not null default '' check (char_length(version) <= 20),
  lang       text not null default '' check (char_length(lang) <= 5),
  nick       text,                                                    -- solo si tiene cuenta
  player_id  uuid references public.players (id) on delete set null
);
create index if not exists feedback_time on public.feedback (created_at desc);
create index if not exists feedback_player_time on public.feedback (player_id, created_at desc);

alter table public.feedback enable row level security;
revoke all on table public.feedback from anon, authenticated;

-- Límites del antispam (cámbialos aquí)
create or replace function public.fb_limits()
returns table (per_hour integer, gap_seconds integer, global_per_minute integer)
language sql immutable as $$
  select 3, 60, 20
$$;

-- Guarda una opinión. Devuelve { ok: true }.
create or replace function public.send_feedback(
  p_rating integer, p_message text, p_version text default '', p_lang text default '',
  p_id uuid default null, p_code text default null
) returns json language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  lim record;
  pl players;
  msg text := btrim(coalesce(p_message, ''));
begin
  select * into lim from fb_limits();
  if p_rating is null or p_rating not between 1 and 5 then raise exception 'bad_feedback'; end if;
  if char_length(msg) > 500 or char_length(coalesce(p_version, '')) > 20 or char_length(coalesce(p_lang, '')) > 5 then
    raise exception 'bad_feedback';
  end if;
  -- con cuenta: el apodo se comprueba con el código
  if p_id is not null then
    select * into pl from players where id = p_id;
    if pl.id is null or pl.code_hash <> encode(digest(upper(btrim(coalesce(p_code, ''))), 'sha256'), 'hex') then
      raise exception 'bad_account';
    end if;
    if pl.banned then raise exception 'banned'; end if;
    if (select count(*) from feedback where player_id = p_id and created_at > now() - interval '1 hour') >= lim.per_hour
       or exists (select 1 from feedback where player_id = p_id and created_at > now() - make_interval(secs => lim.gap_seconds)) then
      raise exception 'rate_limited';
    end if;
  end if;
  -- tope global (frena a quien envíe sin cuenta en bucle) y mensajes repetidos
  if (select count(*) from feedback where created_at > now() - interval '1 minute') >= lim.global_per_minute then
    raise exception 'rate_limited';
  end if;
  if msg <> '' and exists (select 1 from feedback where message = msg and created_at > now() - interval '1 day') then
    raise exception 'duplicate';
  end if;
  insert into feedback (rating, message, version, lang, nick, player_id)
  values (p_rating, msg, coalesce(p_version, ''), coalesce(p_lang, ''), pl.nick, pl.id);
  return json_build_object('ok', true);
end $$;

revoke execute on function public.fb_limits() from public, anon, authenticated;
revoke execute on function public.send_feedback(integer, text, text, text, uuid, text) from public;
grant execute on function public.send_feedback(integer, text, text, text, uuid, text) to anon, authenticated;
