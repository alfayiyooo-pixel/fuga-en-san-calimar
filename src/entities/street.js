// OBSTÁCULOS DE CALLE (pensados para ir a pie)
//   fence   valla de obra (saltar)
//   trash   cubos de basura (uno o dos)
//   parked  coche aparcado (salto largo, o rebota en el techo)
//   awning  toldo de un puesto: caer encima te lanza muy alto (no hace daño)

import { CONFIG } from '../config.js';
import { rand, pick, chance } from '../core/rng.js';
import { Obstacle, rectPath } from './obstacles.js';
import { INK, rr, inked, vgrad } from '../characters/kit.js';
import { Sound } from '../core/audio.js';

export const STREET_TYPES = ['fence', 'trash', 'parked', 'awning'];

class Street extends Obstacle {
  constructor(type, x, w, h, g) {
    super(type);
    this.static = true;
    this.x = x; // borde izquierdo
    this.w = w;
    this.h = h;
    this.y = g.view.groundY - h; // borde superior
  }

  get right() {
    return this.x + this.w;
  }

  dangerPath(ctx, camX) {
    // el toldo no hace daño y los coches son vehículos (sin borde: se ven como coches)
    if (this.type === 'awning' || this.type === 'parked') return false;
    rectPath(ctx, this.x - camX + 2, this.y + 2, this.w - 4, this.h - 2, 6);
    return true;
  }

  hits(box) {
    const m = 4;
    return box.l < this.x + this.w - m && box.r > this.x + m && box.t < this.y + this.h && box.b > this.y + m;
  }
}

export class Fence extends Street {
  constructor(g, x) {
    super('fence', x, 54, 48, g);
    this.color = pick(['#ffd23f', '#ff7a3d']);
  }

  draw(ctx, camX) {
    const x = this.x - camX;
    const y = this.y;
    // pies de hormigón
    for (const fx of [x + 2, x + this.w - 16]) {
      rr(ctx, fx, y + this.h - 8, 14, 8, 2);
      inked(ctx, '#9aa3b5');
    }
    // marco y rejilla
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.strokeRect(x + 6, y + 2, this.w - 12, this.h - 12);
    ctx.strokeStyle = '#c9ccd6';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x + 6, y + 2, this.w - 12, this.h - 12);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      ctx.moveTo(x + 6 + k * 8, y + 2);
      ctx.lineTo(x + 6 + k * 8 + 12, y + this.h - 10);
    }
    ctx.stroke();
    // banda de obra
    ctx.fillStyle = this.color;
    ctx.fillRect(x + 4, y + 14, this.w - 8, 8);
    ctx.fillStyle = INK;
    for (let k = 0; k < 4; k++) ctx.fillRect(x + 8 + k * 12, y + 14, 5, 8);
  }
}

export class Trash extends Street {
  constructor(g, x) {
    const n = chance(0.45) ? 2 : 1;
    super('trash', x, n * 34, 42, g);
    this.n = n;
    this.lids = Array.from({ length: n }, () => rand(-0.25, 0.25));
  }

  draw(ctx, camX, g) {
    for (let i = 0; i < this.n; i++) {
      const x = this.x - camX + i * 34;
      const y = this.y;
      ctx.beginPath();
      ctx.moveTo(x + 3, y + 8);
      ctx.lineTo(x + 31, y + 8);
      ctx.lineTo(x + 28, y + this.h);
      ctx.lineTo(x + 6, y + this.h);
      ctx.closePath();
      inked(ctx, vgrad(ctx, y, y + this.h, i ? '#4f9a5a' : '#8a93a6', i ? '#2f6a3a' : '#5a6275'));
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(x + 10 + k * 7, y + 13);
        ctx.lineTo(x + 10 + k * 7, y + this.h - 4);
        ctx.stroke();
      }
      // tapa (algo ladeada) con raspa de pescado
      ctx.save();
      ctx.translate(x + 17, y + 6);
      ctx.rotate(this.lids[i] + Math.sin((g?.t ?? 0) * 6 + i) * 0.03);
      rr(ctx, -17, -4, 34, 7, 3);
      inked(ctx, i ? '#3f8a4a' : '#7a8396');
      ctx.restore();
      if (i === 0) {
        ctx.strokeStyle = '#e8e8f0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 22, y + 1);
        ctx.lineTo(x + 34, y - 5);
        for (let k = 0; k < 3; k++) {
          ctx.moveTo(x + 25 + k * 3, y - 1 - k * 1.5);
          ctx.lineTo(x + 27 + k * 3, y - 6 - k * 1.5);
        }
        ctx.stroke();
      }
    }
  }
}

export class ParkedCar extends Street {
  constructor(g, x) {
    super('parked', x, 124, 54, g);
    this.color = pick([['#ffb627', '#c47a12'], ['#4fc3f7', '#2275a8'], ['#ff6b7d', '#b0303f'], ['#9be37a', '#4f9a3a']]);
  }

  /** Solo el chasis hace daño; el techo es más estrecho. */
  hits(box) {
    const x = this.x;
    const y = this.y;
    const body = box.l < x + this.w - 6 && box.r > x + 6 && box.t < y + this.h && box.b > y + 24;
    const roof = box.l < x + 92 && box.r > x + 30 && box.t < y + 24 && box.b > y + 4;
    return body || roof;
  }

  draw(ctx, camX) {
    const x = this.x - camX;
    const y = this.y;
    const [c0, c1] = this.color;
    ctx.fillStyle = 'rgba(10, 5, 30, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x + this.w / 2, y + this.h + 2, this.w / 2, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // carrocería (mira a la izquierda, aparcado)
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 44);
    ctx.lineTo(x + 4, y + 30);
    ctx.quadraticCurveTo(x + 8, y + 24, x + 26, y + 22);
    ctx.lineTo(x + 38, y + 6);
    ctx.quadraticCurveTo(x + 60, y, x + 86, y + 6);
    ctx.lineTo(x + 100, y + 22);
    ctx.quadraticCurveTo(x + 120, y + 24, x + 120, y + 34);
    ctx.lineTo(x + 120, y + 44);
    ctx.closePath();
    inked(ctx, vgrad(ctx, y, y + 44, c0, c1));
    // ventanillas
    ctx.fillStyle = 'rgba(160, 230, 255, 0.85)';
    ctx.beginPath();
    ctx.moveTo(x + 32, y + 22);
    ctx.lineTo(x + 42, y + 9);
    ctx.lineTo(x + 60, y + 7);
    ctx.lineTo(x + 60, y + 22);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 64, y + 22);
    ctx.lineTo(x + 64, y + 7);
    ctx.lineTo(x + 84, y + 9);
    ctx.lineTo(x + 94, y + 22);
    ctx.closePath();
    ctx.fill();
    // multa en el parabrisas (chiste)
    ctx.fillStyle = '#fff4dc';
    ctx.fillRect(x + 44, y + 13, 8, 6);
    // faros y ruedas
    ctx.fillStyle = '#fff6c2';
    ctx.fillRect(x + 4, y + 30, 6, 5);
    ctx.fillStyle = '#ff3d4f';
    ctx.fillRect(x + 114, y + 30, 6, 5);
    for (const wx of [x + 28, x + 96]) {
      ctx.beginPath();
      ctx.arc(wx, y + 45, 9, 0, Math.PI * 2);
      inked(ctx, '#1b1420');
      ctx.fillStyle = '#c9ccd6';
      ctx.beginPath();
      ctx.arc(wx, y + 45, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export class Awning extends Street {
  constructor(g, x) {
    super('awning', x, 120, 92, g);
    this.colors = pick([['#19c3b1', '#fff4dc'], ['#4f8fff', '#fff4dc'], ['#5fcf7a', '#f4fff0']]); // nunca colores de peligro: no hace daño
    this.squash = 0;
    // pavos en arco por encima: el premio de rebotar
    const gy = g.view.groundY;
    for (let k = 0; k < 7; k++) {
      const f = k / 6;
      g.tokens.add(x + 70 + f * 260, gy - 230 - Math.sin(f * Math.PI) * 120, k === 3 ? 'gold' : 'bill');
    }
  }

  hits() {
    return false; // no hace daño: se pasa por debajo o se rebota encima
  }

  update(dt, g) {
    this.squash = Math.max(0, this.squash - dt * 4);
    const p = g.player;
    if (g.dead || !p.onFoot || p.vy <= 0) return;
    const top = this.y + 4;
    if (p.right > this.x + 6 && p.left < this.x + this.w - 6 && p.bottom >= top && p.bottom - p.vy * dt - 2 <= top) {
      p.y = top - p.h / 2;
      p.bounce(CONFIG.foot.awningBounce);
      this.squash = 1;
      g.camera.addShake(0.15);
      g.stats.bounces = (g.stats.bounces ?? 0) + 1;
      Sound.tone({ freq: 220, type: 'triangle', dur: 0.35, vol: 0.18, slide: 3 });
    }
  }

  draw(ctx, camX) {
    const x = this.x - camX;
    const y = this.y;
    const sq = Math.sin(this.squash * Math.PI) * 6 * this.squash;
    // mostrador y postes
    ctx.fillStyle = INK;
    ctx.fillRect(x + 8, y + 10, 5, this.h - 10);
    ctx.fillRect(x + this.w - 13, y + 10, 5, this.h - 10);
    rr(ctx, x + 4, y + this.h - 30, this.w - 8, 30, 3);
    inked(ctx, vgrad(ctx, y + this.h - 30, y + this.h, '#c98a52', '#8a5a36'));
    // frutas en el mostrador
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = ['#ff7a3d', '#ffd23f', '#9be37a'][k % 3];
      ctx.beginPath();
      ctx.arc(x + 20 + k * 16, y + this.h - 33, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    // toldo de rayas (se hunde al rebotar)
    const [a, b] = this.colors;
    const n = 8;
    for (let k = 0; k < n; k++) {
      const x0 = x + (k * this.w) / n;
      const x1 = x + ((k + 1) * this.w) / n;
      ctx.fillStyle = k % 2 ? b : a;
      ctx.beginPath();
      ctx.moveTo(x0, y + sq);
      ctx.lineTo(x1, y + sq);
      ctx.lineTo(x1, y + 18);
      ctx.quadraticCurveTo((x0 + x1) / 2, y + 26, x0, y + 18);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y + sq, this.w, 18 - sq);
    // flecha de "¡salta aquí!"
    ctx.fillStyle = 'rgba(255, 244, 220, 0.85)';
    ctx.beginPath();
    ctx.moveTo(x + this.w / 2 - 8, y - 22);
    ctx.lineTo(x + this.w / 2 + 8, y - 22);
    ctx.lineTo(x + this.w / 2, y - 10);
    ctx.fill();
  }
}

/** Crea un obstáculo de calle y devuelve el espacio horizontal que ocupa. */
export function spawnStreet(type, g, x) {
  const map = { fence: Fence, trash: Trash, parked: ParkedCar, awning: Awning };
  const o = new map[type](g, x);
  g.addObstacle(o);
  return o.w + (type === 'awning' ? 220 : 40);
}
