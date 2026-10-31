// Utilidades de azar y matemáticas.

/** Hash determinista → número en [0, 1). Útil para decorado procedural estable. */
export function hash(n, seed = 0) {
  let x = Math.imul(n | 0, 374761393) + Math.imul(seed | 0, 668265263);
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

export const rand = (min = 0, max = 1) => min + Math.random() * (max - min);
export const randInt = (min, max) => Math.floor(rand(min, max + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p) => Math.random() < p;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
/** Aproxima a hacia b de forma independiente del framerate. */
export const approach = (a, b, rate, dt) => b + (a - b) * Math.exp(-rate * dt);
