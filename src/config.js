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

  // Física del jetpack básico (los personajes la multiplican con sus "mods").
  // Ajustable en vivo con ?debug (panel de deslizadores).
  player: {
    screenX: 0.26,      // posición horizontal en pantalla (fracción del ancho)
    width: 30,          // caja de colisión
    height: 50,
    gravity: 1500,      // aceleración hacia abajo (px/s²)
    thrust: 3450,       // empuje del jetpack (px/s²). Neto al subir = thrust - gravity
    brakeBoost: 2.2,    // multiplica el empuje si pulsas mientras caes (frena la caída al instante)
    riseCut: 2.4,       // multiplica la gravedad si sueltas mientras subes (evita "pasarse" de altura)
    thrustRampUp: 0.025, // s hasta empuje completo al pulsar (casi inmediato)
    thrustRampDown: 0.04, // s hasta apagar el empuje al soltar (un poco de inercia)
    maxRise: 400,       // velocidad máxima de subida (px/s)
    maxFall: 520,       // velocidad máxima de caída (px/s)
    ceilingSoft: 26,    // px bajo el techo en los que el empuje se va apagando
    ceilingBounce: 0.3, // rebote al tocar el techo (0 = se queda, 1 = rebote total)
    groundBounce: 0.18, // rebote al caer al suelo rápido
    bounceMin: 260,     // velocidad mínima de caída para rebotar en el suelo
    hardLanding: 480,   // velocidad de caída a partir de la cual el aterrizaje tiembla
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

  // Calidad gráfica (menú → Calidad). 'auto' baja a 'low' si va lento.
  quality: {
    default: 'auto',
    autoMinFps: 48,     // por debajo de estos FPS…
    autoWindow: 4,      // …durante estos segundos, pasa a calidad baja
    high: { maxDpr: 2, particles: 1, detail: true },
    low: { maxDpr: 0.8, particles: 0.5, detail: false }, // maxDpr < 1 = resolución reducida
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
  },

  obstacles: {
    // probabilidad relativa de los obstáculos civiles (la policía depende
    // de las estrellas: ver wanted.levels)
    weights: { cable: 5, billboard: 2 },
    // metros a partir de los que aparece cada tipo
    unlockAt: { cable: 0, billboard: 70, car: 0, missile: 0, heli: 0 },
    // multiplicador de peso por zona
    zoneWeights: {
      beach: {},
      finance: { billboard: 2 },
      industrial: { cable: 1.6 },
      hills: { car: 1.7 },
      port: { missile: 1.6, heli: 1.3 },
    },
    hitboxShrink: 0.72,  // caja del jugador más pequeña que el dibujo (perdona roces)

    cable: { minLen: 110, maxLen: 230, thickness: 10, spinFrom: 0.35, spinChance: 0.3 },
    billboard: { gravity: 2100, triggerTime: 0.75, wobble: 0.28 },
    car: { minSpeed: 200, maxSpeed: 380, warnTime: 1.0 },
    missile: { warnTime: 1.25, lockTime: 0.45, speed: 980 },
    heli: {
      life: 8.5,         // segundos que patrulla
      detectTime: 0.45,  // segundos dentro del foco hasta detectarte
      windup: 0.4,       // aviso antes de disparar
      burst: 3,          // disparos por ráfaga (+ heliShots del nivel de estrellas)
      shotInterval: 0.2,
      bulletSpeed: 560,
      cooldown: 1.4,
    },
  },

  // ---------------- NIVEL DE BÚSQUEDA (estrellas) ----------------
  wanted: {
    // calor necesario para llenar cada estrella: 1ª fácil … 5ª muy difícil
    starCost: [16, 28, 45, 70, 110],
    fillSpeed: 9,         // calor/s máximo que entra en la barra (se llena poco a poco)
    carryOver: 0.25,      // parte del calor sobrante que pasa a la siguiente estrella
    starPause: 1.5,       // s sin llenarse tras ganar una estrella
    decayDelay: 6,        // s sin incidentes para empezar a "despistar" a la policía
    decayRate: 2.0,       // calor/s que se pierde al despistarlos (puede quitar estrellas)
    dropBuffer: 0.35,     // para perder una estrella hay que bajar este % de su coste por debajo
    warnAt: 0.8,          // al 80% de una estrella: aviso visual y sonoro
    warnBeepEvery: 0.7,   // s entre pitidos de aviso
    // qué sube la búsqueda
    heat: {
      tokenBill: 0.3,     // cada pavo (robar llama la atención)
      tokenGold: 2.5,     // billete dorado
      tokenCase: 9,       // maletín
      billboardCrash: 4,  // un cartel se estrella (caos)
      carPass: 4,         // una patrulla te ve pasar
      heliSpotted: 9,     // el foco del helicóptero te detecta
      hitPolice: 12,      // chocar con policía con escudo (fase d)
    },
    // policía que aparece en cada nivel (índice = nº de estrellas)
    //   car/missile/heli: peso relativo de cada obstáculo policial (0 = no aparece)
    //   gapMult: multiplicador de la separación entre obstáculos
    //   carPair: prob. de que vengan dos patrullas seguidas
    //   volley: misiles por salva   heliShots: disparos extra por ráfaga
    levels: [
      { car: 0, missile: 0, heli: 0, gapMult: 1.0, carPair: 0, volley: 1, heliShots: 0 },     // 0★ sin policía
      { car: 1.2, missile: 0, heli: 0, gapMult: 0.97, carPair: 0, volley: 1, heliShots: 0 },  // 1★ alguna patrulla
      { car: 1.8, missile: 1.0, heli: 0, gapMult: 0.93, carPair: 0.15, volley: 1, heliShots: 0 }, // 2★ + misiles
      { car: 2.0, missile: 1.3, heli: 1.0, gapMult: 0.88, carPair: 0.3, volley: 2, heliShots: 0 }, // 3★ + helicóptero
      { car: 2.4, missile: 1.7, heli: 1.2, gapMult: 0.83, carPair: 0.45, volley: 2, heliShots: 1 }, // 4★
      { car: 3.0, missile: 2.2, heli: 1.6, gapMult: 0.76, carPair: 0.6, volley: 3, heliShots: 2 },  // 5★ persecución intensa
    ],
  },

  // ---------------- PAVOS (tokens) ----------------
  tokens: {
    firstAt: 10,          // metros del primer grupo
    groupEvery: [2, 4],   // segundos de recorrido entre el inicio de un grupo y el siguiente
    minGap: 90,           // px mínimos entre el final de un grupo y el siguiente
    spacing: 34,          // px entre pavos dentro de un grupo
    size: [7, 13],        // nº de pavos por grupo al empezar [mín, máx]…
    sizeAtMax: [10, 18],  // …y con dificultad máxima
    riskSizeMult: 1.6,    // grupos junto a obstáculos: este multiplicador de tamaño
    obstacleMargin: 10,   // px de margen entre un pavo y un cable (menos = más arriesgado)
    radius: 13,           // radio de recogida de cada pavo
    // probabilidad relativa de cada patrón
    patterns: { line: 3, wave: 3, stairs: 2, zigzag: 2, block: 1.4, arrow: 1.1, word: 0.5 },
    wordFrom: 150,        // metros a partir de los que aparecen palabras
    words: {
      es: ['PAVOS', 'SAN CALIMAR', 'FUGA'],
      en: ['BUCKS', 'SAN CALIMAR', 'CASH'],
    },
    values: { bill: 1, gold: 10, case: 50 },
    goldChance: 0.22,     // prob. de que un grupo lleve un billete dorado
    caseChance: 0.05,     // prob. de maletín en un grupo normal…
    caseRiskChance: 0.16, // …y en un grupo junto a un obstáculo
    caseFrom: 200,        // metros a partir de los que puede salir un maletín
    chainWindow: 0.7,     // s máximos entre pavos para encadenar (sube el tono)
    magnet: {
      chance: 0.06,       // prob. por grupo de que aparezca un imán
      from: 250,          // metros a partir de los que puede salir
      duration: 8,        // segundos de efecto
      radius: 260,        // alcance en px
      pullSpeed: 900,     // velocidad a la que vuelan los pavos hacia ti
    },
  },

  death: {
    slowdown: 2.2,      // frenada tras el golpe
    overDelay: 1.5,     // s hasta la pantalla final
  },
};
