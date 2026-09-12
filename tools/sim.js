#!/usr/bin/env node
/* =====================================================================
   SIMULATORE DELL'ECONOMIA

   Gioca centinaia di progressioni complete in un secondo e dice quanti
   tentativi costa ogni torre. È lo strumento con cui è stata tarata la
   difficoltà: senza, ogni modifica al bilanciamento sarebbe un'opinione.

   Legge le costanti direttamente da web/src/core.js, così non può
   raccontare di un gioco diverso da quello che si gioca davvero. Se una
   costante cambia nome o sparisce, si ferma invece di tirare a indovinare.

   Il giocatore che simula NON è quello che massimizza ogni singola riga:
   è quello osservato su una partita vera, che è più bravo. Vedi §2i in
   docs/DESIGN.md.

   uso: node tools/sim.js [torre massima] [progressioni]
   ===================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

/* ------------------- le costanti, lette dal gioco --------------------- */
const radice = path.join(__dirname, '..');
const core = fs.readFileSync(path.join(radice, 'web/src/core.js'), 'utf8');
const game = fs.readFileSync(path.join(radice, 'web/src/game.js'), 'utf8');

function num(testo, regex, nome) {
  const m = testo.match(regex);
  if (!m) {
    console.error(`Il simulatore non trova più "${nome}" nei sorgenti.\n` +
                  'Qualcuno ha cambiato il gioco senza aggiornare tools/sim.js:\n' +
                  'meglio fermarsi che misurare un gioco che non esiste.');
    process.exit(1);
  }
  return parseFloat(m[1]);
}

const G = {
  torreBase : num(core, /towerNeed\s*=\s*lvl\s*=>\s*Math\.round\((\d+(?:\.\d+)?)\s*\*/, 'towerNeed base'),
  torreCresc: num(core, /towerNeed[^;]*Math\.pow\((\d+(?:\.\d+)?),/, 'towerNeed crescita'),
  quotaMuro : num(core, /wallBudget\s*=\s*lvl\s*=>\s*Math\.round\(towerNeed\(lvl\)\s*\*\s*(\d*\.?\d+)\)/, 'wallBudget'),
  baseShare : num(core, /BASE_SHARE\s*=\s*(\d*\.?\d+)/, 'BASE_SHARE'),
  levelGap  : num(core, /LEVEL_GAP\s*=\s*(\d*\.?\d+)/, 'LEVEL_GAP'),
  potenzaIni: num(core, /START_POWER\s*=\s*(\d+)/, 'START_POWER'),
  righeMuro : num(core, /wallRows\s*:\s*(\d+)/, 'CFG.wallRows'),

  armi: (core.match(/hit:\s*\d*\.?\d+/g) || []).map(s => parseFloat(s.split(':')[1])),

  pot: { base: num(core, /power\s*:\s*\{\s*name:\s*'POTENZA',\s*base:\s*(\d+)/, 'POTENZA base'),
         mult: num(core, /name:\s*'POTENZA',\s*base:\s*\d+,\s*mult:\s*(\d*\.?\d+)/, 'POTENZA mult'),
         step: num(core, /'POTENZA'[^}]*Math\.pow\((\d*\.?\d+)/, 'POTENZA passo') },
  arma:{ base: num(core, /weapon:\s*\{\s*name:\s*'ARMA',\s*base:\s*(\d+)/, 'ARMA base'),
         mult: num(core, /name:\s*'ARMA',\s*base:\s*\d+,\s*mult:\s*(\d*\.?\d+)/, 'ARMA mult') },
  oro: { base: num(core, /income\s*:\s*\{\s*name:\s*'ORO',\s*base:\s*(\d+)/, 'ORO base'),
         mult: num(core, /name:\s*'ORO',\s*base:\s*\d+,\s*mult:\s*(\d*\.?\d+)/, 'ORO mult'),
         step: num(core, /'ORO'[^}]*Math\.pow\((\d*\.?\d+)/, 'ORO passo') },

  buffAttacco: num(core, /rate\s*:\s*\{[^}]*step:\s*(\d*\.?\d+)/, 'buff attacco'),
  buffPotenza: num(core, /gain\s*:\s*\{[^}]*step:\s*(\d*\.?\d+)/, 'buff potenza'),
  buffOro    : num(core, /income:\s*\{[^}]*step:\s*(\d*\.?\d+)/, 'buff oro'),

  /* dalla generazione della pista */
  nemicoProb : num(game, /Math\.random\(\)\s*<\s*(\d*\.?\d+)\)\s*\{\s*\n?\s*const hp/, 'probabilità nemico'),
  corsia3Prob: num(game, /corsia 3[\s\S]{0,200}?Math\.random\(\)\s*<\s*(\d*\.?\d+)\)/, 'probabilità corsia 3'),
  bonusProb  : num(game, /Math\.random\(\)\s*<\s*(\d*\.?\d+)\)\s*\{\s*\n?\s*const kind\s*=\s*pick/, 'probabilità bonus'),
  scrignoProb: num(game, /const chest\s*=\s*Math\.random\(\)\s*<\s*(\d*\.?\d+)/, 'probabilità scrigno'),
  premioVinta: num(game, /outcome === 'win' \? Math\.round\((\d+)\s*\*\s*meta\.level/, 'premio vittoria')
};

const torreNeed  = l => Math.round(G.torreBase * Math.pow(G.torreCresc, l - 1));
const budgetMuro = l => Math.round(torreNeed(l) * G.quotaMuro);
const vitaBoss   = l => Math.round(torreNeed(l) * (1 - G.quotaMuro));
const righe      = l => Math.min(20, 10 + l);
const passo      = l => torreNeed(l) * G.baseShare /
                        (righe(l) * 3 * 0.75 * Math.pow(G.levelGap, l - 1));
const costoUp = (k, l) => Math.round(G[k].base * Math.pow(G[k].mult, l));

/* ----------------------------- il caso ------------------------------- */
let SEME = 1;
const caso = () => { SEME = (SEME * 1103515245 + 12345) & 0x7fffffff; return SEME / 0x7fffffff; };
const fra = (a, b) => a + caso() * (b - a);

/* ---------------------------- UNA CORSA -------------------------------
   `stile` cambia il giocatore:
     'perfetto' prende sempre l'arma e nel muro sempre il blocco più
                economico — è il giocatore che non esiste;
     'umano'    salta l'arma quando il colpo gli apre già le colonne, nel
                muro punta gli scrigni e sbaglia corsia un terzo delle
                volte. È quello misurato su una partita vera.            */
function corsa(m, stile) {
  const u = passo(m.level);
  let potenza = G.potenzaIni, arma = m.up.arma, oro = 0, rotti = 0;
  const bonus = { oro: 0, attacco: 0, potenza: 0 };

  const colpo = () => G.armi[arma] * u * (1 + bonus.attacco * G.buffAttacco);
  const molPot = () => Math.pow(G.pot.step, m.up.pot) * (1 + bonus.potenza * G.buffPotenza)
                       * (1 + (m.rune || 0) * 0.25);
  const molOro = () => Math.pow(G.oro.step, m.up.oro) * (1 + bonus.oro * G.buffOro)
                       * (1 + (m.rune || 0) * 0.25);

  const n = righe(m.level);
  let tierPista = m.up.arma;
  for (let i = 0; i < n; i++) {
    const A = { t: 'colonna', hp: Math.max(1, Math.round(u * fra(0.55, 0.95))) };
    let B;
    const armaQui = i % 4 === 3 && tierPista < G.armi.length - 1;
    if (armaQui) { B = { t: 'arma', tier: tierPista + 1 }; tierPista++; }
    else if (caso() < G.nemicoProb) B = { t: 'nemico', hp: Math.max(1, Math.round(u * fra(0.6, 1.7))) };
    else B = { t: 'colonna', hp: Math.round(u * fra(1.4, 2.6)) };
    const C = caso() < G.corsia3Prob ? { t: 'colonna', hp: Math.round(u * fra(1.3, 2.4)) } : null;

    const valore = it => {
      if (!it) return 0;
      /* l'arma a terra costa una riga di bottino: chi gioca bene la
         prende solo se gli serve davvero ad aprire corsie */
      if (it.t === 'arma') return (stile === 'umano' && colpo() >= 2.2 * u) ? 0 : Infinity;
      if (it.hp > colpo()) return -1;
      return it.t === 'nemico' ? it.hp * 1.5 : it.hp * 3;
    };
    const scelta = [A, B, C].reduce((a, b) => valore(b) > valore(a) ? b : a, null);
    if (scelta && valore(scelta) > 0) {
      if (scelta.t === 'arma') arma = scelta.tier;
      else if (scelta.t === 'nemico') {
        oro += Math.round(scelta.hp * 3 * molOro());
        potenza += Math.round(scelta.hp * 1.5 * molPot());
      } else potenza += Math.round(scelta.hp * 3 * molPot());
    }
    if (i > 0) {
      if (caso() < G.bonusProb) bonus[['oro', 'attacco', 'potenza'][Math.floor(caso() * 3)]]++;
      else oro += Math.round(24 * molOro() * u / passo(1));
    }
  }

  const alMuro = potenza;
  const budget = budgetMuro(m.level);
  let pesi = 0;
  for (let i = 0; i < G.righeMuro; i++) pesi += 1 + i * 0.10;
  for (let i = 0; i < G.righeMuro; i++) {
    const base = Math.max(1, Math.round(budget * (1 + i * 0.10) / pesi));
    const costi = [base, Math.round(base * 1.6), Math.round(base * 2.3)];
    const scrigni = [caso() < G.scrignoProb, caso() < G.scrignoProb, caso() < G.scrignoProb];
    let corsia = 0;
    if (stile === 'umano') {
      const conScrigno = scrigni.findIndex(x => x);
      if (conScrigno >= 0) corsia = conScrigno;                       // l'oro prima di tutto
      else if (caso() < 0.35) corsia = 1 + Math.floor(caso() * 2);    // riflessi
    }
    potenza -= costi[corsia];
    rotti++;
    if (scrigni[corsia]) oro += Math.round(costi[corsia] * 2 * molOro());
    if (rotti >= G.righeMuro || potenza <= 0) break;
  }

  const esito = rotti >= G.righeMuro
    ? (potenza > vitaBoss(m.level) ? 'vinta' : 'boss') : 'muro';
  oro += Math.round(rotti * 6 * molOro() * u / passo(1));
  if (esito === 'vinta') oro += Math.round(G.premioVinta * m.level * molOro());
  return { esito, alMuro, alBoss: Math.max(0, potenza), rotti, oro };
}

/* ------------------------- COSA COMPRARE ------------------------------ */
function acquisto(m, stile) {
  const scelte = [];
  for (const k of ['pot', 'arma', 'oro']) {
    const max = k === 'arma' ? G.armi.length - 1 : 300;
    if (m.up[k] >= max) continue;
    const c = costoUp(k, m.up[k]);
    if (c <= m.oro) scelte.push({ k, costo: c });
  }
  if (!scelte.length) return null;
  const tieni = SEME;
  const prova = mm => { SEME = 9991; let s = 0;
    for (let t = 0; t < 4; t++) s += corsa(mm, stile).alMuro; return s / 4; };
  const partenza = prova(m);
  let best = null;
  for (const s of scelte) {
    const t = JSON.parse(JSON.stringify(m)); t.up[s.k]++;
    const resa = (prova(t) - partenza) / s.costo;
    if (!best || resa > best.resa) best = { ...s, resa };
  }
  SEME = tieni;
  /* se niente alza la potenza (arma al massimo, potenza cara) si investe
     sull'oro, che è quello che fa un giocatore quando è in stallo */
  if (best.resa <= 0) { const o = scelte.find(s => s.k === 'oro'); if (o) return o; }
  return best;
}

function salita(stile, seme, maxTorre, rune) {
  SEME = seme;
  const m = { level: 1, oro: 0, rune: rune || 0, up: { pot: 0, arma: 0, oro: 0 } };
  const storia = [];
  let tentativi = 0;
  for (let n = 0; n < 600 && m.level <= maxTorre; n++) {
    let a; while ((a = acquisto(m, stile))) { m.oro -= a.costo; m.up[a.k]++; }
    const r = corsa(m, stile);
    tentativi++; m.oro += r.oro;
    if (r.esito === 'vinta') {
      storia.push({ torre: m.level, tentativi, up: { ...m.up } });
      m.level++; tentativi = 0;
    } else if (tentativi > 60) { storia.push({ torre: m.level, tentativi: Infinity }); break; }
  }
  return storia;
}

/* ------------------------------ REPORT -------------------------------- */
if (require.main === module) {
  const maxTorre = Number(process.argv[2] || 10);
  const quante   = Number(process.argv[3] || 10);

  console.log(`passo della pista: ${G.baseShare}  ·  salto per torre: ${G.levelGap}  ·  muro ${G.quotaMuro}`);
  console.log(`armi: ${G.armi.join(' ')}\n`);
  console.log('torre:      ' + Array.from({ length: maxTorre }, (_, i) =>
              String(i + 1).padStart(5)).join(''));

  for (const stile of ['perfetto', 'umano']) {
    const tutte = [];
    for (let s = 0; s < quante; s++) tutte.push(salita(stile, 3 + s * 101, maxTorre));
    const riga = [];
    let tot = 0;
    for (let l = 0; l < maxTorre; l++) {
      const v = tutte.map(a => a[l]).filter(Boolean).map(e => e.tentativi).filter(isFinite);
      if (!v.length) { riga.push('    —'); continue; }
      const med = v.reduce((a, b) => a + b, 0) / v.length;
      tot += med;
      riga.push(med.toFixed(1).padStart(5));
    }
    console.log(`${stile.padEnd(9)} |${riga.join('')} | in tutto ${tot.toFixed(0)} corse`);
  }
  console.log('\nil giocatore "umano" salta l\'arma quando non gli serve e nel muro');
  console.log('punta gli scrigni invece del blocco più economico: è più bravo del');
  console.log('"perfetto", ed è su di lui che va tarata la difficoltà.');
}

module.exports = { corsa, salita, torreNeed, passo, G };
