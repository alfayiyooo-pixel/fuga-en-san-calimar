import { CONFIG } from '../config.js';

/**
 * Cámara horizontal que sigue al jugador, con temblor tipo "trauma":
 * addShake(0..1) acumula trauma y el desplazamiento es proporcional a trauma².
 */
export class Camera {
  constructor() {
    this.x = 0;
    this.trauma = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.time = 0;
  }

  reset(x = 0) {
    this.x = x;
    this.trauma = 0;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  follow(targetX, viewW) {
    this.x = targetX - viewW * CONFIG.player.screenX;
  }

  addShake(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  update(dt) {
    this.time += dt;
    this.trauma = Math.max(0, this.trauma - CONFIG.camera.shakeDecay * dt);
    const s = this.trauma * this.trauma * CONFIG.camera.shakeMax;
    // ruido suave (suma de senos) en lugar de aleatorio puro
    const t = this.time * 40;
    this.offsetX = s * (Math.sin(t * 1.3) * 0.6 + Math.sin(t * 2.9) * 0.4);
    this.offsetY = s * (Math.sin(t * 1.7 + 1) * 0.6 + Math.sin(t * 3.3) * 0.4);
  }
}
