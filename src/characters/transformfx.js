// Efectos de transformación (se pueden cambiar en el vestuario).

import { rand, pick } from '../core/rng.js';

export const DEFAULT_FX = { veteran: 'clock', pilot: 'skid', wild: 'boom' };
const RAINBOW = ['#ff5d73', '#ffb627', '#ffe066', '#5fcf7a', '#19e3d0', '#6f8bff', '#c77dff'];

/**
 * P = partículas, (x, y) = centro, groundY, shake(amount), color del personaje.
 * Devuelve cuánto temblor y destello pide el efecto.
 */
export function playTransformFx(fx, P, x, y, groundY, color) {
  const imp = { important: true };
  switch (fx) {
    case 'clock':
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        P.spawn({ x: x + Math.cos(a) * 46, y: y + Math.sin(a) * 46, vx: -Math.sin(a) * 90, vy: Math.cos(a) * 90, life: 0.9, size: 4, sizeEnd: 1, color: '#ffd23f', shape: 'rect', rot: a, additive: true, ...imp });
      }
      P.burst(x, y, 16, { color: '#fff3c0', speed: 120, life: 1, size: 2.5, sizeEnd: 0, additive: true, drag: 1.5, ...imp });
      return { shake: 0.2, flash: 0.5 };
    case 'coins':
      for (let k = 0; k < 30; k++) P.spawn({ x: x + rand(-140, 140), y: y - rand(120, 220), vx: rand(-30, 30), vy: rand(100, 300), life: 1.2, size: 4, sizeEnd: 4, color: pick(['#ffd23f', '#ffe27a', '#5fd27b']), shape: 'rect', spin: rand(-10, 10), gravity: 700, ...imp });
      P.burst(x, y, 14, { color: '#ffd23f', speed: 300, life: 0.5, size: 3, sizeEnd: 0, additive: true, ...imp });
      return { shake: 0.25, flash: 0.5 };
    case 'pendulum':
      for (let k = 0; k < 5; k++) P.spawn({ x, y, life: 0.6 + k * 0.15, size: 6, sizeEnd: 60 + k * 35, color: k % 2 ? '#c77dff' : '#ffd23f', shape: 'ring', additive: true, ...imp });
      for (let k = 0; k < 20; k++) {
        const a = Math.PI * (0.15 + 0.7 * (k / 19));
        P.spawn({ x: x + Math.cos(a) * 90, y: y - 90 + Math.sin(a) * 90, vx: Math.sin(a) * 160, vy: -Math.cos(a) * 160, life: 0.9, size: 5, sizeEnd: 0, color: '#ffe9a8', additive: true, drag: 1, ...imp });
      }
      return { shake: 0.3, flash: 0.7 };
    case 'skid':
      for (let k = 0; k < 14; k++) P.spawn({ x: x + rand(-20, 40), y: y + rand(-30, 30), vx: rand(-900, -500), life: 0.35, size: 3, sizeEnd: 1, color: '#7ff7ff', shape: 'rect', additive: true, ...imp });
      P.burst(x - 10, groundY - 6, 14, { color: 'rgba(220, 220, 235, 0.6)', speed: 160, life: 1, size: 8, sizeEnd: 22, drag: 2.5, vy: -40, ...imp });
      P.burst(x, y, 12, { color: '#19e3d0', speed: 420, life: 0.3, size: 2, sizeEnd: 0, additive: true, ...imp });
      return { shake: 0.35, flash: 0.6 };
    case 'flag':
      for (let k = 0; k < 40; k++) {
        const a = rand(0, Math.PI * 2);
        const s = rand(150, 420);
        P.spawn({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.9, size: 4, sizeEnd: 4, color: k % 2 ? '#1b1030' : '#ffffff', shape: 'rect', spin: rand(-8, 8), drag: 2, gravity: 200, ...imp });
      }
      return { shake: 0.3, flash: 0.6 };
    case 'neontrack':
      for (let k = 0; k < 30; k++) {
        const dir = k % 2 ? 1 : -1;
        P.spawn({ x, y: groundY - 4, vx: dir * rand(200, 700), vy: 0, life: 0.8, size: 5, sizeEnd: 1, color: k % 4 < 2 ? '#ff3d7f' : '#19e3d0', additive: true, ...imp });
      }
      for (let k = 0; k < 3; k++) P.spawn({ x, y, life: 0.5 + k * 0.1, size: 8, sizeEnd: 100 + k * 30, color: k % 2 ? '#ff3d7f' : '#19e3d0', shape: 'ring', additive: true, ...imp });
      return { shake: 0.35, flash: 0.7 };
    case 'pinata':
      for (let k = 0; k < 40; k++) P.spawn({ x, y, vx: rand(-260, 260), vy: rand(-520, -160), life: 1.3, size: 4, sizeEnd: 4, color: k % 3 ? pick(RAINBOW) : '#5fd27b', shape: 'rect', spin: rand(-14, 14), gravity: 900, ...imp });
      return { shake: 0.5, flash: 0.8 };
    case 'volcano':
      for (let k = 0; k < 40; k++) P.spawn({ x: x + rand(-14, 14), y: groundY - 6, vx: rand(-160, 160), vy: rand(-760, -380), life: rand(0.8, 1.3), size: rand(4, 7), sizeEnd: 1, color: pick(['#ff3d1f', '#ffb627', '#ffd23f']), additive: true, gravity: 900, ...imp });
      P.burst(x, groundY - 10, 16, { color: 'rgba(60, 40, 50, 0.7)', speed: 160, life: 1.3, size: 10, sizeEnd: 28, drag: 2, vy: -120, ...imp });
      P.spawn({ x, y: groundY - 20, life: 0.7, size: 30, sizeEnd: 220, color: 'rgba(255, 110, 40, 0.95)', shape: 'glow', additive: true, ...imp });
      return { shake: 0.8, flash: 1 };
    case 'boom':
    default:
      P.spawn({ x, y, life: 0.6, size: 30, sizeEnd: 230, color: 'rgba(255, 120, 40, 0.95)', shape: 'glow', additive: true, ...imp });
      P.spawn({ x, y, life: 0.55, size: 10, sizeEnd: 220, color: '#ff3d4f', shape: 'ring', additive: true, ...imp });
      P.burst(x, y, 26, { color: '#ffb627', speed: 480, life: 0.6, size: 5, sizeEnd: 0, additive: true, ...imp });
      P.burst(x, y, 14, { color: 'rgba(60, 40, 50, 0.7)', speed: 200, life: 1.2, size: 10, sizeEnd: 26, drag: 2, ...imp });
      P.burst(x, y, 10, { color: '#5a4a3a', speed: 380, life: 1.1, size: 4, shape: 'rect', spin: 14, gravity: 900, ...imp });
      return { shake: 0.75, flash: 1 };
  }
}
