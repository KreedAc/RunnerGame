# Gate Runner — note di design

## 1. Il ciclo di gioco

Un livello è una pista dritta con N file di gate. Ad ogni fila si sceglie una
delle due porte; l'operazione modifica il contatore, il contatore determina
l'altezza del personaggio. In fondo c'è un boss con un numero: se il tuo è più
alto, vince tu.

Tre secondi per capirlo, nessun tutorial. È il motivo per cui il numero grosso
in alto, il colore verde/rosso dei pannelli e l'altezza del personaggio dicono
tutti la stessa cosa contemporaneamente.

## 2. Perché l'altezza è logaritmica

`altezza = 0.55 + log10(contatore) * 0.62`

Con `×6` ripetuti il contatore esplode (milioni dopo pochi gate). Se l'altezza
fosse lineare, il personaggio uscirebbe dall'inquadratura al terzo gate. Con la
scala logaritmica ogni ordine di grandezza aggiunge sempre lo stesso "scalino"
visivo: crescere si vede sempre, ma la camera regge fino a 10 milioni.

La camera si allontana e si alza in proporzione all'altezza, così il
personaggio occupa più o meno la stessa porzione di schermo mentre cresce, e
quello che cambia è la scala di *tutto il resto*.

## 3. Taratura del boss

Il percorso perfetto (sempre il gate migliore) porta a numeri irraggiungibili:
usarlo come target renderebbe ogni livello impossibile. Il boss vale invece la
**mediana di 9 partite simulate di un giocatore che azzecca l'80% dei gate,
scontata del 30%**.

Risultato: chi gioca bene vince, chi sbaglia due o tre gate importanti perde.
Il numero si adatta da solo alla generazione casuale del livello, senza
tabelle da mantenere a mano.

## 4. Look

- **Voxel/low-poly**: tutto è costruito da `BoxGeometry` e `SphereGeometry`
  scalate, con `MeshLambertMaterial`. Zero asset esterni, zero download, si
  ridisegna cambiando dei numeri.
- **Palette satura, cielo alto**: azzurro pieno, prato verde acceso, pista
  chiara con texture di pietrisco generata su canvas.
- **Personaggio**: sfere scalate (gambe, bacino, torso, spalle, braccia,
  testa). Sembra plastilina, cresce bene, si anima con due seni.
- **Pannelli dei gate**: gradiente verticale + testo bianco con contorno,
  disegnati su canvas 384×640 (stesso rapporto del pannello, così il testo non
  si deforma). Leggermente trasparenti: si intravede cosa c'è dopo.
- **Camera**: FOV 46°. In verticale un FOV largo riempie lo schermo di
  pavimento vuoto; 46° stringe sulla pista e sui gate.

## 5. Verso Android

Tre strade, in ordine di costo crescente:

### A. WebView (Capacitor) — la più veloce
Il prototipo attuale diventa un `.apk` senza riscrivere niente: `npx cap init`,
`npx cap add android`, si copia `web/` in `www/`. three.js va servito dalla
copia in `vendor/` (già presente) perché l'app deve funzionare offline.

- ✅ zero riscrittura, iterazione immediata
- ⚠️ 45–60 fps su fascia media, non 120; niente ad-network nativi senza plugin

Va benissimo per playtest, video di prova e validazione dell'idea.

### B. Unity — lo standard per questo genere
È quello che usa Supersonic. Ha già tutto: ad mediation (LevelPlay/ironSource),
analytics, A/B test sul primo livello, build iOS gratis.

- ✅ performance, monetizzazione, pipeline nota agli editori hypercasual
- ⚠️ si riparte da zero (ma il design di questo prototipo è già la spec)

È la scelta giusta se l'obiettivo è pubblicare davvero sul Play Store.

### C. Godot 4
Via di mezzo: open source, export Android nativo, leggero.

- ✅ nessun costo di licenza, engine piacevole
- ⚠️ ecosistema pubblicitario molto più povero di Unity

### Raccomandazione
Restare su A finché il gameplay non convince (è veloce cambiare tutto), poi
portare in Unity per la pubblicazione. Questo repo resta la reference
giocabile: le costanti in `CFG` e le formule qui sopra si trasferiscono
direttamente.

## 6. Cosa manca al prototipo

Ordinati per impatto sul feel:

1. **Feedback all'attraversamento** — particellari, screen shake, un suono
   secco. Adesso il gate collassa e basta.
2. **Audio** — musica loop + sfx. Sposta la percezione di qualità più di
   qualunque effetto grafico.
3. **Anteprima delle file successive** — nel gioco di riferimento si leggono
   i gate successivi sopra a quello corrente: permette di pianificare.
4. **Varietà di ostacoli** — muri da sfondare (il cui costo dipende dalla
   taglia), monete, rampe.
5. **Progressione** — livelli con temi diversi (città, neve, spiaggia),
   salvataggio, valuta e skin.
6. **Prima esecuzione** — mano animata che spiega lo swipe, primo livello
   volutamente facile.
