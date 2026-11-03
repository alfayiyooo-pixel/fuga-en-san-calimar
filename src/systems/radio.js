// RADIO CALIMAR: un locutor comenta la huida de vez en cuando.
// Archivos: audio/voces/radio_<momento>_<idioma>.mp3 (y variantes
// radio_<momento>_2_<idioma>.mp3 … _4_). Si no hay, voz del navegador con
// una de las frases de translations.js (radio.<momento>.<n>).
// Comparte la cola de voces con los personajes (nunca se solapan) y baja la
// música mientras habla.

import { CONFIG } from '../config.js';
import { t, getLang } from '../core/i18n.js';
import { Voice } from '../core/voice.js';

export const RADIO_MOMENTS = ['inicio', 'estrellas', 'zona', 'record', 'helicoptero', 'jefe', 'escondite', 'detenido'];

/** Lista de archivos que busca el juego para la radio. */
export function radioFileList(langs = ['es', 'en']) {
  const out = [];
  for (const m of RADIO_MOMENTS) for (const l of langs) out.push(`radio_${m}_${l}.mp3`);
  return out;
}

export class Radio {
  constructor() {
    this.reset();
  }

  reset() {
    this.last = -999; // s de partida de la última frase
    this.lastLine = {};
  }

  /**
   * Un momento de la partida. Según CONFIG.radio puede que el locutor hable o no.
   * time: segundos de partida (para el tiempo mínimo entre frases).
   */
  trigger(moment, time, g) {
    const R = CONFIG.radio;
    const M = R.moments[moment];
    if (!M || !R.enabled) return;
    if (!M.always && time - this.last < R.cooldown) return;
    if (Math.random() > M.chance) return;
    this.last = time;
    const lang = getLang();
    // frase al azar sin repetir la anterior de ese momento
    let n = 1 + Math.floor(Math.random() * M.lines);
    if (n === this.lastLine[moment] && M.lines > 1) n = (n % M.lines) + 1;
    this.lastLine[moment] = n;
    const text = t(`radio.${moment}.${n}`);
    const keys = [`radio_${moment}_${lang}`, ...[2, 3, 4].map((k) => `radio_${moment}_${k}_${lang}`)];
    Voice.radio(keys, lang, text, () => g?.hud.radio(text));
  }
}
