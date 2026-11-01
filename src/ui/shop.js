import { CONFIG } from '../config.js';
import { t, fmt, getLang } from '../core/i18n.js';
import { Sound } from '../core/audio.js';
import { Profile } from '../meta/profile.js';
import { ITEM_BY_ID, OWNERS, SLOTS_BY_OWNER, itemsFor, RARITY_COLORS } from '../meta/catalog.js';
import { purchasePack, formatPrice } from '../meta/payments.js';
import { Preview } from './preview.js';

export const SLOT_ICON = { suit: '👔', acc: '🎩', trail: '✨', fx: '💥' };
export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export function ownerName(owner) {
  return owner === 'base' ? t('owner.base') : t(`char.${owner}.alias`);
}

export function priceLabel(item) {
  if (item.prestige) return `🔒 ${t('shop.locked', { n: ROMAN[item.prestige] })}`;
  if (!item.price) return t('shop.free');
  return item.price.gems ? `💎 ${fmt(item.price.gems)}` : `💵 ${fmt(item.price.bucks)}`;
}

/**
 * Tienda: personajes (cosméticos con vista previa), mejoras, consumibles
 * y packs de diamantes (simulados).
 */
export class Shop {
  constructor(root, { onClose, onWardrobe, toast }) {
    this.root = root;
    this.onClose = onClose;
    this.onWardrobe = onWardrobe;
    this.toast = toast;
    this.tab = 'items';
    this.owner = 'base';
    this.slot = 'suit';
    this.selected = null;
    this.confirmId = null;
    root.innerHTML = `
      <header class="panel-head">
        <button class="icon-btn" data-act="back" data-i18n-aria="common.back">←</button>
        <h2 class="panel-title" data-i18n="shop.title"></h2>
        <div class="wallet inline">
          <span class="coin coin-bucks">💵 <b class="w-bucks">0</b></span>
          <span class="coin coin-gems">💎 <b class="w-gems">0</b></span>
        </div>
      </header>
      <nav class="tabs">
        ${['items', 'upgrades', 'consumables', 'gems'].map((tb) => `<button class="tab" data-tab="${tb}" data-i18n="shop.tab.${tb}"></button>`).join('')}
      </nav>
      <div class="panel-body"></div>`;
    this.body = root.querySelector('.panel-body');
    root.addEventListener('click', (e) => this.onClick(e));
    Profile.onChange(() => {
      if (!root.classList.contains('hidden')) this.render();
    });
  }

  open(tab = 'items', { owner, slot, itemId } = {}) {
    this.tab = tab;
    if (owner) this.owner = owner;
    if (slot) this.slot = slot;
    this.selected = itemId ?? null;
    this.confirmId = null;
    this.render();
  }

  close() {
    this.preview?.stop();
  }

  onClick(e) {
    const el = e.target.closest('[data-act],[data-tab],[data-owner],[data-slot],[data-item]');
    if (!el) return;
    const d = el.dataset;
    if (d.act === 'back') {
      Sound.click();
      this.onClose();
      return;
    }
    if (d.tab) {
      this.tab = d.tab;
      this.confirmId = null;
      Sound.click();
    } else if (d.owner) {
      this.owner = d.owner;
      if (!SLOTS_BY_OWNER[this.owner].includes(this.slot)) this.slot = 'suit';
      this.selected = null;
      Sound.click();
    } else if (d.slot) {
      this.slot = d.slot;
      this.selected = null;
      Sound.click();
    } else if (d.item) {
      this.selected = d.item;
      this.confirmId = null;
      Sound.click();
    } else if (d.act === 'buyItem') {
      this.buyItem(ITEM_BY_ID[d.id], d.voucher === '1');
    } else if (d.act === 'wardrobe') {
      this.onWardrobe?.(this.owner, this.slot);
      return;
    } else if (d.act === 'playFx') {
      this.preview?.playFx();
      return;
    } else if (d.act === 'upgrade') {
      const r = Profile.buyUpgrade(d.id);
      if (r === 'ok') Sound.powerUp();
      else if (r === 'poor') this.poor({ bucks: Profile.upgradeCost(d.id) });
    } else if (d.act === 'consumable') {
      const r = Profile.buyConsumable(d.id);
      if (r === 'ok') Sound.coin(3);
      else this.poor({ bucks: CONFIG.shop.consumables[d.id].price });
    } else if (d.act === 'pack') {
      const pack = CONFIG.shop.diamondPacks.find((p) => p.id === d.id);
      purchasePack(pack).then((res) => {
        if (!res.ok) {
          Sound.multDown();
          this.toast(t('shop.disabled'));
          const box = this.body.querySelector('.gems-notice');
          box?.classList.remove('flash');
          void box?.offsetWidth;
          box?.classList.add('flash');
        }
      });
      return;
    }
    this.render();
  }

  poor(price) {
    Sound.multDown();
    const missing = price.gems ? `💎 ${fmt(price.gems - Profile.gems)}` : `💵 ${fmt(price.bucks - Profile.bucks)}`;
    this.toast(t('shop.poor', { n: missing }));
  }

  buyItem(item, voucher) {
    // las compras con diamantes piden confirmación (dos toques)
    if (item.price?.gems && this.confirmId !== item.id) {
      this.confirmId = item.id;
      Sound.click();
      return;
    }
    const r = Profile.buy(item, voucher);
    if (r === 'ok') {
      Sound.briefcase();
      this.toast(t('shop.bought'));
      this.preview?.playFx();
    } else if (r === 'poor') this.poor(item.price);
    this.confirmId = null;
  }

  render() {
    this.root.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === this.tab));
    if (this.tab !== 'items') this.preview?.stop();
    if (this.tab === 'items') this.renderItems();
    else if (this.tab === 'upgrades') this.renderUpgrades();
    else if (this.tab === 'consumables') this.renderConsumables();
    else this.renderGems();
  }

  // ---------------- PERSONAJES ----------------
  renderItems() {
    const owner = this.owner;
    const list = itemsFor(owner, this.slot);
    if (!this.selected || !list.some((i) => i.id === this.selected)) this.selected = Profile.equippedId(owner, this.slot) ?? list[0]?.id;
    const sel = ITEM_BY_ID[this.selected];
    const equipped = Profile.equippedId(owner, this.slot);
    this.body.innerHTML = `
      <div class="shop-items">
        <aside class="preview-box">
          <canvas class="preview-canvas"></canvas>
          ${this.slot === 'fx' ? `<button class="chip-btn" data-act="playFx">${t('shop.playFx')}</button>` : ''}
          <div class="pv-name">${t(`cos.${sel.id}`)}</div>
          <div class="pv-rarity" style="color:${RARITY_COLORS[sel.rarity]}">${t(`rarity.${sel.rarity}`)}</div>
          <div class="pv-actions">${this.actionFor(sel)}</div>
        </aside>
        <div class="shop-main">
          <div class="seg owners">${OWNERS.map((o) => `<button class="seg-btn ${o === owner ? 'active' : ''}" data-owner="${o}">${ownerName(o)}</button>`).join('')}</div>
          <div class="seg slots">${SLOTS_BY_OWNER[owner].map((s) => `<button class="seg-btn ${s === this.slot ? 'active' : ''}" data-slot="${s}">${SLOT_ICON[s]} ${t(`slot.${s}`)}</button>`).join('')}</div>
          ${Profile.data.vouchers > 0 ? `<div class="voucher-note">🎟 ${t('shop.vouchers', { n: Profile.data.vouchers })}</div>` : ''}
          <div class="item-grid scroll">
            ${list.map((it) => {
              const owned = Profile.owns(it);
              const state = it.id === equipped ? `✔ ${t('shop.equipped')}` : owned ? t('shop.owned') : priceLabel(it);
              return `<button class="item-card ${it.id === this.selected ? 'selected' : ''} ${owned ? 'owned' : ''} ${it.prestige && !owned ? 'locked' : ''}" data-item="${it.id}" style="--rc:${RARITY_COLORS[it.rarity]}">
                <span class="ic-icon">${SLOT_ICON[it.slot] ?? '★'}</span>
                <span class="ic-name">${t(`cos.${it.id}`)}</span>
                <span class="ic-price">${state}</span>
              </button>`;
            }).join('')}
          </div>
        </div>
      </div>`;
    // vista previa con el artículo seleccionado puesto sobre lo equipado
    const look = { ...Profile.look(owner), ...sel.look };
    if (!this.preview || this.preview.canvas !== this.body.querySelector('canvas')) {
      this.preview?.stop();
      this.preview = new Preview(this.body.querySelector('canvas'));
    }
    this.preview.set(owner, look, { loopFx: this.slot === 'fx' });
    this.preview.start();
  }

  actionFor(item) {
    if (Profile.owns(item)) {
      return `<div class="owned-tag">✔ ${t('shop.owned')}</div>
        ${this.onWardrobe ? `<button class="btn small" data-act="wardrobe">${t('shop.toWardrobe')}</button>` : ''}`;
    }
    if (item.prestige) return `<div class="locked-tag">${priceLabel(item)}</div><p class="hint small">${t('shop.lockedHint', { n: ROMAN[item.prestige] })}</p>`;
    const confirm = this.confirmId === item.id;
    const voucher = Profile.canUseVoucher(item)
      ? `<button class="btn small voucher" data-act="buyItem" data-id="${item.id}" data-voucher="1">🎟 ${t('shop.voucher')}</button>`
      : '';
    return `<button class="btn btn-buy ${confirm ? 'confirm' : ''} ${Profile.canAfford(item.price) ? '' : 'poor'}" data-act="buyItem" data-id="${item.id}">
        ${confirm ? t('shop.confirm') : `${t('shop.buy')} · ${priceLabel(item)}`}
      </button>${voucher}`;
  }

  // ---------------- MEJORAS ----------------
  renderUpgrades() {
    const U = CONFIG.shop.upgrades;
    const value = (id, lvl) =>
      ({
        gadgetTime: Math.round(U.gadgetTime.perLevel * lvl * 100),
        capsule: Math.round(U.capsule.perLevel * lvl * 100),
        magnet: (U.magnet.seconds * lvl).toFixed(1),
        special: (U.special.seconds * lvl).toFixed(1),
        orbPower: Math.round(U.orbPower.perLevel * lvl * 100),
      })[id];
    const max = CONFIG.shop.upgradeCosts.length;
    this.body.innerHTML = `<div class="upgrade-list scroll">
      ${Object.keys(U).map((id) => {
        const lvl = Profile.upgradeLevel(id);
        const cost = Profile.upgradeCost(id);
        return `<div class="upgrade-row">
          <div class="up-info">
            <div class="up-name">${t(`upg.${id}`)}</div>
            <div class="up-desc">${t(`upg.${id}.desc`, { v: value(id, Math.min(max, lvl + (cost === null ? 0 : 1))) })}</div>
            <div class="pips">${Array.from({ length: max }, (_, i) => `<span class="pip ${i < lvl ? 'on' : ''}"></span>`).join('')}</div>
          </div>
          ${cost === null
            ? `<div class="owned-tag">${t('shop.max')}</div>`
            : `<button class="btn btn-buy ${Profile.canAfford({ bucks: cost }) ? '' : 'poor'}" data-act="upgrade" data-id="${id}">💵 ${fmt(cost)}</button>`}
        </div>`;
      }).join('')}
    </div>`;
  }

  // ---------------- CONSUMIBLES ----------------
  renderConsumables() {
    const C = CONFIG.shop.consumables;
    const icons = { headstart: '🚀', shield: '🫧', transform: '🎭', revive: '❤️' };
    this.body.innerHTML = `
      <p class="hint">${t('shop.consumablesHint')}</p>
      <div class="cons-grid scroll">
        ${Object.keys(C).map((id) => `
          <div class="cons-card">
            <div class="cons-icon">${icons[id]}</div>
            <div class="up-name">${t(`cons.${id}`)}</div>
            <div class="up-desc">${t(`cons.${id}.desc`)}</div>
            <div class="cons-have">${t('shop.have', { n: Profile.consumableCount(id) })}</div>
            <button class="btn btn-buy ${Profile.canAfford({ bucks: C[id].price }) ? '' : 'poor'}" data-act="consumable" data-id="${id}">💵 ${fmt(C[id].price)}</button>
          </div>`).join('')}
      </div>`;
  }

  // ---------------- DIAMANTES (simulado) ----------------
  renderGems() {
    const lang = getLang();
    this.body.innerHTML = `
      <div class="gems-notice">🧪 ${t('shop.gemsNotice')}</div>
      <div class="pack-grid">
        ${CONFIG.shop.diamondPacks.map((p, i) => `
          <div class="pack-card">
            ${p.bonus ? `<div class="pack-bonus">${t('shop.bonus', { n: fmt(p.bonus) })}</div>` : ''}
            <div class="pack-gems">${'💎'.repeat(Math.min(4, i + 1))}</div>
            <div class="up-name">${t(`pack.${p.id}`)}</div>
            <div class="pack-amount">💎 ${fmt(p.gems + p.bonus)}</div>
            <button class="btn btn-buy" data-act="pack" data-id="${p.id}">${formatPrice(p.price, lang)}</button>
          </div>`).join('')}
      </div>
      <p class="hint small">${t('shop.gemsRule')}</p>`;
  }
}
