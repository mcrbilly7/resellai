const modal = document.getElementById("bookModal");
let mapType = "h";
const cityInput = document.getElementById("bookCity");
const doorsInput = document.getElementById("bookDoors");
const cityList = document.getElementById("cityList");
const estimate = document.getElementById("estimate");
const mapHint = document.getElementById("mapHint");

let selected = CITIES.find((c) => c.name === "Dallas");
let customPath = [];
let drawing = false;

CITIES.forEach((c) => {
  const o = document.createElement("option");
  o.value = c.name;
  cityList.appendChild(o);
});

function mapSrc(city) {
  const q = encodeURIComponent((city || "Dallas") + ", TX");
  return "https://maps.google.com/maps?q=" + q + "&hl=en&z=15&t=" + mapType + "&output=embed";
}

function renderMap() {
  const frame = document.getElementById("bookMap");
  if (frame) frame.src = mapSrc(cityInput.value.trim() || "Dallas");
}

function updatePrice() {
  const name = cityInput.value.trim();
  const match = CITIES.find((c) => c.name.toLowerCase() === name.toLowerCase());
  const box = document.getElementById("areaNote");
  if (name && !match) {
    estimate.innerHTML = "<b>Outside the 30-minute area.</b><span>We only book cities within about 30 minutes of Dallas.</span>";
    box.textContent = "Not currently served.";
    return;
  }
  if (match) selected = match;
  const kind = (document.querySelector('input[name="kind"]:checked') || {}).value || "house";
  const p = priceFor(doorsInput.value, match ? match.name : "", kind);
  const kindLine = p.kind === "apartment" ? "apartments at 30¢" : "houses at 35¢";
  const travelLine = p.travel
    ? money(TRAVEL_FEE) + " out-of-area fee"
    : (isDallas(p.city) ? "Dallas · no travel fee" : "travel waived at 1,000 doors");
  estimate.innerHTML = "<b>" + money(p.total) + "</b><span>" + p.qty.toLocaleString() + " " + kindLine + " in " + (p.city || "—") + " · " + travelLine + "</span>";
  box.textContent = match ? (match.name === "Dallas" ? "Home base." : "About " + match.mins + " minutes from Dallas · $25 fee unless 1,000 doors.") : "";
}

function openBook() {
  modal.classList.add("show");
  cityInput.value = selected ? selected.name : "Dallas";
  updatePrice();
  setTimeout(renderMap, 50);
}

function closeBook() {
  modal.classList.remove("show");
  document.getElementById("bookStep").hidden = false;
  document.getElementById("bookDone").hidden = true;
}

document.querySelectorAll("[data-open-book]").forEach((b) => b.addEventListener("click", openBook));
document.getElementById("closeBook").addEventListener("click", closeBook);
modal.addEventListener("click", (e) => { if (e.target === modal) closeBook(); });

cityInput.addEventListener("input", updatePrice);
doorsInput.addEventListener("input", updatePrice);
document.querySelectorAll('input[name="kind"]').forEach((el) => el.addEventListener("change", updatePrice));

const streetBtn = document.getElementById("mapStreet");
const satBtn = document.getElementById("mapSat");
if (streetBtn) streetBtn.addEventListener("click", () => { mapType = "m"; renderMap(); });
if (satBtn) satBtn.addEventListener("click", () => { mapType = "h"; renderMap(); });
cityInput.addEventListener("change", renderMap);

document.getElementById("bookForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const match = CITIES.find((c) => c.name.toLowerCase() === cityInput.value.trim().toLowerCase());
  if (!match) {
    mapHint.textContent = "Choose a listed city within 30 minutes of Dallas.";
    return;
  }
  const kind = (document.querySelector('input[name="kind"]:checked') || {}).value || "house";
  const piece = (document.querySelector('input[name="piece"]:checked') || {}).value || "hanger";
  const sendvia = (document.querySelector('input[name="sendvia"]:checked') || {}).value || "text";
  const name = (document.getElementById("bookName") || {}).value || "";
  const phone = (document.getElementById("bookPhone") || {}).value || "";
  const email = (document.getElementById("bookEmail") || {}).value || "";
  const p = priceFor(doorsInput.value, match.name, kind);
  if (!p.qty) return;
  const job = {
    id: uid(),
    city: match.name,
    mins: match.mins,
    kind: p.kind,
    piece: piece,
    sendvia: sendvia,
    name: name,
    phone: phone,
    email: email,
    rate: p.rate,
    doors: p.qty,
    total: p.total,
    travel: p.travel,
    path: customPath.slice(),
    done: 0,
    trail: [],
    created: Date.now()
  };
  saveJob(job);
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
    property: p.kind,
    piece: piece,
    doors: String(p.qty),
    estimate: money(p.total),
    crew_link: crew,
    customer_link: customer,
    note: "Confirm this job first. Then text and/or email the CUSTOMER link only. Keep the crew link on the walking phone."
  };
  try {
    await fetch("https://formsubmit.co/ajax/noskotx@gmail.com", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    const body = encodeURIComponent(Object.keys(payload).map((k) => k + ": " + payload[k]).join("\n"));
    location.href = "mailto:noskotx@gmail.com?subject=" + encodeURIComponent(payload._subject) + "&body=" + body;
  }
  const note = document.getElementById("bookDoneNote");
  if (note) {
    note.textContent = "We will confirm first. Then we send your tracker by " + (sendvia === "both" ? "text and email" : sendvia) + ".";
  }
  document.getElementById("bookStep").hidden = true;
  document.getElementById("bookDone").hidden = false;
});

document.getElementById("year").textContent = new Date().getFullYear();
