import { hash } from '../core/rng.js';

/**
 * Fondo con parallax de 3 capas + cielo + suelo.
 * El decorado es procedural y determinista: cada "hueco" i de una capa
 * genera siempre el mismo elemento (hash(i)), así no hay que guardarlo.
 */
export class Parallax {
  drawBackground(ctx, v, camX, t, theme) {
    // cielo
    const [top, mid, bottom] = theme.sky;
    const sky = ctx.createLinearGradient(0, 0, 0, v.groundY);
    sky.addColorStop(0, top);
    sky.addColorStop(0.55, mid);
    sky.addColorStop(1, bottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, v.w, v.h);

    // sol
    const s = theme.sun;
    if (s) {
      const sx = v.w * s.x;
      const glow = ctx.createRadialGradient(sx, s.y, s.r * 0.6, sx, s.y, s.r * 3.2);
      glow.addColorStop(0, s.glow);
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(sx - s.r * 3.2, s.y - s.r * 3.2, s.r * 6.4, s.r * 6.4);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(sx, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // nubes (capa casi fija)
    this.drawClouds(ctx, v, camX, theme);

    theme.backdrop?.(ctx, v, camX, t);

    theme.layers.forEach((layer, li) => this.drawLayer(ctx, v, camX, t, layer, li));
  }

  drawClouds(ctx, v, camX, theme) {
    const factor = 0.05;
    const spacing = 360;
    const offset = camX * factor;
    const first = Math.floor(offset / spacing) - 1;
    const last = Math.ceil((offset + v.w) / spacing) + 1;
    ctx.fillStyle = theme.cloudColor;
    for (let i = first; i <= last; i++) {
      if (hash(i, 77) > 0.6) continue;
      const x = i * spacing - offset + hash(i, 78) * 120;
      const y = 50 + hash(i, 79) * 120;
      const w = 60 + hash(i, 80) * 70;
      ctx.beginPath();
      ctx.ellipse(x, y, w, 16, 0, 0, Math.PI * 2);
      ctx.ellipse(x - w * 0.3, y - 10, w * 0.4, 18, 0, 0, Math.PI * 2);
      ctx.ellipse(x + w * 0.25, y - 14, w * 0.45, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawLayer(ctx, v, camX, t, layer, li) {
    const offset = camX * layer.factor;
    const first = Math.floor(offset / layer.spacing) - 2;
    const last = Math.ceil((offset + v.w) / layer.spacing) + 1;
    const seed = (li + 1) * 1013;
    for (let i = first; i <= last; i++) {
      const sx = i * layer.spacing - offset;
      const r = (k) => hash(i, seed + k * 31);
      layer.draw(ctx, sx, r, v, t, i);
    }
  }

  /** Suelo de la zona; se mueve a la velocidad real (factor 1). */
  drawGround(ctx, v, camX, theme) {
    const g = theme.ground;
    const gy = v.groundY;
    const mod = (a, n) => ((a % n) + n) % n;
    ctx.fillStyle = g.body;
    ctx.fillRect(0, gy, v.w, v.h - gy);
    ctx.fillStyle = g.top;
    ctx.fillRect(0, gy, v.w, 12);
    ctx.fillStyle = g.edge;
    ctx.fillRect(0, gy + 12, v.w, 3);

    // juntas (tablones, baldosas...)
    if (g.joint) {
      ctx.fillStyle = g.line;
      for (let x = -mod(camX, g.joint); x < v.w; x += g.joint) ctx.fillRect(x, gy, 3, 12);
    }
    // vigas del paseo marítimo
    if (g.beams) {
      ctx.fillStyle = g.line;
      ctx.globalAlpha = 0.35;
      for (let x = -mod(camX, 160); x < v.w; x += 160) ctx.fillRect(x, gy + 15, 10, v.h - gy);
      ctx.globalAlpha = 1;
    }
    // bordillo pintado
    if (g.curb) {
      ctx.fillStyle = g.curb;
      for (let x = -mod(camX, 80); x < v.w; x += 80) ctx.fillRect(x, gy + 12, 40, 3);
    }
    // franjas de peligro amarillas y negras
    if (g.hazard) {
      const off = mod(camX, 40);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, gy + 15, v.w, 10);
      ctx.clip();
      ctx.fillStyle = '#f0b429';
      ctx.fillRect(0, gy + 15, v.w, 10);
      ctx.fillStyle = '#1b1030';
      for (let x = -off - 40; x < v.w + 40; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, gy + 25);
        ctx.lineTo(x + 20, gy + 15);
        ctx.lineTo(x + 30, gy + 15);
        ctx.lineTo(x + 10, gy + 25);
        ctx.fill();
      }
      ctx.restore();
    }
    // línea discontinua de carretera
    if (g.dashes) {
      ctx.fillStyle = '#fff4dc';
      const y = gy + (v.h - gy) / 2 + 4;
      for (let x = -mod(camX, 90); x < v.w; x += 90) ctx.fillRect(x, y, 46, 4);
    }
    // defensas de neumático del muelle
    if (g.bumpers) {
      ctx.fillStyle = '#1b1620';
      for (let x = -mod(camX, 200); x < v.w; x += 200) {
        ctx.beginPath();
        ctx.arc(x + 100, gy + 30, 11, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
