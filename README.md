# Torre di Ghiaccio

Runner mobile in portrait, grafica low-poly con contorni. Il carceriere ha
rinchiuso la principessa in cima alla torre: corri, fatti potenza, sfonda i
trenta blocchi del muro e arrivaci con abbastanza forza da battere il boss
che sta ai suoi piedi.

Bozza giocabile, non un gioco finito: serve a fissare look, sistemi e feel
prima di scegliere la tecnologia definitiva per Android.

## Provarlo

```bash
# serve un web server: il gioco carica i sorgenti come file separati
cd web && python3 -m http.server 8080
# poi apri http://localhost:8080  (in DevTools attiva la vista mobile, es. Pixel 5)
```

Da telefono: stesso URL sulla rete locale. Si gioca in verticale, trascinando
il dito a sinistra e a destra. Da desktop funzionano anche le frecce.

Per una copia che si apre con doppio click, senza server:
`./tools/build-single.sh` → `dist/torre-di-ghiaccio.html`.

## Una partita

**Menù.** È l'unica schermata fuori dalla corsa: torre corrente, portafoglio,
record e tre potenziamenti permanenti. **POTENZA** (`×1.10` per livello) e
**ORO** (`×1.08`) sono moltiplicatori composti: non finiscono mai di servire.
**ARMA** è la tacca di partenza, e apre corsie invece di moltiplicare il
bottino. A fine partita ci si torna direttamente, con il riepilogo al posto
della storia. Salvataggio in `localStorage`, e in fondo al menù un
**RICOMINCIA DA CAPO** che lo cancella — due tocchi per confermare, e compare
solo se c'è qualcosa da cancellare.

**Prima metà — accumuli.** Tre corsie, una riga di scelte ogni 30 blocchi. I
numeri delle colonne sono tarati sulla **torre**, non sulla tua arma: il colpo
di ogni arma è anch'esso un multiplo dello stesso passo, quindi un'arma
migliore apre corsie che prima erano rosse.

| | |
|---|---|
| 🟢 **Torre verde** | Il numero è sotto al tuo colpo: la spacchi e prendi `numero × 3 × POTENZA` |
| 🔴 **Torre rossa** | Troppo dura: se la prendi perdi il 18% della potenza. Schivala |
| 👹 **Nemico** | Due o tre a partita. Lo abbatti per l'oro, oppure ti costa il 22% |
| ⚔️ **Arma a terra** | L'oggetto vero — randello, ascia, spada, martello, lama rúnica — che galleggia sulla corsia: la raccogli e sostituisce la tua |
| ⚡ **Bonus** | Oro, Attacco e Potenza: valgono solo per questa partita |

Il colore del numero è calcolato sul tuo colpo attuale e si aggiorna appena
l'arma cambia: file che erano rosse diventano verdi appena raccogli l'arma dopo.

**Seconda metà — spendi.** Oltre la linea a scacchi ci sono **30 blocchi**
fra te e la torre. Ognuno costa la sua cifra di potenza, i costi crescono, e
nella stessa riga i tre blocchi costano diverso: si sceglie ancora la corsia.
Se la potenza finisce prima, il muro ti ferma.

**La rinascita.** Ogni torre chiede il 34% in più della precedente mentre i
potenziamenti crescono col logaritmo del denaro: prima o poi ogni torre costa
qualche corsa in più. Allora si rinasce — si torna
alla Torre 1 con i potenziamenti azzerati, ma ogni **runa** guadagnata vale
`+25%` su potenza e oro **per sempre**. Le rune si sommano fra una rinascita e
l'altra: è l'unica strada per arrivare più in là.

**Le zone.** Ogni torre cambia mondo: Valle Gelata, Bosco Rosso, Dune d'Ossa,
Notte di Rúna. Cambiano cielo, luce, terreno, alberi e montagne — la pista e le
regole restano identiche.

**Il boss.** Sfondati tutti e trenta, ai piedi della torre ti aspetta il
carceriere. Quello che ti resta è la forza con cui lo affronti: i due numeri
scendono insieme, chi arriva a zero cade. Se vinci, la camera sale sul
balcone e la principessa è libera — torre successiva, più dura e più veloce
(la corsa accelera da 15 a 21 con le torri; solo il muro resta al suo ritmo).

**I cartelli.** Piantati di traverso al muro segnano dove sei arrivato: uno
azzurro sull'ultima corsa, uno dorato sul record.

## Struttura

```
web/
  index.html          interfaccia, CSS e loader
  src/core.js         configurazione, palette, armi, potenziamenti, scena, salvataggio
  src/art.js          geometrie e materiali condivisi, contorno dei personaggi
  src/world.js        sentiero, scogliere di ghiaccio, pini, cristalli, la torre
  src/actors.js       eroe, nemici, boss, principessa, armi, animazioni
  src/hub.js          menù, portafoglio, potenziamenti, schermate
  src/game.js         corsa, ostacoli, muro, duello col boss, ciclo di gioco
  vendor/three.min.js copia locale di three.js (serve al pacchetto offline)
docs/DESIGN.md        scelte di design, bilanciamento e roadmap Android
tools/build-single.sh genera la demo a file singolo
```

Tutto il tuning sta in cima a `core.js`: `CFG` (30 blocchi del muro, velocità,
corsie), `C` (palette), `WEAPONS`, `BUFFS`, `UPGRADES` e le formule
`towerNeed / wallBudget / bossHealth / trackUnit`. La manopola della difficoltà
sono `BASE_SHARE` (quanto copre una corsa nuda: alza o abbassa tutta la curva)
e `LEVEL_GAP` (quanto chiede ogni torre in più della precedente: la inclina).
In console: `BlockyRun.setPower(5000)`, `BlockyRun.moveTo(-2.4)`, `BlockyRun.need`.

## Stato

- [x] Storia: principessa rapita, muro da sfondare, boss ai piedi della torre
- [x] Grafica low-poly liscia con contorni (niente più voxel)
- [x] Menù con potenziamenti permanenti e salvataggio locale
- [x] Corsie con torri di mattoni da spaccare o schivare, nemici, armi, bonus
- [x] Rinascita con rune permanenti (+25% potenza e oro l'una)
- [x] Quattro zone a tema che cambiano ad ogni torre
- [x] Ombre proiettate
- [x] Muro di 30 blocchi a consumo di potenza, con cartelli del record
- [x] Duello col boss e camera che sale sulla principessa alla vittoria
- [ ] Audio e particellari oltre alle scaglie
- [ ] Missioni, valuta premium, skin
- [ ] Build Android (vedi `docs/DESIGN.md`)
