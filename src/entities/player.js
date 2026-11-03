import { CONFIG } from '../config.js';
import { clamp, rand, approach } from '../core/rng.js';
import { drawFugitive } from '../characters/fugitive.js';
import { drawCar, drawBike, drawScooterRide, drawCart } from '../characters/vehicles.js';
import { emitTrail, DEFAULT_TRAIL } from '../characters/trails.js';

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
    this.dead = false;
    this.spin = 0;
    this.spinRate = 0;
    this.tilt = 0;
    this.pose = { run: 1, fly: 0, fall: 0 }; // mezcla de animaciones (0-1)
    this.launchT = 0;   // tras la rampa se permite subir más rápido
    this.style = 'base';
    this.vehicle = null;
    this.onFoot = true;   // sin jetpack: corre y salta
    this.prevHeld = false;
    this.jumpBuf = 0;
    this.coyote = 0;
    this.jumpHold = 0;
    this.airJumps = 0;   // dobles saltos disponibles (se recargan al tocar el suelo)
    this.flip = 0;       // s restantes de la voltereta del doble salto
  }

  /** Caja de colisión, algo más pequeña que el dibujo. */
  get hitbox() {
    const k = CONFIG.obstacles.hitboxShrink * (this.mods.hitbox ?? 1);
    const hw = (this.w * k) / 2;
    const hh = (this.h * (k + 0.12)) / 2;
    return { l: this.x - hw, r: this.x + hw, t: this.y - hh, b: this.y + hh };
  }

  /**
   * Golpe mortal: sale despedido con la velocidad que llevaba.
   * Cuanto más rápido iba, más alto sale, más rebota y más lejos rueda.
   */
  kill(speed = 350) {
    const D = CONFIG.death;
    this.dead = true;
    this.thrust = 0;
    this.flip = 0;
    this.dvx = speed * D.keepSpeed;
    this.vy = -(D.popUp + speed * D.popPerSpeed);
    this.spinRate = 5 + speed / 60;
    this.stopped = false;
    this.bagLost = false;
  }

  /**
   * Física del cuerpo tras el golpe: vuelo, rebotes con pérdida de energía,
   * rodar por el suelo (giro = avance / radio) y deslizar con rozamiento.
   * Devuelve 'bounce' | 'slide' | null.
   */
  updateDead(dt, groundY) {
    const D = CONFIG.death;
    this.vy += CONFIG.player.gravity * dt;
    this.y += this.vy * dt;
    this.x += this.dvx * dt;
    const bottom = groundY - this.h / 2 + 12;
    let ev = null;
    if (this.y >= bottom) {
      this.y = bottom;
      if (this.vy > D.bounceMin) {
        this.vy *= -D.restitution;
        this.dvx *= D.bounceKeep;
        ev = 'bounce';
      } else {
        this.vy = 0;
        this.onGround = true;
        this.dvx = Math.max(0, this.dvx - D.friction * dt);
        ev = this.dvx > 30 ? 'slide' : null;
      }
      // en el suelo rueda mientras va rápido; despacio, se queda tumbado
      if (this.dvx > D.rollUntil) {
        this.spinRate = this.dvx / D.rollRadius;
      } else {
        const lie = Math.round((this.spin - Math.PI / 2) / Math.PI) * Math.PI + Math.PI / 2;
        this.spin += (lie - this.spin) * Math.min(1, dt * 8);
        this.spinRate = 0;
      }
    }
    this.spin += this.spinRate * dt;
    if (this.onGround && this.dvx <= 4 && this.vy === 0) this.stopped = true;
    return ev;
  }

  get left() { return this.x - this.w / 2; }
  get right() { return this.x + this.w / 2; }
  get top() { return this.y - this.h / 2; }
  get bottom() { return this.y + this.h / 2; }

  /**
   * Física del vuelo. Claves para que se controle bien:
   * - brakeBoost: pulsar mientras caes frena casi al instante.
   * - riseCut: soltar mientras subes corta la subida (no te pasas de altura).
   * - velocidades máximas bajas y rampa de empuje casi nula.
   * - techo blando con rebote y pequeño rebote en el suelo.
   * @returns {{landed:boolean, impact:number, bonk:boolean}} eventos del paso
   */
  update(dt, held, speed, groundY) {
    if (this.onFoot) return this.updateFoot(dt, held, speed, groundY);
    this.prevHeld = held;
    this.flip = 0;
    const P = CONFIG.player;
    const m = this.mods;
    const events = { landed: false, impact: 0, bonk: false };

    if (held) this.thrust = Math.min(1, this.thrust + dt / (P.thrustRampUp * (m.ramp ?? 1)));
    else this.thrust = Math.max(0, this.thrust - dt / P.thrustRampDown);

    const topLimit = CONFIG.world.ceiling + this.h / 2;
    const bottomLimit = groundY - this.h / 2;

    let thrust = P.thrust * m.thrust * this.thrust;
    if (this.vy > 0) thrust *= P.brakeBoost;                       // frenar la caída
    const nearTop = (this.y - topLimit) / P.ceilingSoft;            // techo blando
    if (nearTop < 1 && this.vy <= 0) thrust *= Math.max(0, nearTop) * 0.9 + 0.1;
    let gravity = P.gravity * m.gravity;
    if (!held && this.vy < 0) gravity *= P.riseCut;                 // cortar la subida

    this.launchT = Math.max(0, this.launchT - dt);
    const riseCap = P.maxRise * m.maxRise * (this.launchT > 0 ? 3 : 1);
    this.vy = clamp(this.vy + (gravity - thrust) * dt, -riseCap, P.maxFall * m.maxFall);
    this.y += this.vy * dt;
    this.x += speed * dt;

    if (this.y < topLimit) {
      this.y = topLimit;
      if (this.vy < -200) events.bonk = true;
      if (this.vy < 0) this.vy = -this.vy * P.ceilingBounce;
    }

    const wasOnGround = this.onGround;
    if (this.y >= bottomLimit) {
      this.y = bottomLimit;
      if (!wasOnGround) {
        events.landed = true;
        events.impact = this.vy;
      }
      const bounce = (m.bounce ?? 0) || P.groundBounce;
      if (this.vy > P.bounceMin && !held) {
        this.vy = -this.vy * bounce;
        this.onGround = false;
      } else {
        if (this.vy > 0) this.vy = 0;
        this.onGround = true;
      }
    } else {
      this.onGround = false;
    }

    this.finishStep(dt, speed);
    return events;
  }

  finishStep(dt, speed) {
    if (this.onGround) {
      this.groundTime += dt;
      this.airTime = 0;
      this.anim += dt * (speed / 28);
    } else {
      this.airTime += dt;
      this.groundTime = 0;
      this.anim += dt * 8;
    }
    this.updatePose(dt);
  }

  /**
   * A pie: pulsar = saltar. Mantener pulsado mientras subes alarga el salto;
   * soltar lo corta. Con "buffer" y "coyote" para que se sienta justo.
   */
  updateFoot(dt, held, speed, groundY) {
    const F = CONFIG.foot;
    const events = { landed: false, impact: 0, bonk: false, jumped: false };
    const pressed = held && !this.prevHeld;
    this.prevHeld = held;
    this.thrust = 0;
    this.jumpBuf = pressed ? F.buffer : Math.max(0, this.jumpBuf - dt);
    this.coyote = this.onGround ? F.coyote : Math.max(0, this.coyote - dt);
    if (this.onGround) this.airJumps = F.doubleJump.enabled ? 1 : 0;
    if (this.jumpBuf > 0 && this.coyote > 0) {
      this.vy = -F.jumpVel * (this.mods.jump ?? 1);
      this.onGround = false;
      this.coyote = 0;
      this.jumpBuf = 0;
      this.jumpHold = F.holdTime;
      events.jumped = true;
    } else if (pressed && !this.onGround && this.airJumps > 0 && !this.vehicle) {
      // doble salto: un segundo toque en el aire (voltereta)
      const D = F.doubleJump;
      this.airJumps--;
      this.vy = Math.min(this.vy, 0) * D.keepRise - D.vel * (this.mods.jump ?? 1);
      this.jumpBuf = 0;
      this.jumpHold = D.holdTime;
      this.flip = D.flipTime;
      events.doubleJumped = true;
    }
    this.flip = Math.max(0, this.flip - dt);
    let grav = F.gravity;
    if (this.vy < 0) {
      if (held && this.jumpHold > 0) grav *= F.holdGravity;
      else if (!held && this.jumpHold > 0) grav *= F.riseCut;
    }
    this.jumpHold = held ? Math.max(0, this.jumpHold - dt) : 0;
    this.vy = Math.min(this.vy + grav * dt, F.maxFall);
    this.y += this.vy * dt;
    this.x += speed * dt;
    const topLimit = CONFIG.world.ceiling + this.h / 2;
    if (this.y < topLimit) {
      this.y = topLimit;
      if (this.vy < 0) this.vy = 0;
    }
    const bottomLimit = groundY - this.h / 2;
    if (this.y >= bottomLimit) {
      this.y = bottomLimit;
      if (!this.onGround) {
        events.landed = true;
        events.impact = this.vy;
      }
      this.vy = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }
    this.finishStep(dt, speed);
    return events;
  }

  /** Giro de la voltereta del doble salto (una vuelta hacia delante). */
  get flipAngle() {
    if (this.flip <= 0) return 0;
    const k = 1 - this.flip / CONFIG.foot.doubleJump.flipTime;
    const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; // suave al entrar y al salir
    return e * Math.PI * 2;
  }

  /** Rebote en un toldo (a pie). */
  bounce(v) {
    this.vy = -v;
    this.onGround = false;
    this.jumpHold = 0;
    this.coyote = 0;
  }

  /** Mezcla suave entre las poses de correr, volar y caer. */
  updatePose(dt) {
    const pz = this.pose;
    const flying = !this.onGround && (this.thrust > 0.25 || (this.onFoot && this.vy < 60));
    const falling = !this.onGround && !flying && this.vy > 180;
    pz.run = approach(pz.run, this.onGround ? 1 : 0, 18, dt);
    pz.fly = approach(pz.fly, flying ? 1 : 0, 10, dt);
    pz.fall = approach(pz.fall, falling ? 1 : 0, 7, dt);
    const target = this.onGround ? 0 : clamp(this.vy / 1800, -0.2, 0.26);
    this.tilt = approach(this.tilt, target, 12, dt);
  }

  /** Emite fuego, chispas y humo del jetpack. */
  emitExhaust(dt, particles) {
    const nozzleX = this.x - 16;
    const nozzleY = this.y + 22;
    if (this.thrust > 0.05 && !this.vehicle) {
      this.exhaustAcc += dt * CONFIG.particles.exhaustRate * this.thrust;
      while (this.exhaustAcc >= 1) {
        this.exhaustAcc -= 1;
        // estela: la equipada en el vestuario o la propia del personaje
        emitTrail(particles, this.look?.trail ?? DEFAULT_TRAIL[this.style] ?? 'fire', nozzleX, nozzleY, this.anim);
        if (Math.random() < 0.25) {
          particles.spawn({
            x: nozzleX,
            y: nozzleY + 6,
            vx: rand(-200, 60),
            vy: rand(200, 520),
            life: rand(0.2, 0.4),
            size: 1.6,
            sizeEnd: 0.5,
            color: '#fff6c2',
            additive: true,
            gravity: 900,
          });
        }
      }
    } else {
      this.exhaustAcc = 0;
    }
  }

  /** Sombra suave en el suelo: más pequeña y tenue cuanto más alto vuela. */
  drawShadow(ctx, camX, groundY) {
    const h = clamp((groundY - this.bottom) / 400, 0, 1);
    const w = 22 * (1 - h * 0.6);
    ctx.fillStyle = `rgba(15, 8, 35, ${0.32 * (1 - h * 0.75)})`;
    ctx.beginPath();
    ctx.ellipse(this.x - camX, groundY + 3, w, 5 * (1 - h * 0.5), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  draw(ctx, camX, t) {
    const sx = this.x - camX;
    ctx.save();
    // parpadeo mientras eres invulnerable tras un golpe
    if (this.blink && Math.floor(t * 14) % 2 === 0) ctx.globalAlpha = 0.4;
    ctx.translate(sx, this.y);
    if (this.vehicle === 'car') {
      ctx.rotate(this.onGround ? 0 : clamp(this.vy / 2400, -0.15, 0.15));
      ctx.translate(0, -6);
      drawCar(ctx, this, t, this.boost);
    } else if (this.vehicle === 'scooter') {
      ctx.rotate(this.onGround ? 0 : clamp(this.vy / 2400, -0.15, 0.15));
      ctx.translate(0, -6);
      drawScooterRide(ctx, this, t);
      this.standing = true;
      drawFugitive(ctx, this, t, this.style, this.look);
      this.standing = false;
    } else if (this.vehicle === 'cart') {
      ctx.rotate(this.onGround ? Math.sin(t * 30) * 0.02 : clamp(this.vy / 2400, -0.2, 0.2));
      ctx.translate(0, -2);
      this.riding = true;
      ctx.save();
      ctx.translate(0, -8);
      drawFugitive(ctx, this, t, this.style, this.look);
      ctx.restore();
      this.riding = false;
      drawCart(ctx, this, t);
    } else if (this.vehicle === 'bike') {
      ctx.rotate(clamp(this.vy / 2000, -0.25, 0.25));
      ctx.translate(0, -8);
      ctx.save();
      ctx.scale(1.15, 1.15);
      drawBike(ctx, this, t);
      ctx.restore();
      ctx.translate(-4, -9);
      drawFugitive(ctx, this, t, this.style, this.look);
    } else {
      ctx.rotate(this.dead ? this.spin : this.tilt + this.flipAngle);
      drawFugitive(ctx, this, t, this.style, this.look);
    }
    ctx.restore();
  }
}

/** Rectángulo redondeado (usado por otros módulos). */
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
