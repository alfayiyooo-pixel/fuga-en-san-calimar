// VIBRACIÓN (móvil). Distintas duraciones según el momento (CONFIG.haptics):
//   pick    corta: recoger un diamante o un personaje
//   hit     media: recibir un golpe (pierdes jetpack, personaje o escudo)
//   death   larga: te detienen
//   record  patrón de celebración al batir el récord
// Se desactiva en Ajustes (Save.data.settings.vibration). Sin soporte, no hace nada.

import { CONFIG } from '../config.js';
import { Save } from './storage.js';

export const Haptics = {
  get supported() {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  },

  get enabled() {
    return CONFIG.haptics.enabled && Save.data.settings.vibration !== false;
  },

  /** Vibra con el patrón del momento (ms o lista vibrar/pausa/vibrar…). */
  play(kind) {
    if (!this.supported || !this.enabled) return;
    const p = CONFIG.haptics.patterns[kind];
    if (!p) return;
    try {
      navigator.vibrate(p);
    } catch {}
  },

  stop() {
    if (this.supported) try { navigator.vibrate(0); } catch {}
  },
};
