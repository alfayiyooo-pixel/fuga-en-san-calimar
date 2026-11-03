// Pantalla del RANKING GLOBAL y diálogo del APODO (crear / recuperar / ver código).
// Nunca bloquea el juego: todo se puede cerrar y jugar sin cuenta.

import { t, fmt } from '../core/i18n.js';
import { Sound } from '../core/audio.js';
import { Online, nickError } from '../online/ranking.js';
import { badgeHtml } from './badge.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const HERO_ICON = { base: '🏃', veteran: '⌚', pilot: '🏎️', wild: '💥' };
export const heroName = (id) => (id === 'base' || !id ? t('rank.hero.base') : t(`char.${id}.alias`));

/** Texto de error legible para un código de Online. */
export function onlineErrorText(code) {
  const key = code?.startsWith('nick_') && code !== 'nick_taken' ? code.slice(5) : code;
  const txt = t(`nick.err.${key}`);
  return txt.startsWith('nick.err.') ? t('nick.err.server') : txt;
}

// ------------------------------------------------------------------
// Diálogo del apodo (se crea una vez y se reutiliza)
// ------------------------------------------------------------------
export class NickDialog {
  constructor({ toast }) {
    this.toast = toast;
    this.el = document.createElement('div');
    this.el.className = 'modal hidden';
    this.el.id = 'nick-modal';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'true');
    document.body.appendChild(this.el);
    this.el.addEventListener('click', (e) => this.onClick(e));
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

  /** mode: 'create' | 'recover' | 'code'. onDone(result) al terminar bien. */
  open(mode = 'create', { onDone, onClose } = {}) {
    this.mode = mode;
    this.onDone = onDone;
    this.onCloseCb = onClose;
    this.error = '';
    this.busy = false;
    this.render();
    this.el.classList.remove('hidden');
    setTimeout(() => this.el.querySelector('input')?.focus(), 50);
  }

  close() {
    this.el.classList.add('hidden');
    this.onCloseCb?.();
  }

  render() {
    const acc = Online.account;
    let body;
    if (this.mode === 'code') {
      body = `
        <h2 class="screen-title small-title">${t('nick.codeTitle')}</h2>
        <p class="settings-text">${t('nick.codeText')}</p>
        <div class="code-big">${esc(acc?.code ?? '')}</div>
        <div class="row-btns">
          <button type="button" class="btn small" data-act="copy">📋 ${t('nick.copy')}</button>
          <button type="button" class="btn btn-primary small" data-act="close">${t('nick.done')}</button>
        </div>`;
    } else if (this.mode === 'recover') {
      body = `
        <h2 class="screen-title small-title">${t('nick.recoverTitle')}</h2>
        <p class="settings-text">${t('nick.recoverText')}${acc ? ` ${t('acct.recoverWarn')}` : ''}</p>
        <form class="nick-form">
          <input class="nick-input code" maxlength="20" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX">
          <p class="nick-error">${esc(this.error)}</p>
          <div class="row-btns">
            <button type="button" class="btn small" data-act="to-create">${t('nick.back')}</button>
            <button type="submit" class="btn btn-primary small" ${this.busy ? 'disabled' : ''}>${this.busy ? t('nick.working') : t('nick.recover')}</button>
          </div>
        </form>`;
    } else {
      body = `
        <h2 class="screen-title small-title">${t('nick.title')}</h2>
        <p class="settings-text">${t('nick.text')}</p>
        <form class="nick-form">
          <input class="nick-input" maxlength="16" autocomplete="off" spellcheck="false" placeholder="${t('nick.placeholder')}">
          <p class="nick-error">${esc(this.error)}</p>
          <div class="row-btns">
            <button type="button" class="btn small" data-act="close">${t('nick.cancel')}</button>
            <button type="submit" class="btn btn-primary small" ${this.busy ? 'disabled' : ''}>${this.busy ? t('nick.working') : t('nick.create')}</button>
          </div>
          <button type="button" class="link-btn" data-act="to-recover">${t('nick.haveCode')}</button>
        </form>`;
    }
    const prev = this.el.querySelector('input')?.value ?? '';
    this.el.innerHTML = `<div class="modal-box nick-box">${body}</div>`;
    const inp = this.el.querySelector('input');
    if (inp) inp.value = prev;
  }

  async submit() {
    if (this.busy) return;
    const val = this.el.querySelector('input')?.value ?? '';
    if (this.mode === 'create') {
      const err = nickError(val);
      if (err) {
        this.error = onlineErrorText(`nick_${err}`);
        this.render();
        return;
      }
    }
    this.busy = true;
    this.error = '';
    this.render();
    try {
      const r = this.mode === 'create' ? await Online.createAccount(val) : await Online.recover(val);
      Sound.levelUp?.();
      this.busy = false;
      const done = this.onDone;
      if (this.mode === 'create') {
        // se enseña el código de recuperación una vez creada la cuenta
        this.mode = 'code';
        this.render();
      } else {
        this.toast(t('nick.recovered', { nick: r.nick }));
        this.close();
      }
      done?.(r);
    } catch (e) {
      this.busy = false;
      this.error = onlineErrorText(e.code);
      this.render();
    }
  }

  onClick(e) {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (e.target === this.el) act || this.close();
    if (!act) return;
    Sound.click();
    if (act === 'close') this.close();
    else if (act === 'to-recover' || act === 'to-create') {
      this.mode = act === 'to-recover' ? 'recover' : 'create';
      this.error = '';
      this.el.querySelector('input') && (this.el.querySelector('input').value = '');
      this.render();
    } else if (act === 'copy') {
      navigator.clipboard?.writeText(Online.account?.code ?? '').then(() => this.toast(t('nick.copied')), () => {});
    }
  }
}

// ------------------------------------------------------------------
// Pantalla del ranking
// ------------------------------------------------------------------
export class RankingScreen {
  constructor(root, { onClose, nick }) {
    this.root = root;
    this.nick = nick;
    this.period = 'all';
    this.cache = {};
    root.innerHTML = `
      <header class="panel-head">
        <button class="icon-btn" data-act="back" data-i18n-aria="common.back">←</button>
        <h2 class="panel-title" data-i18n="rank.title"></h2>
      </header>
      <div class="rank-tabs">
        <button class="tab-btn" data-tab="all" data-i18n="rank.tabAll"></button>
        <button class="tab-btn" data-tab="week" data-i18n="rank.tabWeek"></button>
        <span class="rank-note"></span>
      </div>
      <div class="rank-body scroll"></div>
      <div class="rank-me"></div>`;
    this.body = root.querySelector('.rank-body');
    this.me = root.querySelector('.rank-me');
    root.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act], [data-tab]');
      if (!el) return;
      Sound.click();
      if (el.dataset.act === 'back') onClose();
      else if (el.dataset.act === 'nick') this.nick('create', () => this.load(true));
      else if (el.dataset.act === 'retry') this.load(true);
      else if (el.dataset.tab) {
        this.period = el.dataset.tab;
        this.load();
      }
    });
    Online.onChange(() => {
      if (!this.root.classList.contains('hidden')) this.load(true);
    });
  }

  open() {
    this.load(true);
    Online.flush();
  }

  async load(force = false) {
    const period = this.period;
    this.root.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === period));
    this.root.querySelector('.rank-note').textContent = period === 'week' ? t('rank.weekReset') : '';
    if (!force && this.cache[period]) return this.render(this.cache[period]);
    this.body.innerHTML = `<p class="rank-msg">${t('rank.loading')}</p>`;
    this.renderMe(null, true);
    try {
      const [list, mine] = await Promise.all([Online.leaderboard(period), Online.myRank(period).catch(() => null)]);
      this.cache[period] = { list, mine };
      if (this.period === period) this.render(this.cache[period]);
    } catch (e) {
      if (this.period !== period) return;
      const key = e.code === 'offline' ? 'rank.offline' : e.code === 'not_setup' ? 'rank.notSetup' : e.code === 'disabled' ? 'nick.err.disabled' : 'rank.error';
      this.body.innerHTML = `<p class="rank-msg">${t(key)}</p><button class="btn small" data-act="retry">↻ ${t('rank.retry')}</button>`;
      this.renderMe(null, false);
    }
  }

  render({ list, mine }) {
    const myNick = Online.account?.nick?.toLowerCase();
    if (!list.length) {
      this.body.innerHTML = `<p class="rank-msg">${t('rank.empty')}</p>`;
    } else {
      this.body.innerHTML = `<div class="rank-list">${list.map((r) => {
        const pos = r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : `${r.rank}`;
        const me = myNick && r.nick.toLowerCase() === myNick;
        return `<div class="rank-row ${me ? 'me' : ''} ${r.rank <= 3 ? 'top' : ''}">
          <span class="rk-pos">${pos}</span>
          <span class="rk-nick">${esc(r.nick)} ${badgeHtml(r.prestige)}</span>
          <span class="rk-hero" title="${esc(heroName(r.hero))}">${HERO_ICON[r.hero] ?? '🏃'} <span class="rk-hero-name">${esc(heroName(r.hero))}</span></span>
          <span class="rk-dist">${fmt(r.distance)} m</span>
        </div>`;
      }).join('')}</div>`;
    }
    this.renderMe(mine, false);
  }

  /** Tu posición, siempre visible abajo. */
  renderMe(mine, loading) {
    const acc = Online.account;
    const pending = Online.data.pending;
    if (!acc) {
      this.me.innerHTML = `<span class="rank-me-text">${t('rank.noAccount')}</span><button class="btn small btn-primary" data-act="nick">${t('rank.setNick')}</button>`;
      return;
    }
    if (loading) {
      this.me.innerHTML = `<span class="rank-me-text">${esc(acc.nick)}</span>`;
      return;
    }
    const pend = pending ? `<span class="rank-pend">⏳ ${t('rank.pending')}</span>` : '';
    if (!mine || mine.rank == null) {
      this.me.innerHTML = `<span class="rk-pos">—</span><span class="rank-me-text">${t('rank.you')}: <b>${esc(acc.nick)}</b> · ${t('rank.noRank')}</span>${pend}`;
      return;
    }
    this.me.innerHTML = `<span class="rk-pos">${mine.rank}</span>
      <span class="rank-me-text">${t('rank.you')}: <b>${esc(acc.nick)}</b> ${badgeHtml(mine.prestige)} · ${HERO_ICON[mine.hero] ?? ''} ${fmt(mine.distance)} m <span class="dim">(${t('rank.of', { n: fmt(mine.total) })})</span></span>${pend}`;
  }
}

/** Tarjeta de ajustes: tu cuenta del ranking y su código de recuperación. */
export function accountCard({ nick, toast }) {
  let showCode = false;
  return {
    render() {
      const acc = Online.account;
      if (!acc) {
        return `<div class="card">
          <h3>${t('acct.title')}</h3>
          <p class="settings-text">${t('acct.none')}</p>
          <div class="row-btns">
            <button class="btn small" data-act="acct-create">✏️ ${t('acct.create')}</button>
            <button class="btn small" data-act="acct-recover">🔑 ${t('acct.useCode')}</button>
          </div>
        </div>`;
      }
      return `<div class="card">
        <h3>${t('acct.title')}</h3>
        <p class="settings-text">${t('acct.nick', { nick: esc(acc.nick) })}</p>
        <p class="settings-text">${t('acct.code')}: <b class="code-inline">${showCode ? esc(acc.code) : '••••-••••-••••'}</b></p>
        <div class="row-btns">
          <button class="btn small" data-act="acct-show">👁 ${showCode ? t('acct.hide') : t('acct.show')}</button>
          <button class="btn small" data-act="acct-copy">📋 ${t('acct.copy')}</button>
          <button class="btn small" data-act="acct-recover">🔑 ${t('acct.useCode')}</button>
        </div>
      </div>`;
    },
    onClick(act, el, screen) {
      if (act === 'acct-create') nick('create', () => screen.render());
      else if (act === 'acct-recover') nick('recover', () => screen.render());
      else if (act === 'acct-show') {
        showCode = !showCode;
        screen.render();
      } else if (act === 'acct-copy') {
        navigator.clipboard?.writeText(Online.account?.code ?? '').then(() => toast(t('nick.copied')), () => {});
      } else return false;
      return true;
    },
  };
}
