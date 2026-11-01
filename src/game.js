import { CONFIG } from './config.js';
import { Camera } from './core/camera.js';
import { rand, clamp } from './core/rng.js';
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
    this.obstacles = [];
    this.tokens = new Tokens();
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
    this.speed = CONFIG.speed.start;
    this.player.reset(this.startAt * CONFIG.world.pxPerMeter, this.view.groundY);
    this.camera.reset();
    this.camera.follow(this.player.x, this.view.w);
    this.particles.clear();
    this.popups.clear();
    this.obstacles.length = 0;
    this.spawner.reset(this.player.x);
    this.tokens.reset(this.player.x);
    this.bucks = 0;
    this.wanted.reset();
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

  /** Velocidad de avance: curva asintótica de start a max. */
  computeSpeed() {
    const { start, max, rampTime } = CONFIG.speed;
    return (max - (max - start) * Math.exp(-this.runTime / rampTime)) * this.player.mods.speed;
  }

  addObstacle(o) {
    this.obstacles.push(o);
  }

  /** La policía te ha visto: sube la búsqueda. */
  spotted(heat, wx, wy) {
    this.wanted.add(heat);
    if (heat >= 10) this.popAt(t('popup.spotted'), wx, wy, '#ff6b7d');
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
    if (stars > prev && !this.dead) {
      this.hud.flashStars();
      this.camera.addShake(0.2);
      this.popups.add(t('wanted.up', { n: stars }), this.view.w / 2, 90, { color: '#ffd23f', size: 30, life: 1.5, rise: 20 });
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
      this.speed = this.computeSpeed();
      const ev = p.update(dt, input.held, this.speed, this.view.groundY);
      input.consumePresses(); // las pulsaciones sueltas se usarán en fases posteriores

      if (ev.landed && ev.impact > CONFIG.player.hardLanding) {
        this.camera.addShake(0.25);
        this.dust(p.x, p.bottom, 10);
      }
      if (ev.bonk) this.camera.addShake(0.15);
      if (p.onGround && Math.random() < dt * 14) this.dust(p.x - 6, p.bottom, 1);
      p.emitExhaust(dt, this.particles);
      this.wanted.update(dt, this.distance);
    }

    this.camera.follow(p.x, this.view.w);
    this.camera.update(dt);
    this.updateZone();
    if (!this.dead) this.spawner.update(this);
    this.tokens.update(dt, this);

    // obstáculos
    const box = p.hitbox;
    for (const o of this.obstacles) {
      o.update(dt, this);
      if (!this.dead && o.alive && o.hits(box)) this.hit(o);
      o.cull(this.camera.x);
    }
    this.obstacles = this.obstacles.filter((o) => o.alive);

    this.particles.update(dt);
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

  /** Te han dado. En la fase d los personajes absorberán este golpe. */
  hit(obstacle) {
    if (this.god) return;
    Sound.hit();
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
