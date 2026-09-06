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
  if (key === 'weapon') return WEAPONS[lvl].name;
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
let rebirthHook = null;      // lo riempie game.js: deve ricostruire il mondo
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
  $('rbNote').textContent = rebirthArmed
    ? 'TOCCA ANCORA PER CONFERMARE'
    : 'Riparti dalla Torre 1 · potenziamenti azzerati';
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
  rebirthArmed = false;
  writeSave(meta);
  flashBanner('+' + gain + ' RUNE');
  if (rebirthHook) rebirthHook();
  renderHub();
}

function renderHub() {
  renderWallet();
  $('hubLevel').textContent = 'TORRE ' + meta.level;
  $('hubZone').textContent  = themeFor(meta.level).name;
  /* Una riga sola sotto al titolo, in ordine di importanza: le rune se
     ci sono, altrimenti quanto lontano sei arrivato. */
  $('hubBest').textContent = meta.runes
    ? meta.runes + ' RUNE · ×' + runeMul(meta.runes).toFixed(2) + ' POTENZA E ORO'
    : (meta.bestLevel > 1 ? 'TORRE PIÙ ALTA: ' + meta.bestLevel
      : meta.best ? 'RECORD ' + meta.best + '/' + CFG.wallRows + ' DEL MURO'
                  : 'NESSUNA TORRE ANCORA CONQUISTATA');
  renderRebirth();

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
    $('lrOut').textContent = out.text || '';
    $('lrOut').style.color = out.color || '#fff';
  }

  for (const key of Object.keys(UPGRADES)) {
    const { u, lvl, maxed, cost, afford } = upgradeInfo(key);
    const card = document.querySelector('.up-card[data-key="' + key + '"]');
    card.querySelector('.up-name').textContent  = u.name;
    card.querySelector('.up-level').textContent = 'Livello ' + lvl;
    card.querySelector('.up-value').textContent = upgradeValueText(key);
    card.querySelector('.up-cost').textContent  = maxed ? 'MAX' : fmt(cost);
    card.classList.toggle('locked', maxed || !afford);
    card.disabled = maxed || !afford;
  }
}

document.querySelectorAll('.up-card').forEach(card => {
  card.addEventListener('click', () => buyUpgrade(card.dataset.key));
});
$('rebirthCard').addEventListener('click', tapRebirth);

/* Come si racconta la fine dell'ultima corsa */
const OUTCOME_TEXT = {
  wall: { text: 'FERMATO DAL MURO',      color: '#ff9d8a' },
  boss: { text: 'SCONFITTO DAL BOSS',    color: '#ff9d8a' },
  win : { text: 'PRINCIPESSA LIBERATA',  color: '#ffd24b' }
};

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
                   '<span class="buff-name">' + b.name + '</span>' +
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

/* ------------------------------ POPUP --------------------------------- */
function popup(text, color, side) {
  const d = document.createElement('div');
  d.className = 'pop';
  d.textContent = text;
  d.style.color = color;
  d.style.left = (side === undefined ? 50 : side) + '%';
  $('pops').appendChild(d);
  setTimeout(() => d.remove(), 900);
}
