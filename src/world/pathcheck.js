// GARANTÍA DE CAMINO
// Antes de dar por bueno cada grupo de obstáculos, el generador comprueba que
// existe al menos un camino para el jugador con la FÍSICA REAL del juego (se usa
// el propio Player.update: salto, salto largo, doble salto, jetpack, personajes,
// vehículos y techos de coche), la velocidad a la que irá y obstáculos que se
// mueven de verdad (se simula una copia de cada uno avanzando en el tiempo).
//
// Cómo: búsqueda en anchura en el tiempo. Cada estado es un jugador posible
// (altura, velocidad vertical, si está en el suelo, dobles saltos…). Cada
// CONFIG.pathcheck.decision s se ramifica en "pulsar" / "no pulsar" (nadie
// reacciona a cada frame), se descartan los estados que chocan (con un margen
// alrededor de la caja: el hueco tiene que ser claramente más grande que el
// personaje) y se agrupan los casi iguales. Si no queda ninguno, no hay camino.
//
// No se simulan los ATAQUES (misiles, balas, helicóptero, jefe): te apuntan a
// ti y se esquivan con su aviso; para ellos está la regla de "combinaciones
// prohibidas" del generador (world/spawner.js).

import { CONFIG } from '../config.js';
import { Player } from '../entities/player.js';
import { supportUnder } from '../systems/platforms.js';
import { Sound } from '../core/audio.js';
import { Quality } from '../core/quality.js';

/** Tipos que no se simulan (ataques dirigidos y escondites, que no hacen daño). */
export const ATTACK_TYPES = new Set(['missile', 'bullet', 'heli', 'hideout']);

// ---------- copias de obstáculos ----------

const SHARED = new Set(['cfg', 'color', 'colors', 'ad', 'roofs', 'word']);

function deep(v, depth) {
  if (v === null || typeof v !== 'object' || depth > 4) return v;
  if (Array.isArray(v)) return v.map((x) => deep(x, depth + 1));
  if (Object.getPrototypeOf(v) !== Object.prototype) return v;
  const o = {};
  for (const k in v) o[k] = deep(v[k], depth + 1);
  return o;
}

/** Copia independiente de un obstáculo (mismo comportamiento, sin tocar el original). */
export function cloneObstacle(o) {
  const c = Object.create(Object.getPrototypeOf(o));
  for (const k of Object.keys(o)) c[k] = SHARED.has(k) ? o[k] : deep(o[k], 0);
  c.src = o;
  return c;
}

// "Juego de mentira" para que las copias se muevan sin efectos (sonidos,
// partículas, estrellas…): lo que no existe devuelve una función que no hace nada.
const NOOP = new Proxy(function () {}, {
  get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : NOOP),
  apply: () => NOOP,
});

export function stubGame(g) {
  const p = g.player;
  const player = {
    x: p.x, y: p.y, vy: 0, w: p.w, h: p.h, onFoot: p.onFoot, onGround: true,
    get left() { return this.x - this.w / 2; },
    get right() { return this.x + this.w / 2; },
    get top() { return this.y - this.h / 2; },
    get bottom() { return this.y + this.h / 2; },
    bounce() {},
  };
  const base = {
    view: g.view,
    speed: g.speed,
    t: g.t,
    difficulty: g.difficulty,
    distance: g.distance,
    warnMult: g.warnMult,
    policeLevel: g.policeLevel,
    wanted: { stars: g.wanted.stars, add() {} },
    zone: g.zone,
    dead: false,
    player,
    camera: { x: g.camera.x, addShake() {} },
    obstacles: [],
    stats: {},
  };
  return new Proxy(base, { get: (t, k) => (k in t ? t[k] : NOOP) });
}

// ---------- estados del jugador ----------

// Estado de física del jugador: la misma física (Player.update) pero sin la parte
// visual (poses, animación) y copiando solo lo necesario, que se hace miles de veces.
const SimPlayer = Object.create(Player.prototype);
SimPlayer.finishStep = function () {};
const FIELDS = ['x', 'y', 'vy', 'w', 'h', 'thrust', 'onGround', 'launchT', 'onFoot', 'prevHeld', 'jumpBuf', 'coyote', 'jumpHold', 'airJumps', 'flip', 'mods', 'vehicle', 'held'];

function clonePlayer(p) {
  const c = Object.create(SimPlayer);
  for (const k of FIELDS) c[k] = p[k];
  return c;
}

function key(s) {
  return `${Math.round(s.y / 6)}|${Math.round(s.vy / 60)}|${s.onGround ? 1 : 0}|${s.airJumps}|${s.prevHeld ? 1 : 0}|${s.jumpHold > 0 ? 1 : 0}|${s.thrust > 0.5 ? 1 : 0}|${s.onFoot ? 1 : 0}|${s.held ? 1 : 0}`;
}

function thin(list, max) {
  const seen = new Map();
  for (const s of list) {
    const k = key(s);
    if (!seen.has(k)) seen.set(k, s);
  }
  let out = [...seen.values()];
  if (out.length > max) {
    // se queda con una muestra repartida por alturas (los extremos incluidos)
    out.sort((a, b) => a.y - b.y || a.vy - b.vy);
    const step = out.length / max;
    out = Array.from({ length: max }, (_, i) => out[Math.floor(i * step)]);
  }
  return out;
}

/** Borde izquierdo de lo que puede ocupar un obstáculo (para saber desde dónde hay que comprobar). */
export function leftOf(o) {
  if (o.type === 'wrecking') return o.ax - (o.L ?? 300) - (o.r ?? 30);
  if (o.type === 'cable') return o.x - o.len / 2 - 20;
  if (o.minor) return o.x - o.w;
  return o.x ?? 0;
}

/** Cuánto puede llegar un obstáculo a la izquierda de su x (bola de demolición: el arco). */
function reach(c) {
  if (c.type === 'wrecking') return (c.L ?? 300) + 60;
  if (c.type === 'cable') return c.len / 2 + 20;
  return 60;
}

/** Caja del jugador con margen (el hueco tiene que sobrar). */
function hitbox(s, m) {
  const b = s.hitbox;
  return { l: b.l - m, r: b.r + m, t: b.t - m, b: b.b + m };
}

/**
 * Frontera de partida: el jugador tal y como está ahora (y, si va a pie en el
 * suelo, también a punto de saltar, que es lo mismo).
 */
export function startStates(g) {
  const s = clonePlayer(g.player);
  s.dead = false;
  return { x: g.player.x, t: 0, states: [s], mode: modeKey(g) };
}

/** Lo que cambia la física: a pie / jetpack, personaje y vehículo. */
export function modeKey(g) {
  const p = g.player;
  return `${p.onFoot ? 'foot' : 'jet'}|${g.powers.char}|${p.vehicle ?? '-'}|${p.mods.gravity}|${p.mods.thrust}`;
}

/** Obstáculos que se simulan entre x0 y x1. */
function relevant(g, x0, x1, extra = []) {
  const list = [];
  for (const o of [...g.obstacles, ...extra]) {
    if (!o.alive || o.ko || ATTACK_TYPES.has(o.type)) continue;
    const c = g.centerOf(o);
    const right = o.right ?? c.x + 200;
    // las patrullas vienen hacia ti: se tienen en cuenta aunque aún estén lejos
    const far = o.type === 'car' ? x1 + 2600 : x1 + 500;
    if (right < x0 - 300 || c.x > far) continue;
    if (o.type === 'dog' && o.state === 'warn') continue; // aún no ha salido (viene por detrás)
    list.push(o);
  }
  return list;
}

/**
 * Propaga la frontera (estados posibles del jugador en frontier.x) hasta x1.
 * Devuelve { ok, frontier, blocker } — blocker: el obstáculo que más caminos cortó al fallar.
 * extra: obstáculos que aún no están en el juego (el grupo que se quiere colocar).
 */
export function propagate(g, frontier, x1, extra = [], opts = {}) {
  const P = CONFIG.pathcheck;
  const dt = opts.dt ?? P.dt;
  const decision = Math.max(1, Math.round((opts.decision ?? P.decision) / dt));
  const maxStates = opts.maxStates ?? (Quality.high ? P.maxStates : P.maxStatesLow);
  const margin = opts.margin ?? P.margin;
  const speed = Math.max(g.targetSpeed(), g.speed, 1) * (g.timeScale ?? 1);
  const gy = g.view.groundY;
  const x0 = frontier.x;
  if (x1 <= x0) return { ok: true, frontier };
  const lead = Math.max(0, (x0 - g.player.x) / speed); // s hasta que el jugador llegue a x0
  const obs = relevant(g, x0, x1, extra);
  const clones = obs.map(cloneObstacle);
  const sg = stubGame(g);
  const frames = Math.ceil((x1 - x0) / speed / dt);
  const kills = new Map();
  const near = [];
  const roofs = [];
  let states = frontier.states.map(clonePlayer);
  Sound.silent = (Sound.silent ?? 0) + 1;
  try {
    // las copias avanzan hasta el momento en que llegas a x0
    const step = (h) => {
      sg.t += h;
      sg.player.x += speed * h;
      sg.camera.x += speed * h;
      for (const c of clones) if (c.alive) c.update(h, sg);
    };
    for (let t = 0; t < lead; t += 1 / 30) step(Math.min(1 / 30, lead - t));
    sg.player.x = x0;
    sg.camera.x = x0 - g.view.w * CONFIG.player.screenX;
    for (let f = 0; f < frames; f++) {
      // decisiones: pulsar o no (cada "decision" frames)
      if (f % decision === 0) {
        const next = [];
        for (const s of states) {
          for (const held of [false, true]) {
            const c = clonePlayer(s);
            c.held = held;
            next.push(c);
          }
        }
        states = thin(next, maxStates);
      }
      step(dt);
      kills.clear(); // quién corta los caminos en este frame
      // solo los obstáculos que están a tu altura en x (el resto ni se mira)
      const px = sg.player.x;
      near.length = 0;
      roofs.length = 0;
      for (const c of clones) {
        if (!c.alive || c.ko) continue;
        const r = c.right ?? (c.x ?? 0) + 200;
        if (r < px - 80 || (c.x ?? 0) - reach(c) > px + 80) continue;
        near.push(c);
        if (c.roofs) roofs.push(c);
      }
      const alive = [];
      for (const s of states) {
        const sup = roofs.length ? supportUnder(roofs, s, gy) : null;
        s.update(dt, s.held, speed, sup ? sup.y : gy);
        s.x = px; // la x es la de la partida
        let hit = null;
        if (near.length) {
          const box = hitbox(s, margin);
          for (const c of near) {
            if (c.hits(box)) {
              hit = c;
              break;
            }
          }
        }
        if (hit) kills.set(hit.src, (kills.get(hit.src) ?? 0) + 1);
        else alive.push(s);
      }
      states = alive;
      if (!states.length) {
        let blocker = null;
        let most = 0;
        for (const [o, n] of kills) if (n > most) [blocker, most] = [o, n];
        return { ok: false, blocker, atX: sg.player.x, frontier };
      }
    }
  } finally {
    Sound.silent--;
  }
  return { ok: true, frontier: { x: x1, states: thin(states, maxStates), mode: frontier.mode } };
}
