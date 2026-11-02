/* PicksBible admin: "10. Live" tab. Two real-time trackers:
   1) members who were active (logged in) today, with the last 7 days;
   2) every dice roll as it happens, with totals and prizes.
   Uses page globals: Store, esc, showTab. Updates by itself (Firestore snapshots), no refresh needed. */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const lagos = d => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(d || new Date());
  let unsubs = [], day = "", act = [], act7 = [], rolls = [], started = false, tick = null;
  const PN = { jackpot: "JACKPOT", vip7: "1 week VIP", vip1: "VIP day", pick: "Bonus pick" };  /* "pick" only appears for old rolls */

  function mount() {
    const nav = document.querySelector("nav.tabs");
    if (!nav || $("#tab-live")) return;
    const btn = document.createElement("button");
    btn.setAttribute("role", "tab"); btn.dataset.tab = "live"; btn.setAttribute("aria-selected", "false"); btn.textContent = "10. Live";
    nav.appendChild(btn);
    btn.onclick = () => { showTab("live"); start(); };
    const sec = document.createElement("section"); sec.id = "tab-live"; sec.hidden = true;
    sec.innerHTML = `
<style>
#tab-live .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px}
#tab-live .kpi{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:14px}
#tab-live .kpi b{display:block;font-size:30px;line-height:1.1;color:var(--cyan)}#tab-live .kpi span{color:var(--muted);font-size:13px}
#tab-live .feed{max-height:420px;overflow:auto}
#tab-live .bar{display:flex;align-items:center;gap:8px;margin:5px 0;font-size:13px}#tab-live .bar i{display:block;height:12px;border-radius:6px;background:var(--cyan);min-width:3px}
#tab-live .pz{font-weight:800;color:#fbbf24}#tab-live .dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--won);margin-right:6px;animation:lv 1.4s infinite}
@keyframes lv{50%{opacity:.25}}
</style>
<div class="card"><h2><span class="dot"></span>Live today <span class="muted" id="lvDay"></span></h2>
 <p class="note">Updates by itself. The day runs midnight to midnight, Lagos time. "Active members" counts each member once, the first time they open the site logged in that day.</p>
 <div class="kpis">
  <div class="kpi"><b id="lvAct">-</b><span>Active members today</span></div>
  <div class="kpi"><b id="lvRolls">-</b><span>Dice rolls today</span></div>
  <div class="kpi"><b id="lvRM">-</b><span>by members</span></div>
  <div class="kpi"><b id="lvRG">-</b><span>by visitors</span></div>
  <div class="kpi"><b id="lvHr">-</b><span>rolls, last hour</span></div>
  <div class="kpi"><b id="lvWin">-</b><span>prizes won today<br><small id="lvWinD"></small></span></div>
 </div>
 <p class="muted" id="lvErr"></p>
</div>
<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr));align-items:start">
 <div class="card"><h2>Dice rolls, live</h2><div class="feed tbl"><table><thead><tr><th>Time</th><th>Who</th><th>Dice</th><th>Result</th></tr></thead><tbody id="lvFeed"><tr><td colspan="4" class="empty">Loading...</td></tr></tbody></table></div></div>
 <div>
  <div class="card"><h2>Members active, last 7 days</h2><div id="lvBars"></div></div>
  <div class="card"><h2>Active today</h2><div class="feed" id="lvWho"></div></div>
 </div>
</div>`;
    const host = document.querySelector("#tab-fixtures"); (host ? host.parentNode : document.body).appendChild(sec);
  }
  const hhmm = iso => { try { return new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(iso)); } catch (_) { return ""; } };
  function draw() {
    if (!$("#lvFeed")) return;
    $("#lvDay").textContent = "(" + day + ")";
    const todays = act7.filter(a => a.ymd === day);
    $("#lvAct").textContent = todays.length;
    const rm = rolls.filter(r => !r.guest).length, hr = rolls.filter(r => Date.now() - Date.parse(r.at) < 36e5).length, wins = rolls.filter(r => r.prize);
    $("#lvRolls").textContent = rolls.length; $("#lvRM").textContent = rm; $("#lvRG").textContent = rolls.length - rm; $("#lvHr").textContent = hr;
    $("#lvWin").textContent = wins.length; $("#lvWinD").textContent = Object.entries(wins.reduce((m, w) => (m[w.prize] = (m[w.prize] || 0) + 1, m), {})).map(([k, v]) => v + " " + (PN[k] || k)).join(", ");
    const feed = rolls.slice().sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 150);
    $("#lvFeed").innerHTML = feed.length ? feed.map(r => `<tr><td>${esc(hhmm(r.at))}</td><td>${r.guest ? '<span class="muted">Visitor</span>' : esc(r.email || r.uid)}</td><td>${esc(r.d1)} + ${esc(r.d2)}</td><td>${r.prize ? '<span class="pz">' + esc(r.prizeName || PN[r.prize] || r.prize) + "</span>" : '<span class="muted">no prize</span>'}</td></tr>`).join("") : '<tr><td colspan="4" class="empty">No rolls yet today.</td></tr>';
    const days = []; for (let i = 6; i >= 0; i--) days.push(lagos(new Date(Date.now() - i * 864e5)));
    const cnt = days.map(d => act7.filter(a => a.ymd === d).length), mx = Math.max(1, ...cnt);
    $("#lvBars").innerHTML = days.map((d, i) => `<div class="bar"><span style="width:84px">${esc(d.slice(5))}${d === day ? " (today)" : ""}</span><i style="width:${Math.round(cnt[i] / mx * 160)}px"></i><b>${cnt[i]}</b></div>`).join("");
    $("#lvWho").innerHTML = todays.length ? todays.sort((a, b) => String(b.at).localeCompare(String(a.at))).map(a => `<div class="bar"><span class="muted" style="width:70px">${esc(hhmm(a.at))}</span>${esc(a.email || a.uid)}</div>`).join("") : '<p class="muted">Nobody yet today.</p>';
  }
  function listen() {
    unsubs.forEach(u => u()); unsubs = []; day = lagos(); act7 = []; rolls = [];
    const from = lagos(new Date(Date.now() - 6 * 864e5)), fs = Store.fs, err = e => { const m = $("#lvErr"); if (m) m.textContent = "Could not load (" + (e.code || e.message) + "). Publish the new Firestore rules (firestore.rules) first."; };
    unsubs.push(fs.collection("activity").where("ymd", ">=", from).onSnapshot(s => { act7 = []; s.forEach(d => act7.push(d.data())); draw(); }, err));
    unsubs.push(fs.collection("dice_log").where("ymd", "==", day).onSnapshot(s => { rolls = []; s.forEach(d => rolls.push(d.data())); draw(); }, err));
  }
  function start() {
    if (started) return; started = true; listen();
    tick = setInterval(() => { if (lagos() !== day) listen(); else draw(); }, 30000);   /* new day: start fresh; also refreshes the "last hour" number */
  }
  mount();
})();
