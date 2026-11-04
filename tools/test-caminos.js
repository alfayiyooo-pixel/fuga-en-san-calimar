#!/usr/bin/env node
// PRUEBA AUTOMÁTICA: ¿TODOS LOS TRAMOS TIENEN CAMINO?
//
//   node tools/test-caminos.js            ~3.000 tramos (1-2 min)
//   node tools/test-caminos.js --quick    ~600 tramos (lo que ejecuta el gancho antes de cada push)
//   node tools/test-caminos.js --compare  además, las mismas partidas SIN la garantía (para comparar)
//   node tools/test-caminos.js --seed 123 repite una partida concreta
//
// Juega partidas reales en Node (la lógica del juego tal cual, sin dibujar), a
// distancias, estrellas y modos al azar (a pie, jetpack, personajes, perder el
// jetpack a mitad), con el jugador invulnerable. Graba cada obstáculo al
// aparecer y después un VERIFICADOR independiente, más fino que el del juego
// (pasos de 1/60 s, sin margen, más estados), busca un camino de principio a
// fin con la física real. Cada vez que no hay camino lo cuenta como fallo, con
// la distancia, el modo y los obstáculos que coincidieron. También comprueba:
//   · que ningún ataque (misiles, helicóptero) coincide con algo que cierra el paso,
//   · que todos los avisos dan al menos el tiempo de reacción (0,3 s),
//   · que los huecos (puertas de cables, andamios, ráfaga del jefe) son claramente
//     más grandes que el personaje.
// Sale con código 1 si algo falla.

const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const QUICK = args.includes('--quick');
const COMPARE = args.includes('--compare');
const SEED = args.includes('--seed') ? Number(args[args.indexOf('--seed') + 1]) : null;
const TARGET = QUICK ? 600 : 3000; // tramos a comprobar

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

(async () => {
  await import(path.join(ROOT, 'tools/headless.mjs'));
  const imp = (f) => import(path.join(ROOT, f));
  const { CONFIG } = await imp('src/config.js');
  const { Game } = await imp('src/game.js');
  const { cloneObstacle, stubGame, ATTACK_TYPES } = await imp('src/world/pathcheck.js');
  const { Player } = await imp('src/entities/player.js');
  const { supportUnder } = await imp('src/systems/platforms.js');
  const { CHARACTER_IDS } = await imp('src/characters/defs.js');
  const { Sound } = await imp('src/core/audio.js');

  const failures = [];
  const problems = [];

  // ---------- comprobaciones fijas: avisos y huecos ----------
  const R = CONFIG.pathcheck.reaction;
  const H = CONFIG.hazards;
  const warns = {
    'neón (parpadeo antes de encenderse)': H.neon.warn,
    'andamio (tiembla antes de caer)': H.scaffold.warnTime,
    'boca de riego': H.hydrant.warnTime,
    'toldo que se cierra': H.shutter.warnTime,
    'misil (aviso + fijado)': CONFIG.obstacles.missile.warnTime + CONFIG.obstacles.missile.lockTime,
    'helicóptero (de fijarte a disparar)': CONFIG.obstacles.heli.windup,
    'patrulla (aviso ◀)': CONFIG.obstacles.car.warnTime,
    'perro (aviso por detrás)': CONFIG.minors.dog.warnTime,
    'ráfaga del jefe (hueco marcado)': CONFIG.boss.gap.warn,
    'foco del jefe (de fijarte a disparar)': CONFIG.boss.spot.fireDelay,
  };
  for (const [k, v] of Object.entries(warns)) if (!(v >= R)) problems.push(`Aviso demasiado corto: ${k} = ${v} s (mínimo ${R} s)`);
  const ph = CONFIG.player.height;
  const gaps = {
    'puerta de cables (hueco mínimo)': Math.max(CONFIG.obstacles.cable.gate.gap[1], ph * CONFIG.pathcheck.minGapPlayers),
    'andamio (2 de 5 tramos)': ((476 - (CONFIG.world.ceiling - 10)) / 5) * 2,
    'ráfaga del jefe': CONFIG.boss.gap.height,
    'ráfaga del jefe a pie': CONFIG.boss.gap.footHeight,
    'toldo de fachada cerrado (con jetpack)': CONFIG.player.height * CONFIG.pathcheck.minGapPlayers,
  };
  for (const [k, v] of Object.entries(gaps)) if (v < ph * 2.5) problems.push(`Hueco justo: ${k} = ${Math.round(v)} px (personaje: ${ph} px)`);

  // ---------- partidas ----------
  const view = { w: 960, h: 540, groundY: 476 };
  const hud = new Proxy({}, { get: () => () => {} });
  const input = { held: false, consumePresses() {} };
  const STEP = 1 / 120;
  const realRandom = Math.random;

  function playRun(seed, guarantee) {
    Math.random = mulberry(seed);
    const rnd = Math.random;
    CONFIG.pathcheck.enabled = guarantee;
    const start = Math.floor(rnd() * 13) * 500; // 0 … 6.000 m
    const stars = Math.floor(rnd() * 6);
    const mode = rnd() < 0.35 ? 'foot' : rnd() < 0.6 ? 'jet' : 'char';
    const loseAt = mode !== 'foot' && rnd() < 0.5 ? 6 + rnd() * 20 : null; // s: pierde el jetpack / personaje
    location.search = `?start=${start}&nointro`;
    const g = new Game(view, hud);
    g.god = true;
    if (mode !== 'foot') {
      g.player.onFoot = false;
      g.foot.everJet = true;
      g.foot.firstJetAt = 0;
    }
    if (mode === 'char') g.powers.transform(CHARACTER_IDS[Math.floor(rnd() * CHARACTER_IDS.length)], g);
    g.wanted.setStars(stars);
    g.powers.invuln = 0;
    const rec = []; // obstáculos: { f, clone, orig }
    const frames = []; // por frame (cada 1/60 s): x, y, velocidad, modo
    const add = g.addObstacle.bind(g);
    let f = 0;
    g.addObstacle = (o) => {
      add(o);
      rec.push({ f, orig: o, clone: null });
    };
    const T = 40;
    const violations = [];
    for (let i = 0; i < T / STEP; i++) {
      if (i % 600 === 0) g.wanted.setStars(Math.max(stars, g.wanted.stars));
      if (loseAt !== null && Math.abs(i * STEP - loseAt) < STEP / 2) {
        if (g.powers.char !== 'base') g.powers.detransform?.(g);
        if (!g.player.onFoot) g.foot.lose(g);
      }
      g.update(STEP, input);
      if (i % 2 === 1) {
        // al final de cada 1/60 s se fotografía lo nuevo
        for (const r of rec) if (!r.clone && r.orig.alive) r.clone = cloneObstacle(r.orig);
        const p = g.player;
        frames.push({ x: p.x, y: p.y, speed: g.speed * g.timeScale, onFoot: p.onFoot, mods: { ...p.mods }, vehicle: p.vehicle, dist: g.distance, g, alive: new Set(rec.filter((r) => r.orig.alive).map((r) => r.orig)) });
        f++;
        // combinaciones prohibidas: un ataque con algo que cierra el paso en pantalla
        if (guarantee && g.spawner.attackActive(g)) {
          const to = g.camera.x + g.view.w;
          const close = g.obstacles.find((o) => o.alive && o.closes && g.centerOf(o).x > p.x + 40 && g.centerOf(o).x < to && rec.find((r) => r.orig === o)?.f > f - 600 && rec.find((r) => r.orig === o)?.f >= attackStart(g, rec));
          if (close && !close.flagged) {
            close.flagged = true;
            violations.push({ dist: Math.round(g.distance), what: `${close.type} con un ataque en marcha` });
          }
        }
      }
    }
    Math.random = realRandom;
    return { g, rec, frames, start, stars, mode, loseAt, violations, tramos: g.spawner.pathStats.checks - g.spawner.pathStats.rejected };
  }

  /** Frame en que empezó el ataque en marcha (solo cuenta lo que aparece después). */
  function attackStart(g, rec) {
    let first = Infinity;
    for (const r of rec) if (r.orig.alive && (r.orig.type === 'missile' || r.orig.type === 'heli' || r.orig.type === 'bullet')) first = Math.min(first, r.f);
    return first;
  }

  // ---------- verificador ----------
  const Sim = Object.create(Player.prototype);
  Sim.finishStep = function () {};
  const FIELDS = ['x', 'y', 'vy', 'w', 'h', 'thrust', 'onGround', 'launchT', 'onFoot', 'prevHeld', 'jumpBuf', 'coyote', 'jumpHold', 'airJumps', 'flip', 'mods', 'vehicle', 'held'];
  const copy = (p) => {
    const c = Object.create(Sim);
    for (const k of FIELDS) c[k] = p[k];
    return c;
  };
  const key = (s) => `${Math.round(s.y / 4)}|${Math.round(s.vy / 40)}|${s.onGround ? 1 : 0}|${s.airJumps}|${s.prevHeld ? 1 : 0}|${s.jumpHold > 0 ? 1 : 0}|${s.held ? 1 : 0}|${s.thrust > 0.5 ? 1 : 0}`;
  function thin(list, max) {
    const m = new Map();
    for (const s of list) if (!m.has(key(s))) m.set(key(s), s);
    let out = [...m.values()];
    if (out.length > max) {
      out.sort((a, b) => a.y - b.y || a.vy - b.vy);
      const st = out.length / max;
      out = Array.from({ length: max }, (_, i) => out[Math.floor(i * st)]);
    }
    return out;
  }

  /** Estados de partida tras un fallo o al empezar: en el suelo y, con jetpack, a varias alturas. */
  function freshStates(fr, g) {
    const base = copy(g.player);
    base.onFoot = fr.onFoot;
    base.mods = fr.mods;
    base.vehicle = fr.vehicle;
    const out = [];
    const gy = view.groundY;
    const heights = fr.onFoot ? [gy - base.h / 2] : Array.from({ length: 9 }, (_, i) => CONFIG.world.ceiling + 30 + (i * (gy - CONFIG.world.ceiling - 60)) / 8);
    for (const y of heights) {
      const s = copy(base);
      s.y = y;
      s.vy = 0;
      s.thrust = 0;
      s.onGround = y >= gy - base.h / 2 - 1;
      s.airJumps = 1;
      out.push(s);
    }
    return out;
  }

  function verify(run) {
    const { rec, frames, g } = run;
    const dt = 1 / 60;
    const decision = 6;
    const fails = [];
    let states = null;
    let skipUntil = 0;
    const live = new Map(); // orig → clon simulado
    const sg = stubGame(g);
    Sound.silent = (Sound.silent ?? 0) + 1;
    for (let f = 0; f < frames.length; f++) {
      const fr = frames[f];
      sg.player.x = fr.x;
      sg.player.y = fr.y;
      sg.player.onFoot = fr.onFoot;
      sg.camera.x = fr.x - view.w * CONFIG.player.screenX;
      sg.speed = fr.speed;
      sg.t += dt;
      for (const r of rec) if (r.clone && r.f === f && !ATTACK_TYPES.has(r.clone.type)) live.set(r.orig, cloneObstacle(r.clone));
      for (const [o, c] of live) {
        if (!fr.alive.has(o)) {
          live.delete(o);
          continue;
        }
        c.update(dt, sg);
      }
      if (f < skipUntil) continue;
      if (!states) states = freshStates(fr, g).filter((s) => !hitsAny(s, live, 0));
      // cambio de modo (pierdes el jetpack / el personaje): todos los caminos cambian de física
      for (const s of states) {
        if (s.onFoot !== fr.onFoot || s.mods !== fr.mods) {
          if (s.onFoot !== fr.onFoot) {
            s.thrust = 0;
            s.airJumps = 1;
          }
          s.onFoot = fr.onFoot;
          s.mods = fr.mods;
          s.vehicle = fr.vehicle;
        }
      }
      if (f % decision === 0) {
        const next = [];
        for (const s of states) for (const held of [false, true]) {
          const c = copy(s);
          c.held = held;
          next.push(c);
        }
        states = thin(next, 160);
      }
      const roofs = [...live.values()].filter((c) => c.roofs);
      const alive = [];
      let killer = null;
      for (const s of states) {
        const sup = supportUnder(roofs, s, view.groundY);
        s.update(dt, s.held, fr.speed, sup.y);
        s.x = fr.x;
        const k = hitsAny(s, live, 0);
        if (k) killer = k;
        else alive.push(s);
      }
      states = alive;
      if (!states.length) {
        const near = [...live.values()].filter((c) => Math.abs(g.centerOf(c).x - fr.x) < 500).map((c) => c.type);
        fails.push({ dist: Math.round(fr.dist), mode: fr.onFoot ? 'a pie' : 'jetpack', killer: killer?.type, near: [...new Set(near)].join(', ') });
        states = null;
        skipUntil = f + 90; // se sigue comprobando 1,5 s más adelante
      }
    }
    Sound.silent--;
    return fails;
  }

  function hitsAny(s, live, margin) {
    const b = s.hitbox;
    const box = { l: b.l - margin, r: b.r + margin, t: b.t - margin, b: b.b + margin };
    for (const c of live.values()) if (c.alive && !c.ko && c.hits(box)) return c;
    return null;
  }

  // ---------- bucle principal ----------
  const t0 = Date.now();
  let tramos = 0;
  let runs = 0;
  let violations = [];
  const base = { tramos: 0, fails: 0 };
  let seed = SEED ?? 1;
  while (tramos < TARGET) {
    const run = playRun(seed, true);
    const fails = verify(run);
    tramos += run.tramos;
    runs++;
    violations = violations.concat(run.violations.map((v) => ({ ...v, seed })));
    for (const f of fails) failures.push({ ...f, seed, start: run.start, stars: run.stars, mode0: run.mode, loseAt: run.loseAt });
    if (COMPARE) {
      const off = playRun(seed, false);
      base.tramos += off.tramos || run.tramos;
      const bf = verify(off);
      base.fails += bf.length;
      base.list = (base.list ?? []).concat(bf.map((f) => ({ ...f, seed })));
      CONFIG.pathcheck.enabled = true;
    }
    if (SEED !== null) break;
    seed++;
  }
  CONFIG.pathcheck.enabled = true;

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`Tramos comprobados: ${tramos} en ${runs} partidas (${secs} s)`);
  if (COMPARE) {
    console.log(`Sin la garantía de camino: ${base.fails} puntos imposibles en las mismas partidas`);
    for (const f of (base.list ?? []).slice(0, 20)) console.log(`   semilla ${f.seed}: ${f.dist} m ${f.mode}, choca con ${f.killer}; cerca: ${f.near}`);
  }
  for (const p of problems) console.log(`✗ ${p}`);
  if (violations.length) {
    console.log(`✗ Combinaciones prohibidas: ${violations.length}`);
    for (const v of violations.slice(0, 10)) console.log(`   semilla ${v.seed}: ${v.what} a ${v.dist} m`);
  }
  if (failures.length) {
    console.log(`✗ Tramos SIN camino: ${failures.length}`);
    for (const f of failures.slice(0, 15)) console.log(`   semilla ${f.seed} (empieza en ${f.start} m, ${f.stars}★, ${f.mode0}${f.loseAt ? `, lo pierde a los ${f.loseAt.toFixed(1)} s` : ''}): ${f.dist} m ${f.mode}, choca con ${f.killer}; cerca: ${f.near}`);
    console.log('   Repite una con: node tools/test-caminos.js --seed N');
  }
  if (!failures.length && !violations.length && !problems.length) console.log('✓ Todos los tramos tienen camino, sin combinaciones prohibidas, y avisos y huecos suficientes');
  process.exit(failures.length || violations.length || problems.length ? 1 : 0);
})();
