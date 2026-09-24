#!/usr/bin/env node
/* =====================================================================
   PROVA DEL SALVATAGGIO DI RISERVA E DELL'ANTEPRIMA

   La partita vive nel localStorage: il codice di riserva è l'unico modo
   di portarla via. Se non torna indietro identica, o se un codice rotto
   carica mezza partita, chi se ne accorge l'ha già persa.

   Qui: si gioca un po' (valori a caso in ogni campo che conta), si copia
   il codice dal registro, si ricomincia da capo, si incolla il codice e
   tutto deve tornare com'era. Un codice con un carattere cambiato o
   troncato va rifiutato senza toccare niente. Caricare chiede due tocchi.
   Poi l'anteprima: in corsa mostra tre caselle, quelle della riga DOPO
   la prossima, e nel menù sparisce.

   Serve Playwright:  npm i playwright
   uso: node tools/riserva.js [percorso/index.html]
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

  /* --- una partita "giocata" --- */
  const prima = await p.evaluate(() => {
    Object.assign(meta, {
      coins: 12345, gems: 17, runes: 9, runeSpese: 4, level: 7, bestLevel: 9, rebirths: 2,
      best: 12, last: 9, lastOutcome: 'boss', skin: 2, skins: [0, 2, 3], guidaFatta: true,
      diary: [{ l: 1, t: 3, r: 0 }, { l: 2, t: 1, r: 1 }], tries: 4
    });
    meta.up = { power: 11, weapon: 4, income: 8 };
    meta.bottega.mira = 2; meta.bottega.pelle = 1;
    writeSave(meta); renderHub();
    return JSON.stringify(meta);
  });

  await p.click('#registroBtn');
  await p.waitForTimeout(150);
  ok(await p.evaluate(() => !document.getElementById('registro').classList.contains('hidden')), 'il registro non si apre');
  await p.click('#svCopia');
  await p.waitForTimeout(250);
  const codice = await p.evaluate(() => document.getElementById('svCodice').value);
  ok(/^TDG1\./.test(codice), 'il codice non ha la testa giusta: ' + codice.slice(0, 12));

  /* --- ricomincia da capo, dal registro: due tocchi --- */
  await p.click('#resetBtn');
  await p.click('#resetBtn');
  await p.waitForTimeout(200);
  ok(await p.evaluate(() => meta.level === 1 && meta.coins === 0), 'il ricomincia non ha azzerato');

  /* --- codici rotti: rifiutati, niente cambia --- */
  const rotti = [codice.slice(0, -3), codice.replace(/.(?=\.[^.]*$)/, c => c === 'A' ? 'B' : 'A'),
                 'ciao', '', 'TDG1..'];
  for (const r of rotti) {
    const esito = await p.evaluate(r => ({ letto: leggiCodice(r), level: meta.level }), r);
    ok(esito.letto === null && esito.level === 1, 'codice rotto accettato: ' + r.slice(0, 20));
  }

  /* --- incolla e carica: due tocchi --- */
  await p.click('#registroBtn');
  await p.click('#svIncolla');
  await p.fill('#svCodice', '  ' + codice.slice(0, 40) + '\n' + codice.slice(40) + '  ');   // spazi e a capo di una nota
  await p.click('#svCarica');
  ok(await p.evaluate(() => meta.level) === 1, 'caricato al primo tocco');
  await p.click('#svCarica');
  await p.waitForTimeout(250);
  const dopo = await p.evaluate(() => JSON.stringify(meta));
  const A = JSON.parse(prima), B = JSON.parse(dopo);
  for (const k of Object.keys(A)) {
    if (k === 'oggi') continue;                       // lo riscrive il menù col giorno di oggi
    ok(JSON.stringify(A[k]) === JSON.stringify(B[k]), 'dopo il carico ' + k + ' è ' +
       JSON.stringify(B[k]) + ' invece di ' + JSON.stringify(A[k]));
  }
  ok(await p.evaluate(() => document.getElementById('registro').classList.contains('hidden')),
     'il registro resta aperto dopo il carico');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem(SAVE_KEY)).level) === 7,
     'il carico non è stato scritto nel salvataggio');

  /* --- l'anteprima --- */
  const poi = await p.evaluate(() => {
    meta.lastOutcome = 'wall'; meta.guidaFatta = true;
    const G = window.BlockyRun;
    G.start();
    for (let i = 0; i < 30; i++) update(1 / 60);
    const inCorsa = { vista: !document.getElementById('poi').classList.contains('hidden'),
                      celle: document.querySelectorAll('#poiRiga .poi-c').length };
    return inCorsa;
  });
  ok(poi.vista && poi.celle === 3, 'l\'anteprima in corsa: ' + JSON.stringify(poi));

  for (const e of errori) male.push('errore JS: ' + e);
  await b.close();
  if (male.length) {
    console.error('PROVA FALLITA');
    for (const m of male) console.error('  · ' + m);
    process.exit(1);
  }
  console.log('prova superata · codice copiato, partita azzerata e ricaricata identica, codici rotti respinti, anteprima in corsa');
})();
