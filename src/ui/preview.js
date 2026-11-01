import { drawFugitive, STYLES } from '../characters/fugitive.js';
import { emitTrail, DEFAULT_TRAIL } from '../characters/trails.js';
import { playTransformFx, DEFAULT_FX } from '../characters/transformfx.js';
import { CHARACTERS } from '../characters/defs.js';
import { Particles } from '../fx/particles.js';
import { drawGlow } from '../fx/sprites.js';

/**
 * Vista previa animada de un personaje con su aspecto (tienda y vestuario).
 * Vuela suavemente, deja su estela y, si se pide, repite el efecto de transformación.
 */
export class Preview {
  constructor(canvas, { w = 240, h = 240, scale = 2.2 } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = w;
    this.h = h;
    this.scale = scale;
    this.owner = 'base';
    this.look = {};
    this.particles = new Particles();
    this.running = false;
    this.t = 0;
    this.fxTimer = 0;
    this.loopFx = false;
    this.frame = this.frame.bind(this);
  }

  set(owner, look, { loopFx = false } = {}) {
    this.owner = owner;
    this.look = look ?? {};
    this.loopFx = loopFx;
    this.fxTimer = loopFx ? 0.2 : 0;
  }

  playFx() {
    this.fxTimer = 0.01;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.canvas.getBoundingClientRect();
    const cw = Math.max(1, Math.round(r.width * dpr));
    const ch = Math.max(1, Math.round(r.height * dpr));
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }
    this.k = cw / this.w;
  }

  frame(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    this.resize();
    const ctx = this.ctx;
    const { w, h } = this;
    ctx.setTransform(this.k, 0, 0, this.k, 0, 0);
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#2a1f5e');
    bg.addColorStop(1, '#7a3b85');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    for (let i = 0; i < 6; i++) ctx.fillRect(((i * 53 - this.t * 120) % (w + 60) + w + 60) % (w + 60) - 30, 30 + i * 32, 30, 2);
    const groundY = h - 22;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, groundY, w, h - groundY);

    const style = this.owner === 'base' ? 'base' : CHARACTERS[this.owner].style;
    // los personajes más grandes (Petardo) se reducen para que quepan
    const k = this.scale / (STYLES[style]?.scale ?? 1);
    const cx = w * 0.5;
    const cy = h * 0.54 + Math.sin(this.t * 2.2) * 6;
    // muñeco "volando" con empuje que respira
    const thrust = 0.55 + 0.45 * Math.sin(this.t * 3);
    const fake = { x: 0, y: cy, vy: -40, thrust, anim: this.t * 8, pose: { run: 0, fly: 1, fall: 0 }, riding: false, vest: false, aiming: false };

    // estela (en coordenadas de la vista previa; se mueve hacia la izquierda)
    const trail = this.look.trail ?? DEFAULT_TRAIL[style] ?? 'fire';
    this.acc = (this.acc ?? 0) + dt * 70 * thrust;
    while (this.acc >= 1) {
      this.acc -= 1;
      emitTrail(this.particles, trail, cx - 16 * this.scale, cy + 22 * this.scale, this.t);
    }
    for (const p of this.particles.list) p.x -= 160 * dt; // simula el avance
    this.particles.update(dt);

    // efecto de transformación
    if (this.fxTimer > 0) {
      this.fxTimer -= dt;
      if (this.fxTimer <= 0) {
        const fx = this.look.fx ?? DEFAULT_FX[style];
        if (fx) playTransformFx(fx, this.particles, cx, cy, groundY, '#fff');
        if (this.loopFx) this.fxTimer = 2.6;
      }
    }

    drawGlow(ctx, cx, cy, 90, 'rgba(255, 210, 160, 0.6)', 0.25);
    this.particles.draw(ctx, 0);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(k, k);
    ctx.rotate(-0.06);
    drawFugitive(ctx, fake, this.t, style, this.look);
    ctx.restore();
    requestAnimationFrame(this.frame);
  }
}
