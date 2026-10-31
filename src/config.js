// ============================================================
//  CONFIGURACIÓN Y VALORES DE DIFICULTAD
//  Todo lo ajustable del juego está aquí. Unidades:
//  - posiciones/velocidades en píxeles lógicos (alto de pantalla = 540)
//  - tiempos en segundos
// ============================================================

export const CONFIG = {
  view: {
    height: 540,        // alto lógico fijo
    minWidth: 760,      // ancho lógico mínimo (pantallas más estrechas → bandas negras)
    maxWidth: 1280,     // ancho lógico máximo (pantallas ultra anchas → bandas negras)
    maxDpr: 2,          // límite de densidad de píxeles (rendimiento en móvil)
  },

  world: {
    groundHeight: 64,   // grosor del suelo (paseo marítimo)
    ceiling: 30,        // margen superior que el jugador no puede superar
    pxPerMeter: 32,     // cuántos píxeles son 1 metro de distancia
  },

  loop: {
    step: 1 / 120,      // paso fijo de física (s)
    maxFrameDt: 0.1,    // si un frame tarda más, se recorta (evita "saltos")
  },

  // Física del jetpack básico (los personajes la modificarán en la fase d)
  player: {
    screenX: 0.26,      // posición horizontal en pantalla (fracción del ancho)
    width: 30,          // caja de colisión
    height: 50,
    gravity: 2000,      // aceleración hacia abajo (px/s²)
    thrust: 4200,       // empuje del jetpack (px/s²). Neto al subir = thrust - gravity
    thrustRampUp: 0.07, // s hasta empuje completo al pulsar (más alto = más inercia)
    thrustRampDown: 0.05, // s hasta apagar el empuje al soltar
    maxRise: 640,       // velocidad máxima de subida
    maxFall: 880,       // velocidad máxima de caída
    hardLanding: 520,   // velocidad de caída a partir de la cual el aterrizaje tiembla
  },

  // Velocidad de avance: sube de start a max de forma asintótica
  speed: {
    start: 340,         // px/s al empezar (~10,6 m/s)
    max: 940,           // px/s máximo (~29 m/s)
    rampTime: 90,       // s para recorrer ~63% del camino entre start y max
    menu: 140,          // desplazamiento del fondo en el menú
  },

  camera: {
    shakeMax: 16,       // desplazamiento máximo del temblor (px)
    shakeDecay: 1.8,    // cuánto "trauma" se pierde por segundo
  },

  particles: {
    max: 700,           // límite de partículas simultáneas
    exhaustRate: 70,    // partículas de fuego por segundo a empuje máximo
  },
};
