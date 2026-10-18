/* PicksBible admin: "8. Customers" hub. Loaded by admin.html after the main script.
   Uses page globals: Store (Store.fs), toast, esc, todayStr, showTab, firebase. */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const TIERS = { free: "Free", gold: "Gold", titanium: "Titanium" };
  let users = [], leads = [], filter = "all", q = "", loaded = false;

  const addDays = (ymd, n) => { const d = new Date(ymd + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const isPaid = u => (u.tier === "gold" || u.tier === "titanium") && u.paidUntil && u.paidUntil >= todayStr();
  const isExpired = u => (u.tier === "gold" || u.tier === "titanium") && !isPaid(u);
  const nameOf = u => (u.name || [u.firstName, u.lastName].filter(Boolean).join(" ") || "").trim();

  function mount() {
    const nav = document.querySelector("nav.tabs");
    if (!nav || $("#tab-hub")) return;
    const btn = document.createElement("button");
    btn.setAttribute("role", "tab"); btn.dataset.tab = "hub"; btn.setAttribute("aria-selected", "false"); btn.textContent = "8. Customers";
    (nav.querySelector('[data-tab="vip"]') || nav.querySelector('[data-tab="results"]')).insertAdjacentElement("afterend", btn);
    btn.onclick = () => { showTab("hub"); refresh(); };
    const sec = document.createElement("section"); sec.id = "tab-hub"; sec.hidden = true;
    sec.innerHTML = `
<style>
#tab-hub .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:14px}
#tab-hub .stat{background:var(--panel-2);border:1px solid var(--line);border-radius:10px;padding:10px 12px}
#tab-hub .stat b{display:block;font-size:22px}#tab-hub .stat span{color:var(--muted);font-size:12px}
#tab-hub .fl{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
#tab-hub .fl button{background:var(--panel-2);color:var(--muted);border:1px solid var(--line);border-radius:99px;padding:7px 14px;font:inherit;cursor:pointer}
#tab-hub .fl button[aria-pressed=true]{background:var(--purple);color:#fff;border-color:var(--purple)}
#tab-hub td select,#tab-hub td input{width:auto;padding:6px}
#tab-hub .pill{display:inline-block;padding:2px 9px;border-radius:99px;font-size:12px;font-weight:700;background:var(--panel-2)}
#tab-hub .pill.gold{background:#5a4500;color:#ffd75e}#tab-hub .pill.titanium{background:#23405a;color:#b9dcf5}#tab-hub .pill.exp{background:#4a1d1d;color:#ff9b9b}
#tab-hub .act{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
</style>
<div class="card">
  <h2>Customers</h2>
  <p class="note">Everyone who created a member account, plus emails collected from the popup. To activate a paid customer after they pay, use <b>Mark paid</b> on their row.</p>
  <div class="stats" id="hbStats"></div>
  <div class="fl" id="hubFl" role="group" aria-label="Filter">
    <button type="button" data-f="all" aria-pressed="true">All members</button>
    <button type="button" data-f="paid" aria-pressed="false">Paid</button>
    <button type="button" data-f="gold" aria-pressed="false">Gold</button>
    <button type="button" data-f="titanium" aria-pressed="false">Titanium</button>
    <button type="button" data-f="free" aria-pressed="false">Free</button>
    <button type="button" data-f="expired" aria-pressed="false">Expired</button>
    <button type="button" data-f="leads" aria-pressed="false">Email list (popup)</button>
  </div>
  <div class="row" style="margin-bottom:10px"><div style="flex:1;min-width:220px"><input id="hubQ" placeholder="Search name or email"></div>
    <div><button type="button" class="btn ghost" id="hubCsv">Download this list (CSV)</button> <button type="button" class="btn ghost" id="hubRef">Refresh</button></div></div>
  <p class="note" id="hubNote" style="margin-top:0"></p>
  <div class="tbl"><table class="ft"><thead id="hubHead"></thead><tbody id="hubBody"></tbody></table></div>
</div>
<div class="card">
  <h2>Send a message</h2>
  <p class="note">Appears in each member's notifications inside their VIP page, and can also be emailed (Brevo free plan: up to 300 emails a day).</p>
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
    wire();
  }

  async function refresh() {
    $("#hubNote").textContent = "Loading...";
    try {
      const [u, l] = await Promise.all([Store.fs.collection("users").get(), Store.fs.collection("leads").get()]);
      users = []; leads = [];
      u.forEach(d => users.push(Object.assign({ id: d.id }, d.data())));
      l.forEach(d => leads.push(Object.assign({ id: d.id }, d.data())));
      users.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      leads.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      loaded = true; paint();
    } catch (e) { $("#hubNote").textContent = "Could not load (" + (e.code || e.message) + "). Make sure the new Firestore rules are published."; }
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
      if (filter === "free" && (u.tier !== "free")) return false;
      if (filter === "expired" && !isExpired(u)) return false;
      return !q || ((u.email || "") + " " + nameOf(u)).toLowerCase().includes(q);
    });
  }
  function paint() {
    const paid = users.filter(isPaid);
    $("#hbStats").innerHTML = [["Members", users.length], ["Paid", paid.length], ["Gold", paid.filter(u => u.tier === "gold").length], ["Titanium", paid.filter(u => u.tier === "titanium").length], ["Free", users.filter(u => u.tier === "free").length], ["Expired", users.filter(isExpired).length], ["Email list", leads.length]]
      .map(s => `<div class="stat"><b>${s[1]}</b><span>${s[0]}</span></div>`).join("");
    document.querySelectorAll("#hubFl button").forEach(b => b.setAttribute("aria-pressed", b.dataset.f === filter));
    const rows = view();
    $("#hubNote").textContent = rows.length + (filter === "leads" ? " email" : " member") + (rows.length === 1 ? "" : "s") + " shown.";
    if (filter === "leads") {
      $("#hubHead").innerHTML = "<tr><th>Joined</th><th>Name</th><th>Email</th><th>WhatsApp</th><th>Source</th><th>Member?</th></tr>";
      $("#hubBody").innerHTML = rows.length ? rows.map(l => `<tr><td>${esc(String(l.createdAt || "").slice(0, 10))}</td><td>${esc(nameOf(l))}</td><td>${esc(l.email)}</td><td>${esc(l.whatsapp || "")}</td><td>${esc(l.source || "")}</td><td>${l.member ? "Yes" : "-"}</td></tr>`).join("") : '<tr><td colspan="6" class="empty">Nobody here yet.</td></tr>';
      return;
    }
    $("#hubHead").innerHTML = "<tr><th>Joined</th><th>Name</th><th>Email</th><th>Plan</th><th>Active until</th><th>Actions</th></tr>";
    $("#hubBody").innerHTML = rows.length ? rows.map(u => {
      const on = isPaid(u), exp = isExpired(u);
      const pill = `<span class="pill ${on ? u.tier : exp ? "exp" : ""}">${exp ? TIERS[u.tier] + " (expired)" : TIERS[u.tier] || "Free"}</span>`;
      return `<tr data-id="${esc(u.id)}"><td>${esc(String(u.createdAt || "").slice(0, 10))}</td><td>${esc(nameOf(u))}</td><td>${esc(u.email)}</td><td>${pill}</td><td>${esc(u.paidUntil || "-")}</td>
        <td><div class="act"><select class="mpT"><option value="gold">Gold</option><option value="titanium">Titanium</option></select>
        <select class="mpD"><option value="30">30 days</option><option value="7">7 days</option><option value="90">90 days</option><option value="365">1 year</option></select>
        <button type="button" class="btn sm mpGo">${on ? "Extend" : "Mark paid"}</button>${(on || exp) ? '<button type="button" class="btn ghost sm mpFree">Set free</button>' : ""}</div></td></tr>`;
    }).join("") : '<tr><td colspan="6" class="empty">No members match.</td></tr>';
    rows.forEach(u => { const tr = document.querySelector(`#hubBody tr[data-id="${CSS.escape(u.id)}"]`); if (tr && (u.tier === "gold" || u.tier === "titanium")) tr.querySelector(".mpT").value = u.tier; });
  }
  async function setPlan(id, tier, days) {
    const u = users.find(x => x.id === id); if (!u) return;
    const patch = { tier };
    if (tier === "free") { patch.paidUntil = ""; patch.paidUntilTs = firebase.firestore.FieldValue.delete(); }
    else {
      const base = isPaid(u) && u.tier === tier ? u.paidUntil : todayStr();   /* extending the same plan adds on top of what is left */
      patch.paidUntil = addDays(base, days);
      patch.paidUntilTs = firebase.firestore.Timestamp.fromDate(new Date(patch.paidUntil + "T23:59:59Z"));
    }
    try { await Store.fs.collection("users").doc(id).update(patch); Object.assign(u, { tier, paidUntil: patch.paidUntil }); toast(tier === "free" ? "Set to free" : TIERS[tier] + " active until " + patch.paidUntil); paint(); }
    catch (e) { toast("Could not save: " + (e.code || e.message)); }
  }
  function csv() {
    const rows = view(), esq = v => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const out = filter === "leads"
      ? [["joined", "first_name", "last_name", "email", "whatsapp", "source"]].concat(rows.map(l => [l.createdAt, l.firstName, l.lastName, l.email, l.whatsapp, l.source]))
      : [["joined", "name", "email", "plan", "active_until"]].concat(rows.map(u => [u.createdAt, nameOf(u), u.email, u.tier, u.paidUntil]));
    const blob = new Blob([out.map(r => r.map(esq).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "picksbible-" + filter + "-" + todayStr() + ".csv"; document.body.appendChild(a); a.click(); a.remove();
  }
  const AUD = { all: ["free", "gold", "titanium"], free: ["free"], paid: ["gold", "titanium"], gold: ["gold", "titanium"], titanium: ["titanium"] };
  async function send() {
    const title = $("#bcTitle").value.trim(), body = $("#bcBody").value.trim(), key = $("#bcAud").value;
    if (!title || !body) return toast("Fill in the title and the message");
    if (!loaded) await refresh();
    const aud = AUD[key], today = todayStr();
    const elig = users.filter(u => aud.includes(u.tier) && (u.tier === "free" || (u.paidUntil && u.paidUntil >= today))), n = elig.length;
    $("#bcSend").disabled = true;
    try {
      await Store.fs.collection("broadcasts").doc("msg-" + Date.now().toString(36)).set({ kind: "message", audience: aud, title, body, delivered: n, createdAt: new Date().toISOString() });
      let res = "Delivered to " + n + " member" + (n === 1 ? "" : "s") + " (platform notification).";
      if ($("#bcMail").checked && n) {
        try { const m = await PBMail.send(elig.filter(u => u.email).map(u => ({ email: u.email, name: (u.name || "").split(" ")[0] })), title, body); res += " Emailed " + m.sent + " of " + n + (m.failed && m.failed.length ? " (some failed)" : "") + "."; }
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
    $("#hubRef").onclick = refresh; $("#hubCsv").onclick = csv; $("#bcSend").onclick = send;
    $("#hubBody").addEventListener("click", e => {
      const tr = e.target.closest("tr"); if (!tr || !tr.dataset.id) return;
      if (e.target.classList.contains("mpGo")) setPlan(tr.dataset.id, tr.querySelector(".mpT").value, +tr.querySelector(".mpD").value);
      if (e.target.classList.contains("mpFree")) setPlan(tr.dataset.id, "free", 0);
    });
  }
  const t = setInterval(() => { if (document.querySelector('nav.tabs [data-tab="vip"]') && typeof showTab === "function") { clearInterval(t); mount(); } }, 200);
})();
