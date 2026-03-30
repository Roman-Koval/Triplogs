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
closeNewTrip.onclick = closeNewTripModal;
createTripBtn.onclick = () => {
  const name = newTripName.value.trim() || "Новая поездка";
  const date = newTripDate.value || new Date().toISOString().slice(0,10);
  const t = { id: crypto.randomUUID(), name, startDate: date, log: [] };
  trips.push(t);
  currentTripId = t.id;
  saveTrips();
  closeNewTripModal();
  renderAll();
};

/* ---------- FILTERS ---------- */
document.querySelectorAll('.catBtn').forEach(btn => {
  btn.onclick = () => {
    currentFilter.cat = btn.dataset.cat;
    document.querySelectorAll('.catBtn').forEach(b => {
      b.classList.toggle('bg-slate-800', b === btn);
      b.classList.toggle('text-slate-100', b === btn);
      b.classList.toggle('bg-slate-900', b !== btn);
      b.classList.toggle('text-slate-400', b !== btn);
    });
    renderAll();
  };
});
searchInput.oninput = e => {
  currentFilter.search = e.target.value.toLowerCase();
  renderAll();
};

/* ---------- CHARTS ---------- */
function updateCharts(log) {
  const sums = { fuel:0, hotel:0, food:0 };
  log.forEach(i => sums[i.cat] += i.eur);
  const labels = ["Топливо","Жильё","Питание"];
  const data = [sums.fuel, sums.hotel, sums.food];

  if (!pieChart) {
    pieChart = new Chart(pieChartEl, {
      type:'pie',
      data:{ labels, datasets:[{ data, backgroundColor:["#ef4444","#3b82f6","#22c55e"] }] },
      options:{ plugins:{ legend:{ position:'bottom', labels:{ boxWidth:10 } } } }
    });
  } else {
    pieChart.data.datasets[0].data = data;
    pieChart.update();
  }

  if (!barChart) {
    barChart = new Chart(barChartEl, {
      type:'bar',
      data:{ labels, datasets:[{ data, backgroundColor:["#ef4444","#3b82f6","#22c55e"] }] },
      options:{ scales:{ y:{ beginAtZero:true } } }
    });
  } else {
    barChart.data.datasets[0].data = data;
    barChart.update();
  }

  const total = data.reduce((a,b)=>a+b,0) || 1;
  fuelPercent.textContent = Math.round(data[0]/total*100) + "%";
  hotelPercent.textContent = Math.round(data[1]/total*100) + "%";
  foodPercent.textContent = Math.round(data[2]/total*100) + "%";

  fuelAmount.textContent = sums.fuel.toFixed(2).replace('.',',') + " €";
  hotelAmount.textContent = sums.hotel.toFixed(2).replace('.',',') + " €";
  foodAmount.textContent = sums.food.toFixed(2).replace('.',',') + " €";
}

/* ---------- RENDER ---------- */
function getFilteredLog(trip) {
  return trip.log.filter(i =>
    (currentFilter.cat === 'all' || i.cat === currentFilter.cat) &&
    (!currentFilter.search ||
      i.name.toLowerCase().includes(currentFilter.search) ||
      i.city.toLowerCase().includes(currentFilter.search))
  );
}
function renderAll() {
  const trip = getCurrentTrip();
  if (!trip) return;

  tripTitle.textContent = trip.name;
  tripSelectorLabel.textContent = trip.name;

  const items = getFilteredLog(trip);
  let sum = 0;
  historyEl.innerHTML = items.map(i => {
    sum += i.eur;
    const icon = i.cat === 'fuel' ? '⛽' : i.cat === 'hotel' ? '🏨' : '🍕';
    const mapAttr = i.lat ? `onclick="window.open('https://maps.google.com/?q=${i.lat},${i.lon}')"` : "";
    return `
      <div ${mapAttr} class="glass p-4 rounded-2xl flex items-center gap-4 cursor-pointer active:scale-[0.99] transition">
        <div class="text-2xl">${icon}</div>
        <div class="flex-1">
          <div class="flex justify-between">
            <span class="font-bold text-sm">${i.name}</span>
            <span class="text-cyan-400 font-mono font-bold">${i.eur.toFixed(2)}€</span>
          </div>
          <div class="flex justify-between text-[9px] text-slate-500 mt-1 font-bold">
            <span>${i.city}</span>
            <span>${i.date} | ${i.time}</span>
          </div>
        </div>
      </div>`;
  }).join('');
  historyCount.textContent = items.length ? `(${items.length})` : '';

  totalAmount.textContent = sum.toFixed(2).replace('.',',') + " €";
  updateCharts(trip.log);
  renderTripDropdown();
  lucide.createIcons();
}

/* ---------- SPEECH ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR) {
  const rec = new SR();
  rec.lang = 'ru-RU';
  rec.interimResults = false;

  micBtn.onclick = () => rec.start();
  rec.onstart = () => micBtn.classList.add('recording');
  rec.onend = () => micBtn.classList.remove('recording');

  rec.onresult = async e => {
    try {
      const trip = getCurrentTrip();
      if (!trip) return;

      const text = e.results[0][0].transcript.toLowerCase();
      const numMatch = text.replace(',', '.').match(/(\d+[.,]?\d*)/);
      if (!numMatch) return;
      const rawAmount = parseFloat(numMatch[1]);
      if (isNaN(rawAmount)) return;

      let cat = 'food', name = 'Питание';
      if (text.includes('отел') || text.includes('ноч')) { cat = 'hotel'; name = 'Жильё'; }
      if (text.includes('заправ') || text.includes('бенз') || text.includes('дизел')) { cat = 'fuel'; name = 'Топливо'; }

      const currency = detectCurrency(text);
      const eur = await convertToEur(rawAmount, currency);
      if (!eur || isNaN(eur)) return;

      const now = new Date();
      trip.log.unshift({
        name,
        cat,
        eur,
        city: curLoc.city || "Трасса",
        lat: curLoc.lat,
        lon: curLoc.lon,
        time: now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
        date: now.toLocaleDateString('ru-RU', {day:'numeric',month:'short'})
      });

      saveTrips();
      renderAll();
    } catch (err) {
      console.error("Ошибка обработки речи:", err);
    }
  };
} else {
  micBtn.disabled = true;
  micBtn.textContent = "Голос недоступен";
}

/* ---------- EXPORT / IMPORT ---------- */
exportBtn.onclick = () => {
  const data = { trips, currentTripId };
  const blob = new Blob([JSON.stringify(data,null,2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'trip-tracker-export.json';
  a.click();
  URL.revokeObjectURL(url);
};
importBtn.onclick = () => importFile.click();
importFile.onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (Array.isArray(data.trips)) {
        trips = data.trips;
        currentTripId = data.currentTripId || (trips[0]?.id || null);
        saveTrips();
        renderAll();
      }
    } catch (err) {
      console.error("Ошибка импорта:", err);
    }
  };
  reader.readAsText(file);
};

/* ---------- INIT ---------- */
ensureDefaultTrip();
initGps();
loadRates();
renderAll();

/* ---------- PWA ---------- */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
        }
