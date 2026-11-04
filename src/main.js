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
import { createDeathPanel } from './ui/deathlog.js';
import { Haptics } from './core/haptics.js';
import { FeedbackDialog } from './ui/feedback.js';
import { Profile } from './meta/profile.js';
import { Shop } from './ui/shop.js';
import { Wardrobe } from './ui/wardrobe.js';
import { ProgressScreen, rewardText, missionText } from './ui/progress.js';
import { badgeHtml } from './ui/badge.js';
import { Progression } from './meta/progression.js';
import { Missions } from './meta/missions.js';
import { Daily } from './meta/daily.js';
import { CONFIG } from './config.js';
import { Roulette, prizeLabel } from './ui/roulette.js';
import { grant } from './meta/progression.js';
import { SettingsScreen, appCard, playCard } from './ui/settings.js';
import { makeHeadline, paperHtml, sharePaper } from './ui/newspaper.js';
import { Pwa } from './core/pwa.js';
import { CreditsScreen } from './ui/credits.js';
import { AchievementsScreen } from './ui/achievements.js';
import { Achievements } from './meta/achievements.js';
import { applyMaxed } from './meta/maxed.js';
import { Online } from './online/ranking.js';
import { RankingScreen, NickDialog, accountCard } from './ui/ranking.js';

// ---------- arranque ----------
Save.load();
applyMaxed(); // cuenta de prueba (maxeada.html o ?maxeada)
Online.init(); // ranking: reintenta subir lo pendiente
Pwa.init();
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
  createDeathPanel();
}

setLang(Save.data.settings.lang || detectLanguage());
applyToDom();
screens.refreshLangButtons();
Sound.setMuted(Save.data.settings.muted);
Sound.setLevels(Save.data.settings.volumes);
screens.setMuteIcon(Save.data.settings.muted);

// el audio solo puede arrancar tras una interacción del jugador
/** Tema del menú (calmado, sin efectos). */
function menuMusic() {
  Sound.music.setCalm(false);
  Sound.music.setFx(null);
  Sound.music.setStars(0);
  Sound.music.play('menu');
}

const unlockAudio = () => {
  const first = !Sound.ctx;
  Sound.unlock();
  if (first && Sound.ctx) {
    Voice.preload(getLang());
    // la música del menú empieza con la primera pulsación (lo exigen los navegadores)
    if (state !== 'playing') menuMusic();
  }
};
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

function toggleMute() {
  const muted = !Save.data.settings.muted;
  Save.data.settings.muted = muted;
  Save.save();
  Sound.setMuted(muted);
  if (muted) Voice.stop();
  screens.setMuteIcon(muted);
  if (!muted) Sound.click();
}
document.querySelectorAll('.btn-mute').forEach((b) =>
  b.addEventListener('click', (e) => {
    e.preventDefault();
    toggleMute();
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

const refreshWallet = () => {
  screens.refreshWallet(Profile.bucks, Profile.gems, fmt, Save.data.tickets);
  renderLevelChip();
};

/** Chip de nivel del menú: insignia de prestigio, nivel y barra de XP. */
function renderLevelChip() {
  const el = document.getElementById('level-chip');
  el.innerHTML = `${badgeHtml(Save.data.prestige)}<span>${t('progress.levelShort', { n: Save.data.level })}</span><span class="xpbar"><span style="width:${Math.round(Progression.fraction * 100)}%"></span></span>`;
  document.getElementById('progress-dot').classList.toggle('hidden', !Progression.canPrestige);
}
Profile.onChange(refreshWallet);
Missions.fill();
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
// ---------- misiones, nivel y prestigio ----------
const progress = new ProgressScreen(document.getElementById('screen-missions'), {
  onClose: () => toMenu(),
  toast,
  onPrestige: (res) => {
    Sound.fanfare();
    toast(`${t('progress.prestigeDone', { n: ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][res.rank] })}  +${res.gems} 💎`);
  },
});
function openProgress() {
  state = 'menu';
  screens.show('missions');
  applyToDom(document.getElementById('screen-missions'));
  progress.open();
  refreshWallet();
}
screens.on('btn-progress', () => {
  Sound.click();
  openProgress();
});
document.getElementById('level-chip').addEventListener('click', () => {
  Sound.click();
  openProgress();
});

// ---------- recompensa diaria ----------
function maybeShowDaily() {
  if (!Daily.available) return false;
  const icon = (r) => (r.gems ? '💎' : r.tickets ? '🪙' : '💵');
  document.getElementById('daily-track').innerHTML = CONFIG.daily.rewards
    .map((r, i) => `<div class="daily-day ${i < Daily.day ? 'past' : ''} ${i === Daily.day ? 'today' : ''}">
        <span>${t('daily.day', { n: i + 1 })}</span><span class="dd-icon">${icon(r)}</span><span>${rewardText(r)}</span></div>`)
    .join('');
  screens.show('daily');
  return true;
}
screens.on('btn-daily', () => {
  const r = Daily.claim();
  if (r) {
    Sound.briefcase();
    toast(`${t('daily.title')}: ${rewardText(r)}`);
  }
  toMenu();
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

// ---------- ranking mundial y apodo ----------
const nickDialog = new NickDialog({ toast: (m) => toast(m) });
const openNick = (mode, after) => nickDialog.open(mode, {
  onDone: (r) => {
    if (r?.submit) applyRankResult(r.submit);
    after?.(r);
  },
});
const rankScreen = new RankingScreen(document.getElementById('screen-ranking'), { onClose: () => toMenu(), nick: openNick });
const feedbackDialog = new FeedbackDialog({ toast });
screens.on('btn-feedback', () => {
  Sound.click();
  feedbackDialog.open();
});
if (!CONFIG.feedback.enabled) document.getElementById('btn-feedback').classList.add('hidden');
screens.on('btn-ranking', () => {
  Sound.click();
  state = 'menu';
  screens.show('ranking');
  applyToDom(document.getElementById('screen-ranking'));
  rankScreen.open();
  // la primera vez que se abre sin cuenta, se ofrece el apodo (se puede cerrar)
  if (!Online.account && !Online.data.asked) {
    Online.data.asked = true;
    Save.save();
    openNick('create', () => rankScreen.load(true));
  }
});

/** Resultado de subir la puntuación: puesto en la portada y en la pantalla final. */
function applyRankResult(r) {
  if (!lastResult || !r) return;
  lastResult.online = 'ranked';
  lastResult.rank = { all: r.rank_all, week: r.rank_week };
  if (lastResult.paper) lastResult.paper.rank = r.rank_all;
  renderOverOnline(true);
}

/** Bloque del ranking en la pantalla final. */
function renderOverOnline(repaintPaper = false) {
  const el = document.getElementById('over-online');
  const r = lastResult;
  if (!el || !r) return;
  let html = '';
  if (r.online === 'ranked' && r.rank) html = `<div class="rank-line">${t('over.rankDone', { n: fmt(r.rank.all) })} <span class="small">${t('over.rankWeek', { n: fmt(r.rank.week) })}</span></div>`;
  else if (r.online === 'sending') html = `<div class="rank-line dim">${t('over.rankSending')}</div>`;
  else if (r.online === 'pending') html = `<div class="rank-line dim">${t('over.rankPending')}</div>`;
  else if (r.online === 'nick') html = `<div class="rank-line">${t('over.rankPrompt')} <button class="btn small btn-primary" id="btn-over-nick">${t('over.rankBtn')}</button></div>`;
  el.innerHTML = html;
  el.querySelector('#btn-over-nick')?.addEventListener('click', () => {
    Sound.click();
    openNick('create');
  });
  if (repaintPaper && r.paper && r.news) document.getElementById('over-paper').innerHTML = paperHtml(r.paper, r.news);
}

// ---------- logros ----------
const achScreen = new AchievementsScreen(document.getElementById('screen-achievements'), { onClose: () => toMenu() });
screens.on('btn-achievements', () => {
  Sound.click();
  state = 'menu';
  screens.show('achievements');
  applyToDom(document.getElementById('screen-achievements'));
  achScreen.open();
});
// fuera de la partida (compras, prestigio, final): aviso con el toast
Achievements.onUnlock((list) => {
  if (state === 'playing') return; // en partida lo muestra el HUD
  list.forEach((a, i) => setTimeout(() => {
    Sound.achievement();
    toast(`🏅 ${t('ach.unlocked')} ${t(`ach.${a.def.id}`)}  +${a.gems} 💎`);
  }, 900 + i * 2700));
  refreshWallet();
});
Profile.onChange(() => {
  if (state !== 'playing') Achievements.check();
});

// ---------- ajustes ----------
const settings = new SettingsScreen(document.getElementById('screen-settings'), {
  onClose: () => toMenu(),
  onMute: toggleMute,
  onCredits: () => {
    screens.show('credits');
    applyToDom(document.getElementById('screen-credits'));
    credits.open();
  },
});
const credits = new CreditsScreen(document.getElementById('screen-credits'), { onClose: () => openSettings() });
// ---------- app instalable ----------
const installBtn = document.getElementById('btn-install');
const iosHelp = document.getElementById('ios-help');
function refreshInstall() {
  installBtn.classList.toggle('hidden', !Pwa.mode);
  if (!document.getElementById('screen-settings').classList.contains('hidden')) settings.render();
}
async function doInstall() {
  if (Pwa.mode === 'ios') {
    iosHelp.classList.remove('hidden');
    return;
  }
  if (await Pwa.install()) toast(t('pwa.thanks'));
  refreshInstall();
}
installBtn.addEventListener('click', () => {
  Sound.click();
  doInstall();
});
document.getElementById('btn-ios-ok').addEventListener('click', () => iosHelp.classList.add('hidden'));
Pwa.onChange((what) => {
  if (what === 'installed') toast(t('pwa.thanks'));
  refreshInstall();
});
settings.addCard(accountCard({ nick: (mode, after) => openNick(mode, after), toast }));
settings.addCard(playCard({ toast }));
settings.addCard(appCard({ onInstall: doInstall, onIosHelp: doInstall, toast }));
refreshInstall();

function openSettings() {
  state = 'menu';
  screens.show('settings');
  applyToDom(document.getElementById('screen-settings'));
  settings.open();
}
screens.on('btn-settings', () => {
  Sound.click();
  openSettings();
});

// ---------- ruleta al morir ----------
let roulettePrize = null;
const roulette = new Roulette(document.getElementById('screen-roulette'), {
  onDone: (prize) => {
    if (prize?.id === 'revive') {
      game.reviveFromDeath();
      state = 'playing';
      input.clear();
      input.enabled = true;
      screens.show(null);
      screens.showHudButtons(true);
      Sound.music.play(game.musicTrack());
      return;
    }
    roulettePrize = prize;
    if (prize) {
      grant({ bucks: prize.bucks, gems: prize.gems, tickets: prize.tickets });
      if (prize.id === 'boost') Save.data.nextBoost = true;
      Profile.changed();
    }
    endRun();
  },
});

/** Al perder: si hay fichas, primero la ruleta; si no, el resumen. */
function onGameOver() {
  if (Save.data.tickets >= CONFIG.roulette.cost) {
    state = 'roulette';
    input.enabled = false;
    input.clear();
    screens.showHudButtons(false);
    screens.show('roulette');
    applyToDom(document.getElementById('screen-roulette'));
    roulette.open({ noRevive: game.rouletteRevived });
  } else {
    endRun();
  }
}

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

/** Marcas de otros jugadores: una sola descarga al empezar (sin conexión, nada). */
function loadMarks() {
  if (!CONFIG.online.marks.enabled || Save.data.settings.marks === false) return;
  const run = game.marks.run;
  const best = Save.data.best.distance;
  Online.ghostMarks(best)
    .then((rows) => {
      if (game.marks.run === run && Array.isArray(rows)) game.marks.set(rows, best, Online.account?.nick, game.startAt);
    })
    .catch(() => {});
}

function startRun() {
  Missions.fill();
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
  loadMarks();
  roulettePrize = null;
  // premio de la ruleta de la partida anterior: imán al empezar
  if (Save.data.nextBoost) {
    Save.data.nextBoost = false;
    game.tokens.magnetTime = CONFIG.roulette.boostMagnet;
    game.tokens.magnetTotal = CONFIG.roulette.boostMagnet;
    game.popups.add(t('roulette.boostActive'), view.w / 2, 200, { color: '#ff6b7d', size: 24, life: 2, rise: 10 });
    Save.save();
  }
  input.clear();
  input.enabled = true;
  state = 'playing';
  screens.show(null);
  screens.showHudButtons(true);
  Sound.music.setCalm(false);
  Sound.music.setFx(null);
  Sound.music.setStars(0);
  Sound.music.play(game.musicTrack());
}

function pause() {
  if (state !== 'playing') return;
  state = 'paused';
  input.enabled = false;
  Sound.jet(0);
  input.clear();
  Sound.music.stop(0.3);
  Voice.stop();
  screens.show('pause');
  screens.showHudButtons(false);
}

function resume() {
  if (state !== 'paused') return;
  state = 'playing';
  input.clear();
  input.enabled = true;
  Sound.music.play(game.musicTrack(), { fade: 0.6 });
  screens.show(null);
  screens.showHudButtons(true);
}

function toMenu() {
  state = 'menu';
  input.enabled = false;
  input.clear();
  menuMusic();
  Sound.jet(0);
  screens.showHudButtons(false);
  if (!maybeShowDaily()) screens.show('menu');
  renderLevelChip();
}

/** Fin de la partida: guarda récord y estadísticas y muestra el resultado. */
function endRun() {
  state = 'over';
  menuMusic();
  input.enabled = false;
  input.clear();
  const d = Math.floor(game.distance);
  const s = Save.data;
  const newBest = d > s.best.distance;
  if (newBest) s.best.distance = d;
  s.stats.runs += 1;
  game.tutorial.finish();
  s.stats.totalDistance += d;
  s.wallet += Math.floor(game.bucks);
  s.gems += game.gemsRun;
  s.stats.totalGems += game.gemsRun;
  s.stats.totalBucks += game.bucks;
  const prevBest = game.record;
  const prevBucks = s.best.bucks;
  s.best.bucks = Math.max(s.best.bucks, game.bucks);
  for (const [id, n] of Object.entries(game.powers.uses)) s.stats.charUses[id] = (s.stats.charUses[id] ?? 0) + n;
  // misiones: comprobación final, cobro y sustitución
  Missions.check(game.missionStats());
  Missions.commitRun(game.missionStats());
  const claimed = Missions.claimAndReplace();
  // experiencia: distancia + orbes + misiones → niveles
  const xpDist = Math.floor(d / CONFIG.progression.metersPerXp);
  const xpMissions = claimed.reduce((a, c) => a + c.reward.xp, 0);
  const xpRoulette = roulettePrize?.xp ?? 0;
  const xpTotal = xpDist + game.xpRun + xpMissions + xpRoulette;
  const ups = Progression.addXp(xpTotal);
  Achievements.commitRun(game, claimed.length);
  Achievements.check();
  if (ups.length) setTimeout(() => Sound.levelUp(), 600);
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
    xp: { total: xpTotal, d: xpDist, o: game.xpRun, m: xpMissions },
    prize: roulettePrize,
    ups,
    claimed,
  };
  // portada del periódico
  const P = game.powers;
  const usedChars = Object.entries(P.uses).sort((a, b) => b[1] - a[1]);
  const owner = usedChars.length ? usedChars[0][0] : 'base';
  lastResult.paper = {
    owner,
    outfitId: Profile.equippedId(owner, 'suit'),
    d,
    zoneId: game.zone.current.id,
    stars: game.wanted.peak,
    footOnly: !game.foot.everJet,
    boss: (game.stats.bossWins ?? 0) > 0,
    hideouts: Object.values(game.stats.hideouts ?? {}).reduce((a, b) => a + b, 0),
    newBest,
    bucks: Math.floor(game.bucks),
    cause: game.cause,
    photo: game.photo,
  };
  lastResult.news = makeHeadline(lastResult.paper);
  // ranking mundial: si mejoras tu marca, se sube sola (o queda pendiente)
  const sub = Online.recordRun({ distance: d, duration: game.runTime, hero: owner, prestige: Save.data.prestige });
  lastResult.online = sub.queued ? (Online.account ? 'sending' : 'nick') : null;
  const thisRun = lastResult;
  sub.done.then((res) => {
    if (lastResult !== thisRun) return;
    if (res) applyRankResult(res);
    else if (thisRun.online === 'sending') {
      thisRun.online = 'pending';
      renderOverOnline();
    }
  });
  // economía (?debug): pavos por fuente, incluidos los de fuera de la partida
  lastResult.econ = {
    ...game.earnings,
    missions: claimed.reduce((a, c) => a + (c.reward.bucks ?? 0), 0),
    levels: ups.reduce((a, u) => a + (u.reward.bucks ?? 0), 0),
    roulette: roulettePrize?.bucks ?? 0,
  };
  if (hud.debug) {
    (window.__econRuns ??= []).push({ d, ...lastResult.econ });
    console.table(lastResult.econ);
  }
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
  if (lastResult.paper) {
    lastResult.paper.causeText = causeText(lastResult.cause);
    if (lastResult.newsLang !== getLang()) {
      lastResult.news = makeHeadline(lastResult.paper);
      lastResult.newsLang = getLang();
    }
    const el = document.getElementById('over-paper');
    el.innerHTML = paperHtml(lastResult.paper, lastResult.news);
    if (animate) {
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
    }
  }
  const a = almostText(lastResult);
  const r = lastResult;
  document.getElementById('over-badge').innerHTML = badgeHtml(Save.data.prestige);
  document.getElementById('over-progress').innerHTML = [
    `<div class="xp-line">${t('over.xp', { n: fmt(r.xp.total) })} <span class="small">(${t('over.xpDetail', { d: fmt(r.xp.d), o: fmt(r.xp.o), m: fmt(r.xp.m) })})</span></div>`,
    r.prize ? `<div class="m-line">🎰 ${t('roulette.won')}: ${prizeLabel(r.prize)} ${r.prize.bucks ? '💵' : r.prize.gems ? '💎' : r.prize.tickets ? '🪙' : ''}</div>` : '',
    ...r.ups.map((u) => `<div class="lvl-up">${t('over.levelUp', { n: u.level })} ${rewardText(u.reward)}</div>`),
    ...r.claimed.map((c) => `<div class="m-line">✔ ${missionText(c.def)} · ${rewardText(c.reward)}</div>`),
    Progression.canPrestige ? `<div class="lvl-up">${t('over.prestigeReady')}</div>` : '',
    hud.debug && r.econ ? `<div class="econ-debug">💵 ${Object.entries(r.econ).filter(([, v]) => v).map(([k, v]) => `${k} ${Math.round(v)}`).join(' · ')} · <b>total ${Math.round(Object.values(r.econ).reduce((a, b) => a + b, 0))}</b></div>` : '',
  ].join('');
  renderOverOnline();
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
screens.on('btn-share', async () => {
  if (!lastResult?.paper) return;
  Sound.click();
  const r = await sharePaper(lastResult.paper, lastResult.news);
  if (r === 'downloaded') toast(t('news.downloaded'));
});

document.querySelectorAll('.lang-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    setLang(btn.dataset.lang);
    if (Sound.ctx) Voice.preload(btn.dataset.lang);
    Save.data.settings.lang = btn.dataset.lang;
    Save.save();
    screens.refreshLangButtons();
    refreshQualityBtn();
    renderLoadout();
    renderLevelChip();
    if (!document.getElementById('screen-missions').classList.contains('hidden')) progress.render();
    if (!document.getElementById('screen-settings').classList.contains('hidden')) settings.render();
    if (!document.getElementById('screen-credits').classList.contains('hidden')) credits.render();
    if (!document.getElementById('screen-achievements').classList.contains('hidden')) achScreen.render();
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

// PAUSA AUTOMÁTICA: al salir de la app, cambiar de pestaña, perder el foco
// de la ventana o recibir una llamada (el audio del sistema se interrumpe)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});
window.addEventListener('blur', () => pause());
window.addEventListener('pagehide', () => pause());
document.addEventListener('freeze', () => pause());
Sound.onInterrupt = () => pause();

// ---------- bucle ----------
const loop = new Loop(
  (dt) => {
    if (state === 'playing' || state === 'over' || state === 'roulette') {
      game.update(dt, input);
      hud.update(dt);
      if (state === 'playing' && game.over) onGameOver();
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
    // foto para la portada del periódico (sin el HUD)
    if (game.photoRequest) {
      game.photoRequest = false;
      try {
        game.photo = canvas.toDataURL('image/jpeg', 0.72);
      } catch {
        game.photo = null;
      }
    }
    if (state === 'playing' || state === 'paused') {
      game.powers.drawOverlay(ctx, game);
      hud.draw(ctx, game, loop);
    }
  },
);

if (hud.debug) window.__loopFps = () => loop.fps;

// Esperamos a la fuente del HUD (sin bloquear si no carga)
Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]).finally(() => {
  loop.start();
  applyToDom();
  maybeShowDaily();
});
