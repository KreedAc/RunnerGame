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

## 2. Le tre formule

Tutto il bilanciamento di una torre sta in tre righe di `core.js`:

```
towerNeed(n)  = 430 × 1.62^(n-1)     quanta potenza serve in tutto
wallBudget(n) = towerNeed × 0.55     quanto se ne va nel muro
bossHealth(n) = towerNeed × 0.45     quanto ne resta da spendere
```

`wallBudget` è il costo del percorso **migliore** attraverso il muro: i costi
delle trenta righe sono normalizzati perché la somma delle scelte ottime faccia
esattamente quella cifra. Giocare male costa di più — nella stessa riga i tre
blocchi valgono ×1, ×1.6 e ×2.3 del passo.

Il 55/45 è la parte interessante. Con 100/0 il boss sarebbe un dazio; con 0/100
il muro sarebbe scenografia. A 55/45 un giocatore perfetto senza potenziamenti
sfonda il muro e arriva davanti al carceriere quasi scarico: vede la torre, la
principessa, e perde. È esattamente la sconfitta che fa comprare il primo
potenziamento.

`towerNeed` cresce del 62% a torre, più in fretta di quanto cresca la potenza
naturale di una corsa (più righe, armi migliori). La differenza è quello che i
potenziamenti devono coprire.

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

I potenziamenti si comprano con l'oro e crescono col **logaritmo** del denaro
accumulato; le torri crescono del **62% l'una**. Fatta la matematica, il tetto
arriva presto: anche partendo con l'arma migliore e prendendo tutte le corsie
giuste, la potenza massima di una corsa sta attorno alle 5.500 unità, cioè la
sesta o settima torre. Da lì in poi non c'è acquisto che colmi la differenza.

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
