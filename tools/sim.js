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

  /* i potenziamenti si riconoscono dalla chiave della traduzione: il nome
     leggibile non sta più nei dati da quando il gioco parla due lingue
     (e il simulatore, giustamente, si era fermato) */
  pot: { base: num(core, /key:\s*'up\.power',\s*base:\s*(\d+)/, 'POTENZA base'),
         mult: num(core, /key:\s*'up\.power',\s*base:\s*\d+,\s*mult:\s*(\d*\.?\d+)/, 'POTENZA mult'),
         step: num(core, /'up\.power'[^}]*Math\.pow\((\d*\.?\d+)/, 'POTENZA passo') },
  arma:{ base: num(core, /key:\s*'up\.weapon',\s*base:\s*(\d+)/, 'ARMA base'),
         mult: num(core, /key:\s*'up\.weapon',\s*base:\s*\d+,\s*mult:\s*(\d*\.?\d+)/, 'ARMA mult') },
  oro: { base: num(core, /key:\s*'up\.income',\s*base:\s*(\d+)/, 'ORO base'),
         mult: num(core, /key:\s*'up\.income',\s*base:\s*\d+,\s*mult:\s*(\d*\.?\d+)/, 'ORO mult'),
         step: num(core, /'up\.income'[^}]*Math\.pow\((\d*\.?\d+)/, 'ORO passo') },
  quotaBoss : num(core, /bossHealth\s*=\s*lvl\s*=>\s*Math\.round\(towerNeed\(lvl\)\s*\*\s*(\d*\.?\d+)\)/, 'bossHealth'),

  /* la combo: colpi puliti di fila */
  combo: { passo: num(core, /COMBO\s*=\s*\{\s*passo:\s*(\d*\.?\d+)/, 'COMBO.passo'),
           max  : num(core, /COMBO\s*=\s*\{[^}]*max:\s*(\d+)/, 'COMBO.max') },

  /* il duello col carceriere */
  duello: {
    durata  : num(core, /DUELLO[\s\S]*?durata:\s*(\d*\.?\d+)/, 'DUELLO.durata'),
    giro    : num(core, /DUELLO[\s\S]*?giro:\s*(\d*\.?\d+)/, 'DUELLO.giro'),
    da      : num(core, /DUELLO[\s\S]*?da:\s*(\d*\.?\d+)/, 'DUELLO.da'),
    a       : num(core, /DUELLO[\s\S]*?\ba:\s*(\d*\.?\d+)/, 'DUELLO.a'),
    pausa   : num(core, /DUELLO[\s\S]*?pausa:\s*(\d*\.?\d+)/, 'DUELLO.pausa'),
    critP   : num(core, /DUELLO[\s\S]*?critP:\s*(\d*\.?\d+)/, 'DUELLO.critP'),
    critB   : num(core, /DUELLO[\s\S]*?critB:\s*(\d*\.?\d+)/, 'DUELLO.critB')
  },
  /* i poteri a tempo: al simulatore conta solo la furia. Lo scudo para una
     colonna rossa, e il giocatore simulato non ne prende mai; il corvo
     raccoglie monete da ogni corsia, e lui le raccoglie già tutte. */
  poteri: {
    prob : num(core, /POTERI_PROB\s*=\s*(\d*\.?\d+)/, 'POTERI_PROB'),
    max  : num(core, /POTERI_MAX\s*=\s*(\d+)/, 'POTERI_MAX'),
    tipi : (core.match(/const POTERI = \{([\s\S]*?)\n\};/) || ['', ''])[1].split('\n').filter(r => /^\s*\w+:/.test(r)).length,
    dura : num(core, /furia:\s*\{[^}]*dura:\s*(\d*\.?\d+)/, 'POTERI.furia.dura'),
    mult : num(core, /furia:\s*\{[^}]*mult:\s*(\d*\.?\d+)/, 'POTERI.furia.mult')
  },
  corsa: {
    speed : num(core, /speed\s*:\s*(\d*\.?\d+)/, 'CFG.speed'),
    step  : num(core, /speedStep\s*:\s*(\d*\.?\d+)/, 'CFG.speedStep'),
    max   : num(core, /speedMax\s*:\s*(\d*\.?\d+)/, 'CFG.speedMax'),
    fila  : num(core, /rowSpacing\s*:\s*(\d*\.?\d+)/, 'CFG.rowSpacing')
  },
  /* la rabbia a metà vita */
  rabbia: {
    soglia : num(core, /RABBIA\s*=\s*\{[^}]*soglia:\s*(\d*\.?\d+)/, 'RABBIA.soglia'),
    ruggito: num(core, /RABBIA\s*=\s*\{[^}]*ruggito:\s*(\d*\.?\d+)/, 'RABBIA.ruggito'),
    doppio : num(core, /RABBIA\s*=\s*\{[^}]*doppio:\s*(\d*\.?\d+)/, 'RABBIA.doppio'),
    peso   : num(core, /RABBIA\s*=\s*\{[^}]*peso:\s*(\d*\.?\d+)/, 'RABBIA.peso'),
    pausa  : num(core, /RABBIA\s*=\s*\{[^}]*pausa:\s*(\d*\.?\d+)/, 'RABBIA.pausa')
  },

  buffAttacco: num(core, /rate\s*:\s*\{[^}]*step:\s*(\d*\.?\d+)/, 'buff attacco'),
  buffPotenza: num(core, /gain\s*:\s*\{[^}]*step:\s*(\d*\.?\d+)/, 'buff potenza'),
  buffOro    : num(core, /income:\s*\{[^}]*step:\s*(\d*\.?\d+)/, 'buff oro'),

  /* le taglie delle colonne, lette dalla generazione della pista */
  facile : [num(game, /const easyHp = Math\.max\(1, Math\.round\(unit \* rnd\((\d*\.?\d+),/, 'colonna facile min'),
            num(game, /const easyHp = Math\.max\(1, Math\.round\(unit \* rnd\(\d*\.?\d+,\s*(\d*\.?\d+)/, 'colonna facile max')],
  nemico : [num(game, /const hp = Math\.max\(1, Math\.round\(unit \* rnd\((\d*\.?\d+),/, 'nemico min'),
            num(game, /const hp = Math\.max\(1, Math\.round\(unit \* rnd\(\d*\.?\d+,\s*(\d*\.?\d+)/, 'nemico max')],
  duraB  : [num(game, /corsia 2[\s\S]*?const hardHp = Math\.round\(unit \* rnd\((\d*\.?\d+),/, 'colonna dura B min'),
            num(game, /corsia 2[\s\S]*?const hardHp = Math\.round\(unit \* rnd\(\d*\.?\d+,\s*(\d*\.?\d+)/, 'colonna dura B max')],
  duraC  : [num(game, /corsia 3[\s\S]*?const hardHp = Math\.round\(unit \* rnd\((\d*\.?\d+),/, 'colonna dura C min'),
            num(game, /corsia 3[\s\S]*?const hardHp = Math\.round\(unit \* rnd\(\d*\.?\d+,\s*(\d*\.?\d+)/, 'colonna dura C max')],

  /* il muro: quanto costano le tre corsie e quanto rende uno scrigno */
  muroForbice: [num(game, /costs = shuffle\(\[cheap, Math\.round\(cheap \* (\d*\.?\d+)\)/, 'muro corsia media'),
                num(game, /costs = shuffle\(\[cheap, Math\.round\(cheap \* \d*\.?\d+\), Math\.round\(cheap \* (\d*\.?\d+)\)/, 'muro corsia cara')],
  scrignoOro  : num(core, /CHEST_LOOT\s*=\s*(\d*\.?\d+)/, 'CHEST_LOOT'),
  monetaValore: num(game, /kind === 'coin'\)\s*\{?\s*run\.coins \+= Math\.round\(run\.unit \* (\d*\.?\d+)/, 'valore moneta'),
  bloccoValore: num(game, /run\.broken \* run\.unit \* (\d*\.?\d+) \* coinMul/, 'valore blocco'),
  scrignoCosto: num(core, /CHEST_PRICE\s*=\s*(\d*\.?\d+)/, 'CHEST_PRICE'),

  /* dalla generazione della pista */
  nemicoProb : num(game, /Math\.random\(\)\s*<\s*(\d*\.?\d+)\)\s*\{\s*\n?\s*const hp/, 'probabilità nemico'),
  corsia3Prob: num(game, /corsia 3[\s\S]{0,200}?Math\.random\(\)\s*<\s*(\d*\.?\d+)\)/, 'probabilità corsia 3'),
  bonusProb  : num(game, /Math\.random\(\)\s*<\s*(\d*\.?\d+)\)\s*\{\s*\n?\s*const kind\s*=\s*pick/, 'probabilità bonus'),
  scrignoProb: num(game, /const chest\s*=\s*Math\.random\(\)\s*<\s*(\d*\.?\d+)/, 'probabilità scrigno'),
  premioVinta: num(game, /outcome === 'win' \? Math\.round\((\d+)\s*\*\s*meta\.level/, 'premio vittoria')
};

/* Gli stili del duello, una riga ciascuno in STILI_DUELLO, e quale stile
   tocca a ogni zona, nell'ordine delle zone. */
const STILI = (() => {
  const blocco = core.match(/STILI_DUELLO\s*=\s*\{([\s\S]*?)\n\};/);
  if (!blocco) { console.error('Il simulatore non trova più STILI_DUELLO.'); process.exit(1); }
  const out = {};
  for (const m of blocco[1].matchAll(/^\s*(\w+)\s*:\s*\{([^}]*)\}/gm)) {
    const s = {};
    for (const kv of m[2].matchAll(/(\w+):\s*(-?\d*\.?\d+)/g)) s[kv[1]] = parseFloat(kv[2]);
    out[m[1]] = s;
  }
  return out;
})();
const STILE_ZONA = [...core.matchAll(/duello:\s*'(\w+)'/g)].map(m => m[1]);
if (!STILE_ZONA.length || STILE_ZONA.some(n => !STILI[n])) {
  console.error('Una zona ha uno stile di duello che STILI_DUELLO non conosce.');
  process.exit(1);
}

/* Una costante può esistere in core.js e non essere usata da nessuna
   parte: è successo con CHEST_PRICE e CHEST_LOOT, definite e mai
   collegate, e il simulatore misurava allegramente un gioco diverso da
   quello che si giocava. Qui si controlla che il gioco le usi davvero. */
for (const nome of ['CHEST_PRICE', 'CHEST_LOOT']) {
  if (!game.includes(nome)) {
    console.error(`${nome} è definita in core.js ma game.js non la usa.\n` +
                  'Il gioco e il simulatore stanno misurando cose diverse.');
    process.exit(1);
  }
}

const torreNeed  = l => Math.round(G.torreBase * Math.pow(G.torreCresc, l - 1));
const budgetMuro = l => Math.round(torreNeed(l) * G.quotaMuro);
/* era 1 - quotaMuro: uguale per coincidenza (0.38 = 1 - 0.62), finché
   qualcuno non tocca uno dei due numeri. Adesso si legge dal gioco. */
const vitaBoss   = l => Math.round(torreNeed(l) * G.quotaBoss);
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
                volte. È quello misurato su una partita vera.
     'ingenuo'  come l'umano nel muro, ma raccoglie SEMPRE l'arma a terra,
                come dice il menù. Serve a rispondere a una domanda sola:
                seguire il consiglio del gioco fa ancora perdere?        */
function corsa(m, stile) {
  const u = passo(m.level);
  let potenza = G.potenzaIni, arma = m.up.arma, oro = 0, rotti = 0;
  const bonus = { oro: 0, attacco: 0, potenza: 0 };

  let furia = 0, poteri = 0;                           // file di furia rimaste
  const colpo = () => G.armi[arma] * u * (1 + bonus.attacco * G.buffAttacco) *
                      (furia > 0 ? G.poteri.mult : 1);
  const velocita = Math.min(G.corsa.max, G.corsa.speed + (m.level - 1) * G.corsa.step);
  const fileFuria = Math.round(G.poteri.dura * velocita / G.corsa.fila);
  /* La combo: il giocatore simulato non prende mai una colonna rossa (sceglie
     sempre fra quelle che può spaccare), quindi la sua serie non si rompe
     mai. È il caso migliore, e va bene così: la compensazione su BASE_SHARE
     è tarata su chi gioca pulito, e chi sbaglia paga la combo persa. */
  let combo = 0;
  const molPot = () => Math.pow(G.pot.step, m.up.pot) * (1 + bonus.potenza * G.buffPotenza)
                       * (1 + (m.rune || 0) * 0.25)
                       * (1 + Math.min(combo, G.combo.max) * G.combo.passo);
  const molOro = () => Math.pow(G.oro.step, m.up.oro) * (1 + bonus.oro * G.buffOro)
                       * (1 + (m.rune || 0) * 0.25);

  const n = righe(m.level);
  let tierPista = m.up.arma;
  for (let i = 0; i < n; i++) {
    const A = { t: 'colonna', hp: Math.max(1, Math.round(u * fra(G.facile[0], G.facile[1]))) };
    let B;
    const armaQui = i % 4 === 3 && tierPista < G.armi.length - 1;
    if (armaQui) { B = { t: 'arma', tier: tierPista + 1 }; tierPista++; }
    else if (caso() < G.nemicoProb) B = { t: 'nemico', hp: Math.max(1, Math.round(u * fra(G.nemico[0], G.nemico[1]))) };
    else B = { t: 'colonna', hp: Math.round(u * fra(G.duraB[0], G.duraB[1])) };
    const C = caso() < G.corsia3Prob ? { t: 'colonna', hp: Math.round(u * fra(G.duraC[0], G.duraC[1])) } : null;

    const valore = it => {
      if (!it) return 0;
      /* l'arma a terra costa una riga di bottino: chi gioca bene la
         prende solo se gli serve davvero ad aprire corsie */
      if (it.t === 'arma') {
        /* "se le vedevo già verdi evitavo di prendere il power up arma":
           si salta quando in questa riga c'è già una colonna dura alla
           tua portata, perché quella rende più dell'arma */
        const duraVerde = C && C.hp >= 1.4 * u && C.hp <= colpo();
        return (stile === 'umano' && duraVerde) ? 0 : Infinity;
      }
      if (it.hp > colpo()) return -1;
      return it.t === 'nemico' ? it.hp * 1.5 : it.hp * 3;
    };
    const scelta = [A, B, C].reduce((a, b) => valore(b) > valore(a) ? b : a, null);
    if (scelta && valore(scelta) > 0) {
      if (scelta.t === 'arma') arma = scelta.tier;
      else if (scelta.t === 'nemico') {
        oro += Math.round(scelta.hp * 3 * molOro());
        potenza += Math.round(scelta.hp * 1.5 * molPot());
        combo++;
      } else { potenza += Math.round(scelta.hp * 3 * molPot()); combo++; }
    }
    if (furia > 0) furia--;
    if (i > 0) {
      /* come nel gioco: il potere prende il posto delle monete del varco */
      if (i > 1 && poteri < G.poteri.max && caso() < G.poteri.prob) {
        poteri++;
        if (caso() < 1 / G.poteri.tipi) furia = fileFuria + 1;   // +1: il calo qui sopra
      } else if (caso() < G.bonusProb) bonus[['oro', 'attacco', 'potenza'][Math.floor(caso() * 3)]]++;
      else oro += Math.round(3 * u * G.monetaValore * molOro());   // tre monete per varco
    }
  }

  const alMuro = potenza;
  const budget = budgetMuro(m.level);
  let pesi = 0;
  for (let i = 0; i < G.righeMuro; i++) pesi += 1 + i * 0.10;
  for (let i = 0; i < G.righeMuro; i++) {
    const base = Math.max(1, Math.round(budget * (1 + i * 0.10) / pesi));
    const costi = [base, Math.round(base * G.muroForbice[0]), Math.round(base * G.muroForbice[1])];
    const scrigni = [caso() < G.scrignoProb, caso() < G.scrignoProb, caso() < G.scrignoProb];
    let corsia = 0;
    if (stile !== 'perfetto') {
      const conScrigno = scrigni.findIndex(x => x);
      if (conScrigno >= 0) corsia = conScrigno;                       // l'oro prima di tutto
      else if (caso() < 0.35) corsia = 1 + Math.floor(caso() * 2);    // riflessi
    }
    /* lo scrigno è murato meglio: si paga di più per aprirlo */
    const prezzo = scrigni[corsia] ? Math.round(costi[corsia] * G.scrignoCosto)
                                   : costi[corsia];
    potenza -= prezzo;
    rotti++;
    /* il premio si calcola sul costo normale della corsia, non sul
       prezzo gonfiato: sono due manopole separate */
    if (scrigni[corsia]) oro += Math.round(costi[corsia] * G.scrignoOro * molOro());
    if (rotti >= G.righeMuro || potenza <= 0) break;
  }

  const esito = rotti >= G.righeMuro
    ? duello(Math.max(0, potenza), vitaBoss(m.level), stile, m.level) : 'muro';
  oro += Math.round(rotti * u * G.bloccoValore * molOro());
  if (esito === 'vinta') oro += Math.round(G.premioVinta * m.level * molOro());
  return { esito, alMuro, alBoss: Math.max(0, potenza), rotti, oro };
}

/* ---------------------------- IL DUELLO -------------------------------
   Quanto bene tocca ciascuno, su cento anelli: [perfetti, buoni]. Il resto
   sono mancati. L'"umano" è stimato, non misurato: va ritarato sul diario
   appena ci sono partite vere col duello. */
const MIRA = {
  perfetto: [0.70, 0.25],
  umano   : [0.35, 0.40],
  ingenuo : [0.10, 0.30]
};

/* Quanto ogni stile peggiora la mira, rispetto al carceriere normale.
   STIMATO, non misurato — come MIRA. Un anello che svanisce o uno
   velocissimo si prendono peggio di uno che si chiude con calma. */
const FATICA = { base: 1, svelto: 0.9, storto: 0.85, ombra: 0.7,
                 lampo: 0.75, doppio: 0.9, finta: 0.9, salto: 0.85 };
/* e quante volte un giocatore tocca un anello finto invece di lasciarlo */
const ABBOCCA = { perfetto: 0.05, umano: 0.2, ingenuo: 0.45 };

function duello(P, B, stile, livello) {
  const D = G.duello, R = G.rabbia;
  const nome = STILE_ZONA[(livello - 1) % STILE_ZONA.length];
  let S = STILI[nome];
  const f = FATICA[nome] || 1;
  const q = [MIRA[stile][0] * f, MIRA[stile][1] * f];
  const giro = S.giro || D.giro;
  const ritmo = Math.max(P, B) / D.durata;           // le due forze scendono insieme
  const alBersaglio = (D.da - 1) / (D.da - D.a) * giro;
  const pausa = () => S.pausaA ? fra(S.pausaDa, S.pausaA) : D.pausa;
  let rabbia = false, ruggito = 0;

  /* gli istanti in cui si tocca: per ogni giro uno, o due col doppio */
  let t = 0, prossimo = pausa() + alBersaglio, secondo = -1, primoGiro = true;
  let p = P, b = B;
  const dt = 1 / 60;
  const tira = finto => {
    const peso = S.peso || 1;
    if (finto) { if (caso() < ABBOCCA[stile]) b += B * D.critB * peso; return; }
    const r = caso();
    if (r < q[0]) b -= B * D.critP * peso;
    else if (r < q[0] + q[1]) b -= B * D.critB * peso;
  };
  while (p > 0 && b > 0) {
    t += dt;
    /* come nel gioco: a metà vita il ruggito ferma tutto, poi due alla volta */
    if (!rabbia && b <= B * R.soglia) {
      rabbia = true;
      ruggito = R.ruggito;
      S = S.doppio ? Object.assign({}, S, { pausaDa: R.pausa * 0.5, pausaA: R.pausa })
                   : Object.assign({}, S, { doppio: R.doppio, peso: R.peso });
      secondo = -1;
      prossimo = t + R.ruggito + 0.1 + alBersaglio;
    }
    if (ruggito > 0) { ruggito -= dt; continue; }
    p -= ritmo * dt;
    b -= ritmo * dt;
    if (t >= prossimo) {
      const finto = !!S.finta && !primoGiro && caso() < S.finta;
      tira(finto);
      primoGiro = false;
      if (S.doppio && !finto) secondo = prossimo + S.doppio;
      prossimo += (S.doppio && !finto ? S.doppio : 0) + pausa() + alBersaglio;
    }
    if (secondo > 0 && t >= secondo) { tira(false); secondo = -1; }
  }
  /* come nel gioco: il boss cade se arriva a zero, anche insieme a te */
  return b <= 0 ? 'vinta' : 'boss';
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
  console.log(`armi: ${G.armi.join(' ')}`);
  console.log(`colonne: facile ${G.facile.join('-')}  dura ${G.duraB.join('-')} / ${G.duraC.join('-')}`);
  console.log(`muro: forbice ×1 ×${G.muroForbice[0]} ×${G.muroForbice[1]}` +
              `  ·  scrigno costa ×${G.scrignoCosto} e rende ×${G.scrignoOro} oro\n`);
  console.log('torre:      ' + Array.from({ length: maxTorre }, (_, i) =>
              String(i + 1).padStart(5)).join(''));

  for (const stile of ['perfetto', 'umano', 'ingenuo']) {
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
