/* =====================================================================
   ACTORS — omini a blocchi, armi, mob
   Proporzioni da personaggio voxel classico: testa 0.5, busto 0.75,
   arti 0.75 → alto 2 blocchi tondi.
   ===================================================================== */

/* --------------------------- TEXTURE VOLTI --------------------------- */
/* Un volto è 8×8 px: due occhi, naso, bocca. Cambiando i colori si
   passa dall'eroe allo zombie senza toccare la geometria.              */
function faceTex(skin, eyeWhite, iris, mouth, brow) {
  return pixelTex(8, g => {
    g.fillStyle = hex(skin); g.fillRect(0, 0, 8, 8);
    if (brow !== null) {
      g.fillStyle = hex(brow);
      g.fillRect(1, 2, 2, 1); g.fillRect(5, 2, 2, 1);
    }
    g.fillStyle = hex(eyeWhite);
    g.fillRect(1, 3, 2, 1); g.fillRect(5, 3, 2, 1);
    g.fillStyle = hex(iris);
    g.fillRect(2, 3, 1, 1); g.fillRect(5, 3, 1, 1);
    g.fillStyle = hex(mouth);
    g.fillRect(3, 5, 2, 1);
  });
}

/* volto "vuoto" a fessure: per gli scheletri e i mob esplosivi */
function hollowFaceTex(base, hole) {
  return pixelTex(8, g => {
    g.fillStyle = hex(base); g.fillRect(0, 0, 8, 8);
    g.fillStyle = hex(hole);
    g.fillRect(1, 2, 2, 2); g.fillRect(5, 2, 2, 2);
    g.fillRect(3, 4, 2, 3); g.fillRect(2, 5, 1, 2); g.fillRect(5, 5, 1, 2);
  });
}

/* Le "skin": palette di un personaggio. Ispirate all'immaginario voxel
   ma con colori nostri, per non ricalcare personaggi esistenti.        */
const SKINS = {
  hero: {
    skin: 0xd9a066, hair: 0x4a3423, shirt: 0x2fb5a8, sleeve: 0x2fb5a8,
    pants: 0x3a5ba8, shoe: 0x4a4a52,
    face: () => faceTex(0xd9a066, 0xf2f2f2, 0x3a5ba8, 0x8a5a3a, 0x4a3423)
  },
  zombie: {
    skin: 0x5a8a4a, hair: 0x2f4a28, shirt: 0x3a6a86, sleeve: 0x3a6a86,
    pants: 0x33447a, shoe: 0x2e2e34,
    face: () => faceTex(0x5a8a4a, 0x1d2a18, 0x0f1a0c, 0x2f4a28, 0x2f4a28)
  },
  skeleton: {
    skin: 0xd8d8cf, hair: 0xd8d8cf, shirt: 0xc9c9bf, sleeve: 0xc9c9bf,
    pants: 0xbcbcb2, shoe: 0xa8a89e,
    face: () => hollowFaceTex(0xd8d8cf, 0x22221f)
  },
  bomber: {                      // il verde che esplode: 4 zampe, niente braccia
    skin: 0x54a14a, hair: 0x54a14a, shirt: 0x54a14a, sleeve: 0x54a14a,
    pants: 0x48913f, shoe: 0x3d7c36,
    face: () => hollowFaceTex(0x54a14a, 0x1b2a18)
  },
  brute: {                       // il boss: grosso e scuro
    skin: 0x8a4a4a, hair: 0x3a1f1f, shirt: 0x6a2f2f, sleeve: 0x6a2f2f,
    pants: 0x4a2020, shoe: 0x2a1414,
    face: () => faceTex(0x8a4a4a, 0xffd24b, 0xc02020, 0x2a1414, 0x3a1f1f)
  }
};

/* cache dei materiali per skin: gli omini della folla li condividono tutti */
const skinMats = new Map();
function matsFor(name) {
  if (skinMats.has(name)) return skinMats.get(name);
  const s = SKINS[name];
  const solid = c => new THREE.MeshLambertMaterial({ color: c });
  const faceM = new THREE.MeshLambertMaterial({ map: s.face() });
  const hairM = solid(s.hair);
  const m = {
    head  : [hairM, hairM, hairM, hairM, faceM, hairM],   // volto sulla faccia +Z
    skin  : solid(s.skin),
    shirt : solid(s.shirt),
    sleeve: solid(s.sleeve),
    pants : solid(s.pants),
    shoe  : solid(s.shoe)
  };
  skinMats.set(name, m);
  return m;
}

/* ------------------------------ OMINO ------------------------------- */
/* Ritorna un Group alto 2 unità con userData.limbs per l'animazione.
   opts.arms:false → creatura a quattro zampe (il bomber).              */
function buildActor(skinName, opts) {
  opts = opts || {};
  const M = matsFor(skinName);
  const g = new THREE.Group();

  const cube = (mat, x, y, z, sx, sy, sz) => {
    const m = new THREE.Mesh(boxGeo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    return m;
  };
  /* arto con perno in alto, così ruota dalla spalla/anca e non dal centro */
  const limb = (mat, x, yTop, z, w, h) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, yTop, z);
    pivot.add(cube(mat, 0, -h / 2, 0, w, h, w));
    g.add(pivot);
    return pivot;
  };

  const fourLegs = opts.arms === false;

  if (fourLegs) {
    // corpo orizzontale su quattro zampe corte
    g.add(cube(M.shirt, 0, 1.05, 0, 0.6, 0.8, 0.6));
    g.add(cube(M.head,  0, 1.72, 0, 0.62, 0.62, 0.62));
    const legs = [];
    for (const dx of [-0.2, 0.2]) for (const dz of [-0.18, 0.18])
      legs.push(limb(M.pants, dx, 0.66, dz, 0.24, 0.66));
    g.userData.limbs = { legL: legs[0], legR: legs[3], armL: legs[1], armR: legs[2] };
  } else {
    g.add(cube(M.shirt, 0, 1.12, 0, 0.5, 0.75, 0.26));   // busto
    g.add(cube(M.head,  0, 1.75, 0, 0.5, 0.5, 0.5));     // testa
    const armL = limb(M.sleeve, -0.375, 1.5, 0, 0.25, 0.75);
    const armR = limb(M.sleeve,  0.375, 1.5, 0, 0.25, 0.75);
    const legL = limb(M.pants, -0.125, 0.75, 0, 0.25, 0.75);
    const legR = limb(M.pants,  0.125, 0.75, 0, 0.25, 0.75);
    // mani e scarpe: un blocchetto di colore diverso in fondo all'arto
    armL.add(cube(M.skin, 0, -0.66, 0, 0.26, 0.16, 0.26));
    armR.add(cube(M.skin, 0, -0.66, 0, 0.26, 0.16, 0.26));
    legL.add(cube(M.shoe, 0, -0.70, 0.02, 0.26, 0.12, 0.30));
    legR.add(cube(M.shoe, 0, -0.70, 0.02, 0.26, 0.12, 0.30));
    g.userData.limbs = { armL, armR, legL, legR };
    g.userData.hand  = armR;                             // dove va l'arma
  }
  return g;
}

/* ------------------------------- ARMI -------------------------------- */
/* Costruita nella mano destra; si rifà da zero quando cambia livello. */
function buildWeapon(tier) {
  const W = WEAPONS[tier];
  if (!W.len) return null;
  const g = new THREE.Group();
  const add = (color, y, sx, sy, sz) => {
    const m = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color }));
    m.position.set(0, y, 0);
    m.scale.set(sx, sy, sz);
    g.add(m);
  };
  add(W.wood, -W.len * 0.25, 0.10, W.len, 0.10);          // manico
  if (W.blade) {
    add(W.blade, W.len * 0.32, 0.14, W.len * 0.62, 0.05);  // lama
    add(W.blade, W.len * 0.02, 0.34, 0.10, 0.06);          // guardia
  }
  // impugnata in avanti: puntata davanti all'omino, non appesa lungo la gamba
  g.position.set(0, -0.58, 0.24);
  g.rotation.x = -1.15;
  return g;
}

function setWeapon(actor, tier) {
  const hand = actor.userData.hand;
  if (!hand) return;
  if (actor.userData.weaponObj) {
    hand.remove(actor.userData.weaponObj);
    actor.userData.weaponObj = null;
  }
  const w = buildWeapon(tier);
  if (w) { hand.add(w); actor.userData.weaponObj = w; }
}

/* --------------------------- ANIMAZIONE ------------------------------ */
/* Corsa: gambe e braccia in controfase. phase permette di sfasare
   ogni omino della folla, così non sembrano un unico blocco.           */
function animateRun(actor, t, phase, amount) {
  const L = actor.userData.limbs;
  if (!L) return;
  const s = Math.sin(t * 9 + phase) * (amount === undefined ? 0.9 : amount);
  L.legL.rotation.x =  s;
  L.legR.rotation.x = -s;
  if (L.armL) { L.armL.rotation.x = -s * 0.8; L.armR.rotation.x = s * 0.8; }
}

function animateIdle(actor, t, phase) {
  const L = actor.userData.limbs;
  if (!L) return;
  const s = Math.sin(t * 2 + phase) * 0.12;
  L.legL.rotation.x = s;  L.legR.rotation.x = -s;
  if (L.armL) { L.armL.rotation.x = -s; L.armR.rotation.x = s; }
}
