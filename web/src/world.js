/* =====================================================================
   WORLD — sentiero di neve, scogliere di ghiaccio, pini, cristalli
   e la torre in cui è rinchiusa la principessa.
   Il piano di calpestio è y = 0.
   ===================================================================== */

const world = new THREE.Group();
scene.add(world);

function clearWorld() {
  while (world.children.length) world.remove(world.children[0]);
}

/* ------------------------------ SENTIERO ------------------------------ */
let pathMat = null;
function pathMaterial(total) {
  // bande morbide lungo la corsia: senza, la neve è una lastra bianca
  // e alla velocità di corsa non si percepisce nessun movimento
  if (!pathMat) {
    const c = document.createElement('canvas');
    c.width = 8; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#e7f0f8'; g.fillRect(0, 0, 8, 64);
    g.fillStyle = 'rgba(150,182,208,.30)'; g.fillRect(0, 0, 8, 5);
    g.fillStyle = 'rgba(150,182,208,.14)'; g.fillRect(0, 32, 8, 3);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.minFilter = t.magFilter = THREE.LinearFilter;
    pathMat = new THREE.MeshLambertMaterial({ map: t });
  }
  pathMat.map.repeat.set(1, total / 9);
  return pathMat;
}

function buildGround(len) {
  const total = len + 70;
  const zc = -len / 2 + 14;

  putOn(world, GEO.box, pathMaterial(total), 0, -1.2, zc, CFG.trackWidth, 1.2, total);
  // cordoli arrotondati: due mezzi cilindri lungo i bordi
  for (const s of [-1, 1]) {
    const rail = put(world, GEO.cyl, MAT.snowEdge,
                     s * (CFG.trackWidth / 2 + 0.15), -0.15, zc, 0.7, total, 0.7);
    rail.rotation.x = Math.PI / 2;
  }
  // piana di ghiaccio ai lati
  for (const s of [-1, 1]) {
    putOn(world, GEO.box, MAT.ice, s * 34, -1.6, zc, 60, 1.2, total + 70);
  }
}

/* --------------------------- SCOGLIERE E FLORA ------------------------- */
function buildCliffs(len) {
  const EDGE = CFG.trackWidth / 2 + 3;
  for (let z = 24; z > -len - 60; z -= rnd(7, 15)) {
    for (const side of [-1, 1]) {
      const d = rnd(EDGE, EDGE + 26);
      const x = side * d;
      const r = Math.random();

      if (r < 0.46) {
        // guglia di ghiaccio: due coni sfalsati, sfaccettati
        const h = rnd(4, 13);
        const sp = putOn(world, GEO.cone6, MAT.ice, x, 0, z, rnd(2.6, 5.2), h, rnd(2.6, 5.2));
        sp.rotation.y = rnd(0, 3);
        if (Math.random() < 0.5) {
          const s2 = putOn(world, GEO.cone6, MAT.iceDark, x + rnd(-2.5, 2.5), 0, z + rnd(-3, 3),
                           rnd(1.8, 3.2), rnd(3, 8), rnd(1.8, 3.2));
          s2.rotation.y = rnd(0, 3);
        }
      } else if (r < 0.68) {
        // masso: sfera schiacciata a faccette
        const s = rnd(1.8, 4.4);
        putOn(world, GEO.sph8, MAT.rock, x, 0, z, s * 1.3, s, s * 1.2).rotation.y = rnd(0, 3);
      } else if (r < 0.88) {
        // pino: tre coni impilati
        const h = rnd(3.2, 5.5);
        putOn(world, GEO.cyl8, MAT.trunk, x, 0, z, 0.42, h * 0.42, 0.42);
        putOn(world, GEO.cone6, MAT.pine, x, h * 0.22, z, h * 0.72, h * 0.62, h * 0.72);
        putOn(world, GEO.cone6, MAT.pine, x, h * 0.60, z, h * 0.54, h * 0.52, h * 0.54);
        putOn(world, GEO.cone6, MAT.pine, x, h * 0.95, z, h * 0.34, h * 0.42, h * 0.34);
      } else {
        // grappolo di cristalli, come nei riferimenti
        for (let i = 0; i < rint(3, 5); i++) {
          const cx = x + rnd(-1.6, 1.6), cz = z + rnd(-1.6, 1.6);
          const cr = put(world, GEO.octa, MAT.ice, cx, rnd(0.8, 2.2), cz,
                         rnd(0.5, 1.0), rnd(1.6, 3.4), rnd(0.5, 1.0));
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
    const h = rnd(14, 42);
    const m = putOn(world, GEO.cone6, MAT.iceDark,
                    side * rnd(52, 130), 0, rnd(-len - 220, -20),
                    rnd(18, 46), h, rnd(18, 46));
    m.rotation.y = rnd(0, 3);
  }
}

function buildClouds(len) {
  const cloud = new THREE.MeshBasicMaterial({ color: 0xffffff });
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

  putOn(g, GEO.cyl, MAT.stoneDark, 0, 0, 0, 15, 1.2, 15);        // basamento
  putOn(g, GEO.cyl, MAT.stone,     0, 1.2, 0, 11, 1.0, 11);

  const H = 26;
  putOn(g, GEO.taper, MAT.stone, 0, 2.2, 0, 7.6, H, 7.6);        // fusto

  // fasce di pietra scura, danno scala all'altezza
  for (let y = 6; y < H; y += 6) {
    putOn(g, GEO.cyl, MAT.stoneDark, 0, y, 0, 7.9, 0.7, 7.9);
  }
  // finestre a spirale
  for (let i = 0; i < 7; i++) {
    const a = i * 1.1, y = 5 + i * 2.8;
    put(g, GEO.box, mat(0x2a2438),
        Math.sin(a) * 3.4, y, Math.cos(a) * 3.4, 0.9, 1.5, 0.9);
  }

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
