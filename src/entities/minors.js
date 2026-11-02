// ENEMIGOS MENORES
// Aparecen sobre todo al principio y con 0-1 estrellas, antes de que la
// policía tome el relevo. Son fáciles de esquivar, cuentan como golpe si
// chocas, y se pueden derrotar con gadgets y habilidades (pequeña recompensa
// y salida cómica: salen volando dando vueltas).
//
//   guard    guardia de seguridad con linterna que salta al verte
//   drone    dron de reparto que cruza el cielo con un paquete
//   dog      perro callejero que te persigue por el suelo (viene por detrás)
//   gull     gaviotas en bandada (solo en la playa)
//   scooter  matón en patinete eléctrico que viene de frente y salta

import { CONFIG } from '../config.js';
import { rand, pick } from '../core/rng.js';
import { Obstacle, warningIcon } from './obstacles.js';
import { INK, rr, inked, vgrad, limb } from '../characters/kit.js';
import { drawGlow } from '../fx/sprites.js';
import { Sound } from '../core/audio.js';

export const MINOR_TYPES = ['guard', 'drone', 'dog', 'gull', 'scooter'];

class Minor extends Obstacle {
  constructor(type, w, h) {
    super(type);
    this.minor = true;
    this.w = w;
    this.h = h;
    this.x = 0; // centro
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.t = Math.random() * 10;
    this.ko = false; // derrotado: sale volando y ya no choca
    this.rot = 0;
    this.spin = 0;
    this.cfg = CONFIG.minors[type];
  }

  get right() {
    return this.x + this.w / 2;
  }

  /** Caja de choque algo más pequeña que el dibujo (son fáciles de esquivar). */
  hits(box) {
    if (this.ko) return false;
    const k = CONFIG.minors.hitbox;
    const hw = (this.w * k) / 2;
    const hh = (this.h * k) / 2;
    return box.l < this.x + hw && box.r > this.x - hw && box.t < this.y + hh && box.b > this.y - hh;
  }

  cull(camX) {
    if (this.right < camX - 250) this.alive = false;
  }

  /** Derrotado: sale despedido dando vueltas. */
  knockOut(g) {
    this.ko = true;
    this.vx = rand(250, 450) + g.speed * 0.6;
    this.vy = rand(-720, -560);
    this.spin = rand(9, 15) * (Math.random() < 0.5 ? -1 : 1);
  }

  updateKo(dt, g) {
    this.vy += 1900 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += this.spin * dt;
    if (this.y > g.view.groundY + 200) this.alive = false;
  }

  update(dt, g) {
    this.t += dt;
    if (this.ko) this.updateKo(dt, g);
    else this.act(dt, g);
  }

  act() {}

  draw(ctx, camX, g) {
    const x = this.x - camX;
    if (x < -150 || x > g.view.w + 150) return;
    ctx.save();
    ctx.translate(x, this.y);
    if (this.ko) {
      ctx.rotate(this.rot);
    } else if (this.grounded) {
      // sombra en el suelo
      ctx.fillStyle = 'rgba(10, 5, 30, 0.3)';
      ctx.beginPath();
      ctx.ellipse(0, g.view.groundY - this.y + 2, this.w * 0.45, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    this.paint(ctx, g);
    if (this.ko) dizzy(ctx, this.h / 2 + 6, this.t);
    ctx.restore();
  }
}

/** Estrellitas de mareo dando vueltas sobre la cabeza. */
function dizzy(ctx, r, t) {
  ctx.fillStyle = '#ffd23f';
  for (let k = 0; k < 3; k++) {
    const a = t * 8 + (k * Math.PI * 2) / 3;
    star(ctx, Math.cos(a) * 14, -r + Math.sin(a) * 4, 4);
  }
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr2 = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2);
  }
  ctx.closePath();
  ctx.fill();
}

function eye(ctx, x, y, r = 2.6, look = -1) {
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x + look * r * 0.35, y, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
}

// ------------------------------------------------------------
// GUARDIA DE SEGURIDAD — barrigón, gorra y linterna; salta al verte
// ------------------------------------------------------------
export class Guard extends Minor {
  constructor(g, x) {
    super('guard', 36, 62);
    this.x = x;
    this.grounded = true;
    this.y = g.view.groundY - this.h / 2;
    this.jumpCd = 0;
    this.walk = -this.cfg.walkSpeed;
  }

  act(dt, g) {
    const gy = g.view.groundY - this.h / 2;
    this.x += this.walk * dt;
    this.jumpCd -= dt;
    const ahead = this.x - g.player.x;
    if (this.grounded && this.jumpCd <= 0 && ahead > 0 && ahead < this.cfg.jumpRange) {
      this.vy = -rand(this.cfg.jump[0], this.cfg.jump[1]);
      this.grounded = false;
      this.jumpCd = this.cfg.jumpCooldown;
      Sound.hop();
    }
    if (!this.grounded) {
      this.vy += this.cfg.gravity * dt;
      this.y += this.vy * dt;
      if (this.y >= gy) {
        this.y = gy;
        this.grounded = true;
        g.dust(this.x, g.view.groundY, 3);
      }
    }
  }

  paint(ctx, g) {
    const air = !this.grounded && !this.ko;
    const step = Math.sin(this.t * 9);
    // haz de la linterna hacia el jugador (aditivo)
    if (!this.ko) {
      const px = g.player.x - this.x;
      const py = g.player.y - this.y;
      const a = Math.atan2(py, px);
      ctx.save();
      ctx.rotate(a);
      ctx.globalCompositeOperation = 'lighter';
      const beam = ctx.createLinearGradient(14, 0, 190, 0);
      beam.addColorStop(0, 'rgba(255, 245, 190, 0.45)');
      beam.addColorStop(1, 'rgba(255, 245, 190, 0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(14, -3);
      ctx.lineTo(190, -42);
      ctx.lineTo(190, 42);
      ctx.lineTo(14, 3);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    }
    // piernas
    const legA = air ? 0.5 : step * 0.45;
    limb(ctx, -5, 12, legA, legA - (air ? 0.9 : 0.1), 10, 10, 6, '#2c3a66');
    limb(ctx, 5, 12, -legA, -legA - (air ? 0.9 : 0.1), 10, 10, 6, '#34447a');
    // cuerpo barrigón
    ctx.beginPath();
    ctx.ellipse(0, 2, 15, 16, 0, 0, Math.PI * 2);
    inked(ctx, vgrad(ctx, -14, 18, '#4b63a8', '#2c3a66'));
    // cinturón y placa
    ctx.fillStyle = INK;
    ctx.fillRect(-14, 9, 28, 4);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(-6, -5, 3, 0, Math.PI * 2);
    ctx.fill();
    // brazo con linterna (hacia delante = izquierda)
    const arm = air ? 2.6 : 2.0 + Math.sin(this.t * 3) * 0.15;
    const [hx, hy] = limb(ctx, -8, -6, arm, arm + 0.3, 9, 9, 5, '#4b63a8');
    ctx.save();
    ctx.translate(hx, hy);
    rr(ctx, -9, -3, 10, 6, 2);
    inked(ctx, '#3b3f4a');
    ctx.restore();
    drawGlow(ctx, hx - 9, hy, 10, 'rgba(255, 245, 190, 0.9)', this.ko ? 0 : 0.9);
    // cabeza
    ctx.beginPath();
    ctx.arc(0, -21, 10, 0, Math.PI * 2);
    inked(ctx, '#f2b88a');
    eye(ctx, -5, -23, 2.4, this.ko ? 0 : -1);
    // bigote
    ctx.fillStyle = '#4a2c1a';
    ctx.beginPath();
    ctx.ellipse(-6, -17, 5, 2.4, 0.15, 0, Math.PI * 2);
    ctx.fill();
    // gorra con visera
    ctx.beginPath();
    ctx.moveTo(-11, -24);
    ctx.quadraticCurveTo(-9, -36, 2, -35);
    ctx.quadraticCurveTo(11, -34, 10, -25);
    ctx.closePath();
    inked(ctx, '#2c3a66');
    rr(ctx, -19, -27, 12, 4, 2);
    inked(ctx, INK);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(-4, -32, 4, 4);
  }
}

// ------------------------------------------------------------
// DRON DE REPARTO — cruza el cielo con un paquete colgando
// ------------------------------------------------------------
export class Drone extends Minor {
  constructor(g, x) {
    super('drone', 54, 40);
    this.x = x;
    this.baseY = rand(CONFIG.world.ceiling + 70, g.view.groundY - 150);
    this.y = this.baseY;
    this.vx = -rand(this.cfg.speed[0], this.cfg.speed[1]);
  }

  act(dt) {
    this.x += this.vx * dt;
    this.y = this.baseY + Math.sin(this.t * 2.2) * this.cfg.bob;
  }

  paint(ctx) {
    const tilt = this.ko ? 0 : -0.08;
    ctx.rotate(tilt);
    // paquete colgando (se suelta al derrotarlo)
    if (!this.ko) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-5, -2);
      ctx.lineTo(-7, 8);
      ctx.moveTo(5, -2);
      ctx.lineTo(7, 8);
      ctx.stroke();
      rr(ctx, -11, 7, 22, 15, 2);
      inked(ctx, vgrad(ctx, 7, 22, '#e0a96a', '#b67a3e'));
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillRect(-2, 7, 4, 15);
      ctx.fillStyle = '#ff3d4f';
      ctx.fillRect(-9, 16, 6, 3);
    }
    // brazos y rotores
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-22, -10);
    ctx.lineTo(22, -10);
    ctx.stroke();
    for (const rx of [-22, 22]) {
      const sw = Math.abs(Math.sin(this.t * 40 + rx)) * 12 + 4;
      ctx.fillStyle = 'rgba(220, 230, 255, 0.55)';
      ctx.beginPath();
      ctx.ellipse(rx, -14, sw, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.fillRect(rx - 1.5, -15, 3, 6);
    }
    // cuerpo
    rr(ctx, -15, -12, 30, 12, 5);
    inked(ctx, vgrad(ctx, -12, 0, '#f4f6ff', '#9aa6c8'));
    // "cara" con cámara y luz
    ctx.fillStyle = '#19e3d0';
    ctx.beginPath();
    ctx.arc(-9, -6, 3, 0, Math.PI * 2);
    ctx.fill();
    const blink = Math.floor(this.t * 3) % 2 === 0;
    ctx.fillStyle = blink ? '#ff3d4f' : '#7a1a2a';
    ctx.beginPath();
    ctx.arc(9, -8, 2, 0, Math.PI * 2);
    ctx.fill();
    if (blink && !this.ko) drawGlow(ctx, 9, -8, 8, 'rgba(255, 61, 79, 0.9)', 0.7);
  }
}

// ------------------------------------------------------------
// PERRO CALLEJERO — te persigue por el suelo desde atrás
// ------------------------------------------------------------
export class Dog extends Minor {
  constructor(g) {
    super('dog', 48, 30);
    this.grounded = true;
    this.state = 'warn';
    this.timer = this.cfg.warnTime;
    this.y = g.view.groundY - this.h / 2;
    this.x = g.camera.x - 120;
    this.rel = rand(this.cfg.overtake[0], this.cfg.overtake[1]);
    this.hopCd = rand(0.4, 1);
    Sound.bark();
  }

  cull(camX) {
    // avanza más que la cámara: se va por la derecha
    if (this.state === 'run' && this.x > camX + 3000) this.alive = false;
    super.cull(camX);
  }

  act(dt, g) {
    const gy = g.view.groundY - this.h / 2;
    if (this.state === 'warn') {
      this.x = g.camera.x - 120;
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'run';
        Sound.bark();
      }
      return;
    }
    this.x += (g.speed + this.rel) * dt;
    if (this.x > g.camera.x + g.view.w + 200) this.alive = false;
    this.hopCd -= dt;
    if (this.grounded && this.hopCd <= 0) {
      this.vy = -rand(this.cfg.hop[0], this.cfg.hop[1]);
      this.grounded = false;
      this.hopCd = rand(0.6, 1.3);
    }
    if (!this.grounded) {
      this.vy += 1800 * dt;
      this.y += this.vy * dt;
      if (this.y >= gy) {
        this.y = gy;
        this.grounded = true;
      }
    }
  }

  overlay(ctx, g) {
    if (this.state !== 'warn' || this.ko) return;
    warningIcon(ctx, 34, this.y - 6, g.t, 'behind');
    ctx.font = "16px 'Bungee', Impact, sans-serif";
    ctx.fillStyle = '#fff4dc';
    ctx.textAlign = 'left';
    ctx.fillText('GUAU!', 62, this.y - 30 + Math.sin(g.t * 20) * 2);
  }

  paint(ctx) {
    const run = this.state === 'run' && !this.ko;
    const c = this.t * 18;
    // cola
    const wag = Math.sin(this.t * 22) * 0.5;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-18, -4);
    ctx.lineTo(-27, -12 + wag * 8);
    ctx.stroke();
    ctx.strokeStyle = '#b07a46';
    ctx.lineWidth = 3;
    ctx.stroke();
    // patas (galope)
    const legs = [[-12, 0], [-6, Math.PI], [9, Math.PI * 0.5], [14, Math.PI * 1.5]];
    for (const [lx, ph] of legs) {
      const a = run ? Math.sin(c + ph) * 0.7 : 0.2;
      limb(ctx, lx, 4, a, a - 0.3, 6, 6, 4.5, '#9a6a3a');
    }
    // cuerpo
    ctx.beginPath();
    ctx.ellipse(-2, -2, 19, 9, 0, 0, Math.PI * 2);
    inked(ctx, vgrad(ctx, -11, 7, '#c8925a', '#9a6a3a'));
    ctx.fillStyle = '#e8c08a';
    ctx.beginPath();
    ctx.ellipse(-4, -6, 7, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // cabeza (mira a la derecha: corre hacia delante)
    ctx.beginPath();
    ctx.ellipse(18, -9, 9, 8, 0, 0, Math.PI * 2);
    inked(ctx, '#c8925a');
    ctx.beginPath();
    ctx.ellipse(26, -6, 6, 4, 0, 0, Math.PI * 2);
    inked(ctx, '#e8c08a');
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(31, -7, 2, 0, Math.PI * 2);
    ctx.fill();
    // lengua al viento
    if (run) {
      ctx.fillStyle = '#ff6b7d';
      ctx.beginPath();
      ctx.ellipse(25, -1 + Math.sin(c) * 1.5, 3, 5, -0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    eye(ctx, 20, -11, 2.4, 1);
    // oreja que ondea
    ctx.beginPath();
    ctx.moveTo(13, -15);
    ctx.quadraticCurveTo(8, -24 + Math.sin(c) * 3, 4, -14);
    ctx.closePath();
    inked(ctx, '#6e4626');
    // collar con chapa
    ctx.fillStyle = '#ff3d4f';
    ctx.fillRect(10, -6, 4, 9);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(12, 5, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ------------------------------------------------------------
// GAVIOTA — bandadas en la playa, aleteando
// ------------------------------------------------------------
export class Gull extends Minor {
  constructor(g, x, y) {
    super('gull', 40, 20);
    this.x = x;
    this.baseY = y;
    this.y = y;
    this.vx = -rand(this.cfg.speed[0], this.cfg.speed[1]);
    this.wave = rand(14, this.cfg.wave);
  }

  act(dt) {
    this.x += this.vx * dt;
    this.y = this.baseY + Math.sin(this.t * 2.6) * this.wave;
  }

  paint(ctx) {
    const flap = this.ko ? 0.8 : Math.sin(this.t * 13);
    // alas
    for (const side of [1, -1]) {
      ctx.beginPath();
      ctx.moveTo(-4, -2);
      ctx.quadraticCurveTo(4 * side, -2 - flap * 16 * side, 14 * side + 2, -flap * 14 * side - 4);
      ctx.quadraticCurveTo(6, 0, 6, 0);
      ctx.closePath();
      if (side === -1) inked(ctx, '#d9dee8');
    }
    ctx.beginPath();
    ctx.moveTo(-2, -2);
    ctx.quadraticCurveTo(-6, -4 - flap * 18, 10, -6 - flap * 16);
    ctx.quadraticCurveTo(8, -2, 6, 0);
    ctx.closePath();
    inked(ctx, '#f4f6fb');
    // cuerpo
    ctx.beginPath();
    ctx.ellipse(0, 2, 13, 6, 0, 0, Math.PI * 2);
    inked(ctx, '#ffffff');
    // cola gris
    ctx.fillStyle = '#7a8296';
    ctx.beginPath();
    ctx.moveTo(11, 0);
    ctx.lineTo(19, -3);
    ctx.lineTo(19, 5);
    ctx.closePath();
    ctx.fill();
    // cabeza y pico (mira a la izquierda)
    ctx.beginPath();
    ctx.arc(-12, -2, 6, 0, Math.PI * 2);
    inked(ctx, '#ffffff');
    ctx.beginPath();
    ctx.moveTo(-17, -2);
    ctx.lineTo(-26, 0);
    ctx.lineTo(-17, 2);
    ctx.closePath();
    inked(ctx, '#ffb627');
    ctx.fillStyle = '#ff3d4f';
    ctx.fillRect(-21, 0, 2, 2);
    // ceja de mala uva
    eye(ctx, -13, -3, 2, -1);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-16, -7);
    ctx.lineTo(-10, -5);
    ctx.stroke();
  }
}

// ------------------------------------------------------------
// MATÓN EN PATINETE ELÉCTRICO — de frente, salta al acercarse
// ------------------------------------------------------------
export class Scooter extends Minor {
  constructor(g, x) {
    super('scooter', 44, 64);
    this.x = x;
    this.grounded = true;
    this.y = g.view.groundY - this.h / 2;
    this.vx = -rand(this.cfg.speed[0], this.cfg.speed[1]);
    this.jumped = false;
  }

  act(dt, g) {
    const gy = g.view.groundY - this.h / 2;
    this.x += this.vx * dt;
    const ahead = this.x - g.player.x;
    if (!this.jumped && ahead > 0 && ahead < this.cfg.jumpRange) {
      this.jumped = true;
      this.grounded = false;
      this.vy = -this.cfg.jump;
      Sound.hop();
    }
    if (!this.grounded) {
      this.vy += 1700 * dt;
      this.y += this.vy * dt;
      if (this.y >= gy) {
        this.y = gy;
        this.grounded = true;
        g.dust(this.x, g.view.groundY, 4);
      }
    }
    if (this.grounded && Math.random() < dt * 12) {
      g.particles.spawn({ x: this.x + 18, y: g.view.groundY - 3, vx: rand(40, 120), vy: rand(-40, -10), life: 0.3, size: 2, sizeEnd: 0, color: '#7ff7ff', additive: true });
    }
  }

  paint(ctx) {
    const air = !this.grounded && !this.ko;
    ctx.rotate(air ? 0.18 : 0);
    // patinete: plataforma, mástil y ruedas
    rr(ctx, -16, 24, 32, 4, 2);
    inked(ctx, '#2a2238');
    ctx.fillStyle = '#19e3d0';
    ctx.fillRect(-14, 25, 28, 1.5);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-14, 26);
    ctx.lineTo(-18, -6);
    ctx.lineTo(-24, -6);
    ctx.stroke();
    for (const wx of [-14, 13]) {
      ctx.beginPath();
      ctx.arc(wx, 29, 3.5, 0, Math.PI * 2);
      inked(ctx, '#1b1420');
    }
    // piernas
    limb(ctx, -4, 6, 0.25, 0.05, 9, 9, 6, '#3a3f55');
    limb(ctx, 4, 6, -0.2, 0.15, 9, 9, 6, '#30344a');
    // sudadera
    ctx.beginPath();
    ctx.moveTo(-10, 8);
    ctx.lineTo(-11, -12);
    ctx.quadraticCurveTo(0, -18, 11, -12);
    ctx.lineTo(10, 8);
    ctx.closePath();
    inked(ctx, vgrad(ctx, -16, 8, '#e0484f', '#9e2a33'));
    // cadena dorada
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-1, -10, 6, 0.2, Math.PI - 0.2);
    ctx.stroke();
    // brazos al manillar
    limb(ctx, -7, -8, 2.3, 2.0, 8, 8, 5, '#e0484f');
    // cabeza con capucha y gafas de sol
    ctx.beginPath();
    ctx.arc(-1, -22, 9, 0, Math.PI * 2);
    inked(ctx, '#d79a6e');
    ctx.beginPath();
    ctx.arc(1, -24, 10.5, Math.PI * 0.85, Math.PI * 2.15);
    ctx.lineTo(9, -18);
    inked(ctx, '#9e2a33');
    ctx.fillStyle = INK;
    rr(ctx, -10, -25, 10, 4, 1.5);
    ctx.fill();
    ctx.fillStyle = 'rgba(127, 247, 255, 0.8)';
    ctx.fillRect(-8, -24.5, 3, 1.5);
    // sonrisa chulesca
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-5, -17, 3, 0.2, Math.PI * 0.8);
    ctx.stroke();
  }
}

/**
 * Crea un enemigo menor (o una bandada) en x. Devuelve el espacio horizontal ocupado.
 */
export function spawnMinor(type, g, x) {
  switch (type) {
    case 'guard':
      g.addObstacle(new Guard(g, x + 40));
      return 80;
    case 'drone':
      g.addObstacle(new Drone(g, x + 40));
      return 90;
    case 'dog':
      g.addObstacle(new Dog(g));
      return 40;
    case 'gull': {
      const n = pick(CONFIG.minors.gull.flock);
      const y0 = rand(CONFIG.world.ceiling + 80, g.view.groundY - 200);
      for (let i = 0; i < n; i++) g.addObstacle(new Gull(g, x + 40 + i * 46, y0 + (i % 2 ? -26 : 26) * Math.ceil(i / 2)));
      return 60 + n * 46;
    }
    case 'scooter':
      g.addObstacle(new Scooter(g, x + 40));
      return 90;
  }
  return 0;
}

/** Efecto cómico al derrotarlo (partículas propias de cada uno). */
export function minorKoFx(o, g) {
  const { x, y } = o;
  const P = g.particles;
  P.spawn({ x, y, life: 0.3, size: 10, sizeEnd: 70, color: 'rgba(255, 244, 220, 0.9)', shape: 'ring', additive: true, important: true });
  switch (o.type) {
    case 'gull':
      // plumas que caen balanceándose
      P.burst(x, y, 14, { color: '#ffffff', speed: 200, life: 1.6, size: 5, sizeEnd: 3, shape: 'rect', spin: 6, gravity: 120, drag: 2.5, important: true });
      Sound.squawk();
      break;
    case 'drone':
      // el paquete revienta en confeti
      for (const color of ['#ff3d4f', '#ffd23f', '#19e3d0', '#a07bff']) {
        P.burst(x, y + 12, 6, { color, speed: 320, life: 1.2, size: 4, shape: 'rect', spin: 12, gravity: 700, important: true });
      }
      P.burst(x, y + 12, 10, { color: '#e0a96a', speed: 240, life: 1, size: 5, shape: 'rect', spin: 10, gravity: 900, important: true });
      Sound.droneDown();
      break;
    case 'dog':
      P.burst(x, y, 10, { color: 'rgba(240, 210, 160, 0.7)', speed: 140, life: 0.8, size: 6, sizeEnd: 14, drag: 3 });
      Sound.yelp();
      break;
    case 'scooter':
      P.burst(x, y + 20, 16, { color: '#7ff7ff', speed: 300, life: 0.5, size: 3, sizeEnd: 0, additive: true, important: true });
      Sound.bonk();
      Sound.horn();
      break;
    default:
      P.burst(x, y - 20, 8, { color: '#ffd23f', speed: 220, life: 0.6, size: 4, sizeEnd: 0, additive: true });
      Sound.bonk();
  }
}
