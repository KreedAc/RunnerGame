/* =====================================================================
   ART — geometrie condivise, materiali e il contorno dei personaggi
   Sostituisce il vecchio sistema a blocchi con texture: qui è tutto
   colore piatto, e a dare carattere sono le sfaccettature e le silhouette.
   ===================================================================== */

/* Poche geometrie riusate ovunque: costa quasi niente e tiene basse le draw call. */
const GEO = {
  box   : new THREE.BoxGeometry(1, 1, 1),
  cyl   : new THREE.CylinderGeometry(0.5, 0.5, 1, 18),
  cyl8  : new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
  taper : new THREE.CylinderGeometry(0.38, 0.5, 1, 16),
  sph   : new THREE.SphereGeometry(0.5, 18, 14),
  sph8  : new THREE.SphereGeometry(0.5, 8, 6),
  cone  : new THREE.ConeGeometry(0.5, 1, 16),
  cone6 : new THREE.ConeGeometry(0.5, 1, 6),
  octa  : new THREE.OctahedronGeometry(0.5, 0),
  disc  : new THREE.CircleGeometry(0.5, 24)
};

const MAT = {};
const matCache = new Map();

/* Un materiale per colore, con o senza sfaccettature.
   flat = superfici a faccette (rocce, cristalli); liscio per i personaggi. */
function mat(color, flat) {
  const key = color + (flat ? 'f' : 's');
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color, flatShading: !!flat });
    matCache.set(key, m);
  }
  return m;
}

function initArt() {
  MAT.snow     = mat(C.snow);
  MAT.snowEdge = mat(C.snowEdge);
  MAT.ice      = mat(C.ice, true);
  MAT.iceDark  = mat(C.iceDark, true);
  MAT.rock     = mat(C.rock, true);
  MAT.rockDark = mat(C.rockDark, true);
  MAT.pine     = mat(C.pine, true);
  MAT.trunk    = mat(C.trunk);
  MAT.stone    = mat(C.stone);
  MAT.stoneDark= mat(C.stoneDark);
  MAT.wall     = mat(C.wall);
  MAT.wallDark = mat(C.wallDark);
  MAT.chest    = mat(C.chest);
  MAT.gold     = mat(C.gold);

  /* verde = ci arrivi, rosso = no. Sono i due colori che il giocatore
     legge cento volte a partita: stanno qui, non sparsi nel codice. */
  MAT.good     = mat(0x46bf62, true);
  MAT.goodDark = mat(0x2f8f47, true);
  MAT.bad      = mat(0xdf5a48, true);
  MAT.badDark  = mat(0xa63b2e, true);
}

/* --------------------------- PIAZZARE FORME --------------------------- */
/* put(parent, GEO.x, materiale, posizione, scala) — y è il CENTRO.
   putOn() appoggia invece la forma sul pavimento: comodo per il mondo. */
function put(parent, geo, material, x, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz);
  parent.add(m);
  return m;
}

function putOn(parent, geo, material, x, y, z, sx, sy, sz) {
  return put(parent, geo, material, x, y + (sy === undefined ? sx : sy) / 2, z, sx, sy, sz);
}

/* ------------------------------ CONTORNO ------------------------------ */
/* Guscio rovesciato: una copia leggermente più grande di ogni mesh,
   disegnata solo dalle facce interne. È quello che dà ai personaggi il
   bordo nero dei giochi cartoon, senza post-processing.                 */
const inkMat = new THREE.MeshBasicMaterial({ color: C.ink, side: THREE.BackSide });

function addOutline(group, k) {
  const thickness = k === undefined ? 0.1 : k;
  const shells = [];
  group.traverse(o => {
    if (o.isMesh && !o.userData.noOutline) shells.push(o);
  });
  for (const src of shells) {
    const shell = new THREE.Mesh(src.geometry, inkMat);
    shell.position.copy(src.position);
    shell.rotation.copy(src.rotation);
    // spessore ~costante: cresce meno sulle parti già grandi
    shell.scale.set(
      src.scale.x + thickness,
      src.scale.y + thickness,
      src.scale.z + thickness
    );
    shell.renderOrder = -1;
    shell.userData.noOutline = true;   // non contornare il contorno
    src.parent.add(shell);
  }
  return group;
}
