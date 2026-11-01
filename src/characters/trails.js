// Estelas del jetpack: cada llamada emite una "unidad" de partículas
// desde la tobera (x, y). Se llama tantas veces por segundo como empuje haya.

import { rand, pick } from '../core/rng.js';

export const DEFAULT_TRAIL = { base: 'fire', veteran: 'goldsparks', pilot: 'cyan', wild: 'bigfire' };

const RAINBOW = ['#ff5d73', '#ffb627', '#ffe066', '#5fcf7a', '#19e3d0', '#6f8bff', '#c77dff'];

function fireBit(P, x, y, c1, c2, opts = {}) {
  P.spawn({
    x: x + rand(-3, 3),
    y,
    vx: opts.vx ?? rand(-70, 10),
    vy: rand(380, 560),
    life: rand(0.14, 0.26) * (opts.life ?? 1),
    size: rand(5, 8) * (opts.size ?? 1),
    sizeEnd: 1,
    color: Math.random() < 0.5 ? c1 : c2,
    additive: true,
  });
}

function smoke(P, x, y, color = 'rgba(235, 230, 250, 0.4)', size = 1) {
  P.spawn({ x, y: y + 20, vx: rand(-40, 0), vy: rand(80, 160), life: rand(0.45, 0.8), size: rand(4, 6) * size, sizeEnd: 14 * size, color, drag: 3 });
}

export function emitTrail(P, id, x, y, t) {
  switch (id) {
    case 'goldsparks':
      fireBit(P, x, y, '#ffe9a8', '#ffd23f');
      if (Math.random() < 0.3) P.spawn({ x, y, vx: rand(-60, 20), vy: rand(60, 160), life: 0.6, size: 2, sizeEnd: 0, color: '#fff3c0', additive: true, drag: 1 });
      break;
    case 'cyan':
      fireBit(P, x, y, '#7ff7ff', '#19e3d0', { vx: rand(-260, -120), life: 1.3 });
      break;
    case 'bigfire':
      fireBit(P, x, y + 6, '#ffb627', '#ff3d1f', { size: 1.5 });
      if (Math.random() < 0.4) smoke(P, x, y + 4, 'rgba(70, 55, 60, 0.45)', 1.3);
      break;
    case 'bills':
      fireBit(P, x, y, '#ffd23f', '#ff7a3d', { size: 0.7 });
      if (Math.random() < 0.25) P.spawn({ x, y: y + 8, vx: rand(-120, -20), vy: rand(60, 200), life: 1, size: 4, sizeEnd: 4, color: '#5fd27b', shape: 'rect', spin: rand(-10, 10), gravity: 300, drag: 1.5 });
      break;
    case 'bubbles':
      fireBit(P, x, y, '#bff4ff', '#7fd8ff', { size: 0.6 });
      if (Math.random() < 0.35) P.spawn({ x, y: y + 10, vx: rand(-80, -20), vy: rand(-60, 40), life: rand(0.8, 1.3), size: rand(3, 6), sizeEnd: rand(6, 9), color: 'rgba(190, 240, 255, 0.85)', shape: 'ring', drag: 1 });
      break;
    case 'goldrain':
      fireBit(P, x, y, '#fff3b0', '#ffd23f');
      if (Math.random() < 0.35) P.spawn({ x, y: y + 6, vx: rand(-140, -40), vy: rand(40, 180), life: 1.1, size: 4, sizeEnd: 3, color: '#ffd23f', shape: 'rect', spin: rand(-12, 12), gravity: 400, additive: true });
      if (Math.random() < 0.2) P.spawn({ x, y, life: 0.4, size: 4, sizeEnd: 16, color: 'rgba(255, 220, 90, 0.8)', shape: 'glow', additive: true });
      break;
    case 'gears':
      fireBit(P, x, y, '#ffe9a8', '#ff9a3d', { size: 0.8 });
      if (Math.random() < 0.25) P.spawn({ x, y: y + 6, vx: rand(-120, -20), vy: rand(80, 200), life: 0.9, size: 4, sizeEnd: 3, color: pick(['#c9a46a', '#9aa3b5']), shape: 'gear', spin: rand(-8, 8), gravity: 500 });
      break;
    case 'cards':
      fireBit(P, x, y, '#ffe9a8', '#ffd23f', { size: 0.8 });
      if (Math.random() < 0.25) P.spawn({ x, y: y + 6, vx: rand(-150, -30), vy: rand(40, 160), life: 1, size: 4.5, sizeEnd: 4, color: pick(['#ffffff', '#ffffff', '#ff3d4f']), shape: 'rect', spin: rand(-6, 6), gravity: 250, drag: 1.2 });
      break;
    case 'sand':
      fireBit(P, x, y, '#ffe9a8', '#e8b52c', { size: 0.8 });
      for (let k = 0; k < 2; k++) P.spawn({ x: x + rand(-4, 4), y: y + 6, vx: rand(-60, 10), vy: rand(40, 120), life: rand(0.8, 1.4), size: 1.6, sizeEnd: 1, color: pick(['#f4d58a', '#fff3c0', '#d9a53a']), gravity: 260, additive: Math.random() < 0.3 });
      break;
    case 'colorsmoke':
      fireBit(P, x, y, '#7ff7ff', '#19e3d0', { vx: rand(-200, -80) });
      if (Math.random() < 0.5) smoke(P, x, y, `hsla(${(t * 90 + rand(0, 60)) % 360}, 85%, 65%, 0.45)`, 1.2);
      break;
    case 'bolts':
      fireBit(P, x, y, '#7ff7ff', '#ffffff', { vx: rand(-220, -100) });
      if (Math.random() < 0.3) P.spawn({ x: x + rand(-6, 6), y: y + rand(0, 20), vx: rand(-300, -100), life: 0.15, size: 7, sizeEnd: 2, color: '#e8ffff', shape: 'rect', rot: rand(-1, 1), additive: true });
      break;
    case 'rainbow':
      P.spawn({ x, y, vx: rand(-260, -160), vy: rand(200, 320), life: 0.5, size: 7, sizeEnd: 2, color: RAINBOW[Math.floor(t * 20) % RAINBOW.length], additive: true });
      if (Math.random() < 0.4) P.spawn({ x, y, vx: rand(-200, -120), vy: rand(100, 200), life: 0.7, size: 3, sizeEnd: 0, color: pick(RAINBOW), additive: true });
      break;
    case 'confetti':
      fireBit(P, x, y + 6, '#ffb627', '#ff3d1f', { size: 1.2 });
      if (Math.random() < 0.5) P.spawn({ x, y: y + 6, vx: rand(-150, 0), vy: rand(-40, 160), life: 1.1, size: 3, sizeEnd: 3, color: pick(RAINBOW), shape: 'rect', spin: rand(-14, 14), gravity: 300, drag: 1.5 });
      break;
    case 'crackers':
      fireBit(P, x, y + 6, '#ffb627', '#ff3d1f', { size: 1.2 });
      if (Math.random() < 0.08) P.burst(x + rand(-30, 0), y + rand(10, 40), 8, { color: pick(['#ffd23f', '#ff5d73', '#ffffff']), speed: 220, life: 0.3, size: 2.5, sizeEnd: 0, additive: true });
      break;
    case 'fireworks':
      fireBit(P, x, y + 6, '#ffb627', '#ff3d1f', { size: 1.2 });
      if (Math.random() < 0.06) {
        const c = pick(RAINBOW);
        P.burst(x - rand(20, 80), y + rand(-60, 40), 16, { color: c, speed: 260, life: 0.7, size: 3, sizeEnd: 0, additive: true, gravity: 120 });
        P.spawn({ x: x - 50, y, life: 0.3, size: 6, sizeEnd: 40, color: 'rgba(255, 240, 200, 0.7)', shape: 'glow', additive: true });
      }
      break;
    case 'comet':
      P.spawn({ x, y, vx: rand(-320, -220), vy: rand(150, 260), life: 0.6, size: 9, sizeEnd: 1, color: pick(['#bfe9ff', '#ffffff', '#c77dff']), additive: true });
      if (Math.random() < 0.3) P.spawn({ x, y, life: 0.5, size: 8, sizeEnd: 26, color: 'rgba(170, 200, 255, 0.7)', shape: 'glow', additive: true, vx: -200 });
      break;
    default:
      fireBit(P, x, y, '#ffd23f', '#ff7a3d');
      if (Math.random() < 0.35) smoke(P, x, y);
  }
}
