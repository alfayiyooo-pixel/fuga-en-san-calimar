import { CONFIG } from '../config.js';

/**
 * Panel de ajuste en vivo (solo con ?debug): deslizadores que cambian
 * CONFIG.player al momento. "Copiar" deja en el portapapeles el bloque
 * listo para pegar en src/config.js.
 */
const FIELDS = [
  ['gravity', 600, 3000, 10],
  ['thrust', 1200, 6000, 10],
  ['brakeBoost', 1, 4, 0.05],
  ['riseCut', 1, 4, 0.05],
  ['maxRise', 200, 900, 5],
  ['maxFall', 200, 1100, 5],
  ['thrustRampUp', 0.005, 0.2, 0.005],
  ['thrustRampDown', 0.005, 0.2, 0.005],
  ['ceilingBounce', 0, 1, 0.05],
  ['groundBounce', 0, 1, 0.05],
];

export function createTuner() {
  const defaults = { ...CONFIG.player };
  const panel = document.createElement('div');
  panel.id = 'tuner';
  panel.innerHTML = `
    <div class="tuner-head"><b>Física (debug)</b>
      <button data-act="toggle">–</button></div>
    <div class="tuner-body">
      ${FIELDS.map(([k, min, max, step]) => `
        <label><span>${k}</span>
          <input type="range" min="${min}" max="${max}" step="${step}" value="${CONFIG.player[k]}" data-key="${k}">
          <output data-out="${k}">${CONFIG.player[k]}</output></label>`).join('')}
      <div class="tuner-actions">
        <button data-act="reset">Restaurar</button>
        <button data-act="copy">Copiar valores</button>
      </div>
    </div>`;
  document.body.appendChild(panel);

  // que los deslizadores no activen el vuelo ni la tecla espacio
  ['pointerdown', 'keydown'].forEach((ev) => panel.addEventListener(ev, (e) => e.stopPropagation()));

  panel.addEventListener('input', (e) => {
    const k = e.target.dataset.key;
    if (!k) return;
    CONFIG.player[k] = Number(e.target.value);
    panel.querySelector(`[data-out="${k}"]`).textContent = e.target.value;
  });
  panel.addEventListener('click', async (e) => {
    const act = e.target.dataset.act;
    if (act === 'toggle') {
      panel.classList.toggle('collapsed');
      e.target.textContent = panel.classList.contains('collapsed') ? '+' : '–';
    } else if (act === 'reset') {
      FIELDS.forEach(([k]) => {
        CONFIG.player[k] = defaults[k];
        panel.querySelector(`[data-key="${k}"]`).value = defaults[k];
        panel.querySelector(`[data-out="${k}"]`).textContent = defaults[k];
      });
    } else if (act === 'copy') {
      const text = FIELDS.map(([k]) => `    ${k}: ${CONFIG.player[k]},`).join('\n');
      try {
        await navigator.clipboard.writeText(text);
        e.target.textContent = '¡Copiado!';
      } catch {
        console.log(text);
        e.target.textContent = 'Ver consola';
      }
      setTimeout(() => (e.target.textContent = 'Copiar valores'), 1500);
    }
    e.target.blur();
  });
}
