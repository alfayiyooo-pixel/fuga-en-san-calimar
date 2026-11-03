// Vehículos de los personajes: el deportivo "Rayo" de Vera, la moto
// "Jabalina" de Bruno y la rampa del gadget de Vera.

import { INK, rr, inked, vgrad, flame } from './kit.js';
import { drawHead } from './fugitive.js';
import { drawGlow } from '../fx/sprites.js';

/** Deportivo morado con llamas cian. Origen: centro del jugador; ruedas en y=+25. */
export function drawCar(ctx, p, t, boost = false) {
  const wheelY = 21;
  const spin = p.x * 0.08;
  // estela de velocidad
  ctx.strokeStyle = 'rgba(25, 227, 208, 0.55)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const y = -4 + i * 7;
    const len = 30 + ((t * 300 + i * 37) % 40);
    ctx.beginPath();
    ctx.moveTo(-48 - len, y);
    ctx.lineTo(-48, y);
    ctx.stroke();
  }
  if (boost) flame(ctx, -50, 10, 1, t, 0.9, 'cyan');
  // carrocería
  ctx.beginPath();
  ctx.moveTo(-50, 16);
  ctx.lineTo(-50, 4);
  ctx.quadraticCurveTo(-44, -2, -30, -3);
  ctx.lineTo(-16, -15);
  ctx.quadraticCurveTo(0, -20, 14, -12);
  ctx.lineTo(30, -4);
  ctx.quadraticCurveTo(52, -2, 56, 8);
  ctx.lineTo(56, 16);
  ctx.closePath();
  inked(ctx, vgrad(ctx, -18, 16, '#a07bff', '#4a2ea8'));
  // llamas cian
  ctx.fillStyle = '#19e3d0';
  ctx.beginPath();
  ctx.moveTo(-46, 8);
  for (let k = 0; k < 5; k++) {
    ctx.quadraticCurveTo(-36 + k * 12, 2 - (k % 2) * 4, -30 + k * 12, 8);
  }
  ctx.lineTo(24, 12);
  ctx.lineTo(-46, 12);
  ctx.fill();
  // ventanilla con Vera
  ctx.beginPath();
  ctx.moveTo(-12, -4);
  ctx.lineTo(-10, -13);
  ctx.quadraticCurveTo(2, -17, 12, -10);
  ctx.lineTo(20, -4);
  ctx.closePath();
  inked(ctx, 'rgba(160, 240, 255, 0.85)');
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-12, -4);
  ctx.lineTo(-10, -13);
  ctx.quadraticCurveTo(2, -17, 12, -10);
  ctx.lineTo(20, -4);
  ctx.closePath();
  ctx.clip();
  ctx.translate(2, -4);
  ctx.scale(0.62, 0.62);
  drawHead(ctx, 'braid', t, 1);
  ctx.restore();
  // faro y piloto
  ctx.fillStyle = '#fff6c2';
  ctx.fillRect(50, 4, 6, 4);
  drawGlow(ctx, 58, 6, 18, 'rgba(255, 250, 220, 0.9)', 0.8);
  ctx.fillStyle = '#ff3d4f';
  ctx.fillRect(-50, 4, 4, 4);
  // ruedas
  for (const wx of [-30, 34]) wheel(ctx, wx, wheelY, 9.5, spin);
}

/** Moto de cross con Bruno encima (el muñeco se dibuja aparte, encima). */
export function drawBike(ctx, p, t) {
  const spin = p.x * 0.1;
  const wy = 20;
  // horquilla y chasis
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-22, wy);
  ctx.lineTo(-6, 4);
  ctx.lineTo(16, 4);
  ctx.lineTo(24, wy);
  ctx.moveTo(16, 4);
  ctx.lineTo(12, -10);
  ctx.stroke();
  ctx.strokeStyle = '#ff7a3d';
  ctx.lineWidth = 3;
  ctx.stroke();
  // depósito y asiento
  ctx.beginPath();
  ctx.moveTo(-14, 2);
  ctx.quadraticCurveTo(-4, -6, 14, -2);
  ctx.lineTo(14, 6);
  ctx.lineTo(-12, 6);
  ctx.closePath();
  inked(ctx, vgrad(ctx, -6, 6, '#ffb627', '#d4601a'));
  rr(ctx, -20, -2, 16, 5, 2);
  inked(ctx, '#2a2238');
  // manillar
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(8, -12);
  ctx.lineTo(16, -10);
  ctx.stroke();
  // tubo de escape humeante
  ctx.fillStyle = '#9aa3b5';
  ctx.fillRect(-26, 8, 14, 4);
  ctx.lineCap = 'butt';
  for (const wx of [-22, 24]) wheel(ctx, wx, wy, 10, spin, true);
}

function wheel(ctx, x, y, r, spin, knobby = false) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  inked(ctx, '#1b1420');
  if (knobby) {
    ctx.fillStyle = INK;
    for (let k = 0; k < 10; k++) {
      const a = spin + (k / 10) * Math.PI * 2;
      ctx.fillRect(x + Math.cos(a) * (r + 1) - 1.5, y + Math.sin(a) * (r + 1) - 1.5, 3, 3);
    }
  }
  ctx.fillStyle = '#c9ccd6';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6d7487';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const a = spin + (k / 3) * Math.PI * 2;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45);
  }
  ctx.stroke();
}

/** Rampa del gadget de Vera (en el suelo, en coordenadas de pantalla). */
export function drawRamp(ctx, x, groundY, t) {
  ctx.beginPath();
  ctx.moveTo(x - 60, groundY + 2);
  ctx.lineTo(x + 40, groundY - 46);
  ctx.lineTo(x + 46, groundY - 46);
  ctx.lineTo(x + 46, groundY + 2);
  ctx.closePath();
  inked(ctx, vgrad(ctx, groundY - 46, groundY, '#ffd23f', '#d48a1a'));
  ctx.fillStyle = INK;
  for (let k = 0; k < 4; k++) {
    const f = (k + 0.5) / 4;
    ctx.fillRect(x - 60 + f * 100 - 4, groundY + 2 - f * 48 - 1, 8, 3);
  }
  // flechas parpadeantes
  const on = Math.floor(t * 6) % 2 === 0;
  drawGlow(ctx, x - 5, groundY - 30, 40, 'rgba(255, 210, 63, 0.9)', on ? 0.6 : 0.25);
}

/** Patinete eléctrico robado (a pie). Origen: centro del jugador. */
export function drawScooterRide(ctx, p, t) {
  const spin = p.x * 0.12;
  rr(ctx, -20, 25, 40, 5, 2.5);
  inked(ctx, '#2a2238');
  ctx.fillStyle = '#19e3d0';
  ctx.fillRect(-18, 26, 36, 1.6);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(18, 27);
  ctx.lineTo(22, -8);
  ctx.lineTo(16, -9);
  ctx.moveTo(22, -8);
  ctx.lineTo(27, -7);
  ctx.stroke();
  for (const wx of [-16, 18]) wheel(ctx, wx, 32, 4.5, spin);
  drawGlow(ctx, 0, 30, 30, 'rgba(25, 227, 208, 0.8)', 0.35 + 0.15 * Math.sin(t * 10), 6);
}

/** Carrito de la compra (el muñeco va sentado dentro). Se dibuja delante. */
export function drawCart(ctx, p, t) {
  const spin = p.x * 0.12;
  ctx.save();
  ctx.translate(2, 6);
  // cesta de rejilla
  ctx.beginPath();
  ctx.moveTo(-22, -6);
  ctx.lineTo(24, -10);
  ctx.lineTo(18, 16);
  ctx.lineTo(-18, 16);
  ctx.closePath();
  ctx.fillStyle = 'rgba(200, 210, 230, 0.35)';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = '#c9ccd6';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let k = 1; k < 5; k++) {
    const x = -22 + k * 9.2;
    ctx.moveTo(x, -6 - k * 0.8);
    ctx.lineTo(x - (k - 2.5) * 0.6 + (x < 0 ? 1 : -1), 16);
  }
  ctx.moveTo(-21, 5);
  ctx.lineTo(21, 3);
  ctx.stroke();
  // asa roja
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-22, -6);
  ctx.lineTo(-30, -14);
  ctx.stroke();
  ctx.strokeStyle = '#ff3d4f';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // chasis y ruedas
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-16, 16);
  ctx.lineTo(-14, 22);
  ctx.moveTo(16, 16);
  ctx.lineTo(14, 22);
  ctx.stroke();
  for (const wx of [-14, 14]) wheel(ctx, wx, 24, 3.5, spin);
  // chispas de las ruedas
  ctx.restore();
}
