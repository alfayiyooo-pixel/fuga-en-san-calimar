// Patrones de colocación de pavos.
// Cada función devuelve puntos en "celdas" (1 celda = CONFIG.tokens.spacing px),
// con y hacia abajo. Luego el generador los escala y los coloca en el mundo.

import { pick } from '../core/rng.js';

export const PATTERNS = {
  line(n) {
    return Array.from({ length: n }, (_, i) => ({ x: i, y: 0 }));
  },

  wave(n) {
    const cycles = n > 12 ? 2 : 1;
    const amp = 1.8;
    return Array.from({ length: n }, (_, i) => ({ x: i, y: amp - Math.sin((i / (n - 1)) * Math.PI * 2 * cycles) * amp }));
  },

  stairs(n) {
    const up = Math.random() < 0.5;
    const step = 3;
    const levels = Math.ceil(n / step);
    return Array.from({ length: n }, (_, i) => {
      const lvl = Math.floor(i / step);
      return { x: i, y: up ? levels - 1 - lvl : lvl };
    });
  },

  zigzag(n) {
    const amp = 3;
    return Array.from({ length: n }, (_, i) => {
      const p = i % (amp * 2);
      return { x: i, y: p <= amp ? p : amp * 2 - p };
    });
  },

  block(n) {
    const rows = n > 14 ? 4 : 3;
    const cols = Math.max(3, Math.round(n / rows));
    const pts = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) pts.push({ x: c, y: r });
    return pts;
  },

  arrow() {
    return fromBitmap(pick([ARROW_SMALL, ARROW_BIG]));
  },

  /** Una palabra escrita con pavos (fuente de 5 filas). */
  word(text) {
    const pts = [];
    let cx = 0;
    for (const ch of text.toUpperCase()) {
      if (ch === ' ') {
        cx += 2;
        continue;
      }
      const glyph = FONT[ch];
      if (!glyph) continue;
      glyph.forEach((row, y) => {
        [...row].forEach((c, x) => {
          if (c === '#') pts.push({ x: cx + x, y });
        });
      });
      cx += glyph[0].length + 1;
    }
    return pts;
  },
};

export function patternSize(points) {
  let w = 0;
  let h = 0;
  for (const p of points) {
    w = Math.max(w, p.x);
    h = Math.max(h, p.y);
  }
  return { w, h };
}

function fromBitmap(rows) {
  const pts = [];
  rows.forEach((row, y) => [...row].forEach((c, x) => c === '#' && pts.push({ x, y })));
  return pts;
}

const ARROW_SMALL = [
  '....#..',
  '.....#.',
  '#######',
  '.....#.',
  '....#..',
];

const ARROW_BIG = [
  '.....#...',
  '......#..',
  '.......#.',
  '#########',
  '.......#.',
  '......#..',
  '.....#...',
];

// Fuente pixelada de 5 filas (solo las letras que usan las palabras de config.js)
const FONT = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  N: ['#..#', '##.#', '#.##', '#..#', '#..#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
};
