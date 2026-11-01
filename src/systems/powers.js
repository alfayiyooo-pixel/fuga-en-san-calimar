import { CONFIG } from '../config.js';
import { rand, chance, pick, clamp } from '../core/rng.js';
import { t } from '../core/i18n.js';
import { Sound } from '../core/audio.js';
import { CHARACTERS, CHARACTER_IDS, ITEM_OWNER } from '../characters/defs.js';
import { capsuleSprite, itemSprite } from '../characters/icons.js';
import { drawRamp } from '../characters/vehicles.js';
import { drawSprite, drawGlow } from '../fx/sprites.js';
import { outlinedText } from '../ui/hud.js';

const BASE_MODS = { gravity: 1, thrust: 1, maxRise: 1, maxFall: 1, speed: 1, ramp: 1, hitbox: 1, bounce: 0 };

/**
 * Personajes, habilidades y gadgets.
 * - char: 'base' (jetpack básico) o un id de CHARACTERS.
 * - effects: habilidades/gadgets activos → segundos restantes (tiempo real).
 * - shields: golpes extra ('vest', 'bike').
 * Un golpe: si hay invulnerabilidad se ignora (o se destruye el obstáculo),
 * si hay escudo se gasta, si llevas personaje vuelves al jetpack básico,
 * y solo con el jetpack básico se pierde la partida.
 */
export class Powers {
  constructor() {
    this.reset();
  }

  reset() {
    this.char = 'base';
    this.effects = {};
    this.shields = [];
    this.invuln = 0;
    this.slowmo = 0;
    this.capsuleCd = 0;
    this.itemCd = 0;
    this.shots = [];
    this.ramps = [];
    this.fireTimer = 0;
    this.tickTimer = 0;
    this.lastChar = null;
    this.uses = {};
  }

  get def() {
    return CHARACTERS[this.char] || null;
  }

  cfg(id = this.char) {
    return CONFIG.characters[id];
  }

  has(name) {
    return (this.effects[name] ?? 0) > 0;
  }

  get invulnerable() {
    return this.invuln > 0 || this.has('drive') || this.has('nitro') || this.has('rage');
  }

  /** Atraviesa y destruye lo que toca. */
  get smashing() {
    return this.has('nitro') || this.has('rage');
  }

  get timeScale() {
    if (this.slowmo > 0) return 0.3;
    if (this.has('bullettime')) return this.cfg('veteran').bulletTime.timeScale;
    return 1;
  }

  /** Radio del mini-imán de la conducción perfecta. */
  get magnetRadius() {
    return this.has('drive') ? this.cfg('pilot').drive.magnet : 0;
  }

  /** Aplica la física del personaje + multiplicadores de velocidad activos. */
  applyMods(player) {
    const m = { ...BASE_MODS, ...(this.def ? this.cfg().physics : {}) };
    if (this.has('drive')) {
      m.speed *= this.cfg('pilot').drive.speedMult;
      m.gravity *= 2;
    }
    if (this.has('nitro')) m.speed *= this.cfg('pilot').nitro.speedMult;
    if (this.has('rage')) m.speed *= this.cfg('wild').rage.speedMult;
    player.mods = m;
    player.style = this.def ? this.def.style : 'base';
    player.vehicle = this.has('drive') ? 'car' : this.has('bike') ? 'bike' : null;
    player.riding = player.vehicle === 'bike';
    player.vest = this.shields.includes('vest');
    player.aiming = this.has('pistol') || this.has('bullettime');
    player.blink = this.invuln > 0 && !this.has('drive');
    player.boost = this.has('nitro');
  }

  // ---------------- COLOCACIÓN EN LOS GRUPOS DE PAVOS ----------------

  /** ¿Este grupo de pavos lleva una cápsula o un icono? */
  choosePlacement(g) {
    const C = CONFIG.characters;
    if (this.char === 'base') {
      if (g.distance >= C.capsuleFrom && this.capsuleCd <= 0 && chance(C.capsuleChance)) {
        this.capsuleCd = C.capsuleCooldown;
        const options = CHARACTER_IDS.filter((id) => id !== this.lastChar);
        return { kind: 'capsule', char: pick(options) };
      }
      return null;
    }
    if (this.itemCd > 0 || !chance(C.itemChance)) return null;
    const d = this.def;
    const entries = [[d.special, C.specialWeight], ...d.gadgets.map((gd) => [gd, C.gadgetWeight])].filter(([it]) => {
      if (this.has(it)) return false;
      if (it === 'vest' && this.shields.includes('vest')) return false;
      return true;
    });
    if (!entries.length) return null;
    this.itemCd = C.itemCooldown;
    let roll = Math.random() * entries.reduce((s, [, w]) => s + w, 0);
    for (const [it, w] of entries) {
      roll -= w;
      if (roll <= 0) return { kind: 'item', item: it };
    }
    return { kind: 'item', item: entries[0][0] };
  }

  /** Se ha recogido una cápsula o un icono. */
  collect(tk, g) {
    if (tk.kind === 'capsule') {
      this.transform(tk.char, g);
    } else if (ITEM_OWNER[tk.item] === this.char) {
      this.activate(tk.item, g);
    } else {
      // icono de otro personaje (lo perdiste antes de cogerlo): pequeño premio
      g.bucks += 5;
      g.popups.add('+5', tk.x - g.camera.x, tk.y - 20, { color: '#ffd23f', size: 22 });
    }
  }

  // ---------------- TRANSFORMACIÓN ----------------

  transform(id, g) {
    const C = CONFIG.characters;
    const def = CHARACTERS[id];
    this.char = id;
    this.lastChar = id;
    this.effects = {};
    this.shields = [];
    this.invuln = C.transformInvuln;
    this.slowmo = C.transformSlowmo;
    this.itemCd = 2;
    this.uses[id] = (this.uses[id] ?? 0) + 1;
    const p = g.player;
    // efecto llamativo: destello, anillos, espiral de chispas
    g.flash = Math.max(g.flash, 0.6);
    g.camera.addShake(0.35);
    g.particles.spawn({ x: p.x, y: p.y, life: 0.5, size: 20, sizeEnd: 160, color: def.rgba, shape: 'glow', additive: true, important: true });
    for (let k = 0; k < 3; k++) {
      g.particles.spawn({ x: p.x, y: p.y, life: 0.45 + k * 0.15, size: 8, sizeEnd: 80 + k * 40, color: k === 1 ? '#ffffff' : def.color, shape: 'ring', additive: true, important: true });
    }
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2;
      const r = 50;
      g.particles.spawn({
        x: p.x + Math.cos(a) * r,
        y: p.y + Math.sin(a) * r,
        vx: -Math.sin(a) * 260 - Math.cos(a) * 120,
        vy: Math.cos(a) * 260 - Math.sin(a) * 120,
        life: 0.6,
        size: 4,
        sizeEnd: 0,
        color: k % 2 ? def.color : '#fff6c2',
        additive: true,
        drag: 3,
        important: true,
      });
    }
    g.hud.banner(t(`char.${id}.alias`), t(`char.${id}.name`));
    Sound.transform();
  }

  detransform(g) {
    const def = this.def;
    const p = g.player;
    this.char = 'base';
    this.effects = {};
    this.shields = [];
    this.invuln = CONFIG.characters.detransformInvuln;
    this.itemCd = 0;
    g.camera.addShake(0.5);
    g.flash = Math.max(g.flash, 0.4);
    g.particles.burst(p.x, p.y, 16, { color: 'rgba(80, 70, 100, 0.6)', speed: 160, life: 0.9, size: 8, sizeEnd: 20, drag: 2.5, important: true });
    g.particles.burst(p.x, p.y, 18, { color: def.color, speed: 340, life: 0.8, size: 4, shape: 'rect', spin: 12, gravity: 900, important: true });
    g.popups.add(t('char.lost'), p.x - g.camera.x, p.y - 60, { color: '#ff6b7d', size: 22, life: 1.3 });
    Sound.detransform();
  }

  // ---------------- HABILIDADES Y GADGETS ----------------

  activate(item, g) {
    const C = CONFIG.characters;
    const p = g.player;
    const def = this.def;
    g.popups.add(t(`item.${item}`), p.x - g.camera.x, p.y - 64, { color: def.color, size: 22, life: 1.3 });
    g.particles.spawn({ x: p.x, y: p.y, life: 0.4, size: 10, sizeEnd: 90, color: def.rgba, shape: 'ring', additive: true, important: true });
    Sound.powerUp();
    switch (item) {
      case 'bullettime':
        this.effects.bullettime = C.veteran.bulletTime.duration;
        break;
      case 'pistol':
        this.effects.pistol = C.veteran.pistol.duration;
        break;
      case 'vest':
        for (let k = 0; k < C.veteran.vest.hits; k++) this.shields.push('vest');
        break;
      case 'drive':
        this.effects.drive = C.pilot.drive.duration;
        break;
      case 'nitro':
        this.effects.nitro = C.pilot.nitro.duration;
        g.camera.addShake(0.3);
        Sound.nitro();
        break;
      case 'ramp':
        this.placeRamp(g);
        break;
      case 'rage':
        this.effects.rage = C.wild.rage.duration;
        g.camera.addShake(0.5);
        Sound.rage();
        break;
      case 'rocket':
        this.shots.push({ kind: 'rocket', x: p.x + 20, y: p.y - 6, vx: g.speed + 900, vy: 0, life: C.wild.rocket.delay });
        Sound.launch();
        break;
      case 'bike':
        this.effects.bike = C.wild.bike.duration;
        if (!this.shields.includes('bike')) this.shields.push('bike');
        break;
    }
  }

  /** Rampa en el suelo + arco de pavos sobre la trayectoria del salto. */
  placeRamp(g) {
    const R = CONFIG.characters.pilot.ramp;
    const x = g.player.x + g.speed * R.distance + 200;
    this.ramps.push({ x, used: false });
    const gy = g.view.groundY;
    const gravity = CONFIG.player.gravity * this.cfg('pilot').physics.gravity;
    for (let k = 1; k <= R.tokens; k++) {
      const tt = k * 0.07;
      const ty = gy - 70 - R.launch * tt + 0.5 * gravity * tt * tt;
      if (ty < CONFIG.world.ceiling + 30) continue;
      g.tokens.add(x + 40 + g.speed * tt, ty, k % 5 === 0 ? 'gold' : 'bill');
    }
    g.popups.add(t('char.toRamp'), g.view.w * 0.55, g.view.groundY - 120, { color: '#ffd23f', size: 22, life: 1.4, rise: 10 });
  }

  /**
   * Un obstáculo te ha alcanzado. Devuelve true si el golpe se absorbe.
   */
  absorbHit(o, g) {
    const police = o.police;
    if (this.invulnerable) {
      if (this.smashing || o.type === 'bullet') {
        g.destroyObstacle(o);
        if (police && CONFIG.characters.hitPoliceHeat) g.wanted.add(CONFIG.wanted.heat.hitPolice * 0.5);
      }
      return true;
    }
    if (this.shields.length) {
      const s = this.shields.pop();
      if (s === 'bike') this.effects.bike = 0;
      this.invuln = 1.0;
      g.destroyObstacle(o);
      g.camera.addShake(0.4);
      g.popups.add(t(`shield.${s}`), g.player.x - g.camera.x, g.player.y - 60, { color: '#7ff7e8', size: 22 });
      Sound.shield();
      if (police) g.wanted.add(CONFIG.wanted.heat.hitPolice);
      return true;
    }
    if (this.char !== 'base') {
      g.destroyObstacle(o);
      this.detransform(g);
      if (police) g.wanted.add(CONFIG.wanted.heat.hitPolice);
      return true;
    }
    return false;
  }

  // ---------------- LÓGICA POR FRAME ----------------

  /** dt real (no afectado por la cámara lenta). */
  update(dt, g, presses) {
    const C = CONFIG.characters;
    const p = g.player;
    this.invuln = Math.max(0, this.invuln - dt);
    this.slowmo = Math.max(0, this.slowmo - dt);
    this.capsuleCd = Math.max(0, this.capsuleCd - dt);
    this.itemCd = Math.max(0, this.itemCd - dt);
    for (const k of Object.keys(this.effects)) {
      if (this.effects[k] > 0) {
        this.effects[k] -= dt;
        if (this.effects[k] <= 0) this.onEffectEnd(k, g);
      }
    }
    this.fireTimer -= dt;

    // pistola automática
    if (this.has('pistol') && this.fireTimer <= 0) {
      const target = this.findTarget(g, C.veteran.pistol.range);
      if (target) {
        this.fire(g, target.x, target.y);
        this.fireTimer = C.veteran.pistol.fireRate;
      }
    }
    // tiempo bala: cada pulsación dispara hacia donde apuntas
    if (this.has('bullettime')) {
      for (const pr of presses) {
        if (this.fireTimer > 0) continue;
        let tx;
        let ty;
        if (pr.pos) {
          tx = pr.pos.x + g.camera.x;
          ty = pr.pos.y;
        } else {
          const target = this.findTarget(g, 700);
          if (!target) continue;
          tx = target.x;
          ty = target.y;
        }
        this.fire(g, tx, ty);
        this.fireTimer = C.veteran.bulletTime.shotCooldown;
      }
      this.tickTimer -= dt;
      if (this.tickTimer <= 0) {
        this.tickTimer = 0.5;
        Sound.tick();
      }
    }

    // conducción perfecta: salta solo lo que hay delante en el suelo
    if (this.has('drive') && p.onGround) {
      const look = { l: p.right, r: p.right + g.speed * 0.32, t: g.view.groundY - 60, b: g.view.groundY - 4 };
      if (g.obstacles.some((o) => o.alive && o.hits(look))) {
        p.vy = -C.pilot.drive.hop;
        p.onGround = false;
        Sound.hop();
      }
    }
    // moto: rebota sola en el suelo
    if (this.has('bike') && p.onGround && !g.inputHeld) {
      p.vy = -C.wild.bike.bounce;
      p.onGround = false;
      g.dust(p.x, p.bottom, 6);
      Sound.hop();
    }
    // rampa
    for (const r of this.ramps) {
      if (!r.used && p.x >= r.x + 30 && p.x < r.x + 120) {
        r.used = true;
        if (p.bottom > g.view.groundY - 80) {
          p.vy = -C.pilot.ramp.launch;
          p.launchT = 0.7;
          p.onGround = false;
          g.camera.addShake(0.25);
          Sound.launch();
        }
      }
    }
    this.ramps = this.ramps.filter((r) => r.x > g.camera.x - 200);

    // efectos visuales continuos
    if (this.has('rage') && Math.random() < dt * 40) {
      g.particles.spawn({ x: p.x + rand(-16, 16), y: p.y + rand(-24, 20), vx: rand(-80, -20), vy: rand(-140, -40), life: 0.4, size: 5, sizeEnd: 0, color: '#ff5a3d', additive: true });
    }
    if (this.has('nitro') && Math.random() < dt * 50) {
      g.particles.spawn({ x: p.x - 30, y: p.y + rand(-14, 14), vx: rand(-260, -120), life: 0.3, size: 6, sizeEnd: 1, color: '#7ff7ff', additive: true });
    }

    this.updateShots(dt * g.timeScale, g);
  }

  onEffectEnd(k, g) {
    if (k === 'bike') this.shields = this.shields.filter((s) => s !== 'bike');
    if (k === 'drive') g.player.vy = -300;
  }

  findTarget(g, range) {
    const p = g.player;
    let best = null;
    let bestD = Infinity;
    for (const o of g.obstacles) {
      if (!o.alive) continue;
      if (o.type === 'missile' && o.state !== 'fly') continue;
      const c = g.centerOf(o);
      if (c.x < p.x + 10 || c.x > p.x + range || c.x > g.camera.x + g.view.w) continue;
      const d = c.x - p.x + Math.abs(c.y - p.y) * 0.5;
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }

  fire(g, tx, ty) {
    const p = g.player;
    const sx = p.x + 16;
    const sy = p.y - 10;
    const dx = tx - sx;
    const dy = ty - sy;
    const len = Math.hypot(dx, dy) || 1;
    const speed = 1500;
    this.shots.push({ kind: 'bullet', x: sx, y: sy, vx: (dx / len) * speed + g.speed, vy: (dy / len) * speed, life: 0.7 });
    g.particles.spawn({ x: sx + 6, y: sy, life: 0.08, size: 8, sizeEnd: 2, color: '#ffe9a8', additive: true, important: true });
    Sound.shot();
  }

  updateShots(dt, g) {
    for (const s of this.shots) {
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.kind === 'rocket') {
        if (Math.random() < 0.8) g.particles.spawn({ x: s.x - 20, y: s.y + rand(-3, 3), vx: rand(-80, 0), vy: rand(-30, 30), life: 0.5, size: 5, sizeEnd: 14, color: 'rgba(220, 210, 230, 0.5)', drag: 2 });
        if (s.life <= 0) this.rocketBlast(g, s);
        continue;
      }
      const box = { l: s.x - 5, r: s.x + 5, t: s.y - 5, b: s.y + 5 };
      for (const o of g.obstacles) {
        if (!o.alive || !o.hits(box)) continue;
        if (o.type === 'heli' && (o.hp = (o.hp ?? 3) - 1) > 0) {
          g.particles.burst(s.x, s.y, 6, { color: '#ffd23f', speed: 200, life: 0.25, size: 2, additive: true });
          Sound.clank();
        } else {
          g.destroyObstacle(o);
        }
        s.life = 0;
        break;
      }
    }
    this.shots = this.shots.filter((s) => s.life > 0);
  }

  /** El cohete de Bruno limpia la pantalla. */
  rocketBlast(g, s) {
    s.life = 0;
    const right = g.camera.x + g.view.w + 250;
    let n = 0;
    for (const o of g.obstacles) {
      if (!o.alive) continue;
      if (o.type === 'missile' && o.state !== 'fly') {
        o.alive = false;
        continue;
      }
      const c = g.centerOf(o);
      if (c.x > g.camera.x - 50 && c.x < right) {
        g.destroyObstacle(o, true);
        n++;
      }
    }
    g.flash = 1;
    g.camera.addShake(0.8);
    g.particles.spawn({ x: s.x, y: s.y, life: 0.6, size: 40, sizeEnd: 320, color: 'rgba(255, 170, 80, 0.9)', shape: 'glow', additive: true, important: true });
    g.particles.spawn({ x: s.x, y: s.y, life: 0.6, size: 20, sizeEnd: 300, color: '#fff4dc', shape: 'ring', additive: true, important: true });
    g.popups.add(t('popup.boom'), g.view.w / 2, 200, { color: '#ff7a3d', size: 44, life: 1.2 });
    Sound.bigBoom();
    if (n) g.chaos(n * 2, s.x, s.y - 40);
  }

  // ---------------- DIBUJO ----------------

  /** Rampas, disparos (en el mundo). */
  draw(ctx, camX, g) {
    for (const r of this.ramps) drawRamp(ctx, r.x - camX, g.view.groundY, g.t);
    for (const s of this.shots) {
      const x = s.x - camX;
      if (s.kind === 'rocket') {
        drawGlow(ctx, x - 16, s.y, 26, 'rgba(255, 150, 60, 0.95)', 1);
        ctx.fillStyle = '#ff5a3d';
        ctx.beginPath();
        ctx.moveTo(x + 14, s.y);
        ctx.lineTo(x - 10, s.y - 6);
        ctx.lineTo(x - 10, s.y + 6);
        ctx.fill();
        continue;
      }
      ctx.strokeStyle = 'rgba(255, 240, 180, 0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, s.y);
      ctx.lineTo(x - s.vx * 0.015, s.y - s.vy * 0.015);
      ctx.stroke();
    }
  }

  /** Filtros de pantalla de las habilidades. */
  drawOverlay(ctx, g, input) {
    const v = g.view;
    if (this.has('bullettime')) {
      const k = Math.min(1, this.effects.bullettime * 2, (CONFIG.characters.veteran.bulletTime.duration - this.effects.bullettime) * 4);
      // desaturar + tono sepia
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = `rgba(128, 128, 128, ${0.75 * k})`;
      ctx.fillRect(0, 0, v.w, v.h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(170, 115, 45, ${0.28 * k})`;
      ctx.fillRect(0, 0, v.w, v.h);
      vignette(ctx, v, `rgba(40, 20, 5, ${0.55 * k})`);
      // retícula de apuntar
      const pt = input.pointer;
      if (pt && pt.x > 0) {
        ctx.strokeStyle = '#ffd23f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 14, 0, Math.PI * 2);
        ctx.moveTo(pt.x - 20, pt.y);
        ctx.lineTo(pt.x - 8, pt.y);
        ctx.moveTo(pt.x + 8, pt.y);
        ctx.lineTo(pt.x + 20, pt.y);
        ctx.moveTo(pt.x, pt.y - 20);
        ctx.lineTo(pt.x, pt.y - 8);
        ctx.moveTo(pt.x, pt.y + 8);
        ctx.lineTo(pt.x, pt.y + 20);
        ctx.stroke();
      }
    }
    if (this.has('rage')) vignette(ctx, v, `rgba(255, 30, 40, ${0.28 + 0.12 * Math.sin(g.t * 12)})`);
    if (this.has('nitro')) {
      ctx.strokeStyle = 'rgba(200, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 14; i++) {
        const y = ((i * 97 + g.t * 50) % v.h);
        const x = v.w - ((g.t * 2400 + i * 211) % (v.w + 300));
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 120, y);
        ctx.stroke();
      }
    }
  }

  /** Panel del personaje: retrato, habilidades activas y escudos. */
  drawHud(ctx, g) {
    if (!this.def) return;
    const v = g.view;
    const x = 14;
    const y = v.h - 66;
    const def = this.def;
    drawGlow(ctx, x + 26, y + 26, 40, def.rgba, 0.5);
    drawSprite(ctx, capsuleSprite(def.id), x + 26, y + 26, 0.95, 0.95);
    outlinedText(ctx, t(`char.${def.id}.alias`).toUpperCase(), x + 56, y + 2, 16, def.color);
    let ix = x + 70;
    const iy = y + 40;
    for (const [k, left] of Object.entries(this.effects)) {
      if (left <= 0) continue;
      const total = this.totalFor(k);
      drawSprite(ctx, itemSprite(k), ix, iy, 0.62, 0.62);
      ctx.strokeStyle = '#1b1030';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(ix, iy, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ix, iy, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(left / total, 0, 1));
      ctx.stroke();
      ix += 38;
    }
    for (const s of this.shields) {
      if (s === 'bike') continue; // la moto ya aparece como efecto
      drawSprite(ctx, itemSprite(s), ix, iy, 0.62, 0.62);
      ix += 38;
    }
  }

  totalFor(k) {
    const C = CONFIG.characters;
    return {
      bullettime: C.veteran.bulletTime.duration,
      pistol: C.veteran.pistol.duration,
      drive: C.pilot.drive.duration,
      nitro: C.pilot.nitro.duration,
      rage: C.wild.rage.duration,
      bike: C.wild.bike.duration,
    }[k] ?? 1;
  }
}

function vignette(ctx, v, color) {
  const g = ctx.createRadialGradient(v.w / 2, v.h / 2, v.h * 0.35, v.w / 2, v.h / 2, v.w * 0.7);
  g.addColorStop(0, color.replace(/[\d.]+\)$/, '0)'));
  g.addColorStop(1, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, v.w, v.h);
}
