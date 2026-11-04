-- =====================================================================
-- FUGA EN SAN CALIMAR — Registro de errores del juego
-- Pega este archivo en Supabase → SQL Editor → New query → Run. Se puede
-- repetir. No depende de los otros archivos (se puede ejecutar en cualquier orden).
--
-- Qué guarda: los errores de JavaScript y de carga que ven los jugadores
-- (o "el navegador no es compatible", "no termina de cargar"), con el
-- navegador/modelo (user agent), la versión del juego, la pantalla y si se
-- juega en la web, como app instalada (PWA) o en la APK.
--
-- Seguridad:
--   · RLS activado y SIN políticas + REVOKE: con la clave pública nadie puede
--     leer, cambiar ni borrar errores. Solo se pueden ESCRIBIR, a través de
--     la función log_error. Tú los lees desde el panel (Table Editor o SQL).
--   · Sin datos personales: ni apodo, ni cuenta, ni IP (Supabase no la guarda
--     en la tabla). El texto se recorta en el servidor.
--   · Antispam: un mismo error repetido (mismo mensaje, archivo y versión) NO
--     crea filas nuevas: suma 1 a "hits" y actualiza "last_at". Además hay un
--     tope global de filas nuevas por minuto.
-- =====================================================================

create table if not exists public.client_errors (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),   -- primera vez que se vio
  last_at    timestamptz not null default now(),   -- última vez
  hits       integer not null default 1,           -- cuántas veces ha llegado
  kind       text not null default '' check (char_length(kind) <= 20),     -- js | promise | resource | fatal | unsupported | timeout | loop
  message    text not null default '' check (char_length(message) <= 500),
  source     text not null default '' check (char_length(source) <= 300),  -- archivo:línea:columna
  stack      text not null default '' check (char_length(stack) <= 2000),
  version    text not null default '' check (char_length(version) <= 20),
  platform   text not null default '' check (char_length(platform) <= 10), -- web | pwa | apk
  ua         text not null default '' check (char_length(ua) <= 400),      -- navegador y modelo
  screen     text not null default '' check (char_length(screen) <= 60),   -- pantalla, ventana y densidad
  lang       text not null default '' check (char_length(lang) <= 12),
  context    text not null default '' check (char_length(context) <= 300) -- estado del juego (menú/partida, calidad…)
);
create index if not exists client_errors_last on public.client_errors (last_at desc);
create index if not exists client_errors_sig on public.client_errors (version, kind, md5(message), md5(source));

alter table public.client_errors enable row level security;
revoke all on table public.client_errors from anon, authenticated;

-- Límite de filas NUEVAS por minuto en total (cámbialo aquí). Los repetidos solo suman.
create or replace function public.err_limits()
returns table (new_per_minute integer)
language sql immutable as $$
  select 60
$$;

-- Guarda un error. Devuelve { ok: true }. Nunca devuelve nada de la tabla.
create or replace function public.log_error(
  p_kind text, p_message text, p_source text default '', p_stack text default '',
  p_version text default '', p_platform text default '', p_ua text default '',
  p_screen text default '', p_lang text default '', p_context text default ''
) returns json language plpgsql volatile security definer set search_path = public as $$
declare
  v_kind text := left(btrim(coalesce(p_kind, '')), 20);
  v_msg  text := left(btrim(coalesce(p_message, '')), 500);
  v_src  text := left(btrim(coalesce(p_source, '')), 300);
  v_ver  text := left(btrim(coalesce(p_version, '')), 20);
  v_ua   text := left(coalesce(p_ua, ''), 400);
  v_hit  bigint;
begin
  if v_kind = '' or v_msg = '' then return json_build_object('ok', false); end if;
  -- ¿ya existe el mismo error en esta versión y navegador? → solo se cuenta
  update client_errors e set hits = e.hits + 1, last_at = now()
   where e.version = v_ver and e.kind = v_kind and md5(e.message) = md5(v_msg) and md5(e.source) = md5(v_src) and e.ua = v_ua
  returning e.id into v_hit;
  if v_hit is not null then return json_build_object('ok', true); end if;
  if (select count(*) from client_errors e where e.created_at > now() - interval '1 minute') >= (select l.new_per_minute from err_limits() l) then
    raise exception 'rate_limited';
  end if;
  insert into client_errors (kind, message, source, stack, version, platform, ua, screen, lang, context)
  values (v_kind, v_msg, v_src, left(coalesce(p_stack, ''), 2000), v_ver, left(coalesce(p_platform, ''), 10), v_ua,
          left(coalesce(p_screen, ''), 60), left(coalesce(p_lang, ''), 12), left(coalesce(p_context, ''), 300));
  return json_build_object('ok', true);
end $$;

revoke execute on function public.err_limits() from public, anon, authenticated;
revoke execute on function public.log_error(text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.log_error(text, text, text, text, text, text, text, text, text, text) to anon, authenticated;
