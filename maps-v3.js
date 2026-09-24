function streetLayers() {
  const streets = L.tileLayer("https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png", {
    maxZoom: 20,
    attribution: "&copy; OpenStreetMap France"
  });
  const satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19,
    attribution: "Tiles &copy; Esri"
  });
  return { streets: streets, satellite: satellite };
}

function makeStreetMap(el) {
  const layers = streetLayers();
  const map = L.map(el, { zoomControl: true, layers: [layers.streets] }).setView([32.7767, -96.7970], 14);
  L.control.layers({ Streets: layers.streets, Satellite: layers.satellite }).addTo(map);
  return { map: map, line: null, here: null, markers: [] };
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
    view.map.setView(job.here, Math.max(view.map.getZoom(), 17));
  } else if (path.length) {
    view.map.fitBounds(L.latLngBounds(path), { padding: [24, 24] });
  }
}
