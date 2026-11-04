import { CONFIG } from '../config.js';
import { clamp, rand, approach, pick } from '../core/rng.js';
import { t } from '../core/i18n.js';
import { roundRect } from './player.js';
import { Sound } from '../core/audio.js';
import { drawGlow } from '../fx/sprites.js';
import { Quality } from '../core/quality.js';

/*
 * OBSTÁCULOS
 * Todos comparten la interfaz:
 *   update(dt, g)      lógica (g = Game)
 *   draw(ctx, camX, g) dibujo en el mundo
 *   overlay(ctx, g)    avisos en pantalla (opcional)
 *   hits(box)          colisión con la caja del jugador {l, r, t, b}
 *   alive / police     estado y si cuenta como policía
 */

const INK = '#1b1030';

function boxOverlap(a, l, r, t, b) {
  return a.l < r && a.r > l && a.t < b && a.b > t;
}

/** Añade al trazado actual un rectángulo girado alrededor de un segmento grueso. */
export function segPath(ctx, x1, y1, x2, y2, half) {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = (-(y2 - y1) / len) * half;
  const ny = ((x2 - x1) / len) * half;
  const ex = ((x2 - x1) / len) * half;
  const ey = ((y2 - y1) / len) * half;
  ctx.moveTo(x1 + nx - ex, y1 + ny - ey);
  ctx.lineTo(x2 + nx + ex, y2 + ny + ey);
  ctx.lineTo(x2 - nx + ex, y2 - ny + ey);
  ctx.lineTo(x1 - nx - ex, y1 - ny - ey);
  ctx.closePath();
}

/** Añade un rectángulo redondeado al trazado actual. */
export function rectPath(ctx, x, y, w, h, r = 6) {
  ctx.roundRect(x, y, w, h, r);
}

export class Obstacle {
  constructor(type) {
    this.type = type;
    this.alive = true;
    this.police = false;
  }
  update() {}
  draw() {}
  overlay() {}
  /**
   * Silueta de la parte que hace daño, para el borde de peligro (game.drawDangerOutline).
   * Añade subtrazados a ctx y devuelve true; false si ahora no hace daño o no tiene.
   */
  dangerPath() {
    return false;
  }
  hits() {
    return false;
  }
  /** Se elimina cuando queda bastante atrás de la cámara. */
  cull(camX) {
    if (this.right < camX - 250) this.alive = false;
  }
}

// ------------------------------------------------------------
// CABLE ELÉCTRICO — segmento chisporroteante entre dos cajas
// ------------------------------------------------------------
export class Cable extends Obstacle {
  constructor(x, y, len, angle, spin = 0) {
    super('cable');
    this.x = x;
    this.y = y;
    this.len = len;
    this.angle = angle;
    this.spin = spin;
    this.th = CONFIG.obstacles.cable.thickness;
    this.seed = Math.random() * 100;
  }

  get ends() {
    const dx = (Math.cos(this.angle) * this.len) / 2;
    const dy = (Math.sin(this.angle) * this.len) / 2;
    return [this.x - dx, this.y - dy, this.x + dx, this.y + dy];
  }

  get right() {
    return this.x + this.len / 2 + 20;
  }

  dangerPath(ctx, camX) {
    const [x1, y1, x2, y2] = this.ends;
    segPath(ctx, x1 - camX, y1, x2 - camX, y2, this.th / 2 + 2);
    return true;
  }

  update(dt, g) {
    this.angle += this.spin * dt;
    // chispas ocasionales a lo largo del cable
    if (Quality.settings.detail && Math.random() < dt * 5) {
      const [x1, y1, x2, y2] = this.ends;
      const k = Math.random();
      g.particles.spawn({ x: x1 + (x2 - x1) * k, y: y1 + (y2 - y1) * k, vx: rand(-120, 120), vy: rand(-160, 40), life: rand(0.2, 0.4), size: 2, sizeEnd: 0.5, color: '#bff8ff', additive: true, gravity: 700 });
    }
  }

  hits(box) {
    const [x1, y1, x2, y2] = this.ends;
    const r = this.th / 2;
    const steps = Math.ceil(this.len / 8);
    for (let i = 0; i <= steps; i++) {
      const k = i / steps;
      const px = x1 + (x2 - x1) * k;
      const py = y1 + (y2 - y1) * k;
      if (px > box.l - r && px < box.r + r && py > box.t - r && py < box.b + r) return true;
    }
    return false;
  }

  draw(ctx, camX, g) {
    const [x1, y1, x2, y2] = this.ends;
    const ax = x1 - camX;
    const bx = x2 - camX;
    // halo luminoso (aditivo)
    const pulse = 0.75 + 0.25 * Math.sin(g.t * 14 + this.seed);
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(60, 200, 255, ${0.16 * pulse})`;
    ctx.lineWidth = this.th + 22;
    ctx.beginPath();
    ctx.moveTo(ax, y1);
    ctx.lineTo(bx, y2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(120, 240, 255, ${0.3 * pulse})`;
    ctx.lineWidth = this.th + 8;
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    drawGlow(ctx, ax, y1, 30, 'rgba(95, 232, 255, 0.9)', 0.55 * pulse);
    drawGlow(ctx, bx, y2, 30, 'rgba(95, 232, 255, 0.9)', 0.55 * pulse);
    // rayo en zigzag
    const segs = Math.max(4, Math.floor(this.len / 16));
    const nx = -(y2 - y1) / this.len;
    const ny = (bx - ax) / this.len;
    const flick = Math.floor(g.t * 30 + this.seed);
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass === 0 ? '#5fe8ff' : '#ffffff';
      ctx.lineWidth = pass === 0 ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(ax, y1);
      for (let i = 1; i < segs; i++) {
        const k = i / segs;
        const j = (Math.sin(flick * 12.9898 + i * 78.233 + pass) * 43758.5453) % 1;
        const off = j * (pass === 0 ? 6 : 4);
        ctx.lineTo(ax + (bx - ax) * k + nx * off, y1 + (y2 - y1) * k + ny * off);
      }
      ctx.lineTo(bx, y2);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    // cajas de los extremos
    for (const [ex, ey] of [[ax, y1], [bx, y2]]) {
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(this.angle);
      ctx.fillStyle = INK;
      roundRect(ctx, -11, -11, 22, 22, 5);
      ctx.fill();
      ctx.fillStyle = '#f0b429';
      roundRect(ctx, -8, -8, 16, 16, 3);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.fillRect(-8, -2, 16, 4);
      ctx.restore();
      ctx.fillStyle = Math.sin(g.t * 10 + this.seed) > 0 ? '#ff3d4f' : '#7a1020';
      ctx.beginPath();
      ctx.arc(ex, ey, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ------------------------------------------------------------
// CARTEL QUE CAE — cuelga arriba y se desploma cuando te acercas
// ------------------------------------------------------------
const ADS = [
  { bg: '#ffd23f', fg: INK, text: 'ORO+' },
  { bg: INK, fg: '#19c3b1', text: 'CALIBANK' },
  { bg: '#ff3d7f', fg: '#fff4dc', text: 'SUNNY’S' },
  { bg: '#19c3b1', fg: '#fff4dc', text: 'VIP%' },
  { bg: '#fff4dc', fg: '#ff7a3d', text: 'MEGA-$' },
];

export class Billboard extends Obstacle {
  constructor(x) {
    super('billboard');
    this.w = 150;
    this.h = 78;
    this.x = x;
    this.y = CONFIG.world.ceiling + 6; // borde superior
    this.vy = 0;
    this.rot = 0;
    this.state = 'hang';
    this.timer = 0;
    this.ad = pick(ADS);
  }

  get right() {
    return this.x + this.w;
  }

  update(dt, g) {
    const B = CONFIG.obstacles.billboard;
    const gy = g.view.groundY;
    if (this.state === 'hang') {
      if (this.x - g.player.x < g.speed * B.triggerTime + this.w * 0.5) {
        this.state = 'wobble';
        this.timer = 0;
      }
    } else if (this.state === 'wobble') {
      this.timer += dt;
      this.rot = Math.sin(this.timer * 40) * 0.04;
      if (this.timer > B.wobble) {
        this.state = 'fall';
        g.particles.burst(this.x + this.w / 2, this.y, 8, { color: '#ffd23f', speed: 200, life: 0.3, size: 2, additive: true });
      }
    } else if (this.state === 'fall') {
      this.vy += B.gravity * dt;
      this.y += this.vy * dt;
      this.rot += 0.5 * dt;
      if (this.y + this.h >= gy) {
        this.state = 'crashed';
        this.h = 34;
        this.y = gy - this.h;
        this.rot = 0.06;
        g.camera.addShake(0.35);
        Sound.crash();
        g.particles.spawn({ x: this.x + this.w / 2, y: gy - 10, life: 0.3, size: 20, sizeEnd: 90, color: 'rgba(255, 230, 160, 0.8)', shape: 'glow', additive: true });
        g.particles.burst(this.x + this.w / 2, gy - 16, 10, { color: 'rgba(70, 60, 80, 0.55)', speed: 120, life: 1.1, size: 8, sizeEnd: 22, drag: 2.5, vy: -60 });
        g.particles.burst(this.x + this.w / 2, gy - 6, 18, { color: '#d8cbb0', speed: 260, life: 0.6, size: 4, sizeEnd: 1, gravity: 600 });
        g.particles.burst(this.x + this.w / 2, gy - 10, 10, { color: this.ad.bg, speed: 300, life: 0.8, size: 4, shape: 'rect', spin: 8, gravity: 900 });
        g.chaos(CONFIG.wanted.heat.billboardCrash, this.x + this.w / 2, gy - 60);
      }
    }
  }

  hits(box) {
    const pad = 4;
    return boxOverlap(box, this.x + pad, this.x + this.w - pad, this.y + pad, this.y + this.h);
  }

  draw(ctx, camX, g) {
    const x = this.x - camX;
    const gy = g.view.groundY;

    // sombra en el suelo (avisa de dónde caerá)
    if (this.state !== 'crashed') {
      const k = clamp((this.y + this.h) / gy, 0.2, 1);
      ctx.fillStyle = `rgba(20, 10, 40, ${0.15 + k * 0.25})`;
      ctx.beginPath();
      ctx.ellipse(x + this.w / 2, gy + 4, (this.w / 2) * k, 6 * k, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // cadenas mientras cuelga
    if (this.state === 'hang' || this.state === 'wobble') {
      ctx.strokeStyle = '#3a3150';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(x + 20, 0);
      ctx.lineTo(x + 20, this.y);
      ctx.moveTo(x + this.w - 20, 0);
      ctx.lineTo(x + this.w - 20, this.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.save();
    ctx.translate(x + this.w / 2, this.y + this.h / 2);
    ctx.rotate(this.rot);
    const w = this.w;
    const h = this.h;
    ctx.fillStyle = INK;
    roundRect(ctx, -w / 2, -h / 2, w, h, 6);
    ctx.fill();
    ctx.fillStyle = this.ad.bg;
    ctx.fillRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10);
    if (this.state === 'crashed') {
      // cartel roto
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-20, -h / 2);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-25, h / 2);
      ctx.moveTo(30, -h / 2);
      ctx.lineTo(42, h / 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = this.ad.fg;
      ctx.font = "22px 'Bungee', Impact, sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.ad.text, 0, 2);
      // bombillas
      for (let i = 0; i < 6; i++) {
        const lit = Math.sin(g.t * 6 + i) > 0;
        if (lit) drawGlow(ctx, -w / 2 + 15 + i * ((w - 30) / 5), h / 2 - 2, 9, 'rgba(255, 240, 180, 0.9)', 0.8);
        ctx.fillStyle = lit ? '#fff6c2' : '#a08850';
        ctx.beginPath();
        ctx.arc(-w / 2 + 15 + i * ((w - 30) / 5), h / 2 - 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

// ------------------------------------------------------------
// COCHE PATRULLA — viene de frente por el suelo con la sirena
// ------------------------------------------------------------
export class PatrolCar extends Obstacle {
  constructor(g, delay = 0) {
    super('car');
    const C = CONFIG.obstacles.car;
    this.police = true;
    this.w = 116;
    this.h = 44;
    this.speed = rand(C.minSpeed, C.maxSpeed) * (g.policeLevel.carSpeed ?? 1);
    const closing = g.speed + this.speed;
    this.x = g.camera.x + g.view.w + closing * (C.warnTime * g.warnMult + delay);
    this.y = g.view.groundY - this.h;
    this.passed = false;
    this.wheel = 0;
    if (!delay) Sound.sirenBlip();
  }

  get right() {
    return this.x + this.w;
  }

  update(dt, g) {
    this.x -= this.speed * dt;
    this.wheel += dt * (this.speed + g.speed) * 0.08;
    if (!this.passed && this.right < g.player.left) {
      this.passed = true;
      g.spotted(CONFIG.wanted.heat.carPass, g.player.x, g.player.y - 50);
    }
  }

  hits(box) {
    return boxOverlap(box, this.x + 8, this.x + this.w - 6, this.y + 10, this.y + this.h);
  }

  dangerPath(ctx, camX) {
    const x = this.x - camX;
    if (x > 2000) return false;
    rectPath(ctx, x + 2, this.y + 2, this.w - 4, this.h - 2, 12);
    return true;
  }

  overlay(ctx, g) {
    const sx = this.x - g.camera.x;
    if (sx < g.view.w) return;
    warningIcon(ctx, g.view.w - 34, this.y + this.h / 2 - 6, g.t, 'car');
  }

  draw(ctx, camX, g) {
    const x = this.x - camX;
    const y = this.y;
    const w = this.w;
    // sombra y haz de los faros
    ctx.fillStyle = 'rgba(10, 5, 30, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + 46, w / 2 + 6, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    const beam = ctx.createLinearGradient(x, 0, x - 160, 0);
    beam.addColorStop(0, 'rgba(255, 245, 200, 0.35)');
    beam.addColorStop(1, 'rgba(255, 245, 200, 0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 20);
    ctx.lineTo(x - 160, y + 4);
    ctx.lineTo(x - 160, y + 46);
    ctx.lineTo(x + 2, y + 25);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // carrocería (mira a la izquierda)
    ctx.fillStyle = INK;
    roundRect(ctx, x - 3, y + 13, w + 6, 26, 9);
    ctx.fill();
    ctx.fillStyle = '#f4f1ea';
    roundRect(ctx, x, y + 15, w, 22, 8);
    ctx.fill();
    ctx.fillStyle = '#1f3a8a';
    ctx.fillRect(x + 2, y + 27, w - 4, 9);
    // cabina
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(x + 24, y + 16);
    ctx.lineTo(x + 40, y + 2);
    ctx.lineTo(x + 84, y + 2);
    ctx.lineTo(x + 98, y + 16);
    ctx.fill();
    ctx.fillStyle = '#9fe1ff';
    ctx.beginPath();
    ctx.moveTo(x + 30, y + 15);
    ctx.lineTo(x + 42, y + 5);
    ctx.lineTo(x + 60, y + 5);
    ctx.lineTo(x + 60, y + 15);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 64, y + 15);
    ctx.lineTo(x + 64, y + 5);
    ctx.lineTo(x + 82, y + 5);
    ctx.lineTo(x + 92, y + 15);
    ctx.fill();
    // escudo con gaviota (PSC)
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(x + 62, y + 24, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 58, y + 24);
    ctx.quadraticCurveTo(x + 60, y + 21, x + 62, y + 24);
    ctx.quadraticCurveTo(x + 64, y + 21, x + 66, y + 24);
    ctx.stroke();
    // faros
    ctx.fillStyle = '#fff6c2';
    ctx.fillRect(x, y + 19, 6, 5);
    // sirena
    const on = Math.floor(g.t * 8) % 2 === 0;
    ctx.fillStyle = on ? '#ff3d4f' : '#5a1020';
    ctx.fillRect(x + 46, y - 4, 13, 6);
    ctx.fillStyle = on ? '#1f5fff' : '#ff3d4f';
    ctx.fillRect(x + 59, y - 4, 13, 6);
    drawGlow(ctx, x + (on ? 52 : 66), y - 1, 46, on ? 'rgba(255, 60, 80, 0.95)' : 'rgba(50, 110, 255, 0.95)', 0.9);
    drawGlow(ctx, x + 3, y + 21, 14, 'rgba(255, 250, 220, 0.9)', 0.9);
    // ruedas
    for (const wx of [x + 24, x + w - 24]) {
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(wx, y + 37, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#9aa3b5';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wx + Math.cos(this.wheel) * 5, y + 37 + Math.sin(this.wheel) * 5);
      ctx.lineTo(wx - Math.cos(this.wheel) * 5, y + 37 - Math.sin(this.wheel) * 5);
      ctx.stroke();
    }
  }
}

// ------------------------------------------------------------
// HELICÓPTERO — patrulla con un foco; si te detecta, dispara
// ------------------------------------------------------------
export class Helicopter extends Obstacle {
  constructor(g) {
    super('heli');
    this.police = true;
    this.w = 112;
    this.h = 40;
    this.sx = g.view.w + 140;              // posición en pantalla
    this.targetSx = g.view.w * rand(0.6, 0.78);
    this.y = rand(62, 92);
    this.state = 'enter';
    this.life = CONFIG.obstacles.heli.life;
    this.detect = 0;
    this.timer = 0;
    this.shots = 0;
    this.sweepT = rand(0, 6);
    this.beam = Math.PI * 0.62;
    this.locked = false;
    this.x = g.camera.x + this.sx;
    Sound.chopper();
  }

  get right() {
    return this.x + this.w / 2;
  }

  /** Origen del foco (bajo el morro). */
  get lightX() {
    return this.x - 26;
  }
  get lightY() {
    return this.y + 18;
  }

  cull() {
    if (this.state === 'leave' && (this.y < -120 || this.sx > 2000)) this.alive = false;
  }

  update(dt, g) {
    const H = CONFIG.obstacles.heli;
    const p = g.player;
    this.life -= dt;
    this.sweepT += dt;

    if (this.state === 'enter') {
      this.sx = approach(this.sx, this.targetSx, 2.2, dt);
      if (Math.abs(this.sx - this.targetSx) < 6) this.state = 'patrol';
    } else if (this.state === 'leave') {
      this.y -= 160 * dt;
      this.sx += 220 * dt;
    }
    this.x = g.camera.x + this.sx;
    const bob = Math.sin(g.t * 2.4) * 0.6;
    this.y += bob * dt * 20;

    // ángulo hacia el jugador desde el foco
    const dx = p.x - this.lightX;
    const dy = p.y - this.lightY;
    const toPlayer = Math.atan2(dy, dx);

    if (this.state === 'patrol' || this.state === 'enter') {
      // barrido de un lado a otro
      this.beam = Math.PI * (0.55 + 0.28 * (0.5 + 0.5 * Math.sin(this.sweepT * 1.25)));
      const inside = dy > 0 && Math.abs(toPlayer - this.beam) < 0.14;
      this.detect = inside ? this.detect + dt : Math.max(0, this.detect - dt * 0.6);
      if (this.detect >= H.detectTime) {
        // te fija: el foco se congela donde estabas y dispara tras H.windup s
        this.state = 'lock';
        this.timer = 0;
        this.shots = 0;
        this.lockAng = toPlayer;
        Sound.spottedAlarm();
        g.spotted(CONFIG.wanted.heat.heliSpotted, p.x, p.y - 60);
      }
      if (this.life <= 0) this.state = 'leave';
    } else if (this.state === 'lock' || this.state === 'fire') {
      this.beam = approach(this.beam, this.lockAng, 14, dt);
      this.timer += dt;
      if (this.state === 'lock' && Math.floor(this.timer * 6) !== Math.floor((this.timer - dt) * 6)) Sound.lockBeep(this.timer > H.windup * g.warnMult * 0.6);
      if (this.state === 'lock' && this.timer >= H.windup * g.warnMult) {
        this.state = 'fire';
        this.timer = H.shotInterval;
      }
      if (this.state === 'fire' && this.timer >= H.shotInterval) {
        this.timer = 0;
        const burst = H.burst + g.policeLevel.heliShots;
        if (this.shots < burst) {
          this.shots++;
          g.addObstacle(new Bullet(this.lightX, this.lightY, Math.cos(this.lockAng), Math.sin(this.lockAng), g));
          g.particles.burst(this.lightX, this.lightY, 4, { color: '#ffd23f', speed: 120, life: 0.15, size: 3, additive: true });
        } else {
          this.state = 'cooldown';
          this.timer = 0;
        }
      }
    } else if (this.state === 'cooldown') {
      this.timer += dt;
      if (this.timer > H.cooldown) {
        this.detect = 0;
        this.state = this.life > 0 ? 'patrol' : 'leave';
      }
    }
  }

  hits(box) {
    return boxOverlap(box, this.x - this.w / 2 + 6, this.x + this.w / 2 - 20, this.y - this.h / 2 + 6, this.y + this.h / 2);
  }

  dangerPath(ctx, camX) {
    const x = this.x - camX;
    ctx.moveTo(x - 6 + 42, this.y);
    ctx.ellipse(x - 6, this.y, 42, 24, 0, 0, Math.PI * 2);
    return true;
  }

  draw(ctx, camX, g) {
    const x = this.x - camX;
    const y = this.y;
    const lx = this.lightX - camX;
    const ly = this.lightY;
    const red = this.state === 'lock' || this.state === 'fire';

    // cono de luz hasta el suelo
    if (this.state !== 'leave') {
      const gy = g.view.groundY;
      const len = (gy - ly) / Math.max(0.2, Math.sin(this.beam));
      const half = 0.14;
      const ax = lx + Math.cos(this.beam - half) * len;
      const ay = ly + Math.sin(this.beam - half) * len;
      const bx = lx + Math.cos(this.beam + half) * len;
      const by = ly + Math.sin(this.beam + half) * len;
      const grad = ctx.createLinearGradient(lx, ly, (ax + bx) / 2, (ay + by) / 2);
      const c = red ? '255, 70, 90' : '255, 244, 190';
      const alarm = this.detect / CONFIG.obstacles.heli.detectTime;
      grad.addColorStop(0, `rgba(${c}, ${0.55 + alarm * 0.2})`);
      grad.addColorStop(1, `rgba(${c}, 0.04)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.closePath();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // charco de luz en el suelo
      if (ay > gy - 5) {
        drawGlow(ctx, (ax + bx) / 2, gy, Math.abs(bx - ax) / 2 + 24, red ? 'rgba(255, 70, 90, 0.8)' : 'rgba(255, 244, 190, 0.8)', 0.55, 12);
      }
      drawGlow(ctx, lx, ly, 22, red ? 'rgba(255, 70, 90, 0.95)' : 'rgba(255, 250, 220, 0.95)', 0.9);
      // fijado: línea de tiro discontinua que se intensifica hasta el disparo
      if (this.state === 'lock') {
        const k = Math.min(1, this.timer / (CONFIG.obstacles.heli.windup * g.warnMult));
        ctx.strokeStyle = `rgba(255, 61, 79, ${0.45 + 0.5 * k})`;
        ctx.lineWidth = 2 + 2 * k;
        ctx.setLineDash([12, 7]);
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + Math.cos(this.lockAng) * 1100, ly + Math.sin(this.lockAng) * 1100);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // cola (a la derecha, mira a la izquierda)
    ctx.fillStyle = INK;
    ctx.fillRect(x + 18, y - 8, 66, 9);
    ctx.fillStyle = '#1f3a8a';
    ctx.fillRect(x + 20, y - 6, 62, 5);
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(x + 76, y - 6);
    ctx.lineTo(x + 92, y - 26);
    ctx.lineTo(x + 92, y - 2);
    ctx.fill();
    // rotor de cola
    const tr = g.t * 50;
    ctx.strokeStyle = 'rgba(40,30,60,0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 90 + Math.cos(tr) * 12, y - 16 + Math.sin(tr) * 12);
    ctx.lineTo(x + 90 - Math.cos(tr) * 12, y - 16 - Math.sin(tr) * 12);
    ctx.stroke();
    // cuerpo
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(x - 6, y, 40, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4f1ea';
    ctx.beginPath();
    ctx.ellipse(x - 6, y, 37, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1f3a8a';
    ctx.beginPath();
    ctx.ellipse(x - 6, y + 7, 37, 10, 0, 0, Math.PI);
    ctx.fill();
    // cristal
    ctx.fillStyle = '#9fe1ff';
    ctx.beginPath();
    ctx.ellipse(x - 26, y - 4, 15, 11, 0, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();
    // patines
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 34, y + 30);
    ctx.lineTo(x + 18, y + 30);
    ctx.moveTo(x - 22, y + 18);
    ctx.lineTo(x - 24, y + 30);
    ctx.moveTo(x + 8, y + 18);
    ctx.lineTo(x + 10, y + 30);
    ctx.stroke();
    // foco
    ctx.fillStyle = red ? '#ff3d4f' : '#fff6c2';
    ctx.beginPath();
    ctx.arc(lx, ly, 5, 0, Math.PI * 2);
    ctx.fill();
    // rotor principal
    ctx.fillStyle = INK;
    ctx.fillRect(x - 9, y - 30, 6, 10);
    const blade = Math.abs(Math.sin(g.t * 40)) * 70 + 20;
    ctx.fillStyle = 'rgba(40, 30, 60, 0.75)';
    ctx.fillRect(x - 6 - blade, y - 32, blade * 2, 4);
    // luz de alarma
    if (red && Math.floor(g.t * 10) % 2 === 0) {
      ctx.fillStyle = '#ff3d4f';
      ctx.beginPath();
      ctx.arc(x + 10, y - 20, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Bala del helicóptero (hereda la velocidad de la cámara)
export class Bullet extends Obstacle {
  constructor(x, y, dx, dy, g) {
    super('bullet');
    this.police = true;
    const s = CONFIG.obstacles.heli.bulletSpeed;
    this.x = x;
    this.y = y;
    this.vx = g.speed + dx * s;
    this.vy = dy * s;
    this.dx = dx;
    this.dy = dy;
  }

  get right() {
    return this.x + 6;
  }

  update(dt, g) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y > g.view.groundY) {
      this.alive = false;
      g.particles.burst(this.x, g.view.groundY - 2, 5, { color: '#ffd23f', speed: 180, life: 0.25, size: 2, gravity: 600, additive: true });
    }
    if (this.y < -50 || this.x > g.camera.x + g.view.w + 100) this.alive = false;
  }

  hits(box) {
    return this.x > box.l - 4 && this.x < box.r + 4 && this.y > box.t - 4 && this.y < box.b + 4;
  }

  draw(ctx, camX) {
    const x = this.x - camX;
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255, 210, 63, 0.9)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, this.y);
    ctx.lineTo(x - this.dx * 22, this.y - this.dy * 22);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#fffbe8';
    ctx.beginPath();
    ctx.arc(x, this.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ------------------------------------------------------------
// MISIL — aviso que te sigue, se fija y atraviesa la pantalla
// ------------------------------------------------------------
export class Missile extends Obstacle {
  constructor(g, delay = 0, offsetY = 0) {
    super('missile');
    this.police = true;
    this.state = 'warn';
    this.timer = -delay;
    this.wm = g.warnMult; // a pie, más tiempo de aviso
    this.offsetY = offsetY;
    this.ty = clamp(g.player.y + offsetY, 60, g.view.groundY - 20);
    this.x = 0;
    this.y = this.ty;
    this.w = 50;
    this.h = 16;
  }

  get right() {
    return this.state === 'fly' ? this.x + this.w : Infinity;
  }

  update(dt, g) {
    const M = CONFIG.obstacles.missile;
    this.timer += dt;
    // pitidos de aviso: lentos al seguirte, rápidos al fijarse
    if (this.state !== 'fly' && this.timer >= 0) {
      this.beep = (this.beep ?? 0) - dt;
      if (this.beep <= 0) {
        this.beep = this.state === 'lock' ? 0.09 : 0.32;
        Sound.lockBeep(this.state === 'lock');
      }
    }
    if (this.state === 'warn') {
      const target = clamp(g.player.y + this.offsetY, 60, g.view.groundY - 20);
      this.ty = approach(this.ty, target, 5, dt);
      if (this.timer >= M.warnTime * this.wm) {
        this.state = 'lock';
        this.timer = 0;
      }
    } else if (this.state === 'lock') {
      if (this.timer >= M.lockTime * this.wm) {
        this.state = 'fly';
        this.x = g.camera.x + g.view.w + 40;
        this.y = this.ty;
        g.camera.addShake(0.12);
        Sound.missileLaunch();
      }
    } else {
      this.x -= M.speed * dt;
      if (Math.random() < dt * 60) {
        g.particles.spawn({ x: this.x + this.w, y: this.y + rand(-2, 2), vx: rand(-30, 30), vy: rand(-30, 30), life: rand(0.4, 0.7), size: 4, sizeEnd: 11, color: 'rgba(230, 225, 240, 0.55)', drag: 2 });
        g.particles.spawn({ x: this.x + this.w + 4, y: this.y, vx: 120, life: 0.12, size: 6, sizeEnd: 2, color: '#ffb627', additive: true });
      }
    }
  }

  dangerPath(ctx, camX) {
    if (this.state !== 'fly') return false;
    rectPath(ctx, this.x - camX - 5, this.y - 9, 56, 18, 8);
    return true;
  }

  hits(box) {
    if (this.state !== 'fly') return false;
    return boxOverlap(box, this.x + 2, this.x + this.w - 6, this.y - this.h / 2 + 3, this.y + this.h / 2 - 3);
  }

  overlay(ctx, g) {
    if (this.state === 'fly' || this.timer < 0) return;
    const blink = this.state === 'lock' ? Math.floor(g.t * 16) % 2 === 0 : Math.floor(g.t * 5) % 2 === 0;
    warningIcon(ctx, g.view.w - 34, this.ty, g.t, 'missile', blink, this.state === 'lock');
  }

  draw(ctx, camX) {
    if (this.state !== 'fly') return;
    const x = this.x - camX;
    const y = this.y;
    drawGlow(ctx, x + 54, y, 26, 'rgba(255, 170, 60, 0.95)', 0.9);
    drawGlow(ctx, x + 20, y, 46, 'rgba(255, 80, 90, 0.6)', 0.35, 18);
    // aletas
    ctx.fillStyle = '#ff3d4f';
    ctx.beginPath();
    ctx.moveTo(x + 36, y);
    ctx.lineTo(x + 50, y - 12);
    ctx.lineTo(x + 50, y + 12);
    ctx.fill();
    // cuerpo
    ctx.fillStyle = INK;
    roundRect(ctx, x + 6, y - 8, 42, 16, 6);
    ctx.fill();
    ctx.fillStyle = '#e6ebf5';
    roundRect(ctx, x + 8, y - 6, 38, 12, 5);
    ctx.fill();
    ctx.fillStyle = '#f0b429';
    ctx.fillRect(x + 24, y - 6, 5, 12);
    // punta
    ctx.fillStyle = '#ff3d4f';
    ctx.beginPath();
    ctx.moveTo(x + 9, y - 6);
    ctx.lineTo(x - 4, y);
    ctx.lineTo(x + 9, y + 6);
    ctx.fill();
  }
}

/** Icono de aviso en el borde derecho de la pantalla. */
export function warningIcon(ctx, x, y, time, kind, visible = true, locked = false) {
  const pulse = 1 + Math.sin(time * 12) * 0.08;
  if (visible) drawGlow(ctx, x, y, 40, locked ? 'rgba(255, 61, 79, 0.9)' : 'rgba(255, 210, 63, 0.9)', 0.6);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(23, 16);
  ctx.lineTo(-23, 16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = visible ? (locked ? '#ff3d4f' : '#ffd23f') : '#7a5a10';
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(18, 12);
  ctx.lineTo(-18, 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = "18px 'Bungee', Impact, sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(kind === 'car' ? '◀' : kind === 'behind' ? '▶' : '!', 0, 2);
  ctx.restore();
  if (kind === 'missile' && locked) {
    // línea de trayectoria
    ctx.strokeStyle = 'rgba(255, 61, 79, 0.35)';
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 30, y);
    ctx.lineTo(0, y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

/** Texto de la causa de la "muerte" para la pantalla final. */
export function causeText(type) {
  return t(`cause.${type}`);
}
