import { CONFIG } from '../config.js';
import { Save } from '../core/storage.js';
import { grant } from './progression.js';
import { Profile } from './profile.js';

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Recompensa diaria en ciclo de 7 días. El día solo avanza al cobrar,
 * así que si un día no entras la racha se queda en pausa (no se reinicia).
 */
export const Daily = {
  get available() {
    return Save.data.daily.last !== today();
  },
  get day() {
    return Save.data.daily.day % CONFIG.daily.rewards.length;
  },
  claim() {
    if (!this.available) return null;
    const reward = CONFIG.daily.rewards[this.day];
    grant(reward);
    Save.data.daily.day = (this.day + 1) % CONFIG.daily.rewards.length;
    Save.data.daily.last = today();
    Profile.changed();
    return reward;
  },
};
