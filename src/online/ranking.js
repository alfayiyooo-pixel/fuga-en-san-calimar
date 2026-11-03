// CUENTAS (solo apodo) Y RANKING GLOBAL con Supabase
//
// Todo pasa por funciones RPC del servidor (ver supabase/ranking.sql):
//   create_player(nick)          → { id, nick, code }   (el código solo se ve aquí)
//   recover_player(code)         → { id, nick, prestige }
//   submit_score(id, code, …)    → { rank_all, rank_week, best_all, best_week }
//   leaderboard(period)          → top 100 ('all' | 'week')
//   my_rank(id, code, period)    → { rank, total, distance, hero, prestige }
//
// En el dispositivo se guarda la cuenta (id, apodo y código) y, si no hay
// conexión o aún no hay apodo, la mejor puntuación pendiente de subir.
// No se guarda ni se envía ningún dato personal más allá del apodo.

import { CONFIG } from '../config.js';
import { Save } from '../core/storage.js';

// palabras no permitidas (se comparan sin mayúsculas, tildes, espacios ni "leet")
// La misma lista está en el servidor (sc_nick_ok), que es quien decide.
const BANNED = [
  'puta', 'puto', 'mierda', 'cabron', 'gilipollas', 'pendejo', 'maricon', 'marica', 'follar', 'joder',
  'zorra', 'hijoputa', 'mamon', 'culero', 'verga', 'chinga', 'subnormal', 'retrasado', 'mongolo',
  'negrata', 'sudaca', 'polla', 'cojon', 'mamada', 'putita', 'malparido', 'huevon',
  'fuck', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'whore', 'slut', 'nigg', 'fag', 'retard',
  'rape', 'asshole', 'bastard', 'wank', 'twat', 'penis', 'vagina', 'porn', 'sex',
  'nazi', 'hitler', 'kkk', 'isis',
];
const NICK_RE = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ _.-]+$/;
const LEET = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n', 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's' };

/** null si el apodo vale; si no, la clave del error (nick.err.*). */
export function nickError(nick) {
  if (nick !== nick.trim()) return 'spaces';
  if (nick.length < 3 || nick.length > 16) return 'length';
  if (!NICK_RE.test(nick)) return 'chars';
  const norm = [...nick.toLowerCase()].map((c) => LEET[c] ?? c).join('').replace(/[^a-z]/g, '');
  if (BANNED.some((w) => norm.includes(w))) return 'offensive';
  return null;
}

/** Error con un código legible (mensaje del servidor o 'offline'). */
class OnlineError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

const SERVER_CODES = ['bad_nick', 'nick_taken', 'busy', 'bad_code', 'bad_account', 'banned', 'bad_score', 'impossible_score', 'rate_limited'];

async function rpc(name, args) {
  const O = CONFIG.online;
  if (!O.enabled || !O.url || !O.key) throw new OnlineError('disabled');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), O.timeout);
  let res;
  try {
    res = await fetch(`${O.url.replace(/\/+$/, '').replace(/\/rest\/v1$/, '')}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: O.key, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      signal: ctrl.signal,
    });
  } catch {
    throw new OnlineError('offline');
  } finally {
    clearTimeout(timer);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* sin cuerpo */
  }
  if (!res.ok) {
    const msg = String(data?.message ?? '');
    throw new OnlineError(SERVER_CODES.find((c) => msg.includes(c)) ?? (res.status === 404 ? 'not_setup' : 'server'));
  }
  return data;
}

/** Lunes de esta semana (clave para el mejor de la semana en este dispositivo). */
function weekKey(d = new Date()) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return `${m.getFullYear()}-${m.getMonth() + 1}-${m.getDate()}`;
}

const listeners = new Set();

export const Online = {
  get data() {
    return Save.data.online;
  },

  get account() {
    const o = this.data;
    return o.id && o.code ? { id: o.id, nick: o.nick, code: o.code } : null;
  },

  onChange(fn) {
    listeners.add(fn);
  },

  emit() {
    for (const fn of listeners) fn();
  },

  async createAccount(nick) {
    const err = nickError(nick);
    if (err) throw new OnlineError(`nick_${err}`);
    const r = await rpc('create_player', { p_nick: nick });
    Object.assign(this.data, { id: r.id, nick: r.nick, code: r.code, bestSent: 0, weekBest: 0 });
    Save.save();
    this.emit();
    // si había un récord esperando, se sube ya
    return { ...r, submit: await this.flush() };
  },

  async recover(code) {
    const clean = String(code).trim().toUpperCase();
    const r = await rpc('recover_player', { p_code: clean });
    Object.assign(this.data, { id: r.id, nick: r.nick, code: clean, bestSent: 0, weekBest: 0 });
    Save.save();
    this.emit();
    return { ...r, submit: await this.flush() };
  },

  /**
   * Al terminar una partida. Si mejora tu récord (o tu mejor marca de la
   * semana) queda pendiente de subir y se intenta subir ya.
   * Devuelve { queued: si queda para subir, done: promesa con la respuesta o null }.
   */
  recordRun({ distance, duration, hero, prestige }) {
    const o = this.data;
    const wk = weekKey();
    if (o.week !== wk) {
      o.week = wk;
      o.weekBest = 0;
    }
    const d = Math.floor(distance);
    const none = { queued: false, done: Promise.resolve(null) };
    if (d < CONFIG.online.minDistance) return none;
    // se sube si mejora tu mejor marca en el ranking o la de esta semana
    const better = d > o.bestSent || d > o.weekBest;
    if (!better) return none;
    if (!o.pending || d > o.pending.distance) o.pending = { distance: d, duration: Math.round(duration * 10) / 10, hero, prestige, week: wk };
    Save.save();
    return { queued: true, done: this.flush() };
  },

  /** Sube la puntuación pendiente (si hay cuenta y conexión). */
  async flush() {
    const o = this.data;
    const acc = this.account;
    if (!o.pending || !acc || this.flushing) return null;
    this.flushing = true;
    const p = o.pending;
    try {
      const r = await rpc('submit_score', { p_id: acc.id, p_code: acc.code, p_distance: p.distance, p_duration: p.duration, p_hero: p.hero, p_prestige: p.prestige });
      o.pending = null;
      o.bestSent = Math.max(o.bestSent, r.best_all ?? p.distance);
      if (p.week === o.week) o.weekBest = Math.max(o.weekBest, r.best_week ?? p.distance);
      o.lastRank = { all: r.rank_all, week: r.rank_week, at: Date.now() };
      Save.save();
      this.emit();
      return r;
    } catch (e) {
      // imposibles o cuenta inválida: se descarta; sin conexión o límite: se reintenta luego
      if (['impossible_score', 'bad_score', 'banned'].includes(e.code)) o.pending = null;
      if (e.code === 'bad_account') Object.assign(o, { id: null, code: null });
      Save.save();
      return null;
    } finally {
      this.flushing = false;
    }
  },

  leaderboard(period) {
    return rpc('leaderboard', { p_period: period });
  },

  myRank(period) {
    const acc = this.account;
    if (!acc) return Promise.resolve(null);
    return rpc('my_rank', { p_id: acc.id, p_code: acc.code, p_period: period });
  },

  /** Reintenta lo pendiente al arrancar y al recuperar la conexión. */
  init() {
    window.addEventListener('online', () => this.flush());
    setTimeout(() => this.flush(), 3000);
  },
};
