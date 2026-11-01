import { CONFIG } from '../config.js';

/**
 * Nivel de búsqueda (0-5 estrellas).
 * Internamente es un "calor" 0-100: sube con incidentes, baja si pasas
 * un rato sin llamar la atención, y nunca baja de un mínimo que crece
 * con la distancia.
 */
export class Wanted {
  constructor() {
    this.onChange = null; // (stars, previous) => void
    this.reset();
  }

  reset() {
    this.heat = 0;
    this.stars = 0;
    this.peak = 0;
    this.sinceIncident = 99;
    this.flash = 0;
  }

  starsFor(heat) {
    return CONFIG.wanted.thresholds.filter((th) => heat >= th).length;
  }

  /** Fracción (0-1) del camino hacia la siguiente estrella. */
  get progress() {
    const th = CONFIG.wanted.thresholds;
    if (this.stars >= th.length) return 1;
    const lo = this.stars === 0 ? 0 : th[this.stars - 1];
    return (this.heat - lo) / (th[this.stars] - lo);
  }

  add(amount) {
    this.heat = Math.min(CONFIG.wanted.max, this.heat + amount);
    this.sinceIncident = 0;
    this.recompute();
  }

  update(dt, distance) {
    const W = CONFIG.wanted;
    this.sinceIncident += dt;
    this.flash = Math.max(0, this.flash - dt);
    if (this.sinceIncident > W.decayDelay) this.heat -= W.decayRate * dt;

    const floorStars = Math.min(W.maxFloor, Math.floor(distance / W.floorEvery));
    const floorHeat = floorStars > 0 ? W.thresholds[floorStars - 1] : 0;
    this.heat = Math.max(this.heat, floorHeat);
    this.recompute();
  }

  recompute() {
    const s = this.starsFor(this.heat);
    if (s !== this.stars) {
      const prev = this.stars;
      this.stars = s;
      this.peak = Math.max(this.peak, s);
      if (s > prev) this.flash = 1.2;
      this.onChange?.(s, prev);
    }
  }
}
