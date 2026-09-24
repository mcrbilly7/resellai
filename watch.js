let job = null;
if (location.hash.length > 1) job = decodeJob(location.hash.slice(1));
if (!job) job = loadJob();
if (!job) job = { id: "open", city: "Dallas", doors: 0, done: 0, houses: 0, apts: 0, log: [], path: [], trail: [] };

const view = makeStreetMap("watchMap");
const liveNote = document.getElementById("statPct");

function apply(next) {
  if (!next) return;
  job = Object.assign(job, next);
  draw();
  stats();
}

function draw() {
  paintStreets(view, job);
}

function stats() {
  document.getElementById("jobTitle").textContent = (job.city || "Route") + " · booked " + (job.doors || 0).toLocaleString();
  document.getElementById("statHouse").textContent = (job.houses || 0).toLocaleString();
  document.getElementById("statApt").textContent = (job.apts || 0).toLocaleString();
  document.getElementById("statDone").textContent = (job.done || 0).toLocaleString();
  const pct = job.doors ? Math.min(100, Math.round((job.done || 0) / job.doors * 100)) : 0;
  document.getElementById("meterFill").style.width = pct + "%";
  const ago = job.liveAt ? Math.max(0, Math.round((Date.now() - job.liveAt) / 1000)) : null;
  liveNote.textContent = job.here
    ? ("Live GPS · " + job.here[0].toFixed(5) + ", " + job.here[1].toFixed(5) + (ago != null ? " · " + ago + "s ago" : ""))
    : "Waiting for the crew phone to share GPS.";
  const list = document.getElementById("logList");
  list.innerHTML = "";
  const rows = (job.log || []).slice().reverse();
  if (!rows.length) list.innerHTML = "<li>Crew has not logged a door yet.</li>";
  rows.forEach((row) => {
    const li = document.createElement("li");
    li.innerHTML = "<span>" + new Date(row.at).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}) + "</span><b>" + row.kind + "</b><span>+" + row.qty + "</span>";
    list.appendChild(li);
  });
}

draw();
stats();
LiveGuest(job, apply);
