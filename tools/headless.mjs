// Entorno mínimo para ejecutar la lógica del juego en Node, sin navegador
// (para tools/test-caminos.js). Simula lo justo de window/document/canvas:
// el dibujo no hace nada, la simulación es la del juego real.

const noop = () => {};
const ctx2d = new Proxy(
  {},
  {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => ({ addColorStop: noop, setTransform: noop });
      if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      if (k === 'canvas') return { width: 960, height: 540 };
      return noop;
    },
    set(t, k, v) {
      t[k] = v;
      return true;
    },
  },
);
const element = () => ({
  style: { setProperty: noop },
  classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  getContext: () => ctx2d,
  addEventListener: noop,
  appendChild: noop,
  setAttribute: noop,
  querySelector: () => null,
  querySelectorAll: () => [],
  width: 960,
  height: 540,
});
const store = new Map();
globalThis.window = globalThis;
globalThis.location = { search: '', href: 'http://localhost/', origin: 'http://localhost', protocol: 'http:', pathname: '/' };
globalThis.document = { createElement: element, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener: noop, body: element(), fonts: null, hidden: false, documentElement: element() };
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), clear: () => store.clear() };
globalThis.sessionStorage = globalThis.localStorage;
try {
  globalThis.navigator = { userAgent: 'node', language: 'es', languages: ['es'], maxTouchPoints: 0, platform: 'node' };
} catch {
  /* Node 21+ ya trae navigator */
}
globalThis.matchMedia = () => ({ matches: false, addEventListener: noop });
globalThis.addEventListener = noop;
globalThis.requestAnimationFrame = noop;
globalThis.devicePixelRatio = 1;
globalThis.innerWidth = 960;
globalThis.innerHeight = 540;
globalThis.CanvasRenderingContext2D = function () {};
globalThis.Path2D = function () {};
