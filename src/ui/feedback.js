// "DANOS TU OPINIÓN": valoración de 1 a 5 estrellas + texto libre (máx. 500).
// Se envía a Supabase (función send_feedback de supabase/opiniones.sql), que
// solo deja escribir. Si tienes cuenta, el servidor añade tu apodo.
// Además del límite del servidor, aquí se espera CONFIG.feedback.cooldown s
// entre envíos desde este dispositivo.

import { CONFIG } from '../config.js';
import { t, getLang } from '../core/i18n.js';
import { Save } from '../core/storage.js';
import { Sound } from '../core/audio.js';
import { Online } from '../online/ranking.js';

export class FeedbackDialog {
  constructor({ toast }) {
    this.toast = toast;
    this.el = document.createElement('div');
    this.el.className = 'modal hidden';
    this.el.id = 'feedback-modal';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'true');
    document.body.appendChild(this.el);
    this.el.addEventListener('click', (e) => this.onClick(e));
    this.el.addEventListener('input', (e) => this.onInput(e));
    this.el.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submit();
    });
    // las teclas del juego no deben dispararse mientras escribes
    this.el.addEventListener('keydown', (e) => e.stopPropagation());
  }

  get isOpen() {
    return !this.el.classList.contains('hidden');
  }

  open() {
    this.rating = 0;
    this.text = '';
    this.error = '';
    this.busy = false;
    this.sent = false;
    this.render();
    this.el.classList.remove('hidden');
  }

  close() {
    this.el.classList.add('hidden');
  }

  render() {
    const F = CONFIG.feedback;
    if (this.sent) {
      this.el.innerHTML = `<div class="modal-box fb-box">
        <h2 class="screen-title small-title">${t('fb.thanks')}</h2>
        <p class="settings-text">${t('fb.thanksText')}</p>
        <button type="button" class="btn btn-primary small" data-act="close">${t('nick.done')}</button>
      </div>`;
      return;
    }
    const acc = Online.account;
    const stars = [1, 2, 3, 4, 5].map((n) => `<button type="button" class="fb-star ${n <= this.rating ? 'on' : ''}" data-star="${n}" aria-label="${n}">★</button>`).join('');
    this.el.innerHTML = `<div class="modal-box fb-box">
      <h2 class="screen-title small-title">${t('fb.title')}</h2>
      <form class="nick-form fb-form">
        <div class="fb-stars" role="group" aria-label="${t('fb.rate')}">${stars}</div>
        <textarea class="fb-text" maxlength="${F.maxLength}" rows="4" placeholder="${t('fb.placeholder')}"></textarea>
        <div class="fb-meta"><span>${acc ? t('fb.asNick', { nick: acc.nick }) : t('fb.anon')}</span><span class="fb-count">${this.text.length}/${F.maxLength}</span></div>
        <p class="nick-error">${this.error}</p>
        <div class="row-btns">
          <button type="button" class="btn small" data-act="close">${t('fb.cancel')}</button>
          <button type="submit" class="btn btn-primary small" ${this.busy || !this.rating ? 'disabled' : ''}>${this.busy ? t('nick.working') : t('fb.send')}</button>
        </div>
      </form>
    </div>`;
    const ta = this.el.querySelector('.fb-text');
    ta.value = this.text;
  }

  onInput(e) {
    if (!e.target.classList.contains('fb-text')) return;
    this.text = e.target.value.slice(0, CONFIG.feedback.maxLength);
    this.el.querySelector('.fb-count').textContent = `${this.text.length}/${CONFIG.feedback.maxLength}`;
  }

  onClick(e) {
    if (e.target === this.el) return this.close();
    const star = e.target.closest('[data-star]');
    if (star) {
      this.rating = Number(star.dataset.star);
      Sound.click();
      this.error = '';
      this.render();
      return;
    }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'close') this.close();
  }

  async submit() {
    if (this.busy || !this.rating) return;
    const F = CONFIG.feedback;
    const last = Save.data.feedbackAt ?? 0;
    const wait = Math.ceil((last + F.cooldown * 1000 - Date.now()) / 1000);
    if (wait > 0) {
      this.error = t('fb.wait', { n: Math.ceil(wait / 60) });
      this.render();
      return;
    }
    this.busy = true;
    this.error = '';
    this.render();
    try {
      await Online.sendFeedback({ rating: this.rating, message: this.text.trim(), version: CONFIG.version, lang: getLang() });
      Save.data.feedbackAt = Date.now();
      Save.save();
      this.sent = true;
      Sound.coin(5);
    } catch (err) {
      const key = `fb.err.${err.code}`;
      const txt = t(key);
      this.error = txt === key ? t('fb.err.server') : txt;
    }
    this.busy = false;
    this.render();
  }
}
