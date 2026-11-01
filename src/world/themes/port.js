// Zona 5 — PUERTO ANCLA
// Atardecer, buques portacontenedores, grúas pórtico y noray en el muelle.

import { sea } from './shapes.js';

const HORIZON = 0.62;
const BOX = ['#c8463a', '#2e7fb8', '#e0a224', '#3f9a5c', '#e7e2d6'];

export const port = {
  id: 'port',
  nameKey: 'zone.port',
  sky: ['#3a2d6b', '#d9608a', '#ffb36b'],
  sun: { x: 0.7, y: 250, r: 60, color: '#ffd38a', glow: 'rgba(255, 150, 90, 0.55)' },
  cloudColor: 'rgba(255, 190, 200, 0.55)',
  ground: { top: '#8c7a68', body: '#4e4138', line: '#3a3029', edge: '#2a221d', joint: 40, bumpers: true },

  backdrop(ctx, v, camX, t) {
    const hy = v.h * HORIZON;
    sea(ctx, v, camX, t, hy, v.groundY, '#6a4f8f', '#253a6b', 'rgba(255, 200, 140, 0.7)');
    // reflejo del sol
    const sx = v.w * this.sun.x;
    ctx.fillStyle = 'rgba(255, 200, 120, 0.35)';
    for (let k = 0; k < 6; k++) {
      const w = 70 - k * 9 + Math.sin(t * 2 + k) * 6;
      ctx.fillRect(sx - w / 2, hy + 6 + k * 12, w, 4);
    }
  },

  layers: [
    // buques en el horizonte y faro
    {
      factor: 0.1,
      spacing: 460,
      draw(ctx, sx, r, v) {
        const hy = v.h * HORIZON;
        if (r(0) < 0.65) {
          const w = 220 + r(1) * 120;
          const x = sx + r(2) * 100;
          ctx.fillStyle = '#2b2348';
          ctx.beginPath();
          ctx.moveTo(x, hy - 20);
          ctx.lineTo(x + w, hy - 20);
          ctx.lineTo(x + w - 20, hy + 4);
          ctx.lineTo(x + 14, hy + 4);
          ctx.fill();
          ctx.fillRect(x + w - 50, hy - 52, 30, 32);
          for (let c = x + 16; c < x + w - 60; c += 18) {
            const stack = 1 + Math.floor(r(Math.floor(c)) * 3);
            ctx.fillStyle = '#4a3a6a';
            ctx.fillRect(c, hy - 20 - stack * 10, 16, stack * 10);
          }
        } else if (r(3) < 0.5) {
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
          ctx.fillStyle = '#ffe9a8';
          ctx.fillRect(x - 6, hy - 80, 12, 10);
        }
      },
    },
    // grúas pórtico y pilas de contenedores
    {
      factor: 0.35,
      spacing: 240,
      draw(ctx, sx, r, v) {
        const base = v.groundY;
        if (r(0) < 0.5) {
          const x = sx;
          const h = 230;
          ctx.fillStyle = '#d6453a';
          ctx.fillRect(x, base - h, 10, h);
          ctx.fillRect(x + 70, base - h, 10, h);
          ctx.fillRect(x - 70, base - h - 10, 230, 12);
          ctx.fillStyle = '#f2ebe0';
          for (let y = base - h + 20; y < base; y += 40) {
            ctx.fillRect(x, y, 10, 14);
            ctx.fillRect(x + 70, y, 10, 14);
          }
          ctx.fillStyle = '#2b2348';
          ctx.fillRect(x + 20, base - h + 2, 40, 20);
          ctx.strokeStyle = '#2b2348';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + 130, base - h + 2);
          ctx.lineTo(x + 130, base - 120 - r(1) * 40);
          ctx.stroke();
          ctx.fillStyle = BOX[Math.floor(r(2) * BOX.length)];
          ctx.fillRect(x + 108, base - 120 - r(1) * 40, 44, 22);
        } else {
          const cols = 2 + Math.floor(r(1) * 2);
          for (let c = 0; c < cols; c++) {
            const stack = 1 + Math.floor(r(3 + c) * 4);
            for (let s = 0; s < stack; s++) {
              ctx.fillStyle = BOX[Math.floor(r(10 + c * 5 + s) * BOX.length)];
              ctx.fillRect(sx + c * 62, base - (s + 1) * 26, 60, 25);
              ctx.fillStyle = 'rgba(0,0,0,0.2)';
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
          ctx.fillStyle = '#2a2235';
          ctx.fillRect(sx, base - 24, 22, 24);
          ctx.beginPath();
          ctx.ellipse(sx + 11, base - 24, 15, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#d9c39a';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(sx + 11, base - 20);
          ctx.quadraticCurveTo(sx + 60, base + 4, sx + 110, base - 6);
          ctx.stroke();
        } else if (k < 0.7) {
          for (let i = 0; i < 1 + Math.floor(r(1) * 3); i++) {
            ctx.fillStyle = '#b07a46';
            ctx.fillRect(sx + i * 34, base - 32 - (i === 1 ? 30 : 0), 32, 32);
            ctx.strokeStyle = '#7a4f2a';
            ctx.lineWidth = 2;
            ctx.strokeRect(sx + i * 34 + 2, base - 30 - (i === 1 ? 30 : 0), 28, 28);
          }
        } else {
          ctx.fillStyle = '#2a2235';
          ctx.fillRect(sx - 3, base - 160, 6, 160);
          ctx.fillRect(sx - 20, base - 160, 40, 5);
          ctx.fillStyle = '#ffe2a0';
          ctx.beginPath();
          ctx.arc(sx - 16, base - 150, 6, 0, Math.PI * 2);
          ctx.arc(sx + 16, base - 150, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      },
    },
  ],
};
