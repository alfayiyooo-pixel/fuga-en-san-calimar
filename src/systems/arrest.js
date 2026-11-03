// "¡DETENIDO!": cuando el atracador se detiene tras el golpe, la policía lo
// rodea, los billetes salen volando de la bolsa y aparece el sello cómico.
// Sin sangre: estrellitas, billetes y un sello de goma.

import { CONFIG } from '../config.js';
import { rand, pick, clamp } from '../core/rng.js';
import { t } from '../core/i18n.js';
import { Sound } from '../core/audio.js';
import { Cop } from '../entities/minors.js';
import { PatrolCar } from '../entities/obstacles.js';
import { drawGlow } from '../fx/sprites.js';

const INK = '#1b1030';

export class Arrest {
  constructor() {
    this.active = false;
    this.done = false;
  }

  reset() {
    this.active = false;
    this.done = false;
  }

  start(g) {
    const A = CONFIG.death.arrest;
    const p = g.player;
    this.active = true;
    this.done = false;
    this.t = 0;
    this.bx = p.x;
    this.stamped = false;
    this.subKey = `arrest.sub${Math.floor(Math.random() * A.subtitles) + 1}`;
    // dos agentes llegan corriendo, uno por cada lado
    this.cops = [
      { o: new Cop(g, this.bx + 420), from: this.bx + 420, to: this.bx + 46, flip: false },
      { o: new Cop(g, this.bx - 360), from: this.bx - 360, to: this.bx - 44, flip: true },
    ];
    // y una patrulla que frena detrás
    this.car = new PatrolCar(g, 0);
    this.carFrom = this.bx + 900;
    this.carTo = this.bx + 110;
    this.car.x = this.carFrom;
    Sound.siren();
    Sound.whistle();
  }

  update(dt, g) {
    const A = CONFIG.death.arrest;
    this.t += dt;
    const k = clamp(this.t / A.arriveTime, 0, 1);
    const e = 1 - (1 - k) ** 3;
    for (const c of this.cops) {
      c.o.t += dt * (k < 1 ? 1 : 0.15);
      c.o.x = c.from + (c.to - c.from) * e;
    }
    this.car.x = this.carFrom + (this.carTo - this.carFrom) * e;
    this.car.wheel += dt * (1 - k) * 30;
    // billetes que salen volando de la bolsa
    if (!this.stamped && this.t > A.arriveTime * 0.7) {
      this.stamped = true;
      const p = g.player;
      p.bagLost = true;
      for (let n = 0; n < 3; n++) {
        g.particles.burst(p.x - 6, p.y, 14, { color: n === 1 ? '#ffd23f' : '#5fcf7a', speed: 420, life: 2, size: 6, shape: 'rect', spin: 12, gravity: 380, drag: 1.2, vy: -360, important: true });
      }
      g.camera.addShake(0.6);
      g.flash = Math.max(g.flash, 0.5);
      Sound.stamp();
      Sound.wompWomp();
    }
    if (this.t >= A.duration) this.done = true;
  }

  draw(ctx, camX, g) {
    if (!this.active) return;
    this.car.draw(ctx, camX, g);
    for (const c of this.cops) {
      if (!c.flip) {
        c.o.draw(ctx, camX, g);
      } else {
        ctx.save();
        ctx.translate(c.o.x - camX, c.o.y);
        ctx.scale(-1, 1);
        c.o.paint(ctx, g);
        ctx.restore();
      }
    }
  }

  /** Sello "¡DETENIDO!" en pantalla (encima de todo). */
  overlay(ctx, g) {
    if (!this.active || !this.stamped) return;
    const A = CONFIG.death.arrest;
    const k = clamp((this.t - A.arriveTime * 0.7) / 0.25, 0, 1);
    const s = 3 - 2 * k; // cae como un sello
    const v = g.view;
    ctx.save();
    ctx.translate(v.w / 2, v.h * 0.36);
    ctx.rotate(-0.12);
    ctx.scale(s, s);
    ctx.globalAlpha = k;
    drawGlow(ctx, 0, 0, 260, 'rgba(255, 61, 79, 0.6)', 0.5);
    const label = t('arrest.title');
    ctx.font = "64px 'Bungee', Impact, sans-serif";
    const w = ctx.measureText(label).width + 50;
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#ff3d4f';
    ctx.fillStyle = 'rgba(255, 244, 220, 0.92)';
    ctx.beginPath();
    ctx.roundRect(-w / 2, -50, w, 100, 14);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 9, -41, w - 18, 82, 8);
    ctx.stroke();
    ctx.fillStyle = '#ff3d4f';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 4);
    ctx.restore();
    // esposas de dibujo y subtítulo con guasa
    ctx.save();
    ctx.globalAlpha = k;
    ctx.font = "20px 'Bungee', Impact, sans-serif";
    ctx.textAlign = 'center';
    ctx.lineWidth = 5;
    ctx.strokeStyle = INK;
    ctx.fillStyle = '#fff4dc';
    const sub = t(this.subKey);
    ctx.strokeText(sub, v.w / 2, v.h * 0.36 + 82);
    ctx.fillText(sub, v.w / 2, v.h * 0.36 + 82);
    this.cuffs(ctx, v.w / 2 + 230, v.h * 0.36 - 40, g.t);
    ctx.restore();
  }

  cuffs(ctx, x, y, time) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.3 + Math.sin(time * 6) * 0.1);
    ctx.lineWidth = 9;
    ctx.strokeStyle = INK;
    for (const ox of [-16, 16]) {
      ctx.beginPath();
      ctx.arc(ox, 0, 13, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#c9ccd6';
    for (const ox of [-16, 16]) {
      ctx.beginPath();
      ctx.arc(ox, 0, 13, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}
