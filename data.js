const RATE_HOUSE = 0.35;
const RATE_APARTMENT = 0.30;
const TRAVEL_FEE = 25;
const WAIVE_AT = 1000;

/* Cities typically within ~30 minutes of downtown Dallas. */
const CITIES = [
  { name: "Dallas", mins: 0, lat: 32.7767, lng: -96.7970 },
  { name: "Highland Park", mins: 10, lat: 32.8335, lng: -96.7919 },
  { name: "University Park", mins: 12, lat: 32.8501, lng: -96.8003 },
  { name: "Cockrell Hill", mins: 12, lat: 32.7360, lng: -96.8869 },
  { name: "Irving", mins: 16, lat: 32.8140, lng: -96.9489 },
  { name: "Addison", mins: 18, lat: 32.9618, lng: -96.8292 },
  { name: "Farmers Branch", mins: 18, lat: 32.9265, lng: -96.8961 },
  { name: "Hutchins", mins: 18, lat: 32.6493, lng: -96.7131 },
  { name: "Grand Prairie", mins: 20, lat: 32.7460, lng: -96.9978 },
  { name: "Mesquite", mins: 20, lat: 32.7668, lng: -96.5992 },
  { name: "Duncanville", mins: 20, lat: 32.6518, lng: -96.9083 },
  { name: "Balch Springs", mins: 20, lat: 32.7287, lng: -96.6228 },
  { name: "Richardson", mins: 22, lat: 32.9483, lng: -96.7299 },
  { name: "Garland", mins: 22, lat: 32.9126, lng: -96.6389 },
  { name: "DeSoto", mins: 22, lat: 32.5899, lng: -96.8570 },
  { name: "Lancaster", mins: 22, lat: 32.5921, lng: -96.7561 },
  { name: "Sunnyvale", mins: 22, lat: 32.7965, lng: -96.5608 },
  { name: "Wilmer", mins: 22, lat: 32.5890, lng: -96.6853 },
  { name: "Cedar Hill", mins: 25, lat: 32.5885, lng: -96.9561 },
  { name: "Carrollton", mins: 25, lat: 32.9756, lng: -96.8899 },
  { name: "Coppell", mins: 25, lat: 32.9546, lng: -97.0150 },
  { name: "Rowlett", mins: 28, lat: 32.9028, lng: -96.5639 },
  { name: "Seagoville", mins: 28, lat: 32.6396, lng: -96.5383 },
  { name: "Arlington", mins: 28, lat: 32.7357, lng: -97.1081 },
  { name: "Plano", mins: 28, lat: 33.0198, lng: -96.6989 },
  { name: "Euless", mins: 28, lat: 32.8371, lng: -97.0820 },
  { name: "Grapevine", mins: 30, lat: 32.9343, lng: -97.0781 },
  { name: "Lewisville", mins: 30, lat: 33.0462, lng: -96.9942 }
];

const BOUNDS = { south: 32.52, north: 33.10, west: -97.18, east: -96.50 };

const ROADS = [
  { name: "I-30", pts: [[32.75,-97.16],[32.76,-97.05],[32.78,-96.90],[32.79,-96.80],[32.79,-96.70],[32.78,-96.55]] },
  { name: "I-35E", pts: [[32.55,-96.82],[32.65,-96.81],[32.78,-96.81],[32.90,-96.81],[33.05,-96.90]] },
  { name: "I-20", pts: [[32.68,-97.16],[32.68,-97.02],[32.68,-96.87],[32.70,-96.73],[32.71,-96.55]] },
  { name: "I-635", pts: [[32.92,-97.05],[32.93,-96.92],[32.92,-96.80],[32.90,-96.68],[32.86,-96.58]] },
  { name: "US-75", pts: [[32.80,-96.79],[32.88,-96.77],[32.96,-96.74],[33.05,-96.70]] }
];

function isDallas(city) {
  return String(city || "").trim().toLowerCase() === "dallas";
}

function rateFor(kind) {
  return kind === "apartment" ? RATE_APARTMENT : RATE_HOUSE;
}

function priceFor(doors, city, kind) {
  const qty = Math.max(0, Math.floor(Number(doors) || 0));
  const rate = rateFor(kind);
  const dist = qty * rate;
  const travel = isDallas(city) || qty >= WAIVE_AT ? 0 : TRAVEL_FEE;
  return { qty, rate, kind: kind === "apartment" ? "apartment" : "house", dist, travel, total: dist + travel, city: city || "" };
}

function money(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function uid() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

function saveJob(job) {
  localStorage.setItem("noskotx-job", JSON.stringify(job));
}

function loadJob() {
  try { return JSON.parse(localStorage.getItem("noskotx-job") || "null"); }
  catch { return null; }
}

function encodeJob(job) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(job))));
}

function decodeJob(hash) {
  try { return JSON.parse(decodeURIComponent(escape(atob(hash)))); }
  catch { return null; }
}

function project(lat, lng, w, h) {
  const x = (lng - BOUNDS.west) / (BOUNDS.east - BOUNDS.west) * w;
  const y = (BOUNDS.north - lat) / (BOUNDS.north - BOUNDS.south) * h;
  return [x, y];
}

function unproject(x, y, w, h) {
  const lng = BOUNDS.west + (x / w) * (BOUNDS.east - BOUNDS.west);
  const lat = BOUNDS.north - (y / h) * (BOUNDS.north - BOUNDS.south);
  return [lat, lng];
}

function priceMix(houses, apts, city) {
  const h = Math.max(0, parseInt(houses, 10) || 0);
  const a = Math.max(0, parseInt(apts, 10) || 0);
  const doors = h + a;
  const travel = (!isDallas(city) && doors < WAIVE_AT) ? TRAVEL_FEE : 0;
  return {
    houses: h,
    apts: a,
    doors: doors,
    travel: travel,
    total: h * RATE_HOUSE + a * RATE_APARTMENT + travel,
    city: city
  };
}
