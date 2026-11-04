// REGISTRO DE ERRORES
// Recoge los errores de JavaScript y de carga (los primeros los captura
// src/boot.js antes de que arranque el juego) y los manda a Supabase
// (función log_error de supabase/errores.sql). Solo escritura y sin datos
// personales: mensaje, archivo, navegador (user agent), versión, pantalla,
// web / PWA / APK y en qué estaba el juego (menú, partida, calidad…).
// Valores en CONFIG.errorLog.

import { CONFIG } from '../config.js';

const PENDING_KEY = 'san-calimar-errors-pending';

const boot = () => window.__scBoot ?? null;

function short(s, n) {
  s = String(s ?? '');
  return s.length > n ? s.slice(0, n) : s;
}

function stripOrigin(s) {
  return String(s ?? '').split(`${location.origin}/`).join('');
}

export const ErrorLog = {
  seen: new Set(), // firmas ya enviadas en esta sesión (no se repiten)
  queue: [],
  sending: false,
  sent: 0,
  context: () => '',

  /** @param context función que describe el estado del juego (menú/partida, calidad…) */
  init(context) {
    if (context) this.context = context;
    const b = boot();
    // errores capturados durante la carga
    const early = b?.errors?.splice(0) ?? [];
    if (b) b.onError = (e) => this.capture(e);
    else {
      // sin boot.js (no debería pasar): se capturan aquí
      window.addEventListener('error', (ev) => this.capture({ kind: 'js', message: ev.message, source: `${stripOrigin(ev.filename)}:${ev.lineno}:${ev.colno}`, stack: ev.error?.stack }), true);
      window.addEventListener('unhandledrejection', (ev) => this.capture({ kind: 'promise', message: ev.reason?.message ?? String(ev.reason), stack: ev.reason?.stack }));
    }
    // los que no se pudieron enviar la otra vez (sin conexión)
    try {
      const old = JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]');
      localStorage.removeItem(PENDING_KEY);
      if (Array.isArray(old)) this.queue.push(...old.slice(0, CONFIG.errorLog.keepOffline));
    } catch {
      /* sin almacenamiento */
    }
    for (const e of early) this.capture(e);
    window.addEventListener('online', () => this.flush());
    this.flush();
  },

  /** Un error nuevo: se ignora si ya se ha enviado igual o si se ha llegado al tope. */
  capture(e) {
    const L = CONFIG.errorLog;
    if (!L.enabled || !e?.message) return;
    const msg = short(e.message, 500);
    if (L.ignore.some((re) => re.test(msg))) return;
    const sig = `${e.kind}|${msg}|${e.source ?? ''}`;
    if (this.seen.has(sig)) return;
    this.seen.add(sig);
    if (this.sent + this.queue.length >= L.maxPerSession) return;
    let ctx = '';
    try {
      ctx = this.context();
    } catch {
      /* el juego quizá aún no está listo */
    }
    const p = boot()?.payload?.(e, CONFIG.version, ctx);
    if (!p) return;
    p.p_stack = short(stripOrigin(p.p_stack), 2000);
    this.queue.push(p);
    if (CONFIG.errorLog.console) console.warn('[errorlog]', msg, e.source ?? '');
    this.flush();
  },

  /** Error dentro del bucle del juego (dibujo o simulación). */
  loop(err, where) {
    this.capture({ kind: 'loop', message: `${where}: ${err?.message ?? err}`, source: stripOrigin((err?.stack ?? '').split('\n')[1]?.trim() ?? ''), stack: stripOrigin(err?.stack ?? '') });
  },

  async flush() {
    const O = CONFIG.online;
    if (this.sending || !this.queue.length) return;
    if (!O.enabled || !O.url || !O.key) return;
    this.sending = true;
    try {
      while (this.queue.length) {
        const p = this.queue[0];
        const ok = await this.post(p);
        if (!ok) break;
        this.queue.shift();
        this.sent++;
      }
    } finally {
      this.sending = false;
    }
    this.persist();
  },

  async post(p) {
    const O = CONFIG.online;
    try {
      const res = await fetch(`${O.url.replace(/\/+$/, '')}/rest/v1/rpc/log_error`, {
        method: 'POST',
        headers: { apikey: O.key, 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
        keepalive: true,
      });
      // 404 = falta ejecutar supabase/errores.sql; 400 = límite: no se insiste
      return res.ok || res.status === 404 || res.status === 400;
    } catch {
      return false; // sin conexión: se guarda para la próxima vez
    }
  },

  /** Lo que no se ha podido enviar se guarda para el próximo arranque. */
  persist() {
    try {
      if (this.queue.length) localStorage.setItem(PENDING_KEY, JSON.stringify(this.queue.slice(0, CONFIG.errorLog.keepOffline)));
      else localStorage.removeItem(PENDING_KEY);
    } catch {
      /* sin almacenamiento */
    }
  },
};
