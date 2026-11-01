import { t, fmt } from '../core/i18n.js';
import { CONFIG } from '../config.js';
import { billSprite, magnetSprite } from '../entities/tokens.js';
import { drawSprite, drawGlow } from '../fx/sprites.js';

const FONT = "'Bungee', Impact, sans-serif";
const INK = '#1b1030';

/** Texto con contorno grueso, estilo cómic. */
export function outlinedText(ctx, text, x, y, size, fill = '#fff4dc', align = 'left') {
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.2);
  ctx.strokeStyle = INK;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function starPath(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** Marcador dibujado en el canvas durante la partida. */
export class Hud {
  constructor() {
    this.debug = new URLSearchParams(location.search).has('debug');
    this.bannerData = null;
    this.starFlash = 0;
    this.bump = 0;
    this.bumpBig = false;
  }

  reset() {
    this.bannerData = null;
    this.starFlash = 0;
    this.bump = 0;
  }

  /** El contador de pavos "salta" al recoger. */
  bumpBucks(big = false) {
    this.bump = 1;
    this.bumpBig = big;
  }

  banner(title, sub) {
    this.bannerData = { title, sub, time: 0, life: 2.6 };
  }

  flashStars() {
    this.starFlash = 1;
  }

  update(dt) {
    if (this.bannerData) {
      this.bannerData.time += dt;
      if (this.bannerData.time > this.bannerData.life) this.bannerData = null;
    }
    this.starFlash = Math.max(0, this.starFlash - dt);
    this.bump = Math.max(0, this.bump - dt * 5);
  }

  draw(ctx, game, loop) {
    const v = game.view;
    outlinedText(ctx, t('hud.distance', { n: fmt(game.distance) }), 18, 14, 32);
    this.drawBucks(ctx, game);
    this.drawStars(ctx, game, v);
    this.drawBanner(ctx, v);

    if (this.debug) {
      const p = game.player;
      const lines = [
        `fps ${loop.fps.toFixed(0)}`,
        `speed ${game.speed.toFixed(0)} px/s`,
        `vy ${p.vy.toFixed(0)}  thrust ${p.thrust.toFixed(2)}`,
        `t ${game.runTime.toFixed(1)} s  diff ${game.difficulty.toFixed(2)}`,
        `heat ${game.wanted.heat.toFixed(0)}  obst ${game.obstacles.length}`,
        `zone ${game.zone.current.id}  tokens ${game.tokens.list.length}`,
      ];
      ctx.font = '13px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(14, 150, 230, lines.length * 16 + 8);
      ctx.fillStyle = '#7CFFB2';
      lines.forEach((l, i) => ctx.fillText(l, 20, 154 + i * 16));
    }
  }

  drawBucks(ctx, game) {
    const y = 72;
    const k = this.bump;
    const s = 1 + k * (this.bumpBig ? 0.45 : 0.22);
    if (k > 0) drawGlow(ctx, 34, y, 30 * s, this.bumpBig ? 'rgba(255, 210, 63, 0.8)' : 'rgba(140, 255, 170, 0.7)', k);
    drawSprite(ctx, billSprite(), 34, y, 1.15 * s, 1.15 * s);
    ctx.save();
    ctx.translate(58, y - 13);
    ctx.scale(s, s);
    outlinedText(ctx, fmt(game.bucks), 0, -2 * k, 26, k > 0.3 ? (this.bumpBig ? '#ffd23f' : '#c9ffd6') : '#9dffb5');
    ctx.restore();

    // imán activo: icono con anillo de tiempo restante
    const mt = game.tokens.magnetTime;
    if (mt > 0) {
      const x = 34;
      const my = y + 46;
      const frac = mt / CONFIG.tokens.magnet.duration;
      const blink = mt < 2 && Math.floor(mt * 8) % 2 === 0;
      if (!blink) drawSprite(ctx, magnetSprite(), x, my, 0.8, 0.8);
      ctx.strokeStyle = '#1b1030';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(x, my, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#ff6b7d';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(x, my, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      ctx.stroke();
    }
  }

  drawStars(ctx, game, v) {
    const W = game.wanted;
    const n = 5;
    const gap = 32;
    const x0 = v.w / 2 - ((n - 1) * gap) / 2;
    const y = 30;
    const pop = 1 + this.starFlash * 0.35 * Math.abs(Math.sin(this.starFlash * 12));
    for (let i = 0; i < n; i++) {
      const x = x0 + i * gap;
      const filled = i < W.stars;
      const next = i === W.stars;
      const r = 13 * (filled ? pop : 1);
      starPath(ctx, x, y, r + 3);
      ctx.fillStyle = INK;
      ctx.fill();
      starPath(ctx, x, y, r);
      if (filled) {
        // con muchas estrellas, parpadean en rojo/azul como una sirena
        const siren = W.stars >= 4 && Math.floor(game.t * 6 + i) % 2 === 0;
        ctx.fillStyle = siren ? '#ff6b7d' : '#ffd23f';
      } else {
        ctx.fillStyle = 'rgba(255, 244, 220, 0.25)';
      }
      ctx.fill();
      // la siguiente estrella se va "llenando"
      if (next && W.progress > 0) {
        ctx.save();
        starPath(ctx, x, y, r);
        ctx.clip();
        ctx.fillStyle = 'rgba(255, 210, 63, 0.55)';
        ctx.fillRect(x - r, y + r - 2 * r * W.progress, 2 * r, 2 * r * W.progress);
        ctx.restore();
      }
    }
  }

  drawBanner(ctx, v) {
    const b = this.bannerData;
    if (!b) return;
    const inT = Math.min(1, b.time / 0.3);
    const outT = Math.min(1, Math.max(0, (b.life - b.time) / 0.3));
    const k = Math.min(inT, outT);
    const ease = 1 - (1 - k) ** 3;
    const y = 64 + (1 - ease) * -60;
    ctx.save();
    ctx.globalAlpha = ease;
    ctx.translate(v.w / 2, y);
    ctx.rotate(-0.03);
    ctx.font = `30px ${FONT}`;
    const w = Math.max(260, ctx.measureText(b.sub).width + 60);
    ctx.fillStyle = INK;
    ctx.fillRect(-w / 2 - 4, -4, w + 8, 74);
    ctx.fillStyle = '#ff7a3d';
    ctx.fillRect(-w / 2, 0, w, 66);
    outlinedText(ctx, b.title.toUpperCase(), 0, 6, 14, '#fff4dc', 'center');
    outlinedText(ctx, b.sub.toUpperCase(), 0, 26, 30, '#ffe066', 'center');
    ctx.restore();
  }
}
