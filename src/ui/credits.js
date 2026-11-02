import { t } from '../core/i18n.js';
import { Sound } from '../core/audio.js';
import { CREDITS } from '../credits.js';
import { MUSIC_TRACKS } from '../core/music.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const link = (url, text) => (url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${text}</a>` : text);

/** Pantalla de créditos (datos en src/credits.js). */
export class CreditsScreen {
  constructor(root, { onClose }) {
    this.root = root;
    root.innerHTML = `
      <header class="panel-head">
        <button class="icon-btn" data-act="back" data-i18n-aria="common.back">←</button>
        <h2 class="panel-title" data-i18n="credits.title"></h2>
      </header>
      <div class="credits-body scroll"></div>`;
    this.body = root.querySelector('.credits-body');
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-act=back]')) {
        Sound.click();
        onClose();
      }
    });
  }

  open() {
    this.render();
  }

  render() {
    const music = MUSIC_TRACKS.map((id) => {
      const c = CREDITS.music.find((m) => m.track === id);
      const what = c
        ? `${link(c.url, `«${esc(c.title)}»`)} — ${esc(c.author)}${c.license ? ` <span class="lic">(${esc(c.license)})</span>` : ''}`
        : `<span class="dim">${t('credits.generated')}</span>`;
      return `<li><b>${t(`credits.track.${id}`)}:</b> ${what}</li>`;
    }).join('');
    const voices = CREDITS.voices.length
      ? CREDITS.voices.map((v) => `<li><b>${esc(v.character)}:</b> ${esc(v.author)}${v.license ? ` <span class="lic">(${esc(v.license)})</span>` : ''}</li>`).join('')
      : `<li class="dim">${t('credits.voicesDefault')}</li>`;
    const other = CREDITS.other.map((o) => `<li><b>${link(o.url, esc(o.what))}</b> — ${esc(o.author)} <span class="lic">(${esc(o.license)})</span></li>`).join('');
    this.body.innerHTML = `
      <div class="settings-grid">
        <div class="card"><h3>🎮 ${t('credits.game')}</h3><p class="settings-text">${t('credits.gameText')}</p></div>
        <div class="card"><h3>🎵 ${t('credits.music')}</h3><ul class="credits-list">${music}</ul></div>
        <div class="card"><h3>🗣️ ${t('credits.voices')}</h3><ul class="credits-list">${voices}</ul></div>
        <div class="card"><h3>🔤 ${t('credits.other')}</h3><ul class="credits-list">${other}</ul></div>
      </div>`;
  }
}
