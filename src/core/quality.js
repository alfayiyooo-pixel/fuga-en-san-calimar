import { CONFIG } from '../config.js';

/**
 * CALIDAD GRÁFICA: modo 'auto' (por defecto), 'high' o 'low'.
 *
 * En automático se miden los FPS durante los primeros segundos de cada
 * partida (CONFIG.quality.auto): si la media baja de minFps se pasa al
 * nivel siguiente (alta → baja → mínima) y se vuelve a medir; si va bien,
 * se queda así. El nivel aprendido se recuerda para la próxima vez. Además,
 * si en mitad de la partida va lento mucho rato, también baja.
 *
 *   high  resolución completa, todas las partículas, fondo con desenfoque
 *   low   menos resolución y partículas, menos vida en el fondo, sin desenfoques
 *   min   (solo en automático) aún menos resolución, partículas y fondo
 *
 * Los TIRONES (frames sueltos muy largos, que se notan aunque la media de FPS
 * sea buena) también bajan la calidad en el momento.
 */
const LEVELS = ['high', 'low', 'min'];

export const Quality = {
  mode: 'auto',
  level: 'high',
  lowFpsTime: 0,
  listeners: new Set(),
  check: null, // medición en curso al empezar la partida

  /** @param learned nivel aprendido en automático (se guarda en Save) */
  set(mode, learned = null) {
    this.mode = ['auto', 'high', 'low'].includes(mode) ? mode : 'auto';
    this.level = this.mode === 'auto' ? (LEVELS.includes(learned) ? learned : 'high') : this.mode;
    this.lowFpsTime = 0;
    this.check = null;
    this.emit(false);
  },

  /** Siguiente modo en el ciclo auto → alta → baja. */
  cycle() {
    const order = ['auto', 'high', 'low'];
    this.set(order[(order.indexOf(this.mode) + 1) % order.length]);
    return this.mode;
  },

  get high() {
    return this.level === 'high';
  },

  get settings() {
    return CONFIG.quality[this.level];
  },

  get canLower() {
    return this.mode === 'auto' && LEVELS.indexOf(this.level) < LEVELS.length - 1;
  },

  /** Empieza a medir (al empezar cada partida). */
  startCheck() {
    if (this.mode !== 'auto') return;
    this.check = { t: 0, frames: 0, time: 0 };
    this.stutters = [];
  },

  lower() {
    if (!this.canLower) return false;
    this.level = LEVELS[LEVELS.indexOf(this.level) + 1];
    this.lowFpsTime = 0;
    this.stutters = [];
    this.clock = 0;
    this.emit(true);
    return true;
  },

  /** Cada frame (dt real del frame). Devuelve true si ha bajado la calidad. */
  monitor(dt, fps, playing = true) {
    if (this.mode !== 'auto') return false;
    const A = CONFIG.quality.auto;
    const c = this.check;
    // tirones: frames largos seguidos (solo jugando; el primero tras bajar no cuenta)
    if (playing && this.canLower) {
      this.clock = (this.clock ?? 0) + dt;
      const st = (this.stutters ??= []);
      if (dt * 1000 > A.stutterMs && this.clock > 0.3) st.push(this.clock);
      while (st.length && this.clock - st[0] > A.stutterWindow) st.shift();
      if (st.length >= A.stutterFrames) {
        this.lastFps = Math.round(1 / dt);
        const lowered = this.lower();
        if (lowered) this.check = { t: A.skip, frames: 0, time: 0 }; // y vuelve a medir
        return lowered;
      }
    }
    if (c && playing) {
      c.t += dt;
      if (c.t > A.skip) {
        c.frames++;
        c.time += dt;
        if (c.time >= A.window) {
          this.lastFps = c.frames / c.time;
          if (this.lastFps < A.minFps && this.lower()) this.check = { t: A.skip, frames: 0, time: 0 }; // vuelve a medir
          else this.check = null; // va bien: se queda así
          return !!this.check;
        }
      }
      return false;
    }
    // vigilancia continua (picos largos a mitad de partida)
    if (!this.canLower) return false;
    if (fps < A.sustainedFps) this.lowFpsTime += dt;
    else this.lowFpsTime = Math.max(0, this.lowFpsTime - dt * 0.5);
    if (this.lowFpsTime > A.sustainedTime) return this.lower();
    return false;
  },

  onChange(fn) {
    this.listeners.add(fn);
  },

  emit(auto) {
    this.listeners.forEach((fn) => fn(this.level, auto));
  },
};
