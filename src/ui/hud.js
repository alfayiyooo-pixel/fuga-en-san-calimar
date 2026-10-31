import { t, fmt } from '../core/i18n.js';

const FONT = "'Bungee', Impact, sans-serif";

/** Texto con contorno grueso, estilo cómic. */
export function outlinedText(ctx, text, x, y, size, fill = '#fff4dc', align = 'left') {
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.2);
  ctx.strokeStyle = '#1b1030';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/** Marcador dibujado en el canvas durante la partida. */
export class Hud {
  constructor() {
    this.debug = new URLSearchParams(location.search).has('debug');
  }

  draw(ctx, game, loop) {
    outlinedText(ctx, t('hud.distance', { n: fmt(game.distance) }), 18, 14, 32);

    if (this.debug) {
      const p = game.player;
      const lines = [
        `fps ${loop.fps.toFixed(0)}`,
        `speed ${game.speed.toFixed(0)} px/s`,
        `vy ${p.vy.toFixed(0)}  thrust ${p.thrust.toFixed(2)}`,
        `t ${game.runTime.toFixed(1)} s`,
      ];
      ctx.font = '13px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(14, 58, 210, lines.length * 16 + 8);
      ctx.fillStyle = '#7CFFB2';
      lines.forEach((l, i) => ctx.fillText(l, 20, 62 + i * 16));
    }
  }
}
