/* PicksBible admin: blog helpers (HTML cleaner, Markdown converter, templates, image library, analytics).
   Used by admin-blog.js. Uses page globals: Store (Store.fs = Firestore), toast. */
(function () {
  "use strict";
  const T = window.PBBlogTools = {};
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  T.esc = esc;
  T.slugify = s => String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90).replace(/-+$/, "");
  T.lagos = d => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(d || new Date());
  const note = m => { try { (window.toast || console.log)(m); } catch (_) {} };

  /* ---------------- shared look (modals, media grid, analytics) ---------------- */
  const st = document.createElement("style");
  st.textContent = `
.pbm-back{position:fixed;inset:0;background:#000a;z-index:9000;display:flex;align-items:flex-start;justify-content:center;padding:5vh 14px;overflow:auto}
.pbm{background:var(--panel);color:var(--text);border:1px solid var(--line);border-radius:14px;width:min(520px,100%);box-shadow:0 20px 60px #0008}
.pbm.wide{width:min(980px,100%)}
.pbm-h{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid var(--line);font-size:16px}
.pbm-x{background:none;border:0;color:var(--muted);font-size:26px;line-height:1;cursor:pointer}
.pbm-b{padding:16px;display:grid;gap:12px}
.pbm-f{padding:12px 16px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.pbm-b .row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pbm-b .chk{display:flex;gap:8px;align-items:center;text-transform:none;letter-spacing:0;font-size:14px;color:var(--text)}.pbm-b .chk input{width:auto}
.pbm-b textarea.big{min-height:300px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px}
.pbmg{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;max-height:46vh;overflow:auto;padding:2px}
.pbmg .mi{position:relative;border:2px solid var(--line);border-radius:10px;overflow:hidden;cursor:pointer;background:var(--bg);aspect-ratio:1/1}
.pbmg .mi img{width:100%;height:100%;object-fit:cover;display:block}
.pbmg .mi.sel{border-color:var(--cyan);box-shadow:0 0 0 2px var(--cyan)}
.pbmg .mi small{position:absolute;left:0;right:0;bottom:0;background:#000b;color:#fff;font-size:11px;padding:2px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pbdrop{border:2px dashed var(--line);border-radius:12px;padding:16px;text-align:center;color:var(--muted)}
.pbdrop.over{border-color:var(--cyan);color:var(--text)}
.pbdet{display:grid;gap:8px;border:1px solid var(--line);border-radius:10px;padding:12px;background:var(--bg)}
.pbkpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:14px}
.pbkpi{background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px}.pbkpi b{display:block;font-size:26px;color:var(--cyan);line-height:1.1}.pbkpi span{font-size:12px;color:var(--muted)}
.pbbars{display:flex;align-items:flex-end;gap:3px;height:140px;border-bottom:1px solid var(--line);padding-top:6px}
.pbbars i{flex:1;background:var(--cyan);border-radius:3px 3px 0 0;min-height:2px;position:relative}
.pbbars i:hover{background:#60a5fa}
.pbtbl{width:100%;border-collapse:collapse;font-size:14px}.pbtbl th,.pbtbl td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--line)}.pbtbl th{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.04em}.pbtbl td.n{text-align:right;font-variant-numeric:tabular-nums}.pbtbl th.n{text-align:right}
.pbtwo{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
`;
  document.head.appendChild(st);

  T.dialog = function (o) {
    const back = document.createElement("div"); back.className = "pbm-back";
    back.innerHTML = '<div class="pbm' + (o.wide ? " wide" : "") + '" role="dialog" aria-modal="true"><div class="pbm-h"><b>' + esc(o.title) + '</b><button type="button" class="pbm-x" aria-label="Close">&times;</button></div><div class="pbm-b"></div><div class="pbm-f"></div></div>';
    const body = $(".pbm-b", back), foot = $(".pbm-f", back);
    if (typeof o.body === "string") body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
    function close() { back.remove(); document.removeEventListener("keydown", key, true); if (o.onclose) o.onclose(); }
    function key(e) { if (e.key === "Escape") { e.stopPropagation(); close(); } }
    (o.actions || []).forEach(a => {
      const b = document.createElement("button"); b.type = "button"; b.className = "btn" + (a.primary ? "" : " ghost"); b.textContent = a.label;
      b.onclick = () => { if (a.fn && a.fn(close, body) === false) return; if (!a.keep) close(); };
      foot.appendChild(b);
    });
    document.addEventListener("keydown", key, true);
    $(".pbm-x", back).onclick = close; back.addEventListener("mousedown", e => { if (e.target === back) close(); });
    document.body.appendChild(back);
    const f = body.querySelector("input:not([type=checkbox]),textarea,select"); if (f) setTimeout(() => f.focus(), 30);
    return { el: back, body, close };
  };

  /* ---------------- HTML cleaner ---------------- */
  const TAGS = new Set("P BR H2 H3 H4 H5 H6 STRONG B EM I U S STRIKE DEL SUB SUP MARK CODE PRE BLOCKQUOTE UL OL LI A IMG FIGURE FIGCAPTION TABLE THEAD TBODY TFOOT TR TH TD HR DIV SPAN DETAILS SUMMARY IFRAME NAV CITE SMALL".split(" "));
  const DROP = new Set("SCRIPT STYLE NOSCRIPT TEMPLATE OBJECT EMBED LINK META FORM INPUT BUTTON SELECT TEXTAREA SVG CANVAS AUDIO VIDEO TITLE HEAD".split(" "));
  const INLINE = new Set("A STRONG B EM I U S STRIKE DEL SUB SUP MARK CODE SPAN BR SMALL CITE IMG".split(" "));
  const OKCLS = /^(pb-[a-z0-9-]+|align-(left|center|right|full)|info|tip|warn|good|bad)$/;
  const SAFE_URL = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i;
  const FRAME_OK = /^https:\/\/(www\.youtube-nocookie\.com\/embed\/|www\.youtube\.com\/embed\/|player\.vimeo\.com\/video\/)/;
  const KEEP = { A: ["href", "target", "rel", "title"], IMG: ["src", "alt", "title", "width", "height"], IFRAME: ["src", "title", "allowfullscreen"], TD: ["colspan", "rowspan"], TH: ["colspan", "rowspan"], OL: ["start"], DETAILS: ["open"], NAV: ["data-toc"], H2: ["id"], H3: ["id"], H4: ["id"] };
  function cleanStyle(s) {
    const out = [];
    String(s || "").split(";").forEach(p => {
      const i = p.indexOf(":"); if (i < 0) return;
      const k = p.slice(0, i).trim().toLowerCase(), v = p.slice(i + 1).trim();
      if (k === "text-align" && /^(left|center|right|justify)$/.test(v)) out.push(k + ":" + v);
      else if ((k === "color" || k === "background-color") && /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\))$/i.test(v)) out.push(k + ":" + v);
    });
    return out.join(";");
  }
  function unwrap(el) { const p = el.parentNode; while (el.firstChild) p.insertBefore(el.firstChild, el); p.removeChild(el); }
  function clean(node, doc) {
    Array.from(node.childNodes).forEach(ch => {
      if (ch.nodeType === 3) return;
      if (ch.nodeType !== 1) { ch.remove(); return; }
      let tag = ch.tagName;
      if (DROP.has(tag)) { ch.remove(); return; }
      clean(ch, doc);
      if (tag === "H1") { const h = doc.createElement("h2"); while (ch.firstChild) h.appendChild(ch.firstChild); ch.replaceWith(h); ch = h; tag = "H2"; }
      if (!TAGS.has(tag)) { unwrap(ch); return; }
      Array.from(ch.attributes).forEach(a => {
        const n = a.name.toLowerCase(), v = a.value;
        if (n === "class") { const c = v.split(/\s+/).filter(x => OKCLS.test(x)).join(" "); if (c) ch.setAttribute("class", c); else ch.removeAttribute("class"); }
        else if (n === "style") { const c = cleanStyle(v); if (c) ch.setAttribute("style", c); else ch.removeAttribute("style"); }
        else if (KEEP[tag] && KEEP[tag].indexOf(n) >= 0) {
          if ((n === "href" || (n === "src" && tag === "IMG")) && !SAFE_URL.test(v.trim())) ch.removeAttribute(n);
          else if (n === "src" && tag === "IFRAME" && !FRAME_OK.test(v.trim())) ch.remove();
          else if (n === "target" && v !== "_blank") ch.removeAttribute(n);
        } else ch.removeAttribute(a.name);
      });
      if (!ch.parentNode) return;
      if (tag === "A") { if (ch.getAttribute("target") === "_blank") { const r = new Set((ch.getAttribute("rel") || "").split(/\s+/).filter(Boolean)); r.add("noopener"); ch.setAttribute("rel", Array.from(r).join(" ")); } if (!ch.getAttribute("href")) unwrap(ch); }
      else if (tag === "IMG" && !ch.getAttribute("src")) ch.remove();
      else if (tag === "IFRAME" && !ch.getAttribute("src")) ch.remove();
      else if ((tag === "SPAN" && !ch.getAttribute("style") && !ch.getAttribute("class")) || (tag === "DIV" && !ch.getAttribute("class"))) unwrap(ch);
    });
  }
  function wrapLoose(body, doc) {
    let run = null;
    Array.from(body.childNodes).forEach(n => {
      const inline = n.nodeType === 3 || (n.nodeType === 1 && INLINE.has(n.tagName));
      if (inline) {
        if (n.nodeType === 3 && !n.nodeValue.trim() && !run) { n.remove(); return; }
        if (!run) { run = doc.createElement("p"); body.insertBefore(run, n); }
        run.appendChild(n);
      } else run = null;
    });
  }
  T.sanitize = function (html) {
    const doc = document.implementation.createHTMLDocument("");
    doc.body.innerHTML = String(html || "");
    clean(doc.body, doc); wrapLoose(doc.body, doc);
    return doc.body.innerHTML;
  };
  /* the final version that goes on the live page: ids on headings, table of contents, tidy tables and images */
  T.finalize = function (html) {
    const doc = document.implementation.createHTMLDocument("");
    doc.body.innerHTML = T.sanitize(html);
    const b = doc.body;
    Array.from(b.querySelectorAll("p")).forEach(p => { if (!p.textContent.trim() && !p.querySelector("img,iframe")) p.remove(); });
    const used = {}, heads = [];
    Array.from(b.querySelectorAll("h2,h3")).forEach(h => {
      let id = T.slugify(h.textContent) || "section"; if (used[id]) { used[id]++; id += "-" + used[id]; } else used[id] = 1;
      h.id = id; heads.push({ t: h.tagName, id, txt: h.textContent.trim() });
    });
    Array.from(b.querySelectorAll("nav[data-toc]")).forEach(nv => {
      nv.className = "pb-toc";
      if (!heads.length) { nv.remove(); return; }
      let h = "<b>Contents</b><ul>", open = false;
      heads.forEach(x => {
        if (x.t === "H2") { if (open) h += "</ul></li>"; h += '<li><a href="#' + x.id + '">' + esc(x.txt) + "</a>"; open = false; h += "</li>"; }
        else { if (!open) { h = h.replace(/<\/li>$/, "") + "<ul>"; open = true; } h += '<li><a href="#' + x.id + '">' + esc(x.txt) + "</a></li>"; }
      });
      if (open) h += "</ul></li>";
      nv.innerHTML = h + "</ul>";
    });
    Array.from(b.querySelectorAll("table")).forEach(t => { if (!t.parentNode.classList || !t.parentNode.classList.contains("pb-tblwrap")) { const w = doc.createElement("div"); w.className = "pb-tblwrap"; t.replaceWith(w); w.appendChild(t); } });
    Array.from(b.querySelectorAll("img")).forEach(i => { i.setAttribute("loading", "lazy"); i.setAttribute("decoding", "async"); });
    Array.from(b.querySelectorAll("iframe")).forEach(i => { i.setAttribute("loading", "lazy"); i.setAttribute("title", i.getAttribute("title") || "Video"); });
    Array.from(b.querySelectorAll("details.pb-faq")).forEach(d => d.removeAttribute("open"));
    return b.innerHTML;
  };
  T.pretty = html => String(html || "").replace(/<\/(p|h[1-6]|ul|ol|li|table|thead|tbody|tr|blockquote|figure|div|details|pre)>/gi, "</$1>\n").replace(/<(hr|br)\s*\/?>/gi, "<$1>\n").trim();

  /* ---------------- Markdown -> HTML (so AI-written posts can be pasted straight in) ---------------- */
  T.looksMarkdown = function (t) {
    t = String(t || ""); if (/<\/?(p|div|h[1-6]|table|ul|ol|li|section|article)\b/i.test(t)) return false;
    return /^#{1,6}\s+\S/m.test(t) || /^\s*[-*+]\s+\S/m.test(t) && /\n/.test(t) || /\*\*[^*\n]+\*\*/.test(t) || /^\s*\|.+\|\s*\n\s*\|?\s*:?-{2,}/m.test(t) || /^\d+[.)]\s+\S/m.test(t) && /\n/.test(t);
  };
  T.md2html = function (src) {
    let text = String(src || "").replace(/\r\n?/g, "\n"), meta = {};
    const fm = text.match(/^---\n([\s\S]*?)\n---\n?/);
    if (fm) { fm[1].split("\n").forEach(l => { const m = l.match(/^([A-Za-z_]+)\s*:\s*(.*)$/); if (m) meta[m[1].toLowerCase()] = m[2].trim().replace(/^["']|["']$/g, ""); }); text = text.slice(fm[0].length); }
    const lines = text.split("\n"), out = []; let i = 0;
    const inline = s => {
      const codes = []; s = s.replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return "\u0000" + (codes.length - 1) + "\u0000"; });
      s = esc(s)
        .replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (m, a, u) => '<img src="' + u + '" alt="' + a + '">')
        .replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, (m, t, u) => '<a href="' + u + '">' + t + "</a>")
        .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/__([^_]+)__/g, "<strong>$1</strong>")
        .replace(/(^|[\s(>])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>").replace(/(^|[\s(>])_([^_\s][^_]*)_(?=[\s.,;:!?)<]|$)/g, "$1<em>$2</em>").replace(/~~([^~]+)~~/g, "<del>$1</del>");
      return s.replace(/\u0000(\d+)\u0000/g, (m, n) => "<code>" + esc(codes[n]) + "</code>");
    };
    const isList = l => /^\s*([-*+]|\d+[.)])\s+/.test(l);
    const isSep = l => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
    const cells = r => r.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
    const startsBlock = l => /^(#{1,6}\s|```|>\s?)/.test(l) || isList(l) || /^\s*([-*_])(\s*\1){2,}\s*$/.test(l);
    while (i < lines.length) {
      const l = lines[i]; let m;
      if (!l.trim()) { i++; continue; }
      if ((m = l.match(/^```/))) { const buf = []; i++; while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]); i++; out.push("<pre><code>" + esc(buf.join("\n")) + "</code></pre>"); continue; }
      if ((m = l.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/))) { const n = m[1].length; if (n === 1 && !meta.title) meta.title = m[2].replace(/[*_`]/g, ""); else { const k = Math.min(4, Math.max(2, n)); out.push("<h" + k + ">" + inline(m[2]) + "</h" + k + ">"); } i++; continue; }
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)) { out.push("<hr>"); i++; continue; }
      if (/^>\s?/.test(l)) { const buf = []; while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, "")); out.push("<blockquote><p>" + inline(buf.join(" ")) + "</p></blockquote>"); continue; }
      if (/^<(table|div|details|figure|iframe|ul|ol|h[1-6]|p|blockquote|hr|img|nav|section)\b/i.test(l.trim())) { const buf = []; while (i < lines.length && lines[i].trim()) buf.push(lines[i++]); out.push(buf.join("\n")); continue; }
      if (l.indexOf("|") >= 0 && i + 1 < lines.length && isSep(lines[i + 1]) && lines[i + 1].indexOf("-") >= 0) {
        const head = cells(l); i += 2; const rows = [];
        while (i < lines.length && lines[i].indexOf("|") >= 0 && lines[i].trim()) rows.push(cells(lines[i++]));
        out.push("<table><thead><tr>" + head.map(c => "<th>" + inline(c) + "</th>").join("") + "</tr></thead><tbody>" + rows.map(r => "<tr>" + r.map(c => "<td>" + inline(c) + "</td>").join("") + "</tr>").join("") + "</tbody></table>"); continue;
      }
      if (isList(l)) {
        const items = [];
        while (i < lines.length) {
          const mm = lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
          if (!mm) { if (!lines[i].trim() && i + 1 < lines.length && isList(lines[i + 1])) { i++; continue; } break; }
          items.push({ d: mm[1].replace(/\t/g, "    ").length, o: /\d/.test(mm[2]), t: mm[3] }); i++;
        }
        let p = 0;
        const build = d => {
          const ord = items[p].o; let h = "";
          while (p < items.length && items[p].d >= d) {
            if (items[p].d > d) { h += build(items[p].d); continue; }
            h += "<li>" + inline(items[p].t); p++;
            if (p < items.length && items[p].d > d) h += build(items[p].d);
            h += "</li>";
          }
          return (ord ? "<ol>" : "<ul>") + h + (ord ? "</ol>" : "</ul>");
        };
        out.push(build(items[0].d)); continue;
      }
      const buf = [l]; i++;
      while (i < lines.length && lines[i].trim() && !startsBlock(lines[i]) && !(lines[i].indexOf("|") >= 0 && i + 1 < lines.length && isSep(lines[i + 1]))) buf.push(lines[i++]);
      out.push("<p>" + inline(buf.join(" ")) + "</p>");
    }
    return { html: out.join("\n"), meta };
  };

  /* ---------------- starter templates (for AI-written posts) ---------------- */
  const pick = (m, t, o, n) => '<div class="pb-pick"><div class="pb-pick-h">Our prediction</div><div class="pb-pick-m">' + m + '</div><div class="pb-pick-t"><span>Tip</span> ' + t + '</div><div class="pb-pick-o"><span>Odds</span> ' + o + '</div><div class="pb-pick-n">' + n + "</div></div>";
  const faq = (q, a) => '<details class="pb-faq" open><summary>' + q + '</summary><div class="pb-faq-a"><p>' + a + "</p></div></details>";
  const rg = '<div class="pb-callout warn"><p><strong>18+ only. Bet responsibly.</strong> Predictions are opinions based on data, not guarantees. Only stake money you can afford to lose. Free help: begambleaware.org</p></div>';
  T.templates = {
    match: {
      name: "Match prediction (Team A vs Team B)", title: "[Team A] vs [Team B] Prediction, Tips and Odds", cat: "Match Predictions",
      desc: "[Team A] vs [Team B] prediction with team news, head-to-head, predicted lineups, odds and our best bet.",
      html: "<p><strong>[Team A] vs [Team B]</strong> is on [date] at [time] ([competition]). Here is our full prediction, with form, team news, head-to-head and the best bet.</p>" +
        '<nav class="pb-toc" data-toc><b>Contents</b><p>(Contents list is built when you publish)</p></nav>' + pick("[Team A] vs [Team B]", "[Over 2.5 goals]", "[1.85]", "Confidence: [70%]") +
        "<h2>Match overview</h2><p>[Why this match matters, league position, what is at stake.]</p>" +
        "<h2>[Team A] form</h2><p>[Last five results, goals scored and conceded, home or away record.]</p>" +
        "<h2>[Team B] form</h2><p>[Last five results, goals scored and conceded, home or away record.]</p>" +
        "<h2>Head-to-head</h2><p>[Recent meetings and what they tell us.]</p>" +
        "<h2>Team news and predicted lineups</h2><ul><li><strong>[Team A]:</strong> [injuries, suspensions, likely XI]</li><li><strong>[Team B]:</strong> [injuries, suspensions, likely XI]</li></ul>" +
        "<h2>Key players to watch</h2><p>[Two or three players who can decide the game.]</p>" +
        "<h2>[Team A] vs [Team B] prediction and best bet</h2><p>[Your reasoning, then the pick.]</p>" +
        "<table><thead><tr><th>Market</th><th>Our pick</th><th>Odds</th></tr></thead><tbody><tr><td>Match result</td><td>[1 / X / 2]</td><td>[0.00]</td></tr><tr><td>Over/Under 2.5</td><td>[Over / Under]</td><td>[0.00]</td></tr><tr><td>Both teams to score</td><td>[Yes / No]</td><td>[0.00]</td></tr></tbody></table>" +
        '<p class="pb-cta"><a class="pb-btn pb-btn-vip" href="/premium.html">Get daily VIP tips</a></p>' +
        "<h2>Frequently asked questions</h2>" + faq("Who will win [Team A] vs [Team B]?", "[Short answer with the reason.]") + faq("What time does [Team A] vs [Team B] kick off?", "[Date, time and time zone.]") + faq("Where can I watch [Team A] vs [Team B]?", "[Broadcasters and streams.]") + rg
    },
    sites: {
      name: "Best betting sites (country guide)", title: "Best Betting Sites in [Country] ([Year])", cat: "Betting Sites",
      desc: "The best betting sites in [Country] ranked by odds, bonuses, payment methods and licensing.",
      html: "<p>Looking for the best betting sites in <strong>[Country]</strong>? We compared licensed bookmakers on odds, bonuses, payment options, mobile apps and withdrawal speed. Here are our top picks.</p>" +
        '<nav class="pb-toc" data-toc><b>Contents</b><p>(Contents list is built when you publish)</p></nav>' +
        '<div class="pb-callout info"><p><strong>Advertising disclosure:</strong> some links on this page are affiliate links. We may earn a commission at no cost to you. This never changes our ratings.</p></div>' +
        "<h2>Our top betting sites in [Country]</h2><table><thead><tr><th>Bookmaker</th><th>Welcome offer</th><th>Licence</th><th>Payments</th><th>Our rating</th></tr></thead><tbody><tr><td>[Site 1]</td><td>[Offer]</td><td>[Licence]</td><td>[Methods]</td><td>[9.0/10]</td></tr><tr><td>[Site 2]</td><td>[Offer]</td><td>[Licence]</td><td>[Methods]</td><td>[8.8/10]</td></tr><tr><td>[Site 3]</td><td>[Offer]</td><td>[Licence]</td><td>[Methods]</td><td>[8.5/10]</td></tr></tbody></table>" +
        "<h2>1. [Site 1] review</h2><p>[Overview.]</p><p><strong>Pros</strong></p><ul><li>[Pro]</li><li>[Pro]</li></ul><p><strong>Cons</strong></p><ul><li>[Con]</li></ul>" +
        '<p class="pb-cta"><a class="pb-btn" href="https://">Visit [Site 1]</a></p>' +
        "<h2>2. [Site 2] review</h2><p>[Overview.]</p><p><strong>Pros</strong></p><ul><li>[Pro]</li></ul><p><strong>Cons</strong></p><ul><li>[Con]</li></ul>" +
        "<h2>How we rate betting sites</h2><ol><li>Licence and safety</li><li>Odds and markets</li><li>Bonuses and fair terms</li><li>Deposits and withdrawals in [currency]</li><li>Mobile app and live betting</li><li>Customer support</li></ol>" +
        "<h2>How to choose a betting site in [Country]</h2><p>[Practical advice.]</p>" +
        "<h2>Frequently asked questions</h2>" + faq("Is online betting legal in [Country]?", "[Short, accurate answer. Check local law.]") + faq("Which betting site pays out fastest?", "[Answer.]") + faq("What is the best welcome bonus?", "[Answer, with terms.]") + rg
    },
    guide: {
      name: "Betting guide / how-to", title: "[Topic]: A Simple Guide for Bettors", cat: "Betting Guides",
      desc: "[Topic] explained in plain English with examples.",
      html: "<p>[One-paragraph answer to the question the reader came with.]</p>" + '<nav class="pb-toc" data-toc><b>Contents</b><p>(Contents list is built when you publish)</p></nav>' +
        "<h2>What is [topic]?</h2><p>[Definition.]</p><h2>How it works</h2><p>[Explain with a worked example.]</p>" + '<div class="pb-callout tip"><p><strong>Tip:</strong> [One practical tip.]</p></div>' +
        "<h2>Common mistakes</h2><ul><li>[Mistake]</li><li>[Mistake]</li></ul><h2>Frequently asked questions</h2>" + faq("[Question]?", "[Answer.]") + rg
    },
    news: {
      name: "Blank article", title: "", cat: "News", desc: "",
      html: "<p>Start writing here.</p>"
    }
  };

  /* ---------------- image library ---------------- */
  T.compress = async function (file) {
    if (file.type === "image/svg+xml") { if (file.size > 250e3) throw new Error("SVG is too large (max 250 KB)"); return { blob: file, w: 0, h: 0, mime: file.type }; }
    if (file.type === "image/gif" && file.size <= 640e3) return { blob: file, w: 0, h: 0, mime: "image/gif" };
    if (!/^image\//.test(file.type)) throw new Error("That is not an image");
    const bmp = await createImageBitmap(file); let maxW = 1600;
    for (let t = 0; t < 8; t++) {
      const sc = Math.min(1, maxW / bmp.width), w = Math.max(1, Math.round(bmp.width * sc)), h = Math.max(1, Math.round(bmp.height * sc));
      const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(bmp, 0, 0, w, h);
      for (const q of [0.86, 0.78, 0.7, 0.6, 0.5]) {
        const blob = await new Promise(r => c.toBlob(r, "image/webp", q));
        if (blob && blob.size <= 640e3) return { blob, w, h, mime: blob.type || "image/webp" };
      }
      maxW = Math.round(maxW * 0.8);
    }
    throw new Error("Could not make that image small enough");
  };
  const EXT = { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/svg+xml": "svg" };
  T.upload = async function (file) {
    const c = await T.compress(file);
    const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(c.blob); });
    const id = Math.random().toString(36).slice(2, 8) + Date.now().toString(36), ext = EXT[c.mime] || "webp", fs = Store.fs;
    const name = String(file.name || "image").replace(/\.[^.]+$/, "") || "image";
    const url = "/media/" + (T.slugify(name).slice(0, 50) || "image") + "-" + id + "." + ext;
    const now = new Date().toISOString();
    await fs.collection("public").doc("media-" + id).set({ mime: c.mime, b64, at: now });
    const meta = { id, ext, name, w: c.w, h: c.h, size: c.blob.size, mime: c.mime, alt: "", url, at: now };
    await fs.collection("blog_media").doc(id).set(meta);
    return meta;
  };
  T.mediaList = async function () {
    const s = await Store.fs.collection("blog_media").get(), a = []; s.forEach(d => a.push(d.data()));
    return a.sort((x, y) => String(y.at).localeCompare(String(x.at)));
  };
  const kb = n => n > 1e6 ? (n / 1e6).toFixed(1) + " MB" : Math.round(n / 1e3) + " KB";
  /* builds the library UI inside `host`. opts.onPick(meta) turns on the "Use this image" button. */
  T.mediaLibrary = function (host, opts) {
    opts = opts || {}; let items = [], sel = null;
    host.innerHTML = '<div class="pbdrop" data-drop>Drag images here, or <button type="button" class="btn ghost" data-up>Choose images</button><input type="file" accept="image/*" multiple hidden data-file><div class="muted" style="font-size:12px;margin-top:6px">Photos are shrunk automatically (max 1600 px wide, about 150-500 KB) so pages load fast.</div></div><div class="pbmg" data-grid style="margin-top:12px"><p class="muted">Loading...</p></div><div data-det style="margin-top:12px"></div>';
    const grid = $("[data-grid]", host), det = $("[data-det]", host), drop = $("[data-drop]", host), file = $("[data-file]", host);
    function paint() {
      grid.innerHTML = items.length ? items.map(m => '<div class="mi' + (sel && sel.id === m.id ? " sel" : "") + '" data-id="' + m.id + '"><img loading="lazy" src="' + esc(m.url) + '" alt="' + esc(m.alt || "") + '"><small>' + esc(m.name) + "</small></div>").join("") : '<p class="muted">No images yet. Upload your first one above.</p>';
      if (!sel) { det.innerHTML = ""; return; }
      det.innerHTML = '<div class="pbdet"><div><b>' + esc(sel.name) + '</b> <span class="muted">' + (sel.w ? sel.w + "×" + sel.h + " · " : "") + kb(sel.size) + '</span></div><div><label>Alt text (describe the image, helps Google and screen readers)</label><input data-alt value="' + esc(sel.alt || "") + '"></div><div><label>Address</label><input readonly value="https://picksbible.com' + esc(sel.url) + '" onfocus="this.select()"></div><div style="display:flex;gap:8px;flex-wrap:wrap">' +
        (opts.onPick ? '<button type="button" class="btn" data-use>Use this image</button>' : "") + '<button type="button" class="btn ghost" data-saveAlt>Save alt text</button><button type="button" class="btn danger" data-del>Delete</button></div></div>';
    }
    async function refresh() { try { items = await T.mediaList(); } catch (e) { grid.innerHTML = '<p class="muted">Could not load (' + esc(e.code || e.message) + "). Publish the new Firestore rules first.</p>"; return; } paint(); }
    async function addFiles(files) {
      files = Array.from(files || []).filter(f => /^image\//.test(f.type)); if (!files.length) return;
      for (const f of files) { try { note("Uploading " + f.name + "..."); const m = await T.upload(f); items.unshift(m); sel = m; paint(); } catch (e) { note("Could not upload " + f.name + ": " + e.message); } }
      note("Uploaded");
    }
    $("[data-up]", host).onclick = () => file.click();
    file.onchange = () => { addFiles(file.files); file.value = ""; };
    ["dragover", "dragenter"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", e => addFiles(e.dataTransfer.files));
    grid.addEventListener("click", e => { const mi = e.target.closest(".mi"); if (!mi) return; sel = items.find(x => x.id === mi.dataset.id) || null; paint(); });
    grid.addEventListener("dblclick", e => { const mi = e.target.closest(".mi"); if (mi && opts.onPick && sel) opts.onPick(sel); });
    det.addEventListener("click", async e => {
      if (!sel) return;
      if (e.target.closest("[data-use]")) { sel.alt = $("[data-alt]", det).value.trim(); opts.onPick(sel); return; }
      if (e.target.closest("[data-saveAlt]")) { sel.alt = $("[data-alt]", det).value.trim(); await Store.fs.collection("blog_media").doc(sel.id).set({ alt: sel.alt }, { merge: true }); note("Saved"); return; }
      if (e.target.closest("[data-del]")) {
        if (!confirm("Delete this image? Posts that use it will show a broken image.")) return;
        await Store.fs.collection("blog_media").doc(sel.id).delete(); await Store.fs.collection("public").doc("media-" + sel.id).delete();
        items = items.filter(x => x.id !== sel.id); sel = null; paint(); note("Deleted");
      }
    });
    refresh();
    return { refresh, addFiles };
  };
  T.mediaPicker = function (cb) {
    const host = document.createElement("div"); let d;
    T.mediaLibrary(host, { onPick: m => { d.close(); cb(m); } });
    d = T.dialog({ title: "Choose an image", body: host, wide: true, actions: [{ label: "Cancel" }] });
    return d;
  };

  /* ---------------- analytics ---------------- */
  T.analytics = function (host, posts) {
    const titleOf = {}; (posts || []).forEach(p => { titleOf[p.slug] = p.title; });
    host.innerHTML = '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px"><label style="margin:0">Period</label><select data-range style="width:auto"><option value="7">Last 7 days</option><option value="30" selected>Last 30 days</option><option value="90">Last 90 days</option></select><button type="button" class="btn ghost" data-reload>Refresh</button></div><div data-out><p class="muted">Loading...</p></div><p class="note" style="margin-top:12px">Counts real visits to blog posts (bots and your own admin browser are left out). A "reader" scrolled more than half the article. Times are Lagos time.</p>';
    const out = $("[data-out]", host), sel = $("[data-range]", host);
    const cn = (() => { try { return new Intl.DisplayNames(["en"], { type: "region" }); } catch (_) { return null; } })();
    const bump = (o, k, v) => { o[k] = (o[k] || 0) + v; };
    async function load() {
      const days = +sel.value, from = T.lagos(new Date(Date.now() - (days - 1) * 864e5));
      out.innerHTML = '<p class="muted">Loading...</p>';
      let snap; try { snap = await Store.fs.collection("blog_stats").where("ymd", ">=", from).get(); } catch (e) { out.innerHTML = '<p class="muted">Could not load (' + esc(e.code || e.message) + "). Publish the new Firestore rules first.</p>"; return; }
      const perDay = {}, perPost = {}, ref = {}, cty = {}, dev = { m: 0, d: 0 }; let V = 0, U = 0, R = 0, C = 0;
      snap.forEach(d => {
        const x = d.data(); if (x.kind === "total") return;
        const v = x.views || 0; V += v; U += x.uniq || 0; R += x.reads || 0; C += x.cta || 0;
        bump(perDay, x.ymd, v);
        const p = perPost[x.slug] || (perPost[x.slug] = { v: 0, u: 0, r: 0, c: 0 }); p.v += v; p.u += x.uniq || 0; p.r += x.reads || 0; p.c += x.cta || 0;
        Object.keys(x).forEach(k => { if (k.indexOf("ref_") === 0) bump(ref, k.slice(4), x[k]); else if (k.indexOf("cty_") === 0) bump(cty, k.slice(4).toUpperCase(), x[k]); });
        dev.m += x.dev_m || 0; dev.d += x.dev_d || 0;
      });
      const ds = []; for (let i = days - 1; i >= 0; i--) ds.push(T.lagos(new Date(Date.now() - i * 864e5)));
      const mx = Math.max(1, ...ds.map(d => perDay[d] || 0));
      const rows = (o, lab) => { const a = Object.keys(o).map(k => [k, o[k]]).sort((a, b) => b[1] - a[1]).slice(0, 10); return a.length ? a.map(r => "<tr><td>" + esc(lab ? lab(r[0]) : r[0]) + '</td><td class="n">' + r[1] + "</td></tr>").join("") : '<tr><td colspan="2" class="muted">No data yet</td></tr>'; };
      const posts_ = Object.keys(perPost).map(k => [k, perPost[k]]).sort((a, b) => b[1].v - a[1].v);
      out.innerHTML = '<div class="pbkpis"><div class="pbkpi"><b>' + V + "</b><span>Page views</span></div><div class=\"pbkpi\"><b>" + U + '</b><span>Visitors (new each day)</span></div><div class="pbkpi"><b>' + R + '</b><span>Readers (scrolled past half)</span></div><div class="pbkpi"><b>' + (V ? Math.round(R / V * 100) : 0) + '%</b><span>Read rate</span></div><div class="pbkpi"><b>' + C + '</b><span>Button clicks</span></div><div class="pbkpi"><b>' + (perDay[T.lagos()] || 0) + "</b><span>Views today</span></div></div>" +
        '<div class="card" style="padding:12px"><h2 style="font-size:15px">Views per day</h2><div class="pbbars">' + ds.map(d => '<i title="' + d + ": " + (perDay[d] || 0) + ' views" style="height:' + Math.max(2, Math.round((perDay[d] || 0) / mx * 100)) + '%"></i>').join("") + '</div><div class="muted" style="display:flex;justify-content:space-between;font-size:12px"><span>' + ds[0] + "</span><span>" + ds[ds.length - 1] + "</span></div></div>" +
        '<div class="card" style="padding:12px;overflow:auto"><h2 style="font-size:15px">Posts</h2><table class="pbtbl"><thead><tr><th>Post</th><th class="n">Views</th><th class="n">Visitors</th><th class="n">Readers</th><th class="n">Read rate</th><th class="n">Clicks</th></tr></thead><tbody>' +
        (posts_.length ? posts_.map(r => "<tr><td>" + esc(titleOf[r[0]] || r[0]) + '<div class="muted" style="font-size:12px">/blog/' + esc(r[0]) + '</div></td><td class="n">' + r[1].v + '</td><td class="n">' + r[1].u + '</td><td class="n">' + r[1].r + '</td><td class="n">' + (r[1].v ? Math.round(r[1].r / r[1].v * 100) : 0) + '%</td><td class="n">' + r[1].c + "</td></tr>").join("") : '<tr><td colspan="6" class="muted">No visits recorded yet. Publish a post and open it on the live site.</td></tr>') + "</tbody></table></div>" +
        '<div class="pbtwo"><div class="card" style="padding:12px"><h2 style="font-size:15px">Where visitors come from</h2><table class="pbtbl"><tbody>' + rows(ref, k => k === "direct" ? "Direct / unknown" : k.replace(/_/g, ".")) + '</tbody></table></div><div class="card" style="padding:12px"><h2 style="font-size:15px">Countries</h2><table class="pbtbl"><tbody>' + rows(cty, k => (cn && k.length === 2 ? (function () { try { return cn.of(k); } catch (_) { return k; } })() : k)) + '</tbody></table><h2 style="font-size:15px;margin-top:14px">Devices</h2><table class="pbtbl"><tbody><tr><td>Phone</td><td class="n">' + dev.m + '</td></tr><tr><td>Computer / tablet</td><td class="n">' + dev.d + "</td></tr></tbody></table></div></div>";
    }
    sel.onchange = load; $("[data-reload]", host).onclick = load; load();
  };
  T.totals = async function () {
    const o = {}; try { const s = await Store.fs.collection("blog_stats").where("kind", "==", "total").get(); s.forEach(d => { const x = d.data(); o[x.slug] = x; }); } catch (_) {}
    return o;
  };
})();
