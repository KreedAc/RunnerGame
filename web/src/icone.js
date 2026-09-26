/* =====================================================================
   ICONE — fotografate dai modelli del gioco

   L'interfaccia usava le emoji (🪙 💎 🔮 ⚡): ogni telefono le disegna a
   modo suo, piccole e piatte, e sono la prima cosa che fa sembrare un
   gioco "vecchio" accanto a quelli con le icone lucide e il contorno
   spesso. Un disegnatore non ce l'abbiamo — ma abbiamo i modelli: la
   moneta, la gemma, le armi, il forziere, l'eroe in ogni aspetto.

   All'avvio un secondo renderer, piccolo, li fotografa uno per uno con la
   stessa luce e gli stessi materiali del gioco; poi in 2D ogni foto
   prende il contorno scuro "da adesivo" e un'ombra sotto. Le immagini
   finiscono in un foglio di stile come classi (.ic-moneta, .ic-gemma…),
   così il markup scrive <i class="ic ic-moneta"></i> e basta.

   Se il renderer non parte (niente WebGL, un test senza GPU) le classi
   restano vuote e sotto ricompare l'emoji di ripiego scritta nel CSS:
   il gioco non ne dipende.

   Si chiama da game.js a mondo costruito, quando tutti i costruttori
   esistono (il corvo sta in game.js).
   ===================================================================== */
const ICONE = {};                 // nome → dataURL

/* ---------------------------- I MODELLI -------------------------------- */
function iconaModelli() {
  const oro = mat(C.gold), oroS = mat(0xe0a020), oroL = mat(0xfff0a0);
  const M = {};

  const moneta = (g, x, y, z, rx) => {
    const m = new THREE.Group();
    put(m, GEO.cyl, oroS, 0, 0, 0, 1, 0.22, 1);
    put(m, GEO.cyl, oro, 0, 0.02, 0, 0.78, 0.24, 0.78);
    put(m, GEO.box, oroL, 0, 0.14, 0, 0.14, 0.04, 0.46);
    m.position.set(x, y, z);
    m.rotation.x = rx;
    g.add(m);
    return m;
  };

  M.moneta = () => { const g = new THREE.Group(); moneta(g, 0, 0, 0, 1.25).rotation.z = 0.25; return g; };
  M.oro = () => {                                       // la pila: l'oro che rende
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) moneta(g, -0.25 + (i % 2) * 0.06, -0.5 + i * 0.22, 0, 0);
    for (let i = 0; i < 2; i++) moneta(g, 0.62, -0.5 + i * 0.22, 0.1, 0);
    moneta(g, 0.3, 0.35, 0.45, 1.15).rotation.z = -0.35;
    return g;
  };
  /* un brillante vero: tavola in alto, corona, padiglione a punta */
  M.gemma = () => {
    const g = new THREE.Group();
    const profilo = [[0, -0.95], [0.9, 0.12], [0.98, 0.22], [0.62, 0.62], [0, 0.62]]
      .map(([x, y]) => new THREE.Vector2(x, y));
    const b = new THREE.Mesh(new THREE.LatheGeometry(profilo, 8), mat(0x3fe0e8, true));
    b.rotation.y = 0.2;
    g.add(b);
    put(g, GEO.box, accesa(0xeaffff), -0.3, 0.3, 0.55, 0.14, 0.36, 0.04).rotation.z = -0.5;
    return g;
  };
  M.runa = () => {
    const g = new THREE.Group();
    put(g, GEO.sph8, mat(0x6a4fb0, true), 0, 0, 0, 1.1, 1.3, 0.62);
    const luce = accesa(0xd6b8ff);
    put(g, GEO.box, luce, 0, 0, 0.3, 0.12, 0.8, 0.06);
    put(g, GEO.box, luce, 0.13, 0.2, 0.3, 0.34, 0.1, 0.06).rotation.z = 0.7;
    put(g, GEO.box, luce, -0.1, -0.15, 0.3, 0.3, 0.1, 0.06).rotation.z = 0.7;
    return g;
  };
  const sagoma = (punti, colore, prof) => {
    const s = new THREE.Shape();
    punti.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y));
    const geo = new THREE.ExtrudeGeometry(s, { depth: prof || 0.3, bevelEnabled: true,
      bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 2 });
    geo.center();
    return new THREE.Mesh(geo, mat(colore));
  };
  M.fulmine = () => {
    const g = new THREE.Group();
    g.add(sagoma([[0.15, 1], [-0.5, -0.08], [-0.06, -0.08], [-0.24, -1], [0.5, 0.18], [0.06, 0.18]], 0xffd23c));
    return g;
  };
  M.stella = () => {                                   // il colpo
    const g = new THREE.Group(), p = [];
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2, r = i % 2 ? 0.45 : 1;
      p.push([Math.sin(a) * r, Math.cos(a) * r]);
    }
    g.add(sagoma(p, 0xff8a3c));
    return g;
  };
  M.forziere = () => {
    const g = new THREE.Group();
    const legno = mat(0xb06a2c), legnoS = mat(0x7a4518);
    put(g, GEO.box, legno, 0, -0.25, 0, 1.6, 0.8, 1);
    const coperchio = put(g, GEO.cyl12, legno, 0, 0.15, 0, 0.99, 1.6, 0.99);
    coperchio.rotation.z = Math.PI / 2;
    coperchio.scale.set(0.5, 1.6, 0.5);
    for (const x of [-0.55, 0.55]) put(g, GEO.box, oro, x, -0.05, 0, 0.16, 1.25, 1.06);
    put(g, GEO.box, legnoS, 0, 0.14, 0, 1.64, 0.06, 1.04);
    put(g, GEO.box, oro, 0, -0.02, 0.52, 0.3, 0.36, 0.08);
    return g;
  };
  M.trofeo = () => {
    const g = new THREE.Group();
    const profilo = [[0, 0], [0.55, 0], [0.55, 0.12], [0.18, 0.2], [0.12, 0.55], [0.45, 0.72],
                     [0.62, 1.35], [0.52, 1.35], [0.4, 0.82], [0, 0.78]].map(([x, y]) => new THREE.Vector2(x, y));
    const coppa = new THREE.Mesh(new THREE.LatheGeometry(profilo, 24), oro);
    coppa.position.y = -0.7;
    g.add(coppa);
    for (const k of [-1, 1]) {
      const m = put(g, GEO.ring, oroS, k * 0.62, 0.2, 0, 0.7, 0.7, 1);
      m.rotation.z = k * 0.2;
    }
    put(g, GEO.box, accesa(0xfff6d0), -0.22, 0.25, 0.42, 0.08, 0.5, 0.04).rotation.z = 0.2;
    return g;
  };
  M.bersaglio = () => {
    const g = new THREE.Group();
    [[1, 0xe0463a], [0.72, 0xffffff], [0.46, 0xe0463a], [0.2, 0xffffff]].forEach(([r, c], i) =>
      put(g, GEO.cyl, mat(c), 0, 0, i * 0.04, r * 2, 0.12, r * 2).rotation.x = Math.PI / 2);
    const f = new THREE.Group();
    put(f, GEO.cyl8, mat(0x8a5a2a), 0, 0, 0, 0.1, 1.3, 0.1);
    put(f, GEO.cone6, mat(0xd6d6d6), 0, -0.72, 0, 0.16, 0.24, 0.16).rotation.x = Math.PI;
    put(f, GEO.box, mat(0xe0463a), 0, 0.58, 0, 0.3, 0.28, 0.03);
    f.position.set(0.3, 0.35, 0.55);
    f.rotation.set(-0.9, 0, 0.7);
    g.add(f);
    return g;
  };
  M.elmo = () => {
    const g = new THREE.Group();
    const ferro = mat(0xb9c4d0), ferroS = mat(0x7d8896), corno = mat(0xf0e6d0);
    put(g, GEO.sph, ferro, 0, 0, 0, 1.3, 1.05, 1.25);
    put(g, GEO.cyl, ferroS, 0, -0.22, 0, 1.36, 0.22, 1.3);
    put(g, GEO.cyl, ferroS, 0, 0.1, 0, 0.14, 1.0, 1.2).rotation.x = Math.PI / 2;
    put(g, GEO.box, ferro, 0, -0.42, 0.62, 0.16, 0.5, 0.12);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + 0.3;
      put(g, GEO.sph8, oro, Math.sin(a) * 0.68, -0.22, Math.cos(a) * 0.66, 0.1, 0.1, 0.1);
    }
    for (const k of [-1, 1]) {
      put(g, GEO.taper, corno, k * 0.78, 0.12, 0, 0.34, 0.6, 0.34).rotation.z = -k * 1.1;
      put(g, GEO.cone6, corno, k * 1.08, 0.62, 0, 0.26, 0.56, 0.26).rotation.z = -k * 0.3;
    }
    return g;
  };
  M.ingranaggio = () => {
    const g = new THREE.Group();
    const acciaio = mat(0x9fb4c8), scuro = mat(0x4e6378);
    put(g, GEO.cyl, acciaio, 0, 0, 0, 1.5, 0.36, 1.5).rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const d = put(g, GEO.box, acciaio, Math.sin(a) * 0.86, Math.cos(a) * 0.86, 0, 0.38, 0.4, 0.36);
      d.rotation.z = -a;
    }
    put(g, GEO.cyl, scuro, 0, 0, 0.02, 0.56, 0.42, 0.56).rotation.x = Math.PI / 2;
    return g;
  };
  M.spade = () => {
    const g = new THREE.Group();
    for (const k of [-1, 1]) {
      const s = buildWeaponModel(3);
      s.rotation.z = k * 0.75;
      s.position.set(-k * 0.3, -0.3, k * 0.05);
      g.add(s);
    }
    return g;
  };
  M.pugno = () => {
    const g = new THREE.Group();
    const pelle = mat(C.skin);
    put(g, GEO.sph, pelle, 0, 0, 0, 1.1, 1.0, 0.9);
    for (let i = 0; i < 4; i++) put(g, GEO.sph, pelle, -0.36 + i * 0.24, 0.38, 0.36, 0.32, 0.34, 0.34);
    put(g, GEO.sph, pelle, 0.5, -0.05, 0.3, 0.36, 0.5, 0.32).rotation.z = -0.5;
    put(g, GEO.cyl, mat(0x6f3c1c), 0, -0.62, 0, 0.8, 0.34, 0.74);
    return g;
  };
  M.muro = () => {
    const g = new THREE.Group();
    const m1 = mat(0x8a7fa8), m2 = mat(0x6f658c);
    [[-0.52, -0.42], [0.52, -0.42], [0, 0.1], [-0.9, 0.1], [0.9, 0.1], [-0.45, 0.62], [0.45, 0.62]].forEach(([x, y], i) =>
      put(g, GEO.box, i % 2 ? m1 : m2, x, y, 0, 1.0, 0.5, 0.7));
    return g;
  };
  M.torre = () => {
    const g = new THREE.Group();
    const pietra = mat(0xcfe6f5), scura = mat(0x8fb8d6);
    put(g, GEO.taper, pietra, 0, -0.2, 0, 1.0, 1.6, 1.0);
    put(g, GEO.cyl, scura, 0, 0.6, 0, 1.2, 0.2, 1.2);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      put(g, GEO.box, pietra, Math.sin(a) * 0.52, 0.8, Math.cos(a) * 0.52, 0.24, 0.24, 0.24);
    }
    put(g, GEO.cone, mat(0xd94f7d), 0, 1.25, 0, 1.0, 0.8, 1.0);
    put(g, GEO.box, mat(0x2b5d80), 0, 0, 0.5, 0.22, 0.4, 0.05);
    return g;
  };
  M.fiamma = () => {
    const g = new THREE.Group();
    /* tre strati uno davanti all'altro: rosso, arancio, giallo — e la
       punta storta, altrimenti è una goccia */
    [[0xff4a1a, 0, 1.5, 0.62, 0.12, 0], [0xff4a1a, -0.42, 0.95, 0.4, 0.45, 0], [0xff4a1a, 0.42, 1.1, 0.4, -0.45, 0],
     [0xff9a2a, 0.02, 1.05, 0.44, 0.1, 0.3], [0xffe066, 0.04, 0.62, 0.28, 0.08, 0.55]]
      .forEach(([c, x, h, r, rz, z]) => {
        const l = put(g, GEO.sph, mat(c), x, -0.5 + h / 2, z, r * 1.6, h, r * 1.2);
        l.rotation.z = rz;
      });
    return g;
  };
  M.scudo = () => {
    const g = new THREE.Group();
    const legno = mat(0x3f7fc8), ferro = mat(0xc9d6e2);
    put(g, GEO.cyl12, legno, 0, 0, 0, 1.8, 0.2, 1.8).rotation.x = Math.PI / 2;
    put(g, GEO.ring, ferro, 0, 0, 0.04, 2.05, 2.05, 1.6);
    put(g, GEO.box, mat(0xdff6ff), 0, 0, 0.13, 0.24, 1.4, 0.05);
    put(g, GEO.box, mat(0xdff6ff), 0, 0, 0.13, 1.4, 0.24, 0.05);
    put(g, GEO.sph, ferro, 0, 0, 0.15, 0.46, 0.46, 0.3);
    return g;
  };
  M.corvo = () => {
    const c = costruisciCorvo();
    c.ali[0].rotation.z = 0.5; c.ali[1].rotation.z = -0.5;
    c.g.rotation.y = 0.6;
    return c.g;
  };
  /* le armi, una per tacca: la prima (i pugni) è il pugno */
  WEAPONS.forEach((W, i) => {
    M['arma' + i] = () => {
      if (!W.shape) return M.pugno();
      const w = buildWeaponModel(i);
      w.rotation.z = -0.75;
      return w;
    };
  });
  return M;
}

/* Da dove guarda la camera, per icona: 3/4 dall'alto a sinistra, come
   le icone dei giochi; le armi e le sagome piatte di fronte. */
const VISTE = {
  moneta: [0.2, 0.3, 1], oro: [0.3, 0.45, 1], gemma: [0.25, 0.25, 1], runa: [0.25, 0.2, 1],
  fulmine: [0.15, 0.1, 1], stella: [0.15, 0.1, 1], forziere: [0.5, 0.45, 1], trofeo: [0.25, 0.25, 1],
  bersaglio: [0.35, 0.25, 1], elmo: [0.35, 0.25, 1], ingranaggio: [0.2, 0.2, 1], spade: [0, 0.1, 1],
  pugno: [0.3, 0.3, 1], muro: [0.4, 0.35, 1], torre: [0.35, 0.3, 1], fiamma: [0.1, 0.1, 1],
  scudo: [0.2, 0.15, 1], corvo: [0.15, 1, 0.55]
};

/* ----------------------------- LA FOTO --------------------------------- */
function generaIcone() {
  let r3;
  /* 384: il ritratto dell'eroe si vede largo 130 px, cioè ~390 pixel veri
     a densità 3 — a 192 era ingrandito il doppio e sgranato */
  const LATO = 384;
  try {
    r3 = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch (e) { return false; }
  r3.setSize(LATO, LATO, false);
  r3.setPixelRatio(1);
  r3.outputEncoding = THREE.LinearEncoding;
  r3.setClearColor(0x000000, 0);

  const scena = new THREE.Scene();
  scena.add(new THREE.HemisphereLight(0xffffff, 0x8a8aa8, 0.72));
  const sole = new THREE.DirectionalLight(0xffffff, 0.9);
  sole.position.set(-2, 4, 5);
  scena.add(sole);
  const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 50);

  /* il bordo di luce del mondo prende il colore del cielo: qui bianco */
  const rimPrima = RIM.color.value.getHex();
  RIM.color.value.setHex(0xffffff);

  const M = iconaModelli();
  const foto = (nome, modello, vista, zoom) => {
    const box = new THREE.Box3().setFromObject(modello);
    const centro = box.getCenter(new THREE.Vector3());
    const raggio = box.getBoundingSphere(new THREE.Sphere()).radius;
    const dir = new THREE.Vector3().fromArray(vista || VISTE[nome] || [0.3, 0.3, 1]).normalize();
    const dist = raggio / Math.sin(THREE.MathUtils.degToRad(cam.fov / 2)) * (zoom || 1.02);
    cam.position.copy(centro).addScaledVector(dir, dist);
    cam.lookAt(centro);
    scena.add(modello);
    r3.render(scena, cam);
    scena.remove(modello);
    ICONE[nome] = adesivo(r3.domElement, LATO);
  };

  try {
    for (const nome of Object.keys(M)) {
      const m = M[nome]();
      addOutline(m, 0.05);
      foto(nome, m);
      sciogli(m);
    }
    /* l'eroe in ogni aspetto: testa e spalle, per la scheda EROE */
    const primo = meta.skin;
    SKINS.forEach((s, i) => {
      meta.skin = i;
      const h = buildHero();
      const centro = new THREE.Group();
      h.position.y = -1.85;                 // la testa al centro
      centro.add(h);
      scena.add(centro);
      cam.position.set(1.25, 0.3, 3.9);
      cam.lookAt(0, 0.02, 0);
      r3.render(scena, cam);
      scena.remove(centro);
      ICONE['eroe' + i] = adesivo(r3.domElement, LATO);
      sciogli(h);
    });
    meta.skin = primo;
  } catch (e) {
    console.warn('icone:', e);
  }
  RIM.color.value.setHex(rimPrima);
  r3.dispose();
  if (r3.forceContextLoss) r3.forceContextLoss();

  /* le classi: .ic-moneta { background-image: … } */
  let css = '';
  for (const [nome, url] of Object.entries(ICONE)) css += '.ic-' + nome + '{background-image:url(' + url + ')}\n';
  const st = document.createElement('style');
  st.id = 'icone';
  st.textContent = css;
  document.head.appendChild(st);
  if (Object.keys(ICONE).length) document.body.classList.add('icone-ok');
  return true;
}

/* Il contorno da adesivo: la sagoma dell'icona, tinta di scuro e
   ridisegnata in sedici direzioni attorno, poi l'icona sopra; sotto, la
   stessa sagoma più chiara e spostata in giù fa da ombra. */
function adesivo(sorgente, lato) {
  const px = Math.round(lato * 0.035);
  const tinta = document.createElement('canvas');
  tinta.width = tinta.height = lato;
  const tg = tinta.getContext('2d');
  const out = document.createElement('canvas');
  out.width = out.height = lato;
  const g = out.getContext('2d');
  /* l'icona occupa il riquadro meno il contorno: la si rimpicciolisce appena */
  const k = (lato - px * 4) / lato, o = px * 2;
  tg.drawImage(sorgente, o, o, lato * k, lato * k);
  const icona = document.createElement('canvas');
  icona.width = icona.height = lato;
  icona.getContext('2d').drawImage(tinta, 0, 0);
  tg.globalCompositeOperation = 'source-in';
  tg.fillStyle = '#1b1530';
  tg.fillRect(0, 0, lato, lato);
  g.globalAlpha = 0.3;
  g.drawImage(tinta, 0, px * 1.6);                       // ombra
  g.globalAlpha = 1;
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2;
    g.drawImage(tinta, Math.cos(a) * px, Math.sin(a) * px);
  }
  g.drawImage(icona, 0, 0);
  return out.toDataURL('image/png');
}
