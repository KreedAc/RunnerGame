# Blocky Squad Run

Runner mobile in portrait, grafica voxel. Corri con la tua squadra di omini a
blocchi, attraversa i gate giusti per moltiplicarti, potenzia l'arma, sopravvivi
ai mob lungo la pista e a fine livello abbatti il boss.

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
`./tools/build-single.sh` → `dist/blocky-squad-run.html`.

## I tre sistemi

**Squadra.** Il contatore è il numero di omini. I gate verdi la moltiplicano o la
ingrossano, i rossi la falciano. In scena se ne disegnano al massimo 26: oltre,
cresce solo il numero — 26 omini bastano a leggere "tanti", 500 costerebbero
frame senza aggiungere informazione.

**Arma.** Sei livelli, da Pugni a Diamante, ciascuno con un danno per omino. I
gate blu la migliorano, quelli viola la peggiorano. L'arma è visibile in mano a
tutta la squadra.

**Mob.** Gruppi di zombie, scheletri e bomber piazzati sulla pista, ciascuno con
una vita. Attraversarli costa `vita ÷ danno` omini: con l'arma giusta ne costa
pochi, a mani nude è un massacro. La perdita è però limitata al 70% della
squadra, così non si viene annientati a metà percorso — il fallimento è il boss.

**Boss.** Alla fine, un bruto con una vita. Vinci se `omini × danno ≥ vita`.
È il punto in cui i tre sistemi si sommano: tanti omini con un'arma scarsa
perdono contro pochi omini ben armati, e viceversa.

## Struttura

```
web/
  index.html          interfaccia, CSS e loader
  src/core.js         configurazione, utility, texture pixel-art, scena
  src/blocks.js       materiali dei blocchi (erba, terra, pietra, legno, foglie…)
  src/world.js        pista, terreno, alberi, case, montagne, nuvole
  src/actors.js       omini a blocchi, volti, armi, animazioni
  src/game.js         folla, gate, mob, boss, generazione livello, loop
  vendor/three.min.js copia locale di three.js (serve al pacchetto offline)
docs/DESIGN.md        scelte di design, bilanciamento e roadmap Android
tools/build-single.sh genera la demo a file singolo
```

Il tuning sta in `CFG` e `WEAPONS` in cima a `core.js`. In console:
`GateRunner.setCount(500)`, `GateRunner.setWeapon(5)`, `GateRunner.moveTo(-2)`.

## Stato

- [x] Mondo voxel con texture generate a runtime (nessun asset da scaricare)
- [x] Squadra che si moltiplica, armi, mob, boss
- [x] Livelli generati proceduralmente con difficoltà auto-tarata
- [ ] Audio e particellari sugli impatti
- [ ] Ostacoli oltre ai mob (muri da sfondare, monete, rampe)
- [ ] Salvataggio, valuta, skin
- [ ] Build Android (vedi `docs/DESIGN.md`)

## Nota sulla proprietà intellettuale

Lo stile voxel a blocchi non è protetto, ma personaggi e creature riconoscibili
di Minecraft sì. Qui i personaggi hanno proporzioni e volti di quel linguaggio
visivo ma palette e nomi originali. Per una pubblicazione vera conviene
allontanarsi ancora: colori, silhouette dei mob e nome del gioco.
