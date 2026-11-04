import { CONFIG } from '../config.js';

/**
 * Bucle principal con delta time y física de paso fijo:
 * la simulación siempre avanza en pasos de CONFIG.loop.step,
 * así se comporta igual a 30, 60 o 144 fps.
 */
export class Loop {
  constructor(update, render) {
    this.update = update;
    this.render = render;
    this.acc = 0;
    this.last = 0;
    this.running = false;
    this.fps = 60;
    this.frame = this.frame.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  frame(now) {
    if (!this.running) return;
    // el siguiente frame se pide ANTES: si algo falla, el juego no se queda congelado
    requestAnimationFrame(this.frame);
    const { step, maxFrameDt } = CONFIG.loop;
    const dt = Math.min((now - this.last) / 1000, maxFrameDt);
    this.last = now;
    if (dt > 0) this.fps += (1 / dt - this.fps) * 0.05;
    this.rawDt = (now - (this.rawLast ?? now)) / 1000; // sin recortar (para detectar tirones)
    this.rawLast = now;

    try {
      this.acc += dt;
      while (this.acc >= step) {
        this.update(step);
        this.acc -= step;
      }
      this.render(dt);
      this.errors = 0;
    } catch (err) {
      this.acc = 0;
      this.errors = (this.errors ?? 0) + 1;
      this.onError?.(err, this.errors);
    }
  }
}
