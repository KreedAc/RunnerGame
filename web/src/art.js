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

/* Il riflesso e il colore pieno. "Sembra vecchio": i giochi di adesso
   hanno personaggi che sembrano giocattoli di plastica nuovi — un punto di
   luce bianca netto sulle superfici curve — e colori più pieni. Il
   riflesso è a gradino, non sfumato, perché resti un cartone: si accende
   solo dove la superficie guarda fra il sole e la camera. Vale per i pezzi
   con il contorno (personaggi, armi, poteri: addOutline accende
   `brillo`), non per il terreno, che visto di taglio si riempirebbe di
   lampi. La saturazione vale per tutto. */
const SATURA = { value: 1.14 };

function conBordo(m) {
  m.userData.brillo = { value: 0 };
  m.onBeforeCompile = sh => {
    sh.uniforms.rimColor = RIM.color;
    sh.uniforms.rimForza = RIM.forza;
    sh.uniforms.brillo = m.userData.brillo;
    sh.uniforms.satura = SATURA;
    sh.fragmentShader = sh.fragmentShader
      .replace('uniform float opacity;',
               'uniform float opacity;\nuniform vec3 rimColor;\nuniform float rimForza;\n' +
               'uniform float brillo;\nuniform float satura;')
      .replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );', [
        'vec3 suV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );',
        'float lato = 1.0 - clamp( dot( normal, suV ), 0.0, 1.0 );',
        'float rimF = 1.0 - clamp( dot( normal, normalize( vViewPosition ) ), 0.0, 1.0 );',
        'outgoingLight += rimColor * rimForza * pow( rimF, 3.0 ) * lato;',
        '#if NUM_DIR_LIGHTS > 0',
        '  vec3 mezzo = normalize( directionalLights[ 0 ].direction + normalize( vViewPosition ) );',
        '  float lucida = pow( max( dot( normal, mezzo ), 0.0 ), 36.0 );',
        '  outgoingLight += vec3( smoothstep( 0.42, 0.5, lucida ) * brillo * 0.3 );',
        '#endif',
        'float grigio = dot( outgoingLight, vec3( 0.299, 0.587, 0.114 ) );',
        'outgoingLight = max( mix( vec3( grigio ), outgoingLight, satura ), 0.0 );',
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
   bordo dei giochi cartoon, senza post-processing.

   Era nero puro e spesso 0,09 unità su OGNI pezzo: su un polpaccio largo
   0,27 il bordo valeva un terzo del pezzo, e l'eroe sembrava disegnato col
   pennarello — bene quando il mondo era piatto, stonato adesso che il mondo
   ha luce, bande e bagliori. Oggi:

   - il colore del bordo è il colore del pezzo, scurito e spinto un poco
     verso il blu notte: la pelle ha un bordo bruno, l'acciaio uno ardesia,
     e tutti insieme restano una famiglia;
   - lo spessore ha un tetto in proporzione al pezzo (il 14% del suo lato
     più corto): i pezzi piccoli non annegano più nel contorno. */
const ink = new THREE.Color(C.ink);
const inkCache = new Map();
function inkPer(material) {
  const col = material && material.color ? material.color : ink;
  const k = col.getHex();
  let m = inkCache.get(k);
  if (!m) {
    const c = col.clone().multiplyScalar(0.38).lerp(ink, 0.35);
    m = new THREE.MeshBasicMaterial({ color: c, side: THREE.BackSide });
    inkCache.set(k, m);
  }
  return m;
}

function addOutline(group, k) {
  const thickness = k === undefined ? 0.04 : k;
  const shells = [];
  group.traverse(o => {
    /* chi ha il contorno è un personaggio o un oggetto: prende il riflesso */
    if (o.isMesh && o.material && o.material.userData && o.material.userData.brillo)
      o.material.userData.brillo.value = 1;
    if (!o.isMesh || o.userData.noOutline || (o.material && o.material.transparent)) return;
    /* rivetti e borchie: il bordo sarebbe sotto il pixel, e il guscio
       costerebbe una draw call per niente */
    const s = o.scale;
    if (Math.min(Math.abs(s.x), Math.abs(s.y), Math.abs(s.z)) < 0.075) return;
    shells.push(o);
  });
  for (const src of shells) {
    const shell = new THREE.Mesh(src.geometry, inkPer(src.material));
    shell.position.copy(src.position);
    shell.rotation.copy(src.rotation);
    const s = src.scale;
    const d = Math.min(thickness, 0.14 * Math.min(Math.abs(s.x), Math.abs(s.y), Math.abs(s.z)));
    shell.scale.set(s.x + Math.sign(s.x) * d, s.y + Math.sign(s.y) * d, s.z + Math.sign(s.z) * d);
    shell.renderOrder = -1;
    shell.userData.noOutline = true;   // non contornare il contorno
    src.parent.add(shell);
  }
  return fondi(group);
}

/* ------------------------------ FUSIONE -------------------------------
   Il vichingo e il carceriere rifatti hanno ~160 pezzi l'uno, e col
   contorno il doppio: 300 draw call per un personaggio sono troppe per un
   telefono. Ma quasi tutti i pezzi non si muovono mai rispetto al loro
   genitore (l'elmo sta sulla testa, le borchie sul bracciale): per ogni
   nodo, i figli fermi con lo stesso materiale diventano UNA mesh sola.
   Braccia, gambe, scudo e arma restano gruppi a sé, quindi l'animazione
   non se ne accorge; chi si muove da solo lo dice con userData.vivo.
   Le geometrie fuse sono nuove: sciogli() le libera quando l'attore esce
   di scena. */
function fondi(root) {
  const nodi = [];
  root.traverse(o => nodi.push(o));
  for (const n of nodi) {
    const gruppi = new Map();
    for (const c of n.children) {
      if (!c.isMesh || c.children.length || c.userData.vivo) continue;
      c.updateMatrix();
      if (c.matrix.determinant() <= 0) continue;           // uno specchiato girerebbe le facce
      const k = c.material.uuid + '|' + c.renderOrder + '|' + (c.userData.noOutline ? 1 : 0);
      if (!gruppi.has(k)) gruppi.set(k, []);
      gruppi.get(k).push(c);
    }
    for (const lista of gruppi.values()) {
      if (lista.length < 2) continue;
      const parti = lista.map(c => {
        const gg = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone();
        return gg.applyMatrix4(c.matrix);
      });
      const conUv = parti.every(p => p.attributes.uv);
      let nv = 0;
      parti.forEach(p => { nv += p.attributes.position.count; });
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3);
      const uv = conUv ? new Float32Array(nv * 2) : null;
      let o = 0;
      for (const p of parti) {
        pos.set(p.attributes.position.array, o * 3);
        nor.set(p.attributes.normal.array, o * 3);
        if (uv) uv.set(p.attributes.uv.array, o * 2);
        o += p.attributes.position.count;
        p.dispose();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      if (uv) geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.computeBoundingSphere();
      geo.userData.fusa = true;
      const m = new THREE.Mesh(geo, lista[0].material);
      m.renderOrder = lista[0].renderOrder;
      m.userData.noOutline = !!lista[0].userData.noOutline;
      lista.forEach(c => n.remove(c));
      n.add(m);
    }
  }
  return root;
}

function sciogli(root) {
  if (root) root.traverse(o => { if (o.isMesh && o.geometry.userData.fusa) o.geometry.dispose(); });
}
