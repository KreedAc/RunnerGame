/* =====================================================================
   ACTORS — eroe, nemici, boss, principessa
   Forme tonde e piene, contorno scuro, niente texture: la lettura è
   tutta nella silhouette. Ogni attore è alto ~2 unità a scala 1.
   ===================================================================== */

/* arto con perno in alto: ruota dalla spalla o dall'anca, non dal centro */
function limb(parent, material, x, yTop, z, w, h, d) {
  const pivot = new THREE.Group();
  pivot.position.set(x, yTop, z);
  put(pivot, GEO.cyl, material, 0, -h / 2, 0, w, h, d === undefined ? w : d);
  parent.add(pivot);
  return pivot;
}

function eyes(parent, y, z, spread, r) {
  const dark = mat(0x24202c);
  put(parent, GEO.sph8, dark, -spread, y, z, r);
  put(parent, GEO.sph8, dark,  spread, y, z, r);
}

/* -------------------------------- EROE -------------------------------- */
/* Vichingo: elmo con cresta e corna, tunica sopra la cotta, collo di
   pelliccia, scudo a tracolla sulla schiena. È l'unica cosa sempre in
   scena, quindi ogni pezzo in più qui vale il doppio di uno messo nel
   paesaggio — e va curato soprattutto DA DIETRO, che è l'unica vista che
   il giocatore ne ha: la treccia, la cinghia dello scudo, le fasce
   incrociate sui polpacci, i risvolti degli stivali.

   I colori stanno nella skin indossata (SKINS in core.js): la forma è una
   sola, le tinte cambiano, e ogni aspetto aggiunge il suo segno
   (segnoAspetto, sotto). L'incarnato no — quello è l'eroe, non il suo
   vestito. */
function buildHero() {
  const g = new THREE.Group();
  const S = skinOf();
  const skin   = mat(C.skin);
  const cloth  = mat(S.cloth);
  const clothD = mat(S.clothDark);
  const hide   = mat(S.hero);
  const hideD  = mat(S.heroDark);
  const metal  = mat(S.metal);
  const metalD = mat(S.metalDark);
  const gold   = mat(S.trim);
  const cuoio  = mat(S.boot);
  const capelli= mat(S.capelli || 0xd9ac55);
  /* la pelliccia è il cuoio schiarito: due toni fanno i ciuffi */
  const pelo   = mat(new THREE.Color(S.hero).lerp(new THREE.Color(0xfff4e0), 0.3).getHex());

  /* ---- gambe: brache, fasce, stringhe incrociate, stivali ---- */
  const legL = limb(g, hideD, -0.19, 0.80, 0, 0.27, 0.80);
  const legR = limb(g, hideD,  0.19, 0.80, 0, 0.27, 0.80);
  for (const leg of [legL, legR]) {
    for (const y of [-0.24, -0.38]) put(leg, GEO.cyl, hide, 0, y, 0, 0.3, 0.07, 0.3);
    for (const k of [-1, 1]) {                                     // la stringa, dietro
      put(leg, GEO.box, cuoio, 0, -0.31, -0.145, 0.035, 0.3, 0.03).rotation.z = k * 0.6;
    }
    put(leg, GEO.cyl,  cuoio, 0, -0.66, 0, 0.29, 0.22, 0.29);      // gambale
    put(leg, GEO.cyl,  pelo,  0, -0.55, 0, 0.35, 0.08, 0.35);      // risvolto
    put(leg, GEO.box,  cuoio, 0, -0.81, 0.04, 0.3, 0.13, 0.38);    // piede
    put(leg, GEO.sph8, cuoio, 0, -0.80, 0.22, 0.3, 0.15, 0.17);    // punta tonda
  }

  /* ---- busto: cotta, tunica che si apre sotto la cintura ---- */
  put(g, GEO.cyl,   clothD, 0, 0.98, 0, 0.80, 0.46, 0.60);
  put(g, GEO.taper, cloth,  0, 1.22, 0, 0.94, 0.86, 0.68);
  put(g, GEO.taper, cloth,  0, 0.72, 0, 0.96, 0.26, 0.72);         // gonnellino
  put(g, GEO.cyl,   clothD, 0, 0.60, 0, 0.98, 0.05, 0.74);         // orlo
  put(g, GEO.cyl,   hideD,  0, 0.86, 0, 1.0, 0.15, 0.76);          // cintura
  put(g, GEO.box,   gold,   0, 0.86, 0.38, 0.22, 0.2, 0.06);        // fibbia
  put(g, GEO.box,   hide,   0.22, 0.80, -0.34, 0.2, 0.2, 0.1);      // borsa, dietro
  put(g, GEO.box,   hideD,  0.22, 0.88, -0.39, 0.21, 0.07, 0.03);   // patta
  /* la cinghia dello scudo, a tracolla: dice "lo scudo è appeso", non
     "lo scudo è incollato" */
  put(g, GEO.box, hideD, 0, 1.24, -0.31, 0.09, 1.0, 0.04).rotation.z = 0.62;

  /* ---- collo di pelliccia: ciuffi, non un salvagente ---- */
  put(g, GEO.sph, hide, 0, 1.56, -0.02, 0.84, 0.28, 0.64);
  for (let i = 1; i < 9; i++) {                 // davanti niente ciuffo: lì c'è la barba
    const a = i / 9 * Math.PI * 2;
    put(g, GEO.sph8, i % 2 ? pelo : hide,
        Math.sin(a) * 0.36, 1.61 + (i % 2) * 0.03, Math.cos(a) * 0.27 - 0.02, 0.3, 0.24, 0.28);
  }

  /* ---- spallacci ---- */
  for (const k of [-1, 1]) {
    put(g, GEO.sph,  metal,  k * 0.5, 1.55, 0, 0.36, 0.26, 0.42);
    put(g, GEO.cyl,  metalD, k * 0.5, 1.5, 0, 0.38, 0.05, 0.44);
    put(g, GEO.sph8, gold,   k * 0.5, 1.68, 0, 0.07, 0.07, 0.07);
  }

  /* ---- braccia: manica, bracciale di cuoio borchiato, mano ---- */
  const armL = limb(g, cloth, -0.48, 1.48, 0, 0.26, 0.44);
  const armR = limb(g, cloth,  0.48, 1.48, 0, 0.26, 0.44);
  for (const arm of [armL, armR]) {
    put(arm, GEO.cyl,  hideD,  0, -0.58, 0, 0.27, 0.24, 0.27);      // bracciale
    put(arm, GEO.cyl,  metalD, 0, -0.46, 0, 0.29, 0.04, 0.29);
    put(arm, GEO.cyl,  metalD, 0, -0.70, 0, 0.29, 0.04, 0.29);
    for (const y of [-0.54, -0.62]) put(arm, GEO.sph8, metal, 0, y, -0.14, 0.05, 0.05, 0.05);
    put(arm, GEO.sph,  skin,   0, -0.80, 0, 0.26, 0.24, 0.26);      // mano
  }

  /* ---- testa: barba, baffi, occhi, capelli ----
     L'elmo sta ALTO sulla fronte e la barba sotto il naso: gli occhi sono
     l'unica cosa del viso che si legge a quella scala, non vanno coperti. */
  put(g, GEO.sph, skin, 0, 1.92, 0, 0.58, 0.60, 0.56);
  put(g, GEO.sph, skin, 0, 1.88, 0.27, 0.13, 0.12, 0.12);          // naso
  put(g, GEO.sph, capelli, 0, 1.88, -0.06, 0.6, 0.6, 0.52);       // la nuca
  put(g, GEO.sph, capelli, 0, 1.70, 0.22, 0.46, 0.34, 0.3);       // barba
  put(g, GEO.cone6, capelli, 0, 1.53, 0.26, 0.24, 0.2, 0.18).rotation.x = Math.PI;   // la punta
  for (const k of [-1, 1]) put(g, GEO.sph8, capelli, k * 0.1, 1.80, 0.27, 0.19, 0.08, 0.1)
    .rotation.z = k * -0.35;                                       // baffi
  eyes(g, 1.96, 0.255, 0.12, 0.085);
  for (const k of [-1, 1]) put(g, GEO.sph8, capelli, k * 0.27, 1.84, -0.07, 0.17, 0.22, 0.2);
  /* la treccia: da dietro è la cosa che lo fa sembrare una persona */
  [[1.80, -0.28], [1.69, -0.37], [1.58, -0.43], [1.47, -0.45]].forEach(([y, z], i) =>
    put(g, GEO.sph8, capelli, 0, y, z, 0.17 - i * 0.02, 0.15, 0.14));
  put(g, GEO.cyl8, hideD, 0, 1.40, -0.45, 0.1, 0.05, 0.1);         // il laccio

  /* ---- elmo: calotta, cresta, bordo coi rivetti, nasale ---- */
  put(g, GEO.sph, metal,  0, 2.12, -0.01, 0.64, 0.5, 0.62);        // calotta
  put(g, GEO.cyl, metalD, 0, 2.13, -0.01, 0.6, 0.07, 0.56).rotation.z = Math.PI / 2;   // cresta
  put(g, GEO.cyl, metalD, 0, 2.05, -0.01, 0.66, 0.11, 0.64);       // bordo
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    put(g, GEO.sph8, gold, Math.sin(a) * 0.335, 2.05, Math.cos(a) * 0.325 - 0.01, 0.05, 0.05, 0.05);
  }
  put(g, GEO.box, metal, 0, 2.0, 0.3, 0.08, 0.2, 0.07);            // nasale

  /* ---- scudo a tondo, sulla schiena ---- */
  const shield = new THREE.Group();
  shield.position.set(0, 1.06, -0.34);
  shield.rotation.x = Math.PI / 2;
  put(shield, GEO.cyl12, hideD, 0, 0, 0, 0.7, 0.10, 0.7);          // legno
  /* le facce dipinte stanno fuori dal guscio del contorno, altrimenti il
     bordo del disco se le mangia */
  const faccia = (m, x, y, sx, sy, sz, geo) => {
    const o = put(shield, geo || GEO.box, m, x, y, 0, sx, sy, sz);
    o.userData.noOutline = true;
    return o;
  };
  faccia(S.segno === 'brace' ? new THREE.MeshBasicMaterial({ color: S.shield }) : mat(S.shield),
         0, -0.09, 0.6, 0.05, 0.6, GEO.cyl12);
  for (const x of [-0.14, 0.14]) faccia(mat(S.heroDark), x, -0.115, 0.02, 0.02, 0.56);   // le assi
  const croce = S.segno === 'brace' ? new THREE.MeshBasicMaterial({ color: S.shieldLine })
                                    : mat(S.shieldLine);
  faccia(croce, 0, -0.12, 0.58, 0.04, 0.12);
  faccia(croce, 0, -0.12, 0.12, 0.04, 0.58);
  const cerchio = put(shield, GEO.ring, metalD, 0, -0.07, 0, 0.82, 0.82, 0.9);   // il bordo di ferro
  cerchio.rotation.x = Math.PI / 2;
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + Math.PI / 8;
    faccia(metal, Math.sin(a) * 0.27, -0.12, 0.05, 0.05, 0.05, GEO.sph8).position.z = Math.cos(a) * 0.27;
  }
  faccia(metal, 0, -0.15, 0.22, 0.14, 0.22, GEO.sph);              // umbone
  g.add(shield);

  segnoAspetto(g, S, shield);

  g.userData.limbs = { armL, armR, legL, legR };
  /* L'arma va nella mano DESTRA vera. Il modello è costruito guardando
     +Z e poi girato di 180° per correre verso −Z: il braccio a +x — che
     il codice chiamava "destro" — a schermo finisce a sinistra, e visto
     da dietro il vichingo impugnava con la sinistra. */
  g.userData.hand  = armL;
  addOutline(g, 0.035);
  castShadows(g);
  return g;
}

/* Il segno di ogni aspetto, oltre ai colori: si riconosce da lontano, e
   da dietro. Corna e ali si escludono — il Campione ha le ali al posto
   delle corna. */
function segnoAspetto(g, S, shield) {
  const segno = S.segno || '';
  if (segno !== 'ali') {                       // corna curve, in due pezzi
    for (const k of [-1, 1]) {
      const base = [k * 0.3, 2.14];
      const d1 = [Math.sin(1.1) * k, Math.cos(1.1)];                // in fuori
      const d2 = [Math.sin(0.35) * k, Math.cos(0.35)];              // poi in su
      put(g, GEO.cyl8, mat(S.metalDark), base[0], base[1], 0, 0.2, 0.08, 0.2).rotation.z = -k * 1.1;
      put(g, GEO.taper, mat(S.horn), base[0] + d1[0] * 0.15, base[1] + d1[1] * 0.15, 0, 0.19, 0.3, 0.19)
        .rotation.z = -k * 1.1;
      const e = [base[0] + d1[0] * 0.3, base[1] + d1[1] * 0.3];
      put(g, GEO.cone6, mat(S.horn), e[0] + d2[0] * 0.17, e[1] + d2[1] * 0.17, 0, 0.16, 0.34, 0.16)
        .rotation.z = -k * 0.35;
    }
  }
  if (segno === 'ali') {                       // il Campione: ali d'oro sull'elmo
    /* piume a goccia, corte e piegate all'indietro: con le assi dritte
       sembravano stecche infilate nell'elmo */
    for (const k of [-1, 1]) {
      put(g, GEO.sph8, mat(S.metalDark), k * 0.33, 2.1, -0.02, 0.13, 0.13, 0.13);
      [[0.46, 0.5], [0.4, 0.95], [0.32, 1.35]].forEach(([l, a], i) => {
        const p = put(g, GEO.sph, mat(i ? 0xfff6e0 : S.metal),
                      k * (0.36 + Math.sin(a) * l * 0.5), 2.14 + Math.cos(a) * l * 0.5, -0.1 - i * 0.03,
                      0.13, l, 0.05);
        p.rotation.set(0, -k * 0.5, -k * a);
      });
    }
  }
  if (segno === 'pennacchio') {                // la Guardia Notturna: un pennacchio viola
    [[2.42, -0.02, 0.2], [2.44, -0.18, 0.22], [2.36, -0.33, 0.2], [2.22, -0.44, 0.17]]
      .forEach(([y, z, r]) => put(g, GEO.sph8, mat(0x9d7cf0), 0, y, z, r * 0.8, r, r * 1.2));
  }
  if (segno === 'brina') {                     // la Brina: ghiaccioli sugli spallacci
    for (const k of [-1, 1]) for (let i = 0; i < 3; i++) {
      put(g, GEO.cone6, mat(0xe8fbff, true), k * (0.4 + i * 0.1), 1.74 + (i % 2) * 0.05,
          (i - 1) * 0.1, 0.07, 0.22 - (i % 2) * 0.06, 0.07).rotation.z = -k * 0.3;
    }
  }
  if (segno === 'brace') {                     // la Brace: lo scudo arde piano
    const b = new THREE.Group();
    b.position.set(0, -0.2, 0);
    shield.add(b);
    bagliore(b, 0xff8a3c, 1.2, 0.45);
  }
}

/* ------------------------------- NEMICI -------------------------------- */
const ENEMIES = {
  goblin: { body: 0x5fa03e, dark: 0x3f7028, cloth: 0x8a4a2a, ears: true,  scale: 0.82 },
  imp   : { body: 0x8a5fd0, dark: 0x5f3f9a, cloth: 0x3a2a5a, ears: true,  scale: 0.78 },
  golem : { body: 0x8b8f98, dark: 0x64686f, cloth: 0x54585f, ears: false, scale: 1.00 }
};
const ENEMY_KINDS = Object.keys(ENEMIES);

function buildEnemy(kind) {
  const E = ENEMIES[kind] || ENEMIES.goblin;
  const g = new THREE.Group();
  const body  = mat(E.body);
  const dark  = mat(E.dark);
  const cloth = mat(E.cloth);

  const legL = limb(g, dark, -0.17, 0.62, 0, 0.24, 0.62);
  const legR = limb(g, dark,  0.17, 0.62, 0, 0.24, 0.62);

  put(g, GEO.sph, cloth, 0, 0.98, 0, 0.80, 0.72, 0.62);     // pancia
  const armL = limb(g, body, -0.42, 1.22, 0, 0.22, 0.62);
  const armR = limb(g, body,  0.42, 1.22, 0, 0.22, 0.62);

  put(g, GEO.sph, body, 0, 1.62, 0, 0.72, 0.66, 0.66);      // testone
  eyes(g, 1.68, 0.30, 0.16, 0.13);
  put(g, GEO.cone6, mat(0xfdf6e6), 0, 1.50, 0.30, 0.10, 0.14, 0.10).rotation.x = Math.PI;

  if (E.ears) {
    for (const s of [-1, 1]) {
      const ear = put(g, GEO.cone6, body, s * 0.36, 1.72, 0, 0.16, 0.42, 0.16);
      ear.rotation.z = s * -1.1;
    }
  } else {
    put(g, GEO.box, dark, 0, 1.94, 0, 0.5, 0.2, 0.5);       // spuntone di roccia
  }

  g.userData.limbs = { armL, armR, legL, legR };
  g.scale.setScalar(E.scale);
  addOutline(g, 0.04);
  castShadows(g);
  return g;
}

/* -------------------------------- BOSS --------------------------------- */
/* Il carceriere ai piedi della torre. Stesso schema, tutto più grosso e
   più largo di spalle: deve leggersi come "muro" già da lontano. */
function buildBoss() {
  const g = new THREE.Group();
  const body = mat(C.boss);
  const dark = mat(C.bossDark);
  const iron = mat(0x555f6b);

  const legL = limb(g, dark, -0.34, 0.86, 0, 0.44, 0.86);
  const legR = limb(g, dark,  0.34, 0.86, 0, 0.44, 0.86);

  put(g, GEO.sph, body, 0, 1.42, 0, 1.56, 1.24, 1.02);      // torace
  put(g, GEO.cyl, iron, 0, 1.02, 0, 1.34, 0.24, 0.94);      // cintura
  put(g, GEO.sph, dark, 0, 1.92, 0, 1.70, 0.56, 1.06);      // spalloni

  const armL = limb(g, body, -0.82, 1.86, 0, 0.42, 1.06);
  const armR = limb(g, body,  0.82, 1.86, 0, 0.42, 1.06);

  put(g, GEO.sph, body, 0, 2.42, 0, 0.86, 0.80, 0.80);      // testa
  eyes(g, 2.48, 0.36, 0.20, 0.14);
  put(g, GEO.cyl, iron, 0, 2.76, 0, 0.94, 0.26, 0.88);      // corona di ferro
  for (const s of [-1, 1]) {
    const spike = put(g, GEO.cone6, iron, s * 0.34, 3.00, 0, 0.18, 0.42, 0.18);
    spike.rotation.z = s * -0.25;
  }

  // mazza ferrata nella destra
  const club = new THREE.Group();
  put(club, GEO.cyl, mat(0x6b4a35), 0, -0.35, 0, 0.16, 1.3, 0.16);
  put(club, GEO.sph, iron, 0, 0.42, 0, 0.62, 0.6, 0.62);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    const sp = put(club, GEO.cone6, iron, Math.cos(a) * 0.3, 0.42, Math.sin(a) * 0.3, 0.16, 0.3, 0.16);
    sp.rotation.z = -Math.cos(a) * 1.2;
    sp.rotation.x =  Math.sin(a) * 1.2;
  }
  club.position.set(0, -1.0, 0.25);
  club.rotation.x = -0.5;
  armR.add(club);

  g.userData.limbs = { armL, armR, legL, legR };
  addOutline(g, 0.05);
  castShadows(g);
  return g;
}

/* ----------------------------- PRINCIPESSA ----------------------------- */
function buildPrincess() {
  const g = new THREE.Group();
  const gown = mat(C.princess);
  const lite = mat(C.gownLite);
  const skin = mat(C.skin);
  const hair = mat(0xf5d76e);

  put(g, GEO.cone, gown, 0, 0.62, 0, 1.02, 1.24, 1.02);     // abito
  put(g, GEO.cyl,  lite, 0, 1.22, 0, 0.56, 0.42, 0.5);      // corpetto
  const armL = limb(g, skin, -0.32, 1.36, 0, 0.16, 0.5);
  const armR = limb(g, skin,  0.32, 1.36, 0, 0.16, 0.5);

  put(g, GEO.sph, hair, 0, 1.68, -0.06, 0.66, 0.72, 0.66);  // capelli
  put(g, GEO.sph, skin, 0, 1.66, 0.12, 0.52, 0.56, 0.46);   // viso
  eyes(g, 1.70, 0.30, 0.12, 0.09);
  put(g, GEO.cyl, mat(C.gold), 0, 1.98, 0, 0.44, 0.14, 0.44);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    put(g, GEO.cone6, mat(C.gold), Math.cos(a) * 0.19, 2.10, Math.sin(a) * 0.19, 0.09, 0.18, 0.09);
  }

  g.userData.limbs = { armL, armR, legL: null, legR: null };
  addOutline(g, 0.035);
  castShadows(g);
  return g;
}

/* -------------------------------- ARMI --------------------------------- */
/* Il modello nudo, centrato sull'impugnatura: lo usa sia la mano
   dell'eroe sia l'arma che galleggia sulla corsia in attesa.
   Ogni sagoma è diversa perché a terra l'arma va riconosciuta da lontano. */
function buildWeaponModel(tier) {
  const W = WEAPONS[tier];
  if (!W.shape) return null;
  const g = new THREE.Group();
  const L = W.len;
  const steel = mat(W.blade);
  const legno = mat(W.handle);
  const cuoio = mat(0x4a3626);

  /* L'origine è il centro del pugno. Il manico era un cilindro lungo quanto
     tutta l'arma e centrato sotto la mano: sotto il pugno della spada
     sporgevano 0,96 unità di bastone — più della lama — e il pomo stava a
     metà manico invece che in fondo. Adesso le armi a una mano hanno
     un'impugnatura della misura di un pugno col pomo in fondo, e solo
     ascia e martello hanno un manico lungo, che è quello che hanno davvero. */
  const manico = (giu, su, spessore) => {
    put(g, GEO.cyl, legno, 0, (su + giu) / 2, 0, spessore, su - giu, spessore);
    put(g, GEO.sph8, cuoio, 0, giu - 0.03, 0, spessore * 1.9, 0.12, spessore * 1.9);   // pomo
  };

  if (W.shape === 'club') {
    /* randello: il legno che si ingrossa verso la testa chiodata */
    manico(-0.2, L * 0.5, 0.12);
    put(g, GEO.taper, legno, 0, L * 0.72, 0, 0.3, L * 0.5, 0.3).rotation.x = Math.PI;
    const testa = L * 0.98;
    put(g, GEO.sph, steel, 0, testa, 0, 0.36, 0.42, 0.36);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      const sp = put(g, GEO.cone6, mat(0xc3ccd6),
                     Math.cos(a) * 0.18, testa, Math.sin(a) * 0.18, 0.10, 0.20, 0.10);
      sp.rotation.z = -Math.cos(a) * 1.2;
      sp.rotation.x =  Math.sin(a) * 1.2;
    }

  } else if (W.shape === 'axe') {
    manico(-0.3, L * 0.95, 0.11);
    const y = L * 0.78;
    put(g, GEO.box, steel, 0.18, y, 0, 0.36, 0.34, 0.13);                // occhio
    const edge = put(g, GEO.cone6, steel, 0.5, y, 0, 0.7, 0.52, 0.13);
    edge.rotation.z = -Math.PI / 2;                                      // filo a cuneo
    put(g, GEO.box, steel, -0.14, y, 0, 0.2, 0.22, 0.12);                // becco

  } else if (W.shape === 'hammer') {
    manico(-0.3, L * 0.9, 0.12);
    const y = L * 0.9;
    put(g, GEO.box, steel, 0, y, 0, 0.66, 0.38, 0.38);                   // testa
    const fascia = mat(new THREE.Color(W.blade).multiplyScalar(0.7).getHex());
    for (const x of [-0.14, 0.14]) put(g, GEO.box, fascia, x, y, 0, 0.06, 0.42, 0.42);
    put(g, GEO.box, mat(0xc3ccd6), 0.35, y, 0, 0.09, 0.44, 0.44);        // le due bocche
    put(g, GEO.box, mat(0xc3ccd6), -0.35, y, 0, 0.09, 0.44, 0.44);
    put(g, GEO.cone6, fascia, 0, y + 0.28, 0, 0.14, 0.2, 0.14);          // la punta

  } else {                                                               // spada
    manico(-0.2, 0.2, 0.1);
    put(g, GEO.box, steel, 0, 0.25, 0, 0.5, 0.1, 0.14);                  // guardia
    const lama = L * 0.78;
    put(g, GEO.box, steel, 0, 0.3 + lama / 2, 0, 0.18, lama, 0.07);      // lama
    const tip = put(g, GEO.cone6, steel, 0, 0.3 + lama + 0.13, 0, 0.18, 0.26, 0.07);
    tip.rotation.y = Math.PI / 4;
    /* la Lama Rúna ha un filo di luce lungo la lama: la riconosci da lontano */
    if (tier === WEAPONS.length - 1) {
      const filo = put(g, GEO.box, new THREE.MeshBasicMaterial({ color: 0xbff8ff }),
                       0, 0.3 + lama / 2, 0, 0.05, lama * 0.92, 0.09);
      filo.userData.noOutline = true;
    }
  }
  return g;
}

/* La presa. Il modello ha l'impugnatura al centro e la lama verso +Y,
   quindi agganciandolo al fondo del braccio con una leggera inclinazione
   viene da solo il gesto di chi corre con l'arma in pugno, lama in su.
   Prima stava a mezz'aria sopra la mano e puntava in avanti come un
   bastone da passeggio. */
function buildWeapon(tier) {
  const model = buildWeaponModel(tier);
  if (!model) return null;
  /* nel pugno, un filo in avanti e in fuori: la lama non deve attraversare
     il braccio, e da dietro — che è come si vede l'eroe — deve spuntare
     di lato al corpo */
  model.position.set(-0.08, -0.80, 0.06);
  model.rotation.set(0.42, 0, 0.42);
  return model;
}

function setWeapon(actor, tier) {
  const hand = actor.userData.hand;
  if (!hand) return;
  if (actor.userData.weaponObj) {
    hand.remove(actor.userData.weaponObj);
    actor.userData.weaponObj = null;
  }
  const w = buildWeapon(tier);
  if (w) { addOutline(w, 0.03); hand.add(w); actor.userData.weaponObj = w; }
}

/* ------------------------------ ANIMAZIONE ----------------------------- */
function animateRun(actor, t, phase, amount) {
  const L = actor.userData.limbs;
  if (!L || !L.legL) return;
  const s = Math.sin(t * 9 + phase) * (amount === undefined ? 0.9 : amount);
  L.legL.rotation.x =  s;
  L.legR.rotation.x = -s;
  if (L.armL) { L.armL.rotation.x = -s * 0.8; L.armR.rotation.x = s * 0.8; }
}

function animateIdle(actor, t, phase) {
  const L = actor.userData.limbs;
  if (!L) return;
  const s = Math.sin(t * 2 + phase) * 0.12;
  if (L.legL) { L.legL.rotation.x = s; L.legR.rotation.x = -s; }
  if (L.armL) { L.armL.rotation.x = -s; L.armR.rotation.x = s; }
}
