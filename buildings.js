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
