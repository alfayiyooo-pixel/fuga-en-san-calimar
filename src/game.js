import { CONFIG } from './config.js';
import { Camera } from './core/camera.js';
import { rand, clamp, approach } from './core/rng.js';
import { t } from './core/i18n.js';
import { Particles } from './fx/particles.js';
import { Popups } from './fx/popups.js';
import { Player } from './entities/player.js';
import { Parallax } from './world/parallax.js';
import { zoneAt } from './world/zones.js';
import { Spawner } from './world/spawner.js';
import { Wanted } from './systems/wanted.js';
import { Tokens } from './entities/tokens.js';
import { Sound } from './core/audio.js';
import { Respite } from './systems/respite.js';
import { Powers } from './systems/powers.js';
import { Combo } from './systems/combo.js';
import { drawGlow } from './fx/sprites.js';

/**
 * Estado de una partida: jugador, cámara, mundo, obstáculos y efectos.
 * main.js decide cuándo se actualiza (menú, jugando, pausa, final).
 */
export class Game {
  constructor(view, hud) {
    this.view = view;
    this.hud = hud;
    this.camera = new Camera();
    this.particles = new Particles();
    this.popups = new Popups();
    this.player = new Player();
    this.parallax = new Parallax();
    this.spawner = new Spawner();
    this.wanted = new Wanted();
    this.wanted.onChange = (stars, prev) => this.onStars(stars, prev);
    this.wanted.onWarn = (first) => this.onWantedWarn(first);
    this.obstacles = [];
    this.tokens = new Tokens();
    this.respite = new Respite();
    this.powers = new Powers();
    this.combo = new Combo();
    this.record = 0; // récord de distancia al empezar la partida (lo pone main.js)
    this.buffer = document.createElement('canvas');
    this.t = 0;
    // Opciones de prueba: ?god (invulnerable) y ?start=1500 (empezar en esos metros)
    const q = new URLSearchParams(location.search);
    this.god = q.has('god');
    this.startAt = Number(q.get('start')) || 0;
    this.reset();
  }

  reset() {
    this.runTime = 0;
    this.player.reset(this.startAt * CONFIG.world.pxPerMeter, this.view.groundY);
    this.speed = this.targetSpeed();
    this.camera.reset();
    this.camera.follow(this.player.x, this.view.w);
    this.particles.clear();
    this.popups.clear();
    this.obstacles.length = 0;
    this.spawner.reset(this.player.x);
    this.tokens.reset(this.player.x);
    this.bucks = 0;
    this.wanted.reset();
    this.respite.reset();
    this.powers.reset();
    this.combo.reset();
    this.recordBeaten = false;
    this.powers.applyMods(this.player);
    this.timeScale = 1;
    this.inputHeld = false;
    this.zone = zoneAt(this.distance);
    this.zoneIndex = this.zone.n;
    this.dead = false;
    this.over = false;
    this.deathTimer = 0;
    this.cause = null;
    this.flash = 0;
    this.fadeIn = 1;
  }

  get distance() {
    return Math.max(0, this.player.x / CONFIG.world.pxPerMeter);
  }

  /** Dificultad por distancia, de 0 a 1. */
  get difficulty() {
    return clamp(this.distance / CONFIG.difficulty.fullAt, 0, 1);
  }

  /** Velocidad base según la distancia (ver CONFIG.speed). */
  baseSpeed() {
    const { start, max, cruiseUntil, rampDistance } = CONFIG.speed;
    const d = this.distance;
    return d <= cruiseUntil ? start : start + (max - start) * (1 - Math.exp(-(d - cruiseUntil) / rampDistance));
  }

  /** Velocidad objetivo: base × personaje × respiro. */
  targetSpeed() {
    return this.baseSpeed() * this.player.mods.speed * this.respite.speedMult;
  }

  /** Configuración de policía para el nº de estrellas actual. */
  get policeLevel() {
    const L = CONFIG.wanted.levels;
    if (this.respite.active) return L[0]; // durante un respiro la policía pierde el rastro
    return L[Math.min(this.wanted.stars, L.length - 1)];
  }

  /** Recoger pavos llama la atención de la policía. */
  onCollect(kind) {
    if (this.respite.active) return; // la lluvia de pavos es un premio
    const H = CONFIG.wanted.heat;
    if (kind === 'bill') this.wanted.add(H.tokenBill);
    else if (kind === 'gold') this.wanted.add(H.tokenGold);
    else if (kind === 'case') this.wanted.add(H.tokenCase);
  }

  onWantedWarn(first) {
    if (this.dead) return;
    Sound.warn();
    if (first) {
      this.popups.add(t('wanted.warn'), this.view.w / 2, 112, { color: '#ff6b7d', size: 20, life: 1.6, rise: 10 });
    }
  }

  addObstacle(o) {
    this.obstacles.push(o);
  }

  /** La policía te ha visto: sube la búsqueda. */
  spotted(heat, wx, wy) {
    this.wanted.add(heat);
    if (heat >= 4) this.popAt(t('popup.spotted'), wx, wy, '#ff6b7d');
  }

  /** Caos en la ciudad: sube la búsqueda. */
  chaos(heat, wx, wy) {
    this.wanted.add(heat);
    this.popAt(t('popup.chaos'), wx, wy, '#ffd23f', 20);
  }

  popAt(text, wx, wy, color, size = 22) {
    this.popups.add(text, wx - this.camera.x, wy, { color, size });
  }

  onStars(stars, prev) {
    if (this.dead) return;
    if (stars > prev) {
      this.hud.flashStars();
      this.camera.addShake(0.2);
      Sound.starUp();
      this.popups.add(t('wanted.up', { n: stars }), this.view.w / 2, 112, { color: '#ffd23f', size: 30, life: 1.6, rise: 16 });
    } else if (!this.respite.active) {
      Sound.starDown();
      this.popups.add(t('wanted.lost'), this.view.w / 2, 112, { color: '#7ff7e8', size: 24, life: 1.6, rise: 16 });
    }
  }

  /** Paso de simulación durante la partida. */
  update(dt, input) {
    this.t += dt;
    const p = this.player;

    if (this.dead) {
      this.deathTimer += dt;
      this.speed *= Math.exp(-CONFIG.death.slowdown * dt);
      if (p.updateDead(dt, this.speed, this.view.groundY)) {
        this.camera.addShake(0.15);
        this.dust(p.x, p.bottom, 8);
      }
      if (this.deathTimer > CONFIG.death.overDelay) this.over = true;
      input.consumePresses();
    } else {
      this.runTime += dt;
      // cámara lenta (tiempo bala, transformación): el mundo va más despacio
      this.timeScale = approach(this.timeScale, this.powers.timeScale, 10, dt);
      this.powers.applyMods(p);
      // se acerca suavemente a la velocidad objetivo: nunca hay saltos
      this.speed = approach(this.speed, this.targetSpeed(), CONFIG.speed.smoothing, dt);
      // en la conducción perfecta el coche va por el suelo (no se vuela)
      this.inputHeld = input.held && !this.powers.has('drive');
      const ev = p.update(dt, this.inputHeld, this.speed * this.timeScale, this.view.groundY);
      this.powers.update(dt, this, input.consumePresses());

      if (ev.landed && ev.impact > CONFIG.player.hardLanding) {
        this.camera.addShake(0.25);
        this.dust(p.x, p.bottom, 10);
      }
      if (ev.bonk) this.camera.addShake(0.15);
      if (p.onGround && Math.random() < dt * 14) this.dust(p.x - 6, p.bottom, 1);
      p.emitExhaust(dt, this.particles);
      this.wanted.update(dt);
      this.respite.update(dt, this);
      this.combo.update(dt);
      this.checkRecord();
      Sound.music.setIntensity(this.wanted.stars / 5);
    }

    this.camera.follow(p.x, this.view.w);
    this.camera.update(dt);
    this.updateZone();
    if (!this.dead) this.spawner.update(this);
    const wdt = dt * (this.dead ? 1 : this.timeScale);
    this.tokens.update(wdt, this);

    // obstáculos (y esquivas al límite)
    const box = p.hitbox;
    const m = CONFIG.score.nearMargin;
    const near = { l: box.l - m, r: box.r + m, t: box.t - m, b: box.b + m };
    const canNear = !this.dead && !this.powers.invulnerable;
    for (const o of this.obstacles) {
      o.update(wdt, this);
      if (!this.dead && o.alive && o.hits(box)) this.hit(o);
      if (canNear && o.alive && !o.nearSeen && o.hits(near)) o.nearSeen = true;
      if (o.nearSeen && !o.nearDone && o.alive && !this.dead && this.centerOf(o).x < p.left - 10) {
        o.nearDone = true;
        if (!this.powers.invulnerable) this.combo.nearMiss(this, p.x, p.y - 50);
      }
      o.cull(this.camera.x);
    }
    this.obstacles = this.obstacles.filter((o) => o.alive);

    this.particles.update(wdt);
    this.popups.update(dt);
    this.flash = Math.max(0, this.flash - dt * 3);
    this.fadeIn = Math.max(0, this.fadeIn - dt * 2.5);
  }

  updateZone() {
    this.zone = zoneAt(this.distance);
    if (this.zone.n !== this.zoneIndex) {
      this.zoneIndex = this.zone.n;
      this.hud.banner(t('zone.enter'), t(this.zone.current.nameKey));
    }
  }

  /** Bandera del récord: celebración al superarlo (una vez por partida). */
  checkRecord() {
    if (this.recordBeaten || this.record < 30 || this.distance <= this.record) return;
    if (this.startAt >= this.record) return;
    this.recordBeaten = true;
    const v = this.view;
    this.flash = Math.max(this.flash, 0.8);
    this.camera.addShake(0.4);
    this.hud.banner(t('record.new'), t('record.sub'));
    this.hud.celebrate();
    Sound.fanfare();
    // confeti desde arriba a lo ancho de la pantalla
    const colors = ['#ffd23f', '#ff3d7f', '#19c3b1', '#7b5cff', '#fff4dc', '#5fcf7a'];
    for (let i = 0; i < 70; i++) {
      this.particles.spawn({
        x: this.camera.x + Math.random() * v.w * 1.3,
        y: -10 - Math.random() * 60,
        vx: rand(-60, 60) + this.speed * 0.8,
        vy: rand(80, 240),
        life: rand(1.6, 2.6),
        size: rand(3, 5),
        sizeEnd: 3,
        color: colors[i % colors.length],
        shape: 'rect',
        spin: rand(-12, 12),
        gravity: 120,
        drag: 0.6,
        important: true,
      });
    }
    this.particles.spawn({ x: this.player.x, y: this.player.y, life: 0.6, size: 20, sizeEnd: 200, color: 'rgba(255, 210, 63, 0.9)', shape: 'glow', additive: true, important: true });
  }

  /** Línea y bandera del récord personal, en el mundo. */
  drawRecordFlag(ctx, camX) {
    if (this.record < 30) return;
    const x = this.record * CONFIG.world.pxPerMeter - camX;
    if (x < -120 || x > this.view.w + 60) return;
    const gy = this.view.groundY;
    const beaten = this.recordBeaten;
    // línea vertical luminosa
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = beaten ? 'rgba(255, 210, 63, 0.35)' : 'rgba(255, 210, 63, 0.55)';
    ctx.setLineDash([14, 10]);
    ctx.lineDashOffset = -this.t * 40;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, CONFIG.world.ceiling);
    ctx.lineTo(x, gy);
    ctx.stroke();
    ctx.restore();
    drawGlow(ctx, x, gy - 80, 70, 'rgba(255, 210, 63, 0.8)', 0.35, 120);
    // mástil
    ctx.fillStyle = '#1b1030';
    ctx.fillRect(x - 3, gy - 170, 6, 170);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(x, gy - 172, 6, 0, Math.PI * 2);
    ctx.fill();
    // bandera a cuadros ondeando
    const fw = 70;
    const fh = 44;
    const cells = 7;
    for (let i = 0; i < cells; i++) {
      for (let j = 0; j < 4; j++) {
        const wave = Math.sin(this.t * 6 - i * 0.7) * 3 * (i / cells);
        ctx.fillStyle = (i + j) % 2 ? '#fff4dc' : '#1b1030';
        ctx.fillRect(x + 3 + (i * fw) / cells, gy - 166 + (j * fh) / 4 + wave, fw / cells + 0.5, fh / 4 + 0.5);
      }
    }
    // cartel con la distancia
    ctx.font = "13px 'Bungee', Impact, sans-serif";
    const label = `${t('record.flag')} ${Math.floor(this.record)} m`;
    const w = ctx.measureText(label).width + 14;
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(x - w / 2, gy - 112, w, 20);
    ctx.strokeStyle = '#1b1030';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - w / 2, gy - 112, w, 20);
    ctx.fillStyle = '#1b1030';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, gy - 101);
  }

  /** Centro aproximado de un obstáculo (para apuntar y explosiones). */
  centerOf(o) {
    switch (o.type) {
      case 'billboard':
      case 'car':
        return { x: o.x + o.w / 2, y: o.y + o.h / 2 };
      case 'missile':
        return { x: o.x + o.w / 2, y: o.y };
      default:
        return { x: o.x, y: o.y };
    }
  }

  /** Destruye un obstáculo con explosión (disparos, furia, nitro, cohete…). */
  destroyObstacle(o, quiet = false) {
    if (!o.alive) return;
    o.alive = false;
    const { x, y } = this.centerOf(o);
    const big = o.type === 'heli' || o.type === 'car';
    this.particles.spawn({ x, y, life: 0.35, size: 16, sizeEnd: big ? 130 : 80, color: 'rgba(255, 190, 90, 0.95)', shape: 'glow', additive: true, important: true });
    this.particles.burst(x, y, big ? 22 : 12, { color: '#ffb627', speed: 340, life: 0.5, size: 5, sizeEnd: 0, additive: true });
    this.particles.burst(x, y, big ? 12 : 6, { color: 'rgba(70, 60, 80, 0.6)', speed: 130, life: 1, size: 8, sizeEnd: 22, drag: 2.5, vy: -50 });
    this.particles.burst(x, y, big ? 10 : 5, { color: '#4a4f5e', speed: 300, life: 1, size: 4, shape: 'rect', spin: 12, gravity: 900 });
    if (!quiet) {
      this.camera.addShake(big ? 0.45 : 0.25);
      Sound.boom();
      if (Math.random() < 0.5) this.popAt(t('popup.boom'), x, y - 30, '#ff7a3d', 26);
    }
  }

  /** Te han dado: los personajes, escudos e invulnerabilidad absorben el golpe. */
  hit(obstacle) {
    if (this.god) return;
    if (this.powers.absorbHit(obstacle, this)) return;
    Sound.hit();
    this.powers.effects = {};
    this.powers.applyMods(this.player);
    this.dead = true;
    this.cause = obstacle.type;
    this.player.kill();
    if (obstacle.type === 'bullet' || obstacle.type === 'missile') obstacle.alive = false;
    this.camera.addShake(0.85);
    this.flash = 1;
    const { x, y } = this.player;
    this.particles.spawn({ x, y, life: 0.35, size: 20, sizeEnd: 110, color: 'rgba(255, 220, 140, 0.95)', shape: 'glow', additive: true, important: true });
    this.particles.spawn({ x, y, life: 0.45, size: 10, sizeEnd: 90, color: 'rgba(255, 244, 220, 0.9)', shape: 'ring', additive: true, important: true });
    this.particles.burst(x, y, 26, { color: '#ffd23f', speed: 420, life: 0.5, size: 5, sizeEnd: 1, additive: true });
    this.particles.burst(x, y, 14, { color: '#ff7a3d', speed: 260, life: 0.7, size: 7, sizeEnd: 2, additive: true });
    this.particles.burst(x, y, 12, { color: 'rgba(60, 50, 80, 0.6)', speed: 140, life: 1, size: 8, sizeEnd: 16, drag: 2 });
    // billetes que se escapan de la mochila
    this.particles.burst(x, y, 16, { color: '#5fcf7a', speed: 260, life: 1.4, size: 5, shape: 'rect', spin: 10, gravity: 500, drag: 1.5, vy: -100 });
  }

  /** Paso en el menú: el fondo se desplaza solo. */
  updateIdle(dt) {
    this.t += dt;
    this.fadeIn = 0;
    this.camera.x += CONFIG.speed.menu * dt;
    this.particles.update(dt);
    this.camera.update(dt);
  }

  dust(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.particles.spawn({
        x: x + rand(-8, 8),
        y: y - 2,
        vx: rand(-120, 40),
        vy: rand(-90, -20),
        life: rand(0.3, 0.55),
        size: rand(3, 5),
        sizeEnd: 7,
        color: 'rgba(240, 210, 160, 0.7)',
        drag: 4,
      });
    }
  }

  drawScenery(ctx, theme) {
    this.parallax.drawBackground(ctx, this.view, this.camera.x, this.t, theme);
    this.parallax.drawGround(ctx, this.view, this.camera.x, theme);
  }

  render(ctx, { showPlayer, menu = false }) {
    const v = this.view;
    const cam = this.camera;
    const zone = menu ? zoneAt(0) : this.zone;
    ctx.save();
    ctx.translate(cam.offsetX, cam.offsetY);

    this.drawScenery(ctx, zone.current);
    // fundido hacia la zona siguiente (se pinta en un lienzo aparte)
    if (zone.blend > 0) {
      const b = this.buffer;
      if (b.width !== ctx.canvas.width || b.height !== ctx.canvas.height) {
        b.width = ctx.canvas.width;
        b.height = ctx.canvas.height;
      }
      const bctx = b.getContext('2d');
      bctx.setTransform(ctx.getTransform());
      this.drawScenery(bctx, zone.next);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = zone.blend;
      ctx.drawImage(b, 0, 0);
      ctx.restore();
    }

    if (showPlayer) this.player.drawShadow(ctx, cam.x, v.groundY);
    if (!menu) this.drawRecordFlag(ctx, cam.x);
    if (!menu) this.powers.draw(ctx, cam.x, this);
    for (const o of this.obstacles) o.draw(ctx, cam.x, this);
    if (!menu) this.tokens.draw(ctx, cam.x, this);
    this.particles.draw(ctx, cam.x);
    if (showPlayer) this.player.draw(ctx, cam.x, this.t);
    for (const o of this.obstacles) o.overlay(ctx, this);
    ctx.restore();

    this.popups.draw(ctx);
    // fundido de entrada al empezar la partida
    if (this.fadeIn > 0) {
      ctx.fillStyle = `rgba(18, 11, 38, ${this.fadeIn})`;
      ctx.fillRect(0, 0, v.w, v.h);
    }
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255, 250, 235, ${this.flash * 0.7})`;
      ctx.fillRect(0, 0, v.w, v.h);
    }
  }
}
