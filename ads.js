/* PicksBible ad placements: desktop (1100px and wider) and tablet (768px to 1099px). Phones are untouched.
   This file is self-contained: it adds its own styles and builds the slots when the page loads.

   TO RUN AN ADVERTISER: fill in the slot below, for example
     c: { img: "img/ads/brand-300x250.png", href: "https://advertiser.example/?ref=picksbible", alt: "Brand name" }
   A slot left empty shows an "Advertise Here!" placeholder with a Book this slot link.

   Slots
     c       300x250  desktop: right column, top   | tablet: inline under Bets of the Day
     d       300x600  desktop: right column, sticky (stays in view while scrolling)
     e       728x90   desktop: in-feed under Bets of the Day (the existing banner moved here)
     f       320x50   tablet: inline under the 300x250
     catfish 728x90   desktop and tablet: fixed to the bottom of the screen, scales down to fit narrow screens, can be closed */
(function () {
  "use strict";
  var AD = {
    c: { img: "", href: "", alt: "" },
    d: { img: "", href: "", alt: "" },
    e: { img: "", href: "", alt: "" },
    f: { img: "", href: "", alt: "" },
    catfish: { img: "", href: "", alt: "" }
  };
  var BOOK = "contact.html";
  var SIZE = { c: [300, 250], d: [300, 600], e: [728, 90], f: [320, 50], catfish: [728, 90] };

  if (document.getElementById("pbAdsCss")) return;
  var doc = document, body = doc.body;
  var main = doc.querySelector("main > .wrap");
  if (!main) return; /* only the homepage layout has these sections */

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
    /* layout: desktop rail */
    ".pb-cols{display:block}.pb-rail,.pb-inl,.pb-cf{display:none}" +
    ".pb-main .wrap{max-width:none;padding-inline:0}" +
    "@media(min-width:1100px){" +
    ".pb-cols{display:grid;grid-template-columns:minmax(0,1fr) 300px;column-gap:24px;align-items:start}" +
    ".pb-main{min-width:0}" +
    ".pb-rail{display:flex;flex-direction:column;gap:28px;padding-top:14px;align-self:stretch}" +
    ".pb-rail .pb-d{position:sticky;top:84px}" +
    ".pb-e{margin:0 auto}.pb-e .adwide{max-width:100%}" +
    "}" +
    /* layout: tablet */
    "@media(min-width:768px) and (max-width:1099.98px){" +
    ".pb-inl{display:flex;flex-direction:column;align-items:center;gap:18px;margin:6px 0 22px}" +
    ".pb-main .adwide-sec,.pb-e{display:none}" +
    "}" +
    /* catfish */
    "@media(min-width:768px){" +
    ".pb-cf{display:block;position:fixed;left:0;right:0;bottom:0;z-index:9000;background:rgba(2,6,23,.96);border-top:1px solid #1E293B;padding:6px 0 calc(6px + env(safe-area-inset-bottom,0px));text-align:center}" +
    ".pb-cf[hidden]{display:none}" +
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

  /* ---------- page structure ---------- */
  var built = false;
  function build() {
  if (built) return; built = true;
  var first = main.querySelector("[data-experttip]");
  var botd = main.querySelector("[data-botd]");
  var sure = main.querySelector("[data-sure]");
  if (first && botd && sure) {
    var wide = null, secs = main.querySelectorAll("section.sec");
    for (var i = 0; i < secs.length; i++) if (secs[i].querySelector(".adwide")) { wide = secs[i]; break; }
    var tail = main.parentNode.querySelectorAll(".ads"), adsSec = tail.length ? tail[tail.length - 1].closest("section") : null;

    var cols = doc.createElement("div"); cols.className = "pb-cols";
    var left = doc.createElement("div"); left.className = "pb-main";
    var rail = doc.createElement("aside"); rail.className = "pb-rail"; rail.setAttribute("aria-label", "Advertising");
    first.parentNode.insertBefore(cols, first);
    cols.appendChild(left); cols.appendChild(rail);

    /* left column: banker bet, bets of the day, the 728x90 in-feed, then sure predictions, props, and the two "Advertise here" boxes */
    left.appendChild(first);
    if (wide) { wide.classList.add("adwide-sec"); }
    left.appendChild(botd);
    if (wide) { var e = doc.createElement("div"); e.className = "pb-e"; e.style.cssText = "margin:0 0 22px"; e.appendChild(wide); left.appendChild(e); }
    var inl = doc.createElement("div"); inl.className = "pb-inl"; inl.appendChild(slot("c")); inl.appendChild(slot("f"));
    left.appendChild(inl);
    left.appendChild(sure);
    var props = main.querySelector("[data-props-wrap]"); if (props) left.appendChild(props);
    if (adsSec) left.appendChild(adsSec);

    rail.appendChild(slot("c", "pb-c"));
    var dwrap = doc.createElement("div"); dwrap.className = "pb-d"; dwrap.appendChild(slot("d"));
    rail.appendChild(dwrap);
  }
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
    var tg = doc.querySelector(".tgbar"), chat = doc.querySelector(".chatus"), th = doc.querySelector(".themebtn.float");
    var tgH = tg && tg.offsetHeight ? tg.offsetHeight + 8 : 0;
    if (tg) { if (on) tg.style.setProperty("bottom", h + "px", "important"); else tg.style.removeProperty("bottom"); }
    if (chat && on) chat.style.setProperty("bottom", (h + tgH + 14) + "px", "important"); else if (chat) chat.style.removeProperty("bottom");
    if (th && on) th.style.setProperty("bottom", (h + 16) + "px", "important"); else if (th) th.style.removeProperty("bottom");
  }
  sync(); window.addEventListener("resize", sync); setInterval(sync, 700);
})();
