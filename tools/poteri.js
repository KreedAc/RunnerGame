#!/usr/bin/env node
/* =====================================================================
   PROVA DEI POTERI A TEMPO

   Tre poteri, tre promesse, e ognuna si controlla giocando a passo fisso:
   - FURIA: il colpo raddoppia, le colonne fuori portata diventano verdi,
     e a tempo scaduto tutto torna com'era;
   - SCUDO: la prima colonna rossa non costa potenza, e lo scudo si
     consuma — la seconda rossa costa normalmente;
   - CORVO: una moneta nella corsia accanto viene raccolta lo stesso.
   Poi: la plancia mostra i poteri attivi, e nel menù sparisce.

   Serve Playwright:  npm i playwright
   uso: node tools/poteri.js [percorso/index.html]
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
    meta.guidaFatta = true; meta.lastOutcome = 'wall'; meta.level = 3; rebuildHook();
    startRun();
    /* il ciclo del gioco si ferma: si avanza a mano, a passo fisso */
    const passo = window.update;
    window.update = () => {};
    const avanza = sec => { for (let i = 0; i < Math.round(sec * 60); i++) passo(1 / 60); };
    items.forEach(i => { i.done = true; if (i.obj) i.obj.visible = false; });
    const metti = (kind, extra, x, davanti) => {
      const z = run.z - davanti;
      let o;
      if (kind === 'potere') o = spawnPotere(x, z, extra.potere);
      else if (kind === 'pillar') o = spawnPillar(x, z, extra.hp);
      else o = spawnPickup(x, z, kind);
      const it = Object.assign({ kind, z, x, done: false }, extra, o);
      items.push(it);
      return it;
    };
    const esito = {};
    run.targetX = run.x = 0;

    /* FURIA */
    const d0 = damage();
    const dura = metti('pillar', { hp: Math.round(d0 * 1.6) }, 2.4, 80);
    metti('potere', { potere: 'furia' }, 0, 6);
    avanza(0.6);
    esito.furiaDanno = [d0, damage()];
    esito.furiaVerde = dura.sprite && run.poteri.furia > 0;
    esito.plancia = document.querySelectorAll('#poteri .po').length;
    avanza(POTERI.furia.dura + 0.2);
    esito.furiaFinita = [run.poteri.furia, damage()];

    /* SCUDO: due rosse di fila nella tua corsia */
    metti('potere', { potere: 'scudo' }, 0, 6);
    avanza(0.6);
    const hpRossa = damage() * 5;
    metti('pillar', { hp: hpRossa }, 0, 8);
    let prima = run.power;
    avanza(0.8);
    esito.scudo1 = [prima, run.power, run.poteri.scudo];
    metti('pillar', { hp: hpRossa }, 0, 8);
    prima = run.power;
    avanza(0.8);
    esito.scudo2 = [prima, run.power];

    /* CORVO: una moneta nella corsia di destra, l'eroe al centro */
    metti('potere', { potere: 'corvo' }, 0, 6);
    avanza(0.6);
    const oro0 = run.coins;
    metti('coin', {}, 2.4, 8);
    avanza(0.8);
    esito.corvo = [oro0, run.coins];
    /* e senza corvo, no */
    run.poteri.corvo = 0;
    const oro1 = run.coins;
    metti('coin', {}, 2.4, 8);
    avanza(0.8);
    esito.senzaCorvo = [oro1, run.coins];

    state = 'hub';
    passo(1 / 60);
    esito.planciaMenu = document.getElementById('poteri').classList.contains('hidden');
    window.update = passo;
    return esito;
  });

  ok(r.furiaDanno[1] === r.furiaDanno[0] * 2, 'la furia non raddoppia il colpo: ' + r.furiaDanno);
  ok(r.plancia >= 1, 'la plancia non mostra la furia');
  ok(r.furiaFinita[0] === 0 && r.furiaFinita[1] === r.furiaDanno[0], 'la furia non finisce: ' + r.furiaFinita);
  ok(r.scudo1[1] === r.scudo1[0] && r.scudo1[2] === 0, 'lo scudo non para la prima rossa: ' + r.scudo1);
  ok(r.scudo2[1] < r.scudo2[0], 'la seconda rossa non costa niente: lo scudo non si consuma ' + r.scudo2);
  ok(r.corvo[1] > r.corvo[0], 'il corvo non raccoglie dalla corsia accanto: ' + r.corvo);
  ok(r.senzaCorvo[1] === r.senzaCorvo[0], 'senza corvo la moneta accanto arriva lo stesso: ' + r.senzaCorvo);
  ok(r.planciaMenu, 'la plancia dei poteri resta nel menù');

  for (const e of errori) male.push('errore JS: ' + e);
  await b.close();
  if (male.length) {
    console.error('PROVA FALLITA');
    for (const m of male) console.error('  · ' + m);
    process.exit(1);
  }
  console.log('prova superata · furia ×2 e poi finisce, lo scudo para una rossa sola, il corvo raccoglie dalla corsia accanto');
})();
