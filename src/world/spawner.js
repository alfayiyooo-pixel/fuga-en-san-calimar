import { CONFIG } from '../config.js';
import { rand, chance, lerp, pick, clamp } from '../core/rng.js';
import { Cable, PatrolCar, Helicopter, Missile } from '../entities/obstacles.js';
import { spawnMinor } from '../entities/minors.js';
import { spawnStreet } from '../entities/street.js';
import { spawnHazard } from '../entities/hazards.js';
import { spawnHideout } from '../entities/hideouts.js';
import { propagate, startStates, modeKey, leftOf, ATTACK_TYPES } from './pathcheck.js';

/**
 * Genera obstáculos por delante de la cámara.
 * Elige el tipo por pesos (distancia desbloqueada × zona × estrellas)
 * y deja una separación que se acorta con la dificultad.
 */
export class Spawner {
  reset(startX = 0) {
    this.nextX = startX + CONFIG.spawner.firstAt * CONFIG.world.pxPerMeter;
    this.lastType = null;
    this.nextHideoutAt = CONFIG.hideouts.from;
    this.frontier = null;
    this.history = [];
    // estadísticas de la garantía de camino (se ven con ?debug: game.spawner.pathStats)
    this.pathStats = { checks: 0, rejected: 0, removed: 0, ms: 0, maxMs: 0 };
  }

  update(g) {
    // se genera bastante por delante para que los pavos puedan colocarse alrededor
    const ahead = g.camera.x + g.view.w + 700;
    // si has cambiado de estado (perder el jetpack o el personaje, montar en un
    // vehículo…), lo que ya hay delante tiene que seguir teniendo camino
    this.guard(g);
    // durante un respiro no se genera nada nuevo
    if (g.respite.active) {
      this.nextX = Math.max(this.nextX, ahead);
      return;
    }
    let tries = 0;
    while (this.nextX < ahead) {
      // escondite cuando toca y hay bastantes estrellas
      const H = CONFIG.hideouts;
      const m = this.nextX / CONFIG.world.pxPerMeter;
      if (m >= this.nextHideoutAt && g.wanted.stars >= H.minStars && !g.boss.active) {
        this.nextHideoutAt = m + rand(H.every[0], H.every[1]);
        this.nextX += 120;
        this.nextX += spawnHideout(g, this.nextX) + this.gap(g);
        this.lastType = 'hideout';
        continue;
      }
      const type = this.choose(g);
      const before = g.obstacles.length;
      const len = this.spawn(type, g, this.nextX);
      if (!this.verify(g, before, this.nextX + len)) {
        // sin camino: se descarta y se prueba otra cosa; si tampoco, se deja hueco
        if (++tries < CONFIG.pathcheck.retries) continue;
        tries = 0;
        this.nextX += this.gap(g);
        continue;
      }
      tries = 0;
      this.lastType = type;
      this.nextX += len + this.gap(g, type === 'minor' ? CONFIG.minors.gapMult : 1);
    }
  }

  /**
   * Separación hasta el siguiente grupo. Nunca menos que el tiempo de reacción
   * más el de recuperarse a tu velocidad (crece con la velocidad), y más aire
   * si hay un ataque en marcha.
   */
  gap(g, mult = 1) {
    const S = CONFIG.spawner;
    const base = lerp(S.gapStart, S.gapEnd, g.difficulty) * g.policeLevel.gapMult * g.respite.gapMult * g.events.gapMult * mult;
    const jittered = base * (1 + rand(-S.gapJitter, S.gapJitter)) * (this.attackActive(g) ? CONFIG.pathcheck.attackGapMult : 1);
    return Math.max(jittered, Math.max(g.speed, CONFIG.speed.start) * S.minGapTime);
  }

  // ---------------- GARANTÍA DE CAMINO (world/pathcheck.js) ----------------

  /**
   * ¿El grupo recién colocado (g.obstacles desde "before") deja camino?
   * - Lo fijo (cables, calle, peligros) se comprueba desde la "frontera": todos
   *   los estados posibles del jugador al final del grupo anterior.
   * - Lo que se mueve hacia ti (patrullas, enemigos) cruza lo ya comprobado:
   *   se comprueba desde tu estado actual hasta que te ha pasado.
   * Si no hay camino, se quita el grupo y devuelve false.
   */
  verify(g, before, xEnd) {
    const P = CONFIG.pathcheck;
    if (!P.enabled) return true;
    const added = g.obstacles.splice(before);
    const check = added.filter((o) => !ATTACK_TYPES.has(o.type));
    if (!check.length) {
      g.obstacles.push(...added);
      return true;
    }
    const t0 = performance.now();
    this.ensureFrontier(g);
    // lo que viene rápido hacia ti (patrullas, perros, patinetes) cruza lo ya comprobado
    const movers = check.filter((o) => FAST.has(o.type));
    let ok = true;
    let res = null;
    if (movers.length) {
      const sp = Math.max(g.targetSpeed(), g.speed, 1);
      // hasta que te hayan pasado (con un poco de margen), como mucho moverHorizon s
      let tPass = 0;
      for (const o of movers) tPass = Math.max(tPass, o.type === 'dog' ? P.moverHorizon : (g.centerOf(o).x - g.player.x) / (sp + Math.abs(o.speed ?? o.vx ?? 0)) + 0.5);
      const r = propagate(g, startStates(g), g.player.x + sp * Math.min(P.moverHorizon, Math.max(0.5, tPass)), check);
      ok = r.ok;
    }
    if (ok) {
      // si el grupo sobresale hacia atrás (un cable largo, el arco de una bola),
      // se comprueba desde una frontera anterior a donde empieza
      const left = Math.min(...check.map(leftOf)) - 40;
      let from = this.frontier;
      for (let i = this.history.length - 1; i >= 0 && from.x > left; i--) from = this.history[i];
      if (from.x > left && from !== this.frontier) from = this.history[0];
      if (from.x > left || from.x < g.player.x) from = startStates(g);
      res = propagate(g, from, Math.max(xEnd, this.frontier.x) + P.tail, check);
      ok = res.ok;
    }
    const ms = performance.now() - t0;
    const st = this.pathStats;
    st.checks++;
    st.ms += ms;
    st.maxMs = Math.max(st.maxMs, ms);
    if (!ok) {
      st.rejected++;
      for (const o of added) o.alive = false;
      g.onPathReject?.(added);
      return false;
    }
    this.setFrontier(res.frontier);
    g.obstacles.push(...added);
    return true;
  }

  setFrontier(f) {
    if (this.frontier && this.frontier.mode === f.mode) this.history.push(this.frontier);
    else this.history = [];
    if (this.history.length > 8) this.history.shift();
    this.frontier = f;
  }

  /** La frontera tiene que ser de tu estado actual (modo) y estar por delante de ti. */
  ensureFrontier(g) {
    const f = this.frontier;
    if (!f || f.mode !== modeKey(g) || f.x < g.player.x) this.revalidate(g);
  }

  /** Cada frame: si cambia tu estado, se revisa todo lo que hay delante. */
  guard(g) {
    if (!CONFIG.pathcheck.enabled || g.dead || g.intro.active) return;
    if (this.frontier && this.frontier.mode !== modeKey(g)) this.revalidate(g);
  }

  /**
   * Desde tu estado actual hasta lo último generado: si algo ya colocado no deja
   * camino (por ejemplo, porque acabas de perder el jetpack), se retira (con una
   * pequeña explosión si está en pantalla) y se vuelve a comprobar.
   */
  revalidate(g) {
    const P = CONFIG.pathcheck;
    const t0 = performance.now();
    let start = startStates(g);
    const end = Math.max(this.nextX, g.player.x + 1);
    let res = propagate(g, start, end);
    for (let k = 0; !res.ok && k < P.maxRemovals; k++) {
      const o = res.blocker;
      if (!o) break;
      if (g.centerOf(o).x < g.camera.x + g.view.w + 40) g.destroyObstacle(o, true);
      else o.alive = false;
      this.pathStats.removed++;
      start = startStates(g);
      res = propagate(g, start, end);
    }
    this.history = [];
    this.setFrontier(res.ok ? res.frontier : { ...startStates(g), x: end });
    const ms = performance.now() - t0;
    this.pathStats.maxMs = Math.max(this.pathStats.maxMs, ms);
  }

  /**
   * ¿Hay un ataque en marcha? (misiles avisando o en vuelo, balas, helicóptero
   * apuntando, ataque del jefe). Entonces no salen otros ataques ni obstáculos
   * que cierran el paso, y hay más separación.
   */
  attackActive(g) {
    if (g.boss?.active && g.boss.attack) return true;
    const px = g.player.x;
    for (const o of g.obstacles) {
      if (!o.alive) continue;
      if (o.type === 'missile' && (o.state !== 'fly' || o.x > px - 60)) return true;
      if (o.type === 'bullet' && o.x > px - 40) return true;
      if (o.type === 'heli' && o.state !== 'leave') return true; // patrullando ya puede fijarte
    }
    return false;
  }

  /** ¿Hay en pantalla (o a punto) algo que cierra el paso? */
  closingAhead(g) {
    const to = g.camera.x + g.view.w + CONFIG.pathcheck.closingLook;
    return g.obstacles.some((o) => o.alive && o.closes && g.centerOf(o).x > g.player.x - 40 && g.centerOf(o).x < to);
  }

  choose(g) {
    const O = CONFIG.obstacles;
    const lvl = g.policeLevel;
    const zoneMods = O.zoneWeights[g.zone.current.id] || {};
    const active = (type) => g.obstacles.filter((o) => o.type === type && o.alive).length;

    const entries = [];
    // COMBINACIONES PROHIBIDAS: con un ataque en marcha no sale otro ataque ni nada
    // que cierre el paso; y un ataque no sale si hay algo que cierra el paso cerca
    const attack = this.attackActive(g);
    const closing = this.closingAhead(g);
    this.calm = attack || (g.boss?.active ?? false);
    const consider = (type, w) => {
      if (w <= 0 || g.distance < O.unlockAt[type]) return;
      if (type === 'heli' && active('heli') > 0) return;
      if (type === 'missile' && active('missile') > 2) return;
      if ((type === 'missile' || type === 'heli') && (attack || closing)) return;
      if (type === 'hazard' && this.calm) return;
      let weight = w * (zoneMods[type] ?? 1);
      if (type === this.lastType && type !== 'cable') weight *= 0.4; // menos repeticiones
      entries.push([type, weight]);
    };
    for (const [type, w] of Object.entries(O.weights)) consider(type, w);
    // policía según el nivel de búsqueda
    consider('car', lvl.car);
    consider('missile', lvl.missile);
    consider('heli', lvl.heli);
    if (lvl.cop) entries.push(['cop', lvl.cop]);
    // enemigos menores: al principio y con pocas estrellas
    // obstáculos de calle (sobre todo a pie)
    const S = CONFIG.foot.street;
    entries.push(['street', (g.player.onFoot ? S.weightFoot : S.weightJet) * (this.lastType === 'street' ? 0.7 : 1)]);
    const mw = this.minorWeight(g);
    if (mw > 0) entries.push(['minor', mw * (this.lastType === 'minor' ? 0.6 : 1)]);

    const total = entries.reduce((s, [, w]) => s + w, 0);
    let roll = Math.random() * total;
    for (const [type, w] of entries) {
      roll -= w;
      if (roll <= 0) return type;
    }
    return 'cable';
  }

  /**
   * Peso de los enemigos menores: máximo en los primeros metros y con 0-1★;
   * se desvanece con la distancia y con las estrellas (la policía toma el relevo).
   */
  minorWeight(g) {
    const M = CONFIG.minors;
    const d = g.distance;
    const byDist = d <= M.fullUntil ? 1 : clamp(1 - (d - M.fullUntil) / (M.fadeUntil - M.fullUntil), 0, 1);
    const byStars = M.starMult[g.wanted.stars] ?? 0;
    return M.weight * Math.max(byDist, M.floor) * byStars;
  }

  /** Elige qué enemigo menor sale (las gaviotas solo en la playa). */
  chooseMinor(g) {
    const M = CONFIG.minors;
    const zone = g.zone.current.id;
    const entries = Object.entries(M.types).filter(([type]) => g.distance >= (M.unlockAt[type] ?? 0) && (type !== 'gull' || zone === 'beach'));
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let roll = Math.random() * total;
    for (const [type, w] of entries) {
      roll -= w;
      if (roll <= 0) return type;
    }
    return 'guard';
  }

  /** Peligro según la zona, sin repetir el anterior (variado y poco predecible). */
  chooseHazard(g) {
    const H = CONFIG.hazards;
    const weights = H.zones[g.zone.current.id] ?? H.zones.beach;
    const entries = Object.entries(weights).map(([tp, w]) => [tp, tp === this.lastHazard ? w * H.repeatMult : w]);
    let roll = Math.random() * entries.reduce((s, [, w]) => s + w, 0);
    let pickd = entries[0][0];
    for (const [tp, w] of entries) {
      roll -= w;
      if (roll <= 0) {
        pickd = tp;
        break;
      }
    }
    this.lastHazard = pickd;
    return pickd;
  }

  chooseStreet(g) {
    const S = CONFIG.foot.street;
    const entries = Object.entries(S.types).filter(([tp]) => g.distance >= (S.unlockAt[tp] ?? 0) && (tp !== 'awning' || g.player.onFoot));
    let roll = Math.random() * entries.reduce((s, [, w]) => s + w, 0);
    for (const [tp, w] of entries) {
      roll -= w;
      if (roll <= 0) return tp;
    }
    return 'fence';
  }

  /**
   * Obstáculos de calle. A pie (con doble salto) a veces salen en SERIE, con
   * el hueco justo para aterrizar y volver a saltar, y a veces con un CABLE
   * por encima que no toca un salto normal pero sí un doble salto: hay que
   * elegir bien cuándo usarlo.
   */
  spawnStreetGroup(g, x) {
    const S = CONFIG.foot.street;
    const first = this.chooseStreet(g);
    if (!g.player.onFoot || first === 'awning') return spawnStreet(first, g, x);
    const sp = Math.max(g.speed || 0, CONFIG.speed.start);
    let cx = x;
    let n = 1;
    if (g.distance >= S.series.from && chance(S.series.chance)) n = pick(S.series.count);
    for (let i = 0; i < n; i++) {
      let tp = i === 0 ? first : this.chooseStreet(g);
      if (tp === 'awning') tp = 'fence';
      const w = spawnStreet(tp, g, cx) - 40;
      cx += w + (i < n - 1 ? sp * rand(S.series.gapTime[0], S.series.gapTime[1]) : 0);
    }
    const C = S.ceilingCable;
    if (g.distance >= C.from && chance(C.chance)) {
      const len = cx - x + C.overhang * 2;
      g.addObstacle(new Cable(x + (cx - x) / 2, g.view.groundY - C.height, len, 0));
    }
    return cx - x + 40;
  }

  /** Crea el patrón y devuelve cuánto espacio horizontal ocupa. */
  spawn(type, g, x) {
    switch (type) {
      case 'minor':
        return spawnMinor(this.chooseMinor(g), g, x);
      case 'cop':
        return spawnMinor('cop', g, x);
      case 'street':
        return this.spawnStreetGroup(g, x);
      case 'hazard': {
        const tp = this.chooseHazard(g);
        const n = g.obstacles.length;
        const len = spawnHazard(tp, g, x);
        if (CONFIG.pathcheck.closing.includes(tp)) for (const o of g.obstacles.slice(n)) o.closes = true;
        return len;
      }
      case 'car': {
        g.addObstacle(new PatrolCar(g));
        if (chance(g.policeLevel.carPair)) {
          g.addObstacle(new PatrolCar(g, 0.9));
        }
        return 160;
      }
      case 'missile': {
        const max = g.policeLevel.volley;
        const volley = max <= 1 ? 1 : chance(0.5) ? max : max - 1;
        const offsets = volley === 1 ? [0] : volley === 2 ? [0, pick([-90, 90])] : [0, -110, 110];
        offsets.forEach((off, i) => g.addObstacle(new Missile(g, i * 0.4, off)));
        return 120;
      }
      case 'heli':
        g.addObstacle(new Helicopter(g));
        return 260;
      default:
        return this.spawnCables(g, x);
    }
  }

  spawnCables(g, x) {
    const C = CONFIG.obstacles.cable;
    const top = CONFIG.world.ceiling + 14;
    const bottom = g.view.groundY - 14;
    const d = g.difficulty;

    // a pie: solo cables altos (por encima de un salto normal)
    if (g.player.onFoot) {
      const len = rand(C.minLen, C.maxLen);
      g.addObstacle(new Cable(x, rand(top + 10, bottom - 300), len, 0));
      return len * 0.7;
    }

    // "puerta": un cable desde arriba y otro desde abajo con hueco
    const ramped = (R) => (this.calm ? 0 : R.chance * clamp((d - R.from) / R.ramp, 0, 1));
    if (chance(ramped(C.gate))) {
      // el hueco siempre claramente más grande que el personaje
      const gapH = Math.max(lerp(C.gate.gap[0], C.gate.gap[1], d), CONFIG.player.height * CONFIG.pathcheck.minGapPlayers);
      const gapY = rand(top + 80, bottom - 80 - gapH);
      const l1 = gapY - top;
      const l2 = bottom - (gapY + gapH);
      const a = new Cable(x, top + l1 / 2, l1, Math.PI / 2);
      const b = new Cable(x, bottom - l2 / 2, l2, Math.PI / 2);
      a.closes = b.closes = true;
      g.addObstacle(a);
      g.addObstacle(b);
      return 30;
    }

    // doble: uno alto y uno bajo, escalonados
    if (chance(ramped(C.double))) {
      const len = rand(C.minLen, C.maxLen * 0.8);
      const high = chance(0.5);
      const a = this.cable(x, len, high ? 'high' : 'low', g);
      const b = this.cable(x + 240, len, high ? 'low' : 'high', g);
      a.closes = b.closes = true;
      g.addObstacle(a);
      g.addObstacle(b);
      return 260;
    }

    const len = rand(C.minLen, lerp(C.minLen + 60, C.maxLen, d));
    const spin = !this.calm && d > C.spinFrom && chance(C.spinChance) ? rand(1.0, 1.9) * (chance(0.5) ? 1 : -1) : 0;
    const c = this.cable(x, len, 'any', g);
    if (spin) {
      // al girar necesita hueco en todas direcciones
      c.spin = spin;
      c.closes = true;
      c.y = clamp(c.y, CONFIG.world.ceiling + 14 + len / 2, g.view.groundY - 14 - len / 2);
    }
    g.addObstacle(c);
    return len * 0.7;
  }

  cable(x, len, where, g) {
    const top = CONFIG.world.ceiling + 14;
    const bottom = g.view.groundY - 14;
    const angle = pick([0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]);
    const halfH = (Math.abs(Math.sin(angle)) * len) / 2;
    let lo = top + halfH;
    let hi = bottom - halfH;
    const mid = (lo + hi) / 2;
    if (where === 'high') hi = mid;
    if (where === 'low') lo = mid;
    return new Cable(x, rand(lo, hi), len, angle);
  }
}

/** Los que vienen rápido hacia ti y cruzan lo ya comprobado. */
const FAST = new Set(['car', 'dog', 'scooter']);
