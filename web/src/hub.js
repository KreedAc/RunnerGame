/* =====================================================================
   HUB — menù iniziale, portafoglio, potenziamenti permanenti, schermate
   ===================================================================== */

const meta = loadSave();

const $ = id => document.getElementById(id);

/* ---------------------------- SCHERMATE ------------------------------ */
/* Una sola alla volta è visibile; il mondo 3D resta sempre sotto. */
/* Il menù è l'unica schermata: a fine partita si torna qui, con il
   riepilogo della corsa appena fatta sopra ai potenziamenti. */
function showScreen(name) {
  $('hub').classList.toggle('hidden', name !== 'hub');
  $('nav').classList.toggle('hidden', name !== 'hub');
  if (name !== 'hub') chiudiSchede();
  $('hud').classList.toggle('hidden', name !== null);
  /* la camera del menù si punta sulla fascia lasciata libera dal menù
     stesso, quindi va rifatto ogni volta che il menù compare */
  if (name === 'hub' && typeof aimMenuCamera === 'function') aimMenuCamera();
}

/* ------------------------------ LE SCHEDE ------------------------------
   Eroe, Rune, Imprese, Opzioni (e la Rinascita, dalla sua tessera): una
   alla volta, sopra il menù e sotto la barra in basso. Toccare la scheda
   aperta, GIOCA o la ✕ la chiude. */
const SCHEDE = ['schEroe', 'bottega', 'registro', 'schOpzioni', 'schRinascita'];
let schedaAperta = '';

function apriScheda(id) {
  if (!id || schedaAperta === id) { chiudiSchede(); return; }
  SCHEDE.forEach(k => $(k).classList.toggle('hidden', k !== id));
  schedaAperta = id;
  document.querySelectorAll('.nav-b').forEach(b => b.classList.toggle('on', b.dataset.scheda === id));
  if (id === 'bottega') { bottegaArmata = ''; renderBottega(); }
  if (id === 'registro') {
    if (typeof renderImprese === 'function') renderImprese();
    renderDiary();
    meta.impreseViste = impreseFatte();
    writeSave(meta);
    renderBadge();
  }
  if (id === 'schOpzioni') preparaOpzioni();
  if (id === 'schEroe') renderSkins();
  if (id === 'schRinascita') { rebirthArmed = false; renderRebirth(); }
}

function chiudiSchede() {
  SCHEDE.forEach(k => $(k).classList.add('hidden'));
  schedaAperta = '';
  document.querySelectorAll('.nav-b').forEach(b => b.classList.toggle('on', b.id === 'navGioca'));
}

/* i pallini rossi: c'è qualcosa da prendere di là */
const impreseFatte = () => typeof imprese === 'function'
  ? Object.keys(imprese().fatte).length : 0;
function renderBadge() {
  const b = (id, acceso) => $(id).querySelector('.badge').classList.toggle('hidden', !acceso);
  b('navEroe', SKINS.some((s, i) => !skinOwned(i) && meta.gems >= s.gems));
  b('navRune', $('runePill').classList.contains('spendi'));
  b('registroBtn', impreseFatte() > (meta.impreseViste || 0));
  /* il salvataggio di riserva: da ricordare a chi ha qualcosa da perdere */
  b('navOpzioni', !meta.backupFatto && (meta.bestLevel || 1) >= 3);
}

/* --------------------------- POTENZIAMENTI --------------------------- */
function upgradeInfo(key) {
  const u = UPGRADES[key];
  /* l'arma parte da quella di famiglia, se è meglio: la carta mostra
     quella e vende la successiva, non il Randello che non serve più */
  const lvl = key === 'weapon' ? armaIniziale() : meta.up[key];
  const maxed = lvl >= u.max;
  const cost = maxed ? Infinity : upgradeCost(key, lvl);
  return { u, lvl, maxed, cost, afford: meta.coins >= cost };
}

/* Come si legge il valore di un potenziamento nel menù.
   POTENZA e ORO sono moltiplicatori: si leggono ×1.10, ×1.21, ×1.33… */
function upgradeValueText(key) {
  const lvl = key === 'weapon' ? armaIniziale() : meta.up[key];
  if (key === 'weapon') return weaponName(lvl);
  return '×' + UPGRADES[key].value(lvl).toFixed(2);
}

function buyUpgrade(key) {
  const { lvl, maxed, cost, afford } = upgradeInfo(key);
  if (maxed || !afford) return;
  meta.coins -= cost;
  meta.up[key] = lvl + 1;
  writeSave(meta);
  renderHub();
  /* comprare deve sentirsi: la carta rimbalza, le monete partono dal
     portafoglio e ci entrano dentro */
  const card = document.querySelector('.up-card[data-key="' + key + '"]');
  pulsa(card, 'compra');
  const r = card.getBoundingClientRect(), w = document.querySelector('.wallet .coin-pill').getBoundingClientRect();
  for (let k = 0; k < 6; k++) setTimeout(() => volaVerso(
    { x: w.left + 20, y: w.top + w.height / 2 }, { x: r.left + r.width / 2, y: r.top + r.height * 0.4 }), k * 45);
}

/* ------------------------------ RENDER -------------------------------- */
function renderWallet() {
  $('hubCoins').textContent = fmt(meta.coins);
  $('hubGems').textContent  = fmt(meta.gems);
  /* la pillola mostra le rune da SPENDERE, e si accende quando in
     bottega c'è qualcosa alla loro portata */
  const libere = runeLibere();
  $('hubRunes').textContent = fmt(libere);
  $('runePill').classList.toggle('hidden', meta.runes === 0);
  const spendibile = Object.keys(BOTTEGA).some(k =>
    perk(k) < BOTTEGA[k].costi.length && BOTTEGA[k].costi[perk(k)] <= libere);
  $('runePill').classList.toggle('spendi', spendibile);
}

/* ------------------------------ RINASCITA ------------------------------ */
/* Azzera i potenziamenti e riporta alla prima torre, ma le rune restano e
   valgono +25% su potenza e oro per sempre. È l'unica uscita quando le
   torri crescono più in fretta di quanto il denaro possa comprare. */
let rebuildHook = null;      // lo riempie game.js: deve ricostruire il mondo
let rebirthArmed = false;

function renderRebirth() {
  const gain = runeGain(meta.level);
  const card = $('rebirthCard');
  card.classList.toggle('hidden', gain < 1);
  if (gain < 1) { rebirthArmed = false; }
  $('rbGain').textContent = '+' + gain;
  $('rbTag').textContent = '+' + gain;
  $('rbBonus').textContent = '×' + runeMul(meta.runes + gain).toFixed(2);
  card.classList.toggle('ready', meta.lastOutcome === 'win');
  $('rbNote').textContent = t(rebirthArmed ? 'rb.confirm' : 'rb.note');
  $('rbNote').classList.toggle('armata', rebirthArmed);
  $('rbVai').querySelector('span').textContent = t(rebirthArmed ? 'rb.sicuro' : 'rb.vai');
}

function tapRebirth() {
  if (runeGain(meta.level) < 1) return;
  if (!rebirthArmed) {                    // due tocchi: azzera tutto, non si torna indietro
    rebirthArmed = true;
    renderRebirth();
    setTimeout(() => { if (rebirthArmed) { rebirthArmed = false; renderRebirth(); } }, 6000);
    return;
  }
  const gain = runeGain(meta.level);
  meta.runes += gain;
  meta.rebirths++;
  impresaConta('rinascite', 1);
  meta.coins = 0;
  meta.up = { power: 0, weapon: 0, income: 0 };
  meta.level = 1;
  meta.best = 0; meta.last = 0; meta.lastCoins = 0;
  meta.lastRecord = false; meta.lastOutcome = '';
  meta.diary = []; meta.tries = 0; meta.towerRevived = 0;   // nuova salita, diario nuovo
  rebirthArmed = false;
  writeSave(meta);
  chiudiSchede();
  flashBanner(t('rb.done', gain), 'good');
  if (rebuildHook) rebuildHook();
  renderHub();
}

/* ----------------------------- RICOMINCIA -----------------------------
   Azzera il salvataggio e riporta alla Torre 1 senza rune né niente: è la
   rinascita senza premio, per rivedere il gioco con gli occhi di chi
   comincia adesso. Compare solo se c'è qualcosa da cancellare, e come la
   rinascita chiede due tocchi — con un pollice, uno solo è troppo poco
   per una cosa che non si può annullare. */
let resetArmed = false;
let resetTimer = 0;

const hasProgress = () => meta.level > 1 || meta.coins > 0 || meta.runes > 0 ||
                          meta.gems > 0 || !!meta.lastOutcome ||
                          meta.up.power > 0 || meta.up.weapon > 0 || meta.up.income > 0;

function renderReset() {
  const btn = $('resetBtn');
  btn.classList.toggle('hidden', !hasProgress());
  btn.classList.toggle('armed', resetArmed);
  btn.textContent = t(resetArmed ? 'reset.sure' : 'reset.do');
}

function tapReset() {
  if (!resetArmed) {
    resetArmed = true;
    renderReset();
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => { resetArmed = false; renderReset(); }, 6000);
    return;
  }
  clearTimeout(resetTimer);
  resetArmed = false;
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* niente da fare */ }
  Object.assign(meta, defaultSave());
  writeSave(meta);
  flashBanner(t('reset.done'));
  chiudiSchede();
  if (rebuildHook) rebuildHook();
  renderHub();
}

/* ------------------------- L'OBIETTIVO DEL GIORNO ----------------------
   Uno al giorno, lo stesso per tutti quel giorno: si sceglie dal numero
   del giorno, non a caso, così due amici che giocano lo stesso giorno
   hanno lo stesso obiettivo e se lo possono raccontare. */
function oggiData(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
         String(d.getDate()).padStart(2, '0');
}

function obiettivoOggi() {
  const d = new Date();
  const g = oggiData(d);
  if (!meta.oggi || meta.oggi.giorno !== g) meta.oggi = { giorno: g, fatto: 0, preso: false };
  const giorni = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
  return OBIETTIVI[giorni % OBIETTIVI.length];
}

/* Lo chiama il gioco quando succede qualcosa che un obiettivo può contare.
   Il premio arriva nel momento in cui lo fai, non al menù: è lì che fa
   piacere. */
function oggiConta(tipo, quanto) {
  const o = obiettivoOggi();
  if (o.tipo !== tipo || meta.oggi.preso) return;
  meta.oggi.fatto = o.massimo ? Math.max(meta.oggi.fatto, quanto) : meta.oggi.fatto + quanto;
  if (meta.oggi.fatto < o.n) return;
  meta.oggi.fatto = o.n;
  meta.oggi.preso = true;
  meta.gems += PREMIO_OGGI;
  writeSave(meta);
  flashBanner(t('og.fatto', PREMIO_OGGI), 'good');
}

function renderOggi() {
  const el = $('oggi');
  /* la prima partita è di chi sta imparando: niente compiti */
  const mostra = !!meta.lastOutcome;
  el.classList.toggle('hidden', !mostra);
  if (!mostra) return;
  const o = obiettivoOggi();
  el.classList.toggle('fatto', meta.oggi.preso);
  $('oggiTesto').textContent = meta.oggi.preso ? t('og.domani') : t('og.' + o.tipo, o.n);
  $('oggiConto').textContent = meta.oggi.preso ? '✓' : meta.oggi.fatto + '/' + o.n;
  $('oggiBarra').style.width = (meta.oggi.preso ? 100 : meta.oggi.fatto / o.n * 100) + '%';
  $('oggiPremio').textContent = PREMIO_OGGI;
}

/* ------------------------------ LA BOTTEGA -----------------------------
   Si apre toccando la pillola delle rune nel portafoglio: il menù è già
   alto quanto lo schermo, e una bottega che si usa una volta per
   rinascita non merita una riga fissa. Comprare chiede due tocchi, come
   tutto quello che non si può annullare. */
let bottegaArmata = '';

/* cosa fa un vantaggio al gradino g, in una riga */
function effettoPerk(k, g) {
  switch (k) {
    case 'arma'  : return t('bt.e.arma', weaponName(g));
    case 'scorta': return t('bt.e.scorta', 2 * g);
    case 'mira'  : return t('bt.e.mira', Math.round((DUELLO.perfetto + 0.015 * g) * 1000));
    case 'muro'  : return t('bt.e.muro', 4 * g);
    case 'gemme' : return t('bt.e.gemme', 50 * g);
    case 'pelle' : return t('bt.e.pelle', 5 - g);
  }
  return '';
}

function renderBottega() {
  const libere = runeLibere();
  const lista = $('btList');
  lista.innerHTML = '';
  /* senza rune la bottega è chiusa, ma la scheda dice come si apre */
  if (!meta.runes) { $('btSub').innerHTML = t('rune.chiuse'); return; }
  $('btSub').innerHTML = t('bt.sub', libere, runeMul(meta.runes).toFixed(2));
  for (const k of Object.keys(BOTTEGA)) {
    const B = BOTTEGA[k];
    const g = perk(k);
    const max = g >= B.costi.length;
    const costo = max ? 0 : B.costi[g];
    const riga = document.createElement('button');
    riga.className = 'bt-riga' + (max ? ' max' : costo > libere ? ' caro' : '') +
                     (bottegaArmata === k ? ' armata' : '');
    const pallini = B.costi.map((_, i) => i < g ? '●' : '○').join('');
    riga.innerHTML =
      '<span class="bt-ico">' + B.icona + '</span>' +
      '<span class="bt-testo"><b>' + t('bt.' + k) + '</b><small>' +
        (max ? effettoPerk(k, g) : (g ? effettoPerk(k, g) + ' → ' : '') + effettoPerk(k, g + 1)) +
      '</small></span>' +
      '<span class="bt-pallini">' + pallini + '</span>' +
      '<span class="bt-costo">' + (max ? t('up.max') : bottegaArmata === k ? t('bt.ok')
        : '<i class="ic ic-runa"></i>' + costo) + '</span>';
    riga.addEventListener('click', () => compraPerk(k));
    lista.appendChild(riga);
  }
}

function compraPerk(k) {
  const g = perk(k);
  const B = BOTTEGA[k];
  if (g >= B.costi.length) return;
  const costo = B.costi[g];
  if (costo > runeLibere()) { flashBanner(t('bt.poche', costo - runeLibere()), 'bad'); return; }
  if (bottegaArmata !== k) { bottegaArmata = k; renderBottega(); return; }
  bottegaArmata = '';
  meta.runeSpese = (meta.runeSpese || 0) + costo;
  meta.bottega[k] = g + 1;
  writeSave(meta);
  flashBanner(B.icona + ' ' + t('bt.' + k) + '!', 'good');
  renderBottega();
  renderHub();
}

function apriBottega() { if (schedaAperta !== 'bottega') apriScheda('bottega'); }
function chiudiBottega() { chiudiSchede(); }

/* ------------------------------ IL REGISTRO ---------------------------
   Imprese e salvataggio di riserva, in un pannello solo che si apre dal
   fondo del menù. Il "ricomincia da capo" sta qui dentro: cancellare tutto
   e mettere al sicuro tutto sono due facce della stessa cosa, e fuori dal
   menù principale non si tocca per sbaglio. */
let caricaArmato = false;

function apriRegistro() { if (schedaAperta !== 'registro') apriScheda('registro'); }
function chiudiRegistro() { chiudiSchede(); }

function preparaOpzioni() {
  caricaArmato = false;
  $('svCodice').classList.add('hidden');
  $('svCarica').classList.add('hidden');
  $('svCarica').classList.remove('armata');
  $('svCarica').textContent = t('sv.carica');
  svMsg('');
  renderReset();
  renderLangs();
}

function svMsg(txt, male) {
  $('svMsg').textContent = txt;
  $('svMsg').classList.toggle('no', !!male);
}

function copiaCodice() {
  meta.backupFatto = true;
  renderBadge();
  writeSave(meta);
  const codice = codiceSalvataggio(meta);
  const box = $('svCodice');
  box.value = codice;
  box.readOnly = true;
  box.classList.remove('hidden');
  $('svCarica').classList.add('hidden');
  caricaArmato = false;
  const aMano = () => { box.focus(); box.select(); svMsg(t('sv.seleziona')); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(codice).then(() => svMsg(t('sv.copiato')), aMano);
  } else aMano();
}

function preparaIncolla() {
  const box = $('svCodice');
  box.value = '';
  box.readOnly = false;
  box.classList.remove('hidden');
  $('svCarica').classList.remove('hidden', 'armata');
  $('svCarica').textContent = t('sv.carica');
  caricaArmato = false;
  svMsg(t('sv.qui'));
  box.focus();
}

/* come il ricomincia: due tocchi, perché sovrascrive tutto */
function caricaCodice() {
  const nuovo = leggiCodice($('svCodice').value);
  if (!nuovo) { svMsg(t('sv.rotto'), true); caricaArmato = false; return; }
  if (!caricaArmato) {
    caricaArmato = true;
    $('svCarica').classList.add('armata');
    $('svCarica').textContent = t('sv.sicuro');
    svMsg('');
    return;
  }
  for (const k of Object.keys(meta)) delete meta[k];
  Object.assign(meta, nuovo);
  writeSave(meta);
  chiudiSchede();
  flashBanner(t('sv.fatto'), 'good');
  if (rebuildHook) rebuildHook();
  renderHub();
}

/* ------------------------------ DIARIO --------------------------------
   Quanti tentativi è costata ogni torre. Non serve al gioco: serve a
   tarare la difficoltà su una partita vera invece che sul simulatore,
   senza chiedere a nessuno di tenere il conto a mente. */
function renderDiary() {
  const storia = meta.diary || [];
  const inCorso = meta.tries || 0;
  const box = $('diary');
  box.classList.toggle('hidden', !storia.length && !inCorso);

  const chip = (torre, tent, seconda, ora) =>
    '<span class="dy-chip' + (ora ? ' now' : '') + '">T' + torre +
    ' <b>' + tent + '</b>' + (seconda ? '<i>*</i>' : '') + '</span>';

  $('dyRow').innerHTML =
    storia.map(e => chip(e.l, e.t, e.r, false)).join('') +
    (inCorso ? chip(meta.level, inCorso, meta.towerRevived, true) : '');
}

function renderHub() {
  renderWallet();
  $('hubLevel').textContent = t('hub.tower', meta.level);
  $('hubZone').textContent  = t(themeFor(meta.level).key);
  /* Una riga sola sotto al titolo, in ordine di importanza: le rune se
     ci sono, altrimenti quanto lontano sei arrivato. */
  $('hubBest').textContent = meta.runes
    ? t('hub.runes', meta.runes, runeMul(meta.runes).toFixed(2))
    : (meta.bestLevel > 1 ? t('hub.highest', meta.bestLevel)
      : meta.best ? t('hub.record', meta.best, CFG.wallRows)
                  : t('hub.noTower'));
  renderRebirth();
  renderReset();
  renderDiary();
  renderRegistroBtn();
  renderOggi();

  /* Alla prima partita servono le regole; dopo serve il risultato.
     Non hanno senso insieme: si scambiano il posto. */
  /* Alla prima partita serve la storia; dopo serve il risultato.
     Non hanno senso insieme: si scambiano il posto. */
  const played = !!meta.lastOutcome;
  $('hubStory').classList.toggle('hidden', played);
  $('hubHint').classList.toggle('hidden', played);
  $('lastRun').classList.toggle('hidden', !played);
  if (played) {
    $('lrDepth').textContent = meta.last + '/' + CFG.wallRows;
    $('lrCoins').textContent = '+' + fmt(meta.lastCoins);
    $('lrBadge').classList.toggle('hidden', !meta.lastRecord);
    const out = OUTCOME_TEXT[meta.lastOutcome] || {};
    $('lrOut').textContent = out.key ? t(out.key) : '';
    $('lrOut').style.color = out.color || '#fff';
  }

  for (const key of Object.keys(UPGRADES)) {
    const { u, lvl, maxed, cost, afford } = upgradeInfo(key);   // lvl: per l'arma, quella iniziale
    const card = document.querySelector('.up-card[data-key="' + key + '"]');
    card.querySelector('.up-name').textContent  = t(u.key);
    card.querySelector('.up-level').textContent = t('up.level', lvl);
    card.querySelector('.up-value').textContent = upgradeValueText(key);
    /* quello che si compra: il valore dopo, piccolo sotto quello di adesso */
    card.querySelector('.up-next').textContent = maxed ? '' : key === 'weapon'
      ? '→ ' + weaponName(lvl + 1) : '→ ×' + u.value(lvl + 1).toFixed(2);
    if (key === 'weapon') card.querySelector('.up-ico').className = 'ic up-ico ic-arma' + lvl;
    card.querySelector('.up-cost span').textContent = maxed ? t('up.max') : fmt(cost);
    card.classList.toggle('locked', maxed || !afford);
    card.disabled = maxed || !afford;
  }
  renderBadge();

  /* per ultimo: la camera si punta sulla fascia libera, che dipende da
     tutto quello che il menù ha appena deciso di mostrare */
  renderSkins();                      // anche a scheda chiusa: il nome e i prezzi restano giusti
  if (schedaAperta === 'bottega') renderBottega();
  renderLangs();
  if (typeof aimMenuCamera === 'function') aimMenuCamera();
}

document.querySelectorAll('.up-card').forEach(card => {
  card.addEventListener('click', () => buyUpgrade(card.dataset.key));
});
$('rebirthCard').addEventListener('click', () => apriScheda('schRinascita'));
$('rbVai').addEventListener('click', tapRebirth);
document.querySelectorAll('.nav-b').forEach(b => b.addEventListener('click', () => apriScheda(b.dataset.scheda)));
document.querySelectorAll('[data-chiudi]').forEach(b => b.addEventListener('click', chiudiSchede));
$('resetBtn').addEventListener('click', tapReset);
$('svCopia').addEventListener('click', copiaCodice);
$('svIncolla').addEventListener('click', preparaIncolla);
$('svCarica').addEventListener('click', caricaCodice);

/* cinque tocchi sulla marca della build accendono il contatore dei
   fotogrammi: serve a capire su quale telefono il gioco arranca */
let tocchiBuild = 0, tocchiTimer = 0;
$('buildTag').addEventListener('click', () => {
  tocchiBuild++;
  clearTimeout(tocchiTimer);
  tocchiTimer = setTimeout(() => { tocchiBuild = 0; }, 2500);
  if (tocchiBuild >= 5) { tocchiBuild = 0; $('fps').classList.toggle('hidden'); }
});
$('runePill').addEventListener('click', apriBottega);
$('buildTag').textContent = 'BUILD ' + (window.BUILD || 'dev');

/* il bottone in fondo: le imprese quando ci sono, il salvataggio sempre */
function renderRegistroBtn() {
  $('registroTesto').textContent = typeof impreseTesto === 'function'
    ? impreseTesto() : t('sv.bottone');
}

/* le bandierine: quella attiva si accende, l'altra cambia lingua */
function renderLangs() {
  document.querySelectorAll('.lang-btn').forEach(b =>
    b.classList.toggle('on', b.dataset.lang === lang));
}
document.querySelectorAll('.lang-btn').forEach(b => {
  b.addEventListener('click', () => { setLang(b.dataset.lang); renderLangs(); });
});

/* Come si racconta la fine dell'ultima corsa */
const OUTCOME_TEXT = {
  wall: { key: 'run.stopped', color: '#ff9d8a' },
  boss: { key: 'run.beaten',  color: '#ff9d8a' },
  win : { key: 'run.freed',   color: '#ffd24b' }
};

/* ------------------------------- ASPETTO -------------------------------
   La fila di pastiglie sotto ai potenziamenti. Sono colori, non nomi: cinque
   nomi in fila non si leggono su un telefono, cinque macchie di colore sì.
   Il nome — e il prezzo, se è chiuso — sta nella riga sotto, una alla volta.

   Comprare chiede due tocchi come la rinascita e il ricomincia: i diamanti
   sono pochi e un pollice sbaglia. Il primo tocco su un aspetto chiuso ne
   mostra il prezzo, il secondo paga. */
let skinArmed = -1;
let skinHook = null;      // lo riempie game.js: deve ricostruire l'eroe

const esa = n => '#' + n.toString(16).padStart(6, '0');

function renderSkins() {
  const row = $('skRow');
  row.innerHTML = '';
  SKINS.forEach((s, i) => {
    const mio = skinOwned(i);
    const b = document.createElement('button');
    b.className = 'sk' + (i === meta.skin ? ' on' : '') +
                  (mio ? '' : ' locked') + (skinArmed === i ? ' armed' : '');
    /* il ritratto fotografato (icone.js); sotto, il prezzo se è chiuso */
    b.innerHTML = '<i class="ic ic-eroe' + i + '"></i><em>' +
                  (mio ? (i === meta.skin ? '✓' : '') : '💎' + s.gems) + '</em>';
    b.addEventListener('click', () => tapSkin(i));
    row.appendChild(b);
  });
  renderArsenale();

  const mostrata = skinArmed >= 0 ? skinArmed : meta.skin;
  $('eroeRitratto').className = 'ic ic-eroe' + mostrata;
  const s = SKINS[mostrata];
  $('skName').textContent = skinOwned(mostrata)
    ? t(s.key)
    : t('sk.price', t(s.key), s.gems);
  $('skName').classList.toggle('armed', skinArmed >= 0);
}

function tapSkin(i) {
  if (skinOwned(i)) {                     // già tuo: si indossa e basta
    skinArmed = -1;
    if (meta.skin !== i) {
      meta.skin = i;
      writeSave(meta);
      if (skinHook) skinHook();
    }
    renderSkins();
    return;
  }
  if (skinArmed !== i) { skinArmed = i; renderSkins(); return; }   // primo tocco: il prezzo

  const s = SKINS[i];
  if (meta.gems < s.gems) { flashBanner(t('sk.need', s.gems - meta.gems), 'bad'); return; }
  meta.gems -= s.gems;
  meta.skins = (meta.skins || []).concat(i);
  meta.skin = i;
  skinArmed = -1;
  writeSave(meta);
  if (skinHook) skinHook();
  flashBanner(t('sk.bought', t(s.key)), 'good');
  renderHub();
}

/* l'arsenale: le sei armi, quelle già tue accese, quella in mano evidenziata */
function renderArsenale() {
  $('arsenale').innerHTML = WEAPONS.map((W, i) =>
    '<div class="ars' + (i > armaIniziale() ? ' no' : '') + (i === armaIniziale() ? ' su' : '') +
    '" title="' + weaponName(i) + '"><i class="ic ic-arma' + i + '"></i></div>').join('');
}

/* --------------------------- COLONNA BONUS ---------------------------- */
/* I bonus raccolti nella partita in corso, impilati a sinistra. */
function renderBuffRail(buffs) {
  const rail = $('buffRail');
  rail.innerHTML = '';
  for (const key of Object.keys(BUFFS)) {
    const stacks = buffs[key];
    if (!stacks) continue;
    const b = BUFFS[key];
    const el = document.createElement('div');
    el.className = 'buff';
    el.style.borderColor = b.color;
    el.innerHTML = '<span class="buff-icon">' + b.icon + '</span>' +
                   '<span class="buff-name">' + t(b.key) + '</span>' +
                   '<b style="color:' + b.color + '">+' +
                   Math.round(stacks * b.step * 100) + '%</b>';
    rail.appendChild(el);
  }
}

/* La targa dei momenti che contano. `tono` è 'good', 'bad' o niente: il
   colore dice com'è andata prima ancora che si legga la scritta. */
let bannerTimer = 0;
function flashBanner(text, tono) {
  const el = $('banner');
  el.querySelector('b').textContent = text;
  el.className = tono || '';
  void el.offsetWidth;               // forza il riavvio dell'animazione
  el.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.remove('show'), 1700);
}

/* ------------------------------ REAZIONI -------------------------------
   Una classe CSS che si riaccende: l'animazione sta nel foglio di stile,
   qui si decide solo quando. Toglierla e rimetterla con un reflow in mezzo
   è il modo di far ripartire un'animazione che sta ancora girando. */
function pulsa(id, classe) {
  const el = typeof id === 'string' ? $(id) : id;
  if (!el) return;
  el.classList.remove('su', 'giu', 'bump', 'compra');
  void el.offsetWidth;
  el.classList.add(classe);
}

/* La moneta raccolta vola al portafoglio in alto. Costa una div e
   un'animazione del browser — niente 3D — e insegna senza parole dove va
   a finire quello che si raccoglie. Mai più di quattordici in volo: su una
   fila di monete fitte diventerebbe uno sciame che copre la corsia. */
let inVolo = 0;
function volaAlPortafoglio(punto, icona) {
  if (inVolo >= 14 || !punto) return;
  const r = $('coinPill').getBoundingClientRect();
  const x0 = punto.x / 100 * innerWidth, y0 = punto.y / 100 * innerHeight;
  const x1 = r.left + r.width / 2, y1 = r.top + r.height / 2;
  const mx = (x0 + x1) / 2 + (Math.random() * 120 - 60), my = Math.min(y0, y1) - 30;
  const d = document.createElement('div');
  if (!icona && document.body.classList.contains('icone-ok')) d.className = 'vola ic ic-moneta';
  else { d.className = 'vola'; d.textContent = icona || '🪙'; }
  $('pops').appendChild(d);
  inVolo++;
  const pos = (x, y, s) => 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) scale(' + s + ')';
  const fine = () => { d.remove(); inVolo--; pulsa('coinPill', 'bump'); };
  if (!d.animate) { fine(); return; }
  const a = d.animate([
    { transform: pos(x0, y0, 0.5), opacity: 0 },
    { transform: pos(mx, my, 1.25), opacity: 1, offset: 0.38 },
    { transform: pos(x1, y1, 0.65), opacity: 1 }
  ], { duration: 520 + Math.random() * 180, easing: 'cubic-bezier(.5,0,.3,1)' });
  a.onfinish = fine;
}

/* una moneta da un punto a un altro dello schermo (in pixel): l'acquisto */
function volaVerso(da, a) {
  const d = document.createElement('div');
  d.className = document.body.classList.contains('icone-ok') ? 'vola ic ic-moneta' : 'vola';
  if (!document.body.classList.contains('icone-ok')) d.textContent = '🪙';
  $('pops').appendChild(d);
  const pos = (x, y, s) => 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) scale(' + s + ')';
  const mx = (da.x + a.x) / 2 + (Math.random() * 80 - 40), my = Math.min(da.y, a.y) - 40;
  if (!d.animate) { d.remove(); return; }
  d.animate([
    { transform: pos(da.x, da.y, 0.6), opacity: 0 },
    { transform: pos(mx, my, 1.15), opacity: 1, offset: 0.4 },
    { transform: pos(a.x, a.y, 0.5), opacity: 0.2 }
  ], { duration: 480, easing: 'cubic-bezier(.5,0,.3,1)' }).onfinish = () => d.remove();
}

/* ------------------------------ POPUP ---------------------------------
   Il numero parte dal punto colpito, non dal centro dello schermo: chi
   gioca guarda la corsia, non il centro, e un numero che nasce dove è
   appena esploso qualcosa si legge senza spostare gli occhi. Senza punto
   (la vittoria, un messaggio generico) torna in mezzo. */
function popup(text, color, punto) {
  const d = document.createElement('div');
  d.className = 'pop';
  d.textContent = text;
  d.style.color = color;
  d.style.left = (punto ? punto.x : 50) + '%';
  d.style.top  = (punto ? punto.y : 48) + '%';
  $('pops').appendChild(d);
  setTimeout(() => d.remove(), 900);
}
