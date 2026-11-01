import { outlinedText } from '../ui/hud.js';

/** Textos emergentes en coordenadas de pantalla. */
export class Popups {
  constructor() {
    this.list = [];
  }

  clear() {
    this.list.length = 0;
  }

  add(text, x, y, opts = {}) {
    this.list.push({
      text,
      x,
      y,
      color: opts.color ?? '#fff4dc',
      size: opts.size ?? 22,
      life: opts.life ?? 1,
      maxLife: opts.life ?? 1,
      rise: opts.rise ?? 50,
    });
    if (this.list.length > 30) this.list.shift();
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      p.y -= p.rise * dt;
      if (p.life <= 0) this.list.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const p of this.list) {
      const k = p.life / p.maxLife;
      const age = 1 - k;
      // pequeño "pop" al aparecer
      const scale = age < 0.12 ? 0.6 + (age / 0.12) * 0.5 : 1.1 - Math.min(0.1, (age - 0.12));
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 2.5);
      ctx.translate(p.x, p.y);
      ctx.scale(scale, scale);
      outlinedText(ctx, p.text, 0, 0, p.size, p.color, 'center');
      ctx.restore();
    }
  }
}
