import { CONFIG } from '../config.js';

/**
 * Nivel de búsqueda (0-5 estrellas), graduales:
 * - Cada estrella es una barra que se llena con "calor". Los incidentes
 *   no suman de golpe: entran en una reserva (pending) que fluye a la
 *   barra a CONFIG.wanted.fillSpeed por segundo.
 * - Cada estrella cuesta más que la anterior (starCost).
 * - Al completar una estrella, el sobrante se reduce (carryOver) y hay una
 *   breve pausa, así nunca se saltan estrellas.
 * - Si pasas decayDelay segundos sin incidentes, el calor baja despacio
 *   y puedes perder estrellas ("despistar" a la policía).
 */
export class Wanted {
  constructor() {
    this.onChange = null; // (stars, previous) => void
    this.onWarn = null;   // () => void, cuando estás a punto de subir
    this.thresholds = [];
    this.reset();
  }

  reset() {
    const W = CONFIG.wanted;
    let sum = 0;
    this.thresholds = W.starCost.map((c) => (sum += c));
    this.heat = 0;
    this.pending = 0;
    this.stars = 0;
    this.peak = 0;
    this.sinceIncident = 99;
    this.pause = 0;
    this.flash = 0;       // animación al ganar estrella
    this.lostFlash = 0;   // animación al perder estrella
    this.warned = -1;     // última estrella para la que ya se avisó
    this.warnBeep = 0;
  }

  /** Pone directamente un nº de estrellas (al empezar la partida). */
  setStars(n) {
    if (n <= 0) return;
    this.heat = this.thresholds[Math.min(n, this.thresholds.length) - 1];
    this.stars = n;
    this.peak = Math.max(this.peak, n);
    this.warned = n - 1;
  }

  get max() {
    return this.thresholds[this.thresholds.length - 1];
  }

  /** Fracción (0-1) de la estrella que se está llenando. */
  get progress() {
    if (this.stars >= this.thresholds.length) return 1;
    const lo = this.stars === 0 ? 0 : this.thresholds[this.stars - 1];
    return Math.max(0, (this.heat - lo) / (this.thresholds[this.stars] - lo));
  }

  /** Calor por debajo del cual se pierde la estrella actual. */
  get dropLine() {
    if (this.stars === 0) return -1;
    const lo = this.thresholds[this.stars - 1];
    return lo - CONFIG.wanted.starCost[this.stars - 1] * CONFIG.wanted.dropBuffer;
  }

  /** Cuánto le queda a la estrella actual antes de perderse (1 = segura). */
  get hold() {
    if (this.stars === 0) return 1;
    const lo = this.thresholds[this.stars - 1];
    if (this.heat >= lo) return 1;
    return Math.max(0, (this.heat - this.dropLine) / (lo - this.dropLine));
  }

  /** ¿A punto de subir de estrella? */
  get warning() {
    return this.stars < this.thresholds.length && this.progress >= CONFIG.wanted.warnAt;
  }

  /** ¿Bajando (despistando a la policía)? */
  get cooling() {
    return this.sinceIncident > CONFIG.wanted.decayDelay && this.pending <= 0 && this.heat > 0;
  }

  /**
   * Respiro: vacía la búsqueda deprisa, sin bajar de minStars.
   * Las estrellas se pierden sin margen (la policía pierde el rastro).
   */
  drain(amount, minStars) {
    const floor = minStars > 0 ? this.thresholds[minStars - 1] : 0;
    this.pending = 0;
    this.heat = Math.max(floor, this.heat - amount);
    while (this.stars > minStars && this.heat < this.thresholds[this.stars - 1]) {
      const prev = this.stars;
      this.stars--;
      this.lostFlash = 1;
      this.warned = -1;
      this.onChange?.(this.stars, prev);
    }
  }

  /** Añade calor; entra poco a poco en la barra. */
  add(amount) {
    if (amount <= 0) return;
    this.pending += amount;
    this.sinceIncident = 0;
  }

  update(dt) {
    const W = CONFIG.wanted;
    this.sinceIncident += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.lostFlash = Math.max(0, this.lostFlash - dt);
    this.pause = Math.max(0, this.pause - dt);

    // llenado gradual
    if (this.pending > 0 && this.pause <= 0 && this.heat < this.max) {
      const flow = Math.min(this.pending, W.fillSpeed * dt);
      this.pending -= flow;
      this.heat = Math.min(this.max, this.heat + flow);
    }
    if (this.heat >= this.max) this.pending = 0;

    // enfriamiento
    if (this.cooling) this.heat = Math.max(0, this.heat - W.decayRate * dt);

    this.recompute();

    // aviso de "casi": pitido periódico mientras dure
    if (this.warning && !this.cooling) {
      const first = this.warned !== this.stars; // primera vez para esta estrella
      if (first) {
        this.warned = this.stars;
        this.warnBeep = 0;
      }
      this.warnBeep -= dt;
      if (this.warnBeep <= 0) {
        this.warnBeep = W.warnBeepEvery;
        this.onWarn?.(first);
      }
    }
  }

  recompute() {
    const th = this.thresholds;
    // subir (como mucho una estrella por paso)
    if (this.stars < th.length && this.heat >= th[this.stars]) {
      const prev = this.stars;
      this.stars++;
      this.peak = Math.max(this.peak, this.stars);
      this.pending *= CONFIG.wanted.carryOver;
      this.pause = CONFIG.wanted.starPause;
      this.flash = 1.2;
      this.onChange?.(this.stars, prev);
      return;
    }
    // bajar (con margen, para que no parpadee justo en el límite)
    if (this.stars > 0 && this.heat < this.dropLine) {
      const prev = this.stars;
      this.stars--;
      this.lostFlash = 1;
      this.warned = -1;
      this.onChange?.(this.stars, prev);
    }
  }
}
