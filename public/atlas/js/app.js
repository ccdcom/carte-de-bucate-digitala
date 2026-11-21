/* ==========================================================================
   Interactive Culinary Atlas of the World — version 1 (Michelin only)
   Created by Christian Coandă
   ========================================================================== */
(function () {
  "use strict";
  const CFG = window.ATLAS_CONFIG;
  const POS = window.CITY_POSITIONS || {};
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const starsText = (n) => "⭐".repeat(n);

  /* ---- Place restaurants: same-city restaurants are spread slightly so each is clickable */
  const byCity = {};
  const items = (window.MICHELIN || []).map((r, i) => {
    const key = r.city + "|" + r.country;
    const p = POS[key];
    if (!p) { console.warn("No position for", key); return null; }
    const k = (byCity[key] = (byCity[key] || 0) + 1) - 1;
    const ang = k * 2.399963, rad = k ? 0.018 * Math.sqrt(k) : 0;   // golden-angle spiral, ~2 km steps
    return Object.assign({ id: i, lat: p[0] + rad * Math.sin(ang), lng: p[1] + rad * Math.cos(ang) / Math.cos(p[0] * Math.PI / 180), _q: norm(r.name + " " + r.city + " " + r.country) }, r);
  }).filter(Boolean);

  const state = { stars: new Set([1, 2, 3]), country: null, selected: null };
  const visible = () => items.filter((r) => state.stars.has(r.stars) && (!state.country || r.country === state.country));

  /* ---- Globe */
  let globe, idleTimer;
  function initGlobe() {
    const g = CFG.globe;
    globe = Globe({ animateIn: true })($("#globe"))
      .globeImageUrl(g.texture)
      .bumpImageUrl(g.bump)
      .backgroundImageUrl(g.stars)
      .showAtmosphere(true)
      .atmosphereColor(g.atmosphereColor)
      .atmosphereAltitude(g.atmosphereAltitude)
      .pointLat("lat").pointLng("lng")
      .pointColor((d) => (state.selected && state.selected.id === d.id ? "#ffffff" : CFG.starColors[d.stars]))
      .pointAltitude((d) => (d.stars === 3 ? 0.014 : d.stars === 2 ? 0.004 : 0.002))
      .pointRadius((d) => (d.stars === 3 ? 0.34 : d.stars === 2 ? 0.17 : 0.11))
      .pointResolution(10)
      .pointsMerge(false)
      .pointsTransitionDuration(0)
      .pointLabel((d) => `<div class="hover-label">${starsText(d.stars)} ${esc(d.name)}</div>`)
      .onPointClick(select)
      .onGlobeClick(closeCard)
      .pointOfView(g.startView, 0);

    const ctl = globe.controls();
    ctl.autoRotate = true;
    ctl.autoRotateSpeed = g.autoRotateSpeed;
    ctl.enableZoom = true;
    ctl.zoomSpeed = 0.9;
    ctl.minDistance = 101.5;
    ctl.maxDistance = 600;
    ctl.addEventListener("start", pauseRotation);

    const size = () => globe.width(innerWidth).height(innerHeight);
    size(); addEventListener("resize", size);
    render();
    globe.onGlobeReady(() => $("#loader").classList.add("gone"));
    setTimeout(() => $("#loader").classList.add("gone"), 6000);
  }

  function pauseRotation() {
    globe.controls().autoRotate = false;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (!state.selected) globe.controls().autoRotate = true; }, CFG.globe.idleSeconds * 1000);
  }

  function render() { globe.pointsData(visible()); }

  /* ---- Gold laurel crest: 1★ thin laurels, 2★ richer, 3★ full wreath + small crown */
  function crest(letter, stars) {
    const cx = 100, cy = 96, R = 62;
    const cfg = { 1: { n: 6, span: [118, 205], inner: false, w: 0.65 },
                  2: { n: 9, span: [112, 238], inner: true,  w: 0.85 },
                  3: { n: 11, span: [104, 262], inner: true, w: 1 } }[stars] || { n: 6, span: [118, 205], inner: false, w: 0.65 };
    const leaf = "M0,0 C4.5,-6 4.5,-15 0,-21 C-4.5,-15 -4.5,-6 0,0Z";
    // build the left branch, then mirror it exactly for the right one
    const [a0, a1] = cfg.span, rad = (x) => x * Math.PI / 180;
    const pt = (ang, r = R) => [cx + r * Math.cos(rad(ang)), cy + r * Math.sin(rad(ang))];
    let d = "";
    for (let k = 0; k <= 24; k++) { const [x, y] = pt(a0 + (a1 - a0) * k / 24); d += (k ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1); }
    let half = `<path d="${d}" fill="none" stroke="url(#gold)" stroke-width="1.6" stroke-linecap="round"/>`;
    for (let i = 0; i < cfg.n; i++) {
      const t = (i + 0.5) / cfg.n, ang = a0 + (a1 - a0) * t, [x, y] = pt(ang);
      const sc = (0.8 + 0.3 * Math.sin(Math.PI * t)) * (stars === 1 ? 0.85 : 1);
      const dir = ang - 180;                                   // leaf follows the stem upward
      half += `<path d="${leaf}" transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${(dir - 34).toFixed(1)}) scale(${(cfg.w * sc).toFixed(2)},${sc.toFixed(2)})" fill="url(#gold)"/>`;
      if (cfg.inner) half += `<path d="${leaf}" transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${(dir + 34).toFixed(1)}) scale(${(cfg.w * sc * 0.85).toFixed(2)},${(sc * 0.85).toFixed(2)})" fill="url(#goldDeep)"/>`;
      if (stars === 3 && i % 3 === 1) { const [bx, by] = pt(ang, R - 11); half += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="2.2" fill="url(#gold)"/>`; }
    }
    const leaves = half + `<g transform="translate(200,0) scale(-1,1)">${half}</g>`, berries = "";
    const crown = stars === 3 ? `<path d="M84,30 L86,16 L93,24 L100,11 L107,24 L114,16 L116,30 Z" fill="url(#gold)" stroke="#fff3c4" stroke-width=".6"/>
      <rect x="83.5" y="30" width="33" height="4" rx="1.5" fill="url(#goldDeep)"/>
      <circle cx="100" cy="11" r="2" fill="#fff6d8"/><circle cx="86" cy="16" r="1.5" fill="#fff6d8"/><circle cx="114" cy="16" r="1.5" fill="#fff6d8"/>` : "";
    const ribbon = stars >= 2 ? `<path d="M88,158 Q100,152 112,158 L108,166 Q100,162 92,166 Z" fill="url(#goldDeep)"/>` : "";
    return `<svg class="crest" viewBox="0 0 200 176" aria-hidden="true">
      <defs>
        <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4c2"/><stop offset=".45" stop-color="#f2c94c"/><stop offset=".75" stop-color="#c9971f"/><stop offset="1" stop-color="#f7d774"/></linearGradient>
        <linearGradient id="goldDeep" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e6b83a"/><stop offset="1" stop-color="#9c7414"/></linearGradient>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <g filter="url(#glow)">${leaves}${berries}${crown}${ribbon}</g>
      <text x="100" y="${cy + 2}" text-anchor="middle" dominant-baseline="central" class="crest-letter" fill="url(#gold)" filter="url(#glow)">${esc(letter)}</text>
    </svg>`;
  }

  /* ---- Card */
  function select(r) {
    state.selected = r;
    pauseRotation();
    render();
    const q = encodeURIComponent(`${r.name} ${r.city} ${r.country}`);
    const href = r.website || "https://www.google.com/search?q=" + q + "%20restaurant";
    const rank = ["", "One Michelin Star", "Two Michelin Stars", "Three Michelin Stars"][r.stars];
    const mono = r.name.replace(/^(the|le|la|il|el|restaurant)\s+/i, "").charAt(0).toUpperCase();
    const info = [
      r.chef && ["👨‍🍳", r.chef],
      r.cuisine && ["🍽", r.cuisine],
      r.address && ["📍", r.address],
      r.phone && ["📞", r.phone]
    ].filter(Boolean);
    const btn = (url, label, ghost) => `<a class="card-btn${ghost ? " ghost" : ""}" href="${esc(url)}" target="_blank" rel="noopener">${label}</a>`;
    $("#card").innerHTML = `
      <button class="card-close" aria-label="Close">×</button>
      <div class="card-photo s${r.stars}">
        ${r.image ? `<img src="${esc(r.image)}" alt="${esc(r.name)}" />` : crest(mono, r.stars)}
      </div>
      <div class="card-body s${r.stars}">
        <div class="card-stars">${starsText(r.stars)}</div>
        <div class="card-rank">${rank}</div>
        <h3>${esc(r.name)}</h3>
        <p class="card-place">${esc(r.city)}, ${esc(r.country)}</p>
        <ul class="card-info">${info.map(([i, t]) => `<li><span>${i}</span><span>${esc(t)}</span></li>`).join("")}</ul>
        <div class="card-actions">
          ${btn(href, r.website ? "🌐 Website" : "🌐 Find Website")}
          ${r.reservation ? btn(r.reservation, "🗓 Reserve") : ""}
          ${btn("https://www.google.com/maps/search/?api=1&query=" + q, "📍 Google Maps", true)}
          ${r.phone ? btn("tel:" + r.phone.replace(/[^+\d]/g, ""), "📞 Call", true) : ""}
        </div>
      </div>`;
    $("#card").hidden = false;
    $("#card .card-close").onclick = closeCard;
    const alt = Math.min(globe.pointOfView().altitude, 0.9);
    globe.pointOfView({ lat: r.lat, lng: r.lng, altitude: alt }, 1200);
  }
  function closeCard() {
    if (!state.selected) return;
    state.selected = null;
    $("#card").hidden = true;
    render();
    pauseRotation();
  }

  /* ---- Star filters */
  function buildFilters() {
    const box = $("#starFilters");
    box.innerHTML = [1, 2, 3].map((n) => {
      const c = items.filter((r) => r.stars === n).length;
      const on = state.stars.has(n);
      return `<button class="chip ${on ? "on" : ""} s${n}" data-stars="${n}" aria-pressed="${on}" ${c ? "" : 'title="Not in the database yet"'}>
        <span class="dot"></span>${starsText(n)}<span class="count">${c}</span></button>`;
    }).join("");
    box.onclick = (e) => {
      const b = e.target.closest("[data-stars]"); if (!b) return;
      const n = +b.dataset.stars;
      state.stars.has(n) ? state.stars.delete(n) : state.stars.add(n);
      b.classList.toggle("on", state.stars.has(n));
      b.setAttribute("aria-pressed", state.stars.has(n));
      render(); buildCountries();
    };
  }

  /* ---- Countries (alphabetical) */
  function buildCountries() {
    const counts = {};
    items.filter((r) => state.stars.has(r.stars)).forEach((r) => (counts[r.country] = (counts[r.country] || 0) + 1));
    const names = Object.keys(counts).sort((a, b) => a.localeCompare(b, "en"));
    const total = names.reduce((s, n) => s + counts[n], 0);
    $("#countryList").innerHTML =
      `<li><button data-country="" class="${state.country ? "" : "on"}">All countries<span>${total}</span></button></li>` +
      names.map((n) => `<li><button data-country="${esc(n)}" class="${state.country === n ? "on" : ""}">${esc(n)}<span>${counts[n]}</span></button></li>`).join("");
  }
  $("#countryList").addEventListener("click", (e) => {
    const b = e.target.closest("[data-country]"); if (!b) return;
    state.country = b.dataset.country || null;
    closeCard(); render(); buildCountries();
    if (state.country) {
      const pts = items.filter((r) => r.country === state.country);
      const lat = pts.reduce((s, r) => s + r.lat, 0) / pts.length;
      const lng = pts.reduce((s, r) => s + r.lng, 0) / pts.length;
      const spread = Math.max(...pts.map((r) => Math.hypot(r.lat - lat, r.lng - lng)));
      pauseRotation();
      globe.pointOfView({ lat, lng, altitude: Math.min(1.6, Math.max(0.35, spread / 12)) }, 1400);
    }
  });

  /* ---- Search: restaurant, city, country */
  const input = $("#searchInput"), list = $("#searchResults");
  input.addEventListener("input", () => {
    const q = norm(input.value.trim());
    if (q.length < 2) { list.innerHTML = ""; return; }
    const hits = items.filter((r) => r._q.includes(q))
      .sort((a, b) => (norm(b.name).startsWith(q) - norm(a.name).startsWith(q)) || b.stars - a.stars)
      .slice(0, 12);
    list.innerHTML = hits.length
      ? hits.map((r) => `<li role="option" data-id="${r.id}"><span class="sr-stars s${r.stars}">${starsText(r.stars)}</span><b>${esc(r.name)}</b><small>${esc(r.city)}, ${esc(r.country)}</small></li>`).join("")
      : `<li class="none">No results</li>`;
  });
  list.addEventListener("click", (e) => {
    const li = e.target.closest("[data-id]"); if (!li) return;
    const r = items.find((x) => x.id === +li.dataset.id);
    if (!state.stars.has(r.stars)) { state.stars.add(r.stars); buildFilters(); }
    if (state.country && state.country !== r.country) { state.country = null; }
    buildCountries();
    list.innerHTML = ""; input.value = "";
    select(r);
  });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { const f = list.querySelector("[data-id]"); if (f) f.click(); } });
  addEventListener("keydown", (e) => { if (e.key === "Escape") closeCard(); });

  /* ---- Panel collapse, links */
  $("#panelToggle").onclick = () => $("#panel").classList.toggle("collapsed");
  $("#brand").href = CFG.links.logo;

  /* ---- Europe on a Plate panel */
  const eop = $("#eopModal"), eopBtn = $("#eopBtn");
  $("#eopBuy").href = CFG.amazonUrl;
  function openEop() {
    eop.hidden = false;
    requestAnimationFrame(() => eop.classList.add("open"));
    document.body.classList.add("eop-lock");
    eop.querySelector(".eop-close").focus();
  }
  function closeEop() {
    if (eop.hidden) return;
    eop.classList.remove("open");
    document.body.classList.remove("eop-lock");
    setTimeout(() => { eop.hidden = true; }, 320);
    eopBtn.focus();
  }
  eopBtn.onclick = openEop;
  eop.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeEop(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !eop.hidden) { e.stopImmediatePropagation(); closeEop(); } }, true);

  /* ---- Visitor counter (works on the live site; hidden if unavailable) */
  let visitors = null;
  (async () => {
    let seen = false;
    try { seen = localStorage.getItem("ccd-atlas-vizitat") === "1"; } catch (e) {}
    try {
      const r = await fetch("/api/vizitatori" + (seen ? "" : "?nou=1"));
      if (!r.ok) return;
      const j = await r.json();
      visitors = j.vizitatori;
      const v = $("#visitors");
      v.textContent = Number(visitors).toLocaleString("ro-RO");
      v.hidden = false;
      try { localStorage.setItem("ccd-atlas-vizitat", "1"); } catch (e) {}
    } catch (e) { /* no counter */ }
  })();

  buildFilters();
  buildCountries();
  initGlobe();
})();
