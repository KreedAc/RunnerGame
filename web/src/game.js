/* =====================================================================
   GAME — la partita: pista a corsie, ostacoli, nemici, banchi di potenza
   e il finale in cui la potenza accumulata si consuma.
   ===================================================================== */

initBlocks();

/* --------------------------- ETICHETTE 3D ---------------------------- */
function labelTexture(text, color) {
  const c = document.createElement('canvas');
  c.width = 320; c.height = 160;
  const g = c.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = 112;                       // rimpicciolisce finché non ci sta
  do {
    g.font = 'bold ' + size + 'px system-ui, Arial, sans-serif';
    size -= 4;
  } while (g.measureText(text).width > 292 && size > 24);
  g.lineJoin = 'round';
  g.lineWidth = size * 0.2; g.strokeStyle = 'rgba(12,18,30,.85)';
  g.strokeText(text, 160, 84);
  g.fillStyle = color || '#ffffff';
  g.fillText(text, 160, 84);
  return new THREE.CanvasTexture(c);
}

function labelSprite(text, color, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: labelTexture(text, color), transparent: true, depthTest: false
  }));
  s.renderOrder = 20;
  const k = size || 1.1;
  s.scale.set(k * 2, k, 1);
  return s;
}

function setLabel(sprite, text, color) {
  sprite.material.map.dispose();
  sprite.material.map = labelTexture(text, color);
}

/* ------------------------- STATO DELLA PARTITA ------------------------ */
const run = {
  power: 0, weapon: 0, coins: 0, gems: 0,
  buffs: { income: 0, rate: 0, gain: 0 },
  x: 0, targetX: 0, z: 0,
  depth: 0,                       // blocchi abbattuti nel finale
  swing: 0
};

const damage = () => Math.round(WEAPONS[run.weapon].dmg * (1 + run.buffs.rate * BUFFS.rate.step));
const gainMul  = () => 1 + run.buffs.gain   * BUFFS.gain.step;
const coinMul  = () => UPGRADES.income.value(meta.up.income) * (1 + run.buffs.income * BUFFS.income.step);

/* --------------------------------- EROE -------------------------------- */
const hero = buildActor('hero');
hero.rotation.y = Math.PI;                 // di spalle: corre verso −Z
scene.add(hero);

const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(0.75, 20),
  new THREE.MeshBasicMaterial({ color: 0x11202c, transparent: true, opacity: 0.24 })
);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = 0.03;
scene.add(shadow);

/* --------------------------- OGGETTI DI PISTA -------------------------- */
const items = [];      // tutto ciò che si può incontrare, ordinato per z

/* Torre da rompere: una colonna di blocchi col suo numero sopra.
   Verde = la spacchi, rossa = ti rimbalza addosso e perdi potenza. */
function buildTower(x, z, hp) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const h = clamp(2 + Math.floor(Math.log10(Math.max(hp, 1))), 2, 5);
  const blocks = [];
  for (let i = 0; i < h; i++) {
    const w = 1.7 - i * 0.12;
    blocks.push(putBlock(g, BLOCK.cobble, 0, i, 0, w, 1, w));
  }
  const sprite = labelSprite(fmt(hp), '#ffffff', 0.8);
  sprite.position.set(0, h + 0.9, 0);
  g.add(sprite);
  world.add(g);
  return { obj: g, sprite, blocks };
}

/* Nemico: uno o due per riga, lo schivi o lo abbatti. */
function buildEnemy(x, z, hp, type) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const m = buildActor(type, { arms: type !== 'bomber' });
  g.add(m);
  const sprite = labelSprite(fmt(hp), '#ffffff', 0.75);
  sprite.position.set(0, 2.7, 0);
  g.add(sprite);
  world.add(g);
  return { obj: g, sprite, mob: m };
}

/* Banco da lavoro: ci passi attraverso e l'arma sale di livello. */
function buildCraft(x, z, tier) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  putBlock(g, BLOCK.planks, -1.1, 0, 0, 0.5, 3, 0.5);
  putBlock(g, BLOCK.planks,  1.1, 0, 0, 0.5, 3, 0.5);
  putBlock(g, BLOCK.planks,  0,   3, 0, 2.7, 0.6, 0.6);

  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 1.1),
    new THREE.MeshBasicMaterial({ color: 0x2f7de0, transparent: true, opacity: 0.92 })
  );
  board.position.set(0, 2.1, 0.05);
  g.add(board);

  const sprite = labelSprite(WEAPONS[tier].name, '#ffffff', 0.62);
  sprite.position.set(0, 2.1, 0.2);
  g.add(sprite);
  world.add(g);
  return { obj: g, sprite };
}

/* Raccolte: monete, cristalli e i bonus della colonnina di sinistra. */
function buildPickup(x, z, kind, amount) {
  const g = new THREE.Group();
  g.position.set(x, 1.0, z);
  const color = { coin: 0xffc93c, gem: 0x4fe3d5,
                  income: 0x6fe07a, rate: 0xffc14d, gain: 0x7cc9ff }[kind];
  const m = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color }));
  m.scale.set(0.8, 0.8, 0.8);
  g.add(m);

  if (BUFFS[kind]) {
    const s = labelSprite('+' + Math.round(BUFFS[kind].step * 100) + '%', '#ffffff', 0.55);
    s.position.set(0, 1.1, 0);
    g.add(s);
  }
  world.add(g);
  return { obj: g, spin: rnd(1, 2) };
}

/* ------------------------------- FINALE -------------------------------- */
/* Il muro di blocchi numerati: ogni blocco costa potenza. Si va avanti
   finché la potenza regge, scegliendo di riga in riga il costo minore. */
function buildFinaleBlock(x, z, cost, chest) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const mat = chest ? BLOCK.planks : BLOCK.obsidian;
  putBlock(g, mat, 0, 0, 0, 1.7, 1.8, 1.3);
  if (chest) putBlock(g, BLOCK.brick, 0, 1.8, 0, 1.8, 0.35, 1.4);
  const sprite = labelSprite(fmt(cost), chest ? '#ffd24b' : '#ffffff', 0.6);
  sprite.position.set(0, 2.4, 0);
  g.add(sprite);
  world.add(g);
  return { obj: g, sprite };
}

/* ---------------------------- GENERAZIONE ------------------------------ */
let rows = 0, finishZ = 0, finaleStartZ = 0, levelLen = 0, expectedPower = 0;

function buildRun() {
  clearWorld();
  items.length = 0;

  rows = Math.min(20, 10 + meta.level);          // mappe lunghe: 10-20 righe
  let z = CFG.firstRowZ;

  /* riferimento: un giocatore che prende sempre la scelta migliore.
     Serve a tarare gli hp delle torri e i costi del finale.            */
  let refPower = UPGRADES.power.value(meta.up.power);
  let refTier  = meta.up.weapon;

  for (let i = 0; i < rows; i++) {
    const dmg = WEAPONS[refTier].dmg;
    const lanes = shuffle([0, 1, 2]);
    const craftRow = i % 4 === 3 && refTier < WEAPONS.length - 1;

    // corsia 1: la torre "buona", quella che riesci a rompere
    const easyHp = Math.max(1, Math.round(dmg * rnd(0.55, 0.95)));
    const t = buildTower(CFG.laneX[lanes[0]], z, easyHp);
    items.push({ kind: 'tower', z, x: CFG.laneX[lanes[0]], hp: easyHp, done: false, ...t });
    refPower += easyHp * 3;

    // corsia 2: il banco da lavoro, oppure una minaccia
    if (craftRow) {
      const c = buildCraft(CFG.laneX[lanes[1]], z, refTier + 1);
      items.push({ kind: 'craft', z, x: CFG.laneX[lanes[1]], tier: refTier + 1, done: false, ...c });
      refTier++;
    } else if (Math.random() < 0.32) {
      const hp = Math.max(1, Math.round(dmg * rnd(0.6, 1.7)));
      const e = buildEnemy(CFG.laneX[lanes[1]], z, hp, pick(['zombie', 'skeleton', 'bomber']));
      items.push({ kind: 'enemy', z, x: CFG.laneX[lanes[1]], hp, done: false, ...e });
    } else {
      const hardHp = Math.round(dmg * rnd(1.4, 2.6));
      const t2 = buildTower(CFG.laneX[lanes[1]], z, hardHp);
      items.push({ kind: 'tower', z, x: CFG.laneX[lanes[1]], hp: hardHp, done: false, ...t2 });
    }

    // corsia 3: quasi sempre libera — è la via di fuga
    if (Math.random() < 0.45) {
      const hardHp = Math.round(dmg * rnd(1.3, 2.4));
      const t3 = buildTower(CFG.laneX[lanes[2]], z, hardHp);
      items.push({ kind: 'tower', z, x: CFG.laneX[lanes[2]], hp: hardHp, done: false, ...t3 });
    }

    // raccolte sparse fra una riga e l'altra
    const pz = z + CFG.rowSpacing * 0.5;
    if (i > 0) {
      if (Math.random() < 0.26) {
        const kind = pick(['income', 'rate', 'gain']);
        const p = buildPickup(CFG.laneX[rint(0, 2)], pz, kind);
        items.push({ kind: 'buff', buff: kind, z: pz, x: p.obj.position.x, done: false, ...p });
      } else {
        const lane = CFG.laneX[rint(0, 2)];
        for (let k = 0; k < 3; k++) {
          const cz = pz + k * 2.2;
          const kind = Math.random() < 0.12 ? 'gem' : 'coin';
          const p = buildPickup(lane, cz, kind);
          items.push({ kind, z: cz, x: lane, done: false, ...p });
        }
      }
    }
    z -= CFG.rowSpacing;
  }

  finishZ = z - CFG.runOut + CFG.rowSpacing;
  finaleStartZ = finishZ - 10;
  expectedPower = Math.round(refPower * 1.5);   // ~ quello che raccogli davvero

  /* il finale: costi crescenti, tre blocchi per riga fra cui scegliere */
  const base = Math.max(1, Math.round(expectedPower / 55));
  for (let i = 0; i < CFG.finaleRows; i++) {
    const fz = finaleStartZ - i * CFG.finaleGap;
    const step = Math.round(base * (1 + i * 0.42));
    const costs = shuffle([step, Math.round(step * 1.5), Math.round(step * 0.65)]);
    for (let l = 0; l < 3; l++) {
      const chest = Math.random() < 0.12;
      const b = buildFinaleBlock(CFG.laneX[l], fz, costs[l], chest);
      items.push({ kind: 'block', z: fz, x: CFG.laneX[l], cost: costs[l],
                   chest, row: i, done: false, ...b });
    }
  }

  levelLen = Math.abs(finaleStartZ - CFG.finaleRows * CFG.finaleGap) + 50;
  buildWorld(levelLen);
  buildFinishLine(finishZ);
  refreshThreats();
}

/* linea a scacchi + corridoio scuro del finale */
function buildFinishLine(z) {
  const tex = pixelTex(16, g => {
    for (let y = 0; y < 16; y += 8) for (let x = 0; x < 16; x += 8) {
      g.fillStyle = ((x + y) / 8) % 2 ? '#1c1c22' : '#f4f4f8';
      g.fillRect(x, y, 8, 8);
    }
  });
  const m = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ map: tex }));
  m.position.set(0, 0.02, z);
  m.scale.set(CFG.trackWidth, 0.1, 2.4);
  world.add(m);

  putBlock(world, BLOCK.obsidian, 0, -1,
           z - CFG.finaleRows * CFG.finaleGap / 2 - 6,
           CFG.trackWidth + 2, 1, CFG.finaleRows * CFG.finaleGap + 24);
}

/* Colora i numeri di torri e nemici in base a quello che riesci a fare
   adesso: verde = ci passi sopra, rosso = ti costa potenza. */
function refreshThreats() {
  const dmg = damage();
  for (const it of items) {
    if (it.done) continue;
    if (it.kind === 'tower' || it.kind === 'enemy') {
      const ok = dmg >= it.hp;
      setLabel(it.sprite, fmt(it.hp), ok ? '#7bf07a' : '#ff8a6e');
      if (it.blocks) {
        const mat = ok ? BLOCK.cobbleGood : BLOCK.cobbleBad;
        it.blocks.forEach((b, i) => {
          const w = 1.7 - i * 0.12;
          b.material = repeatMat(mat, w, 1, w);
        });
      }
    }
  }
}

/* ------------------------------ RISOLUZIONE ---------------------------- */
const debris = [];

function breakBlocks(group, n) {
  // scaglie che schizzano via: bastano pochi cubetti per leggere l'impatto
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(boxGeo, BLOCK.stone);
    m.scale.setScalar(rnd(0.25, 0.5));
    m.position.copy(group.position);
    m.position.y += rnd(0.5, 2.5);
    m.userData.vel = new THREE.Vector3(rnd(-6, 6), rnd(4, 9), rnd(2, 8));
    m.userData.life = 1.1;
    world.add(m);
    debris.push(m);
  }
}

function hitTower(it) {
  const dmg = damage();
  run.swing = 0.35;
  if (dmg >= it.hp) {
    const gain = Math.round(it.hp * 3 * gainMul());
    run.power += gain;
    popup('+' + fmt(gain), '#7bf07a');
  } else {
    const loss = Math.max(3, Math.round(run.power * 0.14));
    run.power = Math.max(0, run.power - loss);
    popup('−' + fmt(loss), '#ff7a6e');
  }
  breakBlocks(it.obj, 7);
  it.obj.visible = false;
}

function hitEnemy(it) {
  const dmg = damage();
  run.swing = 0.35;
  if (dmg >= it.hp) {
    const coins = Math.round(it.hp * 3 * coinMul());
    run.coins += coins;
    run.power += Math.round(it.hp * 1.5 * gainMul());
    popup('+' + fmt(coins) + ' 🪙', '#ffd24b');
    it.mob.userData.dying = true;
    it.sprite.visible = false;
  } else {
    const loss = Math.max(5, Math.round(run.power * 0.22));
    run.power = Math.max(0, run.power - loss);
    popup('−' + fmt(loss), '#ff5a4a');
    it.obj.visible = false;
  }
}

function takeCraft(it) {
  run.weapon = clamp(it.tier, 0, WEAPONS.length - 1);
  setWeapon(hero, run.weapon);
  popup('▲ ' + WEAPONS[run.weapon].name, '#8fc6ff');
  it.obj.visible = false;
  refreshThreats();
}

function takePickup(it) {
  if (it.kind === 'coin') {
    const c = Math.round(8 * coinMul());
    run.coins += c;
  } else if (it.kind === 'gem') {
    run.gems += 1;
    popup('+1 💎', '#4fe3d5');
  } else {
    run.buffs[it.buff]++;
    const b = BUFFS[it.buff];
    popup(b.icon + ' +' + Math.round(b.step * 100) + '%', b.color);
    renderBuffRail(run.buffs);
    if (it.buff === 'rate') refreshThreats();
  }
  it.obj.visible = false;
}

function hitFinaleBlock(it) {
  run.power -= it.cost;
  breakBlocks(it.obj, 5);
  it.obj.visible = false;
  run.depth++;
  if (it.chest) {
    const c = Math.round(it.cost * 2 * coinMul());
    run.coins += c;
    popup('+' + fmt(c) + ' 🪙', '#ffd24b');
  }
  if (run.power <= 0) { run.power = 0; endRun(); }
}

/* ------------------------------ HUD ------------------------------------ */
function renderHud() {
  $('hPower').textContent  = fmt(run.power);
  $('hWeapon').textContent = WEAPONS[run.weapon].name;
  $('hDamage').textContent = fmt(damage());
  $('hCoins').textContent  = fmt(run.coins);
}

/* --------------------------- STATO E CICLO ----------------------------- */
let state = 'hub';                 // hub | run | finale | result
let runT = 0;
const clock = new THREE.Clock();

function startRun() {
  run.power  = UPGRADES.power.value(meta.up.power);
  run.weapon = meta.up.weapon;
  run.coins = 0; run.gems = 0; run.depth = 0; run.swing = 0;
  run.buffs = { income: 0, rate: 0, gain: 0 };
  run.x = 0; run.targetX = 0; run.z = 0;
  hero.rotation.x = 0;
  setWeapon(hero, run.weapon);
  buildRun();
  renderBuffRail(run.buffs);
  renderHud();
  runT = 0;
  state = 'run';
  showScreen(null);
}

function endRun() {
  state = 'result';
  const record = run.depth > meta.best;
  const bonus = Math.round(run.depth * 6 * coinMul());
  const total = run.coins + bonus;
  meta.coins += total;
  meta.gems  += run.gems;
  meta.level++;
  if (run.depth > meta.best) meta.best = run.depth;
  writeSave(meta);

  $('resDepth').textContent = run.depth;
  $('resInfo').textContent  = 'Bottino ' + fmt(run.coins) + ' + bonus ' + fmt(bonus);
  $('resCoins').textContent = '+' + fmt(total);
  $('resTitle').textContent = record ? 'NUOVO RECORD!' : 'FINE CORSA';
  setTimeout(() => { showScreen('result'); renderWallet(); }, 700);
}

$('playBtn').onclick   = () => startRun();
$('againBtn').onclick  = () => startRun();
$('homeBtn').onclick   = () => { renderHub(); showScreen('hub'); state = 'hub'; buildRun(); };

/* -------------------------------- INPUT -------------------------------- */
let dragging = false, lastPX = 0;
addEventListener('pointerdown', e => { dragging = true; lastPX = e.clientX; });
addEventListener('pointerup',     () => { dragging = false; });
addEventListener('pointercancel', () => { dragging = false; });
addEventListener('pointermove', e => {
  if (!dragging || (state !== 'run' && state !== 'finale')) return;
  run.targetX = clamp(run.targetX + (e.clientX - lastPX) * CFG.strafe,
                      -CFG.laneLimit, CFG.laneLimit);
  lastPX = e.clientX;
});
addEventListener('keydown', e => {
  if (state !== 'run' && state !== 'finale') return;
  if (e.key === 'ArrowLeft')  run.targetX = clamp(run.targetX - 1.2, -CFG.laneLimit, CFG.laneLimit);
  if (e.key === 'ArrowRight') run.targetX = clamp(run.targetX + 1.2, -CFG.laneLimit, CFG.laneLimit);
});

/* --------------------------------- LOOP -------------------------------- */
const HIT_X = 1.15;         // quanto devi essere vicino in X per toccare qualcosa

function update(dt) {
  const playing = state === 'run' || state === 'finale';

  if (playing) {
    runT += dt;
    run.z -= CFG.speed * dt;
    run.x = lerp(run.x, run.targetX, 1 - Math.pow(0.0015, dt));

    for (const it of items) {
      if (it.done || run.z > it.z) continue;
      it.done = true;
      if (Math.abs(run.x - it.x) > HIT_X) continue;     // schivato
      if (it.kind === 'tower')      hitTower(it);
      else if (it.kind === 'enemy') hitEnemy(it);
      else if (it.kind === 'craft') takeCraft(it);
      else if (it.kind === 'block') hitFinaleBlock(it);
      else                          takePickup(it);
      if (state === 'result') break;
    }

    if (state === 'run' && run.z <= finaleStartZ + CFG.finaleGap) state = 'finale';

    // superato l'ultimo blocco senza esaurire la potenza: corsa perfetta
    if (state === 'finale' && run.z < finaleStartZ - CFG.finaleRows * CFG.finaleGap - 6) endRun();

    renderHud();
    const p = state === 'finale'
      ? 1
      : clamp(run.z / finaleStartZ, 0, 1);
    $('progress').style.width = p * 100 + '%';
  }

  /* --- eroe --- */
  hero.position.set(run.x, playing ? Math.abs(Math.sin(runT * 9)) * 0.09 : 0, run.z);
  if (playing) animateRun(hero, runT, 0);
  else animateIdle(hero, runT, 0);

  // colpo: il braccio armato scatta in avanti
  if (run.swing > 0) {
    run.swing = Math.max(0, run.swing - dt * 3);
    const L = hero.userData.limbs;
    if (L) L.armR.rotation.x = -2.2 * Math.sin(run.swing / 0.35 * Math.PI);
  }

  shadow.position.set(run.x, 0.03, run.z);

  /* --- nemici abbattuti e scaglie --- */
  for (const it of items) {
    if (it.kind === 'enemy' && it.mob && it.mob.userData.dying) {
      it.mob.rotation.x = lerp(it.mob.rotation.x, 1.5, 1 - Math.pow(0.02, dt));
      it.obj.position.y -= dt * 1.2;
      if (it.obj.position.y < -3) { it.obj.visible = false; it.mob.userData.dying = false; }
    } else if (!it.done && (it.kind === 'coin' || it.kind === 'gem' || it.kind === 'buff')) {
      it.obj.rotation.y += dt * (it.spin || 1.5);
    } else if (!it.done && it.kind === 'enemy' && it.obj.visible) {
      animateIdle(it.mob, runT, it.z * 0.2);
    }
  }
  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i];
    d.userData.vel.y -= 26 * dt;
    d.position.addScaledVector(d.userData.vel, dt);
    d.rotation.x += dt * 6; d.rotation.z += dt * 5;
    d.userData.life -= dt;
    if (d.userData.life <= 0) { world.remove(d); debris.splice(i, 1); }
  }

  /* --- camera --- */
  const menu = state === 'hub' || state === 'result';
  camera.position.x = lerp(camera.position.x, run.x * 0.4, 1 - Math.pow(0.01, dt));
  camera.position.y = lerp(camera.position.y, menu ? 5.0 : 6.2, 1 - Math.pow(0.02, dt));
  camera.position.z = lerp(camera.position.z, run.z + (menu ? 13 : 14), 1 - Math.pow(0.005, dt));
  camera.lookAt(run.x * 0.5, menu ? 1.3 : 1.6, run.z - (menu ? 12 : 24));
}

/* hook di debug */
window.BlockyRun = {
  run, items, meta, CFG, WEAPONS,
  get state() { return state; },
  get damage() { return damage(); },
  setPower(n) { run.power = n; renderHud(); },
  moveTo(x) { run.targetX = clamp(x, -CFG.laneLimit, CFG.laneLimit); },
  start() { startRun(); }
};

camera.position.set(2, 3.6, 8);
renderHub();
showScreen('hub');
setWeapon(hero, meta.up.weapon);
buildRun();

(function loop() {
  requestAnimationFrame(loop);
  update(Math.min(clock.getDelta(), 0.05));
  renderer.render(scene, camera);
})();
