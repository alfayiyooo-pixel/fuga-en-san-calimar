import { getLang } from '../core/i18n.js';

/** Gestiona las pantallas HTML superpuestas (menú, pausa...). */
export class Screens {
  constructor() {
    this.el = {
      menu: document.getElementById('screen-menu'),
      pause: document.getElementById('screen-pause'),
      over: document.getElementById('screen-over'),
      hudButtons: document.getElementById('hud-buttons'),
    };
  }

  /** Muestra una pantalla (o ninguna con null) y oculta el resto. */
  show(name) {
    for (const key of ['menu', 'pause', 'over']) {
      this.el[key].classList.toggle('hidden', key !== name);
    }
    // quitar el foco evita que ESPACIO "pulse" un botón oculto
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  showHudButtons(visible) {
    this.el.hudButtons.classList.toggle('hidden', !visible);
  }

  /** Rellena la pantalla final con el resultado de la partida. */
  fillGameOver({ distance, best, stars, cause, newBest }) {
    document.getElementById('over-distance').textContent = `${distance} m`;
    document.getElementById('over-best').textContent = `${best} m`;
    document.getElementById('over-stars').textContent = '★'.repeat(stars) + '☆'.repeat(5 - stars);
    document.getElementById('over-cause').textContent = cause;
    document.getElementById('over-newbest').classList.toggle('hidden', !newBest);
  }

  on(id, fn) {
    document.getElementById(id).addEventListener('click', (e) => {
      e.preventDefault();
      fn();
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
