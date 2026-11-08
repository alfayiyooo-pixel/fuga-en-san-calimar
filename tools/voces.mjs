#!/usr/bin/env node
// Genera voces.csv: el guion de grabación con una fila por cada audio de voz
// que busca el juego (audio/voces/). Los textos salen de src/i18n/translations.js
// (así el guion siempre coincide con los subtítulos); el tono de cada frase está
// abajo, en TONO. Ordenado por personaje y, dentro de cada uno, por idioma,
// para grabarlo todo seguido.
//
//   node tools/voces.mjs            escribe voces.csv
//   node tools/voces.mjs --check    comprueba que voces.csv está al día

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRANSLATIONS } from '../src/i18n/translations.js';
import { CONFIG } from '../src/config.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'voces.csv');

// Mismos nombres que usan src/core/voice.js y src/systems/radio.js
const CHARS = [
  { id: 'veteran', file: 'aurelio', who: 'Don Aurelio Vega «El Relojero»' },
  { id: 'pilot', file: 'vera', who: 'Vera Rivas «Chispa»' },
  { id: 'wild', file: 'bruno', who: 'Bruno Tramuntana «Petardo»' },
];
const MOMENTS = ['coger', 'habilidad', 'perder'];
const RADIO = ['inicio', 'estrellas', 'zona', 'record', 'helicoptero', 'jefe', 'escondite', 'detenido'];
const COP_SHOUTS = 8; // = COP_SHOUTS de src/entities/minors.js
const LANGS = ['es', 'en'];

// Tono / emoción de cada frase (el mismo en los dos idiomas).
const TONO = {
  'voice.veteran.coger': 'elegante, seguro de sí mismo, con media sonrisa',
  'voice.veteran.habilidad': 'calmado, lento y misterioso (el tiempo se ralentiza)',
  'voice.veteran.perder': 'ofendido con desdén, aristocrático',
  'voice.pilot.coger': 'eufórica, con energía, presumiendo',
  'voice.pilot.habilidad': 'gritando de emoción, acelerando',
  'voice.pilot.perder': 'indignada, quejica (le han rayado el coche)',
  'voice.wild.coger': 'gritando, eufórico, gamberro',
  'voice.wild.habilidad': 'gritando a pleno pulmón, alargando la vocal final',
  'voice.wild.perder': 'dolorido y quejica, medio riéndose',

  'radio.inicio.1': 'locutor de noticias, urgente pero teatral; ironía en «a pie»',
  'radio.inicio.2': 'locutor alegre de mañana; cambia a sorpresa en «atraco en directo»',
  'radio.inicio.3': 'locutor que corta la música, irónico en «Muy discreto»',
  'radio.inicio.4': 'locutor de aviso, serio con guiño irónico',
  'radio.estrellas.1': 'locutor tenso, sorprendido al final',
  'radio.estrellas.2': 'locutor serio que se rinde en «Bueno, alguna» (cómplice)',
  'radio.estrellas.3': 'locutor emocionado, de retransmisión deportiva',
  'radio.estrellas.4': 'locutor serio con remate irónico',
  'radio.zona.1': 'locutor divertido, de crónica de barrio',
  'radio.zona.2': 'locutor resignado, advertencia',
  'radio.zona.3': 'locutor irónico, con guasa',
  'radio.zona.4': 'locutor de aviso urgente',
  'radio.record.1': 'locutor emocionado, gritando la noticia',
  'radio.record.2': 'locutor asombrado, incrédulo',
  'radio.record.3': 'locutor admirado con remate irónico',
  'radio.record.4': 'locutor épico, solemne',
  'radio.helicoptero.1': 'locutor dramático, de tráiler',
  'radio.helicoptero.2': 'locutor alarmado con humor',
  'radio.helicoptero.3': 'locutor grave, amenazante',
  'radio.jefe.1': 'locutor incrédulo y burlón',
  'radio.jefe.2': 'locutor irónico, aguantando la risa',
  'radio.jefe.3': 'locutor gritando de emoción, deportivo',
  'radio.jefe.4': 'locutor agotado, suspirando al final',
  'radio.escondite.1': 'locutor confidencial, con guasa',
  'radio.escondite.2': 'locutor desconcertado',
  'radio.escondite.3': 'locutor misterioso, irónico',
  'radio.detenido.1': 'locutor de cierre, resignado e irónico',
  'radio.detenido.2': 'locutor admirado, nostálgico',
  'radio.detenido.3': 'locutor de despedida, relajado e irónico',
  'radio.detenido.4': 'locutor irónico, divertido',

  'cop.shout.1': 'gritando, autoritario',
  'cop.shout.2': 'gritando, desesperado',
  'cop.shout.3': 'gritando, agobiado y torpe',
  'cop.shout.4': 'gritando, apurado',
  'cop.shout.5': 'gritando, quejica y agotado',
  'cop.shout.6': 'gritando, indignado',
  'cop.shout.7': 'jadeando, chulo pero agotado',
  'cop.shout.8': 'gritando, solemne y ridículo',
};

const rows = [];
function add(file, who, lang, key, extraTone = '') {
  const text = TRANSLATIONS[lang][key];
  const tone = TONO[key];
  if (!text) throw new Error(`Falta el texto ${key} (${lang}) en translations.js`);
  if (!tone) throw new Error(`Falta el tono de ${key} en tools/voces.mjs`);
  rows.push([`${file}.mp3`, who, lang, text, tone + extraTone]);
}

for (const c of CHARS) for (const l of LANGS) for (const m of MOMENTS) add(`${c.file}_${m}_${l}`, c.who, l, `voice.${c.id}.${m}`);
for (const l of LANGS)
  for (const m of RADIO)
    for (let n = 1; n <= CONFIG.radio.moments[m].lines; n++) add(n === 1 ? `radio_${m}_${l}` : `radio_${m}_${n}_${l}`, 'Locutor de Radio Calimar', l, `radio.${m}.${n}`);
for (const l of LANGS) for (let n = 1; n <= COP_SHOUTS; n++) add(`policia_grito_${n}_${l}`, 'Agente de policía a pie', l, `cop.shout.${n}`);

const cell = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const csv = '﻿' + [['archivo', 'personaje', 'idioma', 'texto', 'tono'], ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';

if (process.argv.includes('--check')) {
  const old = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (old !== csv) {
    console.error('✗ voces.csv no está al día: ejecuta  node tools/voces.mjs');
    process.exit(1);
  }
  console.log(`✓ voces.csv al día (${rows.length} audios)`);
} else {
  fs.writeFileSync(OUT, csv);
  console.log(`voces.csv: ${rows.length} audios`);
}
