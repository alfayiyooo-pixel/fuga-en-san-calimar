import { CONFIG } from '../config.js';
import { Save } from '../core/storage.js';
import { Profile } from './profile.js';

/** XP necesaria para pasar de `level` a `level + 1`. */
export function xpFor(level) {
  const P = CONFIG.progression;
  return level === 1 ? P.xpFirst : P.xpBase + P.xpStep * (level - 1);
}

/** Recompensa al alcanzar un nivel. */
export function levelReward(level) {
  const P = CONFIG.progression;
  return {
    bucks: level * P.levelBucks,
    tickets: P.levelTickets,
    gems: P.gemLevels[level] ?? 0,
    voucher: P.voucherLevels.includes(level) ? 1 : 0,
  };
}

export function grant(r) {
  const d = Save.data;
  if (r.bucks) d.wallet += r.bucks;
  if (r.gems) {
    d.gems += r.gems;
    d.stats.totalGems += r.gems;
  }
  if (r.tickets) d.tickets += r.tickets;
  if (r.voucher) d.vouchers += r.voucher;
}

export const Progression = {
  get level() {
    return Save.data.level;
  },
  get atMax() {
    return Save.data.level >= CONFIG.progression.maxLevel;
  },
  get fraction() {
    return this.atMax ? 1 : Save.data.xp / xpFor(Save.data.level);
  },
  get canPrestige() {
    return this.atMax && Save.data.prestige < CONFIG.progression.prestigeMax;
  },

  /** Suma XP; devuelve la lista de niveles alcanzados con sus recompensas. */
  addXp(amount) {
    const d = Save.data;
    const ups = [];
    if (this.atMax) return ups;
    d.xp += Math.max(0, Math.floor(amount));
    while (!this.atMax && d.xp >= xpFor(d.level)) {
      d.xp -= xpFor(d.level);
      d.level++;
      const r = levelReward(d.level);
      grant(r);
      ups.push({ level: d.level, reward: r });
    }
    if (this.atMax) d.xp = 0;
    Profile.changed();
    return ups;
  },

  /** Reinicia el nivel a cambio de un rango de prestigio (se conserva lo demás). */
  prestige() {
    if (!this.canPrestige) return null;
    const d = Save.data;
    d.prestige++;
    d.level = 1;
    d.xp = 0;
    const gems = CONFIG.progression.prestigeGems[d.prestige - 1] ?? 0;
    grant({ gems });
    Profile.changed();
    return { rank: d.prestige, gems };
  },
};
