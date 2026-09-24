function roomId(job) {
  return "nsk" + String(job && job.id || "open").replace(/[^a-z0-9]/gi, "").slice(0, 16);
}

function snapshot(job) {
  const trail = (job.trail || []).slice(-200);
  return {
    id: job.id,
    city: job.city,
    doors: job.doors,
    done: job.done,
    houses: job.houses,
    apts: job.apts,
    log: (job.log || []).slice(-80),
    path: job.path,
    trail: trail,
    here: job.here,
    startedAt: job.startedAt,
    liveAt: Date.now()
  };
}

function LiveHost(job) {
  const id = roomId(job);
  const peers = [];
  let peer = null;
  const chan = ("BroadcastChannel" in window) ? new BroadcastChannel("noskotx-" + id) : null;

  function send(data) {
    localStorage.setItem("noskotx-live-" + id, JSON.stringify(data));
    if (chan) chan.postMessage(data);
    peers.forEach((c) => {
      try { if (c.open) c.send(data); } catch (e) {}
    });
  }

  if (typeof Peer === "function") {
    try {
      peer = new Peer(id, { debug: 0 });
      peer.on("connection", (conn) => {
        conn.on("open", () => {
          peers.push(conn);
          conn.send(snapshot(job));
        });
      });
    } catch (e) {}
  }

  return {
    publish: function (current) {
      send(snapshot(current));
    }
  };
}

function LiveGuest(job, onUpdate) {
  const id = roomId(job);
  const chan = ("BroadcastChannel" in window) ? new BroadcastChannel("noskotx-" + id) : null;
  if (chan) chan.onmessage = (e) => onUpdate(e.data);

  window.addEventListener("storage", (e) => {
    if (e.key === "noskotx-live-" + id && e.newValue) {
      try { onUpdate(JSON.parse(e.newValue)); } catch (err) {}
    }
  });

  setInterval(() => {
    const raw = localStorage.getItem("noskotx-live-" + id);
    if (!raw) return;
    try { onUpdate(JSON.parse(raw)); } catch (err) {}
  }, 2000);

  if (typeof Peer === "function") {
    try {
      const peer = new Peer({ debug: 0 });
      peer.on("open", () => {
        const conn = peer.connect(id);
        conn.on("data", onUpdate);
        conn.on("error", () => {});
      });
    } catch (e) {}
  }
}
