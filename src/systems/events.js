import { CONFIG } from '../config.js';
import { rand, chance } from '../core/rng.js';
import { t } from '../core/i18n.js';
import { Sound } from '../core/audio.js';
import { PatrolCar } from '../entities/obstacles.js';
import { drawGlow } from '../fx/sprites.js';

const INK = '#1b1030';

/**
 * Eventos aleatorios cada 30-60 s:
 *   chase    — persecución policial: patrullas en cadena; si aguantas, premio
 *   billRain — lluvia de billetes
 *   truck    — atraco sorpresa: un furgón blindado; tócalo y suelta el botín
 *   chaos    — zona de caos: los pavos valen el doble
 */
export class Events {
  reset() {
    this.timer = CONFIG.events.firstAfter + rand(0, 10);
    this.current = null;   // id del evento activo
    this.pending = null;   // evento anunciado, a punto de empezar
    this.warnLeft = 0;
    this.left = 0;
    this.duration = 1;
    this.last = null;
    this.truck = null;
    this.carTimer = 0;
    this.count = 0;
  }

  get active() {
    return !!this.current;
  }

  /** Multiplicador de pavos (zona de caos). */
  get bucksMult() {
    return this.current === 'chaos' ? CONFIG.events.chaos.bucksMult : 1;
  }

  /** Multiplicador de separación de obstáculos. */
  get gapMult() {
    if (this.current === 'billRain') return CONFIG.events.billRain.gapMult;
    if (this.current === 'chaos') return CONFIG.events.chaos.gapMult;
    return 1;
  }

  /** 0→1 progreso del evento con duración (para el HUD). */
  get progress() {
    return this.current && this.current !== 'truck' ? 1 - this.left / this.duration : 0;
  }

  choose() {
    const W = CONFIG.events.weights;
    const entries = Object.entries(W).filter(([id]) => id !== this.last);
    let roll = Math.random() * entries.reduce((s, [, w]) => s + w, 0);
    for (const [id, w] of entries) {
      roll -= w;
      if (roll <= 0) return id;
    }
    return entries[0][0];
  }

  update(dt, g) {
    const E = CONFIG.events;
    if (g.dead) return;
    // nada de eventos durante un respiro o el arranque rápido
    const blocked = g.respite.active || g.powers.has('boost');

    if (!this.current && !this.pending) {
      if (!blocked) this.timer -= dt;
      if (this.timer <= 0) {
        this.pending = this.choose();
        this.warnLeft = E.warning;
        Sound.eventAlarm();
        g.hud.banner(t('event.incoming'), t(`event.${this.pending}.title`));
      }
    } else if (this.pending) {
      this.warnLeft -= dt;
      if (this.warnLeft <= 0) this.start(this.pending, g);
    } else {
      this.tick(dt, g);
    }
    if (this.truck) this.updateTruck(dt, g);
  }

  start(id, g) {
    const E = CONFIG.events;
    this.current = id;
    this.pending = null;
    this.last = id;
    this.count++;
    this.duration = E[id].duration ?? 1;
    this.left = this.duration;
    g.popups.add(t(`event.${id}.sub`), g.view.w / 2, 205, { color: '#ffd23f', size: 22, life: 2, rise: 8 });
    if (id === 'chase') {
      this.carTimer = 0;
      Sound.siren();
    } else if (id === 'truck') {
      this.spawnTruck(g);
    } else if (id === 'chaos') {
      g.flash = Math.max(g.flash, 0.5);
      g.camera.addShake(0.3);
      Sound.multUp(4);
    } else if (id === 'billRain') {
      Sound.gold();
    }
  }

  end(g, success = true) {
    const id = this.current;
    this.current = null;
    this.timer = rand(...CONFIG.events.interval);
    if (id === 'chase' && success && !g.dead) {
      const r = CONFIG.events.chase.reward;
      g.bucks += r;
      g.hud.bumpBucks(true);
      g.popups.add(t('event.chase.done', { n: r }), g.view.w / 2, 200, { color: '#9dffb5', size: 26, life: 1.8, rise: 10 });
      Sound.fanfare();
    }
  }

  tick(dt, g) {
    const E = CONFIG.events;
    if (this.current === 'truck') {
      if (!this.truck) this.end(g);
      return;
    }
    this.left -= dt;
    if (this.current === 'chase') {
      this.carTimer -= dt;
      if (this.carTimer <= 0) {
        this.carTimer = E.chase.carEvery * rand(0.8, 1.2);
        g.addObstacle(new PatrolCar(g));
        if (chance(E.chase.pairChance)) g.addObstacle(new PatrolCar(g, 0.8));
      }
    } else if (this.current === 'billRain') {
      g.tokens.rain(dt, g, E.billRain.rate, E.billRain.goldChance);
    }
    if (this.left <= 0) this.end(g, true);
  }

  // ---------------- FURGÓN BLINDADO ----------------
  spawnTruck(g) {
    this.truck = {
      x: g.camera.x + g.view.w + 80,
      w: 150,
      h: 64,
      robbed: false,
      doors: 0,
      wheel: 0,
    };
  }

  updateTruck(dt, g) {
    const T = this.truck;
    const C = CONFIG.events.truck;
    T.x += g.speed * C.speed * dt;
    T.wheel += dt * 20;
    const gy = g.view.groundY;
    if (T.robbed) T.doors = Math.min(1, T.doors + dt * 4);
    // ¿lo toca el jugador? (desde arriba o de frente)
    const box = g.player.hitbox;
    if (!T.robbed && box.r > T.x && box.l < T.x + T.w && box.b > gy - T.h - 6) this.rob(g);
    // se pierde de vista por la izquierda: fin del evento
    if (T.x + T.w < g.camera.x - 100) {
      this.truck = null;
      if (this.current === 'truck') this.end(g, false);
    }
  }

  /** ¡Atraco! El furgón suelta el botín en abanico. */
  rob(g) {
    const T = this.truck;
    const C = CONFIG.events.truck;
    T.robbed = true;
    const gy = g.view.groundY;
    const ox = T.x + 10;
    const oy = gy - T.h + 10;
    const add = (kind) => {
      const tk = g.tokens.add(ox + rand(-10, 30), oy, kind);
      tk.falling = true;
      tk.vy = rand(-620, -320);
      tk.vx = rand(0, 260) + g.speed * 1.1; // hacia delante, para que caiga en tu camino
    };
    for (let i = 0; i < C.bills; i++) add('bill');
    for (let i = 0; i < C.gold; i++) add('gold');
    for (let i = 0; i < C.cases; i++) add('case');
    g.wanted.add(C.heat);
    g.camera.addShake(0.5);
    g.flash = Math.max(g.flash, 0.6);
    g.particles.burst(ox, oy, 24, { color: '#ffd23f', speed: 360, life: 0.6, size: 4, sizeEnd: 0, additive: true, important: true });
    g.particles.spawn({ x: ox, y: oy, life: 0.5, size: 20, sizeEnd: 140, color: 'rgba(255, 220, 120, 0.9)', shape: 'glow', additive: true, important: true });
    g.popups.add(t('event.truck.robbed'), g.view.w / 2, 200, { color: '#ffd23f', size: 34, life: 1.8, rise: 10 });
    Sound.bigBoom();
    Sound.briefcase();
    if (this.current === 'truck') this.end(g, true);
  }

  draw(ctx, camX, g) {
    const T = this.truck;
    if (!T) return;
    const x = T.x - camX;
    const gy = g.view.groundY;
    const y = gy - T.h;
    // sombra
    ctx.fillStyle = 'rgba(10, 5, 30, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x + T.w / 2, gy + 3, T.w / 2 + 6, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!T.robbed) drawGlow(ctx, x + T.w / 2, y + T.h / 2, T.w * 0.7, 'rgba(255, 210, 63, 0.9)', 0.25 + 0.15 * Math.sin(g.t * 6));
    // caja blindada
    ctx.fillStyle = INK;
    ctx.fillRect(x - 3, y - 3, T.w + 6, T.h - 8);
    const grad = ctx.createLinearGradient(0, y, 0, y + T.h);
    grad.addColorStop(0, '#9aa7bd');
    grad.addColorStop(1, '#4e5a70');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, T.w, T.h - 14);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(x, y + 22, T.w, 7);
    ctx.fillStyle = INK;
    ctx.font = "12px 'Bungee', Impact, sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LINGOTE', x + T.w / 2 + 14, y + 26);
    // remaches
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let k = 0; k < 8; k++) ctx.fillRect(x + 8 + k * 18, y + 6, 3, 3);
    // cabina (delante, a la derecha)
    ctx.fillStyle = INK;
    ctx.fillRect(x + T.w - 4, y + 14, 34, T.h - 28);
    ctx.fillStyle = '#4e5a70';
    ctx.fillRect(x + T.w - 2, y + 16, 30, T.h - 32);
    ctx.fillStyle = '#9fe1ff';
    ctx.fillRect(x + T.w + 8, y + 19, 16, 12);
    // puertas traseras (se abren al robarlo)
    const d = T.doors;
    ctx.fillStyle = '#7d889c';
    ctx.save();
    ctx.translate(x, y);
    ctx.fillRect(-d * 26, 2, 8 + d * 4, T.h - 18);
    ctx.restore();
    if (!T.robbed) {
      ctx.fillStyle = INK;
      ctx.fillRect(x + 2, y + 30, 6, 6);
      // aviso "¡Tócalo!"
      ctx.font = "13px 'Bungee', Impact, sans-serif";
      ctx.fillStyle = '#ffd23f';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4;
      const label = t('event.truck.hint');
      ctx.strokeText(label, x + T.w / 2, y - 16 + Math.sin(g.t * 6) * 3);
      ctx.fillText(label, x + T.w / 2, y - 16 + Math.sin(g.t * 6) * 3);
    }
    // ruedas
    for (const wx of [x + 26, x + T.w - 10]) {
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(wx, gy - 10, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#9aa3b5';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(wx + Math.cos(T.wheel) * 6, gy - 10 + Math.sin(T.wheel) * 6);
      ctx.lineTo(wx - Math.cos(T.wheel) * 6, gy - 10 - Math.sin(T.wheel) * 6);
      ctx.stroke();
    }
  }
}
