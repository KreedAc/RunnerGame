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

## 7. Le zone

Ogni torre cambia mondo: Valle Gelata, Bosco Rosso, Dune d'Ossa, Notte di Rúna.
Cambiano cielo (sfumatura ridisegnata su canvas), nebbia, luce ambientale,
intensità del sole, terreno, rilievi, alberi, montagne e colore delle nuvole.
Le regole e la pista non cambiano di una virgola.

Costa poco perché la palette del mondo sta tutta in `THEMES` dentro `core.js` e
`initArt()` riassegna i materiali ad ogni costruzione di livello: aggiungere una
zona è aggiungere dodici numeri a una lista. I personaggi restano fuori dal
tema — l'eroe dev'essere sempre lo stesso, ovunque si trovi.

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
2. **Impatti più grassi** — scossa di camera, numeri che schizzano dal punto
   colpito invece che dal centro schermo, rallentamento di un frame.
4. **Anteprima della riga successiva** in alto, per pianificare due mosse avanti.
5. **Missioni e valuta premium** — i cristalli si raccolgono ma non si spendono
   ancora.
6. **Prima esecuzione** — mano animata che spiega lo swipe, prima riga con solo
   verde.
