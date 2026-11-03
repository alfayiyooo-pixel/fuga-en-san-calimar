import { t, fmt } from '../core/i18n.js';
import { CONFIG } from '../config.js';
import { billSprite, goldSprite, caseSprite, magnetSprite, orbSprite, gemSprite } from '../entities/tokens.js';
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
    this.flyers = [];
    this.party = 0;
  }

  reset() {
    this.bannerData = null;
    this.starFlash = 0;
    this.bump = 0;
    this.flyers = [];
    this.party = 0;
  }

  /** Un billete vuela desde (x, y) de pantalla hasta el contador. */
  flyToCounter(x, y, kind) {
    if (this.flyers.length > 24) {
      this.bumpBucks(kind !== 'bill');
      return;
    }
    this.flyers.push({ x0: x, y0: y, t: 0, kind, dur: kind === 'bill' ? 0.42 : 0.6 });
  }

  /**
   * Un orbe vuela hacia la barra de especial (si llevas personaje) o hacia
   * el contador de experiencia. onArrive se llama al llegar.
   */
  flyOrb(x, y, game, onArrive) {
    const v = game.view;
    const toBar = !!game.powers.def;
    this.flyers.push({
      x0: x,
      y0: y,
      t: 0,
      kind: 'orb',
      dur: 0.5,
      tx: toBar ? 14 + 96 + 60 : 34,
      ty: toBar ? v.h - 38 : 104,
      onArrive,
    });
  }

  /** El diamante vuela hasta su contador (arriba a la derecha). */
  flyGem(x, y, game) {
    this.flyers.push({ x0: x, y0: y, t: 0, kind: 'gem', dur: 0.9, tx: game.view.w - 160, ty: 32 });
  }

  /** Celebración de récord: marco dorado parpadeante unos segundos. */
  celebrate() {
    this.party = 3;
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
    this.party = Math.max(0, this.party - dt);
    this.orbPop = Math.max(0, (this.orbPop ?? 0) - dt * 4);
    this.gemPop = Math.max(0, (this.gemPop ?? 0) - dt * 2);
    this.portraitPop = Math.max(0, (this.portraitPop ?? 0) - dt * 1.2);
    this.specialPop = Math.max(0, (this.specialPop ?? 0) - dt * 1.5);
    for (const f of this.flyers) {
      f.t += dt;
      if (f.t >= f.dur && !f.done) {
        f.done = true;
        if (f.kind === 'orb') {
          this.orbPop = 1;
          f.onArrive?.();
        } else if (f.kind === 'gem') this.gemPop = 1;
        else this.bumpBucks(f.kind !== 'bill');
      }
    }
    this.flyers = this.flyers.filter((f) => !f.done);
  }

  draw(ctx, game, loop) {
    const v = game.view;
    if (this.party > 0) this.drawParty(ctx, v, game.t);
    outlinedText(ctx, t('hud.distance', { n: fmt(game.distance) }), 18, 14, 32);
    this.drawBucks(ctx, game);
    this.drawRecordHint(ctx, game, v);
    this.drawGems(ctx, game, v);
    this.drawFlyers(ctx);
    game.powers.drawHud(ctx, game);
    this.drawBanner(ctx, v);
    if (game.respite.active) this.drawRespite(ctx, game, v);
    else if (game.events.active) this.drawEvent(ctx, game, v);
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
    ctx.font = `26px ${FONT}`;
    const tw = ctx.measureText(fmt(game.bucks)).width;
    ctx.restore();
    this.drawMultiplier(ctx, game, 58 + tw + 30, y);
    if (game.player.onFoot && game.foot.bonusActive) this.drawFootBadge(ctx, game, 58 + tw + 56, y);

    // experiencia ganada en la partida
    const op = 1 + (this.orbPop ?? 0) * 0.3;
    if (this.orbPop > 0) drawGlow(ctx, 34, y + 32, 24, 'rgba(70, 150, 255, 0.9)', this.orbPop);
    drawSprite(ctx, orbSprite(), 34, y + 32, 0.75 * op, 0.75 * op);
    outlinedText(ctx, `${fmt(game.xpRun)} XP`, 52, y + 23, 16, '#9fd8ff');

    // imán activo: icono con anillo de tiempo restante
    const mt = game.tokens.magnetTime;
    if (mt > 0) {
      const x = 34;
      const my = y + 78;
      const frac = mt / (game.tokens.magnetTotal || CONFIG.tokens.magnet.duration);
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

  /** Diamantes de la partida (solo si has cogido alguno). */
  drawGems(ctx, game, v) {
    if (!game.gemsRun && !this.gemPop) return;
    const x = v.w - 160;
    const y = 32;
    const p = 1 + (this.gemPop ?? 0) * 0.4;
    if (this.gemPop > 0) drawGlow(ctx, x, y, 34 * p, 'rgba(160, 240, 255, 0.9)', this.gemPop);
    drawSprite(ctx, gemSprite(), x, y, 0.75 * p, 0.75 * p);
    outlinedText(ctx, fmt(game.gemsRun), x + 18, y - 12, 22, '#9ff8ff');
  }

  /** "A PIE ×2": bonificación de pavos mientras no has cogido el jetpack. */
  drawFootBadge(ctx, game, x, y) {
    const label = t('hud.footBonus', { n: CONFIG.foot.bucksMult });
    const pulse = 1 + 0.06 * Math.sin(game.t * 7);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    ctx.font = `15px ${FONT}`;
    const w = ctx.measureText(label).width + 22;
    drawGlow(ctx, w / 2, 0, w * 0.7, 'rgba(127, 255, 160, 0.8)', 0.35 + 0.15 * Math.sin(game.t * 7), 26);
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.roundRect(-3, -17, w + 6, 34, 17);
    ctx.fill();
    ctx.fillStyle = '#7dffa0';
    ctx.beginPath();
    ctx.roundRect(0, -14, w, 28, 14);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 11, 1);
    ctx.restore();
  }

  /** Insignia del multiplicador: "x3", anillo de tiempo y puntos de carga. */
  drawMultiplier(ctx, game, x, y) {
    const C = game.combo;
    const S = CONFIG.score;
    const active = C.level > 1;
    const pop = 1 + C.flash * 0.5 * Math.abs(Math.sin(C.flash * 10));
    const r = 17 * pop;
    if (active) drawGlow(ctx, x, y, 34 * pop, 'rgba(255, 210, 63, 0.85)', 0.45 + C.flash * 0.5);
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(x, y, r + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = active ? '#ffd23f' : 'rgba(255, 244, 220, 0.25)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (active) {
      ctx.strokeStyle = '#ff3d7f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, r + 1, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * C.timeLeft);
      ctx.stroke();
    }
    ctx.font = `${Math.round(15 * pop)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = active ? INK : 'rgba(255, 244, 220, 0.8)';
    ctx.fillText(`x${C.level}`, x, y + 1);
    // carga hacia el siguiente nivel
    if (C.level < S.maxMult) {
      for (let i = 0; i < S.perLevel; i++) {
        ctx.fillStyle = i < C.charge ? '#7ff7e8' : 'rgba(255, 244, 220, 0.25)';
        ctx.beginPath();
        ctx.arc(x - (S.perLevel - 1) * 4.5 + i * 9, y + r + 9, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /** "Récord a 84 m" cuando te acercas a tu récord. */
  drawRecordHint(ctx, game, v) {
    const left = game.record - game.distance;
    if (game.recordBeaten || game.record < 30 || left <= 0 || left > CONFIG.score.recordWarn) return;
    const pulse = 1 + 0.06 * Math.sin(game.t * 8);
    ctx.save();
    ctx.translate(v.w / 2, 76);
    ctx.scale(pulse, pulse);
    outlinedText(ctx, t('hud.recordIn', { n: fmt(Math.ceil(left)) }), 0, 0, 18, '#ffd23f', 'center');
    ctx.restore();
  }

  drawFlyers(ctx) {
    for (const f of this.flyers) {
      const k = Math.min(1, f.t / f.dur);
      const e = k * k * (3 - 2 * k);
      const tx = f.tx ?? 34;
      const ty = f.ty ?? 72;
      const x = f.x0 + (tx - f.x0) * e;
      const y = f.y0 + (ty - f.y0) * e - Math.sin(k * Math.PI) * 60;
      if (f.kind === 'orb') {
        drawGlow(ctx, x, y, 22, 'rgba(70, 150, 255, 0.95)', 0.8);
        drawSprite(ctx, orbSprite(), x, y, 0.8, 0.8);
        continue;
      }
      if (f.kind === 'gem') {
        drawGlow(ctx, x, y, 40, 'rgba(160, 240, 255, 0.95)', 0.9);
        drawSprite(ctx, gemSprite(), x, y, 1.2 - k * 0.4, 1.2 - k * 0.4);
        continue;
      }
      const spr = f.kind === 'gold' ? goldSprite() : f.kind === 'case' ? caseSprite() : billSprite();
      const s = 1 - k * 0.35;
      drawSprite(ctx, spr, x, y, s, s);
    }
  }

  /** Marco dorado y destellos al batir el récord. */
  drawParty(ctx, v, time) {
    const a = Math.min(1, this.party) * (0.5 + 0.5 * Math.sin(time * 14));
    ctx.strokeStyle = `rgba(255, 210, 63, ${a})`;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, v.w - 10, v.h - 10);
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

  /** Evento en curso: etiqueta y barra de tiempo bajo las estrellas. */
  drawEvent(ctx, game, v) {
    const E = game.events;
    const id = E.current;
    if (id === 'chaos') {
      // marco rosa/morado que late y "x2" grande
      const a = 0.35 + 0.2 * Math.sin(game.t * 8);
      ctx.strokeStyle = `rgba(255, 61, 160, ${a})`;
      ctx.lineWidth = 12;
      ctx.strokeRect(6, 6, v.w - 12, v.h - 12);
      outlinedText(ctx, `x${CONFIG.events.chaos.bucksMult}`, v.w - 84, 66, 30 + Math.sin(game.t * 10) * 2, '#ff6bd0', 'center');
    }
    if (id === 'chase') this.drawSirenEdges(ctx, v, game.t, 0.25);
    const colors = { chase: '#ff6b7d', billRain: '#9dffb5', truck: '#ffd23f', chaos: '#ff6bd0' };
    const w = 150;
    const x = v.w / 2 - w / 2;
    const y = 54;
    if (id !== 'truck') {
      ctx.fillStyle = INK;
      ctx.fillRect(x - 2, y - 2, w + 4, 10);
      ctx.fillStyle = colors[id];
      ctx.fillRect(x, y, w * (1 - E.progress), 6);
    }
    outlinedText(ctx, t(`event.${id}.title`).toUpperCase(), v.w / 2, y + 10, 13, colors[id], 'center');
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
