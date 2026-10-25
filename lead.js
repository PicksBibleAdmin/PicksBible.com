/* PicksBible email capture popup. Shows once to new visitors and once when a desktop visitor moves to leave.
   Saves the email to the Firestore "leads" collection (create only; only the admin can read it). */
(function () {
  "use strict";
  var P = location.pathname;
  if (/vip|account|checkout|usdt-payment|admin/.test(P)) return;
  var KEY = "pb.lead", DIS = "pb.leadDismissed";
  function get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
  if (get(KEY)) return;
  var shown = false, exitShown = false;
  var API = "AIzaSyBBnSFHx_z1YWwOXz6sdKOSzelTIuvusa8";
  var URL_ = "https://firestore.googleapis.com/v1/projects/picksbible-7fa7f/databases/(default)/documents/leads";

  var css = document.createElement("style");
  css.textContent = "#pbLead{position:fixed;inset:0;z-index:9999;background:rgba(40,44,52,.55);display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto}#pbLead[hidden]{display:none}" +
    "#pbLead .lb{position:relative;width:min(560px,100%);background:#fff;color:#1a1a1a;border-radius:24px;padding:48px 36px 30px;box-shadow:0 20px 60px rgba(0,0,0,.35);font-family:inherit;overflow:hidden}" +
    "#pbLead .bar{position:absolute;left:0;top:0;height:8px;width:38%;background:#5b4ee0;border-radius:0 8px 8px 0}" +
    "#pbLead .lx{position:absolute;right:10px;top:14px;width:26px;height:26px;background:none;border:0;color:#8a8a93;font-size:20px;cursor:pointer;line-height:24px;padding:0;border-radius:50%}#pbLead .lx:hover{background:#eee;color:#333}" +
    "#pbLead .logo{display:block;margin:0 auto 10px;height:44px;width:auto}" +
    "#pbLead h2{margin:0 0 26px;text-align:center;font-size:32px;line-height:1.15;color:#111;font-weight:700}" +
    "#pbLead .g{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}@media(max-width:480px){#pbLead .g{grid-template-columns:1fr}#pbLead .lb{padding:44px 20px 24px}#pbLead h2{font-size:26px}}" +
    "#pbLead label{display:block;font-size:17px;font-weight:700;margin:0 0 8px;color:#111}#pbLead label i{color:#e11d48;font-style:normal}#pbLead label em{font-style:normal;font-weight:400;color:#777;font-size:15px}" +
    "#pbLead input{width:100%;padding:15px 18px;border-radius:999px;border:1px solid #d6d6dc;background:#fff;color:#111;font:inherit;font-size:17px}#pbLead input:focus{outline:2px solid #5b4ee0;outline-offset:1px}" +
    "#pbLead .fw{margin-bottom:16px}#pbLead hr{border:0;border-top:1px solid #e3e3e8;margin:22px 0 18px}" +
    "#pbLead .tx{margin:0;color:#222;font-size:17px;line-height:1.5}" +
    "#pbLead .ft{display:flex;justify-content:flex-end;margin-top:22px}" +
    "#pbLead button.lg{padding:16px 30px;border:0;border-radius:999px;background:#16a34a;color:#fff;font-weight:700;font-size:18px;font-family:inherit;cursor:pointer}#pbLead button.lg:hover{background:#15803d}#pbLead button.lg[disabled]{opacity:.6}" +
    "#pbLead .lm{margin:12px 0 0;font-size:15px;min-height:18px;text-align:right}#pbLead .lm.e{color:#d93025}#pbLead .lm.o{color:#188038}";
  document.head.appendChild(css);

  var el = document.createElement("div");
  el.id = "pbLead"; el.hidden = true;
  el.innerHTML = '<div class="lb" role="dialog" aria-modal="true" aria-label="Hello! Nice to meet you"><div class="bar"></div><button class="lx" type="button" aria-label="Close">&times;</button>' +
    '<img class="logo" src="img/pb-logo.png" alt="PicksBible" width="61" height="44">' +
    '<h2>Hello! Nice to meet you</h2>' +
    '<form novalidate><div class="g"><div><label for="pbF">First name <i>*</i></label><input id="pbF" name="f" autocomplete="given-name" maxlength="50"></div>' +
    '<div><label for="pbL">Last name <i>*</i></label><input id="pbL" name="l" autocomplete="family-name" maxlength="50"></div></div>' +
    '<div class="fw"><label for="pbE">Email <i>*</i></label><input id="pbE" name="e" type="email" autocomplete="email"></div>' +
    '<div class="fw"><label for="pbW">WhatsApp number <em>(optional)</em></label><input id="pbW" name="w" type="tel" autocomplete="tel" placeholder="+234 801 234 5678" maxlength="20"></div>' +
    '<hr><p class="tx">Be the first to know when winning tips are published.</p>' +
    '<div class="ft"><button class="lg" type="submit">Create your PicksBible account</button></div><div class="lm" role="status"></div></form></div>';
  document.body.appendChild(el);
  var msg = el.querySelector(".lm"), form = el.querySelector("form");

  function open(why) {
    if (get(KEY)) return;
    el.hidden = false; el.dataset.why = why;
    setTimeout(function () { var i = el.querySelector("#pbF"); i && i.focus && i.focus({ preventScroll: true }); }, 50);
  }
  function close() { el.hidden = true; if (!get(KEY)) set(DIS, String(Date.now())); }
  el.querySelector(".lx").onclick = close;
  el.addEventListener("click", function (e) { if (e.target === el) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !el.hidden) close(); });

  form.onsubmit = function (e) {
    e.preventDefault();
    var fn = form.f.value.trim(), ln = form.l.value.trim(), em = form.e.value.trim().toLowerCase(), wa = form.w.value.trim();
    var bad = function (t) { msg.className = "lm e"; msg.textContent = t; };
    if (!fn || !ln) return bad("Please enter your first and last name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) return bad("Enter a valid email address.");
    if (wa && !/^\+?[0-9 ()-]{7,20}$/.test(wa)) return bad("Enter a valid WhatsApp number or leave it empty.");
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

  var touch = false; try { touch = window.matchMedia("(pointer:coarse)").matches; } catch (_) {}
  var dis = +get(DIS) || 0, quiet = dis && Date.now() - dis < 7 * 864e5;
  /* 1) new visitor. Desktop: after 6 seconds. Phones: only after they have scrolled a bit or stayed 20 seconds
        (a popup the instant a phone visitor lands from Google can hurt search rankings) */
  function first() { if (!shown && el.hidden && !quiet) { shown = true; open("popup"); } }
  if (!touch) setTimeout(first, 6000);
  else {
    setTimeout(first, 20000);
    window.addEventListener("scroll", function onS() {
      var h = document.documentElement; if ((window.scrollY + window.innerHeight) / h.scrollHeight > 0.35) { window.removeEventListener("scroll", onS); first(); }
    }, { passive: true });
  }
  /* 2) leaving. Desktop: the mouse leaves through the top of the window. Phones: a quick scroll back up towards the address bar */
  function leave() {
    if (exitShown || !el.hidden) return;
    var d = +get(DIS) || 0; if (d && Date.now() - d < 864e5) return;
    exitShown = true; open("exit");
  }
  document.addEventListener("mouseout", function (e) { if (!e.relatedTarget && e.clientY <= 8) leave(); });
  if (touch) {
    var lastY = window.scrollY, lastT = Date.now(), maxY = 0;
    window.addEventListener("scroll", function () {
      var y = window.scrollY, t = Date.now(); maxY = Math.max(maxY, y);
      if (maxY > window.innerHeight * 0.8 && lastY - y > window.innerHeight * 0.45 && t - lastT < 450 && y < maxY * 0.6) leave();
      if (t - lastT > 450) { lastT = t; lastY = y; }
    }, { passive: true });
  }
})();
