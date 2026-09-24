function estimateDoors(path) {
  if (typeof countAlong === "function" && geo && path && path.length >= 2) {
    return countAlong(geo, path);
  }
  return { houses: 0, apts: 0 };
}

function localRoutes() {
  return [];
}

function setCounts(h, a) {
  lastPick.houses = h;
  lastPick.apts = a;
  const hEl = document.getElementById("bookHouses");
  const aEl = document.getElementById("bookApts");
  if (hEl) hEl.value = String(h);
  if (aEl) aEl.value = String(a);
  if (typeof updatePrice === "function") updatePrice();
}

const _updatePrice = updatePrice;
updatePrice = function () {
  const hEl = document.getElementById("bookHouses");
  const aEl = document.getElementById("bookApts");
  if (hEl) lastPick.houses = parseInt(hEl.value, 10) || 0;
  if (aEl) lastPick.apts = parseInt(aEl.value, 10) || 0;
  _updatePrice();
};

loadCity = async function () {
  const match = CITIES.find(function (c) { return c.name.toLowerCase() === cityInput.value.trim().toLowerCase(); });
  if (!match) {
    mapHint.textContent = "Pick a city within 30 minutes of Dallas.";
    return;
  }
  selected = match;
  corners = [];
  setCounts(0, 0);
  showGoogle(match.lat, match.lng, 16, match.name + ", TX");
  mapHint.textContent = "Counting real buildings in " + match.name + "…";
  try {
    geo = typeof loadCityGeo === "function" ? await loadCityGeo(match) : { streets: [], houses: [], apts: [] };
  } catch (err) {
    geo = { streets: [], houses: [], apts: [] };
  }
  premade = typeof twentyRoutes === "function" ? twentyRoutes(geo, match) : [];
  renderRouteList();
  if (premade.length) {
    mapHint.textContent = geo.houses.length + " houses and " + geo.apts.length + " apartments found in " + match.name + " from the building map. Numbers on each street are counted doors, not guesses.";
  } else {
    mapHint.textContent = "No building file for that city yet. Type the real house and apartment counts.";
  }
};

["bookHouses", "bookApts"].forEach(function (id) {
  const el = document.getElementById(id);
  if (el) el.addEventListener("input", function () { updatePrice(); });
});
