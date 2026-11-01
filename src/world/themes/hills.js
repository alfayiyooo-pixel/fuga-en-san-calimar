// Zona 4 — COLINAS BRISA
// Colinas verdes, mansiones con piscina, cipreses y setos recortados.

import { cypress, tree } from './shapes.js';

function hillLine(ctx, v, offset, base, amp, color) {
  ctx.fillStyle = color;
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
  sky: ['#4fb0ff', '#a8e1ff', '#fff0c8'],
  sun: { x: 0.85, y: 90, r: 42, color: '#fff8d8', glow: 'rgba(255, 236, 170, 0.5)' },
  cloudColor: 'rgba(255, 255, 255, 0.9)',
  ground: { top: '#d8d2c0', body: '#3d3a4a', line: '#2b2936', edge: '#2b2936', joint: 0, dashes: true },

  backdrop(ctx, v, camX) {
    hillLine(ctx, v, camX * 0.06, v.h * 0.55, 120, '#a9dba0');
    hillLine(ctx, v, camX * 0.14 + 500, v.h * 0.68, 110, '#7cc47d');
  },

  layers: [
    // villas pequeñas en la colina lejana
    {
      factor: 0.18,
      spacing: 170,
      draw(ctx, sx, r, v) {
        if (r(0) > 0.6) return;
        const y = v.h * 0.68 - 40 - r(1) * 40;
        ctx.fillStyle = '#fff8ec';
        ctx.fillRect(sx, y, 34, 18);
        ctx.fillStyle = '#e07a4f';
        ctx.beginPath();
        ctx.moveTo(sx - 4, y);
        ctx.lineTo(sx + 17, y - 10);
        ctx.lineTo(sx + 38, y);
        ctx.fill();
        cypress(ctx, sx + 46, y + 18, 34, '#4f9e62');
      },
    },
    // mansiones con piscina
    {
      factor: 0.38,
      spacing: 300,
      draw(ctx, sx, r, v, t) {
        const base = v.groundY - 18;
        const w = 170 + r(0) * 50;
        const h = 70 + r(1) * 30;
        const color = MANSION[Math.floor(r(2) * MANSION.length)];
        // terraza
        ctx.fillStyle = '#e6dcc6';
        ctx.fillRect(sx - 20, base, w + 90, 18);
        // piscina
        ctx.fillStyle = '#2fc6e6';
        ctx.fillRect(sx + w + 4, base + 3, 60, 10);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillRect(sx + w + 10 + ((t * 20) % 40), base + 6, 10, 2);
        // planta baja
        ctx.fillStyle = color;
        ctx.fillRect(sx, base - h, w, h);
        // primera planta en voladizo
        ctx.fillRect(sx + w * 0.3, base - h - 46, w * 0.8, 46);
        ctx.fillStyle = '#1b1030';
        ctx.fillRect(sx + w * 0.3, base - h - 50, w * 0.8, 5);
        ctx.fillRect(sx - 4, base - h - 4, w + 8, 5);
        // ventanales
        ctx.fillStyle = '#5fb3d9';
        ctx.fillRect(sx + 12, base - h + 14, w * 0.45, h - 14);
        ctx.fillRect(sx + w * 0.38, base - h - 38, w * 0.6, 28);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(sx + 18, base - h + 18, 10, h - 22);
        // palmera enana o ciprés
        if (r(3) < 0.6) cypress(ctx, sx - 12, base, 90);
      },
    },
    // setos, topiarios y verjas doradas
    {
      factor: 0.68,
      spacing: 200,
      draw(ctx, sx, r, v) {
        const base = v.groundY + 2;
        const k = r(0);
        if (k < 0.35) {
          ctx.fillStyle = '#2e8b4e';
          ctx.fillRect(sx, base - 34, 150, 34);
          ctx.fillStyle = '#3aa85f';
          ctx.fillRect(sx, base - 34, 150, 8);
        } else if (k < 0.6) {
          ctx.fillStyle = '#7a6a58';
          ctx.fillRect(sx + 20, base - 20, 30, 20);
          ctx.fillStyle = '#2e8b4e';
          ctx.beginPath();
          ctx.arc(sx + 35, base - 42, 22, 0, Math.PI * 2);
          ctx.arc(sx + 35, base - 78, 15, 0, Math.PI * 2);
          ctx.arc(sx + 35, base - 101, 9, 0, Math.PI * 2);
          ctx.fill();
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
          ctx.fillStyle = '#e9e1cf';
          ctx.fillRect(sx - 14, base - 90, 16, 90);
          ctx.fillRect(sx + 120, base - 90, 16, 90);
        } else {
          tree(ctx, sx + 40, base, 130, '#6b4224', '#3a9e5a', '#55c07a');
        }
      },
    },
  ],
};
