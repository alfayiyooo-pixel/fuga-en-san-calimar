import { View } from './core/view.js';
import { Input } from './core/input.js';
import { Loop } from './core/loop.js';
import { Save } from './core/storage.js';
import { setLang, detectLanguage, applyToDom, fmt, t } from './core/i18n.js';
import { Game } from './game.js';
import { Hud } from './ui/hud.js';
import { Screens } from './ui/screens.js';
import { causeText } from './entities/obstacles.js';
import { Sound } from './core/audio.js';
import { setSpriteScale } from './fx/sprites.js';

// ---------- arranque ----------
const canvas = document.getElementById('canvas');
const stage = document.getElementById('stage');
const view = new View(canvas, stage);
const input = new Input(canvas, view);
const hud = new Hud();
const game = new Game(view, hud);
const screens = new Screens();
if (hud.debug) window.game = game; // acceso desde la consola con ?debug

Save.load();
setLang(Save.data.settings.lang || detectLanguage());
applyToDom();
screens.refreshLangButtons();
Sound.setMuted(Save.data.settings.muted);
screens.setMuteIcon(Save.data.settings.muted);

// el audio solo puede arrancar tras una interacción del jugador
const unlockAudio = () => Sound.unlock();
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

// Estados: 'menu' | 'playing' | 'paused' | 'over'
let state = 'menu';
input.enabled = false;
let lastResult = null;

function startRun() {
  game.reset();
  hud.reset();
  hud.banner(t('zone.enter'), t(game.zone.current.nameKey));
  input.clear();
  input.enabled = true;
  state = 'playing';
  screens.show(null);
  screens.showHudButtons(true);
}

function pause() {
  if (state !== 'playing') return;
  state = 'paused';
  input.enabled = false;
  input.clear();
  screens.show('pause');
  screens.showHudButtons(false);
}

function resume() {
  if (state !== 'paused') return;
  state = 'playing';
  input.clear();
  input.enabled = true;
  screens.show(null);
  screens.showHudButtons(true);
}

function toMenu() {
  state = 'menu';
  input.enabled = false;
  input.clear();
  screens.show('menu');
  screens.showHudButtons(false);
}

/** Fin de la partida: guarda récord y estadísticas y muestra el resultado. */
function endRun() {
  state = 'over';
  input.enabled = false;
  input.clear();
  const d = Math.floor(game.distance);
  const s = Save.data;
  const newBest = d > s.best.distance;
  if (newBest) s.best.distance = d;
  s.stats.runs += 1;
  s.stats.totalDistance += d;
  s.wallet += game.bucks;
  s.stats.totalBucks += game.bucks;
  s.best.bucks = Math.max(s.best.bucks, game.bucks);
  Save.save();
  lastResult = { d, newBest, stars: game.wanted.peak, cause: game.cause, bucks: game.bucks };
  fillOver();
  screens.show('over');
  screens.showHudButtons(false);
}

function fillOver() {
  if (!lastResult) return;
  screens.fillGameOver({
    distance: fmt(lastResult.d),
    best: fmt(Save.data.best.distance),
    stars: lastResult.stars,
    cause: causeText(lastResult.cause),
    newBest: lastResult.newBest,
    bucks: fmt(lastResult.bucks),
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
    Save.data.settings.lang = btn.dataset.lang;
    Save.save();
    screens.refreshLangButtons();
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
  () => {
    const ctx = view.ctx;
    setSpriteScale(view.scale * view.dpr);
    view.begin();
    game.render(ctx, { showPlayer: state !== 'menu', menu: state === 'menu' });
    if (state === 'playing' || state === 'paused') hud.draw(ctx, game, loop);
  },
);

// Esperamos a la fuente del HUD (sin bloquear si no carga)
Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]).finally(() => loop.start());
