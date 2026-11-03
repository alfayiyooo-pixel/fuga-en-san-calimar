// ESCONDITES: atravesarlos de punta a punta quita una estrella.
//   wash     túnel de lavado (a ras de suelo)
//   alley    callejón oscuro entre dos edificios (a ras de suelo, más largo)
//   parking  planta de un parking elevado (a media altura; solo con jetpack)
// Están en una "ruta" concreta (una franja de altura) y los pavos van por
// otro lado, así que meterse es una decisión. No hacen daño.

import { CONFIG } from '../config.js';
import { rand, pick } from '../core/rng.js';
import { Obstacle } from './obstacles.js';
import { INK, rr, inked, vgrad } from '../characters/kit.js';
import { drawGlow } from '../fx/sprites.js';
import { Sound } from '../core/audio.js';
import { t } from '../core/i18n.js';

export const HIDEOUT_TYPES = ['wash', 'alley', 'parking'];

export class Hideout extends Obstacle {
  constructor(g, x, kind) {
    super('hideout');
    const H = CONFIG.hideouts;
    this.kind = kind;
    this.static = true;
    this.x = x;
    this.w = H[kind].length;
    const gy = g.view.groundY;
    // franja (top/bottom) por la que hay que pasar
    if (kind === 'parking') {
      this.bandTop = gy - H.parking.height[1];
      this.bandBottom = gy - H.parking.height[0];
    } else {
      this.bandTop = gy - H[kind].height;
      this.bandBottom = gy;
    }
    this.inside = false;
    this.failed = false;
    this.done = false;
    this.anim = 0;
    // pavos por la otra ruta (lejos de la entrada)
    const gyTok = kind === 'parking' ? gy - 40 : this.bandTop - 150;
    for (let k = 0; k < 9; k++) {
      const f = k / 8;
      const y = kind === 'parking' ? gyTok - Math.sin(f * Math.PI) * 30 : gyTok - Math.sin(f * Math.PI) * 60;
      g.tokens.add(x + 20 + f * this.w, y, k === 4 ? 'gold' : 'bill');
    }
  }

  get right() {
    return this.x + this.w + 40;
  }

  get center() {
    return { x: this.x + this.w / 2, y: (this.bandTop + this.bandBottom) / 2 };
  }

  hits() {
    return false;
  }

  /** Los pavos no se colocan dentro del escondite. */
  blocks(box) {
    return box.l < this.x + this.w && box.r > this.x - 20 && box.t < this.bandBottom && box.b > this.bandTop - 30;
  }

  inBand(p) {
    return p.y > this.bandTop + 6 && p.y < this.bandBottom - 4;
  }

  update(dt, g) {
    this.anim += dt;
    if (this.done || g.dead) return;
    const p = g.player;
    if (!this.inside && !this.failed && p.x >= this.x && p.x < this.x + 40) {
      if (this.inBand(p)) {
        this.inside = true;
        Sound.whoosh();
      } else {
        this.failed = true;
      }
    }
    if (this.inside) {
      // dentro te mantienes en la franja (techo y suelo del escondite)
      const half = p.h / 2;
      if (p.y - half < this.bandTop) {
        p.y = this.bandTop + half;
        if (p.vy < 0) p.vy = 0;
      }
      if (p.y + half > this.bandBottom && this.kind === 'parking') {
        p.y = this.bandBottom - half;
        if (p.vy > 0) p.vy = 0;
        p.onGround = true;
      }
      if (p.x > this.x + this.w) {
        this.inside = false;
        this.done = true;
        this.reward(g);
      }
    }
  }

  reward(g) {
    const lost = g.wanted.dropStar();
    g.stats.hideouts = g.stats.hideouts ?? { wash: 0, alley: 0, parking: 0 };
    g.stats.hideouts[this.kind]++;
    const p = g.player;
    g.flash = Math.max(g.flash, 0.35);
    g.particles.spawn({ x: p.x, y: p.y, life: 0.6, size: 20, sizeEnd: 200, color: 'rgba(127, 247, 232, 0.8)', shape: 'glow', additive: true, important: true });
    g.particles.spawn({ x: p.x, y: p.y, life: 0.5, size: 10, sizeEnd: 140, color: '#7ff7e8', shape: 'ring', additive: true, important: true });
    g.popups.add(t(`hideout.${this.kind}`), g.view.w / 2, 190, { color: '#7ff7e8', size: 30, life: 1.8, rise: 10 });
    g.popups.add(lost ? t('hideout.lost') : t('hideout.none'), g.view.w / 2, 228, { color: '#fff4dc', size: 20, life: 1.8, rise: 10 });
    Sound.relief();
    g.onHideout?.(this.kind);
  }

  // ---------- dibujo ----------
  draw(ctx, camX, g) {
    const x = this.x - camX;
    if (x > g.view.w + 50 || x + this.w < -100) return;
    if (this.kind === 'wash') this.drawWash(ctx, x, g);
    else if (this.kind === 'alley') this.drawAlley(ctx, x, g);
    else this.drawParking(ctx, x, g);
    // flecha de entrada
    if (!this.inside && !this.done) {
      const ay = (this.bandTop + this.bandBottom) / 2;
      const bob = Math.sin(this.anim * 6) * 4;
      ctx.fillStyle = 'rgba(127, 247, 232, 0.9)';
      ctx.beginPath();
      ctx.moveTo(x - 40 + bob, ay - 12);
      ctx.lineTo(x - 18 + bob, ay);
      ctx.lineTo(x - 40 + bob, ay + 12);
      ctx.fill();
      ctx.font = "13px 'Bungee', Impact, sans-serif";
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = INK;
      ctx.strokeText(t('hideout.hint'), x + this.w / 2, this.bandTop - 16);
      ctx.fillStyle = '#7ff7e8';
      ctx.fillText(t('hideout.hint'), x + this.w / 2, this.bandTop - 16);
    }
  }

  /** Penumbra encima del jugador mientras está dentro. */
  front(ctx, camX, g) {
    const x = this.x - camX;
    if (x > g.view.w || x + this.w < 0) return;
    ctx.fillStyle = this.kind === 'alley' ? 'rgba(10, 5, 25, 0.45)' : 'rgba(10, 5, 25, 0.25)';
    ctx.fillRect(x + 10, this.bandTop, this.w - 20, this.bandBottom - this.bandTop);
    if (this.kind === 'wash') {
      // cortinas de espuma por delante
      for (let k = 0; k < 3; k++) {
        const cx = x + 60 + k * (this.w - 120) / 2;
        for (let s = 0; s < 6; s++) {
          ctx.fillStyle = s % 2 ? 'rgba(80, 160, 255, 0.55)' : 'rgba(255, 90, 160, 0.5)';
          const sway = Math.sin(this.anim * 5 + s + k) * 4;
          ctx.fillRect(cx - 18 + s * 6 + sway, this.bandTop + 6, 4, this.bandBottom - this.bandTop - 30);
        }
      }
    }
  }

  drawWash(ctx, x, g) {
    const top = this.bandTop - 26;
    const gy = this.bandBottom;
    rr(ctx, x, top, this.w, gy - top, 6);
    inked(ctx, vgrad(ctx, top, gy, '#3fb8e8', '#1f6fa0'));
    ctx.fillStyle = '#1a1030';
    ctx.fillRect(x + 12, this.bandTop, this.w - 24, gy - this.bandTop);
    // rodillos girando dentro
    for (let k = 0; k < 4; k++) {
      const cx = x + 50 + k * (this.w - 100) / 3;
      ctx.fillStyle = k % 2 ? '#3a8bff' : '#ff4fa0';
      rr(ctx, cx - 10, this.bandTop + 8, 20, gy - this.bandTop - 16, 9);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      for (let s = 0; s < 6; s++) {
        const yy = this.bandTop + 14 + ((s * 16 + this.anim * 120) % (gy - this.bandTop - 24));
        ctx.beginPath();
        ctx.moveTo(cx - 9, yy);
        ctx.lineTo(cx + 9, yy + 5);
        ctx.stroke();
      }
    }
    // cartel con burbujas
    ctx.font = "16px 'Bungee', Impact, sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff4dc';
    ctx.fillText(t('hideout.washSign'), x + this.w / 2, top + 13);
    for (let k = 0; k < 5; k++) {
      const by = top - 8 - ((this.anim * 30 + k * 13) % 50);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x + 30 + k * 60, by, 4 + (k % 3), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawAlley(ctx, x, g) {
    const gy = this.bandBottom;
    const top = this.bandTop - 120;
    // paredes de ladrillo a los lados de un hueco oscuro
    ctx.fillStyle = '#120a22';
    ctx.fillRect(x, top, this.w, gy - top);
    for (const wx of [x - 30, x + this.w - 10]) {
      rr(ctx, wx, top - 30, 40, gy - top + 30, 3);
      inked(ctx, vgrad(ctx, top, gy, '#9a4a3a', '#5a2a24'));
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      for (let r = 0; r < 14; r++) ctx.fillRect(wx + (r % 2) * 10, top - 20 + r * 16, 30, 3);
    }
    // escalera de incendios y farola tenue
    ctx.strokeStyle = '#3a3150';
    ctx.lineWidth = 3;
    for (let k = 0; k < 3; k++) ctx.strokeRect(x + 30, top + 10 + k * 40, this.w - 60, 4);
    drawGlow(ctx, x + this.w * 0.6, this.bandTop + 10, 60, 'rgba(255, 200, 120, 0.7)', 0.35 + 0.1 * Math.sin(this.anim * 9));
    // ojos de gato y cubo
    const blink = Math.floor(this.anim * 1.3) % 4 !== 0;
    if (blink) {
      ctx.fillStyle = '#d6ff3d';
      ctx.fillRect(x + 80, gy - 22, 4, 3);
      ctx.fillRect(x + 89, gy - 22, 4, 3);
    }
  }

  drawParking(ctx, x, g) {
    const gy = g.view.groundY;
    const deck = this.bandBottom;
    const roof = this.bandTop;
    // pilares hasta el suelo
    ctx.fillStyle = '#7a7f8e';
    for (let k = 0; k < 4; k++) {
      const px = x + 20 + k * (this.w - 40) / 3;
      ctx.fillRect(px - 8, deck, 16, gy - deck);
      ctx.fillRect(px - 8, roof - 40, 16, 40);
    }
    // forjados
    for (const [yy, h] of [[roof - 20, 20], [deck, 18]]) {
      rr(ctx, x - 10, yy, this.w + 20, h, 3);
      inked(ctx, vgrad(ctx, yy, yy + h, '#b7bccb', '#7a7f8e'));
    }
    ctx.fillStyle = 'rgba(20, 12, 40, 0.75)';
    ctx.fillRect(x, roof, this.w, deck - roof);
    // coches aparcados al fondo y luces
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = ['#ff6b7d', '#4fc3f7', '#ffd23f'][k];
      rr(ctx, x + 40 + k * 100, deck - 26, 64, 20, 6);
      ctx.fill();
    }
    for (let k = 0; k < 3; k++) drawGlow(ctx, x + 60 + k * 110, roof + 6, 30, 'rgba(255, 250, 220, 0.8)', 0.4);
    // cartel P
    rr(ctx, x - 6, roof - 70, 36, 36, 6);
    inked(ctx, '#2a6af0');
    ctx.fillStyle = '#fff';
    ctx.font = "24px 'Bungee', Impact, sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', x + 12, roof - 51);
  }
}

export function spawnHideout(g, x) {
  const types = g.player.onFoot ? ['wash', 'alley'] : HIDEOUT_TYPES;
  const kind = pick(types);
  const o = new Hideout(g, x, kind);
  g.addObstacle(o);
  return o.w + 60;
}
