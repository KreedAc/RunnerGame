/* =====================================================================
   TRAPPOLE — una regola per zona

   Le otto zone cambiavano cielo, terra, carceriere e duello, ma la corsa
   si giocava uguale dappertutto. Adesso ogni zona ha una regola sua, che
   si vede arrivare e che si impara in una corsa:

     Gelo     ghiaccio   una chiazza: se ci passi scivoli nella corsia
                         accanto, e per un attimo non sterzi
     Bosco    tronco     rotola da una corsia all'altra
     Ossa     spuntoni   salgono e scendono a ritmo: si passa quando sono giù
     Rúna     nebbia     una fila intera nella nebbia: i numeri sono "?"
                         finché non sei vicino
     Vulcano  lava       una striscia si scalda (arancione) e poi è lava
     Cenere   geyser     sbuffa a intervalli
     Vetro    specchio   una colonna a specchio mostra un numero falso (verde,
                         basso) fino all'ultimo; ha un luccichio che la tradisce
     Tuono    fulmine    un cerchio lampeggia sulla corsia, poi il fulmine cade

   Le trappole stanno nei VARCHI fra una fila e l'altra, mai al posto di una
   colonna: non tolgono la scelta, la complicano. Nebbia e specchio invece
   cambiano una fila. Mai nelle prime due file e mai nella prima partita
   guidata. Prenderne una costa TRAPPOLA_COSTO della potenza e rompe la
   serie; lo scudo le para come para le rosse. Il simulatore non le vede:
   il giocatore simulato le schiva tutte, e il conto della torre resta suo.

   Si carica prima di game.js, che la chiama a mondo costruito.
   ===================================================================== */
const TRAPPOLE = {
  'z.ice'  : { tipo: 'ghiaccio', prob: 0.33 },
  'z.wood' : { tipo: 'tronco',   prob: 0.30 },
  'z.bone' : { tipo: 'spuntoni', prob: 0.33 },
  'z.rune' : { tipo: 'nebbia',   prob: 0.30 },
  'z.lava' : { tipo: 'lava',     prob: 0.33 },
  'z.ash'  : { tipo: 'geyser',   prob: 0.33 },
  'z.glass': { tipo: 'specchio', prob: 0.30 },
  'z.sky'  : { tipo: 'fulmine',  prob: 0.33 }
};
const TRAPPOLA_COSTO = 0.12;
const TRAPPOLA_ICONA = { ghiaccio: '❄', tronco: '🪵', spuntoni: '🦴', lava: '🔥', geyser: '💨', fulmine: '⚡' };
const DI_RIGA = { nebbia: true, specchio: true };
const SVELA = { nebbia: 16, specchio: 12 };    // a che distanza si scopre la verità

const trappoleVive = [];
function trappoleAzzera() { trappoleVive.length = 0; }
const regolaZona = () => TRAPPOLE[themeFor(meta.level).key] || null;

/* l'icona per l'anteprima della riga */
function trappolaIcona(it) { return TRAPPOLA_ICONA[it.tipo] || '⚠'; }

/* --------------------------- COSTRUIRLE -------------------------------- */
const costruisci = {
  ghiaccio(g) {
    /* azzurro carico e bordo acceso: sul lastricato chiaro del Gelo una
       chiazza bianca spariva */
    const lastra = put(g, GEO.box, mat(0x5ab8e6), 0, 0.07, 0, 2.3, 0.06, 4.6);
    lastra.userData.noOutline = true;
    const bordo = accesa(0xbff4ff);
    for (const x of [-1.15, 1.15]) put(g, GEO.box, bordo, x, 0.1, 0, 0.08, 0.03, 4.6).userData.noOutline = true;
    for (const z of [-2.3, 2.3]) put(g, GEO.box, bordo, 0, 0.1, z, 2.3, 0.03, 0.08).userData.noOutline = true;
    for (const [x, z, r] of [[-0.5, -1.2, 0.5], [0.4, 0.6, -0.4], [-0.1, 1.5, 0.3]])
      put(g, GEO.box, accesa(0xffffff), x, 0.11, z, 0.9, 0.02, 0.07).rotation.y = r;
    bagliore(g, 0x9fe6ff, 3.6, 0.4, 0.3);
  },
  tronco(g) {
    const t = new THREE.Group();
    t.position.y = 0.58;
    const legno = mat(0x7a4f2e), dentro = mat(0xd9a867);
    put(t, GEO.cyl12, legno, 0, 0, 0, 1.16, 2.4, 1.16).rotation.x = Math.PI / 2;
    for (const z of [-1.21, 1.21]) {
      put(t, GEO.cyl12, dentro, 0, 0, z, 1.0, 0.03, 1.0).rotation.x = Math.PI / 2;
      put(t, GEO.ring, mat(0x9a6a3e), 0, 0, z * 1.01, 0.62, 0.62, 0.3);
    }
    put(t, GEO.box, mat(0x4f7a2e), 0.3, 0.54, 0.4, 0.34, 0.08, 0.5);      // un ciuffo di muschio
    g.add(t);
    g.userData.rullo = t;
  },
  spuntoni(g) {
    put(g, GEO.cyl12, mat(0x6f6238), 0, 0.04, 0, 2.2, 0.08, 2.2);
    const s = new THREE.Group();
    const osso = mat(0xf2ead6);
    for (const [x, z] of [[0, 0], [-0.55, -0.4], [0.55, -0.4], [-0.5, 0.5], [0.5, 0.5]])
      put(s, GEO.cone6, osso, x, 0.45, z, 0.26, 0.9, 0.26);
    g.add(s);
    g.userData.punte = s;
  },
  lava(g) {
    const lastra = put(g, GEO.box, mat(0x2a2024), 0, 0.06, 0, 2.3, 0.06, 6);
    lastra.userData.noOutline = true;
    const fuoco = put(g, GEO.box, accesa(0xff7a2a), 0, 0.1, 0, 2.1, 0.04, 5.8);
    fuoco.userData.noOutline = true;
    const alone = new THREE.Group();
    bagliore(alone, 0xff7a2a, 5, 0.7, 0.5);
    g.add(alone);
    g.userData.fuoco = fuoco;
    g.userData.alone = alone;
  },
  geyser(g) {
    put(g, GEO.cyl12, mat(0x3a3a36), 0, 0.12, 0, 1.6, 0.24, 1.6);
    put(g, GEO.cyl12, mat(0x1c1c1a), 0, 0.2, 0, 0.9, 0.1, 0.9);
    const colonna = put(g, GEO.cyl12, mat(0x9a948c), 0, 1.6, 0, 1.0, 3.2, 1.0);
    colonna.userData.noOutline = true;
    g.userData.colonna = colonna;
  },
  fulmine(g) {
    const cerchio = put(g, GEO.ring, accesa(0xfff27a), 0, 0.08, 0, 2.4, 2.4, 1.6);
    cerchio.rotation.x = Math.PI / 2;
    cerchio.userData.noOutline = true;
    /* sotto il cerchio che lampeggia, un disco fisso: il lampeggio da solo,
       preso nel momento sbagliato, non si vedeva */
    const macchia = put(g, GEO.disc, new THREE.MeshBasicMaterial({
      color: 0xfff27a, transparent: true, opacity: 0.28, depthWrite: false }), 0, 0.07, 0, 2.2);
    macchia.rotation.x = -Math.PI / 2;
    macchia.visible = false;
    g.userData.macchia = macchia;
    const saetta = new THREE.Group();
    const luce = accesa(0xfff7c0);
    [[0.3, 7, 0.4], [-0.3, 5, -0.4], [0.25, 3, 0.4], [-0.2, 1, -0.3]].forEach(([x, y, r]) =>
      put(saetta, GEO.box, luce, x, y, 0, 0.28, 2.3, 0.28).rotation.z = r);
    bagliore(saetta, 0xfff27a, 7, 0.9, 3);
    saetta.visible = false;
    g.add(saetta);
    cerchio.visible = false;
    g.userData.cerchio = cerchio;
    g.userData.saetta = saetta;
  }
};

/* una trappola nel varco prima della fila */
function trappolaVarco(z) {
  const R = regolaZona();
  if (!R || DI_RIGA[R.tipo] || Math.random() > R.prob) return;
  const x = CFG.laneX[rint(0, 2)];
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  costruisci[R.tipo](g);
  if (R.tipo !== 'lava' && R.tipo !== 'ghiaccio') addOutline(g, 0.03);
  castShadows(g);
  world.add(g);
  const it = { kind: 'trappola', tipo: R.tipo, z, x, done: false, obj: g,
               fase: Math.random() * Math.PI * 2 };
  items.push(it);
  trappoleVive.push(it);
}

/* nebbia e specchio cambiano una fila intera, o una sua colonna */
function trappolaRiga(riga) {
  const R = regolaZona();
  if (!R || !DI_RIGA[R.tipo] || Math.random() > R.prob) return;
  if (R.tipo === 'nebbia') {
    for (const it of riga) if (it.kind === 'pillar' || it.kind === 'enemy') {
      it.nebbia = true;
      const f = new THREE.Group();
      f.position.set(0, 2.2, 0);
      bagliore(f, 0xc8b8ff, 5.5, 0.35);
      it.obj.add(f);
      it.velo = f;
      trappoleVive.push(it);
    }
  } else {
    /* lo specchio: la colonna fuori portata più dura della fila */
    const dure = riga.filter(it => it.kind === 'pillar' && it.parts)
                     .sort((a, b) => b.hp - a.hp);
    const it = dure[0];
    if (!it) return;
    it.specchio = true;
    it.falso = Math.max(1, Math.round(it.hp * 0.3));
    const l = new THREE.Group();
    l.position.set(0.6, 3.2, 0.9);
    bagliore(l, 0xeaffff, 2.6, 0.95);
    it.obj.add(l);
    it.luccica = l;
    trappoleVive.push(it);
  }
}

/* ------------------------ COME SI MOSTRANO ------------------------------
   Nebbia e specchio mentono sul numero e sul colore finché non si è vicini:
   refreshThreats passa di qui, così la bugia sopravvive ai cambi d'arma. */
function trappolaAspetto(it, dmg) {
  if (it.nebbia && !it.svelata) return { testo: '?', ok: null };
  if (it.specchio && !it.svelata) return { testo: fmt(it.falso), ok: true };
  return { testo: fmt(it.hp), ok: dmg >= it.hp };
}

/* ------------------------------ IL TEMPO ------------------------------- */
function aggiornaTrappole(dt, tempo) {
  if (run.scivola > 0) run.scivola = Math.max(0, run.scivola - dt);
  for (const it of trappoleVive) {
    const g = it.obj, U = g.userData, dist = run.z - it.z;
    if (it.nebbia || it.specchio) {
      if (!it.svelata && dist < SVELA[it.nebbia ? 'nebbia' : 'specchio']) {
        it.svelata = true;
        if (it.velo) it.velo.visible = false;
        if (it.luccica) it.luccica.visible = false;
        refreshThreats();
        if (it.specchio && damage() < it.hp)
          FX.scintille.emetti(it.x, 3, it.z, 16, 0xbff4ff, { vel: 5, su: 3, taglia: 0.4, vita: 0.5 });
      }
      if (it.luccica && it.luccica.visible) it.luccica.scale.setScalar(0.5 + 0.9 * Math.pow(Math.abs(Math.sin(tempo * 2.4 + it.fase)), 6));
      continue;
    }
    if (it.done && it.tipo !== 'fulmine') continue;
    if (it.tipo === 'tronco') {
      it.x = Math.sin(tempo * 1.5 + it.fase) * 2.4;
      g.position.x = it.x;
      U.rullo.rotation.z = -it.x / 0.58;
    } else if (it.tipo === 'spuntoni') {
      const f = (tempo * 0.62 + it.fase) % 1;              // 1,6 s a ciclo
      const su = f < 0.45 ? Math.min(1, f / 0.08, (0.45 - f) / 0.08) : 0;
      it.attiva = su > 0.5;
      U.punte.position.y = -0.66 * (1 - su) + (f > 0.8 ? Math.sin(tempo * 60) * 0.04 : 0);   // tremano prima di uscire
    } else if (it.tipo === 'lava') {
      const f = (tempo / 3.6 + it.fase) % 1;
      it.attiva = f > 0.6;
      const avviso = f > 0.38 && f <= 0.6;
      U.fuoco.visible = it.attiva || (avviso && Math.sin(tempo * 18) > 0);
      U.fuoco.material = accesa(it.attiva ? 0xff7a2a : 0xffb05a);
      U.alone.visible = it.attiva;
    } else if (it.tipo === 'geyser') {
      const f = (tempo / 2.2 + it.fase) % 1;
      it.attiva = f > 0.68;
      U.colonna.visible = it.attiva;
      U.colonna.scale.y = it.attiva ? 3.2 * Math.min(1, (f - 0.68) / 0.06) : 0.01;
      U.colonna.position.y = U.colonna.scale.y / 2;
      if (f > 0.5 && !it.attiva && Math.random() < 0.3)      // gorgoglia prima
        FX.scintille.emetti(it.x, 0.3, it.z, 1, 0x8a8680, { vel: 1, su: 2, taglia: 0.3, vita: 0.4, grav: 2 });
      if (it.attiva && Math.random() < 0.5)
        FX.scintille.emetti(it.x, 3, it.z, 2, 0xb6b0a8, { vel: 2, su: 4, taglia: 0.6, vita: 0.7, grav: -1 });
    } else if (it.tipo === 'fulmine') {
      if (dist < 24 && dist > 3 && !it.caduto) {
        U.macchia.visible = true;
        U.cerchio.visible = Math.sin(tempo * 16) > -0.2;
        U.cerchio.scale.setScalar(2.4 * (0.8 + 0.2 * Math.sin(tempo * 16)));
      }
      if (dist <= 3 && !it.caduto) {
        it.caduto = true;
        it.lampo = 0.3;
        U.cerchio.visible = false;
        U.macchia.visible = false;
        U.saetta.visible = true;
        FX.scintille.emetti(it.x, 0.5, it.z, 30, 0xfff27a, { vel: 9, su: 5, taglia: 0.5, vita: 0.5 });
        FX.onde.lancia(it.x, 0.1, it.z, 0xfff27a, 4);
        impatto(0.35);
      }
      if (it.lampo > 0) {
        it.lampo -= dt;
        U.saetta.visible = it.lampo > 0 && Math.sin(tempo * 50) > -0.5;
      }
    }
  }
}

/* ------------------------- QUANDO LA PRENDI ---------------------------- */
function trappolaPassa(it) {
  const T = it.tipo;
  if (T === 'spuntoni' || T === 'lava' || T === 'geyser') { if (!it.attiva) return; }
  const dove = puntoSchermo(it.obj, 1.6);
  if (T === 'ghiaccio') {
    /* si scivola nella corsia accanto: dal centro a caso, dai lati verso il centro */
    const dir = Math.abs(run.x) < 1.2 ? (Math.random() < 0.5 ? -1 : 1) : -Math.sign(run.x);
    run.targetX = clamp(nearestLaneX() + dir * 2.4, -CFG.laneLimit, CFG.laneLimit);
    run.scivola = 0.3;
    popup('❄ ' + t('tr.scivoli'), '#bff4ff', dove);
    impatto(0.3);
    FX.scintille.emetti(run.x, 0.3, run.z, 20, 0xe8fbff, { vel: 5, su: 2, taglia: 0.4, vita: 0.5, grav: 6 });
    return;
  }
  if (scudoPara(it.obj, dove)) return;
  const loss = Math.max(3, Math.round(run.power * TRAPPOLA_COSTO));
  run.power = Math.max(0, run.power - loss);
  popup(trappolaIcona(it) + ' −' + fmt(loss), '#ff7a6e', dove);
  pulsa('powerPill', 'giu');
  run.schiaccia = 1.2;
  impatto(0.7);
  FX.scintille.emetti(run.x, 1, run.z - 0.5, 24, 0xff5a44, { vel: 7, su: 4, taglia: 0.45, vita: 0.5, grav: 8 });
  comboGiu();
}

/* ------------------------ IL CARTELLO DELLA ZONA -------------------------
   Le prime due corse in una zona, la regola si annuncia: una riga sola,
   poi basta — la terza volta la si conosce. */
function trappolaAnnuncia() {
  const R = regolaZona();
  if (!R || guida.attiva) return;
  meta.regole = meta.regole || {};
  const n = meta.regole[R.tipo] || 0;
  if (n >= 2) return;
  meta.regole[R.tipo] = n + 1;
  setTimeout(() => { if (state === 'run') flashBanner(t('tr.h.' + R.tipo)); }, 900);
}
