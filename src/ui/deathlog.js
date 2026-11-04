import { CONFIG } from '../config.js';

/**
 * REGISTRO DE MUERTES (solo con ?debug)
 * Cada muerte guarda qué te mató, en qué metro, zona, estrellas y modo.
 * El panel (abajo a la izquierda) resume las últimas partidas: causas más
 * frecuentes y muertes por tramo de distancia, para localizar picos de
 * dificultad. También en la consola: window.__deaths() y __deathsClear().
 */
const KEY = 'fuga_deathlog';
const D = () => CONFIG.debug.deathLog;

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? [];
  } catch {
    return [];
  }
}

function save(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-D().keep)));
  } catch {}
}

let listeners = [];

export const DeathLog = {
  enabled: false,

  /** Apunta una muerte (lo llama Game.hit). */
  record(g, o) {
    if (!this.enabled) return;
    const list = load();
    list.push({
      d: Math.round(g.distance),
      cause: o.src ?? o.type,
      zone: g.zone.current.id,
      stars: g.wanted.stars,
      mode: g.powers.char && g.powers.char !== 'base' ? g.powers.char : g.player.onFoot ? 'foot' : 'jet',
      speed: Math.round(g.speed),
      t: Math.round(g.runTime),
      at: Date.now(),
    });
    save(list);
    listeners.forEach((f) => f());
  },

  list: load,

  clear() {
    save([]);
    listeners.forEach((f) => f());
  },

  /** Resumen de las últimas n muertes. */
  summary(n = D().summaryRuns) {
    const runs = load().slice(-n);
    const bin = D().bin;
    const causes = {};
    const bins = {};
    for (const r of runs) {
      causes[r.cause] = (causes[r.cause] ?? 0) + 1;
      const b = Math.floor(r.d / bin) * bin;
      const e = (bins[b] ??= { n: 0, causes: {} });
      e.n++;
      e.causes[r.cause] = (e.causes[r.cause] ?? 0) + 1;
    }
    const avg = runs.length ? Math.round(runs.reduce((a, r) => a + r.d, 0) / runs.length) : 0;
    const sorted = [...runs].map((r) => r.d).sort((a, b) => a - b);
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
    return { runs, avg, median, causes, bins };
  },
};

/** Panel plegable con el resumen. */
export function createDeathPanel() {
  DeathLog.enabled = true;
  window.__deaths = () => {
    const s = DeathLog.summary();
    console.table(s.runs);
    return s;
  };
  window.__deathsClear = () => DeathLog.clear();
  const panel = document.createElement('div');
  panel.id = 'deathlog';
  panel.className = 'collapsed';
  document.body.appendChild(panel);
  ['pointerdown', 'keydown'].forEach((ev) => panel.addEventListener(ev, (e) => e.stopPropagation()));
  const render = () => {
    const s = DeathLog.summary();
    const bin = D().bin;
    const top = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]);
    const maxBin = Math.max(1, ...Object.values(s.bins).map((b) => b.n));
    const binKeys = Object.keys(s.bins).map(Number).sort((a, b) => a - b);
    panel.innerHTML = `
      <div class="tuner-head"><b>Muertes (${s.runs.length})</b>
        <span><button data-act="clear">Borrar</button> <button data-act="toggle">${panel.classList.contains('collapsed') ? '+' : '–'}</button></span></div>
      <div class="dl-body">
        <div>Media <b>${s.avg} m</b> · mediana <b>${s.median} m</b></div>
        <div class="dl-sec">Causas</div>
        ${top(s.causes).map(([c, n]) => `<div class="dl-row"><span>${c}</span><b>${n}</b></div>`).join('') || '<div>—</div>'}
        <div class="dl-sec">Por tramo (${bin} m)</div>
        ${binKeys.map((b) => {
          const e = s.bins[b];
          const main = top(e.causes).slice(0, 2).map(([c, n]) => `${c}×${n}`).join(' ');
          return `<div class="dl-bin"><span>${b}</span><i style="width:${(e.n / maxBin) * 100}%"></i><b>${e.n}</b><small>${main}</small></div>`;
        }).join('')}
        <div class="dl-sec">Últimas</div>
        ${s.runs.slice(-8).reverse().map((r) => `<div class="dl-row"><span>${r.d} m · ${r.cause}</span><small>${r.zone} ${r.stars}★ ${r.mode}</small></div>`).join('')}
      </div>`;
  };
  panel.addEventListener('click', (e) => {
    const act = e.target.dataset.act;
    if (act === 'toggle') {
      panel.classList.toggle('collapsed');
      render();
    } else if (act === 'clear') DeathLog.clear();
  });
  listeners.push(render);
  render();
}
