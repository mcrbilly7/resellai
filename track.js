const params = new URLSearchParams(location.search);
let route = null;

if (location.hash.length > 1) {
  route = decodeRoute(location.hash.slice(1));
}
if (!route) {
  const last = localStorage.getItem("noskotx-last");
  if (last) route = loadRoute(last);
}

const map = L.map("map", { zoomControl: false }).setView(DALLAS, 10);
L.control.zoom({ position: "bottomright" }).addTo(map);
L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  attribution: "&copy; OpenStreetMap &copy; CARTO",
  maxZoom: 19
}).addTo(map);

let watchId = null;
let trailLine = null;
let hereMarker = null;
let timer = null;
let startedAt = route && route.startedAt ? route.startedAt : null;

function persist() {
  if (!route) return;
  saveRoute(route);
  history.replaceState(null, "", "#" + encodeRoute(route));
}

function paint() {
  if (!route) {
    document.getElementById("routeName").textContent = "No route loaded";
    return;
  }
  document.getElementById("routeName").textContent = route.name + " · " + route.city;
  document.getElementById("statGoal").textContent = Number(route.doors || 0).toLocaleString();
  document.getElementById("statDone").textContent = Number(route.done || 0).toLocaleString();
  const pct = route.doors ? Math.min(100, Math.round((route.done || 0) / route.doors * 100)) : 0;
  document.getElementById("statPct").textContent = pct + "% complete";
  document.getElementById("meterFill").style.width = pct + "%";

  if (route.path && route.path.length) {
    const poly = L.polygon(route.path, {
      color: "#e8a54b",
      weight: 2,
      fillColor: "#e8a54b",
      fillOpacity: 0.12
    }).addTo(map);
    map.fitBounds(poly.getBounds(), { padding: [36, 36] });
  }

  if (route.trail && route.trail.length) {
    trailLine = L.polyline(route.trail, { color: "#7dd3c0", weight: 4 }).addTo(map);
  }
}

function tickClock() {
  if (!startedAt) return;
  const s = Math.floor((Date.now() - startedAt) / 1000);
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const r = String(s % 60).padStart(2, "0");
  document.getElementById("statTime").textContent = m + ":" + r;
}

document.getElementById("logDoors").onclick = () => {
  if (!route) {
    route = { id: uid(), name: "Ad-hoc track", city: "Dallas", doors: 500, done: 0, path: null, trail: [], created: Date.now() };
  }
  const n = Number(document.getElementById("inc").value || 0);
  route.done = Math.max(0, (route.done || 0) + n);
  if (!startedAt) startedAt = Date.now();
  route.startedAt = startedAt;
  persist();
  document.getElementById("statDone").textContent = route.done.toLocaleString();
  const pct = route.doors ? Math.min(100, Math.round(route.done / route.doors * 100)) : 0;
  document.getElementById("statPct").textContent = pct + "% complete";
  document.getElementById("meterFill").style.width = pct + "%";
};

document.getElementById("plus").onclick = () => {
  const el = document.getElementById("inc");
  el.value = Number(el.value || 0) + 10;
};
document.getElementById("minus").onclick = () => {
  const el = document.getElementById("inc");
  el.value = Math.max(1, Number(el.value || 0) - 10);
};

document.getElementById("startGps").onclick = () => {
  if (!navigator.geolocation) {
    document.getElementById("gpsStatus").textContent = "This browser has no GPS.";
    return;
  }
  if (!route) {
    route = { id: uid(), name: "Live walk", city: "Dallas", doors: 500, done: 0, path: null, trail: [], created: Date.now() };
  }
  if (!startedAt) startedAt = Date.now();
  route.startedAt = startedAt;
  if (!timer) timer = setInterval(tickClock, 1000);
  document.getElementById("gpsStatus").textContent = "Waiting for a GPS fix…";
  watchId = navigator.geolocation.watchPosition((pos) => {
    const pt = [pos.coords.latitude, pos.coords.longitude];
    route.trail = route.trail || [];
    route.trail.push(pt);
    persist();
    if (!trailLine) trailLine = L.polyline(route.trail, { color: "#7dd3c0", weight: 4 }).addTo(map);
    else trailLine.addLatLng(pt);
    if (!hereMarker) {
      hereMarker = L.circleMarker(pt, { radius: 7, color: "#fff", fillColor: "#7dd3c0", fillOpacity: 1, weight: 2 }).addTo(map);
    } else {
      hereMarker.setLatLng(pt);
    }
    map.panTo(pt);
    document.getElementById("gpsStatus").textContent =
      "Live · " + pos.coords.latitude.toFixed(5) + ", " + pos.coords.longitude.toFixed(5);
  }, (err) => {
    document.getElementById("gpsStatus").textContent = "GPS blocked: " + err.message;
  }, { enableHighAccuracy: true, maximumAge: 5000 });
};

document.getElementById("stopGps").onclick = () => {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  document.getElementById("gpsStatus").textContent = "GPS stopped. Trail is saved on this link.";
};

document.getElementById("shareLink").onclick = async () => {
  if (route) persist();
  const url = location.href;
  try {
    await navigator.clipboard.writeText(url);
    document.getElementById("gpsStatus").textContent = "Tracking link copied.";
  } catch {
    prompt("Copy this tracking link", url);
  }
};

document.getElementById("resetTrack").onclick = () => {
  if (!route) return;
  route.done = 0;
  route.trail = [];
  route.startedAt = null;
  startedAt = null;
  persist();
  location.reload();
};

paint();
if (startedAt) timer = setInterval(tickClock, 1000);
tickClock();
