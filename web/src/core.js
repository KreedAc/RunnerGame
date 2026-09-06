/* =====================================================================
   CORE — configurazione, temi, rinascita, scena, salvataggio
   Stile: low-poly liscio con contorni scuri e ombre proiettate.
   ===================================================================== */

const CFG = {
  trackWidth : 8,
  laneX      : [-2.4, 0, 2.4],   // tre corsie: la scelta di ogni riga
  laneLimit  : 2.7,
  speed      : 15,               // unità/sec
  rowSpacing : 30,
  firstRowZ  : -42,
  runOut     : 46,               // dall'ultima riga al muro della torre
  strafe     : 0.055,            // px trascinati -> unità di mondo

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
   il mondo attorno no. */
const THEMES = [
  { name: 'VALLE GELATA',
    skyTop: 0x1fb4dc, skyMid: 0x59c9e6, skyLow: 0x8ad9ee, fog: 0x7fcfe8,
    ground: 0xe7f0f8, groundEdge: 0xb9d2e4, cap: 0xffffff,
    slab: 0x5cc0dc, slabDark: 0x3690b0,
    rock: 0x77899a, rockDark: 0x556474,
    tree: 0x25795c, trunk: 0x6b4a35, snowy: true,
    cloud: 0xffffff, hemiSky: 0xffffff, hemiI: 0.72, sunI: 0.72 },

  { name: 'BOSCO ROSSO',
    skyTop: 0xe08a3c, skyMid: 0xf0b060, skyLow: 0xf7d69a, fog: 0xf2c98c,
    ground: 0xd8b47c, groundEdge: 0xb08d58, cap: 0xe8c78e,
    slab: 0x9c6b3c, slabDark: 0x744d2a,
    rock: 0x8a6a52, rockDark: 0x63483a,
    tree: 0xc4522e, trunk: 0x5c3b26, snowy: false,
    cloud: 0xffe6c4, hemiSky: 0xfff0d8, hemiI: 0.74, sunI: 0.66 },

  { name: 'DUNE D’OSSA',
    skyTop: 0x3fa8d8, skyMid: 0x8fd0e8, skyLow: 0xf0e2b8, fog: 0xecdcae,
    ground: 0xf0dfae, groundEdge: 0xd4bd85, cap: 0xf7ecc8,
    slab: 0xdcc48c, slabDark: 0xb59c64,
    rock: 0xc4b08a, rockDark: 0x998a68,
    tree: 0x7a9448, trunk: 0x6b5334, snowy: false,
    cloud: 0xfff6e0, hemiSky: 0xfffaf0, hemiI: 0.78, sunI: 0.7 },

  { name: 'NOTTE DI RÚNA',
    skyTop: 0x18143a, skyMid: 0x2e2662, skyLow: 0x5b4a9c, fog: 0x453a7e,
    ground: 0x4a4270, groundEdge: 0x342e52, cap: 0x7f74c0,
    slab: 0x3a3268, slabDark: 0x272248,
    rock: 0x4c4470, rockDark: 0x352f52,
    tree: 0x2c6a72, trunk: 0x3a2f4a, snowy: false,
    cloud: 0x9d92d8, hemiSky: 0xa8b8ff, hemiI: 0.5, sunI: 0.34 }
];

const themeFor = lvl => THEMES[(lvl - 1) % THEMES.length];

/* Armi: il danno di un colpo. Decide cosa riesci a rompere.
   `shape` conta quanto il danno: l'arma sta a terra da raccogliere e si
   deve riconoscere a colpo d'occhio quale stai per prendere. */
const WEAPONS = [
  { name: 'Pugni',     dmg: 3,   shape: null,     handle: null,     blade: null,     len: 0    },
  { name: 'Randello',  dmg: 7,   shape: 'club',   handle: 0x8a6a3a, blade: 0x6b4a35, len: 0.85 },
  { name: 'Ascia',     dmg: 15,  shape: 'axe',    handle: 0x8a6a3a, blade: 0xb9c6d2, len: 1.0  },
  { name: 'Spada',     dmg: 30,  shape: 'sword',  handle: 0x8a6a3a, blade: 0xdfe8f2, len: 1.2  },
  { name: 'Martello',  dmg: 58,  shape: 'hammer', handle: 0x8a6a3a, blade: 0xffc93c, len: 1.15 },
  { name: 'Lama Rúna', dmg: 110, shape: 'sword',  handle: 0x3a2a4a, blade: 0x69e8ff, len: 1.35 }
];

/* Bonus raccolti lungo la pista: valgono solo per la partita in corso. */
const BUFFS = {
  income: { name: 'Oro',      icon: '💰', step: 0.25, color: '#ffd24b' },
  rate  : { name: 'Attacco',  icon: '⚔️', step: 0.20, color: '#ff9d5c' },
  gain  : { name: 'Potenza',  icon: '⚡', step: 0.25, color: '#7cc9ff' }
};

/* Potenziamenti permanenti, comprati nel menù (azzerati dalla rinascita) */
const UPGRADES = {
  power : { name: 'POTENZA',  base: 45,  mult: 1.52, max: 60, value: l => 20 + l * 14 },
  weapon: { name: 'ARMA',     base: 150, mult: 2.20, max: WEAPONS.length - 1, value: l => l },
  income: { name: 'ORO',      base: 70,  mult: 1.58, max: 60, value: l => 1 + l * 0.15 }
};

const upgradeCost = (key, level) =>
  Math.round(UPGRADES[key].base * Math.pow(UPGRADES[key].mult, level));

/* Quanta potenza serve per liberare la principessa della torre N.
   Il 55% se ne va nel muro, il 45% resta da spendere contro il boss:
   arrivare non basta, bisogna arrivarci con qualcosa in mano. */
const towerNeed  = lvl => Math.round(430 * Math.pow(1.62, lvl - 1));
const wallBudget = lvl => Math.round(towerNeed(lvl) * 0.55);
const bossHealth = lvl => Math.round(towerNeed(lvl) * 0.45);

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
    up: { power: 0, weapon: 0, income: 0 }
  };
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const s = JSON.parse(raw);
    return Object.assign(defaultSave(), s, { up: Object.assign(defaultSave().up, s.up) });
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
  paintSky(theme);
  scene.fog.color.setHex(theme.fog);
  hemi.groundColor.setHex(theme.rockDark);
  hemi.color.setHex(theme.hemiSky);
  hemi.intensity = theme.hemiI;
  sun.intensity  = theme.sunI;
}

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize);
resize();
