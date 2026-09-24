const modal = document.getElementById("bookModal");
const cityInput = document.getElementById("bookCity");
const doorsInput = document.getElementById("bookDoors");
const cityList = document.getElementById("cityList");
const estimate = document.getElementById("estimate");
const mapHint = document.getElementById("mapHint");

let selected = CITIES.find((c) => c.name === "Dallas");
let customPath = [];
let drawing = false;
let bookView = null;
let counts = { houses: 0, apts: 0, housePts: [], aptPts: [], streets: [] };
let lookupTimer = null;

CITIES.forEach((c) => {
  const o = document.createElement("option");
  o.value = c.name;
  cityList.appendChild(o);
});

function showArea(lat, lng, zoom) {
  const frame = document.getElementById("bookMap");
  if (!frame) return;
  frame.src = "https://maps.google.com/maps?q=" + lat + "," + lng + "&z=" + (zoom || 16) + "&hl=en&t=m&output=embed";
}

function mid(path) {
  if (!path || !path.length) return [32.7767, -96.7970];
  return path[Math.floor(path.length / 2)];
}

function ensureBookMap() {
  const match = selected || CITIES[0];
  showArea(match.lat, match.lng, 15);
}

function drawLayers() {
  if (customPath.length) {
    const pt = mid(customPath);
    showArea(pt[0], pt[1], 16);
  }
}

function queueCount() {
  clearTimeout(lookupTimer);
  lookupTimer = setTimeout(runCount, 400);
}

async function runCount() {
  if (customPath.length < 2) return;
  mapHint.textContent = "Reading houses and apartments on this street…";
  try {
    const found = await buildingsAlong(customPath);
    counts.houses = found.houses;
    counts.apts = found.apts;
    counts.housePts = found.housePts;
    counts.aptPts = found.aptPts;
    if (doorsInput) doorsInput.value = String(found.houses + found.apts || 1);
    drawLayers();
    updatePrice();
    const streetBit = counts.streets && counts.streets.length ? counts.streets.join(", ") : "this stretch";
    mapHint.textContent = streetBit + " · gold = houses · navy = apartments";
  } catch (err) {
    mapHint.textContent = "Could not read doors on that street. Click two more corners or try Show city route.";
  }
}

let premade = [];
let activeRouteId = null;

function pathMeters(path) {
  let m = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const dLat = (b[0] - a[0]) * 111320;
    const dLng = (b[1] - a[1]) * 111320 * Math.cos(a[0] * Math.PI / 180);
    m += Math.sqrt(dLat * dLat + dLng * dLng);
  }
  return m;
}

function seedCounts(path) {
  const m = pathMeters(path);
  const houses = Math.max(18, Math.round(m / 22));
  const apts = Math.max(0, Math.round(m / 180) * 6);
  return { houses: houses, apts: apts };
}

function renderRouteList() {
  const box = document.getElementById("routeList");
  if (!box) return;
  box.innerHTML = "";
  premade.forEach((r) => {
    const mix = priceMix(r.houses || 0, r.apts || 0, selected ? selected.name : "Dallas");
    const b = document.createElement("button");
    b.type = "button";
    if (r.id === activeRouteId) b.className = "on";
    b.innerHTML = "<b>" + r.name + "</b><span>" + (r.houses || 0) + " houses · " + (r.apts || 0) + " apartments · " + money(mix.total) + "</span>";
    b.addEventListener("click", () => pickRoute(r, true));
    box.appendChild(b);
  });
}

async function pickRoute(route, recount) {
  activeRouteId = route.id;
  drawing = false;
  const draw = document.getElementById("drawBtn");
  if (draw) draw.classList.remove("on");
  customPath = route.path.slice();
  counts.streets = [route.name];
  counts.houses = route.houses || 0;
  counts.apts = route.apts || 0;
  counts.housePts = [];
  counts.aptPts = [];
  if (doorsInput) doorsInput.value = String((route.houses || 0) + (route.apts || 0) || 1);
  drawLayers();
  updatePrice();
  renderRouteList();
  if (recount) await runCount().then(() => {
    route.houses = counts.houses;
    route.apts = counts.apts;
    renderRouteList();
  });
}

async function loadCityRoute() {
  const match = CITIES.find((c) => c.name.toLowerCase() === cityInput.value.trim().toLowerCase());
  if (!match) {
    mapHint.textContent = "Pick a city within 30 minutes of Dallas.";
    return;
  }
  selected = match;
  drawing = false;
  showArea(match.lat, match.lng, 15);
  mapHint.textContent = "Loading 20 residential routes in " + match.name + "…";
  try {
    premade = await twentyCityRoutes(match);
  } catch (err) {
    premade = [];
    for (let i = 0; i < 20; i++) {
      premade.push({ id: match.name + "-" + (i + 1), name: match.name + " residential " + (i + 1), path: residentialPath(match.lat, match.lng, i) });
    }
  }
  premade.forEach((r) => {
    const seed = seedCounts(r.path);
    if (!r.houses) r.houses = seed.houses;
    if (!r.apts) r.apts = seed.apts;
  });
  renderRouteList();
  if (premade[0]) await pickRoute(premade[0], true);
  mapHint.textContent = "20 residential routes in " + match.name + ". Gold = houses. Navy = apartments.";
}

function updatePrice() {
  const name = cityInput.value.trim();
  const match = CITIES.find((c) => c.name.toLowerCase() === name.toLowerCase());
  const box = document.getElementById("areaNote");
  const line = document.getElementById("countLine");
  if (name && !match) {
    estimate.innerHTML = "<b>Outside the 30-minute area.</b><span>We only book cities within about 30 minutes of Dallas.</span>";
    box.textContent = "Not currently served.";
    return;
  }
  if (match) selected = match;
  const mix = priceMix(counts.houses, counts.apts, match ? match.name : "");
  const travelLine = mix.travel
    ? money(TRAVEL_FEE) + " out-of-area fee"
    : (isDallas(mix.city) ? "Dallas · no travel fee" : "travel waived at 1,000 doors");
  const streetBit = counts.streets && counts.streets.length ? counts.streets.join(", ") : "selected streets";
  estimate.innerHTML = "<b>" + money(mix.total) + "</b><span>" +
    mix.houses.toLocaleString() + " houses at 35¢ · " +
    mix.apts.toLocaleString() + " apartments at 30¢ · " +
    streetBit + " · " + travelLine + "</span>";
  if (line) line.textContent = mix.houses.toLocaleString() + " houses · " + mix.apts.toLocaleString() + " apartments · " + mix.doors.toLocaleString() + " doors";
  box.textContent = match ? (match.name === "Dallas" ? "Home base." : "About " + match.mins + " minutes from Dallas · $25 fee unless 1,000 doors.") : "";
}

function renderMap() {
  const match = CITIES.find((c) => c.name.toLowerCase() === cityInput.value.trim().toLowerCase()) || selected;
  if (match) showArea(match.lat, match.lng, 15);
}

function openBook() {
  modal.classList.add("show");
  cityInput.value = selected ? selected.name : "Dallas";
  updatePrice();
  setTimeout(() => {
    renderMap();
    loadCityRoute();
  }, 80);
}

function closeBook() {
  modal.classList.remove("show");
  document.getElementById("bookStep").hidden = false;
  document.getElementById("bookDone").hidden = true;
}

document.querySelectorAll("[data-open-book]").forEach((b) => b.addEventListener("click", openBook));
document.getElementById("closeBook").addEventListener("click", closeBook);
modal.addEventListener("click", (e) => { if (e.target === modal) closeBook(); });

cityInput.addEventListener("change", () => { updatePrice(); loadCityRoute(); });
cityInput.addEventListener("input", updatePrice);
if (doorsInput) doorsInput.addEventListener("input", updatePrice);

document.getElementById("drawBtn").addEventListener("click", () => {
  mapHint.textContent = "Pick a residential route under the map. The Google map shows that neighborhood with streets and houses.";
});

document.getElementById("clearDraw").addEventListener("click", () => {
  customPath = [];
  counts = { houses: 0, apts: 0, housePts: [], aptPts: [], streets: [] };
  drawLayers();
  updatePrice();
});

document.getElementById("loadRoute").addEventListener("click", loadCityRoute);

function showBooked(sendvia, name) {
  const who = (name || "there").trim();
  const how = sendvia === "both" ? "text and email" : sendvia;
  const title = document.getElementById("bookDoneTitle");
  const note = document.getElementById("bookDoneNote");
  if (title) title.textContent = "Thanks" + (who && who !== "there" ? ", " + who.split(" ")[0] : "") + ". Booking received.";
  if (note) note.textContent = "We have your request. After we confirm the route, we will send your private tracker by " + how + ". You do not need to stay on this page.";
  document.getElementById("bookStep").hidden = true;
  document.getElementById("bookDone").hidden = false;
}

document.getElementById("bookForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
  const match = CITIES.find((c) => c.name.toLowerCase() === cityInput.value.trim().toLowerCase());
  if (!match) {
    mapHint.textContent = "Choose a listed city within 30 minutes of Dallas.";
    if (btn) { btn.disabled = false; btn.textContent = "Confirm booking"; }
    return;
  }
  const piece = (document.querySelector('input[name="piece"]:checked') || {}).value || "hanger";
  const sendvia = (document.querySelector('input[name="sendvia"]:checked') || {}).value || "text";
  const name = (document.getElementById("bookName") || {}).value || "";
  const phone = (document.getElementById("bookPhone") || {}).value || "";
  const email = (document.getElementById("bookEmail") || {}).value || "";
  const mix = priceMix(counts.houses, counts.apts, match.name);
  if (!mix.doors && doorsInput && doorsInput.value) {
    mix.doors = parseInt(doorsInput.value, 10) || 0;
  }
  if (!mix.doors) mix.doors = 1;
  if (!mix.total) mix.total = priceMix(mix.houses || mix.doors, mix.apts || 0, match.name).total;

  const job = {
    id: uid(),
    city: match.name,
    mins: match.mins,
    houses: mix.houses,
    apts: mix.apts,
    streets: counts.streets || [],
    piece: piece,
    sendvia: sendvia,
    name: name,
    phone: phone,
    email: email,
    doors: mix.doors,
    total: mix.total,
    travel: mix.travel,
    path: customPath.slice(),
    done: 0,
    trail: [],
    created: Date.now()
  };
  saveJob(job);
  saveInbox(job);
  const hash = "#" + encodeJob(job);
  const base = location.origin + location.pathname.replace(/index\.html$/, "");
  const crew = base + "track.html" + hash;
  const customer = base + "watch.html" + hash;
  const payload = {
    _subject: "Nossonk booking request — confirm then send tracker",
    name: name,
    phone: phone,
    email: email,
    send_tracker_by: sendvia,
    city: match.name,
    streets: (counts.streets || []).join(", "),
    houses: String(mix.houses),
    apartments: String(mix.apts),
    doors: String(mix.doors),
    estimate: money(mix.total),
    piece: piece,
    crew_link: crew,
    customer_link: customer,
    note: "Confirm this job first. Then text and/or email the CUSTOMER link only."
  };
  showBooked(sendvia, name);
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 8000) : null;
  try {
    await fetch("https://formsubmit.co/ajax/392d527d09be6d2ef7eba61b05686ad0", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined
    });
  } catch (err) {
    try {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "https://formsubmit.co/392d527d09be6d2ef7eba61b05686ad0";
      form.target = "noskotx_mail";
      form.style.display = "none";
      Object.keys(payload).forEach((k) => {
        const i = document.createElement("input");
        i.name = k;
        i.value = payload[k];
        form.appendChild(i);
      });
      if (!document.getElementById("noskotx_mail")) {
        const iframe = document.createElement("iframe");
        iframe.name = "noskotx_mail";
        iframe.id = "noskotx_mail";
        iframe.style.display = "none";
        document.body.appendChild(iframe);
      }
      document.body.appendChild(form);
      form.submit();
    } catch (err2) {}
  }
  if (timer) clearTimeout(timer);
  if (btn) { btn.disabled = false; btn.textContent = "Confirm booking"; }
});

const again = document.getElementById("bookAgain");
if (again) again.addEventListener("click", () => {
  document.getElementById("bookDone").hidden = true;
  document.getElementById("bookStep").hidden = false;
});

const yearEl = document.getElementById("year"); if (yearEl) yearEl.textContent = new Date().getFullYear();
