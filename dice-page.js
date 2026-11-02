/* PicksBible dice page. Two dice sit on the table. Tap them: they shake, land, and if there is a prize a gift box opens;
   if not, the player is asked to roll again. Every result is decided by the server (/api/dice). */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var pair = $("#dPair"); if (!pair || !window.PBDice) return;
  var wraps = [$("#dw0"), $("#dw1")];
  wraps[0].innerHTML = PBDice.cubeHTML("a"); wraps[1].innerHTML = PBDice.cubeHTML("b");
  var cubes = [wraps[0].firstChild, wraps[1].firstChild];
  PBDice.land(cubes[0], 5, 10); PBDice.land(cubes[1], 3, 10);   /* resting faces */
  var hint = $("#dHint"), res = $("#dRes"), acts = $("#dActs"), gift = $("#dGift");
  var user = null, busy = false, left = null, limit = 3, member = false, ready = false;
  var PRIZE = {
    jackpot: ["$1,000 JACKPOT!", "Double six! We will contact you to verify and pay."],
    vip7: ["1 WEEK FREE VIP", "Seven days of Gold VIP picks, on us."],
    vip1: ["A FREE VIP DAY", "A full day of Gold VIP picks, on us."]
  };
  var delay = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  /* a private id for this browser: lets the server count a visitor's 3 daily rolls */
  var gid = ""; try { gid = localStorage.getItem("pb.gid") || ""; } catch (_) {}
  if (!/^[a-z0-9]{12,40}$/.test(gid)) { gid = ""; for (var i = 0; i < 24; i++) gid += "abcdefghijklmnopqrstuvwxyz0123456789".charAt(Math.floor(Math.random() * 36)); try { localStorage.setItem("pb.gid", gid); } catch (_) {} }
  var claims = function () { try { return JSON.parse(localStorage.getItem("pb.claims") || "[]"); } catch (_) { return []; } };
  var saveClaims = function (a) { try { localStorage.setItem("pb.claims", JSON.stringify(a.slice(-10))); } catch (_) {} };

  firebase.initializeApp({ apiKey: "AIzaSyBBnSFHx_z1YWwOXz6sdKOSzelTIuvusa8", authDomain: "picksbible-7fa7f.firebaseapp.com", projectId: "picksbible-7fa7f", appId: "1:670341631512:web:7478818fbb53b5cec6fd6d" });
  var auth = firebase.auth();

  function api(action, extra) {
    var go = function (tok) {
      var h = { "Content-Type": "application/json" }; if (tok) h.Authorization = "Bearer " + tok;
      return fetch("/api/dice", { method: "POST", headers: h, body: JSON.stringify(Object.assign({ action: action, gid: gid }, extra || {})) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { s: r.status, j: j }; }); });
    };
    return user ? user.getIdToken().then(go) : go("");
  }
  function say(t, win) { res.textContent = t; res.className = "dres" + (win ? " win" : ""); }
  function counter() {
    var el = $("#dLeft"), big = $("#dBig"), nx = $("#dNext");
    if (left == null) return;
    el.textContent = left > 0 ? left + (left === 1 ? " spin" : " spins") + " left today" : "No spins left today";
    big.textContent = left + " / " + limit;
    nx.textContent = "Registered members get 6 spins a day. Everyone else gets 3.";
    $("#dStreakBox").style.display = member ? "" : "none";
  }
  function actions(extraHtml) {
    var h = extraHtml || "";
    if (left > 0) h += '<button type="button" class="dh-btn dbtn" id="dAgain">ROLL AGAIN</button>';
    else if (!member) h += '<a class="dcta" href="account.html#signup">Sign up free for 6 spins a day</a>';
    acts.innerHTML = h;
    var b = $("#dAgain"); if (b) b.onclick = roll;
    hint.style.display = "none";
    if (left <= 0) say(member ? "That is all 6 spins for today. Come back tomorrow!" : "You have used your 3 spins for today. Sign up free to get 6 spins a day!", false);
  }
  function resetTable() {
    gift.className = "dgift"; gift.innerHTML = ""; pair.classList.remove("away"); acts.innerHTML = ""; say("");
  }
  function confetti(box, n) {
    var cols = ["#3b82f6", "#f9a01b", "#7a4bb5", "#ffffff", "#93c5fd", "#e9d5ff"], h = "";
    for (var k = 0; k < n; k++) {
      var a = Math.random() * Math.PI * 2, d = 70 + Math.random() * 130;
      h += '<i class="cf" style="--c:' + cols[k % cols.length] + ";--dx:" + (Math.cos(a) * d).toFixed(0) + "px;--dy:" + (Math.sin(a) * d - 60).toFixed(0) + "px;--r:" + Math.floor(Math.random() * 720 - 360) + 'deg;animation-delay:' + (Math.random() * 0.15).toFixed(2) + 's"></i>';
    }
    box.insertAdjacentHTML("beforeend", h);
  }
  function giftBox(j) {
    var p = PRIZE[j.prize] || [String(j.prizeName || "A PRIZE").toUpperCase(), ""];
    pair.classList.add("away");
    gift.innerHTML = '<div class="gprize"><small>YOU WON</small><b>' + p[0] + "</b><span>" + p[1] + '</span></div>' +
      '<div class="gb"><div class="gb-beam"></div><div class="gb-body"><i class="rib"></i></div><div class="gb-lid"><i class="rib"></i><i class="bow"></i></div></div>';
    gift.className = "dgift on";
    var box = gift.querySelector(".gb");
    setTimeout(function () { box.classList.add("wig"); }, 850);
    setTimeout(function () { box.classList.remove("wig"); box.classList.add("open"); gift.classList.add("show"); confetti(gift, j.prize === "jackpot" ? 70 : 34); }, 1550);
    return delay(2300);
  }
  function won(j) {
    return giftBox(j).then(function () {
      var note;
      if (member) note = "Added to your Notifications. Our team credits it within 24 hours.";
      else note = "Create your free account on this device to claim it.";
      actions(member || left <= 0 ? "" : '<a class="dcta" href="account.html#signup">Sign up free to claim</a> ');
      say(note + (left <= 0 && member ? " That was your last spin today." : "") , true);
    });
  }
  function missed() {
    say(left > 0 ? "No gift this time. Roll again!" : "No gift this time.", false);
    actions();
  }

  function roll() {
    if (busy || !ready) return;
    if (left != null && left <= 0) { actions(); return; }
    busy = true; resetTable(); hint.style.display = "none";
    say("Shaking...");
    wraps.forEach(function (w) { w.classList.remove("shake"); void w.offsetWidth; w.classList.add("shake"); });
    cubes.forEach(function (c) { c.classList.add("rattle"); });
    Promise.all([api("roll"), delay(1000)]).then(function (a) {
      var o = a[0];
      wraps.forEach(function (w) { w.classList.remove("shake"); });
      cubes.forEach(function (c) { c.classList.remove("rattle"); });
      if (o.s === 503) { say("The dice open very soon. Check back shortly!"); ready = false; busy = false; return; }
      if (o.s === 429 || o.s === 409) { left = 0; counter(); busy = false; actions(); return; }
      if (o.s === 401) { say("Please log in again, then tap the dice."); busy = false; return; }
      if (o.s !== 200) { say("Something went wrong. Tap the dice to try again."); busy = false; hint.style.display = ""; return; }
      var j = o.j;
      PBDice.land(cubes[0], j.d1, 1500); PBDice.land(cubes[1], j.d2, 1850);
      say("");
      return delay(2150).then(function () {
        left = j.left; limit = j.limit; member = !!j.member; counter();
        if (member && j.streak) $("#dStreak").textContent = j.streak + (j.streak === 1 ? " day" : " days");
        if (j.prize) {
          if (!member && j.claim) { var c = claims(); c.push(j.claim); saveClaims(c); }
          return won(j);
        }
        missed();
      }).then(function () { busy = false; });
    }).catch(function () { wraps.forEach(function (w) { w.classList.remove("shake"); }); cubes.forEach(function (c) { c.classList.remove("rattle"); }); say("Something went wrong. Tap the dice to try again."); busy = false; hint.style.display = ""; });
  }
  pair.addEventListener("click", roll);
  pair.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); roll(); } });

  function status() {
    api("status").then(function (o) {
      if (o.s === 503) { $("#dLeft").textContent = "Opening very soon"; say("The dice open very soon. Check back shortly!"); hint.style.display = "none"; return; }
      if (o.s !== 200) { $("#dLeft").textContent = "Tap the dice to spin"; ready = true; return; }
      var j = o.j; left = j.left; limit = j.limit; member = !!j.member; ready = true; counter();
      if (member) $("#dStreak").textContent = (j.streak || 0) + (j.streak === 1 ? " day" : " days");
      if (j.d1) { PBDice.land(cubes[0], j.d1, 10); PBDice.land(cubes[1], j.d2, 10); }
      if (left <= 0) { hint.style.display = "none"; actions(); }
      /* a prize won as a visitor is attached to the account once the person has signed up */
      var c = claims();
      if (member && c.length) api("claim", { codes: c }).then(function (r) {
        if (r.s === 200) { saveClaims([]); if (r.j.claimed && r.j.claimed.length) { say("Your earlier win was added to your account: " + r.j.claimed.join(", ") + ".", true); } }
      });
    }).catch(function () { ready = true; $("#dLeft").textContent = "Tap the dice to roll"; });
  }
  auth.onAuthStateChanged(function (u) { user = u; ready = false; left = null; resetTable(); hint.style.display = ""; status(); });
})();
