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
const exportBtn =
