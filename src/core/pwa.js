// App instalable (PWA): service worker, botón "Instalar app" y ayuda para iPhone.

const listeners = new Set();
let deferred = null; // evento beforeinstallprompt (Chrome/Edge/Android)

export const Pwa = {
  /** ¿Se está ejecutando como app instalada (desde el icono)? */
  get standalone() {
    return (
      window.matchMedia?.('(display-mode: fullscreen)').matches ||
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  },

  /** iPhone/iPad: no hay aviso de instalación; se añade desde "Compartir". */
  get ios() {
    const ua = navigator.userAgent;
    return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  },

  /** 'prompt' (se puede instalar con un botón), 'ios' (instrucciones) o null. */
  get mode() {
    if (this.standalone) return null;
    if (deferred) return 'prompt';
    if (this.ios) return 'ios';
    return null;
  },

  onChange(fn) {
    listeners.add(fn);
  },

  /** Muestra el aviso nativo de instalación. Devuelve true si se aceptó. */
  async install() {
    if (!deferred) return false;
    const e = deferred;
    deferred = null;
    e.prompt();
    const choice = await e.userChoice.catch(() => null);
    emit();
    return choice?.outcome === 'accepted';
  },

  /** Hay una versión nueva del juego instalada: hay que recargar (main.js lo hace en el menú). */
  updateReady: false,

  init() {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      const sw = navigator.serviceWorker;
      // si ya había una versión controlando la página, un cambio = versión nueva lista
      const hadController = !!sw.controller;
      sw.addEventListener('controllerchange', () => {
        if (!hadController || this.updateReady) return;
        this.updateReady = true;
        emit('update');
      });
      sw.register('sw.js', { updateViaCache: 'none' })
        .then((reg) => {
          // buscar versión nueva al volver a la app y cada cierto tiempo
          const check = () => reg.update().catch(() => {});
          document.addEventListener('visibilitychange', () => document.hidden || check());
          setInterval(check, 30 * 60 * 1000);
        })
        .catch(() => {});
    }
    // que el navegador no borre el progreso guardado si le falta espacio
    navigator.storage?.persist?.().catch(() => {});
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferred = e;
      emit();
    });
    window.addEventListener('appinstalled', () => {
      deferred = null;
      emit('installed');
    });
  },
};

function emit(what) {
  for (const fn of listeners) fn(what);
}
