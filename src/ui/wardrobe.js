import { t } from '../core/i18n.js';
import { Sound } from '../core/audio.js';
import { Profile } from '../meta/profile.js';
import { ITEM_BY_ID, OWNERS, SLOTS_BY_OWNER, itemsFor, RARITY_COLORS } from '../meta/catalog.js';
import { Preview } from './preview.js';
import { SLOT_ICON, ownerName, priceLabel } from './shop.js';

/**
 * Vestuario: un apartado por personaje con el personaje grande y animado.
 * Se equipa lo comprado; lo no comprado sale con candado y botón a la tienda.
 */
export class Wardrobe {
  constructor(root, { onClose, onShop }) {
    this.root = root;
    this.onClose = onClose;
    this.onShop = onShop;
    this.owner = 'base';
    root.innerHTML = `
      <header class="panel-head">
        <button class="icon-btn" data-act="back" data-i18n-aria="common.back">←</button>
        <h2 class="panel-title" data-i18n="wardrobe.title"></h2>
        <div class="wallet inline">
          <span class="coin coin-bucks">💵 <b class="w-bucks">0</b></span>
          <span class="coin coin-gems">💎 <b class="w-gems">0</b></span>
        </div>
      </header>
      <div class="seg owners wr-owners"></div>
      <div class="wardrobe">
        <div class="wr-stage">
          <canvas class="wr-canvas"></canvas>
          <div class="wr-name"></div>
          <button class="chip-btn" data-act="playFx">${'▶'} <span data-i18n="wardrobe.tryFx"></span></button>
        </div>
        <div class="wr-slots scroll"></div>
      </div>`;
    this.preview = new Preview(root.querySelector('.wr-canvas'), { w: 260, h: 260, scale: 2.6 });
    root.addEventListener('click', (e) => this.onClick(e));
    Profile.onChange(() => {
      if (!root.classList.contains('hidden')) this.render();
    });
  }

  open(owner) {
    if (owner) this.owner = owner;
    this.render();
    this.preview.start();
  }

  close() {
    this.preview.stop();
  }

  onClick(e) {
    const el = e.target.closest('[data-act],[data-owner],[data-equip],[data-shop]');
    if (!el) return;
    const d = el.dataset;
    if (d.act === 'back') {
      Sound.click();
      this.onClose();
      return;
    }
    if (d.act === 'playFx') {
      this.preview.playFx();
      return;
    }
    if (d.shop) {
      const it = ITEM_BY_ID[d.shop];
      Sound.click();
      this.onShop(this.owner, it.slot, it.id);
      return;
    }
    if (d.owner) {
      this.owner = d.owner;
      Sound.click();
    } else if (d.equip) {
      const it = ITEM_BY_ID[d.equip];
      if (Profile.equip(this.owner, it.slot, it.id)) {
        Sound.powerUp();
        if (it.slot === 'fx') this.preview.playFx();
      }
    }
    this.render();
  }

  render() {
    const owner = this.owner;
    this.root.querySelector('.wr-owners').innerHTML = OWNERS.map(
      (o) => `<button class="seg-btn ${o === owner ? 'active' : ''}" data-owner="${o}">${ownerName(o)}</button>`,
    ).join('');
    this.root.querySelector('.wr-name').textContent = owner === 'base' ? t('owner.base') : `${t(`char.${owner}.alias`)} · ${t(`char.${owner}.name`)}`;
    this.root.querySelector('[data-act="playFx"]').classList.toggle('hidden', owner === 'base');
    this.root.querySelector('.wr-slots').innerHTML = SLOTS_BY_OWNER[owner]
      .map((slot) => {
        const equipped = Profile.equippedId(owner, slot);
        return `<section class="wr-slot">
          <h3>${SLOT_ICON[slot]} ${t(`slot.${slot}`)}</h3>
          <div class="wr-items">
            ${itemsFor(owner, slot)
              .map((it) => {
                const owned = Profile.owns(it);
                const on = it.id === equipped;
                return `<div class="wr-item ${on ? 'on' : ''} ${owned ? '' : 'locked'}" style="--rc:${RARITY_COLORS[it.rarity]}">
                  <button class="wr-tile" ${owned ? `data-equip="${it.id}"` : `data-shop="${it.id}"`}>
                    <span class="wr-tile-name">${owned ? '' : '🔒 '}${t(`cos.${it.id}`)}</span>
                    <span class="wr-tile-state">${on ? `✔ ${t('shop.equipped')}` : owned ? t('wardrobe.equip') : priceLabel(it)}</span>
                  </button>
                  ${owned || it.prestige ? '' : `<button class="wr-go" data-shop="${it.id}">🛒 ${t('wardrobe.toShop')}</button>`}
                </div>`;
              })
              .join('')}
          </div>
        </section>`;
      })
      .join('');
    this.preview.set(owner, Profile.look(owner));
  }
}
