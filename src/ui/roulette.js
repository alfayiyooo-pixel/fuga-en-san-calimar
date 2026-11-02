import { CONFIG } from '../config.js';
import { t, fmt } from '../core/i18n.js';
import { Sound } from '../core/audio.js';
import { Save } from '../core/storage.js';
import { Profile } from '../meta/profile.js';

const ICON = { bucks_s: '💵', bucks_m: '💵', bucks_l: '💰', gems: '💎', revive: '❤️', boost: '🧲', tickets: '🪙', xp: '⭐' };

export function prizeLabel(p) {
  if (p.bucks) return `+${fmt(p.bucks)}`;
  if (p.gems) return `+${p.gems}`;
  if (p.tickets) return `+${p.tickets}`;
  if (p.xp) return `+${p.xp} XP`;
  return t(`roulette.${p.id}`);
}

/**
 * Ruleta al morir. Se paga con fichas (solo se ganan jugando).
 * onDone(prize | null): null = no se ha girado.
 */
export class Roulette {
  constructor(root, { onDone }) {
    this.root = root;
    this.onDone = onDone;
    root.innerHTML = `
      <h2 class="screen-title" data-i18n="roulette.title"></h2>
      <div class="wheel-wrap">
        <div class="wheel-pointer">▼</div>
        <canvas class="wheel"></canvas>
      </div>
      <div class="roulette-result"></div>
      <div class="row roulette-btns"></div>
      <p class="hint small" data-i18n="roulette.rule"></p>`;
    this.canvas = root.querySelector('.wheel');
    this.ctx = this.canvas.getContext('2d');
    this.angle = 0;
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'spin') this.spin();
      else if (b.dataset.act === 'skip') this.finish(null);
      else if (b.dataset.act === 'continue') this.finish(this.result);
    });
  }

  /** Premios disponibles (sin "revivir" si ya se usó en esta partida). */
  prizes() {
    return CONFIG.roulette.prizes.filter((p) => !(p.id === 'revive' && this.noRevive));
  }

  open({ noRevive = false } = {}) {
    this.noRevive = noRevive;
    this.result = null;
    this.spinning = false;
    this.angle = 0;
    this.renderButtons();
    this.root.querySelector('.roulette-result').textContent = '';
    this.draw();
  }

  renderButtons() {
    const btns = this.root.querySelector('.roulette-btns');
    if (this.result) {
      btns.innerHTML = `<button class="btn btn-primary" data-act="continue">${this.result.id === 'revive' ? t('roulette.keepRunning') : t('roulette.continue')}</button>`;
      return;
    }
    const cost = CONFIG.roulette.cost;
    btns.innerHTML = `
      <button class="btn btn-primary" data-act="spin" ${Save.data.tickets < cost || this.spinning ? 'disabled' : ''}>${t('roulette.spin', { n: cost })}</button>
      <button class="btn" data-act="skip" ${this.spinning ? 'disabled' : ''}>${t('roulette.skip')}</button>
      <div class="coin coin-tickets">🪙 <b>${fmt(Save.data.tickets)}</b></div>`;
  }

  spin() {
    const cost = CONFIG.roulette.cost;
    if (this.spinning || Save.data.tickets < cost) return;
    Save.data.tickets -= cost;
    Profile.changed();
    this.spinning = true;
    this.renderButtons();
    // se elige el premio por pesos y luego se calcula dónde debe parar la rueda
    const list = this.prizes();
    let roll = Math.random() * list.reduce((s, p) => s + p.w, 0);
    let win = list[0];
    for (const p of list) {
      roll -= p.w;
      if (roll <= 0) {
        win = p;
        break;
      }
    }
    const seg = (Math.PI * 2) / list.length;
    const idx = list.indexOf(win);
    // el puntero está arriba (-π/2); el gajo i ocupa [i·seg, (i+1)·seg) + ángulo
    const jitter = (Math.random() - 0.5) * seg * 0.6;
    const target = -Math.PI / 2 - (idx + 0.5) * seg + jitter;
    const turns = 5;
    const TAU = Math.PI * 2;
    const from = this.angle % TAU;
    const delta = (((target - from) % TAU) + TAU) % TAU; // lo que falta para que el gajo quede bajo el puntero
    const end = from + turns * TAU + delta;
    const total = CONFIG.roulette.spinTime * 1000;
    const t0 = performance.now();
    let lastSeg = -1;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / total);
      const e = 1 - (1 - k) ** 4;
      this.angle = from + (end - from) * e;
      // "tic" cada vez que pasa un gajo bajo el puntero
      const under = Math.floor(((-Math.PI / 2 - this.angle) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2) / seg);
      if (under !== lastSeg) {
        lastSeg = under;
        Sound.tick();
      }
      this.draw();
      if (k < 1) requestAnimationFrame(step);
      else this.land(win);
    };
    requestAnimationFrame(step);
  }

  land(prize) {
    this.spinning = false;
    this.result = prize;
    this.highlight = prize;
    this.draw();
    if (prize.bucks || prize.gems || prize.id === 'bucks_l') Sound.briefcase();
    else Sound.fanfare();
    this.root.querySelector('.roulette-result').innerHTML = `${ICON[prize.id]} <b>${prizeLabel(prize)}</b> <span class="small">${t(`roulette.${prize.id}.desc`)}</span>`;
    this.renderButtons();
  }

  finish(prize) {
    this.onDone(prize);
  }

  draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.canvas.getBoundingClientRect();
    const size = Math.max(1, Math.round(r.width * dpr));
    if (this.canvas.width !== size) {
      this.canvas.width = size;
      this.canvas.height = size;
    }
    const ctx = this.ctx;
    const S = 300;
    ctx.setTransform(size / S, 0, 0, size / S, 0, 0);
    ctx.clearRect(0, 0, S, S);
    const list = this.prizes();
    const seg = (Math.PI * 2) / list.length;
    const c = S / 2;
    const R = 140;
    ctx.save();
    ctx.translate(c, c);
    // aro exterior con bombillas
    ctx.fillStyle = '#1b1030';
    ctx.beginPath();
    ctx.arc(0, 0, R + 8, 0, Math.PI * 2);
    ctx.fill();
    list.forEach((p, i) => {
      const a0 = this.angle + i * seg;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, a0, a0 + seg);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1b1030';
      ctx.lineWidth = 3;
      ctx.stroke();
      if (this.highlight === p) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fill();
      }
      ctx.save();
      ctx.rotate(a0 + seg / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '26px sans-serif';
      ctx.fillStyle = '#000';
      ctx.fillText(ICON[p.id], R * 0.72, 0);
      ctx.font = "12px 'Bungee', Impact, sans-serif";
      ctx.fillStyle = '#1b1030';
      ctx.fillText(prizeLabel(p).slice(0, 10), R * 0.42, 0);
      ctx.restore();
    });
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      ctx.fillStyle = (k + Math.floor(performance.now() / 150)) % 2 ? '#fff6c2' : '#ffb627';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * (R + 4), Math.sin(a) * (R + 4), 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#1b1030';
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
