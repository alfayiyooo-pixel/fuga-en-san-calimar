// DISFRACES (capas extra sobre el traje): look.costume = id
// Se dibujan en tres momentos: detrás del cuerpo (capas, cajas), encima
// del torso (riñonera, cinturón…) y encima de la cabeza (sombreros, cascos,
// máscaras). Todos originales.

import { INK, rr, inked, vgrad } from './kit.js';
import { drawGlow } from '../fx/sprites.js';

/** Disfraces que tapan la cabeza: no se dibuja el accesorio encima. */
export const HIDES_ACC = new Set(['astro', 'pumpkin', 'luchador', 'mascot', 'granny', 'magician', 'ringmaster', 'pizza', 'aviator', 'tourist', 'rally', 'opera']);

/** Detrás del cuerpo (origen = centro del jugador). */
export function drawCostumeBack(ctx, c, t, bob = 0) {
  switch (c) {
    case 'magician':
    case 'luchador':
    case 'opera': {
      // capa al viento
      const wave = Math.sin(t * 9) * 3;
      ctx.beginPath();
      ctx.moveTo(-6, -16 + bob);
      ctx.quadraticCurveTo(-22, -6 + wave, -26, 14 + wave);
      ctx.lineTo(-14, 10 + wave * 0.5);
      ctx.quadraticCurveTo(-8, 0, 4, -15 + bob);
      ctx.closePath();
      const col = c === 'magician' ? ['#4b2a8a', '#2a1550'] : c === 'luchador' ? ['#ffd23f', '#c48a12'] : ['#1b1420', '#0e0a12'];
      inked(ctx, vgrad(ctx, -16, 14, col[0], col[1]));
      if (c === 'opera') {
        ctx.fillStyle = '#b8202f';
        ctx.beginPath();
        ctx.moveTo(-8, -12 + bob);
        ctx.quadraticCurveTo(-18, -2 + wave, -20, 10 + wave);
        ctx.lineTo(-15, 8 + wave * 0.5);
        ctx.closePath();
        ctx.fill();
      }
      if (c === 'magician') {
        ctx.fillStyle = '#ffd23f';
        for (let k = 0; k < 3; k++) star(ctx, -16 + k * 3, -4 + k * 6 + wave * 0.5, 2.2);
      }
      break;
    }
    case 'pizza': {
      // cajas de pizza a la espalda
      for (let k = 0; k < 3; k++) {
        rr(ctx, -27, -14 + k * 7 + bob, 16, 6, 1);
        inked(ctx, k % 2 ? '#e8d2a8' : '#f4e2bc');
      }
      ctx.fillStyle = '#d13038';
      ctx.fillRect(-23, -12 + bob, 8, 2);
      break;
    }
    case 'aviator':
      break;
  }
}

/** Encima del torso. */
export function drawCostumeTorso(ctx, c, t) {
  switch (c) {
    case 'tourist': {
      // flores hawaianas y riñonera
      ctx.save();
      rr(ctx, -10, -17, 20, 24, 7);
      ctx.clip();
      for (const [x, y, col] of [[-5, -12, '#ff5d73'], [4, -7, '#ffd23f'], [-3, -1, '#ff9a3d'], [6, 2, '#ff5d73']]) {
        ctx.fillStyle = col;
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * 1.8, y + Math.sin(a) * 1.8, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      rr(ctx, -6, 2, 14, 7, 3);
      inked(ctx, '#3a8bff');
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(0, 4, 3, 2);
      // cámara colgada
      rr(ctx, 4, -10, 7, 5, 1.5);
      inked(ctx, '#2a2238');
      break;
    }
    case 'granny':
      // collar de perlas y botones de rebeca
      ctx.fillStyle = '#fffaf0';
      for (let k = 0; k < 7; k++) {
        ctx.beginPath();
        ctx.arc(-6 + k * 2.2, -15 + Math.sin((k / 6) * Math.PI) * 3, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffd23f';
      for (let k = 0; k < 3; k++) ctx.fillRect(1, -8 + k * 5, 2, 2);
      break;
    case 'astro':
      // panel de control en el pecho
      rr(ctx, -4, -10, 10, 7, 2);
      inked(ctx, '#c9ccd6');
      ctx.fillStyle = Math.floor(t * 4) % 2 ? '#ff3d4f' : '#19e3d0';
      ctx.fillRect(-2, -8, 2, 2);
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(2, -8, 2, 2);
      ctx.fillStyle = '#3a8bff';
      ctx.fillRect(-2, -5, 6, 1.5);
      break;
    case 'pumpkin':
      // gajos de calabaza
      ctx.strokeStyle = 'rgba(120, 50, 0, 0.5)';
      ctx.lineWidth = 1.5;
      for (const x of [-4, 1, 6]) {
        ctx.beginPath();
        ctx.moveTo(x, -16);
        ctx.quadraticCurveTo(x - 2, -5, x, 6);
        ctx.stroke();
      }
      break;
    case 'luchador':
      // cinturón de campeón
      rr(ctx, -10, 0, 20, 6, 2);
      inked(ctx, '#ffd23f');
      ctx.beginPath();
      ctx.arc(1, 3, 3.5, 0, Math.PI * 2);
      inked(ctx, '#fff6c2');
      break;
    case 'pizza':
      ctx.fillStyle = '#fff4dc';
      ctx.beginPath();
      ctx.arc(1, -7, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffb627';
      ctx.beginPath();
      ctx.moveTo(1, -7);
      ctx.arc(1, -7, 3.2, -0.6, 0.6);
      ctx.closePath();
      ctx.fill();
      break;
    case 'aviator':
      // cuello de borrego
      rr(ctx, -9, -19, 18, 6, 3);
      inked(ctx, '#f0e6c8');
      break;
    case 'rally':
      ctx.fillStyle = '#fff4dc';
      rr(ctx, -6, -12, 9, 8, 1.5);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.font = "800 6px 'Rubik', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText('7', -1.5, -6);
      break;
    case 'ringmaster':
      ctx.fillStyle = '#ffd23f';
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.arc(0, -13 + k * 5, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-9, -15);
      ctx.lineTo(-3, -3);
      ctx.moveTo(9, -15);
      ctx.lineTo(4, -3);
      ctx.stroke();
      // lentejuelas
      if (Math.floor(t * 6) % 2) {
        ctx.fillStyle = '#fff6c2';
        ctx.fillRect(-6, -9, 1.5, 1.5);
        ctx.fillRect(5, -4, 1.5, 1.5);
      }
      break;
    case 'mascot':
      // plumas
      ctx.fillStyle = '#ffe27a';
      for (let k = 0; k < 6; k++) {
        ctx.beginPath();
        ctx.ellipse(-6 + (k % 3) * 6, -12 + Math.floor(k / 3) * 9, 3, 4.5, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
  }
}

/** Encima de la cabeza (origen = centro de la cabeza, mirando a la derecha). */
export function drawCostumeHead(ctx, c, t) {
  switch (c) {
    case 'tourist':
      // gafas de sol y sombrero de paja
      ctx.fillStyle = INK;
      rr(ctx, 2, -3, 11, 4, 1.5);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(1, -9, 15, 3.2, -0.08, 0, Math.PI * 2);
      inked(ctx, '#e8c770');
      ctx.beginPath();
      ctx.arc(1, -10, 8, Math.PI, 0);
      ctx.closePath();
      inked(ctx, '#f0d688');
      ctx.fillStyle = '#ff5d73';
      ctx.fillRect(-7, -12, 16, 2);
      break;
    case 'granny':
      // peluca gris con moño y gafas redondas
      ctx.beginPath();
      ctx.arc(0, -3, 11.5, Math.PI * 0.85, Math.PI * 2.1);
      inked(ctx, '#d6d6e0');
      ctx.beginPath();
      ctx.arc(-6, -13, 5, 0, Math.PI * 2);
      inked(ctx, '#c4c4d0');
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(9, -1, 3.2, 0, Math.PI * 2);
      ctx.moveTo(5, -1);
      ctx.arc(3.5, -1, 1.5, 0, Math.PI);
      ctx.stroke();
      break;
    case 'mascot':
      // cabeza de pollo con cresta y pico
      ctx.beginPath();
      ctx.arc(1, -1, 12.5, 0, Math.PI * 2);
      inked(ctx, '#ffd23f');
      ctx.beginPath();
      ctx.moveTo(-4, -12);
      ctx.quadraticCurveTo(-2, -20, 1, -13);
      ctx.quadraticCurveTo(3, -20, 5, -12);
      ctx.quadraticCurveTo(7, -19, 9, -10);
      ctx.closePath();
      inked(ctx, '#ff3d4f');
      ctx.beginPath();
      ctx.moveTo(11, -1);
      ctx.lineTo(19, 1);
      ctx.lineTo(11, 4);
      ctx.closePath();
      inked(ctx, '#ff9a3d');
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(6, -4, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'magician':
    case 'ringmaster': {
      // chistera
      const col = c === 'magician' ? ['#1f1d2b', '#4b2a8a'] : ['#b8202f', '#ffd23f'];
      ctx.beginPath();
      ctx.ellipse(1, -9, 13, 3, -0.1, 0, Math.PI * 2);
      inked(ctx, col[0]);
      rr(ctx, -6, -25, 14, 16, 2);
      inked(ctx, col[0]);
      ctx.fillStyle = col[1];
      ctx.fillRect(-6, -13, 14, 3);
      if (c === 'magician') {
        ctx.fillStyle = '#ffd23f';
        star(ctx, 1, -19, 2.5);
      } else {
        // bigote engominado
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(4, 4);
        ctx.quadraticCurveTo(9, 2, 13, 5);
        ctx.quadraticCurveTo(15, 2, 13, 0);
        ctx.stroke();
      }
      break;
    }
    case 'opera':
      // media máscara blanca
      ctx.beginPath();
      ctx.moveTo(2, -9);
      ctx.quadraticCurveTo(13, -9, 12, 2);
      ctx.quadraticCurveTo(7, 6, 2, 2);
      ctx.closePath();
      inked(ctx, '#f8f4ee');
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.ellipse(8, -3, 2, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'astro': {
      // escafandra de cristal con antena
      drawGlow(ctx, 1, -1, 18, 'rgba(160, 230, 255, 0.8)', 0.3);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(1, -1, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(180, 230, 255, 0.28)';
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.ellipse(6, -8, 4, 2, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-6, -12);
      ctx.lineTo(-9, -21);
      ctx.stroke();
      ctx.fillStyle = Math.floor(t * 3) % 2 ? '#ff3d4f' : '#ffd23f';
      ctx.beginPath();
      ctx.arc(-9, -22, 2.2, 0, Math.PI * 2);
      ctx.fill();
      rr(ctx, -11, 11, 24, 4, 2);
      inked(ctx, '#c9ccd6');
      break;
    }
    case 'pizza':
      // gorra de repartidora
      ctx.beginPath();
      ctx.arc(1, -4, 11, Math.PI, 0);
      ctx.closePath();
      inked(ctx, '#d13038');
      rr(ctx, 6, -6, 12, 3.5, 1.5);
      inked(ctx, '#a81e26');
      ctx.fillStyle = '#fff4dc';
      ctx.font = "800 5px 'Rubik', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText('PIZZA', 0, -8);
      break;
    case 'aviator':
    case 'rally': {
      // gorro de cuero / pañuelo y gafas
      ctx.beginPath();
      ctx.arc(0, -2, 11.5, Math.PI * 0.9, Math.PI * 2.05);
      inked(ctx, c === 'aviator' ? '#7a4a28' : '#ff9a3d');
      ctx.fillStyle = c === 'aviator' ? '#5a3418' : '#c46a1a';
      ctx.fillRect(-11, -1, 5, 9);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, -8);
      ctx.lineTo(12, -7);
      ctx.stroke();
      for (const gx of [3, 10]) {
        ctx.beginPath();
        ctx.arc(gx, -7, 3.6, 0, Math.PI * 2);
        inked(ctx, c === 'aviator' ? 'rgba(160, 230, 255, 0.9)' : 'rgba(255, 210, 63, 0.9)');
      }
      break;
    }
    case 'pumpkin':
      // cabeza de calabaza tallada
      ctx.beginPath();
      ctx.ellipse(1, -1, 14, 12.5, 0, 0, Math.PI * 2);
      inked(ctx, vgrad(ctx, -13, 12, '#ffb24a', '#e0701a'));
      ctx.strokeStyle = 'rgba(140, 60, 0, 0.5)';
      ctx.lineWidth = 1.5;
      for (const x of [-5, 1, 7]) {
        ctx.beginPath();
        ctx.moveTo(x, -12);
        ctx.quadraticCurveTo(x - 3, -1, x, 11);
        ctx.stroke();
      }
      rr(ctx, -1, -18, 4, 7, 1.5);
      inked(ctx, '#4f7a2a');
      ctx.fillStyle = '#2a1408';
      ctx.beginPath();
      ctx.moveTo(4, -5);
      ctx.lineTo(7, -1);
      ctx.lineTo(1, -1);
      ctx.closePath();
      ctx.moveTo(10, -5);
      ctx.lineTo(13, -1);
      ctx.lineTo(8, -1);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(1, 4);
      for (let k = 0; k <= 6; k++) ctx.lineTo(1 + k * 2, 4 + (k % 2 ? 3 : 0));
      ctx.lineTo(13, 6);
      ctx.quadraticCurveTo(7, 9, 1, 6);
      ctx.closePath();
      ctx.fill();
      drawGlow(ctx, 8, 2, 10, 'rgba(255, 190, 60, 0.9)', 0.4 + 0.2 * Math.sin(t * 9));
      break;
    case 'luchador': {
      // máscara de lucha libre con llamas
      ctx.beginPath();
      ctx.arc(1, -1, 12, 0, Math.PI * 2);
      inked(ctx, '#2a6af0');
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.moveTo(-8, -6);
      ctx.quadraticCurveTo(-2, -16, 2, -9);
      ctx.quadraticCurveTo(5, -18, 8, -8);
      ctx.quadraticCurveTo(11, -14, 12, -4);
      ctx.lineTo(-8, -4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      for (const ex of [5, 11]) {
        ctx.beginPath();
        ctx.ellipse(ex, -1, 2.6, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff3d4f';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(5.6, -1, 1, 0, Math.PI * 2);
      ctx.arc(11.6, -1, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff3d4f';
      ctx.fillRect(4, 5, 8, 2);
      break;
    }
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
