/* PicksBible admin: paste player props from a sheet (before the games) and paste the final stats (after the games).
   Columns, in this order (a header row is optional, copy straight from Google Sheets or Excel):
   STARTING TIME | LEAGUE | HOME TEAM | AWAY TEAM | PLAYER | PROP TYPE | ODDS | PREDICTION (e.g. Over 17.5) | FINAL SCORE (the player's final stat, e.g. 9)
   Before the games: new props are added and go live straight away. After the games: the FINAL SCORE is compared with the
   prediction and the prop is marked won or lost. Equal to the line = left pending (a push). */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const norm = s => String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9.+]+/g, " ").trim();
  const ALIAS = {
    pts: ["points", "pts", "player points", "point"], reb: ["rebounds", "reb", "rebs", "player rebounds"], ast: ["assists", "ast", "player assists"],
    pra: ["pra", "pts reb ast", "pts+reb+ast", "points rebounds assists", "points + rebounds + assists", "player points + rebounds + assists"],
    "3ps": ["3pt made", "3pt scored", "3 pointers made", "3 pointers", "threes", "3pm", "3ps", "player 3pt shots scored", "3pt shots scored"],
    "3pa": ["3pt attempted", "3pa", "3 pointers attempted", "player 3pt shots attempted", "3pt shots attempted"],
    blk: ["blocks", "blk", "player blocks"], stl: ["steals", "stl", "player steals"], tov: ["turnovers", "tov", "player turnovers"]
  };
  function marketKey(raw) {
    const t = norm(raw); if (!t) return "";
    const list = (typeof PROP_MARKETS !== "undefined" ? PROP_MARKETS : []);
    for (const m of list) { if (m.type !== "player") continue; if (t === m.k || t === norm(m.name) || t === norm(m.name.replace(/\s*\(over\/under\)/i, ""))) return m.k; }
    for (const k in ALIAS) if (ALIAS[k].some(a => norm(a) === t)) return k;
    return "";
  }
  function parseRows(text) {
    const tsv = /\t/.test(text);
    const rows = [];
    String(text || "").replace(/^﻿/, "").split(/\r?\n/).forEach(line => {
      if (!line.trim()) return;
      let cells;
      if (tsv) cells = line.split("\t");
      else { cells = []; let cur = "", q = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; } else if (ch === '"') q = true; else if (ch === ",") { cells.push(cur); cur = ""; } else cur += ch; } cells.push(cur); }
      rows.push(cells.map(c => c.trim()));
    });
    /* column order: STARTING TIME | LEAGUE | HOME TEAM | AWAY TEAM | PLAYER | PROP TYPE | ODDS | PREDICTION | FINAL SCORE.
       A header row is read by name; without one the order above is used (7 columns without LEAGUE and ODDS = the older layout). */
    let ix = { time: 0, league: 1, home: 2, away: 3, player: 4, ptype: 5, odds: 6, pred: 7, fin: 8 };
    if (rows.length && /home/i.test(rows[0].join(" ")) && /away/i.test(rows[0].join(" "))) {
      const h = rows.shift().map(norm); ix = {};
      h.forEach((x, i) => {
        if (/^(starting time|time|start)/.test(x)) ix.time = i; else if (x === "league") ix.league = i; else if (x.startsWith("home")) ix.home = i; else if (x.startsWith("away")) ix.away = i;
        else if (x.startsWith("player")) ix.player = i; else if (x.startsWith("prop")) ix.ptype = i; else if (x.startsWith("odds")) ix.odds = i; else if (x.startsWith("pred")) ix.pred = i; else if (/^(final|ft|result|score)/.test(x)) ix.fin = i;
      });
    } else if (rows.length && rows[0].length <= 7) ix = { time: 0, home: 1, away: 2, player: 3, ptype: 4, pred: 5, fin: 6 };
    return rows.map(r => ({ time: r[ix.time], league: r[ix.league], home: r[ix.home], away: r[ix.away], player: r[ix.player], ptype: r[ix.ptype], odds: r[ix.odds], pred: r[ix.pred], fin: r[ix.fin] }));
  }
  const hhmm = t => { const m = String(t || "").match(/(\d{1,2})\s*[:.h]\s*(\d{2})/); return m ? m[1].padStart(2, "0") + ":" + m[2] : ""; };
  const dayDiff = (a, b) => Math.abs((new Date(a + "T12:00:00Z") - new Date(b + "T12:00:00Z")) / 864e5);
  const parsePred = s => { const m = String(s || "").match(/(over|under|o|u)\s*([0-9]+(?:\.[0-9]+)?)/i); return m ? { side: /^o/i.test(m[1]) ? "Over" : "Under", line: m[2] } : null; };
  const num = s => { const m = String(s == null ? "" : s).replace(",", ".").match(/-?[0-9]+(?:\.[0-9]+)?/); return m ? parseFloat(m[0]) : NaN; };

  function run(text, mode, date) {
    const rep = { added: 0, updated: 0, marked: 0, push: 0, waiting: 0, problems: [], changed: false };
    const rows = parseRows(text);
    if (!rows.length) { rep.problems.push("Nothing to import. Paste the rows first."); return rep; }
    let lastTime = "";
    rows.forEach((r, n) => {
      const { time, home, away, player, ptype, pred, fin } = r, od = String(r.odds == null ? "" : r.odds).replace(",", ".").trim(), odds = /^[0-9]+(\.[0-9]+)?$/.test(od) ? od : "";
      if (!home || !away || !player) { rep.problems.push("Row " + (n + 1) + ": needs HOME TEAM, AWAY TEAM and PLAYER"); return; }
      const label = player + " (" + home + " v " + away + ")";
      const t = hhmm(time); if (t) lastTime = t;
      const k = marketKey(ptype);
      if (!k) { rep.problems.push(label + ": prop type '" + ptype + "' is not one of the site's player prop types"); return; }
      const h = norm(home), a = norm(away);
      const same = db.fixtures.filter(f => f.sport === "basketball" && norm(f.home) === h && norm(f.away) === a);
      const f = same.find(x => String(x.kickoff || "").slice(0, 10) === date) || (mode === "res" ? same.find(x => dayDiff(String(x.kickoff || "").slice(0, 10), date) <= 1) : null);
      if (!f) { rep.problems.push(label + ": the match is not on the site for " + date + " (add it in the Basketball table first, spelling must match)"); return; }
      const pn = norm(player);
      let p = db.props.find(x => x.fixtureId === f.id && x.market === k && norm(x.player) === pn);
      const pr = parsePred(pred);
      if (mode === "pre") {
        if (!pr) { rep.problems.push(label + ": PREDICTION '" + pred + "' must look like Over 17.5 or Under 5.5"); return; }
        if (p) { p.line = pr.line; p.side = pr.side; if (odds) p.odds = odds; if (!p.live) p.live = true; rep.updated++; }
        else { db.props.push({ id: uid(), fixtureId: f.id, market: k, player: player.trim(), team: "", line: pr.line, side: pr.side, odds: odds, live: true, createdAt: new Date().toISOString() }); rep.added++; }
        rep.changed = true; return;
      }
      /* after the games */
      if (fin === undefined || String(fin).trim() === "") { rep.waiting++; return; }
      const stat = num(fin);
      if (isNaN(stat)) { rep.problems.push(label + ": FINAL SCORE '" + fin + "' is not a number"); return; }
      if (!p) {
        if (!pr) { rep.problems.push(label + ": not on the site and no PREDICTION in the row, so it cannot be marked"); return; }
        p = { id: uid(), fixtureId: f.id, market: k, player: player.trim(), team: "", line: pr.line, side: pr.side, odds: odds, live: true, createdAt: new Date().toISOString() };
        db.props.push(p); rep.added++;
      } else { if (pr) { p.line = pr.line; p.side = pr.side; } if (odds) p.odds = odds; }
      const line = parseFloat(p.line);
      if (isNaN(line) || !/^(over|under)$/i.test(p.side || "")) { rep.problems.push(label + ": the prop has no Over/Under line"); return; }
      p.stat = stat;
      if (stat === line) { p.st = "pending"; rep.push++; rep.changed = true; return; }
      p.st = (/^over$/i.test(p.side) ? stat > line : stat < line) ? "won" : "lost";
      rep.marked++; rep.changed = true;
    });
    return rep;
  }

  function mount() {
    const tab = $("#tab-bbprops"); if (!tab || $("#ppImport")) return;
    const card = document.createElement("div"); card.className = "card"; card.id = "ppImport";
    card.innerHTML = `<h2>Upload player props (CSV from your sheet)</h2>
<p class="note">In Google Sheets use <b>File &rarr; Download &rarr; Comma Separated Values (.csv)</b> on the <b>Basketball Props</b> tab, then upload it here. Columns: <b>STARTING TIME, LEAGUE, HOME TEAM, AWAY TEAM, PLAYER, PROP TYPE, ODDS, PREDICTION, FINAL SCORE</b>.</p>
<div class="grid">
 <div><label>Match date (Nigeria time) *</label><input type="date" id="ppDate"></div>
 <div><label>What is in the file?</label><select id="ppMode"><option value="pre">Predictions (before the games): add the props, they go live</option><option value="res">Results (file has the FINAL SCORE filled in): mark won / lost</option></select></div>
</div>
<p><label class="btn" style="display:inline-block;cursor:pointer">Upload props CSV<input type="file" id="ppFile" accept=".csv,text/csv,.tsv,.txt" style="display:none"></label> <span class="muted" id="ppOut" style="white-space:pre-wrap"></span></p>`;
    tab.insertBefore(card, tab.firstChild);
    $("#ppDate").value = typeof watDay === "function" ? watDay(0) : "";
    $("#ppFile").addEventListener("change", async () => {
      const out = $("#ppOut"), inp = $("#ppFile"), f = inp.files[0], date = $("#ppDate").value, mode = $("#ppMode").value;
      if (!f) return;
      if (!date) { out.textContent = "Pick the match date first."; inp.value = ""; return; }
      try {
        const rep = run(await f.text(), mode, date);
        if (rep.changed) commit();
        const head = mode === "pre" ? "Props " + date + ": " + rep.added + " added, " + rep.updated + " updated (live)." : "Props " + date + ": " + rep.marked + " marked won/lost" + (rep.push ? ", " + rep.push + " landed exactly on the line (left pending)" : "") + (rep.added ? ", " + rep.added + " added" : "") + (rep.waiting ? ", " + rep.waiting + " had no final score yet" : "") + ".";
        out.textContent = head + (rep.problems.length ? "\n\nNeeds attention (" + rep.problems.length + "):\n- " + rep.problems.join("\n- ") : "");
        out.style.color = rep.problems.length ? "var(--lost)" : "";
        if (rep.changed) toast(head);
      } catch (e) { out.textContent = "Import failed: " + e.message; console.error(e); }
      inp.value = "";
    });
  }
  if (typeof module !== "undefined" && module.exports) { module.exports = { run, marketKey, parseRows }; return; }
  mount();
})();
