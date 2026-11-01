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
    this.drawBanner(ctx, v);
    if (game.respite.active) this.drawRespite(ctx, game, v);
    this.drawStars(ctx, game, v);

    if (this.debug) {
      const p = game.player;
      const lines = [
        `fps ${loop.fps.toFixed(0)}`,
        `speed ${game.speed.toFixed(0)} px/s`,
        `vy ${p.vy.toFixed(0)}  thrust ${p.thrust.toFixed(2)}`,
        `t ${game.runTime.toFixed(1)} s  diff ${game.difficulty.toFixed(2)}`,
        `heat ${game.wanted.heat.toFixed(1)} (+${game.wanted.pending.toFixed(1)})  obst ${game.obstacles.length}`,
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
    const gap = 34;
    const x0 = v.w / 2 - ((n - 1) * gap) / 2;
    const y = 30;
    const t = game.t;
    const warn = W.warning && !W.cooling;

    // persecución intensa: bordes de la pantalla con luces de sirena
    if (W.stars >= 4) this.drawSirenEdges(ctx, v, t, W.stars === 5 ? 0.32 : 0.18);

    for (let i = 0; i < n; i++) {
      const x = x0 + i * gap;
      const filled = i < W.stars;
      const filling = i === W.stars;
      const justLit = filled && i === W.stars - 1 && W.flash > 0;
      const losing = filled && i === W.stars - 1 && W.cooling;
      let r = 13;
      if (justLit) r *= 1 + 0.45 * Math.sin((1.2 - W.flash) * 9) * (W.flash / 1.2);
      if (filling && warn) r *= 1 + 0.12 * Math.abs(Math.sin(t * 9));

      // halo de las estrellas encendidas
      if (filled) drawGlow(ctx, x, y, 26 + (justLit ? 20 * W.flash : 0), 'rgba(255, 210, 63, 0.8)', justLit ? 1 : 0.45);
      if (filling && warn) {
        const red = Math.floor(t * 6) % 2 === 0;
        drawGlow(ctx, x, y, 30, red ? 'rgba(255, 61, 79, 0.9)' : 'rgba(60, 110, 255, 0.9)', 0.8);
      }

      starPath(ctx, x, y, r + 3);
      ctx.fillStyle = INK;
      ctx.fill();
      starPath(ctx, x, y, r);
      if (filled) {
        // al despistar a la policía, la última estrella parpadea
        ctx.fillStyle = losing && Math.floor(t * 4) % 2 === 0 ? '#c9b26a' : '#ffd23f';
      } else {
        ctx.fillStyle = 'rgba(255, 244, 220, 0.18)';
      }
      ctx.fill();
      if (filled) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        starPath(ctx, x - 2, y - 3, r * 0.35);
        ctx.fill();
      }
      // la estrella en curso se llena desde abajo
      if (filling && W.progress > 0) {
        ctx.save();
        starPath(ctx, x, y, r);
        ctx.clip();
        const h = 2 * r * W.progress;
        ctx.fillStyle = warn ? (Math.floor(t * 6) % 2 === 0 ? '#ff6b7d' : '#6f8bff') : 'rgba(255, 210, 63, 0.7)';
        ctx.fillRect(x - r, y + r - h, 2 * r, h);
        ctx.restore();
      }
      // la que se está perdiendo se vacía (solo cuando ya bajó del todo la siguiente)
      if (losing && W.hold < 1) {
        ctx.save();
        starPath(ctx, x, y, r);
        ctx.clip();
        ctx.fillStyle = 'rgba(20, 10, 40, 0.6)';
        ctx.fillRect(x - r, y - r, 2 * r, 2 * r * (1 - W.hold));
        ctx.restore();
      }
    }
  }

  /** Respiro: viñeta azul suave y barra de tiempo bajo las estrellas. */
  drawRespite(ctx, game, v) {
    const R = game.respite;
    const fade = Math.min(1, R.progress * 8, (1 - R.progress) * 8);
    const g = ctx.createRadialGradient(v.w / 2, v.h / 2, v.h * 0.4, v.w / 2, v.h / 2, v.w * 0.75);
    g.addColorStop(0, 'rgba(60, 200, 220, 0)');
    g.addColorStop(1, `rgba(60, 200, 220, ${0.28 * fade})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, v.w, v.h);
    const w = 150;
    const x = v.w / 2 - w / 2;
    const y = 54;
    ctx.fillStyle = INK;
    ctx.fillRect(x - 2, y - 2, w + 4, 10);
    ctx.fillStyle = '#7ff7e8';
    ctx.fillRect(x, y, w * (1 - R.progress), 6);
    outlinedText(ctx, t('respite.label'), v.w / 2, y + 10, 13, '#7ff7e8', 'center');
  }

  drawSirenEdges(ctx, v, t, strength) {
    const phase = Math.floor(t * 4) % 2 === 0;
    const a = strength * (0.6 + 0.4 * Math.abs(Math.sin(t * 8)));
    const left = phase ? '255, 40, 70' : '40, 90, 255';
    const right = phase ? '40, 90, 255' : '255, 40, 70';
    let g = ctx.createLinearGradient(0, 0, 90, 0);
    g.addColorStop(0, `rgba(${left}, ${a})`);
    g.addColorStop(1, `rgba(${left}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 90, v.h);
    g = ctx.createLinearGradient(v.w, 0, v.w - 90, 0);
    g.addColorStop(0, `rgba(${right}, ${a})`);
    g.addColorStop(1, `rgba(${right}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(v.w - 90, 0, 90, v.h);
  }

  drawBanner(ctx, v) {
    const b = this.bannerData;
    if (!b) return;
    const inT = Math.min(1, b.time / 0.3);
    const outT = Math.min(1, Math.max(0, (b.life - b.time) / 0.3));
    const k = Math.min(inT, outT);
    const ease = 1 - (1 - k) ** 3;
    const y = 92 + (1 - ease) * -40;
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
