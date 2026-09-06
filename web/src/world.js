/* =====================================================================
   WORLD — sentiero, rilievi, alberi e la torre della principessa.
   I colori vengono dalla zona corrente (vedi THEMES in core.js): la
   pista è sempre la stessa, il mondo attorno cambia ad ogni torre.
   Il piano di calpestio è y = 0.
   ===================================================================== */

const world = new THREE.Group();
scene.add(world);

function clearWorld() {
  while (world.children.length) world.remove(world.children[0]);
}

/* ------------------------------ SENTIERO ------------------------------ */
let pathMat = null, pathTex = null;
function pathMaterial(total) {
  /* Bande morbide lungo la corsia: senza, il terreno è una lastra piatta
     e alla velocità di corsa non si percepisce nessun movimento. */
  const c = document.createElement('canvas');
  c.width = 8; c.height = 64;
  const g = c.getContext('2d');
  const hexOf = n => '#' + n.toString(16).padStart(6, '0');
  g.fillStyle = hexOf(C.ground); g.fillRect(0, 0, 8, 64);
  g.globalAlpha = 0.34; g.fillStyle = hexOf(C.groundEdge); g.fillRect(0, 0, 8, 5);
  g.globalAlpha = 0.16; g.fillRect(0, 32, 8, 3);

  if (pathTex) pathTex.dispose();
  pathTex = new THREE.CanvasTexture(c);
  pathTex.wrapS = pathTex.wrapT = THREE.RepeatWrapping;
  pathTex.minFilter = pathTex.magFilter = THREE.LinearFilter;
  pathTex.repeat.set(1, total / 9);

  if (!pathMat) pathMat = new THREE.MeshLambertMaterial();
  pathMat.map = pathTex;
  pathMat.needsUpdate = true;
  return pathMat;
}

function buildGround(len) {
  const total = len + 70;
  const zc = -len / 2 + 14;

  receiveShadows(putOn(world, GEO.box, pathMaterial(total), 0, -1.2, zc,
                       CFG.trackWidth, 1.2, total));
  // cordoli arrotondati: due mezzi cilindri lungo i bordi
  for (const s of [-1, 1]) {
    const rail = put(world, GEO.cyl, MAT.groundEdge,
                     s * (CFG.trackWidth / 2 + 0.15), -0.15, zc, 0.7, total, 0.7);
    rail.rotation.x = Math.PI / 2;
    receiveShadows(rail);
  }
  // piana ai lati
  for (const s of [-1, 1]) {
    receiveShadows(putOn(world, GEO.box, MAT.slab, s * 34, -1.6, zc, 60, 1.2, total + 70));
  }
}

/* --------------------------- RILIEVI E FLORA --------------------------- */
/* Ogni rilievo ha il suo "cappello" chiaro in cima — neve, sabbia o
   luce di runa a seconda della zona. È il dettaglio che stacca le forme
   dallo sfondo e fa sembrare il paesaggio costruito e non generato. */
function buildCliffs(len) {
  const EDGE = CFG.trackWidth / 2 + 3;
  for (let z = 24; z > -len - 60; z -= rnd(7, 14)) {
    for (const side of [-1, 1]) {
      const d = rnd(EDGE, EDGE + 26);
      const x = side * d;
      const r = Math.random();

      if (r < 0.42) {
        // guglia: cono sfaccettato con la punta chiara
        const h = rnd(4.5, 13);
        const w = rnd(2.6, 5.2);
        const sp = putOn(world, GEO.cone6, MAT.slab, x, 0, z, w, h, w);
        sp.rotation.y = rnd(0, 3);
        const capH = h * 0.28;
        const cp = putOn(world, GEO.cone6, MAT.cap, x, h - capH, z,
                         w * capH / h * 1.04, capH, w * capH / h * 1.04);
        cp.rotation.y = sp.rotation.y;
        castShadows(sp);

      } else if (r < 0.64) {
        // masso con la cresta chiara
        const s = rnd(1.8, 4.2);
        const b = putOn(world, GEO.sph8, MAT.rock, x, 0, z, s * 1.3, s, s * 1.2);
        b.rotation.y = rnd(0, 3);
        const t = put(world, GEO.sph8, MAT.cap, x, s * 0.72, z, s * 0.9, s * 0.42, s * 0.85);
        t.rotation.y = b.rotation.y;
        castShadows(b);

      } else if (r < 0.88) {
        // albero: tre coni impilati, col cappello in cima se la zona è innevata
        const h = rnd(3.4, 6);
        putOn(world, GEO.cyl8, MAT.trunk, x, 0, z, 0.44, h * 0.42, 0.44);
        const c1 = putOn(world, GEO.cone6, MAT.tree, x, h * 0.22, z, h * 0.72, h * 0.62, h * 0.72);
        const c2 = putOn(world, GEO.cone6, MAT.tree, x, h * 0.60, z, h * 0.54, h * 0.52, h * 0.54);
        const c3 = putOn(world, GEO.cone6, MAT.tree, x, h * 0.95, z, h * 0.34, h * 0.44, h * 0.34);
        c1.rotation.y = c2.rotation.y = c3.rotation.y = rnd(0, 3);
        if (C.snowy) {
          putOn(world, GEO.cone6, MAT.cap, x, h * 1.16, z, h * 0.20, h * 0.24, h * 0.20)
            .rotation.y = c3.rotation.y;
        }
        castShadows(c1); castShadows(c2); castShadows(c3);

      } else {
        // guglie sottili a grappolo
        for (let i = 0; i < rint(3, 5); i++) {
          const cx = x + rnd(-1.8, 1.8), cz = z + rnd(-1.8, 1.8);
          const cr = put(world, GEO.octa, MAT.slabDark, cx, rnd(0.9, 2.2), cz,
                         rnd(0.5, 1.0), rnd(1.8, 3.6), rnd(0.5, 1.0));
          cr.rotation.y = rnd(0, 3);
        }
      }
    }
  }
}

function buildHorizon(len) {
  // montagne lontane: chiudono la scena senza costare quasi niente
  for (let i = 0; i < 18; i++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const h = rnd(16, 46), w = rnd(20, 48);
    const x = side * rnd(52, 130), z = rnd(-len - 220, -20);
    const m = putOn(world, GEO.cone6, MAT.slabDark, x, 0, z, w, h, w);
    m.rotation.y = rnd(0, 3);
    const capH = h * 0.24;
    putOn(world, GEO.cone6, MAT.cap, x, h - capH, z,
          w * capH / h * 1.04, capH, w * capH / h * 1.04).rotation.y = m.rotation.y;
  }
}

function buildClouds(len) {
  const cloud = new THREE.MeshBasicMaterial({ color: C.cloud, transparent: true, opacity: 0.9 });
  for (let i = 0; i < 16; i++) {
    const g = new THREE.Group();
    g.position.set((Math.random() < 0.5 ? -1 : 1) * rnd(28, 95),
                   rnd(30, 56), rnd(-len - 140, -50));
    for (let j = 0; j < rint(3, 5); j++) {
      put(g, GEO.sph8, cloud, rnd(-5, 5), rnd(-0.8, 0.8), rnd(-2.5, 2.5),
          rnd(5, 9), rnd(3, 4.5), rnd(4, 6));
    }
    world.add(g);
  }
}

/* -------------------------------- TORRE -------------------------------- */
/* In cima la principessa, alla base il boss. È visibile dall'inizio del
   muro: sapere dove stai andando è metà della motivazione.               */
function buildTower(z) {
  const g = new THREE.Group();
  g.position.set(0, 0, z);

  receiveShadows(putOn(g, GEO.cyl, MAT.stoneDark, 0, 0, 0, 16, 1.2, 16));   // basamento
  receiveShadows(putOn(g, GEO.cyl, MAT.stone,     0, 1.2, 0, 11.5, 1.0, 11.5));

  const H = 26;
  putOn(g, GEO.taper, MAT.stone, 0, 2.2, 0, 7.6, H, 7.6);                   // fusto

  // fasce di pietra scura: danno scala all'altezza
  for (let y = 6; y < H; y += 6) {
    putOn(g, GEO.cyl, MAT.stoneDark, 0, y, 0, 7.9, 0.7, 7.9);
  }
  // finestre a spirale
  for (let i = 0; i < 7; i++) {
    const a = i * 1.1, y = 5 + i * 2.8;
    put(g, GEO.box, mat(0x2a2438), Math.sin(a) * 3.4, y, Math.cos(a) * 3.4, 0.9, 1.5, 0.9);
  }
  // portone alla base
  put(g, GEO.box, mat(0x3a2f24), 0, 3.4, 3.6, 2.6, 4.4, 0.5);
  put(g, GEO.cyl, MAT.gold, 0, 3.2, 3.9, 0.35, 0.35, 0.2).rotation.x = Math.PI / 2;

  /* Balcone e tetto. Il tetto sta alto e stretto apposta: se scende
     troppo, la principessa sparisce sotto la falda ed è l'unica cosa
     che il giocatore vuole vedere quando vince. */
  putOn(g, GEO.cyl, MAT.stoneDark, 0, H + 1.4, 0, 9.6, 0.8, 9.6);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    if (Math.abs(a - Math.PI / 2) < 0.6) continue;         // varco davanti
    putOn(g, GEO.box, MAT.stone, Math.sin(a) * 4.4, H + 2.2, Math.cos(a) * 4.4, 0.8, 1.0, 0.8);
  }
  putOn(g, GEO.cyl,  MAT.stone,     0, H + 3.4, 0, 6.6, 1.6, 6.6);   // tamburo
  putOn(g, GEO.cone, mat(0xd94f7d), 0, H + 5.0, 0, 8.6, 6.4, 8.6);   // tetto
  putOn(g, GEO.cyl,  MAT.gold,      0, H + 11.4, 0, 0.3, 2.2, 0.3);
  const flag = put(g, GEO.box, mat(C.princess), 1.3, H + 12.8, 0, 2.4, 1.3, 0.1);
  flag.userData.noOutline = true;

  castShadows(g);

  // la principessa, affacciata dal varco, rivolta verso di te
  const p = buildPrincess();
  p.position.set(0, H + 2.2, 3.9);
  p.scale.setScalar(1.5);
  g.add(p);

  world.add(g);
  return { obj: g, princess: p, height: H };
}

/* ------------------------------ ASSEMBLAGGIO --------------------------- */
function buildWorld(len) {
  buildGround(len);
  buildCliffs(len);
  buildHorizon(len);
  buildClouds(len);
}
