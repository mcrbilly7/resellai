const OVERPASS = "https://overpass-api.de/api/interpreter";

function classifyBuilding(tags) {
  if (!tags) return null;
  const b = String(tags.building || "").toLowerCase();
  const skip = ["commercial","retail","industrial","garage","garages","shed","roof","carport","church","school","warehouse","parking","construction","hospital","office","hotel","supermarket","yes;commercial"];
  if (skip.indexOf(b) >= 0) return null;
  const flats = parseInt(tags["building:flats"] || tags.flats || "0", 10) || 0;
  if (b === "apartments" || b === "apartment" || b === "dormitory" || flats >= 3) {
    return { type: "apartment", qty: flats || 4 };
  }
  if (b === "house" || b === "detached" || b === "semidetached_house" || b === "terrace" || b === "bungalow" || b === "cabin" || b === "residential" || b === "yes" || b === "static_caravan") {
    return { type: "house", qty: 1 };
  }
  return null;
}

async function overpass(query) {
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: "data=" + encodeURIComponent(query)
  });
  if (!res.ok) throw new Error("map lookup failed");
  return res.json();
}

function sampleLine(path, maxPts) {
  if (!path.length) return [];
  if (path.length <= maxPts) return path;
  const out = [];
  const step = (path.length - 1) / (maxPts - 1);
  for (let i = 0; i < maxPts; i++) out.push(path[Math.round(i * step)]);
  return out;
}

async function buildingsAlong(path) {
  const pts = sampleLine(path, 20);
  if (pts.length < 2) return { houses: 0, apts: 0, housePts: [], aptPts: [] };
  const chain = pts.map((p) => p[0].toFixed(5) + "," + p[1].toFixed(5)).join(",");
  const q = "[out:json][timeout:25];(way[\"building\"](around:40," + chain + ");node[\"building\"](around:40," + chain + "););out center tags;";
  const data = await overpass(q);
  const housePts = [];
  const aptPts = [];
  let houses = 0;
  let apts = 0;
  const seen = {};
  (data.elements || []).forEach((el) => {
    const info = classifyBuilding(el.tags || {});
    if (!info) return;
    const c = el.center || { lat: el.lat, lon: el.lon };
    if (!c || c.lat == null) return;
    const key = c.lat.toFixed(5) + "," + c.lon.toFixed(5);
    if (seen[key]) return;
    seen[key] = 1;
    if (info.type === "apartment") {
      apts += info.qty;
      aptPts.push([c.lat, c.lon]);
    } else {
      houses += info.qty;
      housePts.push([c.lat, c.lon]);
    }
  });
  return { houses: houses, apts: apts, housePts: housePts, aptPts: aptPts };
}

async function cityStreetRoute(lat, lng) {
  const q = "[out:json][timeout:20];way[\"highway\"~\"^(residential|living_street)$\"](around:900," + lat + "," + lng + ");out geom;";
  const data = await overpass(q);
  const ways = (data.elements || []).filter((w) => w.geometry && w.geometry.length > 4);
  ways.sort((a, b) => b.geometry.length - a.geometry.length);
  const top = ways.slice(0, 3);
  const path = [];
  const nameSet = [];
  top.forEach((w) => {
    if (w.tags && w.tags.name) nameSet.push(w.tags.name);
    w.geometry.forEach((g) => path.push([g.lat, g.lon]));
  });
  const names = [];
  nameSet.forEach((n) => { if (names.indexOf(n) < 0) names.push(n); });
  return { path: path, streets: names.slice(0, 6) };
}


function residentialPath(lat, lng, i) {
  const ang = (i / 20) * Math.PI * 2;
  const ring = 0.011 + (i % 5) * 0.0028;
  const clat = lat + Math.sin(ang) * ring;
  const clng = lng + Math.cos(ang) * ring * 1.18;
  const dx = 0.0036 + (i % 3) * 0.0007;
  const dy = 0.0031 + ((i + 1) % 3) * 0.0006;
  return [
    [clat + dy * 0.15, clng - dx],
    [clat + dy * 0.15, clng + dx],
    [clat - dy, clng + dx],
    [clat - dy, clng - dx * 0.35]
  ];
}

async function twentyCityRoutes(city) {
  let streets = [];
  try {
    const q = "[out:json][timeout:22];way[\"highway\"~\"^(residential|living_street)$\"][\"name\"](around:1600," + city.lat + "," + city.lng + ");out geom;";
    const data = await overpass(q);
    const ways = (data.elements || []).filter((w) => w.geometry && w.geometry.length > 6 && w.tags && w.tags.name);
    const byName = {};
    ways.forEach((w) => {
      const n = w.tags.name;
      if (!byName[n] || w.geometry.length > byName[n].geometry.length) byName[n] = w;
    });
    streets = Object.keys(byName).map((n) => byName[n]);
    streets.sort((a, b) => b.geometry.length - a.geometry.length);
  } catch (err) {
    streets = [];
  }
  const routes = [];
  for (let i = 0; i < 20; i++) {
    if (streets[i]) {
      const g = streets[i].geometry;
      routes.push({
        id: city.name + "-" + (i + 1),
        name: streets[i].tags.name,
        path: g.map((pt) => [pt.lat, pt.lon])
      });
    } else {
      routes.push({
        id: city.name + "-" + (i + 1),
        name: city.name + " residential " + (i + 1),
        path: residentialPath(city.lat, city.lng, i)
      });
    }
  }
  return routes;
}

function saveInbox(row) {
  try {
    const list = JSON.parse(localStorage.getItem("noskotx-inbox") || "[]");
    list.unshift(row);
    localStorage.setItem("noskotx-inbox", JSON.stringify(list.slice(0, 250)));
  } catch (err) {}
}

function loadInbox() {
  try { return JSON.parse(localStorage.getItem("noskotx-inbox") || "[]"); }
  catch (err) { return []; }
}
