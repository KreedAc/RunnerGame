# Gate Runner

Runner mobile in portrait ispirato a *Tall Man Run*: corri, scegli il gate giusto
(`×` `÷` `+` `−`), cresci, e a fine livello devi essere più grande del boss.

Questa è la **bozza grafica**: un prototipo giocabile, non ancora un gioco finito.
Serve a fissare look, inquadratura, ritmo e feel dei comandi prima di scegliere
la tecnologia definitiva per Android.

## Provarlo

```bash
# serve un web server: il gioco carica game.js e three.js come file separati
cd web && python3 -m http.server 8080
# poi apri http://localhost:8080  (in DevTools attiva la vista mobile, es. Pixel 5)
```

Su telefono: apri lo stesso URL dalla rete locale. Il gioco è pensato in
verticale, si trascina il dito a sinistra/destra. Da desktop funzionano anche le
frecce.

## Cosa c'è

| | |
|---|---|
| Rendering | three.js r128, look voxel/low-poly, palette satura |
| Pista | generata proceduralmente ad ogni livello (pista, prato, case, alberi, nuvole, skyline) |
| Gate | coppie di pannelli `×N ÷N`, `+N −N`, `×N −N`; verde = migliora, rosso = peggiora |
| Crescita | altezza logaritmica sul contatore, così 10 e 100.000 stanno entrambi in scena |
| Boss | omone rosso a fine pista, con il numero da battere sopra la testa |
| Difficoltà | il target del boss è tarato simulando un giocatore che azzecca l'80% dei gate |
| UI | HUD (livello, contatore, target, barra), schermate menu / vittoria / sconfitta |

## Struttura

```
web/
  index.html          markup + CSS dell'interfaccia + loader
  game.js             tutto il gioco (CONFIG · UTIL · TEXTURES · MONDO · PLAYER · GATE · LOOP)
  vendor/three.min.js copia locale di three.js (serve per il pacchetto offline)
docs/
  DESIGN.md           scelte di design e roadmap verso Android
```

Il tuning sta quasi tutto in `CFG` in cima a `game.js`: velocità, larghezza
pista, distanza tra i gate, palette. `window.GateRunner` è esposto in console
per provare le cose al volo (`GateRunner.setCount(50000)`).

## Stato

- [x] Bozza grafica giocabile nel browser
- [ ] Audio, particellari, feedback all'attraversamento
- [ ] Ostacoli e raccolte oltre ai gate
- [ ] Progressione dei livelli e salvataggio
- [ ] Build Android (vedi `docs/DESIGN.md`)
