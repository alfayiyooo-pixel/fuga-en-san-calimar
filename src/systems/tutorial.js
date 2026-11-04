// TUTORIAL INTEGRADO (solo en la primera partida, o si lo reactivas en Ajustes)
// Pistas breves en el momento justo, de una en una, sin pausar el juego:
//   jump     a pie, cuando se acerca el primer obstáculo       "Toca para saltar"
//   double   en el aire, desde el 2.º salto                    "Toca otra vez en el aire"
//   hold     al coger el jetpack                               "Mantén pulsado para volar"
//   release  si subes mucho con el jetpack                     "Suelta para bajar"
//   danger   al ver el primer peligro                          "Borde rojo y amarillo = hace daño"
//   capsule  al ver la primera cápsula de personaje            "Coge la cápsula…"
//   hideout  al ver el primer escondite                        "Atraviesa el escondite…"
// Cada pista desaparece al hacerlo o tras unos segundos (CONFIG.tutorial).

import { CONFIG } from '../config.js';
import { t } from '../core/i18n.js';
import { Save } from '../core/storage.js';
import { Sound } from '../core/audio.js';

const INK = '#1b1030';
const ICON = { jump: '👆', double: '👆👆', hold: '✋', release: '🖐️', danger: '⚠️', capsule: '🧪', hideout: '🕳️' };

export class Tutorial {
  constructor() {
    this.active = false;
  }

  /** ¿Toca tutorial en esta partida? */
  static wanted() {
    const s = Save.data.settings.tutorial;
    if (!CONFIG.tutorial.enabled || s === 'off') return false;
    return s === 'on' || (Save.data.stats.runs ?? 0) === 0;
  }

  reset(on) {
    this.active = on;
    this.done = {};
    this.cur = null;
    this.wait = 0;
    this.jumps = 0;
    this.holdT = 0;
    this.releaseT = 0;
  }

  /** La partida terminó: el tutorial no vuelve a salir (hasta que lo reactives). */
  finish() {
    if (!this.active) return;
    this.active = false;
    if (Save.data.settings.tutorial !== 'off') {
      Save.data.settings.tutorial = 'off';
      Save.save();
    }
  }

  show(id) {
    this.cur = { id, t: 0 };
    Sound.tick();
  }

  complete(id) {
    this.done[id] = true;
    if (this.cur?.id === id) {
      this.cur = null;
      this.wait = CONFIG.tutorial.gap;
    }
  }

  /**
   * @param ev   eventos del paso del jugador ({jumped, doubleJumped})
   * @param held botón pulsado
   */
  update(dt, g, ev, held) {
    if (!this.active || g.dead) return;
    const T = CONFIG.tutorial;
    const p = g.player;
    if (ev.jumped) this.jumps++;
    // condiciones de "hecho" (aunque la pista no se esté viendo)
    if (ev.jumped) this.complete('jump');
    if (ev.doubleJumped) this.complete('double');
    if (!p.onFoot) {
      this.holdT = held ? this.holdT + dt : this.holdT;
      if (this.holdT >= T.hold.need) this.complete('hold');
      if (this.done.hold) {
        this.releaseT = held ? 0 : this.releaseT + dt;
        if (this.cur?.id === 'release' && this.releaseT > 0.3) this.complete('release');
      }
    }
    if (this.cur) {
      this.cur.t += dt;
      const id = this.cur.id;
      if (this.cur.t > (T[id]?.max ?? 3)) this.complete(id);
      // ya no tiene sentido: p. ej. pistas de pie cuando ya vuelas
      if ((id === 'jump' || id === 'double') && !p.onFoot) this.complete(id);
      if (id === 'capsule' && g.powers.char !== 'base') this.complete(id);
      return;
    }
    this.wait -= dt;
    if (this.wait > 0) return;
    const next = this.pick(g);
    if (next) this.show(next);
  }

  /** Siguiente pista que toca, si alguna. */
  pick(g) {
    const T = CONFIG.tutorial;
    const p = g.player;
    const camR = g.camera.x + g.view.w;
    const ahead = (sec) => p.x + Math.max(g.speed, 200) * sec;
    const D = this.done;
    if (p.onFoot && !D.jump && !g.intro.active) {
      const near = g.obstacles.some((o) => o.alive && !o.ko && (o.static || (o.minor && o.grounded)) && g.centerOf(o).x > p.x && g.centerOf(o).x < ahead(T.jump.ahead));
      if (near) return 'jump';
    }
    if (p.onFoot && D.jump && !D.double && this.jumps >= T.double.afterJumps && !p.onGround && p.vy < 0 && p.airJumps > 0) return 'double';
    if (!p.onFoot && !D.hold && !p.vehicle) return 'hold';
    if (!p.onFoot && D.hold && !D.release && p.y < g.view.groundY - T.release.height) return 'release';
    if (!D.danger && D.jump && g.obstacles.some((o) => o.alive && !o.ko && o.police && g.centerOf(o).x < camR && g.centerOf(o).x > p.x)) return 'danger';
    if (!D.capsule && g.tokens.list.some((tk) => tk.alive && tk.kind === 'capsule' && tk.x < camR && tk.x > p.x)) return 'capsule';
    if (!D.hideout && g.obstacles.some((o) => o.alive && o.type === 'hideout' && o.x < camR && o.x > p.x)) return 'hideout';
    return null;
  }

  /** Pista en pantalla: cartel con un icono que late, abajo en el centro. */
  draw(ctx, g) {
    if (!this.active || !this.cur) return;
    const v = g.view;
    const { id, t: age } = this.cur;
    const k = Math.min(1, age / 0.18);
    const out = Math.max(0, Math.min(1, ((CONFIG.tutorial[id]?.max ?? 3) - age) / 0.25));
    const a = Math.min(k, out);
    const text = t(`tut.${id}`);
    const cx = v.w / 2;
    const cy = v.h * 0.68;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = "20px 'Bungee', Impact, sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 78;
    const h = 46;
    const sc = 0.9 + 0.1 * k + Math.sin(age * 6) * 0.02;
    ctx.translate(cx, cy);
    ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(27, 16, 48, 0.88)';
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
    ctx.fill();
    ctx.strokeStyle = '#9dffb5';
    ctx.lineWidth = 3;
    ctx.stroke();
    // icono que "pulsa"
    const press = (id === 'hold' ? 0.5 : 0.5 + 0.5 * Math.sin(age * 9)) * 4;
    ctx.font = '22px sans-serif';
    ctx.fillText(ICON[id] ?? '👆', -w / 2 + 28, press - 2);
    ctx.font = "20px 'Bungee', Impact, sans-serif";
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.strokeText(text, 20, 1);
    ctx.fillStyle = '#fff4dc';
    ctx.fillText(text, 20, 1);
    ctx.restore();
  }
}
