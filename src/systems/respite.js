import { CONFIG } from '../config.js';
import { rand } from '../core/rng.js';
import { t } from '../core/i18n.js';
import { Sound } from '../core/audio.js';

/**
 * "Respiro": cuando la partida es muy rápida y con 4+ estrellas, tras un
 * intervalo aleatorio la policía pierde el rastro unos segundos:
 * baja la velocidad, se vacía la búsqueda, no hay obstáculos y llueven pavos.
 * Al terminar, la separación entre obstáculos vuelve a la normalidad poco a poco.
 */
export class Respite {
  reset() {
    this.active = false;
    this.left = 0;
    this.duration = 1;
    this.timer = rand(...CONFIG.respite.interval);
    this.recover = 0;
    this.count = 0;
  }

  /** ¿La partida está "al límite"? */
  eligible(g) {
    const R = CONFIG.respite;
    return !g.dead && g.baseSpeed() >= R.minSpeed && g.wanted.stars >= R.minStars;
  }

  /** Multiplicador de velocidad que aplica el respiro. */
  get speedMult() {
    return this.active ? CONFIG.respite.speedMult : 1;
  }

  /** Multiplicador de separación de obstáculos (vuelve a 1 poco a poco). */
  get gapMult() {
    const R = CONFIG.respite;
    return 1 + (R.recoverGapMult - 1) * (this.recover / R.recoverTime);
  }

  /** 0→1 progreso del respiro en curso (para el HUD). */
  get progress() {
    return this.active ? 1 - this.left / this.duration : 0;
  }

  update(dt, g) {
    const R = CONFIG.respite;
    if (this.active) {
      this.left -= dt;
      g.wanted.drain(R.heatDrain * dt, R.minStarsAfter);
      g.tokens.rain(dt, g, R.rainRate, R.rainGoldChance);
      if (this.left <= 0 || g.dead) this.end(g);
      return;
    }
    this.recover = Math.max(0, this.recover - dt);
    if (this.eligible(g)) {
      this.timer -= dt;
      if (this.timer <= 0) this.start(g);
    }
  }

  start(g) {
    this.active = true;
    this.count++;
    this.duration = rand(...CONFIG.respite.duration);
    this.left = this.duration;
    // la policía pierde el rastro: se retiran helicópteros, misiles en aviso
    // y todo lo que aún no ha entrado en pantalla
    const edge = g.camera.x + g.view.w;
    for (const o of g.obstacles) {
      if (o.type === 'heli') o.state = 'leave';
      else if (o.type === 'missile' && o.state !== 'fly') o.alive = false;
      else if ((o.left?.() ?? o.x) > edge) o.alive = false;
    }
    g.hud.banner(t('respite.title'), t('respite.sub'));
    g.popups.add(t('wanted.lost'), g.view.w / 2, 215, { color: '#7ff7e8', size: 30, life: 2, rise: 10 });
    Sound.respite();
    Sound.music.setMode('calm');
  }

  end(g) {
    this.active = false;
    this.timer = rand(...CONFIG.respite.interval);
    this.recover = CONFIG.respite.recoverTime;
    if (!g.dead) Sound.music.setMode('chase');
  }
}
