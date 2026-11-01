import { CONFIG } from '../config.js';
import { Quality } from '../core/quality.js';
import { glowSprite } from './sprites.js';

/**
 * Sistema de partículas en coordenadas de mundo.
 * Cada partícula: posición, velocidad, vida, tamaño inicial→final, color,
 * gravedad, rozamiento y si se dibuja en modo aditivo (brillo).
 */
export class Particles {
  constructor() {
    this.list = [];
  }

  clear() {
    this.list.length = 0;
  }

  spawn(p) {
    // en calidad baja se omite parte de las partículas decorativas
    if (!p.important && Math.random() > Quality.settings.particles) return;
    if (this.list.length >= CONFIG.particles.max) this.list.shift();
    this.list.push({
      x: p.x,
      y: p.y,
      vx: p.vx ?? 0,
      vy: p.vy ?? 0,
      life: p.life ?? 0.5,
      maxLife: p.life ?? 0.5,
      size: p.size ?? 4,
      sizeEnd: p.sizeEnd ?? 0,
      color: p.color ?? '#fff',
      gravity: p.gravity ?? 0,
      drag: p.drag ?? 0,
      additive: p.additive ?? false,
      shape: p.shape ?? 'circle',
      rot: p.rot ?? 0,
      spin: p.spin ?? 0,
    });
  }

  /** Atajo para explosiones radiales. */
  burst(x, y, count, opts = {}) {
    const speed = opts.speed ?? 300;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      this.spawn({
        ...opts,
        x,
        y,
        vx: Math.cos(a) * v + (opts.vx ?? 0),
        vy: Math.sin(a) * v + (opts.vy ?? 0),
        life: (opts.life ?? 0.6) * (0.6 + Math.random() * 0.6),
      });
    }
  }

  update(dt) {
    const list = this.list;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life -= dt;
      if (p.life <= 0) {
        list[i] = list[list.length - 1];
        list.pop();
        continue;
      }
      if (p.drag) {
        const k = Math.exp(-p.drag * dt);
        p.vx *= k;
        p.vy *= k;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
  }

  draw(ctx, camX) {
    // primero las normales, después las aditivas (brillo)
    this.drawPass(ctx, camX, false);
    ctx.globalCompositeOperation = 'lighter';
    this.drawPass(ctx, camX, true);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  drawPass(ctx, camX, additive) {
    for (const p of this.list) {
      if (p.additive !== additive) continue;
      const k = p.life / p.maxLife;
      const size = p.sizeEnd + (p.size - p.sizeEnd) * k;
      if (size <= 0.2) continue;
      ctx.globalAlpha = Math.min(1, k * 1.4);
      ctx.fillStyle = p.color;
      const x = p.x - camX;
      if (p.shape === 'glow') {
        ctx.drawImage(glowSprite(p.color).canvas, x - size, p.y - size, size * 2, size * 2);
      } else if (p.shape === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, 6 * k);
        ctx.beginPath();
        ctx.arc(x, p.y, size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.shape === 'gear') {
        ctx.save();
        ctx.translate(x, p.y);
        ctx.rotate(p.rot);
        for (let k = 0; k < 6; k++) {
          ctx.rotate(Math.PI / 3);
          ctx.fillRect(-size * 0.25, -size * 1.35, size * 0.5, size * 0.6);
        }
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.shape === 'rect') {
        ctx.save();
        ctx.translate(x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-size, -size * 0.5, size * 2, size);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
