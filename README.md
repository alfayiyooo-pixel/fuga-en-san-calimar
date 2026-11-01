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

Abre <http://localhost:8000>.

### Opciones de prueba (en la URL)

| Parámetro | Efecto |
|---|---|
| `?debug` | Muestra FPS, velocidad, física, calor de búsqueda y zona |
| `?god` | Invulnerable (para recorrer todas las zonas) |
| `?start=1500` | Empieza la partida en esos metros |

Se combinan: `?debug&god&start=2000`.

## Controles

| Acción | PC | Móvil |
|---|---|---|
| Volar (mantener) / caer (soltar) | Espacio, ↑, W o clic | Mantener el dedo en pantalla |
| Pausa | Esc o P | Botón ❚❚ |

## La ciudad

Las zonas se suceden cada 500 m y vuelven a empezar: **Playa Coral → Distrito Lingote → Las Chimeneas → Colinas Brisa → Puerto Ancla**.

**Obstáculos:** cables eléctricos (fijos, dobles, en puerta o giratorios), carteles que caen, patrullas que vienen de frente, helicópteros con foco que disparan si te detectan y misiles con aviso previo.

**Nivel de búsqueda (★1-5):** sube cuando la policía te ve (foco del helicóptero, patrullas) o causas caos, baja si pasas un rato tranquilo y aumenta la cantidad de policía. Cada 900 m sube la estrella mínima (hasta 3).

## Ajustar dificultad

Todos los valores están en [`src/config.js`](src/config.js). Los textos están en [`src/i18n/translations.js`](src/i18n/translations.js).
