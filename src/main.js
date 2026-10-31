import { View } from './core/view.js';
import { Input } from './core/input.js';
import { Loop } from './core/loop.js';
import { Save } from './core/storage.js';
import { setLang, detectLanguage, applyToDom } from './core/i18n.js';
import { Game } from './game.js';
import { Hud } from './ui/hud.js';
import { Screens } from './ui/screens.js';

// ---------- arranque ----------
const canvas = document.getElementById('canvas');
const stage = document.getElementById('stage');
const view = new View(canvas, stage);
const input = new Input(canvas, view);
const game = new Game(view);
const hud = new Hud();
const screens = new Screens();

Save.load();
setLang(Save.data.settings.lang || detectLanguage());
applyToDom();
screens.refreshLangButtons();

// Estados: 'menu' | 'playing' | 'paused'
let state = 'menu';
input.enabled = false;

function startRun() {
  game.reset();
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

// ---------- botones ----------
screens.on('btn-play', startRun);
screens.on('btn-resume', resume);
screens.on('btn-to-menu', toMenu);
screens.on('btn-pause', pause);

document.querySelectorAll('.lang-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    setLang(btn.dataset.lang);
    Save.data.settings.lang = btn.dataset.lang;
    Save.save();
    screens.refreshLangButtons();
  });
});

input.onKey = (code) => {
  if (code === 'Escape' || code === 'KeyP') {
    if (state === 'playing') pause();
    else if (state === 'paused') resume();
  } else if (code === 'Enter') {
    if (state === 'menu') startRun();
    else if (state === 'paused') resume();
  }
};

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});

// ---------- bucle ----------
const loop = new Loop(
  (dt) => {
    if (state === 'playing') game.update(dt, input);
    else if (state === 'menu') game.updateIdle(dt);
  },
  () => {
    const ctx = view.ctx;
    view.begin();
    game.render(ctx, { showPlayer: state !== 'menu' });
    if (state !== 'menu') hud.draw(ctx, game, loop);
  },
);

// Esperamos a la fuente del HUD (sin bloquear si no carga)
Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]).finally(() => loop.start());
