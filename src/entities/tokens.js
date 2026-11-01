import { CONFIG } from '../config.js';
import { rand, chance, lerp, pick, randInt, clamp } from '../core/rng.js';
import { getLang, t } from '../core/i18n.js';
import { Sound } from '../core/audio.js';
import { PATTERNS, patternSize } from '../world/patterns.js';
import { sprite, drawSprite, drawGlow } from '../fx/sprites.js';
import { capsuleSprite, itemSprite } from '../characters/icons.js';
import { CHARACTERS, ITEM_OWNER } from '../characters/defs.js';

/*
 * PAVOS (fajos de billetes), billetes dorados, maletines e imán.
 * Tokens se encarga de generarlos por delante de la cámara, moverlos
 * (imán), recogerlos y dibujarlos.
 */

const INK = '#1b1030';

export class Tokens {
  constructor() {
    this.list = [];
    this.reset(0);
  }

  reset(startX) {
    this.list.length = 0;
    this.nextX = startX + CONFIG.tokens.firstAt * CONFIG.world.pxPerMeter;
    this.nextOrbX = startX + CONFIG.orbs.firstAt * CONFIG.world.pxPerMeter;
    this.orbChain = 0;
    this.lastPattern = null;
    this.magnetTime = 0;
    this.chain = 0;
    this.sinceLast = 99;
    this.chainPop = null;
  }

  get magnetActive() {
    return this.magnetTime > 0;
  }

  // ---------------- GENERACIÓN ----------------

  spawnAhead(g) {
    const T = CONFIG.tokens;
    while (this.nextX < g.camera.x + g.view.w + 60) {
      const start = this.nextX;
      const len = this.spawnGroup(g, start);
      const interval = g.speed * rand(T.groupEvery[0], T.groupEvery[1]);
      this.nextX = start + Math.max(len + T.minGap, interval);
    }
    // orbes de experiencia: grupos pequeños, menos frecuentes que los pavos
    const O = CONFIG.orbs;
    while (this.nextOrbX < g.camera.x + g.view.w + 60) {
      if (!g.respite.active) this.spawnOrbs(g, this.nextOrbX);
      this.nextOrbX += g.speed * rand(O.every[0], O.every[1]);
    }
  }

  /** Grupo de orbes en arco, en una altura libre de obstáculos. */
  spawnOrbs(g, x) {
    const O = CONFIG.orbs;
    const top = CONFIG.world.ceiling + 40;
    const bottom = g.view.groundY - 40;
    const obs = g.obstacles.filter((o) => isStatic(o) && o.right > x - 40 && leftOf(o) < x + O.cluster * O.spacing + 40);
    let y0 = rand(top, bottom);
    for (let tries = 0; tries < 8; tries++) {
      const ok = Array.from({ length: O.cluster }, (_, i) => tokenHitsObstacle(x + i * O.spacing, y0 - Math.sin((i / Math.max(1, O.cluster - 1)) * Math.PI) * 30, obs) !== 2).every(Boolean);
      if (ok) break;
      y0 = rand(top, bottom);
    }
    for (let i = 0; i < O.cluster; i++) {
      const arc = Math.sin((i / Math.max(1, O.cluster - 1)) * Math.PI) * 30;
      this.add(x + i * O.spacing, y0 - arc, 'orb');
    }
  }

  choosePattern(g) {
    const T = CONFIG.tokens;
    const entries = Object.entries(T.patterns).filter(([k]) => {
      if (k === 'word') return g.distance > T.wordFrom && this.lastPattern !== 'word';
      return true;
    });
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = Math.random() * total;
    for (const [k, w] of entries) {
      roll -= w;
      if (roll <= 0) return k;
    }
    return 'line';
  }

  /** Crea un grupo en x y devuelve su longitud en px. */
  spawnGroup(g, x) {
    const T = CONFIG.tokens;
    const sp = T.spacing;
    const d = g.difficulty;
    const type = this.choosePattern(g);
    this.lastPattern = type;

    // obstáculos fijos en la franja que ocupará el grupo
    const roughLen = (type === 'word' ? 50 : T.sizeAtMax[1] * T.riskSizeMult) * sp;
    const nearby = g.obstacles.filter((o) => isStatic(o) && o.right > x - 60 && leftOf(o) < x + roughLen);
    const risky = nearby.length > 0;

    let n = randInt(Math.round(lerp(T.size[0], T.sizeAtMax[0], d)), Math.round(lerp(T.size[1], T.sizeAtMax[1], d)));
    if (risky) n = Math.round(n * T.riskSizeMult);
    const points =
      type === 'word' ? PATTERNS.word(pick(T.words[getLang()] || T.words.es))
      : type === 'arrow' ? PATTERNS.arrow()
      : PATTERNS[type](n);
    const cell = type === 'word' ? sp * 0.8 : sp;
    const size = patternSize(points);
    const w = size.w * cell;
    const h = size.h * cell;

    // elegir la altura: sin tocar obstáculos y, si hay peligro cerca, pegado a él
    const top = CONFIG.world.ceiling + 24;
    const bottom = g.view.groundY - 22 - h;
    const groupObs = g.obstacles.filter((o) => isStatic(o) && o.right > x - 30 && leftOf(o) < x + w + 30);
    let best = null;
    for (let y0 = top; y0 <= Math.max(top, bottom); y0 += 16) {
      let ok = 0;
      let bad = 0;
      let near = 0;
      for (const p of points) {
        const px = x + p.x * cell;
        const py = y0 + p.y * cell;
        const c = tokenHitsObstacle(px, py, groupObs);
        if (c === 2) bad++;
        else {
          ok++;
          if (c === 1) near++;
        }
      }
      const score = ok - bad * 3 + (risky ? near * 0.8 : 0) + Math.random() * 2;
      if (!best || score > best.score) best = { y0, score };
    }

    const placed = [];
    for (const p of points) {
      const px = x + p.x * cell;
      const py = best.y0 + p.y * cell;
      const c = tokenHitsObstacle(px, py, groupObs);
      if (c === 2) continue;
      placed.push(this.add(px, py, 'bill', c === 1));
    }
    if (!placed.length) return w;

    // especiales: el dorado y el maletín van en el pavo más arriesgado
    const riskiest = placed.find((tk) => tk.near) || pick(placed);
    if (chance(T.goldChance)) pick(placed).kind = 'gold';
    const caseP = risky ? T.caseRiskChance : T.caseChance;
    if (g.distance > T.caseFrom && chance(caseP)) riskiest.kind = 'case';

    // cápsula de personaje o icono de habilidad/gadget, integrado en el grupo
    const place = g.powers.choosePlacement(g);
    if (place) {
      const host = risky ? riskiest : placed[Math.floor(placed.length / 2)];
      Object.assign(host, place);
    }

    // imán ocasional después del grupo
    const M = T.magnet;
    if (!this.magnetActive && g.distance > M.from && chance(M.chance)) {
      this.add(x + w + T.minGap * 0.6, clamp(best.y0 + h / 2, top + 20, g.view.groundY - 60), 'magnet');
    }
    return w;
  }

  /** Lluvia de pavos (premio del respiro): caen desde arriba. */
  rain(dt, g, rate, goldChance) {
    this.rainAcc = (this.rainAcc ?? 0) + dt * rate;
    while (this.rainAcc >= 1) {
      this.rainAcc -= 1;
      const x = g.camera.x + g.view.w * rand(0.35, 1.15);
      const tk = this.add(x, -20, chance(goldChance) ? 'gold' : 'bill');
      tk.vy = rand(60, 160);
      tk.falling = true;
    }
  }

  add(x, y, kind, near = false) {
    const tk = { x, y, baseY: y, kind, near, phase: Math.random() * 6, alive: true, pulled: false };
    this.list.push(tk);
    return tk;
  }

  // ---------------- LÓGICA ----------------

  update(dt, g) {
    const T = CONFIG.tokens;
    this.spawnAhead(g);
    this.sinceLast += dt;
    if (this.sinceLast > T.chainWindow) this.chain = 0;

    if (this.magnetTime > 0) {
      this.magnetTime -= dt;
      if (this.magnetTime <= 0) Sound.magnetEnd();
    }

    const p = g.player;
    const big = 12; // las cápsulas e iconos se cogen desde un poco más lejos
    const R = this.magnetActive ? T.magnet.radius : g.powers.magnetRadius;
    const R2 = R * R;

    for (const tk of this.list) {
      if (!tk.alive) continue;
      if (tk.x < g.camera.x - 80) {
        tk.alive = false;
        continue;
      }
      if (tk.falling) {
        tk.vy += 260 * dt;
        tk.y += tk.vy * dt;
        tk.x += Math.sin(g.t * 3 + tk.phase) * 30 * dt;
        if (tk.y > g.view.groundY - 14) {
          tk.y = g.view.groundY - 14;
          tk.falling = false;
        }
      }
      if (!g.dead && R > 0 && (tk.kind === 'bill' || tk.kind === 'gold' || tk.kind === 'case' || tk.kind === 'orb')) {
        const dx = p.x - tk.x;
        const dy = p.y - tk.y;
        const d2 = dx * dx + dy * dy;
        if (tk.pulled || d2 < R2) {
          tk.pulled = true;
          const dist = Math.sqrt(d2) || 1;
          const s = (T.magnet.pullSpeed + g.speed) * dt;
          if (dist <= s) {
            tk.x = p.x;
            tk.y = p.y;
          } else {
            tk.x += (dx / dist) * s;
            tk.y += (dy / dist) * s;
          }
        }
      }
      const r = T.radius + (tk.kind === 'capsule' || tk.kind === 'item' ? big : 0);
      if (!g.dead && tk.x > p.left - r && tk.x < p.right + r && tk.y > p.top - r && tk.y < p.bottom + r) this.collect(tk, g);
    }
    this.list = this.list.filter((tk) => tk.alive);
  }

  collect(tk, g) {
    const T = CONFIG.tokens;
    tk.alive = false;
    const sx = tk.x - g.camera.x;

    if (tk.kind === 'capsule' || tk.kind === 'item') {
      g.powers.collect(tk, g);
      return;
    }

    if (tk.kind === 'orb') {
      this.collectOrb(tk, g, sx);
      return;
    }

    if (tk.kind === 'magnet') {
      this.magnetTime = T.magnet.duration;
      Sound.magnet();
      g.popups.add(t('popup.magnet'), sx, tk.y - 30, { color: '#ff6b7d', size: 26, life: 1.2 });
      g.particles.burst(tk.x, tk.y, 18, { color: '#ff6b7d', speed: 300, life: 0.5, size: 4, sizeEnd: 0, additive: true });
      g.onCollect?.('magnet', 0);
      return;
    }

    // el multiplicador por esquivas al límite multiplica lo que ganas
    const value = T.values[tk.kind] * g.combo.level;
    g.bucks += value;
    if (tk.kind !== 'bill' || this.chain % CONFIG.score.flyEvery === 0) g.hud.flyToCounter(sx, tk.y, tk.kind);
    else g.hud.bumpBucks(false);
    this.chain++;
    this.sinceLast = 0;

    if (tk.kind === 'bill') {
      Sound.coin(this.chain);
      g.particles.burst(tk.x, tk.y, 4, { color: '#9dffb5', speed: 140, life: 0.25, size: 3, sizeEnd: 0, additive: true });
      g.particles.spawn({ x: tk.x, y: tk.y, life: 0.18, size: 6, sizeEnd: 22, color: 'rgba(170, 255, 190, 0.5)', additive: true });
      // contador de la racha junto al jugador
      if (this.chainPop && this.chainPop.life > 0 && this.chain > 1) {
        this.chainPop.value += value;
        this.chainPop.text = `+${this.chainPop.value}`;
        this.chainPop.life = this.chainPop.maxLife;
        this.chainPop.size = Math.min(34, 18 + this.chain * 0.6);
        this.chainPop.y = p0(g) - 10;
      } else {
        this.chainPop = g.popups.add(`+${value}`, g.player.x - g.camera.x + 26, p0(g) - 10, { color: '#9dffb5', size: 18, life: 0.7, rise: 30 });
        this.chainPop.value = value;
      }
    } else if (tk.kind === 'gold') {
      Sound.gold();
      g.popups.add(`+${value}`, sx, tk.y - 20, { color: '#ffd23f', size: 30, life: 1.1 });
      g.particles.burst(tk.x, tk.y, 16, { color: '#ffd23f', speed: 260, life: 0.5, size: 4, sizeEnd: 0, additive: true });
      g.particles.spawn({ x: tk.x, y: tk.y, life: 0.3, size: 10, sizeEnd: 50, color: 'rgba(255, 220, 90, 0.6)', additive: true });
    } else if (tk.kind === 'case') {
      Sound.briefcase();
      g.camera.addShake(0.2);
      g.popups.add(`+${value}`, sx, tk.y - 24, { color: '#ffd23f', size: 40, life: 1.4 });
      g.popups.add(t('popup.case'), sx, tk.y + 14, { color: '#fff4dc', size: 20, life: 1.4 });
      g.particles.burst(tk.x, tk.y, 26, { color: '#ffd23f', speed: 340, life: 0.7, size: 5, sizeEnd: 0, additive: true });
      g.particles.burst(tk.x, tk.y, 14, { color: '#5fcf7a', speed: 260, life: 1.2, size: 5, shape: 'rect', spin: 10, gravity: 500, drag: 1.5 });
      g.particles.spawn({ x: tk.x, y: tk.y, life: 0.35, size: 14, sizeEnd: 80, color: 'rgba(255, 220, 90, 0.6)', additive: true });
    }
    g.onCollect?.(tk.kind, value);
  }

  /** Orbe azul: carga la especial y da experiencia; vuela hacia la barra. */
  collectOrb(tk, g, sx) {
    const O = CONFIG.orbs;
    g.xpRun += O.xp;
    g.orbsRun++;
    this.orbChain = this.sinceOrb !== undefined && g.t - this.sinceOrb < 1.2 ? this.orbChain + 1 : 1;
    this.sinceOrb = g.t;
    Sound.orb(this.orbChain);
    g.particles.spawn({ x: tk.x, y: tk.y, life: 0.25, size: 8, sizeEnd: 40, color: 'rgba(90, 170, 255, 0.8)', shape: 'glow', additive: true });
    g.particles.burst(tk.x, tk.y, 6, { color: '#9fd8ff', speed: 160, life: 0.3, size: 2.5, sizeEnd: 0, additive: true });
    g.hud.flyOrb(sx, tk.y, g, () => g.powers.addCharge(O.charge * (g.orbMult ?? 1), g));
  }

  // ---------------- DIBUJO ----------------

  draw(ctx, camX, g) {
    const time = g.t;
    const right = camX + g.view.w + 40;
    for (const tk of this.list) {
      if (tk.x < camX - 40 || tk.x > right) continue;
      const x = tk.x - camX;
      const bob = tk.pulled || tk.falling ? 0 : Math.sin(time * 3 + tk.phase) * 3;
      const y = tk.y + bob;
      if (tk.kind === 'bill') {
        const flip = 0.75 + 0.25 * Math.cos(time * 4 + tk.phase);
        drawSprite(ctx, billSprite(), x, y, flip, 1);
      } else if (tk.kind === 'gold') {
        drawGlow(ctx, x, y, 34, 'rgba(255, 210, 63, 0.9)', 0.6 + 0.3 * Math.sin(time * 6 + tk.phase));
        const flip = Math.cos(time * 5 + tk.phase);
        drawSprite(ctx, goldSprite(), x, y, Math.max(0.15, Math.abs(flip)), 1);
        sparkle(ctx, x + 12 * Math.cos(time * 3), y - 10, time * 8, 5);
      } else if (tk.kind === 'case') {
        drawGlow(ctx, x, y, 52, 'rgba(255, 200, 80, 0.9)', 0.55 + 0.35 * Math.sin(time * 5));
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(time * 2.5 + tk.phase) * 0.12);
        drawSprite(ctx, caseSprite(), 0, 0);
        ctx.restore();
        sparkle(ctx, x - 16, y - 16, time * 6, 6);
        sparkle(ctx, x + 18, y + 6, time * 7 + 2, 4);
      } else if (tk.kind === 'capsule') {
        const c = CHARACTERS[tk.char];
        drawGlow(ctx, x, y, 60, c.rgba, 0.65 + 0.3 * Math.sin(time * 6));
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(time * 3 + tk.phase) * 0.15);
        const s = 1 + Math.sin(time * 7) * 0.05;
        drawSprite(ctx, capsuleSprite(tk.char), 0, 0, s, s);
        ctx.restore();
        sparkle(ctx, x + 18, y - 22, time * 7, 6);
        sparkle(ctx, x - 20, y + 10, time * 6 + 2, 5);
      } else if (tk.kind === 'item') {
        const c = CHARACTERS[ITEM_OWNER[tk.item]];
        drawGlow(ctx, x, y, 46, c.rgba, 0.55 + 0.3 * Math.sin(time * 6 + tk.phase));
        const s = 1 + Math.sin(time * 5 + tk.phase) * 0.07;
        drawSprite(ctx, itemSprite(tk.item), x, y, s, s);
      } else if (tk.kind === 'orb') {
        const pulse = 0.85 + 0.15 * Math.sin(time * 7 + tk.phase);
        drawGlow(ctx, x, y, 30 * pulse, 'rgba(70, 150, 255, 0.95)', 0.75);
        drawSprite(ctx, orbSprite(), x, y, pulse, pulse);
        const a = time * 4 + tk.phase;
        ctx.fillStyle = '#e6f6ff';
        ctx.fillRect(x + Math.cos(a) * 15 - 1.5, y + Math.sin(a) * 15 * 0.5 - 1.5, 3, 3);
      } else if (tk.kind === 'magnet') {
        drawGlow(ctx, x, y, 44, 'rgba(255, 90, 120, 0.9)', 0.5 + 0.3 * Math.sin(time * 6));
        const s = 1 + Math.sin(time * 5) * 0.06;
        drawSprite(ctx, magnetSprite(), x, y, s, s);
      }
    }
  }
}

function p0(g) {
  return g.player.y - g.player.h / 2;
}

function leftOf(o) {
  return o.type === 'cable' ? o.x - o.len / 2 - 20 : o.x;
}

function isStatic(o) {
  return o.type === 'cable' || (o.type === 'billboard' && o.state === 'hang');
}

/** 0 = libre, 1 = cerca (arriesgado), 2 = encima del obstáculo. */
function tokenHitsObstacle(x, y, obstacles) {
  const r = CONFIG.tokens.radius + CONFIG.tokens.obstacleMargin;
  const box = { l: x - r, r: x + r, t: y - r, b: y + r };
  const nearR = r + 46;
  const nearBox = { l: x - nearR, r: x + nearR, t: y - nearR, b: y + nearR };
  let res = 0;
  for (const o of obstacles) {
    if (o.hits(box)) return 2;
    if (o.hits(nearBox)) res = 1;
  }
  return res;
}

function sparkle(ctx, x, y, phase, size) {
  const s = size * (0.6 + 0.4 * Math.sin(phase));
  ctx.fillStyle = '#fffbe8';
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x, y, x + s, y);
  ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y);
  ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.fill();
}

// ---------------- SPRITES ----------------

function note(ctx, x, y, w, h, base, dark, light) {
  ctx.fillStyle = INK;
  rr(ctx, x - 1.5, y - 1.5, w + 3, h + 3, 3);
  ctx.fill();
  ctx.fillStyle = base;
  rr(ctx, x, y, w, h, 2);
  ctx.fill();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.2;
  rr(ctx, x + 2.5, y + 2.5, w - 5, h - 5, 1.5);
  ctx.stroke();
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, h * 0.28, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Fajo verde con faja dorada. */
export function billSprite() {
  return sprite('tk:bill', 34, 26, (ctx) => {
    note(ctx, 4, 3, 26, 15, '#4fbf6a', '#2a7d43', '#8fe3a2');
    note(ctx, 2, 7, 26, 15, '#5fd27b', '#2a7d43', '#a9f0b8');
    // faja dorada
    ctx.fillStyle = INK;
    ctx.fillRect(12, 5.5, 8, 18);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(13.2, 6.5, 5.6, 16);
    ctx.fillStyle = '#fff3b0';
    ctx.fillRect(13.8, 6.5, 1.6, 16);
    // brillo
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(4, 9, 6, 2);
  });
}

/** Orbe de experiencia azul. */
export function orbSprite() {
  return sprite('tk:orb', 30, 30, (ctx) => {
    const g = ctx.createRadialGradient(11, 10, 1, 15, 15, 13);
    g.addColorStop(0, '#f0fbff');
    g.addColorStop(0.35, '#7fc8ff');
    g.addColorStop(0.8, '#2f6bff');
    g.addColorStop(1, '#1b2f8e');
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(15, 15, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(15, 15, 11.5, 0, Math.PI * 2);
    ctx.fill();
    // estrella interior
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.moveTo(15, 9);
    ctx.quadraticCurveTo(15, 15, 21, 15);
    ctx.quadraticCurveTo(15, 15, 15, 21);
    ctx.quadraticCurveTo(15, 15, 9, 15);
    ctx.quadraticCurveTo(15, 15, 15, 9);
    ctx.fill();
  });
}

/** Billete dorado (x10). */
export function goldSprite() {
  return sprite('tk:gold', 40, 28, (ctx) => {
    note(ctx, 3, 4, 34, 20, '#ffcf3a', '#b8860b', '#fff1a8');
    ctx.fillStyle = '#b8860b';
    ctx.font = "13px 'Bungee', Impact, sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('10', 20, 15);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.moveTo(6, 22);
    ctx.lineTo(14, 6);
    ctx.lineTo(18, 6);
    ctx.lineTo(10, 22);
    ctx.fill();
  });
}

/** Maletín (x50). */
export function caseSprite() {
  return sprite('tk:case', 50, 42, (ctx) => {
    // asa
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    rr(ctx, 17, 3, 16, 12, 4);
    ctx.stroke();
    ctx.strokeStyle = '#3a2a1e';
    ctx.lineWidth = 2.5;
    rr(ctx, 17, 3, 16, 12, 4);
    ctx.stroke();
    // cuerpo
    ctx.fillStyle = INK;
    rr(ctx, 2, 11, 46, 29, 6);
    ctx.fill();
    const g = ctx.createLinearGradient(0, 12, 0, 40);
    g.addColorStop(0, '#6b4a33');
    g.addColorStop(1, '#3d2a1d');
    ctx.fillStyle = g;
    rr(ctx, 4, 13, 42, 25, 5);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    rr(ctx, 7, 15, 36, 5, 2);
    ctx.fill();
    // cierres dorados
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(10, 22, 7, 6);
    ctx.fillRect(33, 22, 7, 6);
    // billetes asomando
    ctx.fillStyle = '#5fd27b';
    ctx.fillRect(20, 36, 10, 5);
    ctx.fillStyle = INK;
    ctx.font = "11px 'Bungee', Impact, sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd23f';
    ctx.fillText('50', 25, 28);
  });
}

/** Power-up de imán: imán de herradura dentro de una burbuja. */
export function magnetSprite() {
  return sprite('tk:magnet', 46, 46, (ctx) => {
    ctx.fillStyle = 'rgba(255, 244, 220, 0.25)';
    ctx.strokeStyle = 'rgba(255, 244, 220, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(23, 23, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(23, 20, 9, Math.PI, 0);
    ctx.lineTo(32, 32);
    ctx.moveTo(14, 20);
    ctx.lineTo(14, 32);
    ctx.stroke();
    ctx.strokeStyle = '#ff3d4f';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(23, 20, 9, Math.PI, 0);
    ctx.lineTo(32, 28);
    ctx.moveTo(14, 20);
    ctx.lineTo(14, 28);
    ctx.stroke();
    ctx.fillStyle = '#e6ebf5';
    ctx.fillRect(10, 27, 8, 6);
    ctx.fillRect(28, 27, 8, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(15, 13, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
