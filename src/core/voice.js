import { CONFIG } from '../config.js';
import { Sound } from './audio.js';

/**
 * Frases de los personajes al aparecer.
 * 1) Si existe audio/voces/<nombre>_<idioma>.mp3 (p. ej. veterano_es.mp3), se usa ese archivo.
 * 2) Si no, se usa la voz del navegador (Web Speech API) con tono y velocidad
 *    distintos para cada personaje (CONFIG.audio.voices).
 * Respeta el botón de silencio.
 */
export const VOICE_FILES = { veteran: 'veterano', pilot: 'chispa', wild: 'petardo' };

class Voices {
  constructor() {
    this.cache = new Map(); // clave → AudioBuffer | null (no existe) | Promise
  }

  /** Intenta cargar los audios del idioma (se llama al activar el sonido y al cambiar de idioma). */
  preload(lang) {
    for (const name of Object.values(VOICE_FILES)) this.load(`${name}_${lang}`);
  }

  load(key) {
    if (this.cache.has(key)) return this.cache.get(key);
    const ctx = Sound.ctx;
    if (!ctx) return Promise.resolve(null);
    const p = fetch(`audio/voces/${key}.mp3`)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((buf) => (buf ? ctx.decodeAudioData(buf) : null))
      .catch(() => null)
      .then((res) => {
        this.cache.set(key, res);
        return res;
      });
    this.cache.set(key, p);
    return p;
  }

  async say(id, lang, text) {
    if (Sound.muted) return;
    const key = `${VOICE_FILES[id]}_${lang}`;
    let buf = this.cache.get(key);
    if (buf === undefined || buf instanceof Promise) buf = await this.load(key);
    if (Sound.muted) return;
    if (buf) Sound.playBuffer(buf, CONFIG.audio.voiceVolume);
    else this.speak(id, lang, text);
  }

  speak(id, lang, text) {
    if (!('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const full = lang === 'es' ? 'es-ES' : 'en-US';
    u.lang = full;
    const v = CONFIG.audio.voices[id] ?? {};
    u.pitch = v.pitch ?? 1;
    u.rate = v.rate ?? 1;
    u.volume = CONFIG.audio.voiceVolume;
    const voice = synth.getVoices().find((vo) => vo.lang === full) || synth.getVoices().find((vo) => vo.lang.startsWith(lang));
    if (voice) u.voice = voice;
    synth.speak(u);
  }

  stop() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }
}

export const Voice = new Voices();
