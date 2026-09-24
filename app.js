const modal = document.getElementById("bookModal");
const cityInput = document.getElementById("bookCity");
const doorsInput = document.getElementById("bookDoors");
const cityList = document.getElementById("cityList");
const estimate = document.getElementById("estimate");
const mapHint = document.getElementById("mapHint");

let selected = CITIES.find((c) => c.name === "Dallas");
let lastPick = { houses: 0, apts: 0, path: [], city: "Dallas" };

CITIES.forEach((c) => {
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

function updatePrice(pick) {
  if (pick) lastPick = pick;
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

function renderRouteList(data) {
  const box = document.getElementById("routeList");
  if (!box || !data) return;
  box.innerHTML = "";
  data.streets.forEach((s) => {
    let houses = 0, apts = 0;
    data.houses.forEach((p) => { if (nearLine(p, s.path, 42)) houses++; });
    data.apts.forEach((p) => { if (nearLine(p, s.path, 42)) apts++; });
    const mix = priceMix(houses, apts, selected.name);
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = "<b>" + s.name + "</b><span>" + houses + " houses · " + apts + " apartments · " + money(mix.total) + "</span>";
    b.addEventListener("click", function () {
      [...box.querySelectorAll("button")].forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      selectStreet(s);
      mapHint.textContent = s.name + " selected. Gold dots are houses. Navy dots are apartments. Click any door to add or remove it.";
    });
    box.appendChild(b);
  });
}

async function loadCity() {
  const match = CITIES.find((c) => c.name.toLowerCase() === cityInput.value.trim().toLowerCase());
  if (!match) {
    mapHint.textContent = "Pick a city within 30 minutes of Dallas.";
    return;
  }
  selected = match;
  initClickMap("bookMap", updatePrice);
  await loadCityMaps();
  const data = showCity(match.name);
  renderRouteList(data);
  mapHint.textContent = "Gold = house. Navy = apartment. Tap a premade street or click corners, then click houses and apartments.";
  updatePrice(getPicked());
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

document.querySelectorAll("[data-open-book]").forEach((b) => b.addEventListener("click", openBook));
document.getElementById("closeBook").addEventListener("click", closeBook);
modal.addEventListener("click", (e) => { if (e.target === modal) closeBook(); });
cityInput.addEventListener("change", loadCity);

document.getElementById("drawBtn").addEventListener("click", () => {
  const on = !document.getElementById("drawBtn").classList.contains("on");
  document.getElementById("drawBtn").classList.toggle("on", on);
  setDrawing(on);
  if (on) {
    corners = [];
    mapHint.textContent = "Click one street corner, then the next corner. Doors on that stretch light up. Then click extra houses or apartments.";
  } else {
    mapHint.textContent = "Corner drawing off. Click houses and apartments directly.";
  }
});

document.getElementById("clearDraw").addEventListener("click", () => {
  clearPick();
  document.getElementById("drawBtn").classList.remove("on");
  setDrawing(false);
});

document.getElementById("loadRoute").addEventListener("click", loadCity);

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
  const mix = priceMix(lastPick.houses || 0, lastPick.apts || 0, match.name);
  if (!mix.doors) mix.doors = parseInt(doorsInput.value, 10) || 1;
  const job = {
    id: uid(),
    city: match.name,
    mins: match.mins,
    houses: mix.houses,
    apts: mix.apts,
    piece: piece,
    sendvia: sendvia,
    name: name,
    phone: phone,
    email: email,
    doors: mix.doors,
    total: mix.total,
    travel: mix.travel,
    path: (lastPick.path || []).slice(),
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
    houses: String(mix.houses),
    apartments: String(mix.apts),
    doors: String(mix.doors),
    estimate: money(mix.total),
    piece: piece,
    crew_link: base + "track.html" + hash,
    customer_link: base + "watch.html" + hash,
    note: "Confirm this job first. Then text and/or email the CUSTOMER link only.",
    _autoresponse: "Thank you for booking a route with Nossonk LLC. We received your request. We will confirm it and get back to you within 48 hours. After we confirm, we will send your private tracker the way you asked. Need us sooner? Call or text (945) 239-5974."
  };
  showBooked(sendvia, name);
  try {
    if (typeof sendShopMail === "function") await sendShopMail(payload);
    else await fetch("https://formsubmit.co/ajax/392d527d09be6d2ef7eba61b05686ad0", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {}
  if (btn) { btn.disabled = false; btn.textContent = "Confirm booking"; }
});

const again = document.getElementById("bookAgain");
if (again) again.addEventListener("click", () => {
  document.getElementById("bookDone").hidden = true;
  document.getElementById("bookStep").hidden = false;
});
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
