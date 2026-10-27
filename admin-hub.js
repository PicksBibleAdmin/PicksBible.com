/* PicksBible admin: "8. Customers" hub. Loaded by admin.html after the main script.
   Uses page globals: Store (Store.fs, Store.auth), db, toast, esc, todayStr, showTab, firebase, PBMail (admin-vip.js). */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const TIERS = { free: "Free", gold: "Gold" };
  const SITE = "https://picksbible.com";
  let users = [], leads = [], filter = "all", q = "", loaded = false, picks = [], freeDate = "";

  const addDays = (ymd, n) => { const d = new Date(ymd + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const daysBetween = (a, b) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 864e5);
  const isPaid = u => u.tier === "gold" && u.paidUntil && u.paidUntil >= todayStr();
  const isExpired = u => u.tier === "gold" && !isPaid(u);
  const daysLeft = u => isPaid(u) ? daysBetween(todayStr(), u.paidUntil) : null;
  const expiring = u => isPaid(u) && daysLeft(u) <= 7;
  const nameOf = u => (u.name || [u.firstName, u.lastName].filter(Boolean).join(" ") || "").trim();
  const first = u => (nameOf(u).split(" ")[0] || "");
  const token = () => Array.from(crypto.getRandomValues(new Uint8Array(18)), b => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");

  function mount() {
    const nav = document.querySelector("nav.tabs");
    if (!nav || $("#tab-hub")) return;
    const btn = document.createElement("button");
    btn.setAttribute("role", "tab"); btn.dataset.tab = "hub"; btn.setAttribute("aria-selected", "false"); btn.id = "tabHubBtn"; btn.textContent = "8. Customers";
    (nav.querySelector('[data-tab="vip"]') || nav.querySelector('[data-tab="results"]')).insertAdjacentElement("afterend", btn);
    btn.onclick = () => { showTab("hub"); refresh(); };
    const sec = document.createElement("section"); sec.id = "tab-hub"; sec.hidden = true;
    sec.innerHTML = `
<style>
#tab-hub .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:14px}
#tab-hub .stat{background:var(--panel-2);border:1px solid var(--line);border-radius:10px;padding:10px 12px}
#tab-hub .stat b{display:block;font-size:22px}#tab-hub .stat span{color:var(--muted);font-size:12px}
#tab-hub .fl{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
#tab-hub .fl button{background:var(--panel-2);color:var(--muted);border:1px solid var(--line);border-radius:99px;padding:7px 14px;font:inherit;cursor:pointer}
#tab-hub .fl button[aria-pressed=true]{background:var(--purple);color:#fff;border-color:var(--purple)}
#tab-hub td select,#tab-hub td input{width:auto;padding:6px}
#tab-hub td input.dl{width:64px}
#tab-hub .pill{display:inline-block;padding:2px 9px;border-radius:99px;font-size:12px;font-weight:700;background:var(--panel-2)}
#tab-hub .pill.gold{background:#5a4500;color:#ffd75e}#tab-hub .pill.exp{background:#4a1d1d;color:#ff9b9b}
#tab-hub .act{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
#tab-hub .warn{background:#4a3a00;border:1px solid #f5b301;color:#ffe08a;border-radius:10px;padding:10px 12px;margin-bottom:12px;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}
#tab-hub .cb{position:relative}
#tab-hub .cbl{position:absolute;left:0;right:0;top:100%;z-index:30;max-height:280px;overflow:auto;border:1px solid var(--line);border-radius:10px;background:#120f2e;box-shadow:0 10px 30px #0008}
#tab-hub .cbl div{padding:9px 12px;cursor:pointer;border-bottom:1px solid var(--line);font-size:14px}#tab-hub .cbl div:hover{background:var(--panel-2)}#tab-hub .cbl small{color:var(--muted)}
#tab-hub .pk{display:grid;grid-template-columns:2fr 2fr auto;gap:8px;align-items:center;margin-bottom:8px}
@media(max-width:700px){#tab-hub .pk{grid-template-columns:1fr}}
</style>
<div class="card">
  <h2>Activate a paying customer</h2>
  <p class="note">After you confirm a payment on WhatsApp, type their email here. If they already have an account, their plan switches on. If they do not, an account is created for them and they get an email to set their own password.</p>
  <div class="row" style="margin-bottom:10px">
    <div style="flex:2;min-width:220px"><label>Customer email</label><input id="acEmail" type="email" placeholder="customer@email.com"></div>
    <div><label>Name (optional)</label><input id="acName"></div>
    <div><label>Plan</label><select id="acTier"><option value="gold">Gold</option></select></div>
    <div><label>Days</label><input id="acDays" type="number" min="1" max="3650" value="30" style="width:90px"></div>
  </div>
  <button type="button" class="btn" id="acGo">Activate</button> <span class="note" id="acRes"></span>
</div>

<div class="card">
  <h2>Customers</h2>
  <p class="note">Every free member and paying member in one list. Anyone who completes the popup is a free member; a note shows whether they have set a password yet.</p>
  <div class="stats" id="hbStats"></div>
  <div class="warn" id="hubWarn" hidden><span id="hubWarnTxt"></span><button type="button" class="btn sm" id="hubRemind">Send reminders (email + dashboard)</button></div>
  <div class="fl" id="hubFl" role="group" aria-label="Filter">
    <button type="button" data-f="all" aria-pressed="true">All members</button>
    <button type="button" data-f="paid" aria-pressed="false">Paid</button>
    <button type="button" data-f="gold" aria-pressed="false">Gold</button>
    <button type="button" data-f="expiring" aria-pressed="false">Expiring in 7 days</button>
    <button type="button" data-f="free" aria-pressed="false">Free</button>
    <button type="button" data-f="expired" aria-pressed="false">Expired</button>
  </div>
  <div class="row" style="margin-bottom:10px"><div style="flex:1;min-width:220px"><input id="hubQ" placeholder="Search name or email"></div>
    <div><button type="button" class="btn ghost" id="hubCsv">Download this list (CSV)</button> <button type="button" class="btn ghost" id="hubRef">Refresh</button></div></div>
  <p class="note" id="hubNote" style="margin-top:0"></p>
  <div class="tbl"><table class="ft"><thead id="hubHead"></thead><tbody id="hubBody"></tbody></table></div>
</div>

<div class="card">
  <h2>Email composer (picks optional)</h2>
  <p class="note">Compose the whole email: heading, message, up to 5 picks (or none, for a plain message such as a sign-up reminder) (edit the match, our pick and the odds as you like), and choose whether to include a link. Never sent to active VIP members or people who unsubscribed.</p>
  <div class="row" style="margin-bottom:10px"><div><label>Start from a template</label><select id="fpTpl"><option value="">Blank</option><option value="picks">Free picks of the day</option><option value="signup">Finish sign-up + VIP Bet Gift</option></select></div></div>
  <div class="row" style="margin-bottom:10px">
    <div><label>Send to</label><select id="fpAud"><option value="paid">Paid users (Gold)</option><option value="leads">Free users - no account set up</option><option value="freeacc">Free users - account set up</option><option value="freeall" selected>Free users - all combined</option><option value="specific">Specific customers (tick them)</option><option value="all">All users</option></select></div>
    <div><label>Matches from</label><input type="date" id="fpDate"></div>
    <div style="flex:1;min-width:260px" class="cb"><label>Add a match (max 5)</label><input id="fpSearch" autocomplete="off" placeholder="Click to open the list, or type a team or league"><div class="cbl" id="fpList" hidden></div></div>
    <div style="align-self:flex-end"><button type="button" class="btn ghost" id="fpCustom">+ Custom pick</button></div>
  </div>
  <div id="fpSpec" hidden style="margin-top:10px"><label>Tick the customers (<span id="fpSpecN">0</span> ticked)</label><input id="fpSpecQ" placeholder="Search name or email"><div id="fpSpecL" style="max-height:220px;overflow:auto;border:1px solid var(--line);border-radius:10px;padding:6px 10px;margin-top:6px"></div></div>
  <div id="fpPicks"></div>
  <label style="margin-top:6px">Email subject</label><input id="fpSubj" maxlength="150" value="Our model's best banker bets today"><div class="emj" data-for="fpSubj" style="margin-top:4px">${["🎁","🔥","✅","💰","⚽","🏀","🏆","👑","⚡","📈"].map(e => `<button type="button" class="btn ghost sm" style="padding:2px 8px" data-e="${e}">${e}</button>`).join(" ")}</div>
  <label style="margin-top:10px">Heading inside the email (optional)</label><input id="fpTitle" maxlength="150" placeholder="e.g. Gold has won 6 of its last 7 days"><div class="emj" data-for="fpTitle" style="margin-top:4px">${["🎁","🔥","✅","💰","⚽","🏀","🏆","👑","⚡","📈"].map(e => `<button type="button" class="btn ghost sm" style="padding:2px 8px" data-e="${e}">${e}</button>`).join(" ")}</div>
  <label style="margin-top:10px">Message above the picks (optional)</label><textarea id="fpBody" rows="3" maxlength="1500" placeholder="e.g. Our model is backing these picks today:"></textarea>
  <div class="row" style="margin-top:10px">
    <div><label>Button / link</label><select id="fpLink"><option value="none">No link</option><option value="home">Homepage (free picks)</option><option value="vip">VIP page (Premium)</option><option value="dash">Dashboard</option><option value="signup">Sign-up / finish registration</option><option value="custom">Custom web address</option></select></div>
    <div style="flex:1;min-width:180px"><label>Button text</label><input id="fpLbl" maxlength="40" placeholder="e.g. Finish registration"></div>
    <div style="flex:2;min-width:220px" id="fpUrlW" hidden><label>Web address (https://...)</label><input id="fpUrl" placeholder="https://picksbible.com/..."></div>
  </div>
  <label style="display:flex;gap:8px;align-items:center;text-transform:none;font-size:14px;color:var(--text);margin-top:10px"><input type="checkbox" id="fpSkip" checked style="width:auto"> Skip people who already got a free email today</label>
  <p class="note" id="fpInfo" style="margin-top:10px"></p>
  <button type="button" class="btn" id="fpSend">Send email</button>
  <p class="note" id="fpRes" style="margin-top:10px"></p>
</div>

<div class="card">
  <h2>Send a message</h2>
  <p class="note">Registered members also get it in their notifications on the site. People on the email list who have not registered yet can only be reached by email. Brevo free plan: up to 300 emails a day.</p>
  <div class="row" style="margin-bottom:10px">
    <div><label>Send to</label><select id="bcAud"><option value="paid">Paid users (Gold)</option><option value="leads">Free users - no account set up</option><option value="freeacc">Free users - account set up</option><option value="freeall">Free users - all combined</option><option value="specific">Specific customers (tick them)</option><option value="all" selected>All users</option></select></div>
  </div>
  <div id="bcSpec" hidden style="margin-top:10px"><label>Tick the customers (<span id="bcSpecN">0</span> ticked)</label><input id="bcSpecQ" placeholder="Search name or email"><div id="bcSpecL" style="max-height:220px;overflow:auto;border:1px solid var(--line);border-radius:10px;padding:6px 10px;margin-top:6px"></div></div>
  <label style="margin-top:10px">Message title</label><input id="bcTitle" maxlength="120"><div class="emj" data-for="bcTitle" style="margin-top:4px">${["🎁","🔥","✅","💰","⚽","🏀","🏆","👑","⚡","📈"].map(e => `<button type="button" class="btn ghost sm" style="padding:2px 8px" data-e="${e}">${e}</button>`).join(" ")}</div>
  <label style="margin-top:10px">Message body</label><textarea id="bcBody" rows="4" maxlength="1000"></textarea>
  <div class="row" style="margin-top:10px">
    <div><label>Button / link</label><select id="bcLink"><option value="none">No link</option><option value="home">Homepage (free picks)</option><option value="vip">VIP page (Premium)</option><option value="dash">Dashboard</option><option value="signup">Sign-up / finish registration</option><option value="custom">Custom web address</option></select></div>
    <div style="flex:1;min-width:180px"><label>Button text</label><input id="bcLbl" maxlength="40" placeholder="e.g. Finish registration"></div>
    <div style="flex:2;min-width:220px" id="bcUrlW" hidden><label>Web address (https://...)</label><input id="bcUrl" placeholder="https://picksbible.com/..."></div>
  </div>
  <label style="display:flex;gap:8px;align-items:center;text-transform:none;font-size:14px;color:var(--text);margin-top:10px"><input type="checkbox" id="bcMail" checked style="width:auto"> Also send by email</label>
  <p class="note" id="bcRes" style="margin-top:10px"></p>
  <button type="button" class="btn" id="bcSend">Send message</button>
</div>`;
    const prev = $("#tab-vip") || $("#tab-results");
    prev.insertAdjacentElement("afterend", sec);
    $("#fpDate").value = freeDate = todayStr();
    wire();
    /* once the admin is signed in, load quietly so the tab can show how many plans are about to end */
    const w = setInterval(() => { if (Store.auth && Store.auth.currentUser) { clearInterval(w); refresh(true); } }, 2000);
  }

  async function refresh(quiet) {
    if (!quiet) $("#hubNote").textContent = "Loading...";
    try {
      const [u, l] = await Promise.all([Store.fs.collection("users").get(), Store.fs.collection("leads").get()]);
      users = []; leads = [];
      u.forEach(d => users.push(Object.assign({ id: d.id }, d.data())));
      l.forEach(d => leads.push(Object.assign({ id: d.id }, d.data())));
      users.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      leads.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      loaded = true; paint(); freeInfo(); specDraw("fp"); specDraw("bc");
    } catch (e) { if (!quiet) $("#hubNote").textContent = "Could not load (" + (e.code || e.message) + "). Make sure the new Firestore rules are published."; }
  }
  /* popup/exit/checkout signups who have not yet chosen a password: they are free members too, shown in the same list */
  const waOf = u => u.whatsapp || ((leads.find(l => (l.email || "").toLowerCase() === (u.email || "").toLowerCase()) || {}).whatsapp) || "";
  function pending() {
    const have = new Set(users.map(u => (u.email || "").toLowerCase()));
    return leads.filter(l => l.email && !have.has(l.email.toLowerCase())).map(l => ({ id: "lead:" + l.id, email: l.email, name: nameOf(l), tier: "free", pending: true, whatsapp: l.whatsapp || "", source: l.source || "", createdAt: l.createdAt, unsub: l.unsub }));
  }
  function view() {
    if (filter === "all" || filter === "free") {
      return users.filter(u => filter === "all" || u.tier === "free").concat(pending()).filter(u => !q || ((u.email || "") + " " + nameOf(u)).toLowerCase().includes(q)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    }
    if (filter === "leads") {
      const have = new Set(users.map(u => (u.email || "").toLowerCase()));
      return leads.filter(l => !q || (l.email + " " + nameOf(l)).toLowerCase().includes(q)).map(l => Object.assign({ member: have.has((l.email || "").toLowerCase()) }, l));
    }
    return users.filter(u => {
      if (filter === "paid" && !isPaid(u)) return false;
      if (filter === "gold" && !(isPaid(u) && u.tier === "gold")) return false;
      if (filter === "expiring" && !expiring(u)) return false;
      if (filter === "free" && (u.tier !== "free")) return false;
      if (filter === "expired" && !isExpired(u)) return false;
      return !q || ((u.email || "") + " " + nameOf(u)).toLowerCase().includes(q);
    });
  }
  function paint() {
    const paid = users.filter(isPaid), exp = users.filter(expiring);
    $("#hbStats").innerHTML = [["Members", users.length + pending().length], ["Paid", paid.length], ["Gold", paid.filter(u => u.tier === "gold").length], ["Ending in 7 days", exp.length], ["Free", users.filter(u => u.tier === "free").length + pending().length], ["Expired", users.filter(isExpired).length]]
      .map(s => `<div class="stat"><b>${s[1]}</b><span>${s[0]}</span></div>`).join("");
    const todo = exp.filter(u => u.remindedFor !== u.paidUntil);
    $("#hubWarn").hidden = !exp.length;
    $("#hubWarnTxt").textContent = exp.length + " plan" + (exp.length === 1 ? "" : "s") + " end within 7 days" + (todo.length ? " (" + todo.length + " not reminded yet)." : " (all reminded).");
    $("#hubRemind").disabled = !todo.length;
    const tb = $("#tabHubBtn"); if (tb) tb.textContent = "8. Customers" + (exp.length ? " (" + exp.length + " ending)" : "");
    document.querySelectorAll("#hubFl button").forEach(b => b.setAttribute("aria-pressed", b.dataset.f === filter));
    const rows = view();
    $("#hubNote").textContent = rows.length + " member" + (rows.length === 1 ? "" : "s") + " shown.";
    if (filter === "leads") {
      $("#hubHead").innerHTML = "<tr><th>Joined</th><th>Name</th><th>Email</th><th>WhatsApp</th><th>Source</th><th>Plan tried</th><th>Member?</th><th>Emails</th></tr>";
      $("#hubBody").innerHTML = rows.length ? rows.map(l => `<tr><td>${esc(String(l.createdAt || "").slice(0, 10))}</td><td>${esc(nameOf(l))}</td><td>${esc(l.email)}</td><td>${esc(l.whatsapp || "")}</td><td>${esc(l.source || "")}</td><td>${esc(l.plan || "")}</td><td>${l.member ? "Yes" : "-"}</td><td>${l.unsub ? "Unsubscribed" : "On"} <button type="button" class="btn danger sm delLeadId" data-i="${esc(l.id)}">Delete</button></td></tr>`).join("") : '<tr><td colspan="8" class="empty">Nobody here yet.</td></tr>';
      return;
    }
    $("#hubHead").innerHTML = "<tr><th>Joined</th><th>Name</th><th>Email</th><th>WhatsApp</th><th>Plan</th><th>Active until</th><th>Actions</th></tr>";
    $("#hubBody").innerHTML = rows.length ? rows.map(u => {
      const on = isPaid(u), ex = isExpired(u), dl = daysLeft(u);
      if (u.pending) return `<tr><td>${esc(String(u.createdAt || "").slice(0, 10))}</td><td>${esc(nameOf(u))}</td><td>${esc(u.email)}</td><td>${esc(u.whatsapp)}</td><td><span class="pill">Free</span></td><td>-</td><td><small class="muted">Gave email${u.source ? " (" + esc(u.source) + ")" : ""}, has not set a password yet${u.unsub ? ". Unsubscribed" : ""}</small> <button type="button" class="btn danger sm delLead" data-e="${esc(u.email)}">Delete</button></td></tr>`;
      const pill = `<span class="pill ${on ? u.tier : ex ? "exp" : ""}">${ex ? TIERS[u.tier] + " (expired)" : TIERS[u.tier] || "Free"}</span>`;
      return `<tr data-id="${esc(u.id)}"><td>${esc(String(u.createdAt || "").slice(0, 10))}</td><td>${esc(nameOf(u))}</td><td>${esc(u.email)}</td><td>${esc(waOf(u))}</td><td>${pill}</td><td>${esc(u.paidUntil || "-")}${on ? " <small class='muted'>(" + dl + " day" + (dl === 1 ? "" : "s") + " left)</small>" : ""}</td>
        <td><div class="act"><select class="mpT"><option value="gold">Gold</option></select>
        <select class="mpD"><option value="30">30 days</option><option value="7">7 days</option><option value="90">90 days</option><option value="365">1 year</option></select>
        <button type="button" class="btn sm mpGo">${on ? "Extend" : "Mark paid"}</button>
        ${on ? `<input class="dl" type="number" min="0" max="3650" value="${dl}" title="Days left"><button type="button" class="btn ghost sm mpSet">Set days left</button>` : ""}
        ${(on || ex) ? '<button type="button" class="btn ghost sm mpFree">Set free</button>' : ""}<button type="button" class="btn danger sm delUser">Delete</button></div></td></tr>`;
    }).join("") : '<tr><td colspan="7" class="empty">No members match.</td></tr>';
    rows.forEach(u => { const tr = document.querySelector(`#hubBody tr[data-id="${CSS.escape(u.id)}"]`); if (tr && u.tier === "gold") tr.querySelector(".mpT").value = u.tier; });
  }

  /* ---------- delete (test emails, duplicates) ---------- */
  async function delRecords(coll, recs, email) {
    if (!recs.length) return;
    const isU = coll === "users", paid = isU && recs[0] && isPaid(recs[0]);
    if (!confirm("Delete " + (email || "this record") + " from the list?" + (paid ? "\n\nWARNING: this is a PAID member." : "") + (isU ? "\n\nThis removes their member record and plan. Their login stays in Firebase > Authentication until you delete it there." : "") + "\n\nThis cannot be undone.")) return;
    try {
      await Promise.all(recs.map(r => Store.fs.collection(coll).doc(r.id).delete()));
      if (isU) { const ml = leads.filter(l => String(l.email || "").toLowerCase() === String(email || "").toLowerCase()); await Promise.all(ml.map(l => Store.fs.collection("leads").doc(l.id).delete())); leads = leads.filter(l => !ml.includes(l)); }
      const gone = new Set(recs.map(r => r.id));
      if (isU) users = users.filter(u => !gone.has(u.id)); else leads = leads.filter(l => !gone.has(l.id));
      toast("Deleted " + (email || "")); paint(); freeInfo(); specDraw("fp"); specDraw("bc");
    } catch (err) { toast("Could not delete: " + (err.code || err.message)); }
  }

  /* ---------- plans ---------- */
  async function savePlan(u, tier, until) {
    const patch = { tier };
    if (tier === "free") { patch.paidUntil = ""; patch.paidUntilTs = firebase.firestore.FieldValue.delete(); }
    else { patch.paidUntil = until; patch.paidUntilTs = firebase.firestore.Timestamp.fromDate(new Date(until + "T23:59:59Z")); }
    await Store.fs.collection("users").doc(u.id).update(patch);
    Object.assign(u, { tier, paidUntil: patch.paidUntil || "" });
  }
  async function setPlan(id, tier, days) {
    const u = users.find(x => x.id === id); if (!u) return;
    try {
      /* extending the same plan adds on top of the days that are left */
      const base = tier !== "free" && isPaid(u) && u.tier === tier ? u.paidUntil : todayStr();
      await savePlan(u, tier, tier === "free" ? "" : addDays(base, days));
      toast(tier === "free" ? "Set to free" : TIERS[tier] + " active until " + u.paidUntil); paint();
    } catch (e) { toast("Could not save: " + (e.code || e.message)); }
  }
  async function setDaysLeft(id, n) {
    const u = users.find(x => x.id === id); if (!u || !isPaid(u)) return;
    if (!(n >= 0 && n <= 3650)) return toast("Enter a number of days from 0 to 3650");
    try { await savePlan(u, u.tier, addDays(todayStr(), n)); toast("Now " + n + " day" + (n === 1 ? "" : "s") + " left (until " + u.paidUntil + ")"); paint(); }
    catch (e) { toast("Could not save: " + (e.code || e.message)); }
  }
  async function activate() {
    const em = $("#acEmail").value.trim().toLowerCase(), nm = $("#acName").value.trim(), tier = $("#acTier").value, days = parseInt($("#acDays").value, 10);
    const out = t => { $("#acRes").textContent = t; };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) return out("Enter a valid email address.");
    if (!(days >= 1)) return out("Enter the number of days.");
    $("#acGo").disabled = true; out("Working...");
    try {
      if (!loaded) await refresh(true);
      let u = users.find(x => (x.email || "").toLowerCase() === em), made = false;
      if (!u) {
        /* create the account with a throw-away password on a second connection, so the admin stays signed in;
           the customer then chooses their own password from the email */
        const sec = firebase.apps.find(a => a.name === "sec") || firebase.initializeApp(firebase.app().options, "sec");
        const sa = sec.auth(), sf = sec.firestore();
        let cred;
        try { cred = await sa.createUserWithEmailAndPassword(em, token() + "Aa1"); }
        catch (e) {
          if (e.code === "auth/email-already-in-use") { out("This email already has a login but no profile. Ask the customer to log in once at picksbible.com/account.html, then press Activate again."); $("#acGo").disabled = false; return; }
          throw e;
        }
        const rec = { email: em, name: nm.slice(0, 80), tier: "free", createdAt: new Date().toISOString(), source: "admin" };
        await sf.collection("users").doc(cred.user.uid).set(rec);
        try { await sa.sendPasswordResetEmail(em); } catch (_) {}
        await sa.signOut();
        u = Object.assign({ id: cred.user.uid }, rec); users.unshift(u); made = true;
      }
      const base = isPaid(u) && u.tier === tier ? u.paidUntil : todayStr();
      await savePlan(u, tier, addDays(base, days));
      out((made ? "Account created and a password email was sent to " + em + ". " : "") + TIERS[tier] + " is active for " + em + " until " + u.paidUntil + ".");
      $("#acEmail").value = ""; $("#acName").value = ""; paint();
    } catch (e) { out("Could not activate: " + (e.code || e.message)); }
    $("#acGo").disabled = false;
  }

  /* ---------- reminders ---------- */
  async function remind() {
    const todo = users.filter(u => expiring(u) && u.remindedFor !== u.paidUntil);
    if (!todo.length) return;
    $("#hubRemind").disabled = true; let sent = 0, mailed = 0, fail = "";
    for (const u of todo) {
      const dl = daysLeft(u), plan = TIERS[u.tier];
      const title = "Your " + plan + " plan ends " + (dl <= 0 ? "today" : "in " + dl + " day" + (dl === 1 ? "" : "s"));
      const body = "Hi" + (first(u) ? " " + first(u) : "") + ", your " + plan + " VIP plan ends on " + u.paidUntil + ". Renew on the VIP page so you do not miss any picks.";
      try {
        await Store.fs.collection("notes").add({ to: u.id, title, body, createdAt: new Date().toISOString() }); sent++;
        try { if (u.email) { const m = await PBMail.send([{ email: u.email, name: first(u) }], title, body); mailed += m.sent || 0; } } catch (e) { fail = e.message || String(e); }
        await Store.fs.collection("users").doc(u.id).update({ remindedFor: u.paidUntil }); u.remindedFor = u.paidUntil;
      } catch (e) { fail = e.code || e.message; }
    }
    toast("Reminders: " + sent + " dashboard, " + mailed + " emailed" + (fail ? " (" + fail + ")" : "")); paint();
  }

  /* ---------- free picks email ---------- */
  const lbl = (f, key) => {
    const v = (f.sport === "basketball" ? f.bb : f.fb) || {}, t = String(v.tip || "").toUpperCase().replace(/\s+/g, "");
    if (f.sport === "basketball") { const sp = v.spread ? " (" + (/^[+-]/.test(String(v.spread).trim()) ? "" : "+") + String(v.spread).trim() + ")" : ""; return t === "1" ? f.home + " to win" + sp : t === "2" ? f.away + " to win" + sp : ""; }
    return ({ "1": f.home + " to win", "X": "Draw", "2": f.away + " to win", "1X": f.home + " or draw", "X1": f.home + " or draw", "X2": f.away + " or draw", "2X": f.away + " or draw", "12": f.home + " or " + f.away + " to win" })[t] || "";
  };
  const oddsFx = f => { const v = (f.sport === "basketball" ? f.bb : f.fb) || {}, n = parseFloat(String(v.odds || "").replace(",", ".")); return n > 1 ? n.toFixed(2) : ""; };
  function fpDraw() {
    $("#fpPicks").innerHTML = picks.map((p, i) => `<div class="pk" data-i="${i}" style="display:flex;gap:6px;flex-wrap:wrap;align-items:flex-end;margin-bottom:8px"><div style="flex:2;min-width:180px"><label>Match</label><input class="fpm" value="${esc(p.match)}" maxlength="120"></div><div style="flex:1;min-width:130px"><label>Info (league, time)</label><input class="fpi" value="${esc(p.meta)}" maxlength="120"></div><div style="flex:2;min-width:170px"><label>Our pick</label><input class="fpp" value="${esc(p.pick)}" placeholder="e.g. Celtic to win" maxlength="120"></div><div style="width:84px"><label>Odds</label><input class="fpo" value="${esc(p.odds || "")}" placeholder="1.85" inputmode="decimal" maxlength="7"></div><button type="button" class="btn danger sm fpx">Remove</button></div>`).join("") || '<p class="note">No picks yet. Add a match from the list, or press + Custom pick.</p>';
    freeInfo();
  }
  function fpOptions(text) {
    const day = $("#fpDate").value, qq = (text || "").trim().toLowerCase(), used = new Set(picks.map(p => p.id));
    return (db.fixtures || []).filter(f => String(f.kickoff || "").slice(0, 10) === day && f.home && f.away && !used.has(f.id) && (!qq || (f.home + " " + f.away + " " + (f.competition || "")).toLowerCase().includes(qq)))
      .sort((a, b) => String(a.kickoff).localeCompare(String(b.kickoff))).slice(0, 150);
  }
  function fpOpen() {
    if (picks.length >= 5) { $("#fpList").hidden = true; return; }
    const l = fpOptions($("#fpSearch").value);
    $("#fpList").innerHTML = l.length ? l.map(f => `<div data-id="${esc(f.id)}">${f.sport === "basketball" ? "🏀" : "⚽"} ${esc(f.home)} v ${esc(f.away)} <small>· ${esc(f.competition || "")} · ${esc(String(f.kickoff).slice(11, 16))}</small></div>`).join("") : '<div class="muted">No matches on this date.</div>';
    $("#fpList").hidden = false;
  }
  /* audiences. "account" = registered; "no account" = gave an email in a popup/checkout but never registered */
  const sel = { fp: new Set(), bc: new Set() };
  const regEmails = () => new Set(users.map(u => (u.email || "").toLowerCase()));
  function everyone() {   /* every member, registered or not, as one list */
    const have = regEmails(), out = users.map(u => ({ key: "u:" + u.id, coll: "users", d: u, email: String(u.email || "").toLowerCase(), name: first(u), label: (nameOf(u) || "(no name)") + " - " + (u.email || "") + (isPaid(u) ? " [Gold]" : " [Free, account]") }));
    leads.forEach(l => { const e = String(l.email || "").toLowerCase(); if (e && !have.has(e)) out.push({ key: "l:" + l.id, coll: "leads", d: l, email: e, name: first(l), label: (nameOf(l) || "(no name)") + " - " + l.email + " [Free, no account]" }); });
    return out;
  }
  function audience(key, chosen) {
    const today = todayStr(), seen = new Set(), out = [], all = everyone();
    const kind = x => x.coll === "leads" ? "lead" : isPaid(x.d) ? "paid" : "free";
    const want = { paid: ["paid"], freeacc: ["free"], leads: ["lead"], freeall: ["free", "lead"], all: ["paid", "free", "lead"] }[key];
    all.filter(x => key === "specific" ? chosen && chosen.has(x.key) : want.includes(kind(x))).sort((a, b) => (kind(a) === "paid" ? 0 : 1) - (kind(b) === "paid" ? 0 : 1)).forEach(x => {
      if (!x.email || seen.has(x.email) || x.d.unsub) return; seen.add(x.email);
      out.push(Object.assign({ tier: kind(x), done: x.d.freeSent === today }, x));
    });
    return out;
  }
  const freeAudience = () => audience($("#fpAud").value, sel.fp);
  /* the tick-list for "Specific customers" */
  function specDraw(p) {
    const box = $("#" + p + "Spec"), on = $("#" + p + "Aud").value === "specific"; box.hidden = !on; if (!on) return;
    const qq = $("#" + p + "SpecQ").value.trim().toLowerCase();
    $("#" + p + "SpecL").innerHTML = everyone().filter(x => !qq || x.label.toLowerCase().includes(qq)).slice(0, 200).map(x => `<label style="display:flex;gap:8px;align-items:center;text-transform:none;font-size:13px;color:var(--text);margin:3px 0"><input type="checkbox" data-k="${esc(x.key)}" style="width:auto"${sel[p].has(x.key) ? " checked" : ""}> ${esc(x.label)}${x.d.unsub ? " (unsubscribed - will be skipped)" : ""}</label>`).join("") || '<small class="muted">Nobody found.</small>';
    $("#" + p + "SpecN").textContent = sel[p].size;
  }
  function freeInfo() {
    if (!loaded) { $("#fpInfo").textContent = "Loading the list..."; return; }
    const a = freeAudience(), skip = $("#fpSkip").checked, todo = skip ? a.filter(x => !x.done) : a;
    $("#fpInfo").textContent = a.length + " people can receive this. " + (a.length - todo.length) + " already got today's free email. " + Math.min(todo.length, 300) + " will be sent now (Brevo free plan: 300 emails a day" + (todo.length > 300 ? ", press Send again tomorrow for the rest" : "") + ").";
  }
  /* link choices shared by both cards */
  const LINKS = { home: [SITE + "/", "See all free picks"], vip: [SITE + "/premium.html", "See the VIP packages"], dash: [SITE + "/account.html", "Open your dashboard"], signup: [SITE + "/account.html#signup", "Finish your registration"] };
  function linkOf(p) {
    const t = $("#" + p + "Link").value; if (t === "none") return null;
    const lab = $("#" + p + "Lbl").value.trim();
    if (t === "custom") { const u = $("#" + p + "Url").value.trim(); if (!/^https:\/\/\S{3,}$/.test(u)) throw new Error("Custom web address must start with https://"); return { url: u, label: lab || "Open link" }; }
    return { url: LINKS[t][0], label: lab || LINKS[t][1] };
  }
  function wireLink(p) {
    const sel = $("#" + p + "Link");
    sel.onchange = () => { $("#" + p + "UrlW").hidden = sel.value !== "custom"; $("#" + p + "Lbl").placeholder = LINKS[sel.value] ? LINKS[sel.value][1] : "Button text"; $("#" + p + "Lbl").disabled = sel.value === "none"; };
    sel.onchange();
  }
  /* give every recipient a private unsubscribe key (once), so their unsubscribe link cannot be guessed by anyone else */
  async function prepRec(todo) {
    let batch = Store.fs.batch(), n = 0; const jobs = [];
    todo.forEach(x => { if (!x.d.unsubToken) { x.d.unsubToken = token(); batch.update(Store.fs.collection(x.coll).doc(x.d.id), { unsubToken: x.d.unsubToken }); if (++n >= 400) { jobs.push(batch.commit()); batch = Store.fs.batch(); n = 0; } } });
    if (n) jobs.push(batch.commit()); await Promise.all(jobs);
    return todo.map(x => ({ email: x.email, name: x.name, unsub: SITE + "/unsubscribe.html?c=" + (x.coll === "users" ? "u" : "l") + "&i=" + encodeURIComponent(x.d.id) + "&t=" + x.d.unsubToken }));
  }
  /* a short campaign label (date + words of the title) so Brevo can group the stats */
  const tagOf = t => todayStr() + "-" + String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);
  async function sendFree() {
    const out = t => { $("#fpRes").textContent = t; };
    const chosen = picks.map(p => ({ match: p.match.trim(), pick: p.pick.trim(), meta: p.meta.trim(), odds: String(p.odds || "").trim() }));
    if (!chosen.length && !$("#fpBody").value.trim()) return out("Add at least one pick, or write a message above the picks.");
    if (chosen.some(p => !p.match || !p.pick)) return out("Fill in the match and our pick for every row, or remove the row.");
    if (chosen.some(p => p.odds && !(parseFloat(p.odds.replace(",", ".")) > 1))) return out("Odds must be a number above 1, for example 1.85 (or leave it empty).");
    let link; try { link = linkOf("fp"); } catch (e) { return out(e.message); }
    if (!loaded) await refresh(true);
    const skip = $("#fpSkip").checked && chosen.length > 0, todo = freeAudience().filter(x => !skip || !x.done).slice(0, 300);
    if (!todo.length) return out("Nobody left to send to.");
    if (!confirm("Send this email to " + todo.length + " people?")) return;
    $("#fpSend").disabled = true; out("Preparing...");
    try {
      const rec = await prepRec(todo);
      out("Sending to " + rec.length + "...");
      const m = await PBMail.sendFree(rec, $("#fpSubj").value.trim() || "Our model's best banker bets today", chosen, { title: $("#fpTitle").value.trim(), text: $("#fpBody").value.trim(), link, tag: tagOf($("#fpSubj").value) });
      const ok = m.sent || 0;
      if (ok) {
        const mark = chosen.length ? todo.slice(0, ok === rec.length ? rec.length : 0) : [];   /* if only part of a batch failed we cannot tell who, so do not mark anyone */
        let b = Store.fs.batch(), c = 0; const js = [];
        mark.forEach(x => { b.update(Store.fs.collection(x.coll).doc(x.d.id), { freeSent: todayStr() }); x.d.freeSent = todayStr(); if (++c >= 400) { js.push(b.commit()); b = Store.fs.batch(); c = 0; } });
        if (c) js.push(b.commit()); await Promise.all(js);
        if (chosen.length && todo.some(x => x.coll === "users")) try { await Store.fs.collection("broadcasts").doc("free-" + Date.now().toString(36)).set({ kind: "free", audience: ["free"], title: $("#fpTitle").value.trim() || "Today's free picks are live", body: $("#fpBody").value.trim() || "Our model's best banker bets for today are on the PicksBible homepage.", createdAt: new Date().toISOString(), delivered: ok }); } catch (_) {}
      }
      out("Emailed " + ok + " of " + rec.length + " people." + (m.failed && m.failed.length ? " Some failed: " + (m.failed[0].detail || m.failed[0].status || "") : ""));
      freeInfo();
    } catch (e) { out("Not sent: " + (e.message || e.code || e)); }
    $("#fpSend").disabled = false;
  }

  /* ---------- csv + messages ---------- */
  function csv() {
    const rows = view(), esq = v => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const out = filter === "leads"
      ? [["joined", "first_name", "last_name", "email", "whatsapp", "source", "plan_tried", "unsubscribed"]].concat(rows.map(l => [l.createdAt, l.firstName, l.lastName, l.email, l.whatsapp, l.source, l.plan, l.unsub ? "yes" : ""]))
      : [["joined", "name", "email", "whatsapp", "plan", "password_set", "active_until", "days_left"]].concat(rows.map(u => [u.createdAt, nameOf(u), u.email, waOf(u), u.tier, u.pending ? "no" : "yes", u.paidUntil, u.pending ? "" : daysLeft(u)]));
    const blob = new Blob([out.map(r => r.map(esq).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "picksbible-" + filter + "-" + todayStr() + ".csv"; document.body.appendChild(a); a.click(); a.remove();
  }
  async function send() {
    const title = $("#bcTitle").value.trim(), body = $("#bcBody").value.trim(), key = $("#bcAud").value, res = t => { $("#bcRes").textContent = t; };
    if (!title || !body) return toast("Fill in the title and the message");
    let link; try { link = linkOf("bc"); } catch (e) { return res(e.message); }
    if (!loaded) await refresh(true);
    const list = audience(key, sel.bc), members = list.filter(x => x.coll === "users"), isLeads = !members.length;
    const wantMail = $("#bcMail").checked || isLeads;
    if (!list.length) return res("Nobody matches that audience.");
    if (!confirm("Send this message to " + list.length + " " + (list.length === 1 ? "person" : "people") + (wantMail ? " (by email)" : " (notification only)") + "?")) return;
    $("#bcSend").disabled = true;
    try {
      let out = "";
      if (members.length) {
        /* one dashboard notification per registered member (so specific ticks and tiers are exact) */
        const now = new Date().toISOString(); let b = Store.fs.batch(), c = 0; const js = [];
        members.forEach(x => { b.set(Store.fs.collection("notes").doc(), { to: x.d.id, title, body, createdAt: now }); if (++c >= 400) { js.push(b.commit()); b = Store.fs.batch(); c = 0; } });
        if (c) js.push(b.commit()); await Promise.all(js);
        out = "Notification delivered to " + members.length + " registered member" + (members.length === 1 ? "" : "s") + ". ";
      }
      if (wantMail) {
        const todo = list.slice(0, 300);
        try {
          const rec = await prepRec(todo);
          const m = await PBMail.send(rec, title, body, { link, tag: tagOf(title) });
          out += "Brevo accepted " + m.sent + " of " + rec.length + (m.failed && m.failed.length ? " (" + (m.failed[0].detail || m.failed[0].status || "some failed") + ")" : "") + "." + (list.length > 300 ? " " + (list.length - 300) + " more left: press Send again tomorrow." : "");
        } catch (err) { out += "Email NOT sent: " + (err.message || err); }
      }
      res(out);
      $("#bcTitle").value = ""; $("#bcBody").value = "";
    } catch (e) { res("Could not send (" + (e.code || e.message) + ")."); }
    $("#bcSend").disabled = false;
  }

  const TPL = {
    picks: { aud: "freeall", subj: "Our model's best banker bets today", title: "", body: "Our model is backing these picks today:", link: "home", lbl: "" },
    signup: { aud: "leads", subj: "Finish signing up to claim your VIP Bet Gift \uD83C\uDF81", title: "Your VIP Bet Gift is waiting \uD83C\uDF81", body: "You shared your email with PicksBible but never finished creating your member account.\nFinish in under a minute and you unlock a Bet Gift: a VIP package reserved for our VIP members, free for you.\nSign up with the same email you gave us, then open Bet Gifts in your dashboard.", link: "signup", lbl: "Claim my Bet Gift" }
  };
  function wire() {
    $("#fpTpl").onchange = () => { const t = TPL[$("#fpTpl").value]; if (!t) return; $("#fpAud").value = t.aud; $("#fpSubj").value = t.subj; $("#fpTitle").value = t.title; $("#fpBody").value = t.body; $("#fpLink").value = t.link; $("#fpLbl").value = t.lbl; $("#fpLink").onchange(); specDraw("fp"); freeInfo(); if ($("#fpTpl").value === "signup") { picks = []; fpDraw(); } };
    document.addEventListener("click", e => { const b = e.target.closest(".emj [data-e]"); if (!b) return; const i = document.getElementById(b.closest(".emj").dataset.for); i.value = (i.value + " " + b.dataset.e).trim(); i.focus(); });
    $("#hubFl").onclick = e => { const b = e.target.closest("[data-f]"); if (b) { filter = b.dataset.f; paint(); } };
    $("#hubQ").oninput = e => { q = e.target.value.trim().toLowerCase(); paint(); };
    $("#hubRef").onclick = () => refresh(); $("#hubCsv").onclick = csv; $("#bcSend").onclick = send; $("#acGo").onclick = activate; $("#hubRemind").onclick = remind; $("#fpSend").onclick = sendFree; wireLink("fp"); wireLink("bc"); $("#fpAud").onchange = () => { specDraw("fp"); freeInfo(); }; $("#fpSkip").onchange = freeInfo; $("#bcAud").onchange = () => specDraw("bc");
    ["fp", "bc"].forEach(p => { $("#" + p + "SpecQ").oninput = () => specDraw(p); $("#" + p + "SpecL").addEventListener("change", e => { const k = e.target.dataset.k; if (!k) return; e.target.checked ? sel[p].add(k) : sel[p].delete(k); $("#" + p + "SpecN").textContent = sel[p].size; if (p === "fp") freeInfo(); }); });
    $("#fpCustom").onclick = () => { if (picks.length < 5) { picks.push({ id: "", match: "", meta: "", pick: "", odds: "" }); fpDraw(); } };
    $("#hubBody").addEventListener("click", e => {
      const c = e.target.classList;
      if (c.contains("delLead")) return delRecords("leads", leads.filter(l => String(l.email || "").toLowerCase() === e.target.dataset.e.toLowerCase()), e.target.dataset.e);
      if (c.contains("delLeadId")) return delRecords("leads", leads.filter(l => l.id === e.target.dataset.i), (leads.find(l => l.id === e.target.dataset.i) || {}).email);
      if (c.contains("delUser")) { const u = users.find(x => x.id === e.target.closest("tr").dataset.id); return u && delRecords("users", [u], u.email); }
      const tr = e.target.closest("tr"); if (!tr || !tr.dataset.id) return;
      if (e.target.classList.contains("mpGo")) setPlan(tr.dataset.id, tr.querySelector(".mpT").value, +tr.querySelector(".mpD").value);
      if (e.target.classList.contains("mpFree")) setPlan(tr.dataset.id, "free", 0);
      if (e.target.classList.contains("mpSet")) setDaysLeft(tr.dataset.id, parseInt(tr.querySelector(".dl").value, 10));
    });
    $("#fpDate").onchange = () => { picks = []; fpDraw(); };
    $("#fpSearch").onfocus = $("#fpSearch").onclick = fpOpen; $("#fpSearch").oninput = fpOpen;
    $("#fpList").addEventListener("click", e => {
      const o = e.target.closest("[data-id]"); if (!o) return;
      const f = db.fixtures.find(x => x.id === o.dataset.id); if (!f || picks.length >= 5) return;
      picks.push({ id: f.id, match: f.home + " v " + f.away, meta: (f.competition || "") + (f.kickoff ? " · " + String(f.kickoff).slice(11, 16) : ""), pick: lbl(f), odds: oddsFx(f) });
      $("#fpSearch").value = ""; $("#fpList").hidden = true; fpDraw();
    });
    $("#fpPicks").addEventListener("input", e => { const c = e.target.classList, p = e.target.closest(".pk"); if (!p) return; const o = picks[+p.dataset.i]; if (c.contains("fpp")) o.pick = e.target.value; else if (c.contains("fpm")) o.match = e.target.value; else if (c.contains("fpi")) o.meta = e.target.value; else if (c.contains("fpo")) o.odds = e.target.value; });
    $("#fpPicks").addEventListener("click", e => { if (e.target.classList.contains("fpx")) { picks.splice(+e.target.closest(".pk").dataset.i, 1); fpDraw(); } });
    document.addEventListener("click", e => { if (!e.target.closest("#tab-hub .cb")) $("#fpList").hidden = true; });
    fpDraw();
  }
  const t = setInterval(() => { if (document.querySelector('nav.tabs [data-tab="vip"]') && typeof showTab === "function") { clearInterval(t); mount(); } }, 200);
})();
