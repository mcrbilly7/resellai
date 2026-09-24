function drawMetroMap(svg, opts) {
  const w = 800;
  const h = 640;
  opts = opts || {};
  svg.setAttribute("viewBox", "0 0 " + w + " " + h);
  svg.innerHTML = "";

  const ns = "http://www.w3.org/2000/svg";
  function el(name, attrs) {
    const n = document.createElementNS(ns, name);
    Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v));
    return n;
  }

  svg.appendChild(el("rect", { width: w, height: h, fill: "#e7e2d8" }));

  const grid = el("g", { stroke: "#d3cdc2", "stroke-width": "1" });
  for (let i = 1; i < 8; i++) {
    grid.appendChild(el("line", { x1: 0, y1: i * h / 8, x2: w, y2: i * h / 8 }));
    grid.appendChild(el("line", { x1: i * w / 8, y1: 0, x2: i * w / 8, y2: h }));
  }
  svg.appendChild(grid);

  ROADS.forEach((road) => {
    const d = road.pts.map((p, i) => {
      const [x, y] = project(p[0], p[1], w, h);
      return (i ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    svg.appendChild(el("path", { d, fill: "none", stroke: "#c5bba8", "stroke-width": "6", "stroke-linecap": "round" }));
    svg.appendChild(el("path", { d, fill: "none", stroke: "#8a8376", "stroke-width": "2", "stroke-dasharray": "8 10" }));
  });

  const group = el("g", { class: "cities" });
  CITIES.forEach((c) => {
    const [x, y] = project(c.lat, c.lng, w, h);
    const g = el("g", { class: "city-dot" + (opts.selected === c.name ? " selected" : ""), "data-city": c.name, transform: "translate(" + x + "," + y + ")" });
    g.appendChild(el("circle", { r: c.name === "Dallas" ? 9 : 6, fill: c.name === "Dallas" ? "#1d3a2a" : "#8b3a2a", stroke: "#fff", "stroke-width": "2" }));
    const label = el("text", { x: 10, y: 4, "font-size": "11", fill: "#2a2723", "font-family": "Georgia, serif" });
    label.textContent = c.name;
    g.appendChild(label);
    g.addEventListener("click", (e) => {
      e.stopPropagation();
      if (opts.onSelect) opts.onSelect(c);
    });
    group.appendChild(g);
  });
  svg.appendChild(group);

  if (opts.path && opts.path.length) {
    const d = opts.path.map((p, i) => {
      const [x, y] = project(p[0], p[1], w, h);
      return (i ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    svg.appendChild(el("path", { d, fill: "none", stroke: "#1d3a2a", "stroke-width": "3", "stroke-linecap": "round" }));
    opts.path.forEach((p) => {
      const [x, y] = project(p[0], p[1], w, h);
      svg.appendChild(el("circle", { cx: x, cy: y, r: 4, fill: "#1d3a2a" }));
    });
  }

  if (opts.here) {
    const [x, y] = project(opts.here[0], opts.here[1], w, h);
    svg.appendChild(el("circle", { cx: x, cy: y, r: 16, fill: "rgba(29,58,42,0.15)" }));
    svg.appendChild(el("circle", { cx: x, cy: y, r: 6, fill: "#1d3a2a", stroke: "#fff", "stroke-width": "2" }));
  }

  const note = el("text", { x: 16, y: h - 16, fill: "#6b655c", "font-size": "11" });
  note.textContent = "Built-in DFW map · cities within 30 minutes of Dallas";
  svg.appendChild(note);
  return { w, h };
}
