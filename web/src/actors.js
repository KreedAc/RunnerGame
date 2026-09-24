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
  goblin: { body: 0x5fa03e, dark: 0x3f7028, cloth: 0x8a4a2a, scale: 0.82 },
  imp   : { body: 0x8a5fd0, dark: 0x5f3f9a, cloth: 0x3a2a5a, scale: 0.78 },
  golem : { body: 0x8b8f98, dark: 0x64686f, cloth: 0x54585f, scale: 1.00 }
};
const ENEMY_KINDS = Object.keys(ENEMIES);

/* Occhi da cartone: il bianco e la pupilla. Con due palline nere a
   quella distanza i nemici sembravano bottoni; il bianco li fa guardare. */
function occhiVivi(parent, y, z, spread, r) {
  const bianco = mat(0xfff6e0), nero = mat(0x24202c);
  for (const k of [-1, 1]) {
    put(parent, GEO.sph, bianco, k * spread, y, z, r, r * 1.1, r * 0.7);
    put(parent, GEO.sph8, nero, k * spread, y - r * 0.08, z + r * 0.3, r * 0.52, r * 0.6, r * 0.3);
  }
}

/* I nemici in pista sono tanti: ognuno si costruisce UNA volta per tipo e
   poi si clona. Il clone condivide geometrie e materiali, quindi il
   dettaglio in più costa memoria una volta sola. */
const NEMICI_FATTI = {};

function buildEnemy(kind) {
  if (!ENEMIES[kind]) kind = 'goblin';
  let tpl = NEMICI_FATTI[kind];
  if (!tpl) {
    tpl = costruisciNemico(kind);
    /* lo stampo non si libera mai: sciogli() deve lasciarlo stare */
    tpl.traverse(o => { if (o.isMesh) o.geometry.userData.fusa = false; });
    NEMICI_FATTI[kind] = tpl;
  }
  const g = tpl.clone();
  g.userData = { limbs: {
    armL: g.getObjectByName('armL'), armR: g.getObjectByName('armR'),
    legL: g.getObjectByName('legL'), legR: g.getObjectByName('legR') } };
  return g;
}

function costruisciNemico(kind) {
  const E = ENEMIES[kind];
  const g = new THREE.Group();
  const body  = mat(E.body);
  const dark  = mat(E.dark);
  const cloth = mat(E.cloth);
  const lite  = mat(new THREE.Color(E.body).lerp(new THREE.Color(0xffffff), 0.25).getHex());
  const cuoio = mat(0x5a3c28), ferro = mat(0x9aa4ae), ferroD = mat(0x5a6470);
  const osso  = mat(0xfdf6e6);
  let armL, armR, legL, legR;

  if (kind === 'golem') {
    /* il golem: massi a faccette, una crepa che arde, muschio sulle spalle */
    const roccia = mat(E.body, true), rocciaD = mat(E.dark, true), muschio = mat(0x5f9a3e, true);
    const brace = accesa(0x7fe6ff);
    legL = limb(g, rocciaD, -0.26, 0.6, 0, 0.36, 0.6);
    legR = limb(g, rocciaD,  0.26, 0.6, 0, 0.36, 0.6);
    for (const leg of [legL, legR]) put(leg, GEO.sph8, roccia, 0, -0.58, 0.06, 0.46, 0.26, 0.52);
    put(g, GEO.sph8, roccia, 0, 1.12, 0, 1.2, 1.0, 0.9);              // il masso del busto
    put(g, GEO.octa, rocciaD, 0, 0.72, 0, 0.9, 0.5, 0.7);
    [[0.1, 1.2, 0.3], [-0.12, 1.02, 0.4], [0.02, 0.9, -0.2]].forEach(([x, y, r]) =>
      put(g, GEO.box, brace, x, y, 0.44, 0.05, 0.3, 0.03).rotation.z = r);   // crepe
    put(g, GEO.octa, brace, 0, 1.12, 0.42, 0.18, 0.22, 0.08);           // il cuore
    for (const k of [-1, 1]) {
      put(g, GEO.sph8, rocciaD, k * 0.52, 1.56, 0, 0.56, 0.42, 0.56);   // spalle
      put(g, GEO.sph8, muschio, k * 0.5, 1.76, 0.04, 0.4, 0.14, 0.36);
    }
    armL = limb(g, roccia, -0.62, 1.5, 0, 0.34, 0.66);
    armR = limb(g, roccia,  0.62, 1.5, 0, 0.34, 0.66);
    for (const arm of [armL, armR]) {
      put(arm, GEO.octa, rocciaD, 0, -0.34, 0, 0.42, 0.36, 0.42);
      put(arm, GEO.sph8, roccia, 0, -0.76, 0, 0.5, 0.44, 0.5);          // pugno di pietra
    }
    put(g, GEO.sph8, roccia, 0, 1.86, 0.08, 0.62, 0.5, 0.56);          // testa
    put(g, GEO.box, rocciaD, 0, 1.98, 0.3, 0.52, 0.12, 0.14);          // la fronte
    for (const k of [-1, 1]) put(g, GEO.box, brace, k * 0.13, 1.88, 0.34, 0.12, 0.07, 0.04);
    put(g, GEO.octa, rocciaD, 0.1, 2.16, -0.04, 0.3, 0.3, 0.3);        // spuntone
    put(g, GEO.sph8, muschio, -0.12, 2.1, 0.04, 0.3, 0.12, 0.3);
  } else {
    legL = limb(g, dark, -0.17, 0.62, 0, 0.24, 0.62);
    legR = limb(g, dark,  0.17, 0.62, 0, 0.24, 0.62);
    armL = limb(g, body, -0.42, 1.24, 0, 0.2, 0.6);
    armR = limb(g, body,  0.42, 1.24, 0, 0.2, 0.6);
    for (const arm of [armL, armR]) put(arm, GEO.sph, lite, 0, -0.62, 0, 0.24, 0.22, 0.24);
    put(g, GEO.sph, lite, 0, 0.96, 0.08, 0.6, 0.56, 0.46);             // pancia
    put(g, GEO.sph, body, 0, 1.08, -0.02, 0.76, 0.66, 0.6);
    put(g, GEO.sph, body, 0, 1.64, 0, 0.72, 0.64, 0.64);               // testone
    occhiVivi(g, 1.7, 0.27, 0.15, 0.16);
    put(g, GEO.box, dark, 0, 1.82, 0.28, 0.44, 0.06, 0.08).rotation.x = -0.2;   // sopracciglio
    for (const k of [-1, 1]) put(g, GEO.cone6, osso, k * 0.09, 1.47, 0.28, 0.07, 0.12, 0.07).rotation.x = Math.PI;   // dentini
  }

  if (kind === 'goblin') {
    /* cappuccio di cuoio, nasone, orecchie lunghe, pugnale e scudetto */
    put(g, GEO.cone6, lite, 0, 1.6, 0.4, 0.14, 0.26, 0.14).rotation.x = Math.PI / 2 + 0.3;   // naso
    for (const k of [-1, 1]) {
      put(g, GEO.cone6, body, k * 0.46, 1.7, -0.02, 0.18, 0.5, 0.12).rotation.z = -k * 1.35;
      put(g, GEO.cone6, mat(0xd98a7a), k * 0.44, 1.7, 0.02, 0.08, 0.34, 0.04).rotation.z = -k * 1.35;
      put(leg(k), GEO.cone6, cuoio, 0, -0.58, 0.16, 0.22, 0.36, 0.16).rotation.x = Math.PI / 2;   // scarpe a punta
    }
    put(g, GEO.sph, cloth, 0, 1.84, -0.06, 0.74, 0.5, 0.7);            // cappuccio
    put(g, GEO.cone6, cloth, 0, 2.14, -0.2, 0.26, 0.42, 0.26).rotation.x = -0.6;
    put(g, GEO.taper, cloth, 0, 0.9, 0, 0.84, 0.36, 0.66);             // tunica stracciata
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      put(g, GEO.cone6, cloth, Math.sin(a) * 0.34, 0.66, Math.cos(a) * 0.27, 0.16, 0.18, 0.1).rotation.x = Math.PI;
    }
    put(g, GEO.cyl, cuoio, 0, 1.0, 0, 0.8, 0.08, 0.64);                 // cintura
    put(g, GEO.box, cuoio, 0.26, 0.9, 0.26, 0.16, 0.18, 0.1);           // borsello
    const lama = new THREE.Group();                                   // pugnale
    lama.position.set(0, -0.64, 0.12);
    lama.rotation.x = -0.9;
    put(lama, GEO.cyl8, cuoio, 0, 0, 0, 0.08, 0.2, 0.08);
    put(lama, GEO.box, ferroD, 0, 0.12, 0, 0.24, 0.05, 0.08);
    put(lama, GEO.box, ferro, 0, 0.36, 0, 0.1, 0.44, 0.04);
    put(lama, GEO.cone6, ferro, 0, 0.64, 0, 0.1, 0.14, 0.04);
    armR.add(lama);
    const scudo = put(armL, GEO.cyl12, cuoio, -0.1, -0.44, 0.06, 0.46, 0.08, 0.46);
    scudo.rotation.z = Math.PI / 2;
    put(armL, GEO.sph8, ferro, -0.15, -0.44, 0.06, 0.14, 0.14, 0.14);
  }

  if (kind === 'imp') {
    /* corna, ali da pipistrello, coda a freccia, forcone */
    const corno = mat(0x3a2440), ala = mat(E.dark), fiamma = accesa(0xffd23c);
    for (const k of [-1, 1]) {
      put(g, GEO.cone6, corno, k * 0.22, 1.98, 0.02, 0.14, 0.34, 0.14).rotation.z = -k * 0.4;
      const w = new THREE.Group();                                    // un'ala: tre dita e la membrana
      w.position.set(k * 0.24, 1.32, -0.3);
      w.rotation.set(0.2, k * 0.5, 0);
      [[0.3, 0.9], [0.5, 0.5], [0.56, 0.1]].forEach(([l, a]) =>
        put(w, GEO.cyl8, corno, k * Math.sin(a) * l * 0.5, Math.cos(a) * l * 0.5, 0, 0.05, l, 0.05)
          .rotation.z = -k * a);
      put(w, GEO.cone6, ala, k * 0.24, 0.18, 0, 0.5, 0.48, 0.04).rotation.z = -k * 0.9;
      g.add(w);
    }
    for (const k of [-1, 1]) put(g, GEO.cone6, body, k * 0.4, 1.68, 0, 0.12, 0.26, 0.1).rotation.z = -k * 1.2;
    put(g, GEO.box, cloth, 0, 0.7, 0.2, 0.36, 0.3, 0.06);               // perizoma
    put(g, GEO.cyl, cloth, 0, 0.84, 0, 0.62, 0.1, 0.5);
    [[0.95, -0.32], [0.72, -0.5], [0.5, -0.56]].forEach(([y, z], i) =>
      put(g, GEO.sph8, dark, 0.04 * i, y, z, 0.12, 0.12, 0.12));      // coda
    put(g, GEO.cone6, corno, 0.1, 0.4, -0.56, 0.18, 0.24, 0.06).rotation.x = Math.PI;
    const forca = new THREE.Group();                                  // forcone
    forca.position.set(0, -0.62, 0.1);
    forca.rotation.x = -0.35;
    put(forca, GEO.cyl8, cuoio, 0, 0.2, 0, 0.07, 1.6, 0.07);
    put(forca, GEO.box, ferroD, 0, 0.98, 0, 0.36, 0.05, 0.05);
    for (const x of [-0.16, 0, 0.16]) put(forca, GEO.cone6, ferro, x, 1.14, 0, 0.06, 0.3, 0.06);
    armR.add(forca);
    const fuoco = put(g, GEO.cone6, fiamma, 0, 2.02, 0, 0.12, 0.2, 0.12);   // la fiammella in testa
    fuoco.userData.noOutline = true;
  }

  function leg(k) { return k < 0 ? legL : legR; }
  armL.name = 'armL'; armR.name = 'armR'; legL.name = 'legL'; legR.name = 'legR';
  g.scale.setScalar(E.scale);
  addOutline(g, 0.04);
  castShadows(g);
  return g;
}

/* -------------------------------- BOSS --------------------------------- */
/* Il carceriere ai piedi della torre. Era un pupazzo: una palla per il
   torace, una per la testa, due occhi neri e una mazza — accanto al
   vichingo rifatto sembrava modellato col pongo.

   Adesso è un GIGANTE: un bruto vichingo enorme, tutto spalle e braccia,
   con l'armatura dei nostri ma della sua taglia. Nella mitologia del Nord
   i giganti (jötnar) sono uno per regno, ed è quello che serve a otto
   zone: il gigante del gelo, il troll del bosco, il draugr d'ossa, l'ombra
   delle rune, il gigante di fuoco, quello della cenere, di vetro, del
   tuono. Stesso corpo per tutti — petto, addominali, bicipiti, avambracci
   da fabbro, elmo con gli occhiali di ferro, barbone a trecce, mantello di
   pelliccia, un solo spallaccio di ferro (l'asimmetria è quella che lo fa
   sembrare un guerriero vero e non un robot), gonna di maglia con le
   falde di cuoio, e il mazzo di chiavi della prigione alla cintura: è lui
   che le tiene. Poi il regno decide la pelle, la barba, la pelliccia, il
   TRATTO (corona, corna, rune, fiamme...) e l'arma.

   Il carceriere sta ai piedi della torre e GUARDA l'eroe che arriva:
   è costruito rivolto verso +Z e non va girato. */
const OSSO = 0xf2ead6;

/* ogni regno: occhi, barba, pelliccia del mantello */
const TRATTI = {
  'bs.ice'  : { occhi: 0xbff4ff, barba: 0xe6f2fb, pelo: 0xf4f8fb },
  'bs.wood' : { occhi: 0xffe066, barba: 0x8a4a1e, pelo: 0x6b5a3a },
  'bs.bone' : { occhi: 0xff5a4a, barba: 0xb8b09c, pelo: 0x5a524a },
  'bs.rune' : { occhi: 0xd6b8ff, barba: 0x2c2440, pelo: 0x3c3250 },
  'bs.lava' : { occhi: 0xffd23c, barba: 0xff7a2a, pelo: 0x3a2a24 },
  'bs.ash'  : { occhi: 0xff8f3c, barba: 0x4a4642, pelo: 0x6e6862 },
  'bs.glass': { occhi: 0x9ff0ff, barba: 0xd6ecff, pelo: 0xe4ecf8 },
  'bs.sky'  : { occhi: 0xfff27a, barba: 0xf2f4f8, pelo: 0x8a9ac0 }
};

/* un arco (mezzo toro): le costole del draugr */
const GEO_ARCO = new THREE.TorusGeometry(0.5, 0.07, 6, 14, Math.PI);

function buildBoss() {
  const g = new THREE.Group();
  const key = C.bossKey || 'bs.ice';
  const T = TRATTI[key] || TRATTI['bs.ice'];
  const tinta = (c, k) => mat(new THREE.Color(c).lerp(new THREE.Color(0xffffff), k).getHex());
  const body  = mat(C.boss);                 // la pelle del gigante
  const dark  = mat(C.bossDark);
  const lite  = tinta(C.boss, 0.2);          // i muscoli in luce
  const iron  = mat(0x5a6470);
  const ironD = mat(0x3c434d);
  const cuoio = mat(0x5a3c28);
  const cuoioD= mat(0x3e281a);
  const oro   = mat(C.gold);
  const osso  = mat(OSSO);
  const barba = mat(T.barba);
  const pelo  = mat(T.pelo), peloL = tinta(T.pelo, 0.25);
  const occhi = accesa(T.occhi);
  const anime = [];                       // piccole animazioni del tratto

  /* ---- gambe: brache, fasce incrociate, stivaloni con la pelliccia ---- */
  const legL = limb(g, dark, -0.36, 0.86, 0, 0.5, 0.86);
  const legR = limb(g, dark,  0.36, 0.86, 0, 0.5, 0.86);
  for (const leg of [legL, legR]) {
    for (const [y, r] of [[-0.14, 0.18], [-0.26, -0.18], [-0.38, 0.18]])
      put(leg, GEO.cyl, cuoio, 0, y, 0, 0.54, 0.07, 0.54).rotation.z = r;
    put(leg, GEO.cyl,  cuoio, 0, -0.68, 0, 0.56, 0.3, 0.56);          // gambale
    put(leg, GEO.sph,  pelo,  0, -0.52, 0, 0.66, 0.16, 0.66);         // risvolto di pelliccia
    put(leg, GEO.box,  cuoio, 0, -0.8, 0.1, 0.54, 0.16, 0.74);        // piede
    put(leg, GEO.sph8, cuoio, 0, -0.8, 0.46, 0.52, 0.18, 0.3);        // punta
  }

  /* ---- fianchi: gonna di maglia, falde di cuoio, cinturone ---- */
  put(g, GEO.taper, ironD, 0, 0.8, 0, 1.36, 0.52, 1.04);
  for (const a of [-0.95, -0.48, 0, 0.48, 0.95]) {
    const f = put(g, GEO.box, cuoio, Math.sin(a) * 0.6, 0.72, Math.cos(a) * 0.5, 0.32, 0.46, 0.06);
    f.rotation.set(-0.1, a, 0);
  }
  put(g, GEO.cyl, cuoioD, 0, 1.06, 0, 1.34, 0.26, 1.04);             // cinturone
  put(g, GEO.cyl12, iron, 0, 1.06, 0.52, 0.38, 0.08, 0.38).rotation.x = Math.PI / 2;   // fibbia tonda
  put(g, GEO.cyl12, oro, 0, 1.06, 0.57, 0.2, 0.04, 0.2).rotation.x = Math.PI / 2;

  /* il mazzo di chiavi della prigione, al fianco */
  const chiavi = new THREE.Group();
  chiavi.position.set(0.62, 0.96, 0.4);
  put(chiavi, GEO.ring, iron, 0, 0, 0, 0.42, 0.42, 0.7).rotation.y = 0.4;
  [[-0.08, 0.1], [0.04, -0.12], [0.14, 0.25]].forEach(([x, rz]) => {
    const k = new THREE.Group();
    k.position.set(x, -0.14, 0.03);
    k.rotation.z = rz;
    put(k, GEO.ring, oro, 0, -0.02, 0, 0.18, 0.18, 0.3);
    put(k, GEO.cyl8, oro, 0, -0.2, 0, 0.05, 0.3, 0.05);
    put(k, GEO.box,  oro, 0.04, -0.3, 0, 0.08, 0.06, 0.03);
    put(k, GEO.box,  oro, 0.03, -0.22, 0, 0.06, 0.04, 0.03);
    chiavi.add(k);
  });
  g.add(chiavi);
  g.userData.chiavi = chiavi;             // alla vittoria volano alla torre

  /* ---- busto a V: petto largo, pettorali, addominali ---- */
  put(g, GEO.cyl, body, 0, 1.3, 0.02, 1.14, 0.5, 0.84);              // vita
  put(g, GEO.sph, body, 0, 1.68, 0, 1.74, 1.0, 1.02);                // torace
  for (const k of [-1, 1]) put(g, GEO.sph, lite, k * 0.3, 1.74, 0.34, 0.62, 0.42, 0.32);   // pettorali
  for (let r = 0; r < 3; r++) for (const k of [-1, 1])
    put(g, GEO.sph8, lite, k * 0.13, 1.46 - r * 0.14, 0.4, 0.21, 0.13, 0.1);               // addominali
  /* la bandoliera di traverso e il disco di ferro sul cuore */
  put(g, GEO.box, cuoioD, 0.04, 1.62, 0.47, 0.2, 1.3, 0.07).rotation.set(-0.25, 0, -0.62);
  put(g, GEO.cyl12, iron, -0.28, 1.86, 0.5, 0.3, 0.07, 0.3).rotation.x = Math.PI / 2 - 0.3;
  /* il mantello di pelliccia: dietro, e un collo di ciuffi sulle spalle */
  put(g, GEO.sph, pelo, 0, 1.56, -0.4, 1.6, 1.4, 0.46);
  put(g, GEO.sph, pelo, 0, 2.1, -0.06, 1.46, 0.44, 0.96);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    if (Math.cos(a) > 0.8) continue;                                // davanti c'è la barba
    put(g, GEO.sph8, i % 2 ? peloL : pelo, Math.sin(a) * 0.62, 2.14 + (i % 2) * 0.04,
        Math.cos(a) * 0.42 - 0.06, 0.34, 0.26, 0.32);
  }

  /* ---- spalle: uno spallaccio di ferro a lamine, l'altro di cuoio ---- */
  const spallacci = [];
  for (const k of [-1, 1]) {
    const sp = new THREE.Group();
    sp.position.set(k * 0.92, 2.06, 0);
    if (k > 0) {
      put(sp, GEO.sph, iron,  0, 0, 0, 0.74, 0.52, 0.78);
      put(sp, GEO.cyl, ironD, 0, -0.1, 0, 0.78, 0.08, 0.82);
      put(sp, GEO.cyl, ironD, 0.04, -0.24, 0, 0.72, 0.08, 0.78);
      for (const z of [-0.22, 0, 0.22]) put(sp, GEO.sph8, oro, 0.26, 0.12, z, 0.08, 0.08, 0.08);
    } else {
      put(sp, GEO.sph, cuoio, 0, -0.02, 0, 0.62, 0.42, 0.68);
      put(sp, GEO.cyl, cuoioD, 0, -0.1, 0, 0.66, 0.06, 0.72);
    }
    g.add(sp);
    spallacci.push(sp);
  }

  /* ---- braccia da fabbro: deltoide, bicipite, avambraccio, bracciale ---- */
  const armL = limb(g, body, -0.96, 1.98, 0, 0.46, 1.02);
  const armR = limb(g, body,  0.96, 1.98, 0, 0.46, 1.02);
  for (const arm of [armL, armR]) {
    put(arm, GEO.sph, body,  0, -0.14, 0, 0.58, 0.52, 0.58);          // deltoide
    put(arm, GEO.sph, lite,  0, -0.4, 0.1, 0.46, 0.46, 0.42);         // bicipite
    put(arm, GEO.taper, body, 0, -0.72, 0, 0.6, 0.44, 0.6).rotation.x = Math.PI;   // avambraccio
    put(arm, GEO.cyl, ironD, 0, -0.86, 0, 0.58, 0.24, 0.58);          // bracciale
    put(arm, GEO.box, iron,  0, -0.86, 0.26, 0.2, 0.26, 0.08);
    put(arm, GEO.cyl, cuoio, 0, -0.73, 0, 0.6, 0.05, 0.6);
    put(arm, GEO.sph, lite,  0, -1.1, 0, 0.54, 0.5, 0.54);            // pugno
  }

  /* ---- testa: collo taurino, elmo con gli occhiali, barbone a trecce ---- */
  put(g, GEO.cyl, body, 0, 2.2, 0.04, 0.54, 0.22, 0.52);
  put(g, GEO.sph, body, 0, 2.5, 0.06, 0.74, 0.72, 0.72);
  put(g, GEO.sph, lite, 0, 2.38, 0.42, 0.16, 0.14, 0.14);            // naso
  const gliOcchi = [];
  for (const k of [-1, 1]) {
    const occhio = put(g, GEO.sph, occhi, k * 0.15, 2.47, 0.36, 0.12, 0.08, 0.06);
    bagliore(occhio, T.occhi, key === 'bs.rune' ? 6.5 : 5.5, key === 'bs.rune' ? 0.5 : 0.35);
    gliOcchi.push(occhio);
    put(g, GEO.ring, ironD, k * 0.15, 2.47, 0.39, 0.34, 0.3, 0.4);   // gli occhiali dell'elmo
  }
  put(g, GEO.sph, iron,  0, 2.64, 0.04, 0.8, 0.62, 0.78);            // calotta
  put(g, GEO.cyl, ironD, 0, 2.66, 0.04, 0.1, 0.62, 0.8).rotation.x = Math.PI / 2;  // cresta
  put(g, GEO.cyl, ironD, 0, 2.56, 0.04, 0.82, 0.1, 0.8);             // bordo
  put(g, GEO.box, iron,  0, 2.44, 0.42, 0.08, 0.26, 0.06);           // nasale
  /* barbone: massa, baffi, due trecce con l'anello di ferro */
  put(g, GEO.sph, barba, 0, 2.2, 0.3, 0.74, 0.5, 0.44);
  put(g, GEO.cone6, barba, 0, 1.95, 0.36, 0.52, 0.42, 0.32).rotation.x = Math.PI;
  for (const k of [-1, 1]) {
    put(g, GEO.sph8, barba, k * 0.15, 2.33, 0.44, 0.3, 0.1, 0.14).rotation.z = k * -0.3;
    for (let i = 0; i < 3; i++) put(g, GEO.sph8, barba, k * 0.13, 1.8 - i * 0.12, 0.42, 0.15, 0.14, 0.14);
    put(g, GEO.cyl8, iron, k * 0.13, 1.44, 0.42, 0.13, 0.07, 0.13);
  }
  const testa = new THREE.Group();                                   // corone e corna ci si appoggiano
  testa.position.set(0, 2.84, 0.04);
  g.add(testa);

  /* ---- il tratto della zona ---- */
  const arma = new THREE.Group();
  const tratti = {
    'bs.ice'() {
      const ghiaccio = mat(0xdff6ff, true), azzurro = mat(0x8fd6f2, true);
      put(testa, GEO.cyl, iron, 0, 0, 0, 0.9, 0.18, 0.84);
      [[0, 0.52], [0.26, 0.38], [-0.26, 0.38], [0.44, 0.26], [-0.44, 0.26]].forEach(([x, h], i) =>
        put(testa, GEO.cone6, i % 2 ? azzurro : ghiaccio, x, 0.08 + h / 2, 0.12, 0.16, h, 0.16)
          .rotation.z = -x * 0.5);
      for (let i = 0; i < 5; i++)                                     // ghiaccioli nella barba
        put(g, GEO.cone6, ghiaccio, (i - 2) * 0.11, 1.84 - Math.abs(i - 2) * 0.06, 0.44, 0.08,
            0.2 + (i % 2) * 0.1, 0.08).rotation.x = Math.PI;
      spallacci.forEach((sp, k) => [[0, 0.46], [0.16, 0.32]].forEach(([z, h]) =>
        put(sp, GEO.octa, ghiaccio, (k ? 1 : -1) * 0.12, 0.28, z - 0.08, 0.16, h, 0.16)));
      put(arma, GEO.cyl, cuoio, 0, -0.3, 0, 0.16, 1.4, 0.16);
      put(arma, GEO.octa, azzurro, 0, 0.62, 0, 0.62, 1.0, 0.62);
      for (const k of [-1, 1]) put(arma, GEO.octa, ghiaccio, k * 0.3, 0.5, 0, 0.26, 0.52, 0.26)
        .rotation.z = -k * 0.6;
    },
    'bs.wood'() {
      const legno = mat(0x6b4a35), foglia = mat(C.tree || 0x3f8a3a, true), fungo = mat(0xd9483b);
      put(testa, GEO.cyl, legno, 0, -0.02, 0, 0.88, 0.14, 0.82);
      for (const k of [-1, 1]) {                                      // corna di cervo
        put(testa, GEO.cyl8, legno, k * 0.42, 0.3, 0, 0.16, 0.8, 0.16).rotation.z = -k * 0.6;
        put(testa, GEO.cyl8, legno, k * 0.74, 0.78, 0, 0.13, 0.6, 0.13).rotation.z = -k * 0.2;
        put(testa, GEO.cyl8, legno, k * 0.5, 0.74, 0, 0.11, 0.44, 0.11).rotation.z = k * 0.35;
        put(testa, GEO.cyl8, legno, k * 0.98, 0.64, 0, 0.1, 0.4, 0.1).rotation.z = -k * 1.1;
        put(testa, GEO.cyl8, legno, k * 0.86, 1.12, 0, 0.09, 0.3, 0.09).rotation.z = -k * 0.5;
      }
      spallacci.forEach(sp => {
        for (let i = 0; i < 4; i++) put(sp, GEO.sph8, foglia, (i - 1.5) * 0.14, 0.24 + (i % 2) * 0.06,
                                        (i % 2 ? 0.14 : -0.14), 0.3, 0.2, 0.3);
      });
      put(spallacci[0], GEO.cyl8, mat(OSSO), 0.1, 0.36, 0.1, 0.06, 0.14, 0.06);
      put(spallacci[0], GEO.sph, fungo, 0.1, 0.44, 0.1, 0.2, 0.12, 0.2);
      put(arma, GEO.taper, legno, 0, 0.1, 0, 0.34, 1.9, 0.34).rotation.x = Math.PI;   // il tronco
      put(arma, GEO.cyl8, legno, 0.18, 0.5, 0, 0.1, 0.36, 0.1).rotation.z = -0.9;     // rametto
      for (const [x, y] of [[-0.12, 0.8], [0.1, 0.95]]) put(arma, GEO.sph8, foglia, x, y, 0.1, 0.24, 0.18, 0.24);
      put(arma, GEO.sph, fungo, -0.16, 0.3, 0.12, 0.16, 0.1, 0.16);
    },
    'bs.bone'() {
      put(testa, GEO.cyl, osso, 0, 0, 0, 0.9, 0.16, 0.84);           // corona d'ossa
      for (let i = 0; i < 7; i++) {
        const a = (i / 6 - 0.5) * 2.4;
        const h = i === 3 ? 0.5 : 0.32;
        put(testa, GEO.cyl8, osso, Math.sin(a) * 0.42, 0.08 + h / 2, Math.cos(a) * 0.4, 0.07, h, 0.07);
        put(testa, GEO.sph8, osso, Math.sin(a) * 0.42, 0.1 + h, Math.cos(a) * 0.4, 0.13, 0.13, 0.13);
      }
      for (let i = 0; i < 3; i++) {                                   // costole sul petto
        const c = put(g, GEO_ARCO, osso, 0, 1.78 - i * 0.18, 0.4, 0.94 - i * 0.1, 0.62, 0.5);
        c.rotation.set(-Math.PI / 2 + 0.2, 0, Math.PI);
      }
      put(g, GEO.box, osso, 0, 1.6, 0.6, 0.1, 0.6, 0.06);             // sterno
      spallacci.forEach((sp, k) => put(sp, GEO.sph, osso, 0, 0.12, 0, 0.5, 0.38, 0.5));   // teschi-spallacci
      put(arma, GEO.cyl, osso, 0, -0.1, 0, 0.18, 1.7, 0.18);          // femore
      for (const y of [-0.95, 0.75]) for (const k of [-1, 1])
        put(arma, GEO.sph, osso, k * 0.12, y, 0, 0.34, 0.3, 0.3);
    },
    'bs.rune'() {
      const viola = accesa(0xc9a8ff);
      put(g, GEO.sph, dark, 0, 2.56, -0.14, 1.02, 1.02, 0.96);       // cappuccio
      put(g, GEO.cone, dark, 0, 3.18, -0.28, 0.6, 0.6, 0.5).rotation.x = -0.5;
      put(g, GEO.box, viola, 0, 1.06, 0.6, 0.12, 0.18, 0.02).userData.noOutline = true;   // runa sulla fibbia
      for (const arm of [armL, armR]) for (const [y, r] of [[-0.3, 0.5], [-0.46, -0.5], [-0.62, 0.5]])
        put(arm, GEO.box, viola, 0, y, 0.25, 0.04, 0.16, 0.02).rotation.z = r;          // rune tatuate
      const cerchio = new THREE.Group();                              // rune che gli girano attorno
      cerchio.position.y = 1.7;
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * Math.PI * 2;
        const r = new THREE.Group();
        r.position.set(Math.sin(a) * 1.35, (i % 2) * 0.4, Math.cos(a) * 1.1);
        put(r, GEO.box, viola, 0, 0, 0, 0.08, 0.34, 0.06);
        put(r, GEO.box, viola, 0.06, 0.08, 0, 0.16, 0.06, 0.06).rotation.z = 0.6;
        bagliore(r, 0xb690ff, 0.9, 0.4);
        cerchio.add(r);
      }
      g.add(cerchio);
      anime.push(t => { cerchio.rotation.y = t * 0.7; });
      put(arma, GEO.cyl8, cuoioD, 0, 0.1, 0, 0.12, 2.4, 0.12);       // bastone
      put(arma, GEO.ring, ironD, 0, 1.2, 0, 0.6, 0.6, 0.5).rotation.y = Math.PI / 2;
      const gemma = put(arma, GEO.octa, viola, 0, 1.25, 0, 0.3, 0.46, 0.3);
      bagliore(gemma, 0xb690ff, 5, 0.6);
    },
    'bs.lava'() {
      const brace = accesa(C.lavaHot || 0xffa23c), ossidiana = mat(0x2a2024);
      for (const k of [-1, 1]) {                                      // corna grandi, curve
        put(testa, GEO.taper, ossidiana, k * 0.44, 0.08, 0, 0.26, 0.4, 0.26).rotation.z = -k * 1.2;
        put(testa, GEO.taper, ossidiana, k * 0.66, 0.3, 0, 0.2, 0.34, 0.2).rotation.z = -k * 0.5;
        put(testa, GEO.cone6, ossidiana, k * 0.72, 0.6, 0, 0.16, 0.34, 0.16).rotation.z = k * 0.15;
      }
      const fiamme = new THREE.Group();                               // capelli di fuoco
      fiamme.position.y = 0.02;
      [[0, 0.5, brace], [0.2, 0.36, accesa(0xffd23c)], [-0.2, 0.38, accesa(0xffd23c)]].forEach(([x, h, m]) =>
        put(fiamme, GEO.cone6, m, x, h / 2, -0.05, 0.22, h, 0.22).userData.noOutline = true);
      bagliore(fiamme, 0xff8a3c, 2.2, 0.6, 0.3);
      testa.add(fiamme);
      anime.push(t => { fiamme.scale.y = 1 + Math.sin(t * 11) * 0.12 + Math.sin(t * 17) * 0.06; });
      /* crepe di lava sul petto e sulle braccia */
      [[-0.3, 1.5, 0.45, 0.5], [0.24, 1.32, 0.52, -0.7], [0.05, 1.7, 0.44, 1.2]].forEach(([x, y, z, r]) =>
        put(g, GEO.box, brace, x, y, z, 0.05, 0.36, 0.05).rotation.z = r);
      for (const arm of [armL, armR]) put(arm, GEO.box, brace, 0.1, -0.3, 0.2, 0.04, 0.3, 0.04).rotation.z = 0.4;
      put(arma, GEO.cyl, cuoioD, 0, -0.3, 0, 0.16, 1.4, 0.16);
      put(arma, GEO.box, ossidiana, 0, 0.56, 0, 0.9, 0.52, 0.52);     // martello di magma
      for (const x of [-0.24, 0.24]) put(arma, GEO.box, brace, x, 0.56, 0, 0.06, 0.54, 0.54);
      bagliore(arma, 0xff8a3c, 2.4, 0.5, 0.56);
    },
    'bs.ash'() {
      const cenere = mat(0x8a8680), fumo = mat(0xb6b0a8);
      put(g, GEO.box, iron, 0, 2.32, 0.46, 0.6, 0.3, 0.12);           // maschera a grata
      for (let i = 0; i < 4; i++) put(g, GEO.box, ironD, (i - 1.5) * 0.13, 2.32, 0.53, 0.05, 0.22, 0.02);
      put(testa, GEO.cyl, iron, 0, 0, 0, 0.9, 0.2, 0.84);
      for (let i = 0; i < 6; i++) {
        const a = (i / 5 - 0.5) * 2.2;
        put(testa, GEO.box, ironD, Math.sin(a) * 0.4, 0.2, Math.cos(a) * 0.38, 0.1, 0.3, 0.06).rotation.y = a;
      }
      const sbuffi = [];
      for (const k of [-1, 1]) {                                      // camini sulla schiena
        put(g, GEO.cyl12, ironD, k * 0.36, 2.4, -0.5, 0.26, 0.9, 0.26);
        put(g, GEO.cyl12, iron, k * 0.36, 2.86, -0.5, 0.32, 0.1, 0.32);
        for (let i = 0; i < 3; i++) {
          const s = put(g, GEO.sph8, i ? fumo : cenere, k * 0.36, 3.1 + i * 0.3, -0.5, 0.3 + i * 0.1);
          s.userData.vivo = s.userData.noOutline = true;              // sale da solo: niente fusione né guscio
          sbuffi.push([s, i, k]);
        }
      }
      anime.push(t => sbuffi.forEach(([s, i, k]) => {
        const f = (t * 0.6 + i / 3 + (k > 0 ? 0.5 : 0)) % 1;
        s.position.y = 3.0 + f * 1.0;
        s.scale.setScalar(0.24 + f * 0.36);
      }));
      put(arma, GEO.cyl, cuoio, 0, -0.4, 0, 0.14, 1.2, 0.14);         // la mannaia
      put(arma, GEO.box, iron, 0.26, 0.54, 0, 0.62, 0.9, 0.08);
      put(arma, GEO.box, mat(0xd6dde4), 0.58, 0.54, 0, 0.06, 0.9, 0.09);
      put(arma, GEO.sph8, ironD, 0.1, 0.84, 0.05, 0.1, 0.1, 0.06);
    },
    'bs.glass'() {
      const vetro = mat(0xcfe8ff, true), vetroD = mat(0x8fb4ea, true);
      put(testa, GEO.cyl, oro, 0, 0, 0, 0.9, 0.16, 0.84);
      [[0, 0.8], [0.3, 0.56], [-0.3, 0.56], [0.5, 0.36], [-0.5, 0.36]].forEach(([x, h], i) =>
        put(testa, GEO.octa, i % 2 ? vetroD : vetro, x, 0.08 + h / 2, 0.06, 0.2, h, 0.2));
      spallacci.forEach((sp, k) => [[0, 0.62, 0], [0.14, 0.4, 0.2], [-0.1, 0.44, -0.2]].forEach(([x, h, z]) =>
        put(sp, GEO.octa, vetro, (k ? 1 : -1) * (0.1 + x), 0.2 + h / 2, z, 0.18, h, 0.18)
          .rotation.z = (k ? -1 : 1) * 0.3));
      put(g, GEO.octa, accesa(0xbff4ff), -0.28, 1.86, 0.58, 0.18, 0.28, 0.1);   // la gemma sul disco
      put(arma, GEO.cyl, oro, 0, -0.3, 0, 0.14, 1.4, 0.14);
      put(arma, GEO.octa, vetroD, 0, 0.6, 0, 0.66, 0.8, 0.66);
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * Math.PI * 2;
        put(arma, GEO.octa, vetro, Math.sin(a) * 0.3, 0.6, Math.cos(a) * 0.3, 0.16, 0.5, 0.16)
          .rotation.set(Math.cos(a) * 1.2, 0, -Math.sin(a) * 1.2);
      }
    },
    'bs.sky'() {
      const nube = mat(0xe8eef8), nubeD = mat(0x9aa8c4), lampo = accesa(0xfff27a);
      const corona = new THREE.Group();                               // nubi che girano
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2;
        put(corona, GEO.sph8, i % 2 ? nubeD : nube, Math.sin(a) * 0.5, 0.06 + (i % 3) * 0.05,
            Math.cos(a) * 0.46, 0.34, 0.26, 0.34);
      }
      testa.add(corona);
      anime.push(t => { corona.rotation.y = t * 0.5; });
      for (const k of [-1, 0, 1]) {                                   // tre saette dritte
        const s = new THREE.Group();
        s.position.set(k * 0.3, 0.2, 0);
        put(s, GEO.box, lampo, 0, 0.14, 0, 0.08, 0.3, 0.06).rotation.z = 0.4;
        put(s, GEO.box, lampo, 0.02, 0.36, 0, 0.08, 0.26, 0.06).rotation.z = -0.4;
        s.scale.setScalar(k ? 0.8 : 1.1);
        testa.add(s);
      }
      bagliore(testa, 0xfff27a, 1.8, 0.35, 0.4);
      put(g, GEO.box, dark, 0, 1.4, -0.56, 1.4, 1.6, 0.06).rotation.x = 0.12;   // mantello
      put(arma, GEO.cyl, cuoio, 0, -0.3, 0, 0.14, 1.4, 0.14);         // martello del tuono
      put(arma, GEO.box, iron, 0, 0.58, 0, 0.84, 0.5, 0.5);
      for (const x of [-0.34, 0.34]) put(arma, GEO.box, ironD, x, 0.58, 0, 0.1, 0.56, 0.56);
      put(arma, GEO.box, lampo, 0, 0.58, 0.26, 0.1, 0.34, 0.02).rotation.z = 0.5;
      bagliore(arma, 0xfff27a, 1.8, 0.4, 0.58);
    }
  };
  (tratti[key] || tratti['bs.ice'])();

  /* l'arma nella destra: stessa presa e stessa carica per tutti */
  arma.position.set(0.22, -1.08, 0.28);
  arma.rotation.set(-0.5, 0, -0.32);          // la testa in alto e in fuori, non dietro il braccio
  armR.add(arma);

  g.userData.limbs = { armL, armR, legL, legR };
  g.userData.anima = t => anime.forEach(f => f(t));
  g.userData.occhi = gliOcchi;
  /* l'alone della rabbia: spento finché non si infuria */
  const furia = new THREE.Group();
  furia.position.y = 1.7;
  bagliore(furia, 0xff3a2a, 5.5, 0.4);
  furia.visible = false;
  g.add(furia);
  g.userData.furia = furia;
  addOutline(g, 0.05);
  castShadows(g);
  return g;
}

/* ----------------------------- PRINCIPESSA ----------------------------- */
/* È il premio, e la si guarda soprattutto alla vittoria, quando la camera
   sale fino al suo balcone: era un cono rosa con una palla sopra. Ora ha
   una gonna a due balze con l'orlo d'oro, il corpetto allacciato, le
   maniche a sbuffo, i capelli lunghi fino alla vita con la treccia che le
   gira attorno alla testa, e una tiara con la gemma che brilla — si vede
   da lontano, ed è quello che vai a prendere. */
function buildPrincess() {
  const g = new THREE.Group();
  const gown = mat(C.princess);
  const lite = mat(C.gownLite);
  const scuro = mat(new THREE.Color(C.princess).multiplyScalar(0.72).getHex());
  const skin = mat(C.skin);
  const hair = mat(0xf5d76e), hairD = mat(0xd9ac3c);
  const oro  = mat(C.gold);

  /* gonna: due balze, orlo d'oro, il grembiule davanti */
  put(g, GEO.cone, gown, 0, 0.62, 0, 1.08, 1.24, 1.08);
  put(g, GEO.cyl, oro, 0, 0.04, 0, 1.08, 0.06, 1.08);
  put(g, GEO.cone, lite, 0, 0.8, 0, 0.86, 0.9, 0.86);                // seconda balza
  put(g, GEO.cyl, scuro, 0, 0.36, 0, 0.9, 0.06, 0.9);
  put(g, GEO.box, lite, 0, 0.5, 0.42, 0.3, 0.8, 0.04).rotation.x = -0.34;
  /* corpetto con i lacci e la cintura d'oro */
  put(g, GEO.taper, lite, 0, 1.24, 0, 0.56, 0.42, 0.46);
  put(g, GEO.cyl, oro, 0, 1.05, 0, 0.5, 0.06, 0.42);
  for (let i = 0; i < 3; i++) put(g, GEO.box, scuro, 0, 1.12 + i * 0.1, 0.22, 0.12, 0.03, 0.02);
  put(g, GEO.sph8, oro, 0, 1.4, 0.2, 0.08, 0.08, 0.06);             // il ciondolo
  put(g, GEO.cyl, skin, 0, 1.46, 0, 0.16, 0.1, 0.16);               // collo

  /* braccia: sbuffo sulla spalla, guanto, mano */
  const armL = limb(g, skin, -0.32, 1.38, 0, 0.13, 0.5);
  const armR = limb(g, skin,  0.32, 1.38, 0, 0.13, 0.5);
  for (const arm of [armL, armR]) {
    put(arm, GEO.sph, gown, 0, -0.04, 0, 0.26, 0.24, 0.26);
    put(arm, GEO.cyl, lite, 0, -0.34, 0, 0.15, 0.16, 0.15);
    put(arm, GEO.sph8, skin, 0, -0.52, 0, 0.13, 0.13, 0.13);
  }

  /* capelli lunghi dietro, fino alla vita */
  put(g, GEO.sph, hair, 0, 1.68, -0.08, 0.64, 0.7, 0.62);
  put(g, GEO.taper, hair, 0, 1.3, -0.2, 0.56, 0.64, 0.24).rotation.x = Math.PI;
  put(g, GEO.sph, hairD, 0, 1.0, -0.22, 0.4, 0.2, 0.2);
  /* viso: occhi grandi, guance, sorriso */
  put(g, GEO.sph, skin, 0, 1.66, 0.12, 0.5, 0.54, 0.44);
  occhiVivi(g, 1.7, 0.3, 0.1, 0.1);
  for (const k of [-1, 1]) put(g, GEO.sph8, mat(0xf29a9a), k * 0.16, 1.6, 0.28, 0.09, 0.05, 0.03);
  put(g, GEO.box, mat(0xb8505a), 0, 1.55, 0.33, 0.08, 0.02, 0.02);
  /* frangia e ciocche ai lati del viso */
  put(g, GEO.sph, hair, 0, 1.88, 0.14, 0.5, 0.2, 0.38);
  for (const k of [-1, 1]) {
    put(g, GEO.sph8, hair, k * 0.24, 1.6, 0.14, 0.14, 0.44, 0.16);
    put(g, GEO.sph8, hairD, k * 0.26, 1.34, 0.14, 0.12, 0.16, 0.12);
  }
  /* la treccia che gira attorno alla testa */
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2;
    if (Math.cos(a) > 0.7) continue;
    put(g, GEO.sph8, i % 2 ? hairD : hair, Math.sin(a) * 0.3, 1.9, Math.cos(a) * 0.29 - 0.06, 0.16, 0.14, 0.16);
  }

  /* tiara: cerchietto, tre punte, la gemma che brilla */
  put(g, GEO.cyl, oro, 0, 1.97, 0, 0.44, 0.07, 0.42);
  for (const [x, h] of [[-0.14, 0.12], [0, 0.2], [0.14, 0.12]])
    put(g, GEO.cone6, oro, x, 2.0 + h / 2, 0.18, 0.08, h, 0.06);
  const gemma = put(g, GEO.octa, accesa(0xff7ac0), 0, 2.02, 0.22, 0.1, 0.12, 0.06);
  bagliore(gemma, 0xff9ad0, 6, 0.5);

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
    sciogli(actor.userData.weaponObj);
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
