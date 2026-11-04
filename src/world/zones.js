import { CONFIG } from '../config.js';
import { clamp } from '../core/rng.js';
import { beach } from './themes/beach.js';
import { finance } from './themes/finance.js';
import { industrial } from './themes/industrial.js';
import { hills } from './themes/hills.js';
import { port } from './themes/port.js';
import { variantFor, withVariant } from './variants.js';

/** Orden en que se suceden las zonas (y vuelve a empezar con variaciones). */
export const ZONES = [beach, finance, industrial, hills, port];

/** Tema de la zona n (0, 1, 2…), con su variación a partir de la 2.ª vuelta. */
export function zoneTheme(n) {
  const base = ZONES[n % ZONES.length];
  return withVariant(base, variantFor(n, base));
}

/**
 * Zona según la distancia recorrida.
 * k: 0→1 durante el tramo de transición hacia la zona siguiente (últimos
 * CONFIG.zones.transition m); blend: lo mismo suavizado.
 */
export function zoneAt(distance) {
  const L = CONFIG.zones.length;
  const T = CONFIG.zones.transition;
  const n = Math.floor(Math.max(0, distance) / L);
  const into = distance - n * L;
  const raw = clamp((into - (L - T)) / T, 0, 1);
  return {
    n,
    current: zoneTheme(n),
    next: zoneTheme(n + 1),
    k: raw,
    blend: raw * raw * (3 - 2 * raw), // suavizado
  };
}
