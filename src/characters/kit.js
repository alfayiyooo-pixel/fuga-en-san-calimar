// Kit de dibujo de personajes: miembros articulados con contorno,
// formas con sombreado y la llama animada del jetpack.

import { drawGlow } from '../fx/sprites.js';

export const INK = '#1b1030';
export const OUTLINE = 2.6;

/** Vector desde un ángulo: 0 = hacia abajo, +π/2 = hacia delante (derecha), π = arriba. */
function dir(a, len) {
  return [Math.sin(a) * len, Math.cos(a) * len];
}

/**
 * Miembro de dos segmentos (muslo+espinilla o brazo+antebrazo) con contorno.
 * Devuelve la posición del extremo (pie o mano).
 */
export function limb(ctx, x, y, a1, a2, l1, l2, width, color, shade) {
  const [dx1, dy1] = dir(a1, l1);
  const kx = x + dx1;
  const ky = y + dy1;
  const [dx2, dy2] = dir(a2, l2);
  const ex = kx + dx2;
  const ey = ky + dy2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = width + OUTLINE * 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(kx, ky);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  if (shade) {
    // franja de sombra a lo largo del miembro
    ctx.strokeStyle = shade;
    ctx.lineWidth = width * 0.35;
    ctx.beginPath();
    ctx.moveTo(x - 1.5, y + 1);
    ctx.lineTo(kx - 1.5, ky + 1);
    ctx.lineTo(ex - 1.5, ey + 1);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  return [ex, ey, kx, ky];
}

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Rellena el trazado actual con contorno de tinta. */
export function inked(ctx, fill) {
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = OUTLINE * 2;
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Degradado vertical rápido de claro a oscuro. */
export function vgrad(ctx, y0, y1, c0, c1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, c0);
  g.addColorStop(1, c1);
  return g;
}

export function hgrad(ctx, x0, x1, stops) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

/** Zapatilla en el extremo de una pierna. */
export function shoe(ctx, x, y, angle, color = '#fff4dc', sole = '#ff3d4f') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle * 0.4);
  rr(ctx, -4, -4, 12, 7, 3.5);
  inked(ctx, color);
  ctx.fillStyle = sole;
  ctx.fillRect(-3.5, 1.4, 11, 1.8);
  ctx.restore();
}

export function hand(ctx, x, y, color) {
  ctx.beginPath();
  ctx.arc(x, y, 3.6, 0, Math.PI * 2);
  inked(ctx, color);
}

/**
 * Llama del jetpack: capas exterior/media/núcleo con parpadeo y halo.
 * (x, y) = boquilla; la llama apunta hacia abajo.
 */
const FLAMES = {
  fire: ['rgba(255, 90, 40, 0.9)', 'rgba(255, 190, 60, 0.95)', 'rgba(255, 252, 225, 1)', 'rgba(255, 150, 60, 0.85)'],
  cyan: ['rgba(60, 120, 255, 0.9)', 'rgba(80, 230, 255, 0.95)', 'rgba(235, 255, 255, 1)', 'rgba(70, 200, 255, 0.85)'],
  rocket: ['rgba(255, 50, 30, 0.95)', 'rgba(255, 140, 30, 0.95)', 'rgba(255, 240, 160, 1)', 'rgba(255, 90, 40, 0.9)'],
};

export function flame(ctx, x, y, power, t, scale = 1, kind = 'fire') {
  const F = FLAMES[kind] || FLAMES.fire;
  if (power < 0.04) return;
  const n = Math.sin(t * 61) * 0.5 + Math.sin(t * 37 + 1) * 0.5;
  const L = (12 + 30 * power) * (0.9 + 0.15 * n) * scale;
  const W = (6 + 3 * power) * scale;
  drawGlow(ctx, x, y + L * 0.45, 26 * scale * (0.7 + power * 0.5), F[3], 0.7 * power + 0.2);
  const layers = [
    [1, 1, F[0]],
    [0.72, 0.68, F[1]],
    [0.42, 0.38, F[2]],
  ];
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  for (const [kl, kw, c] of layers) {
    const l = L * kl;
    const w = W * kw;
    const wob = Math.sin(t * 45 + kl * 5) * w * 0.25;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.quadraticCurveTo(x - w * 0.9 + wob, y + l * 0.55, x + wob * 0.6, y + l);
    ctx.quadraticCurveTo(x + w * 0.9 + wob, y + l * 0.55, x + w, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalCompositeOperation = prev;
}
