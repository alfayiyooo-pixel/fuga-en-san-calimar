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

## Instalar como app (PWA)

El juego es una **app web instalable**: se abre a **pantalla completa** desde su icono, en horizontal, y **funciona sin conexión** en cuanto se ha abierto una vez.

- **Android (Chrome/Edge):** botón **📲 Instalar app** en el menú (o en ⚙ Ajustes). Si no aparece, menú ⋮ del navegador → «Instalar app». El progreso se mantiene: la app instalada comparte el guardado con el navegador.
- **iPhone/iPad (Safari):** el botón **📲 Instalar app** muestra cómo hacerlo: Compartir ⬆︎ → «Añadir a pantalla de inicio». Ojo: en iOS la app instalada guarda su progreso **aparte** de Safari; para llevártelo usa ⚙ Ajustes → **Pasar mi progreso** → «Copiar código» en Safari y «Pegar código» en la app.
- **Actualizaciones:** el service worker ([`sw.js`](sw.js)) usa «primero la red»: con conexión siempre carga lo último publicado (cada push, incluidos audios nuevos) y lo guarda en caché para jugar offline. No hay que tocar nada al publicar; si algún día quieres vaciar la caché de todos, sube `VERSION` en `sw.js`.
- **Icono:** dibujado por código con el protagonista ([`src/ui/appicon.js`](src/ui/appicon.js)); los PNG de [`icons/`](icons/) se regeneran con `node tools/generar-iconos.js` (servidor local en marcha y Playwright instalado).

## Cómo se juega

### Inicio: huida del furgón

Cada partida empieza con una escena de ~4 s que no se puede saltar: un furgón blindado del Banco Lingote con las puertas abiertas y la alarma sonando; el atracador salta con la bolsa de dinero y echa a correr. Escena y partida son continuas (mismo escenario, cámara y velocidad); durante la escena se ignoran toques y teclas. Un anillo dorado y un pequeño «¡CORRE!» marcan el instante en que tomas el control. Se empieza con **1★**. Policía floja al principio: hasta 500 m solo agentes a pie y algún coche lento; de 500 a 1.000 m algo más (misiles ocasionales); después, la curva normal (`intro` y `wanted.ease` en `config.js`).

### Detención

Al caer, el atracador sale despedido con la velocidad que llevaba: rebota, rueda y se desliza por el suelo con rozamiento (a más velocidad, más lejos: ~400 px yendo despacio, más de 1.200 px a toda velocidad). Cuando se para, dos agentes llegan corriendo, frena una patrulla, los billetes salen volando de la bolsa y aparece un gran sello **«¡DETENIDO!»** con un subtítulo de guasa. Sin sangre. Valores en `death` de `config.js`.

### A pie y jetpack opcional

- **Empiezas a pie**: toque/ESPACIO = saltar (mantén pulsado para saltar más alto; con ~180 px superas un coche aparcado).
- **Doble salto:** un segundo toque en el aire hace otro salto con voltereta y un soplo de aire (hasta ~315 px de alto). Se recarga al tocar el suelo; en patinete o carrito no hay doble salto. Fuerza del primer y segundo salto: `foot.jumpVel` y `foot.doubleJump.vel`.
- Para que el suelo siga siendo un reto: los obstáculos de calle salen a veces **en serie** (2-3 seguidos, con el hueco justo para aterrizar y volver a saltar) y a veces con un **cable por encima** que un salto normal pasa por debajo pero un doble salto toca (`foot.street.series` y `foot.street.ceilingCable`).
- A los **250-380 m** aparece el **jetpack** dentro de un grupo de pavos. Puedes ignorarlo: vuelve a salir cada 450-750 m mientras sigas a pie.
- **Capas de golpe:** a pie → detenido · con jetpack → lo pierdes y sigues a pie · con un personaje → vuelves al jetpack.
- **A PIE ×2:** mientras no hayas cogido nunca el jetpack, los pavos valen el doble (insignia verde en el HUD).
- **Obstáculos de calle:** vallas de obra, cubos de basura, coches aparcados y **toldos** (caer encima te lanza muy alto hacia un arco de pavos).
- **Vehículos a pie:** patinete eléctrico y carrito de la compra (unos segundos, más velocidad y aguantan un golpe).
- Misiones nuevas: «Recorre 400/800 m sin jetpack», «Recorre 1.500 m sin coger el jetpack», «Usa un patinete o carrito».
- Ajustes en el bloque `foot` de `config.js`.

### La ciudad y los peligros

Las zonas se suceden cada 500 m y vuelven a empezar: **Playa Coral → Distrito Lingote → Las Chimeneas → Colinas Brisa → Puerto Ancla**.

**Obstáculos:** cables eléctricos (fijos, dobles, en puerta o giratorios), patrullas que vienen de frente, helicópteros con foco que disparan si te detectan y misiles con aviso previo. **Peligros de la ciudad** (según la zona, sin repetir el anterior): bola de demolición de una grúa que se balancea (calcula el momento), neones que parpadean y solo dañan encendidos, andamios que se derrumban dejando hueco arriba o abajo, bocas de riego que revientan y te empujan hacia arriba, y toldos de fachada que se cierran de golpe (bloque `hazards` de `config.js`).

**Enemigos menores** (sobre todo en los primeros metros y con 0-1★; se retiran cuando la policía toma el relevo): guardia de seguridad con linterna que salta al verte, dron de reparto que cruza el cielo, perro callejero que te persigue por el suelo desde atrás (aviso "GUAU!" en el borde izquierdo), bandadas de gaviotas (solo en la playa) y matón en patinete eléctrico que viene de frente y salta. Son fáciles de esquivar, pero **chocar cuenta como golpe**. Se derrotan con gadgets y habilidades (pistola, furia, nitro, coche, moto, cohete…): salen volando con estrellitas de mareo y dan unos pavos (× multiplicador) y algo de XP. Misiones: «Derrota 3 enemigos menores en una partida» y «Elimina 10 drones de reparto» (acumulativa entre partidas). Bloque `minors` de `config.js`.

**Helicóptero jefe** (al llegar a 5★): persecución de 30 s contra «El Halcón», con barra de tiempo visible. Alterna ataques siempre avisados: láser de puntería y ráfaga, abanico de balas, columnas que caen desde arriba y foco que barre. Si sobrevives: +600 pavos, +10 💎, +150 XP, fanfarria de victoria y bajas a 2★ (bloque `boss`).

**Escondites** (con 2★ o más, cada 380-700 m): **túnel de lavado** y **callejón oscuro** a ras de suelo, y **planta de parking** a media altura (solo con jetpack). Si lo atraviesas de punta a punta, pierdes una estrella con destello y sonido de alivio. Los pavos van por la otra ruta, así que esconderse es una decisión (bloque `hideouts`).

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

### Portada del «Diario de San Calimar»

La pantalla final es la portada del periódico: titular generado según la partida (personaje más usado, traje equipado, distancia, zona, estrellas, si fuiste solo a pie, si venciste al helicóptero, escondites, pavos, quién te detuvo…), con más de 35 variantes por idioma, y la **foto del momento de la detención** en blanco y negro. Debajo, los datos de siempre (distancia, pavos, récord, «casi lo consigo»). **📤 Compartir portada** genera una imagen 1080×1350 y abre el menú de compartir del móvil (Web Share API); si no está disponible, la descarga. Titulares en `news.h.*` de `translations.js` y lógica en [`src/ui/newspaper.js`](src/ui/newspaper.js).

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

### Logros y medallas

Apartado **🏅 Logros** en el menú con 33 logros permanentes (distintos de las misiones), en bronce, plata y oro: distancia en una partida y total, 5 estrellas, vencer al helicóptero (1 y 5 veces), cada escondite y 25 en total, 1.000 m sin jetpack, vehículos a pie, los tres personajes, habilidades especiales, enemigos menores y drones, pavos, multiplicador x5, esquivas al límite, diamantes, primera compra, vestuario completo (del atracador y de un personaje), nivel 10, prestigio I y V, 25 misiones y 100 partidas. Al conseguir uno sale un aviso y se cobran diamantes: bronce 5 💎, plata 15 💎, oro 40 💎 (`achievements.reward`). Lista en [`src/meta/achievements.js`](src/meta/achievements.js).

### Tienda

- **Personajes**: trajes, accesorios, estelas y efectos de transformación para los tres personajes (y traje y estela para el atracador básico). Los normales con pavos; los legendarios animados con 💎 (piden confirmación con dos toques); los de prestigio no se compran. Vista previa animada antes de comprar.
- **Mejoras**: duración de gadgets, frecuencia de personajes, imán, habilidad especial y potencia de orbes (5 niveles, coste creciente).
- **Consumibles** de un solo uso que se activan en el menú antes de jugar: arranque rápido de 500 m, escudo inicial, empezar transformado y revivir una vez.
- **Diamantes**: packs de dinero real en **modo simulado** (ver abajo).

Precios en el bloque `shop` de `config.js`; artículos en [`src/meta/catalog.js`](src/meta/catalog.js).

### Disfraces nuevos

Dos disfraces nuevos por personaje (uno de pavos y uno legendario con 💎) y un extra de pavos cada uno, todos originales:

| Personaje | Pavos | Extra (pavos) | Legendario 💎 |
|---|---|---|---|
| Atracador | Turista con chanclas y riñonera | Mascota «Pollo Calimar» | Disfraz de abuela |
| Aurelio | Mago de casino | Fantasma de la ópera bufa | Astronauta retro |
| Vera | Repartidora de pizza | Piloto de rally de dunas | Aviadora de los años 30 |
| Bruno | Disfraz de calabaza | Domador de circo | Luchador enmascarado |

Se dibujan por código en [`src/characters/costumes.js`](src/characters/costumes.js) (capa, torso y cabeza) y salen en los titulares del periódico.

### Vestuario

Pantalla propia desde el menú (👕 Vestuario): un apartado por personaje, con el personaje grande y animado. Se equipa lo comprado (traje, accesorio, estela y efecto de transformación, que se puede probar). Lo no comprado aparece con candado y un botón que lleva directo a ese artículo en la tienda.

## Sonido y voces

- Efectos **sintetizados con Web Audio API** (sin archivos): siseo del jetpack, sirenas, pitidos de misil, aspas del helicóptero, monedas con tono que sube en las rachas, ladridos, graznidos, fanfarrias…
- El botón 🔊 silencia todo (efectos, música y voces).
- **⚙ Ajustes** (menú, esquina superior derecha): volumen independiente de **música**, **efectos** y **voces** (se guarda en el navegador), silenciar todo y "Probar voz".

### Música: menú, zonas y personajes

Cada zona tiene su tema y al pasar de una a otra cambian con un **fundido cruzado** de 2,5 s (`music.crossfade`):

| Pista | Zona | Estilo |
|---|---|---|
| `menu` | Menú y pantalla final | Usa `audio/musica/serenata_mexicana.mp3`. Tema generado de reserva: serenata (vals ranchero con violines, trompetas, vihuela y guitarrón) |
| `playa` | Playa Coral | Relajada y soleada: guitarra a contratiempo, steel drum, shaker |
| `centro` | Distrito Lingote | Electrónica nocturna: bombo a negras, bajo pulsante, arpegios |
| `industrial` | Las Chimeneas | Dura y metálica: percusión pesada, golpes de yunque, quintas |
| `mansiones` | Colinas Brisa | Funk/soul elegante: bajo slap, clavinet, metales, piano eléctrico |
| `puerto` | Puerto Ancla | Tensa, de película de atracos: ostinato cromático, dron, vibráfono |
| `aurelio` | Transformado en Aurelio | Corrido norteño: polka con acordeón, bajo sexto y tarola |
| `vera` | Transformado en Vera | Corrido de mariachi en 6/8: trompetas en terceras, vihuela, güiro y violines |
| `bruno` | Transformado en Bruno | Corrido bravo en Re menor: tuba de banda, acordeón y trompetas |

Los **temas de personaje** suenan mientras vas transformado: entran con un fundido de 1,2 s y, al perder el personaje, vuelve la música de la zona (`music.charTracks`, `music.charFade`). Se mezclan con las estrellas igual que los de zona.

**Capas dinámicas:** con 1★ entran más instrumentos y desde 3★ más percusión y tensión; en el **respiro** la música se calma (sin batería, filtrada); y cada habilidad especial la cambia: **tiempo bala** de Aurelio = música lenta y grave, **conducción** de Vera = más rápida y brillante, **furia** de Bruno = distorsión. Todo en el bloque `music` de `config.js`.

**Sustituirla por archivos:** copia MP3 en [`audio/musica/`](audio/musica/) con los nombres `playa.mp3`, `centro.mp3`, `industrial.mp3`, `mansiones.mp3`, `puerto.mp3`, `aurelio.mp3`, `vera.mp3`, `bruno.mp3` (el menú usa `serenata_mexicana.mp3`, ver `music.files` en `config.js`). El service worker las guarda para que suenen sin conexión. Si existe el archivo se usa (en bucle sin cortes); si no, el tema generado. Detalles del bucle exacto en [`audio/musica/LEEME.md`](audio/musica/LEEME.md). Si la licencia pide atribución, añade autor y licencia en [`src/credits.js`](src/credits.js): salen en **⚙ Ajustes → 📜 Créditos**.

### Voces de los personajes (añadir tus propios audios)

Cada personaje habla en tres momentos: **al cogerlo**, **al activar su habilidad especial** y **al perderlo por un golpe**. Por defecto se usa la **voz del navegador** (Web Speech API) con tono y velocidad propios de cada personaje y momento (`audio.voices` en `config.js`). Las frases nunca se solapan: si una suena, la siguiente espera como mucho `audio.voiceQueueWait` segundos o se descarta.

Para usar grabaciones propias, copia archivos **MP3** en [`audio/voces/`](audio/voces/) con el patrón `[personaje]_[momento]_[idioma].mp3` (personaje `aurelio`/`vera`/`bruno`, momento `coger`/`habilidad`/`perder`, idioma `es`/`en`). Son 18 archivos:

| | coger | habilidad | perder |
|---|---|---|---|
| Aurelio | `aurelio_coger_es.mp3` · `aurelio_coger_en.mp3` | `aurelio_habilidad_es.mp3` · `aurelio_habilidad_en.mp3` | `aurelio_perder_es.mp3` · `aurelio_perder_en.mp3` |
| Vera | `vera_coger_es.mp3` · `vera_coger_en.mp3` | `vera_habilidad_es.mp3` · `vera_habilidad_en.mp3` | `vera_perder_es.mp3` · `vera_perder_en.mp3` |
| Bruno | `bruno_coger_es.mp3` · `bruno_coger_en.mp3` | `bruno_habilidad_es.mp3` · `bruno_habilidad_en.mp3` | `bruno_perder_es.mp3` · `bruno_perder_en.mp3` |

Si el archivo existe se reproduce ese audio; si no, la voz del navegador. Puedes poner solo algunos. Haz commit y push y GitHub Pages los servirá. Las frases de respaldo están en [`audio/voces/LEEME.md`](audio/voces/LEEME.md). (En la consola verás un aviso 404 por cada archivo que falte: es normal.)

### Radio Calimar

De vez en cuando un locutor comenta la huida (con un rótulo de noticias abajo). Usa el mismo sistema que las voces: si existe el archivo, lo reproduce con filtro de radio; si no, la voz del navegador con una de las 3-4 frases de cada momento (`radio.<momento>.<n>` en `translations.js`). La música baja mientras habla y nunca se solapa con los personajes (los personajes tienen prioridad). Probabilidades y tiempo mínimo entre frases en el bloque `radio` de `config.js`.

| Momento | Cuándo | Archivos (`audio/voces/`) |
|---|---|---|
| `inicio` | al empezar (escena del furgón) | `radio_inicio_es.mp3` · `radio_inicio_en.mp3` |
| `estrellas` | al subir de estrellas (desde 2★) | `radio_estrellas_es.mp3` · `radio_estrellas_en.mp3` |
| `zona` | al cambiar de zona | `radio_zona_es.mp3` · `radio_zona_en.mp3` |
| `record` | al pasar tu récord | `radio_record_es.mp3` · `radio_record_en.mp3` |
| `helicoptero` | cuando aparece el helicóptero jefe | `radio_helicoptero_es.mp3` · `radio_helicoptero_en.mp3` |
| `jefe` | al vencer al helicóptero | `radio_jefe_es.mp3` · `radio_jefe_en.mp3` |
| `escondite` | al esconderte | `radio_escondite_es.mp3` · `radio_escondite_en.mp3` |
| `detenido` | al ser detenido | `radio_detenido_es.mp3` · `radio_detenido_en.mp3` |

Opcional: variantes `radio_<momento>_2_<idioma>.mp3`, `_3_`, `_4_`; el juego elige una al azar entre las que existan.

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
| `audio`, `music`, `quality` | Volúmenes, voces, música por zonas y calidad gráfica |

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
- Sin imágenes ni audios de terceros (si añades música o voces con licencia, apúntalas en `src/credits.js`; se muestran en ⚙ Ajustes → Créditos).
