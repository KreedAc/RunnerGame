/* =====================================================================
   GAME — folla, gate, mob, boss, livello, loop
   ===================================================================== */

initBlocks();

/* --------------------------- ETICHETTE 3D ---------------------------- */
function labelTexture(text, color) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.font = 'bold 150px system-ui, Arial, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = 28; g.strokeStyle = 'rgba(12,18,30,.8)';
  g.strokeText(text, 256, 132);
  g.fillStyle = color || '#ffffff';
  g.fillText(text, 256, 132);
  return new THREE.CanvasTexture(c);
}

function labelSprite(text, color, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: labelTexture(text, color), transparent: true, depthTest: false
  }));
  s.renderOrder = 20;
  const k = size || 1.6;
  s.scale.set(k * 2, k, 1);
  return s;
}

/* ------------------------------ PANNELLI ----------------------------- */
/* I gate restano "lisci": sono l'unico elemento non voxel della scena,
   e va bene così — sono interfaccia, non mondo.                         */
function panelTexture(label, tone) {
  const W = 384, H = 640;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const stops = {
    good : ['#b6f79b', '#3fd257', '#0c9a37'],
    bad  : ['#ffc08c', '#f5522b', '#b8180f'],
    up   : ['#bfe0ff', '#3a8ef0', '#1550b8'],
    down : ['#d8c6f0', '#7b52c9', '#42267f']
  }[tone];
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, stops[0]); grad.addColorStop(.45, stops[1]); grad.addColorStop(1, stops[2]);
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 0, W, 110);

  let size = 190;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  do {
    g.font = 'bold ' + size + 'px system-ui, Arial, sans-serif';
    size -= 6;
  } while (g.measureText(label).width > W * 0.84 && size > 34);

  g.lineJoin = 'round';
  g.lineWidth = size * 0.16; g.strokeStyle = 'rgba(0,0,0,.30)';
  g.strokeText(label, W / 2, H * 0.62);
  g.fillStyle = '#ffffff';
  g.fillText(label, W / 2, H * 0.62);
  return new THREE.CanvasTexture(c);
}

function buildPanels(z, labels, tones) {
  const group = new THREE.Group();
  group.position.z = z;
  const half = CFG.trackWidth / 2, w = CFG.trackWidth / labels.length;

  labels.forEach((label, i) => {
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(w - 0.08, 5),
      new THREE.MeshBasicMaterial({
        map: panelTexture(label, tones[i]),
        transparent: true, opacity: 0.92, side: THREE.DoubleSide
      })
    );
    p.position.set(-half + w * (i + 0.5), 2.5, 0);
    group.add(p);
  });

  // montanti: blocchi di pietra, coerenti col mondo
  for (let i = 0; i <= labels.length; i++) {
    putBlock(group, BLOCK.stone, -half + w * i, 0, 0, 0.4, 6, 0.4);
  }
  world.add(group);
  return group;
}

/* ------------------------------ OPERAZIONI --------------------------- */
const OPS = {
  mul: (c, v) => clamp(c * v, 1, CFG.maxCount),
  div: (c, v) => Math.max(1, Math.floor(c / v)),
  add: (c, v) => clamp(c + v, 1, CFG.maxCount),
  sub: (c, v) => Math.max(1, c - v)
};
const apply    = (c, op) => OPS[op.k](c, op.v);

/* Quanto costa un gruppo di mob. Il tetto al 70% evita l'annientamento a
   metà percorso: chi arriva debole lo paga contro il boss, non qui. */
const mobLoss = (count, hp, dmg) =>
  Math.min(Math.ceil(hp / dmg), Math.max(1, Math.floor(count * 0.7)));
const opLabel  = op => ({ mul: '×', div: '÷', add: '+', sub: '−' })[op.k] + fmt(op.v);

function makeOps(count) {
  const r = Math.random();
  let a, b;
  if (r < 0.5) {
    const n = rint(2, 6);
    a = { k: 'mul', v: n }; b = { k: 'div', v: n };
  } else if (r < 0.82) {
    const n = Math.max(5, Math.round(count * rnd(0.4, 1.1) / 5) * 5);
    a = { k: 'add', v: n }; b = { k: 'sub', v: n };
  } else {
    a = { k: 'mul', v: rint(2, 4) };
    b = { k: 'sub', v: Math.max(5, Math.round(count * rnd(0.3, 0.7) / 5) * 5) };
  }
  return Math.random() < 0.5 ? [a, b] : [b, a];
}

/* ------------------------------- FOLLA -------------------------------- */
/* Gli omini sono creati una volta sola e riusati: cambiare livello
   non ricostruisce 26 personaggi.                                       */
const crowd = {
  root: new THREE.Group(),
  runners: [],
  count: CFG.startCount,
  weapon: 0,
  x: 0, targetX: 0, z: 0
};
scene.add(crowd.root);

function formationOffset(i) {
  const a = i * 2.399963;                 // angolo aureo: distribuzione naturale
  const r = 0.44 * Math.sqrt(i);
  return { x: Math.cos(a) * r, z: Math.sin(a) * r * 1.9 };
}

for (let i = 0; i < CFG.maxRunners; i++) {
  const obj = buildActor('hero');
  obj.rotation.y = Math.PI;              // di spalle: corre verso −Z
  const off = formationOffset(i);
  obj.userData.off = off;
  obj.userData.phase = i * 1.7;
  crowd.root.add(obj);
  crowd.runners.push(obj);
}

function refreshCrowd() {
  const visible = Math.min(crowd.count, CFG.maxRunners);
  crowd.runners.forEach((r, i) => { r.visible = i < visible; });
  document.getElementById('count').textContent = fmt(crowd.count);
  document.getElementById('force').textContent = fmt(force());
  const w = WEAPONS[crowd.weapon];
  document.getElementById('weapon').textContent = w.name;
}

const force = () => crowd.count * WEAPONS[crowd.weapon].dmg;

function applyWeapon() {
  crowd.runners.forEach(r => setWeapon(r, crowd.weapon));
  refreshCrowd();
}

/* ombra: un disco che copre tutta la folla */
const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(1, 24),
  new THREE.MeshBasicMaterial({ color: 0x11202c, transparent: true, opacity: 0.22 })
);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = 0.03;
scene.add(shadow);

/* -------------------------------- MOB --------------------------------- */
const MOB_TYPES = ['zombie', 'skeleton', 'bomber'];

function buildMobGroup(z, hp, n, type) {
  const group = new THREE.Group();
  group.position.z = z;
  const mobs = [];
  for (let i = 0; i < n; i++) {
    const m = buildActor(type, { arms: type !== 'bomber' });
    const t = n === 1 ? 0.5 : i / (n - 1);
    m.position.set(lerp(-2.6, 2.6, t) + rnd(-0.3, 0.3), 0, rnd(-1.4, 1.4));
    m.rotation.y = rnd(-0.2, 0.2);          // rivolti verso chi arriva
    m.userData.phase = i * 2.1;
    group.add(m);
    mobs.push(m);
  }
  const sign = labelSprite('☠ ' + fmt(hp), '#ff8f7a', 1.3);
  sign.position.set(0, 6.2, 0);
  group.add(sign);

  world.add(group);
  return { group, mobs, sign };
}

/* ------------------------------- LIVELLO ------------------------------ */
const events = [];
let level = 1, finishZ = 0, levelLen = 0, bossHp = 0, boss = null;

function buildBoss(z, hp) {
  const g = buildActor('brute');
  g.scale.setScalar(3.2);
  g.position.set(0, 0, z);
  world.add(g);

  const sign = labelSprite('☠ ' + fmt(hp), '#ffd0c0', 2.2);
  sign.position.set(0, 7.2, z);
  world.add(sign);

  // arena: una piattaforma di ossidiana attorno al boss
  putBlock(world, BLOCK.obsidian, 0, -1, z, CFG.trackWidth + 2, 1, 12);
  return { obj: g, sign, hp };
}

function buildLevel() {
  clearWorld();
  events.length = 0;
  boss = null;

  const rows = Math.min(16, 8 + level);

  /* Passo 1 — genero gli eventi seguendo un giocatore "perfetto":
     serve solo a scegliere numeri sensati (quanto vale un gate, quanta
     vita ha un gruppo di mob a quel punto del percorso).               */
  let rc = CFG.startCount, rw = 0, z = CFG.firstRowZ;
  const plan = [];

  for (let i = 0; i < rows; i++) {
    // ritmo del percorso: gate, arma, gate, mob — e si ripete
    const m = i % 4;
    const kind = m === 1 ? 'weapon' : m === 3 ? 'mobs' : 'gate';

    if (kind === 'gate') {
      const ops = makeOps(rc);
      plan.push({ kind, z, ops });
      rc = Math.max(apply(rc, ops[0]), apply(rc, ops[1]));
    } else if (kind === 'weapon') {
      plan.push({ kind, z });
      rw = Math.min(WEAPONS.length - 1, rw + 1);
    } else {
      const dmg = WEAPONS[rw].dmg;
      const hp = Math.max(dmg, Math.round(rc * dmg * rnd(0.14, 0.28)));
      const n = clamp(2 + Math.floor(Math.log10(Math.max(hp, 1))) * 2, 3, 10);
      plan.push({ kind, z, hp, n, type: pick(MOB_TYPES) });
      rc = Math.max(1, rc - mobLoss(rc, hp, dmg));
    }
    z -= CFG.rowSpacing;
  }

  finishZ  = z - CFG.runOut + CFG.rowSpacing;
  levelLen = Math.abs(finishZ) + 40;

  buildWorld(levelLen);

  /* Passo 2 — costruisco davvero gli oggetti in scena */
  for (const p of plan) {
    if (p.kind === 'gate') {
      const tones = p.ops.map(op => apply(1000, op) > 1000 ? 'good' : 'bad');
      events.push({
        kind: 'gate', z: p.z, ops: p.ops, done: false, anim: 0,
        group: buildPanels(p.z, p.ops.map(opLabel), tones)
      });
    } else if (p.kind === 'weapon') {
      events.push({
        kind: 'weapon', z: p.z, done: false, anim: 0,
        group: buildPanels(p.z, ['▲ ARMA', '▼ ARMA'], ['up', 'down'])
      });
    } else {
      const mg = buildMobGroup(p.z, p.hp, p.n, p.type);
      events.push({ kind: 'mobs', z: p.z, hp: p.hp, done: false, mg });
    }
  }

  /* Passo 3 — quanto deve valere il boss.
     Due riferimenti: la partita perfetta (rc, rw del passo 1) e la mediana
     di 9 partite all'80%. Con i gate ×6 la forbice fra le due è enorme,
     quindi prendo il più alto: la mediana da sola renderebbe il boss banale. */
  const perfectForce = rc * WEAPONS[rw].dmg;
  const runs = [];
  for (let r = 0; r < 9; r++) {
    let c = CFG.startCount, w = 0;
    for (const p of plan) {
      if (p.kind === 'gate') {
        const a = apply(c, p.ops[0]), b = apply(c, p.ops[1]);
        c = Math.random() < 0.8 ? Math.max(a, b) : Math.min(a, b);
      } else if (p.kind === 'weapon') {
        w = Math.random() < 0.8 ? Math.min(WEAPONS.length - 1, w + 1) : Math.max(0, w - 1);
      } else {
        c = Math.max(1, c - mobLoss(c, p.hp, WEAPONS[w].dmg));
      }
    }
    runs.push(c * WEAPONS[w].dmg);
  }
  runs.sort((a, b) => a - b);
  bossHp = Math.max(40, Math.round(Math.max(runs[4] * 1.3, perfectForce * 0.18)));
  boss = buildBoss(finishZ, bossHp);

  document.getElementById('levelPill').textContent = 'LIVELLO ' + level;
  document.getElementById('bossPill').textContent = '☠ ' + fmt(bossHp);
}

/* -------------------------------- INPUT -------------------------------- */
let dragging = false, lastPX = 0;
addEventListener('pointerdown', e => { dragging = true; lastPX = e.clientX; });
addEventListener('pointerup',     () => { dragging = false; });
addEventListener('pointercancel', () => { dragging = false; });
addEventListener('pointermove', e => {
  if (!dragging || state !== 'run') return;
  crowd.targetX = clamp(crowd.targetX + (e.clientX - lastPX) * CFG.strafe,
                        -CFG.laneLimit, CFG.laneLimit);
  lastPX = e.clientX;
});
addEventListener('keydown', e => {
  if (state !== 'run') return;
  if (e.key === 'ArrowLeft')  crowd.targetX = clamp(crowd.targetX - 0.9, -CFG.laneLimit, CFG.laneLimit);
  if (e.key === 'ArrowRight') crowd.targetX = clamp(crowd.targetX + 0.9, -CFG.laneLimit, CFG.laneLimit);
});

/* -------------------------------- POPUP -------------------------------- */
function popup(text, color) {
  const d = document.createElement('div');
  d.className = 'pop';
  d.textContent = text;
  d.style.color = color;
  document.getElementById('pops').appendChild(d);
  setTimeout(() => d.remove(), 900);
}

/* --------------------------- STATO E LOOP ------------------------------ */
let state = 'menu';              // menu | run | end
let runT = 0, win = false;
const clock = new THREE.Clock();

function startLevel(next) {
  if (next) level++;
  crowd.count = CFG.startCount;
  crowd.weapon = 0;
  crowd.x = 0; crowd.targetX = 0; crowd.z = 0;
  crowd.runners.forEach(r => { r.rotation.x = 0; r.rotation.y = Math.PI; });
  buildLevel();
  applyWeapon();
  state = 'run'; runT = 0;
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('result').classList.add('hidden');
}

function endLevel(didWin) {
  state = 'end'; win = didWin;
  if (boss && boss.sign) boss.sign.visible = false;
  const r = document.getElementById('result');
  document.getElementById('resTitle').textContent = didWin ? 'VITTORIA!' : 'SCONFITTA';
  document.getElementById('resCount').textContent = fmt(force());
  document.getElementById('resInfo').textContent = didWin
    ? 'Forza ' + fmt(force()) + ' contro ' + fmt(bossHp)
    : 'Serviva forza ' + fmt(bossHp);
  document.getElementById('nextBtn').textContent = didWin ? 'AVANTI' : 'RIPROVA';
  setTimeout(() => r.classList.remove('hidden'), 900);
}

document.getElementById('playBtn').onclick = () => startLevel(false);
document.getElementById('nextBtn').onclick = () => startLevel(win);

/* --- risoluzione degli eventi quando la folla li raggiunge --- */
function resolveGate(ev) {
  const op = ev.ops[crowd.x < 0 ? 0 : 1];
  const before = crowd.count;
  crowd.count = apply(crowd.count, op);
  popup(opLabel(op), crowd.count > before ? '#8dff87' : '#ff8a6e');
  refreshCrowd();
}

function resolveWeapon(ev) {
  const up = crowd.x < 0;
  const next = clamp(crowd.weapon + (up ? 1 : -1), 0, WEAPONS.length - 1);
  const changed = next !== crowd.weapon;
  crowd.weapon = next;
  applyWeapon();
  popup((up ? '▲ ' : '▼ ') + WEAPONS[next].name, up ? '#8fc6ff' : '#c9a6ff');
  if (!changed) popup(up ? 'MAX' : 'MIN', '#ffffff');
}

function resolveMobs(ev) {
  const dmg = WEAPONS[crowd.weapon].dmg;
  const loss = mobLoss(crowd.count, ev.hp, dmg);
  crowd.count -= loss;
  popup('−' + fmt(loss), '#ff7a6e');
  ev.mg.mobs.forEach(m => { m.userData.dying = true; });
  ev.mg.sign.visible = false;
  if (crowd.count <= 0) { crowd.count = 0; refreshCrowd(); endLevel(false); return; }
  refreshCrowd();
}

function update(dt) {
  if (state === 'run') {
    runT += dt;
    crowd.z -= CFG.speed * dt;
    crowd.x = lerp(crowd.x, crowd.targetX, 1 - Math.pow(0.001, dt));

    for (const ev of events) {
      if (!ev.done && crowd.z <= ev.z) {
        ev.done = true;
        if (ev.kind === 'gate')       resolveGate(ev);
        else if (ev.kind === 'weapon') resolveWeapon(ev);
        else                           resolveMobs(ev);
        if (state !== 'run') break;
      }
      // il gate superato collassa a terra invece di restare in camera
      if (ev.done && ev.group && ev.group.visible) {
        ev.anim += dt * 3.5;
        if (ev.anim >= 1) ev.group.visible = false;
        else ev.group.scale.set(1, 1 - ev.anim, 1);
      }
    }

    document.getElementById('progress').style.width =
      clamp(crowd.z / finishZ, 0, 1) * 100 + '%';

    if (crowd.z <= finishZ + 8) endLevel(force() >= bossHp);
  }

  /* --- mob abbattuti: cadono e sprofondano --- */
  for (const ev of events) {
    if (ev.kind !== 'mobs') continue;
    for (const m of ev.mg.mobs) {
      if (m.userData.dying) {
        m.rotation.x = lerp(m.rotation.x, 1.5, 1 - Math.pow(0.02, dt));
        m.position.y -= dt * 0.8;
        if (m.position.y < -2.5) { m.visible = false; m.userData.dying = false; }
      } else if (m.visible) {
        animateIdle(m, runT, m.userData.phase);
      }
    }
  }

  /* --- la folla --- */
  const running = state === 'run';
  const visible = Math.min(crowd.count, CFG.maxRunners);
  let radius = 0.6;
  crowd.runners.forEach((r, i) => {
    if (!r.visible) return;
    const off = r.userData.off;
    radius = Math.max(radius, Math.abs(off.x) + 0.5);
    r.position.set(off.x, running ? Math.abs(Math.sin(runT * 9 + r.userData.phase)) * 0.09 : 0, off.z);
    if (running) animateRun(r, runT, r.userData.phase);
    else if (state === 'menu') animateIdle(r, runT, r.userData.phase);
  });
  crowd.root.position.set(crowd.x, 0, crowd.z);

  if (state === 'end') {
    // il perdente si stende
    const losers = win ? [boss.obj] : crowd.runners.filter(r => r.visible);
    for (const l of losers) l.rotation.x = lerp(l.rotation.x, win ? -1.4 : 1.4, 1 - Math.pow(0.02, dt));
  }

  shadow.position.set(crowd.x, 0.03, crowd.z);
  shadow.scale.setScalar(radius + 0.4);

  /* --- camera: si allarga con la folla --- */
  const shot = state === 'end';
  const back = 9 + radius * 2.2;
  camera.position.x = lerp(camera.position.x, shot ? crowd.x + 5.5 : crowd.x * 0.35, 1 - Math.pow(0.01, dt));
  camera.position.y = lerp(camera.position.y, shot ? 5.2 : 3.4 + radius * 0.7, 1 - Math.pow(0.02, dt));
  camera.position.z = lerp(camera.position.z, crowd.z + (shot ? 8 : back), 1 - Math.pow(0.005, dt));
  camera.lookAt(shot ? crowd.x * 0.5 : crowd.x, shot ? 2.2 : 1.9, crowd.z - (shot ? 8 : 16));
}

/* hook di debug: GateRunner.setCount(500), .setWeapon(5) */
window.GateRunner = {
  crowd, events, CFG, WEAPONS,
  get state() { return state; },
  get bossHp() { return bossHp; },
  get force() { return force(); },
  setCount(n) { crowd.count = n; refreshCrowd(); },
  setWeapon(t) { crowd.weapon = clamp(t, 0, WEAPONS.length - 1); applyWeapon(); },
  moveTo(x) { crowd.targetX = clamp(x, -CFG.laneLimit, CFG.laneLimit); }
};

camera.position.set(0, 5.4, 12);
buildLevel();
applyWeapon();

(function loop() {
  requestAnimationFrame(loop);
  update(Math.min(clock.getDelta(), 0.05));
  renderer.render(scene, camera);
})();
