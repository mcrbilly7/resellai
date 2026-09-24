const RATE = 0.25;
const TRAVEL_FEE = 15;
const WAIVE_AT = 1000;
const DALLAS = [32.7767, -96.7970];

const CITIES = [
  { name: "Dallas", lat: 32.7767, lng: -96.7970, doors: 800 },
  { name: "Fort Worth", lat: 32.7555, lng: -97.3308, doors: 700 },
  { name: "Arlington", lat: 32.7357, lng: -97.1081, doors: 500 },
  { name: "Plano", lat: 33.0198, lng: -96.6989, doors: 550 },
  { name: "Irving", lat: 32.8140, lng: -96.9489, doors: 450 },
  { name: "Garland", lat: 32.9126, lng: -96.6389, doors: 400 },
  { name: "Frisco", lat: 33.1507, lng: -96.8236, doors: 500 },
  { name: "McKinney", lat: 33.1972, lng: -96.6398, doors: 400 },
  { name: "Grand Prairie", lat: 32.7460, lng: -96.9978, doors: 350 },
  { name: "Denton", lat: 33.2148, lng: -97.1331, doors: 350 },
  { name: "Mesquite", lat: 32.7668, lng: -96.5992, doors: 350 },
  { name: "Carrollton", lat: 32.9756, lng: -96.8899, doors: 300 },
  { name: "Lewisville", lat: 33.0462, lng: -96.9942, doors: 300 },
  { name: "Richardson", lat: 32.9483, lng: -96.7299, doors: 300 },
  { name: "Allen", lat: 33.1032, lng: -96.6706, doors: 280 },
  { name: "Flower Mound", lat: 33.0146, lng: -97.0970, doors: 260 },
  { name: "Mansfield", lat: 32.5632, lng: -97.1417, doors: 250 },
  { name: "Rowlett", lat: 32.9028, lng: -96.5639, doors: 220 },
  { name: "Euless", lat: 32.8371, lng: -97.0820, doors: 220 },
  { name: "Grapevine", lat: 32.9343, lng: -97.0781, doors: 200 },
  { name: "Southlake", lat: 32.9412, lng: -97.1342, doors: 180 },
  { name: "Keller", lat: 32.9349, lng: -97.2297, doors: 200 },
  { name: "The Colony", lat: 33.0807, lng: -96.8928, doors: 200 },
  { name: "Rockwall", lat: 32.9312, lng: -96.4597, doors: 200 },
  { name: "Burleson", lat: 32.5421, lng: -97.3209, doors: 200 },
  { name: "North Richland Hills", lat: 32.8343, lng: -97.2289, doors: 220 },
  { name: "Coppell", lat: 32.9546, lng: -97.0150, doors: 180 },
  { name: "University Park", lat: 32.8501, lng: -96.8003, doors: 150 },
  { name: "Highland Park", lat: 32.8335, lng: -96.7919, doors: 120 },
  { name: "Addison", lat: 32.9618, lng: -96.8292, doors: 140 },
  { name: "Waxahachie", lat: 32.3865, lng: -96.8483, doors: 180 },
  { name: "Midlothian", lat: 32.4824, lng: -96.9945, doors: 160 },
  { name: "Prosper", lat: 33.2362, lng: -96.8011, doors: 200 },
  { name: "Celina", lat: 33.3248, lng: -96.7844, doors: 160 },
  { name: "Forney", lat: 32.7482, lng: -96.4719, doors: 180 }
];

const CORRIDORS = [
  {
    id: "oak-cliff-loop",
    name: "Oak Cliff loop",
    city: "Dallas",
    doors: 600,
    path: [
      [32.7480, -96.8270], [32.7400, -96.8380], [32.7320, -96.8200],
      [32.7380, -96.8050], [32.7490, -96.8120], [32.7480, -96.8270]
    ]
  },
  {
    id: "lakewood-east",
    name: "Lakewood / East Dallas",
    city: "Dallas",
    doors: 450,
    path: [
      [32.8150, -96.7530], [32.8220, -96.7380], [32.8120, -96.7250],
      [32.8020, -96.7400], [32.8080, -96.7550], [32.8150, -96.7530]
    ]
  },
  {
    id: "plano-legacy",
    name: "Plano Legacy west",
    city: "Plano",
    doors: 500,
    path: [
      [33.0750, -96.8210], [33.0880, -96.8050], [33.0780, -96.7880],
      [33.0620, -96.7980], [33.0680, -96.8220], [33.0750, -96.8210]
    ]
  },
  {
    id: "frisco-star",
    name: "Frisco Star district",
    city: "Frisco",
    doors: 420,
    path: [
      [33.1040, -96.8310], [33.1180, -96.8180], [33.1120, -96.8000],
      [33.0960, -96.8080], [33.1000, -96.8320], [33.1040, -96.8310]
    ]
  },
  {
    id: "fw-near-south",
    name: "Fort Worth near southside",
    city: "Fort Worth",
    doors: 550,
    path: [
      [32.7250, -97.3250], [32.7180, -97.3400], [32.7080, -97.3280],
      [32.7140, -97.3120], [32.7260, -97.3140], [32.7250, -97.3250]
    ]
  },
  {
    id: "arlington-parks",
    name: "Arlington parks corridor",
    city: "Arlington",
    doors: 400,
    path: [
      [32.7350, -97.0820], [32.7480, -97.0700], [32.7400, -97.0520],
      [32.7220, -97.0580], [32.7260, -97.0840], [32.7350, -97.0820]
    ]
  },
  {
    id: "irving-las-colinas",
    name: "Las Colinas edge",
    city: "Irving",
    doors: 380,
    path: [
      [32.8680, -96.9380], [32.8780, -96.9220], [32.8660, -96.9100],
      [32.8540, -96.9240], [32.8600, -96.9400], [32.8680, -96.9380]
    ]
  },
  {
    id: "mckinney-historic",
    name: "McKinney historic + new north",
    city: "McKinney",
    doors: 360,
    path: [
      [33.1970, -96.6390], [33.2100, -96.6250], [33.2020, -96.6100],
      [33.1860, -96.6200], [33.1900, -96.6420], [33.1970, -96.6390]
    ]
  }
];

function isDallas(city) {
  return String(city || "").trim().toLowerCase() === "dallas";
}

function priceFor(doors, city) {
  const qty = Math.max(0, Math.floor(Number(doors) || 0));
  const dist = qty * RATE;
  const travel = isDallas(city) || qty >= WAIVE_AT ? 0 : TRAVEL_FEE;
  return { qty, dist, travel, total: dist + travel, city: city || "Unassigned" };
}

function money(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function storeKey(id) {
  return "noskotx-route-" + id;
}

function uid() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

function saveRoute(route) {
  const all = listRoutes();
  all[route.id] = route;
  localStorage.setItem("noskotx-routes", JSON.stringify(all));
  localStorage.setItem("noskotx-last", route.id);
}

function listRoutes() {
  try { return JSON.parse(localStorage.getItem("noskotx-routes") || "{}"); }
  catch { return {}; }
}

function loadRoute(id) {
  return listRoutes()[id] || null;
}

function encodeRoute(route) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(route))));
}

function decodeRoute(hash) {
  try { return JSON.parse(decodeURIComponent(escape(atob(hash)))); }
  catch { return null; }
}
