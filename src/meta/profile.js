import { Save } from '../core/storage.js';

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
