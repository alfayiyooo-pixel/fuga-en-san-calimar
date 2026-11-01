// Zona 3 — LAS CHIMENEAS
// Cielo anaranjado de humo, fábricas de dientes de sierra, depósitos y contenedores.

const CONTAINERS = ['#c8463a', '#2e7fb8', '#e0a224', '#3f9a5c', '#7b5cff'];

export const industrial = {
  id: 'industrial',
  nameKey: 'zone.industrial',
  sky: ['#d9785a', '#f3b67f', '#fbe0b0'],
  sun: { x: 0.65, y: 120, r: 50, color: '#ffe3b0', glow: 'rgba(255, 170, 110, 0.5)' },
  cloudColor: 'rgba(120, 90, 90, 0.35)',
  ground: { top: '#a9a39b', body: '#6d6862', line: '#8b857d', edge: '#4a4540', joint: 80, hazard: true },

  layers: [
    // fábricas lejanas con chimeneas humeantes
    {
      factor: 0.1,
      spacing: 150,
      draw(ctx, sx, r, v, t) {
        const h = 70 + r(0) * 70;
        const w = 120 + r(1) * 40;
        const y = v.groundY - 40 - h;
        ctx.fillStyle = '#b77866';
        ctx.fillRect(sx, y, w, h + 40);
        // tejado en dientes de sierra
        const teeth = 4;
        for (let k = 0; k < teeth; k++) {
          const tx = sx + (k * w) / teeth;
          ctx.beginPath();
          ctx.moveTo(tx, y);
          ctx.lineTo(tx + w / teeth, y - 18);
          ctx.lineTo(tx + w / teeth, y);
          ctx.fill();
        }
        if (r(2) < 0.7) {
          const cx = sx + w * (0.2 + r(3) * 0.6);
          const ch = 80 + r(4) * 60;
          ctx.fillStyle = '#a5685a';
          ctx.fillRect(cx - 7, y - ch, 14, ch);
          ctx.fillStyle = '#e8d6c8';
          ctx.fillRect(cx - 7, y - ch + 8, 14, 5);
          // humo
          for (let p = 0; p < 4; p++) {
            const f = ((t * 0.25 + p / 4 + r(5)) % 1);
            ctx.fillStyle = `rgba(110, 90, 90, ${0.35 * (1 - f)})`;
            ctx.beginPath();
            ctx.arc(cx + f * 50, y - ch - 10 - f * 60, 8 + f * 22, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      },
    },
    // depósitos y grúas
    {
      factor: 0.35,
      spacing: 210,
      draw(ctx, sx, r, v) {
        const base = v.groundY;
        const k = r(0);
        if (k < 0.45) {
          // depósitos cilíndricos
          const n = 1 + Math.floor(r(1) * 2);
          for (let i = 0; i < n; i++) {
            const x = sx + i * 70;
            const h = 90 + r(2 + i) * 50;
            const g = ctx.createLinearGradient(x, 0, x + 60, 0);
            g.addColorStop(0, '#8a96a3');
            g.addColorStop(0.45, '#d4dbe3');
            g.addColorStop(1, '#6c7785');
            ctx.fillStyle = g;
            ctx.fillRect(x, base - h, 60, h);
            ctx.beginPath();
            ctx.ellipse(x + 30, base - h, 30, 9, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#c8463a';
            ctx.fillRect(x, base - h * 0.55, 60, 8);
          }
        } else if (k < 0.75) {
          // grúa torre
          const x = sx + 40;
          const h = 230 + r(3) * 60;
          ctx.strokeStyle = '#f0b429';
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let y = base; y > base - h; y -= 18) {
            ctx.moveTo(x - 8, y);
            ctx.lineTo(x + 8, y - 18);
            ctx.moveTo(x + 8, y);
            ctx.lineTo(x - 8, y - 18);
          }
          ctx.stroke();
          ctx.fillStyle = '#f0b429';
          ctx.fillRect(x - 10, base - h, 3, h);
          ctx.fillRect(x + 7, base - h, 3, h);
          ctx.fillRect(x - 60, base - h - 6, 190, 8);
          ctx.fillStyle = '#4a4540';
          ctx.fillRect(x - 60, base - h + 2, 30, 18);
          ctx.strokeStyle = '#4a4540';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x + 100, base - h + 2);
          ctx.lineTo(x + 100, base - h + 70 + r(4) * 60);
          ctx.stroke();
        } else {
          // nave de chapa
          const w = 160;
          const h = 80;
          ctx.fillStyle = '#7a8794';
          ctx.fillRect(sx, base - h, w, h);
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          for (let x = sx; x < sx + w; x += 8) ctx.fillRect(x, base - h, 3, h);
          ctx.fillStyle = '#5c6874';
          ctx.fillRect(sx + 50, base - 54, 60, 54);
          ctx.fillStyle = '#c8463a';
          ctx.fillRect(sx - 4, base - h - 8, w + 8, 10);
        }
      },
    },
    // contenedores apilados, bidones y vallas
    {
      factor: 0.66,
      spacing: 230,
      draw(ctx, sx, r, v) {
        const base = v.groundY + 2;
        const k = r(0);
        if (k < 0.5) {
          const rows = 1 + Math.floor(r(1) * 3);
          for (let i = 0; i < rows; i++) {
            const c = CONTAINERS[Math.floor(r(2 + i) * CONTAINERS.length)];
            const x = sx + (i % 2) * 14;
            const y = base - (i + 1) * 40;
            ctx.fillStyle = c;
            ctx.fillRect(x, y, 120, 38);
            ctx.fillStyle = 'rgba(0,0,0,0.18)';
            for (let px = x + 6; px < x + 120; px += 9) ctx.fillRect(px, y + 3, 3, 32);
          }
        } else if (k < 0.75) {
          for (let i = 0; i < 3; i++) {
            ctx.fillStyle = i === 1 ? '#3f9a5c' : '#c8463a';
            ctx.fillRect(sx + i * 26, base - 38, 22, 38);
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(sx + i * 26, base - 28, 22, 3);
            ctx.fillRect(sx + i * 26, base - 14, 22, 3);
          }
        } else {
          // valla de malla
          ctx.strokeStyle = 'rgba(60, 60, 70, 0.6)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let x = sx; x < sx + 200; x += 10) {
            ctx.moveTo(x, base);
            ctx.lineTo(x + 30, base - 60);
            ctx.moveTo(x + 30, base);
            ctx.lineTo(x, base - 60);
          }
          ctx.stroke();
          ctx.fillStyle = '#4a4540';
          for (let x = sx; x <= sx + 200; x += 66) ctx.fillRect(x, base - 64, 4, 64);
        }
      },
    },
  ],
};
