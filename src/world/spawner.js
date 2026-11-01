import { CONFIG } from '../config.js';
import { rand, chance, lerp, pick, clamp } from '../core/rng.js';
import { Cable, Billboard, PatrolCar, Helicopter, Missile } from '../entities/obstacles.js';

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
    while (this.nextX < ahead) {
      const type = this.choose(g);
      const len = this.spawn(type, g, this.nextX);
      this.lastType = type;
      this.nextX += len + this.gap(g);
    }
  }

  gap(g) {
    const S = CONFIG.spawner;
    const base = lerp(S.gapStart, S.gapEnd, g.difficulty) * (1 - S.starGapFactor * g.wanted.stars);
    const jittered = base * (1 + rand(-S.gapJitter, S.gapJitter));
    return Math.max(jittered, g.speed * S.minGapTime);
  }

  choose(g) {
    const O = CONFIG.obstacles;
    const dist = g.distance;
    const zoneMods = O.zoneWeights[g.zone.current.id] || {};
    const policeMult = 1 + O.policeBonusPerStar * g.wanted.stars;
    const active = (type) => g.obstacles.filter((o) => o.type === type && o.alive).length;

    const entries = [];
    for (const [type, w] of Object.entries(O.weights)) {
      if (dist < O.unlockAt[type]) continue;
      if (type === 'heli' && active('heli') > 0) continue;
      if (type === 'missile' && active('missile') > 1) continue;
      let weight = w * (zoneMods[type] ?? 1);
      if (type === 'car' || type === 'missile' || type === 'heli') weight *= policeMult;
      if (type === this.lastType && type !== 'cable') weight *= 0.4; // menos repeticiones
      entries.push([type, weight]);
    }
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let roll = Math.random() * total;
    for (const [type, w] of entries) {
      roll -= w;
      if (roll <= 0) return type;
    }
    return 'cable';
  }

  /** Crea el patrón y devuelve cuánto espacio horizontal ocupa. */
  spawn(type, g, x) {
    switch (type) {
      case 'billboard':
        g.addObstacle(new Billboard(x));
        return 150;
      case 'car': {
        g.addObstacle(new PatrolCar(g));
        if (g.wanted.stars >= CONFIG.obstacles.car.doubleFromStars && chance(0.5)) {
          g.addObstacle(new PatrolCar(g, 0.9));
        }
        return 160;
      }
      case 'missile': {
        const volley = g.wanted.stars >= CONFIG.obstacles.missile.volleyFromStars ? (chance(0.5) ? 3 : 2) : 1;
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
