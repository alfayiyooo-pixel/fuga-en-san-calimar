import { CONFIG } from '../config.js';
import { rand } from '../core/rng.js';
import { t } from '../core/i18n.js';
import { Sound } from '../core/audio.js';

/**
 * Estado "a pie": cuándo aparece el jetpack para cogerlo, multiplicador x2
 * de pavos mientras no lo hayas cogido nunca y estadísticas para misiones.
 */
export class Foot {
  reset(g) {
    const J = CONFIG.foot.jetpack;
    this.everJet = false;          // ¿has llevado el jetpack en esta partida?
    this.nextJetAt = g.distance + rand(J.firstAt[0], J.firstAt[1]);
    this.runStart = g.distance;    // metros en los que empezaste a ir a pie
    this.max = 0;                  // mayor tramo a pie (m)
    this.rides = 0;
    this.rideCd = 0;
  }

  /** Multiplicador de pavos: x2 mientras vas a pie sin haber cogido el jetpack. */
  mult(g) {
    return g.player.onFoot && !this.everJet ? CONFIG.foot.bucksMult : 1;
  }

  get bonusActive() {
    return !this.everJet;
  }

  update(dt, g) {
    this.rideCd = Math.max(0, this.rideCd - dt);
    if (g.player.onFoot) this.max = Math.max(this.max, g.distance - this.runStart);
  }

  /** Metros recorridos sin haber cogido nunca el jetpack. */
  noJet(g) {
    return this.everJet ? this.firstJetAt : g.distance;
  }

  /** ¿Toca poner un jetpack en el próximo grupo de pavos? */
  jetDue(g) {
    if (!g.player.onFoot || g.distance < this.nextJetAt) return false;
    if (g.tokens.list.some((tk) => tk.kind === 'jetpack' && tk.alive)) return false;
    // si lo ignoras, vuelve a aparecer más adelante
    this.nextJetAt = g.distance + rand(...CONFIG.foot.jetpack.again);
    return true;
  }

  /** Coges el jetpack. */
  equip(g) {
    const p = g.player;
    if (!this.everJet) this.firstJetAt = g.distance;
    this.everJet = true;
    p.onFoot = false;
    p.thrust = 0;
    g.powers.effects.ride = 0;
    g.powers.shields = g.powers.shields.filter((s) => s !== 'ride');
    g.powers.applyMods(p);
    g.flash = Math.max(g.flash, 0.4);
    g.camera.addShake(0.3);
    g.particles.spawn({ x: p.x, y: p.y, life: 0.45, size: 14, sizeEnd: 120, color: 'rgba(255, 190, 90, 0.9)', shape: 'glow', additive: true, important: true });
    g.particles.spawn({ x: p.x, y: p.y, life: 0.4, size: 8, sizeEnd: 90, color: '#fff4dc', shape: 'ring', additive: true, important: true });
    g.hud.banner(t('foot.jetTitle'), t('foot.jetSub'));
    Sound.launch();
    Sound.powerUp();
  }

  /** Un golpe con jetpack: lo pierdes y sigues a pie. */
  lose(g) {
    const p = g.player;
    p.onFoot = true;
    p.thrust = 0;
    this.runStart = g.distance;
    this.nextJetAt = g.distance + rand(...CONFIG.foot.jetpack.afterLoss);
    this.spare(g);
    g.powers.invuln = CONFIG.foot.loseJetInvuln;
    g.camera.addShake(0.5);
    g.flash = Math.max(g.flash, 0.4);
    // el jetpack sale despedido echando humo
    g.particles.burst(p.x - 14, p.y, 12, { color: 'rgba(80, 70, 100, 0.6)', speed: 160, life: 0.9, size: 8, sizeEnd: 20, drag: 2.5, important: true });
    g.particles.burst(p.x - 14, p.y, 14, { color: '#c9ccd6', speed: 340, life: 0.9, size: 4, shape: 'rect', spin: 12, gravity: 900, vx: -150, important: true });
    g.popups.add(t('foot.lost'), p.x - g.camera.x, p.y - 60, { color: '#ff6b7d', size: 22, life: 1.3 });
    Sound.detransform();
    this.clearUnfair(g);
  }

  /**
   * Jetpack de repuesto: a partir de cierta distancia, al perderlo aparece
   * otro poco más adelante (como mucho una vez cada CONFIG.foot.spare.every m).
   */
  spare(g) {
    const S = CONFIG.foot.spare;
    const d = g.distance;
    if (d < S.from || d - (this.lastSpareAt ?? -1e9) < S.every) return false;
    if (g.tokens.list.some((tk) => tk.kind === 'jetpack' && tk.alive)) return false;
    this.lastSpareAt = d;
    const ppm = CONFIG.world.pxPerMeter;
    const y = g.view.groundY - S.height;
    let x = g.player.x + rand(S.ahead[0], S.ahead[1]) * ppm;
    // que no quede dentro de un obstáculo: se adelanta hasta encontrar sitio
    const free = (px) => !g.obstacles.some((o) => o.alive && (o.blocks ?? o.hits).call(o, { l: px - 30, r: px + 30, t: y - 30, b: y + 30 }));
    for (let k = 0; k < 20 && !free(x); k++) x += 40;
    g.tokens.add(x, y, 'jetpack');
    g.popups.add(t('foot.spare'), g.view.w * 0.6, 150, { color: '#9dffb5', size: 22, life: 1.8, rise: 14 });
    return true;
  }

  /**
   * A pie nada puede obligar a volar: lo que ya estaba generado para el
   * jetpack y solo se pasa volando desaparece (en pantalla, con una pequeña
   * explosión). Lo nuevo ya se genera pensando en ir a pie.
   */
  clearUnfair(g) {
    const p = g.player;
    const edge = g.camera.x + g.view.w + 40;
    for (const o of g.obstacles) {
      if (!o.alive || !o.footBlocked?.(g)) continue;
      const c = g.centerOf(o);
      if (c.x < p.x - 10) continue;
      if (c.x < edge) g.destroyObstacle(o, true);
      else o.alive = false;
    }
  }

  /** Coges un patinete o un carrito: más rápido y aguanta un golpe. */
  startRide(kind, g) {
    const R = CONFIG.foot.rides[kind];
    const P = g.powers;
    P.rideKind = kind;
    P.setEffect('ride', R.duration, g);
    if (!P.shields.includes('ride')) P.shields.push('ride');
    this.rides++;
    const p = g.player;
    g.popups.add(t(`foot.ride.${kind}`), p.x - g.camera.x, p.y - 64, { color: '#7ff7e8', size: 24, life: 1.4 });
    g.particles.burst(p.x, p.y + 20, 14, { color: '#7ff7ff', speed: 260, life: 0.5, size: 3, sizeEnd: 0, additive: true, important: true });
    if (kind === 'cart') Sound.clank();
    Sound.horn();
    Sound.powerUp();
  }
}
