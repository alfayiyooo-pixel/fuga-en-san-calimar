# Música del juego

Pon aquí pistas en **MP3** con estos nombres para sustituir la música generada por código.
Si el archivo existe se usa (en bucle); si no, suena el tema generado.

| Archivo | Dónde suena | Estilo del tema generado |
|---|---|---|
| `menu.mp3` | Menú y pantalla final | Tema propio del juego |
| `playa.mp3` | Playa Coral | Relajado y soleado, guitarra y ritmo veraniego |
| `centro.mp3` | Distrito Lingote (centro financiero) | Electrónica nocturna, sintes y bajo potente |
| `industrial.mp3` | Las Chimeneas (barrio industrial) | Ritmo duro y metálico, percusión pesada |
| `mansiones.mp3` | Colinas Brisa (mansiones) | Funk/soul elegante |
| `puerto.mp3` | Puerto Ancla | Tensa y misteriosa, de película de atracos |

Para que el bucle no tenga cortes:
- Exporta la pista para que el final enlace con el principio (mismo tempo y compás).
- Los MP3 añaden unos milisegundos de silencio al principio y al final. Si se nota el salto,
  indica el bucle exacto en `src/config.js` → `music.files`, por ejemplo:
  `playa: { loopStart: 0.05, loopEnd: 64.05 }` (en segundos).

Con archivo propio, las capas dinámicas se aplican con filtros y velocidad: el respiro filtra y baja
el volumen, el tiempo bala de Aurelio ralentiza la pista, Vera la acelera un poco y Bruno la distorsiona.

Si la pista tiene una licencia que pide atribución, añade autor y licencia en `src/credits.js`
(aparecen en ⚙ Ajustes → Créditos).
