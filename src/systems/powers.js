import { CONFIG } from '../config.js';
import { rand, chance, pick, clamp } from '../core/rng.js';
import { t, getLang } from '../core/i18n.js';
import { Voice } from '../core/voice.js';
import { Sound } from '../core/audio.js';
import { CHARACTERS, CHARACTER_IDS, ITEM_OWNER } from '../characters/defs.js';
import { capsuleSprite, itemSprite } from '../characters/icons.js';
import { drawRamp } from '../characters/vehicles.js';
import { playTransformFx, DEFAULT_FX } from '../characters/transformfx.js';
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
    this.charge = 0;      // carga de la habilidad especial (se llena con orbes)
    this.totals = {};     // duración total de cada efecto activo (para las barras)
    this.boostTarget = 0;
    this.readyFlash = 0;
  }

  /** Recoger pavos carga la habilidad especial; al llenarse se activa sola. */
  addCharge(value, g) {
    if (!this.def || this.has(this.def.special)) return;
    this.charge += value;
    if (this.charge >= CONFIG.characters.specialCharge) {
      this.charge = 0;
      this.readyFlash = 1;
      this.activate(this.def.special, g);
    }
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
    return this.invuln > 0 || this.has('drive') || this.has('nitro') || this.has('rage') || this.has('boost');
  }

  /** Atraviesa y destruye lo que toca. */
  get smashing() {
    return this.has('nitro') || this.has('rage') || this.has('boost');
  }

  /** Consumible "arranque rápido": vuela invulnerable unos metros. */
  startBoost(g, meters) {
    this.boostTarget = g.distance + meters;
    this.effects.boost = 999;
    this.totals.boost = 999;
    g.popups.add(t('consumable.headstart'), g.view.w / 2, 190, { color: '#7ff7ff', size: 30, life: 1.6, rise: 10 });
    Sound.nitro();
  }

  /** Duración de un efecto con las mejoras de la tienda aplicadas. */
  duration(item, base, g) {
    const U = g.upg;
    const special = this.def && item === this.def.special;
    return special ? base + (U?.specialSeconds ?? 0) : base * (U?.gadgetMult ?? 1);
  }

  setEffect(item, base, g) {
    const d = this.duration(item, base, g);
    this.effects[item] = d;
    this.totals[item] = d;
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
    if (this.has('boost')) m.speed *= CONFIG.shop.consumables.headstart.speedMult;
    const riding = this.has('ride') && player.onFoot;
    if (riding) {
      const R = CONFIG.foot.rides[this.rideKind];
      m.speed *= R.speedMult;
      m.jump = R.jumpMult;
    }
    player.mods = m;
    player.style = this.def ? this.def.style : 'base';
    player.look = player.looks?.[player.style] ?? null;
    player.vehicle = this.has('drive') ? 'car' : this.has('bike') ? 'bike' : riding ? this.rideKind : null;
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
    if (this.char === 'base' && g.player.onFoot) {
      // a pie: el jetpack (cuando toca) o un vehículo de vez en cuando
      if (g.foot.jetDue(g)) return { kind: 'jetpack' };
      const R = CONFIG.foot.rides;
      if (!this.has('ride') && g.distance >= R.from && g.foot.rideCd <= 0 && chance(R.chance)) {
        g.foot.rideCd = R.cooldown;
        return { kind: 'ride', ride: pick(['scooter', 'cart']) };
      }
      return null;
    }
    if (this.char === 'base') {
      if (g.distance >= C.capsuleFrom && this.capsuleCd <= 0 && chance(C.capsuleChance * (g.upg?.capsuleMult ?? 1))) {
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
    if (tk.kind === 'jetpack') {
      if (g.player.onFoot) g.foot.equip(g);
      return;
    }
    if (tk.kind === 'ride') {
      if (g.player.onFoot) g.foot.startRide(tk.ride, g);
      return;
    }
    if (tk.kind === 'capsule') {
      this.transform(tk.char, g);
    } else if (ITEM_OWNER[tk.item] === this.char) {
      this.activate(tk.item, g);
    } else {
      // icono de otro personaje (lo perdiste antes de cogerlo): pequeño premio
      g.earn('tokens', 5);
      g.popups.add('+5', tk.x - g.camera.x, tk.y - 20, { color: '#ffd23f', size: 22 });
    }
  }

  // ---------------- TRANSFORMACIÓN ----------------

  transform(id, g) {
    const C = CONFIG.characters;
    const def = CHARACTERS[id];
    // un personaje siempre va con su jetpack debajo (capa intermedia)
    if (g.player.onFoot) {
      if (!g.foot.everJet) g.foot.firstJetAt = g.distance;
      g.foot.everJet = true;
      g.player.onFoot = false;
    }
    this.char = id;
    this.lastChar = id;
    // se conservan el arranque rápido y la burbuja de los consumibles
    this.effects = this.has('boost') ? { boost: this.effects.boost } : {};
    this.shields = this.shields.filter((sh) => sh === 'bubble');
    this.charge = C.specialCharge * C.startCharge;
    this.invuln = C.transformInvuln;
    this.slowmo = C.transformSlowmo;
    this.itemCd = 2;
    this.uses[id] = (this.uses[id] ?? 0) + 1;
    const p = g.player;
    // efecto común: destello, anillos
    g.flash = Math.max(g.flash, 0.6);
    g.particles.spawn({ x: p.x, y: p.y, life: 0.5, size: 20, sizeEnd: 170, color: def.rgba, shape: 'glow', additive: true, important: true });
    for (let k = 0; k < 3; k++) {
      g.particles.spawn({ x: p.x, y: p.y, life: 0.45 + k * 0.15, size: 8, sizeEnd: 80 + k * 40, color: k === 1 ? '#ffffff' : def.color, shape: 'ring', additive: true, important: true });
    }
    // efecto de transformación (el equipado en el vestuario)
    const fx = g.player.looks?.[id]?.fx ?? DEFAULT_FX[id];
    const r = playTransformFx(fx, g.particles, p.x, p.y, g.view.groundY, def.color);
    g.camera.addShake(r.shake);
    g.flash = Math.max(g.flash, r.flash);
    // espiral de chispas en el color del personaje
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      g.particles.spawn({
        x: p.x + Math.cos(a) * 50,
        y: p.y + Math.sin(a) * 50,
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
    g.hud.portraitPop = 1;
    Sound.transformChar(id);
    // la frase se dice un instante después del efecto de sonido
    this.say(id, 'coger', 450);
  }

  detransform(g) {
    const def = this.def;
    const p = g.player;
    this.char = 'base';
    this.effects = this.has('boost') ? { boost: this.effects.boost } : {};
    this.shields = this.shields.filter((sh) => sh === 'bubble');
    this.invuln = CONFIG.characters.detransformInvuln;
    this.charge = 0;
    this.itemCd = 0;
    g.camera.addShake(0.5);
    g.flash = Math.max(g.flash, 0.4);
    g.particles.burst(p.x, p.y, 16, { color: 'rgba(80, 70, 100, 0.6)', speed: 160, life: 0.9, size: 8, sizeEnd: 20, drag: 2.5, important: true });
    g.particles.burst(p.x, p.y, 18, { color: def.color, speed: 340, life: 0.8, size: 4, shape: 'rect', spin: 12, gravity: 900, important: true });
    g.popups.add(t('char.lost'), p.x - g.camera.x, p.y - 60, { color: '#ff6b7d', size: 22, life: 1.3 });
    Sound.detransform();
    this.say(def.id, 'perder', 250);
  }

  /** Frase del personaje (archivo grabado o voz del navegador) con un pequeño retraso. */
  say(id, moment, delayMs = 0) {
    const lang = getLang();
    const text = t(`voice.${id}.${moment}`);
    setTimeout(() => Voice.say(id, moment, lang, text), delayMs);
  }

  // ---------------- HABILIDADES Y GADGETS ----------------

  activate(item, g) {
    const C = CONFIG.characters;
    const p = g.player;
    const def = this.def;
    const special = item === def.special;
    if (g.stats) special ? g.stats.specials++ : g.stats.gadgets++;
    g.popups.add(t(`item.${item}`), special ? g.view.w / 2 : p.x - g.camera.x, special ? 190 : p.y - 64, { color: def.color, size: special ? 34 : 22, life: 1.4, rise: special ? 12 : 50 });
    g.particles.spawn({ x: p.x, y: p.y, life: 0.4, size: 10, sizeEnd: special ? 160 : 90, color: def.rgba, shape: 'ring', additive: true, important: true });
    g.particles.spawn({ x: p.x, y: p.y, life: 0.3, size: 14, sizeEnd: special ? 140 : 70, color: def.rgba, shape: 'glow', additive: true, important: true });
    if (special) {
      g.flash = Math.max(g.flash, 0.5);
      g.camera.addShake(0.35);
      g.hud.specialPop = 1;
      this.say(this.char, 'habilidad', 150);
    }
    Sound.powerUp();
    switch (item) {
      case 'bullettime':
        this.setEffect('bullettime', C.veteran.bulletTime.duration, g);
        Sound.bulletTime();
        break;
      case 'pistol':
        this.setEffect('pistol', C.veteran.pistol.duration, g);
        Sound.cock();
        break;
      case 'vest':
        for (let k = 0; k < C.veteran.vest.hits; k++) this.shields.push('vest');
        g.particles.spawn({ x: p.x, y: p.y, life: 0.5, size: 30, sizeEnd: 60, color: 'rgba(127, 247, 232, 0.9)', shape: 'ring', additive: true, important: true });
        Sound.shield();
        break;
      case 'drive':
        this.setEffect('drive', C.pilot.drive.duration, g);
        g.camera.addShake(0.3);
        g.particles.burst(p.x - 20, g.view.groundY - 8, 16, { color: 'rgba(220, 220, 235, 0.6)', speed: 180, life: 1, size: 8, sizeEnd: 24, drag: 2.5, vy: -50, important: true });
        Sound.skid();
        break;
      case 'nitro':
        this.setEffect('nitro', C.pilot.nitro.duration, g);
        g.camera.addShake(0.45);
        g.flash = Math.max(g.flash, 0.4);
        g.particles.burst(p.x - 30, p.y, 24, { color: '#7ff7ff', speed: 500, life: 0.4, size: 4, sizeEnd: 0, additive: true, vx: -300, important: true });
        Sound.nitro();
        break;
      case 'ramp':
        this.placeRamp(g);
        break;
      case 'rage':
        this.setEffect('rage', C.wild.rage.duration, g);
        g.camera.addShake(0.7);
        g.flash = 1;
        g.particles.spawn({ x: p.x, y: p.y, life: 0.5, size: 10, sizeEnd: 260, color: '#ff3d4f', shape: 'ring', additive: true, important: true });
        Sound.rage();
        break;
      case 'rocket':
        g.camera.addShake(0.3);
        this.shots.push({ kind: 'rocket', x: p.x + 20, y: p.y - 6, vx: g.speed + 900, vy: 0, life: C.wild.rocket.delay });
        Sound.launch();
        break;
      case 'bike':
        this.setEffect('bike', C.wild.bike.duration, g);
        if (!this.shields.includes('bike')) this.shields.push('bike');
        Sound.engine();
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
      if (s === 'ride') this.effects.ride = 0;
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
    // con jetpack: lo pierdes y sigues a pie
    if (!g.player.onFoot) {
      g.destroyObstacle(o);
      g.foot.lose(g);
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
    this.readyFlash = Math.max(0, this.readyFlash - dt);
    // fin del arranque rápido
    if (this.has('boost') && g.distance >= this.boostTarget) {
      this.effects.boost = 0;
      this.invuln = 1.5;
      g.camera.addShake(0.3);
    }
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
    if ((this.has('nitro') || this.has('boost')) && Math.random() < dt * 50) {
      g.particles.spawn({ x: p.x - 30, y: p.y + rand(-14, 14), vx: rand(-260, -120), life: 0.3, size: 6, sizeEnd: 1, color: '#7ff7ff', additive: true });
    }

    this.updateShots(dt * g.timeScale, g);
  }

  onEffectEnd(k, g) {
    if (k === 'ride') {
      this.shields = this.shields.filter((s) => s !== 'ride');
      g.popups.add(t('foot.rideEnd'), g.player.x - g.camera.x, g.player.y - 50, { color: '#fff4dc', size: 18, life: 1 });
    }
    if (k === 'bike') this.shields = this.shields.filter((s) => s !== 'bike');
    if (k === 'drive') g.player.vy = -300;
  }

  findTarget(g, range) {
    const p = g.player;
    let best = null;
    let bestD = Infinity;
    for (const o of g.obstacles) {
      if (!o.alive || o.ko) continue;
      if (o.type === 'missile' && o.state !== 'fly') continue;
      if (o.type === 'dog' && o.state === 'warn') continue;
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
      if (!o.alive || o.ko) continue;
      if (o.type === 'dog' && o.state === 'warn') continue;
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

  /** Rampas, disparos y escudo burbuja (en el mundo). */
  draw(ctx, camX, g) {
    if (this.shields.includes('bubble') && !g.dead) {
      const p = g.player;
      const x = p.x - camX;
      const r = 40 + Math.sin(g.t * 5) * 2;
      drawGlow(ctx, x, p.y, r + 10, 'rgba(127, 247, 232, 0.8)', 0.35);
      ctx.strokeStyle = 'rgba(190, 255, 250, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.ellipse(x - r * 0.45, p.y - r * 0.5, 7, 4, -0.6, 0, Math.PI * 2);
      ctx.fill();
    }
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
    if (this.has('nitro') || this.has('boost')) {
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

  /**
   * Panel del personaje (abajo a la izquierda): retrato grande, nombre,
   * barra de la habilidad especial y gadgets/escudos activos.
   */
  drawHud(ctx, g) {
    if (!this.def) return;
    const v = g.view;
    const def = this.def;
    const C = CONFIG.characters;
    const pop = g.hud.portraitPop ?? 0;
    const x = 14;
    const y = v.h - 84;
    const w = 206;
    // fondo
    ctx.fillStyle = 'rgba(20, 10, 40, 0.72)';
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 3;
    roundRectPath(ctx, x, y, w, 70, 14);
    ctx.fill();
    ctx.stroke();
    // retrato
    const s = 1.05 + pop * 0.35 * Math.abs(Math.sin(pop * 10));
    drawGlow(ctx, x + 36, y + 35, 48 * s, def.rgba, 0.45 + pop * 0.5);
    drawSprite(ctx, capsuleSprite(def.id), x + 36, y + 35, s, s);
    // nombre
    outlinedText(ctx, t(`char.${def.id}.alias`).toUpperCase(), x + 70, y + 8, 17, def.color);
    // barra de la habilidad especial
    const bx = x + 96;
    const by = y + 40;
    const bw = w - 108;
    const active = this.has(def.special);
    const frac = active ? this.effects[def.special] / this.totalFor(def.special) : this.charge / C.specialCharge;
    drawSprite(ctx, itemSprite(def.special), x + 82, by + 6, 0.62, 0.62);
    ctx.fillStyle = '#1b1030';
    roundRectPath(ctx, bx - 2, by - 2, bw + 4, 16, 8);
    ctx.fill();
    if (active) drawGlow(ctx, bx + bw * frac / 2, by + 6, bw * 0.6, def.rgba, 0.5 + 0.3 * Math.sin(g.t * 12), 14);
    ctx.fillStyle = def.color;
    roundRectPath(ctx, bx, by, Math.max(6, bw * clamp(frac, 0, 1)), 12, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(bx + 4, by + 2, Math.max(0, bw * clamp(frac, 0, 1) - 8), 3);
    const label = active ? t(`item.${def.special}`) : t('hud.special');
    const text = label.replace(/[¡!]/g, '');
    let fs = 10;
    ctx.font = `${fs}px 'Bungee', Impact, sans-serif`;
    while (fs > 6 && ctx.measureText(text).width > bw - 10) {
      fs -= 0.5;
      ctx.font = `${fs}px 'Bungee', Impact, sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1b1030';
    ctx.fillText(text, bx + bw / 2, by + 7);
    // gadgets activos y escudos, en fila encima del panel
    let ix = x + 22;
    const iy = y - 26;
    for (const [k, left] of Object.entries(this.effects)) {
      if (left <= 0 || k === def.special || !ITEM_OWNER[k]) continue;
      drawSprite(ctx, itemSprite(k), ix, iy, 0.8, 0.8);
      ctx.strokeStyle = '#1b1030';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(ix, iy, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(ix, iy, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(left / this.totalFor(k), 0, 1));
      ctx.stroke();
      ix += 48;
    }
    for (const sh of this.shields) {
      if (sh === 'bike') continue;
      if (sh === 'bubble') {
        drawGlow(ctx, ix, iy, 24, 'rgba(127, 247, 232, 0.8)', 0.5);
        ctx.strokeStyle = '#bffff8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(ix, iy, 15, 0, Math.PI * 2);
        ctx.stroke();
        ix += 48;
        continue;
      }
      drawGlow(ctx, ix, iy, 26, 'rgba(127, 247, 232, 0.8)', 0.4);
      drawSprite(ctx, itemSprite(sh), ix, iy, 0.8, 0.8);
      ix += 48;
    }
  }

  totalFor(k) {
    if (this.totals[k]) return this.totals[k];
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

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function vignette(ctx, v, color) {
  const g = ctx.createRadialGradient(v.w / 2, v.h / 2, v.h * 0.35, v.w / 2, v.h / 2, v.w * 0.7);
  g.addColorStop(0, color.replace(/[\d.]+\)$/, '0)'));
  g.addColorStop(1, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, v.w, v.h);
}
