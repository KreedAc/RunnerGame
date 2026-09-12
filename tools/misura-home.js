#!/usr/bin/env node
/* =====================================================================
   QUANTO È ALTA LA HOME

   Il menù cresce un pezzo alla volta — una riga di bandierine, una fila
   di aspetti, il diario — e nessuna di quelle aggiunte sembra importante
   mentre la si fa. Poi un giorno il diario finisce sotto la piega e chi
   gioca deve scrollare per vedere il proprio punteggio.

   Questo conta i pixel: quanto serve, quanto ce n'è, e chi se li prende.
   Da lanciare quando si aggiunge qualcosa al menù, non quando qualcuno
   si lamenta.

   uso: node tools/misura-home.js [altezza dello schermo, default 720]
   ===================================================================== */
'use strict';
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Serve Playwright:  npm i playwright'); process.exit(2); }
const PAGINA = 'file://' + path.join(__dirname, '..', 'web', 'index.html');
const CROMO = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

(async () => {
  const b = await chromium.launch({ executablePath: CROMO, args: ['--use-gl=swiftshader'] });
  /* il telefono dello screenshot: 412x776 di pagina, con la barra del browser */
  const ctx = await b.newContext({ viewport: { width: 412, height: parseInt(process.argv[2] || 720) }, isMobile: true, hasTouch: true, locale: 'it-IT' });
  const p = await ctx.newPage();
  await p.goto(PAGINA);
  await p.waitForFunction(() => window.BlockyRun);

  for (const [nome, prep] of [
    ['prima partita', () => {}],
    ['torre 6, con rinascita e diario', () => {
      const G = window.BlockyRun;
      G.meta.level = 6; G.meta.bestLevel = 6; G.meta.coins = 4000; G.meta.gems = 12;
      G.meta.up = { power: 13, weapon: 2, income: 9 };
      G.meta.lastOutcome = 'win'; G.meta.last = 0; G.meta.lastCoins = 2446; G.meta.lastRecord = true;
      G.meta.tries = 1;
      G.meta.diary = [{l:1,t:5,r:0},{l:2,t:1,r:0},{l:3,t:2,r:0},{l:4,t:2,r:0},{l:5,t:2,r:1}];
      renderHub();
    }]
  ]) {
    await p.evaluate(prep);
    await p.waitForTimeout(250);
    const r = await p.evaluate(() => {
      const h = document.getElementById('hub');
      const pezzi = {};
      for (const [n, sel] of [['titolo', '.hub-title'], ['storia', '.story'], ['riepilogo', '#lastRun'],
                              ['suggerimento', '#hubHint'], ['spazio', '.spacer'], ['rinascita', '#rebirthCard'],
                              ['gioca', '.play-wrap'], ['potenziamenti', '#upgrades'], ['aspetti', '.skins'],
                              ['fondo', '.fondo'], ['diario', '#diary'],
                              ['build', '.build-tag']]) {
        const e = document.querySelector(sel);
        if (!e || e.classList.contains('hidden')) continue;
        const st = getComputedStyle(e);
        pezzi[n] = Math.round(e.getBoundingClientRect().height +
                   parseFloat(st.marginTop) + parseFloat(st.marginBottom));
      }
      return { scroll: h.scrollHeight, visibile: h.clientHeight, pezzi };
    });
    console.log('\n' + nome + ': serve ' + r.scroll + 'px, ce ne sono ' + r.visibile + ' → ' +
                (r.scroll > r.visibile ? 'SFORA di ' + (r.scroll - r.visibile) + 'px' : 'ci sta'));
    for (const [n, v] of Object.entries(r.pezzi)) console.log('   ' + n.padEnd(16), v);
  }
  await b.close();
})();
