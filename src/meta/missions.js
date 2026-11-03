import { CONFIG } from '../config.js';
import { Save } from '../core/storage.js';
import { pick } from '../core/rng.js';
import { grant } from './progression.js';
import { Profile } from './profile.js';

const BY_ID = Object.fromEntries(CONFIG.missions.pool.map((m) => [m.id, m]));
export const missionDef = (id) => BY_ID[id];

/** Valor actual de una misión con las estadísticas de la partida. */
export function progressOf(def, stats) {
  switch (def.type) {
    case 'bucks': return stats.bucks;
    case 'distance': return stats.distance;
    case 'orbs': return stats.orbs;
    case 'nearMisses': return stats.nearMisses;
    case 'transforms': return stats.transforms;
    case 'cases': return stats.cases;
    case 'air': return stats.airMax;
    case 'specials': return stats.specials;
    case 'gadgets': return stats.gadgets;
    case 'multiplier': return stats.maxMult;
    case 'starsSurvive': return stats.starTime[def.stars] ?? 0;
    case 'gems': return stats.gems;
    case 'respites': return stats.respites;
    case 'minors': return stats.minors;
    case 'drones': return stats.drones;
    case 'copCrash': return stats.copCrash ?? 0;
    case 'footRun': return stats.footMax;
    case 'noJet': return stats.noJet;
    case 'rides': return stats.rides;
    default: return 0;
  }
}

export const Missions = {
  get active() {
    return Save.data.missions.active;
  },

  /** Rellena hasta tener 3 activas, intentando una de cada dificultad. */
  fill() {
    const M = Save.data.missions;
    const tiers = ['easy', 'medium', 'hard'];
    while (M.active.length < CONFIG.missions.active) {
      const have = M.active.map((a) => missionDef(a.id)?.tier);
      const tier = tiers.find((tr) => !have.includes(tr)) ?? pick(tiers);
      const used = new Set(M.active.map((a) => a.id));
      const options = CONFIG.missions.pool.filter((m) => m.tier === tier && !used.has(m.id) && m.id !== M.lastReplaced);
      M.active.push({ id: pick(options.length ? options : CONFIG.missions.pool.filter((m) => !used.has(m.id))).id, done: false });
    }
    M.active = M.active.filter((a) => missionDef(a.id));
    Profile.changed();
  },

  /** Durante la partida: devuelve las misiones que se acaban de completar. */
  check(stats) {
    const newly = [];
    for (const a of this.active) {
      if (a.done) continue;
      const def = missionDef(a.id);
      if ((def.total ? a.base ?? 0 : 0) + progressOf(def, stats) >= def.n) {
        a.done = true;
        newly.push(def);
      }
    }
    return newly;
  },

  /** Al terminar la partida: las misiones acumulativas guardan lo conseguido. */
  commitRun(stats) {
    for (const a of this.active) {
      const def = missionDef(a.id);
      if (def?.total && !a.done) a.base = (a.base ?? 0) + progressOf(def, stats);
    }
  },

  /** Progreso guardado de una misión acumulativa (para mostrarlo). */
  saved(a) {
    return a.base ?? 0;
  },

  /** Al terminar: cobra las completadas y las sustituye. Devuelve las cobradas. */
  claimAndReplace() {
    const M = Save.data.missions;
    const claimed = [];
    for (const a of M.active.filter((x) => x.done)) {
      const def = missionDef(a.id);
      const r = CONFIG.missions.rewards[def.tier];
      grant({ bucks: r.bucks, gems: r.gems, tickets: r.tickets });
      claimed.push({ def, reward: r });
      M.lastReplaced = a.id;
    }
    M.active = M.active.filter((x) => !x.done);
    this.fill();
    return claimed;
  },

  canDiscard() {
    return Date.now() - (Save.data.missions.lastDiscard ?? 0) >= CONFIG.missions.discardHours * 3600 * 1000;
  },

  /** Descarta una misión (gratis una vez cada 24 h). */
  discard(id) {
    if (!this.canDiscard()) return false;
    const M = Save.data.missions;
    M.active = M.active.filter((a) => a.id !== id);
    M.lastDiscard = Date.now();
    M.lastReplaced = id;
    this.fill();
    return true;
  },
};
