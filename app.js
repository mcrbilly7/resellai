const map = L.map("map", { zoomControl: false }).setView(DALLAS, 10);
L.control.zoom({ position: "bottomright" }).addTo(map);
L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  attribution: "&copy; OpenStreetMap &copy; CARTO",
  maxZoom: 19
}).addTo(map);

let mode = "select";
let drawn = [];
let drawLine = null;
let activeLayer = null;
let selected = { city: "Dallas", name: "Dallas", path: null, doors: 500 };

const doorsInput = document.getElementById("doors");
const hint = document.getElementById("hint");
const grid = document.getElementById("routeGrid");

function cityIcon() {
  return L.divIcon({
    className: "pin",
    html: "<span></span>",
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
}

CITIES.forEach((c) => {
  L.marker([c.lat, c.lng], { icon: cityIcon(), title: c.name })
    .addTo(map)
    .on("click", () => selectCity(c));
});

CORRIDORS.forEach((r) => {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "route-card";
  card.innerHTML = `<b>${r.name}</b><span>${r.city} · ~${r.doors.toLocaleString()} doors</span>`;
  card.addEventListener("click", () => loadCorridor(r));
  grid.appendChild(card);
});

function clearActive() {
  if (activeLayer) {
    map.removeLayer(activeLayer);
    activeLayer = null;
  }
}

function paintPath(path, city) {
  clearActive();
  activeLayer = L.polygon(path, {
    color: "#e8a54b",
    weight: 2,
    fillColor: "#e8a54b",
    fillOpacity: 0.18
  }).addTo(map);
  map.fitBounds(activeLayer.getBounds(), { padding: [40, 40] });
  selected.path = path;
  selected.city = city;
}

function selectCity(c) {
  selected = { city: c.name, name: c.name + " city area", path: null, doors: c.doors };
  doorsInput.value = c.doors;
  clearActive();
  activeLayer = L.circle([c.lat, c.lng], {
    radius: 3500,
    color: "#e8a54b",
    weight: 2,
    fillColor: "#e8a54b",
    fillOpacity: 0.12
  }).addTo(map);
  map.setView([c.lat, c.lng], 12);
  hint.textContent = c.name + " selected. Adjust door count or draw a tighter route.";
  renderPrice();
}

function loadCorridor(r) {
  selected = { city: r.city, name: r.name, path: r.path, doors: r.doors, corridor: r.id };
  doorsInput.value = r.doors;
  paintPath(r.path, r.city);
  hint.textContent = r.name + " loaded. Save it to open the tracker.";
  renderPrice();
}

function renderPrice() {
  const p = priceFor(doorsInput.value, selected.city);
  document.getElementById("priceTotal").textContent = money(p.total);
  const travel = p.travel === 0
    ? (isDallas(p.city) ? "no travel fee" : "travel waived")
    : money(p.travel) + " travel";
  document.getElementById("priceDetail").textContent =
    `${p.qty.toLocaleString()} doors in ${p.city} · ${travel}`;
}

function setMode(next) {
  mode = next;
  document.getElementById("modeSelect").classList.toggle("on", next === "select");
  document.getElementById("modeDraw").classList.toggle("on", next === "draw");
  hint.textContent = next === "draw"
    ? "Click the map to drop waypoints. Click Save when the line looks right."
    : "Click a gold city pin to load that corridor.";
}

document.getElementById("modeSelect").onclick = () => setMode("select");
document.getElementById("modeDraw").onclick = () => setMode("draw");
doorsInput.addEventListener("input", renderPrice);

map.on("click", (e) => {
  if (mode !== "draw") return;
  drawn.push([e.latlng.lat, e.latlng.lng]);
  if (drawLine) map.removeLayer(drawLine);
  drawLine = L.polyline(drawn, { color: "#7dd3c0", weight: 3 }).addTo(map);
  drawn.forEach((pt, i) => {
    L.circleMarker(pt, { radius: 5, color: "#7dd3c0", fillOpacity: 1 }).addTo(map);
  });
  selected.path = drawn.slice();
  selected.name = "Custom route";
  if (!selected.city) selected.city = "Dallas";
  hint.textContent = drawn.length + " points on your route.";
});

document.getElementById("clearRoute").onclick = () => {
  drawn = [];
  if (drawLine) { map.removeLayer(drawLine); drawLine = null; }
  clearActive();
  map.eachLayer((layer) => {
    if (layer instanceof L.CircleMarker && !(layer instanceof L.Marker)) {
      map.removeLayer(layer);
    }
  });
  hint.textContent = "Map cleared.";
};

document.getElementById("saveRoute").onclick = () => {
  const p = priceFor(doorsInput.value, selected.city);
  if (!p.qty) return;
  const route = {
    id: uid(),
    name: selected.name || selected.city,
    city: selected.city,
    doors: p.qty,
    path: selected.path,
    created: Date.now(),
    done: 0,
    trail: []
  };
  saveRoute(route);
  location.href = "track.html#" + encodeRoute(route);
};

document.getElementById("contactForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(e.target);
  const routeNote = selected.name ? `Route: ${selected.name} (${selected.city})\n` : "";
  const subject = encodeURIComponent("Nossonk LLC route request");
  const body = encodeURIComponent(
    `Name: ${data.get("name")}\nReach me at: ${data.get("reply")}\n${routeNote}Doors: ${doorsInput.value}\n\n${data.get("message") || ""}`
  );
  location.href = `mailto:noskotx@gmail.com?subject=${subject}&body=${body}`;
});

document.getElementById("year").textContent = new Date().getFullYear();
renderPrice();
