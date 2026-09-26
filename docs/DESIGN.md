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
  dopo venti metri. È il singolo cambiamento che ha alzato di più la resa, e si
  spegne con `CFG.shadows = false` se una fascia bassa non regge.
- **Contorni sui personaggi** (`addOutline`). Guscio rovesciato: una copia di
  ogni mesh, appena più grande e disegnata solo dalle facce interne. È quello
  che dà il bordo dei giochi cartoon senza post-processing, e costa solo il
  doppio delle mesh su una decina di attori. Com'era all'inizio (nero, 0,09 su
  tutto) non regge più: vedi §4c.
- **Poche geometrie riusate.** Otto primitive in `GEO` per tutto il gioco.
  Personaggi, torre, cristalli e blocchi sono le stesse forme scalate.
- **Cielo a sfumatura** invece del colore piatto, e nebbia intonata
  all'orizzonte.

La nebbia è stata la trappola: partiva a 110 unità su una pista lunga 700, e
tutto oltre la prima riga di colonne era latte bianco. Portata a 190–580 la
scena ha ripreso profondità e i colori sono tornati.

## 4b. Il salto grafico, senza post-processing

La richiesta era "stravolgerlo". Il vincolo era uno solo, e l'aveva detto chi
gioca due volte: *sembra che lagghi*. Quindi niente di quello che fa sembrare
belli i giochi WebGL nelle demo — bloom a schermo intero, profondità di campo,
occlusione ambientale — perché ognuno è un secondo passaggio su ogni pixel a
ogni fotogramma. Tutto quello che segue vive dentro la scena o nel CSS.

**Lo shading a bande.** Il Lambert di prima era il look di default di
three.js, e si riconosce. Adesso ogni forma ha quattro toni netti
(`TOON_RAMP` in `art.js`) e un bordo di luce del colore del cielo sulle facce
che si voltano via dalla camera — stacca le sagome dalla nebbia. Il bordo si
spegne sulle facce rivolte in alto, altrimenti il terreno visto di taglio si
accendeva fino all'orizzonte.

**L'uscita lineare.** Il primo tentativo usciva slavato: tutto pastello, la
lava beige. La causa non era lo shading ma la gestione del colore — con
l'uscita sRGB three prendeva i colori esadecimali scelti a mano come valori
già lineari e li ri-codificava, cioè li schiariva. Un tone mapping filmico
peggiorava le cose (appiattisce i saturi). La soluzione adottata da quasi ogni
gioco stilizzato in WebGL: uscita lineare, colori che escono come sono stati
disegnati, e luci ritarate perché una faccia piena valga colore × ~1
(`LUCE` in `core.js`; le zone sommavano a 1,44 e il bianco bruciava).

**La risoluzione che si adatta.** Lo shading a bande è per pixel, il Lambert
di three r128 era per vertice: costa di più. `adattaRisoluzione()` misura il
tempo medio di un fotogramma ogni ~45 e, sotto i 48 al secondo, scende di un
quarto di densità; risale solo dopo sei misure sopra i 58. Scendere subito,
risalire piano: un telefono che oscilla fra due densità fa più danno di uno
che resta un po' sotto.

**La luce che non c'è** (`fx.js`):

- i bagliori sono sprite additivi con una sfumatura tonda — gemme, armi,
  bonus, crateri — e costano quanto uno sprite;
- le scintille sono un anello di 360 punti riusati, una sola chiamata di
  disegno, con un piccolo shader che dà a ogni punto la sua trasparenza e
  la sua taglia (PointsMaterial di r128 non lo sa fare);
- l'onda d'urto è un anello a terra che si allarga in un terzo di secondo;
- l'**aria della zona** — neve, foglie, polvere, rune, braci, cenere, schegge
  di vetro, bave di nuvola — è un volume di punti che segue la camera e si
  ricicla ai bordi con un modulo: sempre gli stessi 70–190 punti, per quanto
  lunga sia la corsa;
- le scie di velocità sono un'unica `InstancedMesh` di bastoncini;
- la vignetta è un gradiente CSS sopra al canvas: zero pixel del 3D toccati.

**Il carattere.** Lilita One, nel repository (OFL, 10 KB) e dentro al file
singolo come data URI. Solo per numeri e titoli; la storia resta nel
carattere di sistema, che a 13 px si legge meglio di qualunque display. Le
etichette 3D sono texture disegnate una volta, quindi quando il carattere
arriva si ridisegnano (solo nel menù).

**Il succo.** Le monete raccolte volano al portafoglio con un'animazione del
browser; i numeri dell'HUD corrono verso il valore nuovo invece di saltarci;
la potenza pulsa in verde quando sale e trema in rosso quando scende; l'eroe
si piega nelle curve e si schiaccia sui colpi con un rimbalzo; le monete che
stai per prendere ti vengono incontro — solo quelle: la calamita è una cosa
che si vede, non una regola, e la raccolta resta decisa dalla corsia.

## 4c. Il vichingo rifatto, e il pennarello messo via

Il mondo è cresciuto (bande di luce, bagliori, lastricato), l'eroe no: era
fatto di cilindri lisci col contorno nero spesso 0,09 su **ogni** pezzo. Su un
polpaccio largo 0,27 il bordo valeva un terzo del pezzo, e l'eroe sembrava
disegnato col pennarello su un fondale dipinto. Due correzioni:

- **Il contorno prende il colore del pezzo**, scurito e spinto un poco verso
  il blu notte del cielo (`inkPer`): la pelle ha un bordo bruno, l'acciaio uno
  ardesia. Lo spessore scende (0,035 eroe, 0,04 nemici, 0,05 boss) e ha un
  tetto al 14% del lato più corto del pezzo, così rivetti e borchie non
  annegano nel bordo.
- **Il dettaglio va dove guarda la camera, cioè dietro.** Treccia sulla nuca,
  cinghia dello scudo a tracolla, scudo con assi, borchie e cerchio di ferro,
  stringhe incrociate sui polpacci, risvolti di pelliccia sugli stivali,
  bracciali borchiati, borsa alla cintura, collo di pelliccia a ciuffi.
  L'elmo sta alto e la barba sotto il naso: gli occhi, l'unica cosa del viso
  che si legge a quella scala, non vanno coperti.

Ogni aspetto porta anche un **segno** oltre ai colori (`segno` in `SKINS`):
la Brace ha lo scudo che arde, la Brina ghiaccioli sugli spallacci, la Guardia
Notturna un pennacchio viola, il Campione ali d'oro al posto delle corna.
Restano solo estetica: nessun segno cambia un numero.

**L'arma.** L'impugnatura era un cilindro lungo quanto l'arma che sporgeva
sotto il pugno, col pomolo a metà: ora l'origine del modello è il pugno, il
manico scende di poco sotto (pomolo in fondo) e sale fin dove serve; ascia e
martello hanno il manico lungo, la spada una guardia vera. E l'arma è passata
nella mano **destra**: il modello è costruito guardando +Z e poi girato, e il
braccio che il codice chiamava destro a schermo finiva a sinistra.

**I nemici e la principessa** seguono lo stesso passo. Il goblin ha il
cappuccio, il nasone, le orecchie lunghe, la tunica stracciata, il pugnale e
lo scudetto; il diavoletto corna, ali da pipistrello, coda a freccia, forcone
e una fiammella in testa; il golem è fatto di massi a faccette con le crepe
che ardono e il muschio sulle spalle. Tutti hanno occhi da cartone (il bianco
e la pupilla): due palline nere, a quella distanza, sembravano bottoni. I
nemici in pista sono tanti, quindi ogni tipo si costruisce **una volta** e poi
si clona: il clone condivide geometrie e materiali. La principessa ha gonna a
due balze con l'orlo d'oro, corpetto allacciato, maniche a sbuffo, capelli
fino alla vita con la treccia attorno alla testa, e una tiara con la gemma
che brilla, che si vede anche da giù.

**La pista** è un lastricato disegnato su canvas (file di pietre sfalsate con
tono e luce propri, mipmap e filtro anisotropo) invece della trama a quadri.
La prima versione era 128×128 pixel per 8×8 metri: sedici pixel per metro,
ingranditi sei-otto volte vicino alla camera — il disegno giusto, ma sfocato
come una foto a bassa risoluzione. Ora è 1024×1024 con lo stesso motivo, più
bordo smussato, ombra sotto ogni pietra e una grana leggera; filtro
anisotropo fino a 8.

## 4d. L'interfaccia rifatta: "sembra vecchio"

Chi l'ha provato l'ha messo accanto ai giochi che ha sul telefono e ha detto
che sembrava vecchio. Non era il mondo 3D — eroe, giganti e torri reggono il
confronto — ma l'interfaccia: riquadri scuri semitrasparenti, testo sottile,
emoji al posto delle icone, un menù a colonna pieno di righe. Sembrava un
sito. I giochi di adesso parlano un'altra lingua, e il giocatore la associa
al "curato". Rifatta tutta, lasciando stare il combattimento.

**Le icone, fotografate dai nostri modelli** (`web/src/icone.js`). Un
disegnatore non c'è, ma i modelli sì: all'avvio un secondo renderer, piccolo,
fotografa moneta, gemma, runa, fulmine, stella, forziere, trofeo, bersaglio,
elmo, ingranaggio, spade, pugno, muro, torre, fiamma, scudo, corvo, le sei
armi e l'eroe in ognuno dei cinque aspetti — con la stessa luce e gli stessi
materiali del gioco. Poi in 2D ogni foto prende il contorno scuro "da
adesivo" (la sagoma tinta di scuro ridisegnata in sedici direzioni) e
un'ombra sotto. Finiscono in un foglio di stile come classi (`.ic-moneta`…).
Costa ~0,5 s sul renderer software dei test (molto meno su un telefono) e
~700 KB di immagini in memoria; se il WebGL non parte, sotto ricompare l'emoji.

**Lo stile grasso.** Tutto ha un contorno scuro spesso (`--inchiostro`),
anche il testo (otto ombre piene attorno alle lettere); i bottoni sono
bombati — luce in alto, filo chiaro dentro, un gradino scuro sotto che scende
quando li premi; i colori sono pieni e ognuno dice una cosa (potenza blu,
arma viola, oro verde, rune viola, imprese oro).

**Il menù.** La home tiene solo quello che serve a ogni partita: torre e
zona in alto a sinistra, le valute impilate a destra con le icone grandi,
il titolo, l'obiettivo del giorno come una carta "evento" con la barra,
l'ultima corsa in un nastro, l'eroe, ALL'ASSALTO (con il riflesso che
passa), e le tre carte dei potenziamenti — ognuna con la sua icona, il
valore di adesso e sotto quello che si compra (→ ×1.21, → Lama Rúna), e una
freccia verde che salta quando si può comprare. La rinascita, quando c'è, è
una **tessera di lato** che pulsa ("PRONTA +8") e apre la sua scheda con la
spiegazione. Tutto il resto sta nella **barra in basso**, a schede:

| scheda | cosa c'è |
|---|---|
| EROE | ritratto grande, gli aspetti come ritratti (con il prezzo), l'arsenale |
| RUNE | la bottega (chiusa, con la spiegazione, finché non si rinasce) |
| GIOCA | chiude la scheda aperta: si torna al menù |
| IMPRESE | il diario dei tentativi e le tredici imprese |
| OPZIONI | lingua, salvataggio di riserva, ricomincia, la marca della build |

Un **pallino rosso** con il punto esclamativo dice che di là c'è qualcosa:
un aspetto che puoi comprare, rune da spendere, imprese nuove non ancora
viste, il salvataggio di riserva mai fatto (da quando c'è qualcosa da
perdere, dalla torre 3).

**In corsa**, la plancia parla la stessa lingua: pillole bombate con le icone
(l'arma cambia icona quando la raccogli), barra di avanzamento spessa,
cartelli, combo, duello, guida e seconda occasione con il contorno.

**Colore e luce.** Due righe nello shader cartoon: un **riflesso** bianco a
gradino dove la superficie guarda fra il sole e la camera — i personaggi
sembrano giocattoli di plastica nuovi — acceso solo sui pezzi con il
contorno (personaggi, armi, poteri), non sul terreno; e un filo di
**saturazione** in più su tutto (`SATURA`, 1,14).

**Movimento.** Il riflesso che passa su ALL'ASSALTO, la freccia verde che
salta, i pallini che pulsano, la tessera della rinascita che respira, le
schede che salgono, e comprando la carta rimbalza e le monete volano dal
portafoglio dentro la carta.

**Lucido, non pastello.** La prima versione, vista sul telefono: "molto
bello, ma invece di questo pastello opaco proviamo la versione lucida".
Due colpe: le carte non comprabili si sbiadivano (grigio al 35%), e metà
home diventava pastello; e mancava il vetro. Adesso ogni bottone, carta e
pillola ha una **lama di luce** bianca nella metà alta (un `::before` sotto
al testo), i colori sono pieni e saturi (blu cobalto, viola, verde prato,
arancio), il velo scuro sul menù è quasi sparito, e una carta non comprabile
**resta colorata**: perde solo la freccia verde e il prezzo si fa rosso.

**Contorni vettoriali.** Il contorno delle scritte era fatto di otto ombre
spostate attorno alla lettera: sugli angoli faceva gli scalini, e sul
telefono la home sembrava "sgranata". Adesso è un contorno vero
(`-webkit-text-stroke`) disegnato sotto la lettera (`paint-order: stroke
fill`), liscio a qualunque densità. Stesso difetto sulle icone: il contorno
da adesivo era campionato in 16 direzioni, a smerli; ora 48.

**Gli schermi bassi.** Sotto i 760 px d'altezza tutto scende di un gradino
(titolo, icone, bottone, niente valore successivo sulle carte), perché fra
il titolo e il bottone deve restare posto per l'eroe: `tools/misura-home.js`
lo controlla a 720 e a 640.

## 5. Il momento della vittoria

Battuto il boss, la camera lascia il duello e sale sul balcone della torre.
Il tetto è stato alzato e ristretto apposta: nella prima versione la
principessa spariva sotto la falda, ed è l'unica cosa che il giocatore vuole
vedere quando vince.

Poi la vittoria era solo quello: la camera saliva, la principessa stava lì, e
dopo tre secondi eri nel menù. Adesso è una scena che chiude la storia
(`iniziaVittoria` / `aggiornaVittoria` in `game.js`):

- per tutta la corsa la principessa si vede **dietro una grata** di ferro sul
  balcone, con la serratura d'oro: è prigioniera, e si capisce da lontano;
- il gigante cade e **le chiavi della prigione** gli saltano via dalla
  cintura, fanno un arco lungo con la scia d'oro (crescono a metà strada, se
  no a quella distanza non si vedono) e arrivano alla serratura;
- lampo d'oro, cartello PRINCIPESSA LIBERATA, **la grata si alza**;
- la principessa **salta e saluta** col braccio alto, e partono tre raffiche
  di **coriandoli** in cinque colori;
- la camera segue le chiavi e poi stringe sul balcone; due **bande nere**
  entrano dall'alto e dal basso e la plancia sparisce, perché questa è una
  scena e non un menù.

Dura 5,6 secondi invece di 3,4: è il momento per cui si gioca, e si vede una
volta per torre.

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

## 6b-bis. Il duello e la combo, e chi li paga

Due meccaniche nuove, entrambe per lo stesso motivo: premiare chi gioca bene
senza rendere il gioco più facile per tutti.

**Il duello.** Lo scontro col carceriere era l'unico momento del gioco in cui
non si faceva niente: due numeri che scendevano insieme e un esito già deciso
dal muro. Adesso dura 4,6 secondi a forze pari, e ogni ~1 secondo un anello
si stringe su un bersaglio sul petto del carceriere. Tocchi — lo schermo intero
è il bottone — quando combacia: entro 100 ms è **perfetto** (−7% della vita con
cui era partito), entro 220 ms è **buono** (−3,5%). Il bersaglio si accende
d'oro nel momento giusto: chi non ha ancora capito il ritmo lo impara dal
colore.

La prima versione chiudeva l'anello in 0,9 s con ±80 ms per il perfetto, e
alla prima prova sul telefono: "i cerchi vanno troppo veloci, ne ho mancati un
botto". Un telefono mette 50-100 ms fra quello che l'occhio vede e il tocco che
il gioco riceve, quindi chi toccava esattamente al momento giusto veniva
giudicato tardi. Ora l'anello ci mette 1,2 s, le finestre sono più larghe, e
prima di giudicare si tolgono 50 ms di ritardo (`DUELLO.ritardo`), come nei
giochi a ritmo. Lo scontro è passato da 3,6 a 4,6 s perché gli anelli per
duello restino quanti erano: più lenti, non meno.

L'anello è DOM, non 3D: deve essere nitido, stare sopra a tutto e non finire
mai dietro alla mazza.

**La combo.** Colonne verdi e nemici abbattuti di fila, senza farsi male,
alzano la potenza raccolta del 3% a colpo, fino al 15%. Una colonna rossa o un
nemico che ti prende la azzera, con un distintivo che si rompe invece di
sparire in silenzio — perdere una serie deve bruciare un po'. Schivare non la
rompe: premia chi non sbaglia, non chi rischia.

**Chi paga.** Tutte e due regalano qualcosa, e un regalo che arriva a tutti è
solo un abbassamento della difficoltà — che chi gioca aveva appena detto
essere giusta. Quindi ognuna è stata compensata, misurando col simulatore la
salita fino alla torre 10 (perfetto / umano / ingenuo, 24 semi):

| | corse |
|---|---|
| prima di tutto | 28,8 / 25,8 / 26,3 |
| + duello | 25,8 / 23,9 / 24,3 |
| + duello, carceriere da 0,38 a **0,44** | 28,3 / 25,0 / 25,5 |
| + combo | 23,9 / 22,0 / 22,4 |
| + combo, `BASE_SHARE` da 0,42 a **0,375** | 28,8 / 25,5 / 25,8 |

In media la torre costa quello che costava. Chi tocca a tempo e non prende
rosse vince di più; chi manca gli anelli e sbaglia colonna perde di più. È lo
scambio voluto. Il giocatore simulato tocca con una precisione stimata (umano:
35% perfetti, 40% buoni) e non prende mai una rossa: va ritarato sul diario
appena ci sono partite vere col duello.

**Il simulatore era rotto.** Con la traduzione i potenziamenti avevano perso
il nome leggibile (`name: 'POTENZA'` → `key: 'up.power'`), e il simulatore —
giustamente — si rifiutava di misurare un gioco che non riconosceva. Ma quel
controllo scatta solo se qualcuno lo lancia, e per settimane nessuno l'ha
fatto. Adesso `tools/smoke.js` lo carica come prima cosa: se il simulatore non
riconosce più il gioco, la prova del fumo non parte. Nello stesso giro la vita
del carceriere nel simulatore era `1 − quota del muro`: uguale per
coincidenza (0,38 = 1 − 0,62) finché qualcuno non toccava uno dei due numeri.
Adesso si legge da `bossHealth`.

**La rabbia.** Il duello era un ritmo solo dall'inizio alla fine. Adesso,
quando la vita del carceriere scende sotto la metà, il gigante si infuria:
il duello si ferma per il ruggito (0,9 s, senza che le forze scendano:
quel tempo non è tuo e non va pagato), si piega all'indietro con le braccia
al cielo, gli occhi diventano rossi, un alone rosso gli pulsa addosso, e la
scritta dice ORA DUE ALLA VOLTA. Da lì gli anelli arrivano in coppia, a 0,4 s
l'uno dall'altro, ciascuno col 60% del peso — come il Mangiacenere, che il
duello doppio ce l'ha sempre e infuriato accorcia invece le pause. Più cose
da fare, stesso valore in media: il simulatore, che fa la stessa cosa
(`RABBIA` in `core.js`), dà 29 / 25 / 26 corse fino alla torre 10, contro
29 / 25 / 25 senza.

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

## 6c-ter. La bottega delle rune e l'obiettivo del giorno

**Le rune erano un moltiplicatore invisibile**: +25% l'una su potenza e oro, e
basta. Funzionavano — sono l'unica strada per andare oltre — ma si subivano.
Adesso si spendono anche, in sei vantaggi che la rinascita non azzera:

| vantaggio | gradini (rune) | cosa fa |
|---|---|---|
| ⚔️ Arma di famiglia | 2 · 4 · 7 | parti almeno con randello, ascia, spada |
| 🎒 Zaino | 1 · 2 · 3 · 5 | parti con due colonne facili di potenza per gradino |
| 🎯 Mano ferma | 2 · 5 | finestra del colpo perfetto 80 → 95 → 110 ms |
| 🧱 Muratore | 3 · 6 | blocchi del muro −4% per gradino |
| 💎 Occhio del gioielliere | 3 · 6 | gemme sulla pista +50% per gradino |
| 🪽 Seconda pelle | 3 · 6 | la seconda occasione costa 4, poi 3 diamanti |

Il punto delicato è che **spendere non deve costare potenza**. Il +25% si
conta sulle rune *guadagnate* (`meta.runes`, che non scende mai); in bottega si
spendono le stesse rune meno quelle già spese (`meta.runeSpese`). Una runa fa
due cose, e rinascere diventa una scelta — cosa compro — invece di una tassa.
La prova lo controlla: con 7 rune il bonus è ×2,75 prima e dopo aver speso.

Tutti i vantaggi aiutano soprattutto la salita *dopo* una rinascita, che è
quando servono. La prima salita — quella su cui è tarata la difficoltà — non ha
rune, e il simulatore non cambia. Lo Zaino è in proporzione alla torre (due
colonne facili, non un numero fisso), altrimenti alla decima varrebbe zero.

La bottega si apre toccando la pillola 🔮 del portafoglio, che si accende di un
puntino d'oro quando c'è qualcosa alla portata. Non ha una riga nel menù: il
menù è già alto quanto lo schermo, e una bottega che si usa una volta per
rinascita non la merita.

**L'obiettivo del giorno.** I diamanti arrivavano col contagocce — un paio a
corsa — e gli aspetti ne costano fino a 120. Serviva una fonte regolare, e un
motivo per tornare domani. Uno al giorno, scelto dal numero del giorno e non a
caso, così due amici che giocano lo stesso giorno hanno lo stesso obiettivo e
se lo possono raccontare: spacca 30 colonne verdi, fai una combo da 8, metti 4
colpi perfetti, sfonda 60 blocchi, raccogli 45 monete, abbatti 6 nemici. Vale
6 diamanti, pagati nel momento in cui lo completi — è lì che fa piacere, non al
menù. Non compare alla prima partita: quella è di chi sta imparando.

La riga dell'obiettivo ha fatto sforare il menù di 13 px: `tools/misura-home.js`
l'ha detto subito, e qualche pixel di margine qua e là l'ha riportato a 720
(700 sugli schermi più bassi). `tools/bottega.js` fa il giro completo di
bottega e obiettivo, compreso "il premio non si paga due volte".

**L'arma di famiglia, fino in fondo.** Con l'Ascia di famiglia e i Pugni
comprati, la pista metteva a terra il Randello — l'arma "dopo" quella
comprata — e raccoglierlo faceva scendere il colpo da 12 a 9; e il menù
diceva "Pugni" mentre in mano c'era l'Ascia. Adesso l'arma di partenza è
una sola, `armaIniziale()` (la migliore fra comprata e di famiglia), e vale
ovunque: la pista offre solo armi migliori, raccoglierne una non può mai
peggiorare il colpo, la carta ARMA mostra quella e vende la successiva, e
l'eroe nel menù la tiene in mano. `tools/bottega.js` lo controlla.

## 6c-quater. La prima partita insegna giocando

Il link è pubblico, e chi lo apriva trovava un paragrafo da leggere: le regole
si imparavano sbagliando. Adesso la prima corsa di chi non ha mai giocato
insegna mentre si gioca, e **ogni passo aspetta che il precedente sia
successo davvero**, non un timer:

1. **Spacca le verdi.** La prima fila è scritta a mano: tre colonne verdi
   facili. Qualunque cosa tu faccia, la prima cosa che succede è una colonna
   che esplode e la potenza che sale.
2. **Schiva la rossa.** La seconda fila ha una rossa proprio nella tua
   corsia, fra due verdi. Quando è vicina e tu sei ancora lì, il tempo quasi
   si ferma (×0,22) e compare un dito che trascina — **finché non ti sposti**.
   Il gioco ti chiede di muoverti prima ancora che tu sappia di poterlo fare.
3. **Prendi l'arma**, quando la prima arma è in vista.
4. **Il muro costa**, quando il muro comincia.
5. **Il duello**: la sua scritta c'era già; in più il primo anello del primo
   duello si chiude al 60% della velocità.

La guida sta in basso, sotto l'eroe. La prima versione era a metà schermo e
copriva esattamente la colonna rossa che diceva di schivare: si è visto solo
dalla foto. In basso la pista è vuota, ed è dove sta il pollice che deve
trascinare.

Compare solo a chi non ha mai finito una corsa (`!meta.lastOutcome` e
`!meta.guidaFatta`): chi gioca già non la vede, nemmeno dopo l'aggiornamento.
Si segna come fatta a fine corsa anche se è andata male — una volta sola.

Le prime due file non passano dal generatore normale, ma dentro lo stesso
ciclo, prima delle righe che il simulatore legge con le sue regex: il
simulatore non si accorge di niente, e la prima corsa del primo giocatore
vale una colonna verde in più.

`tools/guida.js` la gioca con un robot a passi fissi di 1/60 s e controlla le
due file scritte, i cinque passi, il rallentatore che parte e si ferma, e che
alla seconda corsa non torni.

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

1. **La camera dà uno strappo.** `impatto(forza, fermo)` carica una riserva
   che cala da sola; l'ampiezza scende col *quadrato* di quel che resta, così
   parte forte e molla subito. La forza è tarata sull'evento: 0,22 per un
   blocco del muro (ce ne sono trenta di fila, e una scossa piena trenta
   volte è nausea), 0,55 per una colonna verde, 0,8 per una rossa —
   sbagliare deve farsi sentire più che indovinare — e 1,1 quando il
   carceriere cade.

   **La direzione è scelta una volta sola, all'impatto**, e non cambia più
   finché lo strappo non si esaurisce: in giù soprattutto, con una spinta
   all'indietro e un po' di lato. Perché conta, vedi sotto.

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

3. **Le schegge.** Un pezzo che vola ha una direzione e una velocità, cioè
   racconta da solo quanto è stato forte il colpo, mentre un numero è solo un
   numero: sedici pezzi per colonna, e uno su quattro grosso e lento mentre
   gli altri schizzano — è la differenza di taglia che fa sembrare una cosa
   rotta invece di una manciata di coriandoli. Un tetto a 150 schegge vive
   evita che una fila fitta accumuli costo.

Chi ha chiesto **meno movimento** al sistema operativo non ha né scossa né
fermo-immagine: `prefers-reduced-motion` si legge una volta all'avvio e
`impatto()` esce subito. Le scosse di camera sono la prima cosa che dà la
nausea, e su un telefono in mano non è un dettaglio teorico.

### La forma dello strappo conta più dell'ampiezza

Tolto il fermo-immagine, restava una scossa **casuale ad ogni fotogramma**, e
alla prova del telefono la risposta è stata di nuovo *"sembra che lagghi"* —
stavolta senza nessun fermo in mezzo. Il motivo è che in un runner il mondo
scorre sempre nella stessa direzione, e uno scostamento che cambia verso
sessanta volte al secondo rompe quella continuità: l'occhio non legge "colpo",
legge "il telefono non ce la fa". Alzare l'ampiezza — che era la reazione
istintiva, e quella che avevo fatto — peggiora le cose invece di migliorarle,
perché rende il disturbo più grosso, non più leggibile.

La correzione non è un numero ma una forma: **una direzione sola, scelta
all'impatto, e la camera che torna al suo posto senza mai invertire.** È un
rinculo, e si legge come tale a **meno della metà** dell'ampiezza di prima:

| | casuale | rinculo |
|---|---|---|
| colonna verde | 2,7% di schermo | 1,2% |
| colonna rossa | 5,2% | 2,8% |
| carceriere | 8,7% | 5,7% |
| inversioni di verso | ~30 al colpo | **0** |

L'ultima riga è la misura che conta, ed è quella che una prova automatica può
guardare: uno strappo che risale, anche di poco, è indistinguibile da un
fotogramma perso.

### E perché il fermo-immagine è durato un giorno

C'era anche un **fermo-immagine**: il tempo di gioco quasi fermo per 20–140 ms
a ogni colpo, il trucco più vecchio del genere. La prima cosa detta da chi ha
giocato è stata *"sembra che lagghi"*, e aveva ragione — ed era misurabile:

| | prima | adesso |
|---|---|---|
| tempo fermo su colonna verde | 50 ms a 1/10 di velocità (≈3 fotogrammi) | niente |
| strappo di camera | 0,098 unità su 11 di schermo = **0,9%** | 0,29 = **2,7%** |
| inclinazione | 0,2° | 1,4° |
| schegge | 8 | 16, di due taglie |

Il peggio dei due mondi: si sentiva il fermo e non si vedeva il colpo. E il
fermo-immagine rallentava anche le schegge, cioè l'unica parte che già
funzionava.

Il fermo-immagine è un trucco da picchiaduro, e là funziona perché il colpo è
un evento isolato con la sua rincorsa: il tempo che si ferma lo sottolinea. In
un runner il mondo scorre sempre, e fermarlo non legge come pugno, legge come
fotogramma perso. È rimasto in un posto solo — il colpo che stende il
carceriere, dove la corsa è già ferma e il blocco si legge per quello che è.

La lezione generale: **l'ampiezza di una scossa va letta in percentuale di
schermo, non in unità di mondo.** La camera ne inquadra circa 11 in altezza,
quindi 0,1 unità è lo 0,9% e non si vede. Un impatto solido sta fra l'1% e il
3%; il 5% è una punizione, l'8% è una cosa che succede una volta.

La prova del fumo adesso guarda anche questo: registra ogni numero che
compare e pretende che abbia una posizione finita e dentro lo schermo — una
proiezione andata male produrrebbe `NaN%`, che il browser ignora in silenzio
rimettendo il numero al centro — e controlla che a corsa finita lo
scostamento della camera sia tornato esattamente a zero. Verificata
rompendola apposta: con la proiezione guasta la prova fallisce su quattro
numeri.

## 6f. Il salvataggio di riserva e il contatore

**Il salvataggio di riserva.** La partita vive nel localStorage del browser:
pulire i dati, cambiare telefono o aprire il link da un'altra app la cancella,
e chi prova il gioco per qualche giorno rischia di perdere tutto. Dal bottone
💾 in fondo al menù si apre il registro: COPIA IL CODICE mette negli appunti
la partita intera (JSON in base64 con una firma FNV in coda), CARICA UN CODICE
la rimette. La firma serve a dire "questo codice è rotto" — un pezzo perso nel
copia-incolla — invece di caricare mezza partita; spazi e a capo di una nota
si ignorano. Caricare chiede due tocchi, perché sovrascrive tutto, e passa
dalla stessa riparazione dei numeri del caricamento normale (`daSalvato`).
Nel registro sta anche RICOMINCIA DA CAPO: cancellare tutto e mettere al
sicuro tutto sono la stessa faccenda, e lì non si tocca per sbaglio.
`tools/riserva.js` fa il giro completo.

**L'anteprima, provata e tolta.** Per un po' in corsa, a destra, tre
caselline mostravano la riga DOPO quella davanti, per pensare due mosse
avanti. Alla prova sul telefono: "quel rettangolino è un po' bruttino". Aveva
ragione — un riquadro di numeri sopra un mondo che si legge da solo, e con
le file che si vedono già arrivare da lontano non aggiungeva abbastanza per
quello che copriva. Tolta.

**Il contatore.** Cinque tocchi sulla marca della build accendono in basso a
sinistra fotogrammi al secondo, densità di pixel e draw call. Serve a capire,
con un telefono vero in mano, dove il gioco arranca.

## 6g. I poteri a tempo

Una corsa era fatta di scelte tutte uguali: quale colonna rompere. I poteri
aggiungono una domanda diversa — *vale la pena cambiare corsia per prenderlo,
adesso?* — perché sono rari (al più due per corsa, mai nelle prime due file,
mai nella prima partita guidata), si vedono da lontano e durano poco:

| potere | cosa fa | dura | addosso all'eroe |
|---|---|---|---|
| 🔥 FURIA | il colpo raddoppia: le colonne davanti diventano verdi | 5 s | alone rosso e braci |
| 🛡️ SCUDO | la prima rossa o il primo nemico che ti prende non costa | 14 s o un colpo | bolla azzurra, lampeggia alla fine |
| 🐦 CORVO | raccoglie le monete di tutte le corsie | 8 s | un corvo che gli gira sopra la testa |

**Come si riconoscono.** La prima versione era una pietra runica uguale per
tutti e tre, con cambiato solo il colore del segno; alla prima prova vera: "il
corvo in pista non si capisce che è un potere". Adesso ogni potere mostra
*cosa fa* — il corvo che sbatte le ali, una fiamma di lingue che guizzano,
uno scudo — dentro una bolla, e i tre parlano la stessa lingua, diversa da
monete e bonus: bolla, **colonna di luce** verso il cielo, **anello** che
gira a terra. Il corvo nella bolla è lo stesso che poi gira sopra l'eroe
(`costruisciCorvo`). Le prime tre volte che se ne avvicina uno, un cartello
dice ⚡ UN POTERE! PRENDILO!

In basso al centro, una targhetta per potere con la barra che si svuota:
quanto manca si deve sapere senza cercarlo. Le costanti stanno in `POTERI`
(`core.js`).

Il simulatore conta la furia (il colpo doppio per le file che si corrono in
5 secondi, alla velocità di quella torre); lo scudo e il corvo no, e non è
una svista: il giocatore simulato non prende mai una rossa e raccoglie già
ogni moneta — i due poteri aiutano solo chi sbaglia, che è il punto. Il
risultato resta 30 / 26 / 26 corse fino alla torre 10, dentro l'oscillazione
del caso. `tools/poteri.js` gioca i tre poteri a passo fisso.

## 6h. Le imprese

L'obiettivo del giorno dà un motivo per giocare oggi; mancava un motivo per
giocare fra un mese. Le imprese (`web/src/imprese.js`) sono tredici, e si
dividono in due famiglie:

- **quelle che arrivano salendo**: la torre 5, il giro delle otto zone, la
  torre 10, la prima rinascita, centomila d'oro, cento nemici, dieci poteri,
  cinquanta trappole evitate;
- **quelle che chiedono di giocare in un certo modo**: una serie di 15 colpi
  senza farsi male, dieci perfetti di fila nel duello, una pista intera senza
  un graffio, il Re di Vetro battuto senza toccare un anello rosso, un
  gigante infuriato battuto senza mancare un anello dopo il ruggito.

Ognuna paga in diamanti (6-20); il giro del regno regala in più l'aspetto
del Campione (o 15 diamanti se l'avevi già). Quando se ne fa una scende una
targhetta d'oro dall'alto, anche in corsa. Il bottone in fondo al menù dice
a che punto sei (IMPRESE 3/13) e apre il registro: le imprese da fare in
ordine di quanto manca, con la barra, le fatte in fondo — e sotto il
salvataggio di riserva, con un collegamento in cima per arrivarci subito.

Chi giocava già prima delle imprese si vede riconoscere all'avvio quello che
ha già fatto — le torri liberate e le rinascite — con i premi ma senza
targhette, che tredici di fila all'apertura sarebbero rumore. I contatori
stanno in `meta.imprese` e viaggiano col codice di riserva.
`tools/imprese.js` fa il giro.

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

**Il vulcano in mezzo alla strada.** Giocando, per un secondo lo schermo è
diventato marrone: "un pezzo di montagna". Il centro di ogni vulcano stava a
66–96 unità dalla pista, ma la base è larga 1,7 volte l'altezza, quindi un
vulcano alto 92 ha 78 di raggio — il pendio invadeva la corsa abbastanza alto
da farci passare la camera. Succedeva in 4 mondi su 30. Adesso la distanza si
misura dal fianco (`raggio + 18..40`), e lo stesso per le colate.

Nessuna prova guardava la geometria. Ora `tools/smoke.js` costruisce ogni
zona 25 volte e fa passare la camera lungo il suo percorso vero — corsa sulle
tre corsie, duello, salita sulla torre — controllando per ogni forma del mondo
se il punto ci cade dentro. Le forme sono primitive di lato 1 scalate, quindi
basta portare il punto nello spazio locale della forma: il controllo è esatto,
non una scatola larga che darebbe falsi allarmi su ogni guglia. Verificata
rimettendo il vecchio vulcano: fallisce ("cono largo 146 a x=68").

## 7c. Il carceriere è del posto

Le otto zone cambiavano cielo, terra e alberi, ma il carceriere ai piedi della
torre era sempre lo stesso omone rosa. È l'unico avversario del gioco e la cosa
che si guarda più da vicino: vederlo identico otto volte faceva sembrare uguali
anche le otto torri.

Adesso ogni tema porta `boss`, `bossDark` e `bossKey`: stessa stazza, colori
e nome della zona — e, da quando il vichingo è stato rifatto, anche un
**tratto** suo (vedi sotto). Il Guardiano del
Gelo, il Signore del Bosco, il Re d'Ossa, l'Ombra di Rúna, il Signore del
Vulcano, il Mangiacenere, il Re di Vetro, il Signore del Tuono.

La minaccia non la porta il colore ma il numero rosso sopra la testa e la
corona: così il carceriere del Cielo Spezzato può essere azzurro senza
sembrare un amico.

**E anche la sua torre.** Era la stessa torre grigia col tetto rosa in tutte e
otto le zone — cioè proprio la cosa che si va a conquistare. Ogni tema porta
adesso `torre: { pietra, scura, tetto, finestre, accento, dettaglio }`:

| zona | torre | dettaglio |
|---|---|---|
| Valle Gelata | ghiaccio azzurro-bianco | cristalli dalla base e dal balcone |
| Bosco Rosso | legno | fogliame d'autunno sotto al balcone e alla base |
| Dune d'Ossa | osso | sei costole che abbracciano il fusto, corna sul tetto |
| Notte di Rúna | pietra viola | fasce e finestre accese, cristalli che galleggiano |
| Bocca di Fuoco | ossidiana | fasce di lava, colate dal basamento, gronda e punta arroventate |
| Palude di Cenere | pietra morta | rami secchi che bucano il fusto |
| Foresta di Vetro | vetro trasparente | il nucleo che si vede dentro, schegge ai piedi |
| Cielo Spezzato | marmo e oro | pezzi di terra che le girano attorno |

La **sagoma** invece è sempre la stessa — fusto, balcone, tamburo, tetto alto
e stretto — perché è lì che si affaccia la principessa e lì sale la camera
della vittoria. I dettagli stanno tutti entro 13 unità dal centro e mai davanti
al portone, dove combatte il carceriere; la prova della geometria di
`tools/smoke.js` lo controlla ad ogni giro, percorso della vittoria compreso.

Le foto della vittoria hanno mostrato un difetto che nel codice non si vedeva:
il tetto d'ossidiana del Vulcano e quello della Cenere erano quasi neri, e il
momento del premio usciva cupo. Il Vulcano ha avuto una gronda di lava accesa
che incornicia la principessa, la Cenere un grigio più chiaro.

Le colonne da spaccare invece restano verdi e rosse ovunque: quel colore è la
regola del gioco, e se cambiasse per zona smetterebbe di leggersi a colpo
d'occhio.

**E combatte a modo suo.** I colori distinguevano le zone, il gioco no. Il
duello è il posto giusto per cambiarle, perché è lì che il giocatore ha il dito
pronto. Ogni tema porta `duello: '<stile>'`, e `STILI_DUELLO` in `core.js`
dice cosa cambia:

| zona | carceriere | stile | cosa succede |
|---|---|---|---|
| Valle Gelata | Guardiano del Gelo | base | il duello normale: si impara qui |
| Bosco Rosso | Signore del Bosco | svelto | l'anello si chiude in 1,0 s invece di 1,2 |
| Dune d'Ossa | Re d'Ossa | storto | pause casuali fra 0,06 e 0,75 s: niente ritmo |
| Notte di Rúna | Ombra di Rúna | ombra | a metà strada l'anello sparisce e il bersaglio non si accende: si conta |
| Bocca di Fuoco | Signore del Vulcano | lampo | 0,84 s: il più svelto |
| Palude di Cenere | Mangiacenere | doppio | due anelli a 0,32 s l'uno dall'altro, ciascuno vale 0,6 |
| Foresta di Vetro | Re di Vetro | finta | un anello su tre è rosso: toccarlo gli ridà vita |
| Cielo Spezzato | Signore del Tuono | salto | il bersaglio si sposta fino a 75 px a ogni anello |

La prima scritta del duello dice come combatte *quel* carceriere — "non
toccare quelli rossi" serve prima del primo rosso, non dopo.

Il doppio vale 0,6 a colpo perché due anelli per giro sarebbero stati un
regalo. Il simulatore gioca ogni stile con una mira peggiorata di una
percentuale stimata (`FATICA`: ombra 0,7, lampo 0,75…) e con una probabilità
di toccare i finti (`ABBOCCA`): la salita fino alla torre 10 passa da 25,5 a
25,0 corse, dentro il rumore. Il duello pesa solo sugli scontri in bilico, e
gli stili cambiano *come* li vinci, non quanti.

Per provarli c'era un problema: con la grafica emulata il browser di prova fa
dieci fotogrammi al secondo, e un robot che deve toccare in una finestra di
80 ms a quella velocità la salta quasi sempre. La prova giusta non aspetta i
fotogrammi: chiama `update(1/60)` a mano, in un ciclo, dentro un'unica
chiamata. È deterministica e dura un secondo. Risultato, a 85% della vita del
carceriere: il robot che tocca a tempo vince in sette zone su otto, quello
che tocca tardi perde in tutte. L'ottava è il Re di Vetro, dove un anello
finto lasciato chiudere costa un'occasione — ed è giusto che sia il più
insidioso.

### Il carceriere rifatto: un gigante del Nord

Accanto al vichingo nuovo il carceriere sembrava di pongo: una palla per il
torace, una per la testa, due occhi neri, una mazza. Ora è un **gigante**, un
bruto vichingo enorme (scala 2,15 invece di 1,9): petto a V con pettorali e
addominali, braccia da fabbro con deltoidi, bicipiti e avambracci, elmo con
gli occhiali di ferro e occhi accesi, barbone a due trecce con gli anelli,
mantello di pelliccia, **un solo** spallaccio di ferro a lamine (l'altro è di
cuoio: l'asimmetria lo fa sembrare un guerriero e non un robot), gonna di
maglia con le falde, bandoliera, cinturone con la fibbia tonda e **il mazzo
di chiavi della prigione**: è lui che le tiene, ed è la cosa che racconta la
storia senza una parola.

Nella mitologia del Nord i giganti (jötnar) sono uno per regno, ed è quello
che servono otto zone: ogni regno sceglie pelle (`boss`), barba e pelliccia
(`TRATTI` in `actors.js`), un tratto e l'arma.

Sopra, un tratto per zona (`TRATTI` in `actors.js`), con l'arma sua:

| Zona | Tratto | Arma |
|---|---|---|
| Gelo | corona di cristalli, barba di ghiaccioli | mazza di cristallo |
| Bosco | corna di cervo, foglie e un fungo sugli spallacci | tronco |
| Ossa | corona d'ossa, costole sul petto | femore |
| Rúna | cappuccio, rune che gli girano attorno | bastone con la gemma |
| Vulcano | corna d'ossidiana, capelli di fuoco, crepe di lava | martello di magma |
| Cenere | maschera a grata, due camini che fumano | mannaia |
| Vetro | corona di prismi, cristalli sulle spalle | mazza di vetro |
| Tuono | corona di nubi che gira, tre saette, mantello | martello del tuono |

Le piccole animazioni (rune, fiamme, nubi, fumo) passano da
`boss.userData.anima(t)`. Il numero della vita è salito a 7,2 per stare sopra
corone e corna.

**Il conto delle draw call.** Eroe e carceriere sono arrivati a ~160 pezzi
l'uno, il doppio col contorno. `fondi()` (in `art.js`, chiamata da
`addOutline`) fonde per ogni nodo i figli fermi con lo stesso materiale: le
braccia, le gambe, lo scudo e l'arma restano gruppi a sé e l'animazione non
se ne accorge. Risultato: eroe da 163 a 61 mesh, carceriere da ~160 a ~80.
Le geometrie fuse sono nuove, e `sciogli()` le libera quando l'attore esce di
scena (`clearWorld`, cambio aspetto, cambio arma).

## 7d. La home in uno schermo

Con le otto zone, le bandierine, gli aspetti e il diario, il menù era arrivato
a 897 px su un telefono che ne mostra 720: il diario — che esiste apposta per
essere fotografato — finiva sotto la piega, e la prima cosa che ha fatto chi
giocava è stata scrollare per trovarlo.

Non si è tolto niente. Si è misurato pezzo per pezzo con il DOM e si è tagliato
dove non si nota:

- bandierine e "ricomincia da capo" su **una riga sola** invece di due (−47 px);
- titolo da 10,5vw a 9vw e margini stretti (−34);
- carta della rinascita, riepilogo, potenziamenti e aspetti: padding e corpi
  ridotti di un paio di punti ciascuno (−60);
- lo spazio elastico fra il suggerimento e la rinascita da 14 px a 6.

Risultato: **720 px esatti**, tutto dentro, fino a schermi da 700. Sotto, il
menù torna a scorrere — che è giusto così: il costo di far entrare tutto in
480 px sarebbe rimpicciolire i bottoni, e da lì si torna al problema di
`2f`.

`tools/misura-home.js` rifà il conto e stampa chi occupa cosa: è il modo per
accorgersi che il menù è cresciuto **prima** che lo faccia notare qualcuno.

## 7e. Una regola per zona

Le otto zone cambiavano cielo, terra, carceriere e duello, ma la corsa si
giocava uguale dappertutto: rompere la colonna giusta. Adesso ogni zona ha
una regola sua (`web/src/trappole.js`), che si vede arrivare e si impara in
una corsa. Le prime due volte in una zona, un cartello la dice in una riga.

| zona | regola | come si vede | cosa succede |
|---|---|---|---|
| Valle Gelata | ghiaccio | chiazza azzurra col bordo acceso | scivoli nella corsia accanto, e per 0,3 s non sterzi |
| Bosco Rosso | tronco | un tronco che rotola da una corsia all'altra | ti prende se ci sei quando passa |
| Dune d'Ossa | spuntoni | punte d'osso che salgono e scendono (tremano prima) | costano solo se sono su |
| Notte di Rúna | nebbia | una fila grigia con "?" al posto dei numeri | i numeri veri a 16 unità |
| Bocca di Fuoco | lava | una striscia che lampeggia arancione, poi è lava | costa solo se è lava |
| Palude di Cenere | geyser | uno sfiato che gorgoglia, poi sbuffa | costa solo mentre sbuffa |
| Foresta di Vetro | specchio | la colonna più dura mostra un numero verde falso, e luccica | il numero vero a 12 unità |
| Cielo Spezzato | fulmine | un cerchio giallo che lampeggia sulla corsia | il fulmine cade quando ci passi |

Le trappole stanno nei **varchi** fra una fila e l'altra, 8 unità prima della
fila: non prendono mai il posto di una colonna, quindi non tolgono la scelta,
la complicano — la corsia buona per la trappola e quella buona per la fila
possono non essere la stessa. Nebbia e specchio invece cambiano una fila, e
mentono anche ai cambi d'arma (`trappolaAspetto`, da cui
passa `refreshThreats`). Mai nelle prime due file, mai nella prima partita
guidata. Una trappola presa costa il 12% della potenza e rompe la serie; lo
scudo la para come para una rossa.

Il simulatore non le vede, e non è una svista: il giocatore simulato le
schiva tutte, e il conto della torre resta quello (30 / 26 / 26). Le
trappole rendono il gioco più difficile solo a chi non le guarda — per
questo costano poco e si annunciano. Se il diario delle prossime prove dice
che pesano troppo, le manopole sono `TRAPPOLA_COSTO` e le `prob` per zona.
`tools/trappole.js` le gioca tutte a passo fisso.

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

**Alta definizione.** "C'è qualche dettaglio sgranato": il 3D era
disegnato al massimo a densità 2, e i telefoni di adesso sono a 2,6-3 —
quindi a due terzi dei pixel e poi ingrandito. Ora si parte dalla densità
vera fino a 3 (e se il telefono non regge si scende, di mezzo punto quando
arranca davvero). In più, alzate le risoluzioni di tutto quello che si
ingrandiva: numeri sulle colonne 512×256 (erano 320×160), mattoni 512 con
le versioni ridotte e il filtro anisotropo (erano 64, sfocati da vicino e
sfarfallanti da lontano), icone 384 (erano 192), ombre 2048 (erano 1024,
a scalini), il traguardo a scacchi 256, il cielo 1024 righe (a 256 si
vedevano le bande).

## 13. Cosa manca, in ordine di impatto sul feel

1. **Audio e vibrazione** — il gioco è muto, ed è la cosa che manca di più: una
   colonna che si spacca senza rumore sembra mezza spaccata. Da fare
   sintetizzato con Web Audio — niente file, niente licenze: colpo, moneta,
   combo che sale di tono, "perfetto" nel duello, crollo del carceriere, e una
   musica leggera che cambia per zona. Poi `navigator.vibrate`, che Chrome su
   Android supporta: un colpetto a ogni colonna, uno forte sul perfetto. Un
   tasto per spegnere tutto nel menù.
2. **Installabile come app (PWA)** — manifest, icona e service worker: da
   "Aggiungi a schermata Home" si apre a schermo intero, senza la barra del
   browser che oggi si mangia un pezzo di schermo, e funziona offline. È anche
   la strada più corta per il Play Store: una PWA si impacchetta come TWA con
   Bubblewrap, senza riscrivere niente.
Fatto, e tolto da questa lista: i diamanti si spendono (seconda occasione,
aspetti), c'è un obiettivo al giorno, e la prima partita insegna giocando.
L'anteprima della riga successiva è stata fatta e poi tolta (§6f).
