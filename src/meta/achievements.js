// LOGROS Y MEDALLAS (permanentes, distintos de las misiones)
// Cada logro tiene una medalla (bronze | silver | gold), un objetivo n y una
// función que devuelve el progreso con los datos guardados + la partida en
// curso. Al conseguirlo: aviso y diamantes según la medalla
// (CONFIG.achievements.reward). Textos: ach.<id> y ach.<id>.d en translations.js.

import { CONFIG } from '../config.js';
import { Save } from '../core/storage.js';
import { ITEMS } from './catalog.js';
import { Profile } from './profile.js';
import { grant } from './progression.js';

const sum = (o) => Object.values(o ?? {}).reduce((a, b) => a + b, 0);

/** ¿Tiene todo el vestuario comprable de ese personaje? */
function wardrobeDone(owner) {
  const items = ITEMS.filter((it) => it.owner === owner && !it.prestige);
  return items.length > 0 && items.every((it) => Profile.owns(it));
}

export const ACHIEVEMENTS = [
  // distancia en una partida
  { id: 'run_1000', tier: 'bronze', icon: '🏃', n: 1000, get: (c) => c.bestDist },
  { id: 'run_3000', tier: 'silver', icon: '🏃', n: 3000, get: (c) => c.bestDist },
  { id: 'run_6000', tier: 'gold', icon: '🏃', n: 6000, get: (c) => c.bestDist },
  // distancia total
  { id: 'total_10k', tier: 'bronze', icon: '🗺️', n: 10000, get: (c) => c.totalDist },
  { id: 'total_50k', tier: 'silver', icon: '🗺️', n: 50000, get: (c) => c.totalDist },
  { id: 'total_200k', tier: 'gold', icon: '🗺️', n: 200000, get: (c) => c.totalDist },
  // helicóptero jefe y estrellas
  { id: 'stars_5', tier: 'bronze', icon: '⭐', n: 5, get: (c) => c.peakStars },
  { id: 'boss_1', tier: 'silver', icon: '🚁', n: 1, get: (c) => c.bossWins },
  { id: 'boss_5', tier: 'gold', icon: '🚁', n: 5, get: (c) => c.bossWins },
  // escondites
  { id: 'hide_wash', tier: 'bronze', icon: '🧼', n: 1, get: (c) => c.hide.wash },
  { id: 'hide_alley', tier: 'bronze', icon: '🌙', n: 1, get: (c) => c.hide.alley },
  { id: 'hide_parking', tier: 'bronze', icon: '🅿️', n: 1, get: (c) => c.hide.parking },
  { id: 'hide_all', tier: 'silver', icon: '🫥', n: 3, get: (c) => ['wash', 'alley', 'parking'].filter((k) => c.hide[k] > 0).length },
  { id: 'hide_25', tier: 'gold', icon: '🫥', n: 25, get: (c) => sum(c.hide) },
  // a pie
  { id: 'foot_1000', tier: 'silver', icon: '👟', n: 1000, get: (c) => c.noJetBest },
  { id: 'rides_10', tier: 'bronze', icon: '🛒', n: 10, get: (c) => c.rides },
  // personajes
  { id: 'char_all', tier: 'bronze', icon: '🎭', n: 3, get: (c) => ['veteran', 'pilot', 'wild'].filter((k) => (c.chars[k] ?? 0) > 0).length },
  { id: 'specials_50', tier: 'silver', icon: '⚡', n: 50, get: (c) => c.specials },
  // enemigos menores
  { id: 'minors_50', tier: 'bronze', icon: '🐕', n: 50, get: (c) => c.minors },
  { id: 'drones_25', tier: 'silver', icon: '📦', n: 25, get: (c) => c.drones },
  // pavos y multiplicador
  { id: 'bucks_run', tier: 'silver', icon: '💵', n: 1000, get: (c) => c.bestBucks },
  { id: 'bucks_total', tier: 'gold', icon: '💰', n: 50000, get: (c) => c.totalBucks },
  { id: 'mult_5', tier: 'silver', icon: '✖️', n: 5, get: (c) => c.multBest },
  { id: 'near_500', tier: 'gold', icon: '💨', n: 500, get: (c) => c.near },
  { id: 'gems_10', tier: 'bronze', icon: '💎', n: 10, get: (c) => c.gemsRun },
  // vestuario
  { id: 'ward_first', tier: 'bronze', icon: '🛍️', n: 1, get: () => Object.keys(Save.data.owned).length },
  { id: 'ward_base', tier: 'silver', icon: '👕', n: 1, get: () => (wardrobeDone('base') ? 1 : 0) },
  { id: 'ward_char', tier: 'gold', icon: '👑', n: 1, get: () => (['veteran', 'pilot', 'wild'].some(wardrobeDone) ? 1 : 0) },
  // progreso
  { id: 'level_10', tier: 'bronze', icon: '📈', n: 10, get: () => (Save.data.prestige > 0 ? 10 : Save.data.level) },
  { id: 'prestige_1', tier: 'silver', icon: '🎖️', n: 1, get: () => Save.data.prestige },
  { id: 'prestige_5', tier: 'gold', icon: '🏆', n: 5, get: () => Save.data.prestige },
  { id: 'missions_25', tier: 'silver', icon: '🎯', n: 25, get: (c) => c.missions },
  { id: 'runs_100', tier: 'gold', icon: '🔁', n: 100, get: (c) => c.runs },
];

export const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

const listeners = new Set();

export const Achievements = {
  /** Datos guardados + (opcional) la partida en curso aún sin guardar. */
  context(g = null) {
    const S = Save.data;
    const L = S.life;
    const run = g && !g.saved;
    const st = g?.stats ?? {};
    const hide = { ...L.hideouts };
    if (run) for (const k of Object.keys(hide)) hide[k] += st.hideouts?.[k] ?? 0;
    const chars = { ...S.stats.charUses };
    if (run) for (const [k, v] of Object.entries(g.powers.uses)) chars[k] = (chars[k] ?? 0) + v;
    const d = run ? Math.floor(g.distance) : 0;
    return {
      bestDist: Math.max(S.best.distance, d),
      totalDist: S.stats.totalDistance + d,
      peakStars: Math.max(L.peakStars, run ? g.wanted.peak : 0),
      bossWins: L.bossWins + (run ? st.bossWins ?? 0 : 0),
      hide,
      noJetBest: Math.max(L.noJetBest, run ? Math.floor(g.foot.noJet(g)) : 0),
      rides: L.rides + (run ? g.foot.rides : 0),
      chars,
      specials: L.specials + (run ? st.specials ?? 0 : 0),
      minors: L.minors + (run ? st.minors ?? 0 : 0),
      drones: L.drones + (run ? st.drones ?? 0 : 0),
      bestBucks: Math.max(S.best.bucks, run ? g.bucks : 0),
      totalBucks: S.stats.totalBucks + (run ? g.bucks : 0),
      multBest: Math.max(L.multBest, run ? g.combo.maxLevel : 0),
      near: L.near + (run ? g.combo.nearMisses : 0),
      gemsRun: (S.stats.totalGemsRun ?? 0) + (run ? g.gemsRun : 0),
      missions: L.missions,
      runs: S.stats.runs,
    };
  },

  /** Al terminar una partida: suma sus datos a los acumulados. */
  commitRun(g, claimedMissions = 0) {
    const L = Save.data.life;
    const st = g.stats;
    for (const k of Object.keys(L.hideouts)) L.hideouts[k] += st.hideouts?.[k] ?? 0;
    L.bossWins += st.bossWins ?? 0;
    L.peakStars = Math.max(L.peakStars, g.wanted.peak);
    L.noJetBest = Math.max(L.noJetBest, Math.floor(g.foot.noJet(g)));
    L.rides += g.foot.rides;
    L.specials += st.specials ?? 0;
    L.minors += st.minors ?? 0;
    L.drones += st.drones ?? 0;
    L.multBest = Math.max(L.multBest, g.combo.maxLevel);
    L.near += g.combo.nearMisses;
    L.missions += claimedMissions;
    Save.data.stats.totalGemsRun = (Save.data.stats.totalGemsRun ?? 0) + g.gemsRun;
    g.saved = true;
  },

  progress(def, ctx) {
    return Math.min(def.n, def.get(ctx) ?? 0);
  },

  unlocked(id) {
    return !!Save.data.achievements[id];
  },

  /** Comprueba todos; devuelve los recién conseguidos (y paga su premio). */
  check(g = null) {
    const ctx = this.context(g);
    const newly = [];
    for (const def of ACHIEVEMENTS) {
      if (this.unlocked(def.id)) continue;
      if ((def.get(ctx) ?? 0) >= def.n) {
        Save.data.achievements[def.id] = Date.now();
        const gems = CONFIG.achievements.reward[def.tier];
        grant({ gems });
        newly.push({ def, gems });
      }
    }
    if (newly.length) {
      Save.save();
      for (const fn of listeners) fn(newly);
    }
    return newly;
  },

  onUnlock(fn) {
    listeners.add(fn);
  },

  counts() {
    const out = { bronze: [0, 0], silver: [0, 0], gold: [0, 0] };
    for (const def of ACHIEVEMENTS) {
      out[def.tier][1]++;
      if (this.unlocked(def.id)) out[def.tier][0]++;
    }
    return out;
  },
};
