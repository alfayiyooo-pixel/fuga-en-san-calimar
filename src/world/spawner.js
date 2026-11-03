import { CONFIG } from '../config.js';
import { rand, chance, lerp, pick, clamp } from '../core/rng.js';
import { Cable, PatrolCar, Helicopter, Missile } from '../entities/obstacles.js';
import { spawnMinor } from '../entities/minors.js';
import { spawnStreet } from '../entities/street.js';
import { spawnHazard } from '../entities/hazards.js';

/**
 * Genera obstáculos por delante de la cámara.
 * Elige el tipo por pesos (distancia desbloqueada × zona × estrellas)
 * y deja una separación que se acorta con la dificultad.
 */
export class Spawner {
  reset(startX = 0) {
    this.nextX = startX + CONFIG.spawner.firstAt * CONFIG.world.pxPerMeter;
    this.lastType = null;
  }

  update(g) {
    // se genera bastante por delante para que los pavos puedan colocarse alrededor
    const ahead = g.camera.x + g.view.w + 700;
    // durante un respiro no se genera nada nuevo
    if (g.respite.active) {
      this.nextX = Math.max(this.nextX, ahead);
      return;
    }
    while (this.nextX < ahead) {
      const type = this.choose(g);
      const len = this.spawn(type, g, this.nextX);
      this.lastType = type;
      this.nextX += len + this.gap(g) * (type === 'minor' ? CONFIG.minors.gapMult : 1);
    }
  }

  gap(g) {
    const S = CONFIG.spawner;
    const base = lerp(S.gapStart, S.gapEnd, g.difficulty) * g.policeLevel.gapMult * g.respite.gapMult * g.events.gapMult;
    const jittered = base * (1 + rand(-S.gapJitter, S.gapJitter));
    return Math.max(jittered, g.speed * S.minGapTime);
  }

  choose(g) {
    const O = CONFIG.obstacles;
    const lvl = g.policeLevel;
    const zoneMods = O.zoneWeights[g.zone.current.id] || {};
    const active = (type) => g.obstacles.filter((o) => o.type === type && o.alive).length;

    const entries = [];
    const consider = (type, w) => {
      if (w <= 0 || g.distance < O.unlockAt[type]) return;
      if (type === 'heli' && active('heli') > 0) return;
      if (type === 'missile' && active('missile') > 2) return;
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

  /** Crea el patrón y devuelve cuánto espacio horizontal ocupa. */
  spawn(type, g, x) {
    switch (type) {
      case 'minor':
        return spawnMinor(this.chooseMinor(g), g, x);
      case 'cop':
        return spawnMinor('cop', g, x);
      case 'street':
        return spawnStreet(this.chooseStreet(g), g, x);
      case 'hazard':
        return spawnHazard(this.chooseHazard(g), g, x);
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
    if (d > 0.45 && chance(0.25)) {
      const gapH = lerp(190, 140, d);
      const gapY = rand(top + 80, bottom - 80 - gapH);
      const l1 = gapY - top;
      const l2 = bottom - (gapY + gapH);
      g.addObstacle(new Cable(x, top + l1 / 2, l1, Math.PI / 2));
      g.addObstacle(new Cable(x, bottom - l2 / 2, l2, Math.PI / 2));
      return 30;
    }

    // doble: uno alto y uno bajo, escalonados
    if (d > 0.25 && chance(0.3)) {
      const len = rand(C.minLen, C.maxLen * 0.8);
      const high = chance(0.5);
      g.addObstacle(this.cable(x, len, high ? 'high' : 'low', g));
      g.addObstacle(this.cable(x + 240, len, high ? 'low' : 'high', g));
      return 260;
    }

    const len = rand(C.minLen, lerp(C.minLen + 60, C.maxLen, d));
    const spin = d > C.spinFrom && chance(C.spinChance) ? rand(1.0, 1.9) * (chance(0.5) ? 1 : -1) : 0;
    const c = this.cable(x, len, 'any', g);
    if (spin) {
      // al girar necesita hueco en todas direcciones
      c.spin = spin;
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
