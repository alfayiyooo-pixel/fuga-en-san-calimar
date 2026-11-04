// HELICÓPTERO JEFE (al llegar a 5 estrellas)
// Persecución especial de CONFIG.boss.duration s. El "Halcón" de la PSC te
// sigue con su foco y alterna patrones de ataque, siempre con aviso previo:
//   spot      el foco te sigue; cuando te fija se congela y dispara 1 s
//             después donde estabas (basta con moverse)
//   missiles  2-3 misiles, cada uno con su aviso en el borde derecho
//   gap       pared de balas desde la derecha con un hueco marcado en verde
//             (a pie, el hueco está siempre abajo)
// Nunca aparece antes de CONFIG.boss.minDistance m.
// Si sobrevives: gran recompensa, música de victoria y bajas a 2★.

import { CONFIG } from '../config.js';
import { rand, pick, clamp } from '../core/rng.js';
import { t } from '../core/i18n.js';
import { Sound } from '../core/audio.js';
import { Bullet, Missile } from '../entities/obstacles.js';
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
    return !this.active && !this.leaving && !g.dead && g.wanted.stars >= 5 && !g.respite.active && g.distance >= Math.max(this.cooldownUntil, CONFIG.boss.minDistance);
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
        const pats = (g.policeMode.bossPatterns ?? B.patterns).filter((k) => B[k]);
        const opts = pats.filter((k) => k !== this.last);
        const kind = pick(opts.length ? opts : pats);
        this.last = kind;
        this.attack = { kind, t: 0, fired: 0, slow: g.warnMult };
        if (kind === 'spot') this.startSpot(g);
        else if (kind === 'missiles') this.startMissiles(g);
        else if (kind === 'gap') this.startGap(g);
        Sound.lockBeep(false);
      }
      return;
    }
    const A = this.attack;
    A.t += dt;
    if (A.kind === 'spot') this.updateSpot(dt, g, A);
    else if (A.kind === 'missiles') {
      if (A.t >= A.until) this.endAttack();
    } else if (A.kind === 'gap') this.updateGap(dt, g, A);
  }

  /** Origen del foco (bajo el morro). */
  get lightX() {
    return this.x - 10;
  }
  get lightY() {
    return this.y + 26;
  }

  // ---- FOCO: te sigue; al fijarte, dispara 1 s después donde estabas ----
  startSpot(g) {
    const A = this.attack;
    A.ang = Math.PI * 0.62;
    A.lock = -1;    // s desde que te fijó (-1 = buscando)
    A.rest = 0.6;   // s antes de poder fijarte
    A.locks = 0;
    this.spotCatch = 0;
  }

  updateSpot(dt, g, A) {
    const S = CONFIG.boss.spot;
    const p = g.player;
    const to = Math.atan2(p.y - this.lightY, p.x - this.lightX);
    if (A.lock < 0) {
      // sigue al jugador con un giro limitado (se le puede dejar atrás)
      const d = clamp(to - A.ang, -S.follow * dt, S.follow * dt);
      A.ang += d;
      A.rest -= dt;
      const inside = Math.abs(to - A.ang) < S.half * 0.8;
      this.spotCatch = inside && A.rest <= 0 ? this.spotCatch + dt : Math.max(0, this.spotCatch - dt * 2);
      if (this.spotCatch >= S.catchTime && A.locks < S.locks) {
        // fijado: la línea se congela en tu posición actual
        A.lock = 0;
        A.ang = to;
        A.fired = 0;
        A.locks++;
        Sound.spottedAlarm();
      } else if (A.t > S.duration) this.endAttack();
      return;
    }
    A.lock += dt;
    const delay = S.fireDelay * (A.slow ?? 1);
    if (A.lock < delay) {
      if (Math.floor(A.lock * 6 / delay * 2) !== Math.floor((A.lock - dt) * 6 / delay * 2)) Sound.lockBeep(A.lock > delay * 0.6);
    } else if (A.fired < S.shots) {
      if (A.lock >= delay + A.fired * S.interval) {
        const b = new Bullet(this.lightX, this.lightY, Math.cos(A.ang), Math.sin(A.ang), g);
        b.src = 'boss-spot';
        g.addObstacle(b);
        A.fired++;
        Sound.shot();
      }
    } else if (A.lock > delay + S.shots * S.interval + 0.3) {
      // vuelve a buscar (o termina)
      A.lock = -1;
      A.rest = S.rest;
      this.spotCatch = 0;
      if (A.t > S.duration || A.locks >= S.locks) this.endAttack();
    }
  }

  // ---- MISILES: cada uno avisa en el borde (te sigue, se fija y sale) ----
  startMissiles(g) {
    const M = CONFIG.boss.missiles;
    const O = CONFIG.obstacles.missile;
    const n = M.count[Math.floor(Math.random() * M.count.length)];
    for (let i = 0; i < n; i++) {
      const m = new Missile(g, i * M.stagger, 0);
      m.src = 'boss-missile';
      g.addObstacle(m);
    }
    this.attack.until = (n - 1) * M.stagger + (O.warnTime + O.lockTime) * g.warnMult + 0.6;
  }

  // ---- RÁFAGA CON HUECO: pared de balas desde la derecha con un hueco bien marcado ----
  startGap(g) {
    const G = CONFIG.boss.gap;
    const A = this.attack;
    const v = g.view;
    const foot = g.player.onFoot;
    const top = CONFIG.world.ceiling;
    const gy = v.groundY;
    A.walls = [];
    const waves = foot ? G.footWaves : G.waves;
    let center = clamp(g.player.y + rand(-G.maxShift, G.maxShift), top + G.height / 2 + 10, gy - G.height / 2 - 6);
    for (let i = 0; i < waves; i++) {
      if (i > 0) center = clamp(center + rand(-G.maxShift, G.maxShift), top + G.height / 2 + 10, gy - G.height / 2 - 6);
      // a pie el hueco está siempre abajo (se pasa sin saltar o con un salto corto)
      const g0 = foot ? gy - G.footHeight : center - G.height / 2;
      const g1 = foot ? gy + 20 : center + G.height / 2;
      A.walls.push({ g0, g1, at: G.warn * (A.slow ?? 1) + i * G.waveGap, fired: false, firedT: 0 });
    }
  }

  updateGap(dt, g, A) {
    const G = CONFIG.boss.gap;
    const top = CONFIG.world.ceiling;
    const gy = g.view.groundY;
    let pending = false;
    for (const w of A.walls) {
      if (!w.fired && A.t >= w.at) {
        w.fired = true;
        const x = g.camera.x + g.view.w + 30;
        for (let y = top + 6; y < gy - 4; y += G.spacing) {
          if (y > w.g0 - 6 && y < w.g1 + 6) continue;
          const b = new Bullet(x, y, -1, 0, g);
          b.vx = g.speed - G.speed;
          b.src = 'boss-gap';
          g.addObstacle(b);
        }
        Sound.shot();
        Sound.boom();
      }
      if (w.fired) w.firedT += dt;
      if (!w.fired || w.firedT < (g.view.w + 60) / G.speed) pending = true;
    }
    if (!pending) this.endAttack();
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
      if (A.kind === 'spot') this.drawSpot(ctx, camX, g, A);
      else if (A.kind === 'gap') this.drawGap(ctx, g, A);
    }
    this.drawHeli(ctx, x, y, g);
  }

  /** Foco: blanco mientras busca; rojo y fijo (con cuenta atrás) cuando te ha fijado. */
  drawSpot(ctx, camX, g, A) {
    const S = CONFIG.boss.spot;
    const lx = this.lightX - camX;
    const ly = this.lightY;
    const len = 1100;
    const locked = A.lock >= 0;
    const delay = S.fireDelay * (A.slow ?? 1);
    const k = locked ? clamp(A.lock / delay, 0, 1) : 0;
    const sp = locked ? S.half * (1 - 0.6 * k) : S.half;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createLinearGradient(lx, ly, lx + Math.cos(A.ang) * len, ly + Math.sin(A.ang) * len);
    const hot = this.spotCatch > 0.05;
    const c = locked ? '255, 60, 80' : hot ? '255, 170, 150' : '255, 250, 210';
    gr.addColorStop(0, `rgba(${c}, ${locked ? 0.55 + 0.3 * k : 0.42})`);
    gr.addColorStop(1, `rgba(${c}, 0)`);
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx + Math.cos(A.ang - sp) * len, ly + Math.sin(A.ang - sp) * len);
    ctx.lineTo(lx + Math.cos(A.ang + sp) * len, ly + Math.sin(A.ang + sp) * len);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (locked && A.lock < delay + 0.05) {
      // línea de tiro y anillo que se cierra: 1 s para apartarse
      ctx.strokeStyle = `rgba(255, 61, 79, ${0.5 + 0.5 * k})`;
      ctx.lineWidth = 2 + k * 2;
      ctx.setLineDash([12, 7]);
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + Math.cos(A.ang) * len, ly + Math.sin(A.ang) * len);
      ctx.stroke();
      ctx.setLineDash([]);
      const p = g.player;
      const dist = Math.hypot(p.x - this.lightX, p.y - this.lightY);
      const tx = lx + Math.cos(A.ang) * dist;
      const ty = ly + Math.sin(A.ang) * dist;
      ctx.fillStyle = `rgba(255, 61, 79, ${0.15 + 0.2 * k})`;
      ctx.beginPath();
      ctx.arc(tx, ty, 40 - 26 * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.stroke();
      // cuenta atrás: el arco se va vaciando hasta el disparo
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(tx, ty, 48, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - k));
      ctx.stroke();
    }
  }

  /** Pared de balas: franja roja en el borde y el hueco en verde con flechas. */
  drawGap(ctx, g, A) {
    const G = CONFIG.boss.gap;
    const v = g.view;
    const top = CONFIG.world.ceiling;
    const gy = v.groundY;
    for (const w of A.walls) {
      const warnLeft = w.at - A.t;
      let x;
      if (!w.fired) {
        if (warnLeft > G.warn * (A.slow ?? 1) + 0.05) continue;
        x = v.w - 26;
        const blink = Math.floor(A.t * 10) % 2 === 0;
        ctx.fillStyle = blink ? 'rgba(255, 40, 60, 0.55)' : 'rgba(255, 40, 60, 0.32)';
        ctx.fillRect(x - 18, top, 36, w.g0 - top);
        if (w.g1 < gy) ctx.fillRect(x - 18, w.g1, 36, gy - w.g1);
        // dónde saldrá cada bala
        ctx.fillStyle = blink ? '#ffd23f' : '#ff7a3d';
        for (let by = top + 6; by < gy - 4; by += G.spacing) {
          if (by > w.g0 - 6 && by < w.g1 + 6) continue;
          ctx.beginPath();
          ctx.arc(x, by, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        x = v.w + 30 - G.speed * w.firedT;
        if (x < -40) continue;
      }
      // hueco: marco verde con flechas que indican por dónde pasar
      const g1 = Math.min(w.g1, gy);
      ctx.save();
      ctx.strokeStyle = '#3dff8a';
      ctx.fillStyle = 'rgba(61, 255, 138, 0.3)';
      ctx.lineWidth = 4;
      ctx.fillRect(x - 18, w.g0, 36, g1 - w.g0);
      ctx.beginPath();
      ctx.moveTo(x - 22, w.g0);
      ctx.lineTo(x + 22, w.g0);
      ctx.moveTo(x - 22, g1);
      ctx.lineTo(x + 22, g1);
      ctx.stroke();
      if (!w.fired) {
        const my = (w.g0 + g1) / 2;
        const off = (A.t * 60) % 20;
        ctx.fillStyle = '#3dff8a';
        for (let k = 0; k < 3; k++) {
          const ax = x - 30 - k * 24 - off;
          ctx.globalAlpha = 1 - k * 0.3;
          ctx.beginPath();
          ctx.moveTo(ax, my - 14);
          ctx.lineTo(ax - 14, my);
          ctx.lineTo(ax, my + 14);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    }
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
