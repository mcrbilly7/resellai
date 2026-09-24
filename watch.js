let job = null;
if (location.hash.length > 1) job = decodeJob(location.hash.slice(1));
if (!job) job = loadJob();
const svg = document.getElementById("watchMap");

drawMetroMap(svg, {
  selected: job && job.city,
  path: job && ((job.trail && job.trail.length) ? job.trail : job.path),
  here: job && job.here
});

if (!job) {
  document.getElementById("statPct").textContent = "No job in this link yet.";
} else {
  document.getElementById("jobTitle").textContent = job.city + " · booked " + (job.doors || 0).toLocaleString();
  document.getElementById("statHouse").textContent = (job.houses || 0).toLocaleString();
  document.getElementById("statApt").textContent = (job.apts || 0).toLocaleString();
  document.getElementById("statDone").textContent = (job.done || 0).toLocaleString();
  const pct = job.doors ? Math.min(100, Math.round((job.done || 0) / job.doors * 100)) : 0;
  document.getElementById("meterFill").style.width = pct + "%";
  document.getElementById("statPct").textContent = pct + "% complete · earned so far " + money(((job.houses||0)*0.35)+((job.apts||0)*0.30));
  const list = document.getElementById("logList");
  if (!job.log || !job.log.length) {
    list.innerHTML = "<li>Crew has not logged a door yet.</li>";
  } else {
    job.log.slice().reverse().forEach((row) => {
      const li = document.createElement("li");
      li.innerHTML = "<span>" + new Date(row.at).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}) + "</span><b>" + row.kind + "</b><span>+" + row.qty + "</span>";
      list.appendChild(li);
    });
  }
}
