#!/usr/bin/env node
// Prepara una versión para publicar (ejecútalo antes de cada subida; el
// gancho .githooks/pre-push lo comprueba solo):
//
//   node tools/build.js          actualiza sw.js y src/boot.js
//   node tools/build.js --check  solo comprueba que están al día (sale con error si no)
//
// · Busca todos los archivos del juego que carga src/main.js (siguiendo los import).
// · Escribe en sw.js la lista completa (ASSETS) y una huella (BUILD) de todo su
//   contenido: si cambia cualquier archivo, cambia sw.js y los jugadores reciben
//   la versión nueva entera (nunca mezclada con la anterior).
// · Escribe en src/boot.js cuántos archivos hay (para la barra de carga).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const check = process.argv.includes('--check');

const STATIC = [
  'index.html',
  'maxeada.html',
  'manifest.json',
  'css/style.css',
  'src/boot.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-192.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
];

/** Módulos que carga src/main.js (siguiendo los import relativos). */
function modules() {
  const seen = new Set();
  const walk = (rel) => {
    if (seen.has(rel)) return;
    seen.add(rel);
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const re = /(?:^|[\s;])(?:import|export)\s*(?:[^'"`;]*?\sfrom\s*)?['"](\.{1,2}\/[^'"]+)['"]/g;
    let m;
    while ((m = re.exec(src))) {
      const dep = path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[1]));
      if (!fs.existsSync(path.join(ROOT, dep))) throw new Error(`${rel} importa ${m[1]}, que no existe`);
      walk(dep);
    }
  };
  walk('src/main.js');
  return [...seen].sort();
}

function replaceBlock(file, re, text) {
  const p = path.join(ROOT, file);
  const old = fs.readFileSync(p, 'utf8');
  if (!re.test(old)) throw new Error(`No encuentro el bloque <build> en ${file}`);
  const next = old.replace(re, text);
  return { p, old, next, changed: old !== next };
}

const mods = modules();
const boot = replaceBlock('src/boot.js', /var MODULES = \d+; \/\/ <build:modules>/, `var MODULES = ${mods.length}; // <build:modules>`);
// la huella incluye boot.js ya actualizado
const assets = [...STATIC, ...mods];
const hash = crypto.createHash('sha256');
for (const a of assets) {
  const p = path.join(ROOT, a);
  hash.update(a);
  hash.update(a === 'src/boot.js' ? boot.next : fs.readFileSync(p));
}
const build = hash.digest('hex').slice(0, 12);
const list = assets.map((a) => `  './${a}',`).join('\n');
const sw = replaceBlock('sw.js', /\/\/ <build>\n[\s\S]*?\/\/ <\/build>/, `// <build>\nconst BUILD = '${build}';\nconst ASSETS = [\n  './',\n${list}\n];\n// </build>`);

if (check) {
  const stale = [boot, sw].filter((f) => f.changed).map((f) => path.relative(ROOT, f.p));
  if (stale.length) {
    console.error(`✗ Falta actualizar ${stale.join(' y ')}: ejecuta  node tools/build.js  y vuelve a hacer commit.`);
    process.exit(1);
  }
  console.log(`✓ sw.js y boot.js al día (versión ${build}, ${mods.length} módulos)`);
} else {
  for (const f of [boot, sw]) if (f.changed) fs.writeFileSync(f.p, f.next);
  console.log(`Versión ${build}: ${assets.length} archivos (${mods.length} módulos del juego)`);
}
