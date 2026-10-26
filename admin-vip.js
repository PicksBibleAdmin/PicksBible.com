/* PicksBible admin: "7. VIP packages" builder.
   Loaded by admin.html after the main script (same style as admin-csv-import.js).
   Uses the page globals: db, Store, commit, toast, esc, todayStr, showTab.
   Internal tier key: "bronze" = the GOLD package (kept so existing published results stay valid). */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const PK = {
    gold:     { label: "Gold",     key: "bronze", range: [2, 3],  hint: "2 to 3 odds" }
  };
  const MARKETS = {
    "1X2":             ["Home Win", "Draw", "Away Win", "Home or Draw", "Away or Draw", "Home or Away"],
    "BTTS":            ["Yes", "No"],
    "Over/Under":      ["Over 1.5", "Over 2.5", "Over 3.5", "Under 2.5", "Under 3.5"],
    "Home Over/Under": ["Over 0.5", "Over 1.5", "Under 1.5"],
    "Away Over/Under": ["Over 0.5", "Over 1.5", "Under 1.5"],
    "Player Prop":     ["LeBron James Over 25.5 Points", "Nikola Jokic Over 10.5 Rebounds", "Stephen Curry Over 4.5 3-Pointers Made", "Player Over 5.5 Assists"],
    "Spread":          ["Home -6.5", "Away +6.5"],
    "Total Points":    ["Over 220.5", "Under 220.5"],
    "Handicap":        ["Home -1", "Home -1.5", "Home +1", "Away +1", "Away +1.5", "Away -1"]
  };
  const MAXLEGS = 8;
  /* shared email helper (also used by the Customers tab): the server checks the admin login, then sends through Brevo */
  window.PBMail = window.PBMail || {
    async send(recipients, subject, text, extra) {
      if (!recipients.length) return { sent: 0, failed: [], note: "no recipients" };
      const token = await Store.auth.currentUser.getIdToken();
      const r = await fetch("/api/send-email", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify(Object.assign({ subject, text, recipients }, extra || {})) });
      let j = {}; try { j = await r.json(); } catch (_) {}
      if (!r.ok && !j.sent) throw new Error(j.error || ("email service error " + r.status));
      return j;
    },
    /* the free daily email: picks = [{match, pick, meta}], recipients = [{email, name, unsub}] */
    async sendFree(recipients, subject, picks, extra) {
      const token = await Store.auth.currentUser.getIdToken();
      const r = await fetch("/api/send-email", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify(Object.assign({ mode: "free", subject, picks, recipients }, extra || {})) });
      let j = {}; try { j = await r.json(); } catch (_) {}
      if (!r.ok && !j.sent) throw new Error(j.error || ("email service error " + r.status));
      return j;
    }
  };
  const idOf = (pk, ymd) => (PK[pk].key === "bronze" ? "vip-bronze-" : "vip-") + ymd;
  const findEntry = (pk, ymd) => (db.vip || []).find(x => x.ymd === ymd && (PK[pk].key === "bronze" ? x.tier === "bronze" : x.tier !== "bronze"));
  const emptyLeg = () => ({ fid: "", market: "", sel: "" });
  let state = { ymd: "", pk: "gold", odds: "", legs: [emptyLeg()], allDates: false };

  /* ---------- DOM: tab button + section ---------- */
  function mount() {
    const nav = document.querySelector("nav.tabs");
    if (!nav || $("#tab-vip")) return;
    const btn = document.createElement("button");
    btn.setAttribute("role", "tab"); btn.dataset.tab = "vip"; btn.setAttribute("aria-selected", "false");
    btn.textContent = "7. VIP packages";
    const after = nav.querySelector('[data-tab="results"]');
    after.insertAdjacentElement("afterend", btn);
    btn.onclick = () => { showTab("vip"); load(); };

    const sec = document.createElement("section");
    sec.id = "tab-vip"; sec.hidden = true;
    sec.innerHTML = `
<style>
#tab-vip .leg{border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:12px;background:var(--panel-2)}
#tab-vip .leg h3{margin:0 0 8px;font-size:14px;color:var(--cyan)}
#tab-vip .legrow{display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px}
@media(max-width:760px){#tab-vip .legrow{grid-template-columns:1fr}}
#tab-vip .cb{position:relative}
#tab-vip .cbl{position:absolute;left:0;right:0;top:100%;z-index:30;max-height:300px;overflow:auto;border:1px solid var(--line);border-radius:10px;background:#120f2e;box-shadow:0 10px 30px #0008}
#tab-vip .cbl div{padding:9px 12px;cursor:pointer;border-bottom:1px solid var(--line);font-size:14px}
#tab-vip .cbl div:hover{background:var(--panel-2)}
#tab-vip .cbl small{color:var(--muted)}
#tab-vip .legfoot{display:flex;justify-content:space-between;align-items:center;margin-top:8px}
#tab-vip .acts{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px}
#tab-vip .addrow{display:flex;justify-content:flex-end;margin-bottom:16px}
#vipPop{position:fixed;inset:0;background:#000a;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px}
#vipPop[hidden]{display:none}
#vipPop .box{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:20px;width:min(560px,100%);max-height:92vh;overflow:auto}
#vipPop h2{margin:0 0 14px;font-size:18px}
#vipPop .res{border-left:4px solid var(--won);background:var(--panel-2);padding:12px;border-radius:8px;margin:12px 0}
#vipPop .res.bad{border-color:var(--lost)}
</style>
<div class="card">
  <h2>VIP package builder</h2>
  <p class="note">Pick the day and the package, enter the total odd, then add the matches (3 to 6 on average). <b>Save draft</b> keeps it private. <b>Publish to VIP members</b> sends it to members. Picks stay private until the package is settled by the results upload.</p>
  <div class="row" style="margin-bottom:12px">
    <div><label>Date</label><input type="date" id="vpkDate"></div>
    <div><label>Package</label><select id="vpkPk"><option value="gold">Gold (2 to 3 odds)</option></select></div>
    <div><label>Total odd</label><input id="vpkOdds" inputmode="decimal" placeholder="e.g. 2.03" maxlength="7"></div>
  </div>
  <p class="note" id="vpkStatus" style="margin-top:0"></p>
  <div id="vpkLegs"></div>
  <div class="addrow"><button type="button" class="btn ghost" id="vpkAdd">+ Add pick</button></div>
  <div class="acts">
    <button type="button" class="btn ghost" id="vpkDraft">Save draft</button>
    <button type="button" class="btn" id="vpkPub">Publish to VIP members</button>
    <button type="button" class="btn danger" id="vpkDel" hidden>Delete this package</button>
  </div>
</div>
<div id="vipPop" hidden>
  <div class="box" role="dialog" aria-modal="true" aria-label="Message to VIP members">
    <h2>Message to members</h2>
    <div id="vpMsgForm">
      <label>Message title</label><input id="vpMsgTitle" maxlength="120">
      <label style="margin-top:10px">Message body</label><textarea id="vpMsgBody" rows="6" maxlength="1000"></textarea>
      <p class="note" id="vpMsgAud" style="margin-top:10px"></p>
      <label style="display:flex;gap:8px;align-items:center;text-transform:none;font-size:14px;color:var(--text)"><input type="checkbox" id="vpMsgMail" checked style="width:auto"> Also send this by email</label>
      <div class="acts"><button type="button" class="btn ghost" id="vpMsgCancel">Cancel</button><button type="button" class="btn" id="vpMsgSend">Publish</button></div>
    </div>
    <div id="vpMsgDone" hidden></div>
  </div>
</div>`;
    document.querySelector("#tab-results").insertAdjacentElement("afterend", sec);
    wire();
  }

  /* ---------- state <-> entry ---------- */
  function load() {
    if (!state.ymd) state.ymd = todayStr();
    $("#vpkDate").value = state.ymd; $("#vpkPk").value = state.pk;
    const e = findEntry(state.pk, state.ymd);
    if (e) { state.odds = e.odds || ""; state.legs = (e.legs && e.legs.length) ? e.legs.map(l => Object.assign({}, l)) : [emptyLeg()]; }
    else { state.odds = ""; state.legs = [emptyLeg()]; }
    $("#vpkOdds").value = state.odds;
    paint();
  }
  const fx = id => db.fixtures.find(f => f.id === id);
  async function delPackage() {
    const e = findEntry(state.pk, state.ymd); if (!e) return;
    if (!confirm("Delete the " + PK[state.pk].label + " package for " + state.ymd + "? It disappears for members and from the site. This cannot be undone.")) return;
    db.vip = (db.vip || []).filter(x => x !== e);
    let note = "";
    try {
      await Store.fs.collection("vip_feed").doc(e.id).delete();
      const q = await Store.fs.collection("broadcasts").where("ymd", "==", state.ymd).get();
      const jobs = []; q.forEach(d => { const b = d.data(); if (b.kind === "vip" && b.pkg === state.pk) jobs.push(d.ref.delete()); });
      await Promise.all(jobs);
    } catch (err) { note = " (members' copy could not be removed: " + (err.code || err.message) + ")"; }
    Store.save(db); $("#stats").textContent = statsText();
    toast("Package deleted" + note); state.odds = ""; state.legs = [emptyLeg()]; load();
  }
  function statusText() {
    const e = findEntry(state.pk, state.ymd);
    if (!e || !(e.legs && e.legs.length)) return "New package. Not saved yet.";
    if (e.st === "won" || e.st === "lost") return "Settled (" + e.st + "). The matches and picks are now public on the site.";
    if (e.draft) return "Draft saved. Private. Members have not been told.";
    return "Published to members on " + (e.pubAt || "").slice(0, 16).replace("T", " ") + " (delivered to " + (e.delivered != null ? e.delivered : "?") + " members). Still hidden from the public until the results upload settles it.";
  }

  /* ---------- painting ---------- */
  function paint() {
    $("#vpkStatus").textContent = statusText();
    $("#vpkDel").hidden = !findEntry(state.pk, state.ymd);
    $("#vpkLegs").innerHTML = state.legs.map((l, i) => {
      const f = l.fid && fx(l.fid);
      const shown = f ? `${f.home} v ${f.away}` : "";
      const mk = Object.keys(MARKETS).map(m => `<option ${l.market === m ? "selected" : ""}>${m}</option>`).join("");
      const dl = l.market ? MARKETS[l.market].map(s => `<option value="${esc(s)}">`).join("") : "";
      return `<div class="leg" data-i="${i}">
        <h3>Pick ${i + 1}</h3>
        <div class="legrow">
          <div class="cb"><label>Match</label><input class="lgm" autocomplete="off" placeholder="Click to open the list, or type a team or league" value="${esc(shown)}"><div class="cbl" hidden></div></div>
          <div><label>Market</label><select class="lgk"><option value="">Select market</option>${mk}</select></div>
          <div><label>Selection</label><input class="lgs" list="vpkdl${i}" placeholder="${l.market ? "e.g. " + esc(MARKETS[l.market][0]) : "Select market first"}" value="${esc(l.sel)}"><datalist id="vpkdl${i}">${dl}</datalist></div>
        </div>
        <div class="legfoot"><span class="muted">${f ? esc(f.competition || "") + " · " + esc(String(f.kickoff).slice(0, 16).replace("T", " ")) : ""}</span>${state.legs.length > 1 ? '<button type="button" class="btn danger lgx" style="padding:5px 10px">Remove</button>' : ""}</div>
      </div>`;
    }).join("");
    $("#vpkAdd").disabled = state.legs.length >= MAXLEGS;
  }
  function options(q, legIdx) {
    q = q.trim().toLowerCase();
    const used = new Set(state.legs.map((l, i) => i === legIdx ? "" : l.fid));
    let list = db.fixtures.filter(f => f.home && f.away && !used.has(f.id));
    if (!state.allDates) list = list.filter(f => String(f.kickoff).slice(0, 10) === state.ymd);
    if (q) list = list.filter(f => (f.home + " " + f.away + " " + (f.competition || "")).toLowerCase().includes(q));
    list.sort((a, b) => String(a.kickoff).localeCompare(String(b.kickoff)));
    return list.slice(0, 200);
  }
  function openList(box, idx, q) {
    const list = options(q, idx);
    box.innerHTML = list.length
      ? list.map(f => `<div data-id="${esc(f.id)}">${f.sport === "basketball" ? "🏀" : "⚽"} ${esc(f.home)} v ${esc(f.away)} <small>· ${esc(f.competition || "")} · ${esc(String(f.kickoff).slice(11, 16))}${state.allDates ? " · " + esc(String(f.kickoff).slice(5, 10)) : ""}</small></div>`).join("")
      : `<div class="muted">No matches found${state.allDates ? "" : " on this date. <a href='#' id='vpkAll'>Search all dates</a>"}</div>`;
    box.hidden = false;
  }

  /* ---------- save / publish ---------- */
  function readOdds() { return $("#vpkOdds").value.trim().replace(",", "."); }
  function problems(forPublish) {
    const out = [];
    const o = parseFloat(readOdds());
    if (!(o > 1)) out.push("Enter the total odd (for example 2.03).");
    const done = state.legs.filter(l => l.fid && l.market && l.sel.trim());
    if (!done.length) out.push("Add at least one complete pick (match, market and selection).");
    if (forPublish && done.length !== state.legs.length) out.push("Finish or remove the incomplete pick.");
    return out;
  }
  function buildEntry(draft) {
    const pk = state.pk, k = PK[pk].key, ymd = state.ymd;
    let e = findEntry(pk, ymd);
    if (!e) { e = { id: idOf(pk, ymd), kind: "vip", status: "vip", tier: k, ymd, odds: "", st: "" }; db.vip = db.vip || []; db.vip.push(e); }
    e.odds = readOdds();
    e.legs = state.legs.filter(l => l.fid && l.market && l.sel.trim()).map(l => {
      const f = fx(l.fid) || {};
      return { fid: l.fid, sport: f.sport || "football", home: f.home || "", away: f.away || "", comp: f.competition || "", ko: f.kickoff || "", market: l.market, sel: l.sel.trim() };
    });
    e.draft = !!draft;
    e.pkg = pk;
    return e;
  }
  function saveDraft() {
    const p = problems(false); if (p.length) return toast(p[0]);
    buildEntry(true); Store.save(db); $("#stats").textContent = statsText();
    toast("Draft saved"); load();
  }
  function openPublish() {
    const p = problems(true); if (p.length) return toast(p[0]);
    const o = parseFloat(readOdds()), r = PK[state.pk].range;
    const warn = (o < r[0] || o > r[1]) ? ` Note: ${o} is outside the usual ${PK[state.pk].hint} for ${PK[state.pk].label}.` : "";
    const L = PK[state.pk].label;
    const e = findEntry(state.pk, state.ymd);
    $("#vpMsgTitle").value = (e && e.msgTitle) || `Today's ${L} VIP picks are ready`;
    $("#vpMsgBody").value = (e && e.msgBody) || `Your ${L} VIP picks for today are live in your VIP dashboard. Total odds ${readOdds()}. Good luck!`;
    $("#vpMsgAud").textContent = "This goes to Gold members." + warn;
    $("#vpMsgForm").hidden = false; $("#vpMsgDone").hidden = true; $("#vpMsgSend").disabled = false;
    $("#vipPop").hidden = false;
  }
  async function publish() {
    const title = $("#vpMsgTitle").value.trim(), body = $("#vpMsgBody").value.trim();
    if (!title || !body) return toast("Fill in the title and the message");
    $("#vpMsgSend").disabled = true; $("#vpMsgSend").textContent = "Publishing...";
    const e = buildEntry(false);
    e.msgTitle = title; e.msgBody = body; e.pubAt = new Date().toISOString();
    const aud = ["gold"];
    let n = 0, note = "", mailTo = [];
    try {
      const today = todayStr();
      const snap = await Store.fs.collection("users").get();
      snap.forEach(d => {
        const u = d.data();
        if (aud.includes(u.tier) && u.paidUntil && u.paidUntil >= today) { n++; if (u.email) mailTo.push({ email: u.email, name: (u.name || "").split(" ")[0] }); }
      });
    } catch (err) { note = "Could not read the members list (" + (err.code || err.message) + "). The package is published, but delivery could not be counted."; }
    e.delivered = n;
    try {
      /* the private copy members read (rules let only Gold members with an active plan read it) */
      await Store.fs.collection("vip_feed").doc(e.id).set({
        pkg: state.pk, ymd: state.ymd, odds: e.odds, audience: aud, createdAt: e.pubAt, st: e.st || "",
        legs: e.legs.map(l => ({ sport: l.sport, home: l.home, away: l.away, comp: l.comp, ko: l.ko, market: l.market, sel: l.sel }))
      });
    } catch (err) { note = "The picks could not be saved for members (" + (err.code || err.message) + "). Check the Firestore rules."; }
    try {
      await Store.fs.collection("broadcasts").doc(e.id + "-" + Date.now().toString(36)).set({
        kind: "vip", pkg: state.pk, ymd: state.ymd, audience: aud, title, body, odds: e.odds, delivered: n, createdAt: e.pubAt, emailDone: false
      });
    } catch (err) { note = note || "The message record could not be saved (" + (err.code || err.message) + ")."; }
    let mailNote = "", mailFail = false;
    if ($("#vpMsgMail").checked && n) {
      try { const m = await PBMail.send(mailTo, title, body); mailNote = "Emailed " + m.sent + " of " + n + (m.failed && m.failed.length ? " (some failed: " + esc(m.failed[0].detail || m.failed[0].status || "") + ")" : "") + "."; }
      catch (err) { mailNote = "Email not sent: " + (err.message || err); mailFail = true; }
    }
    Store.save(db); $("#stats").textContent = statsText();
    $("#vpMsgForm").hidden = true;
    const d = $("#vpMsgDone"); d.hidden = false;
    d.innerHTML = `<h2>Published</h2><div class="res ${(note || mailFail) ? "bad" : ""}"><b>Delivered to ${n} VIP member${n === 1 ? "" : "s"}</b><br>${note ? esc(note) : "Gold members" + " can see the picks in their VIP dashboard, and the message is in their notifications."}${mailNote ? "<br>" + esc(mailNote) : ""}</div><div class="acts"><button type="button" class="btn" id="vpMsgClose">Done</button></div>`;
    $("#vpMsgClose").onclick = () => { $("#vipPop").hidden = true; $("#vpMsgSend").textContent = "Publish"; load(); };
  }

  /* ---------- events ---------- */
  function wire() {
    $("#vpkDate").onchange = e => { state.ymd = e.target.value || todayStr(); load(); };
    $("#vpkPk").onchange = e => { state.pk = e.target.value; load(); };
    $("#vpkOdds").oninput = e => { state.odds = e.target.value; };
    $("#vpkAdd").onclick = () => { if (state.legs.length < MAXLEGS) { state.legs.push(emptyLeg()); paint(); } };
    $("#vpkDraft").onclick = saveDraft;
    $("#vpkPub").onclick = openPublish;
    $("#vpkDel").onclick = delPackage;
    $("#vpMsgCancel").onclick = () => { $("#vipPop").hidden = true; };
    $("#vpMsgSend").onclick = publish;
    const legs = $("#vpkLegs");
    legs.addEventListener("focusin", e => { if (e.target.classList.contains("lgm")) { const i = +e.target.closest(".leg").dataset.i; openList(e.target.nextElementSibling, i, ""); } });
    legs.addEventListener("input", e => {
      const leg = e.target.closest(".leg"); if (!leg) return; const i = +leg.dataset.i;
      if (e.target.classList.contains("lgm")) { state.legs[i].fid = ""; openList(e.target.nextElementSibling, i, e.target.value); }
      if (e.target.classList.contains("lgs")) state.legs[i].sel = e.target.value;
    });
    legs.addEventListener("change", e => {
      const leg = e.target.closest(".leg"); if (!leg) return; const i = +leg.dataset.i;
      if (e.target.classList.contains("lgk")) { state.legs[i].market = e.target.value; state.legs[i].sel = ""; paint(); }
      if (e.target.classList.contains("lgs")) state.legs[i].sel = e.target.value;
    });
    legs.addEventListener("click", e => {
      if (e.target.id === "vpkAll") { e.preventDefault(); state.allDates = true; const leg = e.target.closest(".leg"); openList(e.target.closest(".cbl"), +leg.dataset.i, leg.querySelector(".lgm").value); return; }
      const opt = e.target.closest(".cbl [data-id]");
      if (opt) { const i = +opt.closest(".leg").dataset.i; state.legs[i].fid = opt.dataset.id; paint(); return; }
      if (e.target.classList.contains("lgx")) { state.legs.splice(+e.target.closest(".leg").dataset.i, 1); paint(); }
    });
    document.addEventListener("click", e => { if (!e.target.closest("#vpkLegs .cb")) document.querySelectorAll("#vpkLegs .cbl").forEach(b => b.hidden = true); });
  }

  /* wait for the admin to finish loading, then add the tab */
  const t = setInterval(() => { if (document.querySelector('nav.tabs [data-tab="results"]') && typeof showTab === "function") { clearInterval(t); mount(); } }, 200);
})();
