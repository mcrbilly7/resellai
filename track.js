let job = null;
if (location.hash.length > 1) job = decodeJob(location.hash.slice(1));
if (!job) job = loadJob();

const svg = document.getElementById("trackMap");
const statusEl = document.getElementById("gpsStatus");
const gate = document.getElementById("permGate");
const live = document.getElementById("livePanel");

let watchId = null;
let startedAt = job && job.startedAt ? job.startedAt : null;
let timer = null;

function persist() {
  if (!job) return;
  saveJob(job);
  history.replaceState(null, "", "#" + encodeJob(job));
}

function paint() {
  drawMetroMap(svg, {
    selected: job && job.city,
    path: job && (job.trail && job.trail.length ? job.trail : job.path),
    here: job && job.here
  });
}

function renderStats() {
  if (!job) {
    document.getElementById("jobTitle").textContent = "No job loaded";
    return;
  }
  const kind = job.kind === "apartment" ? "apartments" : "houses";
  document.getElementById("jobTitle").textContent = job.city + " · " + job.doors.toLocaleString() + " " + kind;
  document.getElementById("statDone").textContent = (job.done || 0).toLocaleString();
  document.getElementById("statGoal").textContent = job.doors.toLocaleString();
  const pct = job.doors ? Math.min(100, Math.round((job.done || 0) / job.doors * 100)) : 0;
  document.getElementById("meterFill").style.width = pct + "%";
  document.getElementById("statPct").textContent = pct + "%";
}

function clock() {
  if (!startedAt) return;
  const s = Math.floor((Date.now() - startedAt) / 1000);
  document.getElementById("statTime").textContent =
    String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}

function startGps() {
  if (!navigator.geolocation) {
    statusEl.textContent = "This phone cannot share GPS.";
    return;
  }
  statusEl.textContent = "Waiting for precise location… tap Allow on the prompt.";
  if (!job) {
    job = { id: uid(), city: "Dallas", doors: 0, done: 0, path: [], trail: [], created: Date.now() };
  }
  if (!startedAt) startedAt = Date.now();
  job.startedAt = startedAt;
  if (!timer) timer = setInterval(clock, 1000);
  gate.hidden = true;
  live.hidden = false;
  persist();
  watchId = navigator.geolocation.watchPosition((pos) => {
    const pt = [pos.coords.latitude, pos.coords.longitude];
    job.here = pt;
    job.trail = job.trail || [];
    const last = job.trail[job.trail.length - 1];
    if (!last || Math.abs(last[0] - pt[0]) > 0.00004 || Math.abs(last[1] - pt[1]) > 0.00004) {
      job.trail.push(pt);
    }
    persist();
    paint();
    const acc = Math.round(pos.coords.accuracy);
    statusEl.textContent = "Precise GPS on · accuracy about " + acc + " meters";
  }, (err) => {
    statusEl.textContent = err.code === 1
      ? "Location was blocked. In the phone settings, allow Precise Location for this site."
      : "GPS error: " + err.message;
  }, {
    enableHighAccuracy: true,
    maximumAge: 1000,
    timeout: 20000
  });
}

document.getElementById("allowGps").addEventListener("click", startGps);
document.getElementById("stopGps").addEventListener("click", () => {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  statusEl.textContent = "GPS stopped. Trail is saved on this job link.";
});

document.getElementById("logDoors").addEventListener("click", () => {
  if (!job) return;
  job.done = Math.max(0, (job.done || 0) + Number(document.getElementById("inc").value || 0));
  persist();
  renderStats();
});

document.getElementById("shareLink").addEventListener("click", async () => {
  persist();
  try {
    await navigator.clipboard.writeText(location.href);
    statusEl.textContent = "Job link copied.";
  } catch {
    prompt("Copy job link", location.href);
  }
});

if (job) {
  document.getElementById("permCity").textContent = job.city;
  renderStats();
  paint();
  if (job.startedAt) {
    gate.hidden = true;
    live.hidden = false;
    startGps();
  }
} else {
  document.getElementById("permCity").textContent = "No booked route";
  paint();
}
clock();
