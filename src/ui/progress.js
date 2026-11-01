import { CONFIG } from '../config.js';
import { t, fmt } from '../core/i18n.js';
import { Sound } from '../core/audio.js';
import { Save } from '../core/storage.js';
import { Profile } from '../meta/profile.js';
import { Progression, xpFor, levelReward } from '../meta/progression.js';
import { Missions, missionDef } from '../meta/missions.js';
import { badgeHtml } from './badge.js';
import { ROMAN } from './shop.js';

export function rewardText(r) {
  const parts = [];
  if (r.bucks) parts.push(t('reward.bucks', { n: fmt(r.bucks) }));
  if (r.gems) parts.push(t('reward.gems', { n: fmt(r.gems) }));
  if (r.tickets) parts.push(t('reward.tickets', { n: fmt(r.tickets) }));
  if (r.voucher) parts.push(t('reward.voucher'));
  return parts.join('  ');
}

export function missionText(def) {
  return t(`mission.${def.type}`, { n: fmt(def.n), stars: def.stars });
}

/** Pantalla de misiones, nivel, prestigio y estadísticas. */
export class ProgressScreen {
  constructor(root, { onClose, toast, onPrestige }) {
    this.root = root;
    this.onClose = onClose;
    this.toast = toast;
    this.onPrestige = onPrestige;
    this.confirmPrestige = false;
    root.innerHTML = `
      <header class="panel-head">
        <button class="icon-btn" data-act="back" data-i18n-aria="common.back">←</button>
        <h2 class="panel-title" data-i18n="progress.title"></h2>
        <div class="wallet inline">
          <span class="coin coin-bucks">💵 <b class="w-bucks">0</b></span>
          <span class="coin coin-gems">💎 <b class="w-gems">0</b></span>
          <span class="coin coin-tickets">🪙 <b class="w-tickets">0</b></span>
        </div>
      </header>
      <div class="progress-body scroll"></div>`;
    this.body = root.querySelector('.progress-body');
    root.addEventListener('click', (e) => this.onClick(e));
    Profile.onChange(() => {
      if (!root.classList.contains('hidden')) this.render();
    });
  }

  open() {
    Missions.fill();
    this.confirmPrestige = false;
    this.render();
  }

  onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const d = el.dataset;
    if (d.act === 'back') {
      Sound.click();
      this.onClose();
    } else if (d.act === 'discard') {
      if (Missions.discard(d.id)) Sound.click();
      else this.toast(t('progress.discardWait'));
      this.render();
    } else if (d.act === 'prestige') {
      if (!this.confirmPrestige) {
        this.confirmPrestige = true;
        Sound.click();
        this.render();
        return;
      }
      const res = Progression.prestige();
      this.confirmPrestige = false;
      if (res) this.onPrestige(res);
      this.render();
    }
  }

  render() {
    const d = Save.data;
    const lvl = d.level;
    const atMax = Progression.atMax;
    const next = atMax ? null : levelReward(lvl + 1);
    const nextRank = d.prestige + 1;
    const prestigeGems = CONFIG.progression.prestigeGems[nextRank - 1] ?? 0;
    const fav = Object.entries(d.stats.charUses ?? {}).sort((a, b) => b[1] - a[1])[0];
    this.body.innerHTML = `
      <div class="progress-grid">
        <section class="card level-card">
          <div class="level-top">${badgeHtml(d.prestige, true)}<span class="level-num">${t('progress.level', { n: lvl })}</span></div>
          <div class="xpbar"><span style="width:${Math.round(Progression.fraction * 100)}%"></span></div>
          <div class="small">${atMax ? t('progress.maxLevel') : t('progress.xp', { a: fmt(d.xp), b: fmt(xpFor(lvl)) })}</div>
          ${next ? `<div class="small next-reward">${t('progress.next')} ${rewardText(next)}</div>` : ''}
          <h3>${t('progress.prestige')} ${d.prestige ? ROMAN[d.prestige] : ''}</h3>
          ${Progression.canPrestige
            ? `<p class="small">${t('progress.prestigeInfo', { g: prestigeGems })}</p>
               <button class="btn small ${this.confirmPrestige ? 'btn-buy confirm' : 'btn-primary'}" data-act="prestige">${this.confirmPrestige ? t('shop.confirm') : t('progress.prestigeBtn', { n: ROMAN[nextRank] })}</button>`
            : `<p class="small">${d.prestige >= CONFIG.progression.prestigeMax ? '★' : t('progress.prestigeLocked', { n: CONFIG.progression.maxLevel })}</p>`}
        </section>
        <section class="card missions-card">
          <h3>🎯 ${t('progress.missions')}</h3>
          ${Missions.active.map((a) => {
            const def = missionDef(a.id);
            const r = CONFIG.missions.rewards[def.tier];
            return `<div class="mission tier-${def.tier} ${a.done ? 'done' : ''}">
              <div class="m-tier">${t(`tier.${def.tier}`)}</div>
              <div class="m-text">${a.done ? '✔ ' : ''}${missionText(def)}</div>
              <div class="m-reward">${rewardText(r)} · ${r.xp} XP</div>
              ${a.done ? '' : `<button class="m-discard" data-act="discard" data-id="${a.id}" ${Missions.canDiscard() ? '' : 'disabled'}>↻ ${t('progress.discard')}</button>`}
            </div>`;
          }).join('')}
        </section>
        <section class="card stats-card">
          <h3>📊 ${t('progress.stats')}</h3>
          <div class="stat-line"><span>${t('stats.best')}</span><b>${fmt(d.best.distance)} m</b></div>
          <div class="stat-line"><span>${t('stats.totalBucks')}</span><b>${fmt(d.stats.totalBucks)}</b></div>
          <div class="stat-line"><span>${t('stats.runs')}</span><b>${fmt(d.stats.runs)}</b></div>
          <div class="stat-line"><span>${t('stats.favorite')}</span><b>${fav && fav[1] > 0 ? t(`char.${fav[0]}.alias`) : t('stats.none')}</b></div>
        </section>
      </div>`;
  }
}
