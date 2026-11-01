// Zona 5 — PUERTO ANCLA (hora azul)
// Cielo malva con luna, faro con haz giratorio, buques con ojos de buey
// encendidos, grúas pórtico con balizas y reflejos en el agua.

import { sea, sunReflection, beacon, INK } from './shapes.js';
import { drawGlow } from '../../fx/sprites.js';
import { hash } from '../../core/rng.js';

const HORIZON = 0.62;
const BOX = ['#c8463a', '#2e7fb8', '#e0a224', '#3f9a5c', '#e7e2d6'];

export const port = {
  id: 'port',
  nameKey: 'zone.port',
  sky: ['#0a1230', '#18275a', '#33397e', '#8a4f8e', '#e2788a'],
  celestial: { type: 'moon', x: 0.8, y: 70, r: 22, color: '#fff6e8', glow: 'rgba(255, 220, 230, 0.5)' },
  stars: true,
  clouds: { color: 'rgba(120, 90, 150, 0.55)', shade: 'rgba(40, 35, 80, 0.5)', rim: 'rgba(255, 170, 190, 0.4)' },
  haze: 'rgba(170, 90, 140, 0.35)',
  skyline: { factor: 0.05, base: HORIZON, min: 14, max: 60, color: '#1c2252', lit: '#ffe0a0' },
  ground: { top: '#7a6a5e', body: '#3e342e', line: '#2a221d', edge: '#17110e', joint: 40, bumpers: true },

  backdrop(ctx, v, camX, t, q) {
    const hy = v.h * HORIZON;
    sea(ctx, v, camX, t, hy, v.groundY, '#3d3a7e', '#0f1638', 'rgba(255, 200, 220, 0.5)');
    sunReflection(ctx, v.w * this.celestial.x, hy, 6, t, 'rgba(255, 240, 230, 0.55)');
    // reflejos de las luces del puerto en el agua
    if (q.detail) {
      ctx.globalCompositeOperation = 'lighter';
      const off = camX * 0.2;
      for (let i = Math.floor(off / 70) - 1; i < (off + v.w) / 70 + 1; i++) {
        if (hash(i, 900) > 0.5) continue;
        const x = i * 70 - off + hash(i, 901) * 40;
        ctx.fillStyle = hash(i, 902) < 0.5 ? 'rgba(255, 210, 120, 0.35)' : 'rgba(255, 90, 110, 0.3)';
        for (let k = 0; k < 4; k++) {
          ctx.fillRect(x + Math.sin(t * 2 + k + i) * 3, hy + 10 + k * 9, 10 - k * 2, 2);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  },

  layers: [
    // buques y faro
    {
      factor: 0.1,
      spacing: 460,
      draw(ctx, sx, r, v, t, i) {
        const hy = v.h * HORIZON;
        if (r(0) < 0.65) {
          const w = 220 + r(1) * 120;
          const x = sx + r(2) * 100;
          ctx.fillStyle = '#1a1840';
          ctx.beginPath();
          ctx.moveTo(x, hy - 20);
          ctx.lineTo(x + w, hy - 20);
          ctx.lineTo(x + w - 20, hy + 4);
          ctx.lineTo(x + 14, hy + 4);
          ctx.fill();
          ctx.fillRect(x + w - 50, hy - 52, 30, 32);
          for (let c = x + 16; c < x + w - 60; c += 18) {
            const stack = 1 + Math.floor(hash(Math.floor(c), 77) * 3);
            ctx.fillStyle = '#2a2558';
            ctx.fillRect(c, hy - 20 - stack * 10, 16, stack * 10);
          }
          // ojos de buey y luces de cubierta
          ctx.fillStyle = '#ffe0a0';
          for (let p = x + 24; p < x + w - 30; p += 16) ctx.fillRect(p, hy - 12, 3, 3);
          ctx.fillRect(x + w - 44, hy - 46, 6, 4);
          ctx.fillRect(x + w - 32, hy - 46, 6, 4);
          beacon(ctx, x + w - 35, hy - 56, t, i);
        } else if (r(3) < 0.6) {
          // faro con haz giratorio
          const x = sx + 120;
          ctx.fillStyle = '#f2ebe0';
          ctx.beginPath();
          ctx.moveTo(x - 10, hy);
          ctx.lineTo(x - 6, hy - 70);
          ctx.lineTo(x + 6, hy - 70);
          ctx.lineTo(x + 10, hy);
          ctx.fill();
          ctx.fillStyle = '#c8463a';
          ctx.fillRect(x - 8, hy - 48, 16, 10);
          ctx.fillRect(x - 9, hy - 22, 18, 10);
          const ang = Math.sin(t * 0.9 + i) * 1.1;
          const lx = x;
          const ly = hy - 76;
          const len = 420;
          ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createLinearGradient(lx, ly, lx + Math.cos(ang) * len, ly + Math.sin(ang) * len * 0.2);
          g.addColorStop(0, 'rgba(255, 240, 190, 0.5)');
          g.addColorStop(1, 'rgba(255, 240, 190, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx + Math.cos(ang - 0.08) * len, ly + Math.sin(ang - 0.08) * len * 0.25 - 30);
          ctx.lineTo(lx + Math.cos(ang + 0.08) * len, ly + Math.sin(ang + 0.08) * len * 0.25 + 30);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
          drawGlow(ctx, lx, ly, 30, 'rgba(255, 240, 190, 0.95)', 1);
          ctx.fillStyle = '#fffbe8';
          ctx.fillRect(x - 6, hy - 80, 12, 10);
        }
      },
    },
    // grúas pórtico y contenedores
    {
      factor: 0.36,
      spacing: 240,
      draw(ctx, sx, r, v, t, i) {
        const base = v.groundY;
        if (r(0) < 0.5) {
          const x = sx;
          const h = 230;
          ctx.fillStyle = '#a8343a';
          ctx.fillRect(x, base - h, 10, h);
          ctx.fillRect(x + 70, base - h, 10, h);
          ctx.fillRect(x - 70, base - h - 10, 230, 12);
          ctx.fillStyle = '#d8d0c8';
          for (let y = base - h + 20; y < base; y += 40) {
            ctx.fillRect(x, y, 10, 14);
            ctx.fillRect(x + 70, y, 10, 14);
          }
          ctx.fillStyle = '#141a3a';
          ctx.fillRect(x + 20, base - h + 2, 40, 20);
          ctx.fillStyle = '#ffe0a0';
          ctx.fillRect(x + 26, base - h + 7, 10, 6);
          ctx.strokeStyle = '#141a3a';
          ctx.lineWidth = 2;
          const hook = base - 120 - r(1) * 40;
          ctx.beginPath();
          ctx.moveTo(x + 130, base - h + 2);
          ctx.lineTo(x + 130, hook);
          ctx.stroke();
          ctx.fillStyle = BOX[Math.floor(r(2) * BOX.length)];
          ctx.fillRect(x + 108, hook, 44, 22);
          beacon(ctx, x - 66, base - h - 12, t, i);
          beacon(ctx, x + 156, base - h - 12, t, i + 1.5);
          // foco de trabajo
          drawGlow(ctx, x + 40, base - h + 24, 30, 'rgba(255, 230, 170, 0.9)', 0.7);
        } else {
          const cols = 2 + Math.floor(r(1) * 2);
          for (let c = 0; c < cols; c++) {
            const stack = 1 + Math.floor(r(3 + c) * 4);
            for (let s = 0; s < stack; s++) {
              ctx.fillStyle = BOX[Math.floor(r(10 + c * 5 + s) * BOX.length)];
              ctx.fillRect(sx + c * 62, base - (s + 1) * 26, 60, 25);
              ctx.fillStyle = 'rgba(10, 15, 50, 0.45)';
              ctx.fillRect(sx + c * 62, base - (s + 1) * 26, 60, 25);
              ctx.fillStyle = 'rgba(0,0,0,0.25)';
              ctx.fillRect(sx + c * 62, base - (s + 1) * 26 + 20, 60, 5);
            }
          }
        }
      },
    },
    // noráis, cajas y farolas del muelle
    {
      factor: 0.68,
      spacing: 190,
      draw(ctx, sx, r, v) {
        const base = v.groundY + 2;
        const k = r(0);
        if (k < 0.4) {
          ctx.fillStyle = '#16121e';
          ctx.fillRect(sx, base - 24, 22, 24);
          ctx.beginPath();
          ctx.ellipse(sx + 11, base - 24, 15, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(160, 170, 255, 0.3)';
          ctx.fillRect(sx + 15, base - 22, 4, 20);
          ctx.strokeStyle = '#c9b58a';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(sx + 11, base - 20);
          ctx.quadraticCurveTo(sx + 60, base + 4, sx + 110, base - 6);
          ctx.stroke();
        } else if (k < 0.7) {
          for (let j = 0; j < 1 + Math.floor(r(1) * 3); j++) {
            const y = base - 32 - (j === 1 ? 30 : 0);
            ctx.fillStyle = INK;
            ctx.fillRect(sx + j * 34 - 2, y - 2, 36, 36);
            ctx.fillStyle = '#8a5e3a';
            ctx.fillRect(sx + j * 34, y, 32, 32);
            ctx.strokeStyle = '#5a3a22';
            ctx.lineWidth = 2;
            ctx.strokeRect(sx + j * 34 + 3, y + 3, 26, 26);
            ctx.beginPath();
            ctx.moveTo(sx + j * 34 + 3, y + 3);
            ctx.lineTo(sx + j * 34 + 29, y + 29);
            ctx.stroke();
          }
        } else {
          ctx.fillStyle = '#16121e';
          ctx.fillRect(sx - 3, base - 160, 6, 160);
          ctx.fillRect(sx - 20, base - 160, 40, 5);
          for (const dx of [-16, 16]) {
            drawGlow(ctx, sx + dx, base - 150, 26, 'rgba(255, 220, 150, 0.9)', 0.9);
            ctx.fillStyle = '#fff2c8';
            ctx.beginPath();
            ctx.arc(sx + dx, base - 150, 6, 0, Math.PI * 2);
            ctx.fill();
          }
          drawGlow(ctx, sx, base + 2, 70, 'rgba(255, 210, 140, 0.5)', 0.5, 10);
        }
      },
    },
  ],
};
