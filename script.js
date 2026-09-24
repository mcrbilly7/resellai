const RATE = 0.25;
const TRAVEL_FEE = 15;
const WAIVE_AT = 1000;

const DFW_CITIES = [
  "Dallas",
  "Fort Worth",
  "Arlington",
  "Plano",
  "Irving",
  "Garland",
  "Frisco",
  "McKinney",
  "Grand Prairie",
  "Denton",
  "Mesquite",
  "Carrollton",
  "Lewisville",
  "Richardson",
  "Allen",
  "Flower Mound",
  "Mansfield",
  "Rowlett",
  "Euless",
  "DeSoto",
  "Grapevine",
  "Bedford",
  "Cedar Hill",
  "Wylie",
  "Keller",
  "The Colony",
  "Haltom City",
  "Rockwall",
  "Burleson",
  "Little Elm",
  "North Richland Hills",
  "Hurst",
  "Farmers Branch",
  "Coppell",
  "Lancaster",
  "Duncanville",
  "Southlake",
  "Colleyville",
  "Waxahachie",
  "Midlothian",
  "Prosper",
  "Sachse",
  "University Park",
  "Highland Park",
  "Addison",
  "Balch Springs",
  "Seagoville",
  "Forney",
  "Anna",
  "Celina",
  "Melissa",
  "Princeton",
  "Murphy",
  "Fairview",
  "Trophy Club",
  "Roanoke",
  "Haslet",
  "Saginaw",
  "Benbrook",
  "White Settlement",
  "Crowley",
  "Cleburne",
  "Weatherford",
  "Azle",
  "Forest Hill",
  "Richland Hills",
  "Watauga",
  "Kennedale",
  "Red Oak",
  "Glenn Heights",
  "Hutchins",
  "Wilmer",
  "Sunnyvale",
  "Terrell",
  "Greenville",
  "Sherman",
  "Denison",
  "Aubrey",
  "Pilot Point",
  "Sanger",
  "Argyle",
  "Justin",
  "Krum",
  "Lake Dallas",
  "Corinth",
  "Hickory Creek",
  "Highland Village",
  "Double Oak",
  "Copper Canyon",
  "Lantana",
  "Providence Village",
  "Oak Point",
  "Cross Roads",
  "Savannah",
  "Prosper",
  "McLendon-Chisholm",
  "Heath",
  "Fate",
  "Royse City",
  "Nevada",
  "Josephine",
  "Lavon",
  "Wylie",
  "Lucas",
  "Parker",
  "St. Paul",
  "Caddo Mills",
  "Farmersville",
  "Princeton",
  "Lowry Crossing",
  "New Hope",
  "Weston",
  "Gunter",
  "Van Alstyne",
  "Anna",
  "Melissa",
  "Weston",
  "Alvarado",
  "Keene",
  "Venus",
  "Joshua",
  "Godley",
  "Granbury",
  "Aledo",
  "Willow Park",
  "Hudson Oaks",
  "Springtown",
  "Decatur",
  "Bridgeport",
  "Ennis",
  "Waxahachie",
  "Italy",
  "Palmer",
  "Ferris",
  "Ovilla",
  "Pantego",
  "Dalworthington Gardens"
];

const uniqueCities = [...new Set(DFW_CITIES)].sort((a, b) => a.localeCompare(b));

function normalizeCity(value) {
  return value.trim().toLowerCase().replace(/,?\s*tx$/, "").replace(/\s+/g, " ");
}

function isDallas(city) {
  return normalizeCity(city) === "dallas";
}

function findCity(input) {
  const n = normalizeCity(input);
  return uniqueCities.find((c) => normalizeCity(c) === n) || null;
}

function money(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function renderCities() {
  const list = document.getElementById("cityList");
  const chips = document.getElementById("cityChips");
  uniqueCities.forEach((city) => {
    const option = document.createElement("option");
    option.value = city;
    list.appendChild(option);

    const chip = document.createElement("span");
    chip.className = "chip" + (city === "Dallas" ? " dallas" : "");
    chip.textContent = city === "Dallas" ? "Dallas (no travel fee)" : city;
    chips.appendChild(chip);
  });
}

function calculate(doors, cityName) {
  const matched = findCity(cityName);
  if (!matched) {
    return {
      ok: false,
      html: `<p><strong>${cityName}</strong> is outside our current coverage.</p><p>Nossonk LLC only services the DFW Metroplex right now. Pick a listed city or call <a href="tel:+19452395974">(945) 239-5974</a> to ask about a nearby route.</p>`
    };
  }

  const qty = Math.max(0, Math.floor(doors));
  if (!qty) {
    return { ok: false, html: "<p>Enter a door count of at least 1.</p>" };
  }

  const distribution = qty * RATE;
  const dallas = isDallas(matched);
  const travelWaived = qty >= WAIVE_AT;
  const travel = dallas || travelWaived ? 0 : TRAVEL_FEE;
  const total = distribution + travel;

  const travelNote = dallas
    ? "No travel fee — Dallas is home base."
    : travelWaived
      ? `$15 travel fee waived at ${WAIVE_AT.toLocaleString()} doors.`
      : `$15 travel fee applies outside Dallas. Add ${(WAIVE_AT - qty).toLocaleString()} more doors to waive it.`;

  return {
    ok: true,
    html: `
      <p>Estimate for <strong>${qty.toLocaleString()} doors</strong> in <strong>${matched}</strong></p>
      <p class="total">${money(total)}</p>
      <p>${qty.toLocaleString()} × ${money(RATE)} = ${money(distribution)}</p>
      <p>Travel fee: ${money(travel)}</p>
      <p>${travelNote}</p>
      <p class="fine">Distribution only. Printing not included. Confirm the route by call or text.</p>
    `
  };
}

document.getElementById("year").textContent = new Date().getFullYear();
renderCities();

const form = document.getElementById("calcForm");
const result = document.getElementById("calcResult");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const doors = Number(document.getElementById("doors").value);
  const city = document.getElementById("city").value;
  const out = calculate(doors, city);
  result.hidden = false;
  result.classList.toggle("bad", !out.ok);
  result.innerHTML = out.html;
});

["doors", "city"].forEach((id) => {
  document.getElementById(id).addEventListener("input", () => {
    if (!result.hidden) {
      const doors = Number(document.getElementById("doors").value);
      const city = document.getElementById("city").value;
      if (!city || !doors) return;
      const out = calculate(doors, city);
      result.classList.toggle("bad", !out.ok);
      result.innerHTML = out.html;
    }
  });
});

document.getElementById("contactForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(e.target);
  const subject = encodeURIComponent("Nossonk LLC door hanger request");
  const body = encodeURIComponent(
    `Name: ${data.get("name")}\nReach me at: ${data.get("reply")}\nJob: ${data.get("job") || "—"}\n\n${data.get("message") || ""}`
  );
  window.location.href = `mailto:noskotx@gmail.com?subject=${subject}&body=${body}`;
});

const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");
menuBtn.addEventListener("click", () => navLinks.classList.toggle("open"));
navLinks.querySelectorAll("a").forEach((a) => {
  a.addEventListener("click", () => navLinks.classList.remove("open"));
});
