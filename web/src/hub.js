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
  $('hud').classList.toggle('hidden', name !== null);
  /* la camera del menù si punta sulla fascia lasciata libera dal menù
     stesso, quindi va rifatto ogni volta che il menù compare */
  if (name === 'hub' && typeof aimMenuCamera === 'function') aimMenuCamera();
}

/* --------------------------- POTENZIAMENTI --------------------------- */
function upgradeInfo(key) {
  const u = UPGRADES[key];
  const lvl = meta.up[key];
  const maxed = lvl >= u.max;
  const cost = maxed ? Infinity : upgradeCost(key, lvl);
  return { u, lvl, maxed, cost, afford: meta.coins >= cost };
}

/* Come si legge il valore di un potenziamento nel menù.
   POTENZA e ORO sono moltiplicatori: si leggono ×1.10, ×1.21, ×1.33… */
function upgradeValueText(key) {
  const lvl = meta.up[key];
  if (key === 'weapon') return weaponName(lvl);
  return '×' + UPGRADES[key].value(lvl).toFixed(2);
}

function buyUpgrade(key) {
  const { maxed, cost, afford } = upgradeInfo(key);
  if (maxed || !afford) return;
  meta.coins -= cost;
  meta.up[key]++;
  writeSave(meta);
  renderHub();
}

/* ------------------------------ RENDER -------------------------------- */
function renderWallet() {
  $('hubCoins').textContent = fmt(meta.coins);
  $('hubGems').textContent  = fmt(meta.gems);
  $('hubRunes').textContent = fmt(meta.runes);
  $('runePill').classList.toggle('hidden', meta.runes === 0);
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
  $('rbBonus').textContent = '×' + runeMul(meta.runes + gain).toFixed(2);
  card.classList.toggle('ready', meta.lastOutcome === 'win');
  card.classList.toggle('armed', rebirthArmed);
  $('rbNote').textContent = t(rebirthArmed ? 'rb.confirm' : 'rb.note');
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
  meta.coins = 0;
  meta.up = { power: 0, weapon: 0, income: 0 };
  meta.level = 1;
  meta.best = 0; meta.last = 0; meta.lastCoins = 0;
  meta.lastRecord = false; meta.lastOutcome = '';
  meta.diary = []; meta.tries = 0; meta.towerRevived = 0;   // nuova salita, diario nuovo
  rebirthArmed = false;
  writeSave(meta);
  flashBanner(t('rb.done', gain));
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
    const { u, lvl, maxed, cost, afford } = upgradeInfo(key);
    const card = document.querySelector('.up-card[data-key="' + key + '"]');
    card.querySelector('.up-name').textContent  = t(u.key);
    card.querySelector('.up-level').textContent = t('up.level', lvl);
    card.querySelector('.up-value').textContent = upgradeValueText(key);
    card.querySelector('.up-cost').textContent  = maxed ? t('up.max') : fmt(cost);
    card.classList.toggle('locked', maxed || !afford);
    card.disabled = maxed || !afford;
  }

  /* per ultimo: la camera si punta sulla fascia libera, che dipende da
     tutto quello che il menù ha appena deciso di mostrare */
  renderSkins();
  renderLangs();
  if (typeof aimMenuCamera === 'function') aimMenuCamera();
}

document.querySelectorAll('.up-card').forEach(card => {
  card.addEventListener('click', () => buyUpgrade(card.dataset.key));
});
$('rebirthCard').addEventListener('click', tapRebirth);
$('resetBtn').addEventListener('click', tapReset);
$('buildTag').textContent = 'BUILD ' + (window.BUILD || 'dev');

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
    b.style.background = 'linear-gradient(135deg,' + esa(s.cloth) + ' 52%,' +
                         esa(s.metal) + ' 52%)';
    if (!mio) b.innerHTML = '<i>🔒</i>';
    b.addEventListener('click', () => tapSkin(i));
    row.appendChild(b);
  });

  const mostrata = skinArmed >= 0 ? skinArmed : meta.skin;
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
  if (meta.gems < s.gems) { flashBanner(t('sk.need', s.gems - meta.gems)); return; }
  meta.gems -= s.gems;
  meta.skins = (meta.skins || []).concat(i);
  meta.skin = i;
  skinArmed = -1;
  writeSave(meta);
  if (skinHook) skinHook();
  flashBanner(t('sk.bought', t(s.key)));
  renderHub();
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

/* Striscione a tutto schermo per i momenti che contano (record superato) */
let bannerTimer = 0;
function flashBanner(text) {
  const el = $('banner');
  el.textContent = text;
  el.classList.remove('show');
  void el.offsetWidth;               // forza il riavvio dell'animazione
  el.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.remove('show'), 1700);
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
