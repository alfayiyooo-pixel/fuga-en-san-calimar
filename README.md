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
| `?debug` | Muestra FPS, velocidad, física, calor de búsqueda y zona, y un **panel de deslizadores** para ajustar la física del jetpack en vivo (botón «Copiar valores» para pegarlos en `config.js`) |
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

**Nivel de búsqueda (★1-5):**

- Cada estrella es una barra que se llena **poco a poco**; cada una cuesta más que la anterior (1ª fácil, 5ª muy difícil).
- La suben: recoger pavos (¡estás robando!), maletines y billetes dorados, carteles que se estrellan, patrullas que te ven y el foco del helicóptero.
- Al 80% de una estrella: aviso visual (estrella roja/azul) y sonoro. Al completarla se ilumina.
- Si pasas unos segundos sin incidentes, bajan despacio: puedes **despistar a la policía** dejando de recoger.
- Cada nivel añade policía de forma escalonada: 0★ nada · 1★ patrullas · 2★ misiles · 3★ helicóptero · 4-5★ persecución intensa (salvas, patrullas dobles, luces de sirena en pantalla).

Todo en el bloque `wanted` de [`src/config.js`](src/config.js).

## Pavos

- Un grupo nuevo cada 2-4 s de recorrido, con patrones de **línea, onda, escalera, zigzag, bloque, flecha y palabras** ("PAVOS", "SAN CALIMAR"…).
- Los grupos que caen junto a un obstáculo son más grandes y se pegan a él: tú decides si te la juegas.
- **Billete dorado** (x10) y **maletín** (x50), con brillo y sonido propios.
- **Imán**: power-up ocasional que atrae los pavos cercanos durante unos segundos.
- Cada pavo seguido suena un poco más agudo; el contador salta y aparece la suma de la racha.

Todo se ajusta en el bloque `tokens` de [`src/config.js`](src/config.js).

## Gráficos y rendimiento

Todo el arte está **generado por código** (sin imágenes externas, así que no hay licencias de terceros que declarar):

- Cada zona tiene su ambiente: atardecer en la playa, noche con neones en el centro financiero, anochecer con humo en la zona industrial, mañana despejada en las colinas y hora azul en el puerto.
- 4 capas de parallax (silueta lejana + 3 capas de decorado) con bruma atmosférica entre ellas.
- Brillos con sprites de halo precalculados, ventanas con patrones repetidos y caché del cielo y de los rascacielos para que vaya fluido en móvil.
- **Calidad** en el menú: *Auto* (empieza en alta y baja sola si los FPS caen), *Alta* o *Baja* (resolución reducida, menos partículas y detalle).

## Ajustar dificultad

Todos los valores están en [`src/config.js`](src/config.js). Los textos están en [`src/i18n/translations.js`](src/i18n/translations.js).
