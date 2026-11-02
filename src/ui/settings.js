import { t } from '../core/i18n.js';
import { Sound } from '../core/audio.js';
import { Save } from '../core/storage.js';
import { Voice } from '../core/voice.js';
import { getLang } from '../core/i18n.js';
import { Pwa } from '../core/pwa.js';

/** Tarjeta "App": instalar y pasar el progreso a otro navegador/la app de iPhone. */
export function appCard({ onInstall, onIosHelp, toast }) {
  let showImport = false;
  let code = '';
  return {
    render() {
      const mode = Pwa.mode;
      return `
        <div class="card">
          <h3>📲 ${t('pwa.title')}</h3>
          <p class="settings-text">${Pwa.standalone ? t('pwa.installed') : mode ? t('pwa.pitch') : t('pwa.noInstall')}</p>
          <div class="row-btns">
            ${mode === 'prompt' ? `<button class="btn small" data-act="install">📲 ${t('pwa.install')}</button>` : ''}
            ${mode === 'ios' ? `<button class="btn small" data-act="ios-help">📲 ${t('pwa.install')}</button>` : ''}
          </div>
          <h3>💾 ${t('transfer.title')}</h3>
          <p class="settings-text">${t('transfer.text')}</p>
          <div class="row-btns">
            <button class="btn small" data-act="export">📋 ${t('transfer.copy')}</button>
            <button class="btn small" data-act="import-open">📥 ${t('transfer.paste')}</button>
          </div>
          ${code ? `<textarea class="code-box" readonly>${code}</textarea>` : ''}
          ${showImport ? `<textarea class="code-box" id="import-code" placeholder="SC1:…"></textarea>
            <button class="btn small" data-act="import">✔ ${t('transfer.load')}</button>` : ''}
        </div>`;
    },
    onClick(act, el, screen) {
      if (act === 'install') onInstall();
      else if (act === 'ios-help') onIosHelp();
      else if (act === 'export') {
        code = Save.exportCode();
        showImport = false;
        navigator.clipboard?.writeText(code).then(() => toast(t('transfer.copied')), () => {});
        screen.render();
        screen.root.querySelector('.code-box')?.select();
      } else if (act === 'import-open') {
        showImport = !showImport;
        code = '';
        screen.render();
      } else if (act === 'import') {
        const val = screen.root.querySelector('#import-code')?.value ?? '';
        if (Save.importCode(val)) {
          toast(t('transfer.done'));
          setTimeout(() => location.reload(), 900);
        } else {
          toast(t('transfer.bad'));
        }
      } else return false;
      return true;
    },
  };
}

/**
 * Pantalla de ajustes: volúmenes independientes de música, efectos y voces,
 * y silencio general. Otras secciones (app, créditos) se añaden con addCard().
 */
export class SettingsScreen {
  constructor(root, { onClose, onMute, onCredits }) {
    this.root = root;
    this.onCredits = onCredits;
    this.onClose = onClose;
    this.onMute = onMute;
    this.cards = [];
    root.innerHTML = `
      <header class="panel-head">
        <button class="icon-btn" data-act="back" data-i18n-aria="common.back">←</button>
        <h2 class="panel-title" data-i18n="settings.title"></h2>
      </header>
      <div class="settings-body scroll"></div>`;
    this.body = root.querySelector('.settings-body');
    root.addEventListener('click', (e) => this.onClick(e));
    root.addEventListener('input', (e) => this.onInput(e));
    root.addEventListener('change', (e) => this.onChange(e));
  }

  /** Añade una tarjeta: render() devuelve HTML; onClick(act, el) gestiona sus botones. */
  addCard(card) {
    this.cards.push(card);
  }

  open() {
    this.render();
  }

  get volumes() {
    return Save.data.settings.volumes;
  }

  render() {
    const v = this.volumes;
    const slider = (key, icon) => `
      <label class="vol-row">
        <span class="vol-label">${icon} ${t(`settings.${key}`)}</span>
        <input type="range" min="0" max="100" step="5" value="${Math.round(v[key] * 100)}" data-vol="${key}">
        <output>${Math.round(v[key] * 100)}%</output>
      </label>`;
    this.body.innerHTML = `
      <div class="settings-grid">
        <div class="card">
          <h3>🔊 ${t('settings.sound')}</h3>
          ${slider('music', '🎵')}
          ${slider('sfx', '💥')}
          ${slider('voice', '🗣️')}
          <div class="row-btns">
            <button class="btn small" data-act="mute">${Save.data.settings.muted ? '🔇 ' + t('settings.unmute') : '🔊 ' + t('settings.mute')}</button>
            <button class="btn small" data-act="test-voice">🗣️ ${t('settings.testVoice')}</button>
          </div>
          <div class="row-btns">
            <button class="btn small" data-act="credits">📜 ${t('credits.title')}</button>
          </div>
        </div>
        ${this.cards.map((c) => c.render()).join('')}
      </div>`;
  }

  onInput(e) {
    const el = e.target.closest('[data-vol]');
    if (!el) return;
    const key = el.dataset.vol;
    this.volumes[key] = Number(el.value) / 100;
    el.nextElementSibling.textContent = `${el.value}%`;
    Sound.setLevels({ [key]: this.volumes[key] });
  }

  onChange(e) {
    const el = e.target.closest('[data-vol]');
    if (!el) return;
    Save.save();
    if (el.dataset.vol === 'sfx') Sound.coin(3);
  }

  onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    if (act === 'back') {
      Sound.click();
      this.onClose();
    } else if (act === 'mute') {
      this.onMute();
      this.render();
    } else if (act === 'credits') {
      Sound.click();
      this.onCredits();
    } else if (act === 'test-voice') {
      Sound.unlock();
      const ids = ['veteran', 'pilot', 'wild'];
      const id = ids[Math.floor(Math.random() * 3)];
      Voice.say(id, 'coger', getLang(), t(`voice.${id}.coger`));
    } else {
      for (const c of this.cards) if (c.onClick?.(act, el, this)) return;
    }
  }
}
