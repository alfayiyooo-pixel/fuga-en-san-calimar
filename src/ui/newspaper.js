// PORTADA DEL "DIARIO DE SAN CALIMAR"
// Titular generado según la partida (personaje, traje, distancia, zona,
// estrellas, si fue a pie, helicóptero, escondites…), foto del momento de
// la detención y botón de compartir (Web Share API o descarga).

import { t, fmt, getLang } from '../core/i18n.js';
import { pick } from '../core/rng.js';

const HEADLINE_COUNTS = { generic: 8, foot: 3, boss: 3, five: 2, record: 3, short: 2, hide: 2, rich: 2, minor: 3, char: 3 };

/** Sujeto del titular: "Atracador en pijama de dinosaurio" / "un atracador…". */
function subject(n) {
  const outfit = n.outfitId && !n.outfitId.endsWith('_default') ? t(`outfit.${n.outfitId}`) : '';
  const tail = outfit && !outfit.startsWith('outfit.') ? ` ${outfit}` : '';
  if (n.owner === 'base') {
    return { who: t('news.who.base') + tail, whoA: t('news.whoA.base') + tail };
  }
  const alias = t('news.alias', { a: t(`char.${n.owner}.alias`) });
  return { who: alias + tail, whoA: alias + tail };
}

/** Elige un titular divertido con los datos de la partida. */
export function makeHeadline(n) {
  const { who, whoA } = subject(n);
  const vars = { who, whoA, d: fmt(n.d), zone: t(`zone.${n.zoneId}`), bucks: fmt(n.bucks), h: n.hideouts, stars: n.stars };
  const special = [];
  if (n.boss) special.push('boss');
  if (n.newBest && n.d > 100) special.push('record');
  if (n.footOnly && n.d > 200) special.push('foot');
  if (n.stars >= 5) special.push('five');
  if (n.d < 150) special.push('short');
  if (n.hideouts >= 2) special.push('hide');
  if (n.bucks >= 1500) special.push('rich');
  if (['dog', 'gull', 'trash', 'cop', 'guard', 'awning'].includes(n.cause)) special.push('minor');
  if (n.owner !== 'base') special.push('char');
  // 65 %: titular especial si lo hay; si no, uno genérico
  const kind = special.length && Math.random() < 0.65 ? pick(special) : 'generic';
  let key;
  if (kind === 'minor') key = `news.h.minor.${n.cause}`;
  else key = `news.h.${kind}.${1 + Math.floor(Math.random() * HEADLINE_COUNTS[kind])}`;
  let text = t(key, vars);
  if (text === key) text = t('news.h.generic.1', vars);
  // primera letra en mayúscula
  text = text.charAt(0).toUpperCase() + text.slice(1);
  const sub = t('news.sub', { zone: vars.zone, stars: '★'.repeat(Math.max(1, n.stars)) });
  return { headline: text, sub };
}

function today() {
  try {
    return new Date().toLocaleDateString(getLang() === 'es' ? 'es-ES' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

/** HTML de la portada para la pantalla final. */
export function paperHtml(n, news) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  return `
    <div class="paper-mast">${esc(t('news.mast'))}</div>
    <div class="paper-date"><span>${esc(today())}</span><span>${esc(t('news.edition'))}</span><span>${esc(t('news.price'))}</span></div>
    <h3 class="paper-head">${esc(news.headline)}</h3>
    <div class="paper-body">
      ${n.photo ? `<img class="paper-photo" src="${n.photo}" alt="">` : '<div class="paper-photo empty"></div>'}
      <p class="paper-sub">${esc(news.sub)}<br><em>${esc(n.causeText)}</em>${n.rank ? `<br><b class="paper-rank">${esc(t('news.rank', { n: fmt(n.rank) }))}</b>` : ''}</p>
    </div>`;
}

/** Ajusta el texto en líneas que caben en maxW. */
function wrap(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function loadImage(src) {
  return new Promise((res) => {
    if (!src) return res(null);
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

/** Dibuja la portada en un canvas 1080×1350 (formato para redes). */
export async function paperImage(n, news) {
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  // papel
  ctx.fillStyle = '#f3ead6';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(120, 90, 40, 0.06)';
  for (let i = 0; i < 400; i++) ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
  const ink = '#1d1a16';
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  // cabecera
  ctx.font = "900 92px Georgia, 'Times New Roman', serif";
  ctx.fillText(t('news.mast'), W / 2, 130);
  ctx.fillRect(60, 160, W - 120, 6);
  ctx.fillRect(60, 172, W - 120, 2);
  ctx.font = "italic 26px Georgia, serif";
  ctx.textAlign = 'left';
  ctx.fillText(today(), 64, 212);
  ctx.textAlign = 'right';
  ctx.fillText(`${t('news.edition')} · ${t('news.price')}`, W - 64, 212);
  ctx.fillRect(60, 232, W - 120, 2);
  // titular
  ctx.textAlign = 'center';
  ctx.font = "900 70px Georgia, 'Times New Roman', serif";
  let lines = wrap(ctx, news.headline.toUpperCase(), W - 140);
  let size = 70;
  while (lines.length > 4 && size > 44) {
    size -= 6;
    ctx.font = `900 ${size}px Georgia, 'Times New Roman', serif`;
    lines = wrap(ctx, news.headline.toUpperCase(), W - 140);
  }
  let y = 320;
  for (const l of lines) {
    ctx.fillText(l, W / 2, y);
    y += size * 1.08;
  }
  // foto
  const img = await loadImage(n.photo);
  const py = y + 10;
  const ph = Math.min(520, H - (n.rank ? 330 : 290) - py); // deja sitio al pie de foto (y al puesto del ranking)
  ctx.save();
  ctx.beginPath();
  ctx.rect(70, py, W - 140, ph);
  ctx.clip();
  if (img) {
    ctx.filter = 'grayscale(1) sepia(0.35) contrast(1.15)';
    const k = Math.max((W - 140) / img.width, ph / img.height);
    const iw = img.width * k;
    const ih = img.height * k;
    ctx.drawImage(img, 70 + (W - 140 - iw) / 2, py + (ph - ih) / 2, iw, ih);
    ctx.filter = 'none';
  } else {
    ctx.fillStyle = '#cfc4ad';
    ctx.fillRect(70, py, W - 140, ph);
  }
  ctx.restore();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.strokeRect(70, py, W - 140, ph);
  // pie de foto y datos
  ctx.font = "italic 28px Georgia, serif";
  ctx.fillStyle = ink;
  let yy = py + ph + 50;
  for (const l of wrap(ctx, `${news.sub} ${n.causeText}`, W - 160)) {
    ctx.fillText(l, W / 2, yy);
    yy += 36;
  }
  if (n.rank) {
    ctx.font = "bold 30px Georgia, serif";
    ctx.fillText(t('news.rank', { n: fmt(n.rank) }), W / 2, yy + 4);
  }
  ctx.fillRect(60, H - 150, W - 120, 2);
  ctx.font = "bold 34px Georgia, serif";
  ctx.fillText(`${fmt(n.d)} m   ·   ${fmt(n.bucks)} ${t('news.bucksWord')}   ·   ${'★'.repeat(Math.max(1, n.stars))}`, W / 2, H - 98);
  ctx.font = "26px Georgia, serif";
  ctx.fillText(t('news.cta', { url: location.host + location.pathname.replace(/index\.html$/, '') }), W / 2, H - 52);
  return c;
}

/** Comparte la portada (menú del móvil) o la descarga si no se puede. */
export async function sharePaper(n, news) {
  const c = await paperImage(n, news);
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  if (!blob) return 'error';
  const file = new File([blob], 'diario-san-calimar.png', { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: t('news.mast'), text: news.headline });
      return 'shared';
    }
  } catch (e) {
    if (e?.name === 'AbortError') return 'cancel';
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'diario-san-calimar.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'downloaded';
}
