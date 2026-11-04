// Zona 1 — PLAYA CORAL (atardecer)
// Sol enorme hundiéndose en el mar, ciudad lejana en el cabo,
// chiringuitos con guirnaldas de bombillas y palmeras a contraluz.

import { sea, sunReflection, streetLamp, INK, glints, shoreWaves } from './shapes.js';
import { hash } from '../../core/rng.js';
import { drawGlow } from '../../fx/sprites.js';

const HORIZON = 0.6;
const SAND_TOP = 0.74;

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
  sky: ['#2a1f5e', '#7a3b85', '#e8656e', '#ffb877', '#ffd9a0'],
  celestial: { type: 'sun', x: 0.7, y: 296, r: 62, color: '#ffc66a', glow: 'rgba(255, 170, 90, 0.85)' },
  clouds: { color: 'rgba(255, 196, 170, 0.95)', shade: 'rgba(150, 70, 120, 0.55)', rim: 'rgba(255, 236, 190, 0.9)' },
  haze: 'rgba(255, 160, 120, 0.4)',
  skyline: { factor: 0.06, base: HORIZON, min: 10, max: 46, color: '#6b3b6e', lit: '#ffd38a' },
  ground: { top: '#e0a868', body: '#a8653a', line: '#7c4826', edge: '#4a2614', joint: 48, beams: true, grain: 'rgba(90, 40, 20, 0.28)', nails: 'rgba(60, 30, 20, 0.6)' },

  rays: { color: 'rgba(255, 200, 140, 0.07)' },

  backdrop(ctx, v, camX, t, q) {
    const hy = v.h * HORIZON;
    const sy = v.h * SAND_TOP;
    sea(ctx, v, camX, t, hy, sy, '#d0708a', '#3b3c88', 'rgba(255, 220, 180, 0.6)');
    if (!this.celestial.hidden) sunReflection(ctx, v.w * this.celestial.x, hy, 8, t, 'rgba(255, 200, 120, 0.8)');
    if (q.detail) {
      if (!this.celestial.hidden) glints(ctx, v.w * this.celestial.x, hy + 4, 150, sy - hy - 10, t, 'rgba(255, 240, 200, 0.95)', 14);
      shoreWaves(ctx, v, camX, t, hy + 18, sy - 6, 'rgba(255, 236, 220, 0.5)');
    }

    // arena mojada y espuma que sube y baja por la orilla
    const tide = Math.sin(t * 0.9) * 3;
    ctx.fillStyle = '#c98a6a';
    ctx.fillRect(0, sy - 2, v.w, 9);
    ctx.fillStyle = 'rgba(255, 236, 220, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, sy);
    const foamOff = camX * 0.35;
    for (let x = 0; x <= v.w; x += 16) ctx.lineTo(x, sy - 3 + tide - 3 * Math.sin((x + foamOff) * 0.04 + t * 1.5));
    ctx.lineTo(v.w, sy + 4 + tide);
    ctx.lineTo(0, sy + 4 + tide);
    ctx.fill();
    if (q.detail) {
      ctx.strokeStyle = 'rgba(255, 245, 235, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= v.w; x += 16) {
        const yy = sy + 7 + tide * 1.6 + 2 * Math.sin((x + foamOff) * 0.06 - t * 1.2);
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }

    // arena cálida del atardecer
    const sand = ctx.createLinearGradient(0, sy, 0, v.groundY);
    sand.addColorStop(0, '#f6c48d');
    sand.addColorStop(1, '#d99a68');
    ctx.fillStyle = sand;
    ctx.fillRect(0, sy + 9 + tide, v.w, v.groundY - sy);
    if (q.detail) sandDetails(ctx, v, camX, sy + 14, v.groundY);
  },

  foreground: { chance: 0.5, kinds: ['grass', 'grass', 'posts'], color: 'rgba(58, 26, 44, 0.92)', rim: 'rgba(110, 50, 60, 0.9)' },

  layers: [
    // islas y veleros a contraluz
    {
      factor: 0.12,
      spacing: 420,
      draw(ctx, sx, r, v, t) {
        const hy = v.h * HORIZON;
        if (r(0) < 0.5) {
          const w = 120 + r(1) * 220;
          const h = 16 + r(2) * 34;
          ctx.fillStyle = '#5b2f6b';
          ctx.beginPath();
          ctx.ellipse(sx + w / 2, hy + 2, w / 2, h, 0, Math.PI, 0);
          ctx.fill();
          if (r(3) < 0.5) {
            ctx.fillStyle = '#f4e1d8';
            ctx.fillRect(sx + w * 0.55, hy - h - 12, 6, 14);
            drawGlow(ctx, sx + w * 0.55 + 3, hy - h - 13, 14, 'rgba(255, 230, 150, 0.9)', 0.6 + 0.4 * Math.sin(t * 3));
          }
        }
        if (r(4) < 0.6) {
          const bx = sx + r(5) * 380;
          const by = hy + 10 + r(6) * 22;
          const bob = Math.sin(t * 1.5 + r(7) * 6) * 1.5;
          ctx.fillStyle = '#2b1f4a';
          ctx.fillRect(bx - 10, by + bob, 20, 4);
          ctx.beginPath();
          ctx.moveTo(bx, by - 22 + bob);
          ctx.lineTo(bx, by + bob);
          ctx.lineTo(bx + 13, by + bob);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 200, 140, 0.8)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(bx + 1, by - 21 + bob);
          ctx.lineTo(bx + 13, by + bob);
          ctx.stroke();
        }
      },
    },

    // sombrillas, casetas, chiringuito y socorrista
    {
      factor: 0.38,
      spacing: 200,
      draw(ctx, sx, r, v, t, i) {
        const base = v.h * SAND_TOP + 30 + r(3) * 22;
        const kind = r(0);
        if (kind < 0.38) drawUmbrella(ctx, sx + r(1) * 60, base, UMBRELLAS[Math.floor(r(2) * UMBRELLAS.length)], r);
        else if (kind < 0.58) drawHut(ctx, sx, base, HUTS[Math.floor(r(2) * HUTS.length)], r);
        else if (kind < 0.78) drawBar(ctx, sx, base, t, i);
        else if (kind < 0.88) drawLifeguard(ctx, sx + 30, base);
      },
    },

    // palmeras a contraluz y farolas encendidas
    {
      factor: 0.68,
      spacing: 280,
      draw(ctx, sx, r, v, t, i) {
        const base = v.groundY + 2;
        if (r(0) < 0.72) drawPalm(ctx, sx + r(1) * 120, base, 150 + r(2) * 120, (r(3) - 0.5) * 90, t, i, r);
        else if (r(0) < 0.9) streetLamp(ctx, sx + 60, base, '#2a1838', '#ffe9a8', true);
      },
    },
  ],
};

function shadowOnSand(ctx, x, y, w) {
  ctx.fillStyle = 'rgba(90, 40, 60, 0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, w, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Sombrilla con variaciones (tamaño, inclinación, gajos y toalla). */
function drawUmbrella(ctx, x, base, colors, r) {
  const sz = 0.8 + r(5) * 0.45;
  const tilt = (r(6) - 0.6) * 20;
  const pole = 62 * sz;
  shadowOnSand(ctx, x + 10, base, 40 * sz);
  if (r(7) < 0.75) {
    ctx.fillStyle = r(8) < 0.5 ? colors[0] : UMBRELLAS[Math.floor(r(9) * UMBRELLAS.length)][0];
    ctx.save();
    ctx.translate(x + 28, base);
    ctx.rotate((r(10) - 0.5) * 0.3);
    ctx.fillRect(-22, -4, 44, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(-22, -1, 44, 2);
    ctx.restore();
  }
  ctx.strokeStyle = '#fff4dc';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x + tilt * 0.3 - 6, base - pole);
  ctx.stroke();
  const cx = x + tilt * 0.3 - 6;
  const cy = base - pole;
  const rad = 36 * sz;
  const n = 5 + Math.floor(r(11) * 4);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt * 0.012);
  ctx.translate(-cx, -cy);
  for (let k = 0; k < n; k++) {
    ctx.fillStyle = colors[k % 2];
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy + 8, rad, Math.PI + (k / n) * Math.PI, Math.PI + ((k + 1) / n) * Math.PI);
    ctx.closePath();
    ctx.fill();
  }
  // sombreado de la lona (lado contrario al sol)
  ctx.fillStyle = 'rgba(80, 30, 80, 0.22)';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy + 8, rad, Math.PI, Math.PI * 1.45);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy + 8, rad, Math.PI, 0);
  ctx.stroke();
  ctx.restore();
}

function drawHut(ctx, x, base, color, r) {
  const w = 50 + Math.floor(r(5) * 22);
  const h = 42 + Math.floor(r(6) * 14);
  shadowOnSand(ctx, x + w / 2 + 8, base, 38);
  ctx.fillStyle = color;
  ctx.fillRect(x, base - h, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let k = 0; k < w; k += 12) ctx.fillRect(x + k, base - h, 6, h);
  ctx.fillStyle = 'rgba(80, 30, 80, 0.2)';
  ctx.fillRect(x, base - h, 10, h);
  ctx.fillStyle = ['#ff7a3d', '#19c3b1', '#ff5d73', '#7b5cff'][Math.floor(r(7) * 4)];
  ctx.beginPath();
  ctx.moveTo(x - 6, base - h);
  ctx.lineTo(x + w / 2, base - h - 16 - r(8) * 12);
  ctx.lineTo(x + w + 6, base - h);
  ctx.fill();
  ctx.fillStyle = '#5b3a8a';
  ctx.fillRect(x + w / 2 - 9, base - 30, 18, 30);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, base - h, w, h);
}

/** Chiringuito con techo de paja y guirnalda de bombillas. */
function drawBar(ctx, x, base, t, i) {
  shadowOnSand(ctx, x + 60, base, 60);
  ctx.fillStyle = '#8a5a34';
  ctx.fillRect(x + 4, base - 62, 6, 62);
  ctx.fillRect(x + 110, base - 62, 6, 62);
  ctx.fillStyle = '#c98b52';
  ctx.fillRect(x + 10, base - 30, 100, 30);
  ctx.fillStyle = '#a86d3c';
  for (let k = x + 14; k < x + 108; k += 10) ctx.fillRect(k, base - 30, 3, 30);
  // techo de paja
  ctx.fillStyle = '#e8b45a';
  ctx.beginPath();
  ctx.moveTo(x - 12, base - 60);
  ctx.lineTo(x + 60, base - 86);
  ctx.lineTo(x + 132, base - 60);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#b07d2f';
  ctx.lineWidth = 2;
  for (let k = 0; k < 12; k++) {
    ctx.beginPath();
    ctx.moveTo(x - 10 + k * 12, base - 60);
    ctx.lineTo(x - 8 + k * 12, base - 54);
    ctx.stroke();
  }
  // guirnalda
  ctx.strokeStyle = 'rgba(40, 20, 40, 0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 4, base - 56);
  ctx.quadraticCurveTo(x + 60, base - 36, x + 116, base - 56);
  ctx.stroke();
  const colors = ['rgba(255, 210, 63, 0.9)', 'rgba(255, 93, 115, 0.9)', 'rgba(25, 195, 177, 0.9)'];
  for (let k = 0; k < 7; k++) {
    const f = (k + 0.5) / 7;
    const bx = x + 4 + f * 112;
    const by = base - 56 + Math.sin(f * Math.PI) * 18;
    const on = Math.sin(t * 4 + k + i) > -0.6;
    drawGlow(ctx, bx, by + 2, 9, colors[k % 3], on ? 0.9 : 0.25);
    ctx.fillStyle = on ? '#fff8e0' : '#998';
    ctx.beginPath();
    ctx.arc(bx, by + 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLifeguard(ctx, x, base) {
  shadowOnSand(ctx, x + 10, base, 30);
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
  ctx.fillStyle = '#d42a3d';
  ctx.beginPath();
  ctx.moveTo(x - 26, base - 92);
  ctx.lineTo(x, base - 108);
  ctx.lineTo(x + 26, base - 92);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, base - 108);
  ctx.lineTo(x, base - 130);
  ctx.stroke();
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(x, base - 130, 14, 9);
}

/** Palmera a contraluz con variaciones: altura, inclinación, grosor, hojas y cocos. */
function drawPalm(ctx, x, base, height, lean, t, i, r) {
  const topX = x + lean;
  const topY = base - height;
  const thick = 9 + r(4) * 7;
  const leaves = 6 + Math.floor(r(5) * 4);
  const leafLen = 58 + r(6) * 34;
  const droop = 0.35 + r(7) * 0.3;
  const leafCol = ['#173a3a', '#1d3f2f', '#22343f'][Math.floor(r(8) * 3)];
  const nuts = Math.floor(r(9) * 4);
  ctx.lineCap = 'round';
  // tronco a contraluz con borde iluminado
  ctx.strokeStyle = '#4a2a35';
  ctx.lineWidth = thick;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.quadraticCurveTo(x + lean * 0.1, base - height * 0.5, topX, topY);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 170, 110, 0.75)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 4, base);
  ctx.quadraticCurveTo(x + 4 + lean * 0.1, base - height * 0.5, topX + 4, topY);
  ctx.stroke();
  ctx.strokeStyle = '#2f1a24';
  ctx.lineWidth = 2;
  for (let k = 1; k < 9; k++) {
    const f = k / 9;
    const px = x + (topX - x) * f * f + lean * 0.2 * f * (1 - f);
    const py = base - height * f;
    ctx.beginPath();
    ctx.moveTo(px - thick * 0.45, py);
    ctx.lineTo(px + thick * 0.45, py - 2);
    ctx.stroke();
  }
  const sway = Math.sin(t * 1.3 + i * 1.7) * 0.06;
  for (let k = 0; k < leaves; k++) {
    const a = -Math.PI + (k / (leaves - 1)) * Math.PI + sway + (hash(i * 13 + k, 40) - 0.5) * 0.25;
    const len = leafLen + (k % 2) * 16 + hash(i * 7 + k, 41) * 12;
    const ex = topX + Math.cos(a) * len;
    const ey = topY + Math.sin(a) * len * droop + len * 0.42;
    const cx = topX + Math.cos(a) * len * 0.5;
    const cy = topY + Math.sin(a) * len * 0.6 - 12;
    ctx.strokeStyle = leafCol;
    ctx.lineWidth = 9 + (k % 3) * 2;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 160, 100, 0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(topX, topY - 3);
    ctx.quadraticCurveTo(cx, cy - 5, ex, ey - 4);
    ctx.stroke();
  }
  ctx.fillStyle = '#2f1a24';
  for (let k = 0; k < nuts; k++) {
    ctx.beginPath();
    ctx.arc(topX - 6 + k * 6, topY + 6 + (k % 2) * 3, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineCap = 'butt';
}

/** Huellas, conchas, toallas y ondas en la arena (se mueven con la capa media). */
function sandDetails(ctx, v, camX, top, bottom) {
  const f = 0.45;
  const step = 70;
  const off = camX * f;
  const i0 = Math.floor(off / step) - 1;
  const i1 = Math.ceil((off + v.w) / step) + 1;
  for (let i = i0; i <= i1; i++) {
    const x = i * step - off;
    const h = (k) => hash(i, 700 + k);
    const y = top + h(1) * (bottom - top - 8);
    const kind = h(0);
    if (kind < 0.3) {
      // huellas
      ctx.fillStyle = 'rgba(150, 80, 60, 0.22)';
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.ellipse(x + k * 11, y + (k % 2) * 6, 3, 1.6, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (kind < 0.45) {
      // concha
      ctx.fillStyle = h(2) < 0.5 ? '#fff0e6' : '#ffc2b8';
      ctx.beginPath();
      ctx.arc(x, y, 3.2, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(160, 90, 80, 0.5)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let k = -1; k <= 1; k++) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + k * 2.5, y - 2.6);
      }
      ctx.stroke();
    } else if (kind < 0.75) {
      // ondas de viento en la arena
      ctx.strokeStyle = 'rgba(255, 230, 190, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 9, y - 2, x + 18, y);
      ctx.moveTo(x + 6, y + 4);
      ctx.quadraticCurveTo(x + 15, y + 2, x + 24, y + 4);
      ctx.stroke();
    } else if (kind < 0.8) {
      // piedrecitas
      ctx.fillStyle = 'rgba(120, 70, 60, 0.35)';
      ctx.beginPath();
      ctx.ellipse(x, y, 2.4, 1.6, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 5, y + 2, 1.6, 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
