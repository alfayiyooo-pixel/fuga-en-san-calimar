// El atracador anónimo del jetpack básico:
// pasamontañas morado con pompón, chándal turquesa, pañuelo rojo
// que ondea al viento y jetpack de dos bombonas.

import { INK, limb, rr, inked, vgrad, hgrad, shoe, hand, flame } from './kit.js';

const C = {
  jacket: '#22c3b0',
  jacketLight: '#6ff0de',
  jacketDark: '#128a7d',
  pants: '#2c3d6e',
  pantsShade: 'rgba(10, 15, 40, 0.45)',
  mask: '#3c2f63',
  maskLight: '#5a4a8c',
  skin: '#f2c38b',
  scarf: '#ff3d4f',
  scarfDark: '#c21f35',
};

const lerp = (a, b, k) => a + (b - a) * k;

/**
 * Calcula la pose mezclando correr / volar / caer según p.pose.
 * Ángulos: 0 = abajo, + = hacia delante, π = arriba.
 */
function pose(p, t) {
  const { run, fly, fall } = p.pose;
  const ph = p.anim;
  // correr
  const rA = Math.sin(ph) * 0.95;
  const rB = Math.sin(ph + Math.PI) * 0.95;
  const bendA = 0.15 + Math.max(0, -Math.cos(ph)) * 1.25;
  const bendB = 0.15 + Math.max(0, Math.cos(ph)) * 1.25;
  // volar (piernas atrás, un puño adelante)
  const fw = Math.sin(t * 9) * 0.08;
  // caer (brazos arriba agitándose, piernas en bicicleta)
  const fl = Math.sin(t * 16);
  const legs = {
    a1: lerp(lerp(rA, -0.3 + fw, fly), 0.5 + fl * 0.25, fall),
    a2: lerp(lerp(rA - bendA, -0.95 + fw, fly), 0.1 + fl * 0.3, fall),
    b1: lerp(lerp(rB, -0.05 - fw, fly), 0.2 - fl * 0.25, fall),
    b2: lerp(lerp(rB - bendB, -0.6 - fw, fly), -0.2 - fl * 0.3, fall),
  };
  const arms = {
    // brazo de delante
    f1: lerp(lerp(-rA * 0.8, 1.45, fly), 2.6 + fl * 0.35, fall),
    f2: lerp(lerp(-rA * 0.8 + 1.3, 1.55, fly), 3.0 + fl * 0.5, fall),
    // brazo de detrás (agarra la correa al volar)
    b1: lerp(lerp(rA * 0.8, 0.5, fly), 2.9 - fl * 0.35, fall),
    b2: lerp(lerp(rA * 0.8 + 1.3, 2.2, fly), 3.3 - fl * 0.5, fall),
  };
  return { legs, arms, lean: lerp(lerp(0.12, 0.2, fly), -0.12, fall), bob: run * Math.abs(Math.sin(ph)) * -2.2 };
}

export function drawRobber(ctx, p, t) {
  const P = pose(p, t);
  const hipX = -1;
  const hipY = 4 + P.bob;
  const shX = 2;
  const shY = -12 + P.bob;

  // ---- miembros de detrás ----
  const [bhx, bhy] = limb(ctx, shX - 2, shY + 1, P.arms.b1, P.arms.b2, 8, 8, 5.5, C.jacketDark);
  hand(ctx, bhx, bhy, '#2a2238');
  const [bfx, bfy] = limb(ctx, hipX - 2, hipY, P.legs.b1, P.legs.b2, 11, 11, 7, '#22305a', P.pantsShade);
  shoe(ctx, bfx, bfy, P.legs.b2, '#d8cfc0', '#b02035');

  // ---- jetpack (dos bombonas) ----
  ctx.save();
  ctx.rotate(P.lean * 0.5);
  flame(ctx, -16, 19 + P.bob, p.thrust, t);
  for (const [ox, dark] of [[-4, true], [0, false]]) {
    rr(ctx, -24 + ox, -20 + P.bob, 13, 36, 6);
    inked(ctx, dark ? '#6d7487' : hgrad(ctx, -24, -11, [[0, '#8e97ab'], [0.4, '#f1f4fa'], [1, '#7d859a']]));
  }
  ctx.fillStyle = '#ff3d4f';
  ctx.fillRect(-23.6, -7 + P.bob, 12.2, 5);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(-21, -17 + P.bob, 2.5, 9);
  // boquilla
  ctx.beginPath();
  ctx.moveTo(-21, 15 + P.bob);
  ctx.lineTo(-11, 15 + P.bob);
  ctx.lineTo(-13, 20 + P.bob);
  ctx.lineTo(-19, 20 + P.bob);
  ctx.closePath();
  inked(ctx, '#3a3150');
  ctx.restore();

  // ---- torso ----
  ctx.save();
  ctx.translate(0, P.bob);
  ctx.rotate(P.lean);
  rr(ctx, -10, -17, 20, 24, 7);
  inked(ctx, vgrad(ctx, -17, 7, C.jacketLight, C.jacketDark));
  // sombra lateral y cremallera
  ctx.fillStyle = 'rgba(0, 40, 50, 0.25)';
  ctx.fillRect(-10, -14, 5, 19);
  ctx.fillStyle = '#fff4dc';
  ctx.fillRect(1, -16, 1.8, 21);
  // franjas del chándal
  ctx.fillStyle = '#fff4dc';
  ctx.fillRect(-9.5, -2, 19, 2.2);
  // correa del jetpack cruzada
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-9, -15);
  ctx.lineTo(8, 4);
  ctx.stroke();
  ctx.strokeStyle = '#5a4a3a';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // cinturón
  ctx.fillStyle = INK;
  ctx.fillRect(-10, 3, 20, 4);
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(2, 3.8, 4, 2.4);
  ctx.restore();

  // ---- pierna de delante ----
  const [ffx, ffy] = limb(ctx, hipX + 2, hipY, P.legs.a1, P.legs.a2, 11, 11, 7, C.pants, P.pantsShade);
  shoe(ctx, ffx, ffy, P.legs.a2);

  // ---- pañuelo al viento ----
  const sp = 1 + Math.min(1, Math.abs(p.vy) / 600);
  const pts = [];
  for (let i = 0; i <= 4; i++) {
    const wave = Math.sin(t * 15 - i * 1.1) * (1 + i * 0.9);
    pts.push([-4 - i * 6.5 * sp, -17 + P.bob + wave - (p.vy / 900) * i * 3]);
  }
  ctx.beginPath();
  ctx.moveTo(4, -19 + P.bob);
  pts.forEach(([x, y], i) => ctx.lineTo(x, y - (4 - i) * 0.7));
  for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1] + 4.5 - i * 0.8);
  ctx.lineTo(4, -13 + P.bob);
  ctx.closePath();
  inked(ctx, vgrad(ctx, -20, -10, C.scarf, C.scarfDark));

  // ---- cabeza ----
  ctx.save();
  ctx.translate(3, -26 + P.bob);
  ctx.rotate(P.lean * 0.6);
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  const hg = ctx.createRadialGradient(-3, -4, 1, 0, 0, 12);
  hg.addColorStop(0, C.maskLight);
  hg.addColorStop(1, C.mask);
  inked(ctx, hg);
  // costura
  ctx.strokeStyle = 'rgba(20, 10, 40, 0.5)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(-1, 0, 11, -2.2, -1.2);
  ctx.stroke();
  // abertura de los ojos
  rr(ctx, -1, -5, 13, 7.5, 3.5);
  inked(ctx, C.skin);
  // ojos (miran hacia delante; parpadean)
  const blink = Math.sin(t * 0.9) > 0.985;
  ctx.fillStyle = '#fff';
  if (!blink) {
    ctx.fillRect(2, -3.6, 3.6, 4.2);
    ctx.fillRect(7.4, -3.6, 3.6, 4.2);
    ctx.fillStyle = INK;
    const look = p.pose.fall > 0.5 ? -1 : 0;
    ctx.fillRect(3.6, -2.8 + look, 2, 2.6);
    ctx.fillRect(9, -2.8 + look, 2, 2.6);
  } else {
    ctx.fillStyle = INK;
    ctx.fillRect(2, -1.5, 9, 1.4);
  }
  // cejas (fruncidas al volar)
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  const frown = p.pose.fly * 1.4;
  ctx.beginPath();
  ctx.moveTo(1.5, -6 - frown * 0.3);
  ctx.lineTo(5.5, -5.2 + frown * 0.5);
  ctx.moveTo(7.2, -5.2 + frown * 0.5);
  ctx.lineTo(11.2, -6 - frown * 0.3);
  ctx.stroke();
  // pompón
  ctx.beginPath();
  ctx.arc(-3, -12, 4.2, 0, Math.PI * 2);
  inked(ctx, '#ff5d73');
  ctx.restore();

  // ---- brazo de delante ----
  const [fhx, fhy] = limb(ctx, shX + 2, shY + 1, P.arms.f1, P.arms.f2, 8, 8, 5.5, C.jacket, 'rgba(0, 60, 60, 0.35)');
  hand(ctx, fhx, fhy, '#2a2238');
}
