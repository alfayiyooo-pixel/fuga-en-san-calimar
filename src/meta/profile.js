import { Save } from '../core/storage.js';
import { CONFIG } from '../config.js';
import { ITEM_BY_ID, defaultItem, SLOTS } from './catalog.js';

/**
 * Perfil del jugador: monedas, compras, nivel… (todo vive en Save.data).
 * Centraliza los cambios para que la interfaz pueda refrescarse.
 */
const listeners = new Set();

export const Profile = {
  get data() {
    return Save.data;
  },
  get bucks() {
    return Math.floor(Save.data.wallet);
  },
  get gems() {
    return Save.data.gems;
  },

  addBucks(n) {
    Save.data.wallet += n;
    this.changed();
  },
  addGems(n) {
    Save.data.gems += n;
    Save.data.stats.totalGems += Math.max(0, n);
    this.changed();
  },
  canAfford(price) {
    if (price.gems) return Save.data.gems >= price.gems;
    return Save.data.wallet >= (price.bucks ?? 0);
  },
  /** Cobra un precio {bucks} o {gems}. Devuelve false si no alcanza. */
  pay(price) {
    if (!this.canAfford(price)) return false;
    if (price.gems) Save.data.gems -= price.gems;
    else Save.data.wallet -= price.bucks ?? 0;
    this.changed();
    return true;
  },

  onChange(fn) {
    listeners.add(fn);
  },
  changed() {
    Save.save();
    listeners.forEach((fn) => fn());
  },
};

// ---------------- ARTÍCULOS ----------------

Object.assign(Profile, {
  owns(item) {
    if (typeof item === 'string') item = ITEM_BY_ID[item];
    if (!item) return false;
    if (item.prestige) return Save.data.prestige >= item.prestige;
    return !item.price || !!Save.data.owned[item.id];
  },

  /** ¿Se puede pagar con un vale de nivel? (solo artículos de pavos) */
  canUseVoucher(item) {
    return Save.data.vouchers > 0 && !!item.price?.bucks;
  },

  /** Compra un artículo. Devuelve 'ok' | 'owned' | 'poor' | 'locked'. */
  buy(item, useVoucher = false) {
    if (this.owns(item)) return 'owned';
    if (item.prestige) return 'locked';
    if (useVoucher && this.canUseVoucher(item)) {
      Save.data.vouchers--;
    } else if (!this.pay(item.price)) {
      return 'poor';
    }
    Save.data.owned[item.id] = true;
    this.changed();
    return 'ok';
  },

  equippedId(owner, slot) {
    const id = Save.data.equipped[owner]?.[slot];
    return id && this.owns(id) ? id : defaultItem(owner, slot);
  },

  equip(owner, slot, id) {
    if (!this.owns(id)) return false;
    Save.data.equipped[owner] = { ...(Save.data.equipped[owner] ?? {}), [slot]: id };
    this.changed();
    return true;
  },

  /** Aspecto combinado de lo equipado (colores, accesorio, estela, efecto). */
  look(owner) {
    const look = {};
    for (const slot of SLOTS) {
      const id = this.equippedId(owner, slot);
      if (id) Object.assign(look, ITEM_BY_ID[id].look);
    }
    // el marco dorado de prestigio se aplica solo al conseguirlo
    if (this.owns('any_frame_gold')) look.frame = 'gold';
    return look;
  },

  // ---------------- MEJORAS ----------------
  upgradeLevel(id) {
    return Save.data.upgrades[id] ?? 0;
  },
  upgradeCost(id) {
    return CONFIG.shop.upgradeCosts[this.upgradeLevel(id)] ?? null;
  },
  buyUpgrade(id) {
    const cost = this.upgradeCost(id);
    if (cost === null) return 'max';
    if (!this.pay({ bucks: cost })) return 'poor';
    Save.data.upgrades[id] = this.upgradeLevel(id) + 1;
    this.changed();
    return 'ok';
  },

  // ---------------- CONSUMIBLES ----------------
  consumableCount(id) {
    return Save.data.consumables[id] ?? 0;
  },
  buyConsumable(id) {
    if (!this.pay({ bucks: CONFIG.shop.consumables[id].price })) return 'poor';
    Save.data.consumables[id] = this.consumableCount(id) + 1;
    this.changed();
    return 'ok';
  },
  /** Activa/desactiva un consumible para la próxima partida. */
  toggleLoadout(id) {
    Save.data.loadout[id] = !Save.data.loadout[id] && this.consumableCount(id) > 0;
    this.changed();
  },
  /** Gasta los consumibles seleccionados al empezar la partida. */
  takeLoadout() {
    const used = [];
    for (const [id, on] of Object.entries(Save.data.loadout)) {
      if (on && this.consumableCount(id) > 0) {
        Save.data.consumables[id]--;
        used.push(id);
      }
      if (this.consumableCount(id) <= 0) Save.data.loadout[id] = false;
    }
    this.changed();
    return used;
  },

  /** Valores de las mejoras para la partida. */
  runUpgrades() {
    const U = CONFIG.shop.upgrades;
    const L = (id) => this.upgradeLevel(id);
    return {
      gadgetMult: 1 + U.gadgetTime.perLevel * L('gadgetTime'),
      capsuleMult: 1 + U.capsule.perLevel * L('capsule'),
      magnetSeconds: U.magnet.seconds * L('magnet'),
      magnetRadiusMult: 1 + U.magnet.radius * L('magnet'),
      specialSeconds: U.special.seconds * L('special'),
      orbMult: 1 + U.orbPower.perLevel * L('orbPower'),
    };
  },
});
