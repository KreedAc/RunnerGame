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
                    'Quello che ti resta è la forza con cui affronti il boss: ' +
                    '<b>tocca a tempo</b> e ogni colpo pesa di più.',
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

    /* --- la combo --- */
    'co.bonus'    : '+{0}% POTENZA',

    /* --- il duello --- */
    'du.perfetto' : 'PERFETTO!',
    'du.buono'    : 'BUONO!',
    'du.mancato'  : 'MANCATO',
    'du.finta'    : 'FINTA!',
    'du.rabbia'   : 'SI È INFURIATO!',
    'du.h.rabbia' : 'ORA DUE ALLA VOLTA!',
    /* come combatte ciascun carceriere: la prima cosa che leggi */
    'du.h.base'   : 'TOCCA QUANDO SI CHIUDE!',
    'du.h.svelto' : 'È SVELTO: TIENITI PRONTO!',
    'du.h.storto' : 'NON HA RITMO: GUARDA L\'ANELLO!',
    'du.h.ombra'  : 'L\'ANELLO SVANISCE: CONTA!',
    'du.h.lampo'  : 'VELOCE COME LA LAVA!',
    'du.h.doppio' : 'DUE ANELLI DI FILA!',
    'du.h.finta'  : 'NON TOCCARE QUELLI ROSSI!',
    'du.h.salto'  : 'IL BERSAGLIO SI SPOSTA!',

    /* --- rinascita --- */
    'rb.head'     : '🔮 RINASCITA',
    'rb.runes'    : 'RUNE',
    'rb.what'     : 'POTENZA E ORO',
    'rb.note'     : 'Riparti dalla Torre 1 · potenziamenti azzerati',
    'rb.confirm'  : 'TOCCA ANCORA PER CONFERMARE',
    'rb.done'     : '+{0} RUNE · SPENDILE TOCCANDO 🔮',

    /* --- la prima partita --- */
    'gu.verdi'    : 'Spacca le colonne VERDI: ti danno potenza',
    'gu.schiva'   : 'Le ROSSE fanno male! Trascina per schivarla',
    'gu.bravo'    : 'Così!',
    'gu.arma'     : 'Prendi l\'ARMA: spacca colonne più grosse',
    'gu.muro'     : 'Ogni blocco COSTA potenza: scegli il più basso',

    /* --- la bottega delle rune --- */
    'bt.titolo'   : 'BOTTEGA DELLE RUNE',
    'bt.sub'      : 'Rune da spendere: <b>{0}</b> · il bonus <b>×{1}</b> resta tuo comunque',
    'bt.chiudi'   : 'CHIUDI',
    'bt.ok'       : 'OK?',
    'bt.poche'    : 'TI MANCANO {0} RUNE',
    'bt.arma'     : 'Arma di famiglia',
    'bt.scorta'   : 'Zaino',
    'bt.mira'     : 'Mano ferma',
    'bt.muro'     : 'Muratore',
    'bt.gemme'    : 'Occhio del gioielliere',
    'bt.pelle'    : 'Seconda pelle',
    'bt.e.arma'   : 'parti almeno con: {0}',
    'bt.e.scorta' : 'parti con {0} colonne in tasca',
    'bt.e.mira'   : 'colpo perfetto: {0} ms',
    'bt.e.muro'   : 'muro −{0}%',
    'bt.e.gemme'  : 'gemme +{0}%',
    'bt.e.pelle'  : 'seconda occasione: 💎{0}',

    /* --- l'obiettivo del giorno --- */
    'og.verdi'    : 'Spacca {0} colonne verdi',
    'og.combo'    : 'Fai una combo da {0}',
    'og.perfetti' : 'Metti {0} colpi perfetti',
    'og.muro'     : 'Sfonda {0} blocchi del muro',
    'og.monete'   : 'Raccogli {0} monete',
    'og.nemici'   : 'Abbatti {0} nemici',
    'og.domani'   : 'Fatto! Domani un altro',
    'og.fatto'    : 'OBIETTIVO DEL GIORNO! +{0} 💎',

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

    'poi.lbl'     : 'DOPO',
    /* --- i poteri a tempo --- */
    'po.furia'    : 'FURIA',
    'po.furia.d'  : 'COLPO ×2!',
    'po.scudo'    : 'SCUDO',
    'po.scudo.d'  : 'UNA ROSSA GRATIS',
    'po.corvo'    : 'CORVO',
    'po.corvo.d'  : 'MONETE DA OGNI CORSIA',
    'po.parato'   : 'PARATO!',
    /* --- le imprese --- */
    'im.titolo'   : 'IMPRESE',
    'im.sub'      : '{0} su {1} · ognuna paga in diamanti',
    'im.bottone'  : 'IMPRESE {0}/{1} · 💾',
    'im.fatta'    : 'IMPRESA!',
    'im.torre5'   : 'Cinque principesse',
    'im.torre5.d' : 'Libera la principessa della torre 5',
    'im.giro'     : 'Il giro del regno',
    'im.giro.d'   : 'Libera le otto zone: in premio il Campione',
    'im.torre10'  : 'Dieci torri',
    'im.torre10.d' : 'Libera la principessa della torre 10',
    'im.rinascita' : 'Rinato',
    'im.rinascita.d' : 'Fai la prima rinascita',
    'im.oro'      : 'Il tesoro del re',
    'im.oro.d'    : 'Guadagna 100.000 d\'oro in tutto',
    'im.nemici'   : 'Cento mostri',
    'im.nemici.d' : 'Abbatti 100 nemici',
    'im.poteri'   : 'Dono degli dèi',
    'im.poteri.d' : 'Raccogli 10 poteri',
    'im.trappole' : 'Piede leggero',
    'im.trappole.d' : 'Evita 50 trappole',
    'im.serie'    : 'Inarrestabile',
    'im.serie.d'  : 'Una serie di 15 colpi senza farti male',
    'im.perfetti' : 'Occhio di falco',
    'im.perfetti.d' : '10 colpi perfetti di fila nel duello',
    'im.pulita'   : 'Senza un graffio',
    'im.pulita.d' : 'Arriva al muro senza prendere un colpo',
    'im.vetro'    : 'Non mi inganni',
    'im.vetro.d'  : 'Batti il Re di Vetro senza toccare un anello rosso',
    'im.rabbia'   : 'Sangue freddo',
    'im.rabbia.d' : 'Batti un gigante infuriato senza mancare un anello dopo il ruggito',
    /* --- le regole delle zone --- */
    'tr.scivoli'  : 'SCIVOLI!',
    'tr.h.ghiaccio': '❄ ATTENTO AL GHIACCIO: SI SCIVOLA!',
    'tr.h.tronco' : '🪵 TRONCHI CHE ROTOLANO!',
    'tr.h.spuntoni': '🦴 PASSA QUANDO LE OSSA SONO GIÙ!',
    'tr.h.nebbia' : '🌫 NELLA NEBBIA I NUMERI SI VEDONO TARDI',
    'tr.h.lava'   : '🔥 ARANCIONE = STA PER DIVENTARE LAVA',
    'tr.h.geyser' : '💨 I GEYSER SBUFFANO A TEMPO',
    'tr.h.specchio': '🪞 CHI LUCCICA MENTE SUL NUMERO!',
    'tr.h.fulmine': '⚡ DOVE LAMPEGGIA CADE IL FULMINE!',
    /* --- il salvataggio di riserva --- */
    'sv.bottone'  : 'SALVATAGGIO',
    'sv.vai'      : '💾 SALVATAGGIO DI RISERVA ↓',
    'sv.tit'      : '💾 SALVATAGGIO DI RISERVA',
    'sv.sub'      : 'La partita vive in questo browser. Copia il codice e tienilo in una nota: se si cancellano i dati, o cambi telefono, lo incolli qui e riprendi da dove eri.',
    'sv.copia'    : 'COPIA IL CODICE',
    'sv.incolla'  : 'CARICA UN CODICE',
    'sv.carica'   : 'CARICA',
    'sv.sicuro'   : 'SICURO? SOVRASCRIVE TUTTO',
    'sv.copiato'  : 'Copiato! Incollalo in una nota.',
    'sv.seleziona': 'Tieni premuto sul codice e copialo.',
    'sv.qui'      : 'Incolla qui sopra il codice.',
    'sv.rotto'    : 'Questo codice non è valido.',
    'sv.fatto'    : 'PARTITA CARICATA!',

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
                    'wall. What you have left is what you fight the boss with: ' +
                    '<b>tap on time</b> and every hit lands harder.',
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

    'co.bonus'    : '+{0}% POWER',

    'du.perfetto' : 'PERFECT!',
    'du.buono'    : 'GOOD!',
    'du.mancato'  : 'MISS',
    'du.finta'    : 'FAKE!',
    'du.rabbia'   : 'HE IS ENRAGED!',
    'du.h.rabbia' : 'TWO AT A TIME NOW!',
    'du.h.base'   : 'TAP WHEN IT CLOSES!',
    'du.h.svelto' : 'HE\'S QUICK: GET READY!',
    'du.h.storto' : 'NO RHYTHM: WATCH THE RING!',
    'du.h.ombra'  : 'THE RING FADES: COUNT!',
    'du.h.lampo'  : 'FAST AS LAVA!',
    'du.h.doppio' : 'TWO RINGS IN A ROW!',
    'du.h.finta'  : 'DON\'T TAP THE RED ONES!',
    'du.h.salto'  : 'THE TARGET MOVES!',
    'run.record'  : 'NEW RECORD!',

    'rb.head'     : '🔮 REBIRTH',
    'rb.runes'    : 'RUNES',
    'rb.what'     : 'POWER AND GOLD',
    'rb.note'     : 'Back to Tower 1 · upgrades wiped',
    'rb.confirm'  : 'TAP AGAIN TO CONFIRM',
    'rb.done'     : '+{0} RUNES · TAP 🔮 TO SPEND THEM',

    'gu.verdi'    : 'Smash the GREEN towers: they give you power',
    'gu.schiva'   : 'RED ones hurt! Drag to dodge it',
    'gu.bravo'    : 'That\'s it!',
    'gu.arma'     : 'Grab the WEAPON: it smashes bigger towers',
    'gu.muro'     : 'Every block COSTS power: pick the lowest',

    'bt.titolo'   : 'RUNE SHOP',
    'bt.sub'      : 'Runes to spend: <b>{0}</b> · your <b>×{1}</b> bonus stays anyway',
    'bt.chiudi'   : 'CLOSE',
    'bt.ok'       : 'OK?',
    'bt.poche'    : 'YOU NEED {0} MORE RUNES',
    'bt.arma'     : 'Family weapon',
    'bt.scorta'   : 'Backpack',
    'bt.mira'     : 'Steady hand',
    'bt.muro'     : 'Mason',
    'bt.gemme'    : 'Jeweller\'s eye',
    'bt.pelle'    : 'Second skin',
    'bt.e.arma'   : 'start with at least: {0}',
    'bt.e.scorta' : 'start with {0} towers in your pocket',
    'bt.e.mira'   : 'perfect hit: {0} ms',
    'bt.e.muro'   : 'wall −{0}%',
    'bt.e.gemme'  : 'gems +{0}%',
    'bt.e.pelle'  : 'second chance: 💎{0}',

    'og.verdi'    : 'Smash {0} green towers',
    'og.combo'    : 'Reach a {0} combo',
    'og.perfetti' : 'Land {0} perfect hits',
    'og.muro'     : 'Break {0} wall blocks',
    'og.monete'   : 'Collect {0} coins',
    'og.nemici'   : 'Defeat {0} enemies',
    'og.domani'   : 'Done! New one tomorrow',
    'og.fatto'    : 'DAILY GOAL! +{0} 💎',

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

    'poi.lbl'     : 'NEXT',
    /* --- timed powers --- */
    'po.furia'    : 'FURY',
    'po.furia.d'  : 'HIT ×2!',
    'po.scudo'    : 'SHIELD',
    'po.scudo.d'  : 'ONE RED FOR FREE',
    'po.corvo'    : 'RAVEN',
    'po.corvo.d'  : 'COINS FROM EVERY LANE',
    'po.parato'   : 'BLOCKED!',
    /* --- feats --- */
    'im.titolo'   : 'FEATS',
    'im.sub'      : '{0} of {1} · each one pays in diamonds',
    'im.bottone'  : 'FEATS {0}/{1} · 💾',
    'im.fatta'    : 'FEAT!',
    'im.torre5'   : 'Five princesses',
    'im.torre5.d' : 'Free the princess of tower 5',
    'im.giro'     : 'Round the realm',
    'im.giro.d'   : 'Free all eight zones: the Champion is your prize',
    'im.torre10'  : 'Ten towers',
    'im.torre10.d' : 'Free the princess of tower 10',
    'im.rinascita' : 'Reborn',
    'im.rinascita.d' : 'Do your first rebirth',
    'im.oro'      : 'The king\'s treasure',
    'im.oro.d'    : 'Earn 100,000 gold in total',
    'im.nemici'   : 'A hundred monsters',
    'im.nemici.d' : 'Defeat 100 enemies',
    'im.poteri'   : 'Gift of the gods',
    'im.poteri.d' : 'Collect 10 powers',
    'im.trappole' : 'Light foot',
    'im.trappole.d' : 'Avoid 50 traps',
    'im.serie'    : 'Unstoppable',
    'im.serie.d'  : 'A streak of 15 hits without getting hurt',
    'im.perfetti' : 'Hawk eye',
    'im.perfetti.d' : '10 perfect hits in a row in the duel',
    'im.pulita'   : 'Not a scratch',
    'im.pulita.d' : 'Reach the wall without taking a hit',
    'im.vetro'    : 'You can\'t fool me',
    'im.vetro.d'  : 'Beat the Glass King without touching a red ring',
    'im.rabbia'   : 'Cold blood',
    'im.rabbia.d' : 'Beat an enraged giant without missing a ring after the roar',
    /* --- zone rules --- */
    'tr.scivoli'  : 'SLIDING!',
    'tr.h.ghiaccio': '❄ WATCH THE ICE: YOU SLIDE!',
    'tr.h.tronco' : '🪵 ROLLING LOGS!',
    'tr.h.spuntoni': '🦴 PASS WHEN THE BONES ARE DOWN!',
    'tr.h.nebbia' : '🌫 IN THE FOG NUMBERS SHOW UP LATE',
    'tr.h.lava'   : '🔥 ORANGE = ABOUT TO TURN TO LAVA',
    'tr.h.geyser' : '💨 GEYSERS BLOW ON A TIMER',
    'tr.h.specchio': '🪞 THE SHINY ONES LIE ABOUT THEIR NUMBER!',
    'tr.h.fulmine': '⚡ WHERE IT FLASHES, LIGHTNING STRIKES!',
    /* --- backup save --- */
    'sv.bottone'  : 'BACKUP',
    'sv.vai'      : '💾 BACKUP SAVE ↓',
    'sv.tit'      : '💾 BACKUP SAVE',
    'sv.sub'      : 'Your game lives in this browser. Copy the code and keep it in a note: if the data gets wiped, or you change phone, paste it here and pick up where you left off.',
    'sv.copia'    : 'COPY THE CODE',
    'sv.incolla'  : 'LOAD A CODE',
    'sv.carica'   : 'LOAD',
    'sv.sicuro'   : 'SURE? IT OVERWRITES EVERYTHING',
    'sv.copiato'  : 'Copied! Paste it into a note.',
    'sv.seleziona': 'Long-press the code and copy it.',
    'sv.qui'      : 'Paste the code above.',
    'sv.rotto'    : 'This code is not valid.',
    'sv.fatto'    : 'GAME LOADED!',

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
