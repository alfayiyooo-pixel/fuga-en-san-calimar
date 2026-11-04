// Service worker de Fuga en San Calimar.
//
// PROBLEMA QUE EVITA: antes cada archivo se pedía a la red y, si tardaba,
// se servía el de la caché. Con mala conexión se podían mezclar archivos de
// dos versiones distintas del juego (uno nuevo que usa algo que el viejo no
// tiene) y el juego no arrancaba: pantalla en blanco.
//
// AHORA cada versión del juego es un paquete completo y coherente:
//   · BUILD es una huella de TODOS los archivos del juego (la calcula
//     tools/build.js antes de cada subida). Si cambia cualquier archivo,
//     cambia este sw.js y el navegador instala la versión nueva.
//   · Al instalarse descarga TODOS los archivos de ASSETS de una vez (sin la
//     caché HTTP). Si falla alguno, la instalación falla entera y se sigue
//     usando la versión anterior completa (nunca media versión).
//   · Los archivos del juego se sirven siempre de su paquete. Cuando hay una
//     versión nueva, la página se recarga sola en el menú (src/core/pwa.js).
//   · Audios y demás: primero la red y, sin conexión, lo guardado.
//
// NO EDITES a mano el bloque <build>: ejecuta `node tools/build.js`.

// <build>
const BUILD = '0fcdfd14bf3f';
const ASSETS = [
  './',
  './index.html',
  './maxeada.html',
  './manifest.json',
  './css/style.css',
  './src/boot.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './src/characters/costumes.js',
  './src/characters/defs.js',
  './src/characters/fugitive.js',
  './src/characters/icons.js',
  './src/characters/kit.js',
  './src/characters/trails.js',
  './src/characters/transformfx.js',
  './src/characters/vehicles.js',
  './src/config.js',
  './src/core/audio.js',
  './src/core/camera.js',
  './src/core/compat.js',
  './src/core/errorlog.js',
  './src/core/haptics.js',
  './src/core/i18n.js',
  './src/core/input.js',
  './src/core/loop.js',
  './src/core/music.js',
  './src/core/pwa.js',
  './src/core/quality.js',
  './src/core/rng.js',
  './src/core/storage.js',
  './src/core/view.js',
  './src/core/voice.js',
  './src/credits.js',
  './src/entities/hazards.js',
  './src/entities/hideouts.js',
  './src/entities/minors.js',
  './src/entities/obstacles.js',
  './src/entities/player.js',
  './src/entities/street.js',
  './src/entities/tokens.js',
  './src/fx/particles.js',
  './src/fx/popups.js',
  './src/fx/sprites.js',
  './src/game.js',
  './src/i18n/translations.js',
  './src/main.js',
  './src/meta/achievements.js',
  './src/meta/catalog.js',
  './src/meta/daily.js',
  './src/meta/maxed.js',
  './src/meta/missions.js',
  './src/meta/payments.js',
  './src/meta/profile.js',
  './src/meta/progression.js',
  './src/online/ranking.js',
  './src/systems/arrest.js',
  './src/systems/boss.js',
  './src/systems/combo.js',
  './src/systems/events.js',
  './src/systems/foot.js',
  './src/systems/intro.js',
  './src/systems/marks.js',
  './src/systems/powers.js',
  './src/systems/radio.js',
  './src/systems/respite.js',
  './src/systems/tutorial.js',
  './src/systems/wanted.js',
  './src/ui/achievements.js',
  './src/ui/badge.js',
  './src/ui/credits.js',
  './src/ui/deathlog.js',
  './src/ui/feedback.js',
  './src/ui/hud.js',
  './src/ui/newspaper.js',
  './src/ui/preview.js',
  './src/ui/progress.js',
  './src/ui/ranking.js',
  './src/ui/roulette.js',
  './src/ui/screens.js',
  './src/ui/settings.js',
  './src/ui/shop.js',
  './src/ui/tuner.js',
  './src/ui/wardrobe.js',
  './src/world/ambient.js',
  './src/world/parallax.js',
  './src/world/patterns.js',
  './src/world/spawner.js',
  './src/world/themes/beach.js',
  './src/world/themes/finance.js',
  './src/world/themes/hills.js',
  './src/world/themes/industrial.js',
  './src/world/themes/port.js',
  './src/world/themes/shapes.js',
  './src/world/variants.js',
  './src/world/zones.js',
];
// </build>

const APP = `san-calimar-app-${BUILD}`;
const MEDIA = 'san-calimar-media';
// Música: se guarda al instalar para que suene sin conexión. Las pistas que no
// existan (se usa el tema generado por código) se ignoran sin romper nada.
const MUSIC = ['menu', 'playa', 'centro', 'industrial', 'mansiones', 'puerto', 'aurelio', 'vera', 'bruno'].map((id) => `./audio/musica/${id}.mp3`);
const OPTIONAL = ['./audio/musica/serenata_mexicana.mp3', ...MUSIC];
const NETWORK_TIMEOUT = 4000; // ms: con una red muy lenta se usa la caché (solo audios y extras)

const scope = new URL(self.registration.scope);
const appPaths = new Set(ASSETS.map((u) => new URL(u, scope).pathname));

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(APP)
      // 'reload': sin la caché HTTP (GitHub Pages guarda 10 min): siempre la versión publicada
      .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => caches.open(MEDIA))
      .then((c) => Promise.allSettled(OPTIONAL.map((u) => c.match(u).then((hit) => hit || c.add(u)))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('san-calimar-') && k !== APP && k !== MEDIA).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'build') e.source?.postMessage({ build: BUILD });
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

/** Archivos del juego: siempre del paquete de esta versión. */
async function fromApp(req, path) {
  const cache = await caches.open(APP);
  const hit = await cache.match(path === scope.pathname ? './index.html' : req, { ignoreSearch: true });
  if (hit) return hit;
  // no debería pasar (todo se descarga al instalar): a la red
  return fetch(req);
}

async function networkFirst(req) {
  const cache = await caches.open(MEDIA);
  try {
    const fresh = await Promise.race([fetch(req, { cache: 'no-cache' }), timeout(NETWORK_TIMEOUT)]);
    if (fresh && fresh.ok && fresh.type !== 'opaque' && fresh.status !== 206) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    return new Response('', { status: 504, statusText: 'offline' });
  }
}

/** Fuentes de Google: no cambian, así que primero la caché. */
async function cacheFirst(req) {
  const cache = await caches.open(MEDIA);
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
    // ?repair (botón "Reparar"): siempre a la red
    if (url.searchParams.has('repair')) return;
    const path = url.pathname;
    if (BUILD !== 'dev' && (appPaths.has(path) || (req.mode === 'navigate' && path === scope.pathname))) e.respondWith(fromApp(req, path));
    else e.respondWith(networkFirst(req));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(cacheFirst(req));
  }
});
