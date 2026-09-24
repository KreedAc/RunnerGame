/* =====================================================================
   IMPRESE — traguardi da inseguire per settimane

   L'obiettivo del giorno dà un motivo per giocare oggi; mancava un motivo
   per giocare fra un mese. Le imprese sono tredici: alcune arrivano da sole
   salendo (le torri, l'oro, la prima rinascita), altre chiedono di giocare
   in un certo modo (dieci perfetti di fila, una corsa senza un graffio, il
   Re di Vetro battuto senza toccare un rosso). Ognuna paga in diamanti; il
   giro completo delle otto zone regala l'aspetto del Campione.

   Si contano in meta.imprese.conti (numeri che crescono, o il massimo mai
   fatto) e si segnano in meta.imprese.fatte. Chi aveva già giocato prima
   che esistessero si vede riconoscere quello che ha già fatto: le torri
   liberate e le rinascite, all'avvio.

   Si carica dopo hub.js e prima di game.js.
   ===================================================================== */
const IMPRESE = [
  { id: 'torre5',    icona: '🏰', conta: 'torre',        n: 5,      premio: 10 },
  { id: 'giro',      icona: '🗺️', conta: 'torre',        n: 8,      premio: 15, skin: 4 },
  { id: 'torre10',   icona: '👑', conta: 'torre',        n: 10,     premio: 20 },
  { id: 'rinascita', icona: '🔮', conta: 'rinascite',    n: 1,      premio: 10 },
  { id: 'oro',       icona: '💰', conta: 'oro',          n: 100000, premio: 10 },
  { id: 'nemici',    icona: '👹', conta: 'nemici',       n: 100,    premio: 6 },
  { id: 'poteri',    icona: '⚡', conta: 'poteri',       n: 10,     premio: 6 },
  { id: 'trappole',  icona: '🪤', conta: 'schivate',     n: 50,     premio: 6 },
  { id: 'serie',     icona: '🔥', conta: 'serie',        n: 15,     premio: 6,  massimo: true },
  { id: 'perfetti',  icona: '🎯', conta: 'perfettiFila', n: 10,     premio: 8,  massimo: true },
  { id: 'pulita',    icona: '✨', conta: 'pulite',       n: 1,      premio: 6 },
  { id: 'vetro',     icona: '🪞', conta: 'vetroPulito',  n: 1,      premio: 8 },
  { id: 'rabbia',    icona: '😤', conta: 'rabbiaPulita', n: 1,      premio: 8 }
];

function imprese() {
  if (!meta.imprese || typeof meta.imprese !== 'object') meta.imprese = { fatte: {}, conti: {} };
  const I = meta.imprese;
  if (!I.fatte || typeof I.fatte !== 'object') I.fatte = {};
  if (!I.conti || typeof I.conti !== 'object') I.conti = {};
  return I;
}

const impresaConto = k => { const v = Number(imprese().conti[k]); return isFinite(v) ? v : 0; };

/* un numero che cresce (nemici, oro...) */
function impresaConta(k, quanto) {
  const I = imprese();
  I.conti[k] = impresaConto(k) + (quanto || 1);
  impreseControlla();
}

/* il massimo mai fatto (la serie più lunga, la torre più alta...) */
function impresaMassimo(k, v, zitto) {
  const I = imprese();
  if (!(v > impresaConto(k))) return;
  I.conti[k] = v;
  impreseControlla(zitto);
}

function impreseControlla(zitto) {
  const I = imprese();
  let nuove = 0;
  for (const D of IMPRESE) {
    if (I.fatte[D.id] || impresaConto(D.conta) < D.n) continue;
    I.fatte[D.id] = true;
    nuove++;
    /* il premio: i diamanti, e l'aspetto se c'è — se lo avevi già,
       i diamanti bastano */
    meta.gems += D.premio;
    let dono = '💎' + D.premio;
    if (D.skin !== undefined && !skinOwned(D.skin)) {
      meta.skins = (meta.skins || []).concat([D.skin]);
      dono += ' + ' + t(SKINS[D.skin].key);
    }
    if (!zitto) impresaAnnuncia(D, dono);
  }
  if (nuove) { writeSave(meta); if (state === 'hub') renderHub(); }
}

/* la targhetta in alto: scende, resta un attimo, risale */
let impresaCoda = Promise.resolve();
function impresaAnnuncia(D, dono) {
  impresaCoda = impresaCoda.then(() => new Promise(fine => {
    const el = $('impresaToast');
    el.innerHTML = '<span>' + D.icona + '</span><div><small>' + t('im.fatta') + '</small><b>' +
                   t('im.' + D.id) + '</b></div><em>' + dono + '</em>';
    el.classList.remove('via');
    void el.offsetWidth;
    el.classList.add('su');
    setTimeout(() => { el.classList.remove('su'); el.classList.add('via'); setTimeout(fine, 350); }, 2600);
  }));
}

/* ------------------------------ IL PANNELLO ---------------------------- */
function renderImprese() {
  const I = imprese();
  const fatte = IMPRESE.filter(D => I.fatte[D.id]).length;
  $('rgImpreseBox').classList.remove('hidden');
  $('rgHead').textContent = '🏆 ' + t('im.titolo');
  $('rgSub').textContent = t('im.sub', fatte, IMPRESE.length);
  /* prima quelle da fare, in ordine di quanto manca; in fondo le fatte */
  const lista = IMPRESE.slice().sort((a, b) => {
    const fa = I.fatte[a.id] ? 1 : 0, fb = I.fatte[b.id] ? 1 : 0;
    if (fa !== fb) return fa - fb;
    return impresaConto(b.conta) / b.n - impresaConto(a.conta) / a.n;
  });
  $('rgImprese').innerHTML = lista.map(D => {
    const fatta = !!I.fatte[D.id];
    const v = Math.min(D.n, impresaConto(D.conta));
    const barra = D.n > 1 && !fatta
      ? '<div class="imp-barra"><i style="width:' + (v / D.n * 100).toFixed(1) + '%"></i></div>' +
        '<small>' + fmt(v) + ' / ' + fmt(D.n) + '</small>'
      : '';
    const premio = fatta ? '✓' : '💎' + D.premio + (D.skin !== undefined ? ' 👑' : '');
    return '<div class="imp' + (fatta ? ' fatta' : '') + '">' +
           '<div class="imp-ico">' + D.icona + '</div>' +
           '<div class="imp-testo"><b>' + t('im.' + D.id) + '</b><small>' + t('im.' + D.id + '.d') + '</small>' +
           barra + '</div><div class="imp-premio">' + premio + '</div></div>';
  }).join('');
}

/* il bottone in fondo al menù */
function impreseTesto() {
  const I = imprese();
  return t('im.bottone', IMPRESE.filter(D => I.fatte[D.id]).length, IMPRESE.length);
}

/* ------------------- QUELLO CHE ERA GIÀ STATO FATTO --------------------
   All'avvio: le torri liberate e le rinascite di chi giocava già. Senza
   annunci — tredici targhette di fila all'apertura sarebbero rumore —
   ma i premi sì. */
function impreseRecupera() {
  impresaMassimo('torre', Math.max(0, (meta.bestLevel || meta.level || 1) - 1), true);
  impresaMassimo('rinascite', meta.rebirths || 0, true);
  impreseControlla(true);
}
