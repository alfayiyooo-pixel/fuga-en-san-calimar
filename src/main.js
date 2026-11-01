import { View } from './core/view.js';
import { Input } from './core/input.js';
import { Loop } from './core/loop.js';
import { Save } from './core/storage.js';
import { setLang, detectLanguage, applyToDom, fmt, t, getLang } from './core/i18n.js';
import { Game } from './game.js';
import { Hud } from './ui/hud.js';
import { Screens } from './ui/screens.js';
import { causeText } from './entities/obstacles.js';
import { Sound } from './core/audio.js';
import { Voice } from './core/voice.js';
import { setSpriteScale } from './fx/sprites.js';
import { Quality } from './core/quality.js';
import { createTuner } from './ui/tuner.js';
import { Profile } from './meta/profile.js';
import { Shop } from './ui/shop.js';
import { Wardrobe } from './ui/wardrobe.js';

// ---------- arranque ----------
Save.load();
Quality.set(Save.data.settings.quality);
const canvas = document.getElementById('canvas');
const stage = document.getElementById('stage');
const view = new View(canvas, stage);
const input = new Input(canvas, view);
const hud = new Hud();
const game = new Game(view, hud);
const screens = new Screens();
if (hud.debug) {
  window.game = game; // acceso desde la consola con ?debug
  createTuner();
}

setLang(Save.data.settings.lang || detectLanguage());
applyToDom();
screens.refreshLangButtons();
Sound.setMuted(Save.data.settings.muted);
screens.setMuteIcon(Save.data.settings.muted);

// el audio solo puede arrancar tras una interacción del jugador
const unlockAudio = () => {
  const first = !Sound.ctx;
  Sound.unlock();
  if (first && Sound.ctx) Voice.preload(getLang());
};
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

document.querySelectorAll('.btn-mute').forEach((b) =>
  b.addEventListener('click', (e) => {
    e.preventDefault();
    const muted = !Save.data.settings.muted;
    Save.data.settings.muted = muted;
    Save.save();
    Sound.setMuted(muted);
    screens.setMuteIcon(muted);
    if (!muted) Sound.click();
    b.blur();
  }),
);

// ---------- calidad gráfica ----------
const qualityBtn = document.getElementById('btn-quality');
function refreshQualityBtn() {
  const label = Quality.mode === 'auto' ? `${t('quality.auto')} (${t(`quality.${Quality.level}`)})` : t(`quality.${Quality.mode}`);
  qualityBtn.textContent = `⚙ ${t('menu.quality')}: ${label}`;
}
qualityBtn.addEventListener('click', () => {
  Save.data.settings.quality = Quality.cycle();
  Save.save();
  Sound.click();
});
Quality.onChange((level, auto) => {
  view.resize();
  refreshQualityBtn();
  if (auto) toast(t('toast.lowQuality'));
});
refreshQualityBtn();

let toastTimer = 0;
function toast(text) {
  const el = document.getElementById('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

const refreshWallet = () => screens.refreshWallet(Profile.bucks, Profile.gems, fmt);
Profile.onChange(refreshWallet);
refreshWallet();

// Estados: 'menu' | 'playing' | 'paused' | 'over'
let state = 'menu';
input.enabled = false;
let lastResult = null;

// ---------- tienda ----------
const shop = new Shop(document.getElementById('screen-shop'), {
  onClose: () => {
    shop.close();
    toMenu();
  },
  onWardrobe: (owner) => openWardrobe(owner),
  toast,
});
const wardrobe = new Wardrobe(document.getElementById('screen-wardrobe'), {
  onClose: () => {
    wardrobe.close();
    toMenu();
  },
  onShop: (owner, slot, itemId) => {
    wardrobe.close();
    openShop('items', { owner, slot, itemId });
  },
});
function openWardrobe(owner) {
  shop.close();
  state = 'menu';
  screens.show('wardrobe');
  applyToDom(document.getElementById('screen-wardrobe'));
  wardrobe.open(owner);
  refreshWallet();
}
screens.on('btn-wardrobe', () => {
  Sound.click();
  openWardrobe();
});
function openShop(tab, opts) {
  state = 'menu';
  screens.show('shop');
  applyToDom(document.getElementById('screen-shop'));
  shop.open(tab, opts);
  refreshWallet();
}
screens.on('btn-shop', () => {
  Sound.click();
  openShop('items');
});

// ---------- consumibles antes de jugar ----------
const LOADOUT_ICONS = { headstart: '🚀', shield: '🫧', transform: '🎭', revive: '❤️' };
function renderLoadout() {
  const el = document.getElementById('loadout');
  const ids = Object.keys(LOADOUT_ICONS).filter((id) => Profile.consumableCount(id) > 0);
  el.classList.toggle('hidden', ids.length === 0);
  el.innerHTML = `<span>${t('menu.loadout')}</span>` + ids.map((id) =>
    `<button class="load-chip ${Save.data.loadout[id] ? 'on' : ''}" data-cons="${id}" title="${t(`cons.${id}`)}">${LOADOUT_ICONS[id]} ${t(`cons.${id}`)} ×${Profile.consumableCount(id)}</button>`).join('');
}
document.getElementById('loadout').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cons]');
  if (!b) return;
  Profile.toggleLoadout(b.dataset.cons);
  Sound.click();
});
Profile.onChange(renderLoadout);
renderLoadout();

function startRun() {
  // aspecto equipado, mejoras de la tienda y consumibles elegidos
  game.looks = Object.fromEntries(['base', 'veteran', 'pilot', 'wild'].map((o) => [o, Profile.look(o)]));
  game.player.looks = game.looks;
  game.upg = Profile.runUpgrades();
  game.orbMult = game.upg.orbMult;
  game.record = Save.data.best.distance;
  game.bestBucks = Save.data.best.bucks;
  game.reset();
  hud.reset();
  hud.banner(t('zone.enter'), t(game.zone.current.nameKey));
  game.applyLoadout(Profile.takeLoadout());
  input.clear();
  input.enabled = true;
  state = 'playing';
  screens.show(null);
  screens.showHudButtons(true);
  Sound.music.setMode('chase');
}

function pause() {
  if (state !== 'playing') return;
  state = 'paused';
  input.enabled = false;
  input.clear();
  Sound.music.setMode('off');
  screens.show('pause');
  screens.showHudButtons(false);
}

function resume() {
  if (state !== 'paused') return;
  state = 'playing';
  input.clear();
  input.enabled = true;
  Sound.music.setMode(game.respite.active ? 'calm' : 'chase');
  screens.show(null);
  screens.showHudButtons(true);
}

function toMenu() {
  state = 'menu';
  input.enabled = false;
  input.clear();
  Sound.music.setMode('off');
  screens.show('menu');
  screens.showHudButtons(false);
}

/** Fin de la partida: guarda récord y estadísticas y muestra el resultado. */
function endRun() {
  state = 'over';
  Sound.music.setMode('off');
  input.enabled = false;
  input.clear();
  const d = Math.floor(game.distance);
  const s = Save.data;
  const newBest = d > s.best.distance;
  if (newBest) s.best.distance = d;
  s.stats.runs += 1;
  s.stats.totalDistance += d;
  s.wallet += Math.floor(game.bucks);
  s.gems += game.gemsRun;
  s.stats.totalGems += game.gemsRun;
  s.stats.totalBucks += game.bucks;
  const prevBest = game.record;
  const prevBucks = s.best.bucks;
  s.best.bucks = Math.max(s.best.bucks, game.bucks);
  for (const [id, n] of Object.entries(game.powers.uses)) s.stats.charUses[id] = (s.stats.charUses[id] ?? 0) + n;
  Save.save();
  lastResult = {
    d,
    newBest,
    prevBest,
    stars: game.wanted.peak,
    cause: game.cause,
    bucks: Math.floor(game.bucks),
    prevBucks,
    near: game.combo.nearMisses,
    mult: game.combo.maxLevel,
    gems: game.gemsRun,
  };
  refreshWallet();
  fillOver(true);
  screens.show('over');
  screens.showHudButtons(false);
}

/** Mensaje "casi lo consigo" (o de victoria) para la pantalla final. */
function almostText(r) {
  let main;
  let win = false;
  if (r.newBest && r.prevBest > 0) {
    main = t('over.beatBy', { n: fmt(r.d - r.prevBest) });
    win = true;
  } else if (r.newBest) {
    main = t('over.firstRecord');
    win = true;
  } else {
    main = t('over.missedBy', { n: fmt(Math.max(1, r.prevBest - r.d)) });
  }
  let sub = '';
  if (r.prevBucks > 0 && r.bucks > r.prevBucks) sub = t('over.bucksRecord');
  else if (r.prevBucks > 0 && r.prevBucks - r.bucks <= r.prevBucks * 0.5) sub = t('over.bucksMissed', { n: fmt(r.prevBucks - r.bucks) });
  return { main, sub, win };
}

function fillOver(animate = false) {
  if (!lastResult) return;
  const a = almostText(lastResult);
  screens.fillGameOver({
    distance: lastResult.d,
    best: Save.data.best.distance,
    stars: lastResult.stars,
    cause: causeText(lastResult.cause),
    newBest: lastResult.newBest,
    bucks: lastResult.bucks,
    almost: a.main,
    almostSub: a.sub,
    win: a.win,
    near: lastResult.near,
    mult: lastResult.mult,
    gems: lastResult.gems,
    fmt,
    animate,
  });
}

// ---------- botones ----------
screens.on('btn-play', startRun);
screens.on('btn-resume', resume);
screens.on('btn-to-menu', toMenu);
screens.on('btn-pause', pause);
screens.on('btn-retry', startRun);
screens.on('btn-over-menu', toMenu);

document.querySelectorAll('.lang-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    setLang(btn.dataset.lang);
    if (Sound.ctx) Voice.preload(btn.dataset.lang);
    Save.data.settings.lang = btn.dataset.lang;
    Save.save();
    screens.refreshLangButtons();
    refreshQualityBtn();
    renderLoadout();
    if (state === 'menu' && !document.getElementById('screen-shop').classList.contains('hidden')) shop.render();
    if (state === 'menu' && !document.getElementById('screen-wardrobe').classList.contains('hidden')) wardrobe.render();
    fillOver();
  });
});

input.onKey = (code) => {
  if (code === 'Escape' || code === 'KeyP') {
    if (state === 'playing') pause();
    else if (state === 'paused') resume();
  } else if (code === 'Enter') {
    if (state === 'menu' || state === 'over') startRun();
    else if (state === 'paused') resume();
  }
};

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});

// ---------- bucle ----------
const loop = new Loop(
  (dt) => {
    if (state === 'playing' || state === 'over') {
      game.update(dt, input);
      hud.update(dt);
      if (state === 'playing' && game.over) endRun();
    } else if (state === 'menu') {
      game.updateIdle(dt);
    }
  },
  (dt) => {
    if (state === 'playing' || state === 'menu') Quality.monitor(dt, loop.fps);
    const ctx = view.ctx;
    setSpriteScale(view.scale * view.dpr);
    view.begin();
    game.render(ctx, { showPlayer: state !== 'menu', menu: state === 'menu' });
    if (state === 'playing' || state === 'paused') {
      game.powers.drawOverlay(ctx, game, input);
      hud.draw(ctx, game, loop);
    }
  },
);

if (hud.debug) window.__loopFps = () => loop.fps;

// Esperamos a la fuente del HUD (sin bloquear si no carga)
Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]).finally(() => loop.start());
