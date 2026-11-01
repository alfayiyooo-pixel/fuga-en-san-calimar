// Dibujo de los fugitivos: un mismo "muñeco" articulado (poses de correr,
// volar, caer y montar) con cuatro estilos intercambiables:
//   base    — atracador anónimo: pasamontañas, chándal, dos bombonas
//   veteran — Don Aurelio Vega "El Relojero": traje, bigote, gafas doradas, maletín-jetpack
//   pilot   — Vera "Chispa" Rivas: bomber naranja, trenza, gafas de aviador, jetpack morado
//   wild    — Bruno "Petardo" Tramuntana: camisa hawaiana, barba pelirroja, cohete casero

import { INK, limb, rr, inked, vgrad, hgrad, shoe, hand, flame } from './kit.js';
import { drawGlow } from '../fx/sprites.js';

export const STYLES = {
  base: {
    scale: 1,
    jacket: '#22c3b0', jacketLight: '#6ff0de', jacketDark: '#128a7d', arm: '#22c3b0', armBack: '#128a7d',
    pants: '#2c3d6e', pantsBack: '#22305a', shoe: '#fff4dc', sole: '#ff3d4f', glove: '#2a2238',
    torso: 'tracksuit', head: 'balaclava', pack: 'tanks', scarf: '#ff3d4f', flame: 'fire',
  },
  veteran: {
    scale: 0.98,
    jacket: '#5a6072', jacketLight: '#7c8398', jacketDark: '#3a3f50', arm: '#5a6072', armBack: '#3a3f50',
    pants: '#3a3f50', pantsBack: '#2c303e', shoe: '#1b1420', sole: '#1b1420', glove: '#f0d2a8',
    torso: 'suit', head: 'gent', pack: 'briefcase', scarf: null, flame: 'fire',
  },
  pilot: {
    scale: 0.95,
    jacket: '#ff8a2a', jacketLight: '#ffb86b', jacketDark: '#d4601a', arm: '#ff8a2a', armBack: '#d4601a',
    pants: '#2b2b3a', pantsBack: '#20202c', shoe: '#ffffff', sole: '#19e3d0', glove: '#2a2238',
    torso: 'bomber', head: 'braid', pack: 'sleek', scarf: null, flame: 'cyan',
  },
  wild: {
    scale: 1.14,
    jacket: '#1fb3a0', jacketLight: '#57dcc6', jacketDark: '#127d70', arm: '#e9b48a', armBack: '#c98f66',
    pants: '#56663e', pantsBack: '#45532f', shoe: '#6b4224', sole: '#3a2414', glove: '#e9b48a',
    torso: 'hawaiian', head: 'brute', pack: 'rocket', scarf: null, flame: 'rocket',
  },
};

const lerp = (a, b, k) => a + (b - a) * k;

/** Pose mezclada (correr / volar / caer) o fija al montar en moto. */
function pose(p, t) {
  if (p.riding) {
    const b = Math.sin(t * 20) * 0.04;
    return {
      legs: { a1: 1.25, a2: 0.15, b1: 1.05, b2: 0.0 },
      arms: { f1: 1.25 + b, f2: 1.55, b1: 1.15 + b, b2: 1.5 },
      lean: 0.28,
      bob: Math.abs(Math.sin(t * 20)) * -1.5,
    };
  }
  const { run, fly, fall } = p.pose;
  const ph = p.anim;
  const rA = Math.sin(ph) * 0.95;
  const rB = Math.sin(ph + Math.PI) * 0.95;
  const bendA = 0.15 + Math.max(0, -Math.cos(ph)) * 1.25;
  const bendB = 0.15 + Math.max(0, Math.cos(ph)) * 1.25;
  const fw = Math.sin(t * 9) * 0.08;
  const fl = Math.sin(t * 16);
  return {
    legs: {
      a1: lerp(lerp(rA, -0.3 + fw, fly), 0.5 + fl * 0.25, fall),
      a2: lerp(lerp(rA - bendA, -0.95 + fw, fly), 0.1 + fl * 0.3, fall),
      b1: lerp(lerp(rB, -0.05 - fw, fly), 0.2 - fl * 0.25, fall),
      b2: lerp(lerp(rB - bendB, -0.6 - fw, fly), -0.2 - fl * 0.3, fall),
    },
    arms: {
      f1: lerp(lerp(-rA * 0.8, 1.45, fly), 2.6 + fl * 0.35, fall),
      f2: lerp(lerp(-rA * 0.8 + 1.3, 1.55, fly), 3.0 + fl * 0.5, fall),
      b1: lerp(lerp(rA * 0.8, 0.5, fly), 2.9 - fl * 0.35, fall),
      b2: lerp(lerp(rA * 0.8 + 1.3, 2.2, fly), 3.3 - fl * 0.5, fall),
    },
    lean: lerp(lerp(0.12, 0.2, fly), -0.12, fall),
    bob: run * Math.abs(Math.sin(ph)) * -2.2,
  };
}

/**
 * Dibuja al fugitivo con el estilo indicado. p necesita: pose, anim, thrust,
 * vy y opcionalmente riding (moto) y vest (chaleco antibalas).
 */
export function drawFugitive(ctx, p, t, styleId = 'base', look = null) {
  const S = resolveStyle(styleId, look, t);
  const P = pose(p, t);
  ctx.save();
  ctx.scale(S.scale, S.scale);
  const hipX = -1;
  const hipY = 4 + P.bob;
  const shX = 2;
  const shY = -12 + P.bob;

  // ---- miembros de detrás ----
  const [bhx, bhy] = limb(ctx, shX - 2, shY + 1, P.arms.b1, P.arms.b2, 8, 8, 5.5, S.armBack);
  hand(ctx, bhx, bhy, S.glove);
  const [bfx, bfy] = limb(ctx, hipX - 2, hipY, P.legs.b1, P.legs.b2, 11, 11, 7, S.pantsBack, 'rgba(10, 15, 40, 0.4)');
  shoe(ctx, bfx, bfy, P.legs.b2, shade(S.shoe), S.sole);

  // ---- jetpack ----
  if (!p.riding) {
    ctx.save();
    ctx.rotate(P.lean * 0.5);
    drawPack(ctx, S, p, P, t);
    ctx.restore();
  }

  // ---- torso ----
  ctx.save();
  ctx.translate(0, P.bob);
  ctx.rotate(P.lean);
  drawTorso(ctx, S, t);
  if (p.vest) drawVest(ctx);
  ctx.restore();

  // ---- pierna de delante ----
  const [ffx, ffy] = limb(ctx, hipX + 2, hipY, P.legs.a1, P.legs.a2, 11, 11, 7, S.pants, 'rgba(10, 15, 40, 0.35)');
  shoe(ctx, ffx, ffy, P.legs.a2, S.shoe, S.sole);

  // ---- pañuelo / trenza al viento ----
  if (S.scarf) streamer(ctx, p, P, t, 4, -19, S.scarf, '#c21f35', 1);
  if (S.head === 'braid') streamer(ctx, p, P, t, -2, -30, '#3a2418', '#24150e', 0.8);

  // ---- cabeza ----
  ctx.save();
  ctx.translate(3, -26 + P.bob);
  ctx.rotate(P.lean * 0.6);
  drawHead(ctx, S.head, t, p.pose?.fly ?? 0, (p.pose?.fall ?? 0) > 0.5);
  if (S.acc) drawAccessory(ctx, S.acc, t);
  ctx.restore();

  // ---- brazo de delante ----
  const [fhx, fhy] = limb(ctx, shX + 2, shY + 1, P.arms.f1, P.arms.f2, 8, 8, 5.5, S.arm, 'rgba(0, 30, 40, 0.3)');
  hand(ctx, fhx, fhy, S.glove);
  if (p.aiming) drawPistol(ctx, fhx, fhy, P.arms.f2);
  ctx.restore();
}

function shade(c) {
  return c === '#fff4dc' ? '#d8cfc0' : c;
}

/** Tira que ondea al viento (pañuelo, trenza). */
function streamer(ctx, p, P, t, x0, y0, c1, c2, k) {
  const sp = 1 + Math.min(1, Math.abs(p.vy) / 600);
  const pts = [];
  for (let i = 0; i <= 4; i++) {
    const wave = Math.sin(t * 15 - i * 1.1) * (1 + i * 0.9) * k;
    pts.push([x0 - 8 - i * 6.5 * sp, y0 + 2 + P.bob + wave - (p.vy / 900) * i * 3]);
  }
  ctx.beginPath();
  ctx.moveTo(x0, y0 + P.bob);
  pts.forEach(([x, y], i) => ctx.lineTo(x, y - (4 - i) * 0.7 * k));
  for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1] + (4.5 - i * 0.8) * k);
  ctx.lineTo(x0, y0 + 6 * k + P.bob);
  ctx.closePath();
  inked(ctx, vgrad(ctx, y0 - 3, y0 + 7, c1, c2));
}

// ---------------- JETPACKS ----------------
function drawPack(ctx, S, p, P, t) {
  const b = P.bob;
  if (S.pack === 'tanks') {
    flame(ctx, -16, 19 + b, p.thrust, t, 1, S.flame);
    for (const [ox, dark] of [[-4, true], [0, false]]) {
      rr(ctx, -24 + ox, -20 + b, 13, 36, 6);
      inked(ctx, dark ? '#6d7487' : hgrad(ctx, -24, -11, [[0, '#8e97ab'], [0.4, '#f1f4fa'], [1, '#7d859a']]));
    }
    ctx.fillStyle = '#ff3d4f';
    ctx.fillRect(-23.6, -7 + b, 12.2, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(-21, -17 + b, 2.5, 9);
    nozzle(ctx, -16, 15 + b, '#3a3150');
  } else if (S.pack === 'briefcase') {
    // maletín de piel con dos toberas doradas
    flame(ctx, -20, 17 + b, p.thrust, t, 0.75, S.flame);
    flame(ctx, -10, 17 + b, p.thrust, t, 0.75, S.flame);
    rr(ctx, -27, -16 + b, 22, 30, 4);
    inked(ctx, vgrad(ctx, -16, 14, '#8a5a36', '#5a3820'));
    ctx.fillStyle = '#d9a53a';
    ctx.fillRect(-24, -4 + b, 4, 5);
    ctx.fillRect(-12, -4 + b, 4, 5);
    ctx.strokeStyle = '#3a2414';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-25, -14 + b, 18, 26);
    nozzle(ctx, -20, 13 + b, '#d9a53a', 6);
    nozzle(ctx, -10, 13 + b, '#d9a53a', 6);
    // cadena del reloj de bolsillo
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-6, -2 + b);
    ctx.quadraticCurveTo(2, 4 + b + Math.sin(t * 6) * 1.5, 7, -1 + b);
    ctx.stroke();
  } else if (S.pack === 'sleek') {
    // jetpack aerodinámico morado con línea de neón
    flame(ctx, -16, 18 + b, p.thrust, t, 1.05, S.flame);
    ctx.beginPath();
    ctx.moveTo(-12, -20 + b);
    ctx.quadraticCurveTo(-30, -14 + b, -26, 6 + b);
    ctx.lineTo(-20, 15 + b);
    ctx.lineTo(-11, 15 + b);
    ctx.closePath();
    inked(ctx, vgrad(ctx, -20, 15, '#a07bff', '#5b3ccc'));
    ctx.strokeStyle = '#19e3d0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-14, -16 + b);
    ctx.quadraticCurveTo(-25, -10 + b, -22, 8 + b);
    ctx.stroke();
    nozzle(ctx, -16, 14 + b, '#2a2150');
  } else if (S.pack === 'rocket') {
    // cohete casero con aletas y cinta americana
    flame(ctx, -18, 24 + b, p.thrust, t, 1.25, S.flame);
    ctx.beginPath();
    ctx.moveTo(-18, -32 + b);
    ctx.quadraticCurveTo(-8, -22 + b, -9, -10 + b);
    ctx.lineTo(-9, 18 + b);
    ctx.lineTo(-27, 18 + b);
    ctx.lineTo(-27, -10 + b);
    ctx.quadraticCurveTo(-28, -22 + b, -18, -32 + b);
    ctx.closePath();
    inked(ctx, hgrad(ctx, -27, -9, [[0, '#a8201e'], [0.45, '#ff5a3d'], [1, '#a8201e']]));
    ctx.fillStyle = '#c9c9c9';
    ctx.fillRect(-27, -2 + b, 18, 5);
    ctx.fillRect(-27, 9 + b, 18, 4);
    for (const fx of [-31, -7]) {
      ctx.beginPath();
      ctx.moveTo(fx + (fx < -18 ? 4 : -4), 8 + b);
      ctx.lineTo(fx, 22 + b);
      ctx.lineTo(fx + (fx < -18 ? 6 : -6), 18 + b);
      ctx.closePath();
      inked(ctx, '#ffd23f');
    }
    nozzle(ctx, -18, 18 + b, '#3a3150', 10);
  }
}

function nozzle(ctx, x, y, color, w = 10) {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x + w / 2 - 2, y + 5);
  ctx.lineTo(x - w / 2 + 2, y + 5);
  ctx.closePath();
  inked(ctx, color);
}

// ---------------- ESTILO + COSMÉTICOS ----------------
/** Mezcla el estilo base con el traje/accesorio equipados (y anima los legendarios). */
export function resolveStyle(styleId, look, t) {
  const S = { ...(STYLES[styleId] || STYLES.base) };
  if (!look) return S;
  for (const k of ['jacket', 'jacketLight', 'jacketDark', 'arm', 'armBack', 'pants', 'pantsBack', 'pattern', 'tie', 'stripe', 'anim']) {
    if (look[k] !== undefined) S[k] = look[k];
  }
  S.acc = look.acc ?? null;
  const h = (t * 70) % 360;
  if (S.anim === 'gold') {
    const k = 0.5 + 0.5 * Math.sin(t * 5);
    S.jacket = '#e8b52c';
    S.jacketLight = k > 0.5 ? '#fff6c2' : '#ffe27a';
    S.jacketDark = '#a87d14';
    S.arm = '#e8b52c';
    S.armBack = '#a87d14';
  } else if (S.anim === 'neon') {
    S.jacket = `hsl(${h}, 95%, 55%)`;
    S.jacketLight = `hsl(${(h + 40) % 360}, 100%, 72%)`;
    S.jacketDark = `hsl(${(h + 200) % 360}, 90%, 35%)`;
    S.arm = S.jacket;
    S.armBack = S.jacketDark;
  } else if (S.anim === 'lava') {
    S.jacket = '#3a1f1f';
    S.jacketLight = '#5a2a20';
    S.jacketDark = '#1f0e0e';
    S.arm = '#3a1f1f';
    S.armBack = '#1f0e0e';
  } else if (S.anim === 'holo') {
    S.jacket = `hsl(${h}, 70%, 70%)`;
    S.jacketLight = `hsl(${(h + 60) % 360}, 90%, 85%)`;
    S.jacketDark = `hsl(${(h + 180) % 360}, 60%, 45%)`;
    S.arm = S.jacket;
    S.armBack = S.jacketDark;
    S.pants = `hsl(${(h + 120) % 360}, 50%, 40%)`;
    S.pantsBack = `hsl(${(h + 120) % 360}, 50%, 30%)`;
  }
  return S;
}

// ---------------- TORSOS ----------------
function drawTorso(ctx, S, t) {
  if (S.anim === 'neon') drawGlow(ctx, 0, -5, 26, 'rgba(120, 255, 255, 0.9)', 0.35);
  rr(ctx, -10, -17, 20, 24, 7);
  inked(ctx, vgrad(ctx, -17, 7, S.jacketLight, S.jacketDark));
  ctx.fillStyle = 'rgba(0, 20, 40, 0.22)';
  ctx.fillRect(-10, -14, 5, 19);
  drawPattern(ctx, S, t);

  if (S.torso === 'tracksuit') {
    ctx.fillStyle = '#fff4dc';
    ctx.fillRect(1, -16, 1.8, 21);
    ctx.fillRect(-9.5, -2, 19, 2.2);
    strap(ctx);
    belt(ctx, '#ffd23f');
  } else if (S.torso === 'suit') {
    // camisa, corbata y solapas
    ctx.fillStyle = '#f4efe6';
    ctx.beginPath();
    ctx.moveTo(-2, -17);
    ctx.lineTo(6, -17);
    ctx.lineTo(2, -4);
    ctx.fill();
    ctx.fillStyle = '#b8202f';
    ctx.beginPath();
    ctx.moveTo(1, -15);
    ctx.lineTo(3.4, -15);
    ctx.lineTo(4, -4);
    ctx.lineTo(2.2, -1);
    ctx.lineTo(0.4, -4);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-3, -17);
    ctx.lineTo(1, -7);
    ctx.moveTo(7, -17);
    ctx.lineTo(3.5, -7);
    ctx.stroke();
    // pañuelo de bolsillo
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(-7, -10, 4, 2.5);
    belt(ctx, '#c9c9c9');
  } else if (S.torso === 'bomber') {
    // cuello y puños acanalados
    ctx.fillStyle = '#2b2b3a';
    rr(ctx, -9, -18, 18, 5, 2);
    ctx.fill();
    ctx.fillRect(-10, 3, 20, 4);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(-10, 4, 20, 1);
    ctx.fillStyle = '#d0d0d8';
    ctx.fillRect(1, -13, 1.6, 16);
    // parche con un rayo
    ctx.fillStyle = '#19e3d0';
    ctx.beginPath();
    ctx.moveTo(-6, -11);
    ctx.lineTo(-3, -11);
    ctx.lineTo(-5, -7);
    ctx.lineTo(-2.5, -7);
    ctx.lineTo(-7, -1);
    ctx.lineTo(-5.5, -5.5);
    ctx.lineTo(-8, -5.5);
    ctx.closePath();
    ctx.fill();
  } else if (S.torso === 'hawaiian') {
    // camiseta blanca bajo la camisa abierta con flores
    ctx.fillStyle = '#f4f1ea';
    ctx.fillRect(-2, -16, 8, 20);
    ctx.fillStyle = '#ff5d73';
    for (const [fx, fy] of [[-7, -12], [-6, -3], [7, -10], [8, 0]]) {
      ctx.beginPath();
      ctx.arc(fx, fy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd23f';
    for (const [fx, fy] of [[-7, -12], [-6, -3], [7, -10], [8, 0]]) ctx.fillRect(fx - 0.7, fy - 0.7, 1.4, 1.4);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-2, -17);
    ctx.lineTo(-2, 6);
    ctx.moveTo(6, -17);
    ctx.lineTo(6, 6);
    ctx.stroke();
    belt(ctx, '#8a5a34');
  }
}

/** Estampados y detalles de los trajes de la tienda. */
function drawPattern(ctx, S, t) {
  ctx.save();
  rr(ctx, -10, -17, 20, 24, 7);
  ctx.clip();
  switch (S.pattern) {
    case 'stripes':
      ctx.fillStyle = '#2a2238';
      for (let y = -15; y < 8; y += 6) ctx.fillRect(-10, y, 20, 3);
      break;
    case 'checker':
      for (let i = 0; i < 5; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2) {
        ctx.fillStyle = '#1b1030';
        ctx.fillRect(-10 + i * 4, -17 + j * 4, 4, 4);
      }
      break;
    case 'patches':
      ctx.fillStyle = '#ff5d73';
      ctx.fillRect(-7, -12, 5, 5);
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(5, -3, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'studs':
      ctx.fillStyle = '#d9dbe3';
      for (let k = 0; k < 6; k++) ctx.fillRect(-8 + (k % 3) * 7, -14 + Math.floor(k / 3) * 8, 2, 2);
      break;
    case 'spikes':
      ctx.fillStyle = '#ff9a3d';
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(-10, -14 + k * 6);
        ctx.lineTo(-14, -11 + k * 6);
        ctx.lineTo(-10, -8 + k * 6);
        ctx.fill();
      }
      break;
    case 'rivets':
      ctx.strokeStyle = '#5a5f6c';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-8, -14, 16, 8);
      ctx.strokeRect(-8, -4, 16, 8);
      ctx.fillStyle = '#e6ebf5';
      for (const [x, y] of [[-6, -12], [6, -12], [-6, -2], [6, -2]]) ctx.fillRect(x - 1, y - 1, 2, 2);
      break;
    case 'belt':
      ctx.fillStyle = '#6b4224';
      ctx.fillRect(-10, -1, 20, 3);
      break;
  }
  if (S.anim === 'lava') {
    // grietas de lava que laten
    const a = 0.6 + 0.4 * Math.sin(t * 6);
    ctx.strokeStyle = `rgba(255, ${120 + 60 * a}, 40, ${a})`;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-8, -15);
    ctx.lineTo(-3, -8);
    ctx.lineTo(-6, -2);
    ctx.lineTo(2, 4);
    ctx.moveTo(6, -14);
    ctx.lineTo(3, -6);
    ctx.lineTo(8, 0);
    ctx.stroke();
  }
  if (S.anim === 'gold') {
    // destello que recorre el traje
    const x = -14 + ((t * 30) % 40);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.moveTo(x, -17);
    ctx.lineTo(x + 4, -17);
    ctx.lineTo(x - 6, 7);
    ctx.lineTo(x - 10, 7);
    ctx.fill();
  }
  ctx.restore();
  if (S.tie === 'bow') {
    ctx.fillStyle = '#b8202f';
    ctx.beginPath();
    ctx.moveTo(2, -15);
    ctx.lineTo(-2, -17);
    ctx.lineTo(-2, -13);
    ctx.closePath();
    ctx.moveTo(2, -15);
    ctx.lineTo(6, -17);
    ctx.lineTo(6, -13);
    ctx.closePath();
    ctx.fill();
  }
}

// ---------------- ACCESORIOS ----------------
/** Accesorio sobre la cabeza (origen = centro de la cabeza). */
export function drawAccessory(ctx, acc, t) {
  switch (acc) {
    case 'bowler':
      ctx.beginPath();
      ctx.ellipse(1, -9, 14, 3, -0.1, 0, Math.PI * 2);
      inked(ctx, '#1f1d2b');
      ctx.beginPath();
      ctx.arc(1, -10, 8.5, Math.PI, 0);
      ctx.closePath();
      inked(ctx, '#2a2838');
      ctx.fillStyle = '#b8202f';
      ctx.fillRect(-7, -12, 16, 2);
      break;
    case 'monocle':
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(9.2, -1, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(9.2, 3);
      ctx.quadraticCurveTo(8, 10, 2, 13);
      ctx.stroke();
      ctx.fillStyle = 'rgba(200, 240, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(9.2, -1, 3.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'bigwatch': {
      // reloj de bolsillo gigante flotando detrás de la cabeza
      const by = -22 + Math.sin(t * 2.5) * 2;
      drawGlow(ctx, -14, by, 20, 'rgba(255, 210, 63, 0.9)', 0.5);
      ctx.beginPath();
      ctx.arc(-14, by, 9, 0, Math.PI * 2);
      inked(ctx, '#ffd23f');
      ctx.beginPath();
      ctx.arc(-14, by, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff8e8';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-14, by);
      ctx.lineTo(-14 + Math.cos(t * 3) * 5, by + Math.sin(t * 3) * 5);
      ctx.moveTo(-14, by);
      ctx.lineTo(-14 + Math.cos(t * 0.5) * 3.5, by + Math.sin(t * 0.5) * 3.5);
      ctx.stroke();
      break;
    }
    case 'helmet':
      ctx.beginPath();
      ctx.arc(0, -1, 12.5, Math.PI * 0.85, Math.PI * 2.15);
      ctx.closePath();
      inked(ctx, '#ff3d4f');
      ctx.fillStyle = '#fff4dc';
      ctx.fillRect(-11, -6, 22, 3);
      ctx.fillStyle = 'rgba(160, 230, 255, 0.85)';
      ctx.fillRect(2, -4, 11, 6);
      break;
    case 'headphones':
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, -1, 12, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(-1, 1, 4, 6, 0, 0, Math.PI * 2);
      inked(ctx, '#19e3d0');
      break;
    case 'visor': {
      const hh = (t * 120) % 360;
      ctx.fillStyle = `hsla(${hh}, 100%, 65%, 0.75)`;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-3, -5);
      ctx.lineTo(15, -5);
      ctx.lineTo(13, 2);
      ctx.lineTo(-1, 2);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      drawGlow(ctx, 6, -2, 14, 'rgba(120, 255, 255, 0.9)', 0.5);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(1 + ((t * 20) % 12), -4, 2, 5);
      break;
    }
    case 'mohawk':
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.moveTo(-8 + k * 3.5, -8 + Math.abs(k - 2) * 1.5);
        ctx.lineTo(-6 + k * 3.5, -21 + Math.abs(k - 2) * 2);
        ctx.lineTo(-4 + k * 3.5, -8 + Math.abs(k - 2) * 1.5);
        ctx.closePath();
        inked(ctx, k % 2 ? '#ff3d7f' : '#19e3d0');
      }
      break;
    case 'viking':
      ctx.beginPath();
      ctx.arc(0, -3, 11.5, Math.PI, 0);
      ctx.closePath();
      inked(ctx, '#9aa3b5');
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sgn * 9, -6);
        ctx.quadraticCurveTo(sgn * 20, -8, sgn * 17, -22);
        ctx.quadraticCurveTo(sgn * 14, -12, sgn * 6, -10);
        ctx.closePath();
        inked(ctx, '#f4efe6');
      }
      ctx.fillStyle = '#d9a53a';
      ctx.fillRect(-11, -5, 22, 3);
      break;
    case 'firecrown':
      for (let k = 0; k < 5; k++) {
        const fl = 0.8 + 0.25 * Math.sin(t * 18 + k * 1.7);
        const x = -8 + k * 4;
        drawGlow(ctx, x, -14, 8, 'rgba(255, 140, 40, 0.9)', 0.7);
        ctx.fillStyle = k % 2 ? '#ffd23f' : '#ff7a3d';
        ctx.beginPath();
        ctx.moveTo(x - 3, -9);
        ctx.quadraticCurveTo(x, -9 - 14 * fl, x + 3, -9);
        ctx.fill();
      }
      break;
  }
}

function strap(ctx) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-9, -15);
  ctx.lineTo(8, 4);
  ctx.stroke();
  ctx.strokeStyle = '#5a4a3a';
  ctx.lineWidth = 1.6;
  ctx.stroke();
}

function belt(ctx, buckle) {
  ctx.fillStyle = INK;
  ctx.fillRect(-10, 3, 20, 4);
  ctx.fillStyle = buckle;
  ctx.fillRect(2, 3.8, 4, 2.4);
}

function drawVest(ctx) {
  rr(ctx, -11, -16, 22, 20, 5);
  inked(ctx, vgrad(ctx, -16, 4, '#3d4a6b', '#232c45'));
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(-8, -13, 16, 2);
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(-7, -6, 14, 3);
}

function drawPistol(ctx, x, y, a) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 2 - a);
  ctx.fillStyle = INK;
  ctx.fillRect(0, -2.5, 16, 5);
  ctx.fillRect(1, 0, 4, 6);
  ctx.fillStyle = '#4a4f5e';
  ctx.fillRect(7, -2, 9, 4);
  ctx.restore();
}

// ---------------- CABEZAS ----------------
/** Cabeza centrada en (0, 0). Se usa también en los iconos de las cápsulas. */
export function drawHead(ctx, kind, t, frown = 0, lookUp = false) {
  const look = lookUp ? -1 : 0;
  const blink = Math.sin(t * 0.9) > 0.985;
  const eyes = (y, skinBand = true) => {
    if (skinBand) {
      rr(ctx, -1, y - 2, 13, 7.5, 3.5);
      inked(ctx, '#f2c38b');
    }
    if (blink) {
      ctx.fillStyle = INK;
      ctx.fillRect(2, y + 0.5, 9, 1.4);
      return;
    }
    ctx.fillStyle = '#fff';
    ctx.fillRect(2, y - 0.6, 3.6, 4.2);
    ctx.fillRect(7.4, y - 0.6, 3.6, 4.2);
    ctx.fillStyle = INK;
    ctx.fillRect(3.6, y + 0.2 + look, 2, 2.6);
    ctx.fillRect(9, y + 0.2 + look, 2, 2.6);
  };
  const brows = (y, color = INK) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(1.5, y - frown * 0.4);
    ctx.lineTo(5.5, y + 0.8 + frown * 0.6);
    ctx.moveTo(7.2, y + 0.8 + frown * 0.6);
    ctx.lineTo(11.2, y - frown * 0.4);
    ctx.stroke();
  };
  const skull = (fill) => {
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    inked(ctx, fill);
  };

  if (kind === 'balaclava') {
    const g = ctx.createRadialGradient(-3, -4, 1, 0, 0, 12);
    g.addColorStop(0, '#5a4a8c');
    g.addColorStop(1, '#3c2f63');
    skull(g);
    eyes(-3);
    brows(-6);
    ctx.beginPath();
    ctx.arc(-3, -12, 4.2, 0, Math.PI * 2);
    inked(ctx, '#ff5d73');
  } else if (kind === 'gent') {
    skull(vgrad(ctx, -11, 11, '#f6d2a6', '#e0b080'));
    // pelo canoso peinado hacia atrás
    ctx.beginPath();
    ctx.arc(-1.5, -2, 11, Math.PI * 0.95, Math.PI * 1.85);
    ctx.lineTo(-11, 3);
    ctx.closePath();
    inked(ctx, '#d9dbe3');
    ctx.strokeStyle = '#a9abb6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8, -6);
    ctx.lineTo(2, -9.5);
    ctx.stroke();
    eyes(-3, false);
    // gafas redondas doradas
    ctx.strokeStyle = '#d9a53a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(3.8, -1, 3.2, 0, Math.PI * 2);
    ctx.moveTo(12.4, -1);
    ctx.arc(9.2, -1, 3.2, 0, Math.PI * 2);
    ctx.moveTo(7, -1);
    ctx.lineTo(6, -1);
    ctx.stroke();
    brows(-5.5, '#c9cbd3');
    // bigote
    ctx.fillStyle = '#e4e6ee';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(3, 5);
    ctx.quadraticCurveTo(7, 2.5, 11.5, 5);
    ctx.quadraticCurveTo(9, 7.5, 7, 6);
    ctx.quadraticCurveTo(5, 7.5, 3, 5);
    ctx.fill();
    ctx.stroke();
  } else if (kind === 'braid') {
    skull(vgrad(ctx, -11, 11, '#d9a07a', '#b97d58'));
    // pelo oscuro con flequillo
    ctx.beginPath();
    ctx.arc(0, -1, 11.5, Math.PI * 0.9, Math.PI * 2.05);
    ctx.quadraticCurveTo(6, -6, 1, -4);
    ctx.quadraticCurveTo(-6, -2, -11, 4);
    ctx.closePath();
    inked(ctx, '#3a2418');
    eyes(-1, false);
    brows(-3.5);
    // gafas de aviador en la frente
    rr(ctx, -2, -11, 15, 5.5, 2.5);
    inked(ctx, '#7b5cff');
    ctx.fillStyle = '#9ff8ff';
    ctx.fillRect(0, -10, 4.5, 3.4);
    ctx.fillRect(6.6, -10, 4.5, 3.4);
    // sonrisa
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(7, 4.5, 2.6, 0.2, Math.PI - 0.4);
    ctx.stroke();
  } else if (kind === 'brute') {
    skull(vgrad(ctx, -11, 11, '#f0bd92', '#d49a6c'));
    // rapado
    ctx.fillStyle = 'rgba(120, 60, 30, 0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, 10, Math.PI, Math.PI * 1.9);
    ctx.fill();
    // barba pelirroja
    ctx.beginPath();
    ctx.moveTo(-6, 2);
    ctx.quadraticCurveTo(-4, 14, 6, 14);
    ctx.quadraticCurveTo(13, 12, 12, 2);
    ctx.quadraticCurveTo(6, 6, -6, 2);
    ctx.closePath();
    inked(ctx, vgrad(ctx, 2, 14, '#e2663a', '#b5401e'));
    // gafas de soldador
    ctx.fillStyle = INK;
    ctx.fillRect(-10, -5, 22, 3);
    for (const gx of [3.5, 9.5]) {
      ctx.beginPath();
      ctx.arc(gx, -3.5, 3.6, 0, Math.PI * 2);
      inked(ctx, '#3a3150');
      ctx.fillStyle = frown > 0.5 ? '#ff6b3d' : '#7fd8ff';
      ctx.beginPath();
      ctx.arc(gx, -3.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // sonrisa enorme
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(6.5, 6, 3.4, 0, Math.PI);
    ctx.fill();
  }
}
