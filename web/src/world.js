/* =====================================================================
   WORLD — sentiero, rilievi, alberi e la torre della principessa.
   I colori vengono dalla zona corrente (vedi THEMES in core.js): la
   pista è sempre la stessa, il mondo attorno cambia ad ogni torre.
   Il piano di calpestio è y = 0.
   ===================================================================== */

const world = new THREE.Group();
scene.add(world);

function clearWorld() {
  while (world.children.length) { sciogli(world.children[0]); world.remove(world.children[0]); }
}

/* ------------------------------ SENTIERO ------------------------------ */
let pathMat = null, pathTex = null;
function pathMaterial(total) {
  /* Il lastricato. Il sentiero è la superficie che si vede di più in tutto
     il gioco — metà schermo, sempre — ed era un colore piatto con due
     bande ogni nove metri. Adesso sono pietre a filari sfalsati, con le
     fughe e un tono leggermente diverso per ciascuna, nel colore della
     zona. I filari fanno anche il lavoro delle bande: scorrendo sotto i
     piedi dicono quanto vai veloce.

     1024×1024 pixel per 8×8 unità di pista. Era 128: sedici pixel per
     metro, e vicino alla camera ogni pixel finiva ingrandito sei-otto
     volte — il disegno era giusto ma sfocato, come una foto a bassa
     risoluzione. Il motivo è lo stesso (le misure sono in "unità da 128"
     e si moltiplicano per K), il dettaglio no: bordo smussato con la luce
     in alto e l'ombra in basso, e una grana leggera sulla pietra, che è
     quello che fa sembrare nitida una superficie anche da vicino.
     Resta una potenza di due, così la GPU può farne le versioni ridotte
     per la distanza (senza, il lastricato lontano sfarfalla in un moiré). */
  const S = 1024, K = S / 128, FILA = 16 * K;     // un filare = un'unità
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const base = new THREE.Color(C.ground);
  const fuga = new THREE.Color(C.groundEdge);
  const css = (col, k) => 'rgb(' + [col.r, col.g, col.b].map(v => Math.round(clamp(v * k, 0, 1) * 255)).join(',') + ')';
  const tondo = (x, y, w, h, r) => {
    g.beginPath();
    if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h);
    g.fill();
  };
  /* una pietra: ombra sotto, corpo, luce sopra, grana. Disegnata anche
     spostata di ±S, così quella tagliata dal bordo rientra dall'altro lato
     e la ripetizione non mostra la cucitura. */
  const pietra = (x, y, w, h, k) => {
    for (const dx of [0, -S, S]) {
      const px = x + dx;
      if (px + w < 0 || px > S) continue;
      g.fillStyle = css(base, k * 0.9);  tondo(px, y + K * 0.35, w, h, K * 1.6);         // ombra
      g.fillStyle = css(base, k);        tondo(px, y, w, h - K * 0.3, K * 1.6);          // pietra
      g.fillStyle = css(base, k * 1.07); tondo(px + K, y + K * 0.4, w - 2 * K, K * 1.6, K);   // luce
    }
  };

  g.fillStyle = css(fuga, 0.92);
  g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += FILA) {
    /* sfalsati come i mattoni: la fuga di un filare cade a metà pietra del
       successivo. Le larghezze sommano sempre a S. */
    let x = (y / FILA) % 2 ? -rint(9, 15) * K : 0;
    while (x < S) {
      const w = Math.min(rint(20, 34) * K, S - x);
      const k = 0.94 + Math.random() * 0.1;            // ogni pietra il suo tono
      pietra(x + 1.2 * K, y + 1.2 * K, w - 2.4 * K, FILA - 2.4 * K, k);
      x += w;
    }
  }
  /* la grana: puntini chiari e scuri, piccoli. Da lontano i mipmap li
     mediano via; da vicino tolgono alla pietra l'aria di plastica. */
  for (let i = 0; i < 5000; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.03)' : 'rgba(255,255,255,.035)';
    g.fillRect(Math.random() * S, Math.random() * S, K * 0.5 + Math.random() * K, K * 0.5 + Math.random() * K);
  }

  if (pathTex) pathTex.dispose();
  pathTex = new THREE.CanvasTexture(c);
  pathTex.wrapS = pathTex.wrapT = THREE.RepeatWrapping;
  pathTex.minFilter = THREE.LinearMipmapLinearFilter;
  pathTex.magFilter = THREE.LinearFilter;
  pathTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  pathTex.repeat.set(CFG.trackWidth / 8, total / 8);

  if (!pathMat) pathMat = toon();
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
      /* stesso errore del vulcano, in piccolo: il centro a distanza fissa
         lasciava la crosta di una colata larga infilarsi sotto la pista */
      const w = rnd(7, 19), l = rnd(12, 34);
      const x = side * (EDGE + (w + 2.6) / 2 + rnd(0, 24));
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
    /* La distanza si misura dal FIANCO, non dal centro. Prima il centro
       stava a 66-96 unità dalla pista, ma la base è larga 1,7 volte
       l'altezza: un vulcano alto 92 ha 78 di raggio, e il suo pendio
       invadeva la corsa abbastanza alto da farci passare dentro la camera
       — una volta ogni sette o otto partite, "un pezzo di montagna". */
    const h = rnd(62, 92);
    const raggio = h * 1.7 / 2;
    buildVolcano(lato * (i % 2 ? -1 : 1) * (raggio + rnd(18, 40)), -len * f, h);
  });
}

function buildVolcano(x, z, h) {
  const w = h * 1.7;

  const cono = putOn(world, GEO.cone6, MAT.rockDark, x, 0, z, w, h, w);
  cono.rotation.y = rnd(0, 3);
  // il cratere: un tronco di cono rovesciato, acceso dentro
  const cw = w * 0.19;
  put(world, GEO.cyl12, lavaMat, x, h - 1.2, z, cw, 2.4, cw);
  /* il bagliore del cratere: è la cosa più luminosa del cielo, e ai piedi
     della montagna il cielo deve sembrare acceso da sotto */
  const b = new THREE.Group();
  b.position.set(x, h + 2, z);
  world.add(b);
  bagliore(b, 0xff7a2a, w * 0.55, 0.55);
  bagliore(b, 0xffc23c, w * 0.22, 0.7);
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
   muro: sapere dove stai andando è metà della motivazione.

   Ogni zona ha la sua torre (THEMES[].torre in core.js): pietra, tetto,
   finestre e un dettaglio che la fa riconoscere da lontano. La SAGOMA
   invece è sempre la stessa — fusto, balcone col varco davanti, tamburo,
   tetto alto e stretto — perché è lì che si affaccia la principessa, e la
   camera della vittoria sale proprio su quel varco. */

/* un materiale che non prende luce: finestre accese, rune, lava */
const accesaCache = new Map();
function accesa(color) {
  let m = accesaCache.get(color);
  if (!m) { m = new THREE.MeshBasicMaterial({ color }); accesaCache.set(color, m); }
  return m;
}

function buildTower(z) {
  const T = C.torre || { pietra: 0x9aa7b4, scura: 0x6f7d8b, tetto: 0xd94f7d,
                         finestre: 0x2a2438, accento: 0xffffff, dettaglio: '' };
  const g = new THREE.Group();
  g.position.set(0, 0, z);

  const pietra = mat(T.pietra);
  const scura  = mat(T.scura);
  /* il vetro è l'unico fusto trasparente: si vede il nucleo dentro */
  const fusto  = T.dettaglio === 'vetro'
    ? toon({ color: T.pietra, transparent: true, opacity: 0.5 })
    : pietra;
  /* nelle zone buie le fasce e le finestre sono luce, non pietra */
  const fasce    = T.accese ? accesa(T.accento) : scura;
  const finestre = T.accese ? accesa(T.finestre) : mat(T.finestre);

  receiveShadows(putOn(g, GEO.cyl, scura,  0, 0, 0, 16, 1.2, 16));      // basamento
  receiveShadows(putOn(g, GEO.cyl, pietra, 0, 1.2, 0, 11.5, 1.0, 11.5));

  const H = 26;
  putOn(g, GEO.taper, fusto, 0, 2.2, 0, 7.6, H, 7.6);                   // fusto
  if (T.dettaglio === 'vetro') {
    putOn(g, GEO.cyl, mat(T.accento), 0, 2.2, 0, 2.4, H, 2.4);          // il nucleo
  }

  // fasce: danno scala all'altezza
  for (let y = 6; y < H; y += 6) putOn(g, GEO.cyl, fasce, 0, y, 0, 7.9, 0.7, 7.9);
  // finestre a spirale
  for (let i = 0; i < 7; i++) {
    const a = i * 1.1, y = 5 + i * 2.8;
    put(g, GEO.box, finestre, Math.sin(a) * 3.4, y, Math.cos(a) * 3.4, 0.9, 1.5, 0.9);
  }
  // portone alla base
  put(g, GEO.box, mat(0x3a2f24), 0, 3.4, 3.6, 2.6, 4.4, 0.5);
  put(g, GEO.cyl, MAT.gold, 0, 3.2, 3.9, 0.35, 0.35, 0.2).rotation.x = Math.PI / 2;

  /* Balcone e tetto. Il tetto sta alto e stretto apposta: se scende
     troppo, la principessa sparisce sotto la falda ed è l'unica cosa
     che il giocatore vuole vedere quando vince. */
  putOn(g, GEO.cyl, scura, 0, H + 1.4, 0, 9.6, 0.8, 9.6);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    if (Math.abs(a - Math.PI / 2) < 0.6) continue;         // varco davanti
    putOn(g, GEO.box, pietra, Math.sin(a) * 4.4, H + 2.2, Math.cos(a) * 4.4, 0.8, 1.0, 0.8);
  }
  putOn(g, GEO.cyl,  pietra,       0, H + 3.4, 0, 6.6, 1.6, 6.6);    // tamburo
  putOn(g, GEO.cone, mat(T.tetto), 0, H + 5.0, 0, 8.6, 6.4, 8.6);    // tetto
  putOn(g, GEO.cyl,  MAT.gold,     0, H + 11.4, 0, 0.3, 2.2, 0.3);
  const flag = put(g, GEO.box, mat(C.princess), 1.3, H + 12.8, 0, 2.4, 1.3, 0.1);
  flag.userData.noOutline = true;

  decoraTorre(g, T, H);
  castShadows(g);

  // la principessa, affacciata dal varco, rivolta verso di te
  const p = buildPrincess();
  p.position.set(0, H + 2.2, 3.9);
  p.scale.setScalar(1.5);
  g.add(p);

  /* La grata: la principessa è prigioniera, e per tutta la corsa la si
     vede dietro le sbarre. Alla vittoria le chiavi del carceriere volano
     fin qui e la grata si alza — è il momento che chiude la storia. */
  const grata = new THREE.Group();
  grata.position.set(0, H + 1.8, 4.75);
  const ferro = mat(0x3c434d), ferroL = mat(0x6a7480);
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 0.42;
    putOn(grata, GEO.cyl8, ferro, x, 0, 0, 0.12, 3.5, 0.12);
    put(grata, GEO.cone6, ferroL, x, 3.62, 0, 0.16, 0.26, 0.16);   // punte
  }
  for (const y of [0.4, 1.9, 3.3]) put(grata, GEO.box, ferro, 0, y, 0, 2.95, 0.14, 0.12);
  put(grata, GEO.box, mat(C.gold), 0, 1.9, 0.09, 0.34, 0.4, 0.08);   // la serratura
  addOutline(grata, 0.03);
  castShadows(grata);
  g.add(grata);

  world.add(g);
  return { obj: g, princess: p, height: H, grata };
}

/* Il dettaglio di ogni zona. Tutto sta entro 13 unità dal centro e mai
   davanti al portone: il carceriere combatte lì, e la camera della
   vittoria passa a 26 unità di distanza. */
function decoraTorre(g, T, H) {
  const A = T.accento;
  /* Attorno alla torre, lasciando libero l'arco davanti. Con (sin a, cos a)
     il davanti — verso la pista, dove combatte il carceriere — è a = 0. */
  const giro = (n, fn) => {
    for (let i = 0; i < n; i++) {
      const a = 0.9 + i / (n - 1) * (Math.PI * 2 - 1.8);
      fn(Math.sin(a), Math.cos(a), i);
    }
  };

  switch (T.dettaglio) {
    case 'cristalli': {         // Valle Gelata: ghiaccio che spunta dalla base e dal balcone
      giro(7, (sx, sz, i) => {
        const h = 4 + (i % 3) * 1.6;
        const c = put(g, GEO.octa, mat(A, true), sx * 8.2, h / 2, sz * 8.2, 1.3, h, 1.3);
        c.rotation.set(sz * 0.25, i, -sx * 0.25);
      });
      giro(5, (sx, sz) => put(g, GEO.octa, mat(A, true), sx * 4.6, H + 3.4, sz * 4.6, 0.6, 1.8, 0.6));
      break;
    }
    case 'fronde': {            // Bosco Rosso: fogliame d'autunno sotto al balcone e alla base
      giro(9, (sx, sz, i) => put(g, GEO.sph8, mat(i % 2 ? A : 0xc4522e, true),
                                 sx * 4.6, H + 0.6, sz * 4.6, 2.2, 1.6, 2.2));
      giro(6, (sx, sz, i) => put(g, GEO.sph8, mat(i % 2 ? 0xc4522e : A, true),
                                 sx * 7.6, 1.6, sz * 7.6, 2.6, 2.0, 2.6));
      break;
    }
    case 'costole': {           // Dune d'Ossa: grandi costole che abbracciano la torre
      giro(6, (sx, sz) => {
        const c = put(g, GEO.cone6, mat(A, true), sx * 6.6, 7.5, sz * 6.6, 0.9, 15, 0.9);
        c.rotation.set(-sz * 0.32, 0, sx * 0.32);                   // piegate verso il fusto
      });
      for (const s of [-1, 1]) {                                   // due corna sul tetto
        put(g, GEO.cone6, mat(A, true), s * 2.4, H + 7.2, 0, 0.7, 3.2, 0.7).rotation.z = -s * 0.7;
      }
      break;
    }
    case 'rune': {              // Notte di Rúna: cristalli che galleggiano, accesi
      giro(3, (sx, sz, i) => {
        const y = 9 + i * 6;
        const c = new THREE.Group();
        c.position.set(sx * 7.4, y, sz * 7.4);
        put(c, GEO.octa, accesa(A), 0, 0, 0, 1.2, 2.2, 1.2);
        bagliore(c, A, 5, 0.5);
        g.add(c);
      });
      break;
    }
    case 'crepe': {             // Bocca di Fuoco: ossidiana, lava che affiora
      const b = new THREE.Group();
      b.position.set(0, H + 11.5, 0);
      bagliore(b, 0xff7a2a, 7, 0.6);                               // la punta arroventata
      g.add(b);
      /* la gronda accesa: senza, il tetto d'ossidiana era un buco nero
         proprio nel momento in cui la camera sale a premiarti */
      putOn(g, GEO.cyl, accesa(A), 0, H + 4.9, 0, 8.9, 0.3, 8.9);
      giro(5, (sx, sz) => put(g, GEO.box, accesa(A), sx * 5.9, 0.62, sz * 5.9, 1.4, 0.1, 3.2)
                           .rotation.y = Math.atan2(sx, sz));      // colate dal basamento
      break;
    }
    case 'rami': {              // Palude di Cenere: rami secchi che bucano la pietra
      giro(8, (sx, sz, i) => {
        const y = 7 + (i % 4) * 4.5;
        const r = put(g, GEO.cone6, mat(A, true), sx * 4.4, y, sz * 4.4, 0.35, 4.2, 0.35);
        r.rotation.set(sz * 1.1, 0, -sx * 1.1);                     // spinti in fuori
      });
      break;
    }
    case 'vetro': {             // Foresta di Vetro: schegge ai piedi della torre
      giro(8, (sx, sz, i) => {
        const h = 2.5 + (i % 3) * 1.4;
        put(g, GEO.octa, toon({ color: A, transparent: true, opacity: 0.6 }),
            sx * 8.4, h / 2, sz * 8.4, 0.9, h, 0.9).rotation.y = i;
      });
      break;
    }
    case 'isole': {             // Cielo Spezzato: pezzi di terra che le girano attorno
      giro(5, (sx, sz, i) => {
        const y = 7 + i * 4, s = 1.6 + (i % 2) * 0.8;
        const r = 10 + (i % 2) * 1.8;
        put(g, GEO.sph8, MAT.rock, sx * r, y, sz * r, s * 1.4, s, s * 1.3);
        put(g, GEO.sph8, MAT.cap,  sx * r, y + s * 0.4, sz * r, s * 1.2, s * 0.4, s * 1.1);
        put(g, GEO.cone6, MAT.rockDark, sx * r, y - s * 0.9, sz * r, s * 1.1, s * 1.4, s)
          .rotation.x = Math.PI;
      });
      for (let y = 6; y < H; y += 6) putOn(g, GEO.cyl, MAT.gold, 0, y + 0.25, 0, 8.0, 0.2, 8.0);
      break;
    }
  }
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
