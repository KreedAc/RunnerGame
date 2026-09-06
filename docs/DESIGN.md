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

**Due forme sbagliate, corrette.** Gli ostacoli da spaccare erano colonne
coniche con una punta in cima: a distanza si leggevano come omini, cioè come
nemici — l'opposto di quello che sono. Adesso sono grappoli di cristalli su una
base di roccia, con l'emissive che li fa sembrare energia: si capisce che ti
danno potenza prima ancora di leggere il numero.

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

## 6. Niente schermata di fine partita

Era un passaggio a vuoto: leggevi un numero, premevi un bottone, e solo allora
arrivavi dove si spende. Adesso la corsa finisce, si resta fermi un attimo a
vedere com'è andata (2,2s, 3,4s se hai vinto), e si è già nel menù con il
riepilogo al posto della storia e i potenziamenti sotto al pollice.

Un tap in meno per ciclo, e il ciclo è quello che si ripete cento volte.

## 7. I cartelli

Due striscioni attraversano il muro alla riga corrispondente: azzurro
sull'ultima corsa, dorato sul record. Si vedono da lontano, quindi la corsa ha
un bersaglio intermedio anche quando la torre è ancora fuori portata.

`markerZ(d) = wallStartZ − (d − 0.5) × wallGap`, cioè subito dopo l'ultimo
blocco abbattuto.

## 8. Verso Android

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

## 9. Prestazioni

Il conteggio delle mesh è la cosa da tenere d'occhio: circa 600–800 per il mondo
(terreno, alberi, case, montagne), ~150 per gli oggetti della pista e ~270 per il
muro (30 righe × 3 blocchi) e ~80 per la torre. I contorni raddoppiano le mesh
dei soli personaggi.

Se su fascia bassa non regge, in ordine di resa:
1. ridurre `CFG.wallRows` da 30 a 20;
2. diradare `buildCliffs`;
3. unire le forme statiche con `BufferGeometryUtils.mergeBufferGeometries`
   (sta negli examples di three, va aggiunto): con i colori piatti è molto
   più semplice di prima, basta raggruppare per materiale.

## 10. Cosa manca, in ordine di impatto sul feel

1. **Audio** — musica loop e sfx sull'impatto. Sposta la qualità percepita più
   di qualunque effetto grafico.
2. **Impatti più grassi** — scossa di camera, numeri che schizzano dal punto
   colpito invece che dal centro schermo, rallentamento di un frame.
3. **Torri a tema** — la valle è sempre la stessa. Deserto, vulcano e notte
   cambierebbero solo la palette `C` in cima a `core.js`: il codice è già pronto.
4. **Anteprima della riga successiva** in alto, per pianificare due mosse avanti.
5. **Missioni e valuta premium** — i cristalli si raccolgono ma non si spendono
   ancora.
6. **Prima esecuzione** — mano animata che spiega lo swipe, prima riga con solo
   verde.
