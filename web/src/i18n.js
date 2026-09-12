/* =====================================================================
   LINGUE

   Il gioco ha una quarantina di stringhe. Estrarle adesso costa un'ora;
   fra sei mesi, con negozio e missioni, sarebbero duecento sparse ovunque
   e costerebbe una giornata. Il momento giusto per farlo è sempre il più
   presto possibile.

   Come funziona:
   - le stringhe stanno qui, in una tabella per lingua;
   - `t(chiave)` la legge, e se manca ricade sull'inglese invece di
     mostrare un buco;
   - il markup statico si marca con `data-t="chiave"` e lo riempie
     `applyStaticText()`; `data-t-html` per le poche righe con del
     grassetto dentro;
   - i nomi di armi, bonus, potenziamenti e zone NON sono scritti nei
     dati: quelli portano una chiave e si risolvono al momento dell'uso,
     altrimenti cambiando lingua resterebbero quelli di prima.

   La lingua si indovina da quella del telefono al primo avvio; la
   bandierina nel menù la cambia e la scelta viene ricordata.
   ===================================================================== */

const STRINGS = {
  it: {
    /* --- HUD --- */
    'hud.weapon'  : 'ARMA',
    'hud.power'   : 'POTENZA',
    'hud.gold'    : 'ORO',
    'hud.hit'     : 'COLPO',
    'hud.wall'    : 'MURO',

    /* --- menù --- */
    'hub.tower'   : 'TORRE {0}',
    'hub.title'   : 'TORRE<br>DI GHIACCIO',
    'hub.play'    : 'ALL\'ASSALTO',
    'hub.story'   : 'Il carceriere ha rinchiuso la principessa in cima alla ' +
                    'torre. Spacca le torri <b>verdi</b> per farti potenza, ' +
                    'schiva le <b>rosse</b>, raccogli le <b>armi</b> che trovi ' +
                    'sulla corsia — poi sfonda i <b>{0} blocchi</b> del muro. ' +
                    'Quello che ti resta è la forza con cui affronti il boss.',
    'hub.hint'    : 'trascina per cambiare corsia',
    'hub.noTower' : 'NESSUNA TORRE ANCORA CONQUISTATA',
    'hub.highest' : 'TORRE PIÙ ALTA: {0}',
    'hub.record'  : 'RECORD {0}/{1} DEL MURO',
    'hub.runes'   : '{0} RUNE · ×{1} POTENZA E ORO',

    /* --- riepilogo dell'ultima corsa --- */
    'run.newRecord': 'NUOVO RECORD',
    'run.wallLbl' : 'MURO',
    'run.lootLbl' : 'BOTTINO',
    'run.stopped' : 'FERMATO DAL MURO',
    'run.beaten'  : 'SCONFITTO DAL BOSS',
    'run.freed'   : 'PRINCIPESSA LIBERATA',
    'run.stoppedBig': 'IL MURO TI HA FERMATO',
    'run.beatenBig' : 'IL CARCERIERE HA VINTO',
    'run.freedBig'  : 'PRINCIPESSA LIBERATA!',
    'run.jailer'  : 'IL CARCERIERE!',
    'run.record'  : 'RECORD SUPERATO!',

    /* --- rinascita --- */
    'rb.head'     : '🔮 RINASCITA',
    'rb.runes'    : 'RUNE',
    'rb.what'     : 'POTENZA E ORO',
    'rb.note'     : 'Riparti dalla Torre 1 · potenziamenti azzerati',
    'rb.confirm'  : 'TOCCA ANCORA PER CONFERMARE',
    'rb.done'     : '+{0} RUNE',

    /* --- potenziamenti --- */
    'up.power'    : 'POTENZA',
    'up.weapon'   : 'ARMA',
    'up.income'   : 'ORO',
    'up.level'    : 'Livello {0}',
    'up.max'      : 'MAX',

    /* --- seconda occasione --- */
    'rv.close'    : 'TI MANCAVA POCO',
    'rv.over'     : 'CORSA FINITA',
    'rv.byWall'   : 'FERMATO DAL MURO A {0}/{1}',
    'rv.byBoss'   : 'IL CARCERIERE TI HA PIEGATO',
    'rv.what'     : 'SECONDA OCCASIONE',
    'rv.gain'     : '+{0} potenza, e riparti da qui',
    'rv.no'       : 'LASCIA PERDERE',
    'rv.have'     : 'ne hai {0}',
    'rv.taken'    : 'SECONDA OCCASIONE!',

    /* --- fondo del menù --- */
    'reset.do'    : 'RICOMINCIA DA CAPO',
    'reset.sure'  : 'TOCCA ANCORA: CANCELLA TUTTO',
    'reset.done'  : 'TUTTO DA CAPO',
    'diary.lbl'   : 'TENTATIVI PER TORRE',

    /* --- aspetto --- */
    'sk.price'    : '{0} · 💎{1} — TOCCA ANCORA',
    'sk.need'     : 'TI MANCANO {0} 💎',
    'sk.bought'   : '{0}!',
    'sk.viking'   : 'VICHINGO',
    'sk.ember'    : 'BRACE',
    'sk.frost'    : 'BRINA',
    'sk.night'    : 'GUARDIA NOTTURNA',
    'sk.gold'     : 'CAMPIONE',

    /* --- armi --- */
    'w.fists'     : 'Pugni',
    'w.club'      : 'Randello',
    'w.axe'       : 'Ascia',
    'w.sword'     : 'Spada',
    'w.hammer'    : 'Martello',
    'w.rune'      : 'Lama Rúna',

    /* --- bonus raccolti --- */
    'b.gold'      : 'Oro',
    'b.attack'    : 'Attacco',
    'b.power'     : 'Potenza',

    /* --- zone --- */
    'z.ice'       : 'VALLE GELATA',
    'z.wood'      : 'BOSCO ROSSO',
    'z.bone'      : 'DUNE D’OSSA',
    'z.rune'      : 'NOTTE DI RÚNA',
    'z.lava'      : 'BOCCA DI FUOCO',
    'z.ash'       : 'PALUDE DI CENERE',
    'z.glass'     : 'FORESTA DI VETRO',
    'z.sky'       : 'CIELO SPEZZATO',

    /* --- il carceriere, uno per zona --- */
    'bs.ice'      : 'IL GUARDIANO DEL GELO!',
    'bs.wood'     : 'IL SIGNORE DEL BOSCO!',
    'bs.bone'     : 'IL RE D\'OSSA!',
    'bs.rune'     : 'L\'OMBRA DI RÚNA!',
    'bs.lava'     : 'IL SIGNORE DEL VULCANO!',
    'bs.ash'      : 'IL MANGIACENERE!',
    'bs.glass'    : 'IL RE DI VETRO!',
    'bs.sky'      : 'IL SIGNORE DEL TUONO!'
  },

  en: {
    'hud.weapon'  : 'WEAPON',
    'hud.power'   : 'POWER',
    'hud.gold'    : 'GOLD',
    'hud.hit'     : 'HIT',
    'hud.wall'    : 'WALL',

    'hub.tower'   : 'TOWER {0}',
    'hub.title'   : 'TOWER<br>OF ICE',
    'hub.play'    : 'CHARGE!',
    'hub.story'   : 'The jailer has locked the princess at the top of the ' +
                    'tower. Smash the <b>green</b> towers for power, dodge ' +
                    'the <b>red</b> ones, pick up the <b>weapons</b> you find ' +
                    'in your lane — then break the <b>{0} blocks</b> of the ' +
                    'wall. What you have left is what you fight the boss with.',
    'hub.hint'    : 'drag to change lane',
    'hub.noTower' : 'NO TOWER CONQUERED YET',
    'hub.highest' : 'HIGHEST TOWER: {0}',
    'hub.record'  : 'RECORD {0}/{1} OF THE WALL',
    'hub.runes'   : '{0} RUNES · ×{1} POWER AND GOLD',

    'run.newRecord': 'NEW RECORD',
    'run.wallLbl' : 'WALL',
    'run.lootLbl' : 'LOOT',
    'run.stopped' : 'STOPPED BY THE WALL',
    'run.beaten'  : 'BEATEN BY THE BOSS',
    'run.freed'   : 'PRINCESS FREED',
    'run.stoppedBig': 'THE WALL STOPPED YOU',
    'run.beatenBig' : 'THE JAILER WON',
    'run.freedBig'  : 'PRINCESS FREED!',
    'run.jailer'  : 'THE JAILER!',
    'run.record'  : 'NEW RECORD!',

    'rb.head'     : '🔮 REBIRTH',
    'rb.runes'    : 'RUNES',
    'rb.what'     : 'POWER AND GOLD',
    'rb.note'     : 'Back to Tower 1 · upgrades wiped',
    'rb.confirm'  : 'TAP AGAIN TO CONFIRM',
    'rb.done'     : '+{0} RUNES',

    'up.power'    : 'POWER',
    'up.weapon'   : 'WEAPON',
    'up.income'   : 'GOLD',
    'up.level'    : 'Level {0}',
    'up.max'      : 'MAX',

    'rv.close'    : 'SO CLOSE',
    'rv.over'     : 'RUN OVER',
    'rv.byWall'   : 'STOPPED BY THE WALL AT {0}/{1}',
    'rv.byBoss'   : 'THE JAILER BROKE YOU',
    'rv.what'     : 'SECOND CHANCE',
    'rv.gain'     : '+{0} power, and carry on from here',
    'rv.no'       : 'LET IT GO',
    'rv.have'     : 'you have {0}',
    'rv.taken'    : 'SECOND CHANCE!',

    'reset.do'    : 'START OVER',
    'reset.sure'  : 'TAP AGAIN: WIPE EVERYTHING',
    'reset.done'  : 'ALL FROM SCRATCH',
    'diary.lbl'   : 'ATTEMPTS PER TOWER',

    'sk.price'    : '{0} · 💎{1} — TAP AGAIN',
    'sk.need'     : 'YOU NEED {0} MORE 💎',
    'sk.bought'   : '{0}!',
    'sk.viking'   : 'VIKING',
    'sk.ember'    : 'EMBER',
    'sk.frost'    : 'FROST',
    'sk.night'    : 'NIGHTWATCH',
    'sk.gold'     : 'CHAMPION',

    'w.fists'     : 'Fists',
    'w.club'      : 'Club',
    'w.axe'       : 'Axe',
    'w.sword'     : 'Sword',
    'w.hammer'    : 'Hammer',
    'w.rune'      : 'Rune Blade',

    'b.gold'      : 'Gold',
    'b.attack'    : 'Attack',
    'b.power'     : 'Power',

    'z.ice'       : 'FROZEN VALLEY',
    'z.wood'      : 'RED WOODS',
    'z.bone'      : 'BONE DUNES',
    'z.rune'      : 'RUNE NIGHT',
    'z.lava'      : 'MOUTH OF FIRE',
    'z.ash'       : 'ASH MARSH',
    'z.glass'     : 'GLASS FOREST',
    'z.sky'       : 'BROKEN SKY',

    'bs.ice'      : 'THE FROST WARDEN!',
    'bs.wood'     : 'THE LORD OF THE WOODS!',
    'bs.bone'     : 'THE BONE KING!',
    'bs.rune'     : 'THE SHADE OF RÚNA!',
    'bs.lava'     : 'THE VOLCANO LORD!',
    'bs.ash'      : 'THE ASH EATER!',
    'bs.glass'    : 'THE GLASS KING!',
    'bs.sky'      : 'THE THUNDER LORD!'
  }
};

const LANGS = ['it', 'en'];
const LANG_KEY = 'torredighiaccio.lang';

/* Al primo avvio si indovina dal telefono: chi ce l'ha in italiano trova
   l'italiano senza toccare niente, tutti gli altri l'inglese. */
function guessLang() {
  try {
    const salvata = localStorage.getItem(LANG_KEY);
    if (salvata && LANGS.includes(salvata)) return salvata;
  } catch (e) { /* finestra privata: si indovina e basta */ }
  const sistema = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return LANGS.includes(sistema) ? sistema : 'en';
}

let lang = guessLang();

/* Se una chiave manca nella lingua scelta si ricade sull'inglese, e se
   manca anche lì si mostra la chiave: un buco silenzioso nell'interfaccia
   è più difficile da notare di una scritta storta. */
function t(chiave, ...valori) {
  const s = (STRINGS[lang] && STRINGS[lang][chiave]) ||
            STRINGS.en[chiave] || chiave;
  return valori.length
    ? s.replace(/\{(\d+)\}/g, (_, i) => valori[i] !== undefined ? valori[i] : '')
    : s;
}

/* Riempie tutto il markup marcato. `data-t` per il testo semplice,
   `data-t-html` per le poche righe che hanno del grassetto dentro. */
function applyStaticText() {
  document.querySelectorAll('[data-t]').forEach(el => {
    el.textContent = t(el.dataset.t);
  });
  document.querySelectorAll('[data-t-html]').forEach(el => {
    el.innerHTML = t(el.dataset.tHtml, CFG.wallRows);
  });
  document.documentElement.lang = lang;
}

function setLang(nuova) {
  if (!LANGS.includes(nuova) || nuova === lang) return;
  lang = nuova;
  try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* pazienza */ }
  applyStaticText();
  if (typeof langHook === 'function') langHook();
}

/* lo riempie game.js: cambiata la lingua vanno rifatte anche le
   etichette 3D, che sono texture disegnate una volta sola */
let langHook = null;
