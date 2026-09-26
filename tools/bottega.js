#!/usr/bin/env node
/* =====================================================================
   PROVA DELLA BOTTEGA E DELL'OBIETTIVO DEL GIORNO

   Le rune sono la valuta più rara del gioco: se ne guadagna una manciata
   per rinascita. Un vantaggio pagato due volte, o uno che non fa quello
   che promette, nessuno lo segnala — se ne accorge solo chi conta.

   Qui si controlla il giro completo: la pillola 🔮 compare solo con delle
   rune e si accende quando c'è qualcosa da comprare; comprare chiede due
   tocchi; spendere NON toglie il bonus (×2,75 con 7 rune resta ×2,75);
   ogni vantaggio fa davvero quello che dice (arma, seconda occasione,
   finestra del duello); senza rune abbastanza si dice quante mancano.
   E l'obiettivo del giorno paga i suoi diamanti una volta sola.

   Serve Playwright:  npm i playwright
   uso: node tools/bottega.js [percorso/index.html]
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

  /* --- la bottega --- */
  ok(await p.evaluate(() => document.getElementById('runePill').classList.contains('hidden')), 'la pillola delle rune si vede senza rune');
  await p.evaluate(() => { const G = window.BlockyRun; G.meta.runes = 7; G.meta.lastOutcome = 'win'; G.meta.level = 3; renderHub(); });
  ok(await p.evaluate(() => document.getElementById('runePill').classList.contains('spendi')), 'nessun puntino con 7 rune da spendere');
  await p.click('#runePill');
  await p.waitForTimeout(200);
  ok(await p.evaluate(() => !document.getElementById('bottega').classList.contains('hidden')), 'la bottega non si apre');
  const righe = p.locator('.bt-riga');
  ok(await righe.count() === 6, 'le righe della bottega non sono sei');
  await righe.nth(0).click();              // arma: primo tocco
  ok(await p.evaluate(() => window.BlockyRun.meta.bottega.arma) === 0, 'comprato al primo tocco');
  await righe.nth(0).click();              // secondo tocco: compra
  const dopo = await p.evaluate(() => ({ arma: meta.bottega.arma, spese: meta.runeSpese, libere: runeLibere(), molt: runeMul(meta.runes) }));
  ok(dopo.arma === 1 && dopo.spese === 2 && dopo.libere === 5, 'acquisto sbagliato: ' + JSON.stringify(dopo));
  ok(Math.abs(dopo.molt - 2.75) < 1e-9, 'spendere ha tolto bonus: ×' + dopo.molt);
  for (const k of [5, 5, 2, 2]) await righe.nth(k).click();   // pelle (3), mira (2)
  const tutto = await p.evaluate(() => ({ b: meta.bottega, libere: runeLibere(), revive: reviveCost(), finestra: finestraPerfetta(), base: DUELLO.perfetto }));
  ok(tutto.b.pelle === 1 && tutto.b.mira === 1 && tutto.libere === 0, 'pelle e mira non comprate: ' + JSON.stringify(tutto));
  ok(tutto.revive === 4, 'la seconda occasione non costa 4: ' + tutto.revive);
  ok(Math.abs(tutto.finestra - (tutto.base + 0.015)) < 1e-9,
     'la mano ferma non allarga la finestra di 15 ms: ' + tutto.base + ' → ' + tutto.finestra);
  await righe.nth(3).click();               // muro: costa 3, non ce ne sono
  ok(/MANCANO/.test(await p.textContent('#banner')), 'non dice che mancano rune');
  await p.click('#btChiudi');
  /* l'arma di famiglia in partita */
  await p.evaluate(() => { meta.up.weapon = 0; });
  await p.click('#playBtn');
  await p.waitForTimeout(300);
  ok(await p.evaluate(() => run.weapon) === 1, 'la partita non parte con l\'arma di famiglia');
  /* e la pista non offre armi peggiori o uguali: raccoglierle faceva scendere
     il colpo (Ascia di famiglia, Randello a terra: da 12 a 9) */
  const aTerra = await p.evaluate(() => items.filter(i => i.kind === 'weapon').map(i => i.tier));
  ok(aTerra.every(tier => tier > 1), 'a terra c\'è un\'arma non migliore di quella di famiglia: ' + aTerra);
  const giu = await p.evaluate(() => { const prima = run.weapon; takeWeapon({ tier: 0, obj: new THREE.Group() }); return [prima, run.weapon]; });
  ok(giu[1] === giu[0], 'raccogliere un\'arma peggiore fa scendere il colpo: ' + giu);
  ok(await p.evaluate(() => document.querySelector('.up-card[data-key="weapon"] .up-value').textContent === weaponName(1)),
     'la carta ARMA nel menù non mostra l\'arma di famiglia');
  await p.evaluate(() => { finishRun('wall'); });
  await p.waitForTimeout(1200);
  await p.evaluate(() => showScreen('hub'));

  /* --- l'obiettivo del giorno --- */
  const og = await p.evaluate(() => {
    const o = obiettivoOggi();
    const gemme = meta.gems;
    for (let i = 0; i < o.n + 5; i++) oggiConta(o.tipo, o.massimo ? i + 1 : 1);
    renderHub();
    return { tipo: o.tipo, n: o.n, preso: meta.oggi.preso, gemme: meta.gems - gemme,
             riga: document.getElementById('oggi').textContent.trim(),
             banner: document.querySelector('#banner b').textContent };
  });
  ok(og.preso && og.gemme === 6, 'obiettivo non pagato: ' + JSON.stringify(og));
  ok(/✓/.test(og.riga), 'la riga non dice fatto: ' + og.riga);
  const due = await p.evaluate(() => {
    const o = obiettivoOggi(), g = meta.gems;
    for (let i = 0; i < o.n * 2; i++) oggiConta(o.tipo, o.n);
    return meta.gems - g;
  });
  ok(due === 0, 'l\'obiettivo ha pagato due volte: +' + due + ' diamanti');
  await p.waitForTimeout(1800);

  for (const e of errori) male.push('errore JS: ' + e);
  await b.close();
  if (male.length) {
    console.error('PROVA FALLITA');
    for (const m of male) console.error('  · ' + m);
    process.exit(1);
  }
  console.log('prova superata · bottega comprata, vantaggi attivi, bonus intatto, obiettivo pagato una volta');
})();
