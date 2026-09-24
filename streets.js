function makeStreetMap(el) {
  const map = L.map(el, { zoomControl: true }).setView([32.7767, -96.7970], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);
  return { map: map, line: null, here: null, path: null };
}

function paintStreets(view, job) {
  const path = (job.trail && job.trail.length) ? job.trail : (job.path || []);
  if (path.length) {
    if (view.line) view.map.removeLayer(view.line);
    view.line = L.polyline(path, { color: "#0f2744", weight: 4 }).addTo(view.map);
  }
  if (job.here) {
    if (!view.here) {
      view.here = L.circleMarker(job.here, { radius: 8, color: "#fff", weight: 2, fillColor: "#0f2744", fillOpacity: 1 }).addTo(view.map);
    } else {
      view.here.setLatLng(job.here);
    }
    view.map.setView(job.here, Math.max(view.map.getZoom(), 16));
  } else if (path.length) {
    view.map.fitBounds(L.latLngBounds(path), { padding: [24, 24] });
  }
}
