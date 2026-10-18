/* PicksBible admin: automatic settlement from final scores.
   When a results upload (or any edit) puts a final score on a match, this settles, without any extra clicks:
     - the Banker Bet of the Day (copies the table tip result for that match),
     - Bets of the Day (works out won/lost from the pick text and the score),
     - VIP packages (each pick is checked; ANY lost = package lost, all won = package won).
   It never overwrites a result you set by hand: it only fills empty results, or ones it set itself earlier.
   Loaded by admin.html after the main script. Exposes window.PBSettle.evalPick for testing. */
(function (root) {
  "use strict";
  const num = s => { const m = String(s).replace(",", ".").match(/[+-]?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : NaN; };
  const parseScore = s => { const m = String(s || "").match(/^\s*(\d+)\s*[-–:]\s*(\d+)\s*$/); return m ? [+m[1], +m[2]] : null; };
  const cmp = d => d > 0 ? "won" : d < 0 ? "lost" : "push";

  /* returns "won" | "lost" | "push" | "" (cannot tell). sc = [home, away] */
  function evalPick(market, sel, sc) {
    if (!sc) return "";
    const h = sc[0], a = sc[1], r = h > a ? "1" : a > h ? "2" : "X";
    const mk = String(market || "").toLowerCase().replace(/[^a-z0-9/]/g, ""), t = String(sel || "").trim();
    const T = t.toLowerCase().replace(/\s+/g, " ");
    const inSet = set => set.includes(r) ? "won" : "lost";
    const ou = (total) => {                       /* "over 2.5" / "under 2.5" */
      const line = num(T); if (isNaN(line) || !/over|under/.test(T)) return "";
      return cmp(/over/.test(T) ? total - line : line - total);
    };
    const hcp = () => {                           /* "home -1", "away +1.5" */
      const line = num(T); if (isNaN(line)) return "";
      if (/home|^1\b/.test(T)) return cmp(h + line - a);
      if (/away|^2\b/.test(T)) return cmp(a + line - h);
      return "";
    };
    const oneX2 = () => {
      const k = T.replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ");
      const map = { "1": ["1"], "x": ["X"], "2": ["2"], "1x": ["1", "X"], "x1": ["1", "X"], "x2": ["X", "2"], "2x": ["X", "2"], "12": ["1", "2"],
        "home": ["1"], "home win": ["1"], "draw": ["X"], "away": ["2"], "away win": ["2"], "home or draw": ["1", "X"], "draw or home": ["1", "X"],
        "away or draw": ["X", "2"], "draw or away": ["X", "2"], "home or away": ["1", "2"] };
      return map[k] ? inSet(map[k]) : "";
    };
    if (mk === "1x2") return oneX2() || hcp();
    if (mk === "btts") { if (/^(yes|gg)/.test(T)) return h > 0 && a > 0 ? "won" : "lost"; if (/^(no|ng)/.test(T)) return h > 0 && a > 0 ? "lost" : "won"; return ""; }
    if (mk === "over/under") return ou(h + a);
    if (mk === "homeover/under") return ou(h);
    if (mk === "awayover/under") return ou(a);
    if (mk === "handicap") return hcp();
    /* free text (Bets of the Day pick box): work out what it is */
    if (/home over|home under/.test(T)) return ou(h);
    if (/away over|away under/.test(T)) return ou(a);
    if (/over|under/.test(T)) return ou(h + a);
    if (/btts|gg|ng/.test(T)) { const yes = !/\b(no|ng)\b/.test(T); return (h > 0 && a > 0) === yes ? "won" : "lost"; }
    const spread = T.match(/^([12])\s*([+-]\s*\d+(\.\d+)?)$/);       /* basketball "1 -6.5" */
    if (spread) { const line = num(spread[2].replace(/\s/g, "")); return spread[1] === "1" ? cmp(h + line - a) : cmp(a + line - h); }
    if (/(home|away)\s*[+-]/.test(T)) return hcp();
    return oneX2();
  }

  function scoreOf(f) {
    const s = f.sport === "basketball" ? (f.bb && f.bb.score) : (f.fb && f.fb.score);
    return parseScore(s) || parseScore(f.bo && f.bo.score);
  }
  const done = s => s === "won" || s === "lost";

  /* package result from leg results: any lost = lost; all (non-push) won = won; otherwise still pending */
  function packageResult(res) {
    if (res.some(x => x === "lost")) return "lost";
    if (res.length && res.every(x => x === "won" || x === "push") && res.some(x => x === "won")) return "won";
    return "";
  }

  function settleAll(db) {
    const out = { et: 0, bo: 0, vip: [], changed: false };
    (db.fixtures || []).forEach(f => {
      const sc = scoreOf(f); if (!sc) return;
      if (f.et && f.et.on) {                                  /* Banker Bet of the Day = the pick typed in Home boxes, or else the table tip for this match */
        const tip = (f.sport === "basketball" ? f.bb : f.fb) || {};
        const mine = String(f.et.pick || "").trim();
        const r = mine ? evalPick("", mine, sc) : tip.st;
        const want = done(r) ? r : "";
        if (want && !done(f.et.st) || (want && f.et.stAuto && f.et.st === f.et.stAuto && f.et.st !== want)) { f.et.st = want; f.et.stAuto = want; out.et++; out.changed = true; }
      }
      if (f.bo && f.bo.on && f.bo.pick) {
        const want = evalPick("", f.bo.pick, sc), w = done(want) ? want : "";
        const cur = f.bo.st === "pending" ? "" : f.bo.st;
        if (w && (!done(cur) || (f.bo.stAuto && cur === f.bo.stAuto && cur !== w))) { f.bo.st = w; f.bo.stAuto = w; if (!f.bo.score) f.bo.score = sc.join("-"); out.bo++; out.changed = true; }
      }
    });
    (db.vip || []).forEach(v => {
      if (!v.legs || !v.legs.length) return;
      const res = v.legs.map(l => {
        const f = (db.fixtures || []).find(x => x.id === l.fid), sc = f && scoreOf(f);
        const r = sc ? evalPick(l.market, l.sel, sc) : "";
        return r;
      });
      let ch = false;
      v.legs.forEach((l, i) => { if ((l.res || "") !== res[i]) { l.res = res[i]; ch = true; } });
      if (v.draft) { if (ch) out.changed = true; return; }          /* drafts are never settled */
      const want = packageResult(res);
      if (want && (!done(v.st) || (v.stAuto && v.st === v.stAuto && v.st !== want))) { v.st = want; v.stAuto = want; ch = true; out.vip.push(v); }
      if (ch) out.changed = true;
    });
    return out;
  }
  const api = { evalPick, settleAll, packageResult, parseScore };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PBSettle = api;

  /* ---- hook into the admin: run after every commit() (results upload ends with a commit) ---- */
  if (typeof document !== "undefined") {
    const t = setInterval(() => {
      if (typeof commit !== "function" || typeof db === "undefined") return;
      clearInterval(t);
      const orig = window.commit;
      window.commit = function () {
        let r; try { r = settleAll(db); } catch (e) { console.error("auto-settle", e); }
        const ret = orig.apply(this, arguments);
        if (r && r.changed) {
          if (r.vip.length) {
            r.vip.forEach(v => {                                  /* keep the members' private copy in step */
              try { Store.fs.collection("vip_feed").doc(v.id).set({ st: v.st, legs: v.legs.map(l => ({ sport: l.sport, home: l.home, away: l.away, comp: l.comp, ko: l.ko, market: l.market, sel: l.sel, res: l.res || "" })) }, { merge: true }).catch(() => {}); } catch (_) {}
            });
          }
          const bits = [];
          if (r.et) bits.push(r.et + " Banker Bet");
          if (r.bo) bits.push(r.bo + " Bet" + (r.bo === 1 ? "" : "s") + " of the Day");
          if (r.vip.length) bits.push(r.vip.length + " VIP package" + (r.vip.length === 1 ? "" : "s"));
          if (bits.length && typeof toast === "function") toast("Auto-settled: " + bits.join(", "));
        }
        return ret;
      };
    }, 300);
  }
})(typeof window !== "undefined" ? window : globalThis);
