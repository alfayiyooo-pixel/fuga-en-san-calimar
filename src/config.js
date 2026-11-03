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

  // Velocidad de avance según la distancia recorrida:
  //   0 → cruiseUntil m: constante (aprender el control)
  //   después: sube suave hacia max (curva asintótica, nunca lo supera)
  speed: {
    start: 350,         // px/s durante el tramo de aprendizaje (~11 m/s)
    cruiseUntil: 1000,  // metros a velocidad constante
    rampDistance: 2600, // metros para recorrer ~63% del camino entre start y max
    max: 820,           // tope absoluto (~25,6 m/s)
    smoothing: 1.5,     // suavizado de cambios de velocidad (más alto = cambia antes)
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

  // ---------------- A PIE (sin jetpack) ----------------
  // Se empieza a pie: ESPACIO/toque = saltar (más alto si mantienes).
  // Capas de golpe: a pie → muerte · con jetpack → a pie · con personaje → jetpack.
  foot: {
    bucksMult: 2,           // multiplicador de pavos mientras no hayas cogido nunca el jetpack
    jumpVel: 620,           // px/s de impulso del salto (toque ≈ 80 px de alto)
    holdGravity: 0.42,      // gravedad mientras mantienes pulsado al subir (salto largo ≈ 180 px)
    holdTime: 0.3,          // s máximos de "salto largo"
    gravity: 2000,
    riseCut: 2.2,           // al soltar mientras subes, la subida se corta
    maxFall: 950,
    buffer: 0.12,           // s: pulsar justo antes de aterrizar también salta
    coyote: 0.1,            // s: se puede saltar justo después de dejar el suelo
    tokenReach: 175,        // altura máxima (sobre el suelo) de los pavos mientras vas a pie
    awningBounce: 1050,     // px/s de rebote al caer sobre un toldo
    loseJetInvuln: 1.6,     // s invulnerable al perder el jetpack
    // cuándo aparece el jetpack para cogerlo (m): primera vez, si lo ignoras, y tras perderlo
    jetpack: { firstAt: [250, 380], again: [450, 750], afterLoss: [250, 450] },
    // vehículos a pie: aguantan un golpe y van más rápido unos segundos
    rides: {
      from: 80, chance: 0.08, cooldown: 16,  // m, prob. por grupo de pavos, s entre vehículos
      scooter: { duration: 7, speedMult: 1.25, jumpMult: 1.08 },
      cart: { duration: 6, speedMult: 1.15, jumpMult: 0.92 },
    },
    // obstáculos de calle (sobre todo cuando vas a pie)
    street: {
      weightFoot: 6,        // peso total frente a cable (5) cuando vas a pie
      weightJet: 1.2,       // …y cuando llevas jetpack
      types: { fence: 1, trash: 1, parked: 0.8, awning: 0.55 },
      unlockAt: { fence: 0, trash: 0, parked: 60, awning: 100 },
    },
  },

  // ---------------- ENEMIGOS MENORES ----------------
  // Aparecen sobre todo al principio y con 0-1 estrellas; se van retirando
  // cuando la policía toma el relevo. Chocar con uno cuenta como golpe.
  minors: {
    weight: 4,              // peso frente a cable (5) y cartel (2) al principio
    fullUntil: 350,         // m con el peso completo
    fadeUntil: 1500,        // m a los que dejan de salir por distancia…
    floor: 0.12,            // …salvo este resto (si hay pocas estrellas)
    starMult: [1, 0.75, 0.25, 0, 0, 0], // multiplicador por estrellas (0★…5★)
    gapMult: 0.7,           // separación tras un enemigo menor (son fáciles)
    hitbox: 0.78,           // caja de choque respecto al dibujo
    types: { guard: 1, drone: 1.2, dog: 0.8, gull: 1.5, scooter: 0.9 }, // pesos (gaviotas solo en la playa)
    unlockAt: { guard: 0, drone: 30, dog: 90, gull: 0, scooter: 160 },  // m
    reward: { bucks: [4, 9], xp: 3 }, // al derrotarlos (los pavos × multiplicador)
    guard: { walkSpeed: 25, jumpRange: 330, jump: [560, 700], gravity: 1700, jumpCooldown: 1.3 },
    drone: { speed: [90, 160], bob: 18 },            // px/s hacia ti
    dog: { warnTime: 0.9, overtake: [150, 230], hop: [180, 300] }, // aviso, px/s más rápido que tú
    gull: { speed: [50, 110], wave: 34, flock: [2, 3, 3] },
    scooter: { speed: [140, 220], jumpRange: 230, jump: 560 },
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

  // ---------------- PUNTUACIÓN Y RÉCORD ----------------
  score: {
    nearMargin: 28,     // px alrededor de tu caja que cuentan como "por los pelos"
    perLevel: 3,        // esquivas al límite para subir un nivel de multiplicador
    maxMult: 5,         // multiplicador máximo de pavos
    decay: 7,           // s sin esquivas al límite para bajar un nivel
    flyEvery: 2,        // 1 de cada N pavos normales vuela hasta el contador (efecto)
    recordWarn: 200,    // metros antes del récord en los que aparece el aviso "Récord a X m"
  },

  // ---------------- EVENTOS ALEATORIOS ----------------
  // Cada cierto tiempo (aleatorio) ocurre algo: el jugador nunca sabe qué viene.
  events: {
    firstAfter: 25,         // s mínimos antes del primer evento
    interval: [30, 60],     // s entre eventos (aleatorio en el rango)
    warning: 1.6,           // s de aviso antes de que empiece
    weights: { chase: 1, billRain: 1, truck: 1, chaos: 1 },
    chase: { duration: 10, carEvery: 1.3, pairChance: 0.35, reward: 150 }, // persecución policial
    billRain: { duration: 7, rate: 18, goldChance: 0.1, gapMult: 1.4 },    // lluvia de billetes
    truck: { speed: 0.45, bills: 36, gold: 3, cases: 1, heat: 10 },        // atraco a un furgón blindado
    chaos: { duration: 12, bucksMult: 2, gapMult: 0.8 },                  // zona de caos: pavos ×2
  },

  // ---------------- RULETA FINAL ----------------
  // Se juega SOLO con fichas ganadas jugando (niveles, misiones, diaria).
  roulette: {
    cost: 1,              // fichas por tirada
    spinTime: 3.6,        // s que gira
    // w = probabilidad relativa (los gajos se ven iguales)
    prizes: [
      { id: 'bucks_s', bucks: 150, w: 26, color: '#5fcf7a' },
      { id: 'boost', w: 14, color: '#ff6b7d' },          // mejora temporal: imán al empezar la próxima partida
      { id: 'bucks_m', bucks: 400, w: 16, color: '#2fa85a' },
      { id: 'xp', xp: 150, w: 10, color: '#4fb3ff' },
      { id: 'revive', w: 12, color: '#7ff7e8' },          // sigues la partida (una vez por partida)
      { id: 'tickets', tickets: 2, w: 9, color: '#ffd23f' },
      { id: 'gems', gems: 3, w: 6, color: '#9ff8ff' },
      { id: 'bucks_l', bucks: 1000, w: 5, color: '#1b7a3c' },
    ],
    boostMagnet: 15,      // s de imán de la mejora temporal
  },

  // ---------------- RESPIROS ----------------
  // Cuando la partida está al límite (rápida y con muchas estrellas),
  // de vez en cuando la policía pierde el rastro unos segundos.
  respite: {
    minSpeed: 560,          // px/s de velocidad objetivo para considerar "muy rápido"
    minStars: 4,            // y al menos estas estrellas
    interval: [22, 45],     // s de tensión hasta el siguiente respiro (aleatorio en el rango)
    duration: [5, 8],       // s que dura (aleatorio en el rango)
    speedMult: 0.8,         // la velocidad baja a este factor
    heatDrain: 14,          // calor de búsqueda que se pierde por segundo
    minStarsAfter: 2,       // la búsqueda no baja de estas estrellas
    rainRate: 14,           // pavos por segundo en la lluvia de premio
    rainGoldChance: 0.08,   // prob. de que un pavo de la lluvia sea dorado
    recoverTime: 8,         // s en los que la tensión vuelve poco a poco
    recoverGapMult: 1.7,    // separación de obstáculos justo al terminar (vuelve a 1)
  },

  // ---------------- AUDIO ----------------
  audio: {
    sfxVolume: 0.45,
    musicVolume: 0.32,
    voiceVolume: 1,         // volumen de las frases de los personajes (los ajustes del jugador lo multiplican)
    voiceQueueWait: 1.6,    // s que una frase puede esperar en cola si otra está sonando (si no, se descarta)
    voiceGap: 0.25,         // s de silencio mínimo entre dos frases
    jetVolume: 0.06,        // volumen del siseo del jetpack al propulsar
    // voz del navegador (provisional, mientras no haya archivos en audio/voces/):
    // pitch 0-2 y rate 0.1-10 base por personaje; en cada momento se suma
    // pitch y se multiplica rate (pick = al cogerlo, special = habilidad, lose = al perderlo)
    voices: {
      veteran: { pitch: 0.55, rate: 0.82, pick: { pitch: 0, rate: 1 }, special: { pitch: -0.1, rate: 0.8 }, lose: { pitch: 0.1, rate: 0.9 } },
      pilot: { pitch: 1.5, rate: 1.2, pick: { pitch: 0, rate: 1 }, special: { pitch: 0.25, rate: 1.15 }, lose: { pitch: 0.2, rate: 1.25 } },
      wild: { pitch: 0.2, rate: 1.1, pick: { pitch: 0.1, rate: 1 }, special: { pitch: 0.3, rate: 0.8 }, lose: { pitch: 0, rate: 1.1 } },
    },
  },

  // ---------------- MÚSICA ----------------
  // Un tema por zona + menú. Generados por código salvo que exista
  // audio/musica/<pista>.mp3 (ver audio/musica/LEEME.md).
  music: {
    crossfade: 2.5,         // s de fundido cruzado al cambiar de zona
    zoneTracks: { beach: 'playa', finance: 'centro', industrial: 'industrial', hills: 'mansiones', port: 'puerto' },
    starBoost: 0.03,        // volumen extra por estrella
    tenseFrom: 3,           // estrellas desde las que entra la capa de tensión
    calm: { lowpass: 1200, volume: 1.1 }, // respiro: filtro y volumen
    // efecto de cada habilidad especial sobre la música
    //   tempo/pitch: música generada · rate: velocidad de los archivos mp3
    fx: {
      none: { tempo: 1, pitch: 1, rate: 1, lowpass: 18000, highpass: 20, distortion: 0 },
      bullettime: { tempo: 0.55, pitch: 0.84, rate: 0.7, lowpass: 1500, highpass: 20, distortion: 0 }, // Aurelio: todo se ralentiza
      drive: { tempo: 1.12, pitch: 1.06, rate: 1.08, lowpass: 18000, highpass: 220, distortion: 0 },    // Vera: más rápido y brillante
      rage: { tempo: 1.05, pitch: 1, rate: 1.03, lowpass: 9000, highpass: 20, distortion: 0.55 },       // Bruno: distorsión
    },
    // opcional por pista: { file: 'otro.mp3', loopStart: 1.2, loopEnd: 63.8 } (s) para bucles exactos
    files: {},
  },

  // ---------------- PERSONAJES ----------------
  characters: {
    capsuleChance: 0.14,    // prob. por grupo de pavos de que lleve una cápsula (con el jetpack básico)
    capsuleFrom: 100,       // metros a partir de los que aparecen cápsulas
    capsuleCooldown: 14,    // s mínimos entre cápsulas
    itemChance: 0.32,       // prob. por grupo de un icono de habilidad/gadget (con personaje)
    itemCooldown: 5,        // s mínimos entre iconos
    specialWeight: 1,       // peso de la habilidad especial frente a…
    gadgetWeight: 1.3,      // …cada gadget al elegir icono
    specialCharge: 45,      // pavos (valor base) para llenar la barra de la habilidad especial
    startCharge: 0.35,      // la barra empieza con esta fracción al transformarte
    transformInvuln: 1.2,   // s invulnerable al transformarte
    detransformInvuln: 1.8, // s invulnerable al perder el personaje
    transformSlowmo: 0.35,  // s de cámara lenta en la transformación
    hitPoliceHeat: true,    // chocar con policía protegido sube la búsqueda

    // multiplicadores de física (1 = jetpack básico); ramp = inercia del empuje
    veteran: {
      physics: { gravity: 0.82, thrust: 0.86, maxRise: 0.85, maxFall: 0.75, speed: 0.95, ramp: 1, hitbox: 0.95 },
      bulletTime: { duration: 5, timeScale: 0.4, shotCooldown: 0.12 },
      pistol: { duration: 9, range: 560, fireRate: 0.42 },
      vest: { hits: 1 },
    },
    pilot: {
      physics: { gravity: 1.25, thrust: 1.28, maxRise: 1.2, maxFall: 1.18, speed: 1.12, ramp: 0.6, hitbox: 0.85 },
      drive: { duration: 6, speedMult: 1.35, hop: 640, magnet: 170 },
      nitro: { duration: 3, speedMult: 1.6 },
      ramp: { launch: 900, tokens: 14, distance: 1.3 },
    },
    wild: {
      physics: { gravity: 1.18, thrust: 1.32, maxRise: 1.15, maxFall: 1.25, speed: 1.05, ramp: 3, hitbox: 1.1, bounce: 0.55 },
      rage: { duration: 6, speedMult: 1.25 },
      rocket: { delay: 0.45 },
      bike: { duration: 10, bounce: 620 },
    },
  },

  // ---------------- ORBES DE EXPERIENCIA ----------------
  // Cargan la habilidad especial y dan experiencia (los pavos ya no la cargan).
  orbs: {
    firstAt: 20,        // metros del primer grupo de orbes
    every: [5, 7],      // segundos de recorrido entre grupos
    cluster: 3,         // orbes por grupo
    spacing: 40,        // px entre orbes
    charge: 5,          // carga de especial por orbe (la barra se llena con characters.specialCharge)
    xp: 2,              // experiencia por orbe
    radius: 16,         // radio de recogida
  },

  // ---------------- DIAMANTES EN EL RECORRIDO ----------------
  gems: {
    every: [1500, 2500], // metros entre diamantes (aleatorio en el rango)
    firstAt: 900,        // metros mínimos para el primero
    amount: [3, 5],      // diamantes que da (aleatorio)
    slowmo: 0.9,         // s de cámara lenta al cogerlo
  },

  // ---------------- NIVELES Y PRESTIGIO ----------------
  progression: {
    maxLevel: 30,
    xpFirst: 100,         // XP para pasar del nivel 1 al 2
    xpBase: 150,          // a partir del 2: xpBase + xpStep × (nivel − 1)
    xpStep: 50,
    metersPerXp: 10,      // 1 XP cada 10 m recorridos
    levelBucks: 100,      // al subir a N: N × levelBucks pavos…
    levelTickets: 1,      // …y fichas de ruleta
    gemLevels: { 5: 10, 10: 20, 15: 10, 20: 20, 25: 10, 30: 50 }, // diamantes extra
    voucherLevels: [10, 20], // vale de "artículo de pavos gratis"
    prestigeMax: 10,
    prestigeGems: [100, 150, 200, 250, 300, 300, 300, 300, 300, 300], // por rango I…X
  },

  // ---------------- MISIONES ----------------
  missions: {
    active: 3,
    discardHours: 24,     // se puede descartar una misión gratis cada N horas
    rewards: {
      easy: { bucks: 200, xp: 40, tickets: 1 },
      medium: { bucks: 500, xp: 80, tickets: 2 },
      hard: { gems: 10, xp: 150, tickets: 3 },
    },
    // tipo → objetivo (las misiones son de una sola partida)
    pool: [
      { id: 'e_bucks', tier: 'easy', type: 'bucks', n: 150 },
      { id: 'e_dist', tier: 'easy', type: 'distance', n: 500 },
      { id: 'e_orbs', tier: 'easy', type: 'orbs', n: 12 },
      { id: 'e_near', tier: 'easy', type: 'nearMisses', n: 3 },
      { id: 'e_transform', tier: 'easy', type: 'transforms', n: 1 },
      { id: 'e_case', tier: 'easy', type: 'cases', n: 1 },
      { id: 'e_minors', tier: 'easy', type: 'minors', n: 3 },
      { id: 'e_foot', tier: 'easy', type: 'footRun', n: 400 },
      { id: 'e_ride', tier: 'easy', type: 'rides', n: 1 },
      { id: 'm_bucks', tier: 'medium', type: 'bucks', n: 400 },
      { id: 'm_dist', tier: 'medium', type: 'distance', n: 1500 },
      { id: 'm_air', tier: 'medium', type: 'air', n: 1000 },
      { id: 'm_near', tier: 'medium', type: 'nearMisses', n: 10 },
      { id: 'm_special', tier: 'medium', type: 'specials', n: 2 },
      { id: 'm_gadgets', tier: 'medium', type: 'gadgets', n: 3 },
      { id: 'm_mult', tier: 'medium', type: 'multiplier', n: 3 },
      { id: 'm_foot', tier: 'medium', type: 'footRun', n: 800 },
      // total: true → se acumula entre partidas
      { id: 'm_drones', tier: 'medium', type: 'drones', n: 10, total: true },
      { id: 'h_stars', tier: 'hard', type: 'starsSurvive', n: 20, stars: 4 },
      { id: 'h_dist', tier: 'hard', type: 'distance', n: 3000 },
      { id: 'h_gem', tier: 'hard', type: 'gems', n: 1 },
      { id: 'h_mult', tier: 'hard', type: 'multiplier', n: 5 },
      { id: 'h_air', tier: 'hard', type: 'air', n: 2000 },
      { id: 'h_respite', tier: 'hard', type: 'respites', n: 1 },
      { id: 'h_nojet', tier: 'hard', type: 'noJet', n: 1500 },
    ],
  },

  // ---------------- RECOMPENSA DIARIA ----------------
  // Ciclo de 7 días. Si un día no entras, la racha se PAUSA (no vuelve al día 1).
  daily: {
    rewards: [
      { bucks: 200 },
      { bucks: 300 },
      { tickets: 2 },
      { bucks: 500 },
      { gems: 5 },
      { bucks: 800 },
      { gems: 15, tickets: 3 },
    ],
  },

  // ---------------- TIENDA ----------------
  shop: {
    // Mejoras permanentes (pavos). Coste del nivel 1→5:
    upgradeCosts: [300, 700, 1500, 3000, 6000],
    upgrades: {
      gadgetTime: { perLevel: 0.10 },      // +10% de duración de gadgets por nivel
      capsule: { perLevel: 0.15 },         // +15% de probabilidad de cápsula
      magnet: { seconds: 1.5, radius: 0.10 }, // +1,5 s y +10% de radio del imán
      special: { seconds: 0.6 },           // +0,6 s de habilidad especial
      orbPower: { perLevel: 0.10 },        // +10% de carga por orbe
    },
    // Consumibles de un solo uso (se activan antes de la partida)
    consumables: {
      headstart: { price: 500, meters: 500, speedMult: 4.5 }, // arranque rápido
      shield: { price: 350 },              // escudo inicial (aguanta un golpe)
      transform: { price: 600 },           // empezar transformado (personaje aleatorio)
      revive: { price: 900, invuln: 2.5 }, // revivir una vez
    },
    // Packs de diamantes con dinero real — MODO SIMULADO (no se cobra nada)
    payments: { enabled: false, currency: 'EUR' },
    diamondPacks: [
      { id: 'handful', gems: 80, bonus: 0, price: 0.99 },
      { id: 'bag', gems: 450, bonus: 50, price: 4.99 },
      { id: 'briefcase', gems: 1000, bonus: 150, price: 9.99 },
      { id: 'vault', gems: 2200, bonus: 400, price: 19.99 },
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
    slowmo: 0.3,        // velocidad del mundo justo al morir (cámara lenta que se recupera)
  },
};
