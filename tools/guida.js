#!/usr/bin/env node
/* =====================================================================
   PROVA DELLA PRIMA PARTITA GUIDATA

   Chi apre il gioco per la prima volta deve imparare giocando: le prime
   due file sono scritte a mano (tre verdi, poi una rossa nella tua
   corsia), davanti alla rossa il tempo quasi si ferma finché non trascini,
   e ogni passo della guida aspetta che il precedente sia successo.

   Qui la si gioca con un robot che fa avanzare il gioco a passi fissi di
   1/60 s — deterministico e veloce, senza dipendere dalla velocità del
   browser — e si controlla che ogni passo compaia, che il rallentatore
   parta e si fermi, e che la guida non torni alla seconda corsa.

   Serve Playwright:  npm i playwright
   uso: node tools/guida.js [percorso/index.html]
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
  const ctx = await b.newContext({ viewport: { width: 412, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'it-IT' });
  const p = await ctx.newPage();
  const errori = [];
  p.on('pageerror', e => errori.push(e.message));
  await p.goto(PAGINA);
  await p.waitForFunction(() => window.BlockyRun);

  /* 1. chi non ha mai giocato: la guida parte, le prime due file sono scritte */
  await p.click('#playBtn');
  const r = await p.evaluate(() => {
    const fila = z => items.filter(i => i.kind === 'pillar' && Math.abs(i.z - z) < 0.5)
      .sort((a, b) => a.x - b.x).map(i => i.hp <= damage() ? 'V' : 'R').join('');
    const out = { attiva: guida.attiva, fila0: fila(guida.z0), fila1: fila(guida.z1), passi: [] };
    const scritta = () => document.getElementById('guida').classList.contains('hidden') ? '' :
      document.getElementById('guidaTesto').textContent;
    let prima = '';
    let lentoVisto = false, ditoVisto = false;
    for (let i = 0; i < 6000 && state !== 'over'; i++) {
      update(1 / 60);
      const s = scritta();
      if (s && s !== prima) out.passi.push(s);
      prima = s;
      if (guida.lento) {
        lentoVisto = true;
        ditoVisto = ditoVisto || !document.getElementById('guidaDito').classList.contains('hidden');
        /* il giocatore, dopo un po', trascina a sinistra */
        if (!window.__attesa) window.__attesa = i;
        if (i - window.__attesa > 30) window.BlockyRun.moveTo(-2.4);
      }
      /* dopo la rossa, un robot che punta le verdi */
      if (guida.passo >= 2 && ['run', 'wall'].includes(state)) {
        const v = items.filter(it => !it.done && it.z < run.z && it.z > run.z - 25);
        const buono = v.find(it => it.kind === 'block') || v.find(it => it.kind === 'pillar' && it.hp <= damage());
        if (buono) window.BlockyRun.moveTo(buono.x);
      }
    }
    out.lento = lentoVisto; out.dito = ditoVisto;
    out.fatta = meta.guidaFatta; out.esito = run.outcome;
    return out;
  });
  ok(r.attiva, 'la guida non parte per chi non ha mai giocato');
  ok(r.fila0 === 'VVV', 'la prima fila non è tutta verde: ' + r.fila0);
  ok(r.fila1 === 'VRV', 'la seconda fila non ha la rossa in mezzo: ' + r.fila1);
  ok(r.lento && r.dito, 'davanti alla rossa il tempo non rallenta o il dito non compare');
  ok(r.passi.some(s => /VERDI/.test(s)) && r.passi.some(s => /ROSSE/.test(s)) &&
     r.passi.some(s => /Così/.test(s)) && r.passi.some(s => /COSTA/.test(s)), 'mancano dei passi');
  ok(r.fatta, 'a fine corsa la guida non risulta fatta');

  /* 2. la seconda corsa: niente guida */
  await p.evaluate(() => { showScreen('hub'); state = 'hub'; });
  await p.click('#playBtn');
  ok(!(await p.evaluate(() => guida.attiva)), 'la guida ricompare alla seconda corsa');

  for (const e of errori) male.push('errore JS: ' + e);
  await b.close();
  if (male.length) {
    console.error('PROVA FALLITA');
    for (const m of male) console.error('  · ' + m);
    process.exit(1);
  }
  console.log('prova superata · prima partita guidata, cinque passi, una volta sola');
})();
