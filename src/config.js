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

  // ---------------- FASE B ----------------

  zones: {
    length: 500,        // metros que dura cada zona
    transition: 45,     // metros de fundido entre zonas
  },

  difficulty: {
    fullAt: 3500,       // metros a los que la dificultad por distancia llega al 100%
  },

  spawner: {
    firstAt: 28,        // metros del primer obstáculo
    gapStart: 600,      // separación entre obstáculos al empezar (px)
    gapEnd: 260,        // separación con dificultad máxima (px)
    gapJitter: 0.35,    // variación aleatoria de la separación (±35%)
    minGapTime: 0.42,   // separación mínima en segundos de reacción
    starGapFactor: 0.06, // cada estrella reduce la separación un 6%
  },

  obstacles: {
    // probabilidad relativa de cada tipo
    weights: { cable: 5, billboard: 2, car: 2, missile: 1.6, heli: 0.9 },
    // metros a partir de los que aparece cada tipo
    unlockAt: { cable: 0, billboard: 70, car: 140, missile: 240, heli: 400 },
    // multiplicador de peso por zona
    zoneWeights: {
      beach: {},
      finance: { billboard: 2 },
      industrial: { cable: 1.6 },
      hills: { car: 1.7 },
      port: { missile: 1.6, heli: 1.3 },
    },
    policeBonusPerStar: 0.45, // cada estrella multiplica el peso policial (+45%)
    hitboxShrink: 0.72,  // caja del jugador más pequeña que el dibujo (perdona roces)

    cable: { minLen: 110, maxLen: 230, thickness: 10, spinFrom: 0.35, spinChance: 0.3 },
    billboard: { gravity: 2100, triggerTime: 0.75, wobble: 0.28 },
    car: { minSpeed: 200, maxSpeed: 380, warnTime: 1.0, doubleFromStars: 3 },
    missile: { warnTime: 1.25, lockTime: 0.45, speed: 980, volleyFromStars: 3 },
    heli: {
      life: 8.5,         // segundos que patrulla
      detectTime: 0.45,  // segundos dentro del foco hasta detectarte
      windup: 0.4,       // aviso antes de disparar
      burst: 3,          // disparos por ráfaga (+1 con 4-5 estrellas)
      shotInterval: 0.2,
      bulletSpeed: 560,
      cooldown: 1.4,
    },
  },

  wanted: {
    thresholds: [12, 32, 52, 72, 92], // "calor" necesario para cada estrella
    max: 100,
    decayDelay: 8,      // s sin incidentes antes de que baje
    decayRate: 1.5,     // calor que se pierde por segundo
    floorEvery: 900,    // cada X metros sube la estrella mínima garantizada…
    maxFloor: 3,        // …hasta este máximo
    heat: {
      heliSpotted: 22,  // un helicóptero te detecta
      carPass: 6,       // una patrulla te ve pasar
      billboardCrash: 4, // un cartel se estrella (caos)
      hitPolice: 25,    // chocar con policía con escudo (fase d)
    },
  },

  death: {
    slowdown: 2.2,      // frenada tras el golpe
    overDelay: 1.5,     // s hasta la pantalla final
  },
};
