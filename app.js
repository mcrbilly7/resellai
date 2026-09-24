const modal = document.getElementById("bookModal");
const svg = document.getElementById("bookMap");
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

function renderMap() {
  drawMetroMap(svg, {
    selected: selected && selected.name,
    path: customPath,
    onSelect: (c) => {
      selected = c;
      cityInput.value = c.name;
      drawing = false;
      document.getElementById("drawBtn").classList.remove("on");
      mapHint.textContent = c.name + " · about " + c.mins + " min from Dallas.";
      updatePrice();
      renderMap();
    }
  });
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
  const p = priceFor(doorsInput.value, match ? match.name : "");
  const travelLine = p.travel
    ? money(TRAVEL_FEE) + " out-of-area fee"
    : (isDallas(p.city) ? "Dallas · no travel fee" : "travel waived at 1,000 doors");
  estimate.innerHTML = "<b>" + money(p.total) + "</b><span>" + p.qty.toLocaleString() + " doors in " + (p.city || "—") + " · " + travelLine + "</span>";
  box.textContent = match ? (match.name === "Dallas" ? "Home base." : "About " + match.mins + " minutes from Dallas · $25 fee unless 1,000 doors.") : "";
}

function openBook() {
  modal.classList.add("show");
  cityInput.value = selected ? selected.name : "Dallas";
  renderMap();
  updatePrice();
}

function closeBook() {
  modal.classList.remove("show");
}

document.querySelectorAll("[data-open-book]").forEach((b) => b.addEventListener("click", openBook));
document.getElementById("closeBook").addEventListener("click", closeBook);
modal.addEventListener("click", (e) => { if (e.target === modal) closeBook(); });

cityInput.addEventListener("input", updatePrice);
doorsInput.addEventListener("input", updatePrice);

document.getElementById("drawBtn").addEventListener("click", () => {
  drawing = !drawing;
  document.getElementById("drawBtn").classList.toggle("on", drawing);
  mapHint.textContent = drawing
    ? "Click the map to drop waypoints for your own route."
    : "Click a city on the map.";
});

svg.addEventListener("click", (e) => {
  if (!drawing) return;
  const rect = svg.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * 800;
  const y = (e.clientY - rect.top) / rect.height * 640;
  const [lat, lng] = unproject(x, y, 800, 640);
  if (lat < BOUNDS.south || lat > BOUNDS.north || lng < BOUNDS.west || lng > BOUNDS.east) return;
  customPath.push([lat, lng]);
  mapHint.textContent = customPath.length + " points on your route.";
  renderMap();
});

document.getElementById("clearDraw").addEventListener("click", () => {
  customPath = [];
  renderMap();
});

document.getElementById("bookForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const match = CITIES.find((c) => c.name.toLowerCase() === cityInput.value.trim().toLowerCase());
  if (!match) {
    mapHint.textContent = "Choose a listed city within 30 minutes of Dallas.";
    return;
  }
  const p = priceFor(doorsInput.value, match.name);
  if (!p.qty) return;
  const job = {
    id: uid(),
    city: match.name,
    mins: match.mins,
    doors: p.qty,
    total: p.total,
    travel: p.travel,
    path: customPath.slice(),
    done: 0,
    trail: [],
    created: Date.now()
  };
  saveJob(job);
  location.href = "track.html#" + encodeJob(job);
});

document.getElementById("year").textContent = new Date().getFullYear();
document.getElementById("contactForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(e.target);
  const subject = encodeURIComponent("Nossonk LLC booking");
  const body = encodeURIComponent(`Name: ${data.get("name")}\nReach me: ${data.get("reply")}\n\n${data.get("message") || ""}`);
  location.href = "mailto:noskotx@gmail.com?subject=" + subject + "&body=" + body;
});
