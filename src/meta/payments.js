import { CONFIG } from '../config.js';

/*
 * PAGOS CON DINERO REAL — MODO SIMULADO
 * ------------------------------------
 * Ahora mismo NO se cobra nada: CONFIG.shop.payments.enabled = false.
 * Para conectar una pasarela real (ver README, sección "Pagos reales"):
 *   1. Un servidor propio crea la orden (id del pack, usuario) y devuelve
 *      una sesión de pago (Stripe Checkout, o Google Play Billing / App Store
 *      si se publica como app).
 *   2. El cliente abre esa sesión de pago.
 *   3. El servidor recibe la confirmación (webhook / recibo), la VALIDA
 *      con la pasarela y abona los diamantes en la cuenta del jugador.
 *   4. El cliente consulta su saldo al servidor (nunca se abona en local).
 * Regla: con dinero real solo se compran diamantes (o artículos concretos),
 * nunca tiradas aleatorias.
 */

/** Intenta comprar un pack. Devuelve { ok, reason }. */
export async function purchasePack(pack) {
  if (!CONFIG.shop.payments.enabled) return { ok: false, reason: 'disabled' };
  // const session = await fetch('/api/checkout', { method: 'POST', body: JSON.stringify({ pack: pack.id }) }).then((r) => r.json());
  // window.location = session.url;
  return { ok: false, reason: 'not-configured' };
}

/** Precio con formato local (0,99 € / €0.99). */
export function formatPrice(amount, lang) {
  return new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-IE', { style: 'currency', currency: CONFIG.shop.payments.currency }).format(amount);
}
