let CITYMAPS = null;
let clickMap = null;
let streetLayer = null;
let houseLayer = null;
let aptLayer = null;
let drawLayer = null;
let drawing = false;
let corners = [];
let picked = { houses: {}, apts: {} };
let currentCity = "Dallas";
let onChange = function () {};

function distM(a, b) {
  const dLat = (a[0] - b[0]) * 111320;
  const dLng = (a[1] - b[1]) * 111320 * Math.cos(a[0] * Math.PI / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function nearLine(pt, path, maxM) {
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const steps = 8;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      if (distM(pt, q) <= maxM) return true;
    }
  }
  return false;
}

async function loadCityMaps() {
  if (CITYMAPS) return CITYMAPS;
  const res = await fetch("city-maps.json");
  CITYMAPS = await res.json();
  return CITYMAPS;
}

function initClickMap(elId, changeFn) {
  onChange = changeFn || onChange;
  if (clickMap) {
    setTimeout(function () { clickMap.invalidateSize(); }, 200);
    return clickMap;
  }
  clickMap = L.map(elId, { zoomControl: true, attributionControl: false }).setView([32.7767, -96.7970], 14);
  clickMap.getContainer().style.background = "#efe8d8";
  clickMap.on("click", function (e) {
    if (!drawing) return;
    corners.push([e.latlng.lat, e.latlng.lng]);
    paintDraw();
    if (corners.length >= 2) selectAlong(corners);
  });
  setTimeout(function () { clickMap.invalidateSize(); }, 250);
  return clickMap;
}

function paintDraw() {
  if (drawLayer) clickMap.removeLayer(drawLayer);
  if (!corners.length) return;
  drawLayer = L.layerGroup();
  corners.forEach(function (c) {
    L.circleMarker(c, { radius: 6, color: "#0f2744", fillColor: "#fff", fillOpacity: 1, weight: 2 }).addTo(drawLayer);
  });
  if (corners.length > 1) L.polyline(corners, { color: "#0f2744", weight: 4 }).addTo(drawLayer);
  drawLayer.addTo(clickMap);
}

function markerOpts(kind, on) {
  return {
    radius: on ? 7 : 5,
    color: on ? "#111" : "#fff",
    weight: on ? 2 : 1,
    fillColor: kind === "apt" ? "#0f2744" : "#c4a056",
    fillOpacity: 1
  };
}

function keyOf(pt) { return pt[0] + "," + pt[1]; }

function toggle(kind, pt, marker) {
  const bag = kind === "apt" ? picked.apts : picked.houses;
  const k = keyOf(pt);
  if (bag[k]) delete bag[k];
  else bag[k] = pt;
  marker.setStyle(markerOpts(kind, !!bag[k]));
  onChange(getPicked());
}

function getPicked() {
  return {
    houses: Object.keys(picked.houses).length,
    apts: Object.keys(picked.apts).length,
    path: corners.slice(),
    city: currentCity
  };
}

function selectAlong(path) {
  const data = CITYMAPS[currentCity];
  if (!data) return;
  houseLayer.eachLayer(function (m) {
    const pt = [m.getLatLng().lat, m.getLatLng().lng];
    if (nearLine(pt, path, 42)) {
      picked.houses[keyOf(pt)] = pt;
      m.setStyle(markerOpts("house", true));
    }
  });
  aptLayer.eachLayer(function (m) {
    const pt = [m.getLatLng().lat, m.getLatLng().lng];
    if (nearLine(pt, path, 42)) {
      picked.apts[keyOf(pt)] = pt;
      m.setStyle(markerOpts("apt", true));
    }
  });
  onChange(getPicked());
}

function selectStreet(street) {
  corners = street.path.slice();
  picked = { houses: {}, apts: {} };
  paintDraw();
  selectAlong(street.path);
  if (street.path.length) clickMap.fitBounds(L.latLngBounds(street.path), { padding: [24, 24] });
}

function showCity(name) {
  currentCity = name;
  const data = CITYMAPS && CITYMAPS[name];
  if (!clickMap || !data) return data;
  if (streetLayer) clickMap.removeLayer(streetLayer);
  if (houseLayer) clickMap.removeLayer(houseLayer);
  if (aptLayer) clickMap.removeLayer(aptLayer);
  picked = { houses: {}, apts: {} };
  corners = [];
  if (drawLayer) { clickMap.removeLayer(drawLayer); drawLayer = null; }
  streetLayer = L.layerGroup();
  data.streets.forEach(function (s) {
    L.polyline(s.path, { color: "#8a7a5a", weight: 3, opacity: 0.9 }).addTo(streetLayer);
  });
  houseLayer = L.layerGroup();
  data.houses.forEach(function (pt) {
    const m = L.circleMarker(pt, markerOpts("house", false));
    m.on("click", function (e) {
      L.DomEvent.stopPropagation(e);
      toggle("house", pt, m);
    });
    m.addTo(houseLayer);
  });
  aptLayer = L.layerGroup();
  data.apts.forEach(function (pt) {
    const m = L.circleMarker(pt, markerOpts("apt", false));
    m.on("click", function (e) {
      L.DomEvent.stopPropagation(e);
      toggle("apt", pt, m);
    });
    m.addTo(aptLayer);
  });
  streetLayer.addTo(clickMap);
  houseLayer.addTo(clickMap);
  aptLayer.addTo(clickMap);
  clickMap.setView([data.lat, data.lng], 14);
  onChange(getPicked());
  return data;
}

function setDrawing(on) {
  drawing = !!on;
}

function clearPick() {
  picked = { houses: {}, apts: {} };
  corners = [];
  if (drawLayer) { clickMap.removeLayer(drawLayer); drawLayer = null; }
  if (houseLayer) houseLayer.eachLayer(function (m) { m.setStyle(markerOpts("house", false)); });
  if (aptLayer) aptLayer.eachLayer(function (m) { m.setStyle(markerOpts("apt", false)); });
  onChange(getPicked());
}
