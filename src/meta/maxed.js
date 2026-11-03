// CUENTA "MAXEADA" PARA PRUEBAS
// Se activa con window.SC_MAXED = true (lo pone maxeada.html) o con ?maxeada en
// la URL. Rellena el guardado UNA vez: monedas de sobra, todo comprado, mejoras
// al máximo, consumibles, fichas, nivel 30 y prestigio X. Después se juega normal.
// Ojo: en la misma web que tu partida normal la sustituye (exporta antes tu código).

import { CONFIG } from '../config.js';
import { Save } from '../core/storage.js';
import { ITEMS } from './catalog.js';

export function wantsMaxed() {
  return window.SC_MAXED === true || new URLSearchParams(location.search).has('maxeada');
}

export function applyMaxed() {
  if (!wantsMaxed()) return false;
  const S = Save.data;
  if (S.maxedSeeded) return false;
  S.wallet = 9999999;
  S.gems = 99999;
  for (const it of ITEMS) if (it.price) S.owned[it.id] = true;
  for (const k of Object.keys(S.upgrades)) S.upgrades[k] = CONFIG.shop.upgradeCosts.length;
  for (const k of Object.keys(S.consumables)) S.consumables[k] = 99;
  S.tickets = 999;
  S.vouchers = 10;
  S.prestige = CONFIG.progression.prestigeMax;
  S.level = CONFIG.progression.maxLevel;
  S.xp = 0;
  S.maxedSeeded = true;
  Save.save();
  return true;
}
