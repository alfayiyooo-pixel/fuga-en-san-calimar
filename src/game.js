import { CONFIG } from './config.js';
import { Camera } from './core/camera.js';
import { rand } from './core/rng.js';
import { Particles } from './fx/particles.js';
import { Player } from './entities/player.js';
import { Parallax } from './world/parallax.js';
import { beach } from './world/themes/beach.js';

/**
 * Estado de una partida: jugador, cámara, mundo y efectos.
 * main.js decide cuándo se actualiza (menú, jugando, pausa).
 */
export class Game {
  constructor(view) {
    this.view = view;
    this.camera = new Camera();
    this.particles = new Particles();
    this.player = new Player();
    this.parallax = new Parallax();
    this.theme = beach;
    this.t = 0;
    this.reset();
  }

  reset() {
    this.runTime = 0;
    this.speed = CONFIG.speed.start;
    this.player.reset(0, this.view.groundY);
    this.camera.reset();
    this.camera.follow(this.player.x, this.view.w);
    this.particles.clear();
  }

  get distance() {
    return Math.max(0, this.player.x / CONFIG.world.pxPerMeter);
  }

  /** Velocidad de avance: curva asintótica de start a max. */
  computeSpeed() {
    const { start, max, rampTime } = CONFIG.speed;
    return (max - (max - start) * Math.exp(-this.runTime / rampTime)) * this.player.mods.speed;
  }

  /** Paso de simulación durante la partida. */
  update(dt, input) {
    this.t += dt;
    this.runTime += dt;
    this.speed = this.computeSpeed();

    const p = this.player;
    const ev = p.update(dt, input.held, this.speed, this.view.groundY);
    input.consumePresses(); // las pulsaciones sueltas se usarán en fases posteriores

    if (ev.landed && ev.impact > CONFIG.player.hardLanding) {
      this.camera.addShake(0.25);
      this.dust(p.x, p.bottom, 10);
    }
    if (ev.bonk) this.camera.addShake(0.15);

    // polvo al correr
    if (p.onGround && Math.random() < dt * 14) this.dust(p.x - 6, p.bottom, 1);

    p.emitExhaust(dt, this.particles);
    this.particles.update(dt);
    this.camera.follow(p.x, this.view.w);
    this.camera.update(dt);
  }

  /** Paso en el menú: el fondo se desplaza solo. */
  updateIdle(dt) {
    this.t += dt;
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

  render(ctx, { showPlayer }) {
    const v = this.view;
    const cam = this.camera;
    ctx.save();
    ctx.translate(cam.offsetX, cam.offsetY);
    // dibujamos un poco más grande para que el temblor no deje bordes
    this.parallax.drawBackground(ctx, v, cam.x, this.t, this.theme);
    this.parallax.drawGround(ctx, v, cam.x, this.theme);
    this.particles.draw(ctx, cam.x);
    if (showPlayer) this.player.draw(ctx, cam.x, this.t);
    ctx.restore();
  }
}
