// Simulador de economía: juega partidas con el motor real y un "bot" que salta/vuela hacia los pavos.
// Uso (con el servidor local en marcha):  node tools/simular-economia.js   (necesita Playwright)
// Los choques no matan ni cuentan como esquivas; el bot recoge con avidez (cota alta de un buen jugador).
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 620 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:8123/?debug');
  await pg.waitForTimeout(1500);
  const res = await pg.evaluate(async () => {
    const { Game } = await import('/src/game.js');
    const { Sound } = await import('/src/core/audio.js');
    Sound.setMuted(true);
    const out = [];
    const dists = [800, 800, 800, 800, 1500, 1500, 1500, 1500, 2500, 2500, 2500, 2500];
    for (const target of dists) {
      const g = new Game(window.game.view, window.game.hud);
      g.god = false; g.simHits = 0; g.hit = function (o) { o.nearSeen = false; o.nearDone = true; this.simHits++; };
      g.upg = {}; g.orbMult = 1;
      g.reset();
      let held = false;
      const input = { get held() { return held; }, consumePresses: () => [], clear() {} };
      const dt = 1 / 60;
      let steps = 0;
      while (g.distance < target && steps < 60 * 900) {
        const p = g.player;
        let best = null;
        for (const tk of g.tokens.list) {
          if (!tk.alive || tk.x < p.x + 5 || tk.x > p.x + 300) continue;
          if (!best || tk.x < best.x) best = tk;
        }
        if (p.onFoot) {
          const obst = g.obstacles.some((o) => !o.ko && o.alive && o.hits && (() => { const box = { l: p.x + 30, r: p.x + 110, t: p.y - 20, b: p.y + 25 }; return o.hits(box); })());
          const want = obst || (best && best.y < p.y - 50 && best.x - p.x < 160);
          held = want ? !held || held : false;
          if (p.onGround && !want) held = false;
        } else {
          const ty = best ? best.y : 300;
          held = p.y > ty;
        }
        g.update(dt, input);
        steps++;
      }
      out.push({ target, hits: g.simHits, near: g.combo.nearMisses, mult: g.combo.maxLevel, d: Math.round(g.distance), bucks: Math.round(g.bucks), xp: g.xpRun + Math.floor(g.distance / 10), stars: g.wanted.peak, jet: g.foot.everJet, ...Object.fromEntries(Object.entries(g.earnings).map(([k, v]) => [k, Math.round(v)])) });
    }
    return out;
  });
  console.table(res);
  console.log('errors', JSON.stringify(errs.slice(0, 3)));
  await b.close();
})();
