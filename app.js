/* ---------- STATE ---------- */
let trips = JSON.parse(localStorage.getItem('trips_v1') || '[]');
let currentTripId = localStorage.getItem('current_trip_id') || null;
let currentFilter = { cat: 'all', search: '' };
let curLoc = { city: "Трасса", lat: null, lon: null };
let fxRates = JSON.parse(localStorage.getItem('fx_rates') || 'null');
let pieChart, barChart;

/* ---------- DOM ---------- */
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const tripSelectorBtn = document.getElementById('tripSelectorBtn');
const tripSelectorLabel = document.getElementById('tripSelectorLabel');
const tripDropdown = document.getElementById('tripDropdown');
const newTripBtn = document.getElementById('newTripBtn');
const newTripModal = document.getElementById('newTripModal');
const closeNewTrip = document.getElementById('closeNewTrip');
const newTripName = document.getElementById('newTripName');
const newTripDate = document.getElementById('newTripDate');
const createTripBtn = document.getElementById('createTripBtn');

const tripTitle = document.getElementById('tripTitle');
const totalAmount = document.getElementById('totalAmount');
const geo = document.getElementById('geo');
const fuelPercent = document.getElementById('fuelPercent');
const hotelPercent = document.getElementById('hotelPercent');
const foodPercent = document.getElementById('foodPercent');
const fuelAmount = document.getElementById('fuelAmount');
const hotelAmount = document.getElementById('hotelAmount');
const foodAmount = document.getElementById('foodAmount');
const micBtn = document.getElementById('micBtn');
const searchInput = document.getElementById('searchInput');
const historyEl = document.getElementById('history');
const historyCount = document.getElementById('historyCount');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const pieChartEl = document.getElementById('pieChart');
const barChartEl = document.getElementById('barChart');

/* ---------- THEME ---------- */
function applyTheme(t) {
  document.documentElement.classList.toggle('dark', t === 'dark');
  localStorage.setItem('theme', t);
  themeIcon.setAttribute('data-lucide', t === 'dark' ? 'sun' : 'moon');
  lucide.createIcons();
}
applyTheme(localStorage.getItem('theme') || 'dark');
themeToggle.onclick = () => {
  const t = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
  applyTheme(t);
};

/* ---------- GPS ---------- */
function initGps() {
  if (!navigator.geolocation) return;
  navigator.geolocation.watchPosition(async pos => {
    curLoc.lat = pos.coords.latitude;
    curLoc.lon = pos.coords.longitude;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${curLoc.lat}&lon=${curLoc.lon}&accept-language=ru`);
      const d = await r.json();
      curLoc.city = d.address.city || d.address.town || d.address.village || "Трасса";
      geo.textContent = "📍 " + curLoc.city.toUpperCase();
    } catch {
      geo.textContent = "📍 В ПУТИ";
    }
  }, () => geo.textContent = "📍 ОШИБКА GPS");
}

/* ---------- CURRENCY ---------- */
async function loadRates() {
  const now = Date.now();
  if (fxRates && now - fxRates.timestamp < 3600000) return;
  try {
    const r = await fetch("https://api.exchangerate.host/latest?base=EUR&symbols=EUR,TRY,USD,GBP,PLN,CZK,HUF,RON,GEL");
    const d = await r.json();
    fxRates = { rates: d.rates, timestamp: now };
    localStorage.setItem('fx_rates', JSON.stringify(fxRates));
  } catch {}
}
function detectCurrency(text) {
  if (text.includes('лир') || text.includes('турец')) return 'TRY';
  if (text.includes('доллар')) return 'USD';
  if (text.includes('фунт')) return 'GBP';
  if (text.includes('злот')) return 'PLN';
  if (text.includes('крон')) return 'CZK';
  if (text.includes('форинт')) return 'HUF';
  if (text.includes('лей') || text.includes('леев') || text.includes('лея')) return 'RON';
  if (text.includes('лари')) return 'GEL';
  return 'EUR';
}
async function convertToEur(amount, cur) {
  if (cur === 'EUR') return amount;
  await loadRates();
  const rate = fxRates?.rates?.[cur];
  return rate ? amount / rate : amount;
}

/* ---------- TRIPS ---------- */
function saveTrips() {
  localStorage.setItem('trips_v1', JSON.stringify(trips));
  if (currentTripId) localStorage.setItem('current_trip_id', currentTripId);
}
function ensureDefaultTrip() {
  if (!trips.length) {
    const today = new Date().toISOString().slice(0,10);
    const t = { id: crypto.randomUUID(), name: "Путь к мечте", startDate: today, log: [] };
    trips.push(t);
    currentTripId = t.id;
    saveTrips();
  }
  if (!currentTripId || !trips.find(t => t.id === currentTripId)) {
    currentTripId = trips[0].id;
    saveTrips();
  }
}
function getCurrentTrip() {
  return trips.find(t => t.id === currentTripId) || null;
}

/* ---------- TRIP UI ---------- */
function formatDateLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric' });
}
function renderTripDropdown() {
  tripDropdown.innerHTML = '';
  trips.forEach(t => {
    const sum = t.log.reduce((s,i)=>s+i.eur,0);
    const btn = document.createElement('button');
    btn.className = "w-full text-left px-3 py-2 rounded-2xl hover:bg-slate-900/40 text-xs";
    btn.textContent = `${t.name} — ${sum.toFixed(2)}€ (${formatDateLabel(t.startDate)})`;
    btn.onclick = () => {
      currentTripId = t.id;
      saveTrips();
      tripDropdown.classList.add('hidden');
      renderAll();
    };
    tripDropdown.appendChild(btn);
  });
  const addBtn = document.createElement('button');
  addBtn.className = "w-full text-left px-3 py-2 rounded-2xl hover:bg-slate-900/40 text-xs text-cyan-400";
  addBtn.textContent = "+ Создать новую поездку";
  addBtn.onclick = () => {
    tripDropdown.classList.add('hidden');
    openNewTripModal();
  };
  tripDropdown.appendChild(addBtn);
}
tripSelectorBtn.onclick = () => {
  if (tripDropdown.classList.contains('hidden')) {
    renderTripDropdown();
    tripDropdown.classList.remove('hidden');
  } else {
    tripDropdown.classList.add('hidden');
  }
};
document.addEventListener('click', e => {
  if (!tripSelectorBtn.contains(e.target) && !tripDropdown.contains(e.target)) {
    tripDropdown.classList.add('hidden');
  }
});

/* ---------- NEW TRIP MODAL ---------- */
function openNewTripModal() {
  newTripName.value = '';
  newTripDate.value = new Date().toISOString().slice(0,10);
  newTripModal.classList.remove('hidden');
}
function closeNewTripModal() {
  newTripModal.classList.add('hidden');
}
newTripBtn.onclick = openNewTripModal;
closeNewTrip.onclick =
