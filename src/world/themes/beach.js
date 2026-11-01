// Zona 1 — PLAYA CORAL
// Mar y velas al fondo, sombrillas y casetas en la arena, palmeras delante.

import { sea, streetLamp } from './shapes.js';

const HORIZON = 0.6;   // fracción del alto donde está el horizonte
const SAND_TOP = 0.74; // fracción del alto donde empieza la arena

const UMBRELLAS = [
  ['#ff5d73', '#fff4dc'],
  ['#ffb627', '#fff4dc'],
  ['#19c3b1', '#fff4dc'],
  ['#7b5cff', '#ffd23f'],
];
const HUTS = ['#ffd6e0', '#c9f2ee', '#fff1b8', '#d9d2ff'];

export const beach = {
  id: 'beach',
  nameKey: 'zone.beach',
  sky: ['#2b9be8', '#7fd0ff', '#ffe2a8'],
  sun: { x: 0.8, y: 110, r: 44, color: '#fff6d0', glow: 'rgba(255, 214, 120, 0.55)' },
  cloudColor: 'rgba(255, 255, 255, 0.85)',
  ground: { top: '#e0a868', body: '#b06f3e', line: '#7c4826', edge: '#5a3018', joint: 48, beams: true },

  /** Fondo fijo (mar + arena), por detrás de todas las capas. */
  backdrop(ctx, v, camX, t) {
    const hy = v.h * HORIZON;
    const sy = v.h * SAND_TOP;
    sea(ctx, v, camX, t, hy, sy, '#2cb5d6', '#0d7ea8');

    // espuma de la orilla
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.moveTo(0, sy);
    const foamOff = camX * 0.35;
    for (let x = 0; x <= v.w; x += 20) {
      ctx.lineTo(x, sy - 3 - 3 * Math.sin((x + foamOff) * 0.04 + t * 1.5));
    }
    ctx.lineTo(v.w, sy + 4);
    ctx.lineTo(0, sy + 4);
    ctx.fill();

    // arena
    const sand = ctx.createLinearGradient(0, sy, 0, v.groundY);
    sand.addColorStop(0, '#f7dca0');
    sand.addColorStop(1, '#eec27c');
    ctx.fillStyle = sand;
    ctx.fillRect(0, sy + 2, v.w, v.groundY - sy);
  },

  layers: [
    // CAPA LEJANA: islas y veleros en el horizonte
    {
      factor: 0.12,
      spacing: 420,
      draw(ctx, sx, r, v, t) {
        const hy = v.h * HORIZON;
        if (r(0) < 0.5) {
          const w = 120 + r(1) * 220;
          const h = 16 + r(2) * 34;
          ctx.fillStyle = '#5fa9bd';
          ctx.beginPath();
          ctx.ellipse(sx + w / 2, hy + 2, w / 2, h, 0, Math.PI, 0);
          ctx.fill();
          // faro o casita
          if (r(3) < 0.5) {
            ctx.fillStyle = '#e9f6f8';
            ctx.fillRect(sx + w * 0.55, hy - h - 12, 6, 14);
            ctx.fillStyle = '#ff5d73';
            ctx.fillRect(sx + w * 0.55 - 1, hy - h - 15, 8, 4);
          }
        }
        if (r(4) < 0.6) {
          const bx = sx + r(5) * 380;
          const by = hy + 10 + r(6) * 22;
          const bob = Math.sin(t * 1.5 + r(7) * 6) * 1.5;
          ctx.fillStyle = '#1b4d63';
          ctx.fillRect(bx - 10, by + bob, 20, 4);
          ctx.fillStyle = '#fffaf0';
          ctx.beginPath();
          ctx.moveTo(bx, by - 22 + bob);
          ctx.lineTo(bx, by + bob);
          ctx.lineTo(bx + 13, by + bob);
          ctx.fill();
        }
      },
    },

    // CAPA MEDIA: sombrillas, casetas y torre de socorrista en la arena
    {
      factor: 0.38,
      spacing: 190,
      draw(ctx, sx, r, v) {
        const base = v.h * SAND_TOP + 30 + r(3) * 22;
        const kind = r(0);
        if (kind < 0.45) drawUmbrella(ctx, sx + r(1) * 60, base, UMBRELLAS[Math.floor(r(2) * UMBRELLAS.length)]);
        else if (kind < 0.68) drawHut(ctx, sx, base, HUTS[Math.floor(r(2) * HUTS.length)]);
        else if (kind < 0.8) drawLifeguard(ctx, sx + 30, base);
      },
    },

    // CAPA CERCANA: palmeras y farolas del paseo
    {
      factor: 0.68,
      spacing: 280,
      draw(ctx, sx, r, v, t, i) {
        const base = v.groundY + 2;
        if (r(0) < 0.72) {
          drawPalm(ctx, sx + r(1) * 120, base, 170 + r(2) * 90, (r(3) - 0.5) * 70, t, i);
        } else if (r(0) < 0.9) {
          streetLamp(ctx, sx + 60, base);
        }
      },
    },
  ],
};

function drawUmbrella(ctx, x, base, colors) {
  // toalla
  ctx.fillStyle = colors[0];
  ctx.globalAlpha = 0.85;
  ctx.fillRect(x + 6, base - 4, 44, 8);
  ctx.globalAlpha = 1;
  // palo
  ctx.strokeStyle = '#fff4dc';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x - 6, base - 62);
  ctx.stroke();
  // lona a gajos
  const cx = x - 6;
  const cy = base - 62;
  const rad = 36;
  const n = 6;
  for (let k = 0; k < n; k++) {
    ctx.fillStyle = colors[k % 2];
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy + 8, rad, Math.PI + (k / n) * Math.PI, Math.PI + ((k + 1) / n) * Math.PI);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#1b1030';
  ctx.beginPath();
  ctx.arc(cx, cy - 2, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawHut(ctx, x, base, color) {
  const w = 58;
  const h = 48;
  ctx.fillStyle = color;
  ctx.fillRect(x, base - h, w, h);
  // rayas
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let k = 0; k < w; k += 12) ctx.fillRect(x + k, base - h, 6, h);
  // tejado
  ctx.fillStyle = '#ff7a3d';
  ctx.beginPath();
  ctx.moveTo(x - 6, base - h);
  ctx.lineTo(x + w / 2, base - h - 22);
  ctx.lineTo(x + w + 6, base - h);
  ctx.fill();
  // puerta
  ctx.fillStyle = '#5b3a8a';
  ctx.fillRect(x + w / 2 - 9, base - 30, 18, 30);
}

function drawLifeguard(ctx, x, base) {
  ctx.strokeStyle = '#fff4dc';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 16, base);
  ctx.lineTo(x - 10, base - 60);
  ctx.moveTo(x + 16, base);
  ctx.lineTo(x + 10, base - 60);
  ctx.moveTo(x - 14, base - 25);
  ctx.lineTo(x + 14, base - 25);
  ctx.stroke();
  ctx.fillStyle = '#ff3d4f';
  ctx.fillRect(x - 20, base - 92, 40, 32);
  ctx.fillStyle = '#fff4dc';
  ctx.fillRect(x - 14, base - 84, 28, 12);
  ctx.fillStyle = '#ff3d4f';
  ctx.beginPath();
  ctx.moveTo(x - 26, base - 92);
  ctx.lineTo(x, base - 108);
  ctx.lineTo(x + 26, base - 92);
  ctx.fill();
  // banderín
  ctx.strokeStyle = '#1b1030';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, base - 108);
  ctx.lineTo(x, base - 130);
  ctx.stroke();
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(x, base - 130, 14, 9);
}

function drawPalm(ctx, x, base, height, lean, t, i) {
  const topX = x + lean;
  const topY = base - height;
  // tronco
  ctx.strokeStyle = '#8a5a34';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.quadraticCurveTo(x + lean * 0.1, base - height * 0.5, topX, topY);
  ctx.stroke();
  // anillos del tronco
  ctx.strokeStyle = '#6b4224';
  ctx.lineWidth = 2;
  for (let k = 1; k < 9; k++) {
    const f = k / 9;
    const px = x + (topX - x) * f * f + lean * 0.1 * 2 * f * (1 - f);
    const py = base - height * f;
    ctx.beginPath();
    ctx.moveTo(px - 6, py);
    ctx.lineTo(px + 6, py - 2);
    ctx.stroke();
  }
  // hojas
  const sway = Math.sin(t * 1.3 + i * 1.7) * 0.06;
  const leaves = 7;
  for (let k = 0; k < leaves; k++) {
    const a = -Math.PI + (k / (leaves - 1)) * Math.PI + sway;
    const len = 70 + (k % 2) * 16;
    const ex = topX + Math.cos(a) * len;
    const ey = topY + Math.sin(a) * len * 0.45 + 34;
    const cx = topX + Math.cos(a) * len * 0.5;
    const cy = topY + Math.sin(a) * len * 0.6 - 12;
    ctx.strokeStyle = '#167a43';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
    ctx.strokeStyle = '#2fb463';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(cx, cy - 2, ex, ey - 2);
    ctx.stroke();
  }
  // cocos
  ctx.fillStyle = '#5a3a1e';
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.arc(topX - 6 + k * 6, topY + 6 + (k % 2) * 3, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineCap = 'butt';
}
