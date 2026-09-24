const modal = document.getElementById("bookModal");
const cityInput = document.getElementById("bookCity");
const doorsInput = document.getElementById("bookDoors");
const cityList = document.getElementById("cityList");
const estimate = document.getElementById("estimate");
const mapHint = document.getElementById("mapHint");

let selected = CITIES.find(function (c) { return c.name === "Dallas"; });
let map = null;
let layers = { line: null, houses: null, apts: null };
let geo = { streets: [], houses: [], apts: [] };
let drawing = false;
let corners = [];
let lastPick = { houses: 0, apts: 0, path: [], streets: [] };
let premade = [];

CITIES.forEach(function (c) {
  const o = document.createElement("option");
  o.value = c.name;
  cityList.appendChild(o);
});

function saveInbox(row) {
  try {
    const list = JSON.parse(localStorage.getItem("noskotx-inbox") || "[]");
    list.unshift(row);
    localStorage.setItem("noskotx-inbox", JSON.stringify(list.slice(0, 250)));
  } catch (err) {}
}

let viewLat = 32.7767, viewLng = -96.7970, viewZoom = 16;

function mercX(lng, z) { return (lng + 180) / 360 * (256 * Math.pow(2, z)); }
function mercY(lat, z) {
  const s = Math.sin(lat * Math.PI / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * (256 * Math.pow(2, z));
}
function invMerc(px, py, z) {
  const scale = 256 * Math.pow(2, z);
  const lng = px / scale * 360 - 180;
  const n = Math.PI - 2 * Math.PI * py / scale;
  const lat = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return [lat, lng];
}
function clickToLatLng(ev) {
  const layer = document.getElementById("drawLayer");
  const r = layer.getBoundingClientRect();
  const x = ev.clientX - r.left, y = ev.clientY - r.top;
  const cx = mercX(viewLng, viewZoom), cy = mercY(viewLat, viewZoom);
  const worldX = cx + (x - r.width / 2);
  const worldY = cy + (y - r.height / 2);
  return invMerc(worldX, worldY, viewZoom);
}
function estimateDoors(path) {
  let m = 0;
  for (let i = 1; i < path.length; i++) {
    const dLat = (path[i][0] - path[i-1][0]) * 111320;
    const dLng = (path[i][1] - path[i-1][1]) * 111320 * Math.cos(path[i][0] * Math.PI / 180);
    m += Math.sqrt(dLat * dLat + dLng * dLng);
  }
  const houses = Math.max(6, Math.round(m / 22));
  const apts = Math.round(houses * 0.28);
  return { houses: houses, apts: apts };
}
function paintDraw() {
  const svg = document.getElementById("drawLayer");
  if (!svg) return;
  svg.innerHTML = "";
  if (!corners.length) return;
  const r = svg.getBoundingClientRect();
  const cx = mercX(viewLng, viewZoom), cy = mercY(viewLat, viewZoom);
  function xy(pt) {
    return [50 + (mercX(pt[1], viewZoom) - cx) / r.width * 100, 50 + (mercY(pt[0], viewZoom) - cy) / r.height * 100];
  }
  const pts = corners.map(xy);
  if (pts.length > 1) {
    const d = pts.map(function (p, i) { return (i ? "L" : "M") + p[0] + " " + p[1]; }).join(" ");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#0f2744");
    path.setAttribute("stroke-width", "1.2");
    path.setAttribute("vector-effect", "non-scaling-stroke");
    svg.appendChild(path);
  }
  pts.forEach(function (p) {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", p[0]); c.setAttribute("cy", p[1]); c.setAttribute("r", "1.4");
    c.setAttribute("fill", "#c4a056"); c.setAttribute("stroke", "#0f2744");
    svg.appendChild(c);
  });
}
function showGoogle(lat, lng, zoom, label) {
  viewLat = lat; viewLng = lng; viewZoom = zoom || 16;
  const frame = document.getElementById("bookMap");
  if (!frame) return;
  frame.src = "https://maps.google.com/maps?q=" + lat + "," + lng + "&z=" + viewZoom + "&hl=en&t=m&output=embed";
  paintDraw();
}
function ensureMap() {
  showGoogle(selected.lat, selected.lng, 16, selected.name + ", TX");
}
function localRoutes(city) {
  const names = ["Oak St","Maple Dr","Pecan Ln","Elm Ct","Cedar Ave","Willow Trl","Ash Pl","Birch St","Magnolia Way","Cottonwood Dr","Hickory Way","Sycamore Ave","Live Oak Ct","Mesquite Ln","Dogwood Trl","Redbud Pl","Juniper St","Cypress Dr","Holly Ln","Laurel Ct"];
  return names.map(function (name, i) {
    const ang = i / 20 * Math.PI * 2;
    const lat = city.lat + Math.cos(ang) * 0.012;
    const lng = city.lng + Math.sin(ang) * 0.012;
    const path = [[lat - 0.0012, lng - 0.0004],[lat, lng],[lat + 0.0012, lng + 0.0004]];
    const c = estimateDoors(path);
    return { name: name, path: path, houses: c.houses, apts: c.apts };
  });
}

function updatePrice() {

  const name = cityInput.value.trim();
  const match = CITIES.find(function (c) { return c.name.toLowerCase() === name.toLowerCase(); });
  const box = document.getElementById("areaNote");
  const line = document.getElementById("countLine");
  if (name && !match) {
    estimate.innerHTML = "<b>Outside the 30-minute area.</b><span>We only book cities within about 30 minutes of Dallas.</span>";
    if (box) box.textContent = "Not currently served.";
    return;
  }
  if (match) selected = match;
  const mix = priceMix(lastPick.houses || 0, lastPick.apts || 0, match ? match.name : "");
  if (doorsInput) doorsInput.value = String(mix.doors || 1);
  const travelLine = mix.travel
    ? money(TRAVEL_FEE) + " out-of-area fee"
    : (isDallas(mix.city) ? "Dallas · no travel fee" : "travel waived at 1,000 doors");
  estimate.innerHTML = "<b>" + money(mix.total) + "</b><span>" +
    mix.houses.toLocaleString() + " houses at 35¢ · " +
    mix.apts.toLocaleString() + " apartments at 30¢ · " + travelLine + "</span>";
  if (line) line.textContent = mix.houses.toLocaleString() + " houses · " + mix.apts.toLocaleString() + " apartments · " + mix.doors.toLocaleString() + " doors";
  if (box && match) box.textContent = match.name === "Dallas" ? "Home base." : "About " + match.mins + " minutes from Dallas · $25 fee unless 1,000 doors.";
}

function renderRouteList() {
  const box = document.getElementById("routeList");
  if (!box) return;
  box.innerHTML = "";
  premade.forEach(function (s) {
    const mix = priceMix(s.houses, s.apts, selected.name);
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = "<b>" + s.name + "</b><span>" + s.houses + " houses · " + s.apts + " apartments · " + money(mix.total) + "</span>";
    b.addEventListener("click", function () {
      [...box.querySelectorAll("button")].forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
      corners = s.path.slice();
      lastPick = { houses: s.houses, apts: s.apts, path: s.path.slice(), streets: [s.name] };
      const mid = s.path[Math.floor(s.path.length/2)] || [selected.lat, selected.lng];
      showGoogle(mid[0], mid[1], 17, s.name + ", " + selected.name + ", TX");
      updatePrice();
      mapHint.textContent = s.name + " · gold dots houses · navy dots apartments.";
    });
    box.appendChild(b);
  });
}

async function loadCity() {
  const match = CITIES.find(function (c) { return c.name.toLowerCase() === cityInput.value.trim().toLowerCase(); });
  if (!match) {
    mapHint.textContent = "Pick a city within 30 minutes of Dallas.";
    return;
  }
  selected = match;
  ensureMap();
  showGoogle(match.lat, match.lng, 15, match.name + ", TX");
  mapHint.textContent = "Loading streets and doors in " + match.name + "…";
  try {
    geo = await loadCityGeo(match);
  } catch (err) {
    geo = { streets: [], houses: [], apts: [] };
    mapHint.textContent = "Door overlay is slow. Google map is live — click corners to draw your route.";
  }
  premade = twentyRoutes(geo, match);
  renderRouteList();
  const first = document.querySelector("#routeList button");
  if (first) first.click();
  if (geo.houses.length || geo.apts.length) {
    mapHint.textContent = "Google map of " + match.name + ". " + geo.houses.length + " houses and " + geo.apts.length + " apartments. Pick a street or click corners.";
  }
  updatePrice();
}

function openBook() {
  modal.classList.add("show");
  cityInput.value = selected ? selected.name : "Dallas";
  setTimeout(loadCity, 80);
}
function closeBook() {
  modal.classList.remove("show");
  document.getElementById("bookStep").hidden = false;
  document.getElementById("bookDone").hidden = true;
}

document.querySelectorAll("[data-open-book]").forEach(function (b) { b.addEventListener("click", openBook); });
document.getElementById("closeBook").addEventListener("click", closeBook);
modal.addEventListener("click", function (e) { if (e.target === modal) closeBook(); });
cityInput.addEventListener("change", loadCity);

document.getElementById("drawBtn").addEventListener("click", function () {
  mapHint.textContent = "Use Google search inside the map, or tap a listed street. That street loads on Google Maps.";
});
document.getElementById("clearDraw").addEventListener("click", function () {
  drawing = false;
  corners = [];
  lastPick = { houses: 0, apts: 0, path: [], streets: [] };

  document.getElementById("drawBtn").classList.remove("on");
  updatePrice();
});
document.getElementById("loadRoute").addEventListener("click", loadCity);


function renderRouteList() {
  const box = document.getElementById("routeList");
  if (!box) return;
  box.innerHTML = "";
  premade.forEach(function (s) {
    const mix = priceMix(s.houses, s.apts, selected.name);
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = "<b>" + s.name + "</b><span>" + s.houses + " houses · " + s.apts + " apartments · " + money(mix.total) + "</span>";
    b.addEventListener("click", function () {
      [...box.querySelectorAll("button")].forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
      corners = s.path.slice();
      lastPick = { houses: s.houses, apts: s.apts, path: s.path.slice(), streets: [s.name] };
      const mid = s.path[Math.floor(s.path.length/2)] || [selected.lat, selected.lng];
      showGoogle(mid[0], mid[1], 17, s.name);
      paintDraw();
      updatePrice();
      mapHint.textContent = s.name + " is on the Google map. Click corners to draw your own stretch on top of it.";
    });
    box.appendChild(b);
  });
}

function loadCity() {
  const match = CITIES.find(function (c) { return c.name.toLowerCase() === cityInput.value.trim().toLowerCase(); });
  if (!match) {
    mapHint.textContent = "Pick a city within 30 minutes of Dallas.";
    return;
  }
  selected = match;
  corners = [];
  premade = localRoutes(match);
  showGoogle(match.lat, match.lng, 16, match.name + ", TX");
  renderRouteList();
  mapHint.textContent = "Google map of " + match.name + ". Tap Click corners, then tap the map.";
  updatePrice();
}

function openBook() {
  modal.classList.add("show");
  cityInput.value = selected ? selected.name : "Dallas";
  setTimeout(loadCity, 80);
}
function closeBook() {
  modal.classList.remove("show");
  document.getElementById("bookStep").hidden = false;
  document.getElementById("bookDone").hidden = true;
}

document.querySelectorAll("[data-open-book]").forEach(function (b) { b.addEventListener("click", openBook); });
document.getElementById("closeBook").addEventListener("click", closeBook);
modal.addEventListener("click", function (e) { if (e.target === modal) closeBook(); });
cityInput.addEventListener("change", loadCity);

document.getElementById("drawBtn").addEventListener("click", function () {
  drawing = !drawing;
  document.getElementById("drawBtn").classList.toggle("on", drawing);
  mapHint.textContent = drawing
    ? "Tap the Google map: first corner, then the next corner down the street."
    : "Corner drawing off.";
});
document.getElementById("clearDraw").addEventListener("click", function () {
  drawing = false;
  corners = [];
  lastPick = { houses: 0, apts: 0, path: [], streets: [] };
  paintDraw();
  document.getElementById("drawBtn").classList.remove("on");
  updatePrice();
});
document.getElementById("loadRoute").addEventListener("click", loadCity);
document.getElementById("drawLayer").addEventListener("click", function (e) {
  if (!drawing) {
    drawing = true;
    document.getElementById("drawBtn").classList.add("on");
  }
  corners.push(clickToLatLng(e));
  paintDraw();
  if (corners.length >= 2) {
    const c = estimateDoors(corners);
    lastPick = { houses: c.houses, apts: c.apts, path: corners.slice(), streets: ["custom"] };
    updatePrice();
    mapHint.textContent = c.houses + " houses · " + c.apts + " apartments on the stretch you clicked.";
  } else {
    mapHint.textContent = "First corner set. Tap the other end of the street.";
  }
});
const zi = document.getElementById("zoomIn");
const zo = document.getElementById("zoomOut");
if (zi) zi.addEventListener("click", function () { showGoogle(viewLat, viewLng, Math.min(20, viewZoom + 1)); });
if (zo) zo.addEventListener("click", function () { showGoogle(viewLat, viewLng, Math.max(12, viewZoom - 1)); });

function showBooked(sendvia, name) {
  const who = (name || "there").trim();
  const how = sendvia === "both" ? "text and email" : sendvia;
  const title = document.getElementById("bookDoneTitle");
  const note = document.getElementById("bookDoneNote");
  if (title) title.textContent = "Thanks" + (who && who !== "there" ? ", " + who.split(" ")[0] : "") + ". Booking received.";
  if (note) note.textContent = "We have your request. After we confirm the route, we will send your private tracker by " + how + ".";
  document.getElementById("bookStep").hidden = true;
  document.getElementById("bookDone").hidden = false;
}

document.getElementById("bookForm").addEventListener("submit", async function (e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
  const match = CITIES.find(function (c) { return c.name.toLowerCase() === cityInput.value.trim().toLowerCase(); });
  if (!match) {
    mapHint.textContent = "Choose a listed city.";
    if (btn) { btn.disabled = false; btn.textContent = "Confirm booking"; }
    return;
  }
  const piece = (document.querySelector('input[name="piece"]:checked') || {}).value || "hanger";
  const sendvia = (document.querySelector('input[name="sendvia"]:checked') || {}).value || "text";
  const name = (document.getElementById("bookName") || {}).value || "";
  const phone = (document.getElementById("bookPhone") || {}).value || "";
  const email = (document.getElementById("bookEmail") || {}).value || "";
  const mix = priceMix(lastPick.houses || 0, lastPick.apts || 0, match.name);
  const job = {
    id: uid(),
    city: match.name,
    mins: match.mins,
    houses: mix.houses,
    apts: mix.apts,
    streets: lastPick.streets || [],
    piece: piece,
    sendvia: sendvia,
    name: name,
    phone: phone,
    email: email,
    doors: mix.doors,
    total: mix.total,
    travel: mix.travel,
    path: (lastPick.path || []).slice(),
    status: "new",
    done: 0,
    trail: [],
    created: Date.now()
  };
  saveJob(job);
  saveInbox(job);
  const hash = "#" + encodeJob(job);
  const base = location.origin + location.pathname.replace(/index\.html$/, "");
  const payload = {
    _subject: "Nossonk booking request — confirm then send tracker",
    name: name,
    phone: phone,
    email: email,
    send_tracker_by: sendvia,
    city: match.name,
    streets: (lastPick.streets || []).join(", "),
    houses: String(mix.houses),
    apartments: String(mix.apts),
    doors: String(mix.doors),
    estimate: money(mix.total),
    piece: piece,
    crew_link: base + "track.html" + hash,
    customer_link: base + "watch.html" + hash,
    _autoresponse: "Thank you for booking a route with Nossonk LLC. We received your request. We will confirm it and get back to you within 48 hours."
  };
  showBooked(sendvia, name);
  try {
    if (typeof sendShopMail === "function") await sendShopMail(payload);
  } catch (err) {}
  if (btn) { btn.disabled = false; btn.textContent = "Confirm booking"; }
});

const again = document.getElementById("bookAgain");
if (again) again.addEventListener("click", function () {
  document.getElementById("bookDone").hidden = true;
  document.getElementById("bookStep").hidden = false;
});
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
