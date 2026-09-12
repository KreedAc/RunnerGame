#!/usr/bin/env node
/* =====================================================================
   PROVA DEGLI ASPETTI

   Le skin sono l'unica cosa, insieme alla seconda occasione, che tocca il
   portafoglio dei diamanti: un aspetto regalato o pagato due volte è un
   bug che nessuno segnala, se ne accorge solo chi conta i diamanti.

   Qui si controlla il giro completo: chiuso finché non si paga, due
   tocchi per comprare, i diamanti che scendono della cifra giusta,
   l'eroe che cambia davvero colore nella scena (non solo nel menù),
   la scelta che sopravvive al ricarico, il nome che si traduce e il
   ricomincia da capo che rimette l'aspetto di serie.

   Serve Playwright:  npm i playwright
   uso: node tools/skins.js [percorso/index.html]
   ===================================================================== */
'use strict';
const path = require('path');

let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  console.error('Serve Playwright per questa prova:  npm i playwright');
  process.exit(2);
}

const PAGINA = process.argv[2] ||
  'file://' + path.join(__dirname, '..', 'web', 'index.html');
const CROMO = process.env.CHROME_PATH ||
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const male = [];
const ok = (c, cosa) => { if (!c) male.push(cosa); };

(async () => {
  const b = await chromium.launch({ executablePath: CROMO, args: ['--use-gl=swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 412, height: 776 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'it-IT' });
  const p = await ctx.newPage();
  const errori = [];
  p.on('pageerror', e => errori.push(e.message));
  await p.goto(PAGINA);
  await p.waitForFunction(() => window.BlockyRun);

  /* i colori dell'eroe, come li vede davvero la scena */
  const tinte = () => p.evaluate(() => {
    const c = new Set();
    hero.traverse(o => { if (o.isMesh && o.material && o.material.color) c.add(o.material.color.getHexString()); });
    return [...c].sort().join(',');
  });

  const prima = await tinte();
  ok(await p.textContent('#skName') === 'VICHINGO', 'il nome di serie non e\' VICHINGO');
  ok(await p.locator('.sk').count() === 5, 'le pastiglie non sono cinque');
  ok(await p.locator('.sk.locked').count() === 4, 'gli aspetti chiusi non sono quattro');

  /* senza diamanti non si compra */
  await p.locator('.sk').nth(1).click();
  const prezzo = await p.textContent('#skName');
  ok(/💎15/.test(prezzo), 'il primo tocco non mostra il prezzo: ' + prezzo);
  await p.locator('.sk').nth(1).click();
  ok(await p.evaluate(() => window.BlockyRun.meta.skin) === 0, 'comprato senza diamanti!');
  ok(/MANCANO/.test(await p.textContent('#banner')), 'non dice quanti diamanti mancano');

  /* con i diamanti si compra al secondo tocco */
  await p.evaluate(() => { window.BlockyRun.meta.gems = 200; renderHub(); });
  await p.locator('.sk').nth(3).click();
  await p.locator('.sk').nth(3).click();
  const dopo = await p.evaluate(() => ({
    skin: window.BlockyRun.meta.skin,
    gems: window.BlockyRun.meta.gems,
    avuti: window.BlockyRun.meta.skins.slice(),
    nome: document.getElementById('skName').textContent,
    accese: document.querySelectorAll('.sk.on').length
  }));
  ok(dopo.skin === 3, 'non si e\' indossato quello comprato');
  ok(dopo.gems === 130, 'i diamanti non sono scesi di 70: ' + dopo.gems);
  ok(dopo.avuti.join() === '3', 'la lista dei comprati e\' sbagliata: ' + dopo.avuti);
  ok(dopo.accese === 1, 'pastiglie accese: ' + dopo.accese);
  const cambiata = await tinte();
  ok(cambiata !== prima, 'l\'eroe non ha cambiato colore');

  /* tornare al vichingo, che e\' di tutti, con un tocco solo */
  await p.locator('.sk').nth(0).click();
  ok(await p.evaluate(() => window.BlockyRun.meta.skin) === 0, 'non si torna all\'aspetto di serie');
  ok(await tinte() === prima, 'tornando al vichingo i colori non tornano');

  /* e resta dopo un ricarico */
  await p.evaluate(() => { window.BlockyRun.meta.skin = 3; writeSave(window.BlockyRun.meta); });
  await p.reload();
  await p.waitForFunction(() => window.BlockyRun);
  const dopoRicarico = await p.evaluate(() => ({
    skin: window.BlockyRun.meta.skin, nome: document.getElementById('skName').textContent
  }));
  ok(dopoRicarico.skin === 3, 'l\'aspetto non sopravvive al ricarico');
  ok(await tinte() === cambiata, 'dopo il ricarico l\'eroe non ha l\'aspetto salvato');

  /* la lingua traduce anche i nomi */
  await p.evaluate(() => setLang('en'));
  ok(await p.textContent('#skName') === 'NIGHTWATCH', 'il nome non si traduce: ' + await p.textContent('#skName'));

  /* il ricomincia da capo rimette il vichingo */
  await p.evaluate(() => { tapReset(); tapReset(); });
  await p.waitForTimeout(300);
  ok(await p.evaluate(() => window.BlockyRun.meta.skin) === 0, 'il reset non rimette l\'aspetto di serie');
  ok(await tinte() === prima, 'dopo il reset l\'eroe non e\' tornato quello di serie');

  for (const e of errori) male.push('errore JS: ' + e);
  await b.close();

  if (male.length || errori.length) {
    console.error('PROVA FALLITA');
    for (const m of male) console.error('  · ' + m);
    process.exit(1);
  }
  console.log('prova superata · cinque aspetti · comprati, indossati, salvati e tradotti');
})();
