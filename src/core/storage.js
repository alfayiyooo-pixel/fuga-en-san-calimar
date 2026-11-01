// Guardado del progreso en localStorage, con valores por defecto
// y tolerancia a errores (modo privado, almacenamiento bloqueado...).

const KEY = 'san-calimar-save-v1';

const DEFAULTS = {
  version: 1,
  settings: {
    lang: null,     // null = detectar del navegador
    muted: false,
    quality: 'auto', // 'auto' | 'high' | 'low'
  },
  wallet: 0,          // pavos disponibles para gastar (tienda, fase e)
  best: {
    distance: 0,
    bucks: 0,
  },
  stats: {
    runs: 0,
    totalDistance: 0,
    totalBucks: 0,
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

  reset() {
    this.data = clone(DEFAULTS);
    this.save();
  }
}

export const Save = new SaveStore();
