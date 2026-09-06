/* =====================================================================
   HUB — menù iniziale, portafoglio, potenziamenti permanenti, schermate
   ===================================================================== */

const meta = loadSave();

const $ = id => document.getElementById(id);

/* ---------------------------- SCHERMATE ------------------------------ */
/* Una sola alla volta è visibile; il mondo 3D resta sempre sotto. */
const SCREENS = ['hub', 'result'];
function showScreen(name) {
  SCREENS.forEach(s => $(s).classList.toggle('hidden', s !== name));
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

/* Come si legge il valore di un potenziamento nel menù */
function upgradeValueText(key) {
  const lvl = meta.up[key];
  if (key === 'weapon') return WEAPONS[lvl].name;
  if (key === 'income') return '×' + UPGRADES.income.value(lvl).toFixed(2);
  return String(UPGRADES.power.value(lvl));
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
}

function renderHub() {
  renderWallet();
  $('hubLevel').textContent = 'LIVELLO ' + meta.level;
  $('hubBest').textContent  = meta.best ? 'RECORD ' + meta.best + ' BLOCCHI' : 'NESSUN RECORD';

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
