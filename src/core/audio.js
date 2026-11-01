// Sonidos sintetizados con Web Audio API (sin archivos externos).
// El contexto de audio se crea en la primera pulsación del jugador,
// como exigen los navegadores.

import { CONFIG } from '../config.js';

const MAJOR = [0, 2, 4, 5, 7, 9, 11];

class AudioFx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.volume = CONFIG.audio.sfxVolume;
    this.lastCoin = 0;
    this.music = new Music(this);
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.volume;
    if (m && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  /** Reproduce un audio ya decodificado (voces grabadas). */
  playBuffer(buf, vol = 1) {
    if (!this.ready) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = vol / Math.max(0.01, this.volume); // independiente del volumen de efectos
    src.connect(g).connect(this.master);
    src.start();
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

  click() {
    this.tone({ freq: 660, type: 'square', dur: 0.05, vol: 0.08 });
  }
}

// ------------------------------------------------------------
// MÚSICA PROCEDURAL
// Secuenciador de 16 pasos × 4 compases (La menor: Am – F – C – G).
//   'chase': bombo, palmas, bajo; con más estrellas entran charles y arpegio.
//   'calm':  acordes suaves y notas sueltas, sin percusión (respiros).
// ------------------------------------------------------------
const ROOTS = [110, 87.31, 130.81, 98.0];
const CHORDS = [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7]];

class Music {
  constructor(fx) {
    this.fx = fx;
    this.mode = 'off';
    this.intensity = 0;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
    this.bus = null;
  }

  ensure() {
    const c = this.fx.ctx;
    if (!c) return false;
    if (!this.bus) {
      this.bus = c.createGain();
      this.bus.gain.value = 0;
      this.bus.connect(this.fx.master);
    }
    return true;
  }

  /** 0-1: cuántas capas suenan en modo persecución. */
  setIntensity(v) {
    this.intensity = v;
  }

  setMode(mode) {
    if (mode === this.mode && (this.timer || mode === 'off')) return;
    this.mode = mode;
    if (!this.ensure()) return;
    const c = this.fx.ctx;
    const g = this.bus.gain;
    const now = c.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    if (mode === 'off') {
      g.linearRampToValueAtTime(0, now + 0.6);
      setTimeout(() => {
        if (this.mode === 'off' && this.timer) {
          clearInterval(this.timer);
          this.timer = null;
        }
      }, 700);
      return;
    }
    g.linearRampToValueAtTime(0.0001, now + 0.25);
    g.linearRampToValueAtTime(CONFIG.audio.musicVolume, now + 1.6);
    if (!this.timer) {
      this.nextTime = now + 0.1;
      this.step = 0;
      this.timer = setInterval(() => this.tick(), 25);
    }
  }

  tick() {
    const c = this.fx.ctx;
    if (!c || c.state !== 'running' || this.mode === 'off') return;
    const bpm = this.mode === 'calm' ? CONFIG.audio.calmTempo : CONFIG.audio.chaseTempo;
    const spb = 60 / bpm / 4;
    if (this.nextTime < c.currentTime - 0.2) this.nextTime = c.currentTime + 0.05;
    while (this.nextTime < c.currentTime + 0.12) {
      this.play(this.step, this.nextTime, spb);
      this.nextTime += spb;
      this.step = (this.step + 1) % 64;
    }
  }

  note(t, freq, dur, type, vol, { attack = 0.005, lowpass = 0, slide = 0 } = {}) {
    const c = this.fx.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o.connect(g);
    if (lowpass) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lowpass;
      node = node.connect(f);
    }
    node.connect(this.bus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  hit(t, dur, vol, freq, type = 'highpass') {
    const c = this.fx.ctx;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.bus);
    src.start(t);
  }

  play(s, t, spb) {
    const bar = Math.floor(s / 16);
    const st = s % 16;
    const root = ROOTS[bar];
    const chord = CHORDS[bar];
    const tone = (oct, i) => root * oct * 2 ** (chord[i % 3] / 12);

    if (this.mode === 'calm') {
      if (st === 0) {
        this.note(t, root / 2, spb * 16, 'sine', 0.16, { attack: 0.3 });
        for (let i = 0; i < 3; i++) this.note(t, tone(2, i), spb * 16.5, 'triangle', 0.05, { attack: 0.5 });
      }
      if (st === 6 || st === 10 || st === 14) this.note(t, tone(4, st), 0.6, 'sine', 0.05, { attack: 0.01 });
      return;
    }

    // persecución
    const I = this.intensity;
    if (st % 4 === 0) this.note(t, 150, 0.2, 'sine', 0.5, { slide: 0.27 });
    if (st === 4 || st === 12) this.hit(t, 0.12, 0.22, 1500);
    if (I > 0.15 && st % 2 === 1) this.hit(t, 0.03, 0.07, 7000);
    if (st % 2 === 0) this.note(t, root * (st % 4 === 2 ? 2 : 1), spb * 1.7, 'sawtooth', 0.09, { lowpass: 520 });
    if (I > 0.5 && st % 2 === 0) this.note(t, tone(4, st / 2), spb * 0.9, 'square', 0.03, { lowpass: 2600 });
    if (I > 0.85 && (st === 14 || st === 15)) this.hit(t, 0.08, 0.15, 900, 'bandpass');
  }
}

export const Sound = new AudioFx();
