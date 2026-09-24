const modal = document.getElementById("bookModal");
const cityInput = document.getElementById("bookCity");
const doorsInput = document.getElementById("bookDoors");
const cityList = document.getElementById("cityList");
const estimate = document.getElementById("estimate");
const mapHint = document.getElementById("mapHint");

let selected = CITIES.find(function (c) { return c.name === "Dallas"; });
let map = null;
let layers = { line: null, houses: null, apts: null };
let geo = { streets: [], houses: [], apts: [] };
let drawing = false;
let corners = [];
let lastPick = { houses: 0, apts: 0, path: [], streets: [] };
let premade = [];

CITIES.forEach(function (c) {
  const o = document.createElement("option");
  o.value = c.name;
  cityList.appendChild(o);
});

function saveInbox(row) {
  try {
    const list = JSON.parse(localStorage.getItem("noskotx-inbox") || "[]");
    list.unshift(row);
    localStorage.setItem("noskotx-inbox", JSON.stringify(list.slice(0, 250)));
  } catch (err) {}
}

function ensureMap() {
  if (map) {
    setTimeout(function () { map.invalidateSize(); }, 150);
    return map;
  }
  map = makeGoogleMap("bookMap", selected.lat, selected.lng, 16);
  map.on("click", function (e) {
    if (!drawing) return;
    corners.push([e.latlng.lat, e.latlng.lng]);
    if (layers.line) map.removeLayer(layers.line);
    layers.line = L.polyline(corners, { color: "#0f2744", weight: 5 }).addTo(map);
    if (corners.length >= 2) {
      const c = countAlong(geo, corners);
      lastPick = { houses: c.houses, apts: c.apts, path: corners.slice(), streets: ["custom"] };
      updatePrice();
      mapHint.textContent = c.houses + " houses and " + c.apts + " apartments on that stretch. Click the next corner or a listed street.";
    } else {
      mapHint.textContent = "First corner set. Click the opposite corner of the street.";
    }
  });
  return map;
}

function updatePrice() {
  const name = cityInput.value.trim();
  const match = CITIES.find(function (c) { return c.name.toLowerCase() === name.toLowerCase(); });
  const box = document.getElementById("areaNote");
  const line = document.getElementById("countLine");
  if (name && !match) {
    estimate.innerHTML = "<b>Outside the 30-minute area.</b><span>We only book cities within about 30 minutes of Dallas.</span>";
    if (box) box.textContent = "Not currently served.";
    return;
  }
  if (match) selected = match;
  const mix = priceMix(lastPick.houses || 0, lastPick.apts || 0, match ? match.name : "");
  if (doorsInput) doorsInput.value = String(mix.doors || 1);
  const travelLine = mix.travel
    ? money(TRAVEL_FEE) + " out-of-area fee"
    : (isDallas(mix.city) ? "Dallas · no travel fee" : "travel waived at 1,000 doors");
  estimate.innerHTML = "<b>" + money(mix.total) + "</b><span>" +
    mix.houses.toLocaleString() + " houses at 35¢ · " +
    mix.apts.toLocaleString() + " apartments at 30¢ · " + travelLine + "</span>";
  if (line) line.textContent = mix.houses.toLocaleString() + " houses · " + mix.apts.toLocaleString() + " apartments · " + mix.doors.toLocaleString() + " doors";
  if (box && match) box.textContent = match.name === "Dallas" ? "Home base." : "About " + match.mins + " minutes from Dallas · $25 fee unless 1,000 doors.";
}

function renderRouteList() {
  const box = document.getElementById("routeList");
  if (!box) return;
  box.innerHTML = "";
  premade.forEach(function (s) {
    const mix = priceMix(s.houses, s.apts, selected.name);
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = "<b>" + s.name + "</b><span>" + s.houses + " houses · " + s.apts + " apartments · " + money(mix.total) + "</span>";
    b.addEventListener("click", function () {
      [...box.querySelectorAll("button")].forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
      corners = s.path.slice();
      lastPick = { houses: s.houses, apts: s.apts, path: s.path.slice(), streets: [s.name] };
      if (layers.line) map.removeLayer(layers.line);
      layers.line = L.polyline(s.path, { color: "#0f2744", weight: 5 }).addTo(map);
      if (s.path.length > 1) map.fitBounds(L.latLngBounds(s.path), { padding: [28, 28], maxZoom: 18 });
      updatePrice();
      mapHint.textContent = s.name + " · gold dots houses · navy dots apartments.";
    });
    box.appendChild(b);
  });
}

async function loadCity() {
  const match = CITIES.find(function (c) { return c.name.toLowerCase() === cityInput.value.trim().toLowerCase(); });
  if (!match) {
    mapHint.textContent = "Pick a city within 30 minutes of Dallas.";
    return;
  }
  selected = match;
  ensureMap();
  map.setView([match.lat, match.lng], 16);
  mapHint.textContent = "Loading streets and doors in " + match.name + "…";
  try {
    geo = await loadCityGeo(match);
  } catch (err) {
    geo = { streets: [], houses: [], apts: [] };
    mapHint.textContent = "Door overlay is slow. Google map is live — click corners to draw your route.";
  }
  drawBuildings(map, geo, layers);
  premade = twentyRoutes(geo, match);
  renderRouteList();
  const first = document.querySelector("#routeList button");
  if (first) first.click();
  if (geo.houses.length || geo.apts.length) {
    mapHint.textContent = "Google map of " + match.name + ". " + geo.houses.length + " houses and " + geo.apts.length + " apartments. Pick a street or click corners.";
  }
  updatePrice();
}

function openBook() {
  modal.classList.add("show");
  cityInput.value = selected ? selected.name : "Dallas";
  setTimeout(loadCity, 80);
}
function closeBook() {
  modal.classList.remove("show");
  document.getElementById("bookStep").hidden = false;
  document.getElementById("bookDone").hidden = true;
}

document.querySelectorAll("[data-open-book]").forEach(function (b) { b.addEventListener("click", openBook); });
document.getElementById("closeBook").addEventListener("click", closeBook);
modal.addEventListener("click", function (e) { if (e.target === modal) closeBook(); });
cityInput.addEventListener("change", loadCity);

document.getElementById("drawBtn").addEventListener("click", function () {
  drawing = !drawing;
  document.getElementById("drawBtn").classList.toggle("on", drawing);
  corners = [];
  mapHint.textContent = drawing
    ? "Click one corner of the street, then the other corner. Keep clicking down the block."
    : "Corner drawing off.";
});
document.getElementById("clearDraw").addEventListener("click", function () {
  drawing = false;
  corners = [];
  lastPick = { houses: 0, apts: 0, path: [], streets: [] };
  if (layers.line) { map.removeLayer(layers.line); layers.line = null; }
  document.getElementById("drawBtn").classList.remove("on");
  updatePrice();
});
document.getElementById("loadRoute").addEventListener("click", loadCity);

function showBooked(sendvia, name) {
  const who = (name || "there").trim();
  const how = sendvia === "both" ? "text and email" : sendvia;
  const title = document.getElementById("bookDoneTitle");
  const note = document.getElementById("bookDoneNote");
  if (title) title.textContent = "Thanks" + (who && who !== "there" ? ", " + who.split(" ")[0] : "") + ". Booking received.";
  if (note) note.textContent = "We have your request. After we confirm the route, we will send your private tracker by " + how + ".";
  document.getElementById("bookStep").hidden = true;
  document.getElementById("bookDone").hidden = false;
}

document.getElementById("bookForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
  const match = CITIES.find(function (c) { return c.name.toLowerCase() === cityInput.value.trim().toLowerCase(); });
  if (!match) {
    mapHint.textContent = "Choose a listed city.";
    if (btn) { btn.disabled = false; btn.textContent = "Confirm booking"; }
    return;
  }
  const piece = (document.querySelector('input[name="piece"]:checked') || {}).value || "hanger";
  const sendvia = (document.querySelector('input[name="sendvia"]:checked') || {}).value || "text";
  const name = (document.getElementById("bookName") || {}).value || "";
  const phone = (document.getElementById("bookPhone") || {}).value || "";
  const email = (document.getElementById("bookEmail") || {}).value || "";
  const mix = priceMix(lastPick.houses || 0, lastPick.apts || 0, match.name);
  const job = {
    id: uid(),
    city: match.name,
    mins: match.mins,
    houses: mix.houses,
    apts: mix.apts,
    streets: lastPick.streets || [],
    piece: piece,
    sendvia: sendvia,
    name: name,
    phone: phone,
    email: email,
    doors: mix.doors,
    total: mix.total,
    travel: mix.travel,
    path: (lastPick.path || []).slice(),
    status: "new",
    done: 0,
    trail: [],
    created: Date.now()
  };
  saveJob(job);
  saveInbox(job);
  const hash = "#" + encodeJob(job);
  const base = location.origin + location.pathname.replace(/index\.html$/, "");
  const payload = {
    _subject: "Nossonk booking request — confirm then send tracker",
    name: name,
    phone: phone,
    email: email,
    send_tracker_by: sendvia,
    city: match.name,
    streets: (lastPick.streets || []).join(", "),
    houses: String(mix.houses),
    apartments: String(mix.apts),
    doors: String(mix.doors),
    estimate: money(mix.total),
    piece: piece,
    crew_link: base + "track.html" + hash,
    customer_link: base + "watch.html" + hash,
    _autoresponse: "Thank you for booking a route with Nossonk LLC. We received your request. We will confirm it and get back to you within 48 hours."
  };
  showBooked(sendvia, name);
  try {
    if (typeof sendShopMail === "function") await sendShopMail(payload);
  } catch (err) {}
  if (btn) { btn.disabled = false; btn.textContent = "Confirm booking"; }
});

const again = document.getElementById("bookAgain");
if (again) again.addEventListener("click", function () {
  document.getElementById("bookDone").hidden = true;
  document.getElementById("bookStep").hidden = false;
});
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
