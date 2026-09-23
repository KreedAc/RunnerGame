/* =====================================================================
   ART — geometrie condivise, materiali, contorni e ombre
   Colore piatto e poche primitive: a dare carattere sono le
   sfaccettature, le silhouette contornate e le ombre proiettate.
   ===================================================================== */

/* Poche geometrie riusate ovunque: costa quasi niente e tiene basse le draw call. */
const GEO = {
  box   : new THREE.BoxGeometry(1, 1, 1),
  cyl   : new THREE.CylinderGeometry(0.5, 0.5, 1, 18),
  cyl8  : new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
  cyl12 : new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
  taper : new THREE.CylinderGeometry(0.38, 0.5, 1, 16),
  sph   : new THREE.SphereGeometry(0.5, 18, 14),
  sph8  : new THREE.SphereGeometry(0.5, 8, 6),
  cone  : new THREE.ConeGeometry(0.5, 1, 16),
  cone6 : new THREE.ConeGeometry(0.5, 1, 6),
  octa  : new THREE.OctahedronGeometry(0.5, 0),
  disc  : new THREE.CircleGeometry(0.5, 24),
  ring  : new THREE.TorusGeometry(0.42, 0.06, 8, 28)
};

/* ------------------------------ LO SHADING ----------------------------
   Il mondo era illuminato con MeshLambert: una luce che sfuma dolce da un
   lato all'altro di ogni forma, corretta e anonima — è il look di default
   di three.js, e si riconosce. Ora è a bande, come un cartone disegnato:

   - quattro toni per forma invece di una sfumatura continua (TOON_RAMP):
     la luce si legge a colpo d'occhio, e con i contorni già presenti sui
     personaggi il linguaggio diventa uno solo;
   - un bordo di luce sulle facce che si voltano via dalla camera (fresnel),
     del colore del cielo della zona: stacca le sagome dallo sfondo, che è
     la cosa che la nebbia tendeva a cancellare.

   Il bordo si spegne sulle facce rivolte in alto. Senza, il terreno visto
   di taglio — che per la camera è quasi tutto "bordo" — si accendeva fino
   all'orizzonte e sembrava sovraesposto. */
const TOON_RAMP = (() => {
  const toni = [78, 128, 212, 255];
  const d = new Uint8Array(toni.length * 4);
  toni.forEach((v, i) => d.set([v, v, v, 255], i * 4));
  const t = new THREE.DataTexture(d, toni.length, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();

/* Condivisi per riferimento con ogni programma: cambiare zona cambia il
   bordo di tutto il mondo senza ricompilare niente. */
const RIM = {
  color: { value: new THREE.Color(0xffffff) },
  forza: { value: 0.34 }
};

function conBordo(m) {
  m.onBeforeCompile = sh => {
    sh.uniforms.rimColor = RIM.color;
    sh.uniforms.rimForza = RIM.forza;
    sh.fragmentShader = sh.fragmentShader
      .replace('uniform float opacity;',
               'uniform float opacity;\nuniform vec3 rimColor;\nuniform float rimForza;')
      .replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );', [
        'vec3 suV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );',
        'float lato = 1.0 - clamp( dot( normal, suV ), 0.0, 1.0 );',
        'float rimF = 1.0 - clamp( dot( normal, normalize( vViewPosition ) ), 0.0, 1.0 );',
        'outgoingLight += rimColor * rimForza * pow( rimF, 3.0 ) * lato;',
        'gl_FragColor = vec4( outgoingLight, diffuseColor.a );'
      ].join('\n'));
  };
  m.customProgramCacheKey = () => 'toon-bordo';
  return m;
}

function toon(params) {
  return conBordo(new THREE.MeshToonMaterial(Object.assign({ gradientMap: TOON_RAMP }, params)));
}

const MAT = {};
const matCache = new Map();

/* Un materiale per colore, con o senza sfaccettature.
   flat = superfici a faccette (rocce, scogliere); liscio per i personaggi. */
function mat(color, flat) {
  const key = color + (flat ? 'f' : 's');
  let m = matCache.get(key);
  if (!m) {
    m = toon({ color });
    m.flatShading = !!flat;
    matCache.set(key, m);
  }
  return m;
}

/* I materiali del mondo dipendono dalla zona: initArt() si richiama
   ad ogni cambio di torre e li riassegna. */
function initArt() {
  RIM.color.value.setHex(C.rim || 0xffffff);
  MAT.ground     = mat(C.ground);
  MAT.groundEdge = mat(C.groundEdge);
  MAT.cap        = mat(C.cap);                 // neve/sabbia in cima ai rilievi
  MAT.slab       = mat(C.slab, true);
  MAT.slabDark   = mat(C.slabDark, true);
  MAT.rock       = mat(C.rock, true);
  MAT.rockDark   = mat(C.rockDark, true);
  MAT.tree       = mat(C.tree, true);
  MAT.trunk      = mat(C.trunk);

  MAT.stone      = mat(C.stone);
  MAT.stoneDark  = mat(C.stoneDark);
  MAT.wall       = mat(C.wall);
  MAT.wallDark   = mat(C.wallDark);
  MAT.chest      = mat(C.chest);
  MAT.gold       = mat(C.gold);

  /* verde = ci arrivi, rosso = no. Sono i due colori che il giocatore
     legge cento volte a partita: stanno qui, non sparsi nel codice. */
  MAT.good     = brickMat(0x5cc46e, 5, 1);
  MAT.goodDark = mat(0x2e8a41);
  MAT.goodLite = mat(0x82e096);
  MAT.bad      = brickMat(0xe0654f, 5, 1);
  MAT.badDark  = mat(0x9c3527);
  MAT.badLite  = mat(0xf28f78);
  MAT.wallBrick= brickMat(0x8a7fa8, 2, 1.2);
  MAT.chestWood= brickMat(0xd8a052, 2, 1.2);
}

/* Mattoni: una sola texture in scala di grigi, colorata dal materiale.
   È il modo più economico per avere muratura vera invece di un cilindro
   liscio — e serve sia alle torri sulla corsia sia ai blocchi del muro. */
let brickTex = null;
function brickTexture() {
  if (brickTex) return brickTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(0,0,0,.26)';
  for (let y = 0; y < 64; y += 16) {
    g.fillRect(0, y, 64, 3);                                  // corsi
    const off = (y / 16) % 2 ? 0 : 16;
    for (let x = off; x < 64; x += 32) g.fillRect(x, y, 3, 16); // giunti sfalsati
  }
  g.fillStyle = 'rgba(255,255,255,.35)';
  for (let y = 3; y < 64; y += 16) g.fillRect(0, y, 64, 2);   // luce sul filare
  brickTex = new THREE.CanvasTexture(c);
  brickTex.wrapS = brickTex.wrapT = THREE.RepeatWrapping;
  brickTex.minFilter = brickTex.magFilter = THREE.LinearFilter;
  return brickTex;
}

function brickMat(color, repX, repY) {
  const t = brickTexture().clone();
  t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repX, repY);
  return toon({ map: t, color });
}

/* --------------------------- PIAZZARE FORME --------------------------- */
/* put(): y è il CENTRO. putOn(): appoggia la forma sul pavimento. */
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

/* ------------------------------- OMBRE -------------------------------- */
/* Il riquadro d'ombra della luce è piccolo per restare nitido, quindi
   solo quello che sta vicino alla pista vale la pena di farlo proiettare. */
function castShadows(root) {
  if (!CFG.shadows) return root;
  root.traverse(o => { if (o.isMesh && !o.userData.noOutline) o.castShadow = true; });
  return root;
}

function receiveShadows(root) {
  if (!CFG.shadows) return root;
  root.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
  return root;
}

/* ------------------------------ CONTORNO ------------------------------ */
/* Guscio rovesciato: una copia leggermente più grande di ogni mesh,
   disegnata solo dalle facce interne. È quello che dà ai personaggi il
   bordo scuro dei giochi cartoon, senza post-processing.                */
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
