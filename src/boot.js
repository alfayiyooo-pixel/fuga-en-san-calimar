/* ARRANQUE SEGURO de Fuga en San Calimar.
 *
 * Es un script "clásico" escrito en JavaScript antiguo (ES5) a propósito: se
 * ejecuta ANTES que el juego y también en navegadores viejos, donde el juego
 * no llegaría ni a empezar. Se encarga de:
 *   1. Capturar los errores de JavaScript y de carga desde el primer momento
 *      (el juego los envía luego a Supabase: src/core/errorlog.js).
 *   2. Comprobar que el navegador es compatible. Si no lo es, o si es el
 *      navegador interno de una app (Instagram, Facebook…) y algo falla, se
 *      muestra un mensaje claro ("Ábrelo en Chrome o Safari") en vez de una
 *      pantalla en blanco.
 *   3. La pantalla de carga con barra de progreso.
 *
 * Los textos de esta pantalla están aquí (y no en src/i18n/translations.js)
 * porque se tienen que poder mostrar aunque el navegador no sea capaz de
 * cargar el resto del juego. Los demás textos sí están en translations.js.
 * Los tiempos también están aquí por la misma razón (BOOT_* más abajo).
 */
(function () {
  'use strict';

  // Nº de archivos del juego que se descargan (lo actualiza tools/build.js)
  var MODULES = 87; // <build:modules>
  var BOOT_SLOW = 20000; // ms: si no ha terminado de cargar, aviso con "Reintentar" / "Reparar"
  var BOOT_MAX_ERRORS = 15; // errores guardados como mucho antes de que arranque el juego

  var w = window;
  var doc = document;
  var es = String((navigator.languages && navigator.languages[0]) || navigator.language || 'es').toLowerCase().indexOf('es') === 0;
  var TXT = es
    ? {
        loading: 'Cargando…',
        starting: 'Preparando la ciudad…',
        slow: 'Está tardando más de lo normal. Si no avanza, prueba a reintentar.',
        retry: 'Reintentar',
        repair: 'Reparar y recargar',
        fatalTitle: 'No se ha podido abrir el juego',
        fatal: 'Tu navegador no ha podido cargar el juego. Ábrelo en Chrome o Safari actualizados.',
        old: 'Este navegador es demasiado antiguo para el juego. Actualízalo o ábrelo en Chrome o Safari.',
        inApp: 'Estás en el navegador interno de {app}, que a veces no carga bien los juegos. Ábrelo en Chrome o Safari: menú ⋯ → «Abrir en el navegador».',
        copy: 'Copiar enlace',
        copied: '¡Enlace copiado!',
      }
    : {
        loading: 'Loading…',
        starting: 'Getting the city ready…',
        slow: 'This is taking longer than usual. If it does not move, try again.',
        retry: 'Try again',
        repair: 'Repair and reload',
        fatalTitle: 'The game could not start',
        fatal: 'Your browser could not load the game. Open it in an up-to-date Chrome or Safari.',
        old: 'This browser is too old for the game. Update it or open it in Chrome or Safari.',
        inApp: 'You are in the {app} in-app browser, which sometimes fails to load games. Open it in Chrome or Safari: ⋯ menu → “Open in browser”.',
        copy: 'Copy link',
        copied: 'Link copied!',
      };

  // ---------- plataforma y navegador interno ----------
  var ua = navigator.userAgent || '';
  function detectInApp() {
    if (/Instagram/i.test(ua)) return 'Instagram';
    if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return 'Facebook';
    if (/WhatsApp/i.test(ua)) return 'WhatsApp';
    if (/musical_ly|TikTok|BytedanceWebview/i.test(ua)) return 'TikTok';
    if (/Snapchat/i.test(ua)) return 'Snapchat';
    if (/\bLine\//i.test(ua)) return 'LINE';
    if (/Twitter/i.test(ua)) return 'X';
    return null;
  }
  function detectPlatform() {
    try {
      // APK (Trusted Web Activity / Capacitor / Cordova): el primer arranque llega con este referrer
      if (doc.referrer.indexOf('android-app://') === 0) localStorage.setItem('sc-apk', '1');
      if (w.Capacitor || w.cordova || localStorage.getItem('sc-apk') === '1') return 'apk';
    } catch (e) {
      /* sin almacenamiento */
    }
    var mm = w.matchMedia;
    if ((mm && (mm('(display-mode: standalone)').matches || mm('(display-mode: fullscreen)').matches)) || navigator.standalone === true) return 'pwa';
    return 'web';
  }

  var boot = {
    errors: [], // errores capturados antes de que el juego tome el relevo
    onError: null, // el juego (errorlog.js) pone aquí su función
    ready: false,
    inApp: detectInApp(),
    platform: detectPlatform(),
    texts: TXT,
    progress: setProgress,
    done: done,
    fatal: fatal,
    repair: repair,
  };
  w.__scBoot = boot;

  // ---------- captura de errores ----------
  function short(s, n) {
    s = String(s == null ? '' : s);
    return s.length > n ? s.slice(0, n) : s;
  }
  function stripOrigin(s) {
    return String(s || '').split(location.origin + '/').join('').split(location.href).join('');
  }
  function capture(e) {
    if (boot.onError) {
      boot.onError(e);
      return;
    }
    if (boot.errors.length < BOOT_MAX_ERRORS) boot.errors.push(e);
  }
  boot.capture = capture;

  w.addEventListener(
    'error',
    function (ev) {
      var t = ev.target;
      if (t && t !== w && (t.tagName === 'SCRIPT' || t.tagName === 'LINK' || t.tagName === 'IMG' || t.tagName === 'AUDIO')) {
        // un archivo que no se ha podido cargar
        var url = stripOrigin(t.src || t.href || '');
        capture({ kind: 'resource', message: 'No se pudo cargar ' + t.tagName.toLowerCase() + ': ' + short(url, 200), source: short(url, 300) });
        if (!boot.ready && t.tagName === 'SCRIPT' && /main\.js/.test(url)) fatal('fatal');
        return;
      }
      var src = stripOrigin(ev.filename || '') + (ev.lineno ? ':' + ev.lineno + ':' + (ev.colno || 0) : '');
      var msg = short(ev.message || (ev.error && ev.error.message) || 'Error', 500);
      capture({ kind: 'js', message: msg, source: short(src, 300), stack: short(stripOrigin(ev.error && ev.error.stack), 2000) });
      // un error del propio juego antes de que arranque = no va a arrancar
      if (!boot.ready && /src\//.test(src)) fatal('fatal', msg);
    },
    true
  );
  w.addEventListener('unhandledrejection', function (ev) {
    var r = ev.reason || {};
    capture({ kind: 'promise', message: short(r.message || String(r), 500), stack: short(stripOrigin(r.stack), 2000) });
  });

  // ---------- compatibilidad ----------
  function supported() {
    try {
      // sintaxis moderna que usa el juego (clases, ?. ?? ??=, módulos)
      new Function('class A { m() { let a = null; a ??= { b: 1 }; return a?.b ?? 0; } } return new A().m();')();
      if (!('noModule' in doc.createElement('script'))) return false;
      var c = doc.createElement('canvas');
      if (!c.getContext || !c.getContext('2d')) return false;
      if (!w.Promise || !w.Map || !w.requestAnimationFrame || !w.fetch) return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  // ---------- pantalla de carga ----------
  var el = {};
  function $(id) {
    return doc.getElementById(id);
  }
  var shown = 0; // fracción mostrada (0-1)
  var target = 0.05;
  function setProgress(frac, label) {
    if (frac > target) target = Math.min(1, frac);
    if (label && el.msg) el.msg.textContent = label === 'starting' ? TXT.starting : label;
  }
  function tick() {
    if (!el.fill) return;
    shown += (target - shown) * 0.18;
    el.fill.style.width = (shown * 100).toFixed(1) + '%';
    if (!boot.ready || shown < 0.995) w.requestAnimationFrame(tick);
  }
  // archivos descargados → progreso (90 % de la barra)
  var loaded = {};
  var count = 0;
  function countResource(name) {
    if (!/\/src\/.+\.js(\?|$)/.test(name) || loaded[name]) return;
    loaded[name] = 1;
    count++;
    if (MODULES > 0) setProgress(0.05 + 0.85 * Math.min(1, count / MODULES));
  }
  function watchResources() {
    try {
      var list = performance.getEntriesByType('resource');
      for (var i = 0; i < list.length; i++) countResource(list[i].name);
      var po = new PerformanceObserver(function (l) {
        var e = l.getEntries();
        for (var k = 0; k < e.length; k++) countResource(e[k].name);
      });
      po.observe({ type: 'resource', buffered: true });
      boot.po = po;
    } catch (e) {
      // sin PerformanceObserver: la barra avanza sola poco a poco
      var fake = setInterval(function () {
        if (boot.ready) return clearInterval(fake);
        setProgress(target + (0.85 - target) * 0.08);
      }, 200);
    }
  }

  function done() {
    if (boot.ready) return;
    boot.ready = true;
    clearTimeout(boot.slowTimer);
    if (boot.po) boot.po.disconnect();
    target = 1;
    var root = $('boot');
    if (!root) return;
    setTimeout(function () {
      root.className += ' boot-hide';
      setTimeout(function () {
        if (root.parentNode) root.parentNode.removeChild(root);
      }, 450);
    }, 180);
  }

  /** Borra la caché del juego y el service worker y recarga (por si se ha quedado una versión rota). */
  function repair() {
    var jobs = [];
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        jobs.push(
          navigator.serviceWorker.getRegistrations().then(function (regs) {
            return Promise.all(regs.map(function (r) { return r.unregister(); }));
          })
        );
      }
      if (w.caches && caches.keys) {
        jobs.push(
          caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (k) { return k.indexOf('san-calimar') === 0 ? caches.delete(k) : null; }));
          })
        );
      }
    } catch (e) {
      /* nada */
    }
    var go = function () {
      location.replace(location.pathname + location.search.replace(/[?&]repair\b[^&]*/, '').replace(/^&/, '?'));
    };
    (w.Promise ? Promise.all(jobs).then(go, go) : go());
    setTimeout(go, 2500);
  }

  function button(text, cls, fn) {
    var b = doc.createElement('button');
    b.className = 'boot-btn ' + cls;
    b.textContent = text;
    b.onclick = fn;
    return b;
  }

  /** Mensaje claro en lugar de una pantalla en blanco. */
  function fatal(kind, detail) {
    if (boot.isFatal) return;
    boot.isFatal = true;
    clearTimeout(boot.slowTimer);
    capture({ kind: kind === 'unsupported' ? 'unsupported' : 'fatal', message: kind === 'unsupported' ? 'Navegador no compatible' : 'No arranca: ' + short(detail || 'error al cargar', 400) });
    var box = $('boot-box') || rebuild();
    if (!box) return;
    box.innerHTML = '';
    var h = doc.createElement('h1');
    h.className = 'boot-title small';
    h.textContent = TXT.fatalTitle;
    var p = doc.createElement('p');
    p.className = 'boot-text';
    p.textContent = boot.inApp ? TXT.inApp.replace('{app}', boot.inApp) : kind === 'unsupported' ? TXT.old : TXT.fatal;
    box.appendChild(h);
    box.appendChild(p);
    var row = doc.createElement('div');
    row.className = 'boot-row';
    if (boot.inApp) row.appendChild(button(TXT.copy, 'primary', copyLink));
    if (kind !== 'unsupported') {
      row.appendChild(button(TXT.retry, boot.inApp ? '' : 'primary', function () { location.reload(); }));
      row.appendChild(button(TXT.repair, '', repair));
    }
    box.appendChild(row);
    sendNow();
  }

  /** La pantalla de carga ya se había quitado (el error llega con el juego en marcha). */
  function rebuild() {
    if (!doc.body) return null;
    var root = doc.createElement('div');
    root.id = 'boot';
    root.className = 'boot';
    var box = doc.createElement('div');
    box.id = 'boot-box';
    box.className = 'boot-box';
    root.appendChild(box);
    doc.body.appendChild(root);
    return box;
  }

  function copyLink(ev) {
    var url = location.href.split('#')[0];
    var ok = function () { ev.target.textContent = TXT.copied; };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(url).then(ok, function () { prompt('', url); });
    } catch (e) {
      /* abajo */
    }
    prompt('', url);
  }

  function slow() {
    if (boot.ready || boot.isFatal) return;
    capture({ kind: 'timeout', message: 'Carga lenta: ' + count + '/' + MODULES + ' archivos tras ' + BOOT_SLOW / 1000 + ' s' });
    var box = $('boot-box');
    if (!box) return;
    var p = doc.createElement('p');
    p.className = 'boot-text';
    p.textContent = TXT.slow;
    var row = doc.createElement('div');
    row.className = 'boot-row';
    row.appendChild(button(TXT.retry, 'primary', function () { location.reload(); }));
    row.appendChild(button(TXT.repair, '', repair));
    box.appendChild(p);
    box.appendChild(row);
    sendNow();
  }

  // ---------- envío directo (solo si el juego no llega a arrancar) ----------
  // Lee la dirección y la clave pública de Supabase de src/config.js (un solo sitio
  // para cambiarlas) y manda los errores con XMLHttpRequest (funciona en todo).
  function sendNow() {
    if (boot.sent || boot.onError) return;
    boot.sent = true;
    var x = new XMLHttpRequest();
    x.open('GET', 'src/config.js', true);
    x.onload = function () {
      var txt = x.responseText || '';
      var url = (txt.match(/url:\s*'(https:[^']+)'/) || [])[1];
      var key = (txt.match(/key:\s*'([^']+)'/) || [])[1];
      var ver = (txt.match(/version:\s*'([^']+)'/) || [])[1] || '';
      if (!url || !key || /enabled:\s*false,\s*\n\s*url:/.test(txt)) return;
      for (var i = 0; i < boot.errors.length && i < 8; i++) post(url, key, ver, boot.errors[i]);
    };
    x.send();
  }
  function post(url, key, ver, e) {
    try {
      var x = new XMLHttpRequest();
      x.open('POST', url.replace(/\/+$/, '') + '/rest/v1/rpc/log_error', true);
      x.setRequestHeader('apikey', key);
      x.setRequestHeader('Content-Type', 'application/json');
      x.send(JSON.stringify(boot.payload(e, ver)));
    } catch (err) {
      /* sin red */
    }
  }
  /** Datos que se guardan con cada error (sin nada personal). */
  boot.payload = function (e, ver, context) {
    var s = w.screen || {};
    return {
      p_kind: short(e.kind, 20),
      p_message: short(e.message, 500),
      p_source: short(e.source || '', 300),
      p_stack: short(e.stack || '', 2000),
      p_version: short(ver, 20),
      p_platform: boot.platform,
      p_ua: short(ua, 400),
      p_screen: short((s.width || 0) + 'x' + (s.height || 0) + '@' + (w.devicePixelRatio || 1) + ' vp ' + w.innerWidth + 'x' + w.innerHeight, 60),
      p_lang: short(navigator.language || '', 12),
      p_context: short((context || 'boot') + (boot.inApp ? ' inapp=' + boot.inApp : ''), 300),
    };
  };

  // ---------- arranque ----------
  function start() {
    el.fill = $('boot-fill');
    el.msg = $('boot-msg');
    if (el.msg) el.msg.textContent = TXT.loading;
    if (!supported()) {
      fatal('unsupported');
      return;
    }
    watchResources();
    w.requestAnimationFrame(tick);
    boot.slowTimer = setTimeout(slow, BOOT_SLOW);
    if (/[?&]repair\b/.test(location.search)) repair();
  }
  // la pantalla de carga está en el HTML justo antes de este script: se arranca ya
  // (sin esperar al resto de la página, para que la comprobación llegue antes que el juego)
  if ($('boot-box') || doc.readyState !== 'loading') start();
  else doc.addEventListener('DOMContentLoaded', start);
})();
