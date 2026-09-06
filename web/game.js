/* =====================================================================
   GATE RUNNER — bozza grafica / prototipo giocabile
   Un solo file, three.js r128 (globale THREE).
   Sezioni: CONFIG · UTIL · TEXTURES · WORLD · PLAYER · GATES · GAME LOOP
   ===================================================================== */

/* ------------------------------ CONFIG ------------------------------ */
const CFG = {
  trackWidth   : 6,
  laneLimit    : 2.35,
  speed        : 14,          // unità/sec
  gateSpacing  : 26,
  firstGateZ   : -34,
  runOut       : 42,          // distanza dall'ultimo gate al boss
  startCount   : 10,
  maxCount     : 9999999,
  strafe       : 0.052,       // px trascinati -> unità di mondo
  palette: {
    sky    : 0x6ec0ff,
    fog    : 0xa8dcff,
    path   : 0xcfc6a8,
    pathAlt: 0xc2b998,
    rail   : 0xdfe9f2,
    grass  : [0x74c93f, 0x5eb033, 0x8bdc52],
    dirt   : [0xd9b96a, 0xc9a95c, 0xe3c87e],
    stone  : [0xb9c1c6, 0xa7b0b6],
    skin   : 0xffb02e,
    skinLo : 0xf59200,
    boss   : 0xd8342b,
    bossLo : 0xa8221c
  }
};

/* ------------------------------- UTIL ------------------------------- */
const rnd   = (a, b) => a + Math.random() * (b - a);
const rint  = (a, b) => Math.floor(rnd(a, b + 1));
const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp  = (a, b, t) => a + (b - a) * t;

// numero -> altezza visiva (log: cresce sempre, senza esplodere)
const heightFor = c => 0.55 + Math.log10(clamp(c, 1, CFG.maxCount)) * 0.62;

const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + 'M'
              : n >= 1e4 ? Math.round(n / 1e3) + 'K'
              : String(Math.round(n));

/* ----------------------------- TEXTURES ----------------------------- */
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

// pannello del gate: gradiente verde (buono) o rosso (cattivo) + etichetta
function gateTexture(label, good) {
  const W = 384, H = 640;
  return canvasTex(W, H, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, H);
    if (good) {
      grad.addColorStop(0, '#b6f79b'); grad.addColorStop(.45, '#3fd257'); grad.addColorStop(1, '#0c9a37');
    } else {
      grad.addColorStop(0, '#ffc08c'); grad.addColorStop(.45, '#f5522b'); grad.addColorStop(1, '#b8180f');
    }
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 0, W, 110);

    // font adattato alla larghezza del pannello
    let size = 190;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    do {
      g.font = 'bold ' + size + 'px system-ui, Arial, sans-serif';
      size -= 6;
    } while (g.measureText(label).width > W * 0.82 && size > 40);

    g.lineJoin = 'round';
    g.lineWidth = size * 0.16; g.strokeStyle = 'rgba(0,0,0,.30)';
    g.strokeText(label, W / 2, H * 0.62);
    g.fillStyle = '#ffffff';
    g.fillText(label, W / 2, H * 0.62);
  });
}

// numero fluttuante sopra la testa
function numberTexture(text) {
  return canvasTex(512, 256, (g) => {
    g.clearRect(0, 0, 512, 256);
    g.font = 'bold 150px system-ui, Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = 26; g.strokeStyle = 'rgba(15,25,45,.75)';
    g.strokeText(text, 256, 132);
    g.fillStyle = '#ffffff';
    g.fillText(text, 256, 132);
  });
}

/* ------------------------- SCENA / RENDERER -------------------------- */
const stage = document.getElementById('stage');
const scene = new THREE.Scene();
scene.background = new THREE.Color(CFG.palette.sky);
scene.fog = new THREE.Fog(CFG.palette.fog, 150, 460);

const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 700);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
stage.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xdcefff, 0x5d7f45, 0.70));
const sun = new THREE.DirectionalLight(0xfff3d6, 0.68);
sun.position.set(-8, 18, 6);
scene.add(sun);

function resize() {
  const w = innerWidth, h = innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
addEventListener('resize', resize);
resize();

/* ------------------------------ MONDO ------------------------------- */
const world = new THREE.Group();       // pista + scenografia (ricostruita ad ogni livello)
scene.add(world);

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const matCache = {};
const mat = hex => matCache[hex] || (matCache[hex] = new THREE.MeshLambertMaterial({ color: hex }));

function addBox(parent, x, y, z, sx, sy, sz, color) {
  const m = new THREE.Mesh(boxGeo, mat(color));
  m.position.set(x, y + sy / 2, z);
  m.scale.set(sx, sy, sz);
  parent.add(m);
  return m;
}

let pathTex = null;
function pathTexture() {
  if (pathTex) return pathTex;
  pathTex = canvasTex(256, 256, (g) => {
    g.fillStyle = '#d6cdae'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 320; i++) {                      // pietrisco
      g.fillStyle = 'rgba(255,255,255,' + rnd(.12, .4).toFixed(2) + ')';
      g.fillRect(rnd(0, 256), rnd(0, 256), rnd(2, 7), rnd(2, 6));
    }
    for (let i = 0; i < 140; i++) {
      g.fillStyle = 'rgba(90,78,50,' + rnd(.05, .16).toFixed(2) + ')';
      g.fillRect(rnd(0, 256), rnd(0, 256), rnd(3, 9), rnd(3, 8));
    }
    g.strokeStyle = 'rgba(120,105,70,.20)'; g.lineWidth = 3;
    g.strokeRect(0, 0, 256, 256);
  });
  pathTex.wrapS = pathTex.wrapT = THREE.RepeatWrapping;
  return pathTex;
}

function buildTrack(len) {
  const P = CFG.palette, total = len + 40;

  // corsia principale (un solo mesh, texture ripetuta)
  const tex = pathTexture().clone();
  tex.needsUpdate = true;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, total / 5);
  const road = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ map: tex }));
  road.scale.set(CFG.trackWidth, 0.6, total);
  road.position.set(0, -0.3, -len / 2 + 10);
  world.add(road);

  // cordoli laterali
  for (const s of [-1, 1]) {
    addBox(world, s * (CFG.trackWidth / 2 + 0.22), -0.6, -len / 2 + 10, 0.44, 0.78, total, P.rail);
  }

  // prato di base
  addBox(world, -29, -1.0, -len / 2 + 10, 56, 0.6, total + 80, P.grass[1]);
  addBox(world,  29, -1.0, -len / 2 + 10, 56, 0.6, total + 80, P.grass[1]);

  // fondale lontano: colline / skyline all'orizzonte
  for (let i = 0; i < 26; i++) {
    const side = Math.random() < .5 ? -1 : 1;
    addBox(world, side * rnd(34, 90), -1, rnd(-len - 90, 20), rnd(10, 26), rnd(6, 22), rnd(10, 26),
           pick(Math.random() < .5 ? P.grass : P.stone));
  }
  addBox(world, 0, -1, -len - 70, 200, rnd(10, 16), 30, P.grass[1]);

  buildClouds(len);
}

// nuvole voxel: riempiono il cielo e danno profondità
function buildClouds(len) {
  const cloudMat = new THREE.MeshBasicMaterial({
    color: 0xfdfeff, transparent: true, opacity: 0.95
  });
  for (let i = 0; i < 22; i++) {
    const g = new THREE.Group();
    g.position.set((Math.random() < .5 ? -1 : 1) * rnd(18, 90), rnd(24, 48), rnd(-len - 120, -70));
    const puffs = rint(3, 5);
    for (let j = 0; j < puffs; j++) {
      const m = new THREE.Mesh(boxGeo, cloudMat);
      m.position.set(rnd(-5, 5), rnd(-1, 1), rnd(-2, 2));
      m.scale.set(rnd(4, 9), rnd(2, 3.4), rnd(3, 5));
      g.add(m);
    }
    world.add(g);
  }
}

function buildScenery(len) {
  const P = CFG.palette;
  for (let z = 24; z > -len - 30; z -= rnd(4, 9)) {
    for (const side of [-1, 1]) {
      const dist = rnd(5.5, 26);
      const r = Math.random();
      if (r < 0.5) {
        // blocchi di terreno voxel
        addBox(world, side * dist, -0.4, z, rnd(3, 7), rnd(0.6, 2.6), rnd(3, 7),
               pick(Math.random() < .55 ? P.grass : P.dirt));
      } else if (r < 0.72) {
        // alberello
        const x = side * dist;
        addBox(world, x, -0.4, z, 0.5, 1.6, 0.5, 0xa0703c);
        addBox(world, x, 1.2, z, 2.2, 2.0, 2.2, pick(P.grass));
      } else if (r < 0.86 && dist > 11) {
        // casetta: muri chiari + tetto a due falde colorato
        const x = side * dist, w = rnd(4, 6.5), d = w * 0.85, hgt = rnd(2.8, 4.6);
        addBox(world, x, -0.4, z, w, hgt, d, pick([0xf4e8d2, 0xe7d9bd, 0xdde7f0]));
        const roof = pick([0xc1553f, 0x9c5540, 0x4a7fb5]);
        addBox(world, x, hgt - 0.4, z, w + 0.7, 0.55, d + 0.7, roof);
        addBox(world, x, hgt + 0.15, z, w * 0.62, 0.5, d * 0.62, roof);
        addBox(world, x, hgt + 0.65, z, w * 0.28, 0.45, d * 0.28, roof);
      } else if (r < 0.93 && dist > 8) {
        // staccionata
        const x = side * dist;
        for (let k = -1; k <= 1; k++) addBox(world, x, -0.4, z + k * 1.2, 0.22, 1.1, 0.22, 0xe8dcc0);
        addBox(world, x, 0.35, z, 0.3, 0.2, 3.4, 0xe8dcc0);
      } else if (dist > 16) {
        // roccia / torre
        addBox(world, side * dist, -0.4, z, rnd(2, 4), rnd(4, 11), rnd(2, 4), pick(P.stone));
      }
    }
  }
}

/* ----------------------------- PERSONAGGI ---------------------------- */
function buildCharacter(colorMain, colorDark) {
  // modello alto ~1.9 unità a scala 1
  const g = new THREE.Group();
  const part = (x, y, z, sx, sy, sz, c) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 12), mat(c));
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); g.add(m);
    return m;
  };
  const legL = part(-0.18, 0.40, 0, 0.30, 0.86, 0.30, colorDark);
  const legR = part( 0.18, 0.40, 0, 0.30, 0.86, 0.30, colorDark);
  part(0, 0.76, 0, 0.66, 0.50, 0.56, colorMain);            // bacino
  part(0, 1.15, 0, 0.92, 0.84, 0.66, colorMain);            // torso
  part(0, 1.46, 0, 1.14, 0.46, 0.66, colorMain);            // spalle
  const armL = part(-0.53, 1.24, 0.05, 0.28, 0.74, 0.28, colorMain);
  const armR = part( 0.53, 1.24, 0.05, 0.28, 0.74, 0.28, colorMain);
  part(0, 1.83, 0, 0.62, 0.62, 0.60, colorMain);            // testa
  // occhi
  const eye = x => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), mat(0x1b2436));
    m.position.set(x, 1.87, 0.27); m.scale.setScalar(0.11); g.add(m);
  };
  eye(-0.13); eye(0.13);

  g.userData.limbs = { legL, legR, armL, armR };
  return g;
}

/* --------------------------- PLAYER + HUD 3D -------------------------- */
const player = {
  root : new THREE.Group(),
  model: buildCharacter(CFG.palette.skin, CFG.palette.skinLo),
  count: CFG.startCount,
  z: 0, x: 0, targetX: 0, h: 1, squash: 0
};
player.root.add(player.model);
scene.add(player.root);

// ombra finta
const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(0.55, 20),
  new THREE.MeshBasicMaterial({ color: 0x0a1c2a, transparent: true, opacity: 0.26 })
);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = 0.02;
scene.add(shadow);

let lastShown = -1;
function refreshNumber() {
  if (player.count === lastShown) return;
  lastShown = player.count;
  const el = document.getElementById('count');
  el.textContent = fmt(player.count);
  el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1)' }],
             { duration: 260, easing: 'ease-out' });
}

/* ------------------------------- GATES ------------------------------- */
const OPS = {
  mul: (c, v) => clamp(c * v, 1, CFG.maxCount),
  div: (c, v) => Math.max(1, Math.floor(c / v)),
  add: (c, v) => clamp(c + v, 1, CFG.maxCount),
  sub: (c, v) => Math.max(1, c - v)
};
const label = op => ({ mul: '×', div: '÷', add: '+', sub: '−' })[op.k] + fmt(op.v);
const apply = (c, op) => OPS[op.k](c, op.v);

function makeOps(count) {
  const kind = Math.random();
  let a, b;
  if (kind < 0.45) {
    const n = rint(2, 6);
    a = { k: 'mul', v: n }; b = { k: 'div', v: n };
  } else if (kind < 0.8) {
    const n = Math.max(10, Math.round(count * rnd(0.4, 1.1) / 10) * 10);
    a = { k: 'add', v: n }; b = { k: 'sub', v: n };
  } else {
    a = { k: 'mul', v: rint(2, 4) };
    b = { k: 'sub', v: Math.max(10, Math.round(count * rnd(0.3, 0.7) / 10) * 10) };
  }
  return Math.random() < 0.5 ? [a, b] : [b, a];
}

const gates = [];
function buildGate(z, ops, count) {
  const group = new THREE.Group();
  group.position.z = z;
  const half = CFG.trackWidth / 2;

  ops.forEach((op, i) => {
    const good = apply(count, op) > count;
    const w = CFG.trackWidth / ops.length;
    const cx = -half + w * (i + 0.5);

    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(w - 0.06, 5),
      new THREE.MeshBasicMaterial({
        map: gateTexture(label(op), good),
        transparent: true, opacity: 0.92, side: THREE.DoubleSide
      })
    );
    panel.position.set(cx, 2.5, 0);
    group.add(panel);
  });

  // montanti bianchi
  const postGeo = new THREE.CylinderGeometry(0.09, 0.09, 6, 8);
  for (let i = 0; i <= ops.length; i++) {
    const p = new THREE.Mesh(postGeo, mat(0xf7fbff));
    p.position.set(-half + (CFG.trackWidth / ops.length) * i, 3, 0);
    group.add(p);
  }

  world.add(group);
  gates.push({ z, ops, group, taken: false, anim: 0 });
}

/* ------------------------------- BOSS -------------------------------- */
let boss = null;
function buildBoss(z, count) {
  const g = buildCharacter(CFG.palette.boss, CFG.palette.bossLo);
  const h = heightFor(count);
  g.scale.set(0.65 + h * 0.16, h, 0.65 + h * 0.16);
  g.position.set(0, 0, z);
  g.rotation.y = Math.PI;
  world.add(g);

  const spr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: numberTexture(fmt(count)), transparent: true, depthTest: false
  }));
  const s = 1.4 + h * 0.5;
  spr.scale.set(s * 2, s, 1);
  spr.position.set(0, 1.9 * h + s * 0.7, z);
  world.add(spr);

  // arco di traguardo
  addBox(world, 0, -0.5, z + 6, CFG.trackWidth + 2, 0.55, 2, 0x2b3d5c);

  boss = { obj: g, label: spr, count, z, fallen: false };
}

/* ------------------------------ LIVELLO ------------------------------ */
let level = 1, levelLen = 0, targetCount = 0, finishZ = 0;

function buildLevel() {
  // pulizia
  while (world.children.length) {
    const c = world.children.pop();
    c.traverse && c.traverse(o => {
      if (o.geometry && o.geometry !== boxGeo) o.geometry.dispose();
      if (o.material && o.material.map) o.material.map.dispose();
    });
  }
  gates.length = 0;
  boss = null;

  const rows = Math.min(14, 7 + level);
  const rowOps = [];
  let sim = CFG.startCount;             // percorso "perfetto": serve a tarare i gate
  let z = CFG.firstGateZ;

  for (let i = 0; i < rows; i++) {
    const ops = makeOps(sim);
    buildGate(z, ops, sim);
    rowOps.push(ops);
    sim = Math.max(apply(sim, ops[0]), apply(sim, ops[1]));
    z -= CFG.gateSpacing;
  }

  finishZ = z - CFG.runOut + CFG.gateSpacing;
  levelLen = Math.abs(finishZ) + 30;

  buildTrack(levelLen);
  buildScenery(levelLen);

  // Il boss non vale il percorso perfetto (irraggiungibile): simulo un giocatore
  // che indovina l'80% dei gate e prendo la mediana, scontata del 30%.
  const runs = [];
  for (let r = 0; r < 9; r++) {
    let c = CFG.startCount;
    for (const ops of rowOps) {
      const a = apply(c, ops[0]), b = apply(c, ops[1]);
      c = Math.random() < 0.8 ? Math.max(a, b) : Math.min(a, b);
    }
    runs.push(c);
  }
  runs.sort((a, b) => a - b);
  targetCount = Math.max(30, Math.round(runs[4] * 0.7));
  buildBoss(finishZ, targetCount);

  document.getElementById('levelPill').textContent = 'LIVELLO ' + level;
  document.getElementById('targetPill').textContent = '🎯 ' + fmt(targetCount);
}

/* ------------------------------ INPUT -------------------------------- */
let dragging = false, lastPX = 0;
const onDown = e => { dragging = true; lastPX = (e.touches ? e.touches[0] : e).clientX; };
const onMove = e => {
  if (!dragging || state !== 'run') return;
  const x = (e.touches ? e.touches[0] : e).clientX;
  player.targetX = clamp(player.targetX + (x - lastPX) * CFG.strafe, -CFG.laneLimit, CFG.laneLimit);
  lastPX = x;
};
const onUp = () => { dragging = false; };
addEventListener('pointerdown', onDown);
addEventListener('pointermove', onMove);
addEventListener('pointerup', onUp);
addEventListener('pointercancel', onUp);
addEventListener('keydown', e => {
  if (state !== 'run') return;
  if (e.key === 'ArrowLeft')  player.targetX = clamp(player.targetX - 0.9, -CFG.laneLimit, CFG.laneLimit);
  if (e.key === 'ArrowRight') player.targetX = clamp(player.targetX + 0.9, -CFG.laneLimit, CFG.laneLimit);
});

/* ---------------------------- POPUP HUD ------------------------------ */
function popup(text, good) {
  const d = document.createElement('div');
  d.className = 'pop';
  d.textContent = text;
  d.style.color = good ? '#8dff87' : '#ff8a6e';
  document.getElementById('pops').appendChild(d);
  setTimeout(() => d.remove(), 900);
}

/* ---------------------------- STATO / LOOP ---------------------------- */
let state = 'menu';                    // menu | run | end
const clock = new THREE.Clock();
let runT = 0, endT = 0, win = false;

function startLevel(next) {
  if (next) level++;
  player.count = CFG.startCount;
  player.z = 0; player.x = 0; player.targetX = 0; player.squash = 0;
  buildLevel();
  refreshNumber();
  state = 'run'; runT = 0;
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('result').classList.add('hidden');
}

function endLevel(didWin) {
  state = 'end'; endT = 0; win = didWin;
  if (boss && boss.label) boss.label.visible = false;
  const r = document.getElementById('result');
  document.getElementById('resTitle').textContent = didWin ? 'VITTORIA!' : 'TROPPO PICCOLO';
  document.getElementById('resCount').textContent = fmt(player.count);
  document.getElementById('resInfo').textContent =
    didWin ? 'Hai superato ' + fmt(targetCount) : 'Servivano ' + fmt(targetCount);
  document.getElementById('nextBtn').textContent = didWin ? 'AVANTI' : 'RIPROVA';
  setTimeout(() => r.classList.remove('hidden'), 900);
}

document.getElementById('playBtn').onclick = () => startLevel(false);
document.getElementById('nextBtn').onclick = () => startLevel(win);

function update(dt) {
  const P = player;

  if (state === 'run') {
    runT += dt;
    P.z -= CFG.speed * dt;
    P.x = lerp(P.x, P.targetX, 1 - Math.pow(0.001, dt));

    // attraversamento gate
    for (const g of gates) {
      if (!g.taken && P.z <= g.z) {
        g.taken = true; g.anim = 0;
        const idx = P.x < 0 ? 0 : 1;
        const op = g.ops[idx];
        const before = P.count;
        P.count = apply(P.count, op);
        popup(label(op), P.count > before);
        P.squash = 1;
        refreshNumber();
      }
    }

    // il gate appena superato collassa a terra
    for (const g of gates) {
      if (g.taken && g.group.visible) {
        g.anim += dt * 3.5;
        if (g.anim >= 1) { g.group.visible = false; }
        else g.group.scale.set(1, 1 - g.anim, 1);
      }
    }

    // barra di avanzamento
    document.getElementById('progress').style.width =
      clamp(P.z / finishZ, 0, 1) * 100 + '%';

    if (P.z <= finishZ + 6) endLevel(P.count >= targetCount);
  }

  if (state === 'end') {
    endT += dt;
    // il perdente cade all'indietro
    const loser = win ? boss.obj : player.model;
    loser.rotation.x = lerp(loser.rotation.x, win ? -1.35 : 1.35, 1 - Math.pow(0.02, dt));
  }

  /* --- personaggio --- */
  P.h = lerp(P.h, heightFor(P.count), 1 - Math.pow(0.004, dt));
  P.squash = Math.max(0, P.squash - dt * 3);
  const bounce = state === 'run' ? Math.abs(Math.sin(runT * 9)) * 0.06 : 0;
  const sq = 1 + Math.sin(P.squash * Math.PI) * 0.22;

  P.root.position.set(P.x, bounce * P.h, P.z);
  P.model.scale.set(
    (0.65 + P.h * 0.16) * (2 - sq),
    P.h * sq,
    (0.65 + P.h * 0.16) * (2 - sq)
  );

  // corsa: gambe e braccia
  const L = P.model.userData.limbs, sw = Math.sin(runT * 9) * 0.28;
  if (state === 'run') {
    L.legL.position.z =  sw; L.legR.position.z = -sw;
    L.armL.position.z = -sw; L.armR.position.z =  sw;
    P.model.rotation.x = -0.05;
  }

  shadow.position.set(P.x, 0.02, P.z);
  shadow.scale.setScalar(0.9 + P.h * 0.35);

  /* --- camera --- */
  const shot = state === 'end';                   // a fine livello: mezzo profilo sui due omoni
  const camTargetZ = P.z + (shot ? 12.0 + P.h * 3.4 : 9.0 + P.h * 3.0);
  const camTargetY = shot ? 3.2 + P.h * 2.2 : 2.6 + P.h * 2.0;
  camera.position.x = lerp(camera.position.x, P.x * 0.35 + (shot ? 4.5 : 0), 1 - Math.pow(0.01, dt));
  camera.position.y = lerp(camera.position.y, camTargetY, 1 - Math.pow(0.02, dt));
  camera.position.z = lerp(camera.position.z, camTargetZ, 1 - Math.pow(0.005, dt));
  camera.lookAt(P.x * 0.4 + (shot ? 1.2 : 0), (shot ? 1.9 : 1.7) * P.h, P.z - (shot ? 8 : 13));
}

// camera iniziale (menu)
camera.position.set(0, 4.0, 11);
buildLevel();
refreshNumber();

// piccolo hook di debug (utile per test automatici e tuning)
window.GateRunner = {
  player, gates, CFG,
  get boss() { return boss; },
  get state() { return state; },
  get target() { return targetCount; },
  setCount(n) { player.count = n; refreshNumber(); },
  moveTo(x) { player.targetX = clamp(x, -CFG.laneLimit, CFG.laneLimit); }
};

(function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  update(dt);
  renderer.render(scene, camera);
})();
