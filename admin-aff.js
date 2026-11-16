/* PicksBible admin: "8. Partners" (affiliate buttons).
   Loaded by admin.html after admin-vip.js. Uses page globals: db, Store, commit, toast, esc, showTab.
   Data lives in ONE public document, public/aff = { partners:[...] }, read by the public site.
   Partner = { id, name, url, logo (192px PNG data URL), bg (tile colour), cc:[ISO2...] (empty = every country),
               on:true/false, pri:1.., pl:{bets,table,props,banker} }.
   Per-match override: fixture field affx = "" (use the dashboard) | "none" | "id1,id2". */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  /* most buttons that fit each place on a desktop screen (phones show the first N of these by priority, see app.js AFFCAP) */
  const CAP = { bets: 3, table: 2, props: 3, banker: 4 };
  const PLNAME = { bets: "Bets of the Day", table: "Football & basketball tables", props: "Player props", banker: "Banker Bet" };
  const PLS = ["bets", "table", "props", "banker"];
  const COUNTRIES = [["NG","Nigeria"],["GH","Ghana"],["KE","Kenya"],["ZA","South Africa"],["UG","Uganda"],["TZ","Tanzania"],["ZM","Zambia"],["CM","Cameroon"],["SN","Senegal"],["CI","Ivory Coast"],["ET","Ethiopia"],["EG","Egypt"],["MA","Morocco"],["DZ","Algeria"],["TN","Tunisia"],["ZW","Zimbabwe"],["RW","Rwanda"],["BW","Botswana"],["MW","Malawi"],["MZ","Mozambique"],["AO","Angola"],
    ["GB","United Kingdom"],["IE","Ireland"],["FR","France"],["ES","Spain"],["IT","Italy"],["DE","Germany"],["NL","Netherlands"],["BE","Belgium"],["PT","Portugal"],["PL","Poland"],["SE","Sweden"],["NO","Norway"],["DK","Denmark"],["FI","Finland"],["CH","Switzerland"],["AT","Austria"],["GR","Greece"],["TR","Turkey"],["RO","Romania"],["BG","Bulgaria"],["HU","Hungary"],["CZ","Czechia"],["SK","Slovakia"],["HR","Croatia"],["RS","Serbia"],["UA","Ukraine"],["RU","Russia"],
    ["US","United States"],["CA","Canada"],["MX","Mexico"],["BR","Brazil"],["AR","Argentina"],["CO","Colombia"],["CL","Chile"],["PE","Peru"],["IN","India"],["PK","Pakistan"],["BD","Bangladesh"],["LK","Sri Lanka"],["NP","Nepal"],["ID","Indonesia"],["MY","Malaysia"],["SG","Singapore"],["TH","Thailand"],["VN","Vietnam"],["PH","Philippines"],["JP","Japan"],["KR","South Korea"],["AU","Australia"],["NZ","New Zealand"],["AE","United Arab Emirates"],["SA","Saudi Arabia"],["QA","Qatar"],["KW","Kuwait"],["BH","Bahrain"],["OM","Oman"],["JO","Jordan"],["IL","Israel"]];
  const CN = Object.fromEntries(COUNTRIES);
  let partners = [], loaded = false, editId = null, form = null, dirty = false, ovDay = "";

  /* ---------- rules (same logic the public site uses) ---------- */
  const elig = (p, c) => !(p.cc || []).length || (p.cc || []).includes(c);
  function usage(pl, list) {   /* the most buttons any one country would see in this place */
    const on = list.filter(p => p.on !== false && p.pl && p.pl[pl]);
    const cs = new Set(["?"]); on.forEach(p => (p.cc || []).forEach(c => cs.add(c)));
    let m = 0; cs.forEach(c => { m = Math.max(m, on.filter(p => c === "?" ? !(p.cc || []).length : elig(p, c)).length); });
    return m;
  }
  const canTick = (p, pl) => { const t = partners.map(q => q.id === p.id ? Object.assign({}, q, { pl: Object.assign({}, q.pl, { [pl]: true }) }) : q); return usage(pl, t) <= CAP[pl]; };
  const hasLogo = p => !!(p.logo && String(p.logo).startsWith("data:image/"));
  const goodUrl = u => /^https:\/\/[^\s]+\.[^\s]+$/i.test(String(u || "").trim());
  const live = p => p.on !== false && hasLogo(p) && goodUrl(p.url);
  const uid = () => "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  /* ---------- the button, drawn exactly like the public site ---------- */
  const pill = p => `<span class="affp"><span class="lg" style="background:${esc(p.bg || "#fff")}">${hasLogo(p) ? `<img src="${esc(p.logo)}" alt="">` : `<i>${esc((p.name || "?").slice(0, 2).toUpperCase())}</i>`}</span><b>Bet</b></span>`;

  /* ---------- logo handling: fixed square canvas, contain-fit, never stretched ---------- */
  function processLogo(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = () => rej(new Error("Could not read that file."));
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => rej(new Error("That is not an image the browser can read. Use PNG, SVG, JPG or WebP."));
        img.onload = () => {
          const svg = /svg/i.test(file.type);
          const w = img.naturalWidth || (svg ? 300 : 0), h = img.naturalHeight || (svg ? 300 : 0);
          if (!w || !h) return rej(new Error("The image has no size. Try a PNG."));
          if (!svg && Math.max(w, h) < 120) return rej(new Error("Too small (" + w + "x" + h + "). Use a logo at least 120 pixels wide so it stays sharp."));
          const asp = Math.max(w / h, h / w);
          if (asp > 3) return rej(new Error("This logo is " + asp.toFixed(1) + " times wider than tall, so its text would be unreadable on a small button. Ask the partner for the square app icon, or crop it to the symbol."));
          const S = 192, c = document.createElement("canvas"); c.width = S; c.height = S;
          const x = c.getContext("2d"), k = Math.min(S / w, S / h), dw = Math.round(w * k), dh = Math.round(h * k);
          x.imageSmoothingQuality = "high"; x.drawImage(img, Math.round((S - dw) / 2), Math.round((S - dh) / 2), dw, dh);
          let lum = 0, n = 0;
          try { const d = x.getImageData(0, 0, S, S).data; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 40) { lum += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; n++; } } catch (_) {}
          res({ data: c.toDataURL("image/png"), asp, w, h, lum: n ? lum / n : 0.5, svg });
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  const hexLum = h => { const v = parseInt(String(h).replace("#", ""), 16) || 0; return (0.2126 * ((v >> 16) & 255) + 0.7152 * ((v >> 8) & 255) + 0.0722 * (v & 255)) / 255; };
  function logoChecks(f) {   /* [level, text]: ok / warn / bad */
    const o = [];
    if (!f.logo) { o.push(["bad", "No logo yet. A partner without a logo is never shown on the site."]); return o; }
    const m = f.meta || {};
    if (m.asp != null) {
      if (m.asp <= 1.6) o.push(["ok", "Shape fits the button (" + m.asp.toFixed(1) + " : 1)."]);
      else if (m.asp <= 2.4) o.push(["warn", "Wide logo (" + m.asp.toFixed(1) + " : 1). It fits but its text will be small. The square icon looks better."]);
      else o.push(["warn", "Very wide logo (" + m.asp.toFixed(1) + " : 1). Text will be hard to read. Please upload the square icon."]);
    }
    if (m.lum != null) { const d = Math.abs(m.lum - hexLum(f.bg || "#ffffff")); if (d < 0.3) o.push(["bad", "This logo is almost the same colour as its button background, so it will look invisible. Change the button colour."]); else o.push(["ok", "Logo stands out from its background."]); }
    return o;
  }

  /* ---------- load / save ---------- */
  async function load() {
    try {
      const s = await Store.fs.collection("public").doc("aff").get();
      partners = (s.exists && s.data().partners) || [];
      partners.forEach(p => { p.cc = p.cc || []; p.pl = p.pl || {}; });
      loaded = true; dirty = false; paint();
    } catch (e) { $("#affMsg").textContent = "Could not load partners: " + (e.code || e.message); }
  }
  async function save() {
    const bad = partners.find(p => p.on !== false && !live(p));
    if (bad && !confirm(bad.name + " is switched on but has no logo or no valid https link, so it will NOT show on the site. Save anyway?")) return;
    try {
      partners.forEach((p, i) => p.pri = i + 1);
      await Store.fs.collection("public").doc("aff").set(JSON.parse(JSON.stringify({ partners, updatedAt: new Date().toISOString() })));
      dirty = false; paint(); toast("Partners published to the site");
    } catch (e) { toast("Save failed: " + (e.code || e.message)); }
  }
  const touch = () => { dirty = true; paint(); };

  /* ---------- DOM ---------- */
  function mount() {
    const nav = document.querySelector("nav.tabs");
    if (!nav || $("#tab-aff")) return;
    const btn = document.createElement("button");
    btn.setAttribute("role", "tab"); btn.dataset.tab = "aff"; btn.setAttribute("aria-selected", "false"); btn.textContent = "8. Partners";
    (nav.querySelector('[data-tab="vip"]') || nav.querySelector('[data-tab="results"]')).insertAdjacentElement("afterend", btn);
    btn.onclick = () => { showTab("aff"); if (!loaded) load(); else paint(); };
    const sec = document.createElement("section"); sec.id = "tab-aff"; sec.hidden = true;
    sec.innerHTML = `<style>
#tab-aff .caps{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin-bottom:14px}
#tab-aff .cap{background:var(--panel-2);border:1px solid var(--line);border-radius:10px;padding:10px 12px}
#tab-aff .cap b{display:block;font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
#tab-aff .cap .n{font-size:22px;font-weight:800}#tab-aff .cap.full .n{color:var(--pend)}
#tab-aff .bar{height:5px;border-radius:5px;background:var(--bg);margin-top:6px;overflow:hidden}#tab-aff .bar i{display:block;height:100%;background:var(--cyan)}#tab-aff .cap.full .bar i{background:var(--pend)}
#tab-aff table{width:100%;border-collapse:collapse}
#tab-aff th{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;text-align:left;padding:6px 8px}
#tab-aff td{padding:8px;border-top:1px solid var(--line);vertical-align:middle}
#tab-aff .c{text-align:center}
#tab-aff .tile{width:44px;height:44px;border-radius:10px;border:1px solid #d3d9e6;display:grid;place-items:center;padding:5px;overflow:hidden}
#tab-aff .tile img{max-width:100%;max-height:100%;display:block;object-fit:contain}
#tab-aff .tile.none{background:#7f1d1d;color:#fff;font-size:10px;font-weight:800;text-align:center;border-color:#b91c1c}
#tab-aff .chip{display:inline-block;background:#1d4ed833;color:#93c5fd;border-radius:20px;padding:2px 9px;font-size:12px;margin:1px 3px 1px 0}
#tab-aff .chip button{background:none;border:0;color:inherit;cursor:pointer;font-weight:800;padding:0 0 0 4px}
#tab-aff .badge{display:inline-block;border-radius:6px;padding:1px 7px;font-size:11px;font-weight:800;margin-left:6px}
#tab-aff .badge.bad{background:#7f1d1d;color:#fecaca}#tab-aff .badge.ok{background:#14532d;color:#bbf7d0}
#tab-aff input[type=checkbox]{width:20px;height:20px;accent-color:#3b82f6}
#tab-aff input[type=checkbox]:disabled{opacity:.3;cursor:not-allowed}
#tab-aff .lk{color:var(--muted);font-size:12px;word-break:break-all}
#tab-aff .chk{display:flex;gap:8px;font-size:13px;margin:4px 0}
#tab-aff .chk.ok{color:#86efac}#tab-aff .chk.warn{color:#fcd34d}#tab-aff .chk.bad{color:#fca5a5}
#tab-aff .pv{background:#eef1f7;border-radius:12px;padding:14px;display:flex;flex-wrap:wrap;gap:18px;align-items:flex-end;color:#334155}
#tab-aff .pv small{display:block;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px;color:#64748b}
#tab-aff .affp,.affp{display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 13px 0 4px;border-radius:999px;background:#fff;border:1px solid #d3d9e6;box-shadow:0 1px 2px #0f172a18;font-family:system-ui;vertical-align:middle}
#tab-aff .affp .lg{display:grid;place-items:center;width:30px;height:30px;border-radius:8px;padding:3px;overflow:hidden;flex:none}
#tab-aff .affp .lg img{max-width:100%;max-height:100%;display:block;object-fit:contain}
#tab-aff .affp .lg i{font:800 11px/1 system-ui;font-style:normal;color:#fff}
#tab-aff .affp b{font:800 12.5px system-ui;color:#1b2433}
#tab-aff .affp.ph{height:34px}#tab-aff .affp.ph .lg{width:26px;height:26px}
#tab-aff .ctl{display:flex;gap:6px;align-items:center}
#tab-aff .sw{width:42px;height:24px;border-radius:20px;background:#475569;position:relative;border:0;cursor:pointer;padding:0}
#tab-aff .sw:after{content:"";position:absolute;left:3px;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:.15s}
#tab-aff .sw.on{background:#16a34a}#tab-aff .sw.on:after{left:21px}
#tab-aff .ovr{display:grid;grid-template-columns:minmax(0,1fr) 230px;gap:8px 12px;align-items:start;border-top:1px solid var(--line);padding:9px 0}
#tab-aff .ovr .pk{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:10px;font-size:13px}
#tab-aff .ovr .pk label{display:flex;gap:6px;align-items:center;text-transform:none;letter-spacing:0;font-size:13px;color:var(--text);margin:0}
#tab-aff .warnbox{background:#422006;border:1px solid #a16207;color:#fde68a;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:12px}
</style>
<div class="card"><h2 style="margin:0 0 4px">Affiliate partners</h2>
<p class="note" style="margin:0 0 12px;color:var(--muted)">Add a partner once. Tick where it shows. It applies every day until you untick it. Nothing ever overflows: each place has a fixed number of slots.</p>
<div class="caps" id="affCaps"></div><div id="affMsg" class="note"></div>
<div class="row" style="margin:6px 0 12px"><button class="btn" id="affAdd">+ Add partner</button><button class="btn ghost" id="affChk">Check logos</button><span style="flex:1"></span><button class="btn" id="affSave">Save &amp; publish</button></div>
<div id="affDirty"></div><div style="overflow-x:auto"><table id="affTbl"></table></div></div>
<div class="card" id="affForm" hidden></div>
<div class="card"><h2 style="margin:0 0 4px">Match overrides</h2>
<p class="note" style="margin:0 0 10px;color:var(--muted)">For one match only: hide the buttons, or pick a different set. Everything else follows the ticks above. Overrides apply to tables, Bets of the Day and the Banker Bet.</p>
<div class="row" style="margin-bottom:8px"><div style="width:190px"><label>Day</label><input type="date" id="affDay"></div></div><div id="affOv"></div></div>`;
    document.querySelector("#tab-results").insertAdjacentElement("afterend", sec);
    $("#affAdd").onclick = () => openForm(null);
    $("#affSave").onclick = save;
    $("#affChk").onclick = checkLogos;
    $("#affDay").onchange = e => { ovDay = e.target.value; paintOv(); };
    sec.addEventListener("click", onClick); sec.addEventListener("change", onChange);
  }

  /* ---------- paint ---------- */
  function paint() {
    if (!$("#tab-aff")) return;
    $("#affCaps").innerHTML = PLS.map(pl => { const u = usage(pl, partners), full = u >= CAP[pl]; return `<div class="cap${full ? " full" : ""}"><b>${PLNAME[pl]}</b><span class="n">${u} / ${CAP[pl]}</span> <small style="color:var(--muted)">slots used${full ? " · full" : ""}</small><div class="bar"><i style="width:${Math.round(u / CAP[pl] * 100)}%"></i></div></div>`; }).join("");
    $("#affDirty").innerHTML = dirty ? `<div class="warnbox">You have unsaved changes. Press <b>Save &amp; publish</b> to put them on the site.</div>` : "";
    const t = $("#affTbl");
    t.innerHTML = `<tr><th>Order</th><th>Logo</th><th>Partner</th><th>Countries</th>${PLS.map(pl => `<th class="c">${PLNAME[pl]}</th>`).join("")}<th class="c">On</th><th></th></tr>` +
      (partners.length ? partners.map((p, i) => `<tr data-i="${i}">
<td><div class="ctl"><button class="btn ghost sm" data-a="up" ${i ? "" : "disabled"}>▲</button><button class="btn ghost sm" data-a="dn" ${i < partners.length - 1 ? "" : "disabled"}>▼</button></div></td>
<td>${hasLogo(p) ? `<div class="tile" style="background:${esc(p.bg || "#fff")}"><img src="${esc(p.logo)}" alt=""></div>` : `<div class="tile none">NO LOGO</div>`}</td>
<td><b>${esc(p.name)}</b>${live(p) ? "" : `<span class="badge bad">${p.on === false ? "Off" : !hasLogo(p) ? "Hidden: no logo" : "Hidden: bad link"}</span>`}<div class="lk">${esc(p.url)}</div></td>
<td>${(p.cc || []).length ? p.cc.map(c => `<span class="chip">${esc(CN[c] || c)}</span>`).join("") : `<span class="chip">All countries</span>`}</td>
${PLS.map(pl => { const on = !!(p.pl && p.pl[pl]), can = on || canTick(p, pl); return `<td class="c"><input type="checkbox" data-a="tick" data-pl="${pl}" ${on ? "checked" : ""} ${can ? "" : "disabled"} title="${can ? "" : PLNAME[pl] + " is full for these countries. Untick another partner first."}"></td>`; }).join("")}
<td class="c"><button class="sw ${p.on !== false ? "on" : ""}" data-a="on" aria-label="Switch on or off"></button></td>
<td><div class="ctl"><button class="btn ghost sm" data-a="edit">Edit</button><button class="btn ghost sm" data-a="del">Delete</button></div></td></tr>`).join("") : `<tr><td colspan="10" class="note" style="color:var(--muted)">No partners yet. Press + Add partner.</td></tr>`);
    $("#affDay").value = ovDay = ovDay || todayLagos();
    paintOv(); if (form) paintForm();
  }
  const todayLagos = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());

  function paintOv() {
    const box = $("#affOv"); if (!box) return;
    const list = (db.fixtures || []).filter(f => String(f.kickoff || "").slice(0, 10) === ovDay).sort((a, b) => String(a.kickoff).localeCompare(String(b.kickoff)));
    if (!list.length) { box.innerHTML = `<div class="note" style="color:var(--muted)">No matches on this day.</div>`; return; }
    box.innerHTML = list.map(f => {
      const v = String(f.affx || ""), mode = v === "" ? "def" : v === "none" ? "none" : "cus", ids = mode === "cus" ? v.split(",") : [];
      return `<div class="ovr" data-id="${esc(f.id)}"><div><b>${esc(f.home)} v ${esc(f.away)}</b><div class="lk">${esc(f.competition || "")} · ${esc(String(f.kickoff).slice(11, 16))}</div></div>
<select data-a="ovm"><option value="def"${mode === "def" ? " selected" : ""}>Default (dashboard ticks)</option><option value="none"${mode === "none" ? " selected" : ""}>No buttons</option><option value="cus"${mode === "cus" ? " selected" : ""}>Choose partners…</option></select>
${mode === "cus" ? `<div class="pk">${partners.filter(live).map(p => `<label><input type="checkbox" data-a="ovp" value="${esc(p.id)}" ${ids.includes(p.id) ? "checked" : ""}>${esc(p.name)}</label>`).join("") || `<span class="lk">No live partners yet.</span>`}</div>` : ""}</div>`;
    }).join("");
  }

  /* ---------- add / edit form ---------- */
  function openForm(id) {
    editId = id;
    const p = id ? partners.find(x => x.id === id) : null;
    form = p ? JSON.parse(JSON.stringify(p)) : { id: uid(), name: "", url: "", logo: "", bg: "#ffffff", cc: [], on: true, pl: {}, meta: null };
    form.meta = null; $("#affForm").hidden = false; paintForm(true); $("#affForm").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function paintForm(full) {
    const box = $("#affForm"), f = form; if (!f) return;
    if (full || !box.dataset.built) {
      box.dataset.built = "1";
      box.innerHTML = `<h2 style="margin:0 0 10px">${editId ? "Edit partner" : "Add partner"}</h2>
<div class="grid"><div><label>Partner name</label><input id="fName" maxlength="40" placeholder="e.g. Stake"></div>
<div style="grid-column:span 2"><label>Tracking link (the one link the partner gave you, must start with https://)</label><input id="fUrl" placeholder="https://..."></div></div>
<div class="grid" style="margin-top:10px"><div><label>Logo (square app icon is best)</label><input type="file" id="fLogo" accept="image/png,image/svg+xml,image/jpeg,image/webp"></div>
<div><label>Button background colour</label><div class="row"><input type="color" id="fBg" style="width:60px;padding:2px"><button class="btn ghost sm" id="fBgW" type="button">White</button><button class="btn ghost sm" id="fBgD" type="button">Dark</button></div></div></div>
<div style="margin-top:10px"><label>Countries where this partner works</label><div class="row"><label style="display:flex;gap:6px;align-items:center;text-transform:none;letter-spacing:0;color:var(--text)"><input type="checkbox" id="fAll" style="width:auto"> All countries</label><input id="fCc" list="affCl" placeholder="Type a country, press Enter" style="max-width:260px"><datalist id="affCl">${COUNTRIES.map(c => `<option value="${esc(c[1])}">`).join("")}</datalist></div><div id="fChips" style="margin-top:6px"></div></div>
<div id="fChecks" style="margin:12px 0"></div>
<label>Preview at real size, exactly as on the site</label><div class="pv" id="fPv"></div>
<div class="row end"><button class="btn ghost" id="fCancel">Cancel</button><button class="btn" id="fSave">${editId ? "Save changes" : "Add partner"}</button></div><div id="fErr" class="note" style="color:#fca5a5"></div>`;
      $("#fName").oninput = e => { f.name = e.target.value; refreshPv(); };
      $("#fUrl").oninput = e => { f.url = e.target.value.trim(); };
      $("#fBg").oninput = e => { f.bg = e.target.value; refreshPv(); };
      $("#fBgW").onclick = () => { f.bg = "#ffffff"; $("#fBg").value = f.bg; refreshPv(); };
      $("#fBgD").onclick = () => { f.bg = "#1f2937"; $("#fBg").value = f.bg; refreshPv(); };
      $("#fAll").onchange = e => { if (e.target.checked) f.cc = []; refreshCc(); };
      const addCc = () => { const v = $("#fCc").value.trim().toLowerCase(), c = COUNTRIES.find(x => x[1].toLowerCase() === v || x[0].toLowerCase() === v); if (c) { if (!f.cc.includes(c[0])) f.cc.push(c[0]); $("#fCc").value = ""; refreshCc(); } };
      $("#fCc").onchange = addCc; $("#fCc").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); addCc(); } };
      $("#fChips").onclick = e => { const b = e.target.closest("[data-x]"); if (b) { f.cc.splice(f.cc.indexOf(b.dataset.x), 1); refreshCc(); } };
      $("#fLogo").onchange = async e => {
        const file = e.target.files[0]; if (!file) return; $("#fErr").textContent = "";
        try { const r = await processLogo(file); f.logo = r.data; f.meta = { asp: r.asp, lum: r.lum }; f.bg = r.lum > 0.8 ? "#1f2937" : r.lum < 0.2 ? "#ffffff" : (f.bg || "#ffffff"); $("#fBg").value = f.bg; refreshPv(); }
        catch (err) { $("#fErr").textContent = err.message; e.target.value = ""; }
      };
      $("#fCancel").onclick = () => { form = null; box.hidden = true; box.dataset.built = ""; };
      $("#fSave").onclick = saveForm;
      $("#fName").value = f.name; $("#fUrl").value = f.url; $("#fBg").value = f.bg || "#ffffff";
    }
    refreshCc(); refreshPv();
  }
  function refreshCc() { const f = form; $("#fAll").checked = !f.cc.length; $("#fChips").innerHTML = f.cc.map(c => `<span class="chip">${esc(CN[c] || c)}<button data-x="${c}" title="Remove">×</button></span>`).join(""); }
  function refreshPv() {
    const f = form; if (!f) return;
    $("#fChecks").innerHTML = logoChecks(f).map(c => `<div class="chk ${c[0]}"><span>${c[0] === "ok" ? "✔" : c[0] === "warn" ? "⚠" : "✖"}</span><span>${esc(c[1])}</span></div>`).join("");
    $("#fPv").innerHTML = ["Bets of the Day", "Tables", "Props", "Banker Bet"].map(n => `<div><small>${n}</small>${pill(f)}</div>`).join("") + `<div><small>Phone</small>${pill(f).replace('class="affp"', 'class="affp ph"')}</div>`;
  }
  function saveForm() {
    const f = form, err = m => { $("#fErr").textContent = m; };
    if (!f.name.trim()) return err("Give the partner a name.");
    if (!goodUrl(f.url)) return err("The tracking link must start with https:// and be a full link.");
    if (!hasLogo(f)) return err("Upload a logo first. A partner without a logo is never shown.");
    const bl = logoChecks(f).find(c => c[0] === "bad"); if (bl) return err(bl[1]);
    const old = partners.find(p => p.id === f.id);
    const next = Object.assign({}, old || {}, { id: f.id, name: f.name.trim(), url: f.url, logo: f.logo, bg: f.bg || "#ffffff", cc: f.cc.slice(), on: old ? old.on : true, pl: old ? old.pl : {} });
    const trial = old ? partners.map(p => p.id === f.id ? next : p) : partners.concat(next);
    for (const pl of PLS) if (next.pl[pl] && usage(pl, trial) > CAP[pl]) return err("Those countries would put too many partners in " + PLNAME[pl] + " (limit " + CAP[pl] + "). Untick that place for this partner or another one first.");
    delete next.meta; partners = trial; form = null; $("#affForm").hidden = true; $("#affForm").dataset.built = ""; touch();
  }

  /* ---------- check logos ---------- */
  async function checkLogos() {
    const out = [];
    for (const p of partners) {
      if (!hasLogo(p)) { out.push("✖ " + p.name + ": no logo"); continue; }
      const ok = await new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth > 0); i.onerror = () => r(false); i.src = p.logo; });
      out.push((ok ? "✔ " : "✖ ") + p.name + (ok ? ": logo loads" : ": logo is broken, upload it again") + (goodUrl(p.url) ? "" : " · link is not a valid https link"));
    }
    $("#affMsg").innerHTML = out.length ? out.map(esc).join("<br>") : "No partners yet.";
  }

  /* ---------- table + override events ---------- */
  function onClick(e) {
    const b = e.target.closest("[data-a]"); if (!b || b.tagName === "INPUT" || b.tagName === "SELECT") return;
    const tr = b.closest("tr[data-i]"); const i = tr ? +tr.dataset.i : -1, p = partners[i], a = b.dataset.a;
    if (a === "up" && i > 0) { [partners[i - 1], partners[i]] = [partners[i], partners[i - 1]]; touch(); }
    else if (a === "dn" && i < partners.length - 1) { [partners[i + 1], partners[i]] = [partners[i], partners[i + 1]]; touch(); }
    else if (a === "edit") openForm(p.id);
    else if (a === "del") { if (confirm("Delete " + p.name + "? It disappears from the site once you press Save & publish.")) { partners.splice(i, 1); touch(); } }
    else if (a === "on") {
      if (p.on === false) { if (!hasLogo(p) || !goodUrl(p.url)) return toast("Add a logo and a valid link first."); const t = Object.assign({}, p, { on: true }), tr2 = partners.map(q => q.id === p.id ? t : q); const over = PLS.find(pl => p.pl[pl] && usage(pl, tr2) > CAP[pl]); if (over) return toast(PLNAME[over] + " is full. Untick another partner there first."); p.on = true; } else p.on = false;
      touch();
    }
  }
  function onChange(e) {
    const t = e.target, a = t.dataset.a;
    if (a === "tick") { const p = partners[+t.closest("tr").dataset.i]; p.pl = p.pl || {}; if (t.checked && !canTick(p, t.dataset.pl)) { t.checked = false; return toast(PLNAME[t.dataset.pl] + " is full."); } p.pl[t.dataset.pl] = t.checked; touch(); }
    else if (a === "ovm" || a === "ovp") {
      const row = t.closest(".ovr"), f = db.fixtures.find(x => x.id === row.dataset.id); if (!f) return;
      if (a === "ovm") { if (t.value === "def") delete f.affx; else if (t.value === "none") f.affx = "none"; else f.affx = partners.filter(live).map(p => p.id).slice(0, CAP.table).join(",") || "none"; }
      else { const ids = [...row.querySelectorAll('[data-a="ovp"]:checked')].map(x => x.value); if (ids.length > CAP.banker) { t.checked = false; return toast("At most " + CAP.banker + " partners per match."); } f.affx = ids.join(",") || "none"; }
      commit(); toast(f.affx ? "Override saved for this match" : "Back to the default for this match"); paintOv();
    }
  }

  const iv = setInterval(() => { if (document.querySelector('nav.tabs [data-tab="results"]') && typeof showTab === "function" && document.querySelector("#tab-results")) { clearInterval(iv); mount(); } }, 200);
})();
