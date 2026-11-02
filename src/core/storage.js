// Guardado del progreso en localStorage, con valores por defecto
// y tolerancia a errores (modo privado, almacenamiento bloqueado...).

const KEY = 'san-calimar-save-v1';

const DEFAULTS = {
  version: 1,
  settings: {
    lang: null,     // null = detectar del navegador
    muted: false,
    quality: 'auto', // 'auto' | 'high' | 'low'
    volumes: { music: 1, sfx: 1, voice: 1 }, // 0-1, menú de ajustes de sonido
  },
  wallet: 0,          // pavos disponibles para gastar
  gems: 0,            // diamantes (moneda premium)
  owned: {},          // artículos comprados: id → true
  equipped: {},       // personaje → { suit, acc, trail, fx }
  upgrades: { gadgetTime: 0, capsule: 0, magnet: 0, special: 0, orbPower: 0 },
  consumables: { headstart: 0, shield: 0, transform: 0, revive: 0 },
  loadout: { headstart: false, shield: false, transform: false, revive: false },
  vouchers: 0,        // vales de "artículo de pavos gratis"
  prestige: 0,        // rango de prestigio (0 = ninguno)
  level: 1,
  xp: 0,              // experiencia dentro del nivel actual
  tickets: 0,         // fichas de la ruleta (solo se ganan jugando)
  nextBoost: false,   // premio de la ruleta: imán al empezar la próxima partida
  missions: { active: [], lastDiscard: 0 },
  daily: { day: 0, last: '' }, // día del ciclo que toca cobrar y fecha del último cobro
  best: {
    distance: 0,
    bucks: 0,
  },
  stats: {
    runs: 0,
    totalDistance: 0,
    totalBucks: 0,
    totalGems: 0,
    charUses: { veteran: 0, pilot: 0, wild: 0 }, // para el "personaje favorito"
  },
};

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

/** Mezcla profunda: añade al guardado las claves nuevas de DEFAULTS. */
function merge(defaults, saved) {
  const out = clone(defaults);
  if (!saved || typeof saved !== 'object') return out;
  for (const k of Object.keys(saved)) {
    const d = defaults[k];
    const s = saved[k];
    if (d && typeof d === 'object' && !Array.isArray(d) && s && typeof s === 'object' && !Array.isArray(s)) {
      out[k] = merge(d, s);
    } else {
      out[k] = s;
    }
  }
  return out;
}

class SaveStore {
  constructor() {
    this.data = clone(DEFAULTS);
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      this.data = merge(DEFAULTS, raw ? JSON.parse(raw) : null);
    } catch {
      this.data = clone(DEFAULTS);
    }
    return this.data;
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* sin almacenamiento disponible: el juego sigue funcionando */
    }
  }

  /** Código de texto con todo el progreso (para pasarlo a la app instalada en iPhone). */
  exportCode() {
    const json = JSON.stringify(this.data);
    return 'SC1:' + btoa(unescape(encodeURIComponent(json)));
  }

  /** Carga un código de exportCode(). Devuelve true si era válido. */
  importCode(code) {
    try {
      const raw = String(code).trim().replace(/^SC1:/, '');
      const data = JSON.parse(decodeURIComponent(escape(atob(raw))));
      if (!data || typeof data !== 'object' || !data.best || !data.stats) return false;
      this.data = merge(DEFAULTS, data);
      this.save();
      return true;
    } catch {
      return false;
    }
  }

  reset() {
    this.data = clone(DEFAULTS);
    this.save();
  }
}

export const Save = new SaveStore();
