/* PicksBible admin: "10. Live" tab. Real-time tracker: members who were active (logged in) today, with the last 7 days.
   Uses page globals: Store, esc, showTab. Updates by itself (Firestore snapshots), no refresh needed. */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const lagos = d => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(d || new Date());
  let unsubs = [], day = "", follow = true, act = [], act7 = [], started = false, tick = null;
  const shift = (ymd, n) => lagos(new Date(Date.parse(ymd + "T12:00:00Z") + n * 864e5));

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
<div class="card"><h2><span class="dot"></span><span id="lvTitle">Live today</span> <span class="muted" id="lvDay"></span></h2>
 <p style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 10px"><label for="lvDate" style="font-weight:700">Date</label><input type="date" id="lvDate" style="width:auto"><button type="button" class="btn" id="lvToday">Today</button></p>
 <p class="note">Pick any date to see that day. Today updates by itself. The day runs midnight to midnight, Lagos time. "Active members" counts each member once, the first time they open the site logged in that day.</p>
 <div class="kpis">
  <div class="kpi"><b id="lvAct">-</b><span>Active members</span></div>
 </div>
 <p class="muted" id="lvErr"></p>
</div>
<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr));align-items:start">
 <div>
  <div class="card"><h2>Members active, last 7 days</h2><div id="lvBars"></div></div>
  <div class="card"><h2>Active today</h2><div class="feed" id="lvWho"></div></div>
 </div>
</div>`;
    const host = document.querySelector("#tab-fixtures"); (host ? host.parentNode : document.body).appendChild(sec);
    $("#lvDate").value = lagos();
    $("#lvDate").onchange = () => { const v = $("#lvDate").value; if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return; follow = v === lagos(); listen(v); };
    $("#lvToday").onclick = () => { follow = true; $("#lvDate").value = lagos(); listen(lagos()); };
  }
  const hhmm = iso => { try { return new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(iso)); } catch (_) { return ""; } };
  function draw() {
    if (!$("#lvBars")) return;
    const isToday = day === lagos();
    $("#lvDay").textContent = "(" + day + ")"; $("#lvTitle").textContent = isToday ? "Live today" : "Stats for"; $("#lvDate").value = day;
    const todays = act7.filter(a => a.ymd === day);
    $("#lvAct").textContent = todays.length;
    const days = []; for (let i = 6; i >= 0; i--) days.push(shift(day, -i));
    const cnt = days.map(d => act7.filter(a => a.ymd === d).length), mx = Math.max(1, ...cnt);
    $("#lvBars").innerHTML = days.map((d, i) => `<div class="bar"><span style="width:84px">${esc(d.slice(5))}${d === lagos() ? " (today)" : d === day ? " (selected)" : ""}</span><i style="width:${Math.round(cnt[i] / mx * 160)}px"></i><b>${cnt[i]}</b></div>`).join("");
    $("#lvWho").innerHTML = todays.length ? todays.sort((a, b) => String(b.at).localeCompare(String(a.at))).map(a => `<div class="bar"><span class="muted" style="width:70px">${esc(hhmm(a.at))}</span>${esc(a.email || a.uid)}</div>`).join("") : '<p class="muted">Nobody active on this day.</p>';
  }
  function listen(d) {
    unsubs.forEach(u => u()); unsubs = []; day = d || lagos(); act7 = [];
    const from = shift(day, -6), fs = Store.fs, err = e => { const m = $("#lvErr"); if (m) m.textContent = "Could not load (" + (e.code || e.message) + "). Publish the Firestore rules (firestore.rules) first."; };
    unsubs.push(fs.collection("activity").where("ymd", ">=", from).onSnapshot(s => { act7 = []; s.forEach(d => { const x = d.data(); if (x.ymd <= day) act7.push(x); }); draw(); }, err));
  }
  function start() {
    if (started) return; started = true; listen();
    tick = setInterval(() => { if (follow && lagos() !== day) listen(lagos()); else draw(); }, 30000);   /* new day: start fresh; also refreshes the "last hour" number */
  }
  mount();
})();
