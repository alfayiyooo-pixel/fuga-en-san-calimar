// ESCENA INICIAL: huida del furgón blindado (~3 s, en cada partida, sin saltar)
//
//   0.0  furgón aparcado con las puertas traseras abiertas, alarma sonando
//   jumpAt  el atracador salta del furgón con la bolsa de dinero
//   …    echa a correr y acelera; la cámara pasa del furgón a seguirle
//   duration  el jugador toma el control (anillo + "¡CORRE!" pequeño)
//
// Escena y partida son continuas: mismo mundo, misma cámara y misma
// velocidad. El furgón se coloca de forma que, con el perfil de velocidad de
// la escena, el atracador llega a x = 0 (0 m) justo al terminar; al tomar el
// control no se recoloca nada. Durante la escena se ignoran toques y teclas.
// Tiempos en CONFIG.intro.

import { CONFIG } from '../config.js';
import { clamp, lerp, rand } from '../core/rng.js';
import { t } from '../core/i18n.js';
import { Sound } from '../core/audio.js';
import { drawGlow } from '../fx/sprites.js';
import { INK, rr, inked, vgrad } from '../characters/kit.js';

const smooth = (k) => k * k * (3 - 2 * k);

export class Intro {
  constructor() {
    this.active = false;
    this.controlled = false;
  }

  /** Velocidad de la escena en el instante T (px/s). */
  speedAt(T, target) {
    const I = CONFIG.intro;
    const k = clamp((T - I.jumpAt) / I.accelTime, 0, 1);
    return lerp(I.startSpeed, target, smooth(k));
  }

  /** Coloca el furgón y al jugador dentro. La partida empieza en x = 0 (0 m). */
  start(g) {
    const I = CONFIG.intro;
    this.active = true;
    this.controlled = false;
    this.t = 0;
    this.alarmT = 0;
    this.said = {};
    const p = g.player;
    // distancia que recorre en la escena con el mismo paso fijo del juego
    const target = g.targetSpeed();
    const step = CONFIG.loop.step;
    let run = 0;
    for (let T = 0; T < I.duration - 1e-9; T += step) if (T + step > I.jumpAt) run += this.speedAt(T + step, target) * step;
    this.doorX = -run + 30;               // puertas traseras
    this.truckX = this.doorX - 170;       // borde izquierdo (caja)
    p.x = this.doorX - 30;
    p.y = g.view.groundY - 70;
    p.vy = 0;
    p.onGround = false;
    this.camFrom = this.truckX - g.view.w * 0.18;
    g.camera.x = this.camFrom;
    this.hidden = true;
    this.speed = 0;
  }

  /** Paso de la escena. Devuelve true cuando termina. */
  update(dt, g, input) {
    const I = CONFIG.intro;
    const p = g.player;
    this.t += dt;
    const T = this.t;
    // alarma: pitidos alternos + luz giratoria
    this.alarmT -= dt;
    if (this.alarmT <= 0 && T < I.duration - 0.6) {
      Sound.alarmBell();
      this.alarmT = 0.55;
    }
    if (!this.said.title && T > 0.25) {
      this.said.title = true;
      g.hud.banner(t('intro.title'), t('intro.sub'));
      g.camera.addShake(0.25);
    }
    // billetes que se escapan del furgón
    if (T < I.billsUntil && Math.random() < dt * 14) {
      g.particles.spawn({ x: this.doorX + rand(-6, 10), y: g.view.groundY - rand(30, 60), vx: rand(40, 240), vy: rand(-320, -120), life: 1.4, size: 5, shape: 'rect', spin: 10, gravity: 600, drag: 1.2, color: '#5fcf7a' });
    }

    const gy = g.view.groundY;
    if (T < I.jumpAt) {
      // dentro del furgón, preparando el salto
      p.x = this.doorX - 30;
      p.y = gy - 70;
    } else {
      if (this.hidden) {
        this.hidden = false;
        p.vy = -420;
        p.onGround = false;
        Sound.hop();
      }
      this.speed = this.speedAt(T, g.targetSpeed());
      p.update(dt, false, this.speed, gy);
    }
    // cámara: del furgón al jugador (al final ya le sigue exactamente)
    const follow = p.x - g.view.w * CONFIG.player.screenX;
    const k = smooth(clamp((T - I.jumpAt - 0.1) / I.camTime, 0, 1));
    g.camera.x = lerp(this.camFrom, follow, k);
    g.speed = this.speed;

    // toques y teclas no cuentan durante la escena (ni se acumulan)
    input.consumePresses();
    if (T >= I.duration - 1e-9) return this.finish(g);
    return false;
  }

  /** El jugador toma el control: no se mueve nada, solo se avisa con un detalle. */
  finish(g) {
    this.active = false;
    this.controlled = true;
    const p = g.player;
    p.prevHeld = true; // si mantienes pulsado, hay que soltar antes de saltar
    p.jumpBuf = 0;
    g.speed = this.speed;
    g.popups.add(t('intro.go'), g.view.w * CONFIG.player.screenX + 40, p.y - 70, { color: '#ffd23f', size: 26, life: 0.9, rise: 30 });
    Sound.tick();
    return true;
  }

  /** Anillo que marca el instante en que tomas el control. */
  drawCue(ctx, camX, g) {
    if (!this.controlled) return;
    const age = g.runTime;
    const life = CONFIG.intro.cueTime;
    if (age > life) return;
    const k = age / life;
    const p = g.player;
    ctx.save();
    ctx.globalAlpha = (1 - k) * 0.8;
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 3 * (1 - k) + 1;
    ctx.beginPath();
    ctx.arc(p.x - camX, p.y, 24 + 46 * smooth(k), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  get playerVisible() {
    return !this.active || !this.hidden;
  }

  /** Furgón con las puertas abiertas y la alarma (en el mundo). */
  draw(ctx, camX, g) {
    const x = this.truckX - camX;
    if (x > g.view.w + 50 || x < -400) return;
    const gy = g.view.groundY;
    const w = 170;
    const h = 92;
    const y = gy - h - 10;
    const time = g.t;
    ctx.fillStyle = 'rgba(10, 5, 30, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, gy + 3, w / 2 + 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // cabina (a la izquierda)
    ctx.beginPath();
    ctx.moveTo(x - 46, y + h);
    ctx.lineTo(x - 46, y + 40);
    ctx.quadraticCurveTo(x - 44, y + 22, x - 26, y + 20);
    ctx.lineTo(x, y + 20);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    inked(ctx, vgrad(ctx, y + 20, y + h, '#6d7a92', '#3f4a5e'));
    ctx.fillStyle = 'rgba(160, 230, 255, 0.85)';
    ctx.fillRect(x - 38, y + 28, 30, 18);
    // caja blindada
    rr(ctx, x, y, w, h, 6);
    inked(ctx, vgrad(ctx, y, y + h, '#9aa7bd', '#4e5a70'));
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(x + 2, y + 34, w - 4, 10);
    ctx.fillStyle = INK;
    ctx.font = "12px 'Bungee', Impact, sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BANCO LINGOTE', x + (w - 40) / 2, y + 40);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let k = 0; k < 9; k++) ctx.fillRect(x + 10 + k * 18, y + 8, 3, 3);
    // interior oscuro con sacos y lingotes
    ctx.fillStyle = '#1b1430';
    ctx.fillRect(x + w - 40, y + 6, 36, h - 12);
    ctx.fillStyle = '#ffd23f';
    for (let k = 0; k < 3; k++) ctx.fillRect(x + w - 36 + k * 9, y + h - 18, 8, 6);
    ctx.fillStyle = '#c9ad78';
    ctx.beginPath();
    ctx.ellipse(x + w - 22, y + h - 30, 9, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    // puertas abiertas de par en par
    for (const [dx, sk] of [[w - 4, 1], [w + 2, 1.2]]) {
      ctx.save();
      ctx.translate(x + dx, y + 4);
      ctx.transform(1, sk * 0.12, 0, 1, 0, 0);
      rr(ctx, 0, 0, 24 * sk, h - 8, 3);
      inked(ctx, '#7d889c');
      ctx.fillStyle = INK;
      ctx.fillRect(6 * sk, 22, 10, 4);
      ctx.restore();
    }
    // baliza de alarma giratoria
    const on = Math.floor(time * 8) % 2 === 0;
    ctx.fillStyle = on ? '#ff3d4f' : '#ffb627';
    rr(ctx, x + 70, y - 12, 18, 12, 4);
    ctx.fill();
    drawGlow(ctx, x + 79, y - 6, 70, on ? 'rgba(255, 61, 79, 0.95)' : 'rgba(255, 182, 39, 0.9)', 0.75);
    const a = time * 10;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = on ? 'rgba(255, 61, 79, 0.18)' : 'rgba(255, 182, 39, 0.16)';
    ctx.beginPath();
    ctx.moveTo(x + 79, y - 6);
    ctx.arc(x + 79, y - 6, 260, a, a + 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // ruedas
    for (const wx of [x - 26, x + 34, x + w - 30]) {
      ctx.beginPath();
      ctx.arc(wx, gy - 10, 13, 0, Math.PI * 2);
      inked(ctx, '#1b1420');
      ctx.fillStyle = '#9aa3b5';
      ctx.beginPath();
      ctx.arc(wx, gy - 10, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // "¡ALARMA!" parpadeando
    if (this.active && on) {
      ctx.font = "18px 'Bungee', Impact, sans-serif";
      ctx.fillStyle = '#ff3d4f';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 5;
      ctx.strokeText(t('intro.alarm'), x + 79, y - 34);
      ctx.fillText(t('intro.alarm'), x + 79, y - 34);
    }
  }
}
