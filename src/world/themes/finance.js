// Zona 2 — DISTRITO LINGOTE (noche)
// Rascacielos con ventanas encendidas, balizas rojas, remates dorados
// iluminados y letreros de neón en la calle.

import { streetLamp, tree, neonSign, beacon } from './shapes.js';
import { windowPattern, fillPattern, drawGlow } from '../../fx/sprites.js';

const GLASS = [
  ['#2a3c7a', '#121a3e'],
  ['#1f4f6e', '#0d2236'],
  ['#3b2f7a', '#17123a'],
  ['#2d3a55', '#111827'],
];
const NEON = [
  { text: 'LINGOTE', color: '#ff3d7f', rgba: 'rgba(255, 61, 127, 0.9)' },
  { text: '24H', color: '#19e3d0', rgba: 'rgba(25, 227, 208, 0.9)' },
  { text: 'HOTEL', color: '#ffd23f', rgba: 'rgba(255, 210, 63, 0.9)' },
  { text: 'VIP', color: '#a77bff', rgba: 'rgba(167, 123, 255, 0.9)' },
  { text: 'BAR', color: '#ff7a3d', rgba: 'rgba(255, 122, 61, 0.9)' },
];
const WIN_COLORS = [['#ffe9a8', '#ffd27a'], ['#bff4ff', '#8fe3ff'], ['#ffd6a0', '#fff1c8']];

export const finance = {
  id: 'finance',
  nameKey: 'zone.finance',
  sky: ['#06061f', '#12123f', '#26205f', '#4a2a72', '#7a3a7f'],
  celestial: { type: 'moon', x: 0.18, y: 88, r: 28, color: '#f4f0ff', glow: 'rgba(190, 180, 255, 0.55)' },
  stars: true,
  clouds: { color: 'rgba(70, 60, 130, 0.65)', shade: 'rgba(30, 25, 70, 0.6)', rim: 'rgba(200, 190, 255, 0.35)' },
  haze: 'rgba(120, 60, 150, 0.45)',
  skyline: { factor: 0.07, base: 0.88, min: 90, max: 250, color: '#17143d', lit: '#ffd88a' },
  ground: {
    top: '#6a6f8f', body: '#2c2f45', line: '#4c5070', edge: '#14162a', joint: 64, curb: '#ffd23f',
    reflect: ['rgba(255, 61, 127, 0.35)', 'rgba(25, 227, 208, 0.3)'],
  },

  layers: [
    // torres lejanas con ventanas tenues
    {
      factor: 0.16,
      spacing: 84,
      cache: true,
      cacheTop: 60,
      animate(ctx, sx, r, v, t, i) {
        if (r(3) < 0.25) beacon(ctx, sx + (54 + r(1) * 40) / 2, v.groundY - (150 + r(0) * 200) - 31, t, i);
      },
      draw(ctx, sx, r, v, t, i, q) {
        const h = 150 + r(0) * 200;
        const w = 54 + r(1) * 40;
        const y = v.groundY - h;
        ctx.fillStyle = '#231f52';
        ctx.fillRect(sx, y, w, h);
        if (q.detail) {
          const pat = windowPattern(ctx, `fin-far-${Math.floor(r(2) * 3)}`, {
            cw: 4, ch: 5, gx: 5, gy: 6, cols: 8, rows: 10, lit: 0.3, colors: ['rgba(255, 220, 150, 0.7)', 'rgba(160, 220, 255, 0.6)'], off: 'rgba(0,0,0,0)', seed: 1 + Math.floor(r(2) * 3),
          });
          fillPattern(ctx, pat, sx + 4, y + 6, w - 8, h - 6);
        }
        if (r(3) < 0.25) {
          ctx.fillStyle = '#231f52';
          ctx.fillRect(sx + w / 2 - 1, y - 30, 2, 30);
        }
      },
    },
    // rascacielos de cristal con ventanas encendidas
    {
      factor: 0.36,
      spacing: 150,
      cache: true,
      cacheTop: 40,
      animate(ctx, sx, r, v, t, i) {
        const top = r(4);
        if (r(9) < 0.12 || top < 0.3 || top >= 0.6) return;
        const h = 220 + r(0) * 190;
        const w = 92 + r(1) * 40;
        beacon(ctx, sx + r(2) * 20 + w / 2, v.groundY - h - 48, t, i * 2);
      },
      draw(ctx, sx, r, v) {
        if (r(9) < 0.12) return;
        const h = 220 + r(0) * 190;
        const w = 92 + r(1) * 40;
        const x = sx + r(2) * 20;
        const y = v.groundY - h;
        const [c1, c2] = GLASS[Math.floor(r(3) * GLASS.length)];
        const g = ctx.createLinearGradient(x, y, x + w, y + h);
        g.addColorStop(0, c1);
        g.addColorStop(1, c2);
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, h);
        // ventanas
        const variant = Math.floor(r(5) * 4);
        const pat = windowPattern(ctx, `fin-mid-${variant}`, {
          cw: 9, ch: 10, gx: 7, gy: 8, cols: 10, rows: 14, lit: 0.42 + variant * 0.06, colors: WIN_COLORS[variant % 3], off: 'rgba(10, 15, 40, 0.55)', seed: 10 + variant,
        });
        fillPattern(ctx, pat, x + 6, y + 10, w - 12, h - 10, x + 6 - Math.floor(r(6) * 4) * 16, y + 10);
        // reflejo de la luna
        ctx.fillStyle = 'rgba(200, 210, 255, 0.08)';
        ctx.beginPath();
        ctx.moveTo(x + w * 0.2, y);
        ctx.lineTo(x + w * 0.45, y);
        ctx.lineTo(x, y + w * 0.9);
        ctx.lineTo(x, y + w * 0.45);
        ctx.fill();
        // borde iluminado
        ctx.fillStyle = 'rgba(255, 120, 200, 0.25)';
        ctx.fillRect(x + w - 3, y, 3, h);

        const top = r(4);
        if (top < 0.3) {
          // remate dorado iluminado por focos
          drawGlow(ctx, x + w / 2, y - 12, w * 0.7, 'rgba(255, 200, 80, 0.8)', 0.45, 40);
          ctx.fillStyle = '#e8b52c';
          ctx.beginPath();
          ctx.moveTo(x + 8, y);
          ctx.lineTo(x + w - 8, y);
          ctx.lineTo(x + w - 22, y - 24);
          ctx.lineTo(x + 22, y - 24);
          ctx.fill();
          ctx.fillStyle = '#fff1a8';
          ctx.fillRect(x + 26, y - 20, w - 52, 5);
        } else if (top < 0.6) {
          ctx.fillStyle = '#0d0f24';
          ctx.fillRect(x + w / 2 - 2, y - 46, 4, 46);
        } else {
          ctx.fillStyle = c2;
          ctx.fillRect(x + 10, y - 14, w - 20, 14);
          // franja de neón en la azotea
          drawGlow(ctx, x + w / 2, y - 7, w * 0.5, 'rgba(25, 227, 208, 0.8)', 0.5, 10);
          ctx.fillStyle = '#7ffff2';
          ctx.fillRect(x + 12, y - 9, w - 24, 2);
        }
      },
    },
    // calle: neones, farolas encendidas y árboles
    {
      factor: 0.68,
      spacing: 250,
      draw(ctx, sx, r, v, t, i) {
        const base = v.groundY + 2;
        const k = r(0);
        if (k < 0.3) {
          ctx.fillStyle = '#3a3e58';
          ctx.fillRect(sx - 16, base - 16, 32, 16);
          tree(ctx, sx, base - 14, 110, '#2a1c2a', '#173a3a', '#21524a');
        } else if (k < 0.55) {
          streetLamp(ctx, sx, base, '#1a1c30', '#fff3c8', true);
        } else if (k < 0.92) {
          const n = NEON[Math.floor(r(1) * NEON.length)];
          ctx.fillStyle = '#1a1c30';
          ctx.fillRect(sx + 40, base - 110, 8, 110);
          neonSign(ctx, sx + 44, base - 136, n.text, n.color, n.rgba, t, 22, i);
        }
      },
    },
  ],
};
