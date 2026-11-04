// VARIACIONES DE ZONA: al completar el ciclo de zonas, se repiten de noche,
// con lluvia o con niebla para que no se note la repetición.
//
// Una variante es una copia del tema con el cielo, la bruma, las nubes y el
// sol/luna cambiados, más un efecto de clima (tinte nocturno, lluvia o
// bancos de niebla) que se dibuja SOLO en el fondo: nunca tapa obstáculos.
// Colores y cantidades en CONFIG.zones.variantDefs.

import { CONFIG } from '../config.js';
import { hash } from '../core/rng.js';

/** '#rrggbb' o 'rgba(r, g, b, a)' → [r, g, b, a] */
function parse(c) {
  if (c[0] === '#') {
    const n = parseInt(c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const m = c.match(/[\d.]+/g).map(Number);
  return [m[0], m[1], m[2], m[3] ?? 1];
}

/** Mezcla el color c hacia "to" en la proporción k (conserva la opacidad de c si se pide). */
export function mix(c, to, k, alpha = null) {
  const a = parse(c);
  const b = parse(to);
  const r = a.map((v, i) => (i < 3 ? Math.round(v + (b[i] - v) * k) : v));
  return `rgba(${r[0]}, ${r[1]}, ${r[2]}, ${alpha ?? r[3]})`;
}

const cache = new Map();

/** Variante que toca a la zona n (null en la primera vuelta). */
export function variantFor(n, base) {
  const Z = CONFIG.zones;
  const count = Z.cycle ?? 5;
  const lap = Math.floor(n / count);
  if (lap === 0 || !Z.variants.length) return null;
  // va rotando por zona y por vuelta: nunca la misma zona igual dos vueltas seguidas
  let v = Z.variants[(lap - 1 + (n % count)) % Z.variants.length];
  // de noche una zona que ya es de noche apenas cambia: mejor lluvia
  if (v === 'night' && base.stars) v = Z.variants.includes('rain') ? 'rain' : v;
  return v;
}

/** Tema con la variante aplicada (se crea una vez y se reutiliza). */
export function withVariant(base, variant) {
  if (!variant) return base;
  const key = `${base.id}~${variant}`;
  let th = cache.get(key);
  if (th) return th;
  const V = CONFIG.zones.variantDefs[variant];
  const night = variant === 'night';
  th = Object.create(base);
  Object.assign(th, {
    key,
    variant,
    sky: base.sky.map((c) => mix(c, V.sky, V.skyMix)),
    haze: V.haze,
    stars: night ? true : variant === 'rain' ? false : base.stars,
    rays: night || variant === 'rain' ? null : base.rays && { color: mix(base.rays.color, V.sky, 0.5) },
    clouds: base.clouds && {
      color: V.clouds ?? base.clouds.color,
      shade: V.cloudShade ?? base.clouds.shade,
      rim: V.clouds ? null : base.clouds.rim,
    },
    celestial: !base.celestial ? null
      : variant === 'rain' ? { ...base.celestial, hidden: true }
      : night ? { type: 'moon', x: base.celestial.x, y: 82, r: 26, color: '#f4f0ff', glow: 'rgba(190, 180, 255, 0.5)' }
      : { ...base.celestial, color: mix(base.celestial.color, '#ffffff', 0.6), glow: mix(base.celestial.glow, V.sky, 0.6, 0.35) },
    skyline: base.skyline && { ...base.skyline, color: mix(base.skyline.color, V.sky, V.farMix) },
    ground: variant === 'rain' ? { ...base.ground, sheen: V.sheen, reflect: base.ground.reflect ?? V.reflect } : base.ground,
    weather: V,
  });
  cache.set(key, th);
  return th;
}

/** Clima sobre el fondo (detrás del juego). */
export function drawWeather(ctx, v, camX, t, theme, q) {
  const W = theme.weather;
  if (!W) return;
  const gy = v.groundY;
  if (W.tint) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = W.tint;
    ctx.fillRect(0, 0, v.w, gy + 1);
    ctx.restore();
  }
  if (W.fog) {
    // bancos de niebla que se desplazan despacio
    const base = ctx.globalAlpha;
    for (let layer = 0; layer < 2; layer++) {
      const f = 0.15 + layer * 0.2;
      const spacing = 420;
      const off = camX * f + t * (8 + layer * 6);
      const i0 = Math.floor(off / spacing) - 1;
      const i1 = Math.ceil((off + v.w) / spacing) + 1;
      for (let i = i0; i <= i1; i++) {
        const x = i * spacing - off + hash(i, 700 + layer) * 160;
        const y = gy - 60 - layer * 90 - hash(i, 710 + layer) * 70;
        const r = 220 + hash(i, 720 + layer) * 120;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, W.fog);
        g.addColorStop(1, mix(W.fog, W.fog, 0, 0));
        ctx.globalAlpha = base * (0.7 + 0.3 * Math.sin(t * 0.3 + i));
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r * 0.5, r * 2, r);
      }
    }
    ctx.globalAlpha = base;
    // velo general, más denso cerca del suelo
    const veil = ctx.createLinearGradient(0, v.h * 0.25, 0, gy);
    veil.addColorStop(0, mix(W.fog, W.fog, 0, 0));
    veil.addColorStop(1, W.fog);
    ctx.fillStyle = veil;
    ctx.fillRect(0, v.h * 0.25, v.w, gy - v.h * 0.25);
  }
  if (W.rain) {
    const n = q.detail ? W.rain.drops : Math.round(W.rain.drops * 0.4);
    ctx.save();
    ctx.strokeStyle = W.rain.color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const H = gy + 20;
    for (let i = 0; i < n; i++) {
      const sp = W.rain.speed * (0.8 + hash(i, 731) * 0.4);
      const y = (hash(i, 732) * H + t * sp) % H;
      const x = ((hash(i, 733) * (v.w + 200) - t * sp * W.rain.slant - camX * 0.2) % (v.w + 200) + v.w + 200) % (v.w + 200) - 100;
      ctx.moveTo(x, y);
      ctx.lineTo(x - W.rain.len * W.rain.slant, y - W.rain.len);
    }
    ctx.stroke();
    // salpicaduras en el suelo
    if (q.detail) {
      ctx.fillStyle = W.rain.color;
      for (let i = 0; i < 14; i++) {
        const k = (t * 2.2 + hash(i, 740)) % 1;
        const x = hash(i, 741 + Math.floor(t * 2.2 + hash(i, 740))) * v.w;
        ctx.globalAlpha = (1 - k) * 0.8;
        ctx.fillRect(x - 4 * k - 1, gy - 2 - 4 * k, 2, 2);
        ctx.fillRect(x + 4 * k, gy - 2 - 4 * k, 2, 2);
      }
    }
    ctx.restore();
  }
}

/** Tinte del clima sobre el suelo (más suave que sobre el fondo). */
export function tintGround(ctx, v, theme) {
  const W = theme.weather;
  if (!W?.groundTint) return;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = W.groundTint;
  ctx.fillRect(0, v.groundY, v.w, v.h - v.groundY);
  ctx.restore();
}
