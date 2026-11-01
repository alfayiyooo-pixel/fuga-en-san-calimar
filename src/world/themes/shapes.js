// Formas reutilizables para los decorados de las zonas.

export function rect(ctx, color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Rejilla de ventanas dentro de un edificio. lit = probabilidad de ventana encendida. */
export function windows(ctx, x, y, w, h, opts) {
  const { cw = 10, ch = 12, gx = 6, gy = 8, color = '#fff', alt = null, r = () => 0.5, lit = 0 } = opts;
  const cols = Math.max(1, Math.floor((w - gx) / (cw + gx)));
  const rows = Math.max(1, Math.floor((h - gy) / (ch + gy)));
  const ox = x + (w - cols * (cw + gx) + gx) / 2;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      ctx.fillStyle = alt && r(row * 13 + col) < lit ? alt : color;
      ctx.fillRect(ox + col * (cw + gx), y + gy + row * (ch + gy), cw, ch);
    }
  }
}

export function streetLamp(ctx, x, base, color = '#2a2140', light = '#ffe9a8') {
  ctx.fillStyle = color;
  ctx.fillRect(x - 3, base - 150, 6, 150);
  ctx.fillRect(x - 3, base - 150, 28, 5);
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.arc(x + 24, base - 140, 7, 0, Math.PI * 2);
  ctx.fill();
}

export function tree(ctx, x, base, h, trunk = '#6b4224', leaf = '#2f9e57', leaf2 = '#3cbf6a') {
  ctx.fillStyle = trunk;
  ctx.fillRect(x - 4, base - h * 0.45, 8, h * 0.45);
  ctx.fillStyle = leaf;
  ctx.beginPath();
  ctx.arc(x, base - h * 0.6, h * 0.28, 0, Math.PI * 2);
  ctx.arc(x - h * 0.18, base - h * 0.5, h * 0.2, 0, Math.PI * 2);
  ctx.arc(x + h * 0.18, base - h * 0.5, h * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = leaf2;
  ctx.beginPath();
  ctx.arc(x - h * 0.06, base - h * 0.68, h * 0.14, 0, Math.PI * 2);
  ctx.fill();
}

export function cypress(ctx, x, base, h, color = '#1f6b45') {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, base - h / 2, h * 0.14, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Mar con destellos, usado por la playa y el puerto. */
export function sea(ctx, v, camX, t, top, bottom, c1, c2, sparkle = 'rgba(255,255,255,0.55)') {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, top, v.w, bottom - top);
  ctx.fillStyle = sparkle;
  const off = (camX * 0.1) % 90;
  const base = ctx.globalAlpha;
  for (let row = 0; row < 5; row++) {
    const y = top + 8 + row * ((bottom - top - 16) / 5);
    for (let x = -off - ((row * 37) % 90); x < v.w; x += 90) {
      const w = 14 + ((row * 7 + Math.floor(x)) % 5) * 4;
      const a = 0.5 + 0.5 * Math.sin(t * 2 + x * 0.05 + row);
      ctx.globalAlpha = base * (0.25 + a * 0.5);
      ctx.fillRect(x, y, w, 2);
    }
  }
  ctx.globalAlpha = base;
}
