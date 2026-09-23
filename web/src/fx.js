/* =====================================================================
   FX — la luce che non c'è, le particelle, le scie

   Un gioco da telefono che "sembra da console" di solito lo deve a tre
   cose: oggetti che brillano, aria che si muove, e colpi che esplodono in
   qualcosa. Il modo ovvio per averle è il post-processing (bloom a schermo
   intero, profondità di campo…): costa un secondo passaggio su ogni
   pixel, a ogni fotogramma, ed è esattamente quello che un telefono di
   fascia media non si può permettere. E questo gioco ha già sentito
   "sembra che lagghi" due volte.

   Qui è tutto finto e tutto dentro la scena:

   - il bagliore è uno sprite additivo con una sfumatura tonda, messo solo
     dove serve (gemme, armi, bonus, crateri): costa quanto lo sprite;
   - le particelle sono punti su un unico buffer, una chiamata di disegno
     per sistema, con un piccolo shader che dà a ogni punto la sua
     trasparenza e la sua taglia — PointsMaterial non lo sa fare;
   - l'aria della zona (neve, braci, cenere, foglie…) è un volume di punti
     che segue la camera e si ricicla ai bordi: sempre gli stessi 150
     punti, per quanto lunga sia la corsa;
   - le scie di velocità sono un'unica InstancedMesh di bastoncini.
   ===================================================================== */

/* ------------------------------ TEXTURE -------------------------------- */
function textureTonda(stop) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  for (const [o, a] of stop) r.addColorStop(o, 'rgba(255,255,255,' + a + ')');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
/* l'alone scende lento, come la luce vera; il punto è pieno al centro e
   ha il bordo netto quanto basta per leggersi come fiocco o scintilla */
const TEX_ALONE = textureTonda([[0, 1], [0.18, 0.6], [0.5, 0.16], [1, 0]]);
const TEX_PUNTO = textureTonda([[0, 1], [0.45, 0.9], [0.75, 0.35], [1, 0]]);

/* ------------------------------ BAGLIORI -------------------------------- */
const baglioriCache = new Map();

/* Uno sprite additivo: non illumina niente, ma l'occhio lo legge come
   luce. Il materiale è condiviso per colore e forza. */
function bagliore(parent, color, scala, forza, y) {
  const k = color + ':' + forza;
  let m = baglioriCache.get(k);
  if (!m) {
    m = new THREE.SpriteMaterial({
      map: TEX_ALONE, color, opacity: forza, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    });
    baglioriCache.set(k, m);
  }
  const s = new THREE.Sprite(m);
  s.scale.setScalar(scala);
  s.position.y = y || 0;
  s.renderOrder = 2;
  parent.add(s);
  return s;
}

/* ------------------------------ PUNTI ---------------------------------- */
/* La taglia di un punto è in unità di mondo: lo shader la converte in
   pixel con l'altezza del buffer, che cambia con la risoluzione adattiva. */
const FX_SCALA = { value: 400 };
const _dbs = new THREE.Vector2();
function misuraScalaFx() {
  renderer.getDrawingBufferSize(_dbs);
  FX_SCALA.value = _dbs.y * 0.5;
}

function materialePunti(additiva, nebbia) {
  return new THREE.ShaderMaterial({
    uniforms: { mappa: { value: TEX_PUNTO }, scala: FX_SCALA },
    vertexShader: [
      'attribute vec3 colore;',
      'attribute float alpha;',
      'attribute float taglia;',
      'uniform float scala;',
      'varying vec4 vCol;',
      'void main() {',
      '  vec4 mv = modelViewMatrix * vec4( position, 1.0 );',
      '  float d = -mv.z;',
      '  gl_PointSize = taglia * scala / max( d, 0.1 );',
      '  gl_Position = projectionMatrix * mv;',
      /* troppo vicino alla lente un fiocco diventa una macchia grande
         mezzo schermo; e troppo lontano, nella nebbia, un puntino inutile */
      '  float vicino = smoothstep( 1.5, 5.0, d );',
      '  float lontano = ' + (nebbia ? '1.0 - smoothstep( 60.0, 95.0, d )' : '1.0') + ';',
      '  vCol = vec4( colore, alpha * vicino * lontano );',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform sampler2D mappa;',
      'varying vec4 vCol;',
      'void main() {',
      '  float a = texture2D( mappa, gl_PointCoord ).a * vCol.a;',
      '  if ( a < 0.01 ) discard;',
      '  gl_FragColor = vec4( vCol.rgb, a );',
      '}'
    ].join('\n'),
    transparent: true,
    depthWrite: false,
    blending: additiva ? THREE.AdditiveBlending : THREE.NormalBlending
  });
}

function bufferPunti(n) {
  const g = new THREE.BufferGeometry();
  const attr = (nome, k) => {
    const a = new THREE.BufferAttribute(new Float32Array(n * k), k);
    a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute(nome, a);
    return a.array;
  };
  return { g, p: attr('position', 3), c: attr('colore', 3), a: attr('alpha', 1), s: attr('taglia', 1) };
}

function puntiAggiornati(g) {
  g.attributes.position.needsUpdate = true;
  g.attributes.colore.needsUpdate = true;
  g.attributes.alpha.needsUpdate = true;
  g.attributes.taglia.needsUpdate = true;
}

/* ------------------------------ SCINTILLE ------------------------------ */
/* Un anello di particelle riusate: chi arriva prende il posto della più
   vecchia. Mai un'allocazione durante la corsa. */
class Scintille {
  constructor(n) {
    this.n = n;
    this.cur = 0;
    const b = bufferPunti(n);
    Object.assign(this, b);
    this.v = new Float32Array(n * 3);
    this.vita = new Float32Array(n);
    this.vitaMax = new Float32Array(n);
    this.s0 = new Float32Array(n);
    this.grav = new Float32Array(n);
    for (let i = 0; i < n; i++) this.p[i * 3 + 1] = -999;
    this.mesh = new THREE.Points(b.g, materialePunti(true, false));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
    scene.add(this.mesh);
    this.vive = 0;
  }

  emetti(x, y, z, quante, colore, o) {
    o = o || {};
    const vel = o.vel || 7, su = o.su === undefined ? 4 : o.su;
    const vita = o.vita || 0.55, taglia = o.taglia || 0.45;
    const grav = o.grav === undefined ? 16 : o.grav, sparso = o.sparso || 0.35;
    const col = new THREE.Color(colore);
    for (let k = 0; k < quante; k++) {
      const i = this.cur;
      this.cur = (this.cur + 1) % this.n;
      const a = Math.random() * Math.PI * 2;
      const e = Math.sqrt(Math.random());
      this.p[i * 3]     = x + rnd(-sparso, sparso);
      this.p[i * 3 + 1] = y + rnd(-sparso, sparso);
      this.p[i * 3 + 2] = z + rnd(-sparso, sparso);
      this.v[i * 3]     = Math.cos(a) * vel * e;
      this.v[i * 3 + 1] = su + Math.random() * vel * 0.8;
      this.v[i * 3 + 2] = Math.sin(a) * vel * e + (o.avanti || 0);
      /* un po' di bianco dentro al colore: una scintilla è più calda al
         centro, e tutte identiche sembrano coriandoli */
      const w = Math.random() * 0.45;
      this.c[i * 3]     = col.r + (1 - col.r) * w;
      this.c[i * 3 + 1] = col.g + (1 - col.g) * w;
      this.c[i * 3 + 2] = col.b + (1 - col.b) * w;
      this.vita[i] = this.vitaMax[i] = vita * rnd(0.6, 1.25);
      this.s0[i] = taglia * rnd(0.55, 1.35);
      this.grav[i] = grav;
    }
    this.vive = Math.min(this.n, this.vive + quante);
  }

  aggiorna(dt) {
    if (!this.vive) return;
    let vive = 0;
    const attrito = Math.max(0, 1 - 2.2 * dt);
    for (let i = 0; i < this.n; i++) {
      if (this.vita[i] <= 0) continue;
      this.vita[i] -= dt;
      if (this.vita[i] <= 0) { this.a[i] = 0; continue; }
      vive++;
      const j = i * 3;
      this.v[j + 1] -= this.grav[i] * dt;
      this.v[j] *= attrito; this.v[j + 1] *= attrito; this.v[j + 2] *= attrito;
      this.p[j] += this.v[j] * dt;
      this.p[j + 1] += this.v[j + 1] * dt;
      this.p[j + 2] += this.v[j + 2] * dt;
      const k = this.vita[i] / this.vitaMax[i];
      this.a[i] = Math.min(1, k * 1.6);
      this.s[i] = this.s0[i] * (0.35 + 0.65 * k);
    }
    this.vive = vive;
    puntiAggiornati(this.g);
  }
}

/* ------------------------------ ONDE ----------------------------------- */
/* Un anello che si allarga a terra: dice "qui è successo qualcosa di
   grosso" in un quarto di secondo, senza coprire niente. */
class Onde {
  constructor(n) {
    const geo = new THREE.RingGeometry(0.72, 1, 40);
    this.pool = [];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false
      }));
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      m.renderOrder = 3;
      scene.add(m);
      this.pool.push({ m, t: 1, r: 1 });
    }
    this.cur = 0;
  }

  lancia(x, y, z, colore, raggio) {
    const o = this.pool[this.cur];
    this.cur = (this.cur + 1) % this.pool.length;
    o.m.position.set(x, y, z);
    o.m.material.color.setHex(colore);
    o.t = 0;
    o.r = raggio || 3;
    o.m.visible = true;
  }

  aggiorna(dt) {
    for (const o of this.pool) {
      if (o.t >= 1) continue;
      o.t = Math.min(1, o.t + dt / 0.36);
      const e = 1 - Math.pow(1 - o.t, 3);
      o.m.scale.setScalar(0.6 + o.r * e);
      o.m.material.opacity = 0.9 * (1 - o.t);
      if (o.t >= 1) o.m.visible = false;
    }
  }
}

/* ------------------------------ L'ARIA --------------------------------- */
/* Ogni zona ha la sua aria: è la differenza fra un fondale e un posto.
   vel = spostamento al secondo, ondeggio = quanto oscilla di lato,
   additiva = si somma alla scena (luce: braci, rune, scintille di vetro)
   invece di coprirla (materia: neve, cenere, foglie, polvere). */
const ARIE = {
  'z.ice'  : { n: 170, colore: 0xffffff, taglia: 0.30, vel: [0.5, -2.1, 0.3], ondeggio: 0.7, forza: 0.95 },
  'z.wood' : { n:  80, colore: 0xe8773a, taglia: 0.36, vel: [1.4, -1.2, 0.2], ondeggio: 1.8, forza: 0.95 },
  'z.bone' : { n: 110, colore: 0xfff0c8, taglia: 0.20, vel: [3.2, 0.15, 0.4], ondeggio: 0.3, forza: 0.55 },
  'z.rune' : { n: 120, colore: 0xa89dff, taglia: 0.26, vel: [0, 1.1, 0],      ondeggio: 0.6, forza: 1.0, additiva: true, brilla: true },
  'z.lava' : { n: 180, colore: 0xff8a2a, taglia: 0.26, vel: [0.4, 2.6, 0],    ondeggio: 0.9, forza: 1.0, additiva: true, brilla: true },
  'z.ash'  : { n: 190, colore: 0xd6d8cc, taglia: 0.26, vel: [0.6, -0.8, 0.1], ondeggio: 1.0, forza: 0.85 },
  'z.glass': { n: 130, colore: 0xe4f8ff, taglia: 0.22, vel: [0, -0.35, 0],    ondeggio: 0.4, forza: 1.0, additiva: true, brilla: true },
  'z.sky'  : { n:  70, colore: 0xffffff, taglia: 1.10, vel: [3.8, 0, 0],      ondeggio: 0.2, forza: 0.32 }
};

const mod = (a, n) => ((a % n) + n) % n;

/* il volume attorno alla camera in cui l'aria vive e si ricicla */
const ARIA_X = 28, ARIA_Y = 24, ARIA_AVANTI = 90, ARIA_DIETRO = 6;

class Aria {
  constructor() { this.mesh = null; }

  prepara(chiave) {
    if (this.mesh) {
      scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }
    const A = ARIE[chiave];
    this.A = A;
    if (!A) return;
    const n = MENO_MOTO ? Math.round(A.n * 0.4) : A.n;
    const b = bufferPunti(n);
    Object.assign(this, b);
    this.n = n;
    this.fase = new Float32Array(n);
    const col = new THREE.Color(A.colore);
    const cx = camera.position.x, cz = camera.position.z;
    for (let i = 0; i < n; i++) {
      this.p[i * 3]     = cx + rnd(-ARIA_X, ARIA_X);
      this.p[i * 3 + 1] = rnd(0, ARIA_Y);
      this.p[i * 3 + 2] = cz - rnd(-ARIA_DIETRO, ARIA_AVANTI);
      this.c[i * 3] = col.r; this.c[i * 3 + 1] = col.g; this.c[i * 3 + 2] = col.b;
      this.a[i] = A.forza;
      this.s[i] = A.taglia * rnd(0.6, 1.4);
      this.fase[i] = Math.random() * Math.PI * 2;
    }
    this.mesh = new THREE.Points(b.g, materialePunti(!!A.additiva, true));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    scene.add(this.mesh);
  }

  aggiorna(dt, t) {
    if (!this.mesh) return;
    const A = this.A;
    const cx = camera.position.x, cz = camera.position.z;
    const giro = ARIA_AVANTI + ARIA_DIETRO;
    for (let i = 0; i < this.n; i++) {
      const j = i * 3, f = this.fase[i];
      const onda = Math.sin(t * 0.9 + f) * A.ondeggio;
      let x = this.p[j] + (A.vel[0] + onda) * dt;
      let y = this.p[j + 1] + A.vel[1] * dt;
      let z = this.p[j + 2] + (A.vel[2] + Math.cos(t * 0.7 + f) * A.ondeggio * 0.5) * dt;
      /* il riciclo è un modulo e non un "se esce, rientra": dopo un salto
         di camera (fine corsa, nuova torre) i punti possono essere lontani
         centinaia di unità, e devono tornare in un colpo solo */
      x = cx - ARIA_X + mod(x - (cx - ARIA_X), ARIA_X * 2);
      y = mod(y, ARIA_Y);
      z = cz + ARIA_DIETRO - mod(cz + ARIA_DIETRO - z, giro);
      this.p[j] = x; this.p[j + 1] = y; this.p[j + 2] = z;
      if (A.brilla) {
        const b = Math.sin(t * 3.1 + f * 5);
        this.a[i] = A.forza * (0.3 + 0.7 * b * b);
      }
    }
    puntiAggiornati(this.g);
  }
}

/* ---------------------------- SCIE DI VELOCITÀ ------------------------- */
/* Bastoncini sottili che sfrecciano ai lati: la corsa va da 15 a 21 unità
   al secondo, ma senza un riferimento vicino l'occhio non lo sente. */
class Scie {
  constructor(n) {
    this.n = n;
    this.m = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.05, 0.05, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0,
                                    blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
      n);
    this.m.frustumCulled = false;
    this.m.visible = false;
    this.m.renderOrder = 3;
    scene.add(this.m);
    this.d = [];
    for (let i = 0; i < n; i++) this.d.push(this.nuova({}, true));
    this.forza = 0;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3();
  }

  nuova(o, sparsa) {
    const lato = Math.random() < 0.5 ? -1 : 1;
    o.x = lato * rnd(3.4, 8.5);
    o.y = rnd(0.4, 6.5);
    o.z = sparsa ? -rnd(0, 70) : -rnd(55, 75);     // rispetto alla camera
    o.len = rnd(2.5, 6.5);
    o.v = rnd(0.9, 1.5);
    return o;
  }

  aggiorna(dt, attive, velocita) {
    const meta = attive && !MENO_MOTO ? 0.22 : 0;
    this.forza += (meta - this.forza) * Math.min(1, dt * 4);
    if (this.forza < 0.005) { this.m.visible = false; return; }
    this.m.visible = true;
    this.m.material.opacity = this.forza;
    const cam = camera.position;
    for (let i = 0; i < this.n; i++) {
      const o = this.d[i];
      o.z += velocita * o.v * dt;
      if (o.z > 2) this.nuova(o, false);
      this._p.set(cam.x + o.x, o.y, cam.z + o.z);
      this._s.set(1, 1, o.len);
      this._m.compose(this._p, this._q, this._s);
      this.m.setMatrixAt(i, this._m);
    }
    this.m.instanceMatrix.needsUpdate = true;
  }
}

/* ------------------------------ TUTTO INSIEME -------------------------- */
const FX = {
  scintille: new Scintille(360),
  onde: new Onde(8),
  aria: new Aria(),
  scie: new Scie(28)
};

function fxZona(chiave) { FX.aria.prepara(chiave); }

function fxAggiorna(dt, t, correndo, velocita) {
  misuraScalaFx();
  FX.scintille.aggiorna(dt);
  FX.onde.aggiorna(dt);
  FX.aria.aggiorna(dt, t);
  FX.scie.aggiorna(dt, correndo, velocita);
}

/* Le ricette dei colpi: un posto solo dove si decide quanto è grosso
   ogni evento, così restano coerenti fra loro. */
function fxColpo(obj, colore, grosso) {
  const p = obj.position;
  FX.scintille.emetti(p.x, 1.6, p.z, grosso ? 30 : 20, colore,
                      { vel: grosso ? 10 : 8, su: 5, taglia: 0.5, vita: 0.6 });
  FX.onde.lancia(p.x, 0.08, p.z, colore, grosso ? 4.2 : 3.2);
}

function fxRaccolta(obj, colore, quante) {
  const p = obj.position;
  FX.scintille.emetti(p.x, p.y + 0.3, p.z, quante, colore,
                      { vel: 4, su: 3, taglia: 0.34, vita: 0.45, grav: 6 });
}
