import { CONFIG } from '../config.js';
import { clamp, rand } from '../core/rng.js';

/**
 * El fugitivo con el jetpack básico.
 * Física: gravedad constante + empuje que se enciende/apaga con una
 * pequeña rampa (thrustLevel 0→1), lo que da inercia suave y precisa.
 */
export class Player {
  constructor() {
    this.w = CONFIG.player.width;
    this.h = CONFIG.player.height;
    // Modificadores de física (los usarán los personajes en la fase d)
    this.mods = { gravity: 1, thrust: 1, maxRise: 1, maxFall: 1, speed: 1 };
    this.reset(0, 400);
  }

  reset(x, groundY) {
    this.x = x;
    this.y = groundY - this.h / 2;
    this.vy = 0;
    this.thrust = 0;
    this.onGround = true;
    this.anim = 0;
    this.airTime = 0;
    this.groundTime = 0;
    this.exhaustAcc = 0;
  }

  get left() { return this.x - this.w / 2; }
  get right() { return this.x + this.w / 2; }
  get top() { return this.y - this.h / 2; }
  get bottom() { return this.y + this.h / 2; }

  /**
   * @returns {{landed:boolean, impact:number, bonk:boolean}} eventos del paso
   */
  update(dt, held, speed, groundY) {
    const P = CONFIG.player;
    const m = this.mods;
    const events = { landed: false, impact: 0, bonk: false };

    // rampa del empuje
    if (held) this.thrust = Math.min(1, this.thrust + dt / P.thrustRampUp);
    else this.thrust = Math.max(0, this.thrust - dt / P.thrustRampDown);

    const ay = P.gravity * m.gravity - P.thrust * m.thrust * this.thrust;
    this.vy = clamp(this.vy + ay * dt, -P.maxRise * m.maxRise, P.maxFall * m.maxFall);
    this.y += this.vy * dt;
    this.x += speed * dt;

    const topLimit = CONFIG.world.ceiling + this.h / 2;
    const bottomLimit = groundY - this.h / 2;

    if (this.y < topLimit) {
      this.y = topLimit;
      if (this.vy < -200) events.bonk = true;
      if (this.vy < 0) this.vy = 0;
    }

    const wasOnGround = this.onGround;
    if (this.y >= bottomLimit) {
      this.y = bottomLimit;
      if (!wasOnGround) {
        events.landed = true;
        events.impact = this.vy;
      }
      if (this.vy > 0) this.vy = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    if (this.onGround) {
      this.groundTime += dt;
      this.airTime = 0;
      this.anim += dt * (speed / 28);
    } else {
      this.airTime += dt;
      this.groundTime = 0;
      this.anim += dt * 8;
    }
    return events;
  }

  /** Emite fuego y humo del jetpack. */
  emitExhaust(dt, particles) {
    const nozzleX = this.x - 15;
    const nozzleY = this.y + 14;
    if (this.thrust > 0.05) {
      this.exhaustAcc += dt * CONFIG.particles.exhaustRate * this.thrust;
      while (this.exhaustAcc >= 1) {
        this.exhaustAcc -= 1;
        particles.spawn({
          x: nozzleX + rand(-3, 3),
          y: nozzleY,
          vx: rand(-60, 20),
          vy: rand(380, 560),
          life: rand(0.18, 0.32),
          size: rand(5, 8),
          sizeEnd: 1,
          color: Math.random() < 0.5 ? '#ffd23f' : '#ff7a3d',
          additive: true,
        });
        if (Math.random() < 0.35) {
          particles.spawn({
            x: nozzleX,
            y: nozzleY + 18,
            vx: rand(-40, 0),
            vy: rand(80, 160),
            life: rand(0.4, 0.7),
            size: rand(4, 6),
            sizeEnd: 12,
            color: 'rgba(240, 236, 255, 0.45)',
            drag: 3,
          });
        }
      }
    } else {
      this.exhaustAcc = 0;
    }
  }

  draw(ctx, camX, t) {
    const sx = this.x - camX;
    const tilt = this.onGround ? 0 : clamp(this.vy / 1800, -0.22, 0.28);
    ctx.save();
    ctx.translate(sx, this.y);
    ctx.rotate(tilt);
    drawRobber(ctx, this, t);
    ctx.restore();
  }
}

/** Dibujo del atracador anónimo: pasamontañas, chándal y jetpack de bombona. */
function drawRobber(ctx, p, t) {
  const ink = '#1b1030';

  // llama del jetpack (detrás de todo)
  if (p.thrust > 0.05) {
    const len = (16 + 22 * p.thrust) * (0.85 + Math.random() * 0.3);
    const g = ctx.createLinearGradient(0, 16, 0, 16 + len);
    g.addColorStop(0, '#fff6c2');
    g.addColorStop(0.35, '#ffd23f');
    g.addColorStop(1, 'rgba(255, 90, 40, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-21, 16);
    ctx.quadraticCurveTo(-15, 16 + len * 1.1, -9, 16);
    ctx.fill();
  }

  // bombona del jetpack
  ctx.fillStyle = ink;
  roundRect(ctx, -24, -20, 17, 36, 6);
  ctx.fill();
  const tank = ctx.createLinearGradient(-22, 0, -9, 0);
  tank.addColorStop(0, '#9aa3b5');
  tank.addColorStop(0.5, '#e6ebf5');
  tank.addColorStop(1, '#7b8396');
  ctx.fillStyle = tank;
  roundRect(ctx, -22, -18, 13, 32, 5);
  ctx.fill();
  ctx.fillStyle = '#ff3d4f';
  ctx.fillRect(-22, -6, 13, 6);
  ctx.fillStyle = '#3a3150';
  ctx.fillRect(-19, 13, 7, 5);

  // piernas
  const legColor = '#26355e';
  ctx.strokeStyle = legColor;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  let a1;
  let a2;
  if (p.onGround) {
    a1 = Math.sin(p.anim) * 0.75;
    a2 = -a1;
  } else {
    a1 = 0.35 + Math.sin(p.anim) * 0.08;
    a2 = 0.15 - Math.sin(p.anim) * 0.08;
  }
  drawLeg(ctx, -3, 10, a2, '#1d2a4c');
  drawLeg(ctx, 3, 10, a1, legColor);

  // torso (chaqueta de chándal turquesa)
  ctx.fillStyle = ink;
  roundRect(ctx, -11, -14, 22, 28, 7);
  ctx.fill();
  ctx.fillStyle = '#19c3b1';
  roundRect(ctx, -9, -12, 18, 24, 6);
  ctx.fill();
  ctx.fillStyle = '#fff4dc';
  ctx.fillRect(-1, -12, 2, 24);
  ctx.fillRect(-9, 4, 18, 2);

  // brazo (agarrado a la correa)
  ctx.strokeStyle = '#139a8b';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(4, -8);
  ctx.lineTo(12, p.thrust > 0.3 ? -2 : 4);
  ctx.stroke();
  ctx.fillStyle = '#2b2b3a';
  ctx.beginPath();
  ctx.arc(12, p.thrust > 0.3 ? -2 : 4, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // cabeza con pasamontañas
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(2, -24, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3b2f58';
  ctx.beginPath();
  ctx.arc(2, -24, 10, 0, Math.PI * 2);
  ctx.fill();
  // abertura de los ojos
  ctx.fillStyle = '#f1c27d';
  roundRect(ctx, 0, -28, 12, 6, 3);
  ctx.fill();
  ctx.fillStyle = ink;
  const blink = Math.sin(t * 0.9) > 0.97 ? 0.5 : 2;
  ctx.fillRect(4, -26, 2, blink);
  ctx.fillRect(9, -26, 2, blink);
  // pompón
  ctx.fillStyle = '#ff3d4f';
  ctx.beginPath();
  ctx.arc(-1, -36, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineCap = 'butt';
}

function drawLeg(ctx, x, y, angle, color) {
  const len = 16;
  const kx = x + Math.sin(angle) * len;
  const ky = y + Math.cos(angle) * len;
  ctx.strokeStyle = color;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(kx, ky);
  ctx.stroke();
  // zapatilla
  ctx.fillStyle = '#fff4dc';
  ctx.beginPath();
  ctx.ellipse(kx + 3, ky + 1, 6, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
