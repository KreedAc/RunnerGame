/* =====================================================================
   WORLD — pista, terreno, alberi, case, nuvole
   Il piano di calpestio è y = 0: i blocchi del suolo stanno fra −1 e 0.
   ===================================================================== */

const world = new THREE.Group();      // ricostruito ad ogni livello
scene.add(world);

function clearWorld() {
  while (world.children.length) world.remove(world.children[0]);
}

function buildGround(len) {
  const total = len + 60;
  const zc = -len / 2 + 12;           // centro della striscia lungo Z

  // la pista: ghiaia chiara, si legge bene sotto ai gate
  putBlock(world, BLOCK.gravel, 0, -1, zc, CFG.trackWidth, 1, total);

  // bordo di cobblestone su entrambi i lati
  for (const s of [-1, 1]) {
    putBlock(world, BLOCK.cobble, s * (CFG.trackWidth / 2 + 0.5), -1, zc, 1, 1, total);
  }

  // prato ai lati (due lastroni: il resto è rilievo appoggiato sopra)
  for (const s of [-1, 1]) {
    putBlock(world, BLOCK.grass, s * 32, -1, zc, 56, 1, total + 60);
  }
}

function buildTerrain(len) {
  // rilievo a gradoni: mucchi di blocchi di erba, pietra e sabbia
  const EDGE = CFG.trackWidth / 2 + 1.5;      // bordo della pista + cordolo
  for (let z = 20; z > -len - 40; z -= rnd(5, 11)) {
    for (const side of [-1, 1]) {
      const r = Math.random();
      if (r < 0.42) {
        const w = rint(2, 6), h = rint(1, 3);
        const x = side * (EDGE + w / 2 + rnd(0, 22));
        putBlock(world, BLOCK.grass, x, 0, z, w, h, rint(2, 6));
        continue;
      }
      const d = rnd(EDGE + 4, 30);
      const x = side * d;
      if (r < 0.58) {
        putBlock(world, BLOCK.sand, x, 0, z, rint(3, 6), 1, rint(3, 6));
      } else if (r < 0.72 && d > 14) {
        // affioramento di roccia
        putBlock(world, BLOCK.stone, x, 0, z, rint(2, 4), rint(3, 9), rint(2, 4));
      } else if (r < 0.80) {
        // pozza d'acqua incassata di un blocco
        putBlock(world, BLOCK.sand,  x, 0, z, 5, 1, 5);
        putBlock(world, BLOCK.water, x, 0.6, z, 4, 0.5, 4);
      }
    }
  }
}

function buildTree(x, z) {
  const h = rint(4, 6);
  putBlock(world, BLOCK.log, x, 0, z, 1, h, 1);
  // chioma: una fascia larga e un cappello sopra
  putBlock(world, BLOCK.leaves, x, h - 2, z, 5, 2, 5);
  putBlock(world, BLOCK.leaves, x, h,     z, 3, 1, 3);
  putBlock(world, BLOCK.leaves, x, h + 1, z, 1, 1, 1);
}

function buildHouse(x, z) {
  const w = rint(5, 7), d = rint(5, 7), h = rint(3, 4);
  putBlock(world, BLOCK.planks, x, 0, z, w, h, d);
  // finestre sulla facciata rivolta alla pista
  const fz = z + (x < 0 ? d / 2 : -d / 2);
  putBlock(world, BLOCK.glass, x - 1, 1.2, fz, 1, 1, 0.2);
  putBlock(world, BLOCK.glass, x + 1, 1.2, fz, 1, 1, 0.2);
  // tetto a due spioventi, a gradoni di mattoni
  for (let i = 0; i < 3; i++) {
    putBlock(world, BLOCK.brick, x, h + i, z, w - i * 2 + 1, 1, d - i * 2 + 1);
  }
}

function buildProps(len) {
  for (let z = 16; z > -len - 30; z -= rnd(9, 18)) {
    for (const side of [-1, 1]) {
      const d = rnd(CFG.trackWidth / 2 + 5, 28), x = side * d;
      const r = Math.random();
      if (r < 0.5)              buildTree(x, z);
      else if (r < 0.72 && d > 13) buildHouse(x, z);
      else if (r < 0.85) {
        // recinto di legno
        for (let k = -2; k <= 2; k++) putBlock(world, BLOCK.log, x, 0, z + k, 0.3, 1.5, 0.3);
      }
    }
  }
}

function buildSkyline(len) {
  // montagne lontane: chiudono l'orizzonte, altrimenti si vede il vuoto
  for (let i = 0; i < 22; i++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    putBlock(world, Math.random() < 0.5 ? BLOCK.grass : BLOCK.stone,
             side * rnd(48, 115), 0, rnd(-len - 200, -20),
             rint(12, 30), rint(6, 22), rint(12, 30));
  }
  putBlock(world, BLOCK.grass, 0, 0, -len - 170, 260, rint(12, 20), 40);
}

function buildClouds(len) {
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xfbfdff });
  for (let i = 0; i < 20; i++) {
    const g = new THREE.Group();
    // alte e lontane dai bordi: se passano vicino alla camera entrano nell'HUD
    g.position.set((Math.random() < 0.5 ? -1 : 1) * rnd(30, 100),
                   rnd(34, 60), rnd(-len - 120, -40));
    for (let j = 0; j < rint(3, 5); j++) {
      const m = new THREE.Mesh(boxGeo, cloudMat);
      m.position.set(rnd(-6, 6), rnd(-1, 1), rnd(-3, 3));
      m.scale.set(rnd(5, 11), rnd(2, 3), rnd(4, 7));
      g.add(m);
    }
    world.add(g);
  }
}

function buildWorld(len) {
  buildGround(len);
  buildTerrain(len);
  buildProps(len);
  buildSkyline(len);
  buildClouds(len);
}
