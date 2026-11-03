// MÚSICA POR ZONAS
//
// Seis temas generados con Web Audio API (estilo retro/sintetizador), uno por
// zona y otro para el menú. Si existe audio/musica/<pista>.mp3 se usa ese
// archivo (en bucle) en lugar del tema generado.
//
// Cambios de pista con fundido cruzado (CONFIG.music.crossfade s).
// Capas dinámicas:
//   · estrellas: con 1★ entran más capas; desde 3★ más percusión y tensión.
//   · respiro: la música se calma (sin batería, filtro suave, menos volumen).
//   · habilidades: tiempo bala de Aurelio = todo más lento y grave;
//     conducción de Vera = más rápido y brillante; furia de Bruno = distorsión.
//
// Los temas generados son secuencias de 8 compases que se repiten sin cortes
// (el secuenciador programa las notas por adelantado con el reloj de audio).

import { CONFIG } from '../config.js';

export const MUSIC_TRACKS = ['menu', 'playa', 'centro', 'industrial', 'mansiones', 'puerto'];

const mtof = (n) => 440 * 2 ** ((n - 69) / 12);

// ------------------------------------------------------------
// Instrumentos (todos van al destino del reproductor de la pista)
// ------------------------------------------------------------
class Kit {
  constructor(engine, dest) {
    this.e = engine;
    this.c = engine.ctx;
    this.dest = dest;
  }

  get pm() {
    return this.e.pitchMult;
  }

  f(n) {
    return mtof(n) * this.pm;
  }

  osc(t, freq, dur, { type = 'square', vol = 0.1, attack = 0.005, lp = 0, q = 0.7, slide = 0, vib = 0, detune = 0 } = {}) {
    const c = this.c;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (detune) o.detune.value = detune;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    if (vib) {
      const l = c.createOscillator();
      const lg = c.createGain();
      l.frequency.value = 5.5;
      lg.gain.value = freq * vib;
      l.connect(lg).connect(o.frequency);
      l.start(t);
      l.stop(t + dur + 0.05);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o.connect(g);
    if (lp) {
      const fl = c.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.value = lp;
      fl.Q.value = q;
      node = node.connect(fl);
    }
    node.connect(this.dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** Cuerda pulsada (guitarra/clavinet): sierra con filtro que se cierra. */
  pluck(t, n, dur, vol = 0.08, bright = 6) {
    const c = this.c;
    const freq = this.f(n);
    const o = c.createOscillator();
    const fl = c.createBiquadFilter();
    const g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    fl.type = 'lowpass';
    fl.Q.value = 2;
    fl.frequency.setValueAtTime(freq * bright, t);
    fl.frequency.exponentialRampToValueAtTime(freq * 1.2, t + dur * 0.8);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl).connect(g).connect(this.dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** Nota con timbre propio: steel drum, campana, piano eléctrico… */
  bell(t, n, dur, vol = 0.07, ratio = 2.01) {
    const freq = this.f(n);
    this.osc(t, freq, dur, { type: 'sine', vol, attack: 0.003 });
    this.osc(t, freq * ratio, dur * 0.5, { type: 'sine', vol: vol * 0.4, attack: 0.003 });
  }

  pad(t, notes, dur, vol = 0.03, lp = 1800) {
    for (const n of notes) {
      for (const d of [-7, 7]) this.osc(t, this.f(n), dur, { type: 'sawtooth', vol, attack: Math.min(0.4, dur * 0.3), lp, detune: d });
    }
  }

  stab(t, notes, vol = 0.05, dur = 0.18) {
    for (const n of notes) this.osc(t, this.f(n), dur, { type: 'sawtooth', vol, attack: 0.01, lp: 2600, q: 2 });
  }

  bass(t, n, dur, vol = 0.14, type = 'sawtooth', lp = 600) {
    this.osc(t, this.f(n), dur, { type, vol, attack: 0.005, lp, q: 3 });
  }

  noise(t, dur, vol, freq, type = 'highpass', q = 0.8) {
    const c = this.c;
    const src = c.createBufferSource();
    src.buffer = this.e.noiseBuf;
    const fl = c.createBiquadFilter();
    fl.type = type;
    fl.frequency.value = freq;
    fl.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl).connect(g).connect(this.dest);
    src.start(t, Math.random() * 0.5, dur + 0.05);
  }

  kick(t, vol = 0.5, punch = 150) {
    this.osc(t, punch * this.pm, 0.22, { type: 'sine', vol, attack: 0.002, slide: 0.28 });
  }

  snare(t, vol = 0.2) {
    this.noise(t, 0.16, vol, 1800, 'bandpass', 0.6);
    this.osc(t, 190 * this.pm, 0.08, { type: 'triangle', vol: vol * 0.6, slide: 0.6 });
  }

  clap(t, vol = 0.18) {
    for (const d of [0, 0.012, 0.024]) this.noise(t + d, 0.09, vol, 1400, 'bandpass', 1.2);
  }

  hat(t, vol = 0.05, open = false) {
    this.noise(t, open ? 0.22 : 0.035, vol, 8000);
  }

  shaker(t, vol = 0.04) {
    this.noise(t, 0.05, vol, 6000, 'bandpass', 1.5);
  }

  rim(t, vol = 0.08) {
    this.osc(t, 1700 * this.pm, 0.03, { type: 'square', vol, attack: 0.001 });
  }

  tom(t, n, vol = 0.22) {
    this.osc(t, this.f(n), 0.25, { type: 'sine', vol, attack: 0.002, slide: 0.55 });
  }

  /** Golpe metálico (frecuencias inarmónicas). */
  clang(t, freq = 420, vol = 0.07) {
    const f = freq * this.pm;
    this.osc(t, f, 0.35, { type: 'square', vol, attack: 0.001, lp: 5000 });
    this.osc(t, f * 2.76, 0.25, { type: 'square', vol: vol * 0.6, attack: 0.001, lp: 6000 });
    this.noise(t, 0.12, vol * 1.5, 5200, 'bandpass', 4);
  }
}

// ------------------------------------------------------------
// TEMAS (s = paso de 16 por compás, bar = compás 0-7)
// L = { stars, calm, k (kit), spb (s por paso) }
// ------------------------------------------------------------
const TRACKS = {
  // Menú: tema con identidad, melodía pegadiza en La menor → Do
  menu: {
    bpm: 112,
    prog: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]],
    lead: [69, null, 72, 76, null, 74, 72, null, 71, null, 72, 74, null, 72, 71, 67,
           69, null, 72, 76, null, 79, 76, null, 74, null, 72, 71, null, 69, 68, null],
    play(s, bar, t, L, k) {
      const st = s % 16;
      const ch = this.prog[bar];
      if (!L.calm) {
        if (st % 4 === 0) k.kick(t, 0.38);
        if (st === 4 || st === 12) k.clap(t, 0.12);
        if (st % 2 === 1) k.hat(t, 0.03);
      }
      if (st % 2 === 0) k.bass(t, ch[0] - 24 + (st % 4 === 2 ? 12 : 0), L.spb * 1.8, 0.11);
      if (st === 0) k.pad(t, ch, L.spb * 16, 0.018, 1400);
      const ln = this.lead[(bar % 4) * 8 + Math.floor(st / 2)];
      if (st % 2 === 0 && ln && bar < 6) k.osc(t, k.f(ln), L.spb * 1.8, { type: 'square', vol: 0.045, lp: 3000 });
      if (bar >= 6 && st % 2 === 0) k.bell(t, ch[(st / 2) % 3] + 12, 0.3, 0.05);
    },
  },

  // Playa: relajada y soleada — guitarra a contratiempo, steel drum, shaker
  playa: {
    bpm: 100,
    prog: [[62, 66, 69], [57, 61, 64], [59, 62, 66], [55, 59, 62], [62, 66, 69], [57, 61, 64], [55, 59, 62], [57, 61, 64]],
    lead: [74, null, 76, 78, null, 76, 74, null, 73, null, 74, 76, null, null, 69, null,
           71, null, 74, 76, null, 78, 81, null, 79, null, 78, 76, null, 74, null, null],
    play(s, bar, t, L, k) {
      const st = s % 16;
      const ch = this.prog[bar];
      if (!L.calm) {
        if (st === 0 || st === 10) k.kick(t, 0.32, 120);
        if (st === 4 || st === 12) k.rim(t, 0.06);
        if (L.stars >= 1) k.shaker(t, st % 2 ? 0.025 : 0.04);
        if (L.stars >= 3) {
          if (st === 4 || st === 12) k.snare(t, 0.12);
          if (st >= 13 && bar % 2 === 1) k.tom(t, 52 + st, 0.14);
          if (st % 2 === 1) k.hat(t, 0.03);
        }
      }
      // guitarra: rasgueo a contratiempo
      if (st % 4 === 2) for (const n of ch) k.pluck(t + (n - ch[0]) * 0.004, n, 0.25, 0.035, L.calm ? 3 : 6);
      // bajo: tónica y quinta
      if (st === 0 || st === 7 || st === 8 || st === 14) k.bass(t, ch[0] - 24 + (st === 8 ? 7 : 0), L.spb * 2.5, 0.12, 'triangle', 900);
      // steel drum
      const ln = this.lead[(bar % 4) * 8 + Math.floor(st / 2)];
      if (st % 2 === 0 && ln) k.bell(t, ln, 0.45, L.calm ? 0.035 : 0.05, 3.9);
      if (L.calm && st === 0) k.pad(t, ch, L.spb * 16, 0.014, 1000);
    },
  },

  // Centro financiero: electrónica nocturna, bajo pulsante y arpegio
  centro: {
    bpm: 122,
    prog: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]],
    play(s, bar, t, L, k) {
      const st = s % 16;
      const ch = this.prog[bar];
      if (!L.calm) {
        if (st % 4 === 0) k.kick(t, 0.5, 160);
        if (st === 4 || st === 12) k.clap(t, 0.15);
        if (L.stars >= 1 && st % 4 === 2) k.hat(t, 0.06, true);
        if (L.stars >= 3) {
          k.hat(t, st % 2 ? 0.025 : 0.04);
          if (bar % 4 === 3 && st >= 8) k.snare(t, 0.06 + (st - 8) * 0.015);
        }
        // bajo de corcheas con octava
        k.bass(t, ch[0] - 24 + (st % 2 ? 12 : 0), L.spb * 0.9, 0.13, 'sawtooth', L.stars >= 3 ? 1100 : 700);
        // arpegio de semicorcheas
        if (L.stars >= 1 || bar >= 4) k.osc(t, k.f(ch[st % 3] + 12 + (st >= 12 ? 12 : 0)), L.spb * 0.8, { type: 'square', vol: 0.028, lp: 3200 });
      }
      if (st === 0) k.pad(t, ch, L.spb * 16, L.calm ? 0.02 : 0.016, L.calm ? 900 : 1600);
    },
  },

  // Barrio industrial: duro y metálico, percusión pesada
  industrial: {
    bpm: 132,
    roots: [40, 40, 41, 40, 40, 40, 43, 41],
    play(s, bar, t, L, k) {
      const st = s % 16;
      const r = this.roots[bar];
      if (!L.calm) {
        if ([0, 3, 6, 10, 11].includes(st)) k.kick(t, 0.55, 130);
        if (st === 4 || st === 12) k.snare(t, 0.25);
        if (st % 4 === 2) k.clang(t, 380, 0.05);
        if (L.stars >= 1 && st % 2 === 0) k.hat(t, 0.04);
        if (L.stars >= 3) {
          if (st === 7 || st === 15) k.clang(t, 610, 0.06);
          if (bar % 2 === 1 && st >= 12) k.tom(t, 45 - (st - 12) * 2, 0.25);
          k.noise(t, 0.03, 0.02, 9000);
        }
        // bajo martilleante (cuadrada saturada)
        if (st % 2 === 0 || st === 15) k.bass(t, r - 12 + (st === 14 ? 1 : 0), L.spb * 0.8, 0.12, 'square', 500);
        // "riff" de quinta de potencia
        if (st === 0 || st === 6 || st === 12) k.stab(t, [r + 12, r + 19], 0.035, 0.25);
      } else if (st === 0) {
        k.pad(t, [r, r + 7, r + 12], L.spb * 16, 0.02, 700);
        k.clang(t, 300, 0.03);
      }
    },
  },

  // Colinas de mansiones: funk/soul elegante
  mansiones: {
    bpm: 104,
    prog: [[55, 58, 62, 65], [55, 58, 62, 65], [60, 64, 67, 70], [60, 64, 67, 70], [55, 58, 62, 65], [55, 58, 62, 65], [63, 67, 70, 74], [62, 66, 69, 72]],
    bassline: [0, null, null, 0, null, null, 10, 12, null, 0, null, 7, null, 10, 9, 7],
    play(s, bar, t, L, k) {
      const st = s % 16;
      const ch = this.prog[bar];
      if (!L.calm) {
        if (st === 0 || st === 7 || st === 10) k.kick(t, 0.42, 130);
        if (st === 4 || st === 12) k.snare(t, 0.18);
        if (st === 9 || st === 14) k.snare(t, 0.04); // notas fantasma
        k.hat(t, st % 4 === 2 ? 0.05 : 0.025, st === 14 && bar % 2 === 1);
        // bajo funky (slap)
        const b = this.bassline[st];
        if (b !== null) k.bass(t, ch[0] - 24 + b, L.spb * 0.9, 0.15, 'square', 1300);
        // clavinet sincopado
        if ([2, 5, 8, 11, 13].includes(st)) for (const n of ch.slice(1)) k.pluck(t, n, 0.12, 0.022, 8);
        // metales
        if ((L.stars >= 1 && st === 14 && bar % 2 === 1) || (L.stars >= 3 && (st === 6 || st === 14))) k.stab(t, ch.map((n) => n + 12), 0.04, 0.2);
        if (L.stars >= 3 && st % 2 === 1) k.shaker(t, 0.03);
      }
      // piano eléctrico (redondo)
      if (st === 0 || (L.calm && st === 8)) for (const n of ch) k.bell(t, n, L.spb * 7, 0.025, 1.0);
    },
  },

  // Puerto: tensa y misteriosa, de película de atracos
  puerto: {
    bpm: 96,
    // ostinato cromático de espías sobre Re
    ost: [50, 50, 51, 51, 52, 52, 51, 51],
    lead: [74, null, null, 77, null, 76, null, 73, 74, null, null, null, 70, null, 69, null],
    play(s, bar, t, L, k) {
      const st = s % 16;
      if (!L.calm) {
        if (st === 0 || st === 8) k.kick(t, 0.32, 110);
        if (st === 12) k.snare(t, 0.1);
        if (st % 2 === 1) k.noise(t, 0.06, 0.02, 3000, 'bandpass'); // escobillas
        if (L.stars >= 1 && st % 4 === 0) k.rim(t, 0.05);
        if (L.stars >= 3) {
          if (st % 2 === 0) k.hat(t, 0.035);
          if (st === 6 || st === 14) k.tom(t, 43, 0.18);
        }
      }
      // ostinato pizzicato
      if (st % 2 === 0) k.pluck(t, this.ost[st / 2] - (bar >= 4 ? 0 : 12), 0.18, 0.06, 4);
      // dron grave
      if (st === 0 && bar % 2 === 0) k.pad(t, [38, 45], L.spb * 32, 0.022, 600);
      // tic-tac del reloj
      if (L.calm && st % 4 === 0) k.rim(t, 0.03);
      // melodía con vibrato (no en todos los compases: deja aire)
      const ln = this.lead[st];
      if (ln && bar % 4 >= 2) k.osc(t, k.f(ln), L.spb * 3, { type: 'triangle', vol: L.calm ? 0.03 : 0.05, attack: 0.03, vib: 0.012 });
      if (L.stars >= 3 && st % 4 === 3) k.osc(t, k.f(86 + (bar % 2)), L.spb, { type: 'square', vol: 0.015, lp: 4000 });
    },
  },
};

// ------------------------------------------------------------
// Reproductor de una pista (generada o archivo)
// ------------------------------------------------------------
class TrackPlayer {
  constructor(engine, id, when) {
    this.e = engine;
    this.id = id;
    const c = engine.ctx;
    this.gain = c.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(engine.input);
    this.buffer = engine.files.get(id) || null;
    this.def = TRACKS[id];
    this.kit = new Kit(engine, this.gain);
    this.step = 0;
    this.next = when;
    this.dead = false;
    if (this.buffer) {
      const src = c.createBufferSource();
      src.buffer = this.buffer;
      src.loop = true;
      const F = CONFIG.music.files[id] ?? {};
      if (F.loopEnd) {
        src.loopStart = F.loopStart ?? 0;
        src.loopEnd = F.loopEnd;
      }
      src.playbackRate.value = engine.rateTarget;
      src.connect(this.gain);
      src.start(when);
      this.src = src;
    }
  }

  fade(to, secs) {
    const g = this.gain.gain;
    const now = this.e.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(to, now + Math.max(0.02, secs));
  }

  stop(secs) {
    this.fade(0, secs);
    this.dead = true;
    const end = this.e.ctx.currentTime + secs + 0.1;
    try {
      this.src?.stop(end);
    } catch {
      /* ya parado */
    }
    setTimeout(() => this.gain.disconnect(), (secs + 0.6) * 1000);
  }

  /** Programa las notas que caen en la ventana [ahora, ahora + lookahead]. */
  schedule(until) {
    if (this.dead) return;
    if (this.src) {
      this.src.playbackRate.setTargetAtTime(this.e.rateTarget, this.e.ctx.currentTime, 0.25);
      return;
    }
    const e = this.e;
    const now = e.ctx.currentTime;
    if (this.next < now - 0.25) this.next = now + 0.03; // tras una pausa larga
    while (this.next < until) {
      const spb = 60 / (this.def.bpm * e.tempoMult) / 4;
      const bar = Math.floor(this.step / 16) % 8;
      const L = { stars: e.stars, calm: e.calm, spb };
      this.def.play(this.step % 16, bar, this.next, L, this.kit);
      this.next += spb;
      this.step = (this.step + 1) % 128;
    }
  }
}

// ------------------------------------------------------------
// Motor: cadena de efectos, fundidos y capas
// ------------------------------------------------------------
export class MusicEngine {
  constructor(fx) {
    this.fx = fx;
    this.ctx = null;
    this.players = [];
    this.current = null; // id de la pista que suena (o null)
    this.files = new Map();
    this.stars = 0;
    this.calm = false;
    this.fxName = null;
    this.tempoMult = 1;
    this.tempoTarget = 1;
    this.pitchMult = 1;
    this.pitchTarget = 1;
    this.rateTarget = 1;
    this.timer = null;
  }

  get vol() {
    return CONFIG.audio.musicVolume * this.fx.levels.music;
  }

  /** Crea los nodos la primera vez que hay contexto de audio. */
  ensure() {
    const c = this.fx.ctx;
    if (!c) return false;
    if (this.ctx) return true;
    this.ctx = c;
    this.input = c.createGain();
    this.dry = c.createGain();
    this.wet = c.createGain();
    this.wet.gain.value = 0;
    this.shaper = c.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      curve[i] = Math.tanh(x * 6);
    }
    this.shaper.curve = curve;
    this.lp = c.createBiquadFilter();
    this.lp.type = 'lowpass';
    this.lp.frequency.value = 18000;
    this.hp = c.createBiquadFilter();
    this.hp.type = 'highpass';
    this.hp.frequency.value = 20;
    this.layer = c.createGain(); // capa de calma/intensidad
    this.out = c.createGain();
    this.out.gain.value = this.vol;
    this.input.connect(this.dry).connect(this.lp);
    this.input.connect(this.shaper).connect(this.wet).connect(this.lp);
    this.lp.connect(this.hp).connect(this.layer).connect(this.out).connect(this.fx.out);
    // ruido reutilizable para la percusión
    const len = c.sampleRate;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.loadFiles();
    this.applyShape(true);
    return true;
  }

  /** Busca audio/musica/<pista>.mp3; si existe, sustituye al tema generado. */
  loadFiles() {
    for (const id of MUSIC_TRACKS) {
      const name = CONFIG.music.files[id]?.file ?? `${id}.mp3`;
      fetch(`audio/musica/${name}`)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((buf) => (buf ? this.ctx.decodeAudioData(buf) : null))
        .then((audio) => {
          if (!audio) return;
          this.files.set(id, audio);
          // si esa pista ya sonaba generada, pasa al archivo con un fundido
          if (this.current === id) this.play(id, { force: true });
        })
        .catch(() => {});
    }
  }

  applyLevel() {
    if (!this.ctx) return;
    const k = this.ducked ? CONFIG.music.duck : 1;
    this.out.gain.setTargetAtTime(this.vol * k, this.ctx.currentTime, this.ducked ? 0.12 : 0.35);
  }

  /** Baja la música mientras habla alguien (radio o personajes). */
  duck(on) {
    if (this.ducked === on) return;
    this.ducked = on;
    this.applyLevel();
  }

  /** Cambia a una pista con fundido cruzado. */
  play(id, { fade = CONFIG.music.crossfade, force = false } = {}) {
    if (!this.ensure()) {
      this.current = id;
      return;
    }
    if (id === this.current && !force && this.players.some((p) => !p.dead)) return;
    this.current = id;
    for (const p of this.players) if (!p.dead) p.stop(fade);
    const pl = new TrackPlayer(this, id, this.ctx.currentTime + 0.05);
    pl.fade(1, fade);
    this.players.push(pl);
    this.players = this.players.filter((p) => !p.dead || p === pl || p.gain.gain.value > 0.001);
    if (!this.timer) this.timer = setInterval(() => this.tick(), 25);
  }

  /** Para la música (fundido corto). play() la vuelve a arrancar. */
  stop(fade = 0.6) {
    this.current = null;
    for (const p of this.players) if (!p.dead) p.stop(fade);
    setTimeout(() => {
      if (!this.current && this.timer) {
        clearInterval(this.timer);
        this.timer = null;
        this.players = [];
      }
    }, (fade + 0.3) * 1000);
  }

  /** Nº de estrellas de búsqueda (capas de intensidad). */
  setStars(n) {
    if (n === this.stars) return;
    this.stars = n;
    this.applyShape();
  }

  /** Respiro: la música se calma. */
  setCalm(on) {
    if (on === this.calm) return;
    this.calm = on;
    this.applyShape();
  }

  /** Efecto de la habilidad especial activa: 'bullettime' | 'drive' | 'rage' | null. */
  setFx(name) {
    if (name === this.fxName) return;
    this.fxName = name;
    this.applyShape();
  }

  /** Lleva filtros, distorsión, tempo y tono a lo que piden las capas. */
  applyShape(instant = false) {
    const M = CONFIG.music;
    const fx = M.fx[this.fxName] ?? M.fx.none;
    this.tempoTarget = fx.tempo;
    this.pitchTarget = fx.pitch;
    this.rateTarget = fx.rate;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const tc = instant ? 0.01 : 0.4;
    let lp = fx.lowpass;
    let layer = 1 + Math.min(this.stars, 5) * M.starBoost;
    if (this.calm) {
      lp = Math.min(lp, M.calm.lowpass);
      layer = M.calm.volume;
    } else if (this.stars >= M.tenseFrom) {
      layer *= 1.05;
    }
    this.lp.frequency.setTargetAtTime(lp, now, tc);
    this.hp.frequency.setTargetAtTime(fx.highpass, now, tc);
    this.wet.gain.setTargetAtTime(fx.distortion * 0.3, now, tc);
    this.dry.gain.setTargetAtTime(1 - fx.distortion * 0.7, now, tc);
    this.layer.gain.setTargetAtTime(layer, now, tc * 2);
  }

  tick() {
    const c = this.ctx;
    if (!c || c.state !== 'running') return;
    // tempo y tono se deslizan (el tiempo bala "frena" la música)
    this.tempoMult += (this.tempoTarget - this.tempoMult) * 0.08;
    this.pitchMult += (this.pitchTarget - this.pitchMult) * 0.08;
    const until = c.currentTime + 0.12;
    for (const p of this.players) p.schedule(until);
    this.players = this.players.filter((p) => !p.dead || p.gain.gain.value > 0.0005);
  }
}
