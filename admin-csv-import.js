/* PicksBible admin: import predictions / results from a Google Sheet CSV.
   Works with the existing admin.html (db, uid, colorOf, commit, watDay). No server needed.
   One CSV may hold football AND basketball blocks (each block starts with its own header row). */
(function () {
  "use strict";

  /* accents are ignored: "SUPER LIG" matches "Süper Lig", "DIVISION" matches "División" */
  const norm = s => String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ı/g, "i").replace(/ø/g, "o").replace(/đ/g, "d").replace(/ł/g, "l").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, " ").trim();

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
          else if (idx.ft === undefined && (h.startsWith("ft") || /^(final|full time|score|result|results|fulltime)\b/.test(h))) idx.ft = i;
        });
        const fb = idx.oX !== undefined || idx.btts !== undefined || idx.cs !== undefined;
        cur = { sport: fb ? "football" : "basketball", idx, rows: [], heads: r };
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
    /* other spellings people use in sheets */
    const ALIAS = { "uefa champions league": "champions league", "uefa europa league": "europa league", "uefa europa conference league": "conference league", "uefa conference league": "conference league", "saudi professional league": "saudi pro league", "saudi league": "saudi pro league", "spl": "saudi pro league", "la liga": "laliga", "serie a tim": "serie a" };
    want = ALIAS[want] || want;
    if (c0 === "uefa" || c0 === "international" || c0 === "europe") c0 = "europe uefa";
    if (c0 === "caf" || c0 === "africa") { c0 = "africa caf"; if (want === "champions league" || want === "confederation cup") want = "caf " + want; }  if (c0 === "afc") c0 = "asia afc"; if (c0 === "concacaf") c0 = "north central america concacaf";
    const hits = [];
    ((leagues || {})[sport] || []).forEach(g => (g.l || []).forEach(l => {
      const nl = norm(l), nc = norm(g.c);
      /* "Europe" matches "Europe (UEFA)", "Asia" matches "Asia (AFC)" */
      if (c0 ? ((nc === c0 || nc.startsWith(c0 + " ")) && nl === want) : (nl === want || norm(g.c + " " + l) === want)) hits.push({ country: g.c, competition: l });
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
  /* accepts 2-1, 2 - 1, 2:1, "FT 2-1", "2-1 (1-0)", "2-1 HT 1-0" (the first score is the full-time one) */
  const parseScore = s => { const m = String(s || "").match(/^\D{0,8}?(\d{1,3})\s*[-–—:]\s*(\d{1,3})(?!\d)/); return m ? [+m[1], +m[2]] : null; };

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
    const rep = { added: 0, updated: 0, results: 0, waiting: 0, rows: 0, cols: [], problems: [], changed: false };
    const secs = sections(parseCSV(text));
    if (opt.only && secs.length && !secs.some(x => x.sport === opt.only)) {
      rep.problems.push("No " + opt.only + " table found in this file. Is this the right button?");
    }
    if (!secs.length) { rep.problems.push("No header row found. The first row of each block must start with STARTING TIME and include HOME TEAM."); return rep; }

    secs.forEach(sec => {
      const { sport, idx } = sec;
      if (opt.only && sport !== opt.only) {
        rep.problems.push("A " + sport + " block was skipped: you used the " + opt.only + " upload button. Use the " + sport + " button for it.");
        return;
      }
      const get = (r, k) => (idx[k] === undefined ? "" : (r[idx[k]] || ""));
      if (opt.mode === "res" && idx.ft === undefined) {
        /* no recognised score heading: use a spare column whose filled cells look like scores (never the CS TIPS column) */
        const used = new Set(Object.values(idx));
        let best = -1, bestN = 0;
        (sec.heads || []).forEach((_, ci) => {
          if (used.has(ci)) return;
          const cells = sec.rows.map(r => r[ci] || "").filter(Boolean), n = cells.filter(c => parseScore(c)).length;
          if (n >= 1 && n >= cells.length * 0.6 && n > bestN) { best = ci; bestN = n; }
        });
        if (best >= 0) idx.ft = best;
        else { rep.problems.push("The " + sport + " table has no score column I can recognise. Columns found: " + (sec.heads || []).join(" | ") + ". Name the score column FT SCORE."); return; }
      }
      let lastTime = "";
      if (opt.mode === "res") rep.cols.push(sport + " score column = " + (idx.ft === undefined ? "none" : '"' + ((sec.heads || [])[idx.ft] || "?") + '"'));
      sec.rows.forEach((r, n) => {
        const home = get(r, "home"), away = get(r, "away");
        if (!home || !away) return;
        rep.rows++;
        const label = home + " vs " + away;
        const t = hhmm(get(r, "time")); if (t) lastTime = t;
        let late = null;   /* results file only: a finished match that was never uploaded before kick-off */

        const findFx = () => {
          const h = norm(home), a = norm(away);
          const same = db.fixtures.filter(f => f.sport === sport && norm(f.home) === h && norm(f.away) === a);
          return same.find(f => String(f.kickoff || "").slice(0, 10) === opt.date) ||
                 (opt.mode === "res" ? same.find(f => dayDiff(String(f.kickoff || "").slice(0, 10), opt.date) <= 1) : null);
        };

        /* ---------- RESULTS ---------- */
        if (opt.mode === "res") {
          const ft = get(r, "ft");
          if (!ft) { rep.waiting++; return; }
          if (!parseScore(ft)) { rep.problems.push(label + ": FT SCORE '" + ft + "' is not like 2-1"); return; }
          const f = findFx();
          if (!f && opt.late) { late = parseScore(ft).join("-"); }
          else {
          if (!f) { rep.problems.push(label + ": not found on " + opt.date + ". Spelling must match the predictions upload, or tick \"Add matches missing from the site\" if its tip was in your sheet before kick-off"); return; }
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
            btts: /^(GG|NG)$/i.test(bt.v) ? bt.v.toUpperCase() : "",
            ou: /under/i.test(ou.v) ? "Under" : /over/i.test(ou.v) ? "Over" : "",
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
        if (late) {
          const v = f[key]; v.score = late;
          v.st = sport === "football" ? footballStatus(v.tip, late) : basketballStatus(v.tip, v.spread, late);
          rep.results++; rep.late = (rep.late || 0) + 1;
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
  const inputs = ["csvFileFb", "csvFileBb"].map(el).filter(Boolean);
  if (!inputs.length) return;
  const dateEl = el("csvDate"), out = el("csvOut");

  // upload buttons stay locked until a match date is chosen
  function syncLock() {
    const ok = !!dateEl.value;
    inputs.forEach(i => { i.disabled = !ok; i.parentNode.style.opacity = ok ? "" : ".4"; i.parentNode.style.pointerEvents = ok ? "" : "none"; });
    if (!ok) { out.textContent = "Pick the match date first."; out.style.color = ""; }
    else if (out.textContent === "Pick the match date first.") out.textContent = "";
  }
  dateEl.addEventListener("change", syncLock); dateEl.addEventListener("input", syncLock); syncLock();

  inputs.forEach(inp => inp.addEventListener("change", async () => {
    const f = inp.files[0]; if (!f) return;
    const sport = inp.dataset.sport, mode = el("csvMode").value;
    if (!dateEl.value) { out.textContent = "Pick the match date first."; inp.value = ""; return; }
    try {
      const rep = run(await f.text(),
        { mode, date: dateEl.value, live: el("csvLive").checked, only: sport, late: mode === "res" && !!(el("csvLate") && el("csvLate").checked) },
        { db, uid, colorOf: typeof colorOf === "function" ? colorOf : () => "", leagues: window.PB_LEAGUES });
      if (rep.changed) commit();
      const head = (sport === "football" ? "Football" : "Basketball") + " " + dateEl.value + ": " + (mode === "res"
        ? rep.results + " result" + (rep.results === 1 ? "" : "s") + " saved and marked won/lost." + (rep.waiting ? " " + rep.waiting + " match" + (rep.waiting === 1 ? "" : "es") + " had no score yet (left pending)." : "")
        : rep.added + " added, " + rep.updated + " updated.");
      const info = mode === "res" ? "\n[importer v2: read " + rep.rows + " match rows; " + rep.cols.join("; ") + "]" : "";
      out.textContent = head + info + (rep.problems.length ? "\n\nNeeds attention (" + rep.problems.length + "):\n- " + rep.problems.join("\n- ") : "");
      out.style.color = rep.problems.length ? "var(--lost)" : "";
      if (mode === "res" && rep.late) out.textContent += "\n\n" + rep.late + " match" + (rep.late === 1 ? " was" : "es were") + " not on the site before kick-off, so " + (rep.late === 1 ? "it was" : "they were") + " added now from this file with the result.";
      /* a skipped prediction row is a match visitors will never see: keep a red bar on screen until a clean upload */
      try {
        const KEY = "pb.skipWarn", bar = document.getElementById("pbSkipBar") || Object.assign(document.createElement("div"), { id: "pbSkipBar" });
        if (mode === "pre" && rep.problems.length) localStorage.setItem(KEY, JSON.stringify({ d: dateEl.value, sport, p: rep.problems.slice(0, 12) }));
        else if (mode === "pre") localStorage.removeItem(KEY);
        const w = JSON.parse(localStorage.getItem(KEY) || "null");
        if (w) {
          bar.style.cssText = "position:fixed;left:0;right:0;top:0;z-index:9999;background:#b3261e;color:#fff;padding:10px 14px;font:600 14px system-ui;box-shadow:0 4px 14px #0008";
          bar.innerHTML = "&#9888; " + w.p.length + " " + w.sport + " match" + (w.p.length === 1 ? " was" : "es were") + " NOT added from your " + w.d + " predictions upload. Visitors cannot see " + (w.p.length === 1 ? "it" : "them") + ": <br><small style='font-weight:400'>" + w.p.map(x => x.replace(/&/g, "&amp;").replace(/</g, "&lt;")).join(" &bull; ") + "</small> <button type='button' style='margin-left:10px;padding:3px 10px' id='pbSkipX'>Dismiss</button>";
          document.body.appendChild(bar);
          document.getElementById("pbSkipX").onclick = () => { try { localStorage.removeItem(KEY); } catch (_) {} bar.remove(); };
        } else bar.remove();
      } catch (_) {}
      if (typeof toast === "function") toast(head);
    } catch (e) { out.textContent = "Import failed: " + e.message; console.error(e); }
    inp.value = "";
  }));
})();
