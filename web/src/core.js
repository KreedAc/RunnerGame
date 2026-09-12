/* =====================================================================
   CORE — configurazione, temi, rinascita, scena, salvataggio
   Stile: low-poly liscio con contorni scuri e ombre proiettate.
   ===================================================================== */

const CFG = {
  trackWidth : 8,
  laneX      : [-2.4, 0, 2.4],   // tre corsie: la scelta di ogni riga
  laneLimit  : 2.7,
  speed      : 15,               // unità/sec alla prima torre
  speedStep  : 0.7,              // quanto accelera ad ogni torre...
  speedMax   : 21,               // ...fino a qui
  rowSpacing : 30,
  firstRowZ  : -42,
  runOut     : 46,               // dall'ultima riga al muro della torre
  strafe     : 2.0,              // quanto corre l'eroe rispetto al dito

  wallRows   : 30,               // quanti blocchi separano dalla torre
  wallGap    : 4.5,
  towerGap   : 26,               // spazio fra l'ultimo blocco e la torre

  shadows    : true              // ombre proiettate: spegnere su fascia bassa
};

/* Palette corrente. La riempie applyTheme(): i personaggi restano
   sempre uguali, cambia il mondo attorno. */
const C = {
  gold     : 0xffc93c,
  ink      : 0x241d2e,           // il contorno dei personaggi

  hero     : 0x9c5a2c,
  heroDark : 0x6f3c1c,
  skin     : 0xf3c99b,
  cloth    : 0x2f9e8f,
  clothDark: 0x1f6f66,
  boss     : 0x8e3b5c,
  bossDark : 0x63263e,
  princess : 0xf25e9c,
  gownLite : 0xff9ec4,

  stone    : 0x9aa7b4,
  stoneDark: 0x6f7d8b,
  wall     : 0x5d5470,           // i blocchi del muro
  wallDark : 0x413a52,
  chest    : 0xc98a3c
};

/* Le zone. Cambiano ogni torre e sono l'unica differenza fra un
   livello e l'altro sul piano visivo: la pista resta la stessa,
   il mondo attorno no.

   Otto zone, cioè otto torri prima di rivedere la prima: una zona costa
   diciotto numeri e si nota molto più di quanto costa. Quasi tutte sono
   solo palette; due chiedono qualcosa in più al mondo e lo dicono con un
   campo — `lava` accende il vulcano e le colate, `floating` stacca da
   terra un pezzo di paesaggio. Chi non li ha non paga niente. */
const THEMES = [
  { key: 'z.ice',
    skyTop: 0x1fb4dc, skyMid: 0x59c9e6, skyLow: 0x8ad9ee, fog: 0x7fcfe8,
    ground: 0xe7f0f8, groundEdge: 0xb9d2e4, cap: 0xffffff,
    slab: 0x5cc0dc, slabDark: 0x3690b0,
    rock: 0x77899a, rockDark: 0x556474,
    tree: 0x25795c, trunk: 0x6b4a35, snowy: true,
    cloud: 0xffffff, hemiSky: 0xffffff, hemiI: 0.72, sunI: 0.72 },

  { key: 'z.wood',
    skyTop: 0xe08a3c, skyMid: 0xf0b060, skyLow: 0xf7d69a, fog: 0xf2c98c,
    ground: 0xd8b47c, groundEdge: 0xb08d58, cap: 0xe8c78e,
    slab: 0x9c6b3c, slabDark: 0x744d2a,
    rock: 0x8a6a52, rockDark: 0x63483a,
    tree: 0xc4522e, trunk: 0x5c3b26, snowy: false,
    cloud: 0xffe6c4, hemiSky: 0xfff0d8, hemiI: 0.74, sunI: 0.66 },

  { key: 'z.bone',
    skyTop: 0x3fa8d8, skyMid: 0x8fd0e8, skyLow: 0xf0e2b8, fog: 0xecdcae,
    ground: 0xf0dfae, groundEdge: 0xd4bd85, cap: 0xf7ecc8,
    slab: 0xdcc48c, slabDark: 0xb59c64,
    rock: 0xc4b08a, rockDark: 0x998a68,
    tree: 0x7a9448, trunk: 0x6b5334, snowy: false,
    cloud: 0xfff6e0, hemiSky: 0xfffaf0, hemiI: 0.78, sunI: 0.7 },

  { key: 'z.rune',
    skyTop: 0x18143a, skyMid: 0x2e2662, skyLow: 0x5b4a9c, fog: 0x453a7e,
    ground: 0x4a4270, groundEdge: 0x342e52, cap: 0x7f74c0,
    slab: 0x3a3268, slabDark: 0x272248,
    rock: 0x4c4470, rockDark: 0x352f52,
    tree: 0x2c6a72, trunk: 0x3a2f4a, snowy: false,
    cloud: 0x9d92d8, hemiSky: 0xa8b8ff, hemiI: 0.5, sunI: 0.34 },

  /* Il vulcano è l'unica zona che aggiunge roba al mondo invece di
     ricolorarla: un cono enorme all'orizzonte col cratere acceso, e le
     colate ai lati della pista. La luce è bassa apposta — quello che
     illumina qui è la lava, che non è una luce ma un materiale non
     illuminato, cioè la cosa più economica che ci sia. */
  { key: 'z.lava',
    skyTop: 0x2a0f16, skyMid: 0x7a2716, skyLow: 0xd4561f, fog: 0x8a3418,
    ground: 0x4a3a3c, groundEdge: 0x2e2426, cap: 0xff7a2a,
    slab: 0x3d3034, slabDark: 0x261e22,
    rock: 0x4e3c3a, rockDark: 0x2c2223,
    tree: 0x5a2a1e, trunk: 0x2b1d18, snowy: false,
    cloud: 0x8a4028, hemiSky: 0xff9a5a, hemiI: 0.52, sunI: 0.42,
    lava: 0xff5a1e, lavaHot: 0xffc23c },

  { key: 'z.ash',
    skyTop: 0x333a40, skyMid: 0x596169, skyLow: 0x969c92, fog: 0x7e847c,
    ground: 0x5c6156, groundEdge: 0x3e433c, cap: 0xd8dacc,
    slab: 0x4a4f47, slabDark: 0x32362f,
    rock: 0x565a50, rockDark: 0x3b3f36,
    tree: 0x6d7a4a, trunk: 0x2f2a22, snowy: false,
    cloud: 0xb4b8ac, hemiSky: 0xd4d8cc, hemiI: 0.62, sunI: 0.44 },

  { key: 'z.glass',
    skyTop: 0x6a4aa8, skyMid: 0x9c7ad0, skyLow: 0xd8e8f4, fog: 0xc7d8ee,
    ground: 0xb2bade, groundEdge: 0x8088c0, cap: 0xdff6ff,
    slab: 0x9a9cd8, slabDark: 0x6a6aa8,
    rock: 0xaeb4de, rockDark: 0x7b80b4,
    tree: 0x58d8e0, trunk: 0x7e8ea8, snowy: false,
    cloud: 0xf0e4ff, hemiSky: 0xe8f4ff, hemiI: 0.8, sunI: 0.66 },

  { key: 'z.sky',
    skyTop: 0x0f2a6a, skyMid: 0x2f6ac0, skyLow: 0x8fd0f0, fog: 0x9fd4ee,
    ground: 0x8ea86a, groundEdge: 0x6a8450, cap: 0xfdfdfd,
    slab: 0x8d7a62, slabDark: 0x64543f,
    rock: 0x9a8a72, rockDark: 0x6d5f4c,
    tree: 0x3f8a4e, trunk: 0x5c4430, snowy: false,
    cloud: 0xffffff, hemiSky: 0xffffff, hemiI: 0.85, sunI: 0.78,
    floating: true }
];

const themeFor = lvl => THEMES[(lvl - 1) % THEMES.length];

/* Armi. `hit` non è un danno assoluto ma un multiplo del passo della
   torre (vedi trackUnit): l'ascia vale sempre 1.6 colonne facili, sia
   alla prima torre che alla ventesima. Così un'arma migliore apre corsie
   — che è il suo mestiere — invece di moltiplicare il bottino.
   `shape` conta quanto il danno: l'arma sta a terra da raccogliere e si
   deve riconoscere a colpo d'occhio quale stai per prendere. */
/* I nomi non sono scritti qui ma in i18n.js: un dato che porta dentro
   una lingua non si può tradurre. `weaponName(tier)` li risolve al
   momento dell'uso. */
const WEAPONS = [
  { key: 'w.fists',  hit: 0.85, shape: null,     handle: null,     blade: null,     len: 0    },
  { key: 'w.club',   hit: 1.20, shape: 'club',   handle: 0x8a6a3a, blade: 0x6b4a35, len: 0.85 },
  { key: 'w.axe',    hit: 1.60, shape: 'axe',    handle: 0x8a6a3a, blade: 0xb9c6d2, len: 1.0  },
  { key: 'w.sword',  hit: 2.10, shape: 'sword',  handle: 0x8a6a3a, blade: 0xdfe8f2, len: 1.2  },
  { key: 'w.hammer', hit: 2.70, shape: 'hammer', handle: 0x8a6a3a, blade: 0xffc93c, len: 1.15 },
  { key: 'w.rune',   hit: 3.50, shape: 'sword',  handle: 0x3a2a4a, blade: 0x69e8ff, len: 1.35 }
];

const weaponName = tier => t(WEAPONS[clamp(tier, 0, WEAPONS.length - 1)].key);

/* Bonus raccolti lungo la pista: valgono solo per la partita in corso. */
const BUFFS = {
  income: { key: 'b.gold',   icon: '💰', step: 0.25, color: '#ffd24b' },
  rate  : { key: 'b.attack', icon: '⚔️', step: 0.20, color: '#ff9d5c' },
  gain  : { key: 'b.power',  icon: '⚡', step: 0.25, color: '#7cc9ff' }
};

/* Potenziamenti permanenti, comprati nel menù (azzerati dalla rinascita).
   POTENZA e ORO sono moltiplicatori composti: +10% e +8% ad ogni livello,
   per sempre. Erano somme fisse (20 + 14×liv), e a partire dalla quinta
   torre valevano meno di un arrotondamento — l'unica cosa che contava era
   l'ARMA, che però finisce a sei tacche. Da lì il gioco moriva. */
const UPGRADES = {
  power : { key: 'up.power',  base: 55,  mult: 1.34, max: 300, value: l => Math.pow(1.10, l) },
  weapon: { key: 'up.weapon', base: 420, mult: 3.00, max: WEAPONS.length - 1, value: l => l },
  income: { key: 'up.income', base: 90,  mult: 1.34, max: 300, value: l => Math.pow(1.08, l) }
};

const upgradeCost = (key, level) =>
  Math.round(UPGRADES[key].base * Math.pow(UPGRADES[key].mult, level));

/* La potenza con cui si parte: un fondo di magazzino, tutto il resto si
   raccoglie correndo. */
const START_POWER = 30;

/* Quanta potenza serve per liberare la principessa della torre N.
   Il 62% se ne va nel muro, il 38% resta da spendere contro il boss:
   arrivare non basta, bisogna arrivarci con qualcosa in mano. */
const towerNeed  = lvl => Math.round(430 * Math.pow(1.62, lvl - 1));
const wallBudget = lvl => Math.round(towerNeed(lvl) * 0.62);
const bossHealth = lvl => Math.round(towerNeed(lvl) * 0.38);

/* ---------------------------- IL PASSO DELLA PISTA --------------------
   Prima le colonne erano tarate sull'arma del giocatore: comprare
   un'arma raddoppiava sia quello che potevi rompere sia quello che
   valeva. Ogni tacca d'arma regalava una torre e mezza, e le torri 2-5
   cadevano al primo tentativo.

   Adesso le colonne sono tarate sulla TORRE. `trackUnit` è il numero da
   cui discendono tutti gli altri: la colonna facile vale 0,55-0,95 unità,
   quelle dure 1,3-2,6. L'arma decide quante corsie riesci ad aprire — al
   massimo il doppio di bottino, non il doppio per tacca — e il resto lo
   fanno i potenziamenti.

   BASE_SHARE: quanto copre una corsa nuda alla prima torre. Più è bassa,
               più potenziamenti servono ad ogni torre — alza tutta la
               curva in blocco, prima torre compresa.
   LEVEL_GAP : quanto in più chiede ogni torre rispetto alla precedente,
               al netto di quello che la pista dà da sola. Inclina la
               curva: alzarla non tocca le prime torri e fa esplodere la
               coda, quindi è la manopola sbagliata per "è troppo facile
               all'inizio". */
const BASE_SHARE = 0.42;
const LEVEL_GAP  = 1.34;
const trackRows  = lvl => Math.min(20, 10 + lvl);
const trackUnit  = lvl => towerNeed(lvl) * BASE_SHARE /
                          (trackRows(lvl) * 3 * 0.75 * Math.pow(LEVEL_GAP, lvl - 1));

/* Lo scrigno nel muro: quanto costa in potenza e quanto rende in oro,
   tutti e due in multipli del costo normale di quella corsia. È la
   scelta del muro — rompo il blocco economico, o pago il triplo per
   riempire la borsa? */
const CHEST_PRICE = 2.2;
const CHEST_LOOT  = 3.0;

/* Le torri alte si corrono anche più in fretta: meno tempo per decidere
   la corsia. Sale piano e si ferma, altrimenti il muro diventa una
   lotteria di riflessi. */
const speedFor = lvl => Math.min(CFG.speedMax, CFG.speed + (lvl - 1) * CFG.speedStep);

/* -------------------------------- RINASCITA ---------------------------
   I potenziamenti crescono in modo logaritmico col denaro, le torri in
   modo esponenziale: prima o poi ci si ferma. La rinascita è l'uscita —
   riparti dalla prima torre, ma ogni runa vale +25% su potenza e oro
   per sempre. Le rune si tengono e si sommano fra una rinascita e l'altra. */
const RUNE_BONUS = 0.25;
const runeMul    = runes => 1 + runes * RUNE_BONUS;
const runeGain   = lvl => Math.max(0, lvl - 1);      // torri già superate

/* ------------------------------- UTIL ------------------------------- */
const rnd   = (a, b) => a + Math.random() * (b - a);
const rint  = (a, b) => Math.floor(rnd(a, b + 1));
const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp  = (a, b, t) => a + (b - a) * t;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rint(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + 'M'
              : n >= 1e4 ? Math.round(n / 1e3) + 'K'
              : String(Math.round(n));

/* ---------------------------- SALVATAGGIO ---------------------------- */
/* localStorage può mancare del tutto (finestra privata, dati bloccati):
   ogni accesso è protetto e il gioco parte comunque da capo.            */
const SAVE_KEY = 'torredighiaccio.v3';

function defaultSave() {
  return {
    coins: 0, gems: 0, runes: 0,
    level: 1,         // la torre a cui sei arrivato
    bestLevel: 1,     // la più lontana mai raggiunta
    rebirths: 0,
    best: 0,          // blocchi del muro sfondati, record sulla torre corrente
    last: 0,          // e quelli dell'ultima corsa
    lastCoins: 0, lastRecord: false, lastOutcome: '',
    /* il diario della salita: quanti tentativi è costata ogni torre.
       Serve a tarare la difficoltà su una partita vera invece che sul
       simulatore, senza chiedere a nessuno di tenere il conto a mente. */
    tries: 0,            // tentativi sulla torre corrente
    towerRevived: 0,     // su questa torre hai usato la seconda occasione?
    diary: [],           // { l: torre, t: tentativi, r: seconda occasione }
    up: { power: 0, weapon: 0, income: 0 }
  };
}

/* Un numero rotto dentro il salvataggio si porta dietro tutto il resto:
   basta un NaN — che JSON scrive `null` — e da lì in poi ogni somma è NaN,
   l'oro sparisce dal portafoglio e non si compra più niente. È successo
   davvero, per un premio degli scrigni che moltiplicava un campo
   inesistente. Al caricamento ogni numero che non è un numero torna al
   suo valore di partenza: il salvataggio si ripara da solo invece di
   costringere a ricominciare. */
function sanaNumeri(dato, modello) {
  for (const k of Object.keys(modello)) {
    const atteso = modello[k];
    if (typeof atteso === 'number') {
      if (typeof dato[k] !== 'number' || !isFinite(dato[k])) dato[k] = atteso;
    } else if (typeof atteso === 'boolean') {
      if (typeof dato[k] !== 'boolean') dato[k] = atteso;
    } else if (Array.isArray(atteso)) {
      if (!Array.isArray(dato[k])) dato[k] = atteso;
    } else if (atteso && typeof atteso === 'object') {
      if (!dato[k] || typeof dato[k] !== 'object') dato[k] = atteso;
      else sanaNumeri(dato[k], atteso);
    }
  }
  return dato;
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const s = JSON.parse(raw);
    const base = defaultSave();
    return sanaNumeri(Object.assign(base, s, { up: Object.assign(base.up, s.up) }),
                      defaultSave());
  } catch (e) {
    return defaultSave();
  }
}

function writeSave(s) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) { /* niente da fare */ }
}

/* ------------------------- SCENA / RENDERER -------------------------- */
const stage = document.getElementById('stage');
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x7fcfe8, 190, 580);

const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 700);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
if (CFG.shadows) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}
stage.appendChild(renderer.domElement);

/* cielo: sfumatura verticale disegnata su canvas e usata come sfondo */
let skyTex = null;
function paintSky(t) {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  const hexOf = n => '#' + n.toString(16).padStart(6, '0');
  grad.addColorStop(0.00, hexOf(t.skyTop));
  grad.addColorStop(0.60, hexOf(t.skyMid));
  grad.addColorStop(1.00, hexOf(t.skyLow));
  g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
  if (skyTex) skyTex.dispose();
  skyTex = new THREE.CanvasTexture(c);
  skyTex.minFilter = skyTex.magFilter = THREE.LinearFilter;
  scene.background = skyTex;
}

/* luce: una chiave che proietta le ombre, un riempimento freddo, e
   l'emisferica che tiene su i toni. */
const hemi = new THREE.HemisphereLight(0xffffff, 0x7fa8bc, 0.72);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4dc, 0.72);
sun.position.set(-16, 34, 18);
scene.add(sun);
scene.add(sun.target);
const rim = new THREE.DirectionalLight(0x9fdcff, 0.24);
rim.position.set(9, 8, -14);
scene.add(rim);

if (CFG.shadows) {
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera;
  sc.left = -26; sc.right = 26; sc.top = 30; sc.bottom = -22;
  sc.near = 6; sc.far = 110;
  sun.shadow.bias = -0.0012;
  sun.shadow.normalBias = 0.02;
}

/* La luce direzionale ha un riquadro d'ombra piccolo per restare nitida:
   deve seguire l'eroe, altrimenti le ombre spariscono dopo venti metri. */
function moveSun(x, z) {
  sun.position.set(x - 16, 34, z + 20);
  sun.target.position.set(x, 0, z - 6);
  sun.target.updateMatrixWorld();
}

/* Applica una zona: cielo, nebbia e colori del mondo. */
function applyTheme(theme) {
  C.ground = theme.ground; C.groundEdge = theme.groundEdge; C.cap = theme.cap;
  C.slab = theme.slab; C.slabDark = theme.slabDark;
  C.rock = theme.rock; C.rockDark = theme.rockDark;
  C.tree = theme.tree; C.trunk = theme.trunk;
  C.snowy = theme.snowy;
  C.cloud = theme.cloud;
  /* i due campi facoltativi: vanno spenti, non solo accesi, altrimenti la
     zona dopo si porta dietro il vulcano di quella prima */
  C.lava = theme.lava || 0;
  C.lavaHot = theme.lavaHot || 0;
  C.floating = !!theme.floating;
  paintSky(theme);
  scene.fog.color.setHex(theme.fog);
  hemi.groundColor.setHex(theme.rockDark);
  hemi.color.setHex(theme.hemiSky);
  hemi.intensity = theme.hemiI;
  sun.intensity  = theme.sunI;
}

/* ------------------------- INQUADRATURA COSTANTE ----------------------
   Il FOV di three.js è verticale: tenendolo fisso, la larghezza di mondo
   inquadrata dipende dalla forma dello schermo. Tre corsie larghe 8 unità
   occupavano il 117% della larghezza sul telaio su cui è stato disegnato
   il gioco, il 102% su un telefono in browser (la barra degli indirizzi
   accorcia la pagina) e il 73% su un tablet: la stessa scena si vedeva
   piccola e lontana, e le corsie più vicine fra loro.

   Quindi si fissa la larghezza e si ricava il FOV verticale. Su schermi
   più alti si vede più strada, mai una pista più stretta. */
const FRAME_FOV    = 48;      // il FOV verticale del telaio di riferimento…
const FRAME_ASPECT = 0.467;   // …che è un telefono in verticale, 420×900
const FRAME_K = Math.tan(FRAME_FOV * Math.PI / 360) * FRAME_ASPECT;

/* Distanza tipica della camera dall'eroe: serve solo a convertire pixel in
   unità di mondo, non vale la pena inseguirne il valore esatto. */
const CAM_DIST = 14;

/* Quanto mondo vale un pixel all'altezza dell'eroe. Il controllo ci si
   basa: trascinare il dito di una certa fetta di schermo deve spostare
   l'eroe della stessa fetta, su qualunque telefono. */
function worldPerPixel() {
  const visH = 2 * Math.tan(camera.fov * Math.PI / 360) * CAM_DIST;
  return visH * camera.aspect / innerWidth;
}

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.fov = clamp(2 * Math.atan(FRAME_K / camera.aspect) * 180 / Math.PI, 28, 58);
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize);
resize();
