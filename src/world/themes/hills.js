// Zona 4 — COLINAS BRISA (mañana despejada)
// Montañas azuladas, colinas verdes, mansiones con piscina y jardines.

import { cypress, tree, INK } from './shapes.js';

function hillLine(ctx, v, offset, base, amp, top, bottom) {
  const g = ctx.createLinearGradient(0, base - amp, 0, v.groundY);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, v.groundY);
  for (let x = 0; x <= v.w + 20; x += 20) {
    const wx = x + offset;
    const y = base - amp * (0.5 + 0.3 * Math.sin(wx * 0.004) + 0.2 * Math.sin(wx * 0.011 + 1.3));
    ctx.lineTo(x, y);
  }
  ctx.lineTo(v.w, v.groundY);
  ctx.closePath();
  ctx.fill();
}

const MANSION = ['#fff8ec', '#ffe8d1', '#f4f1ff', '#e9fff8'];

export const hills = {
  id: 'hills',
  nameKey: 'zone.hills',
  sky: ['#2a7fe0', '#5fb0f5', '#9fd8ff', '#d8f0ff', '#fff1cc'],
  celestial: { type: 'sun', x: 0.86, y: 84, r: 40, color: '#fff3c0', glow: 'rgba(255, 245, 200, 0.75)' },
  clouds: { color: 'rgba(255, 255, 255, 0.95)', shade: 'rgba(160, 190, 230, 0.6)', rim: null },
  haze: 'rgba(225, 242, 255, 0.45)',
  skyline: { factor: 0.04, base: 0.6, min: 130, max: 230, color: '#9cc0e0', style: 'mountains' },
  ground: { top: '#d8d2c0', body: '#3d3a4a', line: '#2b2936', edge: '#1e1c28', joint: 0, dashes: true },

  backdrop(ctx, v, camX) {
    hillLine(ctx, v, camX * 0.07, v.h * 0.56, 120, '#a8dd9c', '#8acb85');
    hillLine(ctx, v, camX * 0.15 + 500, v.h * 0.69, 110, '#7cc47d', '#5aa865');
  },

  layers: [
    {
      factor: 0.18,
      spacing: 170,
      draw(ctx, sx, r, v) {
        if (r(0) > 0.6) return;
        const y = v.h * 0.69 - 40 - r(1) * 40;
        ctx.fillStyle = '#fff8ec';
        ctx.fillRect(sx, y, 34, 18);
        ctx.fillStyle = 'rgba(80, 120, 160, 0.25)';
        ctx.fillRect(sx, y, 8, 18);
        ctx.fillStyle = '#e07a4f';
        ctx.beginPath();
        ctx.moveTo(sx - 4, y);
        ctx.lineTo(sx + 17, y - 10);
        ctx.lineTo(sx + 38, y);
        ctx.fill();
        cypress(ctx, sx + 46, y + 18, 34, '#4f9e62');
      },
    },
    {
      factor: 0.38,
      spacing: 300,
      draw(ctx, sx, r, v, t) {
        const base = v.groundY - 18;
        const w = 170 + r(0) * 50;
        const h = 70 + r(1) * 30;
        const color = MANSION[Math.floor(r(2) * MANSION.length)];
        ctx.fillStyle = '#e6dcc6';
        ctx.fillRect(sx - 20, base, w + 90, 18);
        // piscina con ondas
        ctx.fillStyle = '#1fb4dc';
        ctx.fillRect(sx + w + 4, base + 3, 60, 10);
        ctx.fillStyle = '#7fe6ff';
        ctx.fillRect(sx + w + 4, base + 3, 60, 3);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect(sx + w + 10 + ((t * 20) % 40), base + 7, 10, 2);
        // sombra proyectada
        ctx.fillStyle = 'rgba(40, 60, 90, 0.18)';
        ctx.beginPath();
        ctx.moveTo(sx, base);
        ctx.lineTo(sx - 30, base + 16);
        ctx.lineTo(sx + w - 30, base + 16);
        ctx.lineTo(sx + w, base);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.fillRect(sx, base - h, w, h);
        ctx.fillRect(sx + w * 0.3, base - h - 46, w * 0.8, 46);
        // sombreado lateral
        ctx.fillStyle = 'rgba(60, 80, 120, 0.16)';
        ctx.fillRect(sx, base - h, 14, h);
        ctx.fillRect(sx + w * 0.3, base - h - 46, 10, 46);
        ctx.fillStyle = INK;
        ctx.fillRect(sx + w * 0.3, base - h - 50, w * 0.8, 5);
        ctx.fillRect(sx - 4, base - h - 4, w + 8, 5);
        // ventanales con reflejo del cielo
        const gl = ctx.createLinearGradient(0, base - h, 0, base);
        gl.addColorStop(0, '#9fdcff');
        gl.addColorStop(1, '#3f8ec4');
        ctx.fillStyle = gl;
        ctx.fillRect(sx + 18, base - h + 14, w * 0.45, h - 14);
        ctx.fillRect(sx + w * 0.38, base - h - 38, w * 0.6, 28);
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillRect(sx + 24, base - h + 18, 10, h - 22);
        ctx.fillRect(sx + w * 0.42, base - h - 34, 8, 20);
        if (r(3) < 0.6) cypress(ctx, sx - 12, base, 90, '#1f6b45', '#2f8e5a');
      },
    },
    {
      factor: 0.68,
      spacing: 200,
      draw(ctx, sx, r, v) {
        const base = v.groundY + 2;
        const k = r(0);
        if (k < 0.35) {
          ctx.fillStyle = INK;
          ctx.fillRect(sx - 2, base - 36, 154, 36);
          ctx.fillStyle = '#2e8b4e';
          ctx.fillRect(sx, base - 34, 150, 34);
          ctx.fillStyle = '#45b56c';
          ctx.fillRect(sx, base - 34, 150, 8);
          ctx.fillStyle = 'rgba(0, 40, 20, 0.25)';
          for (let x = sx + 8; x < sx + 150; x += 16) ctx.fillRect(x, base - 24, 6, 20);
        } else if (k < 0.6) {
          ctx.fillStyle = '#9a8670';
          ctx.fillRect(sx + 20, base - 20, 30, 20);
          for (const [cy, rad] of [[42, 22], [78, 15], [101, 9]]) {
            ctx.fillStyle = INK;
            ctx.beginPath();
            ctx.arc(sx + 35, base - cy, rad + 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#2e8b4e';
            ctx.beginPath();
            ctx.arc(sx + 35, base - cy, rad, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#4fbf73';
            ctx.beginPath();
            ctx.arc(sx + 35 + rad * 0.3, base - cy - rad * 0.3, rad * 0.45, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (k < 0.8) {
          ctx.fillStyle = '#d9b44a';
          for (let x = sx; x < sx + 120; x += 12) {
            ctx.fillRect(x, base - 70, 4, 70);
            ctx.beginPath();
            ctx.moveTo(x - 2, base - 70);
            ctx.lineTo(x + 2, base - 80);
            ctx.lineTo(x + 6, base - 70);
            ctx.fill();
          }
          ctx.fillRect(sx, base - 50, 120, 4);
          ctx.fillStyle = '#fff1a8';
          for (let x = sx; x < sx + 120; x += 12) ctx.fillRect(x + 1, base - 70, 1.5, 70);
          ctx.fillStyle = '#e9e1cf';
          ctx.fillRect(sx - 14, base - 90, 16, 90);
          ctx.fillRect(sx + 120, base - 90, 16, 90);
          ctx.fillStyle = 'rgba(80, 90, 120, 0.25)';
          ctx.fillRect(sx - 14, base - 90, 5, 90);
          ctx.fillRect(sx + 120, base - 90, 5, 90);
        } else {
          tree(ctx, sx + 40, base, 130, '#6b4224', '#3a9e5a', '#55c07a');
        }
      },
    },
  ],
};
