// Zona 2 — DISTRITO LINGOTE
// Rascacielos de cristal, torres con remate dorado y vallas de bancos inventados.

import { streetLamp, tree } from './shapes.js';

const GLASS = [
  ['#3aa0d8', '#1c5f96'],
  ['#41c4c0', '#1a7a86'],
  ['#6f86e8', '#36459e'],
  ['#9fb4c8', '#4f6478'],
];
const ADS = [
  { bg: '#ffd23f', fg: '#1b1030', text: 'ORO+' },
  { bg: '#1b1030', fg: '#19c3b1', text: 'CALIBANK' },
  { bg: '#ff3d7f', fg: '#fff4dc', text: 'VIP%' },
  { bg: '#fff4dc', fg: '#ff7a3d', text: '$$$' },
];

export const finance = {
  id: 'finance',
  nameKey: 'zone.finance',
  sky: ['#3d8fe0', '#9fd6ff', '#ffe9c2'],
  sun: { x: 0.72, y: 96, r: 40, color: '#fff6d0', glow: 'rgba(255, 230, 160, 0.5)' },
  cloudColor: 'rgba(255, 255, 255, 0.8)',
  ground: { top: '#c9ccd6', body: '#565b6b', line: '#9a9eac', edge: '#383c4a', joint: 64, curb: '#ffd23f' },

  layers: [
    // torres lejanas, pálidas por la bruma
    {
      factor: 0.12,
      spacing: 80,
      draw(ctx, sx, r, v) {
        const h = 140 + r(0) * 200;
        const w = 50 + r(1) * 40;
        const y = v.groundY - h;
        ctx.fillStyle = '#a9c9de';
        ctx.fillRect(sx, y, w, h);
        ctx.fillStyle = '#bcd6e8';
        for (let k = y + 10; k < v.groundY; k += 14) ctx.fillRect(sx + 4, k, w - 8, 3);
        if (r(2) < 0.3) {
          ctx.fillStyle = '#a9c9de';
          ctx.fillRect(sx + w / 2 - 1, y - 30, 2, 30);
        }
      },
    },
    // rascacielos de cristal
    {
      factor: 0.36,
      spacing: 150,
      draw(ctx, sx, r, v) {
        if (r(9) < 0.12) return;
        const h = 210 + r(0) * 190;
        const w = 92 + r(1) * 40;
        const x = sx + r(2) * 20;
        const y = v.groundY - h;
        const [c1, c2] = GLASS[Math.floor(r(3) * GLASS.length)];
        const g = ctx.createLinearGradient(x, y, x + w, y + h);
        g.addColorStop(0, c1);
        g.addColorStop(1, c2);
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, h);
        // reflejo diagonal
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.moveTo(x + w * 0.2, y);
        ctx.lineTo(x + w * 0.45, y);
        ctx.lineTo(x, y + w * 0.9);
        ctx.lineTo(x, y + w * 0.45);
        ctx.fill();
        // líneas de forjado
        ctx.fillStyle = 'rgba(10, 20, 50, 0.25)';
        for (let k = y + 16; k < v.groundY; k += 16) ctx.fillRect(x, k, w, 2);
        for (let k = x + 18; k < x + w; k += 18) ctx.fillRect(k, y, 1.5, h);
        // remates
        const top = r(4);
        if (top < 0.3) {
          // remate dorado en forma de lingote
          ctx.fillStyle = '#e8b52c';
          ctx.beginPath();
          ctx.moveTo(x + 8, y);
          ctx.lineTo(x + w - 8, y);
          ctx.lineTo(x + w - 22, y - 24);
          ctx.lineTo(x + 22, y - 24);
          ctx.fill();
          ctx.fillStyle = '#ffe27a';
          ctx.fillRect(x + 26, y - 20, w - 52, 5);
        } else if (top < 0.6) {
          ctx.fillStyle = '#2a2f45';
          ctx.fillRect(x + w / 2 - 2, y - 46, 4, 46);
          ctx.fillStyle = '#ff3d4f';
          ctx.beginPath();
          ctx.arc(x + w / 2, y - 48, 3.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = c2;
          ctx.fillRect(x + 10, y - 14, w - 20, 14);
        }
      },
    },
    // calle: árboles en jardinera, farolas y vallas publicitarias
    {
      factor: 0.68,
      spacing: 240,
      draw(ctx, sx, r, v) {
        const base = v.groundY + 2;
        const k = r(0);
        if (k < 0.4) {
          ctx.fillStyle = '#6d7183';
          ctx.fillRect(sx - 16, base - 16, 32, 16);
          tree(ctx, sx, base - 14, 110);
        } else if (k < 0.65) {
          streetLamp(ctx, sx, base, '#30344a', '#ffe9a8');
        } else if (k < 0.9) {
          const ad = ADS[Math.floor(r(1) * ADS.length)];
          ctx.fillStyle = '#30344a';
          ctx.fillRect(sx + 40, base - 120, 8, 120);
          ctx.fillStyle = '#1b1030';
          ctx.fillRect(sx - 6, base - 176, 100, 60);
          ctx.fillStyle = ad.bg;
          ctx.fillRect(sx - 2, base - 172, 92, 52);
          ctx.fillStyle = ad.fg;
          ctx.font = "18px 'Bungee', Impact, sans-serif";
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(ad.text, sx + 44, base - 145);
        }
      },
    },
  ],
};

