let CITYMAPS = null;
let drawing = false;
let corners = [];
let picked = { houses: {}, apts: {} };
let currentCity = "Dallas";
let onChange = function () {};
let svg = null;
let view = { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };

function distM(a, b) {
  const dLat = (a[0] - b[0]) * 111320;
  const dLng = (a[1] - b[1]) * 111320 * Math.cos((a[0] * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function nearLine(pt, path, maxM) {
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    for (let s = 0; s <= 10; s++) {
      const t = s / 10;
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

function keyOf(pt) { return pt[0] + "," + pt[1]; }

function getPicked() {
  return {
    houses: Object.keys(picked.houses).length,
    apts: Object.keys(picked.apts).length,
    path: corners.slice(),
    city: currentCity
  };
}

function project(pt) {
  const x = ((pt[1] - view.minLng) / (view.maxLng - view.minLng)) * 1000;
  const y = (1 - (pt[0] - view.minLat) / (view.maxLat - view.minLat)) * 700;
  return [x, y];
}

function unproject(x, y) {
  const lng = view.minLng + (x / 1000) * (view.maxLng - view.minLng);
  const lat = view.minLat + (1 - y / 700) * (view.maxLat - view.minLat);
  return [lat, lng];
}

function initClickMap(elId, changeFn) {
  onChange = changeFn || onChange;
  const host = document.getElementById(elId);
  if (!host) return;
  host.innerHTML = "";
  host.style.background = "#e7f0e2";
  host.style.border = "1px solid #cfc6b3";
  svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 1000 700");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.style.display = "block";
  svg.style.cursor = "crosshair";
  host.appendChild(svg);
  svg.addEventListener("click", function (e) {
    if (!drawing) return;
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 1000;
    const y = ((e.clientY - r.top) / r.height) * 700;
    corners.push(unproject(x, y));
    paint();
    if (corners.length >= 2) selectAlong(corners);
  });
}

function paint() {
  const data = CITYMAPS && CITYMAPS[currentCity];
  if (!svg || !data) return;
  svg.innerHTML = "";
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", "1000");
  bg.setAttribute("height", "700");
  bg.setAttribute("fill", "#e7f0e2");
  svg.appendChild(bg);
  data.streets.forEach(function (s) {
    const d = s.path.map(function (p, i) {
      const xy = project(p);
      return (i ? "L" : "M") + xy[0].toFixed(1) + " " + xy[1].toFixed(1);
    }).join(" ");
    const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
    line.setAttribute("d", d);
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", "#6d5c3d");
    line.setAttribute("stroke-width", "8");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("stroke-linejoin", "round");
    svg.appendChild(line);
    const mid = project(s.path[0]);
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", mid[0] + 8);
    label.setAttribute("y", mid[1] - 8);
    label.setAttribute("font-size", "18");
    label.setAttribute("fill", "#3b2f1c");
    label.textContent = s.name;
    svg.appendChild(label);
  });
  if (corners.length > 1) {
    const d = corners.map(function (p, i) {
      const xy = project(p);
      return (i ? "L" : "M") + xy[0].toFixed(1) + " " + xy[1].toFixed(1);
    }).join(" ");
    const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
    line.setAttribute("d", d);
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", "#0f2744");
    line.setAttribute("stroke-width", "5");
    svg.appendChild(line);
  }
  function dot(pt, kind) {
    const xy = project(pt);
    const on = kind === "apt" ? picked.apts[keyOf(pt)] : picked.houses[keyOf(pt)];
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", xy[0]);
    c.setAttribute("cy", xy[1]);
    c.setAttribute("r", on ? 7 : 5);
    c.setAttribute("fill", kind === "apt" ? "#0f2744" : "#c4a056");
    c.setAttribute("stroke", on ? "#111" : "#fff");
    c.setAttribute("stroke-width", on ? 2 : 1);
    c.style.cursor = "pointer";
    c.addEventListener("click", function (e) {
      e.stopPropagation();
      const bag = kind === "apt" ? picked.apts : picked.houses;
      const k = keyOf(pt);
      if (bag[k]) delete bag[k];
      else bag[k] = pt;
      paint();
      onChange(getPicked());
    });
    svg.appendChild(c);
  }
  data.houses.forEach(function (pt) { dot(pt, "house"); });
  data.apts.forEach(function (pt) { dot(pt, "apt"); });
}

function selectAlong(path) {
  const data = CITYMAPS[currentCity];
  if (!data) return;
  data.houses.forEach(function (pt) { if (nearLine(pt, path, 42)) picked.houses[keyOf(pt)] = pt; });
  data.apts.forEach(function (pt) { if (nearLine(pt, path, 42)) picked.apts[keyOf(pt)] = pt; });
  paint();
  onChange(getPicked());
}

function selectStreet(street) {
  corners = street.path.slice();
  picked = { houses: {}, apts: {} };
  selectAlong(street.path);
}

function showCity(name) {
  currentCity = name;
  const data = CITYMAPS && CITYMAPS[name];
  if (!data) return data;
  let minLat = 99, maxLat = -99, minLng = 99, maxLng = -99;
  data.streets.forEach(function (s) {
    s.path.forEach(function (p) {
      minLat = Math.min(minLat, p[0]); maxLat = Math.max(maxLat, p[0]);
      minLng = Math.min(minLng, p[1]); maxLng = Math.max(maxLng, p[1]);
    });
  });
  const padLat = (maxLat - minLat) * 0.08 + 0.001;
  const padLng = (maxLng - minLng) * 0.08 + 0.001;
  view = { minLat: minLat - padLat, maxLat: maxLat + padLat, minLng: minLng - padLng, maxLng: maxLng + padLng };
  picked = { houses: {}, apts: {} };
  corners = [];
  paint();
  onChange(getPicked());
  return data;
}

function setDrawing(on) { drawing = !!on; }

function clearPick() {
  picked = { houses: {}, apts: {} };
  corners = [];
  paint();
  onChange(getPicked());
}
