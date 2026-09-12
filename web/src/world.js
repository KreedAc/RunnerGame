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
        const su = C.floating && Math.random() < 0.4 ? rnd(4, 14) : 0;
        const sp = putOn(world, GEO.cone6, MAT.slab, x, su, z, w, h, w);
        sp.rotation.y = rnd(0, 3);
        const capH = h * 0.28;
        const cp = putOn(world, GEO.cone6, MAT.cap, x, su + h - capH, z,
                         w * capH / h * 1.04, capH, w * capH / h * 1.04);
        cp.rotation.y = sp.rotation.y;
        if (su) {                               // la zolla strappata, sotto
          put(world, GEO.cone6, MAT.rockDark, x, su - w * 0.34, z, w * 1.05, w * 0.9, w * 1.05)
            .rotation.set(Math.PI, sp.rotation.y, 0);
        }
        castShadows(sp);

      } else if (r < 0.64) {
        /* masso con la cresta chiara — e nel Cielo Spezzato un masso su
           tre non tocca terra: è tutto quello che serve a far capire che
           qui il terreno si è rotto e i pezzi galleggiano. */
        const s = rnd(1.8, 4.2);
        const su = C.floating && Math.random() < 0.6 ? rnd(5, 19) : 0;
        const b = putOn(world, GEO.sph8, MAT.rock, x, su, z, s * 1.3, s, s * 1.2);
        b.rotation.y = rnd(0, 3);
        const t = put(world, GEO.sph8, MAT.cap, x, su + s * 0.72, z, s * 0.9, s * 0.42, s * 0.85);
        t.rotation.y = b.rotation.y;
        if (su) {                              // la punta rotta, sotto
          put(world, GEO.cone6, MAT.rockDark, x, su - s * 0.55, z, s * 1.1, s * 1.2, s)
            .rotation.set(Math.PI, b.rotation.y, 0);
        }
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

/* ------------------------------ IL VULCANO -----------------------------
   La zona del fuoco è l'unica che aggiunge forme invece di ricolorarle.
   La lava è un materiale NON illuminato: in una zona con la luce bassa è
   l'unica cosa che resta accesa, e costa quanto un colore piatto — niente
   luci nuove, niente bagliori, niente post-processing.

   Uno solo per tutta la zona, così pulsa tutto insieme e cambiarlo costa
   una riga per fotogramma. */
let lavaMat = null;
const lavaFreddo = new THREE.Color();
const lavaCaldo  = new THREE.Color();

function pulsaLava(t) {
  if (!lavaMat) return;
  lavaMat.color.copy(lavaFreddo).lerp(lavaCaldo, (Math.sin(t * 1.3) + 1) / 2 * 0.55);
}

/* Colate ai lati della pista. La piana laterale ha la faccia a y = −0,4
   (il sentiero sta a 0): la lava ci si appoggia sopra di un pelo, con una
   crosta scura attorno che la stacca dal terreno. Mai sopra la corsia:
   qui non si muore di lava, si muore di muro. */
const LAVA_Y = -0.3;

function buildLava(len) {
  const EDGE = CFG.trackWidth / 2 + 4;
  for (let z = 20; z > -len - 60; z -= rnd(16, 40)) {
    for (const side of [-1, 1]) {
      if (Math.random() < 0.3) continue;
      const x = side * rnd(EDGE, EDGE + 30);
      const w = rnd(7, 19), l = rnd(12, 34);
      put(world, GEO.box, MAT.rockDark, x, LAVA_Y - 0.12, z, w + 2.6, 0.5, l + 2.6);
      put(world, GEO.box, lavaMat,      x, LAVA_Y, z, w, 0.3, l);
      // isolotti di crosta che galleggiano nella colata
      for (let i = 0; i < rint(1, 4); i++) {
        put(world, GEO.octa, MAT.rockDark,
            x + rnd(-w / 2.6, w / 2.6), LAVA_Y + 0.15, z + rnd(-l / 2.6, l / 2.6),
            rnd(1, 2.6), rnd(0.6, 1.3), rnd(1, 2.6)).rotation.y = rnd(0, 3);
      }
    }
  }
}

/* I vulcani stanno di lato: devono dominare l'orizzonte senza mai coprire
   la torre, che è la cosa che il giocatore deve vedere.

   Non uno solo in fondo: la nebbia chiude a 580 unità e un livello è
   lungo il doppio, quindi un vulcano piazzato oltre la torre sarebbe
   semplicemente invisibile. Sono tre lungo il percorso, a lato alterno —
   ce n'è sempre uno dentro la nebbia buona, e passandogli accanto si
   capisce quanto è grosso. */
function buildVolcanoes(len) {
  const lato = Math.random() < 0.5 ? -1 : 1;
  [0.22, 0.56, 0.9].forEach((f, i) => {
    buildVolcano(lato * (i % 2 ? -1 : 1) * rnd(66, 96), -len * f, rnd(62, 92));
  });
}

function buildVolcano(x, z, h) {
  const w = h * 1.7;

  const cono = putOn(world, GEO.cone6, MAT.rockDark, x, 0, z, w, h, w);
  cono.rotation.y = rnd(0, 3);
  // il cratere: un tronco di cono rovesciato, acceso dentro
  const cw = w * 0.19;
  put(world, GEO.cyl12, lavaMat, x, h - 1.2, z, cw, 2.4, cw);
  // due colate che scendono dal bordo
  for (let i = 0; i < 2; i++) {
    const a = rnd(0, Math.PI * 2);
    const cl = put(world, GEO.box, lavaMat,
                   x + Math.sin(a) * w * 0.12, h * 0.62, z + Math.cos(a) * w * 0.12,
                   2.6, h * 0.66, 2.6);
    cl.rotation.set(Math.cos(a) * 0.26, a, -Math.sin(a) * 0.26);
  }
  // il pennacchio: sfere scure che salgono e si allargano
  for (let i = 0; i < 9; i++) {
    const s = 9 + i * 2.6;
    put(world, GEO.sph8, mat(C.cloud), x + rnd(-7, 7), h + 6 + i * 7, z + rnd(-6, 6),
        s, s * 0.7, s);
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
  /* il materiale della lava vive quanto la zona: fuori dal fuoco non
     esiste, e pulsaLava() non ha niente da fare */
  lavaMat = null;
  if (C.lava) {
    lavaFreddo.setHex(C.lava);
    lavaCaldo.setHex(C.lavaHot);
    lavaMat = new THREE.MeshBasicMaterial({ color: C.lava });
  }
  buildGround(len);
  buildCliffs(len);
  buildHorizon(len);
  buildClouds(len);
  if (lavaMat) { buildLava(len); buildVolcanoes(len); }
}
