# Blocky Squad Run — note di design

## 1. Il ciclo di gioco

Pista dritta, eventi in sequenza: **gate → arma → gate → mob**, e si ripete.
In fondo il boss. Tre numeri sull'HUD dicono tutto: quanti sei, che arma hai,
quanta forza fai. Il boss ne mostra uno solo: quanta ne serve.

Nessun tutorial. Il colore dice cosa fa un gate prima ancora di leggerlo, e
l'HUD aggiorna la forza nell'istante in cui lo attraversi.

## 2. Perché tre sistemi e non uno

Con i soli gate matematici la scelta è sempre la stessa: prendi il verde. È
leggibile ma si esaurisce in trenta secondi.

Aggiungendo arma e mob la scelta diventa un compromesso:

- l'arma non aumenta il numero, ma riduce ciò che i mob ti portano via;
- i mob costano un numero **assoluto** di omini, quindi pesano tantissimo su una
  squadra piccola e poco su una grande;
- la forza finale è il prodotto dei due, quindi né la squadra né l'arma da sole
  bastano.

Da qui nasce la domanda interessante a metà percorso: *conviene moltiplicarmi
adesso o migliorare l'arma prima del prossimo gruppo di mob?*

## 3. La folla: 26 omini e un numero

Renderizzare 500 personaggi sarebbe insensato su mobile e non aggiungerebbe
informazione: oltre una certa densità l'occhio legge "tanti" e basta. Il tetto è
26 modelli, riusati fra un livello e l'altro (crearli è la parte cara, non
disegnarli).

La formazione usa l'angolo aureo: `angolo = i × 2.39996`, `raggio = 0.44 × √i`.
Distribuisce senza griglie visibili e senza sovrapposizioni regolari. Il raggio
è poi moltiplicato per 1.9 lungo Z: la folla è più profonda che larga, perché la
pista è stretta e una folla larga uscirebbe dai bordi.

La camera arretra e sale in funzione del raggio della folla, così la squadra
occupa più o meno sempre la stessa porzione di schermo.

## 4. Bilanciamento

Il livello si genera in tre passi.

**Passo 1 — riferimento.** Genero gli eventi seguendo un giocatore perfetto,
tenendo traccia di squadra e arma. Serve a scegliere numeri sensati in loco: un
gate `+N` calibrato su quanti omini avresti lì, un gruppo di mob con vita pari al
14–28% della forza del momento.

**Passo 2 — costruzione.** Gli oggetti vengono messi in scena con quei valori.

**Passo 3 — il boss.** Due riferimenti:

- la **partita perfetta** (sempre il gate migliore, sempre l'arma su);
- la **mediana di 9 partite simulate all'80% di precisione**.

`vitaBoss = max(mediana80 × 1.3, forzaPerfetta × 0.18)`

Serve prendere il massimo dei due perché con i gate `×6` la forbice fra gioco
perfetto e gioco mediocre è enorme: la sola mediana renderebbe il boss banale
per chi gioca bene, la sola partita perfetta lo renderebbe impossibile per
chiunque.

**Il tetto del 70%.** Un gruppo di mob non può portare via più del 70% della
squadra. Senza questo tetto un giocatore rimasto indietro veniva annientato a
metà pista: punizione doppia e frustrante. Ora chi arriva debole lo paga dove
deve, contro il boss.

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

**L'unica cosa non voxel sono i pannelli dei gate**, che restano lisci e
sfumati. È voluto: sono interfaccia, non mondo, e devono staccare.

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

Il conteggio delle mesh è la cosa da tenere d'occhio: circa 600–800 per livello
(terreno, alberi, case, montagne) più ~180 per la folla. Ogni blocco è una mesh
separata perché serve la ripetizione della texture per faccia.

Se su fascia bassa non regge, in ordine di resa:
1. ridurre `CFG.maxRunners` da 26 a 16;
2. diradare `buildTerrain` e `buildProps`;
3. unire i blocchi statici con `BufferGeometryUtils.mergeBufferGeometries`
   (sta negli examples di three, va aggiunto) usando un atlas al posto dei
   materiali per faccia.

## 8. Cosa manca, in ordine di impatto sul feel

1. **Impatti** — particellari sui mob abbattuti, scossa di camera, suono secco.
   Adesso i mob si stendono e basta.
2. **Audio** — musica loop e sfx. Sposta la qualità percepita più di qualunque
   effetto grafico.
3. **Anteprima degli eventi successivi** sopra al gate corrente, per pianificare.
4. **Ostacoli oltre ai mob** — muri da sfondare col numero, monete, rampe.
5. **Progressione** — temi (foresta, neve, nether), salvataggio, valuta, skin.
6. **Prima esecuzione** — mano animata che spiega lo swipe, livello 1 facile.
