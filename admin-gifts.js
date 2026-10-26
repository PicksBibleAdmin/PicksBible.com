/* PicksBible admin: "9. Bet Gifts" tab. A Bet Gift is a package (like a VIP package) given to members as an incentive,
   e.g. for finishing their registration. Members see active gifts under Bet Gifts in their dashboard.
   Uses page globals: Store, db, toast, esc, todayStr, showTab. */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const MK = {
    "1X2": ["Home Win", "Draw", "Away Win", "Home or Draw", "Away or Draw", "Home or Away"],
    "BTTS": ["Yes", "No"],
    "Over/Under": ["Over 1.5", "Over 2.5", "Over 3.5", "Under 2.5", "Under 3.5"],
    "Moneyline": ["Home Win", "Away Win"],
    "Spread": ["Home -6.5", "Away +6.5"],
    "Total Points": ["Over 220.5", "Under 220.5"],
    "Player Prop": ["LeBron James Over 25.5 Points", "Nikola Jokic Over 10.5 Rebounds"],
    "Handicap": ["Home -1", "Home +1", "Away +1", "Away -1"]
  };
  const MAXLEGS = 8, empty = () => ({ fid: "", market: "", sel: "" });
  let gifts = [], users = [], chosen = new Set(), legs = [empty()], editId = null, loaded = false;

  function mount() {
    const nav = document.querySelector("nav.tabs");
    if (!nav || $("#tab-gifts")) return;
    const btn = document.createElement("button");
    btn.setAttribute("role", "tab"); btn.dataset.tab = "gifts"; btn.setAttribute("aria-selected", "false"); btn.textContent = "9. Bet Gifts";
    (nav.querySelector('[data-tab="hub"]') || nav.querySelector('[data-tab="vip"]') || nav.lastElementChild).insertAdjacentElement("afterend", btn);
    btn.onclick = () => { showTab("gifts"); load(); };
    const sec = document.createElement("section"); sec.id = "tab-gifts"; sec.hidden = true;
    sec.innerHTML = `
<style>
#tab-gifts .leg{border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:12px;background:var(--panel-2)}
#tab-gifts .gl{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;border-top:1px solid var(--line);padding:10px 0}
#tab-gifts .gl small{display:block;color:var(--muted)}
</style>
<div class="card">
  <h2 id="bgTitle">New Bet Gift</h2>
  <p class="note">A free package for members as an incentive (for example, for finishing their registration). Every <b>shown</b> gift appears in the Bet Gifts tab of each member's dashboard, free and Gold. Matches and odds work like a VIP package.</p>
  <div class="row" style="margin-bottom:10px">
    <div style="flex:2;min-width:220px"><label>Gift name</label><input id="bgName" maxlength="80" value="Welcome Bet Gift"></div>
    <div><label>Matches on</label><input type="date" id="bgDate"></div>
    <div><label>Total odds</label><input id="bgOdds" inputmode="decimal" placeholder="e.g. 2.85" maxlength="7" style="width:110px"></div>
  </div>
  <label>Message shown above the gift (optional)</label><textarea id="bgNote" rows="2" maxlength="300" placeholder="e.g. Thank you for finishing your registration. This package is reserved for VIP members and is our gift to you."></textarea>
  <div id="bgLegs" style="margin-top:12px"></div>
  <div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn ghost" id="bgAdd">+ Add selection</button></div>
  <div class="row" style="margin-top:12px"><div><label>Who gets this gift</label><select id="bgAud"><option value="all">All registered members (free and Gold)</option><option value="specific">Specific members (tick them)</option></select></div></div>
  <div id="bgSpec" hidden style="margin-top:10px"><label>Tick the members (<span id="bgSpecN">0</span> ticked)</label><input id="bgSpecQ" placeholder="Search name or email"><div id="bgSpecL" style="max-height:240px;overflow:auto;border:1px solid var(--line);border-radius:10px;padding:6px 10px;margin-top:6px"></div></div>
  <label style="display:flex;gap:8px;align-items:center;text-transform:none;font-size:14px;color:var(--text);margin-top:12px"><input type="checkbox" id="bgShow" checked style="width:auto"> Show to members now</label>
  <p class="note" id="bgRes" style="margin-top:10px"></p>
  <div class="row" style="gap:8px"><button type="button" class="btn" id="bgSave">Save gift</button><button type="button" class="btn ghost" id="bgCancel" hidden>Cancel edit</button></div>
</div>
<div class="card">
  <h2>Your gifts <span class="muted" id="bgCount"></span></h2>
  <div id="bgList"><p class="note">Loading...</p></div>
</div>`;
    const prev = $("#tab-hub") || $("#tab-vip") || $("#tab-results");
    prev.insertAdjacentElement("afterend", sec);
    $("#bgDate").value = todayStr();
    $("#bgAdd").onclick = () => { if (legs.length < MAXLEGS) { legs.push(empty()); drawLegs(); } };
    $("#bgDate").onchange = () => { legs = [empty()]; drawLegs(); };
    $("#bgSave").onclick = save; $("#bgCancel").onclick = reset;
    $("#bgAud").onchange = specDraw; $("#bgSpecQ").oninput = specDraw;
    $("#bgSpecL").addEventListener("change", e => { const k = e.target.dataset.k; if (!k) return; e.target.checked ? chosen.add(k) : chosen.delete(k); $("#bgSpecN").textContent = chosen.size; });
    $("#bgLegs").addEventListener("change", e => {
      const row = e.target.closest(".leg"); if (!row) return; const l = legs[+row.dataset.i];
      if (e.target.classList.contains("gf")) l.fid = e.target.value;
      if (e.target.classList.contains("gm")) { l.market = e.target.value; l.sel = ""; drawLegs(); }
      if (e.target.classList.contains("gs")) l.sel = e.target.value;
    });
    $("#bgLegs").addEventListener("input", e => { if (e.target.classList.contains("gs")) legs[+e.target.closest(".leg").dataset.i].sel = e.target.value; });
    $("#bgLegs").addEventListener("click", e => { if (e.target.classList.contains("gx")) { legs.splice(+e.target.closest(".leg").dataset.i, 1); if (!legs.length) legs = [empty()]; drawLegs(); } });
    $("#bgList").addEventListener("click", onList);
    drawLegs();
  }

  const fxOn = () => (db.fixtures || []).filter(f => String(f.kickoff || "").slice(0, 10) === $("#bgDate").value && f.home && f.away).sort((a, b) => String(a.kickoff).localeCompare(String(b.kickoff)));
  function drawLegs() {
    const list = fxOn();
    $("#bgLegs").innerHTML = legs.map((l, i) => {
      const fo = list.map(f => `<option value="${esc(f.id)}" ${l.fid === f.id ? "selected" : ""}>${f.sport === "basketball" ? "🏀" : "⚽"} ${esc(f.home)} v ${esc(f.away)} · ${esc(f.competition || "")} · ${esc(String(f.kickoff).slice(11, 16))}</option>`).join("");
      const mk = Object.keys(MK).map(m => `<option ${l.market === m ? "selected" : ""}>${m}</option>`).join("");
      const dl = l.market ? MK[l.market].map(s => `<option value="${esc(s)}">`).join("") : "";
      return `<div class="leg" data-i="${i}"><div class="row" style="gap:10px;align-items:flex-end;flex-wrap:wrap">
        <div style="flex:3;min-width:240px"><label>Match</label><select class="gf"><option value="">Choose a match on this date</option>${fo}</select></div>
        <div style="flex:1;min-width:130px"><label>Market</label><select class="gm"><option value="">Market</option>${mk}</select></div>
        <div style="flex:2;min-width:180px"><label>Selection</label><input class="gs" list="bgdl${i}" value="${esc(l.sel)}" placeholder="${l.market ? "e.g. " + esc(MK[l.market][0]) : "Choose a market first"}"><datalist id="bgdl${i}">${dl}</datalist></div>
        <button type="button" class="btn danger sm gx">Remove</button></div></div>`;
    }).join("");
  }
  function specDraw() {
    const on = $("#bgAud").value === "specific"; $("#bgSpec").hidden = !on; if (!on) return;
    const q = $("#bgSpecQ").value.trim().toLowerCase();
    $("#bgSpecL").innerHTML = users.filter(u => !q || ((u.email || "") + " " + (u.name || "")).toLowerCase().includes(q)).slice(0, 300).map(u =>
      `<label style="display:flex;gap:8px;align-items:center;text-transform:none;font-size:13px;color:var(--text);margin:3px 0"><input type="checkbox" data-k="${esc(u.id)}" style="width:auto"${chosen.has(u.id) ? " checked" : ""}> ${esc(u.name || "(no name)")} - ${esc(u.email || "")} [${u.tier === "gold" ? "Gold" : "Free"}]</label>`).join("") || '<small class="muted">' + (loaded ? "Nobody found." : "Loading members...") + '</small>';
    $("#bgSpecN").textContent = chosen.size;
  }
  function reset() {
    chosen = new Set(); $("#bgAud").value = "all"; specDraw();
    editId = null; legs = [empty()]; $("#bgTitle").textContent = "New Bet Gift"; $("#bgSave").textContent = "Save gift"; $("#bgCancel").hidden = true;
    $("#bgName").value = "Welcome Bet Gift"; $("#bgOdds").value = ""; $("#bgNote").value = ""; $("#bgShow").checked = true; $("#bgDate").value = todayStr(); drawLegs();
  }
  async function save() {
    const out = t => { $("#bgRes").textContent = t; };
    const name = $("#bgName").value.trim(), odds = $("#bgOdds").value.trim().replace(",", ".");
    const done = legs.filter(l => l.fid && l.market && l.sel.trim());
    if (!name) return out("Give the gift a name.");
    if (!done.length) return out("Add at least one selection (match, market and pick).");
    if (done.length !== legs.filter(l => l.fid || l.market || l.sel.trim()).length) return out("Finish or remove the incomplete selection rows.");
    if (!(parseFloat(odds) > 1)) return out("Enter the total odds as a number above 1, for example 2.85.");
    const aud = $("#bgAud").value;
    if (aud === "specific" && !chosen.size) return out("Tick at least one member, or choose All registered members.");
    const doc = {
      kind: "gift", name, audience: aud, to: aud === "specific" ? Array.from(chosen) : [], odds: parseFloat(odds).toFixed(2), note: $("#bgNote").value.trim(), ymd: $("#bgDate").value, active: $("#bgShow").checked,
      st: (gifts.find(g => g.id === editId) || {}).st || "", createdAt: (gifts.find(g => g.id === editId) || {}).createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
      legs: done.map(l => { const f = db.fixtures.find(x => x.id === l.fid) || {}; return { fid: l.fid, sport: f.sport || "football", home: f.home || "", away: f.away || "", comp: f.competition || "", ko: f.kickoff || "", market: l.market, sel: l.sel.trim() }; })
    };
    const id = editId || "gift-" + Date.now().toString(36);
    $("#bgSave").disabled = true;
    try { await Store.fs.collection("gifts").doc(id).set(doc); out("Saved" + (doc.active ? " and shown to members." : " (hidden from members).")); reset(); await load(true); }
    catch (e) { out("Could not save (" + (e.code || e.message) + "). Publish the new Firestore rules first."); }
    $("#bgSave").disabled = false;
  }
  async function load(quiet) {
    try {
      Store.fs.collection("users").get().then(u => { users = []; u.forEach(d => users.push(Object.assign({ id: d.id }, d.data()))); users.sort((a, b) => String(a.name || a.email).localeCompare(String(b.name || b.email))); specDraw(); }).catch(() => {});
      const s = await Store.fs.collection("gifts").get(); gifts = []; s.forEach(d => gifts.push(Object.assign({ id: d.id }, d.data())));
      gifts.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))); loaded = true; draw();
    } catch (e) { if (!quiet) $("#bgList").innerHTML = '<p class="note">Could not load (' + esc(e.code || e.message) + '). Publish the new Firestore rules (firestore.rules) first.</p>'; }
  }
  function draw() {
    $("#bgCount").textContent = gifts.length ? "(" + gifts.length + ")" : "";
    $("#bgList").innerHTML = gifts.length ? gifts.map(g => `<div class="gl" data-id="${esc(g.id)}"><div><b>${esc(g.name)}</b> · odds ${esc(g.odds)} · ${(g.legs || []).length} selection${(g.legs || []).length === 1 ? "" : "s"}
        <small>${esc(g.ymd || "")} · ${g.audience === "specific" ? (g.to || []).length + " specific member" + ((g.to || []).length === 1 ? "" : "s") : "All registered members"} · ${g.active ? "Shown to members" : "Hidden"} · Result: ${esc(g.st || "pending")}</small></div>
        <div class="row" style="gap:6px;flex-wrap:wrap"><button type="button" class="btn ghost sm" data-a="tog">${g.active ? "Hide" : "Show"}</button>
        <button type="button" class="btn ghost sm" data-a="won">Won</button><button type="button" class="btn ghost sm" data-a="lost">Lost</button><button type="button" class="btn ghost sm" data-a="edit">Edit</button><button type="button" class="btn danger sm" data-a="del">Delete</button></div></div>`).join("") : '<p class="note">No gifts yet.</p>';
  }
  async function onList(e) {
    const b = e.target.closest("[data-a]"); if (!b) return; const g = gifts.find(x => x.id === b.closest(".gl").dataset.id); if (!g) return; const a = b.dataset.a;
    try {
      if (a === "tog") { await Store.fs.collection("gifts").doc(g.id).update({ active: !g.active }); g.active = !g.active; }
      else if (a === "won" || a === "lost") { const st = g.st === a ? "" : a; await Store.fs.collection("gifts").doc(g.id).update({ st }); g.st = st; }
      else if (a === "del") { if (!confirm("Delete the gift \"" + g.name + "\"? Members will no longer see it.")) return; await Store.fs.collection("gifts").doc(g.id).delete(); gifts = gifts.filter(x => x !== g); }
      else if (a === "edit") {
        editId = g.id; chosen = new Set(g.to || []); $("#bgAud").value = g.audience === "specific" ? "specific" : "all"; specDraw(); $("#bgTitle").textContent = "Edit Bet Gift"; $("#bgSave").textContent = "Save changes"; $("#bgCancel").hidden = false;
        $("#bgName").value = g.name; $("#bgOdds").value = g.odds; $("#bgNote").value = g.note || ""; $("#bgShow").checked = !!g.active; $("#bgDate").value = g.ymd || todayStr();
        legs = (g.legs || []).map(l => ({ fid: l.fid || "", market: l.market, sel: l.sel })); if (!legs.length) legs = [empty()]; drawLegs(); window.scrollTo(0, 0);
      }
      draw();
    } catch (err) { toast("Could not update (" + (err.code || err.message) + ")"); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
