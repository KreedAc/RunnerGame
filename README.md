# Torre di Ghiaccio

Runner mobile in portrait, grafica low-poly con contorni. Il carceriere ha
rinchiuso la principessa in cima alla torre: corri, fatti potenza, sfonda i
trenta blocchi del muro e arrivaci con abbastanza forza da battere il boss
che sta ai suoi piedi.

Bozza giocabile, non un gioco finito: serve a fissare look, sistemi e feel
prima di scegliere la tecnologia definitiva per Android.

## Provarlo

**Online:** <https://kreedac.github.io/RunnerGame/> — funziona da telefono e da
desktop, senza installare niente. Si ripubblica da sola ad ogni push
(`.github/workflows/pages.yml`); perché sia il workflow a pubblicare, in
Impostazioni → Pages va scelto *Source: GitHub Actions*.

In fondo al menù c'è la **marca della build**: se dopo un push il telefono
mostra ancora quella vecchia, sta servendo una copia in cache.

**In locale:**

```bash
# serve un web server: il gioco carica i sorgenti come file separati
cd web && python3 -m http.server 8080
# poi apri http://localhost:8080  (in DevTools attiva la vista mobile, es. Pixel 5)
```

Da telefono: stesso URL sulla rete locale. Si gioca in verticale, trascinando
il dito a sinistra e a destra — una corsia costa il 20,6% della larghezza dello
schermo, uguale su ogni dispositivo. Da desktop funzionano anche le frecce.

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
solo se c'è qualcosa da cancellare. Accanto, due bandierine: il gioco parte
nella lingua del telefono (italiano o inglese) e la si cambia da lì, anche a
metà salita.

**Prima metà — accumuli.** Tre corsie, una riga di scelte ogni 30 blocchi. I
numeri delle colonne sono tarati sulla **torre**, non sulla tua arma: il colpo
di ogni arma è anch'esso un multiplo dello stesso passo, quindi un'arma
migliore apre corsie che prima erano rosse.

| | |
|---|---|
| 🟢 **Torre verde** | Il numero è sotto al tuo colpo: la spacchi e prendi `numero × 3 × POTENZA` |
| 🔴 **Torre rossa** | Troppo dura: se la prendi perdi il 18% della potenza. Schivala |
| 🟡 **Scrigno nel muro** | Murato meglio: costa più del doppio in potenza, ma riempie la borsa |
| 👹 **Nemico** | Due o tre a partita. Lo abbatti per l'oro, oppure ti costa il 22% |
| ⚔️ **Arma a terra** | L'oggetto vero — randello, ascia, spada, martello, lama rúnica — che galleggia sulla corsia: la raccogli e sostituisce la tua |
| ⚡ **Bonus** | Oro, Attacco e Potenza: valgono solo per questa partita |

Il colore del numero è calcolato sul tuo colpo attuale e si aggiorna appena
l'arma cambia: file che erano rosse diventano verdi appena raccogli l'arma dopo.

**Seconda metà — spendi.** Oltre la linea a scacchi ci sono **30 blocchi**
fra te e la torre. Ognuno costa la sua cifra di potenza, i costi crescono, e
nella stessa riga i tre blocchi costano diverso: si sceglie ancora la corsia.
Se la potenza finisce prima, il muro ti ferma. Ogni tanto un blocco è uno
**scrigno**: costa `×2,2` ma rende `×3` d'oro — sacrifichi questa corsa per
finanziare la prossima.

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

**La seconda occasione.** Quando il muro ti ferma o il carceriere ti piega,
se hai **5 diamanti** puoi ripartire da lì con metà della potenza con cui
avevi iniziato quella fase. Una volta sola per corsa, hai sette secondi per
decidere, e compare solo quando può davvero cambiare come finisce.

**Il diario.** In fondo al menù, quanti tentativi è costata ogni torre —
`T1 3 · T2 1 · T3 2*`, dove l'asterisco segna dove hai usato la seconda
occasione. Serve a tarare la difficoltà su una partita vera.

**I cartelli.** Piantati di traverso al muro segnano dove sei arrivato: uno
azzurro sull'ultima corsa, uno dorato sul record.

## Struttura

```
web/
  index.html          interfaccia, CSS e loader
  src/i18n.js         tabella delle lingue (it/en) e traduzione del markup
  src/core.js         configurazione, palette, armi, potenziamenti, scena, salvataggio
  src/art.js          geometrie e materiali condivisi, contorno dei personaggi
  src/world.js        sentiero, scogliere di ghiaccio, pini, cristalli, la torre
  src/actors.js       eroe, nemici, boss, principessa, armi, animazioni
  src/hub.js          menù, portafoglio, potenziamenti, schermate
  src/game.js         corsa, ostacoli, muro, duello col boss, ciclo di gioco
  vendor/three.min.js copia locale di three.js (serve al pacchetto offline)
docs/DESIGN.md        scelte di design, bilanciamento e roadmap Android
tools/sim.js          simulatore dell'economia: quanti tentativi costa ogni torre
tools/smoke.js        gioca una corsa e controlla che nessun numero impazzisca
tools/build-single.sh genera la demo a file singolo (marca la build)
tools/stamp.sh        marca la build: ?v= sui sorgenti, contro la cache
.github/workflows/    pubblicazione automatica su GitHub Pages ad ogni push
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
- [x] Diamanti spendibili: la seconda occasione
- [x] Italiano e inglese, con la lingua indovinata dal telefono
- [ ] Missioni e skin dell'eroe (palette e pezzi, non modelli nuovi)
- [ ] Build Android (vedi `docs/DESIGN.md`)
