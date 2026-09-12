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
/* Vichingo: elmo con nasale e corna, tunica sopra la cotta, mantello di
   pelliccia, scudo sulla schiena. È l'unica cosa sempre in scena, quindi
   ogni pezzo in più qui vale il doppio di uno messo nel paesaggio.

   I colori non stanno più qui ma nella skin indossata (SKINS in core.js):
   la forma è una sola, le tinte cambiano. L'incarnato no — quello è
   l'eroe, non il suo vestito. */
function buildHero() {
  const g = new THREE.Group();
  const S = skinOf();
  const skin  = mat(C.skin);
  const cloth = mat(S.cloth);
  const clothD= mat(S.clothDark);
  const hide  = mat(S.hero);
  const hideD = mat(S.heroDark);
  const metal = mat(S.metal);
  const metalD= mat(S.metalDark);
  const gold  = mat(S.trim);

  /* gambe: calzari e fasce incrociate */
  const legL = limb(g, hideD, -0.19, 0.80, 0, 0.27, 0.80);
  const legR = limb(g, hideD,  0.19, 0.80, 0, 0.27, 0.80);
  for (const leg of [legL, legR]) {
    put(leg, GEO.cyl, hide,  0, -0.30, 0, 0.30, 0.14, 0.30);
    put(leg, GEO.cyl, hide,  0, -0.54, 0, 0.30, 0.12, 0.30);
    put(leg, GEO.box, mat(S.boot), 0, -0.78, 0.06, 0.32, 0.18, 0.44);
  }

  /* busto: cotta scura sotto, tunica sopra, cintura con fibbia */
  put(g, GEO.cyl,   clothD, 0, 0.96, 0, 0.80, 0.46, 0.60);
  put(g, GEO.taper, cloth,  0, 1.22, 0, 0.94, 0.86, 0.68);
  put(g, GEO.cyl,   hideD,  0, 0.84, 0, 0.88, 0.18, 0.64);
  put(g, GEO.box,   gold,   0, 0.84, 0.32, 0.24, 0.24, 0.10);

  /* Solo il collo di pelliccia sulle spalle. Il mantello che c'era prima
     copriva tutta la schiena — che è l'unica vista che si ha dell'eroe. */
  put(g, GEO.sph, hide, 0, 1.58, -0.02, 0.98, 0.36, 0.72);

  /* braccia: manica, bracciale, mano */
  const armL = limb(g, cloth, -0.48, 1.48, 0, 0.26, 0.44);
  const armR = limb(g, cloth,  0.48, 1.48, 0, 0.26, 0.44);
  for (const arm of [armL, armR]) {
    put(arm, GEO.cyl, skin,  0, -0.60, 0, 0.23, 0.36, 0.23);
    put(arm, GEO.cyl, metalD,0, -0.44, 0, 0.27, 0.14, 0.27);
    put(arm, GEO.sph, skin,  0, -0.80, 0, 0.26, 0.24, 0.26);
  }

  /* testa, barba, elmo con nasale e corna */
  put(g, GEO.sph, skin, 0, 1.92, 0, 0.58, 0.60, 0.56);
  put(g, GEO.sph, mat(0xd9c4a8), 0, 1.80, 0.20, 0.48, 0.44, 0.32);
  put(g, GEO.box, mat(0xd9c4a8), 0, 1.63, 0.14, 0.30, 0.24, 0.24);
  eyes(g, 1.98, 0.25, 0.13, 0.10);

  put(g, GEO.sph, metal,  0, 2.04, 0, 0.64, 0.54, 0.62);          // calotta
  put(g, GEO.cyl, metalD, 0, 1.94, 0, 0.66, 0.14, 0.64);          // bordo
  put(g, GEO.box, metal,  0, 1.92, 0.28, 0.10, 0.30, 0.10);       // nasale
  for (const s of [-1, 1]) {
    const horn = put(g, GEO.cone6, mat(S.horn), s * 0.37, 2.12, 0, 0.21, 0.46, 0.21);
    horn.rotation.z = s * -0.72;
  }

  /* Scudo rotondo agganciato basso sulla schiena. Piccolo di proposito:
     il giocatore vede l'eroe solo da dietro, e uno scudo a tutta schiena
     cancellerebbe tunica, pelliccia e cintura — cioè tutto il personaggio. */
  const shield = new THREE.Group();
  shield.position.set(0, 1.06, -0.32);
  shield.rotation.x = Math.PI / 2;
  put(shield, GEO.cyl12, hideD, 0, 0, 0, 0.68, 0.10, 0.68);
  // le facce dipinte stanno fuori dal guscio del contorno, altrimenti
  // il bordo scuro del disco se le mangia e resta un blob marrone
  const paint = (m, y, sx, sz) => {
    const o = put(shield, GEO.cyl12, m, 0, y, 0, sx, 0.05, sz);
    o.userData.noOutline = true;
    return o;
  };
  paint(mat(S.shield), -0.09, 0.58, 0.58);
  const bar1 = put(shield, GEO.box, mat(S.shieldLine), 0, -0.12, 0, 0.58, 0.04, 0.13);
  const bar2 = put(shield, GEO.box, mat(S.shieldLine), 0, -0.12, 0, 0.13, 0.04, 0.58);
  bar1.userData.noOutline = bar2.userData.noOutline = true;
  put(shield, GEO.sph, metal, 0, -0.15, 0, 0.24, 0.14, 0.24).userData.noOutline = true;
  g.add(shield);

  g.userData.limbs = { armL, armR, legL, legR };
  g.userData.hand  = armR;
  addOutline(g, 0.09);
  castShadows(g);
  return g;
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
  addOutline(g, 0.09);
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
  addOutline(g, 0.11);
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
  addOutline(g, 0.08);
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

  put(g, GEO.cyl, mat(W.handle), 0, -L * 0.30, 0, 0.11, L, 0.11);       // manico
  put(g, GEO.cyl, mat(0x4a3626), 0, -L * 0.72, 0, 0.15, L * 0.16, 0.15); // pomo

  if (W.shape === 'club') {
    put(g, GEO.sph, steel, 0, L * 0.34, 0, 0.34, 0.44, 0.34);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      const sp = put(g, GEO.cone6, mat(0xc3ccd6),
                     Math.cos(a) * 0.17, L * 0.34, Math.sin(a) * 0.17, 0.10, 0.20, 0.10);
      sp.rotation.z = -Math.cos(a) * 1.2;
      sp.rotation.x =  Math.sin(a) * 1.2;
    }

  } else if (W.shape === 'axe') {
    put(g, GEO.box, steel, 0.20, L * 0.30, 0, 0.42, 0.62, 0.13);        // occhio
    const edge = put(g, GEO.cone6, steel, 0.52, L * 0.30, 0, 0.66, 0.52, 0.13);
    edge.rotation.z = -Math.PI / 2;                                      // filo a cuneo
    put(g, GEO.box, steel, -0.16, L * 0.30, 0, 0.22, 0.30, 0.12);        // becco

  } else if (W.shape === 'hammer') {
    put(g, GEO.box, steel, 0, L * 0.34, 0, 0.72, 0.40, 0.40);            // testa
    put(g, GEO.box, mat(0xc3ccd6), 0.38, L * 0.34, 0, 0.10, 0.44, 0.44);
    put(g, GEO.box, mat(0xc3ccd6), -0.38, L * 0.34, 0, 0.10, 0.44, 0.44);

  } else {                                                               // sword
    put(g, GEO.box, steel, 0, L * 0.36, 0, 0.17, L * 0.62, 0.09);        // lama
    const tip = put(g, GEO.cone6, steel, 0, L * 0.70, 0, 0.17, 0.24, 0.09);
    tip.rotation.y = Math.PI / 4;
    put(g, GEO.box, steel, 0, L * 0.04, 0, 0.46, 0.11, 0.14);            // guardia
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
  model.position.set(0.09, -0.80, 0.04);
  model.rotation.set(0.24, 0, -0.30);   // inclinata in fuori: la testa del martello sfiorava la spalla
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
  if (w) { addOutline(w, 0.06); hand.add(w); actor.userData.weaponObj = w; }
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
