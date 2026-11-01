// Caché de "sprites" generados por código: se dibujan una vez en un
// lienzo aparte (a la resolución real de la pantalla) y luego se copian
// con drawImage, que es mucho más rápido que redibujar las formas.

const cache = new Map();
let renderScale = 1;

export const getRenderScale = () => renderScale;

/** Fija la escala de render (escala lógica × densidad de píxeles). */
export function setSpriteScale(s) {
  if (Math.abs(s - renderScale) > 0.01) {
    renderScale = s;
    cache.clear();
  }
}

/**
 * Devuelve (y crea si no existe) un sprite de w×h unidades lógicas.
 * draw(ctx, w, h) dibuja con el origen en la esquina superior izquierda.
 */
export function sprite(key, w, h, draw) {
  let s = cache.get(key);
  if (!s) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w * renderScale));
    c.height = Math.max(1, Math.ceil(h * renderScale));
    const x = c.getContext('2d');
    x.scale(renderScale, renderScale);
    draw(x, w, h);
    s = { canvas: c, w, h };
    cache.set(key, s);
  }
  return s;
}

/** Dibuja un sprite centrado en (x, y) con escala horizontal/vertical opcional. */
export function drawSprite(ctx, s, x, y, sx = 1, sy = 1) {
  ctx.drawImage(s.canvas, x - (s.w * sx) / 2, y - (s.h * sy) / 2, s.w * sx, s.h * sy);
}

/** Halo de luz suave de un color (degradado radial precalculado). */
export function glowSprite(color) {
  return sprite(`glow:${color}`, 64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, color);
    g.addColorStop(0.35, color.replace(/[\d.]+\)$/, (a) => `${parseFloat(a) * 0.45})`));
    g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
}

/**
 * Dibuja un halo aditivo. color debe ser 'rgba(r, g, b, a)'.
 * rx/ry = radios horizontal y vertical.
 */
export function drawGlow(ctx, x, y, rx, color, alpha = 1, ry = rx) {
  const s = glowSprite(color);
  const prevOp = ctx.globalCompositeOperation;
  const prevA = ctx.globalAlpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = prevA * alpha;
  ctx.drawImage(s.canvas, x - rx, y - ry, rx * 2, ry * 2);
  ctx.globalCompositeOperation = prevOp;
  ctx.globalAlpha = prevA;
}

// ---------------- VENTANAS (patrón repetido) ----------------
// Un edificio entero se rellena con una sola llamada usando un patrón,
// en lugar de dibujar cientos de ventanas una a una.

const patternCache = new WeakMap();

/**
 * opts: { cw, ch, gx, gy, cols, rows, lit, colors: [lit...], off, seed }
 * Devuelve un CanvasPattern para este contexto.
 */
export function windowPattern(ctx, key, opts) {
  let map = patternCache.get(ctx);
  if (!map) {
    map = new Map();
    patternCache.set(ctx, map);
  }
  const fullKey = `${key}@${renderScale.toFixed(2)}`;
  let pat = map.get(fullKey);
  if (!pat) {
    const { cw, ch, gx, gy, cols = 6, rows = 8, lit = 0.4, colors, off, seed = 1 } = opts;
    const tw = cols * (cw + gx);
    const th = rows * (ch + gy);
    const spr = sprite(`win:${key}`, tw, th, (c) => {
      let s = seed * 9301;
      const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
      for (let r = 0; r < rows; r++) {
        for (let k = 0; k < cols; k++) {
          const on = rnd() < lit;
          c.fillStyle = on ? colors[Math.floor(rnd() * colors.length)] : off;
          c.fillRect(k * (cw + gx) + gx / 2, r * (ch + gy) + gy / 2, cw, ch);
        }
      }
    });
    pat = ctx.createPattern(spr.canvas, 'repeat');
    map.set(fullKey, pat);
  }
  return pat;
}

/** Rellena un rectángulo con un patrón de ventanas anclado a (ox, oy). */
export function fillPattern(ctx, pat, x, y, w, h, ox = x, oy = y) {
  if (pat.setTransform) pat.setTransform(new DOMMatrix([1 / renderScale, 0, 0, 1 / renderScale, ox, oy]));
  ctx.fillStyle = pat;
  ctx.fillRect(x, y, w, h);
}
