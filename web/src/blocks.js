/* =====================================================================
   BLOCKS — i materiali dei blocchi del mondo
   Ogni tipo è o un materiale singolo, o un array di 6 (una faccia
   ciascuna, nell'ordine di three: +X −X +Y −Y +Z −Z).
   ===================================================================== */

const BLOCK = {};

function flatMat(tex)  { return new THREE.MeshLambertMaterial({ map: tex }); }
function tintMat(color){ return new THREE.MeshLambertMaterial({ color }); }

function initBlocks() {
  const S = 16;   // 16×16 px per blocco, come da tradizione

  /* --- terra ed erba --- */
  const dirtTex = pixelTex(S, g => {
    speckle(g, S, 0x8b6444, [0x7a5638, 0x9c7350, 0x6f4d33, 0xa07d5c], 0.55);
    tileEdge(g, S);
  });
  const grassTopTex = pixelTex(S, g => {
    speckle(g, S, 0x6aa832, [0x5c982b, 0x7cb93f, 0x548b28, 0x86c449], 0.6);
    tileEdge(g, S);
  });
  const grassSideTex = pixelTex(S, g => {
    speckle(g, S, 0x8b6444, [0x7a5638, 0x9c7350, 0x6f4d33], 0.55);
    // la frangia d'erba che scende sul lato
    for (let x = 0; x < S; x++) {
      const h = rint(2, 4);
      for (let y = 0; y < h; y++) {
        g.fillStyle = hex(pick([0x6aa832, 0x5c982b, 0x7cb93f]));
        g.fillRect(x, y, 1, 1);
      }
    }
    tileEdge(g, S);
  });

  const dirt = flatMat(dirtTex);
  BLOCK.dirt  = dirt;
  BLOCK.grass = [
    flatMat(grassSideTex), flatMat(grassSideTex),
    flatMat(grassTopTex),  dirt,
    flatMat(grassSideTex), flatMat(grassSideTex)
  ];

  /* --- pietra, cobblestone, ghiaia (la pista) --- */
  BLOCK.stone = flatMat(pixelTex(S, g => {
    speckle(g, S, 0x8a8a8a, [0x7c7c7c, 0x999999, 0x6f6f6f], 0.5);
    tileEdge(g, S);
  }));
  BLOCK.cobble = flatMat(pixelTex(S, g => {
    speckle(g, S, 0x8d8d8d, [0x808080, 0x9b9b9b], 0.3);
    blobs(g, S, [0x6e6e6e, 0xa5a5a5, 0x767676], 16, 2, 4);
    tileEdge(g, S, 0.2);
  }));
  BLOCK.gravel = flatMat(pixelTex(S, g => {
    speckle(g, S, 0x9d9186, [0x8b8177, 0xb0a598, 0x7d746b, 0xc0b6a8], 0.65);
    tileEdge(g, S, 0.18);
  }));

  /* --- legno --- */
  const logSideTex = pixelTex(S, g => {
    speckle(g, S, 0x6b5433, [0x5c4829, 0x7a613c], 0.4);
    for (let x = 0; x < S; x += rint(2, 4)) {
      g.fillStyle = hex(0x543f24);
      g.fillRect(x, 0, 1, S);
    }
  });
  const logTopTex = pixelTex(S, g => {
    g.fillStyle = hex(0xa4834f); g.fillRect(0, 0, S, S);
    g.strokeStyle = hex(0x7a613c); g.lineWidth = 1;
    for (let r = 2; r < S / 2; r += 2) g.strokeRect(r, r, S - r * 2, S - r * 2);
  });
  const logSide = flatMat(logSideTex), logTop = flatMat(logTopTex);
  BLOCK.log = [logSide, logSide, logTop, logTop, logSide, logSide];

  BLOCK.planks = flatMat(pixelTex(S, g => {
    speckle(g, S, 0xa5814e, [0x967341, 0xb08c58], 0.35);
    g.fillStyle = hex(0x7e6134);
    for (let y = 0; y < S; y += 4) g.fillRect(0, y, S, 1);
    tileEdge(g, S, 0.2);
  }));

  BLOCK.leaves = flatMat(pixelTex(S, g => {
    speckle(g, S, 0x3f8c2b, [0x357824, 0x4c9e34, 0x2c6a1e, 0x58ac3d], 0.75);
    blobs(g, S, [0x2c6a1e], 6, 1, 2);
    tileEdge(g, S, 0.22);
  }));

  /* --- extra di scenografia --- */
  BLOCK.sand = flatMat(pixelTex(S, g => {
    speckle(g, S, 0xdcd0a0, [0xd0c391, 0xe6dcb2], 0.5);
    tileEdge(g, S);
  }));
  BLOCK.water = new THREE.MeshLambertMaterial({
    map: pixelTex(S, g => speckle(g, S, 0x3a6fd8, [0x3466cc, 0x4a80e6], 0.4)),
    transparent: true, opacity: 0.82
  });
  BLOCK.brick = flatMat(pixelTex(S, g => {
    speckle(g, S, 0xa04b3c, [0x8f4234, 0xb05a48], 0.3);
    g.fillStyle = hex(0xd8cfc4);
    for (let y = 0; y < S; y += 4) g.fillRect(0, y, S, 1);
    for (let y = 0; y < S; y += 4)
      for (let x = (y / 4) % 2 ? 0 : 4; x < S; x += 8) g.fillRect(x, y, 1, 4);
  }));
  BLOCK.glass = new THREE.MeshLambertMaterial({ color: 0xbfe6f5, transparent: true, opacity: 0.55 });
  BLOCK.obsidian = flatMat(pixelTex(S, g => {
    speckle(g, S, 0x241d38, [0x1b1529, 0x322a4a, 0x4a3f6b], 0.45);
    tileEdge(g, S, 0.3);
  }));
}

/* mette un blocco (o un parallelepipedo di blocchi) nel mondo.
   x,y,z = angolo/base; sx,sy,sz = dimensioni in blocchi.
   Se il materiale ha una texture, la ripete una volta per blocco. */
function putBlock(parent, mat, x, y, z, sx, sy, sz) {
  sx = sx || 1; sy = sy || 1; sz = sz || 1;
  let m = mat;
  if (sx !== 1 || sy !== 1 || sz !== 1) m = repeatMat(mat, sx, sy, sz);
  const mesh = new THREE.Mesh(boxGeo, m);
  mesh.position.set(x, y + sy / 2, z);
  mesh.scale.set(sx, sy, sz);
  parent.add(mesh);
  return mesh;
}

/* clona un materiale ripetendo la texture in base alla dimensione,
   così un muro 5×3 mostra 15 blocchi e non un blocco stirato */
const repeatCache = new Map();
function repeatMat(mat, sx, sy, sz) {
  const arr = Array.isArray(mat) ? mat : [mat, mat, mat, mat, mat, mat];
  const reps = [                       // per faccia: quante volte in U e V
    [sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]
  ];
  // sempre 6 materiali: ogni faccia ha bisogno della sua ripetizione
  return arr.map((m, i) => {
    if (!m.map) return m;
    const key = m.uuid + '|' + reps[i][0] + 'x' + reps[i][1];
    let c = repeatCache.get(key);
    if (!c) {
      c = m.clone();
      c.map = m.map.clone();
      c.map.needsUpdate = true;
      c.map.wrapS = c.map.wrapT = THREE.RepeatWrapping;
      c.map.repeat.set(reps[i][0], reps[i][1]);
      repeatCache.set(key, c);
    }
    return c;
  });
}
