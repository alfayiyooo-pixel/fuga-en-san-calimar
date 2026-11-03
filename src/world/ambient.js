// VIDA EN EL FONDO (ambiente, sin interacción con el jugador)
//
// Personas, policía, barcos, aviones y elementos propios de cada zona que
// cruzan el decorado. Viven en coordenadas de PANTALLA: cada uno tiene su
// factor de parallax (f) y se desplaza con la cámara como la capa en la que
// está. Se dibujan entre las capas del fondo, en "bandas":
//
//   sky        cielo (aviones, avioneta con pancarta, helicóptero de noticias,
//              parapentes, gaviotas, globo)
//   waterFar   agua lejana (veleros, yates, portacontenedores)
//   far        tras la capa lejana (grúas)
//   waterNear  agua cercana (motos de agua, surfistas, remolcadores)
//   groundFar  suelo lejano (bañistas, paseantes al fondo de la playa)
//   ground     suelo, tras la capa media (gente, coches, policía)
//
// Los colores se mezclan con el tono de la zona para que queden más apagados
// que los obstáculos de verdad. Cantidades y ritmos en CONFIG.ambient.

import { CONFIG } from '../config.js';
import { Quality } from '../core/quality.js';
import { rand, pick, chance, lerp } from '../core/rng.js';
import { t as tr } from '../core/i18n.js';
import { drawGlow } from '../fx/sprites.js';

// ---------------------------------------------------------------
// Colores
// ---------------------------------------------------------------
function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Mezcla un color con el tono de la zona (k = 0 nada, 1 todo). */
function mix(a, b, k) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * k));
  return `#${((1 << 24) | (c[0] << 16) | (c[1] << 8) | c[2]).toString(16).slice(1)}`;
}

const SKINS = ['#f2c9a0', '#e0a878', '#c68a5a', '#8d5a3a', '#5e3a26', '#f6d8b8'];
const HAIR = ['#2a1a14', '#5a3418', '#c98a3a', '#e8d27a', '#8a8a8a', '#1b1420', '#b0402a'];
const SHIRTS = ['#ff5d73', '#19c3b1', '#ffd23f', '#7b5cff', '#ff9a3d', '#5fcf7a', '#4fc3f7', '#f4f1ea', '#e85a9a'];
const PANTS = ['#2a3a6a', '#3a2a40', '#c4ab80', '#5a6a7a', '#1b1420', '#8a4a2a'];
const CARS = ['#ff6b7d', '#4fc3f7', '#9be37a', '#ffb627', '#c9c4b8', '#7b5cff', '#3a3f55'];

// ---------------------------------------------------------------
// Zonas: qué sale en cada banda, dónde y a qué escala
// ---------------------------------------------------------------
// y: [min, max] (función de la vista) · s: [escala en min, escala en max] · f: parallax
const ZONES = {
  beach: {
    tint: '#d88a86', tintK: 0.3, night: false,
    sky: ['plane', 'banner', 'banner', 'news', 'paraglider', 'paraglider', 'gulls', 'gulls'],
    waterFar: ['sailboat', 'sailboat', 'yacht'],
    waterNear: ['jetski', 'jetski', 'surfer', 'surfer', 'sailboat'],
    groundFar: ['bather', 'bather', 'walker', 'tourist', 'jogger', 'kids'],
    ground: ['walker', 'walker', 'tourist', 'jogger', 'scared', 'scared', 'scared'],
    police: ['buggy', 'cop', 'cop'],
    bands: {
      sky: { y: (v) => [55, 175], s: [0.72, 1.01], f: 0.04 },
      waterFar: { y: (v) => [v.h * 0.6 + 6, v.h * 0.6 + 18], s: [0.55, 0.67], f: 0.12 },
      waterNear: { y: (v) => [v.h * 0.6 + 34, v.h * 0.74 - 8], s: [0.72, 1.04], f: 0.22 },
      groundFar: { y: (v) => [v.h * 0.74 + 10, v.h * 0.74 + 24], s: [0.72, 0.84], f: 0.34 },
      ground: { y: (v) => [v.groundY - 22, v.groundY - 10], s: [1.07, 1.19], f: 0.5 },
    },
    policeBand: 'groundFar',
  },
  finance: {
    tint: '#2c2a5e', tintK: 0.42, night: true,
    sky: ['plane', 'plane', 'news', 'news', 'blimp'],
    ground: ['office', 'office', 'walker', 'tourist', 'jogger', 'scared', 'taxi', 'taxi', 'sedan'],
    police: ['patrol', 'patrol', 'cop'],
    bands: {
      sky: { y: () => [50, 150], s: [0.72, 0.94], f: 0.04 },
      ground: { y: (v) => [v.groundY - 3, v.groundY - 3], s: [0.87, 0.87], f: 0.48 },
    },
    policeBand: 'ground',
  },
  industrial: {
    tint: '#8a4a48', tintK: 0.36, night: false,
    sky: ['plane', 'news', 'gulls', 'blimp'],
    far: ['crane', 'crane'],
    ground: ['worker', 'worker', 'truck', 'truck', 'forklift', 'walker', 'scared'],
    police: ['patrol', 'patrol', 'cop'],
    bands: {
      sky: { y: () => [50, 140], s: [0.72, 0.94], f: 0.04 },
      far: { y: (v) => [v.groundY - 30, v.groundY - 30], s: [0.75, 0.9], f: 0.22 },
      ground: { y: (v) => [v.groundY - 3, v.groundY - 3], s: [0.87, 0.87], f: 0.48 },
    },
    policeBand: 'ground',
  },
  hills: {
    tint: '#9ec2dc', tintK: 0.3, night: false,
    sky: ['paraglider', 'paraglider', 'balloon', 'banner', 'plane', 'news', 'gulls'],
    ground: ['lux', 'lux', 'sedan', 'jogger', 'dogwalker', 'dogwalker', 'walker', 'scared', 'tourist'],
    police: ['patrol', 'patrol', 'cop'],
    bands: {
      sky: { y: () => [55, 170], s: [0.72, 1.01], f: 0.04 },
      ground: { y: (v) => [v.groundY - 8, v.groundY - 8], s: [0.9, 0.9], f: 0.48 },
    },
    policeBand: 'ground',
  },
  port: {
    tint: '#33366e', tintK: 0.4, night: true,
    sky: ['plane', 'plane', 'news', 'gulls', 'gulls'],
    waterFar: ['ship', 'ship', 'sailboat', 'yacht'],
    far: ['gantry'],
    waterNear: ['tug', 'tug', 'jetski', 'sailboat'],
    ground: ['worker', 'worker', 'forklift', 'truck', 'walker', 'scared'],
    police: ['patrol', 'patrol', 'cop'],
    bands: {
      sky: { y: () => [50, 150], s: [0.72, 0.94], f: 0.04 },
      waterFar: { y: (v) => [v.h * 0.62 + 6, v.h * 0.62 + 14], s: [0.61, 0.72], f: 0.1 },
      far: { y: (v) => [v.h * 0.62 + 30, v.h * 0.62 + 30], s: [0.8, 0.8], f: 0.18 },
      waterNear: { y: (v) => [v.h * 0.62 + 30, v.h * 0.62 + 64], s: [0.72, 0.96], f: 0.2 },
      ground: { y: (v) => [v.groundY - 3, v.groundY - 3], s: [0.87, 0.87], f: 0.48 },
    },
    policeBand: 'ground',
  },
};

const BANNERS = 4; // textos amb.banner.1..4

// ---------------------------------------------------------------
// Ambiente
// ---------------------------------------------------------------
export class Ambient {
  constructor() {
    this.list = [];
    this.timers = {};
    this.lastCam = null;
    this.lastT = null;
    this.camV = 0;
  }

  reset() {
    this.list.length = 0;
    this.timers = {};
    this.lastCam = null;
  }

  /** Avanza el ambiente. zone: tema actual; stars: estrellas de búsqueda. */
  update(dt, g, zoneId, stars, playerSX) {
    const A = CONFIG.ambient;
    if (!A.enabled) return;
    const v = g.view;
    const cam = g.camera.x;
    let dx = this.lastCam === null ? 0 : cam - this.lastCam;
    this.lastCam = cam;
    if (Math.abs(dx) > 600) {
      // salto de cámara (nueva partida, revivir…): se empieza de cero
      this.list.length = 0;
      dx = 0;
    }
    if (dt > 0) this.camV += (dx / dt - this.camV) * Math.min(1, dt * 4);
    for (const a of this.list) {
      a.x += -dx * a.f + a.vx * dt;
      a.t += dt;
      a.behave?.(a, dt, playerSX);
    }
    this.list = this.list.filter((a) => a.x > -360 && a.x < v.w + 460 && !(a.life !== undefined && a.t > a.life));

    const Z = ZONES[zoneId];
    if (!Z) return;
    const low = !Quality.settings.detail;
    const max = low ? A.maxLow : A.maxHigh;
    // bandas normales
    for (const band of Object.keys(A.every)) {
      if (!Z[band] || !Z.bands[band]) continue;
      const key = `${zoneId}:${band}`;
      if (this.timers[key] === undefined) this.timers[key] = rand(0, A.every[band][1] * 0.5);
      this.timers[key] -= dt;
      if (this.timers[key] > 0) continue;
      this.timers[key] = rand(...A.every[band]) * (low ? 1.6 : 1);
      if (this.list.length >= max) continue;
      if (this.list.filter((a) => a.band === band).length >= (A.perBand[band] ?? 2)) continue;
      this.spawn(pick(Z[band]), band, Z, zoneId, v, g);
    }
    // policía: más cuantas más estrellas
    if (stars > 0) {
      const key = `${zoneId}:police`;
      if (this.timers[key] === undefined) this.timers[key] = rand(1, 4);
      this.timers[key] -= dt * stars;
      const cops = this.list.filter((a) => a.police).length;
      if (this.timers[key] <= 0) {
        this.timers[key] = rand(...A.policeEvery);
        if (cops < Math.min(A.policeMax, Math.ceil(stars / 2)) && this.list.length < max + 2) this.spawn(pick(Z.police), Z.policeBand, Z, zoneId, v, g, true);
      }
    }
  }

  /** Crea un elemento. */
  spawn(kind, band, Z, zoneId, v, g, police = false) {
    const B = Z.bands[band];
    const [y0, y1] = B.y(v);
    const k = Math.random();
    const y = lerp(y0, y1, k);
    const s = lerp(B.s[0], B.s[1], k);
    const a = { kind, band, zone: zoneId, police, x: 0, y, s, f: B.f, vx: 0, t: rand(0, 5), dir: -1, seed: Math.random() };
    const tint = (c, extra = 0) => mix(c, Z.tint, Z.tintK + extra);
    a.ink = mix('#1b1030', Z.tint, 0.25);
    const person = (top = pick(SHIRTS), bottom = pick(PANTS)) => {
      a.c = { skin: tint(pick(SKINS)), hair: tint(pick(HAIR)), top: tint(top), bottom: tint(bottom), shoe: tint('#2a2230') };
    };
    const vehicle = (body) => {
      a.c = { body: tint(body), glass: tint('#bfe8ff', 0.1), wheel: tint('#1b1420'), dark: tint('#3a3048') };
    };
    switch (kind) {
      // ---- personas ----
      case 'walker': case 'tourist': case 'office': case 'worker': case 'scared': case 'dogwalker':
        person(kind === 'office' ? pick(['#f4f1ea', '#bfe8ff', '#ffe0e8']) : kind === 'worker' ? '#ff9a3d' : undefined,
          kind === 'office' ? pick(['#2a3a6a', '#3a3f55', '#1b1420']) : undefined);
        a.dir = chance(0.5) ? 1 : -1;
        a.vx = kind === 'tourist' ? 0 : a.dir * rand(22, 38) * s;
        a.pose = kind === 'tourist' ? 'photo' : 'walk';
        a.hat = kind === 'tourist' ? 'sun' : kind === 'worker' ? 'hard' : chance(0.2) ? 'cap' : null;
        a.item = kind === 'office' ? 'briefcase' : kind === 'tourist' ? 'camera' : kind === 'dogwalker' ? 'dog' : null;
        if (kind === 'tourist') a.dir = -1; // mira hacia el jugador
        if (kind === 'scared') a.scared = true;
        a.behave = behavePerson;
        break;
      case 'jogger':
        person(pick(['#ff5d73', '#19c3b1', '#ffd23f', '#7b5cff']), '#2a2230');
        a.dir = chance(0.5) ? 1 : -1;
        a.vx = a.dir * rand(70, 95) * s;
        a.pose = 'run';
        a.hat = chance(0.4) ? 'band' : null;
        break;
      case 'bather':
        person(pick(['#ff5d73', '#19c3b1', '#ffd23f', '#4fc3f7']), pick(['#ff5d73', '#19c3b1', '#ffd23f', '#4fc3f7']));
        a.pose = pick(['lie', 'stand', 'wave']);
        a.towel = tint(pick(['#ff5d73', '#19c3b1', '#ffd23f', '#7b5cff']));
        a.item = a.pose === 'stand' && chance(0.5) ? 'board' : chance(0.3) ? 'ball' : null;
        a.dir = chance(0.5) ? 1 : -1;
        break;
      case 'kids':
        person(pick(SHIRTS), pick(PANTS));
        a.kid2 = { top: tint(pick(SHIRTS)), skin: tint(pick(SKINS)) };
        a.pose = 'ball';
        a.dir = 1;
        break;
      case 'cop':
        person('#2a4a8a', '#1b2448');
        a.pose = 'point';
        a.hat = 'police';
        a.police = true;
        a.behave = behaveCop;
        break;
      // ---- vehículos de suelo ----
      case 'taxi': case 'sedan': case 'lux': case 'patrol': case 'truck': case 'forklift': case 'buggy':
        vehicle(kind === 'taxi' ? '#ffd23f' : kind === 'patrol' ? '#f4f6ff' : kind === 'lux' ? pick(['#e8334a', '#f4f1ea', '#1b1420', '#ffb627']) : kind === 'truck' ? pick(['#c8463a', '#2e7fb8', '#e0a224']) : kind === 'forklift' ? '#ffb627' : kind === 'buggy' ? '#f4f6ff' : pick(CARS));
        a.dir = kind === 'forklift' ? (chance(0.5) ? 1 : -1) : chance(0.5) ? 1 : -1;
        a.vx = a.dir * (kind === 'forklift' ? rand(20, 30) : kind === 'truck' ? rand(70, 100) : kind === 'patrol' || kind === 'buggy' ? rand(130, 180) : rand(90, 150)) * s;
        if (kind === 'patrol' || kind === 'buggy') a.police = true;
        if (kind === 'lux' || kind === 'buggy') a.driver = tint(pick(SKINS));
        if (kind === 'truck') a.cargo = tint(pick(['#c8463a', '#2e7fb8', '#e0a224', '#3f9a5c', '#e7e2d6']));
        break;
      // ---- agua ----
      case 'sailboat':
        a.c = { hull: tint(pick(['#f4f1ea', '#2e4a7a', '#c8463a'])), sail: tint('#fff4dc', 0.05), sail2: tint(pick(['#ff9a3d', '#19c3b1', '#fff4dc'])) };
        a.dir = chance(0.5) ? 1 : -1;
        a.vx = a.dir * rand(6, 14);
        break;
      case 'yacht':
        a.c = { hull: tint('#f4f6ff'), band: tint(pick(['#2e4a7a', '#19c3b1', '#1b1420'])), glass: tint('#3a5a8a') };
        a.dir = chance(0.5) ? 1 : -1;
        a.vx = a.dir * rand(14, 26);
        break;
      case 'ship':
        a.c = { hull: tint(pick(['#3a3f55', '#7a2a2a', '#2a4a6a'])), boxes: [0, 1, 2, 3, 4, 5].map(() => tint(pick(['#c8463a', '#2e7fb8', '#e0a224', '#3f9a5c', '#e7e2d6']))), bridge: tint('#f4f1ea') };
        a.dir = chance(0.5) ? 1 : -1;
        a.vx = a.dir * rand(5, 9);
        break;
      case 'jetski':
        person(pick(['#ff5d73', '#ffd23f', '#19c3b1']), '#2a2230');
        a.c.body = tint(pick(['#ff5d73', '#ffd23f', '#4fc3f7', '#f4f1ea']));
        a.dir = chance(0.5) ? 1 : -1;
        a.vx = a.dir * rand(70, 110) * s;
        break;
      case 'surfer':
        person(pick(['#1b1420', '#2a3a6a']), '#1b1420');
        a.c.board = tint(pick(['#ffd23f', '#ff5d73', '#19c3b1', '#f4f1ea']));
        a.dir = -1;
        a.vx = -rand(18, 30) * s;
        break;
      case 'tug':
        a.c = { hull: tint(pick(['#c8463a', '#2e4a7a'])), cabin: tint('#f4f1ea'), stack: tint('#1b1420') };
        a.dir = chance(0.5) ? 1 : -1;
        a.vx = a.dir * rand(14, 24);
        break;
      // ---- cielo ----
      case 'plane':
        a.c = { body: tint('#f4f6ff', 0.1), tail: tint(pick(['#ff5d73', '#4fc3f7', '#ffd23f'])) };
        a.dir = chance(0.5) ? 1 : -1;
        a.vx = a.dir * rand(40, 60);
        a.y = rand(35, 90);
        a.s *= 0.6;
        a.night = Z.night;
        break;
      case 'banner':
        a.c = { body: tint(pick(['#ffd23f', '#ff5d73', '#f4f1ea'])), cloth: tint('#fff4dc', 0.05), text: tint('#c8463a') };
        a.dir = -1;
        a.vx = -rand(26, 36);
        a.text = tr(`amb.banner.${1 + Math.floor(Math.random() * BANNERS)}`);
        break;
      case 'news':
        a.c = { body: tint(pick(['#ff9a3d', '#f4f1ea', '#19c3b1'])), dark: tint('#2a2230') };
        a.dir = chance(0.5) ? 1 : -1;
        a.vx = a.dir * rand(14, 26);
        a.s *= 0.75;
        a.night = Z.night;
        break;
      case 'paraglider':
        person(pick(SHIRTS), '#2a2230');
        a.c.wing = [tint(pick(['#ff5d73', '#ffd23f', '#19c3b1', '#7b5cff'])), tint(pick(['#fff4dc', '#ff9a3d', '#4fc3f7']))];
        a.dir = -1;
        a.vx = -rand(8, 16);
        break;
      case 'balloon':
        a.c = { a: tint(pick(['#ff5d73', '#ffd23f', '#19c3b1'])), b: tint(pick(['#fff4dc', '#7b5cff', '#ff9a3d'])), basket: tint('#8a5a34') };
        a.vx = -rand(3, 7);
        a.s *= 1.1;
        break;
      case 'blimp':
        a.c = { body: tint(pick(['#c9c4b8', '#f4f1ea', '#ffd23f'])), fin: tint('#c8463a'), text: tint('#2a2230') };
        a.dir = chance(0.5) ? 1 : -1;
        a.vx = a.dir * rand(6, 10);
        a.y = rand(60, 110);
        a.night = Z.night;
        break;
      case 'gulls':
        a.n = 3 + Math.floor(Math.random() * 3);
        a.c = { bird: tint(Z.night ? '#c9c4d8' : '#3a2a40') };
        a.dir = chance(0.5) ? 1 : -1;
        a.vx = a.dir * rand(30, 50);
        a.s *= 0.9;
        break;
      // ---- elementos fijos de la zona ----
      case 'crane':
        a.c = { steel: tint('#ffb627'), dark: tint('#3a2a20'), load: tint(pick(['#c8463a', '#2e7fb8', '#3f9a5c'])) };
        a.h = rand(150, 210) * s;
        break;
      case 'gantry':
        a.c = { steel: tint('#e0a224'), dark: tint('#2a2230'), load: tint(pick(['#c8463a', '#2e7fb8', '#3f9a5c', '#e7e2d6'])) };
        break;
      default:
        break;
    }
    // aparece por el lado por el que entra en pantalla
    const screenV = a.vx - this.camV * a.f;
    const margin = 120 + 160 * a.s;
    a.x = screenV <= 0 ? v.w + margin : -margin;
    this.list.push(a);
  }

  /** Dibuja los elementos de una banda (solo los de la zona que se está pintando). */
  draw(ctx, band, zoneId, time) {
    if (!CONFIG.ambient.enabled) return;
    for (const a of this.list) {
      if (a.band !== band || a.zone !== zoneId) continue;
      ctx.save();
      ctx.globalAlpha = CONFIG.ambient.alpha;
      DRAW[a.kind]?.(ctx, a, time);
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------
// Comportamientos
// ---------------------------------------------------------------
function behavePerson(a, dt, playerSX) {
  if (!a.scared || a.state === 'flee') return;
  // al pasar el jugador cerca: se asusta y sale corriendo
  if (Math.abs(a.x - playerSX) < 120) {
    a.state = 'flee';
    a.fleeT = a.t;
    a.dir = 1;
    a.pose = 'flee';
    a.vx = 150 * a.s;
  }
}

function behaveCop(a, dt, playerSX) {
  a.aim = playerSX; // señala hacia el jugador
}

// ---------------------------------------------------------------
// Dibujo
// ---------------------------------------------------------------
function line(ctx, x1, y1, x2, y2, w, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/** Persona de perfil (≈ 40 px a escala 1). */
function person(ctx, a, x, y, s, pose = a.pose, dir = a.dir) {
  const c = a.c;
  const T = a.t;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const walk = pose === 'walk' || pose === 'run' || pose === 'flee';
  const rate = pose === 'run' ? 11 : pose === 'flee' ? 14 : 7;
  const p = T * rate + a.seed * 6;
  const sw = walk ? Math.sin(p) : 0;
  const lean = pose === 'run' ? 0.18 * dir : pose === 'flee' ? 0.25 * dir : 0;
  const bob = walk ? Math.abs(Math.cos(p)) * 1.5 * s : 0;
  const hipX = x;
  const hipY = y - 14 * s - bob;
  const shX = x + lean * 14 * s;
  const shY = y - 27 * s - bob;
  // piernas
  const st = (pose === 'run' || pose === 'flee' ? 8 : 5) * s;
  line(ctx, hipX, hipY, x + sw * st, y - 1, 4.2 * s, c.bottom);
  line(ctx, hipX, hipY, x - sw * st, y - 1, 4.2 * s, c.bottom);
  ctx.fillStyle = c.shoe;
  ctx.fillRect(x + sw * st - 2 * s + dir * 1 * s, y - 2.5 * s, 4.5 * s, 2.5 * s);
  ctx.fillRect(x - sw * st - 2 * s + dir * 1 * s, y - 2.5 * s, 4.5 * s, 2.5 * s);
  // perro (paseador)
  if (a.item === 'dog') drawDog(ctx, x + dir * 22 * s, y, s, dir, T, a.ink);
  // torso
  ctx.strokeStyle = c.top;
  ctx.lineWidth = 9 * s;
  ctx.beginPath();
  ctx.moveTo(hipX, hipY + 1 * s);
  ctx.lineTo(shX, shY + 2 * s);
  ctx.stroke();
  if (a.kind === 'worker') {
    // chaleco reflectante
    ctx.strokeStyle = 'rgba(255, 255, 210, 0.55)';
    ctx.lineWidth = 1.4 * s;
    ctx.beginPath();
    ctx.moveTo(hipX - 3 * s, hipY - 4 * s);
    ctx.lineTo(shX + 3 * s, hipY - 4 * s);
    ctx.stroke();
  }
  // brazos
  const arm = 4 * s;
  if (pose === 'photo') {
    line(ctx, shX, shY + 2 * s, shX + dir * 9 * s, shY - 2 * s, arm * 0.8, c.skin);
    ctx.fillStyle = '#1b1420';
    ctx.fillRect(shX + dir * 9 * s - 3 * s, shY - 6 * s, 6 * s, 4.5 * s);
    // flash de vez en cuando
    if ((T + a.seed * 3) % 2.6 < 0.12) drawGlow(ctx, shX + dir * 10 * s, shY - 4 * s, 11 * s, 'rgba(255, 255, 240, 0.9)', 0.8);
  } else if (pose === 'point') {
    const tx = a.aim ?? x - 200;
    const d = tx < x ? -1 : 1;
    const wave = Math.sin(T * 6) * 1.5 * s;
    line(ctx, shX, shY + 2 * s, shX + d * 12 * s, shY - 2 * s + wave, arm * 0.8, c.top);
    ctx.fillStyle = c.skin;
    ctx.beginPath();
    ctx.arc(shX + d * 13 * s, shY - 2 * s + wave, 1.8 * s, 0, Math.PI * 2);
    ctx.fill();
    line(ctx, shX, shY + 2 * s, shX - d * 3 * s, hipY, arm * 0.8, c.top);
    dir = d;
  } else if (pose === 'wave') {
    const w = Math.sin(T * 8) * 3 * s;
    line(ctx, shX, shY + 2 * s, shX + 4 * s + w, shY - 10 * s, arm * 0.8, c.skin);
    line(ctx, shX, shY + 2 * s, shX - 3 * s, hipY, arm * 0.8, c.skin);
  } else if (pose === 'flee') {
    // brazos arriba, corriendo
    line(ctx, shX, shY + 2 * s, shX - 4 * s, shY - 10 * s + Math.sin(p) * 2 * s, arm * 0.8, c.skin);
    line(ctx, shX, shY + 2 * s, shX + 5 * s, shY - 9 * s - Math.sin(p) * 2 * s, arm * 0.8, c.skin);
  } else {
    const swing = walk ? sw * (pose === 'run' ? 7 : 5) * s : 0;
    line(ctx, shX, shY + 2 * s, shX - swing, hipY + 1 * s, arm * 0.8, c.top);
    line(ctx, shX, shY + 2 * s, shX + swing, hipY + 1 * s, arm * 0.8, c.top);
    if (a.item === 'briefcase') {
      ctx.fillStyle = mix('#5a3a20', '#3a3048', 0.3);
      ctx.fillRect(shX + swing - 4 * s, hipY, 8 * s, 5.5 * s);
    } else if (a.item === 'board') {
      ctx.fillStyle = a.c.board ?? a.towel;
      ctx.beginPath();
      ctx.ellipse(x + dir * 7 * s, y - 18 * s, 3 * s, 17 * s, dir * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // cabeza
  const hx = shX + dir * 1.5 * s;
  const hy = shY - 6 * s;
  ctx.fillStyle = c.skin;
  ctx.beginPath();
  ctx.arc(hx, hy, 5.2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.hair;
  ctx.beginPath();
  ctx.arc(hx - dir * 0.8 * s, hy - 1 * s, 5.4 * s, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fill();
  ctx.fillStyle = a.ink;
  ctx.fillRect(hx + dir * 2.2 * s - 0.8 * s, hy - 1 * s, 1.6 * s, 1.6 * s);
  drawHat(ctx, a, hx, hy, s, dir);
  // "¡!" al asustarse
  if (pose === 'flee' && a.t - a.fleeT < 1.1) {
    ctx.fillStyle = '#fff4dc';
    ctx.font = `bold ${Math.round(14 * s)}px 'Bungee', Impact, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('!', hx, hy - 10 * s);
  }
  ctx.lineCap = 'butt';
}

function drawHat(ctx, a, hx, hy, s, dir) {
  if (!a.hat) return;
  if (a.hat === 'sun') {
    ctx.fillStyle = mix('#f4e1a8', a.c.top, 0.2);
    ctx.fillRect(hx - 8 * s, hy - 4.5 * s, 16 * s, 2 * s);
    ctx.beginPath();
    ctx.arc(hx, hy - 4.5 * s, 4.5 * s, Math.PI, 0);
    ctx.fill();
  } else if (a.hat === 'hard') {
    ctx.fillStyle = mix('#ffd23f', a.c.top, 0.15);
    ctx.beginPath();
    ctx.arc(hx, hy - 2.5 * s, 5.6 * s, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(hx - 7 * s, hy - 3 * s, 14 * s, 1.6 * s);
  } else if (a.hat === 'police') {
    ctx.fillStyle = mix('#1b2448', a.c.top, 0.1);
    ctx.fillRect(hx - 5.5 * s, hy - 7.5 * s, 11 * s, 4.5 * s);
    ctx.fillRect(hx + (dir > 0 ? 0 : -8 * s), hy - 3.5 * s, 8 * s, 1.6 * s);
    ctx.fillStyle = mix('#ffd23f', a.c.top, 0.2);
    ctx.fillRect(hx - 1 * s, hy - 6.5 * s, 2 * s, 2 * s);
  } else if (a.hat === 'cap') {
    ctx.fillStyle = a.c.top;
    ctx.beginPath();
    ctx.arc(hx, hy - 2 * s, 5.4 * s, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(hx + (dir > 0 ? 2 * s : -8 * s), hy - 3 * s, 6 * s, 1.6 * s);
  } else if (a.hat === 'band') {
    ctx.fillStyle = mix('#fff4dc', a.c.top, 0.3);
    ctx.fillRect(hx - 5.2 * s, hy - 4 * s, 10.4 * s, 1.8 * s);
  }
}

function drawDog(ctx, x, y, s, dir, T, ink) {
  const p = Math.sin(T * 12);
  ctx.fillStyle = mix('#c98a52', ink, 0.25);
  ctx.fillRect(x - 6 * s, y - 9 * s, 12 * s, 5 * s);
  ctx.fillRect(x + dir * 5 * s - 2.5 * s, y - 13 * s, 5 * s, 5 * s);
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = 1.8 * s;
  ctx.beginPath();
  ctx.moveTo(x - 4 * s, y - 5 * s); ctx.lineTo(x - 4 * s + p * 2 * s, y);
  ctx.moveTo(x + 4 * s, y - 5 * s); ctx.lineTo(x + 4 * s - p * 2 * s, y);
  ctx.moveTo(x - dir * 6 * s, y - 8 * s); ctx.lineTo(x - dir * 9 * s, y - 12 * s + p * s);
  ctx.stroke();
  // correa
  ctx.strokeStyle = 'rgba(30, 20, 40, 0.5)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x + dir * 5 * s, y - 11 * s);
  ctx.quadraticCurveTo(x - dir * 8 * s, y - 6 * s, x - dir * 20 * s, y - 15 * s);
  ctx.stroke();
}

/** Coche/vehículo de perfil (≈ 64 px a escala 1). */
function car(ctx, a, time) {
  const s = a.s;
  const x = a.x;
  const y = a.y;
  const d = a.dir;
  const c = a.c;
  const k = a.kind;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(d > 0 ? -1 : 1, 1); // dibujado mirando a la izquierda
  const W = (k === 'truck' ? 118 : k === 'lux' ? 70 : k === 'forklift' ? 34 : k === 'buggy' ? 46 : 64) * s;
  const wheelR = (k === 'buggy' ? 7 : k === 'truck' ? 6 : 5) * s;
  const bounce = Math.abs(Math.sin(a.t * 18 + a.seed * 9)) * (k === 'buggy' ? 1.4 : 0.5) * s;
  ctx.translate(0, -bounce);
  // sombra
  ctx.fillStyle = 'rgba(10, 5, 30, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, bounce + 1, W * 0.55, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  const body = c.body;
  if (k === 'truck') {
    ctx.fillStyle = body;
    rr(ctx, -W / 2, -30 * s, 30 * s, 24 * s, 3 * s);
    ctx.fill();
    ctx.fillStyle = c.glass;
    ctx.fillRect(-W / 2 + 4 * s, -26 * s, 12 * s, 9 * s);
    ctx.fillStyle = a.cargo;
    ctx.fillRect(-W / 2 + 32 * s, -38 * s, W - 32 * s, 32 * s);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let i = 0; i < 6; i++) ctx.fillRect(-W / 2 + 36 * s + i * 13 * s, -36 * s, 2 * s, 28 * s);
    ctx.fillStyle = c.dark;
    ctx.fillRect(-W / 2, -8 * s, W, 3 * s);
  } else if (k === 'forklift') {
    ctx.fillStyle = body;
    ctx.fillRect(-W / 2 + 6 * s, -18 * s, 24 * s, 12 * s);
    ctx.strokeStyle = c.dark;
    ctx.lineWidth = 2 * s;
    ctx.strokeRect(-W / 2 + 10 * s, -32 * s, 16 * s, 14 * s);
    ctx.fillStyle = c.dark;
    ctx.fillRect(-W / 2, -38 * s, 3 * s, 32 * s);
    const lift = (Math.sin(a.t * 1.2) * 0.5 + 0.5) * 16 * s;
    ctx.fillRect(-W / 2 - 10 * s, -8 * s - lift, 12 * s, 2 * s);
    ctx.fillStyle = mix('#8a5a34', c.body, 0.2);
    ctx.fillRect(-W / 2 - 10 * s, -18 * s - lift, 12 * s, 10 * s);
  } else if (k === 'buggy') {
    ctx.strokeStyle = c.dark;
    ctx.lineWidth = 2.2 * s;
    ctx.strokeRect(-W / 2 + 8 * s, -28 * s, 26 * s, 16 * s);
    ctx.fillStyle = body;
    rr(ctx, -W / 2, -16 * s, W, 9 * s, 3 * s);
    ctx.fill();
    ctx.fillStyle = mix('#2a4a8a', body, 0.2);
    ctx.fillRect(-W / 2 + 4 * s, -14 * s, W - 8 * s, 3 * s);
    ctx.fillStyle = a.driver;
    ctx.beginPath();
    ctx.arc(-W / 2 + 22 * s, -22 * s, 4 * s, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // berlina, taxi, patrulla, deportivo
    const roofH = k === 'lux' ? 0 : 11 * s;
    ctx.fillStyle = body;
    rr(ctx, -W / 2, -17 * s, W, 12 * s, 4 * s);
    ctx.fill();
    if (roofH) {
      ctx.beginPath();
      ctx.moveTo(-W * 0.28, -17 * s);
      ctx.lineTo(-W * 0.16, -17 * s - roofH);
      ctx.lineTo(W * 0.2, -17 * s - roofH);
      ctx.lineTo(W * 0.32, -17 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = c.glass;
      ctx.beginPath();
      ctx.moveTo(-W * 0.24, -18 * s);
      ctx.lineTo(-W * 0.14, -16 * s - roofH + 2 * s);
      ctx.lineTo(W * 0.02, -16 * s - roofH + 2 * s);
      ctx.lineTo(W * 0.02, -18 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(W * 0.05, -16 * s - roofH + 2 * s, W * 0.14, roofH - 3 * s);
    } else {
      // descapotable: parabrisas y conductor con gafas de sol
      ctx.strokeStyle = c.glass;
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(-W * 0.2, -17 * s);
      ctx.lineTo(-W * 0.12, -25 * s);
      ctx.stroke();
      ctx.fillStyle = a.driver;
      ctx.beginPath();
      ctx.arc(0, -22 * s, 4.2 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1b1420';
      ctx.fillRect(-4.5 * s, -23.5 * s, 4 * s, 1.6 * s);
      // pañuelo al viento
      ctx.strokeStyle = mix('#ff5d73', c.body, 0.2);
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(2 * s, -24 * s);
      ctx.quadraticCurveTo(8 * s, -26 * s + Math.sin(a.t * 14) * 2 * s, 13 * s, -23 * s);
      ctx.stroke();
    }
    if (k === 'taxi') {
      ctx.fillStyle = '#1b1420';
      for (let i = 0; i < 6; i++) if (i % 2 === 0) ctx.fillRect(-W / 2 + 6 * s + i * 8 * s, -11 * s, 8 * s, 2.5 * s);
      ctx.fillStyle = mix('#fff4dc', body, 0.3);
      ctx.fillRect(-5 * s, -17 * s - roofH - 5 * s, 10 * s, 5 * s);
    }
    if (k === 'patrol') {
      ctx.fillStyle = mix('#1b2448', body, 0.1);
      ctx.fillRect(-W * 0.22, -16 * s, W * 0.44, 10 * s);
      ctx.fillStyle = body;
      ctx.fillRect(-W * 0.06, -14 * s, W * 0.12, 5 * s);
    }
  }
  // luces de policía
  if (k === 'patrol' || k === 'buggy') {
    const on = Math.floor(time * 7 + a.seed * 4) % 2 === 0;
    const ly = k === 'buggy' ? -30 * s : -17 * s - 11 * s - 3 * s;
    ctx.fillStyle = on ? '#ff3d4f' : '#3d7bff';
    ctx.fillRect(-6 * s, ly, 12 * s, 3 * s);
    if (Quality.settings.detail) drawGlow(ctx, on ? -3 * s : 3 * s, ly, 18 * s, on ? 'rgba(255, 61, 79, 0.7)' : 'rgba(61, 123, 255, 0.7)', 0.8);
  }
  // faros de noche
  if (a.zone === 'finance' || a.zone === 'port') {
    if (k !== 'forklift' && Quality.settings.detail) drawGlow(ctx, -W / 2 - 2 * s, -11 * s, 16 * s, 'rgba(255, 240, 190, 0.6)', 0.7);
  }
  // ruedas
  ctx.fillStyle = c.wheel;
  const wx = k === 'truck' ? [-W / 2 + 14 * s, W / 2 - 34 * s, W / 2 - 16 * s] : k === 'forklift' ? [-W / 2 + 10 * s, W / 2 - 8 * s] : [-W * 0.3, W * 0.3];
  for (const w of wx) {
    ctx.beginPath();
    ctx.arc(w, -5 * s + wheelR * 0.4, wheelR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wake(ctx, x, y, s, dir, len, a = 0.5) {
  ctx.strokeStyle = `rgba(255, 250, 240, ${a})`;
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - dir * len, y + 1);
  ctx.stroke();
}

const DRAW = {
  walker: (ctx, a) => person(ctx, a, a.x, a.y, a.s),
  office: (ctx, a) => person(ctx, a, a.x, a.y, a.s),
  worker: (ctx, a) => person(ctx, a, a.x, a.y, a.s),
  scared: (ctx, a) => person(ctx, a, a.x, a.y, a.s),
  dogwalker: (ctx, a) => person(ctx, a, a.x, a.y, a.s),
  tourist: (ctx, a) => person(ctx, a, a.x, a.y, a.s),
  jogger: (ctx, a) => person(ctx, a, a.x, a.y, a.s),
  cop: (ctx, a) => person(ctx, a, a.x, a.y, a.s),
  bather(ctx, a) {
    const s = a.s;
    // toalla
    ctx.fillStyle = a.towel;
    ctx.beginPath();
    ctx.ellipse(a.x, a.y, 16 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    if (a.pose === 'lie') {
      const c = a.c;
      ctx.lineCap = 'round';
      line(ctx, a.x - 12 * s * a.dir, a.y - 3 * s, a.x + 2 * s * a.dir, a.y - 3 * s, 7 * s, c.top);
      line(ctx, a.x + 2 * s * a.dir, a.y - 3 * s, a.x + 13 * s * a.dir, a.y - 3 * s, 4 * s, c.skin);
      ctx.fillStyle = c.skin;
      ctx.beginPath();
      ctx.arc(a.x - 15 * s * a.dir, a.y - 5 * s, 4.5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = mix('#1b1420', c.skin, 0.3);
      ctx.fillRect(a.x - 17 * s * a.dir - 2 * s, a.y - 7 * s, 4 * s, 1.5 * s);
      ctx.lineCap = 'butt';
    } else {
      person(ctx, a, a.x, a.y, a.s);
    }
    if (a.item === 'ball') {
      const by = a.y - 4 * s - Math.abs(Math.sin(a.t * 3)) * 6 * s;
      ctx.fillStyle = mix('#ffd23f', a.towel, 0.3);
      ctx.beginPath();
      ctx.arc(a.x + 20 * s, by, 3 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  kids(ctx, a) {
    // dos niños pasándose una pelota
    const s = a.s;
    person(ctx, a, a.x - 18 * s, a.y, s * 0.75, 'stand', 1);
    const k2 = { ...a, c: { ...a.c, top: a.kid2.top, skin: a.kid2.skin }, hat: null };
    person(ctx, k2, a.x + 18 * s, a.y, s * 0.75, 'stand', -1);
    const ph = (a.t * 0.9) % 2;
    const f = ph < 1 ? ph : 2 - ph;
    const bx = a.x - 14 * s + f * 28 * s;
    const by = a.y - 20 * s - Math.sin(f * Math.PI) * 16 * s;
    ctx.fillStyle = mix('#ff5d73', a.c.top, 0.2);
    ctx.beginPath();
    ctx.arc(bx, by, 3 * s, 0, Math.PI * 2);
    ctx.fill();
  },
  taxi: car, sedan: car, lux: car, patrol: car, truck: car, forklift: car, buggy: car,

  sailboat(ctx, a, time) {
    const s = a.s;
    const bob = Math.sin(time * 1.6 + a.seed * 6) * 1.5 * s;
    const x = a.x;
    const y = a.y + bob;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(a.dir > 0 ? -1 : 1, 1);
    ctx.fillStyle = a.c.hull;
    ctx.beginPath();
    ctx.moveTo(-26 * s, -6 * s);
    ctx.lineTo(24 * s, -6 * s);
    ctx.lineTo(16 * s, 2 * s);
    ctx.lineTo(-20 * s, 2 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = a.c.sail;
    ctx.beginPath();
    ctx.moveTo(0, -60 * s);
    ctx.lineTo(0, -9 * s);
    ctx.lineTo(20 * s, -9 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = a.c.sail2;
    ctx.beginPath();
    ctx.moveTo(-2 * s, -52 * s);
    ctx.lineTo(-2 * s, -9 * s);
    ctx.lineTo(-20 * s, -9 * s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255, 250, 240, 0.25)';
    ctx.fillRect(x - 22 * s, y + 2 * s, 44 * s, 1.5 * s);
  },
  yacht(ctx, a, time) {
    const s = a.s;
    const bob = Math.sin(time * 1.2 + a.seed * 6) * 1 * s;
    ctx.save();
    ctx.translate(a.x, a.y + bob);
    ctx.scale(a.dir > 0 ? -1 : 1, 1);
    ctx.fillStyle = a.c.hull;
    ctx.beginPath();
    ctx.moveTo(-42 * s, -10 * s);
    ctx.lineTo(40 * s, -10 * s);
    ctx.lineTo(30 * s, 2 * s);
    ctx.lineTo(-34 * s, 2 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-20 * s, -20 * s, 40 * s, 10 * s);
    ctx.fillRect(-10 * s, -27 * s, 22 * s, 7 * s);
    ctx.fillStyle = a.c.glass;
    ctx.fillRect(-18 * s, -18 * s, 34 * s, 4 * s);
    ctx.fillStyle = a.c.band;
    ctx.fillRect(-38 * s, -6 * s, 72 * s, 2 * s);
    ctx.restore();
    wake(ctx, a.x - a.dir * 38 * a.s, a.y + 2 * s, s, a.dir, 40 * s, 0.4);
  },
  ship(ctx, a) {
    const s = a.s;
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.scale(a.dir > 0 ? -1 : 1, 1);
    ctx.fillStyle = a.c.hull;
    ctx.beginPath();
    ctx.moveTo(-130 * s, -14 * s);
    ctx.lineTo(126 * s, -14 * s);
    ctx.lineTo(112 * s, 3 * s);
    ctx.lineTo(-120 * s, 3 * s);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 12; i++) {
      for (let j = 0; j < 2 + ((i * 7) % 3 === 0 ? 1 : 0); j++) {
        ctx.fillStyle = a.c.boxes[(i + j * 2) % a.c.boxes.length];
        ctx.fillRect(-100 * s + i * 15 * s, -22 * s - j * 8 * s, 14 * s, 7.5 * s);
      }
    }
    ctx.fillStyle = a.c.bridge;
    ctx.fillRect(86 * s, -40 * s, 20 * s, 26 * s);
    ctx.fillStyle = 'rgba(30, 30, 60, 0.6)';
    ctx.fillRect(86 * s, -36 * s, 20 * s, 3 * s);
    ctx.restore();
  },
  jetski(ctx, a, time) {
    const s = a.s;
    const hop = Math.abs(Math.sin(time * 5 + a.seed * 7)) * 2.5 * s;
    ctx.save();
    ctx.translate(a.x, a.y - hop);
    ctx.scale(a.dir > 0 ? -1 : 1, 1);
    // espuma
    ctx.fillStyle = 'rgba(255, 252, 245, 0.7)';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(14 * s + i * 6 * s, hop + 1 * s - Math.sin(time * 20 + i) * 1.5 * s, (3 - i * 0.4) * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = a.c.body;
    ctx.beginPath();
    ctx.moveTo(-16 * s, -4 * s);
    ctx.lineTo(14 * s, -6 * s);
    ctx.lineTo(16 * s, 1 * s);
    ctx.lineTo(-12 * s, 1 * s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const r = { ...a, dir: a.dir };
    person(ctx, r, a.x + a.dir * 2 * s, a.y - hop - 4 * s, s * 0.85, 'stand', a.dir);
    wake(ctx, a.x - a.dir * 18 * s, a.y + 1, s, a.dir, 70 * s, 0.55);
  },
  surfer(ctx, a, time) {
    const s = a.s;
    const ride = Math.sin(time * 1.4 + a.seed * 5);
    const y = a.y - 4 * s + ride * 2 * s;
    // ola
    ctx.fillStyle = 'rgba(255, 252, 245, 0.55)';
    ctx.beginPath();
    ctx.moveTo(a.x - 50 * s, a.y + 2 * s);
    ctx.quadraticCurveTo(a.x - 10 * s, a.y - 14 * s, a.x + 18 * s, a.y - 6 * s);
    ctx.quadraticCurveTo(a.x + 10 * s, a.y - 2 * s, a.x + 30 * s, a.y + 2 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = a.c.board;
    ctx.beginPath();
    ctx.ellipse(a.x, y + 1 * s, 16 * s, 2.5 * s, -0.1 + ride * 0.05, 0, Math.PI * 2);
    ctx.fill();
    person(ctx, { ...a, kind: 'surfer' }, a.x, y, s * 0.9, 'wave', -1);
  },
  tug(ctx, a, time) {
    const s = a.s;
    const bob = Math.sin(time * 1.8 + a.seed * 6) * 1.2 * s;
    ctx.save();
    ctx.translate(a.x, a.y + bob);
    ctx.scale(a.dir > 0 ? -1 : 1, 1);
    ctx.fillStyle = a.c.hull;
    ctx.beginPath();
    ctx.moveTo(-28 * s, -8 * s);
    ctx.lineTo(26 * s, -10 * s);
    ctx.lineTo(20 * s, 2 * s);
    ctx.lineTo(-22 * s, 2 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = a.c.cabin;
    ctx.fillRect(-8 * s, -22 * s, 16 * s, 13 * s);
    ctx.fillStyle = a.c.stack;
    ctx.fillRect(10 * s, -26 * s, 5 * s, 16 * s);
    ctx.restore();
    // humo
    for (let i = 0; i < 3; i++) {
      const k = (time * 0.6 + i / 3 + a.seed) % 1;
      ctx.fillStyle = `rgba(200, 200, 220, ${0.35 * (1 - k)})`;
      ctx.beginPath();
      ctx.arc(a.x - a.dir * 12 * s - a.dir * k * 20 * s, a.y + bob - 28 * s - k * 22 * s, (3 + k * 6) * s, 0, Math.PI * 2);
      ctx.fill();
    }
    wake(ctx, a.x - a.dir * 26 * s, a.y + 2 * s, s, a.dir, 30 * s, 0.4);
  },

  plane(ctx, a, time) {
    const s = a.s;
    // estela de condensación
    const g = ctx.createLinearGradient(a.x, 0, a.x - a.dir * 220 * s, 0);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(a.x - a.dir * 14 * s, a.y);
    ctx.lineTo(a.x - a.dir * 220 * s, a.y + 2);
    ctx.stroke();
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.scale(a.dir > 0 ? 1 : -1, 1);
    ctx.fillStyle = a.c.body;
    rr(ctx, -16 * s, -2.5 * s, 32 * s, 5 * s, 2.5 * s);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-2 * s, 0);
    ctx.lineTo(-8 * s, 8 * s);
    ctx.lineTo(2 * s, 0);
    ctx.fill();
    ctx.fillStyle = a.c.tail;
    ctx.beginPath();
    ctx.moveTo(-16 * s, -1 * s);
    ctx.lineTo(-19 * s, -8 * s);
    ctx.lineTo(-12 * s, -1 * s);
    ctx.fill();
    ctx.restore();
    if (a.night && Math.floor(time * 2 + a.seed * 4) % 2 === 0) drawGlow(ctx, a.x - a.dir * 18 * s, a.y - 6 * s, 10, 'rgba(255, 80, 80, 0.9)', 0.9);
  },
  banner(ctx, a, time) {
    const s = a.s;
    const x = a.x;
    const y = a.y + Math.sin(time * 1.3 + a.seed * 4) * 3;
    // avioneta (vuela hacia la izquierda; la pancarta va detrás, a la derecha)
    ctx.fillStyle = a.c.body;
    rr(ctx, x - 16 * s, y - 4 * s, 30 * s, 8 * s, 4 * s);
    ctx.fill();
    ctx.fillRect(x - 4 * s, y - 1 * s, 6 * s, 2 * s);
    ctx.fillRect(x - 6 * s, y - 12 * s, 10 * s, 2.5 * s);
    ctx.fillRect(x + 10 * s, y - 9 * s, 3 * s, 7 * s);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(x - 18 * s, y - 7 * s + Math.sin(time * 40) * 6 * s, 2 * s, 6 * s);
    // cuerda y pancarta
    ctx.font = `bold ${Math.round(12 * s + 2)}px 'Rubik', sans-serif`;
    const tw = ctx.measureText(a.text).width + 16;
    const bx = x + 44 * s;
    ctx.strokeStyle = 'rgba(40, 30, 50, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 14 * s, y);
    ctx.lineTo(bx, y);
    ctx.stroke();
    ctx.fillStyle = a.c.cloth;
    ctx.beginPath();
    const H = 16 * s + 4;
    ctx.moveTo(bx, y - H / 2);
    const segs = 8;
    for (let i = 1; i <= segs; i++) ctx.lineTo(bx + (tw * i) / segs, y - H / 2 + Math.sin(time * 6 - i * 0.9) * 2);
    for (let i = segs; i >= 0; i--) ctx.lineTo(bx + (tw * i) / segs, y + H / 2 + Math.sin(time * 6 - i * 0.9) * 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = a.c.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(a.text, bx + 8, y + 1);
  },
  news(ctx, a, time) {
    const s = a.s;
    const x = a.x;
    const y = a.y + Math.sin(time * 1.1 + a.seed * 4) * 4;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(a.dir > 0 ? -1 : 1, 1);
    ctx.fillStyle = a.c.body;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16 * s, 9 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(10 * s, -2 * s, 26 * s, 4 * s);
    ctx.fillRect(32 * s, -8 * s, 4 * s, 10 * s);
    ctx.fillStyle = 'rgba(200, 235, 255, 0.85)';
    ctx.beginPath();
    ctx.ellipse(-8 * s, -2 * s, 6 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = a.c.dark;
    ctx.fillRect(-2 * s, -14 * s, 3 * s, 5 * s);
    ctx.fillRect(-10 * s, 10 * s, 20 * s, 1.5 * s);
    // rotor
    const w = 30 * s * Math.abs(Math.cos(time * 30));
    ctx.fillRect(-w, -15 * s, w * 2, 1.6 * s);
    // rótulo de la tele
    ctx.save();
    ctx.scale(a.dir > 0 ? -1 : 1, 1);
    ctx.fillStyle = a.c.dark;
    ctx.font = `bold ${Math.round(6 * s + 2)}px 'Rubik', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(tr('amb.tv'), (a.dir > 0 ? -1 : 1) * 4 * s, 6 * s);
    ctx.restore();
    ctx.restore();
    if (a.night && Quality.settings.detail) {
      // foco de la cámara de noche
      ctx.fillStyle = 'rgba(255, 250, 220, 0.07)';
      ctx.beginPath();
      ctx.moveTo(x, y + 8 * s);
      ctx.lineTo(x - 50, y + 220);
      ctx.lineTo(x + 50, y + 220);
      ctx.closePath();
      ctx.fill();
    }
  },
  paraglider(ctx, a, time) {
    const s = a.s;
    const x = a.x;
    const y = a.y + Math.sin(time * 0.8 + a.seed * 5) * 6;
    const W = 36 * s;
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = a.c.wing[i % 2];
      ctx.beginPath();
      ctx.arc(x, y + 6 * s, W, Math.PI + (i / 6) * Math.PI, Math.PI + ((i + 1) / 6) * Math.PI);
      ctx.arc(x, y + 6 * s, W * 0.84, Math.PI + ((i + 1) / 6) * Math.PI, Math.PI + (i / 6) * Math.PI, true);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(40, 30, 50, 0.45)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - W * 0.9, y + 4 * s);
    ctx.lineTo(x, y + 34 * s);
    ctx.lineTo(x + W * 0.9, y + 4 * s);
    ctx.stroke();
    person(ctx, a, x, y + 52 * s, s * 0.8, 'stand', -1);
  },
  balloon(ctx, a, time) {
    const s = a.s;
    const x = a.x;
    const y = a.y + Math.sin(time * 0.5 + a.seed * 5) * 5;
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 ? a.c.a : a.c.b;
      ctx.beginPath();
      ctx.ellipse(x, y, (22 - i * 4.4) * s, 26 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(40, 30, 50, 0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - 12 * s, y + 20 * s);
    ctx.lineTo(x - 5 * s, y + 38 * s);
    ctx.moveTo(x + 12 * s, y + 20 * s);
    ctx.lineTo(x + 5 * s, y + 38 * s);
    ctx.stroke();
    ctx.fillStyle = a.c.basket;
    ctx.fillRect(x - 6 * s, y + 38 * s, 12 * s, 8 * s);
    if (Math.floor(time * 1.3 + a.seed * 3) % 4 === 0) drawGlow(ctx, x, y + 30 * s, 14 * s, 'rgba(255, 180, 80, 0.9)', 0.8);
  },
  blimp(ctx, a, time) {
    const s = a.s;
    const x = a.x;
    const y = a.y + Math.sin(time * 0.6 + a.seed * 4) * 3;
    ctx.font = `bold ${Math.round(8 * s + 2)}px 'Rubik', sans-serif`;
    const half = Math.max(48 * s, ctx.measureText(tr('amb.blimp')).width / 2 + 14 * s);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(a.dir > 0 ? -1 : 1, 1);
    ctx.fillStyle = a.c.fin;
    ctx.beginPath();
    ctx.moveTo(half - 8 * s, 0);
    ctx.lineTo(half + 8 * s, -14 * s);
    ctx.lineTo(half + 8 * s, 14 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = a.c.body;
    ctx.beginPath();
    ctx.ellipse(0, 0, half, 15 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = a.c.fin;
    ctx.fillRect(-10 * s, 13 * s, 18 * s, 5 * s);
    ctx.restore();
    ctx.fillStyle = a.c.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tr('amb.blimp'), x, y + 1);
    if (a.night && Math.floor(time * 2 + a.seed * 4) % 2 === 0) drawGlow(ctx, x, y + 15 * s, 10, 'rgba(255, 80, 80, 0.9)', 0.9);
  },
  gulls(ctx, a, time) {
    const s = a.s;
    ctx.strokeStyle = a.c.bird;
    ctx.lineWidth = 1.6 * s;
    ctx.lineCap = 'round';
    for (let i = 0; i < a.n; i++) {
      const bx = a.x + i * 16 * s * -a.dir + Math.sin(i * 2.3) * 6 * s;
      const by = a.y + Math.abs(i - (a.n - 1) / 2) * 7 * s + Math.sin(time * 2 + i) * 2 * s;
      const flap = Math.sin(time * 9 + i * 1.7) * 4 * s;
      ctx.beginPath();
      ctx.moveTo(bx - 7 * s, by - flap);
      ctx.quadraticCurveTo(bx - 3 * s, by - 3 * s, bx, by);
      ctx.quadraticCurveTo(bx + 3 * s, by - 3 * s, bx + 7 * s, by - flap);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  },
  crane(ctx, a, time) {
    // grúa torre con la carga balanceándose
    const s = a.s;
    const x = a.x;
    const base = a.y;
    const H = a.h;
    ctx.strokeStyle = a.c.steel;
    ctx.lineWidth = 2 * s;
    ctx.fillStyle = a.c.steel;
    ctx.fillRect(x - 5 * s, base - H, 10 * s, H);
    ctx.strokeStyle = a.c.dark;
    ctx.lineWidth = 1;
    for (let yy = base - H; yy < base; yy += 10 * s) {
      ctx.beginPath();
      ctx.moveTo(x - 5 * s, yy);
      ctx.lineTo(x + 5 * s, yy + 10 * s);
      ctx.stroke();
    }
    const jib = 120 * s;
    ctx.fillStyle = a.c.steel;
    ctx.fillRect(x - 40 * s, base - H - 6 * s, 40 * s + jib, 6 * s);
    ctx.fillStyle = a.c.dark;
    ctx.fillRect(x - 40 * s, base - H - 2 * s, 16 * s, 12 * s);
    ctx.fillRect(x - 3 * s, base - H - 22 * s, 6 * s, 16 * s);
    const trolley = x + (40 + ((Math.sin(time * 0.3 + a.seed * 6) + 1) / 2) * 70) * s;
    const sw = Math.sin(time * 1.4 + a.seed * 4) * 0.08;
    const L = 60 * s + Math.sin(time * 0.25 + a.seed) * 25 * s;
    const lx = trolley + Math.sin(sw) * L;
    const ly = base - H + Math.cos(sw) * L;
    ctx.strokeStyle = a.c.dark;
    ctx.beginPath();
    ctx.moveTo(trolley, base - H);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    ctx.fillStyle = a.c.load;
    ctx.fillRect(lx - 14 * s, ly, 28 * s, 10 * s);
    if (Math.floor(time * 1.5 + a.seed * 3) % 2 === 0) drawGlow(ctx, x + jib, base - H - 6 * s, 8, 'rgba(255, 80, 80, 0.9)', 0.9);
  },
  gantry(ctx, a, time) {
    // grúa pórtico del puerto subiendo y bajando un contenedor
    const s = a.s;
    const x = a.x;
    const base = a.y;
    const H = 150 * s;
    ctx.fillStyle = a.c.steel;
    ctx.fillRect(x - 40 * s, base - H, 7 * s, H);
    ctx.fillRect(x + 33 * s, base - H, 7 * s, H);
    ctx.fillRect(x - 60 * s, base - H - 8 * s, 150 * s, 9 * s);
    ctx.fillStyle = a.c.dark;
    ctx.fillRect(x - 30 * s, base - H - 20 * s, 18 * s, 12 * s);
    const k = (Math.sin(time * 0.5 + a.seed * 6) + 1) / 2;
    const cx = x + (-10 + 60 * k) * s;
    const cy = base - H + (30 + 70 * (1 - Math.abs(k - 0.5) * 2)) * s;
    ctx.strokeStyle = a.c.dark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 8 * s, base - H);
    ctx.lineTo(cx - 8 * s, cy);
    ctx.moveTo(cx + 8 * s, base - H);
    ctx.lineTo(cx + 8 * s, cy);
    ctx.stroke();
    ctx.fillStyle = a.c.load;
    ctx.fillRect(cx - 18 * s, cy, 36 * s, 14 * s);
    if (Math.floor(time * 1.5 + a.seed * 3) % 2 === 0) drawGlow(ctx, x + 88 * s, base - H - 8 * s, 8, 'rgba(255, 80, 80, 0.9)', 0.9);
  },
};
export const __ZONES = ZONES; // para las pruebas automáticas
