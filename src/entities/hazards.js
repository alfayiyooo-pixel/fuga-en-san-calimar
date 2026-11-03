// PELIGROS DE LA CIUDAD (sustituyen a los carteles que caían)
// Cada uno pide una reacción distinta:
//   wrecking  bola de demolición de una grúa que se balancea (calcular el momento)
//   neon      letrero de neón que parpadea: solo hace daño encendido
//   scaffold  andamio que se derrumba dejando hueco arriba o abajo
//   hydrant   boca de riego que revienta: el chorro te empuja hacia arriba
//   shutter   toldo de una fachada que se cierra de golpe
//
// Todos comparten: update(dt, g), hits(box), blocks(box) (zona que evitan los
// pavos), center, right y draw(ctx, camX, g). Valores en CONFIG.hazards.

import { CONFIG } from '../config.js';
import { rand, pick, chance, clamp } from '../core/rng.js';
import { Obstacle } from './obstacles.js';
import { INK, rr, inked, vgrad } from '../characters/kit.js';
import { drawGlow } from '../fx/sprites.js';
import { Sound } from '../core/audio.js';
import { t } from '../core/i18n.js';

export const HAZARD_TYPES = ['wrecking', 'neon', 'scaffold', 'hydrant', 'shutter'];

const overlap = (b, l, r, tp, bt) => b.l < r && b.r > l && b.t < bt && b.b > tp;

/** Segmento grueso contra caja (muestreo a lo largo del segmento). */
function segHits(box, x1, y1, x2, y2, th) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(2, Math.ceil(len / 8));
  const r = th / 2;
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const px = x1 + (x2 - x1) * k;
    const py = y1 + (y2 - y1) * k;
    if (px > box.l - r && px < box.r + r && py > box.t - r && py < box.b + r) return true;
  }
  return false;
}

class Hazard extends Obstacle {
  constructor(type) {
    super(type);
    this.static = true;
    this.cfg = CONFIG.hazards[type];
  }

  blocks(box) {
    return this.hits(box);
  }
}

// ------------------------------------------------------------
// BOLA DE DEMOLICIÓN — péndulo colgado de una grúa
// ------------------------------------------------------------
export class WreckingBall extends Hazard {
  constructor(g, x) {
    super('wrecking');
    const C = this.cfg;
    this.ax = x + 110;
    this.ay = CONFIG.world.ceiling - 30;
    const lowest = g.player.onFoot ? g.view.groundY - C.footClearance : g.view.groundY - rand(C.lowest[0], C.lowest[1]);
    this.L = lowest - this.ay;
    this.amp = rand(C.amp[0], C.amp[1]);
    this.period = rand(C.period[0], C.period[1]);
    this.phase = Math.random() * Math.PI * 2;
    this.r = C.radius;
    this.time = 0;
    this.whooshed = 0;
  }

  get angle() {
    return this.amp * Math.sin((this.time / this.period) * Math.PI * 2 + this.phase);
  }

  get ball() {
    const a = this.angle;
    return { x: this.ax + Math.sin(a) * this.L, y: this.ay + Math.cos(a) * this.L };
  }

  get center() {
    return this.ball;
  }

  get right() {
    return this.ax + Math.sin(this.amp) * this.L + this.r + 20;
  }

  update(dt, g) {
    this.time += dt;
    // silbido al pasar por abajo (si está en pantalla)
    const sx = this.ax - g.camera.x;
    const a = this.angle;
    if (sx > 0 && sx < g.view.w && Math.abs(a) < 0.08 && this.time - this.whooshed > this.period * 0.4) {
      this.whooshed = this.time;
      Sound.swoosh();
    }
  }

  hits(box) {
    const b = this.ball;
    const cx = clamp(b.x, box.l, box.r);
    const cy = clamp(b.y, box.t, box.b);
    return (cx - b.x) ** 2 + (cy - b.y) ** 2 < (this.r * 0.9) ** 2;
  }

  /** Para los pavos: toda la zona que barre la bola. */
  blocks(box) {
    const s = Math.sin(this.amp) * this.L;
    const top = this.ay + Math.cos(this.amp) * this.L - this.r;
    return overlap(box, this.ax - s - this.r, this.ax + s + this.r, top, this.ay + this.L + this.r);
  }

  draw(ctx, camX, g) {
    const ax = this.ax - camX;
    const ay = this.ay;
    const b = this.ball;
    const bx = b.x - camX;
    // pluma de la grúa (celosía amarilla) entrando por arriba
    ctx.strokeStyle = INK;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(ax - 260, ay + 6);
    ctx.lineTo(ax + 60, ay + 6);
    ctx.stroke();
    ctx.strokeStyle = '#ffb627';
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let k = 0; k < 16; k++) {
      ctx.moveTo(ax - 260 + k * 20, ay + 2);
      ctx.lineTo(ax - 250 + k * 20, ay + 10);
    }
    ctx.stroke();
    // carro y trayectoria (aviso suave)
    ctx.fillStyle = INK;
    ctx.fillRect(ax - 9, ay + 4, 18, 12);
    ctx.strokeStyle = 'rgba(255, 244, 220, 0.18)';
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ax, ay, this.L, Math.PI / 2 - this.amp, Math.PI / 2 + this.amp);
    ctx.stroke();
    ctx.setLineDash([]);
    // cadena
    ctx.strokeStyle = '#3a3f4a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ax, ay + 12);
    ctx.lineTo(bx, b.y - this.r + 4);
    ctx.stroke();
    // estela de movimiento
    const prev = this.amp * Math.sin(((this.time - 0.06) / this.period) * Math.PI * 2 + this.phase);
    const px = this.ax + Math.sin(prev) * this.L - camX;
    const py = this.ay + Math.cos(prev) * this.L;
    ctx.fillStyle = 'rgba(40, 30, 60, 0.25)';
    ctx.beginPath();
    ctx.arc(px, py, this.r, 0, Math.PI * 2);
    ctx.fill();
    // bola
    ctx.beginPath();
    ctx.arc(bx, b.y, this.r, 0, Math.PI * 2);
    const gr = ctx.createRadialGradient(bx - 9, b.y - 10, 4, bx, b.y, this.r);
    gr.addColorStop(0, '#8a90a2');
    gr.addColorStop(1, '#2a2d38');
    inked(ctx, gr);
    ctx.fillStyle = INK;
    ctx.fillRect(bx - 5, b.y - this.r - 6, 10, 8);
  }
}

// ------------------------------------------------------------
// NEÓN PARPADEANTE — solo hace daño encendido
// ------------------------------------------------------------
const NEON_WORDS = ['OPEN', 'BAR', 'HOTEL', '24H', 'CASINO', 'TATTOO', 'PIZZA', 'KARAOKE'];

export class Neon extends Hazard {
  constructor(g, x) {
    super('neon');
    const C = this.cfg;
    this.x = x;
    this.w = rand(130, 170);
    this.h = 44;
    this.y = g.player.onFoot ? g.view.groundY - 58 : rand(CONFIG.world.ceiling + 60, g.view.groundY - 130);
    this.word = pick(NEON_WORDS);
    this.color = pick(['#ff3d9a', '#19e3ff', '#b6ff3d', '#ffb627']);
    this.rgba = this.color === '#ff3d9a' ? 'rgba(255, 61, 154, 0.9)' : this.color === '#19e3ff' ? 'rgba(25, 227, 255, 0.9)' : this.color === '#b6ff3d' ? 'rgba(182, 255, 61, 0.9)' : 'rgba(255, 182, 39, 0.9)';
    // empieza en un punto aleatorio del ciclo (no predecible)
    this.state = chance(0.5) ? 'on' : 'off';
    this.timer = rand(0.2, this.state === 'on' ? C.on[1] : C.off[1]);
  }

  get right() {
    return this.x + this.w;
  }

  get center() {
    return { x: this.x + this.w / 2, y: this.y + this.h / 2 };
  }

  get lit() {
    return this.state === 'on';
  }

  update(dt, g) {
    const C = this.cfg;
    this.timer -= dt;
    if (this.timer > 0) return;
    if (this.state === 'on') {
      this.state = 'off';
      this.timer = rand(C.off[0], C.off[1]);
    } else if (this.state === 'off') {
      this.state = 'warn'; // parpadeo de aviso (aún no hace daño)
      this.timer = C.warn;
    } else {
      this.state = 'on';
      this.timer = rand(C.on[0], C.on[1]);
      const sx = this.x - g.camera.x;
      if (sx > -50 && sx < g.view.w) Sound.neonBuzz();
    }
  }

  hits(box) {
    return this.lit && overlap(box, this.x + 4, this.x + this.w - 4, this.y + 4, this.y + this.h - 4);
  }

  blocks(box) {
    return overlap(box, this.x, this.x + this.w, this.y, this.y + this.h);
  }

  draw(ctx, camX, g) {
    const x = this.x - camX;
    const y = this.y;
    const flick = this.state === 'warn' ? (Math.floor(g.t * 22) % 2 ? 0.55 : 0.12) : this.lit ? 1 : 0.1;
    // soportes
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 20, y);
    ctx.lineTo(x + 20, y - 24);
    ctx.moveTo(x + this.w - 20, y);
    ctx.lineTo(x + this.w - 20, y - 24);
    ctx.stroke();
    rr(ctx, x, y, this.w, this.h, 8);
    inked(ctx, '#1d1433');
    if (flick > 0.2) drawGlow(ctx, x + this.w / 2, y + this.h / 2, this.w * 0.75, this.rgba, 0.55 * flick, this.h * 1.4);
    ctx.font = "26px 'Bungee', Impact, sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = 0.25 + 0.75 * flick;
    ctx.strokeText(this.word, x + this.w / 2, y + this.h / 2 + 2);
    ctx.fillStyle = flick > 0.5 ? '#ffffff' : '#3a2a50';
    ctx.fillText(this.word, x + this.w / 2, y + this.h / 2 + 2);
    ctx.globalAlpha = 1;
    // chispas cuando está encendido
    if (this.lit && Math.random() < 0.15) {
      g.particles.spawn({ x: this.x + rand(0, this.w), y: y + this.h, vx: rand(-60, 60), vy: rand(-40, 60), life: 0.3, size: 2, sizeEnd: 0, color: this.color, additive: true, gravity: 600 });
    }
  }
}

// ------------------------------------------------------------
// ANDAMIO — se derrumba dejando hueco arriba o abajo
// ------------------------------------------------------------
export class Scaffold extends Hazard {
  constructor(g, x) {
    super('scaffold');
    this.x = x;
    this.w = 64;
    this.top = CONFIG.world.ceiling - 10;
    this.bottom = g.view.groundY;
    const n = 5;
    const sh = (this.bottom - this.top) / n;
    this.segs = Array.from({ length: n }, (_, i) => ({ y: this.top + i * sh, h: sh, alive: true, fall: null }));
    // a pie solo puede abrirse por abajo
    this.pattern = g.player.onFoot ? 'low' : pick(['high', 'low']);
    this.breaks = this.pattern === 'high' ? [0, 1] : [n - 2, n - 1];
    this.state = 'stand';
    this.shake = 0;
  }

  get right() {
    return this.x + this.w + 60;
  }

  get center() {
    return { x: this.x + this.w / 2, y: (this.top + this.bottom) / 2 };
  }

  update(dt, g) {
    const C = this.cfg;
    const lead = (g.speed || 350) * C.triggerTime;
    if (this.state === 'stand' && this.x - g.player.right < lead + C.warnTime * (g.speed || 350)) {
      this.state = 'warn';
      this.timer = C.warnTime;
    }
    if (this.state === 'warn') {
      this.timer -= dt;
      this.shake = 1;
      if (this.timer <= 0) this.collapse(g);
    }
    for (const s of this.segs) {
      if (!s.fall) continue;
      s.fall.vy += 1800 * dt;
      s.fall.x += s.fall.vx * dt;
      s.fall.y += s.fall.vy * dt;
      s.fall.rot += s.fall.spin * dt;
    }
  }

  collapse(g) {
    this.state = 'down';
    this.shake = 0;
    for (const i of this.breaks) {
      const s = this.segs[i];
      s.alive = false;
      s.fall = { x: 0, y: 0, vx: rand(80, 220), vy: rand(-200, 0), rot: 0, spin: rand(-4, 4) };
      g.particles.burst(this.x + this.w / 2, s.y + s.h / 2, 10, { color: '#c9ccd6', speed: 300, life: 0.8, size: 4, shape: 'rect', spin: 10, gravity: 900, important: true });
      g.particles.burst(this.x + this.w / 2, s.y + s.h / 2, 6, { color: 'rgba(200, 190, 170, 0.6)', speed: 120, life: 1, size: 10, sizeEnd: 26, drag: 2 });
    }
    g.camera.addShake(0.35);
    g.wanted.add(CONFIG.hazards.scaffold.heat);
    Sound.crash();
    Sound.clank();
  }

  hits(box) {
    for (const s of this.segs) {
      if (s.alive && overlap(box, this.x + 4, this.x + this.w - 4, s.y + 2, s.y + s.h - 2)) return true;
    }
    return false;
  }

  /** Para los pavos: lo que seguirá en pie tras el derrumbe. */
  blocks(box) {
    return this.segs.some((s, i) => !this.breaks.includes(i) && overlap(box, this.x - 10, this.x + this.w + 10, s.y, s.y + s.h));
  }

  draw(ctx, camX, g) {
    const sx = this.state === 'warn' ? Math.sin(g.t * 60) * 2 : 0;
    const x = this.x - camX + sx;
    // viga superior que sujeta lo que queda colgando
    ctx.fillStyle = INK;
    ctx.fillRect(x - 10, this.top - 6, this.w + 20, 10);
    for (const [i, s] of this.segs.entries()) {
      if (s.alive) {
        this.drawSeg(ctx, x, s.y, s.h, this.state === 'warn' && this.breaks.includes(i));
      } else if (s.fall && s.y + s.fall.y < g.view.h + 100) {
        ctx.save();
        ctx.translate(x + this.w / 2 + s.fall.x, s.y + s.h / 2 + s.fall.y);
        ctx.rotate(s.fall.rot);
        ctx.globalAlpha = 0.85;
        this.drawSeg(ctx, -this.w / 2, -s.h / 2, s.h, false);
        ctx.restore();
      }
    }
  }

  drawSeg(ctx, x, y, h, cracking) {
    const w = this.w;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = cracking ? '#ff6b5a' : '#9aa3b5';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(x, y, w, h);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + h);
    ctx.stroke();
    // tablón y lona
    ctx.fillStyle = '#b07a46';
    ctx.fillRect(x - 4, y + h - 8, w + 8, 6);
    ctx.fillStyle = 'rgba(25, 195, 177, 0.35)';
    ctx.fillRect(x + 3, y + 4, w - 6, h * 0.45);
  }
}

// ------------------------------------------------------------
// BOCA DE RIEGO — revienta y el chorro te empuja hacia arriba
// ------------------------------------------------------------
export class Hydrant extends Hazard {
  constructor(g, x) {
    super('hydrant');
    const C = this.cfg;
    this.x = x;
    this.w = 30;
    this.h = 38;
    this.y = g.view.groundY - this.h;
    this.state = 'idle';
    this.jetH = rand(C.height[0], C.height[1]);
    this.timer = 0;
    this.pushed = false;
  }

  get right() {
    return this.x + this.w + 30;
  }

  get center() {
    return { x: this.x + this.w / 2, y: this.y + this.h / 2 };
  }

  update(dt, g) {
    const C = this.cfg;
    const lead = (g.speed || 350) * C.triggerTime;
    if (this.state === 'idle' && this.x - g.player.right < lead) {
      this.state = 'sputter';
      this.timer = C.warnTime;
      Sound.hiss();
    } else if (this.state === 'sputter') {
      this.timer -= dt;
      if (Math.random() < dt * 30) this.spray(g, 60);
      if (this.timer <= 0) {
        this.state = 'burst';
        this.timer = C.duration;
        g.wanted.add(C.heat);
        g.camera.addShake(0.2);
        Sound.splash();
      }
    } else if (this.state === 'burst') {
      this.timer -= dt;
      if (Math.random() < dt * 60) this.spray(g, this.jetH);
      // el chorro empuja hacia arriba (no hace daño)
      const p = g.player;
      const jx = this.x + this.w / 2;
      if (!g.dead && p.right > jx - 22 && p.left < jx + 22 && p.bottom > this.y - this.jetH) {
        p.vy = Math.min(p.vy, -C.push);
        p.onGround = false;
        if (p.onFoot) p.jumpHold = 0;
        if (!this.pushed) {
          this.pushed = true;
          g.popups.add(t('hazard.splash'), p.x - g.camera.x, p.y - 50, { color: '#9fe8ff', size: 22 });
        }
      }
      if (this.timer <= 0) this.state = 'done';
    }
  }

  spray(g, h) {
    const jx = this.x + this.w / 2;
    g.particles.spawn({ x: jx + rand(-8, 8), y: this.y - rand(0, h), vx: rand(-90, 90), vy: rand(-120, 60), life: rand(0.4, 0.8), size: rand(3, 6), sizeEnd: 1, color: 'rgba(170, 230, 255, 0.8)', gravity: 900 });
  }

  hits(box) {
    return overlap(box, this.x + 3, this.x + this.w - 3, this.y + 6, this.y + this.h);
  }

  blocks(box) {
    return overlap(box, this.x - 20, this.x + this.w + 20, this.y - this.jetH, this.y + this.h);
  }

  draw(ctx, camX, g) {
    const x = this.x - camX;
    const y = this.y;
    // chorro
    if (this.state === 'burst') {
      const jx = x + this.w / 2;
      const top = y - this.jetH;
      const gr = ctx.createLinearGradient(0, top, 0, y);
      gr.addColorStop(0, 'rgba(190, 240, 255, 0)');
      gr.addColorStop(0.3, 'rgba(170, 230, 255, 0.75)');
      gr.addColorStop(1, 'rgba(120, 200, 255, 0.9)');
      ctx.fillStyle = gr;
      const wob = Math.sin(g.t * 30) * 3;
      ctx.beginPath();
      ctx.moveTo(jx - 8, y + 2);
      ctx.quadraticCurveTo(jx - 14 + wob, (y + top) / 2, jx - 20, top);
      ctx.lineTo(jx + 20, top);
      ctx.quadraticCurveTo(jx + 14 - wob, (y + top) / 2, jx + 8, y + 2);
      ctx.closePath();
      ctx.fill();
      drawGlow(ctx, jx, top + 10, 34, 'rgba(200, 245, 255, 0.9)', 0.5);
    }
    // boca de riego roja con tapas
    ctx.beginPath();
    ctx.moveTo(x + 5, y + this.h);
    ctx.lineTo(x + 5, y + 12);
    ctx.quadraticCurveTo(x + 15, y - 2, x + 25, y + 12);
    ctx.lineTo(x + 25, y + this.h);
    ctx.closePath();
    inked(ctx, vgrad(ctx, y, y + this.h, '#ff5a4f', '#b0242c'));
    rr(ctx, x - 1, y + 16, 32, 8, 3);
    inked(ctx, '#d13038');
    rr(ctx, x + 2, y + this.h - 6, 26, 6, 2);
    inked(ctx, '#8a1c24');
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(x + 15, y + 6, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ------------------------------------------------------------
// TOLDO DE FACHADA — se cierra de golpe (de horizontal a vertical)
// ------------------------------------------------------------
export class Shutter extends Hazard {
  constructor(g, x) {
    super('shutter');
    const C = this.cfg;
    this.x = x;
    this.len = C.length;
    this.ay = g.player.onFoot ? g.view.groundY - 70 - this.len : rand(CONFIG.world.ceiling + 90, g.view.groundY - this.len - 20);
    this.angle = 0; // 0 = abierto (horizontal); π/2 = cerrado (colgando)
    this.state = 'open';
    this.colors = pick([['#ff3d4f', '#fff4dc'], ['#2a9d8f', '#fff4dc'], ['#6a4cff', '#ffd23f']]);
    this.snapAt = rand(C.trigger[0], C.trigger[1]);
  }

  get right() {
    return this.x + this.len + 20;
  }

  get center() {
    return { x: this.x + 30, y: this.ay + 30 };
  }

  get tip() {
    return { x: this.x + 14 + Math.cos(this.angle) * this.len, y: this.ay + Math.sin(this.angle) * this.len };
  }

  update(dt, g) {
    const C = this.cfg;
    if (this.state === 'open' && this.x - g.player.right < (g.speed || 350) * this.snapAt) {
      this.state = 'rattle';
      this.timer = C.warnTime;
    } else if (this.state === 'rattle') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'snap';
        Sound.snap();
      }
    } else if (this.state === 'snap') {
      this.angle = Math.min(Math.PI / 2, this.angle + dt * C.snapSpeed);
      if (this.angle >= Math.PI / 2) {
        this.state = 'closed';
        g.camera.addShake(0.15);
      }
    }
  }

  hits(box) {
    // fachada (pared por encima del toldo) + lona del toldo
    if (overlap(box, this.x, this.x + 14, CONFIG.world.ceiling - 40, this.ay)) return true;
    const tp = this.tip;
    return segHits(box, this.x + 14, this.ay, tp.x, tp.y, 12);
  }

  blocks(box) {
    return overlap(box, this.x - 10, this.x + this.len + 24, this.ay - 20, this.ay + this.len + 10) || overlap(box, this.x, this.x + 14, CONFIG.world.ceiling - 40, this.ay);
  }

  draw(ctx, camX, g) {
    const x = this.x - camX;
    const rattle = this.state === 'rattle' ? Math.sin(g.t * 70) * 0.06 : 0;
    // fachada
    ctx.fillStyle = INK;
    ctx.fillRect(x - 2, CONFIG.world.ceiling - 40, 18, this.ay - CONFIG.world.ceiling + 44);
    ctx.fillStyle = '#c98a6a';
    ctx.fillRect(x + 1, CONFIG.world.ceiling - 40, 12, this.ay - CONFIG.world.ceiling + 40);
    // lona de rayas que gira sobre la bisagra
    ctx.save();
    ctx.translate(x + 14, this.ay);
    ctx.rotate(this.angle + rattle);
    const [a, b] = this.colors;
    const n = 6;
    for (let k = 0; k < n; k++) {
      ctx.fillStyle = k % 2 ? b : a;
      ctx.fillRect((k * this.len) / n, -7, this.len / n + 0.5, 14);
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.strokeRect(0, -7, this.len, 14);
    // flecos
    ctx.fillStyle = a;
    for (let k = 0; k < 8; k++) {
      ctx.beginPath();
      ctx.arc(8 + k * (this.len - 16) / 7, 8, 4, 0, Math.PI);
      ctx.fill();
    }
    ctx.restore();
    // bisagra
    ctx.fillStyle = '#3a3f4a';
    ctx.beginPath();
    ctx.arc(x + 14, this.ay, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Crea un peligro y devuelve el espacio horizontal que ocupa. */
export function spawnHazard(type, g, x) {
  switch (type) {
    case 'wrecking': {
      const o = new WreckingBall(g, x);
      g.addObstacle(o);
      return 110 + Math.sin(o.amp) * o.L + 40;
    }
    case 'neon': {
      const o = new Neon(g, x);
      g.addObstacle(o);
      return o.w;
    }
    case 'scaffold':
      g.addObstacle(new Scaffold(g, x));
      return 90;
    case 'hydrant':
      g.addObstacle(new Hydrant(g, x));
      return 60;
    case 'shutter': {
      const o = new Shutter(g, x);
      g.addObstacle(o);
      return o.len + 20;
    }
  }
  return 0;
}
