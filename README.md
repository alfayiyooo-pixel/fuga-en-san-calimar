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

## Monedas

- **Pavos** 💵: moneda común; se ganan jugando. Sirven para mejoras, artículos normales y consumibles.
- **Diamantes** 💎: moneda premium y escasa. Se ganan con misiones difíciles, subidas de nivel, recompensa diaria, prestigio y, muy raramente, en el recorrido (un diamante da 3-5 💎 con cámara lenta y destello). Bloque `gems` de `config.js`.

## Tienda

- **Personajes**: trajes, accesorios, estelas y efectos de transformación para los tres personajes (y traje y estela para el atracador básico). Los normales con pavos; los legendarios animados con 💎 (piden confirmación con dos toques); los de prestigio no se compran. Vista previa animada antes de comprar.
- **Mejoras**: duración de gadgets, frecuencia de personajes, imán, habilidad especial y potencia de orbes (5 niveles, coste creciente).
- **Consumibles** de un solo uso que se activan en el menú antes de jugar: arranque rápido de 500 m, escudo inicial, empezar transformado y revivir una vez.
- **Diamantes**: packs de dinero real en **modo simulado** (ver abajo).

Precios en el bloque `shop` de `config.js`; artículos en [`src/meta/catalog.js`](src/meta/catalog.js).

### Pagos reales (pendiente)

Ahora mismo **no se cobra nada**: `shop.payments.enabled` es `false` y al pulsar un pack aparece «Compras desactivadas (versión de prueba)». El punto de conexión es [`src/meta/payments.js`](src/meta/payments.js). Para activar pagos reales haría falta:

1. **Un servidor propio** (por ejemplo, una función serverless) con cuentas de usuario, porque el saldo de diamantes comprados no puede vivir solo en el navegador (`localStorage` se puede editar).
2. **Una pasarela de pago**: Stripe Checkout para la web, o Google Play Billing / App Store In-App Purchase si se publica como app.
3. **Validación en el servidor**: la pasarela avisa por *webhook* (o se valida el recibo de la tienda); solo entonces el servidor abona los diamantes y el juego consulta el saldo.
4. **Requisitos legales**: precios con IVA, política de reembolsos, términos de uso y, si el público es joven, control parental y límites de gasto.

Regla del juego: con dinero real solo se compran diamantes o artículos concretos, **nunca tiradas aleatorias**; la ruleta se juega solo con fichas ganadas jugando.

## Puntuación y récord

- **Multiplicador de pavos x1-x5**: sube con las esquivas al límite («¡Por los pelos!», 3 por nivel) y baja si pasas unos segundos sin arriesgar. Se ve junto al contador de pavos, con un anillo de tiempo y puntos de carga.
- **Récord**: una bandera de cuadros y una línea dorada marcan tu récord en el escenario; al acercarte aparece «Récord a X m» y al superarlo hay celebración (confeti, fanfarria, banner).
- **Pantalla final**: distancia, pavos y récord con números que suben, el mensaje «¡Te faltaron 84 m para tu récord!» (o «¡Superaste tu récord por…!»), búsqueda máxima, esquivas al límite y multiplicador máximo.

Ajustes en el bloque `score` de `config.js`.

## Personajes

Las **cápsulas** aparecen dentro de los grupos de pavos. Al cogerla te transformas; si te golpean vuelves al jetpack básico en lugar de morir. Mientras llevas un personaje aparecen sus **iconos de habilidad y gadgets** (solo los suyos) junto a los pavos.

| Personaje | Cómo se juega | Habilidad especial | Gadgets |
|---|---|---|---|
| **Don Aurelio Vega, "El Relojero"** — atracador retirado, traje, bigote y gafas doradas | Flota: caída suave y lenta, preciso | **Tiempo bala**: todo se ralentiza y cada toque dispara hacia donde apuntas | **Pistola** con silenciador (dispara sola a lo que tienes delante) · **Chaleco** (aguanta un golpe) |
| **Vera "Chispa" Rivas** — conductora callejera, bomber naranja y trenza | Rápida y nerviosa: acelera y frena al instante, caja más pequeña | **Conducción perfecta**: baja al suelo en su deportivo "Rayo" y esquiva sola | **Nitro** (invulnerable y atraviesa todo) · **Rampa** (salto hacia un arco de pavos en lo alto) |
| **Bruno "Petardo" Tramuntana** — caótico, camisa hawaiana y barba pelirroja | Pesado: mucha inercia, empuje brutal y rebota en el suelo | **Modo furia**: atraviesa y destruye todo | **Lanzacohetes** (limpia la pantalla) · **Moto** "Jabalina" (rebota sola y aguanta un golpe) |

La **barra de habilidad especial** (panel abajo a la izquierda) se carga con los **orbes azules de experiencia** que aparecen por el recorrido (bloque `orbs` de `config.js`) y la habilidad se activa sola al llenarse; también puede salir como icono. Cada personaje tiene su propia transformación (reloj dorado, derrape con chispas, explosión), su rastro y su sonido.

Ajustes en el bloque `characters` de `config.js` (probabilidades, carga de la especial, duraciones y física de cada uno).

### Voces de los personajes (añadir tus propios audios)

Al transformarte, el personaje dice una frase en el idioma elegido. Por defecto se usa la **voz del navegador** (Web Speech API) con un tono y velocidad distintos para cada uno (`audio.voices` en `config.js`).

Para usar grabaciones propias, copia archivos **MP3** en [`audio/voces/`](audio/voces/) con estos nombres:

| Personaje | Español | Inglés |
|---|---|---|
| El Relojero | `veterano_es.mp3` | `veterano_en.mp3` |
| Chispa | `chispa_es.mp3` | `chispa_en.mp3` |
| Petardo | `petardo_es.mp3` | `petardo_en.mp3` |

Si el archivo existe se reproduce ese audio; si no, la voz del navegador. Puedes poner solo algunos (por ejemplo, solo los de español). Haz commit y push de los archivos y GitHub Pages los servirá. Las frases sugeridas están en [`audio/voces/LEEME.md`](audio/voces/LEEME.md). El botón de silencio también silencia las voces. (En la consola del navegador verás un aviso 404 por cada archivo que falte: es normal.)

## Respiros

Cuando la partida va muy rápida y tienes 4+ estrellas, tras un intervalo aleatorio (22-45 s) llega un **respiro** de 5-8 s: la policía pierde el rastro, baja la velocidad y la búsqueda, cambia la música a una más tranquila y llueven pavos. Después la tensión vuelve poco a poco. Ajustes en el bloque `respite` de `config.js`.

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
