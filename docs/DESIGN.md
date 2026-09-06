# Blocky Power Run — note di design

## 1. Il ciclo di gioco

Menù → corsa → finale → bottino → potenziamenti → corsa. Una partita dura
40-60 secondi ed è divisa in due metà con regole opposte:

- **prima metà: accumuli.** Corri su tre corsie e a ogni riga scegli cosa
  prendere. Spaccare fa salire la potenza, sbagliare la fa scendere.
- **seconda metà: spendi.** Oltre la linea a scacchi ogni blocco costa
  potenza. Quanto lontano arrivi è il punteggio.

È la struttura che rende leggibile la prima metà: mentre corri, il numero
grande in alto è l'unica cosa che conta, e sai già a cosa servirà.

## 2. Il colore è la regola

Ogni torre e ogni nemico mostrano un numero. Il numero è **verde se il tuo
colpo attuale ci arriva, rosso se no** — non è una proprietà dell'oggetto, è
una relazione con te in questo momento. Quando passi da un banco da lavoro e
l'arma sale, `refreshThreats()` ricolora tutto quello che non hai ancora
incontrato: file che erano rosse diventano verdi davanti ai tuoi occhi.

È il modo più economico per insegnare il gioco senza tutorial, e trasforma il
banco da lavoro da "bonus generico" a "chiave che apre corsie".

Le torri cambiano anche materiale (cobblestone verde o rosso), così la lettura
regge anche a distanza, prima che il numero sia decifrabile.

## 3. Perché tre corsie e non due

Con due corsie la scelta è binaria e quasi sempre ovvia. Con tre c'è quasi
sempre una via di fuga neutra: prendere il verde, evitare il rosso, o passare
in mezzo senza guadagnare né perdere. Le righe sono costruite così:

- corsia 1: la torre alla tua portata (il guadagno);
- corsia 2: il banco da lavoro, oppure un nemico, oppure una torre dura;
- corsia 3: libera nel 55% dei casi — è l'uscita di sicurezza.

I nemici sono rari di proposito, due o tre per partita: sono l'eccezione che
spezza il ritmo, non l'ostacolo di base.

## 4. Bilanciamento

**Il riferimento.** La pista si genera seguendo un giocatore perfetto e
tenendo traccia della sua potenza e della sua arma. Gli hp delle torri sono
calcolati sul colpo che avrebbe *in quel punto*, non su un valore assoluto: una
torre "facile" vale sempre il 55-95% del colpo, una "dura" l'1.3-2.6×. Così la
difficoltà resta costante mentre i numeri crescono di ordine di grandezza.

**La stima dei bonus.** Il giocatore raccoglie anche i bonus della colonnina,
che il riferimento non simula. Sperimentalmente valgono circa +50%, quindi
`expectedPower = refPower × 1.5`.

**I costi del finale.** `costo(i) = base × (1 + i × 0.42)` con
`base = expectedPower / 55`. In ogni riga i tre blocchi valgono
`×0.65`, `×1`, `×1.5` del passo, quindi scegliere bene allunga la corsa di
qualche blocco. Con questi numeri un giocatore perfetto arriva a ~14 blocchi
su 36 disponibili: il resto è margine per chi ha comprato i potenziamenti.

**Le percentuali invece dei valori fissi.** Prendere una torre rossa costa il
14% della potenza, un nemico il 22%. Un costo fisso sarebbe irrilevante a fine
corsa e letale all'inizio; una percentuale pesa uguale in ogni momento.

## 5. Grafica voxel senza asset

Tutto è `BoxGeometry` scalato. Nessun modello, nessuna texture scaricata: le
texture sono disegnate su canvas 16×16 al caricamento e filtrate `NearestFilter`.

Tre dettagli che fanno la differenza:

- **La griglia dei blocchi.** Ogni tile ha un bordo scuro sul perimetro, e la
  texture si ripete una volta per unità di mondo. Un muro 5×3 mostra 15 blocchi,
  non un blocco stirato. Senza questo, il terreno sembra moquette.
- **Le facce diverse per lato.** Il blocco d'erba usa un array di 6 materiali:
  erba sopra, terra sotto, terra con la frangia verde sui lati.
- **I volti 8×8.** Occhi, sopracciglia e bocca disegnati a pixel su una texture
  minuscola, applicata solo alla faccia +Z della testa. Cambiando cinque colori
  si passa dall'eroe allo zombie allo scheletro senza toccare la geometria.

Gli arti ruotano attorno a un perno posto in alto (spalla, anca), non attorno al
proprio centro: è la differenza fra una corsa e un frullatore.

Le etichette 3D adattano il corpo del font alla larghezza del canvas: senza
questo "Bastone" veniva tagliato a "aston".

## 6. Verso Android

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

## 7. Prestazioni

Il conteggio delle mesh è la cosa da tenere d'occhio: circa 600–800 per il mondo
(terreno, alberi, case, montagne), ~150 per gli oggetti della pista e ~320 per il
corridoio finale (36 righe × 3 blocchi). Ogni blocco è una mesh separata perché
serve la ripetizione della texture per faccia.

Se su fascia bassa non regge, in ordine di resa:
1. ridurre `CFG.finaleRows` da 36 a 24;
2. diradare `buildTerrain` e `buildProps`;
3. unire i blocchi statici con `BufferGeometryUtils.mergeBufferGeometries`
   (sta negli examples di three, va aggiunto) usando un atlas al posto dei
   materiali per faccia.

## 8. Cosa manca, in ordine di impatto sul feel

1. **Audio** — musica loop e sfx sull'impatto. Sposta la qualità percepita più
   di qualunque effetto grafico.
2. **Impatti più grassi** — scossa di camera, numeri che schizzano dal punto
   colpito invece che dal centro schermo, rallentamento di un frame.
3. **Zone** — la pista è sempre la stessa pianura. Neve, deserto e notte
   cambierebbero solo la palette dei blocchi: il codice è già pronto.
4. **Anteprima della riga successiva** in alto, per pianificare due mosse avanti.
5. **Missioni e valuta premium** — i cristalli si raccolgono ma non si spendono
   ancora.
6. **Prima esecuzione** — mano animata che spiega lo swipe, prima riga con solo
   verde.
