// Formas reutilizables para los decorados de las zonas.

import { drawGlow } from '../../fx/sprites.js';

export const INK = '#1b1030';

/** Farola; con lit=true enciende la bombilla y proyecta un cono de luz. */
export function streetLamp(ctx, x, base, color = '#2a2140', light = '#ffe9a8', lit = false) {
  ctx.fillStyle = color;
  ctx.fillRect(x - 3, base - 150, 6, 150);
  ctx.fillRect(x - 3, base - 150, 28, 5);
  ctx.fillRect(x - 6, base - 8, 12, 8);
  if (lit) {
    const g = ctx.createLinearGradient(0, base - 140, 0, base);
    g.addColorStop(0, 'rgba(255, 230, 160, 0.32)');
    g.addColorStop(1, 'rgba(255, 230, 160, 0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x + 18, base - 138);
    ctx.lineTo(x + 30, base - 138);
    ctx.lineTo(x + 70, base);
    ctx.lineTo(x - 22, base);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    drawGlow(ctx, x + 24, base - 140, 34, 'rgba(255, 220, 150, 0.9)', 0.9);
    drawGlow(ctx, x + 24, base + 2, 60, 'rgba(255, 210, 140, 0.5)', 0.6, 10);
  }
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.arc(x + 24, base - 140, 7, 0, Math.PI * 2);
  ctx.fill();
}

export function tree(ctx, x, base, h, trunk = '#6b4224', leaf = '#2f9e57', leaf2 = '#3cbf6a') {
  ctx.fillStyle = trunk;
  ctx.fillRect(x - 4, base - h * 0.45, 8, h * 0.45);
  ctx.fillStyle = leaf;
  ctx.beginPath();
  ctx.arc(x, base - h * 0.6, h * 0.28, 0, Math.PI * 2);
  ctx.arc(x - h * 0.18, base - h * 0.5, h * 0.2, 0, Math.PI * 2);
  ctx.arc(x + h * 0.18, base - h * 0.5, h * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = leaf2;
  ctx.beginPath();
  ctx.arc(x - h * 0.06, base - h * 0.68, h * 0.14, 0, Math.PI * 2);
  ctx.arc(x + h * 0.12, base - h * 0.55, h * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

export function cypress(ctx, x, base, h, color = '#1f6b45', light = null) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, base - h / 2, h * 0.14, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  if (light) {
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.ellipse(x + h * 0.04, base - h * 0.55, h * 0.06, h * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Mar con destellos, usado por la playa y el puerto. */
export function sea(ctx, v, camX, t, top, bottom, c1, c2, sparkle = 'rgba(255,255,255,0.55)') {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, top, v.w, bottom - top);
  ctx.fillStyle = sparkle;
  const off = (camX * 0.1) % 90;
  const base = ctx.globalAlpha;
  for (let row = 0; row < 5; row++) {
    const y = top + 8 + row * ((bottom - top - 16) / 5);
    for (let x = -off - ((row * 37) % 90); x < v.w; x += 90) {
      const w = 14 + ((row * 7 + Math.floor(x)) % 5) * 4;
      const a = 0.5 + 0.5 * Math.sin(t * 2 + x * 0.05 + row);
      ctx.globalAlpha = base * (0.25 + a * 0.5);
      ctx.fillRect(x, y, w, 2);
    }
  }
  ctx.globalAlpha = base;
}

/** Reflejo del sol/luna en el agua: franjas brillantes que tiemblan. */
export function sunReflection(ctx, x, top, rows, t, color) {
  const base = ctx.globalAlpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = color;
  for (let k = 0; k < rows; k++) {
    const w = (80 - k * 8) * (0.8 + 0.2 * Math.sin(t * 2.3 + k * 1.7));
    ctx.globalAlpha = base * (0.9 - k / rows * 0.6);
    ctx.fillRect(x - w / 2 + Math.sin(t * 1.4 + k) * 6, top + 6 + k * 10, w, 3);
  }
  ctx.globalAlpha = base;
  ctx.globalCompositeOperation = 'source-over';
}

/** Letrero de neón con halo (el texto es inventado y vale en ES/EN). */
export function neonSign(ctx, x, y, text, color, rgba, t, size = 22, flickerSeed = 0) {
  const flick = Math.sin(t * 23 + flickerSeed * 7) > 0.96 ? 0.35 : 1;
  ctx.font = `${size}px 'Bungee', Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 22;
  // caja oscura
  ctx.fillStyle = 'rgba(15, 8, 35, 0.85)';
  ctx.fillRect(x - w / 2, y - size * 0.8, w, size * 1.6);
  drawGlow(ctx, x, y, w * 0.75, rgba, 0.35 * flick, size * 1.5);
  const base = ctx.globalAlpha;
  ctx.globalAlpha = base * flick;
  ctx.lineWidth = 4;
  ctx.strokeStyle = color;
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeText(text, x, y);
  // decorado: letras del color del tubo (no blancas) para no competir con los neones peligrosos
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = base;
  // marco de tubo
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - w / 2 + 3, y - size * 0.8 + 3, w - 6, size * 1.6 - 6);
}

/** Luz de balizamiento en lo alto de torres y grúas (decorado: blanca azulada, nunca roja). */
export function beacon(ctx, x, y, t, phase = 0) {
  const on = Math.sin(t * 3 + phase) > 0.2;
  ctx.fillStyle = on ? '#d8dcff' : '#4a4866';
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
  if (on) drawGlow(ctx, x, y, 14, 'rgba(190, 200, 255, 0.8)', 0.7);
}

/** Destellos del sol/luna en el agua: estrellitas que parpadean. */
export function glints(ctx, cx, top, spread, height, t, color, n = 12) {
  ctx.save();
  const base = ctx.globalAlpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = color;
  for (let k = 0; k < n; k++) {
    const ph = t * (1.3 + (k % 4) * 0.4) + k * 2.1;
    const a = Math.max(0, Math.sin(ph));
    if (a < 0.3) continue;
    const yk = ((k * 37) % 100) / 100;
    const x = cx + (((k * 53) % 100) / 100 - 0.5) * spread * (0.4 + yk);
    const y = top + yk * height;
    const sz = 1 + a * 2.6;
    ctx.globalAlpha = base * a;
    ctx.fillRect(x - sz * 2, y - 0.6, sz * 4, 1.2);
    ctx.fillRect(x - 0.6, y - sz, 1.2, sz * 2);
  }
  ctx.restore();
}

/** Crestas de olas que avanzan hacia la orilla. */
export function shoreWaves(ctx, v, camX, t, top, bottom, color) {
  ctx.save();
  const base = ctx.globalAlpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  const rows = 3;
  for (let r = 0; r < rows; r++) {
    const k = ((t * 0.18 + r / rows) % 1);
    const y = top + (bottom - top) * k;
    ctx.globalAlpha = base * Math.sin(k * Math.PI) * 0.9;
    const off = (camX * (0.16 + k * 0.1) + r * 140) % 220;
    for (let x = -off; x < v.w; x += 220) {
      ctx.beginPath();
      ctx.moveTo(x, y + 2);
      ctx.quadraticCurveTo(x + 30, y - 3, x + 60 + k * 40, y + 1);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Rayos de sol suaves que giran despacio (modo 'lighter'). */
export function sunRays(ctx, x, y, t, color, len = 900, n = 9) {
  ctx.save();
  const base = ctx.globalAlpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = color;
  const rot = t * 0.03;
  for (let k = 0; k < n; k++) {
    const a = rot + (k / n) * Math.PI * 2;
    const w = 0.07 + 0.05 * Math.sin(k * 2.3 + t * 0.4);
    ctx.globalAlpha = base * (0.6 + 0.4 * Math.sin(t * 0.5 + k));
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a - w) * len, y + Math.sin(a - w) * len);
    ctx.lineTo(x + Math.cos(a + w) * len, y + Math.sin(a + w) * len);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
