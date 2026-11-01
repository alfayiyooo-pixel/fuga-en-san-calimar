// Los tres personajes jugables (además del jetpack básico).
// Cada uno: estilo de dibujo, colores, habilidad especial y dos gadgets.
// Los valores numéricos están en CONFIG.characters.

export const CHARACTERS = {
  veteran: {
    id: 'veteran',
    style: 'veteran',
    color: '#d9a53a',
    rgba: 'rgba(255, 200, 90, 0.9)',
    special: 'bullettime',
    gadgets: ['pistol', 'vest'],
  },
  pilot: {
    id: 'pilot',
    style: 'pilot',
    color: '#19e3d0',
    rgba: 'rgba(25, 227, 208, 0.9)',
    special: 'drive',
    gadgets: ['nitro', 'ramp'],
  },
  wild: {
    id: 'wild',
    style: 'wild',
    color: '#ff5a3d',
    rgba: 'rgba(255, 90, 61, 0.9)',
    special: 'rage',
    gadgets: ['rocket', 'bike'],
  },
};

export const CHARACTER_IDS = Object.keys(CHARACTERS);

/** Habilidad/gadget → personaje al que pertenece. */
export const ITEM_OWNER = {};
for (const c of Object.values(CHARACTERS)) {
  ITEM_OWNER[c.special] = c.id;
  c.gadgets.forEach((g) => (ITEM_OWNER[g] = c.id));
}
