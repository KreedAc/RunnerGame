#!/usr/bin/env node
/* =====================================================================
   PROVA DELLE TRAPPOLE — una regola per zona

   Ogni zona deve generare la sua regola, e ogni regola deve fare quello
   che il cartello promette. Si gioca a passo fisso:
   - le otto zone, costruite più volte: ciascuna mette la SUA trappola
     (e solo quella), mai nelle prime due file;
   - nella prima partita guidata non c'è nessuna trappola;
   - ghiaccio: si scivola nella corsia accanto e per un attimo non si sterza;
   - spuntoni: su costano potenza e rompono la serie, giù no;
   - lo scudo para una trappola come para una rossa;
   - nebbia: "?" finché non sei vicino, poi il numero vero;
   - specchio: un numero verde falso, poi quello vero.

   Serve Playwright:  npm i playwright
   uso: node tools/trappole.js [percorso/index.html]
   ===================================================================== */
'use strict';
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Serve Playwright per questa prova:  npm i playwright'); process.exit(2); }
const PAGINA = process.argv[2] || 'file://' + path.join(__dirname, '..', 'web', 'index.html');
const CROMO = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const male = [];
const ok = (c, cosa) => { if (!c) male.push(cosa); };

(async () => {
  const b = await chromium.launch({ executablePath: CROMO, args: ['--use-gl=swiftshader'] });
  const p = await (await b.newContext({ viewport: { width: 412, height: 780 }, isMobile: true, hasTouch: true, locale: 'it-IT' })).newPage();
  const errori = [];
  p.on('pageerror', e => errori.push(e.message));
  await p.goto(PAGINA);
  await p.waitForFunction(() => window.BlockyRun);

  const r = await p.evaluate(() => {
    const passo = window.update;
    window.update = () => {};
    const avanza = sec => { for (let i = 0; i < Math.round(sec * 60); i++) passo(1 / 60); };
    const E = {};

    /* --- le otto zone: ognuna la sua regola --- */
    E.zone = [];
    for (let L = 1; L <= 8; L++) {
      meta.guidaFatta = true; meta.lastOutcome = 'wall'; meta.level = L;
      const atteso = TRAPPOLE[themeFor(L).key].tipo;
      const visti = new Set();
      let primaFila = false, quante = 0;
      for (let k = 0; k < 6; k++) {
        rebuildHook();
        const fila0 = CFG.firstRowZ - CFG.rowSpacing;          // la seconda fila
        for (const it of trappoleVive) {
          visti.add(it.tipo || (it.nebbia ? 'nebbia' : 'specchio'));
          quante++;
          if (it.z > fila0 + 1) primaFila = true;
        }
      }
      E.zone.push({ L, atteso, visti: [...visti], quante, primaFila });
    }

    /* --- la prima partita guidata: niente trappole --- */
    meta.guidaFatta = false; meta.lastOutcome = ''; meta.level = 1;
    let guidate = 0;
    for (let k = 0; k < 4; k++) { startRun(); guidate += trappoleVive.length; state = 'hub'; guidaFinisci(); meta.guidaFatta = false; meta.lastOutcome = ''; }
    E.guidate = guidate;

    /* --- in corsa, trappole messe a mano davanti --- */
    const pronto = L => {
      meta.guidaFatta = true; meta.lastOutcome = 'wall'; meta.level = L;
      rebuildHook(); startRun();
      items.forEach(i => { i.done = true; if (i.obj) i.obj.visible = false; });
      trappoleAzzera();
      run.x = run.targetX = 0;
    };
    const metti = (davanti, corsia) => {
      const R = regolaZona(), pb = R.prob, rnd0 = Math.random;
      R.prob = 1;
      Math.random = () => [0.01, 0.5, 0.99][corsia];
      trappolaVarco(run.z - davanti);
      Math.random = rnd0; R.prob = pb;
      return trappoleVive[trappoleVive.length - 1];
    };

    /* ghiaccio */
    pronto(1);
    metti(6, 1);
    avanza(0.45);
    E.ghiaccio = { target: run.targetX, scivola: run.scivola > 0 };
    const t0 = run.targetX;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    E.ghiaccio.bloccato = run.targetX === t0;

    /* spuntoni: su, poi giù */
    pronto(3);
    run.combo = 3;
    let s = metti(6, 1);
    s.fase = ((0.2 - (tempoMondo + 0.4) * 0.62) % 1 + 1) % 1;      // su quando ci passi sopra
    let prima = run.power;
    avanza(0.6);
    E.spuntoniSu = { prima, dopo: run.power, combo: run.combo };
    s = metti(6, 1);
    s.fase = ((0.7 - (tempoMondo + 0.4) * 0.62) % 1 + 1) % 1;
    prima = run.power;
    avanza(0.6);
    E.spuntoniGiu = { prima, dopo: run.power };

    /* lo scudo para */
    run.poteri.scudo = 10;
    s = metti(6, 1);
    s.fase = ((0.2 - (tempoMondo + 0.4) * 0.62) % 1 + 1) % 1;
    prima = run.power;
    avanza(0.6);
    E.scudo = { prima, dopo: run.power, scudo: run.poteri.scudo };

    /* nebbia */
    pronto(4);
    const riga = CFG.laneX.map((x, k) => {
      const hp = Math.round(run.unit * [0.7, 3, 2.2][k]), z = run.z - 40;
      const it = Object.assign({ kind: 'pillar', z, x, hp, done: false }, spawnPillar(x, z, hp));
      items.push(it); return it;
    });
    const R4 = regolaZona(); R4.prob = 1; trappolaRiga(riga); R4.prob = 0.3;
    refreshThreats();
    E.nebbiaLontano = riga.map(it => trappolaAspetto(it, damage()).testo);
    avanza((40 - SVELA.nebbia + 2) / run.speed);
    E.nebbiaVicino = riga.map(it => trappolaAspetto(it, damage()).testo);
    E.nebbiaVero = riga.map(it => fmt(it.hp));

    /* specchio */
    pronto(7);
    const riga7 = CFG.laneX.map((x, k) => {
      const hp = Math.round(run.unit * [0.7, 3.4, 2.2][k]), z = run.z - 40;
      const it = Object.assign({ kind: 'pillar', z, x, hp, done: false }, spawnPillar(x, z, hp));
      items.push(it); return it;
    });
    const R7 = regolaZona(); R7.prob = 1; trappolaRiga(riga7); R7.prob = 0.3;
    refreshThreats();
    const sp = riga7.find(it => it.specchio);
    E.specchio = sp ? { lontano: trappolaAspetto(sp, damage()), vero: sp.hp } : null;
    avanza((40 - SVELA.specchio + 2) / run.speed);
    if (sp) E.specchio.vicino = trappolaAspetto(sp, damage());

    state = 'hub';
    window.update = passo;
    return E;
  });

  for (const z of r.zone) {
    ok(z.quante > 0, 'la zona ' + z.L + ' non ha messo nessuna trappola (' + z.atteso + ')');
    ok(z.visti.length === 1 && z.visti[0] === z.atteso,
       'la zona ' + z.L + ' dovrebbe avere solo ' + z.atteso + ', ha ' + z.visti.join(','));
    ok(!z.primaFila, 'la zona ' + z.L + ' ha una trappola nelle prime due file');
  }
  ok(r.guidate === 0, 'la prima partita guidata ha ' + r.guidate + ' trappole');
  ok(Math.abs(Math.abs(r.ghiaccio.target) - 2.4) < 0.01 && r.ghiaccio.scivola,
     'il ghiaccio non fa scivolare nella corsia accanto: ' + JSON.stringify(r.ghiaccio));
  ok(r.ghiaccio.bloccato, 'sul ghiaccio si sterza lo stesso');
  ok(r.spuntoniSu.dopo < r.spuntoniSu.prima && r.spuntoniSu.combo === 0,
     'gli spuntoni su non costano o non rompono la serie: ' + JSON.stringify(r.spuntoniSu));
  ok(r.spuntoniGiu.dopo === r.spuntoniGiu.prima, 'gli spuntoni giù costano: ' + JSON.stringify(r.spuntoniGiu));
  ok(r.scudo.dopo === r.scudo.prima && r.scudo.scudo === 0, 'lo scudo non para la trappola: ' + JSON.stringify(r.scudo));
  ok(r.nebbiaLontano.every(x => x === '?'), 'nella nebbia i numeri si vedono da lontano: ' + r.nebbiaLontano);
  ok(r.nebbiaVicino.join() === r.nebbiaVero.join(), 'da vicino la nebbia non svela: ' + r.nebbiaVicino + ' vs ' + r.nebbiaVero);
  ok(r.specchio && r.specchio.lontano.ok === true && r.specchio.lontano.testo !== String(r.specchio.vero),
     'lo specchio non mostra un numero falso verde: ' + JSON.stringify(r.specchio));
  ok(r.specchio && r.specchio.vicino && r.specchio.vicino.ok === false,
     'da vicino lo specchio non dice la verità: ' + JSON.stringify(r.specchio));

  for (const e of errori) male.push('errore JS: ' + e);
  await b.close();
  if (male.length) {
    console.error('PROVA FALLITA');
    for (const m of male) console.error('  · ' + m);
    process.exit(1);
  }
  console.log('prova superata · otto zone con la loro regola, niente nella partita guidata, ghiaccio, spuntoni, scudo, nebbia e specchio');
})();
