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
| Pausa | Esc o P | Botón ❚❚ |
| Empezar / reintentar | Enter | Botón Jugar |

**Un solo botón:** todo el juego se controla con saltar/volar. Las armas y gadgets que disparan (pistola y tiempo bala de El Relojero, cohete de Bruno) apuntan solos al obstáculo o enemigo más cercano por delante, con una mira amarilla encima del objetivo. Las habilidades especiales se activan solas al llenarse la barra.

Sonido y música se silencian con el botón 🔊.

## Ejecutar en local

Los módulos ES necesitan un servidor (no funciona abriendo `index.html` con doble clic):

```bash
python3 -m http.server 8000
```

Abre <http://localhost:8000>. (Con Node también vale `npx serve`.)

**Antes de publicar** ejecuta `node tools/build.js` (actualiza la versión del service worker). Para que se compruebe solo en cada `git push`, activa el gancho una vez: `git config core.hooksPath .githooks`. El gancho también ejecuta la prueba de caminos (`node tools/test-caminos.js --quick`).

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
- **Actualizaciones:** el service worker ([`sw.js`](sw.js)) guarda **cada versión del juego como un paquete completo**. Al publicar, ejecuta `node tools/build.js` (el gancho de `git push` lo comprueba): calcula una huella de todos los archivos y la escribe en `sw.js`. Los jugadores descargan la versión nueva entera de una vez (si falla un archivo, siguen con la anterior completa: nunca media versión mezclada, que era una causa de pantalla en blanco con mala conexión) y el juego **se recarga solo en el menú** (nunca en mitad de una partida). Los audios van aparte: primero la red y, sin conexión, lo guardado.
- **Si a alguien se le queda una versión rota:** en la pantalla de carga hay un botón **«Reparar y recargar»** (borra la caché del juego y el service worker), o se puede abrir la dirección con `?repair` al final.
- **Icono:** dibujado por código con el protagonista ([`src/ui/appicon.js`](src/ui/appicon.js)); los PNG de [`icons/`](icons/) se regeneran con `node tools/generar-iconos.js` (servidor local en marcha y Playwright instalado).

## Cómo se juega

### Tutorial, vibración y pausa
- **Tutorial integrado** solo en la primera partida: pistas breves en el momento justo, de una en una y sin pausar el juego:
  - «Toca para saltar» cuando se acerca el primer obstáculo de suelo.
  - «Toca otra vez en el aire» desde el segundo salto.
  - «Mantén pulsado para volar» al coger el jetpack.
  - «Suelta para bajar» si subes mucho.
  - «Borde rojo y amarillo: hace daño» al ver el primer obstáculo con borde (cable, peligro o valla).
  - Pistas para la cápsula de personaje y el primer escondite.

  Cada pista se quita sola al hacerlo o a los pocos segundos. Se vuelve a activar en **Ajustes → Juego → Ver el tutorial otra vez** (`tutorial` en `config.js`).
- **Vibración en el móvil:** corta al coger un diamante o un personaje, media al recibir un golpe, larga al ser detenido y un patrón de celebración al batir el récord. Se desactiva en **Ajustes → Juego** (`haptics`). En iPhone, Safari no permite vibrar.
- **Pausa automática** si sales de la app, cambias de pestaña, la ventana pierde el foco o entra una llamada (el sistema interrumpe el audio).

### Inicio: huida del furgón

Cada partida empieza con una escena de ~3 s que no se puede saltar: un furgón blindado del Banco Lingote con las puertas abiertas y la alarma sonando; el atracador salta con la bolsa de dinero y echa a correr. Escena y partida son continuas (mismo escenario, cámara y velocidad); durante la escena se ignoran toques y teclas. Un anillo dorado y un pequeño «¡CORRE!» marcan el instante en que tomas el control. Se empieza con **1★**. Policía floja al principio: hasta 500 m solo agentes a pie y algún coche lento; de 500 a 1.000 m algo más (misiles ocasionales); después, la curva normal (`intro` y `wanted.ease` en `config.js`).

### Detención

Al caer, el atracador da un pequeño rebote hacia atrás y cae de espaldas. Solo si iba muy rápido da 1 vuelta (desde 600 px/s) o 2 como mucho (desde 760 px/s). Después se desliza de espaldas frenando por rozamiento, con polvo en la arena, la madera y la tierra, o chispas en el asfalto y el metal. La distancia depende de la velocidad: unos 200 px yendo despacio y unos 700 px a toda velocidad. Cuando se para, dos agentes llegan corriendo, frena una patrulla, los billetes salen volando de la bolsa y aparece un gran sello **«¡DETENIDO!»** con un subtítulo de guasa. Sin sangre. Valores en `death` de `config.js`.

### A pie y jetpack opcional

- **Empiezas a pie**: toque/ESPACIO = saltar (mantén pulsado para saltar más alto; con ~180 px superas un coche aparcado).
- **Doble salto:** un segundo toque en el aire hace otro salto con voltereta y un soplo de aire (hasta ~315 px de alto). Se recarga al tocar el suelo; en patinete o carrito no hay doble salto. Fuerza del primer y segundo salto: `foot.jumpVel` y `foot.doubleJump.vel`.
- Para que el suelo siga siendo un reto: los obstáculos de calle salen a veces **en serie** (2-3 seguidos, con el hueco justo para aterrizar y volver a saltar) y a veces con un **cable por encima** que un salto normal pasa por debajo pero un doble salto toca (`foot.street.series` y `foot.street.ceilingCable`).
- A los **250-380 m** aparece el **jetpack** dentro de un grupo de pavos. Puedes ignorarlo: vuelve a salir cada 450-750 m mientras sigas a pie.
- **Capas de golpe:** a pie → detenido · con jetpack → lo pierdes y sigues a pie · con un personaje → vuelves al jetpack.
- **Jetpack de repuesto:** a partir de los 2.000 m, si pierdes el jetpack aparece otro entre 25 y 50 m más adelante, a ras de suelo (se coge corriendo), con el aviso «¡Jetpack de repuesto ahí delante!». Como mucho una vez cada 350 m; si no toca, vuelve a salir como siempre, entre 250 y 450 m después (`foot.spare`).
- **A pie, nada obliga a volar:** al principio y tras perder el jetpack solo salen obstáculos de suelo o que se pasan con el doble salto. Los cables van altos, los andamios se abren por abajo, las persianas no bajan hasta el suelo, las bolas de demolición dejan hueco y, en la ráfaga del jefe, el hueco está abajo. Al perder el jetpack desaparece lo que ya estaba generado y solo se pasaba volando: con una pequeña explosión si está en pantalla y sin rastro si aún no se ve. El criterio está en `foot.fair`: corta el paso por debajo de 60 px y sube más de 250 px.
- **Policía más justa a pie:** como un golpe a pie es la detención, la policía aprieta menos que con jetpack: menos patrullas (×0,6) y más lentas, más separación entre obstáculos, ataques con un 50 % más de aviso (patrullas, misiles, helicóptero y jefe), misiles y helicópteros solo desde 4★ y de uno en uno, y en la ráfaga del jefe el hueco está siempre abajo. Ajustes separados en `wanted.byMode.foot` y `wanted.byMode.jet` de `config.js`.
- **A PIE ×2:** mientras no hayas cogido nunca el jetpack, los pavos valen el doble (insignia verde en el HUD).
- **Obstáculos de calle:** vallas de obra, cubos de basura, coches aparcados y **toldos** (caer encima te lanza muy alto hacia un arco de pavos).
- **Vehículos a pie:** patinete eléctrico y carrito de la compra (unos segundos, más velocidad y aguantan un golpe).
- Misiones nuevas: «Recorre 400/800 m sin jetpack», «Recorre 1.500 m sin coger el jetpack», «Usa un patinete o carrito».
- Ajustes en el bloque `foot` de `config.js`.

### La ciudad y los peligros

**Vida en el fondo** (sin interacción): bañistas, paseantes, turistas haciendo fotos (con flash), corredores, niños con pelota y gente que se asusta y huye al pasar el atracador; policía de fondo (patrullas, el quad de la playa y agentes que te señalan) que aumenta con las estrellas; veleros, yates, motos de agua, surfistas, remolcadores y portacontenedores; avionetas con pancarta, aviones con estela, helicóptero de Calimar TV, parapentes, globos, dirigible y gaviotas. Cada zona tiene lo suyo: oficinistas y taxis en el centro, grúas, camiones y carretillas en el industrial, descapotables y gente paseando al perro en las mansiones, grúa pórtico y barcos en el puerto. Aparecen al azar, con un máximo a la vez, y con colores mezclados con el tono de la zona para no distraer de los obstáculos. Código en [`src/world/ambient.js`](src/world/ambient.js); ritmos y límites en el bloque `ambient` de `config.js`.

Las zonas se suceden cada **450 m**: **Playa Coral → Distrito Lingote → Las Chimeneas → Colinas Brisa → Puerto Ancla**.
- **Transición de ~100 m** entre zonas: cada capa cambia en su momento, sin fundido de golpe. Primero el cielo y la luz (la playa anochece), luego lo lejano y lo cercano (aparecen edificios sobre la arena) y al final el suelo y el primer plano (solo ciudad). Tramos en `zones.stages`.
- **Variaciones:** al completar la vuelta, las zonas se repiten **de noche, bajo la lluvia o entre la niebla**. La variación va rotando por zona y por vuelta, así que la misma zona nunca sale igual dos vueltas seguidas; una zona que ya es de noche recibe lluvia en lugar de «noche». El clima solo se pinta en el fondo y nunca tapa obstáculos. El cartel de zona lo indica («Playa Coral · de noche»). Colores y cantidades en `zones.variantDefs`; código en [`src/world/variants.js`](src/world/variants.js).

**Código visual de peligro.** Lo que hace daño y lo decorativo nunca se confunden:
- **Objetos que hacen daño** (cables, neones, andamios, bola de demolición, toldos que se cierran, vallas, cubos y misiles): **borde amarillo con franjas rojas que avanzan** y **brillo rojo que late**, siempre en la capa de juego. Se dibuja en un solo trazo para todos (barato en móvil). El toldo para rebotar no hace daño y no lo lleva.
- **Seres vivos y vehículos** (gaviotas, perros, guardias, agentes, matones en patinete, drones, patrullas, coches aparcados y helicópteros) **no llevan borde**: quedaba mal. Su peligro se ve en su propio diseño:
  - **«!» sobre la cabeza al detectarte** (a 1,1 s de llegar a ellos; el perro, al lanzarse a por ti; el agente, al verte en su cono) con un **gesto de ataque**: se encogen y se inclinan hacia ti un instante.
  - **Halo de su color**, cálido y saturado, que resalta sobre el fondo apagado (más fuerte durante el aviso).
  - **Sombra en el suelo**, también si vuelan (más pequeña y suave cuanto más alto): se ve a qué altura están.
  - Las patrullas siguen con sirena, faros y el aviso ◀ en el borde; el helicóptero, con su foco.
- **Todo lo decorativo** (cielo, edificios, vida del fondo, clima) se pinta a menor resolución, así que queda algo desenfocado (y además es más rápido), con un velo que le quita color y lo oscurece un poco. El decorado nunca usa colores de peligro: los neones del fondo son fríos y apagados («JAZZ», «CINE», «CAFÉ», «VIP», «LINGOTE»), las balizas de las torres son blancas en vez de rojas, las franjas del suelo industrial están apagadas y los toldos para rebotar son verdes, azules o turquesa.
- **Neones peligrosos:** solo colores cálidos y saturados, franjas de aviso amarillas y negras, y antes de encenderse **parpadean, chisporrotean y zumban** durante 0,6 s.
- En el **centro de noche** los carteles decorativos ya no repiten las palabras ni los colores de los peligrosos (antes «HOTEL» o «BAR» podían ser de los dos tipos).

Ajustes en el bloque `danger` de `config.js` (grosor, colores y latido del borde; `danger.creatures`: antelación y duración del «!», gesto, halo y sombra de los seres vivos; resolución y velo del decorado) y en `hazards.neon` (colores y tiempo de aviso).

**Obstáculos:** cables eléctricos (fijos, dobles, en puerta o giratorios), patrullas que vienen de frente, helicópteros con foco que disparan si te detectan y misiles con aviso previo. **Peligros de la ciudad** (según la zona, sin repetir el anterior): bola de demolición de una grúa que se balancea (calcula el momento), neones que parpadean y solo dañan encendidos, andamios que se derrumban dejando hueco arriba o abajo, bocas de riego que revientan y te empujan hacia arriba, y toldos de fachada que se cierran de golpe (bloque `hazards` de `config.js`).

**Nunca situaciones imposibles.** Antes de dar por bueno cada grupo de obstáculos, el generador comprueba que hay **al menos un camino** con la física real del juego ([`src/world/pathcheck.js`](src/world/pathcheck.js)):
- Simula a la vez todos los jugadores posibles (altura, velocidad, en el suelo o en el aire, dobles saltos…) usando el propio código del jugador: salto, salto largo, doble salto, jetpack, la física de cada personaje, los vehículos y los techos de los coches. Avanza a la velocidad a la que irás y con copias de los obstáculos que **se mueven de verdad** (la bola se balancea, el neón se enciende, el andamio cae, el toldo se cierra, las patrullas vienen hacia ti…).
- Solo puedes cambiar lo que haces cada 0,1 s (nadie reacciona a cada frame), y tu caja lleva 4 px de margen: el hueco tiene que sobrar. Lo fijo se comprueba desde todos los estados posibles al final del grupo anterior; lo que viene rápido hacia ti (patrullas, perros, patinetes), desde tu estado actual hasta que te ha pasado.
- Si no hay camino, el grupo **se descarta y se prueba otro**; si tampoco, se deja hueco.
- **Cambios de estado:** si pierdes el jetpack o el personaje, o montas en un vehículo, se vuelve a comprobar todo lo que ya hay delante desde tu estado nuevo. Lo que ya no tenga camino se retira (con una pequeña explosión si está en pantalla).
- **Separación mínima** entre grupos: 0,5 s a tu velocidad (0,3 s de reacción + recuperarse), así que crece con la velocidad.
- **Combinaciones prohibidas:** con un ataque en marcha (misiles avisando o en vuelo, balas, helicóptero patrullando o apuntando, ataque del jefe) no sale otro ataque ni nada que cierre el paso (puertas y parejas de cables, cables giratorios, andamios, bolas de demolición, toldos de fachada), los cables son sencillos y hay un 50 % más de separación. Y un misil o helicóptero no sale si hay algo que cierra el paso en pantalla.
- **Huecos y avisos:** puertas de cables de 150-190 px (el personaje mide 50), andamios de 182 px, ráfaga del jefe de 150 px, y todos los avisos duran al menos 0,3 s.
- **Qué se encontró:** el toldo de fachada, con jetpack, se podía colocar tan bajo que al cerrarse dejaba 20 px de hueco: imposible de pasar. Era el pico de muertes con toldos que ya se veía en el registro de muertes. En la prueba sin la garantía salían 14 puntos imposibles en 72 partidas, todos de ese tipo. Ahora el hueco es siempre de al menos 130 px.
- Cuesta unos 4 ms por grupo en un ordenador (unos 10-16 ms en un móvil lento, una vez por segundo más o menos); en calidad baja sigue menos estados a la vez. Estadísticas en `?debug`: `game.spawner.pathStats` en la consola. Ajustes en `pathcheck` de `config.js`.

**Prueba automática** ([`tools/test-caminos.js`](tools/test-caminos.js)): juega partidas reales en Node (la lógica del juego tal cual, sin dibujar) a distancias, estrellas y modos al azar (a pie, jetpack, personajes, perder el jetpack a mitad), graba cada obstáculo y un **verificador independiente y más fino** (pasos de 1/60 s, sin margen, más estados) busca camino de principio a fin. También comprueba las combinaciones prohibidas, los avisos y los huecos.
```bash
node tools/test-caminos.js
```
Comprueba unos 3.000 tramos en 1-2 minutos. Con `--quick` son unos 600 (10 s), con `--compare` también juega las mismas partidas sin la garantía, y con `--seed N` repite una partida concreta. Se ejecuta solo antes de cada `git push` (con `git config core.hooksPath .githooks`): si algún tramo no tiene camino, el push se para y dice dónde.

**Coches como plataforma.** Los coches aparcados y las patrullas en marcha se pueden **pisar**: si caes encima aterrizas en el techo con un pequeño rebote, un «¡Pisotón!» y una **abolladura** (el coche se hunde un instante y le queda la marca), y puedes seguir corriendo por el techo o saltar desde ahí (el doble salto se recarga). La zona segura es generosa: cuenta el techo entero, el capó y el maletero, unos píxeles de más a cada lado y hasta 20 px por debajo del techo. **Chocar de frente o de lado** sigue haciendo daño (o te quita la capa actual: personaje → jetpack → a pie). Misión: «Salta sobre 10 coches en una partida». Ajustes en `cars` de `config.js`; código en [`src/systems/platforms.js`](src/systems/platforms.js).

**Enemigos menores** (sobre todo en los primeros metros y con 0-1★; se retiran cuando la policía toma el relevo): guardia de seguridad con linterna que salta al verte, dron de reparto que cruza el cielo, perro callejero que te persigue por el suelo desde atrás (aviso "GUAU!" en el borde izquierdo), bandadas de gaviotas (solo en la playa) y matón en patinete eléctrico que viene de frente y salta. Son fáciles de esquivar, pero **chocar cuenta como golpe**. Se derrotan con gadgets y habilidades (pistola, furia, nitro, coche, moto, cohete…): salen volando con estrellitas de mareo y dan unos pavos (× multiplicador) y algo de XP. Misiones: «Derrota 3 enemigos menores en una partida» y «Elimina 10 drones de reparto» (acumulativa entre partidas). Bloque `minors` de `config.js`.

**Agentes a pie que te persiguen** (al principio, con 1★): llevan un cono de visión sutil. Si entras en él te ven, se paran a gritarte algo gracioso (bocadillo + voz) y, cuando les pasas, se dan la vuelta y te persiguen unos segundos hasta que se rinden agotados (sudando, «¡Me ha dado flato!»). Durante la persecución no hacen daño. Si llegan a un obstáculo que tú has saltado, se estampan de forma cómica: se aplastan contra él y resbalan, ruedan hacia atrás o caen de espaldas, con ojos en X, la gorra saliendo volando y estrellitas o pajaritos girando. Cada estampada da unos pavos (× multiplicador), algo de XP y «+Humillación», y cuenta para la misión «Haz que 5 policías se estampen» (acumulativa). Ajustes en `minors.cop` de `config.js`; gritos en `cop.shout.1..8` de `translations.js`.

**Helicóptero jefe** (al llegar a 5★, **nunca antes de 3.000 m**: `boss.minDistance`): persecución de 30 s contra «El Halcón», con barra de tiempo visible. Con un solo botón todos sus ataques se pueden esquivar (no hay «cortinas» de balas desde arriba):
- **Foco que te sigue:** gira hacia ti con un giro limitado; cuando te fija se congela en rojo, aparece un anillo con cuenta atrás y dispara **1 s después** donde estabas. Basta con moverse.
- **Misiles:** 2-3 seguidos, cada uno con su aviso de siempre en el borde derecho (te sigue, se fija y sale).
- **Ráfaga con hueco:** una pared de balas entra por la derecha; antes, el borde se marca en rojo con la posición de cada bala y el hueco en verde con flechas. A pie, el hueco está siempre abajo.

El helicóptero normal también avisa así: cuando su foco te detecta se queda fijo en rojo con una línea de tiro discontinua y dispara 1 s después (`obstacles.heli.windup`). Si sobrevives: +600 pavos, +10 💎, +150 XP, fanfarria de victoria y bajas a 2★ (bloque `boss`).

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
| **Don Aurelio Vega, "El Relojero"** — atracador retirado, traje, bigote y gafas doradas | Flota: caída suave y lenta, preciso | **Tiempo bala**: todo se ralentiza y dispara solo, en ráfaga, a lo más cercano por delante | **Pistola** con silenciador (dispara sola a lo que tienes delante) · **Chaleco** (aguanta un golpe) |
| **Vera "Chispa" Rivas** — conductora callejera, bomber naranja y trenza | Rápida y nerviosa: acelera y frena al instante, caja más pequeña | **Conducción perfecta**: baja al suelo en su deportivo "Rayo" y esquiva sola | **Nitro** (invulnerable y atraviesa todo) · **Rampa** (salto hacia un arco de pavos en lo alto) |
| **Bruno "Petardo" Tramuntana** — caótico, camisa hawaiana y barba pelirroja | Pesado: mucha inercia, empuje brutal y rebota en el suelo | **Modo furia**: atraviesa y destruye todo | **Lanzacohetes** (limpia la pantalla) · **Moto** "Jabalina" (rebota sola y aguanta un golpe) |

**Armas solo cuando hace falta.** La **pistola** de Aurelio y el **lanzacohetes** de Bruno (los gadgets de disparo) solo aparecen con dificultad media-alta: a partir de **1.500 m** o antes si tienes **3★ o más**. Entre dos armas pasan al menos 450 m, y cuando la policía aprieta (patrulla, misil o helicóptero por delante, el jefe o 4★+) su probabilidad se multiplica por 2,5, para que lleguen como una ayuda en el momento justo y no como algo constante. Umbrales en `characters.shooters` de `config.js`.

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

### Economía (precios y recompensas)

Medida con el simulador [`tools/simular-economia.js`](tools/simular-economia.js) y el desglose de `?debug` en la pantalla final. Una **partida normal** (~1.200 m, jugador medio) da unos **1.600 pavos** en total (recorrido, multiplicador, a pie ×2, eventos, misiones, niveles y ruleta).

| Artículo | Precio | Partidas normales |
|---|---|---|
| Accesorio común / raro | 8.000 / 12.000 | 5 / 7,5 |
| Estela común / rara | 9.000 / 12.000-15.000 | 6-9 |
| Efecto de transformación | 18.000 | 11 |
| Traje común / raro | 12.000-14.000 / 18.000-20.000 | 7-12 |
| Disfraces de pavos | 24.000-32.000 | 15-20 |
| Mejora, niveles 1→5 | 2.500 · 5.500 · 9.000 · 13.000 · 18.000 (48.000) | ~30 por mejora |
| Consumibles | escudo 1.000 · arranque 1.500 · transformado 1.800 · revivir 2.500 | ~1 |

Recompensas: **50 × nivel** pavos al subir de nivel, misiones fácil 150 / media 350, ruleta 100 / 250 / 600 y helicóptero jefe 600. La tienda de pavos completa (unos 800.000) se termina hacia el **prestigio IV**; el primer prestigio llega hacia la partida 110. Los artículos de 💎 no cambian.

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

### Gritos de los agentes a pie

Usan el mismo sistema de voces: si existe `audio/voces/policia_grito_<n>_<idioma>.mp3` se usa ese archivo; si no, la voz del navegador (tono y velocidad en `audio.voices.cop`). Como mucho un grito con voz cada 4 s (`minors.cop.voiceEvery`); el bocadillo sale siempre.

| n | Español (`_es.mp3`) | English (`_en.mp3`) |
|---|---|---|
| 1 | ¡Alto ahí, ladrón de pavos! | Stop right there, buck thief! |
| 2 | ¡Mi jefe me va a matar! | My boss is going to kill me! |
| 3 | ¡Espera, que voy en chanclas! | Wait up, I'm in flip-flops! |
| 4 | ¡Que alguien me sujete el café! | Somebody hold my coffee! |
| 5 | ¡Si hoy ni me tocaba turno! | This isn't even my shift! |
| 6 | ¡Devuelve esa bolsa, que es del banco! | Give that bag back, it belongs to the bank! |
| 7 | ¡Corre, corre, que te pillo… en cinco minutos! | Run, run! I'll catch you… in five minutes! |
| 8 | ¡Alto en nombre de la ley… y de mi madre! | Stop in the name of the law… and my mom! |

Archivos: `policia_grito_1_es.mp3` … `policia_grito_8_es.mp3` y `policia_grito_1_en.mp3` … `policia_grito_8_en.mp3`.

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

## Ranking mundial y cuentas

### Cómo funciona
- **Cuenta = solo un apodo.** Sin email ni contraseña. Se pide la primera vez que abres **🏆 Ranking** o cuando bates un récord (en la pantalla final), pero siempre se puede cerrar y jugar sin cuenta.
- Apodos **únicos** (sin distinguir mayúsculas), de **3 a 16** caracteres (letras, números, espacios y `_ . -`), con **filtro de palabras ofensivas** en español e inglés. El filtro está en el juego (`src/online/ranking.js`) y también en el servidor, que es quien decide.
- Al crearla se muestra un **código de recuperación** (`XXXX-XXXX-XXXX`) que sirve para usar la cuenta en otro dispositivo (**⚙ Ajustes → 🏆 Cuenta del ranking → Usar un código**). Se puede volver a ver en Ajustes. En el servidor solo se guarda cifrado (SHA-256).
- **No se guarda ningún dato personal** más allá del apodo: ni IP, ni email, ni identificadores del dispositivo.
- **Ranking:** top 100 por distancia, con pestañas **Todos los tiempos** y **Esta semana** (se reinicia cada lunes a las 00:00, hora de España). Cada fila: posición, apodo, distancia, personaje con el que se consiguió e insignia de prestigio. Tu posición se ve siempre abajo, aunque no estés en el top.
- Al terminar una partida, si mejoras tu marca (de siempre o de la semana), **se sube sola** y la portada del periódico dice en qué puesto has quedado. **Sin conexión** se guarda y se sube después (al volver la conexión, al abrir el juego o al abrir el ranking). Si aún no tienes apodo, queda guardada y se sube al crearlo.

### Montarlo en Supabase (una vez)
1. Entra en [supabase.com](https://supabase.com), abre tu proyecto y ve a **SQL Editor → New query**.
2. Copia **todo** el archivo [`supabase/ranking.sql`](supabase/ranking.sql), pégalo y pulsa **Run**. Debe terminar con *Success. No rows returned*. Se puede volver a ejecutar sin perder datos (recrea las funciones).
3. Comprueba en **Table Editor** que aparecen `players` y `scores` con la etiqueta **RLS enabled**.
4. Ya está: la dirección del proyecto y la clave pública están en `config.js` → bloque `online` (`url` y `key`). La clave pública puede ir en el código: con ella solo se pueden llamar las 5 funciones del ranking.
5. Pruébalo: abre el juego → 🏆 Ranking → elige un apodo → juega una partida de más de 50 m.

### Seguridad y antitrampas
- Las tablas tienen **RLS activado sin ninguna política** y sin permisos para el rol público: con la clave pública no se pueden leer, escribir, cambiar ni borrar filas directamente. Todo pasa por 5 funciones: `create_player`, `recover_player`, `submit_score`, `leaderboard` y `my_rank`.
- Para subir una puntuación hay que dar el **código secreto de la cuenta**: nadie puede subir, cambiar ni borrar puntuaciones de otro.
- `submit_score` rechaza las **puntuaciones imposibles**: más metros de los que permite la duración de la partida a la velocidad máxima del juego (25,6 m/s × 1,25 de margen + 600 m del arranque rápido), partidas de menos de 3 s o de más de 6 h, personajes o prestigios que no existen. Y como mucho **3 envíos por minuto** por jugador. También limita la creación de cuentas a 30 por minuto en total.
- Los límites están en la función `sc_limits()` del SQL. Si cambias la velocidad máxima del juego (`speed.max` en `config.js`), cámbiala también ahí.
- Es un antitrampas **básico**: alguien que modifique el juego podría enviar partidas inventadas pero creíbles. Para eso está el borrado manual.

### Marcas de otros jugadores en el recorrido
- Durante la partida ves dónde llegaron otros jugadores: al acercarte a la marca de alguien aparece arriba una bandera pequeña con su apodo y su distancia, y una línea muy tenue en el metro exacto.
- Nunca hay más de una bandera a la vez en pantalla. Al superarlo sale un aviso breve («¡Has superado a Ana!») con un pequeño sonido.
- **Qué marcas salen:** los 3 jugadores justo por encima de tu récord y 3 del top 10 (el primero, uno del medio y el último), como mucho 6. No sales tú ni los tramposos bloqueados.
- **Red:** se descargan con **una sola petición al empezar la partida**; durante la partida no hay red. Sin conexión no se muestran, sin errores.
- Se ocultan en **Ajustes → Juego → Marcas de otros**. Ajustes en `online.marks` de `config.js`.
- **Montarlo:** ejecuta [`supabase/marcas.sql`](supabase/marcas.sql) en el SQL Editor después de `ranking.sql`. Crea la función `ghost_marks`, que solo devuelve apodo y distancia (lo mismo que ya es público en el ranking).

### Opiniones de los jugadores («Danos tu opinión»)
- **En el juego:** el botón 💬 del menú abre una ventana con una valoración de 1 a 5 estrellas (obligatoria) y texto libre (opcional, máximo 500 caracteres). Se guarda con la fecha, la versión del juego (`version` en `config.js`), el idioma y el apodo si tienes cuenta.
- **Montarlo:** ejecuta [`supabase/opiniones.sql`](supabase/opiniones.sql) en **SQL Editor → New query → Run**, después de `ranking.sql`.
- **Seguridad:**
  - La tabla `feedback` tiene RLS activado y ninguna regla de acceso. Con la clave pública solo se puede **escribir** mediante la función `send_feedback`; nadie puede leer, cambiar ni borrar las opiniones de otros.
  - El apodo lo pone el servidor tras comprobar el código secreto de la cuenta, así que nadie puede firmar como otro jugador.
- **Antispam:**
  - En el servidor: como mucho 3 opiniones por cuenta y hora y 1 por minuto, un tope global de 20 por minuto, y no se aceptan mensajes repetidos en 24 h. Límites en `fb_limits()`.
  - En el dispositivo: 10 minutos entre envíos (`feedback.cooldown`).

**Cómo leer las opiniones:**
1. **Table Editor → `feedback`**: la tabla con todas. Ordena por `created_at` y filtra por `rating` o `version` con los botones de la barra.
2. **SQL Editor**, para resúmenes:
   ```sql
   -- las últimas 50
   select created_at, rating, nick, version, lang, message
   from feedback order by created_at desc limit 50;

   -- nota media y nº de opiniones por versión
   select version, round(avg(rating), 2) as media, count(*) as total
   from feedback group by version order by version desc;

   -- solo las malas (1-2 estrellas) con texto
   select created_at, rating, message from feedback
   where rating <= 2 and message <> '' order by created_at desc;

   -- borrar una opinión (spam)
   delete from feedback where id = 123;
   ```
El panel de Supabase entra con permisos de administrador, por eso ahí sí las ves todas.

### Borrar a un tramposo
En Supabase → **SQL Editor** (cambia `Apodo` por el suyo):
```sql
-- ver sus puntuaciones
select s.id, s.distance, s.duration, s.hero, s.created_at
from scores s join players p on p.id = s.player_id
where lower(p.nick) = lower('Apodo') order by s.distance desc;

-- recomendado: ocultarlo del ranking y bloquear sus envíos (conserva el apodo ocupado)
update players set banned = true where lower(nick) = lower('Apodo');

-- borrar solo una puntuación concreta (el id de la consulta de arriba)
delete from scores where id = 123;

-- borrarlo del todo, con todas sus puntuaciones (el apodo queda libre)
delete from players where lower(nick) = lower('Apodo');

-- perdonarlo
update players set banned = false where lower(nick) = lower('Apodo');
```
También se puede hacer desde **Table Editor**: tabla `players` → busca el apodo → marca `banned` o borra la fila.

## Compatibilidad, carga y errores

**Pantalla de carga.** Aparece al instante (está en el propio `index.html`) con una barra que avanza según se descargan los archivos del juego y un aviso con «Reintentar» / «Reparar y recargar» si tarda más de 20 s.

**Navegadores.** El juego necesita un navegador de los últimos años: Chrome/Edge 85+, Safari 14+ (iPhone con iOS 14 o posterior), Samsung Internet 14+ o Firefox 79+. El arranque ([`src/boot.js`](src/boot.js)) está escrito en JavaScript antiguo para funcionar en cualquier navegador y:
- comprueba que el navegador puede con el juego; si no, muestra «Este navegador es demasiado antiguo… ábrelo en Chrome o Safari» en vez de una pantalla en blanco;
- si un archivo del juego falla al cargar, o el juego se rompe al arrancar, muestra «No se ha podido abrir el juego» con «Reintentar» y «Reparar y recargar»;
- detecta los **navegadores internos de apps** (Instagram, Facebook, WhatsApp, TikTok…). Si allí falla, el mensaje dice que lo abras en Chrome o Safari (menú ⋯ → «Abrir en el navegador») con un botón para copiar el enlace; si funciona, sale un aviso en el menú que se puede cerrar (en esos navegadores el guardado se puede perder).

Arreglos de compatibilidad ([`src/core/compat.js`](src/core/compat.js)): `roundRect` del canvas (no existe en Safari < 16 ni Chrome < 99; sin él el marcador fallaba en cada frame y el juego se quedaba congelado), la decodificación de audio de Safari 14 y `inset` en el CSS. Además, un error en mitad de la partida ya no congela el juego: se registra y el juego sigue; solo si falla en todos los frames sale el mensaje de error.

**Registro de errores.** Los errores de JavaScript y de carga se guardan en Supabase con el navegador y modelo (user agent), la versión del juego (`version` en `config.js`), la pantalla (tamaño, ventana y densidad), si es **web, PWA o APK**, el idioma y el estado del juego (menú/partida, calidad, metros y zona). Sin apodo, cuenta ni ningún dato personal. Solo se pueden **escribir**: con la clave pública nadie puede leerlos. Un mismo error repetido no crea filas nuevas, suma 1 a `hits`. Sin conexión se guardan (como mucho 10) y se envían en el siguiente arranque. Ajustes en `errorLog` de `config.js`.

Para activarlo, ejecuta [`supabase/errores.sql`](supabase/errores.sql) en **SQL Editor → New query → Run** (una vez; se puede repetir).

**Cómo consultarlos.** En **Table Editor → `client_errors`** (ordena por `last_at`), o en **SQL Editor**:
```sql
-- los errores más frecuentes de la última semana
select kind, message, source, version, sum(hits) as veces, count(*) as navegadores, max(last_at) as ultima
from client_errors where last_at > now() - interval '7 days'
group by kind, message, source, version order by veces desc limit 30;

-- lo que ve un jugador concreto (por su móvil o navegador)
select last_at, hits, kind, message, source, platform, screen, context, ua
from client_errors where ua ilike '%iPhone OS 15%' or ua ilike '%SamsungBrowser%' order by last_at desc limit 50;

-- quién no consigue ni abrir el juego (navegador no compatible, carga lenta o rota)
select last_at, kind, message, platform, ua, context from client_errors
where kind in ('unsupported', 'fatal', 'timeout') order by last_at desc limit 50;

-- web, app instalada o APK
select platform, sum(hits) from client_errors group by platform;

-- limpiar los antiguos
delete from client_errors where last_at < now() - interval '60 days';
```
Pista: `context` dice en qué estaba el juego (`playing q=auto/low d=1830 z=port` = jugando, calidad automática en baja, a 1.830 m en el puerto) y `inapp=Instagram` si venía del navegador de Instagram.

## Gráficos y rendimiento

**Detalle visual (calidad alta):** variaciones en palmeras (altura, inclinación, grosor, hojas y cocos), sombrillas (tamaño, gajos, toallas), casetas, árboles, setos, contenedores y bidones; rayos de sol suaves; destellos del sol y la luna en el agua, olas que llegan a la orilla y espuma que sube y baja; huellas, conchas y ondas en la arena; vetas, grava, manchas y grietas en el suelo; perspectiva atmosférica (las capas lejanas más claras); y un **primer plano** desenfocado (hierba, postes, arbustos, tuberías, cajas…) que pasa rápido por la franja de abajo sin tapar los obstáculos. El personaje se dibuja un 15 % más grande que su caja de choque, con un contorno luminoso suave y estiramiento/aplastamiento al saltar y aterrizar (`player.visual`). Los contadores tienen un fondo semitransparente y la barra de Radio Calimar es más compacta y va pegada al borde inferior.

En calidad **baja** se quitan el primer plano, los rayos, las texturas y el contorno, y la vida del fondo baja a 4 elementos a la vez.

Todo el arte está **generado por código** (sin imágenes externas, así que no hay licencias de terceros que declarar):

- Cada zona tiene su ambiente: atardecer en la playa, noche con neones en el centro financiero, anochecer con humo en la zona industrial, mañana despejada en las colinas y hora azul en el puerto.
- 4 capas de parallax (silueta lejana + 3 capas de decorado) con bruma atmosférica entre ellas.
- Brillos con sprites de halo precalculados, ventanas con patrones repetidos y caché del cielo y de los rascacielos para que vaya fluido en móvil.
- **Calidad** (Ajustes → Calidad, o el botón del menú): **Automática** (por defecto), **Alta** o **Baja**.
  - En **Automática** se miden los FPS al empezar cada partida: se ignora medio segundo y se miden 2 s. Si la media baja de **50 FPS**, la calidad baja un nivel y **vuelve a medir**: de alta a baja, y si aún va lento, a «mínima».
  - **Tirones:** si en 2 s hay 5 frames de más de 45 ms (saltos que se notan aunque la media sea buena), baja en el momento, sin esperar a la medición.
  - Si va bien, se queda en ese nivel, que se recuerda para las siguientes partidas. Volver a elegir Automática empieza de nuevo desde alta.
  - Si a mitad de partida va por debajo de 45 FPS durante 3 s, también baja.
- **Qué quita cada nivel:**
  - **Baja:** menos resolución, la mitad de partículas (dibujadas como cuadraditos, mucho más baratos), como mucho 3 elementos de vida en el fondo, nubes de una pieza y **sin desenfoques** (ni fondo desenfocado, ni primer plano, ni contorno del personaje), rayos ni texturas.
  - **Mínima:** aún menos resolución, la cuarta parte de partículas, sin nubes y sin vida en el fondo.
- **Tope de píxeles:** en tablets y móviles con mucha densidad de pantalla el lienzo no pasa de 2,4 millones de píxeles reales en alta (0,7 en baja y 0,4 en mínima): más no se nota y cuesta mucho.
- **Otras optimizaciones:** las partículas se reutilizan (no se crean objetos sin parar) y las que salen de pantalla no se dibujan; los obstáculos que quedan atrás se eliminan sin crear listas nuevas; el audio generado por código reutiliza un único búfer de ruido (antes creaba y rellenaba uno nuevo en cada sonido) y tiene un tope de 28 sonidos a la vez (`audio.maxVoices`).
- **Medido** (Chromium sin GPU con la CPU ralentizada, escena con 4★ a 2.600 m): con la CPU 4 veces más lenta, la calidad automática baja a Baja en menos de 1 s y se queda en **54 FPS** (antes unos 45). Con la CPU 6 veces más lenta baja hasta Mínima: **40 FPS**. Sin ralentizar se queda en Alta (58 FPS). Un móvil de verdad pinta con la GPU y suele ir mejor que esta prueba, pero no lo he podido probar en un móvil real.
- Ajustes en `quality` de `config.js` (`quality.auto`: skip, window, minFps…).

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

**Cuenta maxeada:** abre `maxeada.html` (o añade `?maxeada` a la URL) para empezar con 9.999.999 pavos, 99.999 💎, todo el vestuario comprado, mejoras al máximo, 99 consumibles de cada, 999 fichas, nivel 30 y prestigio X. Se rellena una sola vez y después se juega normal. En la misma web que tu partida normal la sustituye (exporta antes tu código en ⚙ Ajustes). Código en [`src/meta/maxed.js`](src/meta/maxed.js).

| Parámetro | Efecto |
|---|---|
| `?debug` | FPS, velocidad, física, calor de búsqueda y zona; **panel de deslizadores** para ajustar la física del jetpack en vivo (botón «Copiar valores»); **registro de muertes** (abajo a la izquierda); acceso a `game` desde la consola |
| `?god` | Invulnerable (para recorrer todas las zonas) |
| `?start=1500` | Empieza la partida en esos metros |

Se combinan: `?debug&god&start=2000`.

**Registro de muertes (`?debug`).** Cada muerte guarda qué obstáculo te mató (los del jefe aparecen como `boss-spot`, `boss-missile` y `boss-gap`), en qué metro, la zona, las estrellas y si ibas a pie, con jetpack o transformado. El panel plegable «Muertes» resume las últimas 50 partidas: distancia media y mediana, causas más frecuentes, muertes por tramos de 250 m (con las dos causas principales de cada tramo) y las 8 últimas. Se guarda en el navegador (`fuga_deathlog`); «Borrar» lo vacía. En la consola: `__deaths()` y `__deathsClear()`. Ajustes en `debug.deathLog`.

**Pico de dificultad hacia los 2.000 m (revisado con el registro).** Un bot que juega partidas completas mostró que los golpes se disparaban entre 1.500 y 1.750 m. Coincidían varias cosas a la vez: los cables en «puerta» (arriba y abajo con hueco) aparecían de golpe a 1.575 m con toda su probabilidad, los enemigos menores (fáciles y con más hueco detrás) desaparecían del todo a 1.500 m, la policía pasaba sin transición de la curva suave a la normal (a 1.000 m) y la zona del puerto multiplicaba misiles y helicópteros. Cambios: los cables en puerta y dobles entran poco a poco (`obstacles.cable.gate/double`: from, chance, ramp), los enemigos menores se retiran hasta 2.200 m, hay un tercer tramo de policía suave hasta 2.300 m (`wanted.ease`), el puerto aprieta menos (misiles ×1,3 y helicóptero ×1,15) y las persianas avisan antes (0,4 s). Con 20 partidas del bot por versión, el máximo de golpes por tramo entre 1.000 y 2.500 m bajó de 0,85 a 0,65 por partida y la curva queda más plana. Para borrar el progreso: `localStorage.clear()` en la consola.

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
