/* =====================================================================
   GAME — la corsa verso la torre.
   Prima metà: accumuli potenza scegliendo cosa spaccare e cosa schivare.
   Seconda metà: la spendi sfondando il muro. Quello che ti resta è
   quello con cui affronti il boss ai piedi della torre.
   ===================================================================== */

initArt();

/* --------------------------- ETICHETTE 3D ---------------------------- */
function labelTexture(text, color) {
  const c = document.createElement('canvas');
  c.width = 320; c.height = 160;
  const g = c.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = 112;
  do {
    g.font = 'bold ' + size + 'px system-ui, Arial, sans-serif';
    size -= 4;
  } while (g.measureText(text).width > 292 && size > 24);
  g.lineJoin = 'round';
  g.lineWidth = size * 0.22; g.strokeStyle = 'rgba(24,20,38,.9)';
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
  broken: 0,               // blocchi del muro sfondati
  bossHp: 0, clash: 0,
  outcome: '',             // 'wall' | 'boss' | 'win'
  beatRecord: false,
  swing: 0,
  unit: 1,                 // il passo della torre in corso (vedi trackUnit)
  speed: CFG.speed,
  phaseStart: 0,           // potenza all'inizio del muro / del duello
  revived: false           // la seconda occasione vale una volta per corsa
};

/* Il colpo è un multiplo del passo della torre, come le colonne che deve
   rompere: è il rapporto fra i due numeri a decidere cosa si spacca. */
const damage  = () => Math.round(WEAPONS[run.weapon].hit * run.unit *
                                 (1 + run.buffs.rate * BUFFS.rate.step));
const gainMul = () => UPGRADES.power.value(meta.up.power) *
                     (1 + run.buffs.gain * BUFFS.gain.step) * runeMul(meta.runes);
const coinMul = () => UPGRADES.income.value(meta.up.income) *
                     (1 + run.buffs.income * BUFFS.income.step) * runeMul(meta.runes);

/* --------------------------------- EROE -------------------------------- */
const hero = buildHero();
hero.rotation.y = Math.PI;                 // di spalle: corre verso −Z
scene.add(hero);

const shadow = new THREE.Mesh(
  GEO.disc,
  new THREE.MeshBasicMaterial({ color: 0x1b2a3a, transparent: true, opacity: 0.16 })
);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = 0.04;
shadow.scale.setScalar(1.25);
scene.add(shadow);

/* --------------------------- OGGETTI DI PISTA -------------------------- */
const items = [];

/* Torre di mattoni da spaccare: il numero dice quanto è dura, il colore
   se ce la fai. È tornata a essere una costruzione — un cristallo sembrava
   un premio da raccogliere, un cono con la punta sembrava un omino. */
function spawnPillar(x, z, hp) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const courses = clamp(2 + Math.round(Math.log10(Math.max(hp, 1)) * 1.3), 2, 5);
  const parts = [];

  for (let i = 0; i < courses; i++) {
    const r = 2.15 - i * 0.09;
    parts.push(putOn(g, GEO.cyl12, MAT.good,     0, i * 0.92,        0, r, 0.92, r));
    parts.push(putOn(g, GEO.cyl12, MAT.goodDark, 0, i * 0.92 + 0.86, 0, r + 0.08, 0.14, r + 0.08));
  }
  // coronamento con le merlature: dice "costruzione" anche in silhouette
  const top = courses * 0.92;
  const rt = 2.15 - (courses - 1) * 0.09 + 0.12;
  parts.push(putOn(g, GEO.cyl12, MAT.goodLite, 0, top, 0, rt, 0.30, rt));
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    parts.push(putOn(g, GEO.box, MAT.goodLite,
                     Math.sin(a) * rt * 0.42, top + 0.30, Math.cos(a) * rt * 0.42,
                     0.40, 0.34, 0.40));
  }

  const sprite = labelSprite(fmt(hp), '#ffffff', 0.82);
  sprite.position.set(0, top + 1.9, 0);
  g.add(sprite);
  castShadows(g);
  world.add(g);
  return { obj: g, sprite, parts, courses };
}

/* Nemico appostato sulla corsia: lo abbatti per l'oro, o ti costa potenza. */
function spawnEnemy(x, z, hp, kind) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const m = buildEnemy(kind);
  g.add(m);
  const sprite = labelSprite(fmt(hp), '#ffffff', 0.72);
  sprite.position.set(0, 2.6, 0);
  g.add(sprite);
  world.add(g);
  return { obj: g, sprite, mob: m };
}

/* L'arma successiva, posata sulla corsia. Niente più arco da
   attraversare: si vede l'oggetto — spada, ascia, martello — e si capisce
   da solo cosa fa. */
function spawnWeaponPickup(x, z, tier) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  // alone e anello a terra: dicono "raccoglimi"
  const halo = put(g, GEO.disc, new THREE.MeshBasicMaterial({
    color: 0xffe9a8, transparent: true, opacity: 0.3 }), 0, 0.06, 0, 2.9);
  halo.rotation.x = -Math.PI / 2;
  halo.userData.noOutline = true;
  const ring = put(g, GEO.ring, MAT.gold, 0, 0.12, 0, 3.6, 3.6, 3.6);
  ring.rotation.x = -Math.PI / 2;

  const swirl = new THREE.Group();
  swirl.position.set(0, 2.5, 0);
  const model = buildWeaponModel(tier);
  model.scale.setScalar(2.3);
  model.rotation.z = 0.42;
  addOutline(model, 0.05);
  swirl.add(model);
  g.add(swirl);

  const sprite = labelSprite(weaponName(tier), '#ffe07a', 0.72);
  sprite.position.set(0, 5.0, 0);
  g.add(sprite);

  world.add(g);
  return { obj: g, sprite, swirl };
}

/* Raccolte: oro, gemme e i bonus della colonnina di sinistra. */
function spawnPickup(x, z, kind) {
  const g = new THREE.Group();
  g.position.set(x, 1.1, z);
  if (kind === 'coin') {
    const c = put(g, GEO.cyl, MAT.gold, 0, 0, 0, 0.75, 0.16, 0.75);
    c.rotation.x = Math.PI / 2;
  } else if (kind === 'gem') {
    put(g, GEO.octa, mat(0x4fe3d5), 0, 0, 0, 0.7, 1.0, 0.7);
  } else {
    const col = { income: 0xffd24b, rate: 0xff9d5c, gain: 0x7cc9ff }[kind];
    put(g, GEO.octa, mat(col), 0, 0, 0, 0.85, 1.0, 0.85);
    const s = labelSprite('+' + Math.round(BUFFS[kind].step * 100) + '%', '#ffffff', 0.5);
    s.position.set(0, 1.1, 0);
    g.add(s);
  }
  world.add(g);
  return { obj: g, spin: rnd(1.4, 2.4) };
}

/* -------------------------------- MURO --------------------------------- */
/* Trenta blocchi separano dalla torre. Ognuno costa potenza; nella
   stessa riga i tre costi sono diversi, quindi si sceglie ancora. */
function spawnWallBlock(x, z, cost, chest) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  putOn(g, GEO.box, chest ? MAT.chestWood : MAT.wallBrick, 0, 0, 0, 2.36, 1.6, 1.5);
  putOn(g, GEO.box, chest ? MAT.gold : MAT.wallDark, 0, 1.6, 0, 2.42, 0.3, 1.6);
  const sprite = labelSprite(fmt(cost), chest ? '#ffd24b' : '#ffffff', 0.58);
  sprite.position.set(0, 2.5, 0);
  g.add(sprite);
  castShadows(g);
  world.add(g);
  return { obj: g, sprite };
}

/* Cartello di traverso: dove sei arrivato l'ultima volta, e il record. */
function buildMarker(depth, label, color) {
  if (depth < 1 || depth >= CFG.wallRows) return null;
  const z = wallStartZ - (depth - 0.5) * wallGap;
  const g = new THREE.Group();
  g.position.set(0, 0, z);
  const w = CFG.trackWidth + 2;

  putOn(g, GEO.cyl, MAT.stoneDark, -w / 2, 0, 0, 0.4, 6, 0.4);
  putOn(g, GEO.cyl, MAT.stoneDark,  w / 2, 0, 0, 0.4, 6, 0.4);
  const band = new THREE.Mesh(
    new THREE.PlaneGeometry(w, 1.2),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92,
                                  side: THREE.DoubleSide })
  );
  band.position.set(0, 5, 0);
  g.add(band);
  const s = labelSprite(label, '#ffffff', 0.48);
  s.position.set(0, 5, 0.12);
  g.add(s);

  world.add(g);
  return g;
}

/* ---------------------------- GENERAZIONE ------------------------------ */
let rows = 0, wallStartZ = 0, towerZ = 0, bossZ = 0, levelLen = 0;
/* Le torri alte si corrono più in fretta, ma il muro no: i blocchi si
   distanziano insieme alla velocità, così il tempo per scegliere la
   corsia resta lo stesso. Senza questo, dalla nona torre in poi non si
   farebbe in tempo a raggiungere il blocco più economico e il muro
   diventerebbe una lotteria di riflessi. */
let wallGap = CFG.wallGap;
let tower = null, boss = null, bossSprite = null, heroSprite = null;

function buildRun() {
  applyTheme(themeFor(meta.level));   // la zona cambia ad ogni torre
  initArt();
  clearWorld();
  items.length = 0;
  tower = null; boss = null; bossSprite = null; heroSprite = null;

  rows = trackRows(meta.level);
  run.unit  = trackUnit(meta.level);   // il passo di QUESTA torre
  run.speed = speedFor(meta.level);
  wallGap   = CFG.wallGap * run.speed / CFG.speed;
  const unit = run.unit;
  let z = CFG.firstRowZ;
  let refTier = meta.up.weapon;

  for (let i = 0; i < rows; i++) {
    const lanes = shuffle([0, 1, 2]);
    const weaponRow = i % 4 === 3 && refTier < WEAPONS.length - 1;

    // corsia 1: la torre alla tua portata — il guadagno
    const easyHp = Math.max(1, Math.round(unit * rnd(0.55, 0.95)));
    items.push(Object.assign({ kind: 'pillar', z, x: CFG.laneX[lanes[0]], hp: easyHp, done: false },
                             spawnPillar(CFG.laneX[lanes[0]], z, easyHp)));

    // corsia 2: l'arma da raccogliere, oppure una minaccia
    if (weaponRow) {
      items.push(Object.assign({ kind: 'weapon', z, x: CFG.laneX[lanes[1]], tier: refTier + 1, done: false },
                               spawnWeaponPickup(CFG.laneX[lanes[1]], z, refTier + 1)));
      refTier++;
    } else if (Math.random() < 0.32) {
      const hp = Math.max(1, Math.round(unit * rnd(0.6, 1.7)));
      items.push(Object.assign({ kind: 'enemy', z, x: CFG.laneX[lanes[1]], hp, done: false },
                               spawnEnemy(CFG.laneX[lanes[1]], z, hp, pick(ENEMY_KINDS))));
    } else {
      /* Il tetto delle colonne dure arriva oltre la portata del Martello
         (2,7 passi) e sfiora quella della Lama Rúna (3,5): senza, dalla
         quarta tacca d'ARMA in poi era tutto verde, il colore smetteva di
         dire qualcosa e l'arma a terra diventava una trappola — costava
         una riga di bottino e non apriva niente. */
      const hardHp = Math.round(unit * rnd(1.4, 3.8));
      items.push(Object.assign({ kind: 'pillar', z, x: CFG.laneX[lanes[1]], hp: hardHp, done: false },
                               spawnPillar(CFG.laneX[lanes[1]], z, hardHp)));
    }

    /* corsia 3: quasi sempre occupata. Era libera più di una volta su
       due, e una corsia vuota rende la riga una non-scelta: si tirava
       dritto senza rischiare niente. */
    if (Math.random() < 0.70) {
      const hardHp = Math.round(unit * rnd(1.3, 3.2));
      items.push(Object.assign({ kind: 'pillar', z, x: CFG.laneX[lanes[2]], hp: hardHp, done: false },
                               spawnPillar(CFG.laneX[lanes[2]], z, hardHp)));
    }

    // raccolte fra una riga e l'altra
    const pz = z + CFG.rowSpacing * 0.5;
    if (i > 0) {
      if (Math.random() < 0.26) {
        const kind = pick(['income', 'rate', 'gain']);
        const lane = CFG.laneX[rint(0, 2)];
        items.push(Object.assign({ kind: 'buff', buff: kind, z: pz, x: lane, done: false },
                                 spawnPickup(lane, pz, kind)));
      } else {
        const lane = CFG.laneX[rint(0, 2)];
        for (let k = 0; k < 3; k++) {
          const cz = pz + k * 2.2;
          const kind = Math.random() < 0.12 ? 'gem' : 'coin';
          items.push(Object.assign({ kind, z: cz, x: lane, done: false },
                                   spawnPickup(lane, cz, kind)));
        }
      }
    }
    z -= CFG.rowSpacing;
  }

  wallStartZ = z - CFG.runOut + CFG.rowSpacing;

  /* Il muro: il costo complessivo del percorso migliore è wallBudget,
     così il bilanciamento sta in una sola formula invece che in trenta. */
  const budget = wallBudget(meta.level);
  let sumW = 0;
  for (let i = 0; i < CFG.wallRows; i++) sumW += 1 + i * 0.10;

  for (let i = 0; i < CFG.wallRows; i++) {
    const wz = wallStartZ - i * wallGap;
    const cheap = Math.max(1, Math.round(budget * (1 + i * 0.10) / sumW));
    /* La forbice fra le tre corsie era ×1 ×1,6 ×2,3: prendere il blocco
       sbagliato costava più del doppio, e alla velocità delle torri alte
       inseguire il più economico non è eseguibile — chi ci gioca smette
       di provarci. Stretta a ×1 ×1,35 ×1,7 sbagliare corsia si paga, ma
       non rovina la corsa. */
    const costs = shuffle([cheap, Math.round(cheap * 1.35), Math.round(cheap * 1.7)]);
    for (let l = 0; l < 3; l++) {
      const chest = Math.random() < 0.10;
      /* Lo scrigno è murato meglio: costa più del doppio in potenza, e
         paga in oro. È questa la scelta del muro — potenza o soldi — al
         posto di "quale dei tre numeri è più piccolo", che era un test di
         riflessi travestito da decisione.

         Prezzo e premio si calcolano tutti e due sul costo normale della
         corsia, non l'uno sull'altro: legandoli, alzare il prezzo alzava
         anche il premio e la scelta restava sempre uguale a sé stessa. */
      const cost = chest ? Math.round(costs[l] * CHEST_PRICE) : costs[l];
      const loot = chest ? Math.round(costs[l] * CHEST_LOOT)  : 0;
      items.push(Object.assign({ kind: 'block', z: wz, x: CFG.laneX[l],
                                 cost, loot, chest, done: false },
                               spawnWallBlock(CFG.laneX[l], wz, cost, chest)));
    }
  }

  towerZ = wallStartZ - CFG.wallRows * wallGap - CFG.towerGap;
  bossZ  = towerZ + 11;
  levelLen = Math.abs(towerZ) + 60;

  buildWorld(levelLen);
  buildFinishLine(wallStartZ + wallGap);

  if (meta.last && meta.last !== meta.best) buildMarker(meta.last, 'ULTIMA ' + meta.last, 0x2f7de0);
  buildMarker(meta.best, 'RECORD ' + meta.best, 0xe0a51a);

  tower = buildTower(towerZ);

  boss = buildBoss();
  boss.position.set(0, 0, bossZ);
  boss.scale.setScalar(1.9);
  world.add(boss);

  bossSprite = labelSprite(fmt(bossHealth(meta.level)), '#ff8f7a', 1.15);
  bossSprite.position.set(0, 6.4, bossZ);
  world.add(bossSprite);

  refreshThreats();
}

function buildFinishLine(z) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x += 16) {
    g.fillStyle = ((x + y) / 16) % 2 ? '#241d2e' : '#f4f7fb';
    g.fillRect(x, y, 16, 16);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 1);
  const m = new THREE.Mesh(GEO.box, new THREE.MeshLambertMaterial({ map: t }));
  m.position.set(0, 0.05, z);
  m.scale.set(CFG.trackWidth, 0.1, 2.4);
  world.add(m);
}

/* Il colore dice se quella colonna è alla tua portata adesso. Cambia
   appena l'arma sale: file che erano rosse diventano verdi. */
function refreshThreats() {
  const dmg = damage();
  for (const it of items) {
    if (it.done) continue;
    if (it.kind !== 'pillar' && it.kind !== 'enemy') continue;
    const ok = dmg >= it.hp;
    setLabel(it.sprite, fmt(it.hp), ok ? '#8dff87' : '#ff8a6e');
    if (it.parts) {
      const body = ok ? MAT.good : MAT.bad;
      const band = ok ? MAT.goodDark : MAT.badDark;
      const lite = ok ? MAT.goodLite : MAT.badLite;
      const n = it.courses * 2;
      it.parts.forEach((m, i) => {
        m.material = i >= n ? lite : (i % 2 ? band : body);
      });
    }
  }
}

/* --------------------------- LEGGIBILITÀ ------------------------------
   Le etichette sono disegnate sopra a tutto (`depthTest: false`), così un
   numero non finisce mai dietro alla colonna che descrive. Il rovescio è
   che non si nascondono neanche fra loro: dalla linea a scacchi si
   vedevano tutti e novanta i numeri del muro impilati in una macchia.

   Quindi svaniscono con la distanza. Il muro prima degli altri: le sue
   righe stanno a 4,5 unità l'una dall'altra e contano solo quelle su cui
   stai per decidere, mentre le colonne della pista, distanti 30, vanno
   viste da lontano per avere il tempo di scegliere la corsia. */
const LABEL_RANGE = {
  block  : { near: 16, far: 34 },
  default: { near: 42, far: 78 }
};

function fadeLabels() {
  for (const it of items) {
    const s = it.sprite;
    if (!s || it.done || !it.obj.visible) continue;
    const r = LABEL_RANGE[it.kind] || LABEL_RANGE.default;
    const d = run.z - it.z;                    // >0: ancora davanti a noi
    const a = d < 0 ? 0
            : d < r.near ? 1
            : d > r.far  ? 0
            : 1 - (d - r.near) / (r.far - r.near);
    s.visible = a > 0.02;
    s.material.opacity = a;
  }
}

/* ------------------------------ RISOLUZIONE ---------------------------- */
const debris = [];

function shatter(group, n, material) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(GEO.octa, material || MAT.stone);
    m.scale.setScalar(rnd(0.3, 0.65));
    m.position.copy(group.position);
    m.position.y += rnd(0.6, 2.6);
    m.userData.vel = new THREE.Vector3(rnd(-7, 7), rnd(5, 10), rnd(2, 9));
    m.userData.life = 1.1;
    world.add(m);
    debris.push(m);
  }
}

function hitPillar(it) {
  const dmg = damage();
  run.swing = 0.35;
  if (dmg >= it.hp) {
    const gain = Math.round(it.hp * 3 * gainMul());
    run.power += gain;
    popup('+' + fmt(gain), '#8dff87');
    shatter(it.obj, 8, MAT.good);
  } else {
    /* Sbagliare colonna costa il 18%: con la pista più fitta le rosse si
       incontrano più spesso, e il prezzo dev'essere abbastanza alto da
       far scegliere davvero. */
    const loss = Math.max(3, Math.round(run.power * 0.18));
    run.power = Math.max(0, run.power - loss);
    popup('−' + fmt(loss), '#ff7a6e');
    shatter(it.obj, 8, MAT.bad);
  }
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

function takeWeapon(it) {
  run.weapon = clamp(it.tier, 0, WEAPONS.length - 1);
  setWeapon(hero, run.weapon);
  popup('⚔ ' + weaponName(run.weapon), '#ffe07a');
  it.obj.visible = false;
  refreshThreats();
}

function takePickup(it) {
  /* Una moneta vale in proporzione alla torre. Era fissa a 8 d'oro: alla
     prima torre erano soldi, alla decima — dove un potenziamento costa
     quattordicimila — era decorazione che luccicava. */
  if (it.kind === 'coin')      run.coins += Math.round(run.unit * 1.1 * coinMul());
  else if (it.kind === 'gem') { run.gems += 1; popup('+1 💎', '#4fe3d5'); }
  else {
    run.buffs[it.buff]++;
    const b = BUFFS[it.buff];
    popup(b.icon + ' +' + Math.round(b.step * 100) + '%', b.color);
    renderBuffRail(run.buffs);
    if (it.buff === 'rate') refreshThreats();
  }
  it.obj.visible = false;
}

function hitWallBlock(it) {
  run.power -= it.cost;
  shatter(it.obj, 6, it.chest ? MAT.gold : MAT.wall);
  it.obj.visible = false;
  run.broken++;
  if (it.chest) {
    const c = Math.round(it.loot * coinMul());
    run.coins += c;
    popup('+' + fmt(c) + ' 🪙', '#ffd24b');
  }
  if (!run.beatRecord && meta.best > 0 && run.broken > meta.best) {
    run.beatRecord = true;
    flashBanner(t('run.record'));
  }
  /* Prima il muro, poi la potenza: se l'ultimo blocco ti prosciuga fino a
     zero il muro l'hai comunque sfondato, e a fermarti dev'essere il boss. */
  if (run.broken >= CFG.wallRows) startBossFight();
  else if (run.power <= 0) { run.power = 0; endRun('wall'); }
}

/* ------------------------------ IL BOSS -------------------------------- */
/* Sfondato il muro, quello che resta è la forza con cui lo affronti.
   I due numeri scendono insieme: chi arriva a zero per primo cade. */
function startBossFight() {
  state = 'boss';
  run.phaseStart = run.power;            // per la seconda occasione
  run.bossHp = bossHealth(meta.level);
  run.clash = Math.max(run.power, run.bossHp) / 1.5;   // ~1.5s di scontro

  heroSprite = labelSprite(fmt(run.power), '#8dff87', 1.0);
  scene.add(heroSprite);
  flashBanner(t('run.jailer'));
}

function updateBossFight(dt) {
  // corsa fino a sotto la torre, poi lo scontro
  const stopZ = bossZ + 7;
  if (run.z > stopZ) {
    run.z -= run.speed * dt;
    run.x = lerp(run.x, 0, 1 - Math.pow(0.004, dt));
    return;
  }
  const step = run.clash * dt;
  run.power  = Math.max(0, run.power - step);
  run.bossHp = Math.max(0, run.bossHp - step);

  setLabel(heroSprite, fmt(run.power), '#8dff87');
  setLabel(bossSprite, fmt(run.bossHp), '#ff8f7a');
  run.swing = 0.3;

  if (run.bossHp <= 0)      endRun('win');
  else if (run.power <= 0)  endRun('boss');
}

/* ------------------------------ HUD ------------------------------------ */
function renderHud() {
  $('hPower').textContent  = fmt(run.power);
  $('hWeapon').textContent = weaponName(run.weapon);
  $('hDamage').textContent = fmt(damage());
  $('hCoins').textContent  = fmt(run.coins);
  $('hWall').textContent   = run.broken + '/' + CFG.wallRows;
}

/* --------------------------- STATO E CICLO ----------------------------- */
let state = 'hub';                 // hub | run | wall | boss | over
let runT = 0;
const clock = new THREE.Clock();

function startRun() {
  run.power  = START_POWER;      // POTENZA adesso moltiplica quello che raccogli
  run.weapon = meta.up.weapon;
  run.coins = 0; run.gems = 0; run.broken = 0; run.swing = 0;
  run.beatRecord = false; run.outcome = '';
  run.phaseStart = 0; run.revived = false;
  run.buffs = { income: 0, rate: 0, gain: 0 };
  run.x = 0; run.targetX = 0; run.z = 0;
  hero.rotation.x = 0;
  if (heroSprite) { scene.remove(heroSprite); heroSprite = null; }
  setWeapon(hero, run.weapon);
  buildRun();
  renderBuffRail(run.buffs);
  renderHud();
  runT = 0;
  state = 'run';
  showScreen(null);
}

const OUTCOMES = { wall: 'run.stoppedBig', boss: 'run.beatenBig', win: 'run.freedBig' };

/* ------------------------ SECONDA OCCASIONE ---------------------------
   I diamanti si raccoglievano e non si spendevano mai: un numero che
   promette qualcosa e non mantiene. Adesso comprano l'unica cosa che in
   questo gioco si desidera davvero — un altro tentativo *dentro la stessa
   corsa*, nel momento in cui ti fermi a due blocchi dalla torre.

   Restituisce metà della potenza con cui avevi iniziato la fase in cui sei
   caduto, non metà di quella che ti serviva: così è un aiuto a chi c'era
   quasi, non un modo per comprare una torre fuori portata. Una volta sola
   per corsa — e solo se quella metà può davvero cambiare come finisce
   (vedi reviveUseful). */
const REVIVE_COST    = 5;
const REVIVE_SHARE   = 0.5;
const REVIVE_SECONDS = 7;

const gemsAvailable = () => meta.gems + run.gems;

/* si pagano prima con quelli raccolti adesso, poi con quelli in cassa */
function spendGems(n) {
  const daCorsa = Math.min(run.gems, n);
  run.gems -= daCorsa;
  meta.gems -= (n - daCorsa);
}

let reviveRAF = 0;

/* Quanto costerebbe finire il muro giocandolo bene: la somma del blocco
   più economico di ogni riga che resta. Serve a sapere se una seconda
   occasione può davvero portarti dall'altra parte. */
function remainingWallCost() {
  const perRiga = new Map();
  for (const it of items) {
    if (it.kind !== 'block' || it.done) continue;
    const z = Math.round(it.z);
    perRiga.set(z, Math.min(perRiga.has(z) ? perRiga.get(z) : Infinity, it.cost));
  }
  let somma = 0;
  for (const c of perRiga.values()) somma += c;
  return somma;
}

const reviveAmount = () => Math.max(1, Math.round(run.phaseStart * REVIVE_SHARE));

/* L'offerta compare solo se può cambiare come va a finire.
   Sfondare l'ultimo blocco del muro con la potenza a zero è legittimo — il
   muro l'hai preso — ma ti fa entrare nel duello a mani vuote, e metà di
   zero è zero: il gioco offriva "+1 potenza" per cinque diamanti. Vendere
   qualcosa che non può servire è peggio che non vendere niente. */
function reviveUseful(outcome) {
  const torna = reviveAmount();
  if (outcome === 'boss') {
    /* nel duello i due numeri scendono insieme: o superi quello che resta
       al carceriere, o hai buttato i diamanti */
    return torna > run.bossHp;
  }
  /* al muro basta che possa portarti dall'altra parte giocando bene */
  return torna >= remainingWallCost();
}

function canRevive(outcome) {
  return (outcome === 'wall' || outcome === 'boss') &&
         !run.revived && gemsAvailable() >= REVIVE_COST &&
         reviveUseful(outcome);
}

function offerRevive(outcome) {
  state = 'offer';
  const torna = reviveAmount();
  /* "ti mancava poco" solo se è vero: dirlo a chi si è fermato al quinto
     blocco è una presa in giro, e si vede subito */
  const vicino = outcome === 'wall' ? run.broken >= CFG.wallRows - 6
                                    : run.bossHp <= run.phaseStart;
  $('rvHead').textContent = t(vicino ? 'rv.close' : 'rv.over');
  $('rvWhy').textContent = outcome === 'wall'
    ? t('rv.byWall', run.broken, CFG.wallRows)
    : t('rv.byBoss');
  $('rvCost').textContent = '💎 ' + REVIVE_COST;
  $('rvGain').textContent = t('rv.gain', fmt(torna));
  $('rvLeft').textContent = t('rv.have', gemsAvailable());
  $('revive').classList.remove('hidden');

  const fine = performance.now() + REVIVE_SECONDS * 1000;
  cancelAnimationFrame(reviveRAF);
  (function conta() {
    const resta = (fine - performance.now()) / (REVIVE_SECONDS * 1000);
    if (state !== 'offer') return;
    if (resta <= 0) { closeRevive(); finishRun(outcome); return; }
    $('rvBar').style.width = (resta * 100) + '%';
    reviveRAF = requestAnimationFrame(conta);
  })();

  $('rvGo').onclick = () => { closeRevive(); doRevive(outcome); };
  $('rvNo').onclick = () => { closeRevive(); finishRun(outcome); };
}

function closeRevive() {
  cancelAnimationFrame(reviveRAF);
  $('revive').classList.add('hidden');
}

function doRevive(outcome) {
  spendGems(REVIVE_COST);
  run.revived = true;
  meta.towerRevived = 1;          // il diario lo segna con un asterisco
  run.power = reviveAmount();
  flashBanner(t('rv.taken'));
  renderHud();
  /* si riprende esattamente da dove si era caduti: davanti al muro col
     conto dei blocchi intatto, o nel duello con il boss già ferito */
  state = outcome === 'wall' ? 'wall' : 'boss';
}

function endRun(outcome) {
  if (canRevive(outcome)) { offerRevive(outcome); return; }
  finishRun(outcome);
}

function finishRun(outcome) {
  state = 'over';
  run.outcome = outcome;

  /* il diario: ogni corsa è un tentativo sulla torre corrente */
  meta.tries = (meta.tries || 0) + 1;

  const record = run.broken > meta.best;
  /* Il premio della vittoria era 200×torre: da solo pagava i potenziamenti
     della torre successiva, che cadeva al primo tentativo. */
  const total  = run.coins + Math.round(run.broken * run.unit * 0.8 * coinMul())
               + (outcome === 'win' ? Math.round(90 * meta.level * coinMul()) : 0);

  meta.coins += total;
  meta.gems  += run.gems;
  meta.last  = run.broken;
  meta.lastCoins = total;
  meta.lastRecord = record;
  meta.lastOutcome = outcome;
  if (record) meta.best = run.broken;
  if (outcome === 'win') {
    meta.diary = meta.diary || [];
    meta.diary.push({ l: meta.level, t: meta.tries, r: meta.towerRevived ? 1 : 0 });
    if (meta.diary.length > 30) meta.diary.shift();
    meta.tries = 0; meta.towerRevived = 0;
    meta.level++;
    meta.bestLevel = Math.max(meta.bestLevel || 1, meta.level);
    meta.best = 0; meta.last = 0;
  }
  writeSave(meta);

  if (outcome === 'win') {
    flashBanner(t('run.freedBig'));
    if (boss) boss.userData.falling = true;
  } else {
    flashBanner(t(OUTCOMES[outcome]));
    hero.userData.falling = true;
  }
  setTimeout(backToHub, outcome === 'win' ? 3400 : 2200);
}

/* Niente schermata intermedia: si finisce e si è già davanti ai
   potenziamenti, con il riepilogo della corsa appena chiusa. */
function backToHub() {
  state = 'hub';
  run.x = 0; run.targetX = 0; run.z = 0;
  hero.rotation.x = 0;
  hero.userData.falling = false;
  if (heroSprite) { scene.remove(heroSprite); heroSprite = null; }
  setWeapon(hero, meta.up.weapon);
  buildRun();
  renderHub();
  showScreen('hub');
  snapCamera();
}

$('playBtn').onclick = () => startRun();

/* Cambiata la lingua, le etichette 3D restano quelle di prima: sono
   texture disegnate una volta sola. Si ricostruisce il mondo. */
langHook = () => { buildRun(); renderHud(); renderHub(); };

/* Rinascita e ricomincia cambiano zona e potenziamenti: il mondo va
   ricostruito da zero. */
rebuildHook = () => {
  run.x = 0; run.targetX = 0; run.z = 0;
  setWeapon(hero, meta.up.weapon);
  buildRun();
  snapCamera();
};

/* -------------------------------- INPUT -------------------------------- */
const steering = () => state === 'run' || state === 'wall';
let dragging = false, lastPX = 0;
addEventListener('pointerdown', e => { dragging = true; lastPX = e.clientX; });
addEventListener('pointerup',     () => { dragging = false; });
addEventListener('pointercancel', () => { dragging = false; });
addEventListener('pointermove', e => {
  if (!dragging || !steering()) return;
  /* Il passo si misura in fette di schermo, non in pixel: un pixel vale
     mondi diversi su schermi diversi, e con la conversione fissa di prima
     lo stesso trascinamento attraversava più corsie su un telefono che
     su un altro. */
  run.targetX = clamp(run.targetX + (e.clientX - lastPX) * worldPerPixel() * CFG.strafe,
                      -CFG.laneLimit, CFG.laneLimit);
  lastPX = e.clientX;
});
addEventListener('keydown', e => {
  if (!steering()) return;
  if (e.key === 'ArrowLeft')  run.targetX = clamp(run.targetX - 1.2, -CFG.laneLimit, CFG.laneLimit);
  if (e.key === 'ArrowRight') run.targetX = clamp(run.targetX + 1.2, -CFG.laneLimit, CFG.laneLimit);
});

/* --------------------------------- LOOP -------------------------------- */
const HIT_X = 1.15;

/* La corsia più vicina al giocatore. Serve al muro: fra un blocco e
   l'altro non c'è spazio da cui passare, quindi la riga si risolve sempre
   sul blocco più vicino invece che sulla distanza. Prima, tenendosi a
   x = ±1.2 — esattamente a metà fra due corsie — si attraversava tutto il
   muro senza rompere niente e senza pagare nulla. */
function nearestLaneX() {
  let best = CFG.laneX[0], bd = Infinity;
  for (const lx of CFG.laneX) {
    const d = Math.abs(run.x - lx);
    if (d < bd) { bd = d; best = lx; }
  }
  return best;
}

function update(dt) {
  if (steering()) {
    runT += dt;
    run.z -= run.speed * dt;
    run.x = lerp(run.x, run.targetX, 1 - Math.pow(0.0015, dt));

    const lane = nearestLaneX();
    for (const it of items) {
      if (it.done || run.z > it.z) continue;
      it.done = true;
      const touched = it.kind === 'block' ? it.x === lane          // il muro è pieno
                                          : Math.abs(run.x - it.x) <= HIT_X;
      if (!touched) continue;                                      // schivato
      if (it.kind === 'pillar')      hitPillar(it);
      else if (it.kind === 'enemy')  hitEnemy(it);
      else if (it.kind === 'weapon') takeWeapon(it);
      else if (it.kind === 'block')  hitWallBlock(it);
      else                           takePickup(it);
      if (!steering()) break;
    }

    if (state === 'run' && run.z <= wallStartZ + wallGap) {
      state = 'wall';
      run.phaseStart = run.power;        // per la seconda occasione
    }
    /* Se per qualsiasi motivo si arriva ai piedi della torre senza aver
       consumato il muro, lo scontro parte comunque: nessuna corsa deve
       poter oltrepassare il boss senza affrontarlo. */
    if (state === 'wall' && run.z <= bossZ + 14) startBossFight();
    renderHud();
    $('progress').style.width = clamp(run.z / towerZ, 0, 1) * 100 + '%';

  } else if (state === 'boss') {
    runT += dt;
    updateBossFight(dt);
    renderHud();
  }

  /* --- eroe --- */
  const moving = steering() || (state === 'boss' && run.z > bossZ + 7);
  hero.position.set(run.x, moving ? Math.abs(Math.sin(runT * 9)) * 0.09 : 0, run.z);
  if (moving) animateRun(hero, runT, 0);
  else if (state !== 'over') animateIdle(hero, runT, 0);

  if (run.swing > 0) {
    run.swing = Math.max(0, run.swing - dt * 3);
    const L = hero.userData.limbs;
    if (L) L.armR.rotation.x = -2.2 * Math.sin(run.swing / 0.35 * Math.PI);
  }
  if (hero.userData.falling) hero.rotation.x = lerp(hero.rotation.x, 1.4, 1 - Math.pow(0.02, dt));

  shadow.position.set(run.x, 0.04, run.z);
  moveSun(run.x, run.z);
  if (heroSprite) heroSprite.position.set(run.x, 3.4, run.z);

  /* --- boss e principessa --- */
  if (boss) {
    if (boss.userData.falling) {
      boss.rotation.x = lerp(boss.rotation.x, -1.4, 1 - Math.pow(0.02, dt));
      if (bossSprite) bossSprite.visible = false;
    } else {
      animateIdle(boss, runT, 1.3);
    }
  }
  if (tower && tower.princess) {
    tower.princess.position.y = tower.height + 2.2 + Math.sin(runT * 2) * 0.08;
    animateIdle(tower.princess, runT, 0.6);
  }

  fadeLabels();

  /* --- nemici abbattuti, raccolte, scaglie --- */
  for (const it of items) {
    if (it.kind === 'enemy' && it.mob && it.mob.userData.dying) {
      it.mob.rotation.x = lerp(it.mob.rotation.x, 1.5, 1 - Math.pow(0.02, dt));
      it.obj.position.y -= dt * 1.2;
      if (it.obj.position.y < -3) { it.obj.visible = false; it.mob.userData.dying = false; }
    } else if (!it.done && it.swirl) {
      it.swirl.rotation.y += dt * 1.5;
      it.swirl.position.y = 2.5 + Math.sin(runT * 2.2) * 0.18;
    } else if (!it.done && it.obj.visible &&
               (it.kind === 'coin' || it.kind === 'gem' || it.kind === 'buff')) {
      it.obj.rotation.y += dt * (it.spin || 1.8);
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
  const menu  = state === 'hub';
  const duel  = state === 'boss' || state === 'over';
  const cheer = state === 'over' && run.outcome === 'win';

  if (cheer) {
    // il premio è vedere chi hai liberato: la camera sale sulla torre
    camera.position.x = lerp(camera.position.x, 7, 1 - Math.pow(0.06, dt));
    camera.position.y = lerp(camera.position.y, 22, 1 - Math.pow(0.06, dt));
    camera.position.z = lerp(camera.position.z, towerZ + 26, 1 - Math.pow(0.06, dt));
    camera.lookAt(0, tower ? tower.height + 2.6 : 28, towerZ);
  } else {
    camera.position.x = lerp(camera.position.x, duel ? run.x + 5 : run.x * 0.4, 1 - Math.pow(0.01, dt));
    camera.position.y = lerp(camera.position.y, menu ? MENU_CAM_Y : duel ? 7.4 : 6.2, 1 - Math.pow(0.02, dt));
    /* Nel menù la camera sta più indietro: con l'inquadratura a larghezza
       costante l'eroe è cresciuto, e da 13 unità finiva dietro al bottone
       ALL'ASSALTO. */
    camera.position.z = lerp(camera.position.z, run.z + (menu ? menuCamZ : duel ? 16 : 14), 1 - Math.pow(0.005, dt));
    camera.lookAt(duel ? run.x * 0.3 : run.x, duel ? 4.0 : menu ? menuLookY : 1.6,
                  run.z - (menu ? 12 : duel ? 13 : 16));
  }
}

/* ------------------- L'EROE NELLA FASCIA LIBERA -----------------------
   Nel menù l'eroe finiva dietro al bottone ALL'ASSALTO. La fascia libera
   fra il riepilogo e il bottone non è sempre la stessa — cambia con
   l'altezza dello schermo, e cambia anche fra la prima partita (c'è la
   storia, lunga) e le successive (c'è il riepilogo, corto) — quindi non
   esiste una posizione fissa della camera che vada bene sempre.

   Allora la si misura: si prende la fascia dal DOM e si cerca per
   bisezione l'inclinazione che mette l'eroe nel mezzo. Dodici proiezioni
   di un punto, una volta sola all'apertura del menù. */
const MENU_CAM_Y   = 5.6;
const MENU_CAM_Z   = 16.5;    // la distanza più ravvicinata…
const MENU_CAM_ZFAR = 34;     // …e quanto si può arretrare per farlo stare
let menuLookY = 1.3;
let menuCamZ  = MENU_CAM_Z;

function aimMenuCamera() {
  if ($('hub').classList.contains('hidden')) return;
  const alto  = $('lastRun').classList.contains('hidden') ? $('hubHint') : $('lastRun');
  const basso = $('rebirthCard').classList.contains('hidden') ? $('playBtn') : $('rebirthCard');
  const a = alto.getBoundingClientRect().bottom;
  const b = basso.getBoundingClientRect().top;
  if (!(b > a)) return;                       // niente fascia: si lascia com'è

  const punto = new THREE.Vector3();
  /* dove finisce sullo schermo un punto dell'eroe, con una certa camera */
  const proietta = (y, look, z) => {
    camera.position.set(0, MENU_CAM_Y, run.z + z);
    camera.lookAt(0, look, run.z - 12);
    camera.updateMatrixWorld();
    punto.set(0, y, run.z).project(camera);
    return (1 - (punto.y + 1) / 2) * innerHeight;
  };

  /* Prima la taglia: alla distanza minima l'eroe può essere più alto
     della fascia — allora si arretra, quanto basta e non di più. */
  const altoQuanto = z => proietta(0, menuLookY, z) - proietta(3.3, menuLookY, z);
  const serve = (b - a) * 0.82;
  menuCamZ = clamp(MENU_CAM_Z * altoQuanto(MENU_CAM_Z) / serve,
                   MENU_CAM_Z, MENU_CAM_ZFAR);

  /* poi la mira: si cerca l'inclinazione che lo mette al centro della
     fascia. Alzare il punto guardato inclina la camera in su, e l'eroe
     scende: la funzione è monotona, quindi basta una bisezione. */
  const bersaglio = (a + b) / 2;
  let lo = -9, hi = 7;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (proietta(1.7, mid, menuCamZ) < bersaglio) lo = mid; else hi = mid;
  }
  menuLookY = (lo + hi) / 2;
  snapCamera();
}
addEventListener('resize', aimMenuCamera);

/* Tornando al menù la camera è a fondo pista: senza questo salto farebbe
   tutta la strada al contrario in dissolvenza. */
function snapCamera() {
  camera.position.set(0, MENU_CAM_Y, run.z + menuCamZ);
  camera.lookAt(0, menuLookY, run.z - 12);
}

/* hook di debug */
window.BlockyRun = {
  run, items, meta, CFG, WEAPONS, camera,
  get state() { return state; },
  get damage() { return damage(); },
  get need() { return towerNeed(meta.level); },
  setPower(n) { run.power = n; renderHud(); },
  moveTo(x) { run.targetX = clamp(x, -CFG.laneLimit, CFG.laneLimit); },
  start() { startRun(); }
};

applyStaticText();          // il markup nasce in italiano: qui prende la lingua giusta
snapCamera();
renderHub();
showScreen('hub');
setWeapon(hero, meta.up.weapon);
buildRun();

(function loop() {
  requestAnimationFrame(loop);
  update(Math.min(clock.getDelta(), 0.05));
  renderer.render(scene, camera);
})();
