// COMPATIBILIDAD CON NAVEGADORES ANTIGUOS
// Pequeños "parches" para que el juego funcione igual en navegadores que no
// tienen alguna función moderna (iPhone con iOS 14-15, Samsung Internet
// antiguo, Chrome < 99…). Se carga lo primero desde main.js.

/**
 * ctx.roundRect (rectángulo redondeado) llegó en Chrome 99 y Safari 16: sin él,
 * el marcador fallaba en cada frame y el juego se quedaba congelado.
 */
function roundRectPolyfill(proto) {
  if (!proto || proto.roundRect) return;
  proto.roundRect = function roundRect(x, y, w, h, radii = 0) {
    let r = Array.isArray(radii) ? radii[0] ?? 0 : radii;
    if (typeof r === 'object') r = r?.x ?? 0;
    r = Math.max(0, Math.min(Number(r) || 0, Math.abs(w) / 2, Math.abs(h) / 2));
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.arcTo(x + w, y, x + w, y + r, r);
    this.lineTo(x + w, y + h - r);
    this.arcTo(x + w, y + h, x + w - r, y + h, r);
    this.lineTo(x + r, y + h);
    this.arcTo(x, y + h, x, y + h - r, r);
    this.lineTo(x, y + r);
    this.arcTo(x, y, x + r, y, r);
    this.closePath();
  };
}

if (typeof window !== 'undefined') {
  roundRectPolyfill(window.CanvasRenderingContext2D?.prototype);
  roundRectPolyfill(window.Path2D?.prototype);
}

/**
 * decodeAudioData con promesa: Safari < 14.1 solo admite la versión con
 * funciones de respuesta (y no devuelve promesa).
 */
export function decodeAudio(ctx, buf) {
  return new Promise((resolve, reject) => {
    try {
      const p = ctx.decodeAudioData(buf, resolve, reject);
      if (p && typeof p.then === 'function') p.then(resolve, reject);
    } catch (e) {
      reject(e);
    }
  });
}
