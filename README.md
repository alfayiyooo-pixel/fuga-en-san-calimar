# Fuga en San Calimar

Endless runner con jetpack: un fugitivo huye volando por **San Calimar**, una ciudad costera soleada e inventada (sátira urbana de crimen). Un solo botón, tres personajes con habilidades, nivel de búsqueda policial, eventos aleatorios, tienda, vestuario, misiones, niveles y prestigio.

- **HTML5 Canvas + JavaScript** con módulos ES, **sin dependencias** ni imágenes externas: todo el arte y el sonido se generan por código.
- Jugable en **PC** (teclado/ratón) y **móvil** (táctil, en horizontal).
- **Español e inglés** (selector en el menú).
- El progreso se guarda en el navegador (`localStorage`).

## Controles

| Acción | PC | Móvil |
|---|---|---|
| Volar (mantener) / caer (soltar) | Espacio, ↑, W o clic | Mantener el dedo en pantalla |
| Apuntar en el tiempo bala (El Relojero) | Clic donde quieras disparar | Toca donde quieras disparar |
| Pausa | Esc o P | Botón ❚❚ |
| Empezar / reintentar | Enter | Botón Jugar |

Sonido y música se silencian con el botón 🔊.

## Ejecutar en local

Los módulos ES necesitan un servidor (no funciona abriendo `index.html` con doble clic):

```bash
python3 -m http.server 8000
```

Abre <http://localhost:8000>. (Con Node también vale `npx serve`.)

## Publicar en GitHub Pages

1. Sube el proyecto a un repositorio de GitHub (este ya está en `alfayiyooo-pixel/fuga-en-san-calimar`).
2. En el repositorio: **Settings → Pages**.
3. En **Build and deployment** elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`. Pulsa **Save**.
4. En 1-2 minutos estará en `https://<tu-usuario>.github.io/fuga-en-san-calimar/`.

No hace falta compilar nada: GitHub Pages sirve los archivos tal cual. El archivo `.nojekyll` evita que GitHub procese la web con Jekyll. Cada `git push` a `main` actualiza el juego publicado.

## Cómo se juega

### La ciudad y los peligros

Las zonas se suceden cada 500 m y vuelven a empezar: **Playa Coral → Distrito Lingote → Las Chimeneas → Colinas Brisa → Puerto Ancla**.

**Obstáculos:** cables eléctricos (fijos, dobles, en puerta o giratorios), carteles que caen, patrullas que vienen de frente, helicópteros con foco que disparan si te detectan y misiles con aviso previo.

**Enemigos menores** (sobre todo en los primeros metros y con 0-1★; se retiran cuando la policía toma el relevo): guardia de seguridad con linterna que salta al verte, dron de reparto que cruza el cielo, perro callejero que te persigue por el suelo desde atrás (aviso "GUAU!" en el borde izquierdo), bandadas de gaviotas (solo en la playa) y matón en patinete eléctrico que viene de frente y salta. Son fáciles de esquivar, pero **chocar cuenta como golpe**. Se derrotan con gadgets y habilidades (pistola, furia, nitro, coche, moto, cohete…): salen volando con estrellitas de mareo y dan unos pavos (× multiplicador) y algo de XP. Misiones: «Derrota 3 enemigos menores en una partida» y «Elimina 10 drones de reparto» (acumulativa entre partidas). Bloque `minors` de `config.js`.

**Nivel de búsqueda (★1-5):**

- Cada estrella es una barra que se llena **poco a poco**; cada una cuesta más que la anterior (1ª fácil, 5ª muy difícil).
- La suben: recoger pavos (¡estás robando!), maletines y billetes dorados, carteles que se estrellan, patrullas que te ven y el foco del helicóptero.
- Al 80% de una estrella: aviso visual (estrella roja/azul) y sonoro. Al completarla se ilumina.
- Si pasas unos segundos sin incidentes, bajan despacio: puedes **despistar a la policía** dejando de recoger.
- Cada nivel añade policía de forma escalonada: 0★ nada · 1★ patrullas · 2★ misiles · 3★ helicóptero · 4-5★ persecución intensa (salvas, patrullas dobles, luces de sirena en pantalla).

Todo en el bloque `wanted` de [`src/config.js`](src/config.js).

### Pavos

- Un grupo nuevo cada 2-4 s de recorrido, con patrones de **línea, onda, escalera, zigzag, bloque, flecha y palabras** ("PAVOS", "SAN CALIMAR"…).
- Los grupos que caen junto a un obstáculo son más grandes y se pegan a él: tú decides si te la juegas.
- **Billete dorado** (x10) y **maletín** (x50), con brillo y sonido propios.
- **Imán**: power-up ocasional que atrae los pavos cercanos durante unos segundos.
- Cada pavo seguido suena un poco más agudo; el contador salta y aparece la suma de la racha.

Todo se ajusta en el bloque `tokens` de [`src/config.js`](src/config.js).

### Personajes

Las **cápsulas** aparecen dentro de los grupos de pavos. Al cogerla te transformas; si te golpean vuelves al jetpack básico en lugar de morir. Mientras llevas un personaje aparecen sus **iconos de habilidad y gadgets** (solo los suyos) junto a los pavos.

| Personaje | Cómo se juega | Habilidad especial | Gadgets |
|---|---|---|---|
| **Don Aurelio Vega, "El Relojero"** — atracador retirado, traje, bigote y gafas doradas | Flota: caída suave y lenta, preciso | **Tiempo bala**: todo se ralentiza y cada toque dispara hacia donde apuntas | **Pistola** con silenciador (dispara sola a lo que tienes delante) · **Chaleco** (aguanta un golpe) |
| **Vera "Chispa" Rivas** — conductora callejera, bomber naranja y trenza | Rápida y nerviosa: acelera y frena al instante, caja más pequeña | **Conducción perfecta**: baja al suelo en su deportivo "Rayo" y esquiva sola | **Nitro** (invulnerable y atraviesa todo) · **Rampa** (salto hacia un arco de pavos en lo alto) |
| **Bruno "Petardo" Tramuntana** — caótico, camisa hawaiana y barba pelirroja | Pesado: mucha inercia, empuje brutal y rebota en el suelo | **Modo furia**: atraviesa y destruye todo | **Lanzacohetes** (limpia la pantalla) · **Moto** "Jabalina" (rebota sola y aguanta un golpe) |

La **barra de habilidad especial** (panel abajo a la izquierda) se carga con los **orbes azules de experiencia** que aparecen por el recorrido (bloque `orbs` de `config.js`) y la habilidad se activa sola al llenarse; también puede salir como icono. Cada personaje tiene su propia transformación (reloj dorado, derrape con chispas, explosión), su rastro y su sonido.

Ajustes en el bloque `characters` de `config.js` (probabilidades, carga de la especial, duraciones y física de cada uno).

### Eventos aleatorios

Cada 30-60 s (al azar y sin repetir el mismo dos veces seguidas) se anuncia un evento:

| Evento | Qué pasa |
|---|---|
| **Persecución policial** | Patrullas en cadena durante 10 s con luces de sirena; si aguantas, premio de pavos. |
| **Lluvia de billetes** | Caen pavos (y algún billete dorado) durante 7 s. |
| **Atraco sorpresa** | Aparece un furgón blindado en el suelo: tócalo y suelta el botín (pavos, billetes dorados y un maletín). Sube la búsqueda. |
| **Zona de caos** | Durante 12 s los pavos valen el doble, pero hay más obstáculos. |

Ajustes en el bloque `events` de `config.js`.

### Respiros

Cuando la partida va muy rápida y tienes 4+ estrellas, tras un intervalo aleatorio (22-45 s) llega un **respiro** de 5-8 s: la policía pierde el rastro, baja la velocidad y la búsqueda, cambia la música a una más tranquila y llueven pavos. Después la tensión vuelve poco a poco. Ajustes en el bloque `respite` de `config.js`.

### Puntuación y récord

- **Multiplicador de pavos x1-x5**: sube con las esquivas al límite («¡Por los pelos!», 3 por nivel) y baja si pasas unos segundos sin arriesgar. Se ve junto al contador de pavos, con un anillo de tiempo y puntos de carga.
- **Récord**: una bandera de cuadros y una línea dorada marcan tu récord en el escenario; al acercarte aparece «Récord a X m» y al superarlo hay celebración (confeti, fanfarria, banner).
- **Pantalla final**: distancia, pavos y récord con números que suben, el mensaje «¡Te faltaron 84 m para tu récord!» (o «¡Superaste tu récord por…!»), búsqueda máxima, esquivas al límite y multiplicador máximo.

Ajustes en el bloque `score` de `config.js`.

### Ruleta final

Al perder, si tienes fichas 🪙, aparece la **ruleta de la suerte** antes del resumen (1 ficha por tirada). Premios: pavos (incluido un premio gordo), diamantes, experiencia, fichas, **revivir** (vuelves a la partida donde caíste, una vez por partida) o una **mejora temporal** (empiezas la siguiente partida con imán). Las fichas solo se ganan jugando (niveles, misiones y recompensa diaria): nunca se compran con dinero real. Probabilidades en el bloque `roulette` de `config.js`.

## Progresión

### Monedas

- **Pavos** 💵: moneda común; se ganan jugando. Sirven para mejoras, artículos normales y consumibles.
- **Diamantes** 💎: moneda premium y escasa. Se ganan con misiones difíciles, subidas de nivel, recompensa diaria, prestigio y, muy raramente, en el recorrido (un diamante da 3-5 💎 con cámara lenta y destello). Bloque `gems` de `config.js`.

### Niveles, prestigio, misiones y recompensa diaria

- **Experiencia**: 1 XP cada 10 m, 2 XP por orbe y 40-150 XP por misión. El nivel 2 cuesta 100 XP; después, 150 + 50 × (nivel − 1). Cada nivel da pavos y una ficha; los niveles 5/10/15/20/25/30 dan diamantes y el 10 y el 20 un vale de artículo de pavos gratis.
- **Prestigio** (nivel 30): vuelves al nivel 1 y ganas un rango I-X con insignia (en el menú y en la pantalla final), diamantes y artículos exclusivos. Se conservan compras, monedas y récord.
- **Misiones**: siempre 3 activas (fácil, media y difícil), se completan durante la partida, se cobran al terminarla y se sustituyen. Se puede cambiar una gratis cada 24 h.
- **Recompensa diaria**: ciclo de 7 días; si un día no entras, la racha se pausa (no vuelve al día 1).
- **Fichas** 🪙: se ganan con niveles, misiones y la diaria; se gastan en la ruleta final. Nunca se compran con dinero.

Ajustes en los bloques `progression`, `missions` y `daily` de `config.js`.

### Tienda

- **Personajes**: trajes, accesorios, estelas y efectos de transformación para los tres personajes (y traje y estela para el atracador básico). Los normales con pavos; los legendarios animados con 💎 (piden confirmación con dos toques); los de prestigio no se compran. Vista previa animada antes de comprar.
- **Mejoras**: duración de gadgets, frecuencia de personajes, imán, habilidad especial y potencia de orbes (5 niveles, coste creciente).
- **Consumibles** de un solo uso que se activan en el menú antes de jugar: arranque rápido de 500 m, escudo inicial, empezar transformado y revivir una vez.
- **Diamantes**: packs de dinero real en **modo simulado** (ver abajo).

Precios en el bloque `shop` de `config.js`; artículos en [`src/meta/catalog.js`](src/meta/catalog.js).

### Vestuario

Pantalla propia desde el menú (👕 Vestuario): un apartado por personaje, con el personaje grande y animado. Se equipa lo comprado (traje, accesorio, estela y efecto de transformación, que se puede probar). Lo no comprado aparece con candado y un botón que lleva directo a ese artículo en la tienda.

## Sonido y voces

- Efectos y música **sintetizados con Web Audio API** (sin archivos): música de persecución que gana capas con las estrellas y música tranquila en los respiros; siseo del jetpack, sirenas, pitidos de misil, aspas del helicóptero, monedas con tono que sube en las rachas, fanfarrias…
- El botón 🔊 silencia todo (efectos, música y voces).
- **⚙ Ajustes** (menú, esquina superior derecha): volumen independiente de **música**, **efectos** y **voces** (se guarda en el navegador), silenciar todo y "Probar voz".

### Voces de los personajes (añadir tus propios audios)

Cada personaje habla en tres momentos: **al cogerlo**, **al activar su habilidad especial** y **al perderlo por un golpe**. Por defecto se usa la **voz del navegador** (Web Speech API) con tono y velocidad propios de cada personaje y momento (`audio.voices` en `config.js`). Las frases nunca se solapan: si una suena, la siguiente espera como mucho `audio.voiceQueueWait` segundos o se descarta.

Para usar grabaciones propias, copia archivos **MP3** en [`audio/voces/`](audio/voces/) con el patrón `[personaje]_[momento]_[idioma].mp3` (personaje `aurelio`/`vera`/`bruno`, momento `coger`/`habilidad`/`perder`, idioma `es`/`en`). Son 18 archivos:

| | coger | habilidad | perder |
|---|---|---|---|
| Aurelio | `aurelio_coger_es.mp3` · `aurelio_coger_en.mp3` | `aurelio_habilidad_es.mp3` · `aurelio_habilidad_en.mp3` | `aurelio_perder_es.mp3` · `aurelio_perder_en.mp3` |
| Vera | `vera_coger_es.mp3` · `vera_coger_en.mp3` | `vera_habilidad_es.mp3` · `vera_habilidad_en.mp3` | `vera_perder_es.mp3` · `vera_perder_en.mp3` |
| Bruno | `bruno_coger_es.mp3` · `bruno_coger_en.mp3` | `bruno_habilidad_es.mp3` · `bruno_habilidad_en.mp3` | `bruno_perder_es.mp3` · `bruno_perder_en.mp3` |

Si el archivo existe se reproduce ese audio; si no, la voz del navegador. Puedes poner solo algunos. Haz commit y push y GitHub Pages los servirá. Las frases de respaldo están en [`audio/voces/LEEME.md`](audio/voces/LEEME.md). (En la consola verás un aviso 404 por cada archivo que falte: es normal.)

## Gráficos y rendimiento

Todo el arte está **generado por código** (sin imágenes externas, así que no hay licencias de terceros que declarar):

- Cada zona tiene su ambiente: atardecer en la playa, noche con neones en el centro financiero, anochecer con humo en la zona industrial, mañana despejada en las colinas y hora azul en el puerto.
- 4 capas de parallax (silueta lejana + 3 capas de decorado) con bruma atmosférica entre ellas.
- Brillos con sprites de halo precalculados, ventanas con patrones repetidos y caché del cielo y de los rascacielos para que vaya fluido en móvil.
- **Calidad** en el menú: *Auto* (empieza en alta y baja sola si los FPS caen), *Alta* o *Baja* (resolución reducida, menos partículas y detalle).

## Ajustar el juego

Todos los valores están en [`src/config.js`](src/config.js), agrupados por bloques:

| Bloque | Qué controla |
|---|---|
| `player` | Física del jetpack (también ajustable en vivo con `?debug`) |
| `speed` | Curva de velocidad (constante hasta 1.000 m, luego sube suave hasta un tope) |
| `spawner`, `obstacles` | Frecuencia y tipos de obstáculos |
| `minors` | Enemigos menores: peso, desaparición por distancia/estrellas, recompensa y comportamiento |
| `wanted` | Estrellas de búsqueda y policía por nivel |
| `tokens`, `orbs`, `gems` | Pavos, orbes de experiencia y diamantes |
| `characters` | Cápsulas, habilidades, gadgets y física de cada personaje |
| `score` | Esquivas al límite, multiplicador y aviso de récord |
| `events`, `respite` | Eventos aleatorios y respiros |
| `roulette` | Coste y probabilidades de la ruleta |
| `progression`, `missions`, `daily` | Niveles, prestigio, misiones y recompensa diaria |
| `shop` | Mejoras, consumibles y packs de diamantes |
| `audio`, `quality` | Volúmenes, voces y calidad gráfica |

Los textos (ES/EN) están en [`src/i18n/translations.js`](src/i18n/translations.js) y los artículos de la tienda en [`src/meta/catalog.js`](src/meta/catalog.js).

### Opciones de prueba (en la URL)

| Parámetro | Efecto |
|---|---|
| `?debug` | FPS, velocidad, física, calor de búsqueda y zona; **panel de deslizadores** para ajustar la física del jetpack en vivo (botón «Copiar valores»); acceso a `game` desde la consola |
| `?god` | Invulnerable (para recorrer todas las zonas) |
| `?start=1500` | Empieza la partida en esos metros |

Se combinan: `?debug&god&start=2000`. Para borrar el progreso: `localStorage.clear()` en la consola.

## Estructura del proyecto

```
index.html, css/style.css, audio/voces/
src/
  main.js            arranque, estados (menú, partida, pausa, ruleta, final) y pantallas
  game.js            una partida: jugador, mundo, obstáculos, colisiones, estadísticas
  config.js          TODOS los valores ajustables
  core/              bucle, entrada, vista, cámara, guardado, idioma, audio, voces, calidad
  world/             zonas (themes/), parallax, generador de obstáculos y patrones de pavos
  entities/          jugador, obstáculos, pavos/orbes/diamantes
  characters/        dibujo de personajes, vehículos, estelas, efectos de transformación, iconos
  systems/           búsqueda, multiplicador, respiros, eventos, personajes y gadgets
  meta/              perfil, catálogo, progresión, misiones, diaria, pagos (simulados)
  fx/                partículas, textos emergentes, sprites y brillos
  ui/                HUD, tienda, vestuario, misiones, ruleta, vista previa, panel de ajuste
  i18n/              traducciones ES/EN
```

## Pagos reales (pendiente)

Ahora mismo **no se cobra nada**: `shop.payments.enabled` es `false` y al pulsar un pack aparece «Compras desactivadas (versión de prueba)». El punto de conexión es [`src/meta/payments.js`](src/meta/payments.js). Para activar pagos reales haría falta:

1. **Un servidor propio** (por ejemplo, una función serverless) con cuentas de usuario, porque el saldo de diamantes comprados no puede vivir solo en el navegador (`localStorage` se puede editar).
2. **Una pasarela de pago**: Stripe Checkout para la web, o Google Play Billing / App Store In-App Purchase si se publica como app.
3. **Validación en el servidor**: la pasarela avisa por *webhook* (o se valida el recibo de la tienda); solo entonces el servidor abona los diamantes y el juego consulta el saldo.
4. **Requisitos legales**: precios con IVA, política de reembolsos, términos de uso y, si el público es joven, control parental y límites de gasto.

Regla del juego: con dinero real solo se compran diamantes o artículos concretos, **nunca tiradas aleatorias**; la ruleta se juega solo con fichas ganadas jugando.

## Créditos y licencia

- Juego, personajes, ciudad, gráficos, música y efectos de sonido originales, generados por código.
- Tipografías: [Bungee](https://fonts.google.com/specimen/Bungee) y [Rubik](https://fonts.google.com/specimen/Rubik) (Google Fonts, licencia SIL Open Font License).
- Sin imágenes ni audios de terceros.
