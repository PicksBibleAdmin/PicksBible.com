/* PicksBible admin: "9. Expert tips" tab. Hand-pick the matches that appear on each public Expert Tips page
   (best BTTS today, best NBA ATS picks today, ...). Loaded by admin.html after admin-hub.js.
   Uses page globals: db, Store, toast, esc, todayStr, showTab, fbOf, bbOf, compLabel, hhmm, lgSort.
   Stores the choice on each fixture as f.xt = ["btts","1x2", ...] (published with the fixture). */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const CATS = {
    football: [
      { k: "1x2",  name: "Best 1X2 predictions",         show: f => { const v = fbOf(f); return /^[1X2]$/.test(v.tip) ? v.tip + (v.tipOdds ? " @ " + v.tipOdds : "") : ""; }, conf: f => fbOf(f).conf },
      { k: "btts", name: "Best BTTS predictions",        show: f => fbOf(f).btts || "", conf: f => fbOf(f).conf },
      { k: "ou25", name: "Best Over/Under 2.5 tips",     show: f => { const o = fbOf(f).ou; return o ? o + " 2.5" : ""; }, conf: f => fbOf(f).conf },
      { k: "dc",   name: "Best Double Chance tips",      show: f => { const v = fbOf(f); return /^(1X|X2|12)$/.test(v.tip) ? v.tip + (v.tipOdds ? " @ " + v.tipOdds : "") : ""; }, conf: f => fbOf(f).conf },
      { k: "cs",   name: "Best Correct Score predictions", show: f => fbOf(f).cs || "", conf: f => fbOf(f).conf }
    ],
    basketball: [
      { k: "ml",     name: "Best NBA Moneyline picks",    show: f => { const v = bbOf(f), t = String(v.tip || ""); if (t !== "1" && t !== "2") return ""; const o = t === "1" ? v.o1 : v.o2; return (t === "1" ? f.home : f.away) + (o ? " @ " + o : ""); }, conf: f => bbOf(f).conf },
      { k: "ats",    name: "Best NBA ATS picks",          show: f => { const v = bbOf(f); return v.tip && String(v.spread || "").trim() ? v.tip + " " + String(v.spread).trim() : ""; }, conf: f => bbOf(f).conf },
      { k: "totals", name: "Best NBA Over/Under picks",   show: f => { const v = bbOf(f); return v.totalSide ? v.totalSide + (v.totalLine ? " " + v.totalLine : "") : ""; }, conf: f => bbOf(f).conf }
    ]
  };
  let sport = "football", minConf = 0, openCat = {};

  const isLive = f => !!((f.fb && f.fb.live) || (f.bb && f.bb.live));
  const has = (f, k) => Array.isArray(f.xt) && f.xt.indexOf(k) >= 0;

  function mount() {
    const nav = document.querySelector("nav.tabs");
    if (!nav || $("#tab-xtips")) return;
    const btn = document.createElement("button");
    btn.setAttribute("role", "tab"); btn.dataset.tab = "xtips"; btn.setAttribute("aria-selected", "false"); btn.textContent = "9. Expert tips";
    (nav.querySelector('[data-tab="hub"]') || nav.querySelector('[data-tab="results"]')).insertAdjacentElement("afterend", btn);
    btn.onclick = () => { showTab("xtips"); render(); };
    const sec = document.createElement("section"); sec.id = "tab-xtips"; sec.hidden = true;
    sec.innerHTML = `
<style>
#tab-xtips .xb{display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin-bottom:12px}
#tab-xtips .seg button{background:var(--panel-2);color:var(--muted);border:1px solid var(--line);padding:8px 16px;font:inherit;cursor:pointer}
#tab-xtips .seg button:first-child{border-radius:8px 0 0 8px}#tab-xtips .seg button:last-child{border-radius:0 8px 8px 0}
#tab-xtips .seg button[aria-pressed=true]{background:var(--purple);color:#fff;border-color:var(--purple)}
#tab-xtips details{background:var(--panel);border:1px solid var(--line);border-radius:12px;margin-bottom:10px}
#tab-xtips summary{cursor:pointer;padding:12px 14px;font-weight:700;display:flex;justify-content:space-between;gap:10px;align-items:center}
#tab-xtips summary .cnt{background:var(--panel-2);border-radius:99px;padding:3px 12px;font-size:13px}
#tab-xtips summary .cnt.on{background:#14532d;color:#86efac}
#tab-xtips .xr{display:grid;grid-template-columns:26px 54px 1fr 150px 60px;gap:8px;align-items:center;padding:8px 14px;border-top:1px solid var(--line);font-size:14px}
#tab-xtips .xr.sel{background:#1b2a1f}
#tab-xtips .xr .mk{font-weight:700}
#tab-xtips .xh{padding:6px 14px;font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;background:var(--panel-2)}
#tab-xtips .em{padding:14px;color:var(--muted)}
@media(max-width:700px){#tab-xtips .xr{grid-template-columns:26px 48px 1fr 80px}#tab-xtips .xr .cf{display:none}}
</style>
<div class="card">
  <h2>Expert tips: hand-pick for each page</h2>
  <p class="note">Each category below is a public page (for example <b>Best BTTS predictions today</b>). Only the matches you tick here appear on that page. A match is listed once you have filled in that market in the Football or Basketball table and switched the match <b>Live</b>. Use the confidence filter to find your strongest picks quickly. Player props for the day are listed at the bottom of the Basketball view; add or edit them in tab 4.</p>
  <div class="xb">
    <div><label>Day</label><input type="date" id="xtDate"></div>
    <div class="seg" role="group"><button type="button" data-xs="football" aria-pressed="true">Football</button><button type="button" data-xs="basketball" aria-pressed="false">Basketball</button></div>
    <div><label>Show only confidence at or above</label><input type="number" id="xtMin" min="0" max="100" value="0" style="width:90px"></div>
  </div>
  <div id="xtBody"></div>
</div>`;
    const anchor = $("#tab-hub") || $("#tab-results"); anchor.insertAdjacentElement("afterend", sec);
    $("#xtDate").value = todayStr();
    $("#xtDate").onchange = render;
    $("#xtMin").oninput = () => { minConf = Math.max(0, Math.min(100, +$("#xtMin").value || 0)); render(); };
    sec.querySelectorAll("[data-xs]").forEach(b => b.onclick = () => { sport = b.dataset.xs; sec.querySelectorAll("[data-xs]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); render(); });
    $("#xtBody").addEventListener("change", e => {
      const el = e.target;
      if (el.dataset.xp) {
        const p = db.props.find(x => x.id === el.dataset.xp); if (!p) return;
        p.xt = el.checked; Store.save(db); toast(el.checked ? "Added to the Best NBA Player Props page" : "Removed from the page"); render(); return;
      }
      if (el.dataset.xc) {
        const p = db.props.find(x => x.id === el.dataset.xc); if (!p) return;
        const v = String(el.value).trim(); if (v === "") delete p.conf; else p.conf = Math.max(0, Math.min(100, +v || 0)); Store.save(db); toast("Confidence saved"); return;
      }
      if (!el.dataset.xf) return;
      const f = db.fixtures.find(x => x.id === el.dataset.xf); if (!f) return;
      const k = el.dataset.xk, cur = Array.isArray(f.xt) ? f.xt.slice() : [];
      const i = cur.indexOf(k);
      if (el.checked && i < 0) cur.push(k); else if (!el.checked && i >= 0) cur.splice(i, 1);
      f.xt = cur; Store.save(db);
      if (typeof statsText === "function") { const s = $("#stats"); if (s) s.textContent = statsText(); }
      toast(el.checked ? "Added to the page" : "Removed from the page");
      render();
    });
    $("#xtBody").addEventListener("click", e => {
      const b = e.target.closest("[data-clear]"); if (!b) return;
      const k = b.dataset.clear, day = $("#xtDate").value;
      if (k === "props") { db.props.forEach(p => { if (p.xt) { const f = db.fixtures.find(x => x.id === p.fixtureId); if (f && String(f.kickoff || "").slice(0, 10) === day) delete p.xt; } }); Store.save(db); toast("Cleared"); render(); return; }
      db.fixtures.forEach(f => { if (f.sport === sport && String(f.kickoff || "").slice(0, 10) === day && has(f, k)) f.xt = f.xt.filter(x => x !== k); });
      Store.save(db); toast("Cleared"); render();
    });
    $("#xtBody").addEventListener("toggle", e => { const d = e.target; if (d.dataset && d.dataset.k) openCat[d.dataset.k] = d.open; }, true);
  }

  function render() {
    const body = $("#xtBody"); if (!body) return;
    const day = $("#xtDate").value || todayStr();
    const dayFx = db.fixtures.filter(f => f.sport === sport && String(f.kickoff || "").slice(0, 10) === day).sort(lgSort);
    body.innerHTML = CATS[sport].map(c => {
      const elig = dayFx.filter(f => isLive(f) && c.show(f));
      const pickedAll = dayFx.filter(f => has(f, c.k));
      const rows = elig.filter(f => (+String(c.conf(f)).replace("%", "") || 0) >= minConf || has(f, c.k));
      let last = null;
      const html = rows.map(f => {
        const lg = compLabel(f); let h = "";
        if (lg !== last) { last = lg; h = `<div class="xh">${esc(lg)}</div>`; }
        const cf = String(c.conf(f) || "").replace("%", "");
        return h + `<div class="xr ${has(f, c.k) ? "sel" : ""}"><input type="checkbox" data-xf="${f.id}" data-xk="${c.k}" ${has(f, c.k) ? "checked" : ""} aria-label="Pick"><span>${esc(hhmm(f.kickoff))}</span><span><b>${esc(f.home)}</b> v <b>${esc(f.away)}</b></span><span class="mk">${esc(c.show(f))}</span><span class="cf">${cf ? esc(cf) + "%" : "-"}</span></div>`;
      }).join("");
      const hidden = dayFx.filter(f => !isLive(f) && c.show(f)).length;
      return `<details data-k="${c.k}" ${openCat[c.k] ? "open" : ""}><summary><span>${esc(c.name)}</span><span><span class="cnt ${pickedAll.length ? "on" : ""}">${pickedAll.length} selected</span> <span class="cnt">${elig.length} available</span></span></summary>` +
        (rows.length ? html : `<div class="em">No matches with this market filled in for this day${minConf ? " at that confidence" : ""}. Fill in the market in the table and switch the match Live.</div>`) +
        (hidden ? `<div class="em">${hidden} more match${hidden === 1 ? " has" : "es have"} this market but ${hidden === 1 ? "is" : "are"} not Live yet.</div>` : "") +
        (pickedAll.length ? `<div style="padding:10px 14px"><button type="button" class="btn ghost sm" data-clear="${c.k}">Clear all ${pickedAll.length}</button></div>` : "") +
        `</details>`;
    }).join("") + propsBlock(dayFx);
  }
  /* Best NBA Player Props: the analyst picks which props go on the public page (tick), and can note a confidence for each. */
  function propsBlock(dayFx) {
    if (sport !== "basketball") return "";
    const ids = {}; dayFx.forEach(f => { ids[f.id] = f; });
    const conf = p => +String(p.conf == null ? "" : p.conf).replace("%", "") || 0;
    const all = (db.props || []).filter(p => ids[p.fixtureId]);
    const mk = k => { const m = (typeof PROP_MARKETS !== "undefined" ? PROP_MARKETS : []).find(x => x.k === k); return m ? m.name.replace(/\s*\(Over\/Under\)/, "") : k; };
    const picked = all.filter(p => p.xt).length;
    const list = all.filter(p => conf(p) >= minConf || p.xt).sort((x, y) => (y.xt ? 1 : 0) - (x.xt ? 1 : 0) || conf(y) - conf(x) || String(ids[x.fixtureId].kickoff).localeCompare(String(ids[y.fixtureId].kickoff)));
    const rows = list.map(p => {
      const f = ids[p.fixtureId], who = p.player || p.team || "";
      return `<div class="xr ${p.xt ? "sel" : ""}"><input type="checkbox" data-xp="${esc(p.id)}" ${p.xt ? "checked" : ""} aria-label="Pick"><span>${esc(hhmm(f.kickoff))}</span><span><b>${esc(who)}</b> <span class="muted">${esc(f.home)} v ${esc(f.away)}</span></span><span class="mk">${esc(mk(p.market))} ${esc(p.side || "")} ${esc(p.line || "")}${p.odds ? " @ " + esc(p.odds) : ""}${p.live ? "" : ' <span class="muted">(not Live in tab 4)</span>'}${p.st === "won" ? " ✓" : p.st === "lost" ? " ✗" : ""}</span><input type="number" min="0" max="100" data-xc="${esc(p.id)}" value="${esc(p.conf == null ? "" : String(p.conf).replace("%", ""))}" placeholder="%" title="Confidence %" style="width:60px;padding:4px 6px"></div>`;
    }).join("");
    return `<details data-k="props" ${openCat.props ? "open" : ""}><summary><span>Best NBA Player Props</span><span><span class="cnt ${picked ? "on" : ""}">${picked} selected</span> <span class="cnt">${all.length} added</span></span></summary>` +
      (all.length ? (rows || `<div class="em">No props at that confidence. Lower the filter or add a confidence % to your props.</div>`) : `<div class="em">No player props added for this day yet. Add them in tab 4 (Basketball props) or upload the props CSV there.</div>`) +
      `<div class="em">Only the props you tick here appear on the public Best NBA Player Props page. Type a confidence % on each prop to compare and filter (it shows on the page too). Props still need to be Live in tab 4.</div>` +
      (picked ? `<div style="padding:10px 14px"><button type="button" class="btn ghost sm" data-clear="props">Clear all ${picked}</button></div>` : "") + `</details>`;
  }

  const t = setInterval(() => { if (document.querySelector('nav.tabs [data-tab="results"]') && typeof showTab === "function" && typeof db !== "undefined" && db) { clearInterval(t); mount(); } }, 300);
})();
