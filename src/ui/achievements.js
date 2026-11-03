import { t, fmt } from '../core/i18n.js';
import { Sound } from '../core/audio.js';
import { Save } from '../core/storage.js';
import { CONFIG } from '../config.js';
import { ACHIEVEMENTS, Achievements } from '../meta/achievements.js';

const TIER_ORDER = { gold: 0, silver: 1, bronze: 2 };

/** Pantalla de logros y medallas. */
export class AchievementsScreen {
  constructor(root, { onClose }) {
    this.root = root;
    root.innerHTML = `
      <header class="panel-head">
        <button class="icon-btn" data-act="back" data-i18n-aria="common.back">←</button>
        <h2 class="panel-title" data-i18n="ach.title"></h2>
        <div class="ach-summary"></div>
      </header>
      <div class="ach-body scroll"></div>`;
    this.body = root.querySelector('.ach-body');
    this.summary = root.querySelector('.ach-summary');
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
    const ctx = Achievements.context();
    const c = Achievements.counts();
    this.summary.innerHTML = ['gold', 'silver', 'bronze'].map((tier) => `<span class="medal-count ${tier}"><i></i>${c[tier][0]}/${c[tier][1]}</span>`).join('');
    // primero los conseguidos más recientes, luego los que faltan por progreso
    const list = [...ACHIEVEMENTS].sort((a, b) => {
      const ua = Achievements.unlocked(a.id) ? 0 : 1;
      const ub = Achievements.unlocked(b.id) ? 0 : 1;
      if (ua !== ub) return ua - ub;
      return TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
    });
    this.body.innerHTML = `<div class="ach-grid">${list.map((def) => {
      const done = Achievements.unlocked(def.id);
      const p = Achievements.progress(def, ctx);
      const frac = Math.min(1, p / def.n);
      const date = done ? new Date(Save.data.achievements[def.id]).toLocaleDateString() : '';
      return `<div class="ach ${def.tier} ${done ? 'done' : ''}">
        <div class="ach-medal"><span>${def.icon}</span></div>
        <div class="ach-info">
          <div class="ach-name">${t(`ach.${def.id}`)}</div>
          <div class="ach-desc">${t(`ach.${def.id}.d`, { n: fmt(def.n) })}</div>
          ${done ? `<div class="ach-date">✔ ${date}</div>` : `<div class="ach-bar"><span style="width:${Math.round(frac * 100)}%"></span></div><div class="ach-prog">${fmt(p)} / ${fmt(def.n)}</div>`}
        </div>
        <div class="ach-reward">+${CONFIG.achievements.reward[def.tier]} 💎</div>
      </div>`;
    }).join('')}</div>`;
  }
}
