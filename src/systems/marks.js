// MARCAS DE OTROS JUGADORES en el recorrido (desde el ranking de Supabase)
//
// Se descargan UNA vez al empezar la partida (main.js → Online.ghostMarks):
// unos pocos jugadores justo por encima de tu récord y algunos del top 10.
// Durante la partida no hay red: solo se comparan distancias.
// Al acercarte a una marca aparece una bandera pequeña arriba con su apodo
// (nunca más de una a la vez) y, al superarla, "¡Has superado a X!".
// Sin conexión, o si las ocultas en Ajustes, no se muestra nada.

import { CONFIG } from '../config.js';
import { t } from '../core/i18n.js';
import { Sound } from '../core/audio.js';
import { clamp } from '../core/rng.js';

export class Marks {
  constructor() {
    this.reset();
  }

  reset() {
    this.list = [];
    this.run = (this.run ?? 0) + 1; // para descartar respuestas de partidas anteriores
  }

  /**
   * @param rows  [{nick, distance}] del servidor (ordenados o no)
   * @param best  tu récord · own: tu apodo (se excluye)
   */
  set(rows, best, own, startAt = 0) {
    const M = CONFIG.online.marks;
    const mine = (own ?? '').toLowerCase();
    const all = rows
      .filter((r) => r && r.nick && r.distance > startAt + 10 && r.nick.toLowerCase() !== mine)
      .sort((a, b) => a.distance - b.distance);
    // justo por encima de tu récord…
    const near = all.filter((r) => r.distance > best).slice(0, M.near);
    // …y algunos del top (el primero, el del medio y el último de los que hay)
    const top = all.slice(-M.top);
    const pickTop = [];
    if (top.length) {
      const idx = M.topShow >= top.length ? top.map((_, i) => i) : Array.from({ length: M.topShow }, (_, i) => Math.round((i * (top.length - 1)) / Math.max(1, M.topShow - 1)));
      for (const i of idx) pickTop.push(top[i]);
    }
    const seen = new Set();
    this.list = [...near, ...pickTop]
      .filter((r) => !seen.has(r.nick) && seen.add(r.nick))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, M.max)
      .map((r) => ({ nick: r.nick, distance: r.distance, passed: false, passedT: 0 }));
  }

  update(dt, g) {
    if (!this.list.length || g.dead) return;
    for (const m of this.list) {
      if (m.passed) {
        m.passedT += dt;
        continue;
      }
      if (g.distance >= m.distance) {
        m.passed = true;
        g.popups.add(t('marks.passed', { nick: m.nick }), g.view.w / 2, 140, { color: '#9ff8ff', size: 18, life: 1.6, rise: 12 });
        Sound.coin(7);
      }
    }
  }

  /** Bandera pequeña arriba (solo una a la vez: la próxima, o la recién superada). */
  draw(ctx, g) {
    if (!this.list.length || g.dead) return;
    const M = CONFIG.online.marks;
    const ppm = CONFIG.world.pxPerMeter;
    const v = g.view;
    let m = this.list.find((k) => k.passed && k.passedT < M.linger);
    if (!m) m = this.list.find((k) => !k.passed && k.distance * ppm - g.camera.x < v.w + M.ahead);
    if (!m) return;
    const sx = m.distance * ppm - g.camera.x;
    const x = clamp(sx, 30, v.w - 30);
    const fade = m.passed ? 1 - m.passedT / M.linger : clamp((v.w + M.ahead - sx) / 120, 0, 1);
    const y = M.y;
    ctx.save();
    ctx.globalAlpha = M.alpha * fade;
    // mástil
    ctx.fillStyle = 'rgba(255, 244, 220, 0.85)';
    ctx.fillRect(x - 1, y, 2, 30);
    // banderín con el apodo
    ctx.font = "11px 'Bungee', Impact, sans-serif";
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const label = `${m.nick} · ${Math.round(m.distance)} m`;
    const w = ctx.measureText(label).width + 12;
    ctx.fillStyle = 'rgba(27, 16, 48, 0.82)'; // oscuro: se lee sobre cualquier cielo
    ctx.beginPath();
    ctx.moveTo(x + 1, y);
    ctx.lineTo(x + 1 + w, y);
    ctx.lineTo(x + 1 + w - 6, y + 8);
    ctx.lineTo(x + 1 + w, y + 16);
    ctx.lineTo(x + 1, y + 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = m.passed ? '#7dffb0' : '#9fd8ff';
    ctx.fillRect(x + 1, y, 3, 16);
    ctx.fillStyle = '#fff4dc';
    ctx.fillText(label, x + 7, y + 8.5);
    // línea muy tenue que marca el metro exacto (solo si está en pantalla)
    if (sx > 0 && sx < v.w) {
      ctx.globalAlpha *= 0.25;
      ctx.setLineDash([3, 6]);
      ctx.strokeStyle = '#fff4dc';
      ctx.beginPath();
      ctx.moveTo(sx, y + 30);
      ctx.lineTo(sx, v.groundY);
      ctx.stroke();
    }
    ctx.restore();
  }
}
