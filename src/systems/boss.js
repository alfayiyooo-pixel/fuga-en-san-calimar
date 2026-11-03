// HELICÓPTERO JEFE (al llegar a 5 estrellas)
// Persecución especial de CONFIG.boss.duration s. El "Halcón" de la PSC te
// sigue con su foco y alterna patrones de ataque, siempre con aviso previo:
//   aimed  línea láser hacia ti y luego una ráfaga recta
//   fan    abanico de balas (aviso en arco)
//   rain   columnas marcadas desde arriba: caen balas en vertical
//   spot   el foco te busca; si te pilla, ráfaga rápida
// Si sobrevives: gran recompensa, música de victoria y bajas a 2★.

import { CONFIG } from '../config.js';
import { rand, pick, clamp } from '../core/rng.js';
import { t } from '../core/i18n.js';
import { Sound } from '../core/audio.js';
import { Bullet } from '../entities/obstacles.js';
import { drawGlow } from '../fx/sprites.js';

const INK = '#1b1030';

export class Boss {
  constructor() {
    this.reset();
  }

  reset() {
    this.active = false;
    this.leaving = 0;
    this.cooldownUntil = 0; // metros: no vuelve hasta aquí
    this.wins = 0;
  }

  /** ¿Puede empezar? (5★, sin respiro, y no muy seguido). */
  canStart(g) {
    return !this.active && !this.leaving && !g.dead && g.wanted.stars >= 5 && !g.respite.active && g.distance >= this.cooldownUntil;
  }

  start(g) {
    const B = CONFIG.boss;
    this.active = true;
    this.time = 0;
    this.left = B.duration;
    this.x = g.camera.x + g.view.w + 200; // entra por la derecha
    this.y = 110;
    this.attack = null;
    this.nextAttack = B.firstAttack;
    this.spotCatch = 0;
    this.rotor = 0;
    this.last = null;
    g.hud.banner(t('boss.title'), t('boss.sub'));
    g.camera.addShake(0.5);
    Sound.chopper();
    Sound.siren();
    Sound.eventAlarm();
    g.onBossStart?.();
  }

  update(dt, g) {
    if (this.leaving > 0) {
      this.leaving -= dt;
      this.x += 500 * dt + g.speed * dt;
      this.y -= 160 * dt;
      this.rotor += dt * 40;
      return;
    }
    if (!this.active) {
      if (this.canStart(g)) this.start(g);
      return;
    }
    const B = CONFIG.boss;
    this.time += dt;
    this.left -= dt;
    this.rotor += dt * 40;
    // mantiene las 5★ mientras dura
    g.wanted.heat = Math.max(g.wanted.heat, g.wanted.thresholds[4]);
    g.wanted.sinceIncident = 0;
    // vuela delante de ti, arriba a la derecha, con vaivén
    const tx = g.camera.x + g.view.w * 0.72 + Math.sin(this.time * 0.8) * 90;
    const ty = 165 + Math.sin(this.time * 1.7) * 25;
    this.x += (tx - this.x) * Math.min(1, dt * 2.2);
    this.y += (ty - this.y) * Math.min(1, dt * 2.2);

    if (g.dead) {
      this.end(g, false);
      return;
    }
    this.updateAttack(dt, g);
    if (this.left <= 0) this.end(g, true);
  }

  updateAttack(dt, g) {
    const B = CONFIG.boss;
    const p = g.player;
    if (!this.attack) {
      this.nextAttack -= dt;
      if (this.nextAttack <= 0) {
        const pats = g.policeMode.bossPatterns ?? B.patterns;
        const opts = pats.filter((k) => k !== this.last);
        const kind = pick(opts);
        this.last = kind;
        this.attack = { kind, t: 0, fired: 0, slow: g.warnMult };
        const A = this.attack;
        if (kind === 'aimed') A.aim = { x: p.x + g.speed * 0.6, y: p.y };
        if (kind === 'rain') A.cols = Array.from({ length: B.rain.columns }, (_, i) => g.camera.x + g.view.w * (0.28 + i * (0.6 / B.rain.columns)) + rand(-30, 30));
        Sound.lockBeep(false);
      }
      return;
    }
    const A = this.attack;
    // durante el aviso el reloj va más lento si vas a pie (más tiempo para reaccionar)
    const warn = B[A.kind]?.warn ?? 0;
    A.t += A.t < warn ? dt / (A.slow ?? 1) : dt;
    const gunX = this.x - 40;
    const gunY = this.y + 30;
    if (A.kind === 'aimed') {
      // el punto de mira sigue un poco al jugador durante el aviso
      if (A.t < B.aimed.warn) {
        A.aim.x += (p.x + g.speed * 0.5 - A.aim.x) * Math.min(1, dt * 3);
        A.aim.y += (p.y - A.aim.y) * Math.min(1, dt * 3);
        if (Math.floor(A.t * 8) !== Math.floor((A.t - dt) * 8)) Sound.lockBeep(A.t > B.aimed.warn * 0.6);
      } else if (A.fired < B.aimed.shots && A.t > B.aimed.warn + A.fired * B.aimed.interval) {
        const dx = A.aim.x - gunX;
        const dy = A.aim.y - gunY;
        const len = Math.hypot(dx, dy) || 1;
        g.addObstacle(new Bullet(gunX, gunY, dx / len, dy / len, g));
        A.fired++;
        Sound.shot();
      } else if (A.fired >= B.aimed.shots) this.endAttack();
    } else if (A.kind === 'fan') {
      if (A.t >= B.fan.warn && !A.fired) {
        A.fired = 1;
        const n = B.fan.bullets;
        for (let i = 0; i < n; i++) {
          const a = Math.PI * (0.55 + (0.4 * i) / (n - 1)); // hacia abajo-izquierda
          g.addObstacle(new Bullet(gunX, gunY, Math.cos(a), Math.sin(a), g));
        }
        Sound.shot();
        Sound.boom();
      } else if (A.fired && A.t > B.fan.warn + 0.4) this.endAttack();
    } else if (A.kind === 'rain') {
      if (A.t >= B.rain.warn && A.fired < B.rain.waves) {
        if (A.t >= B.rain.warn + A.fired * 0.35) {
          for (const cx of A.cols) {
            const b = new Bullet(cx, -20, 0, 1, g);
            b.vx = g.speed; // cae en vertical respecto a la pantalla
            b.vy = B.rain.speed;
            g.addObstacle(b);
          }
          A.fired++;
          Sound.shot();
        }
      } else if (A.fired >= B.rain.waves) this.endAttack();
      // las columnas avanzan con la cámara
      for (let i = 0; i < A.cols.length; i++) A.cols[i] += g.speed * dt;
    } else if (A.kind === 'spot') {
      // el foco barre de lado a lado
      const ang = Math.PI * 0.5 + Math.sin(A.t * 1.8) * 0.75;
      A.ang = ang;
      const vx = Math.cos(ang);
      const vy = Math.sin(ang);
      const px = p.x - this.x;
      const py = p.y - (this.y + 20);
      const along = px * vx + py * vy;
      const across = Math.abs(px * -vy + py * vx);
      const inside = along > 0 && across < 30 + along * 0.22;
      this.spotCatch = inside ? this.spotCatch + dt : Math.max(0, this.spotCatch - dt * 2);
      if (this.spotCatch > B.spot.catchTime && !A.burst) {
        A.burst = A.t;
        Sound.spottedAlarm();
      }
      if (A.burst && A.fired < B.spot.shots && A.t > A.burst + B.spot.windup * (A.slow ?? 1) + A.fired * 0.12) {
        const dx = p.x + g.speed * 0.3 - gunX;
        const dy = p.y - gunY;
        const len = Math.hypot(dx, dy) || 1;
        g.addObstacle(new Bullet(gunX, gunY, dx / len, dy / len, g));
        A.fired++;
        Sound.shot();
      }
      if (A.t > B.spot.duration) this.endAttack();
    }
  }

  endAttack() {
    this.attack = null;
    this.spotCatch = 0;
    this.nextAttack = rand(CONFIG.boss.gap[0], CONFIG.boss.gap[1]);
  }

  end(g, won) {
    const B = CONFIG.boss;
    this.active = false;
    this.attack = null;
    this.leaving = 3;
    this.cooldownUntil = g.distance + B.cooldown;
    if (!won) return;
    this.wins++;
    g.stats.bossWins = (g.stats.bossWins ?? 0) + 1;
    // recompensa
    const R = B.reward;
    g.earn('boss', R.bucks);
    g.gemsRun += R.gems;
    g.xpRun += R.xp;
    g.wanted.drain(9999, 0);
    g.wanted.heat = 0;
    g.wanted.stars = 0;
    g.wanted.setStars(B.starsAfter);
    g.flash = 1;
    g.camera.addShake(0.6);
    const p = g.player;
    g.particles.spawn({ x: p.x, y: p.y, life: 0.8, size: 30, sizeEnd: 320, color: 'rgba(255, 220, 120, 0.9)', shape: 'glow', additive: true, important: true });
    for (let k = 0; k < 4; k++) g.particles.burst(p.x + rand(-80, 80), p.y - rand(40, 160), 18, { color: ['#ffd23f', '#9ff8ff', '#ff6b7d', '#9dffb5'][k], speed: 360, life: 1.4, size: 4, shape: 'rect', spin: 10, gravity: 400, important: true });
    g.hud.banner(t('boss.win'), t('boss.winSub'));
    g.popups.add(`+${R.bucks} 💵  +${R.gems} 💎  +${R.xp} XP`, g.view.w / 2, 250, { color: '#ffd23f', size: 26, life: 2.5, rise: 10 });
    Sound.victory();
    g.onBossWin?.();
  }

  // ---------------- DIBUJO ----------------

  /** Avisos de ataque y el helicóptero (en el mundo). */
  draw(ctx, camX, g) {
    if (!this.active && this.leaving <= 0) return;
    const A = this.attack;
    const x = this.x - camX;
    const y = this.y;
    const B = CONFIG.boss;
    if (A && this.active) {
      const gunX = x - 40;
      const gunY = y + 30;
      if (A.kind === 'aimed' && A.t < B.aimed.warn + 0.1) {
        const k = A.t / B.aimed.warn;
        const ax = A.aim.x - camX;
        const dx = ax - gunX;
        const dy = A.aim.y - gunY;
        const len = Math.hypot(dx, dy) || 1;
        ctx.strokeStyle = `rgba(255, 61, 79, ${0.3 + 0.6 * k})`;
        ctx.lineWidth = 1.5 + k * 2;
        ctx.setLineDash([12, 6]);
        ctx.beginPath();
        ctx.moveTo(gunX, gunY);
        ctx.lineTo(gunX + (dx / len) * 1400, gunY + (dy / len) * 1400);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = '#ff3d4f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ax, A.aim.y, 16 - k * 6, 0, Math.PI * 2);
        ctx.stroke();
      } else if (A.kind === 'fan' && A.t < B.fan.warn) {
        const blink = Math.floor(A.t * 10) % 2 === 0;
        ctx.fillStyle = blink ? 'rgba(255, 61, 79, 0.18)' : 'rgba(255, 182, 39, 0.1)';
        ctx.beginPath();
        ctx.moveTo(gunX, gunY);
        ctx.arc(gunX, gunY, 900, Math.PI * 0.55, Math.PI * 0.95);
        ctx.closePath();
        ctx.fill();
      } else if (A.kind === 'rain' && A.fired < B.rain.waves) {
        for (const cx of A.cols) {
          const sx = cx - camX;
          ctx.fillStyle = `rgba(255, 61, 79, ${0.12 + 0.1 * Math.sin(A.t * 20)})`;
          ctx.fillRect(sx - 14, 0, 28, g.view.groundY);
          ctx.fillStyle = '#ff3d4f';
          ctx.beginPath();
          ctx.moveTo(sx - 12, 4);
          ctx.lineTo(sx + 12, 4);
          ctx.lineTo(sx, 22);
          ctx.fill();
        }
      } else if (A.kind === 'spot' && A.ang !== undefined) {
        const len = 900;
        const sp = 0.22;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const gr = ctx.createLinearGradient(x, y + 20, x + Math.cos(A.ang) * len, y + 20 + Math.sin(A.ang) * len);
        const hot = this.spotCatch > 0.05;
        gr.addColorStop(0, hot ? 'rgba(255, 120, 120, 0.5)' : 'rgba(255, 250, 210, 0.45)');
        gr.addColorStop(1, 'rgba(255, 250, 210, 0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.moveTo(x, y + 20);
        ctx.lineTo(x + Math.cos(A.ang - sp) * len, y + 20 + Math.sin(A.ang - sp) * len);
        ctx.lineTo(x + Math.cos(A.ang + sp) * len, y + 20 + Math.sin(A.ang + sp) * len);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    this.drawHeli(ctx, x, y, g);
  }

  drawHeli(ctx, x, y, g) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1.55, 1.55);
    ctx.rotate(-0.06);
    // cola
    ctx.fillStyle = INK;
    ctx.fillRect(18, -4, 62, 10);
    ctx.fillStyle = '#2c2440';
    ctx.fillRect(20, -2, 58, 6);
    ctx.fillStyle = '#ff3d4f';
    ctx.fillRect(50, -2, 10, 6);
    // rotor de cola
    ctx.strokeStyle = 'rgba(220, 220, 240, 0.6)';
    ctx.lineWidth = 3;
    const tr = this.rotor * 1.6;
    ctx.beginPath();
    ctx.moveTo(80 + Math.cos(tr) * 12, 1 + Math.sin(tr) * 12);
    ctx.lineTo(80 - Math.cos(tr) * 12, 1 - Math.sin(tr) * 12);
    ctx.stroke();
    // cuerpo
    ctx.beginPath();
    ctx.ellipse(0, 4, 34, 20, 0, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 4, 31, 17, 0, 0, Math.PI * 2);
    const gr = ctx.createLinearGradient(0, -14, 0, 22);
    gr.addColorStop(0, '#4a4060');
    gr.addColorStop(1, '#1e1830');
    ctx.fillStyle = gr;
    ctx.fill();
    // franjas rojas y cabina
    ctx.fillStyle = '#ff3d4f';
    ctx.fillRect(-20, 10, 40, 4);
    ctx.beginPath();
    ctx.ellipse(-16, 0, 14, 10, -0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#9fe1ff';
    ctx.fill();
    ctx.fillStyle = '#fff4dc';
    ctx.font = "9px 'Bungee', Impact, sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText('PSC', 10, 6);
    // cañón y foco
    ctx.fillStyle = INK;
    ctx.fillRect(-30, 16, 16, 5);
    drawGlow(ctx, -6, 22, 12, 'rgba(255, 250, 220, 0.9)', 0.8);
    // patines
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-26, 30);
    ctx.lineTo(24, 30);
    ctx.moveTo(-14, 22);
    ctx.lineTo(-16, 30);
    ctx.moveTo(12, 22);
    ctx.lineTo(14, 30);
    ctx.stroke();
    // rotor principal
    ctx.fillStyle = 'rgba(220, 220, 240, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, -18, 70, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(240, 240, 255, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const r = Math.cos(this.rotor) * 70;
    ctx.moveTo(-r, -18);
    ctx.lineTo(r, -18);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.fillRect(-4, -20, 8, 8);
    // luces de sirena
    const on = Math.floor(g.t * 8) % 2 === 0;
    drawGlow(ctx, -6, -8, 16, on ? 'rgba(255, 61, 79, 0.9)' : 'rgba(61, 140, 255, 0.9)', 0.9);
    ctx.restore();
  }

  /** Barra de tiempo (en pantalla). */
  overlay(ctx, g) {
    if (!this.active) return;
    const B = CONFIG.boss;
    const v = g.view;
    const w = 300;
    const x = v.w / 2 - w / 2;
    const y = 64;
    const frac = clamp(this.left / B.duration, 0, 1);
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.roundRect(x - 4, y - 4, w + 8, 22, 11);
    ctx.fill();
    ctx.fillStyle = '#ff3d4f';
    ctx.beginPath();
    ctx.roundRect(x, y, Math.max(8, w * frac), 14, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(x + 6, y + 2, Math.max(0, w * frac - 12), 3);
    ctx.font = "13px 'Bungee', Impact, sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    const label = `${t('boss.bar')} · ${Math.ceil(this.left)} s`;
    ctx.strokeText(label, v.w / 2, y + 30);
    ctx.fillStyle = '#fff4dc';
    ctx.fillText(label, v.w / 2, y + 30);
  }
}
