# Música del juego

Pon aquí pistas en **MP3** con estos nombres para sustituir la música generada por código.
Si el archivo existe se usa (en bucle); si no, suena el tema generado.

| Archivo | Dónde suena | Estilo del tema generado |
|---|---|---|
| `serenata_mexicana.mp3` | Menú y pantalla final | Serenata: vals ranchero con violines, trompetas, vihuela y guitarrón |
| `playa.mp3` | Playa Coral | Relajado y soleado, guitarra y ritmo veraniego |
| `centro.mp3` | Distrito Lingote (centro financiero) | Electrónica nocturna, sintes y bajo potente |
| `industrial.mp3` | Las Chimeneas (barrio industrial) | Ritmo duro y metálico, percusión pesada |
| `mansiones.mp3` | Colinas Brisa (mansiones) | Funk/soul elegante |
| `puerto.mp3` | Puerto Ancla | Tensa y misteriosa, de película de atracos |
| `aurelio.mp3` | Transformado en Aurelio | Corrido norteño: polka con acordeón y bajo sexto |
| `vera.mp3` | Transformado en Vera | Corrido de mariachi en 6/8: trompetas, vihuela y violines |
| `bruno.mp3` | Transformado en Bruno | Corrido bravo en menor: tuba, acordeón y trompetas |

El menú usa ahora `serenata_mexicana.mp3` (configurado en `src/config.js` → `music.files.menu`,
con el bucle cortado antes del silencio final y su volumen igualado con `gain`).

Los temas de personaje entran con un fundido al transformarte y, al perder el personaje, vuelve la
música de la zona (`music.charTracks` y `music.charFade`). Se mezclan con las estrellas igual que
los de zona: con 1★ entran más instrumentos y desde 3★ más percusión.

Para que el bucle no tenga cortes:
- Exporta la pista para que el final enlace con el principio (mismo tempo y compás).
- Los MP3 añaden unos milisegundos de silencio al principio y al final. Si se nota el salto,
  indica el bucle exacto en `src/config.js` → `music.files`, por ejemplo:
  `playa: { loopStart: 0.05, loopEnd: 64.05 }` (en segundos).

Con archivo propio, las capas dinámicas se aplican con filtros y velocidad: el respiro filtra y baja
el volumen, el tiempo bala de Aurelio ralentiza la pista, Vera la acelera un poco y Bruno la distorsiona.

Sin conexión: el service worker (`sw.js`) guarda todas estas pistas al instalarse la app. Si añades
una pista nueva con otro nombre, añádela a la lista `OPTIONAL` de `sw.js` y sube `VERSION`.

## Créditos
Si una pista tiene una licencia que pide atribución (p. ej. CC BY), añade una entrada en
`src/credits.js` → `music`:

```js
{ track: 'menu', title: 'Serenata mexicana', author: 'Nombre del autor', license: 'CC BY 4.0', url: 'https://…' },
```

`track` es el nombre de la pista de la tabla (`menu`, `playa`, …, `aurelio`, `vera`, `bruno`).
Aparece en ⚙ Ajustes → Créditos.
