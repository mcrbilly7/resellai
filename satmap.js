function showGoogle(lat, lng, zoom, label) {
  const frame = document.getElementById("bookMap");
  if (!frame) return;
  const z = zoom || 16;
  const q = label ? encodeURIComponent(label) : (lat + "," + lng);
  frame.src = "https://www.google.com/maps?q=" + q + "&ll=" + lat + "," + lng + "&z=" + z + "&hl=en&t=h&output=embed";
  const a = document.getElementById("openGmaps");
  if (a) a.href = "https://www.google.com/maps/@?api=1&map_action=map&center=" + lat + "," + lng + "&zoom=" + z + "&basemap=satellite";
}
function ensureSat() { return null; }
function drawOfflineCity() { return null; }
function paintSatDraw() { return null; }
