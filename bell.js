/* PicksBible: notification bell for logged-in members, on every page.
   Costs nothing for ordinary visitors: it does nothing unless the visitor logged in on account.html before. */
(function () {
  "use strict";
  var ok = false; try { ok = localStorage.getItem("pb.member") === "1"; } catch (_) {}
  if (!ok || /admin|account\.html|unsubscribe/.test(location.pathname)) return;
  var V = "10.14.1", B = "https://www.gstatic.com/firebasejs/" + V + "/firebase-";
  function load(src) { return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  load(B + "app-compat.js").then(function () { return load(B + "auth-compat.js"); }).then(function () { return load(B + "firestore-compat.js"); }).then(start).catch(function () {});

  function start() {
    firebase.initializeApp({ apiKey: "AIzaSyBBnSFHx_z1YWwOXz6sdKOSzelTIuvusa8", authDomain: "picksbible-7fa7f.firebaseapp.com", projectId: "picksbible-7fa7f", appId: "1:670341631512:web:7478818fbb53b5cec6fd6d" });
    var auth = firebase.auth(), fs = firebase.firestore(), un = [];
    auth.onAuthStateChanged(function (user) {
      un.forEach(function (u) { u(); }); un = [];
      var old = document.getElementById("pbBell"); if (old) old.remove();
      if (!user) { try { localStorage.removeItem("pb.member"); } catch (_) {} return; }
      un.push(fs.collection("users").doc(user.uid).onSnapshot(function (d) {
        var u = d.exists ? d.data() : { tier: "free" };
        var paid = (u.tier === "gold" || u.tier === "titanium") && u.paidUntil && u.paidUntil >= new Date().toISOString().slice(0, 10);
        watch(user, paid ? u.tier : "free");
      }, function () {}));
    });
    var inner = [];
    function watch(user, tier) {
      inner.forEach(function (u) { u(); }); inner = [];
      var bc = [], nt = [];
      mount();
      function draw() {
        var a = bc.concat(nt).sort(function (x, y) { return String(y.createdAt).localeCompare(String(x.createdAt)); }).slice(0, 8);
        var seen = 0; try { seen = +localStorage.getItem("pb.noteSeen") || 0; } catch (_) {}
        var fresh = a.filter(function (n) { return Date.parse(n.createdAt) > seen; }).length;
        var b = document.getElementById("pbBellN"); b.hidden = !fresh; b.textContent = fresh;
        document.getElementById("pbBellList").innerHTML = a.length ? a.map(function (n) { return '<div class="n"><b>' + esc(n.title) + '</b><br>' + esc(n.body) + '<small>' + esc(String(n.createdAt).slice(0, 16).replace("T", " ")) + ' UTC</small></div>'; }).join("") : '<div class="n">No messages yet.</div>';
        document.getElementById("pbBell").dataset.latest = a.length ? String(Date.parse(a[0].createdAt)) : "0";
      }
      inner.push(fs.collection("broadcasts").where("audience", "array-contains", tier).onSnapshot(function (s) { bc = []; s.forEach(function (d) { bc.push(d.data()); }); draw(); }, function () {}));
      inner.push(fs.collection("notes").where("to", "==", user.uid).onSnapshot(function (s) { nt = []; s.forEach(function (d) { nt.push(d.data()); }); draw(); }, function () {}));
    }
    function mount() {
      if (document.getElementById("pbBell")) return;
      var css = document.createElement("style");
      css.textContent = "#pbBell{position:relative;margin-left:10px;display:inline-flex;align-items:center}#pbBell>button{background:none;border:0;cursor:pointer;color:#f5b301;font-size:22px;line-height:1;padding:6px;position:relative;filter:drop-shadow(0 0 6px #f5b30166)}" +
        "#pbBellN{position:absolute;top:0;right:-2px;background:#e11d48;color:#fff;border-radius:99px;font-size:11px;min-width:17px;height:17px;line-height:17px;text-align:center;font-weight:700}#pbBellN[hidden]{display:none}" +
        "#pbBellP{position:fixed;top:64px;right:12px;width:min(340px,calc(100vw - 24px));max-height:70vh;overflow:auto;background:#141032;color:#eef0ff;border:1px solid #2c2660;border-radius:14px;box-shadow:0 12px 40px #0009;z-index:9500}#pbBellP[hidden]{display:none}" +
        "#pbBellP .n{padding:11px 14px;border-bottom:1px solid #2c2660;font-size:14px;line-height:1.4}#pbBellP .n small{display:block;color:#a3a8d6;margin-top:3px}#pbBellP a{display:block;padding:11px 14px;text-align:center;color:#22d3ee;font-weight:700;text-decoration:none}";
      document.head.appendChild(css);
      var w = document.createElement("div"); w.id = "pbBell";
      w.innerHTML = '<button type="button" aria-label="Notifications">&#128276;<span id="pbBellN" hidden>0</span></button><div id="pbBellP" hidden><div id="pbBellList"></div><a href="account.html">Open PicksBible dashboard</a></div>';
      var ab = document.querySelector(".authbtns");
      if (ab) { ab.innerHTML = '<a class="sgn" href="account.html">My Account</a>'; ab.insertBefore(w, ab.firstChild); w.style.marginLeft = "0"; }
      else { var host = document.querySelector(".top .wrap") || document.body; host.appendChild(w); }
      var p = w.querySelector("#pbBellP");
      w.querySelector("button").onclick = function (e) {
        e.stopPropagation(); p.hidden = !p.hidden;
        if (!p.hidden) { try { localStorage.setItem("pb.noteSeen", w.dataset.latest || "0"); } catch (_) {} document.getElementById("pbBellN").hidden = true; }
      };
      document.addEventListener("click", function (e) { if (!e.target.closest("#pbBell")) p.hidden = true; });
    }
  }
})();
