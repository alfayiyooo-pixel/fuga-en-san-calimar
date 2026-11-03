import { CONFIG } from '../config.js';
import { Sound } from './audio.js';

/**
 * Frases de los personajes en tres momentos: al cogerlo ('coger'), al activar
 * su habilidad especial ('habilidad') y al perderlo por un golpe ('perder').
 *
 * 1) Si existe audio/voces/<personaje>_<momento>_<idioma>.mp3
 *    (p. ej. aurelio_coger_es.mp3), se usa ese archivo.
 * 2) Si no, se usa la voz del navegador (Web Speech API) con un tono y una
 *    velocidad distintos para cada personaje y momento (CONFIG.audio.voices).
 *
 * Nunca se solapan dos frases: si una está sonando, la nueva espera en cola
 * (como mucho CONFIG.audio.voiceQueueWait s) o se descarta.
 * Respeta el botón de silencio y el volumen de voces de los ajustes.
 */
export const VOICE_NAMES = { veteran: 'aurelio', pilot: 'vera', wild: 'bruno' };
export const VOICE_MOMENTS = ['coger', 'habilidad', 'perder'];
const MOMENT_KEY = { coger: 'pick', habilidad: 'special', perder: 'lose' };

/** Lista completa de archivos que busca el juego (para el README y las pruebas). */
export function voiceFileList(langs = ['es', 'en']) {
  const out = [];
  for (const n of Object.values(VOICE_NAMES)) for (const m of VOICE_MOMENTS) for (const l of langs) out.push(`${n}_${m}_${l}.mp3`);
  return out;
}

class Voices {
  constructor() {
    this.cache = new Map(); // clave → AudioBuffer | null (no existe) | Promise
    this.busyUntil = 0;     // performance.now() hasta el que hay una frase sonando
    this.queued = null;     // { id, moment, lang, text, until }
    this.timer = 0;
    this.speaking = false;
  }

  /** Intenta cargar los audios del idioma (al activar el sonido y al cambiar de idioma). */
  preload(lang) {
    for (const n of Object.values(VOICE_NAMES)) for (const m of VOICE_MOMENTS) this.load(`${n}_${m}_${lang}`);
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

  get busy() {
    return this.speaking || performance.now() < this.busyUntil;
  }

  /**
   * Pide decir una frase. id: 'veteran' | 'pilot' | 'wild';
   * moment: 'coger' | 'habilidad' | 'perder'; text: frase de respaldo.
   */
  say(id, moment, lang, text) {
    if (!VOICE_NAMES[id]) return;
    this.request({ keys: [`${VOICE_NAMES[id]}_${moment}_${lang}`], lang, text, voice: id, moment, priority: 1 });
  }

  /**
   * Frase del locutor de la radio. keys: archivos candidatos (sin .mp3),
   * se usa uno al azar de los que existan. Prioridad baja: nunca pisa a un personaje.
   */
  radio(keys, lang, text, onStart) {
    this.request({ keys, lang, text, voice: 'radio', moment: null, priority: 0, radio: true, onStart });
  }

  request(req) {
    if (Sound.muted || Sound.voiceLevel <= 0) return;
    req.until = performance.now() + CONFIG.audio.voiceQueueWait * 1000;
    if (this.busy) {
      // solo una en espera: la nueva la sustituye salvo que sea menos importante
      if (!this.queued || (req.priority ?? 0) >= (this.queued.priority ?? 0)) this.queued = req;
      this.schedule();
      return;
    }
    this.play(req);
  }

  schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      const q = this.queued;
      if (!q) return;
      if (performance.now() > q.until) {
        this.queued = null; // demasiado tarde: se descarta
        return;
      }
      if (this.busy) {
        this.schedule();
        return;
      }
      this.queued = null;
      this.play(q);
    }, 120);
  }

  async play(req) {
    // se marca ocupado ya, para que no entre otra mientras se carga el archivo
    this.busyUntil = performance.now() + 4000;
    const bufs = (await Promise.all(req.keys.map((k) => {
      const c = this.cache.get(k);
      return c === undefined || c instanceof Promise ? this.load(k) : c;
    }))).filter(Boolean);
    if (Sound.muted) {
      this.busyUntil = 0;
      return;
    }
    Sound.music.duck(true);
    req.onStart?.();
    if (bufs.length) {
      const buf = bufs[Math.floor(Math.random() * bufs.length)];
      if (req.radio) Sound.radioStatic();
      const dur = Sound.playVoice(buf, req.radio, req.radio ? 0.18 : 0);
      this.busyUntil = performance.now() + (dur + (req.radio ? 0.18 : 0) + CONFIG.audio.voiceGap) * 1000;
      clearTimeout(this.duckTimer);
      this.duckTimer = setTimeout(() => Sound.music.duck(false), (dur + 0.25) * 1000);
    } else {
      this.busyUntil = 0;
      if (req.radio) Sound.radioStatic();
      this.speak(req.voice, req.moment, req.lang, req.text, req.radio ? 180 : 0);
    }
  }

  speak(id, moment, lang, text, delayMs = 0) {
    if (!('speechSynthesis' in window)) {
      Sound.music.duck(false);
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const full = lang === 'es' ? 'es-ES' : 'en-US';
    u.lang = full;
    const v = CONFIG.audio.voices[id] ?? {};
    const m = (moment && v[MOMENT_KEY[moment]]) || {};
    u.pitch = Math.max(0, Math.min(2, (v.pitch ?? 1) + (m.pitch ?? 0)));
    u.rate = Math.max(0.1, Math.min(10, (v.rate ?? 1) * (m.rate ?? 1)));
    u.volume = Math.min(1, Sound.voiceLevel);
    const voices = synth.getVoices();
    const voice = voices.find((vo) => vo.lang === full) || voices.find((vo) => vo.lang.startsWith(lang));
    if (voice) u.voice = voice;
    this.speaking = true;
    // por si el navegador no dispara 'end' (pasa en algunos móviles)
    const safety = setTimeout(() => this.done(), 9000);
    u.onend = u.onerror = () => {
      clearTimeout(safety);
      this.done();
    };
    setTimeout(() => synth.speak(u), delayMs);
  }

  done() {
    this.speaking = false;
    this.busyUntil = performance.now() + CONFIG.audio.voiceGap * 1000;
    Sound.music.duck(false);
  }

  stop() {
    Sound.music.duck(false);
    this.queued = null;
    clearTimeout(this.timer);
    this.speaking = false;
    this.busyUntil = 0;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }
}

export const Voice = new Voices();
