/* =====================================================================
   CORE — configurazione, utility, texture pixel-art, scena
   ===================================================================== */

const CFG = {
  trackWidth : 8,
  laneLimit  : 2.7,
  speed      : 13.5,        // unità/sec (1 unità = 1 blocco)
  rowSpacing : 25,          // distanza fra due eventi del percorso
  firstRowZ  : -34,
  runOut     : 50,          // dall'ultimo evento al boss
  startCount : 4,           // omini iniziali
  maxCount   : 99999,
  maxRunners : 26,          // quanti omini si disegnano davvero (il resto è solo numero)
  strafe     : 0.055,       // px trascinati -> unità di mondo
  sky        : 0x79c0ff,
  fog        : 0xbde4ff
};

/* Armi: il danno per omino. Un'arma migliore = meno perdite contro i mob. */
const WEAPONS = [
  { name: 'Pugni',    dmg: 1,  wood: null,     blade: null,     len: 0    },
  { name: 'Bastone',  dmg: 2,  wood: 0x8a6a3a, blade: null,     len: 0.75 },
  { name: 'Pietra',   dmg: 4,  wood: 0x8a6a3a, blade: 0x9a9a9a, len: 0.95 },
  { name: 'Ferro',    dmg: 7,  wood: 0x8a6a3a, blade: 0xdcdce4, len: 1.05 },
  { name: 'Oro',      dmg: 11, wood: 0x8a6a3a, blade: 0xf2d24b, len: 1.05 },
  { name: 'Diamante', dmg: 16, wood: 0x8a6a3a, blade: 0x4fe3d5, len: 1.15 }
];

/* ------------------------------- UTIL ------------------------------- */
const rnd   = (a, b) => a + Math.random() * (b - a);
const rint  = (a, b) => Math.floor(rnd(a, b + 1));
const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp  = (a, b, t) => a + (b - a) * t;

const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + 'M'
              : n >= 1e4 ? Math.round(n / 1e3) + 'K'
              : String(Math.round(n));

/* --------------------------- PIXEL TEXTURES -------------------------- */
/* Tutto è disegnato su canvas a bassa risoluzione e filtrato NEAREST:
   è quello che dà il look "a blocchi" senza scaricare nessun asset.     */

function pixelTex(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const hex = n => '#' + n.toString(16).padStart(6, '0');

/* riempie con un colore base e sparge pixel dei colori variante */
function speckle(g, size, base, variants, density) {
  g.fillStyle = hex(base);
  g.fillRect(0, 0, size, size);
  const n = Math.round(size * size * density);
  for (let i = 0; i < n; i++) {
    g.fillStyle = hex(pick(variants));
    g.fillRect(rint(0, size - 1), rint(0, size - 1), 1, 1);
  }
}

/* bordo scuro sul perimetro della tile: siccome la texture si ripete una
   volta per blocco, questo disegna la griglia dei blocchi del mondo */
function tileEdge(g, size, alpha) {
  g.fillStyle = 'rgba(0,0,0,' + (alpha === undefined ? 0.14 : alpha) + ')';
  g.fillRect(0, 0, size, 1);
  g.fillRect(0, 0, 1, size);
  g.fillRect(0, size - 1, size, 1);
  g.fillRect(size - 1, 0, 1, size);
}

/* macchie più grosse: per cobblestone, foglie, mob */
function blobs(g, size, colors, count, minS, maxS) {
  for (let i = 0; i < count; i++) {
    g.fillStyle = hex(pick(colors));
    const s = rint(minS, maxS);
    g.fillRect(rint(0, size - s), rint(0, size - s), s, s);
  }
}

/* ------------------------- SCENA / RENDERER -------------------------- */
const stage = document.getElementById('stage');
const scene = new THREE.Scene();
scene.background = new THREE.Color(CFG.sky);
scene.fog = new THREE.Fog(CFG.fog, 90, 300);

const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 700);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
stage.appendChild(renderer.domElement);

/* luce piatta e satura, come nel gioco a cui ci ispiriamo */
scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x6a7f4a, 0.78));
const sun = new THREE.DirectionalLight(0xfff6e0, 0.62);
sun.position.set(-10, 20, 8);
scene.add(sun);

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize);
resize();

/* geometria condivisa: ogni blocco del mondo è questo cubo scalato */
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
