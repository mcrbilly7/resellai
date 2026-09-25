let satMap = null;
let satLayers = { streets: null, houses: null, apts: null, draw: null };

function satTiles() {
  return L.tileLayer("https://{s}.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}", {
    maxZoom: 21,
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
    attribution: "Google satellite"
  });
}

function ensureSat() {
  const el = document.getElementById("bookMap");
  if (!el) return null;
  if (satMap) {
    setTimeout(function () { satMap.invalidateSize(); }, 200);
    return satMap;
  }
  satMap = L.map(el, { zoomControl: true }).setView([32.822, -96.752], 16);
  satTiles().addTo(satMap);
  satMap.on("click", function (e) {
    if (typeof drawing === "undefined") return;
    if (!drawing) {
      drawing = true;
      const b = document.getElementById("drawBtn");
      if (b) b.classList.add("on");
    }
    corners.push([e.latlng.lat, e.latlng.lng]);
    paintSatDraw();
    if (corners.length >= 2 && typeof countAlong === "function") {
      const c = countAlong(geo, corners);
      lastPick = { houses: c.houses, apts: c.apts, path: corners.slice(), streets: ["custom"] };
      const h2 = document.getElementById("bookHouses");
      const a2 = document.getElementById("bookApts");
      if (h2) h2.value = String(c.houses);
      if (a2) a2.value = String(c.apts);
      if (typeof updatePrice === "function") updatePrice();
      if (mapHint) mapHint.textContent = c.houses + " houses and " + c.apts + " apartments on the line you drew.";
    }
  });
  setTimeout(function () { satMap.invalidateSize(); }, 250);
  return satMap;
}

function paintSatDraw() {
  if (!satMap) return;
  if (satLayers.draw) satMap.removeLayer(satLayers.draw);
  if (!corners.length) return;
  satLayers.draw = L.layerGroup();
  if (corners.length > 1) L.polyline(corners, { color: "#fff200", weight: 5 }).addTo(satLayers.draw);
  corners.forEach(function (p) {
    L.circleMarker(p, { radius: 7, color: "#111", weight: 2, fillColor: "#fff200", fillOpacity: 1 }).addTo(satLayers.draw);
  });
  satLayers.draw.addTo(satMap);
}

function drawOfflineCity(pack) {
  if (!satMap || !pack) return;
  if (satLayers.streets) satMap.removeLayer(satLayers.streets);
  if (satLayers.houses) satMap.removeLayer(satLayers.houses);
  if (satLayers.apts) satMap.removeLayer(satLayers.apts);
  satLayers.streets = L.layerGroup();
  satLayers.houses = L.layerGroup();
  satLayers.apts = L.layerGroup();
  (pack.streets || []).forEach(function (s) {
    if (s.path && s.path.length > 1) {
      L.polyline(s.path, { color: "#ffe56a", weight: 3, opacity: 0.95 }).addTo(satLayers.streets);
    }
  });
  (pack.houses || []).forEach(function (p) {
    L.circleMarker(p, { radius: 4, color: "#fff", weight: 1, fillColor: "#e2b23a", fillOpacity: 1 }).addTo(satLayers.houses);
  });
  (pack.apts || []).forEach(function (p) {
    L.circleMarker(p, { radius: 5, color: "#fff", weight: 1, fillColor: "#163a6b", fillOpacity: 1 }).addTo(satLayers.apts);
  });
  satLayers.streets.addTo(satMap);
  satLayers.houses.addTo(satMap);
  satLayers.apts.addTo(satMap);
}

function showGoogle(lat, lng, zoom) {
  ensureSat();
  if (satMap) satMap.setView([lat, lng], zoom || 16);
}
