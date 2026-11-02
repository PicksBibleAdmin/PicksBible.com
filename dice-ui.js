/* PicksBible dice game: shared 3D dice + the homepage promo card. The real roll happens on the server (api/dice.js). */
(function () {
  "use strict";
  var PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
  var FACEVAL = { f1: 1, f2: 2, f3: 6, f4: 5, f5: 3, f6: 4 };   /* opposite faces add up to 7, like a real die */
  var SHOW = { 1: "", 2: "rotateY(-90deg)", 6: "rotateY(180deg)", 5: "rotateY(90deg)", 3: "rotateX(-90deg)", 4: "rotateX(90deg)" };
  var TILT = "rotateX(-16deg) rotateY(-24deg) ";
  function face(cls) {
    var n = FACEVAL[cls], h = '<div class="face ' + cls + (n === 1 ? " red" : "") + '">';
    for (var k = 1; k <= 9; k++) h += "<i" + (PIPS[n].indexOf(k) >= 0 ? ' class="on"' : "") + "></i>";
    return h + "</div>";
  }
  function cubeHTML(extra) { return '<div class="cube ' + (extra || "") + '">' + ["f1", "f2", "f3", "f4", "f5", "f6"].map(face).join("") + "</div>"; }
  /* spin a cube and land it on value v (1-6) */
  function land(el, v, ms) {
    el.classList.add("still"); el.style.transition = "none"; el.style.transform = TILT;
    void el.offsetWidth;
    el.style.transition = "transform " + (ms || 1800) + "ms cubic-bezier(.15,.7,.2,1)";
    el.style.transform = TILT + "rotateX(" + (720 + Math.floor(Math.random() * 2) * 360) + "deg) rotateY(-720deg) " + SHOW[v];
  }
  window.PBDice = { cubeHTML: cubeHTML, land: land };

  var hero = document.getElementById("diceHero");
  if (hero) {
    var sp = ""; for (var i = 0; i < 9; i++) sp += '<span class="spark" style="left:' + (8 + Math.random() * 84).toFixed(0) + "%;top:" + (30 + Math.random() * 45).toFixed(0) + "%;animation-delay:" + (Math.random() * 3).toFixed(1) + 's"></span>';
    hero.innerHTML = '<div class="dh-jp">$1,000 JACKPOT</div><p class="dh-sub">Stand the chance to win $1,000</p>' +
      '<div class="dh-stage">' + cubeHTML("a") + cubeHTML("b") + "</div>" + '<span class="dh-btn">ROLL NOW &rarr;</span><span class="dh-fine">18+ &middot; free to play</span>' + sp;
  }
})();
