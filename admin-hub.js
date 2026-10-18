/* PicksBible admin: "8. Customers" hub. Loaded by admin.html after the main script.
   Uses page globals: Store (Store.fs, Store.auth), db, toast, esc, todayStr, showTab, firebase, PBMail (admin-vip.js). */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const TIERS = { free: "Free", gold: "Gold", titanium: "Titanium" };
  const SITE = "https://picksbible.com";
  let users = [], leads = [], filter = "all", q = "", loaded = false, picks = [], freeDate = "";

  const addDays = (ymd, n) => { const d = new Date(ymd + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const daysBetween = (a, b) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 864e5);
  const isPaid = u => (u.tier === "gold" || u.tier === "titanium") && u.paidUntil && u.paidUntil >= todayStr();
  const isExpired = u => (u.tier === "gold" || u.tier === "titanium") && !isPaid(u);
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
#tab-hub .pill.gold{background:#5a4500;color:#ffd75e}#tab-hub .pill.titanium{background:#23405a;color:#b9dcf5}#tab-hub .pill.exp{background:#4a1d1d;color:#ff9b9b}
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
    <div><label>Plan</label><select id="acTier"><option value="gold">Gold</option><option value="titanium">Titanium</option></select></div>
    <div><label>Days</label><input id="acDays" type="number" min="1" max="3650" value="30" style="width:90px"></div>
  </div>
  <button type="button" class="btn" id="acGo">Activate</button> <span class="note" id="acRes"></span>
</div>

<div class="card">
  <h2>Customers</h2>
  <p class="note">Everyone who created a member account, plus the emails collected by the popup and the checkout page.</p>
  <div class="stats" id="hbStats"></div>
  <div class="warn" id="hubWarn" hidden><span id="hubWarnTxt"></span><button type="button" class="btn sm" id="hubRemind">Send reminders (email + dashboard)</button></div>
  <div class="fl" id="hubFl" role="group" aria-label="Filter">
    <button type="button" data-f="all" aria-pressed="true">All members</button>
    <button type="button" data-f="paid" aria-pressed="false">Paid</button>
    <button type="button" data-f="gold" aria-pressed="false">Gold</button>
    <button type="button" data-f="titanium" aria-pressed="false">Titanium</button>
    <button type="button" data-f="expiring" aria-pressed="false">Expiring in 7 days</button>
    <button type="button" data-f="free" aria-pressed="false">Free</button>
    <button type="button" data-f="expired" aria-pressed="false">Expired</button>
    <button type="button" data-f="leads" aria-pressed="false">Email list (popup + checkout)</button>
  </div>
  <div class="row" style="margin-bottom:10px"><div style="flex:1;min-width:220px"><input id="hubQ" placeholder="Search name or email"></div>
    <div><button type="button" class="btn ghost" id="hubCsv">Download this list (CSV)</button> <button type="button" class="btn ghost" id="hubRef">Refresh</button></div></div>
  <p class="note" id="hubNote" style="margin-top:0"></p>
  <div class="tbl"><table class="ft"><thead id="hubHead"></thead><tbody id="hubBody"></tbody></table></div>
</div>

<div class="card">
  <h2>Free picks email</h2>
  <p class="note">Sent to free members and everyone on the email list (popup and checkout), never to active VIP members and never to people who unsubscribed. Pick up to 3 matches from any match on the chosen day.</p>
  <div class="row" style="margin-bottom:10px">
    <div><label>Matches from</label><input type="date" id="fpDate"></div>
    <div style="flex:1;min-width:260px" class="cb"><label>Add a match (max 3)</label><input id="fpSearch" autocomplete="off" placeholder="Click to open the list, or type a team or league"><div class="cbl" id="fpList" hidden></div></div>
  </div>
  <div id="fpPicks"></div>
  <label style="margin-top:6px">Email subject</label><input id="fpSubj" maxlength="150" value="Our model's best banker bets today">
  <p class="note" id="fpInfo" style="margin-top:10px"></p>
  <button type="button" class="btn" id="fpSend">Send free picks email</button>
  <p class="note" id="fpRes" style="margin-top:10px"></p>
</div>

<div class="card">
  <h2>Send a message</h2>
  <p class="note">Appears in each member's notifications on the site, and can also be emailed (Brevo free plan: up to 300 emails a day).</p>
  <div class="row" style="margin-bottom:10px">
    <div><label>Send to</label><select id="bcAud"><option value="all">All members</option><option value="free">Free members</option><option value="paid">Paid members (Gold + Titanium)</option><option value="gold">Gold and Titanium (Gold picks)</option><option value="titanium">Titanium only</option></select></div>
  </div>
  <label>Message title</label><input id="bcTitle" maxlength="120">
  <label style="margin-top:10px">Message body</label><textarea id="bcBody" rows="4" maxlength="1000"></textarea>
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
      loaded = true; paint(); freeInfo();
    } catch (e) { if (!quiet) $("#hubNote").textContent = "Could not load (" + (e.code || e.message) + "). Make sure the new Firestore rules are published."; }
  }
  function view() {
    if (filter === "leads") {
      const have = new Set(users.map(u => (u.email || "").toLowerCase()));
      return leads.filter(l => !q || (l.email + " " + nameOf(l)).toLowerCase().includes(q)).map(l => Object.assign({ member: have.has((l.email || "").toLowerCase()) }, l));
    }
    return users.filter(u => {
      if (filter === "paid" && !isPaid(u)) return false;
      if (filter === "gold" && !(isPaid(u) && u.tier === "gold")) return false;
      if (filter === "titanium" && !(isPaid(u) && u.tier === "titanium")) return false;
      if (filter === "expiring" && !expiring(u)) return false;
      if (filter === "free" && (u.tier !== "free")) return false;
      if (filter === "expired" && !isExpired(u)) return false;
      return !q || ((u.email || "") + " " + nameOf(u)).toLowerCase().includes(q);
    });
  }
  function paint() {
    const paid = users.filter(isPaid), exp = users.filter(expiring);
    $("#hbStats").innerHTML = [["Members", users.length], ["Paid", paid.length], ["Gold", paid.filter(u => u.tier === "gold").length], ["Titanium", paid.filter(u => u.tier === "titanium").length], ["Ending in 7 days", exp.length], ["Free", users.filter(u => u.tier === "free").length], ["Expired", users.filter(isExpired).length], ["Email list", leads.length]]
      .map(s => `<div class="stat"><b>${s[1]}</b><span>${s[0]}</span></div>`).join("");
    const todo = exp.filter(u => u.remindedFor !== u.paidUntil);
    $("#hubWarn").hidden = !exp.length;
    $("#hubWarnTxt").textContent = exp.length + " plan" + (exp.length === 1 ? "" : "s") + " end within 7 days" + (todo.length ? " (" + todo.length + " not reminded yet)." : " (all reminded).");
    $("#hubRemind").disabled = !todo.length;
    const tb = $("#tabHubBtn"); if (tb) tb.textContent = "8. Customers" + (exp.length ? " (" + exp.length + " ending)" : "");
    document.querySelectorAll("#hubFl button").forEach(b => b.setAttribute("aria-pressed", b.dataset.f === filter));
    const rows = view();
    $("#hubNote").textContent = rows.length + (filter === "leads" ? " email" : " member") + (rows.length === 1 ? "" : "s") + " shown.";
    if (filter === "leads") {
      $("#hubHead").innerHTML = "<tr><th>Joined</th><th>Name</th><th>Email</th><th>WhatsApp</th><th>Source</th><th>Plan tried</th><th>Member?</th><th>Emails</th></tr>";
      $("#hubBody").innerHTML = rows.length ? rows.map(l => `<tr><td>${esc(String(l.createdAt || "").slice(0, 10))}</td><td>${esc(nameOf(l))}</td><td>${esc(l.email)}</td><td>${esc(l.whatsapp || "")}</td><td>${esc(l.source || "")}</td><td>${esc(l.plan || "")}</td><td>${l.member ? "Yes" : "-"}</td><td>${l.unsub ? "Unsubscribed" : "On"}</td></tr>`).join("") : '<tr><td colspan="8" class="empty">Nobody here yet.</td></tr>';
      return;
    }
    $("#hubHead").innerHTML = "<tr><th>Joined</th><th>Name</th><th>Email</th><th>Plan</th><th>Active until</th><th>Actions</th></tr>";
    $("#hubBody").innerHTML = rows.length ? rows.map(u => {
      const on = isPaid(u), ex = isExpired(u), dl = daysLeft(u);
      const pill = `<span class="pill ${on ? u.tier : ex ? "exp" : ""}">${ex ? TIERS[u.tier] + " (expired)" : TIERS[u.tier] || "Free"}</span>`;
      return `<tr data-id="${esc(u.id)}"><td>${esc(String(u.createdAt || "").slice(0, 10))}</td><td>${esc(nameOf(u))}</td><td>${esc(u.email)}</td><td>${pill}</td><td>${esc(u.paidUntil || "-")}${on ? " <small class='muted'>(" + dl + " day" + (dl === 1 ? "" : "s") + " left)</small>" : ""}</td>
        <td><div class="act"><select class="mpT"><option value="gold">Gold</option><option value="titanium">Titanium</option></select>
        <select class="mpD"><option value="30">30 days</option><option value="7">7 days</option><option value="90">90 days</option><option value="365">1 year</option></select>
        <button type="button" class="btn sm mpGo">${on ? "Extend" : "Mark paid"}</button>
        ${on ? `<input class="dl" type="number" min="0" max="3650" value="${dl}" title="Days left"><button type="button" class="btn ghost sm mpSet">Set days left</button>` : ""}
        ${(on || ex) ? '<button type="button" class="btn ghost sm mpFree">Set free</button>' : ""}</div></td></tr>`;
    }).join("") : '<tr><td colspan="6" class="empty">No members match.</td></tr>';
    rows.forEach(u => { const tr = document.querySelector(`#hubBody tr[data-id="${CSS.escape(u.id)}"]`); if (tr && (u.tier === "gold" || u.tier === "titanium")) tr.querySelector(".mpT").value = u.tier; });
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
          if (e.code === "auth/email-already-in-use") { out("This email already has a login but no profile. Ask the customer to log in once at picksbible.com/vip.html, then press Activate again."); $("#acGo").disabled = false; return; }
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
  function fpDraw() {
    $("#fpPicks").innerHTML = picks.map((p, i) => `<div class="pk" data-i="${i}"><div><b>${esc(p.match)}</b><br><small class="muted">${esc(p.meta)}</small></div><input class="fpp" value="${esc(p.pick)}" placeholder="Our pick, e.g. Celtic to win" maxlength="120"><button type="button" class="btn danger sm fpx">Remove</button></div>`).join("") || '<p class="note">No matches chosen yet.</p>';
    freeInfo();
  }
  function fpOptions(text) {
    const day = $("#fpDate").value, qq = (text || "").trim().toLowerCase(), used = new Set(picks.map(p => p.id));
    return (db.fixtures || []).filter(f => String(f.kickoff || "").slice(0, 10) === day && f.home && f.away && !used.has(f.id) && (!qq || (f.home + " " + f.away + " " + (f.competition || "")).toLowerCase().includes(qq)))
      .sort((a, b) => String(a.kickoff).localeCompare(String(b.kickoff))).slice(0, 150);
  }
  function fpOpen() {
    if (picks.length >= 3) { $("#fpList").hidden = true; return; }
    const l = fpOptions($("#fpSearch").value);
    $("#fpList").innerHTML = l.length ? l.map(f => `<div data-id="${esc(f.id)}">${f.sport === "basketball" ? "🏀" : "⚽"} ${esc(f.home)} v ${esc(f.away)} <small>· ${esc(f.competition || "")} · ${esc(String(f.kickoff).slice(11, 16))}</small></div>`).join("") : '<div class="muted">No matches on this date.</div>';
    $("#fpList").hidden = false;
  }
  /* who gets the free email: free + expired members, plus email-list signups; no active VIP members, no unsubscribed, no duplicates */
  function freeAudience() {
    const today = todayStr(), seen = new Set(), out = [];
    users.filter(isPaid).forEach(u => seen.add((u.email || "").toLowerCase()));
    const add = (coll, d) => {
      const e = String(d.email || "").toLowerCase();
      if (!e || seen.has(e)) return; seen.add(e);
      if (d.unsub) return;
      out.push({ coll, d, email: e, name: first(d), done: d.freeSent === today });
    };
    users.forEach(u => { if (!isPaid(u)) add("users", u); });
    leads.forEach(l => add("leads", l));
    return out;
  }
  function freeInfo() {
    if (!loaded) { $("#fpInfo").textContent = "Loading the list..."; return; }
    const a = freeAudience(), todo = a.filter(x => !x.done);
    $("#fpInfo").textContent = a.length + " people can receive this. " + (a.length - todo.length) + " already got today's free email. " + Math.min(todo.length, 300) + " will be sent now (Brevo free plan: 300 emails a day" + (todo.length > 300 ? ", press Send again tomorrow for the rest" : "") + ").";
  }
  async function sendFree() {
    const out = t => { $("#fpRes").textContent = t; };
    const chosen = picks.map(p => ({ match: p.match, pick: p.pick.trim(), meta: p.meta })).filter(p => p.pick);
    if (!chosen.length) return out("Choose at least one match and fill in our pick for it.");
    if (chosen.length !== picks.length) return out("Fill in our pick for every chosen match, or remove it.");
    if (!loaded) await refresh(true);
    const todo = freeAudience().filter(x => !x.done).slice(0, 300);
    if (!todo.length) return out("Nobody left to send to today.");
    if (!confirm("Send today's free picks email to " + todo.length + " people?")) return;
    $("#fpSend").disabled = true; out("Preparing...");
    try {
      /* give every recipient a private unsubscribe key (once), so their unsubscribe link cannot be guessed by anyone else */
      let batch = Store.fs.batch(), n = 0; const jobs = [];
      todo.forEach(x => { if (!x.d.unsubToken) { x.d.unsubToken = token(); batch.update(Store.fs.collection(x.coll).doc(x.d.id), { unsubToken: x.d.unsubToken }); if (++n >= 400) { jobs.push(batch.commit()); batch = Store.fs.batch(); n = 0; } } });
      if (n) jobs.push(batch.commit()); await Promise.all(jobs);
      const rec = todo.map(x => ({ email: x.email, name: x.name, unsub: SITE + "/unsubscribe.html?c=" + (x.coll === "users" ? "u" : "l") + "&i=" + encodeURIComponent(x.d.id) + "&t=" + x.d.unsubToken }));
      out("Sending to " + rec.length + "...");
      const m = await PBMail.sendFree(rec, $("#fpSubj").value.trim() || "Our model's best banker bets today", chosen);
      const ok = m.sent || 0;
      if (ok) {
        const mark = todo.slice(0, ok === rec.length ? rec.length : 0);   /* if only part of a batch failed we cannot tell who, so do not mark anyone */
        let b = Store.fs.batch(), c = 0; const js = [];
        mark.forEach(x => { b.update(Store.fs.collection(x.coll).doc(x.d.id), { freeSent: todayStr() }); x.d.freeSent = todayStr(); if (++c >= 400) { js.push(b.commit()); b = Store.fs.batch(); c = 0; } });
        if (c) js.push(b.commit()); await Promise.all(js);
        try { await Store.fs.collection("broadcasts").doc("free-" + Date.now().toString(36)).set({ kind: "free", audience: ["free"], title: "Today's free picks are live", body: "Our model's best banker bets for today are on the PicksBible homepage.", createdAt: new Date().toISOString(), delivered: ok }); } catch (_) {}
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
      : [["joined", "name", "email", "plan", "active_until", "days_left"]].concat(rows.map(u => [u.createdAt, nameOf(u), u.email, u.tier, u.paidUntil, daysLeft(u)]));
    const blob = new Blob([out.map(r => r.map(esq).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "picksbible-" + filter + "-" + todayStr() + ".csv"; document.body.appendChild(a); a.click(); a.remove();
  }
  const AUD = { all: ["free", "gold", "titanium"], free: ["free"], paid: ["gold", "titanium"], gold: ["gold", "titanium"], titanium: ["titanium"] };
  async function send() {
    const title = $("#bcTitle").value.trim(), body = $("#bcBody").value.trim(), key = $("#bcAud").value;
    if (!title || !body) return toast("Fill in the title and the message");
    if (!loaded) await refresh(true);
    const aud = AUD[key], today = todayStr();
    const elig = users.filter(u => aud.includes(u.tier) && (u.tier === "free" || (u.paidUntil && u.paidUntil >= today))), n = elig.length;
    $("#bcSend").disabled = true;
    try {
      await Store.fs.collection("broadcasts").doc("msg-" + Date.now().toString(36)).set({ kind: "message", audience: aud, title, body, delivered: n, createdAt: new Date().toISOString() });
      let res = "Delivered to " + n + " member" + (n === 1 ? "" : "s") + " (platform notification).";
      if ($("#bcMail").checked && n) {
        try { const m = await PBMail.send(elig.filter(u => u.email).map(u => ({ email: u.email, name: first(u) })), title, body); res += " Emailed " + m.sent + " of " + n + (m.failed && m.failed.length ? " (some failed)" : "") + "."; }
        catch (err) { res += " Email NOT sent: " + (err.message || err); }
      }
      $("#bcRes").textContent = res;
      $("#bcTitle").value = ""; $("#bcBody").value = "";
    } catch (e) { $("#bcRes").textContent = "Could not send (" + (e.code || e.message) + ")."; }
    $("#bcSend").disabled = false;
  }

  function wire() {
    $("#hubFl").onclick = e => { const b = e.target.closest("[data-f]"); if (b) { filter = b.dataset.f; paint(); } };
    $("#hubQ").oninput = e => { q = e.target.value.trim().toLowerCase(); paint(); };
    $("#hubRef").onclick = () => refresh(); $("#hubCsv").onclick = csv; $("#bcSend").onclick = send; $("#acGo").onclick = activate; $("#hubRemind").onclick = remind; $("#fpSend").onclick = sendFree;
    $("#hubBody").addEventListener("click", e => {
      const tr = e.target.closest("tr"); if (!tr || !tr.dataset.id) return;
      if (e.target.classList.contains("mpGo")) setPlan(tr.dataset.id, tr.querySelector(".mpT").value, +tr.querySelector(".mpD").value);
      if (e.target.classList.contains("mpFree")) setPlan(tr.dataset.id, "free", 0);
      if (e.target.classList.contains("mpSet")) setDaysLeft(tr.dataset.id, parseInt(tr.querySelector(".dl").value, 10));
    });
    $("#fpDate").onchange = () => { picks = []; fpDraw(); };
    $("#fpSearch").onfocus = $("#fpSearch").onclick = fpOpen; $("#fpSearch").oninput = fpOpen;
    $("#fpList").addEventListener("click", e => {
      const o = e.target.closest("[data-id]"); if (!o) return;
      const f = db.fixtures.find(x => x.id === o.dataset.id); if (!f || picks.length >= 3) return;
      picks.push({ id: f.id, match: f.home + " v " + f.away, meta: (f.competition || "") + (f.kickoff ? " · " + String(f.kickoff).slice(11, 16) : ""), pick: lbl(f) });
      $("#fpSearch").value = ""; $("#fpList").hidden = true; fpDraw();
    });
    $("#fpPicks").addEventListener("input", e => { if (e.target.classList.contains("fpp")) picks[+e.target.closest(".pk").dataset.i].pick = e.target.value; });
    $("#fpPicks").addEventListener("click", e => { if (e.target.classList.contains("fpx")) { picks.splice(+e.target.closest(".pk").dataset.i, 1); fpDraw(); } });
    document.addEventListener("click", e => { if (!e.target.closest("#tab-hub .cb")) $("#fpList").hidden = true; });
    fpDraw();
  }
  const t = setInterval(() => { if (document.querySelector('nav.tabs [data-tab="vip"]') && typeof showTab === "function") { clearInterval(t); mount(); } }, 200);
})();
