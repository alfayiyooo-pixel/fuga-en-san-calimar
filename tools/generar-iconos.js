// Genera los iconos PNG de la app (carpeta icons/) dibujándolos con el código
// del juego (src/ui/appicon.js). Uso, con el servidor local en marcha:
//   python3 -m http.server 8123   (en otra terminal)
//   node tools/generar-iconos.js
// Necesita Playwright (npm i -D playwright).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SIZES = [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['icon-maskable-192.png', 192, { maskable: true }],
  ['icon-maskable-512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, {}],
  ['favicon-32.png', 32, { rounded: true }],
];

(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage();
  await pg.goto('http://localhost:8123/index.html');
  await pg.waitForTimeout(800);
  for (const [name, size, opts] of SIZES) {
    const data = await pg.evaluate(async ({ size, opts }) => {
      const { drawAppIcon } = await import('/src/ui/appicon.js');
      const c = document.createElement('canvas');
      c.width = c.height = size;
      drawAppIcon(c.getContext('2d'), size, opts);
      return c.toDataURL('image/png').split(',')[1];
    }, { size, opts });
    fs.writeFileSync(path.join(__dirname, '..', 'icons', name), Buffer.from(data, 'base64'));
    console.log('icons/' + name);
  }
  await b.close();
})();
