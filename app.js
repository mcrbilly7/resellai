const modal = document.getElementById("bookModal");
let bookView = null;
let cityLayer = null;
const cityInput = document.getElementById("bookCity");
const doorsInput = document.getElementById("bookDoors");
const cityList = document.getElementById("cityList");
const estimate = document.getElementById("estimate");
const mapHint = document.getElementById("mapHint");

let selected = CITIES.find((c) => c.name === "Dallas");
let customPath = [];
let drawing = false;

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
  CITIES.forEach((c) => {
    const mark = L.circleMarker([c.lat, c.lng], {
      radius: c.name === "Dallas" ? 8 : 6,
      color: "#fff",
      weight: 1,
      fillColor: c.name === "Dallas" ? "#0f2744" : "#c4a056",
      fillOpacity: 1
    }).addTo(bookView.map);
    mark.bindTooltip(c.name);
    mark.on("click", () => selectCity(c));
  });
  bookView.map.on("click", (e) => {
    if (!drawing) return;
    customPath.push([e.latlng.lat, e.latlng.lng]);
    drawPath();
    mapHint.textContent = customPath.length + " points on your route.";
  });
  setTimeout(() => bookView.map.invalidateSize(), 250);
  return bookView;
}

function selectCity(c) {
  selected = c;
  cityInput.value = c.name;
  drawing = false;
  document.getElementById("drawBtn").classList.remove("on");
  mapHint.textContent = c.name + " · streets and houses · about " + c.mins + " min from Dallas.";
  if (bookView) bookView.map.setView([c.lat, c.lng], 16);
  updatePrice();
}

function drawPath() {
  if (!bookView) return;
  if (bookView.line) bookView.map.removeLayer(bookView.line);
  if (customPath.length) {
    bookView.line = L.polyline(customPath, { color: "#0f2744", weight: 4 }).addTo(bookView.map);
  }
}

function renderMap() {
  ensureBookMap();
  drawPath();
  if (selected) bookView.map.setView([selected.lat, selected.lng], 16);
}

function updatePrice() {
  const name = cityInput.value.trim();
  const match = CITIES.find((c) => c.name.toLowerCase() === name.toLowerCase());
  const box = document.getElementById("areaNote");
  if (name && !match) {
    estimate.innerHTML = "<b>Outside the 30-minute area.</b><span>We only book cities within about 30 minutes of Dallas.</span>";
    box.textContent = "Not currently served.";
    return;
  }
  if (match) selected = match;
  const kind = (document.querySelector('input[name="kind"]:checked') || {}).value || "house";
  const p = priceFor(doorsInput.value, match ? match.name : "", kind);
  const kindLine = p.kind === "apartment" ? "apartments at 30¢" : "houses at 35¢";
  const travelLine = p.travel
    ? money(TRAVEL_FEE) + " out-of-area fee"
    : (isDallas(p.city) ? "Dallas · no travel fee" : "travel waived at 1,000 doors");
  estimate.innerHTML = "<b>" + money(p.total) + "</b><span>" + p.qty.toLocaleString() + " " + kindLine + " in " + (p.city || "—") + " · " + travelLine + "</span>";
  box.textContent = match ? (match.name === "Dallas" ? "Home base." : "About " + match.mins + " minutes from Dallas · $25 fee unless 1,000 doors.") : "";
}

function openBook() {
  modal.classList.add("show");
  cityInput.value = selected ? selected.name : "Dallas";
  updatePrice();
  setTimeout(renderMap, 50);
}

function closeBook() {
  modal.classList.remove("show");
  document.getElementById("bookStep").hidden = false;
  document.getElementById("bookDone").hidden = true;
}

document.querySelectorAll("[data-open-book]").forEach((b) => b.addEventListener("click", openBook));
document.getElementById("closeBook").addEventListener("click", closeBook);
modal.addEventListener("click", (e) => { if (e.target === modal) closeBook(); });

cityInput.addEventListener("input", updatePrice);
doorsInput.addEventListener("input", updatePrice);
document.querySelectorAll('input[name="kind"]').forEach((el) => el.addEventListener("change", updatePrice));

document.getElementById("drawBtn").addEventListener("click", () => {
  drawing = !drawing;
  document.getElementById("drawBtn").classList.toggle("on", drawing);
  mapHint.textContent = drawing
    ? "Click the map to drop waypoints for your own route."
    : "Click a city on the map.";
});


document.getElementById("clearDraw").addEventListener("click", () => {
  customPath = [];
  drawPath();
});

document.getElementById("bookForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const match = CITIES.find((c) => c.name.toLowerCase() === cityInput.value.trim().toLowerCase());
  if (!match) {
    mapHint.textContent = "Choose a listed city within 30 minutes of Dallas.";
    return;
  }
  const kind = (document.querySelector('input[name="kind"]:checked') || {}).value || "house";
  const p = priceFor(doorsInput.value, match.name, kind);
  if (!p.qty) return;
  const job = {
    id: uid(),
    city: match.name,
    mins: match.mins,
    kind: p.kind,
    piece: (document.querySelector('input[name="piece"]:checked') || {}).value || "hanger",
    rate: p.rate,
    doors: p.qty,
    total: p.total,
    travel: p.travel,
    path: customPath.slice(),
    done: 0,
    trail: [],
    created: Date.now()
  };
  saveJob(job);
  const hash = "#" + encodeJob(job);
  document.getElementById("bookStep").hidden = true;
  document.getElementById("bookDone").hidden = false;
  document.getElementById("crewLink").href = "track.html" + hash;
  document.getElementById("custLink").href = "watch.html" + hash;
});

document.getElementById("year").textContent = new Date().getFullYear();
