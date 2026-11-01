// Iconos coleccionables: cápsulas de personaje y medallas de habilidad/gadget.

import { sprite } from '../fx/sprites.js';
import { INK, rr, inked, vgrad } from './kit.js';
import { drawHead, STYLES } from './fugitive.js';
import { CHARACTERS, ITEM_OWNER } from './defs.js';

/** Cápsula con el retrato del personaje dentro. */
export function capsuleSprite(id) {
  const c = CHARACTERS[id];
  return sprite(`cap:${id}`, 56, 56, (ctx) => {
    ctx.translate(28, 28);
    // cápsula
    rr(ctx, -19, -25, 38, 50, 19);
    inked(ctx, vgrad(ctx, -25, 25, '#ffffff', c.color));
    rr(ctx, -15, -21, 30, 42, 15);
    ctx.fillStyle = 'rgba(20, 10, 40, 0.75)';
    ctx.fill();
    // retrato
    ctx.save();
    ctx.translate(-4, 2);
    ctx.scale(1.2, 1.2);
    drawHead(ctx, STYLES[c.style].head, 0, 0.6);
    ctx.restore();
    // brillo
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    rr(ctx, -12, -20, 6, 18, 3);
    ctx.fill();
  });
}

/** Medalla redonda con el símbolo de la habilidad/gadget. */
export function itemSprite(item) {
  const c = CHARACTERS[ITEM_OWNER[item]];
  return sprite(`item:${item}`, 48, 48, (ctx) => {
    ctx.translate(24, 24);
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    inked(ctx, vgrad(ctx, -20, 20, c.color, '#2a1f4a'));
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#fff4dc';
    ctx.fill();
    SYMBOLS[item]?.(ctx);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.ellipse(-7, -12, 6, 3, -0.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

const SYMBOLS = {
  bullettime(ctx) {
    ctx.beginPath();
    ctx.arc(0, 1, 10, 0, Math.PI * 2);
    inked(ctx, '#ffd23f');
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.lineTo(0, -6);
    ctx.moveTo(0, 1);
    ctx.lineTo(5, 3);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.fillRect(-2, -12, 4, 3);
  },
  pistol(ctx) {
    ctx.fillStyle = INK;
    ctx.fillRect(-11, -5, 20, 6);
    ctx.fillRect(-9, 0, 6, 9);
    ctx.fillStyle = '#6d7487';
    ctx.fillRect(9, -4, 4, 4);
  },
  vest(ctx) {
    ctx.beginPath();
    ctx.moveTo(-9, -9);
    ctx.lineTo(-4, -9);
    ctx.lineTo(0, -4);
    ctx.lineTo(4, -9);
    ctx.lineTo(9, -9);
    ctx.lineTo(9, 10);
    ctx.lineTo(-9, 10);
    ctx.closePath();
    inked(ctx, '#3d4a6b');
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(-7, 2, 14, 3);
  },
  drive(ctx) {
    ctx.beginPath();
    ctx.moveTo(-12, 5);
    ctx.lineTo(-12, 0);
    ctx.lineTo(-5, -1);
    ctx.lineTo(-1, -7);
    ctx.lineTo(6, -6);
    ctx.lineTo(12, 0);
    ctx.lineTo(12, 5);
    ctx.closePath();
    inked(ctx, '#7b5cff');
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(-6, 6, 3, 0, Math.PI * 2);
    ctx.arc(6, 6, 3, 0, Math.PI * 2);
    ctx.fill();
  },
  nitro(ctx) {
    ctx.beginPath();
    ctx.moveTo(-3, 11);
    ctx.quadraticCurveTo(-12, 2, -4, -11);
    ctx.quadraticCurveTo(-2, -2, 3, -4);
    ctx.quadraticCurveTo(12, 3, 3, 11);
    ctx.closePath();
    inked(ctx, '#19e3d0');
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, 5, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  ramp(ctx) {
    ctx.beginPath();
    ctx.moveTo(-12, 9);
    ctx.lineTo(10, -4);
    ctx.lineTo(10, 9);
    ctx.closePath();
    inked(ctx, '#ffd23f');
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-6, -2);
    ctx.lineTo(2, -10);
    ctx.lineTo(2, -5);
    ctx.moveTo(2, -10);
    ctx.lineTo(-3, -10);
    ctx.stroke();
  },
  rage(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(4, -3);
    ctx.lineTo(11, -5);
    ctx.lineTo(6, 3);
    ctx.lineTo(9, 11);
    ctx.lineTo(0, 6);
    ctx.lineTo(-9, 11);
    ctx.lineTo(-6, 3);
    ctx.lineTo(-11, -5);
    ctx.lineTo(-4, -3);
    ctx.closePath();
    inked(ctx, '#ff3d4f');
  },
  rocket(ctx) {
    ctx.save();
    ctx.rotate(-0.6);
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.quadraticCurveTo(6, -6, 5, 6);
    ctx.lineTo(-5, 6);
    ctx.quadraticCurveTo(-6, -6, 0, -13);
    ctx.closePath();
    inked(ctx, '#ff5a3d');
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(-5, 6, 10, 4);
    ctx.restore();
  },
  bike(ctx) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    for (const x of [-7, 7]) {
      ctx.beginPath();
      ctx.arc(x, 4, 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-7, 4);
    ctx.lineTo(-1, -4);
    ctx.lineTo(5, -4);
    ctx.lineTo(7, 4);
    ctx.moveTo(5, -4);
    ctx.lineTo(4, -9);
    ctx.stroke();
  },
};
