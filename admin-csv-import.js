/* PicksBible admin: import predictions / results from a Google Sheet CSV.
   Works with the existing admin.html (db, uid, colorOf, commit, watDay). No server needed.
   One CSV may hold football AND basketball blocks (each block starts with its own header row). */
(function () {
  "use strict";

  const norm = s => String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  function parseCSV(text) {
    text = String(text || "").replace(/^﻿/, "");
    const rows = []; let row = [], cur = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === ",") { row.push(cur); cur = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); cur = ""; rows.push(row); row = []; }
      else cur += ch;
    }
    if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
    return rows.map(r => r.map(c => c.trim())).filter(r => r.some(c => c !== ""));
  }

  // "12 (1.30)" -> {v:"12", o:"1.30"}
  function splitBracket(s) {
    const m = String(s || "").trim().match(/^(.*?)\s*\(\s*([0-9]+(?:\.[0-9]+)?)\s*\)\s*$/);
    return m ? { v: m[1].trim(), o: m[2] } : { v: String(s || "").trim(), o: "" };
  }

  function sections(rows) {
    const out = []; let cur = null;
    rows.forEach(r => {
      const head = r.map(norm);
      if (head.some(h => h === "starting time" || h === "time") && head.includes("home team")) {
        const idx = {};
        head.forEach((h, i) => {
          if (h === "starting time" || h === "time") idx.time = i;
          else if (h === "league") idx.league = i;
          else if (h === "home team") idx.home = i;
          else if (h === "away team") idx.away = i;
          else if (h === "home odds") idx.o1 = i;
          else if (h === "draw odds") idx.oX = i;
          else if (h === "away odds") idx.o2 = i;
          else if (h === "tips" || h === "tip") idx.tip = i;
          else if (h === "confidence") idx.conf = i;
          else if (h.startsWith("o u")) idx.ou = i;
          else if (h === "btts") idx.btts = i;
          else if (h === "cs tips" || h === "cs tip") idx.cs = i;
          else if (h.startsWith("point totals")) idx.pts = i;
          else if (h.startsWith("ft")) idx.ft = i;
        });
        const fb = idx.oX !== undefined || idx.btts !== undefined || idx.cs !== undefined;
        cur = { sport: fb ? "football" : "basketball", idx, rows: [] };
        out.push(cur);
      } else if (cur) cur.rows.push(r);
    });
    return out;
  }

  function findLeague(leagues, sport, raw) {
    const name = String(raw || "").trim();
    if (!name) return { err: "no league" };
    let want = norm(name), c0 = null;
    const ci = name.indexOf(":");
    if (ci > 0) { c0 = norm(name.slice(0, ci)); want = norm(name.slice(ci + 1)); }
    const hits = [];
    ((leagues || {})[sport] || []).forEach(g => (g.l || []).forEach(l => {
      const nl = norm(l), nc = norm(g.c);
      if (c0 ? (nc === c0 && nl === want) : (nl === want || norm(g.c + " " + l) === want)) hits.push({ country: g.c, competition: l });
    }));
    if (!hits.length) {
      (((leagues || {}).top || {})[sport] || []).forEach(t => {
        if (c0 ? (norm(t[0]) === c0 && norm(t[1]) === want) : (norm(t[1]) === want)) hits.push({ country: t[0], competition: t[1] });
      });
    }
    if (hits.length === 1) return hits[0];
    return hits.length
      ? { err: '"' + name + '" exists in ' + hits.length + ' countries. Write it as "Country: League" in the sheet' }
      : { err: 'league "' + name + '" is not in the league list (check spelling, or write "Country: League")' };
  }

  const hhmm = t => { const m = String(t || "").match(/(\d{1,2})\s*[:.h]\s*(\d{2})/); return m ? m[1].padStart(2, "0") + ":" + m[2] : ""; };
  const normTip = t => {
    t = String(t || "").toUpperCase().replace(/\s+/g, "");
    return ({ "X1": "1X", "2X": "X2", "21": "12" })[t] || t;
  };
  const parseScore = s => { const m = String(s || "").match(/^\s*(\d+)\s*[-–:]\s*(\d+)\s*$/); return m ? [+m[1], +m[2]] : null; };

  /* ---- win / lost ---- */
  function footballStatus(tip, ft) {
    const sc = parseScore(ft); if (!sc || !tip) return "";
    const r = sc[0] > sc[1] ? "1" : sc[1] > sc[0] ? "2" : "X";
    const ok = { "1": ["1"], "2": ["2"], "X": ["X"], "1X": ["1", "X"], "X2": ["X", "2"], "12": ["1", "2"] }[normTip(tip)];
    return ok ? (ok.includes(r) ? "won" : "lost") : "";
  }
  // tip "1"/"2" + spread like "-6.5" / "+9.5" (blank = straight win). adjusted margin > 0 won, < 0 lost, 0 = push (left pending)
  function basketballStatus(tip, spread, ft) {
    const sc = parseScore(ft); if (!sc || (tip !== "1" && tip !== "2")) return "";
    const sp = spread === "" || spread == null ? 0 : parseFloat(spread);
    if (isNaN(sp)) return "";
    const adj = (tip === "1" ? sc[0] - sc[1] : sc[1] - sc[0]) + sp;
    return adj > 0 ? "won" : adj < 0 ? "lost" : "";
  }

  const dayDiff = (a, b) => Math.abs((new Date(a + "T12:00:00Z") - new Date(b + "T12:00:00Z")) / 864e5);

  function run(text, opt, ctx) {
    const { db, uid, colorOf, leagues } = ctx;
    const rep = { added: 0, updated: 0, results: 0, problems: [], changed: false };
    const secs = sections(parseCSV(text));
    if (!secs.length) { rep.problems.push("No header row found. The first row of each block must start with STARTING TIME and include HOME TEAM."); return rep; }

    secs.forEach(sec => {
      const { sport, idx } = sec;
      const get = (r, k) => (idx[k] === undefined ? "" : (r[idx[k]] || ""));
      let lastTime = "";
      sec.rows.forEach((r, n) => {
        const home = get(r, "home"), away = get(r, "away");
        if (!home || !away) return;
        const label = home + " vs " + away;
        const t = hhmm(get(r, "time")); if (t) lastTime = t;

        const findFx = () => {
          const h = norm(home), a = norm(away);
          const same = db.fixtures.filter(f => f.sport === sport && norm(f.home) === h && norm(f.away) === a);
          return same.find(f => String(f.kickoff || "").slice(0, 10) === opt.date) ||
                 (opt.mode === "res" ? same.find(f => dayDiff(String(f.kickoff || "").slice(0, 10), opt.date) <= 1) : null);
        };

        /* ---------- RESULTS ---------- */
        if (opt.mode === "res") {
          const ft = get(r, "ft");
          if (!ft) return;
          if (!parseScore(ft)) { rep.problems.push(label + ": FT SCORE '" + ft + "' is not like 2-1"); return; }
          const f = findFx();
          if (!f) { rep.problems.push(label + ": not found on " + opt.date + ". Spelling must match the predictions upload"); return; }
          const sc = parseScore(ft).join("-");
          if (sport === "football") {
            const v = f.fb = Object.assign({ st: "", score: "", sure: false }, f.fb || {});
            v.score = sc; v.st = footballStatus(v.tip, sc);
            if (!v.st) rep.problems.push(label + ": score saved but could not mark won/lost (tip missing?)");
          } else {
            const v = f.bb = Object.assign({ st: "", score: "", sure: false }, f.bb || {});
            v.score = sc; v.st = basketballStatus(v.tip, v.spread, sc);
            if (!v.st) rep.problems.push(label + ": score saved, but tip is missing or the spread landed exactly on the line (left pending)");
          }
          rep.results++; rep.changed = true;
          return;
        }

        /* ---------- PREDICTIONS ---------- */
        if (!t && !lastTime) { rep.problems.push(label + ": no start time"); return; }
        const lg = findLeague(leagues, sport, get(r, "league"));
        if (lg.err) { rep.problems.push(label + ": " + lg.err); return; }

        const kickoff = opt.date + "T" + (t || lastTime);
        const conf = String(get(r, "conf")).replace(/[^0-9.]/g, "");
        const tp = splitBracket(get(r, "tip"));
        let fields;

        if (sport === "football") {
          const tip = normTip(tp.v);
          if (!["1", "X", "2", "1X", "X2", "12"].includes(tip)) { rep.problems.push(label + ": tip '" + tp.v + "' must be 1, X, 2, 1X, X2 or 12"); return; }
          const ou = splitBracket(get(r, "ou")), bt = splitBracket(get(r, "btts"));
          fields = {
            tip, tipOdds: tp.o, o1: get(r, "o1"), oX: get(r, "oX"), o2: get(r, "o2"),
            btts: /^(GG|NG)$/i.test(bt.v) ? bt.v.toUpperCase() : "", bttsOdds: bt.o,
            ou: /under/i.test(ou.v) ? "Under" : /over/i.test(ou.v) ? "Over" : "", ouOdds: ou.o,
            conf, cs: get(r, "cs")   // CS tip never carries odds
          };
        } else {
          const parts = tp.v.split(/\s+/);
          if (parts[0] !== "1" && parts[0] !== "2") { rep.problems.push(label + ": tip '" + tp.v + "' must start with 1 or 2 (e.g. 1 -6.5)"); return; }
          const pts = get(r, "pts");
          fields = {
            tip: parts[0], tipOdds: tp.o, spread: parts[1] || "", o1: get(r, "o1"), o2: get(r, "o2"), conf,
            totalSide: /under/i.test(pts) ? "Under" : /over/i.test(pts) ? "Over" : "",
            totalLine: (pts.match(/[0-9]+(?:\.[0-9]+)?/) || [""])[0]
          };
        }
        fields.live = !!opt.live;

        let f = findFx();
        const key = sport === "football" ? "fb" : "bb";
        if (f) {
          f.country = lg.country; f.competition = lg.competition; f.kickoff = kickoff;
          f[key] = Object.assign({ st: "", score: "", sure: false }, f[key] || {}, fields);
          rep.updated++;
        } else {
          f = { id: uid(), sport, country: lg.country, competition: lg.competition, home, away, kickoff,
                hc: (colorOf && colorOf(home)) || "", ac: (colorOf && colorOf(away)) || "" };
          f[key] = Object.assign({ st: "", score: "", sure: false }, fields);
          db.fixtures.push(f);
          rep.added++;
        }
        rep.changed = true;
      });
    });
    return rep;
  }

  const api = { parseCSV, splitBracket, sections, findLeague, footballStatus, basketballStatus, run };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; return; }

  /* ---- browser wiring ---- */
  const el = id => document.getElementById(id);
  const fileEl = el("csvFile"); if (!fileEl) return;
  try { if (typeof watDay === "function") el("csvDate").value = watDay(0); } catch (e) {}
  fileEl.addEventListener("change", async () => {
    const f = fileEl.files[0]; if (!f) return;
    const out = el("csvOut");
    try {
      const rep = run(await f.text(),
        { mode: el("csvMode").value, date: el("csvDate").value, live: el("csvLive").checked },
        { db, uid, colorOf: typeof colorOf === "function" ? colorOf : () => "", leagues: window.PB_LEAGUES });
      if (rep.changed) commit();
      const head = el("csvMode").value === "res"
        ? "Results saved: " + rep.results + " match" + (rep.results === 1 ? "" : "es") + " marked won/lost."
        : "Done: " + rep.added + " added, " + rep.updated + " updated.";
      out.textContent = head + (rep.problems.length ? "\n\nNeeds attention (" + rep.problems.length + "):\n- " + rep.problems.join("\n- ") : "");
      out.style.color = rep.problems.length ? "var(--lost)" : "";
      if (typeof toast === "function") toast(head);
    } catch (e) { out.textContent = "Import failed: " + e.message; console.error(e); }
    fileEl.value = "";
  });
})();
