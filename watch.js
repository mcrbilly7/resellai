let job = null;
if (location.hash.length > 1) job = decodeJob(location.hash.slice(1));
if (!job) job = loadJob();

const svg = document.getElementById("watchMap");

function paint() {
  drawMetroMap(svg, {
    selected: job && job.city,
    path: job && ((job.trail && job.trail.length) ? job.trail : job.path),
    here: job && job.here
  });
}

if (job) {
  const kind = job.kind === "apartment" ? "apartments" : "houses";
  document.getElementById("jobTitle").textContent = job.city + " · " + kind;
  document.getElementById("statDone").textContent = (job.done || 0).toLocaleString();
  document.getElementById("statGoal").textContent = (job.doors || 0).toLocaleString();
  document.getElementById("statKind").textContent = job.kind === "apartment" ? "Apt" : "House";
  const pct = job.doors ? Math.min(100, Math.round((job.done || 0) / job.doors * 100)) : 0;
  document.getElementById("meterFill").style.width = pct + "%";
  document.getElementById("statPct").textContent = pct + "% of the booked doors";
  if (job.startedAt) {
    document.getElementById("updated").textContent = "Crew started " + new Date(job.startedAt).toLocaleString();
  }
} else {
  document.getElementById("updated").textContent = "No job in this link yet. Book a route first.";
}
paint();
