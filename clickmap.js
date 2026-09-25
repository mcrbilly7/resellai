let packBounds = null;
let selectedDoors = { houses: {}, apts: {} };

function boundsOf(pack) {
  const pts = [];
  (pack.houses || []).forEach(function (p) { pts.push(p); });
  (pack.apts || []).forEach(function (p) { pts.push(p); });
  (pack.streets || []).forEach(function (s) { (s.path || []).forEach(function (p) { pts.push(p); }); });
  if (!pts.length) return { minLat: pack.lat - 0.01, maxLat: pack.lat + 0.01, minLng: pack.lng - 0.01, maxLng: pack.lng + 0.01 };
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  pts.forEach(function (p) {
    if (p[0] < minLat) minLat = p[0];
    if (p[0] > maxLat) maxLat = p[0];
    if (p[1] < minLng) minLng = p[1];
    if (p[1] > maxLng) maxLng = p[1];
  });
  const pad = 0.0008;
  return { minLat: minLat - pad, maxLat: maxLat + pad, minLng: minLng - pad, maxLng: maxLng + pad };
}

function xy(pt, b) {
  const x = (pt[1] - b.minLng) / (b.maxLng - b.minLng) * 1000;
  const y = (b.maxLat - pt[0]) / (b.maxLat - b.minLat) * 1000;
  return [x, y];
}

function keyOf(pt) { return pt[0].toFixed(5) + "," + pt[1].toFixed(5); }

function applyCounts() {
  const h = Object.keys(selectedDoors.houses).length;
  const a = Object.keys(selectedDoors.apts).length;
  lastPick.houses = h;
  lastPick.apts = a;
  const hEl = document.getElementById("bookHouses");
  const aEl = document.getElementById("bookApts");
  if (hEl) hEl.value = String(h);
  if (aEl) aEl.value = String(a);
  if (typeof updatePrice === "function") updatePrice();
  if (mapHint) mapHint.textContent = h + " houses and " + a + " apartments selected. Click a gold house or navy apartment. Click a yellow street to take the whole street.";
}

function selectStreet(street, pack) {
  (pack.houses || []).forEach(function (p) {
    if (typeof nearPath === "function" && nearPath(p, street.path, 40)) selectedDoors.houses[keyOf(p)] = 1;
  });
  (pack.apts || []).forEach(function (p) {
    if (typeof nearPath === "function" && nearPath(p, street.path, 40)) selectedDoors.apts[keyOf(p)] = 1;
  });
  lastPick.path = (street.path || []).slice();
  lastPick.streets = [street.name];
  paintClickMap(pack);
  applyCounts();
}

function paintClickMap(pack) {
  const svg = document.getElementById("bookMap");
  if (!svg || !pack) return;
  const b = packBounds || boundsOf(pack);
  packBounds = b;
  svg.setAttribute("viewBox", "0 0 1000 1000");
  svg.innerHTML = "";
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", "1000"); bg.setAttribute("height", "1000");
  bg.setAttribute("fill", "#1c2a1a");
  svg.appendChild(bg);
  (pack.streets || []).forEach(function (s, idx) {
    if (!s.path || s.path.length < 2) return;
    const d = s.path.map(function (p, i) {
      const q = xy(p, b);
      return (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1);
    }).join(" ");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#f0d36a");
    path.setAttribute("stroke-width", "4");
    path.setAttribute("stroke-linecap", "round");
    path.style.cursor = "pointer";
    path.addEventListener("click", function (ev) {
      ev.stopPropagation();
      selectStreet(s, pack);
    });
    svg.appendChild(path);
  });
  function dot(pt, kind) {
    const q = xy(pt, b);
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", q[0]); c.setAttribute("cy", q[1]);
    c.setAttribute("r", kind === "apt" ? 6 : 5);
    const on = selectedDoors[kind === "apt" ? "apts" : "houses"][keyOf(pt)];
    c.setAttribute("fill", on ? "#fff" : (kind === "apt" ? "#1a3d73" : "#e2b23a"));
    c.setAttribute("stroke", on ? "#111" : "#fff");
    c.setAttribute("stroke-width", "1.2");
    c.style.cursor = "pointer";
    c.addEventListener("click", function (ev) {
      ev.stopPropagation();
      const bag = kind === "apt" ? selectedDoors.apts : selectedDoors.houses;
      const k = keyOf(pt);
      if (bag[k]) delete bag[k]; else bag[k] = 1;
      paintClickMap(pack);
      applyCounts();
    });
    svg.appendChild(c);
  }
  (pack.houses || []).forEach(function (p) { dot(p, "house"); });
  (pack.apts || []).forEach(function (p) { dot(p, "apt"); });
}

function showGoogle(lat, lng, zoom, label) {
  const a = document.getElementById("openGmaps");
  if (a) {
    a.href = "https://www.google.com/maps/@?api=1&map_action=map&center=" + lat + "," + lng + "&zoom=" + (zoom || 17) + "&basemap=satellite";
    a.textContent = "See " + (label || "this area") + " on satellite in Google Maps (look only)";
  }
}
function ensureSat() { return null; }
function drawOfflineCity(pack) {
  selectedDoors = { houses: {}, apts: {} };
  packBounds = boundsOf(pack);
  paintClickMap(pack);
  if (pack && pack.lat) showGoogle(pack.lat, pack.lng, 16);
}
function paintSatDraw() {}
