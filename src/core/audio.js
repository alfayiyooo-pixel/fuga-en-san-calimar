// Sonidos sintetizados con Web Audio API (sin archivos externos).
// El contexto de audio se crea en la primera pulsación del jugador,
// como exigen los navegadores.

const MAJOR = [0, 2, 4, 5, 7, 9, 11];

class AudioFx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.volume = 0.45;
    this.lastCoin = 0;
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

  click() {
    this.tone({ freq: 660, type: 'square', dur: 0.05, vol: 0.08 });
  }
}

export const Sound = new AudioFx();
