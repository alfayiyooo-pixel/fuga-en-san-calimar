// Sonidos sintetizados con Web Audio API (sin archivos externos).
// El contexto de audio se crea en la primera pulsación del jugador,
// como exigen los navegadores.

import { CONFIG } from '../config.js';
import { MusicEngine } from './music.js';

const MAJOR = [0, 2, 4, 5, 7, 9, 11];

class AudioFx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    // volúmenes del jugador (0-1), multiplican a los de CONFIG.audio
    this.levels = { music: 1, sfx: 1, voice: 1 };
    this.lastCoin = 0;
    this.music = new MusicEngine(this);
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      // salida general (silencio) → destino; efectos, voces y música van por separado
      this.out = this.ctx.createGain();
      this.out.gain.value = this.muted ? 0 : 1;
      this.out.connect(this.ctx.destination);
      this.master = this.ctx.createGain(); // bus de efectos
      this.master.connect(this.out);
      this.voiceBus = this.ctx.createGain();
      this.voiceBus.connect(this.out);
      this.applyLevels();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.out) this.out.gain.value = m ? 0 : 1;
    if (m && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  /** Volúmenes del menú de ajustes (0-1 cada uno). */
  setLevels(levels) {
    Object.assign(this.levels, levels);
    this.applyLevels();
  }

  applyLevels() {
    if (!this.ctx) return;
    const A = CONFIG.audio;
    this.master.gain.value = A.sfxVolume * this.levels.sfx;
    this.voiceBus.gain.value = A.voiceVolume * this.levels.voice;
    this.music.applyLevel();
  }

  /** Volumen efectivo de las voces (para la voz del navegador). */
  get voiceLevel() {
    return this.muted ? 0 : CONFIG.audio.voiceVolume * this.levels.voice;
  }

  /** Reproduce un audio ya decodificado por el bus de voces. Devuelve su duración. */
  playVoice(buf) {
    if (!this.ready) return 0;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.voiceBus);
    src.start();
    return buf.duration;
  }

  get ready() {
    return this.ctx && !this.muted && this.ctx.state === 'running';
  }

  tone({ freq, type = 'square', dur = 0.1, vol = 0.25, slide = 0, delay = 0, attack = 0.004 }) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  }

  noise({ dur = 0.2, vol = 0.3, freq = 1200, q = 0.8, type = 'lowpass', delay = 0, slide = 0 }) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t0);
    if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t0 + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0);
  }

  // ---------- efectos del juego ----------

  /** Pavo normal: el tono sube por la escala mayor con cada pavo seguido. */
  coin(chain) {
    const now = performance.now();
    if (now - this.lastCoin < 30) return; // evita saturar con el imán
    this.lastCoin = now;
    const step = Math.min(chain - 1, 16);
    const semis = 12 * Math.floor(step / 7) + MAJOR[step % 7];
    const f = 740 * 2 ** (semis / 12);
    this.tone({ freq: f, type: 'square', dur: 0.06, vol: 0.09 });
    this.tone({ freq: f * 1.5, type: 'triangle', dur: 0.12, vol: 0.1, delay: 0.035 });
  }

  /** Orbe de experiencia: campanita de cristal que sube con la racha. */
  orb(chain = 1) {
    const f = 880 * 2 ** (Math.min(chain - 1, 8) * 2 / 12);
    this.tone({ freq: f, type: 'sine', dur: 0.25, vol: 0.12, slide: 1.5 });
    this.tone({ freq: f * 2.01, type: 'sine', dur: 0.18, vol: 0.05, delay: 0.03 });
  }

  /** Diamante: acorde cristalino con brillo. */
  gem() {
    [0, 7, 12, 16, 19, 24].forEach((s, i) => {
      this.tone({ freq: 1046 * 2 ** (s / 12), type: 'sine', dur: 1.1, vol: 0.09, delay: i * 0.06, attack: 0.005 });
      this.tone({ freq: 1046 * 2 * 2 ** (s / 12), type: 'triangle', dur: 0.4, vol: 0.03, delay: i * 0.06 });
    });
    this.noise({ dur: 1.2, vol: 0.1, freq: 7000, type: 'highpass', delay: 0.1 });
    this.tone({ freq: 130, type: 'sine', dur: 0.8, vol: 0.2, slide: 0.5 });
  }

  /** Misión completada. */
  missionDone() {
    [0, 4, 7, 12].forEach((s, i) => this.tone({ freq: 659 * 2 ** (s / 12), type: 'triangle', dur: 0.18, vol: 0.12, delay: i * 0.07 }));
    this.tone({ freq: 1318, type: 'sine', dur: 0.6, vol: 0.08, delay: 0.3 });
  }

  /** Subida de nivel. */
  levelUp() {
    [0, 7, 12, 16, 19, 24].forEach((s, i) => this.tone({ freq: 392 * 2 ** (s / 12), type: 'square', dur: 0.2, vol: 0.08, delay: i * 0.06 }));
    this.noise({ dur: 0.8, vol: 0.1, freq: 6000, type: 'highpass', delay: 0.3 });
  }

  // ---------- amenazas ----------
  /** Toque corto de sirena al aparecer una patrulla. */
  sirenBlip() {
    this.tone({ freq: 700, type: 'sawtooth', dur: 0.32, vol: 0.05, slide: 1.4 });
    this.tone({ freq: 980, type: 'sawtooth', dur: 0.3, vol: 0.05, slide: 0.72, delay: 0.3 });
  }

  /** Pitido de fijación del misil (más agudo al fijarse). */
  lockBeep(locked = false) {
    this.tone({ freq: locked ? 1760 : 1320, type: 'square', dur: 0.05, vol: 0.06 });
  }

  /** Lanzamiento de misil: silbido descendente. */
  missileLaunch() {
    this.noise({ dur: 0.7, vol: 0.22, freq: 3000, type: 'bandpass', q: 3, slide: 0.25 });
  }

  /** Helicóptero entrando: aspas (ruido modulado). */
  chopper() {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime;
    const dur = 1.8;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const env = 0.5 + 0.5 * Math.sin((i / this.ctx.sampleRate) * Math.PI * 2 * 13);
      d[i] = (Math.random() * 2 - 1) * env * env;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 500;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.35, t0 + 0.6);
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0);
  }

  /** El foco del helicóptero te ha detectado. */
  spottedAlarm() {
    [0, 0.14].forEach((d) => this.tone({ freq: 1046, type: 'square', dur: 0.1, vol: 0.08, delay: d }));
    this.tone({ freq: 784, type: 'square', dur: 0.2, vol: 0.08, delay: 0.28 });
  }

  /** Golpe seco al aterrizar fuerte. */
  thud(strength = 1) {
    this.tone({ freq: 110, type: 'sine', dur: 0.18, vol: 0.18 * strength, slide: 0.5 });
    this.noise({ dur: 0.1, vol: 0.1 * strength, freq: 400 });
  }

  /** Barrido al entrar en una zona nueva. */
  whoosh() {
    this.noise({ dur: 0.6, vol: 0.18, freq: 400, type: 'bandpass', q: 1.2, slide: 6 });
  }

  /**
   * Siseo continuo del jetpack: sigue al empuje (0-1).
   * Se crea una vez y solo se cambia el volumen.
   */
  jet(level) {
    if (!this.ctx) return;
    if (!this.jetGain) {
      const len = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 900;
      f.Q.value = 0.7;
      this.jetGain = this.ctx.createGain();
      this.jetGain.gain.value = 0;
      src.connect(f).connect(this.jetGain).connect(this.master);
      src.start();
    }
    this.jetGain.gain.setTargetAtTime(level * CONFIG.audio.jetVolume, this.ctx.currentTime, 0.03);
  }

  /** Aviso de evento aleatorio. */
  eventAlarm() {
    [0, 0.18, 0.36].forEach((d) => this.tone({ freq: 988, type: 'square', dur: 0.1, vol: 0.08, delay: d }));
    this.tone({ freq: 1318, type: 'square', dur: 0.25, vol: 0.09, delay: 0.54 });
  }

  /** Sirena de policía (subida y bajada). */
  siren(delay = 0) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    for (let k = 0; k < 4; k++) {
      o.frequency.setValueAtTime(660, t0 + k * 0.5);
      o.frequency.linearRampToValueAtTime(990, t0 + k * 0.5 + 0.25);
      o.frequency.linearRampToValueAtTime(660, t0 + k * 0.5 + 0.5);
    }
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1800;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.07, t0 + 0.1);
    g.gain.linearRampToValueAtTime(0.0001, t0 + 2);
    o.connect(f).connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + 2.05);
  }

  /** Billete dorado: arpegio brillante. */
  gold() {
    [0, 4, 7, 12].forEach((s, i) => this.tone({ freq: 1046 * 2 ** (s / 12), type: 'triangle', dur: 0.16, vol: 0.16, delay: i * 0.045 }));
  }

  /** Maletín: "caja registradora" (golpe + campanas). */
  briefcase() {
    this.noise({ dur: 0.08, vol: 0.35, freq: 3000, type: 'highpass' });
    [0, 4, 7, 12, 16].forEach((s, i) => this.tone({ freq: 784 * 2 ** (s / 12), type: 'square', dur: 0.22, vol: 0.09, delay: 0.05 + i * 0.05 }));
    this.tone({ freq: 2093, type: 'sine', dur: 0.6, vol: 0.18, delay: 0.32 });
  }

  magnet() {
    this.tone({ freq: 300, type: 'sawtooth', dur: 0.35, vol: 0.12, slide: 4 });
    this.tone({ freq: 600, type: 'sine', dur: 0.35, vol: 0.12, slide: 3, delay: 0.05 });
  }

  magnetEnd() {
    this.tone({ freq: 900, type: 'sine', dur: 0.25, vol: 0.1, slide: 0.4 });
  }

  hit() {
    this.noise({ dur: 0.45, vol: 0.5, freq: 900, slide: 0.15 });
    this.tone({ freq: 180, type: 'sawtooth', dur: 0.4, vol: 0.25, slide: 0.3 });
  }

  crash() {
    this.noise({ dur: 0.35, vol: 0.35, freq: 600, slide: 0.3 });
  }

  /** Aviso de que estás a punto de subir de estrella. */
  warn() {
    this.tone({ freq: 880, type: 'square', dur: 0.09, vol: 0.08 });
    this.tone({ freq: 660, type: 'square', dur: 0.09, vol: 0.08, delay: 0.11 });
  }

  starUp() {
    this.tone({ freq: 520, type: 'sawtooth', dur: 0.45, vol: 0.1, slide: 1.8 });
    this.tone({ freq: 1568, type: 'triangle', dur: 0.3, vol: 0.14, delay: 0.3 });
  }

  starDown() {
    this.tone({ freq: 784, type: 'triangle', dur: 0.15, vol: 0.12 });
    this.tone({ freq: 587, type: 'triangle', dur: 0.25, vol: 0.12, delay: 0.12 });
  }

  // ---------- personajes ----------
  transform() {
    this.tone({ freq: 220, type: 'sawtooth', dur: 0.5, vol: 0.12, slide: 4 });
    [0, 4, 7, 12, 16].forEach((s, i) => this.tone({ freq: 523 * 2 ** (s / 12), type: 'square', dur: 0.2, vol: 0.08, delay: 0.25 + i * 0.05 }));
    this.noise({ dur: 0.5, vol: 0.2, freq: 4000, type: 'highpass', delay: 0.2 });
  }

  detransform() {
    this.noise({ dur: 0.4, vol: 0.35, freq: 800, slide: 0.3 });
    this.tone({ freq: 660, type: 'square', dur: 0.4, vol: 0.1, slide: 0.3 });
  }

  powerUp() {
    [0, 7, 12].forEach((s, i) => this.tone({ freq: 660 * 2 ** (s / 12), type: 'triangle', dur: 0.15, vol: 0.13, delay: i * 0.05 }));
  }

  shot() {
    this.noise({ dur: 0.06, vol: 0.18, freq: 2500, type: 'bandpass', q: 2 });
    this.tone({ freq: 900, type: 'square', dur: 0.05, vol: 0.05, slide: 0.4 });
  }

  clank() {
    this.tone({ freq: 1800, type: 'square', dur: 0.06, vol: 0.06, slide: 0.7 });
  }

  boom() {
    this.noise({ dur: 0.45, vol: 0.4, freq: 700, slide: 0.2 });
    this.tone({ freq: 120, type: 'sine', dur: 0.35, vol: 0.3, slide: 0.4 });
  }

  bigBoom() {
    this.noise({ dur: 1.1, vol: 0.55, freq: 1200, slide: 0.08 });
    this.tone({ freq: 90, type: 'sine', dur: 0.9, vol: 0.4, slide: 0.35 });
  }

  launch() {
    this.noise({ dur: 0.4, vol: 0.25, freq: 600, type: 'bandpass', slide: 4 });
    this.tone({ freq: 200, type: 'sawtooth', dur: 0.35, vol: 0.08, slide: 3 });
  }

  nitro() {
    this.noise({ dur: 0.7, vol: 0.3, freq: 300, type: 'bandpass', slide: 6 });
  }

  rage() {
    this.tone({ freq: 110, type: 'sawtooth', dur: 0.6, vol: 0.18, slide: 0.6 });
    this.noise({ dur: 0.5, vol: 0.3, freq: 500 });
  }

  shield() {
    this.tone({ freq: 1200, type: 'triangle', dur: 0.25, vol: 0.14, slide: 0.5 });
    this.noise({ dur: 0.15, vol: 0.2, freq: 3000, type: 'highpass' });
  }

  hop() {
    this.tone({ freq: 300, type: 'square', dur: 0.1, vol: 0.06, slide: 1.8 });
  }

  tick() {
    this.tone({ freq: 2400, type: 'square', dur: 0.02, vol: 0.06 });
  }

  /** Esquiva al límite: silbido rápido. */
  nearMiss() {
    this.noise({ dur: 0.18, vol: 0.18, freq: 2500, type: 'bandpass', q: 1.5, slide: 0.4 });
    this.tone({ freq: 1320, type: 'triangle', dur: 0.08, vol: 0.07 });
  }

  multUp(level) {
    const base = 523 * 2 ** ((level - 2) * 2 / 12);
    [0, 4, 7, 12].forEach((s, i) => this.tone({ freq: base * 2 ** (s / 12), type: 'square', dur: 0.12, vol: 0.08, delay: i * 0.04 }));
  }

  multDown() {
    this.tone({ freq: 440, type: 'triangle', dur: 0.2, vol: 0.07, slide: 0.6 });
  }

  /** Nuevo récord: fanfarria. */
  fanfare() {
    const seq = [[0, 0.12], [4, 0.12], [7, 0.12], [12, 0.35], [7, 0.12], [12, 0.6]];
    let d = 0;
    for (const [s, len] of seq) {
      this.tone({ freq: 523 * 2 ** (s / 12), type: 'square', dur: len, vol: 0.12, delay: d });
      this.tone({ freq: 261 * 2 ** (s / 12), type: 'triangle', dur: len, vol: 0.1, delay: d });
      d += len * 0.9;
    }
    this.noise({ dur: 1.2, vol: 0.12, freq: 6000, type: 'highpass', delay: 0.3 });
  }

  // ---------- transformaciones con personalidad ----------
  transformChar(id) {
    this.noise({ dur: 0.35, vol: 0.18, freq: 4000, type: 'highpass' });
    if (id === 'veteran') {
      // elegante: campanas de cristal (arpegio mayor 7ª) + tic-tac
      [0, 4, 7, 11, 14].forEach((s, i) => {
        this.tone({ freq: 784 * 2 ** (s / 12), type: 'sine', dur: 0.9, vol: 0.1, delay: i * 0.08, attack: 0.005 });
        this.tone({ freq: 784 * 2 * 2 ** (s / 12), type: 'sine', dur: 0.5, vol: 0.03, delay: i * 0.08 });
      });
      [0.55, 0.8].forEach((d) => this.tone({ freq: 2600, type: 'square', dur: 0.02, vol: 0.06, delay: d }));
    } else if (id === 'pilot') {
      // motor que sube de vueltas + derrape
      this.engine();
      this.skid(0.35);
      this.tone({ freq: 1318, type: 'square', dur: 0.12, vol: 0.06, delay: 0.75 });
    } else if (id === 'wild') {
      // explosión + grito
      this.bigBoom();
      this.yell(0.15);
    }
  }

  /** Motor revolucionándose (sierra con vibrato que sube). */
  engine(delay = 0) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoG = this.ctx.createGain();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(70, t0);
    o.frequency.exponentialRampToValueAtTime(260, t0 + 0.45);
    o.frequency.exponentialRampToValueAtTime(180, t0 + 0.7);
    lfo.frequency.value = 28;
    lfoG.gain.value = 18;
    lfo.connect(lfoG).connect(o.frequency);
    f.type = 'lowpass';
    f.frequency.value = 1400;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.16, t0 + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.8);
    o.connect(f).connect(g).connect(this.master);
    o.start(t0);
    lfo.start(t0);
    o.stop(t0 + 0.85);
    lfo.stop(t0 + 0.85);
  }

  /** Chirrido de neumáticos. */
  skid(delay = 0) {
    this.noise({ dur: 0.55, vol: 0.22, freq: 2200, type: 'bandpass', q: 6, slide: 0.7, delay });
  }

  /** Grito salvaje "¡YAAAH!" (dos sierras con filtro de vocal). */
  yell(delay = 0) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime + delay;
    for (const [fq, vol] of [[800, 0.12], [1250, 0.08]]) {
      const o = this.ctx.createOscillator();
      const vib = this.ctx.createOscillator();
      const vibG = this.ctx.createGain();
      const f = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(330, t0);
      o.frequency.linearRampToValueAtTime(420, t0 + 0.15);
      o.frequency.exponentialRampToValueAtTime(190, t0 + 0.75);
      vib.frequency.value = 7;
      vibG.gain.value = 14;
      vib.connect(vibG).connect(o.frequency);
      f.type = 'bandpass';
      f.frequency.value = fq;
      f.Q.value = 5;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vol * 2.5, t0 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.8);
      o.connect(f).connect(g).connect(this.master);
      o.start(t0);
      vib.start(t0);
      o.stop(t0 + 0.85);
      vib.stop(t0 + 0.85);
    }
  }

  /** Tiempo bala: barrido grave que se "estira". */
  bulletTime() {
    this.tone({ freq: 600, type: 'sine', dur: 0.8, vol: 0.18, slide: 0.25 });
    this.noise({ dur: 0.6, vol: 0.15, freq: 1500, type: 'bandpass', slide: 0.2 });
  }

  /** Amartillar la pistola. */
  cock() {
    this.noise({ dur: 0.04, vol: 0.25, freq: 3500, type: 'highpass' });
    this.noise({ dur: 0.05, vol: 0.25, freq: 2500, type: 'highpass', delay: 0.12 });
  }

  /** Inicio de un respiro: campanillas suaves. */
  respite() {
    [12, 7, 4, 0, 4, 7, 12, 16].forEach((st, i) =>
      this.tone({ freq: 523 * 2 ** (st / 12), type: 'sine', dur: 0.5, vol: 0.09, delay: i * 0.09, attack: 0.02 }),
    );
  }

  /** Alarma del furgón: campana eléctrica de dos tonos. */
  alarmBell() {
    for (let k = 0; k < 4; k++) this.tone({ freq: k % 2 ? 1400 : 1150, type: 'square', dur: 0.06, vol: 0.06, delay: k * 0.065 });
  }

  // ---------- peligros de la ciudad ----------
  swoosh() {
    this.noise({ dur: 0.45, vol: 0.16, freq: 500, type: 'bandpass', q: 1.5, slide: 3 });
  }

  neonBuzz() {
    this.tone({ freq: 120, type: 'sawtooth', dur: 0.25, vol: 0.05 });
    this.noise({ dur: 0.08, vol: 0.08, freq: 5000, type: 'highpass' });
  }

  hiss() {
    this.noise({ dur: 0.4, vol: 0.12, freq: 4000, type: 'highpass' });
  }

  splash() {
    this.noise({ dur: 0.9, vol: 0.3, freq: 1600, type: 'bandpass', q: 0.6, slide: 0.5 });
    this.tone({ freq: 140, type: 'sine', dur: 0.3, vol: 0.2, slide: 0.5 });
  }

  snap() {
    this.noise({ dur: 0.1, vol: 0.35, freq: 1200, type: 'bandpass', q: 1 });
    this.tone({ freq: 300, type: 'square', dur: 0.08, vol: 0.08, slide: 0.5 });
  }

  /** Victoria contra el helicóptero jefe: fanfarria larga. */
  victory() {
    const seq = [[0, 0.14], [4, 0.14], [7, 0.14], [12, 0.3], [11, 0.14], [12, 0.14], [16, 0.3], [19, 0.7]];
    let d = 0;
    for (const [s, len] of seq) {
      this.tone({ freq: 523 * 2 ** (s / 12), type: 'square', dur: len, vol: 0.11, delay: d });
      this.tone({ freq: 262 * 2 ** (s / 12), type: 'sawtooth', dur: len, vol: 0.06, delay: d });
      d += len * 0.92;
    }
    [0, 4, 7, 12].forEach((s) => this.tone({ freq: 131 * 2 ** (s / 12), type: 'triangle', dur: 1.4, vol: 0.08, delay: d - 0.6 }));
    this.noise({ dur: 1.5, vol: 0.14, freq: 6000, type: 'highpass', delay: 0.4 });
  }

  /** Alivio al esconderse: "fiuuu" + acorde suave. */
  relief() {
    this.noise({ dur: 0.8, vol: 0.14, freq: 900, type: 'bandpass', q: 1, slide: 0.35 });
    [0, 4, 7, 12].forEach((s, i) => this.tone({ freq: 392 * 2 ** (s / 12), type: 'sine', dur: 1.1, vol: 0.08, delay: 0.15 + i * 0.07, attack: 0.04 }));
  }

  /** Silbato de policía. */
  whistle() {
    this.tone({ freq: 2600, type: 'sine', dur: 0.5, vol: 0.08, vib: 0 });
    this.tone({ freq: 2650, type: 'square', dur: 0.45, vol: 0.02 });
  }

  /** Sello de goma contra el papel. */
  stamp() {
    this.tone({ freq: 95, type: 'sine', dur: 0.3, vol: 0.4, slide: 0.5 });
    this.noise({ dur: 0.12, vol: 0.4, freq: 900 });
  }

  /** "Womp womp" de trombón triste (cómico). */
  wompWomp() {
    [[311, 0.35], [294, 0.35], [277, 0.35], [262, 0.9]].reduce((d, [f, len]) => {
      this.tone({ freq: f, type: 'sawtooth', dur: len, vol: 0.07, delay: d + 0.25, attack: 0.03, slide: len > 0.5 ? 0.94 : 1 });
      return d + len * 0.85;
    }, 0);
  }

  // ---------- enemigos menores ----------
  /** Ladrido: dos golpes de sierra con filtro de vocal. */
  bark() {
    [0, 0.17].forEach((d) => {
      this.tone({ freq: 420, type: 'sawtooth', dur: 0.11, vol: 0.12, slide: 0.55, delay: d });
      this.noise({ dur: 0.08, vol: 0.12, freq: 900, type: 'bandpass', q: 2, delay: d });
    });
  }

  /** Gañido del perro al salir volando. */
  yelp() {
    this.tone({ freq: 900, type: 'sawtooth', dur: 0.3, vol: 0.1, slide: 1.6 });
    this.tone({ freq: 1400, type: 'triangle', dur: 0.25, vol: 0.06, slide: 0.6, delay: 0.12 });
  }

  /** Graznido de gaviota. */
  squawk() {
    [0, 0.14].forEach((d, i) => this.tone({ freq: i ? 1250 : 1500, type: 'sawtooth', dur: 0.13, vol: 0.08, slide: 0.6, delay: d }));
    this.noise({ dur: 0.1, vol: 0.08, freq: 2600, type: 'bandpass', q: 3 });
  }

  /** Dron averiado: pitido que cae + chisporroteo. */
  droneDown() {
    this.tone({ freq: 1600, type: 'square', dur: 0.6, vol: 0.06, slide: 0.15 });
    this.noise({ dur: 0.3, vol: 0.15, freq: 4000, type: 'highpass' });
  }

  /** Golpe cómico "¡boing!". */
  bonk() {
    this.tone({ freq: 180, type: 'sine', dur: 0.35, vol: 0.25, slide: 2.6 });
    this.tone({ freq: 90, type: 'square', dur: 0.08, vol: 0.08 });
  }

  /** Bocina de patinete (dos pitidos). */
  horn() {
    [0.1, 0.24].forEach((d) => this.tone({ freq: 560, type: 'square', dur: 0.1, vol: 0.06, delay: d }));
  }

  click() {
    this.tone({ freq: 660, type: 'square', dur: 0.05, vol: 0.08 });
  }
}

export const Sound = new AudioFx();
