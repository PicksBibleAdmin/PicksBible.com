/* PicksBible email capture popup. Only for visitors who never signed up, only after 10 seconds on the page (see the rules below).
   Saves the email to the Firestore "leads" collection (create only; only the admin can read it). */
(function () {
  "use strict";
  var P = location.pathname;
  if (/vip|account|checkout|usdt-payment|admin/.test(P)) return;
  var KEY = "pb.lead", DIS = "pb.leadDismissed";
  function get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
  if (get(KEY) || get("pb.member") === "1") return;
  var shown = false, exitShown = false, lastTouch = 0, leaving = false;
  var coarse = false; try { coarse = window.matchMedia("(pointer:coarse)").matches; } catch (_) {}
  var fine = false; try { fine = window.matchMedia("(hover:hover) and (pointer:fine)").matches; } catch (_) {}
  var API = "AIzaSyBBnSFHx_z1YWwOXz6sdKOSzelTIuvusa8";
  var URL_ = "https://firestore.googleapis.com/v1/projects/picksbible-7fa7f/databases/(default)/documents/leads";

  var css = document.createElement("style");
  css.textContent = "#pbLead{position:fixed;inset:0;z-index:9999;background:rgba(40,44,52,.55);display:flex;padding:16px;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}#pbLead[hidden]{display:none}" +
    "#pbLead .lb{position:relative;margin:auto;width:min(560px,100%);background:#fff;color:#1a1a1a;border-radius:24px;padding:48px 36px 30px;box-shadow:0 20px 60px rgba(0,0,0,.35);font-family:inherit}" +
    "#pbLead .lb{overflow:hidden}#pbLead .bar{position:absolute;left:0;top:0;height:8px;width:38%;background:#5b4ee0;border-radius:0 8px 8px 0}" +
    "#pbLead .lx{position:absolute;right:6px;top:8px;width:44px;height:44px;background:none;border:0;color:#6b6b75;font-size:28px;cursor:pointer;line-height:44px;padding:0;border-radius:50%;z-index:2}#pbLead .lx:hover{background:#eee;color:#333}" +
    "#pbLead .logo{display:block;margin:0 auto 10px;height:44px;width:auto}" +
    "#pbLead h2{margin:0 0 26px;text-align:center;font-size:32px;line-height:1.15;color:#111;font-weight:700}" +
    "#pbLead .g{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}@media(max-width:480px){#pbLead .g{grid-template-columns:1fr}#pbLead .lb{padding:44px 20px 24px}#pbLead h2{font-size:26px}}" +
    "#pbLead label{display:block;font-size:17px;font-weight:700;margin:0 0 8px;color:#111}#pbLead label i{color:#e11d48;font-style:normal}#pbLead label em{font-style:normal;font-weight:400;color:#777;font-size:15px}" +
    "#pbLead input{width:100%;padding:15px 18px;border-radius:999px;border:1px solid #d6d6dc;background:#fff;color:#111;font:inherit;font-size:17px}#pbLead input:focus{outline:2px solid #5b4ee0;outline-offset:1px}" +
    "#pbLead .pw{display:flex;gap:8px}#pbLead .pw select{flex:0 0 42%;min-width:0;padding:15px 12px;border-radius:999px;border:1px solid #d6d6dc;background:#fff;color:#111;font:inherit;font-size:16px;text-overflow:ellipsis}#pbLead .pw select:focus{outline:2px solid #5b4ee0;outline-offset:1px}#pbLead .pw input{flex:1;min-width:0}" +
    "#pbLead .fw{margin-bottom:16px}#pbLead hr{border:0;border-top:1px solid #e3e3e8;margin:22px 0 18px}" +
    "#pbLead .tx{margin:0;color:#222;font-size:17px;line-height:1.5}" +
    "#pbLead .ft{display:flex;justify-content:flex-end;margin-top:22px}" +
    "#pbLead button.lg{padding:16px 30px;border:0;border-radius:999px;background:#16a34a;color:#fff;font-weight:700;font-size:18px;font-family:inherit;cursor:pointer}#pbLead button.lg:hover{background:#15803d}#pbLead button.lg[disabled]{opacity:.6}" +
    "#pbLead .lm{margin:12px 0 0;font-size:15px;min-height:18px;text-align:right}#pbLead .lm.e{color:#d93025}#pbLead .lm.o{color:#188038}" +
    "@media(max-width:480px),(max-height:700px){#pbLead{padding:10px}#pbLead .lb{padding:40px 16px 16px;border-radius:18px}#pbLead .logo{height:32px;margin-bottom:6px}#pbLead h2{font-size:22px;margin-bottom:14px}#pbLead .g{gap:10px;margin-bottom:10px}#pbLead label{font-size:15px;margin-bottom:5px}#pbLead input{padding:11px 14px;font-size:16px}#pbLead .fw{margin-bottom:10px}#pbLead hr{margin:12px 0 10px}#pbLead .tx{font-size:15px}#pbLead .ft{margin-top:12px}#pbLead button.lg{width:100%;padding:14px 16px;font-size:16px}#pbLead .lm{margin-top:8px;font-size:14px}}" +
    "@media(max-height:480px){#pbLead .logo,#pbLead .tx,#pbLead hr{display:none}#pbLead .lb{padding-top:34px}}";
  document.head.appendChild(css);

  var el = document.createElement("div");
  el.id = "pbLead"; el.hidden = true;
  el.innerHTML = '<div class="lb" role="dialog" aria-modal="true" aria-label="Hello! Nice to meet you"><div class="bar"></div><button class="lx" type="button" aria-label="Close">&times;</button>' +
    '<img class="logo" src="img/pb-logo.png" alt="PicksBible" width="61" height="44">' +
    '<h2>Hello! Nice to meet you</h2>' +
    '<form novalidate><div class="g"><div><label for="pbF">First name <i>*</i></label><input id="pbF" name="f" autocomplete="given-name" maxlength="50"></div>' +
    '<div><label for="pbL">Last name <i>*</i></label><input id="pbL" name="l" autocomplete="family-name" maxlength="50"></div></div>' +
    '<div class="fw"><label for="pbE">Email <i>*</i></label><input id="pbE" name="e" type="email" autocomplete="email"></div>' +
    '<div class="fw"><label for="pbW">WhatsApp number <em>(optional)</em></label><div class="pw"><select id="pbC" name="c" aria-label="Country code"></select><input id="pbW" name="w" type="tel" autocomplete="tel-national" inputmode="tel" placeholder="801 234 5678" maxlength="16"></div></div>' +
    '<hr><p class="tx">Be the first to know when winning tips are published.</p>' +
    '<div class="ft"><button class="lg" type="submit">Create your PicksBible account</button></div><div class="lm" role="status"></div></form></div>';
  document.body.appendChild(el);
  var msg = el.querySelector(".lm"), form = el.querySelector("form");
  /* country code picker: [name, ISO, dialling code]. Default comes from the visitor's language/time zone, else Nigeria. */
  var CC = [["Nigeria","NG","234"],["Ghana","GH","233"],["Kenya","KE","254"],["South Africa","ZA","27"],["Uganda","UG","256"],["Tanzania","TZ","255"],["Cameroon","CM","237"],["Ivory Coast","CI","225"],["Senegal","SN","221"],["Ethiopia","ET","251"],["Zambia","ZM","260"],["Zimbabwe","ZW","263"],["Rwanda","RW","250"],["Egypt","EG","20"],["Morocco","MA","212"],["Algeria","DZ","213"],["Tunisia","TN","216"],["Sierra Leone","SL","232"],["Liberia","LR","231"],["Gambia","GM","220"],["Benin","BJ","229"],["Togo","TG","228"],["Botswana","BW","267"],["Namibia","NA","264"],["Malawi","MW","265"],["Mozambique","MZ","258"],["Angola","AO","244"],["DR Congo","CD","243"],["United Kingdom","GB","44"],["Ireland","IE","353"],["United States","US","1"],["Canada","CA","1"],["Australia","AU","61"],["New Zealand","NZ","64"],["Germany","DE","49"],["France","FR","33"],["Spain","ES","34"],["Italy","IT","39"],["Portugal","PT","351"],["Netherlands","NL","31"],["Belgium","BE","32"],["Switzerland","CH","41"],["Sweden","SE","46"],["Norway","NO","47"],["Denmark","DK","45"],["Finland","FI","358"],["Poland","PL","48"],["Turkey","TR","90"],["Greece","GR","30"],["Russia","RU","7"],["Ukraine","UA","380"],["India","IN","91"],["Pakistan","PK","92"],["Bangladesh","BD","880"],["Sri Lanka","LK","94"],["Indonesia","ID","62"],["Malaysia","MY","60"],["Singapore","SG","65"],["Philippines","PH","63"],["Thailand","TH","66"],["Vietnam","VN","84"],["China","CN","86"],["Japan","JP","81"],["South Korea","KR","82"],["United Arab Emirates","AE","971"],["Saudi Arabia","SA","966"],["Qatar","QA","974"],["Kuwait","KW","965"],["Israel","IL","972"],["Brazil","BR","55"],["Mexico","MX","52"],["Argentina","AR","54"],["Colombia","CO","57"],["Chile","CL","56"],["Jamaica","JM","1876"],["Trinidad and Tobago","TT","1868"]], sel = el.querySelector("#pbC"), guess = "NG";
  try { var rg = ((navigator.language || "").split("-")[1] || "").toUpperCase(); if (rg && CC.some(function (x) { return x[1] === rg; })) guess = rg; } catch (_) {}
  CC.forEach(function (x) { var o = document.createElement("option"); o.value = x[1]; o.textContent = x[0] + " +" + x[2]; sel.appendChild(o); });
  sel.value = guess;
  var dial = function () { for (var i = 0; i < CC.length; i++) if (CC[i][1] === sel.value) return CC[i][2]; return "234"; };

  function open(why) {
    if (get(KEY)) return;
    el.hidden = false; el.dataset.why = why;
    if (!coarse) setTimeout(function () { var i = el.querySelector("#pbF"); i && i.focus && i.focus({ preventScroll: true }); }, 50); /* on phones the keyboard would hide the form */
  }
  function close() { el.hidden = true; if (!get(KEY)) set(DIS, String(Date.now())); }
  el.querySelector(".lx").onclick = close;
  el.addEventListener("click", function (e) { if (e.target === el) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !el.hidden) close(); });

  form.onsubmit = function (e) {
    e.preventDefault();
    var q = function (i) { return el.querySelector("#" + i).value.trim(); };
    var fn = q("pbF"), ln = q("pbL"), em = q("pbE").toLowerCase(), wa = q("pbW");
    var bad = function (t) { msg.className = "lm e"; msg.textContent = t; };
    if (!fn || !ln) return bad("Please enter your first and last name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) return bad("Enter a valid email address.");
    if (wa) {
      var plus = wa.charAt(0) === "+", dg = wa.replace(/\D/g, "");
      if (!plus) dg = dial() + dg.replace(/^0+/, "");
      if (!/^[0-9]{8,15}$/.test(dg)) return bad("Enter a valid WhatsApp number (without the country code) or leave it empty.");
      wa = "+" + dg;
    }
    var btn = form.querySelector(".lg"); btn.disabled = true; msg.className = "lm"; msg.textContent = "Saving...";
    var body = { fields: {
      email: { stringValue: em }, firstName: { stringValue: fn }, lastName: { stringValue: ln }, whatsapp: { stringValue: wa }, page: { stringValue: P.slice(0, 80) },
      source: { stringValue: el.dataset.why || "popup" }, createdAt: { stringValue: new Date().toISOString() } } };
    fetch(URL_ + "?documentId=" + encodeURIComponent(em) + "&key=" + API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) {
        /* 403/409 = this email is already on the list: treat as success */
        if (r.ok || r.status === 403 || r.status === 409) return true;
        throw new Error("status " + r.status);
      })
      .then(function () {
        set(KEY, "1"); msg.className = "lm o"; msg.textContent = "Great! One last step: create your password to finish your free account.";
        try { sessionStorage.setItem("pb.prefill", JSON.stringify({ n: fn + " " + ln, e: em, w: wa })); } catch (_) {}
        try { if (window.gtag) gtag("event", "generate_lead", { method: el.dataset.why || "popup" }); } catch (_) {}
        setTimeout(function () { location.href = "account.html#signup"; }, 1200);
      })
      .catch(function () { btn.disabled = false; msg.className = "lm e"; msg.textContent = "Could not save right now. Please try again."; });
  };

  /* WHO sees it: only visitors who have never signed up (no saved sign-up, not a logged-in member) and who are not in the 7-day quiet period after closing it.
     WHEN: after the visitor has really been on the page for more than 10 seconds (time with the tab in the background does not count),
     the same on phones and desktops. Repeat visitors who still have not signed up also get it when they move to leave, even before 10 seconds,
     because they already know the site. A first-time visitor who leaves in under 10 seconds is never interrupted. */
  var visits = +get("pb.visits") || 0;
  try { if (!sessionStorage.getItem("pb.vs")) { visits++; set("pb.visits", String(visits)); sessionStorage.setItem("pb.vs", "1"); } } catch (_) {}
  var repeat = visits > 1;
  var dis = +get(DIS) || 0, quiet = dis && Date.now() - dis < 7 * 864e5;
  var active = 0, lastTick = Date.now();
  function first() { if (!shown && el.hidden && !quiet && !get(KEY)) { shown = true; open("popup"); } }
  var ticker = setInterval(function () {
    var n = Date.now(), dt = n - lastTick; lastTick = n;
    if (document.visibilityState === "visible" && dt < 2000) active += dt;
    if (active > 10000) { clearInterval(ticker); first(); }
  }, 500);
  /* leaving. Desktop: the mouse leaves through the top of the window. Phones: a quick scroll back up towards the address bar */
  function leave() {
    if (leaving || Date.now() - lastTouch < 1500) return; /* a tap on a link or menu is not a visitor leaving */
    if (exitShown || !el.hidden || quiet || get(KEY)) return;
    if (!(active > 10000 || repeat)) return;
    var d = +get(DIS) || 0; if (d && Date.now() - d < 864e5) return;
    exitShown = true; open("exit");
  }
  ["touchstart", "pointerdown", "click"].forEach(function (t) { document.addEventListener(t, function () { lastTouch = Date.now(); }, { passive: true, capture: true }); });
  ["pagehide", "beforeunload"].forEach(function (t) { window.addEventListener(t, function () { leaving = true; }); });
  /* mouse exit-intent only on real mouse devices: phones fire fake mouse events when you tap, which opened the popup on every page change */
  if (fine) document.addEventListener("mouseout", function (e) { if (!e.relatedTarget && e.clientY <= 8) leave(); });
  var touch = coarse;
  if (touch) {
    var lastY = window.scrollY, lastT = Date.now(), maxY = 0;
    window.addEventListener("scroll", function () {
      var y = window.scrollY, t = Date.now(); maxY = Math.max(maxY, y);
      if (maxY > window.innerHeight * 0.8 && lastY - y > window.innerHeight * 0.45 && t - lastT < 450 && y < maxY * 0.6) leave();
      if (t - lastT > 450) { lastT = t; lastY = y; }
    }, { passive: true });
  }
})();
