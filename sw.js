// Service worker de Fuga en San Calimar.
//
// Estrategia "primero la red": con conexión siempre se descarga la última
// versión publicada (cada push a GitHub Pages llega sola, también los audios
// nuevos de audio/voces/ y audio/musica/), y cada respuesta se guarda en la
// caché. Sin conexión se sirve lo guardado, así que el juego funciona offline
// en cuanto se ha abierto una vez.
//
// Si cambias la lista CORE o quieres forzar limpiar la caché, sube VERSION.
const VERSION = 'v2';
const CACHE = `san-calimar-${VERSION}`;
const CORE = [
  './',
  './index.html',
  './css/style.css',
  './manifest.json',
  './src/main.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];
// Música: se guarda al instalar para que suene sin conexión. Las pistas que no
// existan (se usa el tema generado por código) se ignoran sin romper nada.
const MUSIC = ['menu', 'playa', 'centro', 'industrial', 'mansiones', 'puerto', 'aurelio', 'vera', 'bruno'].map((id) => `./audio/musica/${id}.mp3`);
const OPTIONAL = ['./audio/musica/serenata_mexicana.mp3', ...MUSIC];
const NETWORK_TIMEOUT = 4000; // ms: con una red muy lenta se usa la caché

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(CORE).catch(() => {}).then(() => Promise.allSettled(OPTIONAL.map((u) => c.add(u)))))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('san-calimar-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    // 'no-cache' revalida con el servidor (evita la caché HTTP de 10 min de GitHub Pages)
    const fresh = await Promise.race([fetch(req, { cache: 'no-cache' }), timeout(NETWORK_TIMEOUT)]);
    if (fresh && fresh.ok && fresh.type !== 'opaque') cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate') {
      const index = await cache.match('./index.html');
      if (index) return index;
    }
    return new Response('', { status: 504, statusText: 'offline' });
  }
}

/** Fuentes de Google: no cambian, así que primero la caché. */
async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  } catch {
    return new Response('', { status: 504, statusText: 'offline' });
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    e.respondWith(networkFirst(req));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(cacheFirst(req));
  }
});
