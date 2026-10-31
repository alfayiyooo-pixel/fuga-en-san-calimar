// Entrada de un solo botón: ratón/toque sobre el canvas o teclado.
// held  → el botón está pulsado ahora mismo.
// presses → cola de pulsaciones nuevas (para habilidades, disparos...).

const FLY_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);

export class Input {
  constructor(canvas, view) {
    this.view = view;
    this.pointers = new Map(); // id → {x, y} lógico
    this.keys = new Set();
    this.presses = [];
    this.pointer = { x: 0, y: 0 }; // última posición conocida (para apuntar)
    this.enabled = true;
    this.onKey = null; // callback(code) para atajos (pausa, etc.)

    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      canvas.setPointerCapture?.(e.pointerId);
      const p = view.toLogical(e.clientX, e.clientY);
      this.pointers.set(e.pointerId, p);
      this.pointer = p;
      this.press(p);
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = view.toLogical(e.clientX, e.clientY);
      this.pointer = p;
      if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, p);
    });
    const release = (e) => this.pointers.delete(e.pointerId);
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('lostpointercapture', release);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      if (FLY_KEYS.has(e.code)) {
        e.preventDefault();
        if (!e.repeat) {
          this.keys.add(e.code);
          this.press(null);
        }
      } else if (!e.repeat && this.onKey) {
        this.onKey(e.code);
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.clear());
  }

  press(pos) {
    if (this.enabled) this.presses.push({ pos, time: performance.now() });
  }

  get held() {
    return this.enabled && (this.pointers.size > 0 || this.keys.size > 0);
  }

  /** Devuelve y vacía las pulsaciones nuevas. */
  consumePresses() {
    const p = this.presses;
    this.presses = [];
    return p;
  }

  clear() {
    this.pointers.clear();
    this.keys.clear();
    this.presses = [];
  }
}
