# Blocky Power Run

Runner mobile in portrait, grafica voxel. Corri lungo tre corsie: scegli cosa
spaccare e cosa schivare, potenzia l'arma ai banchi da lavoro, raccogli i bonus
della partita — e al traguardo la potenza accumulata si consuma blocco dopo
blocco finché regge.

Bozza giocabile, non un gioco finito: serve a fissare look, sistemi e feel prima
di scegliere la tecnologia definitiva per Android.

## Provarlo

```bash
# serve un web server: il gioco carica i sorgenti come file separati
cd web && python3 -m http.server 8080
# poi apri http://localhost:8080  (in DevTools attiva la vista mobile, es. Pixel 5)
```

Da telefono: stesso URL sulla rete locale. Si gioca in verticale, trascinando il
dito a sinistra e a destra. Da desktop funzionano anche le frecce.

Per una copia che si apre con doppio click, senza server:
`./tools/build-single.sh` → `dist/blocky-power-run.html`.

## Come funziona una partita

**Menù iniziale.** È l'unica schermata fuori dalla corsa: livello, portafoglio,
record e tre potenziamenti permanenti comprati con le monete (Potenza iniziale,
Arma di partenza, Guadagno). A fine partita ci si torna direttamente — niente
schermata intermedia — e al posto delle regole compare il riepilogo della corsa
appena chiusa. Il salvataggio sta in `localStorage`.

**La corsa.** Tre corsie, una riga di scelte ogni 30 blocchi:

| | |
|---|---|
| 🟢 **Torre verde** | Il numero è sotto al tuo colpo: la spacchi e prendi `numero × 3` di potenza |
| 🔴 **Torre rossa** | Troppo dura: se la prendi perdi il 14% della potenza. Schivala |
| 👾 **Nemico** | Due o tre per partita. Se il tuo colpo basta lo abbatti e prendi monete, altrimenti ti costa il 22% della potenza |
| 🔨 **Banco da lavoro** | Ci passi attraverso e l'arma sale di livello: da Pugni a Diamante |
| ⚡ **Bonus** | Guadagno, Attacco e Potenza: valgono solo per questa partita e si impilano nella colonnina di sinistra |

Il colore del numero non è decorazione: è calcolato sul tuo colpo attuale e si
aggiorna appena l'arma cambia. Quello che era rosso diventa verde dopo un banco
da lavoro.

**Il finale.** Oltre la linea a scacchi comincia un corridoio di blocchi
numerati. Ogni blocco che sfondi costa il suo numero di potenza, e i costi
crescono riga dopo riga. Si continua finché la potenza regge: quanti blocchi
abbatti è il punteggio. Alcuni sono forzieri e pagano monete. Anche qui si
sceglie la corsia, perché nella stessa riga i costi sono diversi.

**I cartelli.** Piantati di traverso alla pista, segnano dove sei arrivato: uno
azzurro sull'ultima corsa, uno dorato sul record. Si vedono da lontano, quindi
la corsa ha un bersaglio invece di un numero astratto — e quando superi quello
dorato parte lo striscione «RECORD SUPERATO!».

## Struttura

```
web/
  index.html          interfaccia, CSS e loader
  src/core.js         configurazione, armi, potenziamenti, texture, scena, salvataggio
  src/blocks.js       materiali dei blocchi (erba, terra, pietra, legno, foglie…)
  src/world.js        pista, terreno, alberi, case, montagne, nuvole
  src/actors.js       omini a blocchi, volti, armi, animazioni
  src/hub.js          menù iniziale, portafoglio, potenziamenti, schermate
  src/game.js         corsa, ostacoli, nemici, banchi, finale, ciclo di gioco
  vendor/three.min.js copia locale di three.js (serve al pacchetto offline)
docs/DESIGN.md        scelte di design, bilanciamento e roadmap Android
tools/build-single.sh genera la demo a file singolo
```

Il tuning sta in `CFG`, `WEAPONS`, `BUFFS` e `UPGRADES` in cima a `core.js`.
In console: `BlockyRun.setPower(5000)`, `BlockyRun.moveTo(-2.4)`, `BlockyRun.start()`.

## Stato

- [x] Menù iniziale con potenziamenti permanenti e salvataggio locale
- [x] Mondo voxel con texture generate a runtime (nessun asset da scaricare)
- [x] Corsie con ostacoli da rompere o schivare, nemici, banchi da lavoro, bonus
- [x] Finale a consumo di potenza, con scelta di corsia e forzieri
- [x] Cartelli su pista per ultima corsa e record, con striscione al sorpasso
- [ ] Audio e particellari oltre alle scaglie
- [ ] Zone con temi diversi (neve, deserto, notte)
- [ ] Missioni giornaliere, valuta premium, skin
- [ ] Build Android (vedi `docs/DESIGN.md`)

## Nota sulla proprietà intellettuale

Lo stile voxel a blocchi non è protetto, ma personaggi e creature riconoscibili
di Minecraft sì. Qui i personaggi hanno proporzioni e volti di quel linguaggio
visivo ma palette e nomi originali. Per una pubblicazione vera conviene
allontanarsi ancora: colori, silhouette dei mob e nome del gioco.
