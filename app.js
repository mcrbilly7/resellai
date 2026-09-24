const modal = document.getElementById("bookModal");
const cityInput = document.getElementById("bookCity");
const doorsInput = document.getElementById("bookDoors");
const cityList = document.getElementById("cityList");
const estimate = document.getElementById("estimate");
const mapHint = document.getElementById("mapHint");

let selected = CITIES.find((c) => c.name === "Dallas");
let customPath = [];
let drawing = false;
let bookView = null;
let counts = { houses: 0, apts: 0, housePts: [], aptPts: [], streets: [] };
let lookupTimer = null;

CITIES.forEach((c) => {
  const o = document.createElement("option");
  o.value = c.name;
  cityList.appendChild(o);
});

function ensureBookMap() {
  if (bookView) {
    setTimeout(() => bookView.map.invalidateSize(), 200);
    return bookView;
  }
  bookView = makeStreetMap("bookMap");
  bookView.map.on("click", (e) => {
    if (!drawing) return;
    customPath.push([e.latlng.lat, e.latlng.lng]);
    mapHint.textContent = customPath.length === 1
      ? "First corner set. Click the next corner of the street."
      : customPath.length + " corners. Click the next corner, or wait for the door count.";
    drawLayers();
    if (customPath.length >= 2) queueCount();
  });
  setTimeout(() => bookView.map.invalidateSize(), 250);
  return bookView;
}

function drawLayers() {
  if (!bookView) return;
  if (bookView.line) bookView.map.removeLayer(bookView.line);
  if (bookView.houseLayer) bookView.map.removeLayer(bookView.houseLayer);
  if (bookView.aptLayer) bookView.map.removeLayer(bookView.aptLayer);
  if (customPath.length) {
    bookView.line = L.polyline(customPath, { color: "#0f2744", weight: 5 }).addTo(bookView.map);
  }
  bookView.houseLayer = L.layerGroup(
    (counts.housePts || []).map((p) => L.circleMarker(p, { radius: 5, color: "#fff", weight: 1, fillColor: "#c4a056", fillOpacity: 0.95 }))
  ).addTo(bookView.map);
  bookView.aptLayer = L.layerGroup(
    (counts.aptPts || []).map((p) => L.circleMarker(p, { radius: 5, color: "#fff", weight: 1, fillColor: "#0f2744", fillOpacity: 0.95 }))
  ).addTo(bookView.map);
  if (customPath.length > 1) bookView.map.fitBounds(L.latLngBounds(customPath), { padding: [28, 28] });
}

function queueCount() {
  clearTimeout(lookupTimer);
  lookupTimer = setTimeout(runCount, 400);
}

async function runCount() {
  if (customPath.length < 2) return;
  mapHint.textContent = "Reading houses and apartments on this street…";
  try {
    const found = await buildingsAlong(customPath);
    counts.houses = found.houses;
    counts.apts = found.apts;
    counts.housePts = found.housePts;
    counts.aptPts = found.aptPts;
    if (doorsInput) doorsInput.value = String(found.houses + found.apts || 1);
    drawLayers();
    updatePrice();
    const streetBit = counts.streets && counts.streets.length ? counts.streets.join(", ") : "this stretch";
    mapHint.textContent = streetBit + " · gold = houses · navy = apartments";
  } catch (err) {
    mapHint.textContent = "Could not read doors on that street. Click two more corners or try Show city route.";
  }
}

async function loadCityRoute() {
  const match = CITIES.find((c) => c.name.toLowerCase() === cityInput.value.trim().toLowerCase());
  if (!match) {
    mapHint.textContent = "Pick a city within 30 minutes of Dallas.";
    return;
  }
  selected = match;
  drawing = false;
  document.getElementById("drawBtn").classList.remove("on");
  ensureBookMap();
  bookView.map.setView([match.lat, match.lng], 16);
  mapHint.textContent = "Loading the street route in " + match.name + "…";
  try {
    const route = await cityStreetRoute(match.lat, match.lng);
    customPath = route.path;
    counts.streets = route.streets || [];
    if (!customPath.length) {
      customPath = [
        [match.lat, match.lng - 0.006],
        [match.lat, match.lng + 0.006],
        [match.lat - 0.004, match.lng + 0.006]
      ];
    }
    drawLayers();
    await runCount();
  } catch (err) {
    mapHint.textContent = "Street lookup is busy. Click corners on the map instead.";
  }
}

function updatePrice() {
  const name = cityInput.value.trim();
  const match = CITIES.find((c) => c.name.toLowerCase() === name.toLowerCase());
  const box = document.getElementById("areaNote");
  const line = document.getElementById("countLine");
  if (name && !match) {
    estimate.innerHTML = "<b>Outside the 30-minute area.</b><span>We only book cities within about 30 minutes of Dallas.</span>";
    box.textContent = "Not currently served.";
    return;
  }
  if (match) selected = match;
  const mix = priceMix(counts.houses, counts.apts, match ? match.name : "");
  const travelLine = mix.travel
    ? money(TRAVEL_FEE) + " out-of-area fee"
    : (isDallas(mix.city) ? "Dallas · no travel fee" : "travel waived at 1,000 doors");
  const streetBit = counts.streets && counts.streets.length ? counts.streets.join(", ") : "selected streets";
  estimate.innerHTML = "<b>" + money(mix.total) + "</b><span>" +
    mix.houses.toLocaleString() + " houses at 35¢ · " +
    mix.apts.toLocaleString() + " apartments at 30¢ · " +
    streetBit + " · " + travelLine + "</span>";
  if (line) line.textContent = mix.houses.toLocaleString() + " houses · " + mix.apts.toLocaleString() + " apartments · " + mix.doors.toLocaleString() + " doors";
  box.textContent = match ? (match.name === "Dallas" ? "Home base." : "About " + match.mins + " minutes from Dallas · $25 fee unless 1,000 doors.") : "";
}

function renderMap() {
  ensureBookMap();
  const match = CITIES.find((c) => c.name.toLowerCase() === cityInput.value.trim().toLowerCase());
  if (match) bookView.map.setView([match.lat, match.lng], 16);
}

function openBook() {
  modal.classList.add("show");
  cityInput.value = selected ? selected.name : "Dallas";
  updatePrice();
  setTimeout(() => {
    renderMap();
    loadCityRoute();
  }, 80);
}

function closeBook() {
  modal.classList.remove("show");
  document.getElementById("bookStep").hidden = false;
  document.getElementById("bookDone").hidden = true;
}

document.querySelectorAll("[data-open-book]").forEach((b) => b.addEventListener("click", openBook));
document.getElementById("closeBook").addEventListener("click", closeBook);
modal.addEventListener("click", (e) => { if (e.target === modal) closeBook(); });

cityInput.addEventListener("change", () => { updatePrice(); loadCityRoute(); });
cityInput.addEventListener("input", updatePrice);
if (doorsInput) doorsInput.addEventListener("input", updatePrice);

document.getElementById("drawBtn").addEventListener("click", () => {
  drawing = !drawing;
  document.getElementById("drawBtn").classList.toggle("on", drawing);
  customPath = [];
  counts = { houses: 0, apts: 0, housePts: [], aptPts: [], streets: ["custom street"] };
  drawLayers();
  mapHint.textContent = drawing
    ? "Click the first street corner, then the opposite corner. Keep clicking down the block."
    : "Click corners is off.";
  updatePrice();
});

document.getElementById("clearDraw").addEventListener("click", () => {
  customPath = [];
  counts = { houses: 0, apts: 0, housePts: [], aptPts: [], streets: [] };
  drawLayers();
  updatePrice();
});

document.getElementById("loadRoute").addEventListener("click", loadCityRoute);

document.getElementById("bookForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const match = CITIES.find((c) => c.name.toLowerCase() === cityInput.value.trim().toLowerCase());
  if (!match) {
    mapHint.textContent = "Choose a listed city within 30 minutes of Dallas.";
    return;
  }
  const piece = (document.querySelector('input[name="piece"]:checked') || {}).value || "hanger";
  const sendvia = (document.querySelector('input[name="sendvia"]:checked') || {}).value || "text";
  const name = (document.getElementById("bookName") || {}).value || "";
  const phone = (document.getElementById("bookPhone") || {}).value || "";
  const email = (document.getElementById("bookEmail") || {}).value || "";
  const mix = priceMix(counts.houses, counts.apts, match.name);
  if (!mix.doors && doorsInput && doorsInput.value) {
    mix.doors = parseInt(doorsInput.value, 10) || 0;
  }
  if (!mix.doors) {
    mapHint.textContent = "Load a city route or click street corners so we can count doors.";
    return;
  }
  const job = {
    id: uid(),
    city: match.name,
    mins: match.mins,
    houses: mix.houses,
    apts: mix.apts,
    streets: counts.streets || [],
    piece: piece,
    sendvia: sendvia,
    name: name,
    phone: phone,
    email: email,
    doors: mix.doors,
    total: mix.total,
    travel: mix.travel,
    path: customPath.slice(),
    done: 0,
    trail: [],
    created: Date.now()
  };
  saveJob(job);
  const hash = "#" + encodeJob(job);
  const base = location.origin + location.pathname.replace(/index\.html$/, "");
  const crew = base + "track.html" + hash;
  const customer = base + "watch.html" + hash;
  const payload = {
    _subject: "Nossonk booking request — confirm then send tracker",
    name: name,
    phone: phone,
    email: email,
    send_tracker_by: sendvia,
    city: match.name,
    streets: (counts.streets || []).join(", "),
    houses: String(mix.houses),
    apartments: String(mix.apts),
    doors: String(mix.doors),
    estimate: money(mix.total),
    piece: piece,
    crew_link: crew,
    customer_link: customer,
    note: "Confirm this job first. Then text and/or email the CUSTOMER link only."
  };
  try {
    await fetch("https://formsubmit.co/ajax/noskotx@gmail.com", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    const body = encodeURIComponent(Object.keys(payload).map((k) => k + ": " + payload[k]).join("\n"));
    location.href = "mailto:noskotx@gmail.com?subject=" + encodeURIComponent(payload._subject) + "&body=" + body;
  }
  const note = document.getElementById("bookDoneNote");
  if (note) {
    note.textContent = "We will confirm first. Then we send your tracker by " + (sendvia === "both" ? "text and email" : sendvia) + ".";
  }
  document.getElementById("bookStep").hidden = true;
  document.getElementById("bookDone").hidden = false;
});

document.getElementById("year").textContent = new Date().getFullYear();
