// COCHES COMO PLATAFORMA
// Los obstáculos con `roofs` (coches aparcados y patrullas) tienen un techo que
// se puede pisar. Cada paso de física se busca el techo más alto bajo el
// jugador; si viene desde arriba (o casi: CONFIG.cars.tolerance), ese techo hace
// de suelo. El choque de frente o de lado sigue haciendo daño (ver hits() de
// cada coche). Lo usa también la garantía de camino (world/pathcheck.js).

import { CONFIG } from '../config.js';

/** Altura del techo bajo el tramo [l, r] (null si no hay coche debajo). */
export function roofAt(o, l, r) {
  if (!o.alive || o.ko || !o.roofs) return null;
  let best = null;
  const E = CONFIG.cars.edge;
  for (const [a, b, dy] of o.roofs) {
    const x0 = o.x + a - (a <= 4 ? E : 0);
    const x1 = o.x + b + (b >= o.w - 4 ? E : 0);
    if (r > x0 && l < x1) best = best === null ? o.y + dy : Math.min(best, o.y + dy);
  }
  return best;
}

/**
 * Suelo efectivo para el jugador: el del mundo o el techo de un coche si está
 * encima. Devuelve { y, car }.
 */
export function supportUnder(obstacles, p, groundY) {
  if (!CONFIG.cars.enabled) return { y: groundY, car: null };
  const tol = CONFIG.cars.tolerance;
  const l = p.x - p.w / 2 + 2;
  const r = p.x + p.w / 2 - 2;
  let y = groundY;
  let car = null;
  for (const o of obstacles) {
    if (!o.roofs) continue;
    const top = roofAt(o, l, r);
    if (top === null || p.bottom > top + tol || top >= y) continue;
    y = top;
    car = o;
  }
  return { y, car };
}

/** ¿El jugador (caja b) está sobre el techo de este coche? Entonces no es un choque. */
export function onRoof(o, box) {
  const top = roofAt(o, box.l, box.r);
  return top !== null && box.b <= top + CONFIG.cars.tolerance;
}
