#!/usr/bin/env node
/* =====================================================================
   PROVA DELLE IMPRESE

   - una partita nuova non ha imprese fatte, e il bottone lo dice (0/13);
   - chi giocava già (torre 9, una rinascita) all'avvio si vede
     riconoscere le torri e la rinascita: diamanti pagati, l'aspetto del
     Campione sbloccato, e nessuna targhetta a raffica;
   - un'impresa pagata non si paga due volte;
   - in corsa: la targhetta scende quando se ne fa una;
   - il pannello mostra tutte e tredici, le fatte in fondo;
   - le imprese sopravvivono al codice di riserva.

   Serve Playwright:  npm i playwright
   uso: node tools/imprese.js [percorso/index.html]
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
  const ctx = await b.newContext({ viewport: { width: 412, height: 780 }, isMobile: true, hasTouch: true, locale: 'it-IT' });
  const p = await ctx.newPage();
  const errori = [];
  p.on('pageerror', e => errori.push(e.message));
  await p.goto(PAGINA);
  await p.waitForFunction(() => window.BlockyRun);

  /* --- partita nuova --- */
  const nuova = await p.evaluate(() => ({
    fatte: Object.keys(meta.imprese.fatte).length,
    bottone: document.getElementById('registroTesto').textContent,
    gemme: meta.gems
  }));
  ok(nuova.fatte === 0, 'una partita nuova ha già ' + nuova.fatte + ' imprese');
  ok(/0\/13/.test(nuova.bottone), 'il bottone non dice 0/13: ' + nuova.bottone);

  /* --- chi giocava già: si salva una partita "vecchia" e si ricarica --- */
  await p.evaluate(() => {
    const vecchia = Object.assign(defaultSave(), { level: 9, bestLevel: 9, rebirths: 1, gems: 5 });
    delete vecchia.imprese;
    localStorage.setItem(SAVE_KEY, JSON.stringify(vecchia));
  });
  await p.reload();
  await p.waitForFunction(() => window.BlockyRun);
  await p.waitForTimeout(300);
  const vecchia = await p.evaluate(() => ({
    fatte: Object.keys(meta.imprese.fatte).sort(),
    gemme: meta.gems,
    campione: skinOwned(4),
    targhetta: document.getElementById('impresaToast').classList.contains('su'),
    bottone: document.getElementById('registroTesto').textContent
  }));
  ok(vecchia.fatte.join() === 'giro,rinascita,torre5',
     'riconosciute all\'avvio: ' + vecchia.fatte.join() + ' invece di giro,rinascita,torre5');
  ok(vecchia.gemme === 5 + 10 + 15 + 10, 'i diamanti delle imprese riconosciute: ' + vecchia.gemme);
  ok(vecchia.campione, 'il giro del regno non sblocca il Campione');
  ok(!vecchia.targhetta, 'all\'avvio parte una targhetta: dovevano essere zitte');
  ok(/3\/13/.test(vecchia.bottone), 'il bottone non dice 3/13: ' + vecchia.bottone);

  /* --- niente doppio pagamento, e la targhetta in corsa --- */
  const corsa = await p.evaluate(() => {
    const g0 = meta.gems;
    impreseRecupera();
    const doppio = meta.gems - g0;
    impresaConta('nemici', 99);
    const prima = meta.imprese.fatte.nemici;
    impresaConta('nemici', 1);
    return { doppio, prima: !!prima, dopo: !!meta.imprese.fatte.nemici, gemme: meta.gems - g0 };
  });
  ok(corsa.doppio === 0, 'le imprese si pagano due volte: +' + corsa.doppio);
  ok(!corsa.prima && corsa.dopo && corsa.gemme === 6, 'cento nemici: ' + JSON.stringify(corsa));
  await p.waitForTimeout(250);
  ok(await p.evaluate(() => document.getElementById('impresaToast').classList.contains('su')),
     'la targhetta dell\'impresa non scende');

  /* --- il massimo: la serie più lunga conta, non la somma --- */
  const serie = await p.evaluate(() => {
    impresaMassimo('serie', 9); impresaMassimo('serie', 6);
    const a = impresaConto('serie');
    impresaMassimo('serie', 15);
    return { a, fatta: !!meta.imprese.fatte.serie };
  });
  ok(serie.a === 9 && serie.fatta, 'la serie non tiene il massimo: ' + JSON.stringify(serie));

  /* --- il pannello --- */
  await p.waitForTimeout(3200);               // le targhette finiscono
  await p.click('#registroBtn');
  await p.waitForTimeout(200);
  const pannello = await p.evaluate(() => {
    const voci = [...document.querySelectorAll('#rgImprese .imp')];
    return { n: voci.length, fatte: voci.filter(v => v.classList.contains('fatta')).length,
             ultimaFatta: voci.length && voci[voci.length - 1].classList.contains('fatta'),
             primaFatta: voci.length && voci[0].classList.contains('fatta') };
  });
  ok(pannello.n === 13, 'il pannello mostra ' + pannello.n + ' imprese');
  ok(pannello.fatte === 5 && pannello.ultimaFatta && !pannello.primaFatta,
     'le fatte non stanno in fondo: ' + JSON.stringify(pannello));

  /* --- sopravvivono al codice di riserva --- */
  const riserva = await p.evaluate(() => {
    const codice = codiceSalvataggio(meta);
    const letto = leggiCodice(codice);
    return Object.keys(letto.imprese.fatte).sort().join();
  });
  ok(riserva === 'giro,nemici,rinascita,serie,torre5', 'il codice di riserva perde le imprese: ' + riserva);

  for (const e of errori) male.push('errore JS: ' + e);
  await b.close();
  if (male.length) {
    console.error('PROVA FALLITA');
    for (const m of male) console.error('  · ' + m);
    process.exit(1);
  }
  console.log('prova superata · tredici imprese, riconosciute a chi giocava già, pagate una volta, nel pannello e nel codice');
})();
