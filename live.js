function LiveHost(job) {
  const conns = [];
  let peer = null;
  if (typeof Peer !== "undefined" && job && job.id) {
    try {
      peer = new Peer("nk" + String(job.id).replace(/[^a-z0-9]/gi, "").slice(0, 20));
      peer.on("connection", function (c) {
        conns.push(c);
        c.on("open", function () { try { c.send(job); } catch (e) {} });
      });
    } catch (err) {}
  }
  return {
    publish: function (j) {
      try { localStorage.setItem("nk-live-" + j.id, JSON.stringify(j)); } catch (e) {}
      conns.forEach(function (c) { try { c.send(j); } catch (e) {} });
    }
  };
}

function LiveWatch(job, onJob) {
  const id = job && job.id;
  if (typeof Peer !== "undefined" && id) {
    try {
      const peer = new Peer();
      peer.on("open", function () {
        const c = peer.connect("nk" + String(id).replace(/[^a-z0-9]/gi, "").slice(0, 20));
        c.on("data", function (d) { if (d) onJob(d); });
      });
    } catch (err) {}
  }
  window.addEventListener("storage", function (e) {
    if (e.key === "nk-live-" + id && e.newValue) {
      try { onJob(JSON.parse(e.newValue)); } catch (err) {}
    }
  });
  try {
    const raw = localStorage.getItem("nk-live-" + id);
    if (raw) onJob(JSON.parse(raw));
  } catch (err) {}
}
