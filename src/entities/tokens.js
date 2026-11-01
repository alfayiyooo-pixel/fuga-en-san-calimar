import { CONFIG } from '../config.js';
import { rand, chance, lerp, pick, randInt, clamp } from '../core/rng.js';
import { getLang, t } from '../core/i18n.js';
import { Sound } from '../core/audio.js';
import { PATTERNS, patternSize } from '../world/patterns.js';
import { sprite, drawSprite, drawGlow } from '../fx/sprites.js';

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
    const pl = p.left - T.radius;
    const pr = p.right + T.radius;
    const pt = p.top - T.radius;
    const pb = p.bottom + T.radius;
    const R2 = T.magnet.radius ** 2;

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
      if (!g.dead && this.magnetActive && tk.kind !== 'magnet') {
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
      if (!g.dead && tk.x > pl && tk.x < pr && tk.y > pt && tk.y < pb) this.collect(tk, g);
    }
    this.list = this.list.filter((tk) => tk.alive);
  }

  collect(tk, g) {
    const T = CONFIG.tokens;
    tk.alive = false;
    const sx = tk.x - g.camera.x;

    if (tk.kind === 'magnet') {
      this.magnetTime = T.magnet.duration;
      Sound.magnet();
      g.popups.add(t('popup.magnet'), sx, tk.y - 30, { color: '#ff6b7d', size: 26, life: 1.2 });
      g.particles.burst(tk.x, tk.y, 18, { color: '#ff6b7d', speed: 300, life: 0.5, size: 4, sizeEnd: 0, additive: true });
      g.onCollect?.('magnet', 0);
      return;
    }

    const value = T.values[tk.kind];
    g.bucks += value;
    g.hud.bumpBucks(tk.kind !== 'bill');
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
