import { CONFIG } from '../config.js';
import { clamp } from '../core/rng.js';
import { beach } from './themes/beach.js';
import { finance } from './themes/finance.js';
import { industrial } from './themes/industrial.js';
import { hills } from './themes/hills.js';
import { port } from './themes/port.js';

/** Orden en que se suceden las zonas (y vuelve a empezar). */
export const ZONES = [beach, finance, industrial, hills, port];

/**
 * Zona según la distancia recorrida.
 * blend: 0→1 durante el fundido hacia la zona siguiente.
 */
export function zoneAt(distance) {
  const L = CONFIG.zones.length;
  const T = CONFIG.zones.transition;
  const n = Math.floor(Math.max(0, distance) / L);
  const into = distance - n * L;
  const raw = clamp((into - (L - T)) / T, 0, 1);
  return {
    n,
    current: ZONES[n % ZONES.length],
    next: ZONES[(n + 1) % ZONES.length],
    blend: raw * raw * (3 - 2 * raw), // suavizado
  };
}
