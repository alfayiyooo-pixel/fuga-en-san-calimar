import { getLang } from '../core/i18n.js';

/** Gestiona las pantallas HTML superpuestas (menú, pausa...). */
export class Screens {
  constructor() {
    this.el = {
      menu: document.getElementById('screen-menu'),
      pause: document.getElementById('screen-pause'),
      hudButtons: document.getElementById('hud-buttons'),
    };
  }

  /** Muestra una pantalla (o ninguna con null) y oculta el resto. */
  show(name) {
    for (const key of ['menu', 'pause']) {
      this.el[key].classList.toggle('hidden', key !== name);
    }
    // quitar el foco evita que ESPACIO "pulse" un botón oculto
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  showHudButtons(visible) {
    this.el.hudButtons.classList.toggle('hidden', !visible);
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
