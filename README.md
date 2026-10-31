# Fuga en San Calimar

Endless runner con jetpack por **San Calimar**, una ciudad costera soleada e inventada.
HTML5 Canvas + JavaScript (módulos ES), sin dependencias ni imágenes externas.
Disponible en español e inglés.

> 🚧 En desarrollo por fases. El README completo (controles, publicación en GitHub Pages, ajustes) se ampliará en cada fase.

## Ejecutar en local

Los módulos ES necesitan un servidor (no funciona abriendo `index.html` con doble clic):

```bash
python3 -m http.server 8000
```

Abre <http://localhost:8000>. Añade `?debug` a la URL para ver FPS, velocidad y física.

## Controles

| Acción | PC | Móvil |
|---|---|---|
| Volar (mantener) / caer (soltar) | Espacio, ↑, W o clic | Mantener el dedo en pantalla |
| Pausa | Esc o P | Botón ❚❚ |

## Ajustar dificultad

Todos los valores están en [`src/config.js`](src/config.js). Los textos están en [`src/i18n/translations.js`](src/i18n/translations.js).
