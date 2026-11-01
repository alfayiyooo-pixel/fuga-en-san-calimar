import { CONFIG } from '../config.js';

/**
 * Calidad gráfica: 'high', 'low' o 'auto'.
 * En 'auto' se empieza en alta y, si los FPS se mantienen por debajo de
 * CONFIG.quality.autoMinFps durante autoWindow segundos, se baja sola.
 */
export const Quality = {
  mode: 'auto',
  level: 'high',
  lowFpsTime: 0,
  listeners: new Set(),

  set(mode) {
    this.mode = ['auto', 'high', 'low'].includes(mode) ? mode : 'auto';
    this.level = this.mode === 'low' ? 'low' : 'high';
    this.lowFpsTime = 0;
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

  monitor(dt, fps) {
    if (this.mode !== 'auto' || !this.high) return;
    if (fps < CONFIG.quality.autoMinFps) this.lowFpsTime += dt;
    else this.lowFpsTime = Math.max(0, this.lowFpsTime - dt * 0.5);
    if (this.lowFpsTime > CONFIG.quality.autoWindow) {
      this.level = 'low';
      this.emit(true);
    }
  },

  onChange(fn) {
    this.listeners.add(fn);
  },

  emit(auto) {
    this.listeners.forEach((fn) => fn(this.level, auto));
  },
};
