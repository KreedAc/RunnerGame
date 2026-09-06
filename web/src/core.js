/* =====================================================================
   CORE — configurazione, utility, scena, salvataggio
   Stile: low-poly liscio con contorni scuri. Niente texture: colori
   piatti, sfaccettature e silhouette fanno tutto il lavoro.
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
  towerGap   : 26                // spazio fra l'ultimo blocco e la torre
};

/* Palette del regno di ghiaccio. Un colore, un ruolo. */
const C = {
  skyTop   : 0x1fb4dc,
  skyLow   : 0x8ad9ee,
  fog      : 0x7fcfe8,

  snow     : 0xe7f0f8,
  snowEdge : 0xb9d2e4,
  ice      : 0x5cc0dc,
  iceDark  : 0x3690b0,
  rock     : 0x77899a,
  rockDark : 0x556474,
  pine     : 0x25795c,
  trunk    : 0x6b4a35,

  stone    : 0x9aa7b4,
  stoneDark: 0x6f7d8b,
  wall     : 0x5d5470,           // i blocchi del muro
  wallDark : 0x413a52,
  chest    : 0xc98a3c,

  gold     : 0xffc93c,
  ink      : 0x241d2e,           // il contorno dei personaggi

  hero     : 0xe8944a,
  heroDark : 0xc9702c,
  skin     : 0xf3c99b,
  cloth    : 0x2f9e8f,
  boss     : 0x8e3b5c,
  bossDark : 0x63263e,
  princess : 0xf25e9c,
  gownLite : 0xff9ec4
};

/* Armi: il danno di un colpo. Decide cosa riesci a rompere. */
const WEAPONS = [
  { name: 'Pugni',    dmg: 3,   handle: null,     blade: null,     len: 0    },
  { name: 'Randello', dmg: 7,   handle: 0x8a6a3a, blade: null,     len: 0.8  },
  { name: 'Ascia',    dmg: 15,  handle: 0x8a6a3a, blade: 0xb9c6d2, len: 0.95 },
  { name: 'Spada',    dmg: 30,  handle: 0x8a6a3a, blade: 0xdfe8f2, len: 1.15 },
  { name: 'Martello', dmg: 58,  handle: 0x8a6a3a, blade: 0xffc93c, len: 1.1  },
  { name: 'Lama Rúna',dmg: 110, handle: 0x8a6a3a, blade: 0x69e8ff, len: 1.25 }
];

/* Bonus raccolti lungo la pista: valgono solo per la partita in corso. */
const BUFFS = {
  income: { name: 'Oro',      icon: '💰', step: 0.25, color: '#ffd24b' },
  rate  : { name: 'Attacco',  icon: '⚔️', step: 0.20, color: '#ff9d5c' },
  gain  : { name: 'Potenza',  icon: '⚡', step: 0.25, color: '#7cc9ff' }
};

/* Potenziamenti permanenti, comprati nel menù */
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
const SAVE_KEY = 'blockyrun.v2';

function defaultSave() {
  return {
    coins: 0, gems: 0,
    level: 1,         // la torre a cui sei arrivato
    best: 0,          // blocchi del muro sfondati, record
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

/* cielo: sfumatura verticale disegnata su canvas e usata come sfondo */
(function sky() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.00, '#' + C.skyTop.toString(16).padStart(6, '0'));
  grad.addColorStop(0.62, '#59c9e6');
  grad.addColorStop(1.00, '#' + C.skyLow.toString(16).padStart(6, '0'));
  g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.minFilter = t.magFilter = THREE.LinearFilter;
  scene.background = t;
})();
scene.fog = new THREE.Fog(C.fog, 190, 580);

const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 700);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
stage.appendChild(renderer.domElement);

/* luce chiara e satura: le ombre le fanno i contorni, non i lumi */
scene.add(new THREE.HemisphereLight(0xffffff, 0x7fa8bc, 0.86));
const sun = new THREE.DirectionalLight(0xfff4dc, 0.5);
sun.position.set(-12, 22, 10);
scene.add(sun);
const rim = new THREE.DirectionalLight(0x9fdcff, 0.28);
rim.position.set(9, 8, -14);
scene.add(rim);

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize);
resize();
