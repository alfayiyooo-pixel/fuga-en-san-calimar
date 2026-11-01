import { CONFIG } from '../config.js';
import { t } from '../core/i18n.js';
import { Sound } from '../core/audio.js';

/**
 * Multiplicador de pavos (x1…x5) por esquivas al límite ("por los pelos").
 * Cada CONFIG.score.perLevel esquivas sube un nivel; si pasas
 * CONFIG.score.decay segundos sin arriesgar, baja uno.
 */
export class Combo {
  constructor() {
    this.reset();
  }

  reset() {
    this.level = 1;
    this.charge = 0;
    this.since = 0;
    this.nearMisses = 0;
    this.maxLevel = 1;
    this.flash = 0;
  }

  /** Fracción de tiempo que le queda al nivel actual antes de bajar. */
  get timeLeft() {
    return this.level > 1 ? Math.max(0, 1 - this.since / CONFIG.score.decay) : 0;
  }

  nearMiss(g, wx, wy) {
    const S = CONFIG.score;
    this.nearMisses++;
    this.since = 0;
    this.charge++;
    if (this.charge >= S.perLevel && this.level < S.maxMult) {
      this.level++;
      this.charge = 0;
      this.flash = 1;
      this.maxLevel = Math.max(this.maxLevel, this.level);
      Sound.multUp(this.level);
      g.popups.add(t('popup.multUp', { n: this.level }), g.view.w / 2, 150, { color: '#ffd23f', size: 30, life: 1.3, rise: 14 });
      g.camera.addShake(0.15);
    } else {
      if (this.level >= S.maxMult) this.charge = S.perLevel - 1;
      Sound.nearMiss();
    }
    g.popAt(t('popup.near'), wx, wy, '#7ff7e8', 20);
    g.particles.burst(wx, wy + 30, 8, { color: '#7ff7e8', speed: 220, life: 0.35, size: 3, sizeEnd: 0, additive: true });
  }

  update(dt) {
    this.since += dt;
    this.flash = Math.max(0, this.flash - dt * 1.5);
    if (this.level > 1 && this.since > CONFIG.score.decay) {
      this.level--;
      this.charge = 0;
      this.since = CONFIG.score.decay * 0.4; // un poco de margen antes de seguir bajando
      Sound.multDown();
    }
  }
}
