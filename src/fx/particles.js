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
    this.pool = []; // partículas muertas para reutilizar (sin crear objetos sin parar)
  }

  clear() {
    for (const p of this.list) this.pool.push(p);
    this.list.length = 0;
  }

  spawn(p) {
    // en calidad baja se omite parte de las partículas decorativas
    if (!p.important && Math.random() > Quality.settings.particles) return;
    let o;
    if (this.list.length >= CONFIG.particles.max) {
      if (!p.important) return; // lleno: las decorativas nuevas se omiten
      o = this.list[(this.oldest = ((this.oldest ?? 0) + 1) % this.list.length)]; // se reutiliza una vieja
    } else {
      o = this.pool.pop() ?? {};
      this.list.push(o);
    }
    o.x = p.x;
    o.y = p.y;
    o.vx = p.vx ?? 0;
    o.vy = p.vy ?? 0;
    o.life = p.life ?? 0.5;
    o.maxLife = o.life;
    o.size = p.size ?? 4;
    o.sizeEnd = p.sizeEnd ?? 0;
    o.color = p.color ?? '#fff';
    o.gravity = p.gravity ?? 0;
    o.drag = p.drag ?? 0;
    o.additive = p.additive ?? false;
    o.shape = p.shape ?? 'circle';
    o.rot = p.rot ?? 0;
    o.spin = p.spin ?? 0;
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
        this.pool.push(p);
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
    // calidad baja: los círculos se pintan como cuadrados (mucho más baratos y casi no se nota)
    const cheap = !Quality.settings.detail;
    const right = (this.viewW ?? 1400) + 60;
    for (const p of this.list) {
      if (p.additive !== additive) continue;
      const k = p.life / p.maxLife;
      const size = p.sizeEnd + (p.size - p.sizeEnd) * k;
      if (size <= 0.2) continue;
      const x = p.x - camX;
      if (x < -size - 40 || x > right + size) continue; // fuera de pantalla
      ctx.globalAlpha = Math.min(1, k * 1.4);
      ctx.fillStyle = p.color;
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
      } else if (cheap) {
        ctx.fillRect(x - size * 0.85, p.y - size * 0.85, size * 1.7, size * 1.7);
      } else {
        ctx.beginPath();
        ctx.arc(x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
