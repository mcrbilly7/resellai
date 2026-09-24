const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];

function googleTiles() {
  return L.tileLayer("https://{s}.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}", {
    maxZoom: 21,
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
    attribution: "Google"
  });
}

function makeGoogleMap(id, lat, lng, zoom) {
  const map = L.map(id, { zoomControl: true }).setView([lat || 32.7767, lng || -96.7970], zoom || 16);
  googleTiles().addTo(map);
  setTimeout(function () { map.invalidateSize(); }, 200);
  setTimeout(function () { map.invalidateSize(); }, 600);
  return map;
}

function classifyBuilding(tags) {
  const b = String((tags && tags.building) || "").toLowerCase();
  const fl = parseInt((tags && (tags["building:levels"] || tags.levels)) || "0", 10) || 0;
  if (["apartments", "apartment", "residential", "dormitory", "hotel", "yes"].indexOf(b) >= 0 && (fl >= 3 || b === "apartments" || b === "apartment" || b === "dormitory")) return "apt";
  if (["apartments", "apartment", "dormitory"].indexOf(b) >= 0) return "apt";
  if (["house", "detached", "terrace", "bungalow", "semidetached_house", "cabin", "static_caravan"].indexOf(b) >= 0) return "house";
  if (fl >= 3) return "apt";
  return "house";
}

function centerOf(el) {
  if (el.center) return [el.center.lat, el.center.lon];
  if (el.lat) return [el.lat, el.lon];
  return null;
}

async function overpassQuery(q) {
  let last = null;
  for (let i = 0; i < OVERPASS_URLS.length; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(function () { ctrl.abort(); }, 18000);
      const res = await fetch(OVERPASS_URLS[i], {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(q),
        signal: ctrl.signal
      });
      clearTimeout(t);
      if (!res.ok) throw new Error("overpass " + res.status);
      return await res.json();
    } catch (err) { last = err; }
  }
  throw last || new Error("overpass failed");
}

function pathLen(path) {
  let n = 0;
  for (let i = 1; i < path.length; i++) {
    const dLat = (path[i][0] - path[i - 1][0]) * 111320;
    const dLng = (path[i][1] - path[i - 1][1]) * 111320 * Math.cos(path[i][0] * Math.PI / 180);
    n += Math.sqrt(dLat * dLat + dLng * dLng);
  }
  return n;
}

function nearSeg(pt, a, b, maxM) {
  const steps = 6;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const dLat = (pt[0] - q[0]) * 111320;
    const dLng = (pt[1] - q[1]) * 111320 * Math.cos(pt[0] * Math.PI / 180);
    if (Math.sqrt(dLat * dLat + dLng * dLng) <= maxM) return true;
  }
  return false;
}

function nearPath(pt, path, maxM) {
  for (let i = 1; i < path.length; i++) if (nearSeg(pt, path[i - 1], path[i], maxM)) return true;
  return false;
}

async function loadCityGeo(city) {
  const around = "(around:1200," + city.lat + "," + city.lng + ")";
  const q = "[out:json][timeout:20];" +
    "way[\"highway\"~\"^(residential|living_street)$\"]" + around + ";out geom tags;" +
    "way[\"building\"]" + around + ";out center tags;" +
    "node[\"building\"]" + around + ";out tags;";
  const data = await overpassQuery(q);
  const streets = [];
  const houses = [];
  const apts = [];
  (data.elements || []).forEach(function (el) {
    const tags = el.tags || {};
    if (tags.highway && el.geometry && el.geometry.length > 1) {
      const path = el.geometry.map(function (g) { return [g.lat, g.lon]; });
      streets.push({
        name: tags.name || "Residential street",
        path: path,
        center: path[Math.floor(path.length / 2)],
        id: el.id
      });
    }
    if (tags.building) {
      const pt = centerOf(el);
      if (!pt) return;
      if (classifyBuilding(tags) === "apt") apts.push(pt);
      else houses.push(pt);
    }
  });
  return { streets: streets, houses: houses, apts: apts };
}

function countAlong(geo, path) {
  let houses = 0, apts = 0;
  geo.houses.forEach(function (p) { if (nearPath(p, path, 45)) houses++; });
  geo.apts.forEach(function (p) { if (nearPath(p, path, 45)) apts++; });
  if (!houses && !apts) {
    const m = pathLen(path);
    houses = Math.max(8, Math.round(m / 22));
    apts = Math.round(houses * 0.25);
  }
  return { houses: houses, apts: apts };
}

function twentyRoutes(geo, city) {
  const named = geo.streets.filter(function (s) { return s.name && s.name !== "Residential street"; });
  const pool = named.length >= 8 ? named : geo.streets;
  const out = [];
  const used = {};
  pool.forEach(function (s) {
    if (out.length >= 20) return;
    if (used[s.name]) return;
    used[s.name] = 1;
    const path = s.path && s.path.length > 1 ? s.path : [s.center];
    const c = countAlong(geo, path);
    out.push({
      name: s.name,
      path: path,
      houses: c.houses,
      apts: c.apts
    });
  });
  while (out.length < 20) {
    const i = out.length;
    const ang = (i / 20) * Math.PI * 2;
    const lat = city.lat + Math.cos(ang) * 0.008;
    const lng = city.lng + Math.sin(ang) * 0.008;
    const path = [[lat - 0.001, lng], [lat + 0.001, lng + 0.0006]];
    const c = countAlong(geo, path);
    out.push({ name: city.name + " residential " + (i + 1), path: path, houses: c.houses, apts: c.apts });
  }
  return out.slice(0, 20);
}

function drawBuildings(map, geo, layers) {
  if (layers.houses) map.removeLayer(layers.houses);
  if (layers.apts) map.removeLayer(layers.apts);
  layers.houses = L.layerGroup();
  layers.apts = L.layerGroup();
  geo.houses.slice(0, 1800).forEach(function (p) {
    L.circleMarker(p, { radius: 4, color: "#fff", weight: 1, fillColor: "#c4a056", fillOpacity: 0.95 }).addTo(layers.houses);
  });
  geo.apts.slice(0, 900).forEach(function (p) {
    L.circleMarker(p, { radius: 4, color: "#fff", weight: 1, fillColor: "#0f2744", fillOpacity: 0.95 }).addTo(layers.apts);
  });
  layers.houses.addTo(map);
  layers.apts.addTo(map);
}
