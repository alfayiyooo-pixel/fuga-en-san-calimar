import { hash } from '../core/rng.js';
import { Quality } from '../core/quality.js';
import { drawGlow, getRenderScale } from '../fx/sprites.js';

const CHUNK = 512;     // ancho de cada tira cacheada (px lógicos)
const BLEED = 2;      // solape para evitar costuras
const MAX_CHUNKS = 18;

/**
 * Fondo con parallax de 4 capas + cielo + suelo:
 *   cielo (degradado, sol/luna, estrellas, nubes)
 *   capa 0: silueta lejana de la ciudad (skyline)
 *   capas 1-3: las del tema (lejana, media, cercana)
 * Entre capas se pinta una bruma del color del horizonte para dar profundidad.
 * El decorado es procedural y determinista (hash(i)), no hay que guardarlo.
 */
export class Parallax {
  constructor() {
    this.skyCache = new Map();
    this.chunks = new Map();
  }

  /** hook(banda): dibuja la vida del fondo entre capas (ver world/ambient.js). */
  drawBackground(ctx, v, camX, t, theme, hook = null) {
    const q = Quality.settings;
    this.drawCachedSky(ctx, v, t, theme, q);
    this.drawClouds(ctx, v, camX, t, theme);
    if (theme.skyline) this.drawSkyline(ctx, v, camX, t, theme.skyline, q);
    this.haze(ctx, v, theme.haze, 0.55, 1);
    hook?.('sky');
    theme.backdrop?.(ctx, v, camX, t, q);
    hook?.('waterFar');
    theme.layers.forEach((layer, li) => {
      this.drawLayer(ctx, v, camX, t, layer, li, q, theme);
      if (li === 0) {
        this.haze(ctx, v, theme.haze, 0.62, 0.55);
        hook?.('far');
        hook?.('waterNear');
        hook?.('groundFar');
      }
      if (li === 1) hook?.('ground');
    });
  }

  /**
   * El cielo (degradado + sol/luna con su halo) es fijo en pantalla:
   * se pinta una vez por zona y tamaño, y luego solo se copia.
   */
  drawCachedSky(ctx, v, t, theme, q) {
    const rs = getRenderScale();
    const key = `${theme.id}:${v.w}:${rs.toFixed(2)}`;
    let c = this.skyCache.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = Math.ceil(v.w * rs);
      c.height = Math.ceil(v.h * rs);
      const cx = c.getContext('2d');
      cx.scale(rs, rs);
      this.drawSky(cx, v, 0, theme, { detail: false });
      if (this.skyCache.size > 6) this.skyCache.delete(this.skyCache.keys().next().value);
      this.skyCache.set(key, c);
    }
    ctx.drawImage(c, 0, 0, v.w, v.h);
    if (theme.stars && q.detail) this.drawStars(ctx, v, t, theme);
  }

  drawStars(ctx, v, t, theme) {
    const moon = theme.celestial?.type === 'moon' ? theme.celestial : null;
    ctx.fillStyle = '#fff8e0';
    for (let i = 0; i < 70; i++) {
      const x = hash(i, 11) * v.w;
      const y = hash(i, 12) * v.h * 0.5;
      if (moon && Math.hypot(x - v.w * moon.x, y - moon.y) < moon.r + 4) continue;
      const tw = 0.45 + 0.55 * Math.sin(t * (1 + hash(i, 13) * 3) + i);
      ctx.globalAlpha = tw * (1 - y / (v.h * 0.55));
      const sz = hash(i, 14) < 0.15 ? 2.2 : 1.3;
      ctx.fillRect(x, y, sz, sz);
    }
    ctx.globalAlpha = 1;
  }

  drawSky(ctx, v, t, theme, q) {
    const s = theme.sky;
    const sky = ctx.createLinearGradient(0, 0, 0, v.groundY);
    s.forEach((c, i) => sky.addColorStop(i / (s.length - 1), c));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, v.w, v.h);

    // estrellas (de noche)
    if (theme.stars && q.detail) {
      for (let i = 0; i < 70; i++) {
        const x = hash(i, 11) * v.w;
        const y = hash(i, 12) * v.h * 0.5;
        const tw = 0.45 + 0.55 * Math.sin(t * (1 + hash(i, 13) * 3) + i);
        ctx.globalAlpha = tw * (1 - y / (v.h * 0.55));
        ctx.fillStyle = '#fff8e0';
        const sz = hash(i, 14) < 0.15 ? 2.2 : 1.3;
        ctx.fillRect(x, y, sz, sz);
      }
      ctx.globalAlpha = 1;
    }

    const c = theme.celestial;
    if (!c) return;
    const cx = v.w * c.x;
    drawGlow(ctx, cx, c.y, c.r * 4.2, c.glow, 1);
    if (c.type === 'moon') {
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(cx, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(120, 120, 170, 0.25)';
      for (const [dx, dy, r] of [[-0.3, -0.2, 0.22], [0.25, 0.15, 0.16], [-0.05, 0.4, 0.12]]) {
        ctx.beginPath();
        ctx.arc(cx + dx * c.r, c.y + dy * c.r, r * c.r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const g = ctx.createRadialGradient(cx, c.y - c.r * 0.3, c.r * 0.1, cx, c.y, c.r);
      g.addColorStop(0, '#fffdf0');
      g.addColorStop(1, c.color);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawClouds(ctx, v, camX, t, theme) {
    const cl = theme.clouds;
    if (!cl) return;
    const factor = 0.05;
    const spacing = 360;
    const offset = camX * factor + t * 6;
    const first = Math.floor(offset / spacing) - 1;
    const last = Math.ceil((offset + v.w) / spacing) + 1;
    for (let i = first; i <= last; i++) {
      if (hash(i, 77) > 0.6) continue;
      const x = i * spacing - offset + hash(i, 78) * 120;
      const y = 50 + hash(i, 79) * 120;
      const w = 60 + hash(i, 80) * 80;
      // panza en sombra
      ctx.fillStyle = cl.shade;
      ctx.beginPath();
      ctx.ellipse(x + 4, y + 6, w, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      // cuerpo iluminado
      ctx.fillStyle = cl.color;
      ctx.beginPath();
      ctx.ellipse(x, y, w, 14, 0, 0, Math.PI * 2);
      ctx.ellipse(x - w * 0.3, y - 10, w * 0.4, 18, 0, 0, Math.PI * 2);
      ctx.ellipse(x + w * 0.25, y - 14, w * 0.45, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      if (cl.rim) {
        ctx.fillStyle = cl.rim;
        ctx.beginPath();
        ctx.ellipse(x + w * 0.25, y - 22, w * 0.3, 8, 0, Math.PI, 0);
        ctx.fill();
      }
    }
  }

  /** Silueta continua de edificios muy lejanos (capa 0). */
  drawSkyline(ctx, v, camX, t, sk, q) {
    const offset = camX * sk.factor;
    const base = v.h * sk.base;
    const first = Math.floor(offset / 40) - 1;
    const last = Math.ceil((offset + v.w) / 40) + 1;
    ctx.fillStyle = sk.color;
    ctx.beginPath();
    ctx.moveTo(-10, base + 2);
    const tops = [];
    for (let i = first; i <= last; i++) {
      const x = i * 40 - offset;
      let h;
      if (sk.style === 'mountains') {
        const wx = i * 40;
        h = sk.min + (sk.max - sk.min) * (0.5 + 0.3 * Math.sin(wx * 0.004) + 0.2 * Math.sin(wx * 0.013 + 2));
        ctx.lineTo(x, base - h);
        continue;
      }
      h = sk.min + hash(i, 501) * (sk.max - sk.min);
      ctx.lineTo(x, base - h);
      ctx.lineTo(x + 40, base - h);
      // antenas y chimeneas
      if (hash(i, 502) < 0.2) {
        const cx = x + 10 + hash(i, 503) * 20;
        const ch = sk.style === 'factory' ? 40 : 22;
        ctx.lineTo(cx - 3, base - h);
        ctx.lineTo(cx - 3, base - h - ch);
        ctx.lineTo(cx + 3, base - h - ch);
        ctx.lineTo(cx + 3, base - h);
      }
      tops.push([x, h, i]);
    }
    ctx.lineTo(v.w + 10, base + 2);
    ctx.closePath();
    ctx.fill();

    // ventanitas encendidas
    if (sk.lit && q.detail) {
      ctx.fillStyle = sk.lit;
      for (const [x, h, i] of tops) {
        const n = Math.floor(h / 14);
        for (let k = 0; k < n; k++) {
          if (hash(i * 31 + k, 504) > 0.32) continue;
          const wx = x + 6 + hash(i * 17 + k, 505) * 26;
          ctx.fillRect(wx, base - h + 8 + k * 14, 3, 3);
        }
      }
    }
  }

  /** Bruma atmosférica: más densa cerca del horizonte. */
  haze(ctx, v, color, from, strength) {
    if (!color || !Quality.settings.detail) return;
    const g = ctx.createLinearGradient(0, v.h * (from - 0.35), 0, v.groundY);
    g.addColorStop(0, color.replace(/[\d.]+\)$/, '0)'));
    g.addColorStop(1, color.replace(/[\d.]+\)$/, (a) => `${parseFloat(a) * strength})`));
    ctx.fillStyle = g;
    ctx.fillRect(0, v.h * (from - 0.35), v.w, v.groundY - v.h * (from - 0.35));
  }

  drawLayer(ctx, v, camX, t, layer, li, q, theme) {
    if (layer.cache) {
      this.drawLayerCached(ctx, v, camX, t, layer, li, q, theme);
      return;
    }
    const offset = camX * layer.factor;
    const first = Math.floor(offset / layer.spacing) - 2;
    const last = Math.ceil((offset + v.w) / layer.spacing) + 1;
    const seed = (li + 1) * 1013;
    for (let i = first; i <= last; i++) {
      const sx = i * layer.spacing - offset;
      const r = (k) => hash(i, seed + k * 31);
      layer.draw(ctx, sx, r, v, t, i, q);
    }
  }

  /**
   * Capas estáticas pesadas (rascacielos con ventanas): se pintan una vez
   * en tiras de CHUNK px y se reutilizan. Lo animado (balizas) va en
   * layer.animate, que se dibuja encima cada frame.
   */
  drawLayerCached(ctx, v, camX, t, layer, li, q, theme) {
    const rs = getRenderScale();
    const offset = camX * layer.factor;
    const top = layer.cacheTop ?? 0;
    const h = v.groundY + 4 - top;
    const seed = (li + 1) * 1013;
    const c0 = Math.floor(offset / CHUNK);
    const c1 = Math.floor((offset + v.w) / CHUNK);
    for (let c = c0; c <= c1; c++) {
      const key = `${theme.id}:${li}:${c}:${v.groundY}:${rs.toFixed(2)}:${q.detail ? 1 : 0}`;
      let chunk = this.chunks.get(key);
      if (!chunk) {
        chunk = document.createElement('canvas');
        chunk.width = Math.ceil((CHUNK + BLEED * 2) * rs);
        chunk.height = Math.ceil(h * rs);
        const cx = chunk.getContext('2d');
        cx.scale(rs, rs);
        cx.translate(-c * CHUNK + BLEED, -top);
        const i0 = Math.floor((c * CHUNK - 260) / layer.spacing);
        const i1 = Math.ceil(((c + 1) * CHUNK + BLEED) / layer.spacing);
        for (let i = i0; i <= i1; i++) {
          const r = (k) => hash(i, seed + k * 31);
          layer.draw(cx, i * layer.spacing, r, v, 0, i, q);
        }
        if (this.chunks.size >= MAX_CHUNKS) this.chunks.delete(this.chunks.keys().next().value);
        this.chunks.set(key, chunk);
      }
      ctx.drawImage(chunk, c * CHUNK - offset - BLEED, top, CHUNK + BLEED * 2, h);
    }
    if (layer.animate) {
      const first = Math.floor(offset / layer.spacing) - 2;
      const last = Math.ceil((offset + v.w) / layer.spacing) + 1;
      for (let i = first; i <= last; i++) {
        const r = (k) => hash(i, seed + k * 31);
        layer.animate(ctx, i * layer.spacing - offset, r, v, t, i, q);
      }
    }
  }

  /** Suelo de la zona; se mueve a la velocidad real (factor 1). */
  drawGround(ctx, v, camX, theme) {
    const g = theme.ground;
    const gy = v.groundY;
    const mod = (a, n) => ((a % n) + n) % n;
    const body = ctx.createLinearGradient(0, gy, 0, v.h);
    body.addColorStop(0, g.body);
    body.addColorStop(1, g.edge);
    ctx.fillStyle = body;
    ctx.fillRect(0, gy, v.w, v.h - gy);
    ctx.fillStyle = g.top;
    ctx.fillRect(0, gy, v.w, 12);
    // brillo en el borde y sombra bajo el bordillo
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fillRect(0, gy, v.w, 2);
    ctx.fillStyle = g.edge;
    ctx.fillRect(0, gy + 12, v.w, 3);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(0, gy + 15, v.w, 5);

    if (g.joint) {
      ctx.fillStyle = g.line;
      for (let x = -mod(camX, g.joint); x < v.w; x += g.joint) ctx.fillRect(x, gy, 3, 12);
    }
    if (g.beams) {
      ctx.fillStyle = g.line;
      ctx.globalAlpha = 0.35;
      for (let x = -mod(camX, 160); x < v.w; x += 160) ctx.fillRect(x, gy + 15, 10, v.h - gy);
      ctx.globalAlpha = 1;
    }
    if (g.curb) {
      ctx.fillStyle = g.curb;
      for (let x = -mod(camX, 80); x < v.w; x += 80) ctx.fillRect(x, gy + 12, 40, 3);
    }
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
    if (g.dashes) {
      ctx.fillStyle = '#fff4dc';
      const y = gy + (v.h - gy) / 2 + 4;
      for (let x = -mod(camX, 90); x < v.w; x += 90) ctx.fillRect(x, y, 46, 4);
    }
    if (g.bumpers) {
      ctx.fillStyle = '#1b1620';
      for (let x = -mod(camX, 200); x < v.w; x += 200) {
        ctx.beginPath();
        ctx.arc(x + 100, gy + 30, 11, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // reflejos de neón en el suelo mojado (zonas de noche)
    if (g.reflect) {
      ctx.globalCompositeOperation = 'lighter';
      g.reflect.forEach((c, k) => {
        const period = 330 + k * 140;
        for (let x = -mod(camX * 1, period) + k * 90; x < v.w; x += period) {
          ctx.fillStyle = c;
          ctx.fillRect(x, gy + 18, 40, 3);
          ctx.fillRect(x + 8, gy + 26, 24, 2);
        }
      });
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}
