#!/usr/bin/env node
/* =====================================================================
   PROVA DEL FUMO

   Gioca una corsa intera con un autopilota e controlla che il gioco non
   si rompa. Nasce da un bug vero: il premio degli scrigni moltiplicava
   un campo che non esisteva, `Math.round(undefined * x)` faceva NaN, e
   il NaN si è propagato fino al salvataggio — oro sparito dal
   portafoglio e nessun potenziamento più comprabile.

   Nessuna prova lo aveva preso perché nessuna guardava i numeri: si
   controllava che la corsa finisse, non che finisse con dei numeri veri.
   Da qui la regola di questo file: **ogni numero che il giocatore vede
   deve essere finito**, durante la corsa e dentro il salvataggio.

   Serve Playwright. Da questa cartella:  npm i playwright
   uso: node tools/smoke.js [percorso/index.html]
   ===================================================================== */
'use strict';
const path = require('path');

let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  console.error('Serve Playwright per questa prova:  npm i playwright');
  process.exit(2);
}

/* Prima di tutto: il simulatore riconosce ancora il gioco? È lo strumento
   con cui si tara la difficoltà, e ha il suo controllo — si ferma se una
   costante sparisce — ma quel controllo scatta solo se qualcuno lo lancia.
   Dopo la traduzione nessuno l'ha lanciato per settimane, ed era rotto.
   Caricarlo qui costa un millisecondo e lo fa scattare a ogni prova. */
require('./sim.js');

const PAGINA = process.argv[2] ||
  'file://' + path.join(__dirname, '..', 'web', 'index.html');
const CROMO = process.env.CHROME_PATH ||
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const problemi = [];
const controlla = (ok, cosa) => { if (!ok) problemi.push(cosa); };

(async () => {
  const browser = await chromium.launch({
    executablePath: CROMO, args: ['--use-gl=swiftshader']
  });
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 776 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true
  });
  const p = await ctx.newPage();
  const errori = [];
  p.on('pageerror', e => errori.push(e.message));

  await p.goto(PAGINA);
  await p.waitForFunction(() => window.BlockyRun, null, { timeout: 30000 });

  /* I numeri schizzano dal punto colpito, che è una proiezione sullo
     schermo: se l'oggetto colpito non ha una posizione valida ne esce
     "NaN%", il browser lo ignora in silenzio e il numero torna al centro
     senza che nessuno se ne accorga. Qui si guardano tutti. */
  await p.evaluate(() => {
    window.__pop = [];
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
      if (n.classList && n.classList.contains('pop'))
        window.__pop.push({ testo: n.textContent,
                            x: parseFloat(n.style.left), y: parseFloat(n.style.top) });
    }))).observe(document.getElementById('pops'), { childList: true });
  });

  /* qualche diamante in cassa: così si prova anche la seconda occasione */
  await p.evaluate(() => { window.BlockyRun.meta.gems = 9; renderHub(); });
  await p.click('#playBtn');

  /* autopilota: la corsia che rende di più, e nel muro lo scrigno */
  await p.evaluate(() => {
    const G = window.BlockyRun;
    window.__ai = setInterval(() => {
      if (!['run', 'wall'].includes(G.state)) return;
      const z = G.run.z;
      const vicini = G.items.filter(i => !i.done && i.z < z && i.z > z - 34);
      if (!vicini.length) return;
      const bersaglio = Math.max(...vicini.map(i => i.z));
      const riga = vicini.filter(i => Math.abs(i.z - bersaglio) < 3);
      const colpo = G.damage;
      const punti = it => {
        if (it.kind === 'weapon') return 1e9;
        if (it.kind === 'buff')   return 1e6;
        if (it.kind === 'block')  return it.chest ? 1e7 : 1e6 - it.cost;
        if (it.kind === 'coin' || it.kind === 'gem') return 10;
        if (it.hp > colpo) return -1e6;
        return it.kind === 'enemy' ? it.hp * 1.5 : it.hp * 3;
      };
      let dove = null, meglio = -Infinity;
      for (const lx of G.CFG.laneX) {
        const qui = riga.filter(i => Math.abs(i.x - lx) < 0.6);
        const s = qui.length ? qui.reduce((a, i) => a + punti(i), 0) : 0;
        if (s > meglio) { meglio = s; dove = lx; }
      }
      if (dove !== null) G.moveTo(dove);
    }, 16);
  });

  /* Il renderer software fa pochi fotogrammi, e a ogni fotogramma il gioco
     avanza al massimo 0,05 s: su una macchina carica la corsa durava più
     di tre minuti. La spinta fa avanzare la logica a passo fisso, come nelle
     altre prove, e rende la durata indipendente dagli FPS. */
  await p.evaluate(() => {
    const G = window.BlockyRun;
    window.__spinta = setInterval(() => {
      if (['run', 'wall', 'boss'].includes(G.state)) for (let i = 0; i < 4; i++) update(1 / 60);
    }, 50);
  });

  /* se compare la seconda occasione si accetta: va provata anche quella */
  const finita = p.waitForFunction(
    () => ['over', 'hub'].includes(window.BlockyRun.state), null, { timeout: 180000 });
  const offerta = p.waitForFunction(
    () => window.BlockyRun.state === 'offer', null, { timeout: 180000 })
    .then(() => p.click('#rvGo')).catch(() => {});
  await Promise.race([finita, offerta]);
  await finita;
  await p.waitForTimeout(1500);        // il tempo che la scossa finisca

  const r = await p.evaluate(() => {
    const G = window.BlockyRun;
    /* la scossa si spegne in tempo di gioco: sul renderer software 1,5 s
       veri possono essere pochi fotogrammi. Due secondi a passo fisso. */
    for (let i = 0; i < 120; i++) update(1 / 60);
    /* ogni numero che il giocatore vede, più quelli che finiscono su disco */
    const numeri = {};
    for (const k of ['power', 'coins', 'gems', 'broken', 'unit', 'bossHp'])
      numeri['run.' + k] = G.run[k];
    for (const k of ['coins', 'gems', 'runes', 'level', 'best', 'last', 'lastCoins', 'tries'])
      numeri['meta.' + k] = G.meta[k];
    for (const k of Object.keys(G.meta.up)) numeri['up.' + k] = G.meta.up[k];
    const scritti = localStorage.getItem(SAVE_KEY) || '';
    return {
      numeri, esito: G.run.outcome, muro: G.run.broken,
      salvataggio: scritti,
      pop: window.__pop,
      /* lo scostamento della scossa: va tolto, non accumulato */
      scossa: [scossaOff.x, scossaOff.y, scossaOff.z],
      /* quello che il giocatore legge davvero sullo schermo */
      schermo: [...document.querySelectorAll('#hub .up-cost, #hubCoins, #hubGems, #lrCoins, #lrDepth')]
                 .map(e => e.textContent).join(' ')
    };
  });

  for (const [nome, v] of Object.entries(r.numeri))
    controlla(typeof v === 'number' && isFinite(v), `${nome} non è un numero: ${v}`);
  controlla(!/NaN|undefined|Infinity/.test(r.schermo), `sullo schermo si legge: ${r.schermo}`);
  controlla(!/NaN|null/.test(r.salvataggio), `salvataggio sporco: ${r.salvataggio}`);
  controlla(['wall', 'boss', 'win'].includes(r.esito), `esito strano: ${r.esito}`);
  controlla(r.muro > 0, 'la corsa non ha rotto nemmeno un blocco del muro');
  controlla(r.pop.length > 0, 'in tutta la corsa non è comparso un numero');
  for (const q of r.pop)
    controlla(isFinite(q.x) && isFinite(q.y) && q.x > 0 && q.x < 100 && q.y > 0 && q.y < 100,
              `numero fuori schermo: "${q.testo}" a ${q.x}%, ${q.y}%`);
  controlla(r.scossa.every(v => Math.abs(v) < 0.001),
            'la camera è rimasta scostata dopo la scossa: ' + r.scossa.join(', '));
  controlla(errori.length === 0, 'errori JS: ' + errori.join(' / '));

  /* ---- la seconda occasione si vende solo se può servire ----
     Nasce da un caso vero: sfondato l'ultimo blocco del muro con la
     potenza a zero, il gioco offriva "+1 potenza" per cinque diamanti. */
  async function siOffre(prepara) {
    const q = await ctx.newPage();
    await q.goto(PAGINA);
    await q.waitForFunction(() => window.BlockyRun);
    await q.evaluate(() => { window.BlockyRun.meta.gems = 20; renderHub(); });
    await q.click('#playBtn');
    await q.waitForTimeout(300);
    await q.evaluate(prepara);
    await q.waitForTimeout(300);
    const c = await q.evaluate(() => ({
      mostrata: !document.getElementById('revive').classList.contains('hidden'),
      quanta: window.BlockyRun.run.phaseStart
    }));
    await q.close();
    return c.mostrata;
  }

  const inutile = await siOffre(() => {
    const G = window.BlockyRun;
    G.items.forEach(i => { if (i.kind !== 'block') { i.done = true; i.obj.visible = false; } });
    G.run.broken = 30; G.run.phaseStart = 0; G.run.bossHp = 1114;
    G.setPower(0); endRun('boss');
  });
  const utile = await siOffre(() => {
    const G = window.BlockyRun;
    G.run.broken = 30; G.run.phaseStart = 900; G.run.bossHp = 300;
    G.setPower(0); endRun('boss');
  });
  controlla(!inutile, 'la seconda occasione si offre anche quando non può cambiare niente');
  controlla(utile, 'la seconda occasione NON si offre quando servirebbe');

  /* ---- la camera non attraversa mai il paesaggio ----
     Nasce da un caso vero: nella Bocca di Fuoco il fianco di un vulcano
     invadeva la pista e per un secondo la camera ci passava dentro — schermo
     marrone, "un pezzo di montagna". Nessuna prova guardava la geometria.

     Qui si costruisce ogni zona e si fa passare la camera lungo il suo
     percorso vero (corsa, duello, salita sulla torre), controllando per ogni
     forma del mondo se il punto ci cade dentro. Le forme sono primitive di
     lato 1 scalate, quindi basta portare il punto nello spazio locale della
     forma e confrontarlo con la primitiva: esatto, non una scatola larga. */
  const q = await ctx.newPage();
  await q.goto(PAGINA);
  await q.waitForFunction(() => window.BlockyRun);
  const zone = await q.evaluate(() => THEMES.length);
  for (let livello = 1; livello <= zone; livello++) {
    const dentro = await q.evaluate(lv => {
      const G = window.BlockyRun;
      G.meta.level = lv;
      /* Il paesaggio è casuale, e il vulcano storto usciva in 4 mondi su 30:
         con quattro costruzioni per zona questa prova lo mancava una volta
         su due, ed è infatti passata la prima volta. Con venticinque lo manca
         il 3% delle volte. Costa ~90 ms a mondo. */
      const colpiti = [];
      for (let prova = 0; prova < 25; prova++) {
        rebuildHook();
        const tipo = new Map([
          [GEO.box, 'box'], [GEO.cyl, 'cil'], [GEO.cyl8, 'cil'], [GEO.cyl12, 'cil'],
          [GEO.taper, 'cil'], [GEO.cone, 'cono'], [GEO.cone6, 'cono'],
          [GEO.sph, 'sfera'], [GEO.sph8, 'sfera'], [GEO.octa, 'otta']
        ]);
        const forme = [];
        world.updateMatrixWorld(true);
        world.traverse(o => { if (o.isMesh && tipo.has(o.geometry)) forme.push(o); });
        const inv = forme.map(o => new THREE.Matrix4().copy(o.matrixWorld).invert());
        const cade = (p, k) => {
          const l = p.clone().applyMatrix4(inv[k]);
          const t = tipo.get(forme[k].geometry);
          if (t === 'box')   return Math.abs(l.x) <= 0.5 && Math.abs(l.y) <= 0.5 && Math.abs(l.z) <= 0.5;
          if (t === 'sfera') return l.length() <= 0.5;
          if (t === 'otta')  return Math.abs(l.x) + Math.abs(l.y) + Math.abs(l.z) <= 0.5;
          if (Math.abs(l.y) > 0.5) return false;
          const r = Math.hypot(l.x, l.z);
          return t === 'cil' ? r <= 0.5 : r <= 0.5 * (0.5 - l.y);   // cono: punta in alto
        };
        /* il percorso della camera: corsa (tre corsie), duello, salita */
        const punti = [];
        for (let z = 14; z > towerZ + 24; z -= 1.5)
          for (const x of [-1, 0, 1]) punti.push(new THREE.Vector3(x, 6.2, z));
        punti.push(new THREE.Vector3(5, 7.4, bossZ + 23));
        for (let k = 0; k <= 10; k++) {
          const f = k / 10;
          punti.push(new THREE.Vector3(5 + 2 * f, 7.4 + 14.6 * f, bossZ + 23 + (towerZ + 26 - bossZ - 23) * f));
        }
        for (const p of punti) for (let k = 0; k < forme.length; k++) {
          if (cade(p, k)) {
            const o = forme[k];
            colpiti.push(tipo.get(o.geometry) + ' largo ' + o.scale.x.toFixed(0) +
                         ' a x=' + o.position.x.toFixed(0) + ' (camera a z=' + p.z.toFixed(0) + ')');
            break;
          }
        }
      }
      return { zona: t(themeFor(lv).key), colpiti };
    }, livello);
    controlla(!dentro.colpiti.length,
      `nella ${dentro.zona} la camera attraversa il paesaggio ${dentro.colpiti.length} volte: ` +
      dentro.colpiti.slice(0, 2).join('; '));
  }
  await q.close();

  await browser.close();

  if (problemi.length) {
    console.error('PROVA FALLITA');
    for (const x of problemi) console.error('  · ' + x);
    process.exit(1);
  }
  console.log(`prova superata · esito ${r.esito} · muro ${r.muro}/30 · ` +
              `oro ${r.numeri['meta.coins']} · ${r.pop.length} numeri a posto · ` +
              `nessun numero rotto`);
})();
