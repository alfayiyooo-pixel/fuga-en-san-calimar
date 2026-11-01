import { getLang } from '../core/i18n.js';

/** Gestiona las pantallas HTML superpuestas (menú, pausa...). */
export class Screens {
  constructor() {
    this.el = {
      menu: document.getElementById('screen-menu'),
      pause: document.getElementById('screen-pause'),
      over: document.getElementById('screen-over'),
      shop: document.getElementById('screen-shop'),
      wardrobe: document.getElementById('screen-wardrobe'),
      missions: document.getElementById('screen-missions'),
      daily: document.getElementById('screen-daily'),
      hudButtons: document.getElementById('hud-buttons'),
    };
  }

  /** Muestra una pantalla (o ninguna con null) y oculta el resto. */
  show(name) {
    for (const key of ['menu', 'pause', 'over', 'shop', 'wardrobe', 'missions', 'daily']) {
      if (!this.el[key]) continue;
      this.el[key].classList.toggle('hidden', key !== name);
    }
    // quitar el foco evita que ESPACIO "pulse" un botón oculto
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  showHudButtons(visible) {
    this.el.hudButtons.classList.toggle('hidden', !visible);
  }

  /** Rellena la pantalla final con el resultado de la partida. */
  /** Actualiza todos los monederos visibles. */
  refreshWallet(bucks, gems, fmt, tickets = 0) {
    document.querySelectorAll('.w-bucks').forEach((el) => {
      if (el.textContent !== fmt(bucks)) el.parentElement.classList.remove('bump'), void el.offsetWidth, el.parentElement.classList.add('bump');
      el.textContent = fmt(bucks);
    });
    document.querySelectorAll('.w-tickets').forEach((el) => (el.textContent = fmt(tickets)));
    document.querySelectorAll('.w-gems').forEach((el) => {
      if (el.textContent !== fmt(gems)) el.parentElement.classList.remove('bump'), void el.offsetWidth, el.parentElement.classList.add('bump');
      el.textContent = fmt(gems);
    });
  }

  fillGameOver({ distance, best, stars, cause, newBest, bucks, almost, almostSub, win, near, mult, gems, fmt, animate }) {
    const $ = (id) => document.getElementById(id);
    $('over-gems-wrap').classList.toggle('hidden', !gems);
    $('over-gems').textContent = `+${gems}`;
    // los números "suben" desde 0 (solo la primera vez que se muestra)
    const countUp = (el, to, suffix = '') => {
      if (!animate) {
        el.textContent = fmt(to) + suffix;
        return;
      }
      const t0 = performance.now();
      const dur = 900;
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        el.textContent = fmt(to * (1 - (1 - k) ** 3)) + suffix;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    countUp($('over-distance'), distance, ' m');
    countUp($('over-bucks'), bucks);
    $('over-best').textContent = `${fmt(best)} m`;
    $('over-stars').textContent = '★'.repeat(stars) + '☆'.repeat(5 - stars);
    $('over-near').textContent = fmt(near);
    $('over-mult').textContent = `x${mult}`;
    $('over-cause').textContent = cause;
    $('over-newbest').classList.toggle('hidden', !newBest);
    const a = $('over-almost');
    a.textContent = almost;
    a.classList.toggle('win', !!win);
    if (almostSub) {
      const sm = document.createElement('small');
      sm.textContent = almostSub;
      a.appendChild(sm);
    }
  }

  on(id, fn) {
    document.getElementById(id).addEventListener('click', (e) => {
      e.preventDefault();
      fn();
    });
  }

  setMuteIcon(muted) {
    document.querySelectorAll('.btn-mute').forEach((b) => {
      b.textContent = muted ? '🔇' : '🔊';
      b.setAttribute('aria-pressed', String(muted));
    });
  }

  refreshLangButtons() {
    document.querySelectorAll('.lang-btn').forEach((b) => {
      const active = b.dataset.lang === getLang();
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
  }
}
