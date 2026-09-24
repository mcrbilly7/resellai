let job = null;
if (location.hash.length > 1) job = decodeJob(location.hash.slice(1));
if (!job) job = loadJob();
if (!job) job = { id: uid(), city: "Dallas", doors: 0, done: 0, houses: 0, apts: 0, log: [], path: [], trail: [], created: Date.now() };
job.log = job.log || [];
job.houses = job.houses || 0;
job.apts = job.apts || 0;

const svg = document.getElementById("trackMap");
const statusEl = document.getElementById("gpsStatus");
const gate = document.getElementById("permGate");
let watchId = null;
const live = LiveHost(job);
let startedAt = job.startedAt || null;
let timer = null;

function persist() {
  saveJob(job);
  const hash = "#" + encodeJob(job);
  history.replaceState(null, "", hash);
  const cust = document.getElementById("toCustomer");
  if (cust) cust.href = "watch.html" + hash;
  live.publish(job);
}

function paint() {
  drawMetroMap(svg, {
    selected: job.city,
    path: (job.trail && job.trail.length) ? job.trail : job.path,
    here: job.here
  });
}

function renderStats() {
  document.getElementById("jobTitle").textContent = (job.city || "Route") + " · booked " + (job.doors || 0).toLocaleString();
  document.getElementById("statHouse").textContent = (job.houses || 0).toLocaleString();
  document.getElementById("statApt").textContent = (job.apts || 0).toLocaleString();
  document.getElementById("statDone").textContent = (job.done || 0).toLocaleString();
  const pct = job.doors ? Math.min(100, Math.round((job.done || 0) / job.doors * 100)) : 0;
  document.getElementById("meterFill").style.width = pct + "%";
  document.getElementById("statPct").textContent = pct + "% of booked doors · " + money(((job.houses||0)*0.35)+((job.apts||0)*0.30));
  const list = document.getElementById("logList");
  list.innerHTML = "";
  if (!job.log.length) {
    const li = document.createElement("li");
    li.innerHTML = "<span>Nothing hung yet.</span>";
    list.appendChild(li);
    return;
  }
  job.log.slice().reverse().forEach((row) => {
    const li = document.createElement("li");
    const when = new Date(row.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    li.innerHTML = "<span>" + when + "</span><b>" + row.kind + "</b><span>+" + row.qty + "</span>";
    list.appendChild(li);
  });
}

function clock() {
  if (!startedAt) return;
  const el = document.getElementById("statTime");
  if (!el) return;
  const s = Math.floor((Date.now() - startedAt) / 1000);
  el.textContent = String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}

function addLog(kind) {
  const qty = Math.max(1, Math.floor(Number(document.getElementById("inc").value || 1)));
  job.log.push({ kind: kind, qty: qty, at: Date.now() });
  if (kind === "house") job.houses = (job.houses || 0) + qty;
  else job.apts = (job.apts || 0) + qty;
  job.done = (job.houses || 0) + (job.apts || 0);
  if (!startedAt) startedAt = Date.now();
  job.startedAt = startedAt;
  persist();
  renderStats();
  statusEl.textContent = "Logged " + qty + " " + (kind === "house" ? "house" : "apartment") + (qty > 1 ? "s" : "") + ".";
}

document.getElementById("logHouse").onclick = () => addLog("house");
document.getElementById("logApt").onclick = () => addLog("apartment");
document.getElementById("undoLog").onclick = () => {
  const last = job.log.pop();
  if (!last) return;
  if (last.kind === "house") job.houses = Math.max(0, (job.houses || 0) - last.qty);
  else job.apts = Math.max(0, (job.apts || 0) - last.qty);
  job.done = (job.houses || 0) + (job.apts || 0);
  persist();
  renderStats();
};

document.getElementById("allowGps").onclick = () => {
  if (!navigator.geolocation) { statusEl.textContent = "No GPS on this phone."; return; }
  statusEl.textContent = "Waiting for precise location…";
  if (!startedAt) startedAt = Date.now();
  job.startedAt = startedAt;
  persist();
  watchId = navigator.geolocation.watchPosition((pos) => {
    const pt = [pos.coords.latitude, pos.coords.longitude];
    job.here = pt;
    job.trail = job.trail || [];
    const last = job.trail[job.trail.length - 1];
    if (!last || Math.abs(last[0] - pt[0]) > 0.00004 || Math.abs(last[1] - pt[1]) > 0.00004) job.trail.push(pt);
    persist();
    paint();
    statusEl.textContent = "Precise GPS on · about " + Math.round(pos.coords.accuracy) + " m";
  }, (err) => {
    statusEl.textContent = err.code === 1 ? "Location blocked. Allow Precise Location." : err.message;
  }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 });
};

document.getElementById("stopGps").onclick = () => {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  statusEl.textContent = "GPS stopped.";
};

document.getElementById("shareLink").onclick = async () => {
  persist();
  const url = location.origin + location.pathname.replace("track.html", "watch.html") + location.hash;
  try { await navigator.clipboard.writeText(url); statusEl.textContent = "Customer link copied."; }
  catch { prompt("Copy customer link", url); }
};

renderStats();
paint();
persist();
