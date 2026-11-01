// ============================================================
//  CATÁLOGO DE ARTÍCULOS COSMÉTICOS
//  Precios: { bucks } = pavos, { gems } = diamantes, null = gratis.
//  prestige: rango mínimo necesario (no se compran).
//  rarity: common | rare | legendary | prestige
//  Los nombres están en src/i18n/translations.js (clave item.<id>).
// ============================================================

export const SLOTS = ['suit', 'acc', 'trail', 'fx'];
export const OWNERS = ['base', 'veteran', 'pilot', 'wild'];
// el atracador básico solo tiene traje y estela
export const SLOTS_BY_OWNER = { base: ['suit', 'trail'], veteran: SLOTS, pilot: SLOTS, wild: SLOTS };

const B = (n) => ({ bucks: n });
const G = (n) => ({ gems: n });

export const ITEMS = [
  // ---------- ATRACADOR BÁSICO ----------
  { id: 'base_suit_default', owner: 'base', slot: 'suit', price: null, rarity: 'common', look: {} },
  { id: 'base_suit_retro', owner: 'base', slot: 'suit', price: B(1200), rarity: 'common', look: { jacket: '#e8334a', jacketLight: '#ff7083', jacketDark: '#a8192c', arm: '#e8334a', armBack: '#a8192c', stripe: '#fff4dc' } },
  { id: 'base_suit_prison', owner: 'base', slot: 'suit', price: B(2000), rarity: 'rare', look: { jacket: '#f0e6c8', jacketLight: '#fffaf0', jacketDark: '#c9bd98', arm: '#f0e6c8', armBack: '#c9bd98', pants: '#f0e6c8', pantsBack: '#c9bd98', pattern: 'stripes' } },
  { id: 'base_suit_holo', owner: 'base', slot: 'suit', price: G(100), rarity: 'legendary', look: { anim: 'holo' } },
  { id: 'base_trail_default', owner: 'base', slot: 'trail', price: null, rarity: 'common', look: { trail: 'fire' } },
  { id: 'base_trail_bills', owner: 'base', slot: 'trail', price: B(1000), rarity: 'common', look: { trail: 'bills' } },
  { id: 'base_trail_bubbles', owner: 'base', slot: 'trail', price: B(1500), rarity: 'rare', look: { trail: 'bubbles' } },
  { id: 'base_trail_goldrain', owner: 'base', slot: 'trail', price: G(80), rarity: 'legendary', look: { trail: 'goldrain' } },

  // ---------- EL RELOJERO ----------
  { id: 'vet_suit_default', owner: 'veteran', slot: 'suit', price: null, rarity: 'common', look: {} },
  { id: 'vet_suit_tux', owner: 'veteran', slot: 'suit', price: B(1500), rarity: 'common', look: { jacket: '#1f1d2b', jacketLight: '#3a3750', jacketDark: '#121019', arm: '#1f1d2b', armBack: '#121019', pants: '#1f1d2b', pantsBack: '#121019', tie: 'bow' } },
  { id: 'vet_suit_trench', owner: 'veteran', slot: 'suit', price: B(2500), rarity: 'rare', look: { jacket: '#b98a4e', jacketLight: '#d9ad6e', jacketDark: '#8a6232', arm: '#b98a4e', armBack: '#8a6232', pattern: 'belt' } },
  { id: 'vet_suit_gold', owner: 'veteran', slot: 'suit', price: G(120), rarity: 'legendary', look: { anim: 'gold' } },
  { id: 'vet_suit_velvet', owner: 'veteran', slot: 'suit', price: null, prestige: 1, rarity: 'prestige', look: { jacket: '#6b2fa8', jacketLight: '#9a5bd8', jacketDark: '#45197a', arm: '#6b2fa8', armBack: '#45197a', pants: '#2a1640', pantsBack: '#1c0e2c' } },
  { id: 'vet_acc_none', owner: 'veteran', slot: 'acc', price: null, rarity: 'common', look: { acc: null } },
  { id: 'vet_acc_bowler', owner: 'veteran', slot: 'acc', price: B(800), rarity: 'common', look: { acc: 'bowler' } },
  { id: 'vet_acc_monocle', owner: 'veteran', slot: 'acc', price: B(1200), rarity: 'rare', look: { acc: 'monocle' } },
  { id: 'vet_acc_watch', owner: 'veteran', slot: 'acc', price: G(80), rarity: 'legendary', look: { acc: 'bigwatch' } },
  { id: 'vet_trail_default', owner: 'veteran', slot: 'trail', price: null, rarity: 'common', look: { trail: 'goldsparks' } },
  { id: 'vet_trail_gears', owner: 'veteran', slot: 'trail', price: B(1000), rarity: 'common', look: { trail: 'gears' } },
  { id: 'vet_trail_cards', owner: 'veteran', slot: 'trail', price: B(1800), rarity: 'rare', look: { trail: 'cards' } },
  { id: 'vet_trail_sand', owner: 'veteran', slot: 'trail', price: G(90), rarity: 'legendary', look: { trail: 'sand' } },
  { id: 'vet_fx_default', owner: 'veteran', slot: 'fx', price: null, rarity: 'common', look: { fx: 'clock' } },
  { id: 'vet_fx_coins', owner: 'veteran', slot: 'fx', price: B(2000), rarity: 'rare', look: { fx: 'coins' } },
  { id: 'vet_fx_pendulum', owner: 'veteran', slot: 'fx', price: G(60), rarity: 'legendary', look: { fx: 'pendulum' } },

  // ---------- CHISPA ----------
  { id: 'pil_suit_default', owner: 'pilot', slot: 'suit', price: null, rarity: 'common', look: {} },
  { id: 'pil_suit_racing', owner: 'pilot', slot: 'suit', price: B(1500), rarity: 'common', look: { jacket: '#f4f1ea', jacketLight: '#ffffff', jacketDark: '#c9c4b8', arm: '#f4f1ea', armBack: '#c9c4b8', pattern: 'checker' } },
  { id: 'pil_suit_denim', owner: 'pilot', slot: 'suit', price: B(2500), rarity: 'rare', look: { jacket: '#3d6ab0', jacketLight: '#6a95d6', jacketDark: '#284a80', arm: '#3d6ab0', armBack: '#284a80', pattern: 'patches' } },
  { id: 'pil_suit_neon', owner: 'pilot', slot: 'suit', price: G(120), rarity: 'legendary', look: { anim: 'neon' } },
  { id: 'pil_suit_champion', owner: 'pilot', slot: 'suit', price: null, prestige: 2, rarity: 'prestige', look: { jacket: '#e8b52c', jacketLight: '#ffe27a', jacketDark: '#a87d14', arm: '#e8b52c', armBack: '#a87d14', pattern: 'checker' } },
  { id: 'pil_acc_none', owner: 'pilot', slot: 'acc', price: null, rarity: 'common', look: { acc: null } },
  { id: 'pil_acc_helmet', owner: 'pilot', slot: 'acc', price: B(800), rarity: 'common', look: { acc: 'helmet' } },
  { id: 'pil_acc_phones', owner: 'pilot', slot: 'acc', price: B(1200), rarity: 'rare', look: { acc: 'headphones' } },
  { id: 'pil_acc_visor', owner: 'pilot', slot: 'acc', price: G(80), rarity: 'legendary', look: { acc: 'visor' } },
  { id: 'pil_trail_default', owner: 'pilot', slot: 'trail', price: null, rarity: 'common', look: { trail: 'cyan' } },
  { id: 'pil_trail_smoke', owner: 'pilot', slot: 'trail', price: B(1000), rarity: 'common', look: { trail: 'colorsmoke' } },
  { id: 'pil_trail_bolts', owner: 'pilot', slot: 'trail', price: B(1800), rarity: 'rare', look: { trail: 'bolts' } },
  { id: 'pil_trail_rainbow', owner: 'pilot', slot: 'trail', price: G(90), rarity: 'legendary', look: { trail: 'rainbow' } },
  { id: 'pil_fx_default', owner: 'pilot', slot: 'fx', price: null, rarity: 'common', look: { fx: 'skid' } },
  { id: 'pil_fx_flag', owner: 'pilot', slot: 'fx', price: B(2000), rarity: 'rare', look: { fx: 'flag' } },
  { id: 'pil_fx_track', owner: 'pilot', slot: 'fx', price: G(60), rarity: 'legendary', look: { fx: 'neontrack' } },

  // ---------- PETARDO ----------
  { id: 'wild_suit_default', owner: 'wild', slot: 'suit', price: null, rarity: 'common', look: {} },
  { id: 'wild_suit_biker', owner: 'wild', slot: 'suit', price: B(1500), rarity: 'common', look: { jacket: '#2a2230', jacketLight: '#4a3f55', jacketDark: '#17121c', pattern: 'studs' } },
  { id: 'wild_suit_dino', owner: 'wild', slot: 'suit', price: B(2500), rarity: 'rare', look: { jacket: '#5fbf4a', jacketLight: '#8fe07a', jacketDark: '#3a8a2a', arm: '#5fbf4a', armBack: '#3a8a2a', pants: '#5fbf4a', pantsBack: '#3a8a2a', pattern: 'spikes' } },
  { id: 'wild_suit_lava', owner: 'wild', slot: 'suit', price: G(120), rarity: 'legendary', look: { anim: 'lava' } },
  { id: 'wild_suit_scrap', owner: 'wild', slot: 'suit', price: null, prestige: 3, rarity: 'prestige', look: { jacket: '#8a8f9c', jacketLight: '#c3c8d2', jacketDark: '#5a5f6c', arm: '#8a8f9c', armBack: '#5a5f6c', pattern: 'rivets' } },
  { id: 'wild_acc_none', owner: 'wild', slot: 'acc', price: null, rarity: 'common', look: { acc: null } },
  { id: 'wild_acc_mohawk', owner: 'wild', slot: 'acc', price: B(800), rarity: 'common', look: { acc: 'mohawk' } },
  { id: 'wild_acc_viking', owner: 'wild', slot: 'acc', price: B(1200), rarity: 'rare', look: { acc: 'viking' } },
  { id: 'wild_acc_firecrown', owner: 'wild', slot: 'acc', price: G(80), rarity: 'legendary', look: { acc: 'firecrown' } },
  { id: 'wild_trail_default', owner: 'wild', slot: 'trail', price: null, rarity: 'common', look: { trail: 'bigfire' } },
  { id: 'wild_trail_confetti', owner: 'wild', slot: 'trail', price: B(1000), rarity: 'common', look: { trail: 'confetti' } },
  { id: 'wild_trail_crackers', owner: 'wild', slot: 'trail', price: B(1800), rarity: 'rare', look: { trail: 'crackers' } },
  { id: 'wild_trail_fireworks', owner: 'wild', slot: 'trail', price: G(90), rarity: 'legendary', look: { trail: 'fireworks' } },
  { id: 'wild_fx_default', owner: 'wild', slot: 'fx', price: null, rarity: 'common', look: { fx: 'boom' } },
  { id: 'wild_fx_pinata', owner: 'wild', slot: 'fx', price: B(2000), rarity: 'rare', look: { fx: 'pinata' } },
  { id: 'wild_fx_volcano', owner: 'wild', slot: 'fx', price: G(60), rarity: 'legendary', look: { fx: 'volcano' } },

  // ---------- PRESTIGIO (todos los personajes) ----------
  { id: 'any_trail_comet', owner: 'any', slot: 'trail', price: null, prestige: 4, rarity: 'prestige', look: { trail: 'comet' } },
  { id: 'any_frame_gold', owner: 'any', slot: 'frame', price: null, prestige: 5, rarity: 'prestige', look: { frame: 'gold' } },
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

/** Artículos de un personaje y hueco (incluye los de prestigio "para todos"). */
export function itemsFor(owner, slot) {
  return ITEMS.filter((i) => i.slot === slot && (i.owner === owner || i.owner === 'any'));
}

/** Artículo equipado por defecto para un personaje y hueco. */
export function defaultItem(owner, slot) {
  return ITEMS.find((i) => i.owner === owner && i.slot === slot && !i.price && !i.prestige)?.id ?? null;
}

export const RARITY_COLORS = {
  common: '#9aa3b5',
  rare: '#4fb3ff',
  legendary: '#ffb627',
  prestige: '#c77dff',
};
