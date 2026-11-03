// Zona 3 — LAS CHIMENEAS (anochecer con humo)
// Cielo rojizo, antorchas de gas en las chimeneas, naves con ventanas
// anaranjadas, grúas con balizas y contenedores.

import { beacon, INK } from './shapes.js';
import { windowPattern, fillPattern, drawGlow } from '../../fx/sprites.js';

const CONTAINERS = ['#c8463a', '#2e7fb8', '#e0a224', '#3f9a5c', '#7b5cff'];

export const industrial = {
  id: 'industrial',
  nameKey: 'zone.industrial',
  sky: ['#24122f', '#5a2340', '#b0433b', '#e8774a', '#f6b26b'],
  celestial: { type: 'sun', x: 0.78, y: 236, r: 46, color: '#ff8f6a', glow: 'rgba(255, 110, 70, 0.75)' },
  clouds: { color: 'rgba(140, 70, 80, 0.7)', shade: 'rgba(60, 25, 45, 0.6)', rim: 'rgba(255, 150, 100, 0.5)' },
  haze: 'rgba(230, 110, 70, 0.4)',
  skyline: { factor: 0.06, base: 0.8, min: 40, max: 120, color: '#3a1a33', lit: '#ffb060', style: 'factory' },
  ground: { top: '#9a8f88', body: '#5a524e', line: '#7b726b', edge: '#2c2624', joint: 80, hazard: true, speckle: 'rgba(30, 20, 20, 0.18)', stains: 'rgba(20, 10, 20, 0.22)', cracks: 'rgba(40, 30, 30, 0.35)' },
  rays: { color: 'rgba(255, 140, 90, 0.06)' },

  foreground: { chance: 0.5, kinds: ['pipe', 'barrels', 'grass'], color: 'rgba(36, 14, 22, 0.94)', rim: 'rgba(110, 50, 40, 0.9)' },

  layers: [
    // fábricas lejanas con humo y antorchas
    {
      factor: 0.12,
      spacing: 150,
      draw(ctx, sx, r, v, t, i, q) {
        const h = 70 + r(0) * 70;
        const w = 120 + r(1) * 40;
        const y = v.groundY - 40 - h;
        ctx.fillStyle = '#5a2a3c';
        ctx.fillRect(sx, y, w, h + 40);
        const teeth = 4;
        for (let k = 0; k < teeth; k++) {
          const tx = sx + (k * w) / teeth;
          ctx.beginPath();
          ctx.moveTo(tx, y);
          ctx.lineTo(tx + w / teeth, y - 18);
          ctx.lineTo(tx + w / teeth, y);
          ctx.fill();
          ctx.fillStyle = 'rgba(255, 170, 90, 0.35)';
          ctx.beginPath();
          ctx.moveTo(tx + w / teeth - 3, y - 15);
          ctx.lineTo(tx + w / teeth - 3, y);
          ctx.lineTo(tx + w / teeth - 10, y);
          ctx.fill();
          ctx.fillStyle = '#5a2a3c';
        }
        if (r(2) < 0.7) {
          const cx = sx + w * (0.2 + r(3) * 0.6);
          const ch = 80 + r(4) * 60;
          ctx.fillStyle = '#4a2232';
          ctx.fillRect(cx - 7, y - ch, 14, ch);
          ctx.fillStyle = '#e8d6c8';
          ctx.fillRect(cx - 7, y - ch + 8, 14, 4);
          // humo
          const puffs = q.detail ? 5 : 3;
          for (let p = 0; p < puffs; p++) {
            const f = (t * 0.22 + p / puffs + r(5)) % 1;
            ctx.fillStyle = `rgba(90, 60, 80, ${0.4 * (1 - f)})`;
            ctx.beginPath();
            ctx.arc(cx + f * 60, y - ch - 10 - f * 70, 8 + f * 26, 0, Math.PI * 2);
            ctx.fill();
          }
          // antorcha de gas
          if (r(6) < 0.5) {
            const fl = 0.7 + 0.3 * Math.sin(t * 17 + i);
            drawGlow(ctx, cx, y - ch - 8, 26 * fl, 'rgba(255, 140, 50, 0.95)', 0.9);
            ctx.fillStyle = '#ffd27a';
            ctx.beginPath();
            ctx.moveTo(cx - 4, y - ch);
            ctx.quadraticCurveTo(cx, y - ch - 18 * fl, cx + 4, y - ch);
            ctx.fill();
          }
        }
      },
    },
    // depósitos, grúas y naves con ventanas encendidas
    {
      factor: 0.36,
      spacing: 210,
      draw(ctx, sx, r, v, t, i) {
        const base = v.groundY;
        const k = r(0);
        if (k < 0.4) {
          const n = 1 + Math.floor(r(1) * 2);
          for (let j = 0; j < n; j++) {
            const x = sx + j * 70;
            const h = 90 + r(2 + j) * 50;
            const g = ctx.createLinearGradient(x, 0, x + 60, 0);
            g.addColorStop(0, '#6d5a66');
            g.addColorStop(0.45, '#d9b8a8');
            g.addColorStop(1, '#4e3f4c');
            ctx.fillStyle = g;
            ctx.fillRect(x, base - h, 60, h);
            ctx.beginPath();
            ctx.ellipse(x + 30, base - h, 30, 9, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#b8443a';
            ctx.fillRect(x, base - h * 0.55, 60, 8);
            ctx.strokeStyle = 'rgba(30, 15, 25, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let s = base - h + 12; s < base; s += 14) {
              ctx.moveTo(x + 56, s);
              ctx.lineTo(x + 60, s + 7);
            }
            ctx.stroke();
          }
        } else if (k < 0.7) {
          const x = sx + 40;
          const h = 230 + r(3) * 60;
          ctx.strokeStyle = '#d99a2b';
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let y = base; y > base - h; y -= 18) {
            ctx.moveTo(x - 8, y);
            ctx.lineTo(x + 8, y - 18);
            ctx.moveTo(x + 8, y);
            ctx.lineTo(x - 8, y - 18);
          }
          ctx.stroke();
          ctx.fillStyle = '#d99a2b';
          ctx.fillRect(x - 10, base - h, 3, h);
          ctx.fillRect(x + 7, base - h, 3, h);
          ctx.fillRect(x - 60, base - h - 6, 190, 8);
          ctx.fillStyle = '#2c2030';
          ctx.fillRect(x - 60, base - h + 2, 30, 18);
          ctx.strokeStyle = '#2c2030';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x + 100, base - h + 2);
          ctx.lineTo(x + 100, base - h + 70 + r(4) * 60);
          ctx.stroke();
          beacon(ctx, x + 128, base - h - 6, t, i);
        } else {
          const w = 170;
          const h = 86;
          ctx.fillStyle = '#4e4a5c';
          ctx.fillRect(sx, base - h, w, h);
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          for (let x = sx; x < sx + w; x += 8) ctx.fillRect(x, base - h, 3, h);
          const pat = windowPattern(ctx, 'ind-win', {
            cw: 14, ch: 10, gx: 8, gy: 10, cols: 8, rows: 2, lit: 0.7, colors: ['#ffb45a', '#ffd27a'], off: '#2a2433', seed: 7,
          });
          fillPattern(ctx, pat, sx + 8, base - h + 10, w - 16, 40);
          drawGlow(ctx, sx + w / 2, base - h + 30, w * 0.6, 'rgba(255, 150, 70, 0.6)', 0.4, 26);
          ctx.fillStyle = '#b8443a';
          ctx.fillRect(sx - 4, base - h - 8, w + 8, 10);
        }
      },
    },
    // contenedores, bidones y valla
    {
      factor: 0.68,
      spacing: 230,
      draw(ctx, sx, r, v, t) {
        const base = v.groundY + 2;
        const k = r(0);
        if (k < 0.5) {
          const rows = 1 + Math.floor(r(1) * 3);
          for (let j = 0; j < rows; j++) {
            const c = CONTAINERS[Math.floor(r(2 + j) * CONTAINERS.length)];
            const cw = j === 0 ? 96 + Math.floor(r(8) * 40) : 90 + Math.floor(r(9 + j) * 30);
            const x = sx + (j % 2) * (6 + r(12) * 20);
            const y = base - (j + 1) * 40;
            ctx.fillStyle = INK;
            ctx.fillRect(x - 2, y - 2, cw + 4, 42);
            ctx.fillStyle = c;
            ctx.fillRect(x, y, cw, 38);
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            for (let px = x + 6; px < x + cw; px += 9) ctx.fillRect(px, y + 3, 3, 32);
            ctx.fillStyle = 'rgba(255, 170, 110, 0.35)';
            ctx.fillRect(x, y, cw, 3);
            // puertas con cierres u óxido
            if (r(13 + j) < 0.5) {
              ctx.fillStyle = 'rgba(30, 15, 20, 0.45)';
              ctx.fillRect(x + cw - 22, y + 6, 2, 26);
              ctx.fillRect(x + cw - 12, y + 6, 2, 26);
            } else {
              ctx.fillStyle = 'rgba(140, 60, 30, 0.35)';
              ctx.beginPath();
              ctx.ellipse(x + cw * r(16 + j), y + 30, 10, 5, 0, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        } else if (k < 0.75) {
          const nb = 2 + Math.floor(r(6) * 3);
          for (let j = 0; j < nb; j++) {
            const x = sx + j * 26;
            ctx.fillStyle = INK;
            ctx.fillRect(x - 2, base - 40, 26, 40);
            ctx.fillStyle = ['#3f9a5c', '#c8463a', '#2e7fb8', '#e0a224'][Math.floor(r(20 + j) * 4)];
            ctx.fillRect(x, base - 38, 22, 38);
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(x, base - 28, 22, 3);
            ctx.fillRect(x, base - 14, 22, 3);
            ctx.fillStyle = 'rgba(255, 190, 130, 0.35)';
            ctx.fillRect(x + 15, base - 38, 4, 38);
          }
          // bidón en llamas
          if (r(5) < 0.5) {
            const fl = 0.75 + 0.25 * Math.sin(t * 19);
            drawGlow(ctx, sx + 11, base - 46, 34 * fl, 'rgba(255, 140, 50, 0.9)', 0.8);
            ctx.fillStyle = '#ffd27a';
            ctx.beginPath();
            ctx.moveTo(sx + 2, base - 38);
            ctx.quadraticCurveTo(sx + 11, base - 38 - 26 * fl, sx + 20, base - 38);
            ctx.fill();
          }
        } else {
          ctx.strokeStyle = 'rgba(30, 20, 30, 0.6)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let x = sx; x < sx + 200; x += 10) {
            ctx.moveTo(x, base);
            ctx.lineTo(x + 30, base - 60);
            ctx.moveTo(x + 30, base);
            ctx.lineTo(x, base - 60);
          }
          ctx.stroke();
          ctx.fillStyle = '#2c2030';
          for (let x = sx; x <= sx + 200; x += 66) ctx.fillRect(x, base - 64, 4, 64);
        }
      },
    },
  ],
};
