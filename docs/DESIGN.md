# Torre di Ghiaccio — note di design

## 1. La storia serve al gioco, non il contrario

Il carceriere ha rapito la principessa e la tiene in cima alla torre. È una
premessa banale di proposito: il suo lavoro è dare un nome a numeri che prima
erano astratti.

Prima il finale era "vado avanti finché posso" e il punteggio era un numero
senza scala. Adesso il muro ha una fine — **30 blocchi** — e dietro c'è
qualcosa di preciso. Il giocatore non insegue un record, insegue una torre che
vede in fondo alla pista fin dal primo secondo di corsa.

E soprattutto la storia impone la struttura giusta: **arrivare non basta**. La
potenza consumata dal muro è la stessa che serve contro il boss, quindi
sfondare al limite significa presentarsi a mani vuote. Il potenziamento smette
di essere "un numero più grande" e diventa "il margine per il boss".

## 2. Le formule

Tutto il bilanciamento di una torre sta in poche righe di `core.js`:

```
towerNeed(n)  = 430 × 1.62^(n-1)     quanta potenza serve in tutto
wallBudget(n) = towerNeed × 0.62     quanto se ne va nel muro
bossHealth(n) = towerNeed × 0.38     quanto ne resta da spendere

trackUnit(n)  = towerNeed × 0.42 / (righe × 3 × 0.75 × 1.34^(n-1))
```

`wallBudget` è il costo del percorso **migliore** attraverso il muro: i costi
delle trenta righe sono normalizzati perché la somma delle scelte ottime faccia
esattamente quella cifra. Giocare male costa di più — nella stessa riga i tre
blocchi valgono ×1, ×1.6 e ×2.3 del passo.

Il 62/38 è la parte interessante. Con 100/0 il boss sarebbe un dazio; con 0/100
il muro sarebbe scenografia. Così un giocatore perfetto senza potenziamenti
sfonda il muro e arriva davanti al carceriere quasi scarico: vede la torre, la
principessa, e perde. È esattamente la sconfitta che fa comprare il primo
potenziamento.

## 2b. Perché le torri 2, 3 e 4 cadevano al primo colpo

La prima versione tarava le colonne della pista sull'**arma del giocatore**:
`hp = danno × 0,55…0,95`. Sembrava ovvio — la pista si adatta a te — ed era
l'errore che ha rotto tutta la curva.

Il danno raddoppia ad ogni tacca d'arma. Se le colonne valgono quanto il tuo
danno, comprare un'arma raddoppia **sia** quello che riesci a rompere **sia**
quello che ti frutta: ×2 di bottino per tacca, contro un +62% richiesto dalla
torre successiva. Una tacca d'arma pagava una torre e mezza. Comprata l'arma,
la torre dopo cadeva al primo tentativo — e le tacche sono sei: finite quelle,
la crescita si fermava di colpo e non si passava più. Piatto, poi muro.

La correzione è un cambio di ancoraggio: **le colonne sono tarate sulla torre,
non su di te**. `trackUnit(n)` è il passo del livello, e tutto discende da lì —
colonna facile 0,55-0,95 unità, colonne dure 1,3-2,6, e il colpo di ogni arma
è anch'esso un multiplo dell'unità (`hit`: dai pugni a 0,85 alla Lama Rúna a
3,5). Così l'arma torna a fare il suo mestiere — **aprire corsie** — e il suo
guadagno è limitato: rompere sempre la colonna più dura invece della più facile
vale circa il doppio *in tutto*, non il doppio per tacca.

A quel punto serviva un asse di crescita che non finisse mai, e i potenziamenti
sono diventati moltiplicatori composti: POTENZA `×1.10^liv` su tutta la potenza
raccolta, ORO `×1.08^liv` sul bottino. Prima POTENZA era `20 + 14×liv`, cioè
una somma fissa che dalla quinta torre in poi era meno di un arrotondamento:
di fatto c'era un solo potenziamento utile, e finiva.

Le manopole sono due e fanno cose diverse — impararlo è costato un secondo
giro di misure. `LEVEL_GAP = 1.34` **inclina** la curva: quanto ogni torre
chiede in più di quello che la pista dà da sola. Alzarla non tocca le prime
torri (la prima non ha nessun gap davanti) e fa esplodere la coda — a 1,45 la
nona torre passava da 3 a 15 tentativi mentre la seconda restava a 2. Per
"è troppo facile all'inizio" serve invece `BASE_SHARE = 0.42`, quanto copre una
corsa nuda: **alza tutta la curva in blocco**, prima torre compresa.

Misurato con un simulatore dell'economia (`playRun` + un giocatore che sceglie
sempre la corsia migliore, 10 progressioni complete), poi verificato in gioco
con un autopilota che gioca davvero le corse nel browser:

| torre | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| all'inizio | 2,3 | 1,0 | 1,0 | 1,0 | 1,0 | 1,5 | ∞ | — | — | — | — | — | — | — |
| primo giro | 3,2 | 1,9 | 2,1 | 1,5 | 2,1 | 2,2 | 2,4 | 2,0 | 3,2 | 4,1 | 4,4 | 6,0 | 6,4 | 6,8 |
| adesso | 4,3 | 2,5 | 1,8 | 2,2 | 3,2 | 2,3 | 3,1 | 4,5 | 3,2 | 5,8 | 5,5 | 9,8 | 9,0 | 14,0 |

(tentativi medi per superare la torre). Nessun vicolo cieco: la curva sale
piano e la rinascita la rimette in orizzontale.

Il primo giro di correzioni aveva sistemato la struttura ma lasciato la curva
troppo bassa — le torri 2, 3 e 4 cadevano ancora al primo tentativo. Il numero
che le ha alzate è `BASE_SHARE`, da 0,55 a 0,42: adesso una corsa senza
potenziamenti alla prima torre si ferma **al muro**, attorno al
venticinquesimo blocco, e non vede nemmeno il carceriere.

E il simulatore gioca perfetto, cosa che un pollice su un telefono non fa: due
modifiche pesano solo sulla persona vera. La terza corsia è occupata nel 70%
delle righe invece che nel 45% — una corsia vuota rende la riga una non-scelta,
si tirava dritto senza rischiare niente — e sbagliare colonna costa il 18%
della potenza invece del 14%.

## 2c. La corsa accelera

Il bilanciamento è solo metà della difficoltà: l'altra metà è quanto tempo hai
per decidere. La velocità sale di 0,7 unità a torre da 15 a 21 — un terzo in
più — quindi alle torri alte una riga passa in 1,4 secondi invece di 2.

Il muro però è escluso: i suoi blocchi si distanziano insieme alla velocità
(`wallGap × velocità / 15`), così il tempo per raggiungere il blocco più
economico resta identico a quello della prima torre. Senza questo accorgimento
dalla nona torre in poi non si farebbe più in tempo a scegliere la corsia, il
percorso ottimo diventerebbe irraggiungibile e il bilanciamento — che su quel
percorso è costruito — salterebbe.

## 2d. La stessa inquadratura su ogni schermo

Il FOV di three.js è **verticale**: tenendolo fisso a 48°, la larghezza di
mondo inquadrata dipende dalla forma dello schermo. Le tre corsie, larghe 8
unità, occupavano il 117% della larghezza sul telaio su cui è stato disegnato
il gioco (420×900), il 102% su un telefono in browser — la barra degli
indirizzi accorcia la pagina — e il 73% su un tablet. Stessa scena, ma vista
piccola e lontana, con le corsie più vicine fra loro.

Quindi si fa il contrario: si fissa la **larghezza** inquadrata e si ricava il
FOV verticale, `fov = 2·atan(K / aspect)`, limitato fra 28° e 58°. Su uno
schermo più alto si vede più strada davanti, mai una pista più stretta. Adesso
la larghezza è 6,8 unità ovunque.

**E il controllo va con l'inquadratura.** Il trascinamento convertiva i pixel
in unità di mondo con una costante fissa (0,055): 44 px per cambiare corsia,
qualunque fosse il telefono. Su uno schermo dove la corsia è larga 126 px
invece di 147 lo stesso dito ne attraversa di più, e il gioco sembra
nervosissimo. Adesso il passo si misura in **fette di schermo**:
`pixel × worldPerPixel() × 2,0`. Una corsia costa il **20,6% della larghezza**
su qualunque dispositivo — misurato trascinando davvero il puntatore su quattro
formati, da 360×800 a 768×1024 — dove prima era il 10% su un telefono e il 12%
su un altro.

Effetto collaterale da sistemare: con la pista inquadrata più stretta l'eroe è
cresciuto, e nel menù finiva dietro al bottone ALL'ASSALTO. La camera del menù
è arretrata da 13 a 16,5 unità.

## 2e. La cache del telefono

GitHub Pages serve tutto con dieci minuti di validità e non permette di
cambiare gli header. Su un telefono succedeva di peggio che vedere la versione
vecchia: `index.html` poteva arrivare nuovo e i sei sorgenti no — o metà e
metà, ognuno con la sua scadenza. Un miscuglio che non è mai esistito.

Quindi i sorgenti si chiedono con una **marca in coda**: `src/core.js?v=260909-2343`.
Cambiando l'indirizzo la cache non c'entra più, e i sei file arrivano sempre
dalla stessa build. `tools/stamp.sh` la scrive in `web/index.html` — data e ora
in locale, il commit in CI — e `build-single.sh` la richiama da solo, così non
esiste una costruzione senza marca. three.js resta fuori: non cambia mai, e
tenerlo in cache è il motivo per cui la seconda apertura è istantanea.

La stessa marca è stampata in fondo al menù. Serve a rispondere alla domanda
che altrimenti non ha risposta guardando lo schermo: *è la versione nuova o
una copia vecchia?*

## 2f. Il tag che mancava

Sul telefono l'interfaccia usciva minuscola: scritte, pillole della HUD e
soprattutto le carte dei potenziamenti. La causa era un tag assente in
`web/index.html`, che cominciava direttamente con `<title>`:

```html
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
```

Senza, un browser mobile impagina a **980 px virtuali** e poi rimpicciolisce
tutto per farlo entrare nello schermo. Misurato con l'emulazione mobile:
`innerWidth` 981 su uno schermo da 412, `document.compatMode` a `BackCompat`
(quirks mode, perché mancava anche il doctype), carte larghe 312 px disegnate
e poi schiacciate a 131. Ogni cosa 2,4 volte più piccola del dovuto.

Non si era mai visto prima perché l'**artifact** di Claude avvolge la pagina in
un `<head>` proprio, viewport compreso: lì era sempre stato giusto. Ed è
invisibile anche in Playwright con una finestra normale — serve
`isMobile: true`, altrimenti la larghezza della finestra fa da viewport e il
tag non serve a niente.

Da qui una regola per le prove: **una pagina mobile va provata in emulazione
mobile**, non solo ridimensionando la finestra.

## 2g. L'eroe nella fascia libera

Nel menù l'eroe finiva dietro al bottone ALL'ASSALTO. Non esiste una posizione
fissa della camera che vada bene: la fascia libera fra il riepilogo e il
bottone cambia con l'altezza dello schermo, e cambia anche fra la prima
partita (c'è la storia, lunga) e le successive (c'è il riepilogo, corto), e
ancora quando compare la carta della rinascita.

Quindi il gioco la misura. `aimMenuCamera()` legge la fascia dal DOM, arretra
la camera quanto basta perché l'eroe ci stia dentro (fra 16,5 e 34 unità) e
poi cerca per bisezione l'inclinazione che lo mette al centro. Sono una
ventina di proiezioni di un punto, una volta sola all'apertura del menù.

Su schermi molto corti con la carta della rinascita aperta la fascia si riduce
a una quindicina di pixel: lì nessuna camera basta, e l'eroe resta **centrato**
dietro alle carte — se sborda in modo simmetrico sopra e sotto sembra che stia
dietro apposta, mentre un bottone appoggiato sulla faccia sembra un errore.

## 2h. Novanta numeri sovrapposti

Le etichette sono disegnate sopra a tutto (`depthTest: false`) perché un numero
non finisca mai dietro alla colonna che descrive. Il rovescio è che non si
nascondono neanche fra loro: dalla linea a scacchi si vedevano tutti e novanta
i numeri del muro impilati in una macchia illeggibile.

Adesso svaniscono con la distanza, e il muro prima degli altri — le sue righe
stanno a 4,5 unità l'una dall'altra e contano solo quelle su cui stai per
decidere (piene fino a 16 unità, sparite a 34), mentre le colonne della pista,
distanti 30, vanno viste da lontano per avere il tempo di scegliere la corsia
(42 e 78). Dalla linea a scacchi si leggono 21 etichette invece di 90.

## 2i. Il giocatore vero è più bravo del "perfetto"

Il simulatore massimizzava ogni singola riga: prendeva **sempre** l'arma a
terra, e nel muro **sempre** il blocco più economico. Sembrava la definizione
di gioco ottimo. Una partita vera, raccontata da chi l'ha giocata, dice che è
sbagliata in tre punti:

1. **L'arma a terra si salta**, se il colpo attuale apre già le colonne
   davanti. Prenderla costa una riga intera di bottino e non apre niente che
   non fosse già aperto.
2. **Nel muro non si insegue il blocco più economico**: «ci vogliono troppi
   riflessi». Si punta invece agli **scrigni**, che pagano oro.
3. Dalla settima torre in poi, con la spada comprata, l'arma a terra non
   serviva più mai.

Modellati questi tre comportamenti, il simulatore azzecca la partita vera quasi
riga per riga — e succede la cosa interessante: **il giocatore "umano" è più
bravo di quello "perfetto"**, 18 corse contro 24 per arrivare alla ottava torre.

| chi gioca | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | in tutto |
|---|---|---|---|---|---|---|---|---|---|
| il "perfetto" | 4,1 | 2,5 | 1,9 | 1,5 | 2,6 | 2,8 | 3,5 | 4,6 | 24 |
| lo stile vero | 4,9 | 1,7 | 1,2 | 1,5 | 1,8 | 1,9 | 2,3 | 2,4 | 18 |
| la partita vera | 6 | 2 | 2 | 2 | 1* | 2* | 2* | — | 17 |

La difficoltà va tarata sul secondo, non sul primo: è in `tools/sim.js`, che
legge le costanti da `core.js` e si ferma se non le trova più.

E restano due cose che il racconto ha messo a nudo:

**L'arma a terra è diventata una trappola.** Il menù dice «raccogli le armi che
trovi sulla corsia», e dalla quarta tacca di ARMA in poi seguire quel consiglio
fa perdere. Un oggetto che sembra un premio e invece è una perdita punisce
proprio l'istinto che il gioco insegna. La causa: le colonne dure arrivano a
2,6 passi e il Martello colpisce per 2,7 — comprata l'arma è tutto verde, e il
colore smette di dire qualcosa.

**Il muro chiede riflessi, non scelte.** Il percorso migliore — il blocco più
economico ad ogni riga — è quello su cui è costruito `wallBudget`, ma alla
velocità delle torri alte non è eseguibile: il giocatore ha smesso di provarci
e si è inventato un altro gioco, «prendo gli scrigni». Una meccanica che non si
riesce a eseguire non produce una decisione, produce rumore.

## 2j. Togliere le due strade obbligate

Le due cose messe a nudo dalla partita vera sono state riparate insieme,
perché toccavano lo stesso nervo: **c'era una risposta giusta nascosta**, e
chi non la trovava giocava peggio senza sapere perché.

**L'arma non è più una trappola.** Le colonne dure arrivavano a 2,6 passi e il
Martello colpisce per 2,7: comprata la quarta tacca d'ARMA era tutto verde,
il colore smetteva di dire qualcosa e raccogliere l'arma a terra — cosa che il
menù *consiglia* — costava una riga di bottino in cambio di niente. Il tetto è
salito a **3,8 passi** (3,2 sulla terza corsia), oltre la portata del Martello
e al limite di quella della Lama Rúna: c'è sempre del rosso davanti, e l'arma
serve fino all'ultima tacca.

**Il muro non è più un test di riflessi.** La forbice fra le tre corsie era
×1 ×1,6 ×2,3 — sbagliare corsia costava più del doppio, e alla velocità delle
torri alte inseguire il blocco più economico non è eseguibile. Stretta a
**×1 ×1,35 ×1,7**: sbagliare si paga, non rovina la corsa. Al suo posto la
scelta vera è lo **scrigno**, che costa `×2,2` di potenza e rende `×3` d'oro —
sacrificare questa corsa per finanziare la prossima.

Prezzo e premio dello scrigno si calcolano tutti e due sul costo normale della
corsia, non l'uno sull'altro. Legandoli — com'era all'inizio — alzare il prezzo
alzava anche il premio, e la scelta restava identica a sé stessa qualunque
numero si mettesse: due ore di misure per scoprire che la manopola non era
collegata a niente.

**E le monete valgono in proporzione alla torre.** Erano fisse a 8 d'oro: alla
prima torre erano soldi, alla decima — dove un potenziamento costa
quattordicimila — erano decorazione che luccicava.

Il risultato si legge in una riga. Corse necessarie per arrivare alla decima
torre, per tre modi diversi di giocare:

| stile | prima | adesso |
|---|---|---|
| insegue il blocco più economico | 35 | 27 |
| caccia gli scrigni | 26 | 25 |
| raccoglie sempre l'arma, come dice il menù | 24 | 25 |

Erano lontani il 35%, adesso stanno **entro l'8%**: non esiste più una strada
nascosta che è quella giusta, e la differenza la fa come giochi, non cosa hai
capito del bilanciamento. `BASE_SHARE` e `LEVEL_GAP` sono rimaste dov'erano —
è cambiata la trama, non la durezza.

## 2k. Il NaN degli scrigni, e la prova che mancava

Un bug vero, vale la pena raccontarlo per intero perché l'errore non è
stato scrivere il codice sbagliato: è stato **non accorgersi di non averlo
scritto affatto**.

Cercando il valore giusto dello scrigno, la riga che lo genera è stata
riscritta più volte con delle sostituzioni al volo da riga di comando. La
modifica definitiva — quella che aggiungeva il campo `loot` — cercava il
testo *com'era prima* di quelle sostituzioni, non l'ha trovato e **non ha
fatto niente, in silenzio**. Il gioco è rimasto con `it.loot` inesistente:
`Math.round(undefined * coinMul())` fa `NaN`, e da lì ogni somma è NaN.
L'oro è sparito dal portafoglio, il bottino di fine corsa è diventato
`+NaN`, e JSON ha scritto `"coins": null` sul salvataggio — che così è
rimasto rotto anche dopo la correzione.

Tre riparazioni, in ordine di importanza:

1. **Il salvataggio si ripara da solo.** Al caricamento ogni numero che non
   è un numero finito torna al suo valore di partenza. Un campo rotto non
   deve costringere a ricominciare da capo.
2. **`tools/smoke.js`** gioca una corsa intera e controlla che *ogni numero
   che il giocatore vede* sia finito — durante la corsa, sullo schermo e
   dentro il salvataggio. Le prove di prima guardavano che la corsa
   finisse, non che finisse con dei numeri veri. Rimesso il bug, questa
   prova lo prende: `run.coins non è un numero: NaN`.
3. **Il simulatore controlla di misurare il gioco vero.** `CHEST_PRICE` e
   `CHEST_LOOT` esistevano in `core.js` e nessuno le usava: lui le leggeva
   e riportava numeri di un gioco che non esisteva. Adesso verifica che
   `game.js` le nomini davvero, e altrimenti si ferma.

La lezione che resta: **una sostituzione di testo che non trova niente
deve essere un errore, non un silenzio.** Vale per gli strumenti e vale per
chi li usa.

## 3. Il colore è la regola, e la forma dice cosa fa

Ogni cristallo e ogni nemico mostrano un numero, **verde se il tuo colpo attuale
ci arriva, rosso se no**. Non è una proprietà dell'oggetto: è una relazione con
te in questo momento. Passata una fucina, `refreshThreats()` ricolora tutto
quello che non hai ancora incontrato, e file che erano rosse diventano verdi
davanti agli occhi.

È il modo più economico per insegnare il gioco senza tutorial, e trasforma
l'arma da bonus generico a chiave che apre corsie.

**La forma giusta al terzo tentativo.** Gli ostacoli da spaccare sono passati
per tre versioni. Prima erano colonne coniche con una punta in cima: a distanza
si leggevano come omini, cioè come nemici — l'opposto di quello che sono. Poi
grappoli di cristalli, che però sembravano un premio da raccogliere, non
qualcosa da sfondare. Adesso sono **torri di mattoni con le merlature**: una
costruzione, che è esattamente quello che sono. La muratura viene da una sola
texture in scala di grigi colorata dal materiale, quindi verde e rossa costano
un materiale l'una.

E l'arma non è più un arco da attraversare, un "gate" astratto: è **l'oggetto
vero**, posato sulla corsia dentro un anello dorato, che ruota e ondeggia.
Randello, ascia, spada, martello e lama rúnica hanno sagome diverse apposta —
a terra devi riconoscere da lontano quale stai per prendere, non leggerne il
nome.

## 4. Grafica: dal voxel al low-poly liscio

Il look a blocchi è stato abbandonato. Cosa è cambiato davvero:

- **Niente texture.** Colori piatti su `MeshLambertMaterial`. Le texture pixel
  16×16 e il filtro NEAREST sono spariti del tutto.
- **`flatShading` sul paesaggio.** Rocce, guglie di ghiaccio, pini e cristalli
  sono coni e sfere a poche facce con le sfaccettature visibili. I personaggi
  restano lisci: il contrasto fra i due li stacca dallo sfondo.
- **Ombre proiettate.** Una luce direzionale con riquadro d'ombra stretto
  (±26 unità) che **insegue l'eroe**: senza inseguirlo le ombre sparirebbero
  dopo venti metri. È il singolo cambiamento che ha alzato di più la resa.
- **Ombre proiettate.** Una luce direzionale con riquadro d'ombra stretto
  (±26 unità) che **insegue l'eroe**: senza inseguirlo le ombre sparirebbero
  dopo venti metri. È il singolo cambiamento che ha alzato di più la resa, e si
  spegne con `CFG.shadows = false` se una fascia bassa non regge.
- **Contorni sui personaggi** (`addOutline`). Guscio rovesciato: una copia di
  ogni mesh, ingrandita di 0.1 e disegnata solo dalle facce interne. È quello
  che dà il bordo scuro dei giochi cartoon senza post-processing, e costa solo
  il doppio delle mesh su una decina di attori.
- **Poche geometrie riusate.** Otto primitive in `GEO` per tutto il gioco.
  Personaggi, torre, cristalli e blocchi sono le stesse forme scalate.
- **Cielo a sfumatura** invece del colore piatto, e nebbia intonata
  all'orizzonte.

La nebbia è stata la trappola: partiva a 110 unità su una pista lunga 700, e
tutto oltre la prima riga di colonne era latte bianco. Portata a 190–580 la
scena ha ripreso profondità e i colori sono tornati.

## 5. Il momento della vittoria

Battuto il boss, la camera lascia il duello e sale sul balcone della torre.
Il tetto è stato alzato e ristretto apposta: nella prima versione la
principessa spariva sotto la falda, ed è l'unica cosa che il giocatore vuole
vedere quando vince.

## 6. La rinascita, e perché serve

Ogni torre chiede il **34% in più** di moltiplicatore rispetto alla precedente
(`LEVEL_GAP`), e i potenziamenti crescono col **logaritmo** del denaro: ogni
tacca di POTENZA vale +10% ma costa il 34% più della precedente. Finché
l'incasso di una corsa cresce quanto il prezzo della tacca successiva si
avanza; poi il rapporto si gira e ogni torre costa qualche corsa in più della
precedente — sei o sette tentativi attorno alla dodicesima, e la salita
continua a farsi ripida.

Non è un muro secco (quello c'era prima, ed era un bug di bilanciamento: finite
le sei tacche dell'arma non si passava più). È una salita che rallenta, ed è
esattamente il punto in cui rinascere conviene.

La rinascita è l'uscita da quel vicolo. Si torna alla Torre 1 con oro e
potenziamenti azzerati, ma si incassano tante **rune** quante sono le torri già
superate, e ogni runa vale `+25%` su potenza e oro **per sempre**. Le rune si
sommano fra una rinascita e l'altra, quindi ogni giro parte da più in alto e il
tetto si sposta di due o tre torri per volta.

Due attriti voluti:

- La carta compare **solo dopo aver superato almeno una torre**, e pulsa quando
  l'ultima corsa è stata una vittoria: è lì che la scelta ha senso.
- Serve **toccare due volte**. Azzerare i potenziamenti è irreversibile, e un
  tocco solo, in un gioco che si gioca col pollice, è troppo poco.

## 6b. Ricominciare da capo

In fondo al menù, sotto ai potenziamenti, c'è **RICOMINCIA DA CAPO**: cancella
il salvataggio e riporta alla Torre 1 senza rune né oro. È la rinascita senza
premio, e serve soprattutto a rivedere il gioco con gli occhi di chi comincia
adesso — cosa che, tarando la difficoltà, si fa di continuo.

Tre attriti, gli stessi ragionamenti della rinascita: sta **in fondo**, lontano
dal pollice che preme ALL'ASSALTO; chiede **due tocchi**, perché non si torna
indietro; e **non compare affatto** finché non c'è qualcosa da cancellare, così
la prima schermata resta pulita.

## 6c. I diamanti, e cosa comprano

I diamanti si raccoglievano dalla prima versione e non si spendevano mai: un
numero nella barra che promette qualcosa e non mantiene è peggio che non
averlo. Adesso comprano la **seconda occasione**.

Compare nel momento in cui la corsa finirebbe — fermato dal muro a due blocchi
dalla torre, o piegato dal carceriere — e restituisce **metà della potenza con
cui avevi iniziato la fase in cui sei caduto**, non metà di quella che ti
serviva. La differenza conta: è un aiuto a chi c'era quasi, non un modo per
comprare una torre fuori portata. Nel duello si riprende con il boss già
ferito dove l'avevi lasciato, quindi vinci lo scontro ripreso solo se eri
arrivato oltre i due terzi.

Tre vincoli tengono la cosa onesta:

- **una volta per corsa**, così non si compra una torre a rate;
- **costa 5 diamanti** contro un raccolto di uno o due a partita — un lusso
  ogni tre o quattro corse, non un'abitudine;
- **si paga prima con i diamanti raccolti adesso**, poi con quelli in cassa:
  quello che hai appena trovato è ancora tuo anche se la corsa finisce male.

Il titolo del pannello dice *TI MANCAVA POCO* solo se è vero (oltre il
ventiquattresimo blocco); altrimenti dice *CORSA FINITA*. Dirlo a chi si è
fermato al quinto è una presa in giro, e si vede subito.

C'è anche un motivo che guarda avanti: in un gioco pubblicato questo è
esattamente il punto dove si mette la pubblicità con premio. Il prototipo si
porta dietro già la struttura giusta.

**E non si vende quello che non può servire.** Sfondare l'ultimo blocco del
muro con la potenza esattamente a zero è legittimo — il muro l'hai preso, ed è
il boss che deve fermarti — ma ti fa entrare nel duello a mani vuote. Metà di
zero è zero: il gioco offriva *«+1 potenza»* per cinque diamanti. Adesso
l'offerta compare solo quando può cambiare come finisce: nel duello, se la
potenza restituita supera quello che resta al carceriere — i due numeri
scendono insieme, quindi qualunque cifra inferiore è denaro buttato; al muro,
se basta ad arrivare dall'altra parte giocando bene (la somma del blocco più
economico di ogni riga che resta).

Un'offerta che non può salvarti è peggio di nessuna offerta: la prima ti frega
cinque diamanti, la seconda ti lascia almeno la dignità della sconfitta.

## 6c-bis. Gli aspetti, e perché non danno niente

I diamanti compravano una cosa sola, la seconda occasione. Adesso ne comprano
due, ed è una tensione voluta: sono pochi, e chi ne spende settanta per
vestirsi bene ha rinunciato a quattordici seconde occasioni. Questa è la
scelta, e senza di essa un negozio di aspetti è solo un pulsante.

Nessun aspetto tocca una regola. Un vantaggio comprato con una valuta che si
raccoglie giocando trasforma "sono bello" in "sono avanti", e da lì il gioco è
un altro — quello dove chi paga vince, che non è quello che stiamo facendo.

Non sono modelli nuovi: è lo stesso vichingo ridipinto. Undici colori a testa
in `SKINS` (pelliccia, tunica, acciaio, corna, stivali, scudo, rifiniture),
zero geometrie in più, e la silhouette — che è quello che davvero si legge a
schermo piccolo — resta la stessa in tutte. Cinque: Vichingo (di serie),
Brace 💎15, Brina 💎35, Guardia Notturna 💎70, Campione 💎120.

Due cose imparate disegnandoli:

- **una tinta sola non basta.** La Guardia Notturna era viola dalla testa ai
  piedi e la sagoma spariva: ogni aspetto ha bisogno di almeno un pezzo chiaro
  accanto a quello scuro — qui l'acciaio e le corna.
- **colori, non nomi.** Cinque nomi in fila non si leggono su un telefono,
  cinque macchie di colore sì. Le pastiglie sono solo colore; il nome di
  quella toccata sta nella riga sotto, una alla volta. E comprare chiede due
  tocchi come la rinascita: i diamanti sono pochi e un pollice sbaglia.

I materiali sono condivisi per colore (`matCache`), quindi ridipingere l'eroe
sul posto ridipingerebbe mezzo mondo: cambiando aspetto lo si **ricostruisce**,
che capita una volta ogni tanto e costa niente. Da qui `hero` che è diventato
`let`.

`tools/skins.js` fa il giro completo — chiuso, pagato, indossato, salvato,
tradotto, e il ricomincia da capo che rimette quello di serie — perché un
aspetto regalato o pagato due volte nessuno lo segnala: se ne accorge solo chi
conta i diamanti.

## 6d. Il diario della salita

Il simulatore dice una cosa, un pollice su un telefono ne dice un'altra — e
finora l'unico modo di confrontarle era chiedere a qualcuno di tenere il conto
a mente mentre gioca, che è il modo migliore per avere un dato sbagliato.

Adesso lo conta il gioco: `meta.tries` sale ad ogni corsa, e alla vittoria
finisce nel diario insieme al numero della torre e a un asterisco se lì è
stata usata la seconda occasione. In fondo al menù diventa una riga di
pastiglie — `T1 3 · T2 1 · T3 2*` — fatta apposta per essere fotografata:
una riga sola, numeri abbastanza grandi da leggersi in uno screenshot.

La rinascita lo azzera: è una salita nuova, e mescolarla alla precedente
renderebbe il dato inutile proprio quando serve.

Ogni torre cambia mondo. Cambiano cielo (sfumatura ridisegnata su canvas),
nebbia, luce ambientale, intensità del sole, terreno, rilievi, alberi, montagne
e colore delle nuvole. Le regole e la pista non cambiano di una virgola.

Costa poco perché la palette del mondo sta tutta in `THEMES` dentro `core.js` e
`initArt()` riassegna i materiali ad ogni costruzione di livello: aggiungere una
zona è aggiungere diciotto numeri a una lista. I personaggi restano fuori dal
tema — l'eroe dev'essere sempre lo stesso, ovunque si trovi. Le zone sono otto:
vedi la sezione 7b.

## 6e. Far pesare i colpi

Spaccare una colonna da mille e una da dieci si vedeva identico: lo stesso
numero che saliva dal centro dello schermo, la stessa camera immobile. Il
gioco *sapeva* la differenza, il giocatore no.

Tre cose, nessuna delle quali cambia una regola:

1. **La camera trema.** `impatto(forza, fermo)` alza una riserva di scossa da
   0 a 1 che cala da sola; ogni fotogramma ne esce uno scostamento casuale
   proporzionale al *quadrato* di quel che resta, così parte forte e smette
   in fretta invece di sfumare per un secondo. La forza è tarata sull'evento:
   0,16 per un blocco del muro (ce ne sono trenta di fila, e una scossa piena
   trenta volte è nausea), 0,34 per una colonna verde, 0,62 per una rossa —
   sbagliare deve farsi sentire più che indovinare — e 1 quando il carceriere
   cade.

   Il punto delicato: la posizione della camera è **interpolata** verso il suo
   bersaglio, non riscritta. Uno scostamento sommato lì dentro non sparisce,
   viene inseguito dall'interpolazione del fotogramma dopo e la camera se ne
   va per i fatti suoi. Quindi lo scostamento si toglie *prima* delle
   interpolazioni e si rimette *dopo*: da qui `scossaVia()` e
   `scossaMetti()`, una all'inizio del blocco camera e l'altra alla fine.
   L'inclinazione no: quella la riscrive `lookAt` ogni volta, e si somma
   senza pensieri.

2. **Il numero parte dal punto colpito.** Era sempre al centro dello schermo,
   ma chi gioca guarda la corsia. `puntoSchermo(obj, alto)` proietta il punto
   colpito e ne ricava una percentuale, tenuta lontana dai bordi perché un
   numero mezzo fuori è un numero non letto.

3. **Un fermo-immagine di qualche centesimo.** Il trucco più vecchio del
   genere: il tempo di gioco quasi si ferma per 20–140 ms e il colpo sembra
   pesare. Si conta in tempo vero e si spende sul tempo di gioco, così
   l'attesa finisce anche a dieci fotogrammi al secondo.

Chi ha chiesto **meno movimento** al sistema operativo non ha né scossa né
fermo-immagine: `prefers-reduced-motion` si legge una volta all'avvio e
`impatto()` esce subito. Le scosse di camera sono la prima cosa che dà la
nausea, e su un telefono in mano non è un dettaglio teorico.

La prova del fumo adesso guarda anche questo: registra ogni numero che
compare e pretende che abbia una posizione finita e dentro lo schermo — una
proiezione andata male produrrebbe `NaN%`, che il browser ignora in silenzio
rimettendo il numero al centro — e controlla che a corsa finita lo
scostamento della camera sia tornato esattamente a zero. Verificata
rompendola apposta: con la proiezione guasta la prova fallisce su quattro
numeri.

## 7. Le due lingue

Il gioco aveva una quarantina di stringhe, tutte scritte a mano in italiano
dentro il markup e dentro il codice. Estrarle adesso è costato un'ora; fra sei
mesi, con negozio, missioni e skin, sarebbero state duecento sparse ovunque e
sarebbe costato una giornata. Il momento giusto per internazionalizzare è
sempre il più presto possibile, e "prima o poi" non è una data.

Come funziona, in `web/src/i18n.js` (che si carica per primo, prima ancora di
`core.js`, perché tutti gli altri file lo usano):

- le stringhe stanno in una tabella per lingua, `STRINGS.it` e `STRINGS.en`;
- `t('chiave')` la legge; i valori variabili entrano come `{0}`, `{1}`
  (`t('hub.tower', 7)` → `TORRE 7`);
- se una chiave manca nella lingua scelta si ricade sull'inglese, e se manca
  anche lì si mostra la chiave stessa: un buco silenzioso nell'interfaccia è
  molto più difficile da notare di una scritta storta;
- il markup statico si marca con `data-t="chiave"` e lo riempie
  `applyStaticText()`; `data-t-html` per le due righe che hanno del grassetto
  dentro. L'HTML nasce scritto in italiano, così resta leggibile aprendo il
  file, e alla partenza viene riscritto nella lingua giusta.

La regola che conta davvero riguarda i **dati**: armi, bonus, potenziamenti e
zone non contengono più il loro nome, contengono una **chiave** (`w.sword`,
`z.ice`, `up.power`) che si risolve al momento in cui si disegna. Se il nome
fosse nel dato, cambiare lingua a metà partita lascerebbe "Spada" nell'HUD fino
alla fine della corsa — il classico mezzo-tradotto che sembra un bug.

La lingua si indovina al primo avvio da `navigator.language`: chi ha il
telefono in italiano trova l'italiano senza toccare niente, tutti gli altri
l'inglese. Le due bandierine in fondo al menù la cambiano e la scelta viene
ricordata in `localStorage`.

Un dettaglio non ovvio: le etichette sui blocchi del muro e sulle colonne sono
**texture**, disegnate una volta sola su canvas. Cambiare lingua non le tocca,
quindi `i18n.js` espone `langHook`, che `game.js` riempie con "ricostruisci la
corsa e ridisegna HUD e menù". Senza quel gancio il muro resterebbe nella
lingua di prima fino alla partita successiva.

## 7b. Otto zone, e due che non sono solo colore

Le zone erano quattro: alla quinta torre si tornava alla Valle Gelata, e
tornarci è il momento in cui il gioco smette di sembrare lungo. Adesso sono
otto — Valle Gelata, Bosco Rosso, Dune d'Ossa, Notte di Rúna, Bocca di Fuoco,
Palude di Cenere, Foresta di Vetro, Cielo Spezzato — e otto torri sono più di
quante ne faccia una salita prima della rinascita.

Sei sono **solo palette**, che è il punto: diciotto numeri in una lista, zero
righe di codice, e un mondo che non si era mai visto. Due chiedono qualcosa in
più, e lo chiedono con un campo nel tema invece che con un `if` sparso nel
mondo — chi non ce l'ha non paga niente:

- **`lava`** (Bocca di Fuoco) accende le colate ai lati della pista e tre
  vulcani lungo il percorso. La lava è un `MeshBasicMaterial`, cioè un
  materiale **non illuminato**: in una zona con la luce bassa è l'unica cosa
  che resta accesa, e costa quanto un colore piatto — niente luci nuove,
  niente bagliori, niente post-processing. Un materiale solo per tutta la
  zona, così pulsa tutto insieme con una riga per fotogramma.

  Il primo tentativo metteva **un** vulcano in fondo, dietro la torre: non si
  vedeva mai. La nebbia chiude a 580 unità e un livello ne è lungo il doppio,
  quindi dietro la torre significa fuori dal mondo visibile. Sono tre, a
  frazioni fisse del percorso e a lati alterni: ce n'è sempre uno dentro la
  nebbia buona, e passandogli accanto si capisce quanto è grosso. Stessa
  storia per le colate, che erano finite **dentro** la piana laterale: la sua
  faccia sta a y = −0,4, non a −1.

- **`floating`** (Cielo Spezzato) stacca da terra più di metà dei massi e
  quattro guglie su dieci, e ci appende sotto la zolla strappata a punta in
  giù. Due righe in `buildCliffs`, e il paesaggio racconta da solo che qui il
  terreno si è rotto.

La lava non tocca mai la corsia. Aggiungere un pericolo ambientale sarebbe
stato facile e sbagliato: in questo gioco si muore di muro e di scelte, non di
scenografia.

## 8. Il muro è pieno, gli ostacoli no

Le corsie stanno a x = −2.4, 0, +2.4 e la collisione si risolveva per
distanza: veniva colpito l'oggetto entro 1.15 unità dal giocatore. Tenendosi
a **x = ±1.2**, cioè esattamente a metà fra due corsie, si restava a 1.2 da
tutti e tre i blocchi di ogni riga — e si attraversava l'intero muro senza
romperne uno e senza pagare un punto di potenza. Poi, non essendo mai arrivati
a 30 blocchi, lo scontro col boss non partiva e si correva oltre la torre nel
vuoto.

La correzione è concettuale, non numerica: **il muro è pieno**. Le sue righe si
risolvono sempre sulla corsia più vicina, non sulla distanza, quindi un blocco
si paga sempre. Gli ostacoli lungo la pista restano a distanza, perché lì
schivare è il gioco. In più una rete di sicurezza: se per qualsiasi motivo si
arriva ai piedi della torre col muro non consumato, lo scontro parte comunque —
nessuna corsa può oltrepassare il boss senza affrontarlo.

I blocchi sono anche stati allargati da 1.9 a 2.36, quanto basta perché si
tocchino: la fessura che si vedeva era la stessa da cui si passava.

## 9. Niente schermata di fine partita

Era un passaggio a vuoto: leggevi un numero, premevi un bottone, e solo allora
arrivavi dove si spende. Adesso la corsa finisce, si resta fermi un attimo a
vedere com'è andata (2,2s, 3,4s se hai vinto), e si è già nel menù con il
riepilogo al posto della storia e i potenziamenti sotto al pollice.

Un tap in meno per ciclo, e il ciclo è quello che si ripete cento volte.

## 10. I cartelli

Due striscioni attraversano il muro alla riga corrispondente: azzurro
sull'ultima corsa, dorato sul record. Si vedono da lontano, quindi la corsa ha
un bersaglio intermedio anche quando la torre è ancora fuori portata.

`markerZ(d) = wallStartZ − (d − 0.5) × wallGap`, cioè subito dopo l'ultimo
blocco abbattuto.

## 11. Verso Android

### A. WebView (Capacitor) — la più veloce
Il prototipo diventa un `.apk` senza riscrivere niente: `npx cap init`,
`npx cap add android`, si copia `web/` in `www/`. three.js va servito dalla copia
in `vendor/` (già presente) perché l'app deve funzionare offline.

- ✅ zero riscrittura, iterazione immediata
- ⚠️ 45–60 fps su fascia media; niente ad-network nativi senza plugin

Ottima per playtest, video e validazione dell'idea.

### B. Unity — lo standard del genere
È quello che usano gli editori hypercasual. Ha ad mediation (LevelPlay),
analytics, A/B test sul primo livello, export iOS.

- ✅ performance, monetizzazione, pipeline già nota
- ⚠️ si riparte da zero — ma il design qui documentato è già la specifica

### C. Godot 4
Open source, export Android nativo, leggero. Ecosistema pubblicitario molto più
povero di Unity.

### Raccomandazione
Restare su A finché il gameplay non convince, poi portare in Unity per la
pubblicazione. Le formule di questo documento si trasferiscono direttamente.

## 12. Prestazioni

Il conteggio delle mesh è la cosa da tenere d'occhio: circa 600–800 per il mondo
(terreno, alberi, case, montagne), ~150 per gli oggetti della pista e ~270 per il
muro (30 righe × 3 blocchi) e ~80 per la torre. I contorni raddoppiano le mesh
dei soli personaggi.

Le ombre proiettate sono la voce più cara: si spengono con `CFG.shadows = false`
in cima a `core.js` e il gioco resta identico, solo più piatto.

Se su fascia bassa non regge, in ordine di resa:
1. ridurre `CFG.wallRows` da 30 a 20;
2. diradare `buildCliffs`;
3. unire le forme statiche con `BufferGeometryUtils.mergeBufferGeometries`
   (sta negli examples di three, va aggiunto): con i colori piatti è molto
   più semplice di prima, basta raggruppare per materiale.

## 13. Cosa manca, in ordine di impatto sul feel

1. **Audio** — musica loop e sfx sull'impatto. Sposta la qualità percepita più
   di qualunque effetto grafico.
2. **Anteprima della riga successiva** in alto, per pianificare due mosse avanti.
3. **Missioni e valuta premium** — i cristalli si raccolgono ma non si spendono
   ancora.
4. **Prima esecuzione** — mano animata che spiega lo swipe, prima riga con solo
   verde.
