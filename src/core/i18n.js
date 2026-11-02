import { TRANSLATIONS, LANGUAGES } from '../i18n/translations.js';

let current = 'es';
let numberFmt = new Intl.NumberFormat('es-ES');
const listeners = new Set();

export function detectLanguage() {
  const nav = (navigator.language || 'es').toLowerCase();
  return nav.startsWith('es') ? 'es' : 'en';
}

export function getLang() {
  return current;
}

export function setLang(lang) {
  current = LANGUAGES.includes(lang) ? lang : 'es';
  numberFmt = new Intl.NumberFormat(current === 'es' ? 'es-ES' : 'en-US');
  document.documentElement.lang = current;
  applyToDom();
  listeners.forEach((fn) => fn(current));
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Traduce una clave. Los parámetros sustituyen {nombre} en el texto. */
export function t(key, params) {
  let text = TRANSLATIONS[current][key] ?? TRANSLATIONS.es[key] ?? key;
  if (params) {
    text = text.replace(/\{(\w+)\}/g, (m, k) => (k in params ? params[k] : m));
  }
  return text;
}

/** Formatea números según el idioma (1.234 / 1,234). */
export function fmt(n) {
  return numberFmt.format(Math.floor(n));
}

/** Rellena todos los elementos con data-i18n / data-i18n-aria. */
export function applyToDom(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  // textos propios con formato sencillo (<b>, <span>) de translations.js
  root.querySelectorAll('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  });
  document.title = `${t('game.titleTop')} ${t('game.titleMain')}`;
}
