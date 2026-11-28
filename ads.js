/* PicksBible ad placements: desktop (1100px and wider) and tablet (768px to 1099px). Phones are untouched.
   Runs on: the home page, the three Predictions pages (all, football, basketball), the Expert Tips category pages and the Expert Tips market pages.
   The home page also gets the VIP Tracker strip and the wider 7-day date strip.
   This file is self-contained: it adds its own styles and builds the slots when the page loads.

   TO RUN AN ADVERTISER: fill in the slot below, for example
     c: { img: "img/ads/brand-300x250.png", href: "https://advertiser.example/?ref=picksbible", alt: "Brand name" }
   A slot left empty shows an "Advertise Here!" placeholder with a Book this slot link.

   Slots
     c       300x250  desktop: right column, top   | tablet: inline under Bets of the Day
     d       300x600  desktop: right column, sticky (stays in view while scrolling)
     (the old 728x90 in-feed banner and the two "Advertise Here" boxes are removed; a thin VIP Tracker strip sits under Bets of the Day instead)
     f       320x50   tablet: inline under the 300x250
     catfish 728x90   desktop and tablet: fixed to the bottom of the screen, scales down to fit narrow screens, can be closed */
(function () {
  "use strict";
  var AD = {
    c: { img: "", href: "", alt: "" },
    d: { img: "", href: "", alt: "" },
    f: { img: "", href: "", alt: "" },
    catfish: { img: "", href: "", alt: "" }
  };
  var BOOK = "contact.html";
  var SIZE = { c: [300, 250], d: [300, 600], f: [320, 50], catfish: [728, 90] };

  if (document.getElementById("pbAdsCss")) return;
  var doc = document, body = doc.body;
  var HUBS = ["over-2-5-goals-predictions-today", "under-2-5-goals-predictions-today", "btts-predictions-today", "correct-score-predictions-today", "double-chance-predictions-today", "sure-predictions-today", "football-predictions-tomorrow", "basketball-predictions-tomorrow", "nba-predictions-today", "wnba-predictions-today", "basketball-spread-predictions-today", "basketball-over-under-predictions-today", "nba-player-props-today", "2-odds-predictions-today", "3-odds-predictions-today", "5-odds-predictions-today", "10-odds-predictions-today"];
  var path = location.pathname.replace(/^\/+|\/+$/g, "").replace(/\.html$/, "");
  var home = doc.querySelector("main > .wrap"), flat = doc.querySelector("main.wrap");
  var main = home || flat, kind = "";
  if (!main) return;
  if (home && home.querySelector("[data-experttip]")) kind = "home";
  else if (flat && flat.querySelector("[data-bigtable]")) kind = "pred";
  else if (flat && flat.querySelector("[data-cat]")) kind = "cat";
  else if (flat && flat.classList.contains("sp") && HUBS.indexOf(path) >= 0) kind = "hub";
  if (!kind) return; /* any other page: leave it alone */

  /* ---------- styles ---------- */
  var css = doc.createElement("style");
  css.id = "pbAdsCss";
  css.textContent =
    ".pbad{display:block;margin:0 auto;max-width:100%}" +
    ".pbad-lbl{display:block;text-align:center;font:600 10px/1 var(--body,sans-serif);letter-spacing:.14em;color:var(--muted,#94A3B8);text-transform:uppercase;margin:0 0 6px}" +
    ".pbad a.pbad-l{display:block;line-height:0;border-radius:8px;overflow:hidden}" +
    ".pbad img{display:block;width:100%;height:auto;border-radius:8px}" +
    ".pbad-ph{box-sizing:border-box;width:100%;border:2px dashed #475569;border-radius:8px;background:#020617;color:var(--cyan,#3B82F6);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;font:700 18px var(--display,sans-serif);letter-spacing:.04em;padding:10px}" +
    ".pbad-ph small{display:block;font:500 11px var(--body,sans-serif);color:var(--muted,#94A3B8);letter-spacing:0}" +
    ".pbad-ph a{font:700 12px var(--body,sans-serif);color:#fff;background:var(--purple,#552583);border-radius:999px;padding:6px 14px;text-decoration:none;letter-spacing:.02em}" +
    "html[data-theme=\"light\"] .pbad-ph{background:var(--panel,#F3F5F9);color:#2563EB}" +
    /* home date strip: full width, 7 days */
    "@media(min-width:768px){" +
    ".hdates[data-d7]{max-width:none;width:100%;box-sizing:border-box}" +
    ".hdates[data-d7]>button[data-hday]{display:none}" +
    ".hdates[data-d7]>button.pb-d7{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:9px 4px;line-height:1.15}" +
    ".hdates[data-d7]>button.pb-d7 small{font:600 10.5px var(--body,sans-serif);letter-spacing:.1em;text-transform:uppercase;opacity:.75}" +
    ".hdates[data-d7]>button.pb-d7 b{font:700 15px var(--body,sans-serif);white-space:nowrap}" +
    ".hdates[data-d7]>button.pb-d7[aria-pressed=\"true\"] small{opacity:1}" +
    "}" +
    /* layout: desktop rail */
    ".pb-cols{display:block}.pb-rail,.pb-inl,.pb-cf{display:none}" +
    ".pb-main .wrap{max-width:none;padding-inline:0}" +
    "@media(min-width:1100px){" +
    ".pb-pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;align-items:start;margin:0 0 22px}" +
    ".pb-pair>.sec{margin:0;min-width:0;display:flex;flex-direction:column}.pb-pair>.sec .etbody{align-content:stretch}" +
    ".pb-pair .etbody{flex:1}.pb-pair .botdbox{flex:1;display:flex;flex-direction:column}.pb-pair .botdbox .bdrow{flex:1 1 auto}.pb-pair .bdrow.pb-hide{display:none!important}" +
    ".pb-pair .etboth{display:none}" +
    ".pb-pair .etbar{padding:10px 12px;gap:8px}.pb-pair .etbar h2{font-size:15px}.pb-pair .ettabs button{padding:6px 11px;font-size:12px}" +
    ".pb-pair .etbody.full .vb-main{padding:16px 14px 8px!important}.pb-pair .etbody.full .etlock,.pb-pair .etbody.full .affslot{margin-inline:14px!important}" +
    ".pb-pair .etbody.full .crest{width:62px;height:62px;font-size:22px}" +
    ".pb-pair .bdrow{grid-template-columns:minmax(0,1fr) 84px!important;gap:4px 10px!important;padding:6px 12px!important}" +
    ".pb-pair .bdrow .bdt{grid-column:2;grid-row:1;justify-self:end;padding:3px 10px;font-size:14px;width:auto}" +
    ".pb-pair .bdrow .bdc{grid-column:1;grid-row:1/3}.pb-pair .bdrow .bdpk{grid-column:2;grid-row:2}" +
    ".pb-pair .bdlg{justify-content:flex-start;margin-bottom:2px}" +
    ".pb-pair .pb-tight .bdrow{padding:4px 12px!important;gap:2px 10px!important}.pb-pair .pb-tight .ax{height:28px}.pb-pair .pb-tight .ax .lg{width:22px;height:22px}.pb-pair .pb-tight .bdrow .bdt{padding:2px 9px}" +
    ".pb-pair .pb-tighter .bdrow{padding:2px 10px!important}.pb-pair .pb-tighter .bdlg{display:none}.pb-pair .pb-tighter .ax{height:24px}.pb-pair .pb-tighter .bdm{font-size:13px}" +
    ".pb-pair .bdrow .affwrap,.pb-pair .bdrow.hasaff .affwrap{grid-column:1/-1;grid-row:3;justify-self:start}" +
    ".pb-pair .bdrow.hasaff{grid-template-columns:minmax(0,1fr) 84px!important}" +
    ".pb-cols{display:grid;grid-template-columns:minmax(0,1fr) 300px;column-gap:24px;align-items:start}" +
    ".pb-main{min-width:0}" +
    ".pb-rail{display:flex;flex-direction:column;gap:28px;padding-top:0;align-self:stretch}.pb-rail .pbad{position:relative}.pb-rail .pbad-lbl{position:absolute;top:-17px;left:0;right:0;margin:0}" +
    ".pb-rail .pb-d{position:sticky;top:84px}" +
        "}" +
    /* layout: tablet */
    "@media(min-width:768px) and (max-width:1099.98px){" +
    ".pb-inl{display:flex;flex-direction:column;align-items:center;gap:18px;margin:6px 0 22px}" +
        "}" +
    /* catfish */
    "@media(min-width:768px){" +
    ".pb-cf{display:block;position:fixed;left:0;right:0;bottom:0;z-index:9000;background:rgba(2,6,23,.96);border-top:1px solid #1E293B;padding:6px 0 calc(6px + env(safe-area-inset-bottom,0px));text-align:center}" +
    ".pb-cf[hidden]{display:none}" +
    "body.pb-cfon .tgbar{bottom:var(--cf-h,0px)!important}" +
    "body.pb-cfon .chatus{bottom:calc(var(--cf-h,0px) + var(--pb-tgh,0px) + 14px)!important}" +
    "body.pb-cfon .themebtn.float{bottom:calc(var(--cf-h,0px) + 16px)!important}" +
    "body.pb-cfon .chatus,body.pb-cfon .tgbar,body.pb-cfon .themebtn.float{transition:none!important}" +
    ".pb-cf .pbad{width:min(728px,calc(100vw - 56px));position:relative}" +
    ".pb-cf .pbad-ph{aspect-ratio:728/90;padding:4px;font-size:clamp(11px,2.2vw,18px);flex-direction:row;gap:12px}" +
    ".pb-cf .pbad-lbl{display:none}" +
    ".pb-cf .pb-x{position:absolute;right:-34px;top:50%;transform:translateY(-50%);width:28px;height:28px;border-radius:50%;border:1px solid #334155;background:#0F172A;color:#cbd5e1;font:400 18px/1 var(--body,sans-serif);cursor:pointer;padding:0}" +
    "html[data-theme=\"light\"] .pb-cf{background:rgba(243,245,249,.97);border-color:#CBD5E1}" +
    "body.pb-cfon{padding-bottom:var(--cf-h,100px)}" +
    "}";
  doc.head.appendChild(css);

  /* ---------- slot builder ---------- */
  function slot(key, extra) {
    var cfg = AD[key], s = SIZE[key], w = s[0], h = s[1], inner;
    if (cfg.img) {
      inner = '<a class="pbad-l" href="' + cfg.href + '" target="_blank" rel="sponsored noopener"><img src="' + cfg.img + '" alt="' + (cfg.alt || "Advertisement") + '" width="' + w + '" height="' + h + '" loading="lazy"></a>';
    } else {
      inner = '<div class="pbad-ph" style="aspect-ratio:' + w + "/" + h + '">Advertise Here!<small>' + w + " &times; " + h + '</small>' + (h >= 90 ? '<a href="' + BOOK + '">Book this slot</a>' : "") + "</div>";
    }
    var d = doc.createElement("div");
    d.className = "pbad " + (extra || "");
    d.style.width = w + "px";
    d.setAttribute("data-ad", key);
    d.innerHTML = '<span class="pbad-lbl">Advertisement</span>' + inner;
    return d;
  }


  /* ---------- VIP Tracker strip (replaces the in-feed banner, same thin height) ----------
     Reads the same published Gold results as the VIP Results strip (window.PB.home.vip.bronze).
     Each settled day is 1 unit staked at the listed odds: a win returns (odds - 1) units, a loss costs 1 unit.
     Return % = units won or lost divided by units staked. */
  function startTracker(box) {
    var MONS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var G = "#22c55e", R = "#ef4444", N = "#94A3B8";
    var pick = "month", lastSig = "", ptsData = null, sparkMeta = null;
    var tcss = doc.createElement("style");
    tcss.textContent =
      ".pbt{margin:14px 0 22px;border-radius:var(--r,10px);overflow:hidden;border:1px solid #1E293B;background:linear-gradient(100deg,#2a1647 0,#0F172A 34%,#0F172A 100%);color:#F8FAFC;position:relative}" +
      ".pbt[hidden]{display:none}" +
      ".pb-sep{height:1px;margin:0 16px;background:linear-gradient(90deg,transparent,#f59e0b88,transparent)}" +
      ".pbt.pbt-in{margin:0;border:0;border-radius:0;background:linear-gradient(100deg,#2a164777 0,transparent 40%)}" +
      ".pbt.pbt-in:before{display:none}" +
      ".pbt.pbt-in[hidden]+*,.pb-sep[hidden]{display:none}" +
      ".pbt:before{content:\"\";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--c,#22c55e)}" +
      ".pbt .t-row{display:flex;align-items:center;gap:0;min-height:112px;padding:0 6px 0 4px}" +
      ".pbt .t-id{flex:none;padding:0 16px 0 16px;display:grid;gap:8px}" +
      ".pbt .t-id h2{margin:0;font:700 15px/1 var(--display,sans-serif);letter-spacing:.06em;text-transform:uppercase;color:#fff;display:flex;align-items:center;gap:7px;white-space:nowrap}" +
      ".pbt .t-id h2 em{font:800 10px var(--body,sans-serif);font-style:normal;letter-spacing:.08em;color:#1a0f05;background:linear-gradient(135deg,#ffe08a,#e3a13a);border-radius:999px;padding:3px 9px;box-shadow:0 0 10px #f59e0b44}" +
      ".pbt .t-id h2 b{font:inherit;background:linear-gradient(180deg,#ffe08a,#f9a01b 55%,#c98a00);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent}" +
      ".pbt .t-tabs{display:inline-flex;background:#0b1326;border:1px solid #243049;border-radius:999px;padding:2px}" +
      ".pbt .t-tabs button{appearance:none;border:0;background:transparent;color:#94A3B8;font:700 11.5px var(--body,sans-serif);padding:5px 11px;border-radius:999px;cursor:pointer;letter-spacing:.02em;white-space:nowrap}" +
      ".pbt .t-tabs button[aria-pressed=\"true\"]{background:var(--c);color:#04130a}" +
      ".pbt .t-spark{flex:1 1 90px;min-width:70px;height:78px;position:relative;margin:0 16px;cursor:crosshair}" +
      ".pbt .t-spark svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}" +
      ".pbt .t-ln{stroke-dasharray:1;stroke-dashoffset:1;animation:pbtd 1s ease-out forwards}@keyframes pbtd{to{stroke-dashoffset:0}}" +
      ".pbt .t-dot{position:absolute;width:9px;height:9px;border-radius:50%;transform:translate(-50%,-50%);background:var(--c);box-shadow:0 0 0 3px color-mix(in srgb,var(--c) 30%,transparent),0 0 12px var(--c)}" +
      ".pbt .t-tip{position:absolute;pointer-events:none;transform:translate(-50%,-100%);background:#020617;border:1px solid var(--c);border-radius:8px;padding:5px 9px;font:600 11px/1.35 var(--body,sans-serif);color:#F8FAFC;white-space:nowrap;z-index:3;opacity:0;transition:opacity .12s}.pbt .t-tip b{font-weight:700;color:var(--c)}.pbt .t-spark:hover .t-tip,.pbt .t-spark.on .t-tip{opacity:1}.pbt .t-hv{position:absolute;width:9px;height:9px;border-radius:50%;transform:translate(-50%,-50%);background:#fff;border:2px solid var(--c);pointer-events:none;opacity:0}.pbt .t-spark:hover .t-hv,.pbt .t-spark.on .t-hv{opacity:1}.pbt .t-empty{font:500 12px var(--body,sans-serif);color:#94A3B8;display:flex;align-items:center;height:100%}" +
      ".pbt .t-c{flex:none;padding:0 14px;border-left:1px solid #1E293B;display:grid;gap:3px;align-content:center;min-width:64px}" +
      ".pbt .t-c i{font:600 10px var(--body,sans-serif);letter-spacing:.12em;text-transform:uppercase;color:#94A3B8;font-style:normal;white-space:nowrap}" +
      ".pbt .t-c b{font:700 24px/1 var(--display,sans-serif);font-variant-numeric:tabular-nums;white-space:nowrap}" +
      ".pbt .t-c b small{font:600 11px var(--body,sans-serif);color:#94A3B8;margin-left:2px}" +
      ".pbt .t-c.hero{background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--c) 12%,transparent));align-self:stretch;border-left-color:color-mix(in srgb,var(--c) 35%,#1E293B)}" +
      ".pbt .t-c.hero b{font-size:30px;color:var(--c)}" +
      ".pbt .t-info{position:absolute;right:8px;top:6px;font:600 11px var(--body,sans-serif);color:#64748b;cursor:help;border:1px solid #334155;border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center}" +
      "@media(max-width:1000px){.pbt .t-spark{display:none}.pbt .t-row{justify-content:space-between}.pbt .t-c.sm{display:none}}" +
      "@media(max-width:820px){.pbt .t-c b{font-size:20px}.pbt .t-c.hero b{font-size:24px}.pbt .t-c{padding:0 10px}.pbt .t-id{padding:0 12px}}" +
      "@media(prefers-reduced-motion:reduce){.pbt *{animation:none!important}.pbt .t-ln{stroke-dashoffset:0}}";
    doc.head.appendChild(tcss);

    function watToday() { return new Date(Date.now() + 3600000).toISOString().slice(0, 10); }
    function addDays(ymd, n) { var d = new Date(ymd + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
    function fx(n) { return Number(n).toFixed(2); }
    function sgn(n) { return (n > 0 ? "+" : n < 0 ? "−" : "") + fx(Math.abs(n)); }
    function col(n) { return n > 0 ? G : n < 0 ? R : N; }
    function pct(n) { return (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n).toFixed(1) + "%"; }

    function days() {
      var V = (window.PB && window.PB.home && window.PB.home.vip && window.PB.home.vip.bronze) || {}, out = [];
      Object.keys(V).sort().forEach(function (y) {
        var x = V[y], o = parseFloat(x && x.odds);
        if (x && (x.st === "won" || x.st === "lost") && o > 1) out.push({ y: y, won: x.st === "won", odds: o, u: x.st === "won" ? o - 1 : -1 });
      });
      return out;
    }
    function summarize(list) {
      var w = 0, l = 0, u = 0;
      list.forEach(function (d) { if (d.won) w++; else l++; u += d.u; });
      var n = w + l;
      return { n: n, w: w, l: l, u: u, rate: n ? w / n * 100 : 0, roi: n ? u / n * 100 : 0 };
    }

    function render() {
      var all = days(), today = watToday();
      if (!all.length) { box.hidden = true; if (box.pbSep) box.pbSep.hidden = true; return; }
      if (box.pbSep) box.pbSep.hidden = false;
      var t = today.split("-"), mStart = t[0] + "-" + t[1] + "-01";
      var dow = (new Date(today + "T12:00:00Z").getUTCDay() + 6) % 7, wStart = addDays(today, -dow), r30 = addDays(today, -29);
      var P = {
        week: { n: "Week", full: "this week (Monday to today)", list: all.filter(function (d) { return d.y >= wStart; }) },
        month: { n: "Month", full: MONS[+t[1] - 1] + " " + t[0], list: all.filter(function (d) { return d.y >= mStart; }) },
        d30: { n: "30 days", full: "the last 30 days", list: all.filter(function (d) { return d.y >= r30; }) }
      };
      var cur = P[pick], S = summarize(cur.list), c = S.n ? col(S.u) : N;
      box.style.setProperty("--c", c);

      var tabs = ["week", "month", "d30"].map(function (k) { return '<button type="button" data-k="' + k + '" aria-pressed="' + (k === pick) + '">' + P[k].n + "</button>"; }).join("");

      var spark;
      if (cur.list.length) {
        var cum = [0], run = 0; cur.list.forEach(function (d) { run += d.u; cum.push(run); }); ptsData = { list: cur.list, cum: cum };
        var mn = Math.min.apply(null, cum.concat(0)), mx = Math.max.apply(null, cum.concat(0)); if (mx === mn) { mx += 1; mn -= 1; }
        var pad = (mx - mn) * 0.15; mn -= pad; mx += pad;
        var W = 200, H = 56, X = function (i) { return i / (cum.length - 1) * W; }, Y = function (v) { return H - (v - mn) / (mx - mn) * H; };
        var line = "M" + cum.map(function (v, i) { return X(i).toFixed(1) + "," + Y(v).toFixed(1); }).join(" L"), area = line + " L" + W + "," + H + " L0," + H + " Z";
        spark = '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" role="img" aria-label="Units won or lost, ' + cur.full + '"><defs><linearGradient id="pbtG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c + '" stop-opacity=".4"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></linearGradient></defs>' +
          '<line x1="0" x2="' + W + '" y1="' + Y(0).toFixed(1) + '" y2="' + Y(0).toFixed(1) + '" stroke="#334155" stroke-dasharray="3 4" vector-effect="non-scaling-stroke"/>' +
          '<path d="' + area + '" fill="url(#pbtG)"/><path class="t-ln" pathLength="1" d="' + line + '" fill="none" stroke="' + c + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>' +
          '<span class="t-dot" style="left:100%;top:' + (Y(cum[cum.length - 1]) / H * 100).toFixed(1) + '%"></span><span class="t-hv"></span><span class="t-tip"></span>';
        sparkMeta = { mn: mn, mx: mx };
      } else spark = '<div class="t-empty">No settled bets yet</div>';

      var st = 0, sw = null; for (var i = all.length - 1; i >= 0; i--) { if (sw === null) sw = all[i].won; if (all[i].won === sw) st++; else break; }
      var streak = st > 1 ? (sw ? " 🔥" + st : "") : "";
      var arrow = S.n ? (S.u > 0 ? "▲ " : S.u < 0 ? "▼ " : "") : "";

      box.innerHTML = '<span class="t-info" title="1 unit is staked on each daily Gold package at the listed odds. A win returns the odds minus 1 in units, a loss costs 1 unit. Return % is units won or lost divided by units staked. Past results do not guarantee future results. 18+ only.">i</span>' +
        '<div class="t-row"><div class="t-id"><h2>📈 <span><b>VIP</b> Tracker</span> <em>GOLD</em></h2><div class="t-tabs" role="group" aria-label="Period">' + tabs + "</div></div>" +
        '<div class="t-spark">' + spark + "</div>" +
        '<div class="t-c hero"><i>' + (S.u >= 0 ? "Return" : "Return") + '</i><b>' + (S.n ? arrow + pct(S.roi) : "—") + "</b></div>" +
        '<div class="t-c"><i>Profit / loss</i><b style="color:' + c + '">' + (S.n ? sgn(S.u) : "—") + "<small>u</small></b></div>" +
        '<div class="t-c sm"><i>Settled bets</i><b>' + S.n + "</b></div>" +
        '<div class="t-c sm"><i>Won / Lost</i><b><span style="color:' + G + '">' + S.w + '</span><small>/</small><span style="color:' + (S.l ? R : N) + '">' + S.l + "</span></b></div>" +
        '<div class="t-c"><i>Win rate</i><b>' + (S.n ? Math.round(S.rate) + "%" : "—") + '<small>' + streak + "</small></b></div></div>";
      box.hidden = false;
    }

    function hover(e) {
      var sp = e.target.closest && e.target.closest(".t-spark"); if (!sp || !ptsData || !sparkMeta) return;
      var r = sp.getBoundingClientRect(), x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left, n = ptsData.cum.length;
      var i = Math.max(0, Math.min(n - 1, Math.round(x / r.width * (n - 1))));
      var v = ptsData.cum[i], top = (1 - (v - sparkMeta.mn) / (sparkMeta.mx - sparkMeta.mn)) * 100, left = i / (n - 1) * 100;
      var hv = sp.querySelector(".t-hv"), tip = sp.querySelector(".t-tip"); if (!hv || !tip) return;
      hv.style.left = left + "%"; hv.style.top = top + "%";
      var d = i ? ptsData.list[i - 1] : null, dt = d ? new Date(d.y + "T12:00:00Z").toUTCString().slice(5, 11) : "Start";
      tip.innerHTML = d ? dt + " · " + (d.won ? "Won" : "Lost") + " @ " + d.odds.toFixed(2) + "<br><b>" + sgn(v) + "u</b> running" : "Start · <b>0.00u</b>";
      tip.style.left = Math.max(60, Math.min(r.width - 60, left / 100 * r.width)) + "px"; tip.style.top = (top / 100 * r.height - 10) + "px";
    }
    box.addEventListener("mousemove", hover);
    box.addEventListener("touchmove", hover, { passive: true });
    box.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest(".t-tabs button"); if (!b) return;
      pick = b.getAttribute("data-k"); lastSig = ""; render();
    });
    function tick() {
      var V = (window.PB && window.PB.home && window.PB.home.vip && window.PB.home.vip.bronze) || {};
      var sig = Object.keys(V).map(function (k) { return k + (V[k] && V[k].st) + (V[k] && V[k].odds); }).join("|") + watToday() + pick;
      if (sig !== lastSig) { lastSig = sig; try { render(); } catch (err) { box.hidden = true; } }
    }
    tick(); setInterval(tick, 4000);
  }

  /* ---------- home page date strip: full width, last 7 days, plus the date picker and VIP button ---------- */
  function dateStrip() {
    var strip = doc.querySelector(".hero .hdates"); if (!strip || strip.getAttribute("data-d7")) return;
    var cal = strip.querySelector("[data-hcal]"), todayBtn = strip.querySelector('[data-hday="today"]');
    if (!cal || !todayBtn) return;
    strip.setAttribute("data-d7", "1");
    var DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], SHM = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var t0 = new Date(Date.now() + 3600000).toISOString().slice(0, 10);
    var anchor = cal.closest(".hcal") || cal, chips = [];
    for (var n = 6; n >= -1; n--) {
      (function (n) {
        var d = new Date(t0 + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - n);
        var y = d.toISOString().slice(0, 10), b = doc.createElement("button");
        b.type = "button"; b.className = "pb-d7"; b.setAttribute("data-d7", y); b.setAttribute("aria-pressed", "false");
        b.innerHTML = "<small>" + (n === 0 ? "Today" : n === -1 ? "Tomorrow" : DOW[d.getUTCDay()]) + "</small><b>" + d.getUTCDate() + " " + SHM[d.getUTCMonth()] + "</b>";
        b.title = DOW[d.getUTCDay()] + " " + d.getUTCDate() + " " + SHM[d.getUTCMonth()];
        b.addEventListener("click", function () {
          if (n === 0) { todayBtn.click(); return; }
          if (n === -1) { var tb = strip.querySelector('[data-hday="tomorrow"]'); if (tb) { tb.click(); return; } }
          cal.value = y; cal.dispatchEvent(new Event("change", { bubbles: true }));
        });
        strip.insertBefore(b, anchor); chips.push(b);
      })(n);
    }
    function paint(ymd) { chips.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-d7") === ymd)); }); }
    doc.addEventListener("pb:day", function (e) { paint(e.detail); });
    paint(window.__pbDay || t0);
  }

  
  /* line the top of the first ad box up with the top of the first content block */
  function alignRail() {
    var c = doc.querySelector(".pb-cols"); if (!c) return;
    var l = c.querySelector(".pb-main"), r = c.querySelector(".pb-rail"); if (!l || !r) return;
    var f = l.firstElementChild; if (!f) return;
    var off = Math.round(f.getBoundingClientRect().top - c.getBoundingClientRect().top);
    var v = Math.max(0, off) + "px"; if (r.style.paddingTop !== v) r.style.paddingTop = v;

  }
  var aq = 0;
  function queueAlign() { if (aq) return; aq = requestAnimationFrame(function () { aq = 0; alignRail(); }); }
  window.addEventListener("load", queueAlign); window.addEventListener("resize", queueAlign);
  window.addEventListener("orientationchange", queueAlign);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", queueAlign);
  doc.addEventListener("pb:day", function () { setTimeout(queueAlign, 50); setTimeout(queueAlign, 600); });
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(queueAlign);
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(queueAlign);
    var wire = function () { var c = doc.querySelector(".pb-cols"); if (!c) return; ro.observe(c); var m = c.querySelector(".pb-main"); if (m) { ro.observe(m); if (m.firstElementChild) ro.observe(m.firstElementChild); } };
    setTimeout(wire, 100); setTimeout(wire, 1500);
  }
  setInterval(alignRail, 1000); /* safety net: cheap, only writes when the value changed */
  setTimeout(alignRail, 100);
/* ---------- page structure ---------- */
  var built = false;
  function build() {
    if (built) return; built = true;
    var cols = doc.createElement("div"); cols.className = "pb-cols";
    var left = doc.createElement("div"); left.className = "pb-main";
    var rail = doc.createElement("aside"); rail.className = "pb-rail"; rail.setAttribute("aria-label", "Advertising");
    var inl = doc.createElement("div"); inl.className = "pb-inl"; inl.appendChild(slot("c")); inl.appendChild(slot("f"));
    function mount(anchor) { anchor.parentNode.insertBefore(cols, anchor); cols.appendChild(left); cols.appendChild(rail); }

    if (kind === "home") {
      var first = main.querySelector("[data-experttip]"), botd = main.querySelector("[data-botd]"), sure = main.querySelector("[data-sure]");
      if (!(first && botd && sure)) return;
      /* removed on desktop and tablet: the 728x90 in-feed banner and the two "Advertise Here" boxes under the predictions */
      var secs = main.querySelectorAll("section.sec");
      for (var i = 0; i < secs.length; i++) if (secs[i].querySelector(".adwide")) { secs[i].parentNode.removeChild(secs[i]); break; }
      var tail = main.parentNode.querySelectorAll(".ads");
      for (var j = 0; j < tail.length; j++) { var as = tail[j].closest("section"); if (as && as.parentNode) as.parentNode.removeChild(as); }
      var vipbox = main.querySelector("[data-vipbox]");
      mount(vipbox || first);
      /* Banker bet and Bets of the day side by side, the VIP tick boxes and tracker underneath */
      var pair = doc.createElement("div"); pair.className = "pb-pair";
      left.appendChild(pair); pair.appendChild(first); pair.appendChild(botd);
      if (vipbox) left.appendChild(vipbox);
      var trk = doc.createElement("section"); trk.className = "sec pbt"; trk.setAttribute("aria-label", "VIP tracker"); trk.hidden = true;
      /* one card: the tracker is docked inside the VIP results card, under a thin gold divider */
      var vcard = vipbox && vipbox.querySelector(".vipbox");
      if (vcard) { var sp = doc.createElement("div"); sp.className = "pb-sep"; trk.pbSep = sp; vcard.appendChild(sp); vcard.appendChild(trk); trk.className += " pbt-in"; }
      else left.appendChild(trk);
      startTracker(trk);
      left.appendChild(inl); left.appendChild(sure);
      /* on a wide screen the banker half shows ONE sport at a time: the visitor's own pick (saved sport), football by default */
      function single() {
        if (!window.matchMedia("(min-width:1100px)").matches) return true;
        var bd = first.querySelector("[data-etbody]"); if (!bd) return false;
        if (bd.classList.contains("full")) return true;
        var sp = "football"; try { if (localStorage.getItem("pb.sport") === "basketball") sp = "basketball"; } catch (_) {}
        var btn = first.querySelector('[data-et="' + sp + '"]'); if (btn) btn.click();
        return bd.classList.contains("full");
      }
      /* Bets of the day: up to 3 bets, always inside the height the banker bet needs (the banker is never stretched).
         Rows tighten first; a row is only hidden if three cannot fit. */
      function fitPair() {
        var list = botd.querySelector("[data-botdlist]"); if (!list) return;
        var rows = list.querySelectorAll(".bdrow"), k, wide = window.matchMedia("(min-width:1100px)").matches;
        first.style.height = ""; botd.style.height = ""; botd.classList.remove("pb-tight", "pb-tighter");
        for (k = 0; k < rows.length; k++) rows[k].classList.toggle("pb-hide", wide && k >= 3);
        if (!wide) return;
        var H = first.offsetHeight; if (!H) return;
        var steps = ["pb-tight", "pb-tighter"], si = 0, n = Math.min(rows.length, 3);
        while (botd.offsetHeight > H + 1) {
          if (si < steps.length) { botd.classList.add(steps[si++]); continue; }
          if (n > 1) { rows[--n].classList.add("pb-hide"); continue; }
          break;
        }
        botd.style.height = H + "px";
      }
      var fq = 0; function qfit() { if (fq) return; fq = requestAnimationFrame(function () { fq = 0; fitPair(); }); }
      if (window.ResizeObserver) new ResizeObserver(qfit).observe(first);
      var bl = botd.querySelector("[data-botdlist]"); if (bl && window.MutationObserver) new MutationObserver(qfit).observe(bl, { childList: true });
      window.addEventListener("resize", qfit); window.addEventListener("load", qfit); setInterval(qfit, 1500); qfit();
      var tries = 0, iv = setInterval(function () { tries++; if (single() || tries > 80) clearInterval(iv); }, 250);
      window.addEventListener("resize", function () { setTimeout(single, 80); });
      var props = main.querySelector("[data-props-wrap]"); if (props) left.appendChild(props);
    } else if (kind === "pred") {
      var big = main.querySelector("[data-bigtable]"); if (!big) return;
      mount(big);
      left.appendChild(big); left.appendChild(inl);
      var pw = main.querySelector("[data-props-wrap]"); if (pw) left.appendChild(pw);
    } else if (kind === "cat") {
      var cat = main.querySelector("[data-cat]"); if (!cat) return;
      mount(cat);
      left.appendChild(cat); left.appendChild(inl);
    } else if (kind === "hub") {
      var kids = Array.prototype.slice.call(main.children);
      var h2 = main.querySelector("h2");
      main.appendChild(cols); cols.appendChild(left); cols.appendChild(rail);
      kids.forEach(function (k) { if (k === h2) left.appendChild(inl); left.appendChild(k); });
      if (!inl.parentNode) left.appendChild(inl);
    }
    rail.appendChild(slot("c", "pb-c"));
    var dwrap = doc.createElement("div"); dwrap.className = "pb-d"; dwrap.appendChild(slot("d"));
    rail.appendChild(dwrap);
    if (kind === "home") dateStrip();
  }
  if (window.matchMedia("(min-width:768px)").matches) build();
  else { var mq = window.matchMedia("(min-width:768px)"), go = function () { if (mq.matches) build(); }; if (mq.addEventListener) mq.addEventListener("change", go); else mq.addListener(go); }

  /* ---------- catfish: fixed to the bottom of the screen ---------- */
  var closed = false; try { closed = sessionStorage.getItem("pb.cfClosed") === "1"; } catch (_) {}
  var cf = doc.createElement("div"); cf.className = "pb-cf"; cf.hidden = true; cf.setAttribute("aria-label", "Advertisement");
  var cfSlot = slot("catfish");
  cfSlot.style.width = ""; /* width comes from CSS so it scales with the screen */
  var x = doc.createElement("button"); x.type = "button"; x.className = "pb-x"; x.setAttribute("aria-label", "Close advertisement"); x.innerHTML = "&times;";
  cfSlot.appendChild(x); cf.appendChild(cfSlot); body.appendChild(cf);
  x.addEventListener("click", function () { closed = true; try { sessionStorage.setItem("pb.cfClosed", "1"); } catch (_) {} sync(); });

  function isWide() { return window.matchMedia ? window.matchMedia("(min-width:768px)").matches : window.innerWidth >= 768; }

  /* the cookie notice sits on top; show the catfish once it is dismissed. Chat, Telegram and theme buttons sit above the catfish. */
  function sync() {
    var cb = doc.getElementById("cookieBanner"), cookieUp = cb && !cb.classList.contains("hidden") && cb.offsetHeight > 0;
    var on = isWide() && !closed && !cookieUp;
    cf.hidden = !on;
    body.classList.toggle("pb-cfon", on);
    var h = on ? cf.offsetHeight : 0;
    doc.documentElement.style.setProperty("--cf-h", h + "px");
    var tg = doc.querySelector(".tgbar");
    var tgH = tg && tg.offsetHeight ? tg.offsetHeight + 8 : 0;
    /* positions come from CSS (pb-cfon rules), so the site's own 700ms layout timer cannot fight them */
    var rs = doc.documentElement.style;
    if (rs.getPropertyValue("--pb-tgh") !== tgH + "px") rs.setProperty("--pb-tgh", tgH + "px");
  }
  sync(); window.addEventListener("resize", sync); setInterval(sync, 700);
})();
