# Voces de los personajes

**Guion completo para grabar** (personajes, radio y agentes, con texto y tono): [`voces.csv`](../../voces.csv) en la raíz del proyecto.

Pon aquí tus grabaciones en **MP3** con este patrón de nombre:

```
[personaje]_[momento]_[idioma].mp3
personaje: aurelio | vera | bruno
momento:   coger (al cogerlo) | habilidad (al activar su habilidad especial) | perder (al perderlo por un golpe)
idioma:    es | en
```

Si un archivo existe, el juego lo usa; si no, usa la voz del navegador (Web Speech API) con la frase de abajo.

| Archivo | Frase (respaldo) |
|---|---|
| `aurelio_coger_es.mp3` | «El tiempo es oro, querido.» |
| `aurelio_coger_en.mp3` | «Time is money, dear.» |
| `aurelio_habilidad_es.mp3` | «Todo a su debido tiempo.» |
| `aurelio_habilidad_en.mp3` | «All in due time.» |
| `aurelio_perder_es.mp3` | «Qué poco elegante.» |
| `aurelio_perder_en.mp3` | «How inelegant.» |
| `vera_coger_es.mp3` | «¡Chispa al volante!» |
| `vera_coger_en.mp3` | «Spark's behind the wheel!» |
| `vera_habilidad_es.mp3` | «¡Agárrate!» |
| `vera_habilidad_en.mp3` | «Hold on tight!» |
| `vera_perder_es.mp3` | «¡Mi pintura!» |
| `vera_perder_en.mp3` | «My paint job!» |
| `bruno_coger_es.mp3` | «¡Que empiece la fiesta!» |
| `bruno_coger_en.mp3` | «Let the party start!» |
| `bruno_habilidad_es.mp3` | «¡¡PETARDOOO!!» |
| `bruno_habilidad_en.mp3` | «BOOM TIME!» |
| `bruno_perder_es.mp3` | «¡Eso ha dolido!» |
| `bruno_perder_en.mp3` | «That hurt!» |

Consejos: 1-2 segundos, sin silencio al principio ni al final, volumen normalizado (unos -3 dB de pico).
Las frases nunca se solapan: si una está sonando, la siguiente espera un momento o se descarta.

## Radio Calimar (locutor)

Patrón: `radio_[momento]_[idioma].mp3` es la frase 1 y `radio_[momento]_[n]_[idioma].mp3` la frase n (2-4),
para que el audio coincida con el rótulo.
Momentos: `inicio`, `estrellas`, `zona`, `record`, `helicoptero`, `jefe`, `escondite`, `detenido`.
Se reproducen con un filtro de "radio" y la música baja mientras suenan. Las frases de respaldo
están en `src/i18n/translations.js` (claves `radio.<momento>.<n>`).

## Agentes a pie

Patrón: `policia_grito_[n]_[idioma].mp3` (n de 1 a 8). Frases en `voces.csv`.
