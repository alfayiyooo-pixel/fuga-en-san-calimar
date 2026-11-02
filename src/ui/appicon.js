// Icono de la app (PWA), dibujado por código con el propio protagonista.
// Se usa para generar los PNG de icons/ (ver tools/generar-iconos.js).

import { drawFugitive } from '../characters/fugitive.js';
import { Player } from '../entities/player.js';

/**
 * Dibuja el icono en un canvas cuadrado de lado `size`.
 * maskable = true deja más margen (zona segura del 80% para Android).
 */
export function drawAppIcon(ctx, size, { maskable = false, rounded = false } = {}) {
  const s = size / 512;
  ctx.save();
  ctx.scale(s, s);
  if (rounded) {
    ctx.beginPath();
    ctx.roundRect(0, 0, 512, 512, 110);
    ctx.clip();
  }
  // cielo de atardecer
  const sky = ctx.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, '#3a1d6e');
  sky.addColorStop(0.45, '#c9416f');
  sky.addColorStop(0.75, '#ff8a3d');
  sky.addColorStop(1, '#ffcf5a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 512, 512);
  // sol con franjas
  const sun = ctx.createLinearGradient(0, 230, 0, 470);
  sun.addColorStop(0, '#fff3a8');
  sun.addColorStop(1, '#ff9d3d');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(256, 360, 150, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#ff8a3d';
  for (let k = 0; k < 4; k++) ctx.fillRect(100, 300 + k * 18, 312, 4 + k * 2);
  // mar
  ctx.fillStyle = '#2b2a78';
  ctx.fillRect(0, 380, 512, 132);
  ctx.fillStyle = 'rgba(255, 220, 150, 0.55)';
  for (let k = 0; k < 5; k++) ctx.fillRect(150 + (k % 2) * 40, 400 + k * 20, 212 - (k % 2) * 80, 5);
  // palmera
  ctx.strokeStyle = '#1b1030';
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(470, 512);
  ctx.quadraticCurveTo(485, 400, 452, 300);
  ctx.stroke();
  ctx.fillStyle = '#1b1030';
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI * 0.95 + k * 0.42;
    ctx.save();
    ctx.translate(452, 300);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(55, 0, 60, 13, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // billetes al viento
  for (const [bx, by, r] of [[96, 120, -0.4], [150, 70, 0.3], [70, 230, 0.2]]) {
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(r);
    ctx.fillStyle = '#1b1030';
    ctx.fillRect(-26, -15, 52, 30);
    ctx.fillStyle = '#5fcf7a';
    ctx.fillRect(-22, -11, 44, 22);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // protagonista volando con el jetpack
  const p = new Player();
  p.thrust = 1;
  p.vy = -300;
  p.onGround = false;
  p.pose = { run: 0, fly: 1, fall: 0 };
  const k = maskable ? 3.0 : 3.7;
  ctx.save();
  ctx.translate(232, maskable ? 236 : 222);
  ctx.scale(k, k);
  ctx.rotate(-0.12);
  drawFugitive(ctx, p, 0.35, 'base');
  ctx.restore();
  ctx.restore();
}

