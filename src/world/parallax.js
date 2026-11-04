import { hash } from '../core/rng.js';
import { Quality } from '../core/quality.js';
import { drawGlow, getRenderScale } from '../fx/sprites.js';
import { sunRays } from './themes/shapes.js';
import { CONFIG } from '../config.js';
import { drawWeather, tintGround } from './variants.js';

const smooth = (k) => k * k * (3 - 2 * k);
const clamp01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);

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

  /**
   * Fondo, clima y suelo de una zona o de la TRANSICIÓN entre dos.
   * En la transición (zone.k de 0 a 1, ~100 m) cada capa cambia en su
   * momento (CONFIG.zones.stages): primero el cielo y la luz, luego lo
   * lejano, lo cercano y por último el suelo. Así a mitad de camino se
   * mezclan elementos de las dos zonas (edificios sobre la arena…).
   * hook(banda, idZona): vida del fondo entre capas (ver world/ambient.js).
   */
  drawScene(ctx, v, camX, t, zone, hook = null, part = 'all') {
    const q = Quality.settings;
    const A = zone.current;
    const B = zone.next;
    const k = zone.k ?? 0;
    const W = CONFIG.zones.stages;
    const stage = (name, fn, opaque = false) => {
      const [a, b] = W[name] ?? W.layer2;
      const w = k <= 0 ? 0 : smooth(clamp01((k - a) / (b - a)));
      const base = ctx.globalAlpha;
      if (w < 0.999) {
        ctx.globalAlpha = base * (opaque ? 1 : 1 - w);
        fn(A);
      }
      if (w > 0.001) {
        ctx.globalAlpha = base * w;
        fn(B);
      }
      ctx.globalAlpha = base;
    };
    const hk = (band, th) => hook?.(band, th.id);
    if (part === 'ground') {
      stage('ground', (th) => {
        this.drawGround(ctx, v, camX, th);
        tintGround(ctx, v, th);
      });
      return;
    }
    stage('sky', (th) => {
      this.drawCachedSky(ctx, v, t, th, q);
      if (th.rays && q.detail && th.celestial && !th.celestial.hidden) sunRays(ctx, v.w * th.celestial.x, th.celestial.y, t, th.rays.color);
      this.drawClouds(ctx, v, camX, t, th);
    }, true);
    stage('far', (th) => {
      if (th.skyline) this.drawSkyline(ctx, v, camX, t, th.skyline, q);
      this.haze(ctx, v, th.haze, 0.55, 1);
      hk('sky', th);
    });
    stage('backdrop', (th) => {
      th.backdrop?.(ctx, v, camX, t, q);
      hk('waterFar', th);
    });
    const n = Math.max(A.layers.length, B?.layers.length ?? 0);
    for (let li = 0; li < n; li++) {
      stage(`layer${li}`, (th) => {
        const layer = th.layers[li];
        if (layer) this.drawLayer(ctx, v, camX, t, layer, li, q, th);
        if (li === 0) {
          this.haze(ctx, v, th.haze, 0.62, 0.55);
          hk('far', th);
          hk('waterNear', th);
          hk('groundFar', th);
        }
        if (li === 1) {
          this.haze(ctx, v, th.haze, 0.72, 0.22);
          hk('ground', th);
        }
      });
    }
    stage('weather', (th) => drawWeather(ctx, v, camX, t, th, q));
    if (part === 'back') return;
    stage('ground', (th) => {
      this.drawGround(ctx, v, camX, th);
      tintGround(ctx, v, th);
    });
  }

  /** Primer plano de la zona o de la transición (cambia junto con el suelo). */
  drawForegroundZone(ctx, v, camX, t, zone) {
    const k = zone.k ?? 0;
    const [a, b] = CONFIG.zones.stages.ground;
    const w = k <= 0 ? 0 : smooth(clamp01((k - a) / (b - a)));
    const base = ctx.globalAlpha;
    if (w < 0.999) {
      ctx.globalAlpha = base * (1 - w);
      this.drawForeground(ctx, v, camX, t, zone.current);
    }
    if (w > 0.001) {
      ctx.globalAlpha = base * w;
      this.drawForeground(ctx, v, camX, t, zone.next);
    }
    ctx.globalAlpha = base;
  }

  /** hook(banda): dibuja la vida del fondo entre capas (ver world/ambient.js). */
  drawBackground(ctx, v, camX, t, theme, hook = null) {
    const q = Quality.settings;
    this.drawCachedSky(ctx, v, t, theme, q);
    // rayos de luz suaves desde el sol (o la luna)
    if (theme.rays && q.detail && theme.celestial) sunRays(ctx, v.w * theme.celestial.x, theme.celestial.y, t, theme.rays.color);
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
      if (li === 1) {
        // perspectiva atmosférica: también la capa media algo más clara que la cercana
        this.haze(ctx, v, theme.haze, 0.72, 0.22);
        hook?.('ground');
      }
    });
  }

  /**
   * El cielo (degradado + sol/luna con su halo) es fijo en pantalla:
   * se pinta una vez por zona y tamaño, y luego solo se copia.
   */
  drawCachedSky(ctx, v, t, theme, q) {
    const rs = getRenderScale();
    const key = `${theme.key ?? theme.id}:${v.w}:${rs.toFixed(2)}`;
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
    const base = ctx.globalAlpha;
    const moon = theme.celestial?.type === 'moon' ? theme.celestial : null;
    ctx.fillStyle = '#fff8e0';
    for (let i = 0; i < 70; i++) {
      const x = hash(i, 11) * v.w;
      const y = hash(i, 12) * v.h * 0.5;
      if (moon && Math.hypot(x - v.w * moon.x, y - moon.y) < moon.r + 4) continue;
      const tw = 0.45 + 0.55 * Math.sin(t * (1 + hash(i, 13) * 3) + i);
      ctx.globalAlpha = base * tw * (1 - y / (v.h * 0.55));
      const sz = hash(i, 14) < 0.15 ? 2.2 : 1.3;
      ctx.fillRect(x, y, sz, sz);
    }
    ctx.globalAlpha = base;
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
    if (!c || c.hidden) return;
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
      const key = `${theme.key ?? theme.id}:${li}:${c}:${v.groundY}:${rs.toFixed(2)}:${q.detail ? 1 : 0}`;
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
      const base = ctx.globalAlpha;
      ctx.globalAlpha = base * 0.35;
      for (let x = -mod(camX, 160); x < v.w; x += 160) ctx.fillRect(x, gy + 15, 10, v.h - gy);
      ctx.globalAlpha = base;
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
      // franjas del suelo apagadas: el amarillo y negro vivos se reservan para los peligros
      ctx.fillStyle = '#7d7258';
      ctx.fillRect(0, gy + 15, v.w, 10);
      ctx.fillStyle = '#2a2433';
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
    // texturas: vetas y clavos de madera, grava, manchas y grietas
    if (Quality.settings.detail) this.groundTexture(ctx, v, camX, g, gy);
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

  groundTexture(ctx, v, camX, g, gy) {
    const mod = (a, n) => ((a % n) + n) % n;
    const step = 48;
    const i0 = Math.floor(camX / step) - 1;
    const i1 = Math.ceil((camX + v.w) / step) + 1;
    for (let i = i0; i <= i1; i++) {
      const x = i * step - camX;
      const h = (k) => hash(i, 1200 + k);
      if (g.grain) {
        ctx.fillStyle = g.grain;
        ctx.fillRect(x + h(0) * 20, gy + 4 + h(1) * 5, 10 + h(2) * 18, 1);
        ctx.fillRect(x + h(3) * 30, gy + 26 + h(4) * 30, 14 + h(5) * 20, 1.5);
      }
      if (g.nails) {
        ctx.fillStyle = g.nails;
        ctx.fillRect(x + 4, gy + 5, 2, 2);
        ctx.fillRect(x + step - 8, gy + 5, 2, 2);
      }
      if (g.speckle) {
        ctx.fillStyle = g.speckle;
        for (let k = 0; k < 4; k++) ctx.fillRect(x + h(10 + k) * step, gy + 20 + h(20 + k) * (v.h - gy - 24), 2, 2);
      }
      if (g.stains && h(30) < 0.12) {
        ctx.fillStyle = g.stains;
        ctx.beginPath();
        ctx.ellipse(x + h(31) * step, gy + 30 + h(32) * 20, 14 + h(33) * 16, 4 + h(34) * 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (g.cracks && h(40) < 0.18) {
        ctx.strokeStyle = g.cracks;
        ctx.lineWidth = 1;
        const cx = x + h(41) * step;
        const cy = gy + 24 + h(42) * 24;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + 8, cy + 4);
        ctx.lineTo(cx + 14, cy + 2);
        ctx.moveTo(cx + 8, cy + 4);
        ctx.lineTo(cx + 10, cy + 10);
        ctx.stroke();
      }
    }
    // brillo húmedo que se desliza (muelle)
    if (g.sheen) {
      ctx.fillStyle = g.sheen;
      for (let x = -mod(camX * 1, 300); x < v.w; x += 300) ctx.fillRect(x, gy + 2, 90, 9);
    }
  }

  /**
   * Primer plano: elementos que pasan rápido por delante (factor > 1),
   * desenfocados (se pintan a baja resolución y se amplían) y oscuros.
   * Solo ocupan la franja de abajo para no tapar obstáculos.
   */
  drawForeground(ctx, v, camX, t, theme) {
    const F = theme.foreground;
    if (!F || !Quality.settings.detail) return;
    const factor = 1.35;
    const spacing = 520;
    const offset = camX * factor;
    const first = Math.floor(offset / spacing) - 1;
    const last = Math.ceil((offset + v.w) / spacing) + 1;
    for (let i = first; i <= last; i++) {
      if (hash(i, 950) > F.chance) continue;
      const kind = F.kinds[Math.floor(hash(i, 951) * F.kinds.length)];
      const variant = Math.floor(hash(i, 952) * 3);
      const spr = this.fgSprite(theme, kind, variant);
      const x = i * spacing - offset + hash(i, 953) * 260;
      if (x > v.w + 20 || x + FG_W < -20) continue;
      ctx.drawImage(spr, x, v.h - FG_H + 12, FG_W, FG_H);
    }
  }

  fgSprite(theme, kind, variant) {
    const key = `${theme.key ?? theme.id}:${kind}:${variant}`;
    if (!this.fg) this.fg = new Map();
    let c = this.fg.get(key);
    if (c) return c;
    const sc = 0.32; // resolución baja → al ampliarse queda desenfocado
    c = document.createElement('canvas');
    c.width = Math.ceil(FG_W * sc);
    c.height = Math.ceil(FG_H * sc);
    const cx = c.getContext('2d');
    cx.scale(sc, sc);
    FG_DRAW[kind]?.(cx, theme.foreground, variant);
    this.fg.set(key, c);
    return c;
  }
}

// ---------------------------------------------------------------
// Primer plano (siluetas; el suelo del sprite es y = FG_H)
// ---------------------------------------------------------------
const FG_W = 220;
const FG_H = 120;

const FG_DRAW = {
  grass(ctx, F, v) {
    ctx.fillStyle = F.color;
    const n = 9 + v * 3;
    for (let k = 0; k < n; k++) {
      const x = 30 + (k / n) * 160 + Math.sin(k * 3.1) * 8;
      const h = 40 + ((k * 37) % 30) + v * 6;
      const bend = Math.sin(k * 1.7) * 18;
      ctx.beginPath();
      ctx.moveTo(x - 5, FG_H);
      ctx.quadraticCurveTo(x + bend * 0.3, FG_H - h * 0.6, x + bend, FG_H - h);
      ctx.quadraticCurveTo(x + bend * 0.2 + 3, FG_H - h * 0.5, x + 5, FG_H);
      ctx.fill();
    }
    ctx.fillStyle = F.rim;
    ctx.beginPath();
    ctx.ellipse(110, FG_H, 100, 12, 0, Math.PI, 0);
    ctx.fill();
  },
  posts(ctx, F, v) {
    ctx.fillStyle = F.color;
    const xs = [40, 170];
    for (const x of xs) ctx.fillRect(x - 7, FG_H - 70 - v * 5, 14, 70 + v * 5);
    ctx.strokeStyle = F.rim;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(xs[0], FG_H - 60);
    ctx.quadraticCurveTo(105, FG_H - 30 - v * 6, xs[1], FG_H - 60);
    ctx.stroke();
    FG_DRAW.grass(ctx, F, 0);
  },
  bush(ctx, F, v) {
    ctx.fillStyle = F.color;
    ctx.beginPath();
    const blobs = [[60, 34], [100, 44], [145, 36], [180, 26]].slice(0, 3 + (v % 2));
    for (const [x, r] of blobs) ctx.arc(x, FG_H - r * 0.9 + 10, r + v * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = F.rim;
    for (const [x, r] of blobs) {
      ctx.beginPath();
      ctx.arc(x - r * 0.3, FG_H - r * 1.4 + 10, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    if (F.flowers) {
      ctx.fillStyle = F.flowers;
      for (let k = 0; k < 10; k++) ctx.fillRect(40 + ((k * 53) % 150), FG_H - 20 - ((k * 31) % 50), 6, 6);
    }
  },
  bollards(ctx, F, v) {
    ctx.fillStyle = F.color;
    for (let k = 0; k < 3; k++) {
      const x = 40 + k * 66 + v * 4;
      ctx.fillRect(x - 10, FG_H - 54, 20, 54);
      ctx.beginPath();
      ctx.ellipse(x, FG_H - 54, 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = F.rim;
      ctx.fillRect(x - 10, FG_H - 42, 20, 5);
      ctx.fillStyle = F.color;
    }
  },
  pipe(ctx, F, v) {
    ctx.fillStyle = F.color;
    const y = FG_H - 46 - v * 6;
    ctx.fillRect(0, y, FG_W, 24);
    for (const x of [30, 120, 200]) ctx.fillRect(x - 6, y - 4, 12, 32);
    ctx.fillRect(60, y + 24, 10, FG_H - y - 24);
    ctx.fillRect(160, y + 24, 10, FG_H - y - 24);
    ctx.strokeStyle = F.rim;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(95, y - 16, 14, 0, Math.PI * 2);
    ctx.moveTo(95, y - 2);
    ctx.lineTo(95, y);
    ctx.stroke();
    ctx.fillStyle = F.rim;
    ctx.fillRect(0, y + 2, FG_W, 3);
  },
  barrels(ctx, F, v) {
    for (let k = 0; k < 2 + (v % 2); k++) {
      const x = 40 + k * 56;
      ctx.fillStyle = F.color;
      ctx.fillRect(x, FG_H - 66, 46, 66);
      ctx.fillStyle = F.rim;
      ctx.fillRect(x, FG_H - 52, 46, 5);
      ctx.fillRect(x, FG_H - 24, 46, 5);
    }
  },
  crates(ctx, F, v) {
    ctx.fillStyle = F.color;
    ctx.fillRect(30, FG_H - 60, 70, 60);
    ctx.fillRect(100 + v * 6, FG_H - 46, 56, 46);
    if (v === 2) ctx.fillRect(50, FG_H - 100, 46, 40);
    ctx.strokeStyle = F.rim;
    ctx.lineWidth = 4;
    ctx.strokeRect(36, FG_H - 54, 58, 48);
    ctx.beginPath();
    ctx.moveTo(36, FG_H - 54);
    ctx.lineTo(94, FG_H - 6);
    ctx.stroke();
  },
  rope(ctx, F, v) {
    ctx.fillStyle = F.color;
    ctx.fillRect(60, FG_H - 50, 30, 50);
    ctx.beginPath();
    ctx.ellipse(75, FG_H - 50, 22, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = F.rim;
    ctx.lineWidth = 6;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.ellipse(150, FG_H - 8 - k * 7, 40 - k * 6, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(75, FG_H - 40);
    ctx.quadraticCurveTo(110, FG_H - 10, 120, FG_H - 14);
    ctx.stroke();
  },
};
