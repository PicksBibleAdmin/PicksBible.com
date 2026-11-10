/* PicksBible admin: "11. Blog" tab. A full post editor (like WordPress): rich-text editor, images, SEO panel,
   drafts, scheduling, revisions, media library and visitor analytics.
   Drafts live in Firestore blog_posts (admin only). Publishing copies the post to public/blog-<slug>, which the
   live site reads (api/seo.js builds the /blog/<slug> page). Uses page globals: Store, toast, showTab. */
(function () {
  "use strict";
  const T = window.PBBlogTools; if (!T) return;
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = T.esc;
  try { localStorage.setItem("pb.noTrack", "1"); } catch (_) {}   /* the admin's own browser is never counted as a reader */
  const lk = document.createElement("link"); lk.rel = "stylesheet"; lk.href = "blog-article.css"; document.head.appendChild(lk);
  const BASE_CATS = ["Match Predictions", "Football", "Basketball", "Betting Sites", "Betting Guides", "Tips & Strategy", "News"];
  const SITE_LINKS = [["Football predictions today", "/football-predictions.html"], ["Basketball predictions today", "/basketball-predictions.html"], ["All predictions today", "/predictions.html"], ["Expert tips", "/expert-tips.html"], ["VIP membership", "/premium.html"], ["Best NBA moneyline picks", "/best-nba-moneyline-picks-today.html"], ["Best NBA ATS picks", "/best-nba-ats-picks-today.html"], ["Best BTTS predictions", "/best-btts-predictions-today.html"], ["Best 1X2 predictions", "/best-1x2-predictions-today.html"], ["Best over/under 2.5 tips", "/best-over-under-2-5-predictions-today.html"], ["Blog", "/blog.html"], ["About us", "/about.html"]];
  let posts = [], totals = {}, loaded = false, view = "list", cur = null, dirty = false, ed = null, filter = "all", q = "", sel = {}, slugTouched = false, savedRange = null, tickTimer = null, lastAuto = 0, sourceOn = false, tags = [], dtTouched = false;
  const fs = () => Store.fs, note = m => { try { toast(m); } catch (_) { console.log(m); } };
  const nowIso = () => new Date().toISOString();
  const newId = () => "p" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
  const words = h => { const t = String(h || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim(); return t ? t.split(/\s+/).length : 0; };
  const fmtDate = iso => { try { return new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)); } catch (_) { return ""; } };
  const localDT = iso => { const d = iso ? new Date(iso) : new Date(); const p = n => String(n).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes()); };

  /* ---------------- styles ---------------- */
  const css = document.createElement("style");
  css.textContent = `
#tab-blog .bgsub{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
#tab-blog .bgsub button{background:var(--panel);color:var(--muted);border:1px solid var(--line);padding:8px 14px;border-radius:8px;cursor:pointer;font:inherit;font-weight:600}
#tab-blog .bgsub button[aria-pressed=true]{background:var(--cyan);color:#fff;border-color:var(--cyan)}
#tab-blog .bgfilters{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:10px;font-size:14px}
#tab-blog .bgfilters a{color:var(--muted);cursor:pointer;text-decoration:none}#tab-blog .bgfilters a.on{color:var(--text);font-weight:700;border-bottom:2px solid var(--cyan)}
#tab-blog table.bgt{width:100%;border-collapse:collapse}#tab-blog .bgt th,#tab-blog .bgt td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line);vertical-align:top}
#tab-blog .bgt th{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
#tab-blog .bgt .acts{font-size:13px;color:var(--muted);margin-top:3px}#tab-blog .bgt .acts a{color:var(--cyan);cursor:pointer;margin-right:10px;text-decoration:none}#tab-blog .bgt .acts a.red{color:#f87171}
#tab-blog .stp{display:inline-block;padding:2px 10px;border-radius:99px;font-size:12px;font-weight:700}
#tab-blog .stp.published{background:#14532d;color:#86efac}#tab-blog .stp.draft{background:var(--panel-2);color:var(--muted)}#tab-blog .stp.scheduled{background:#713f12;color:#fde68a}#tab-blog .stp.trash{background:#450a0a;color:#fca5a5}
#tab-blog .bgwrap{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:16px;align-items:start}
@media(max-width:1000px){#tab-blog .bgwrap{grid-template-columns:1fr}}
#tab-blog .bgtitle{font-size:26px;font-weight:800;padding:12px 14px;margin-bottom:6px}
#tab-blog .bgperm{font-size:13px;color:var(--muted);margin-bottom:10px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}#tab-blog .bgperm input{width:auto;min-width:220px;padding:4px 8px;font-size:13px}
#tab-blog .bged{border:1px solid var(--line);border-radius:12px;background:var(--panel);overflow:hidden}
#tab-blog .bgtb{display:flex;flex-wrap:wrap;gap:4px;padding:8px;border-bottom:1px solid var(--line);background:var(--panel-2);position:sticky;top:0;z-index:5}
#tab-blog .bgtb .g{display:flex;gap:3px;align-items:center;padding-right:6px;margin-right:2px;border-right:1px solid var(--line)}#tab-blog .bgtb .g:last-child{border-right:0}
#tab-blog .bgtb button,#tab-blog .bgtb select{background:var(--bg);color:var(--text);border:1px solid var(--line);border-radius:6px;min-width:32px;height:32px;padding:0 8px;font:inherit;font-size:14px;cursor:pointer;width:auto}
#tab-blog .bgtb button:hover{border-color:var(--cyan)}#tab-blog .bgtb button.on{background:var(--cyan);color:#fff;border-color:var(--cyan)}
#tab-blog .bgctx{display:none;gap:6px;flex-wrap:wrap;padding:6px 8px;background:#1e3a8a33;border-bottom:1px solid var(--line);font-size:13px;align-items:center}#tab-blog .bgctx.show{display:flex}
#tab-blog .bgctx button{background:var(--bg);color:var(--text);border:1px solid var(--line);border-radius:6px;padding:4px 10px;cursor:pointer;font:inherit;font-size:13px}
#tab-blog .bgedit{min-height:520px;padding:22px 26px;outline:none;max-height:75vh;overflow:auto}
#tab-blog .bgsrc{width:100%;min-height:520px;border:0;border-radius:0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;display:none}
#tab-blog .bgstat{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:8px 12px;border-top:1px solid var(--line);font-size:13px;color:var(--muted)}
#tab-blog .bgside .card{padding:12px;margin-bottom:12px}#tab-blog .bgside h3{margin:0 0 8px;font-size:14px}
#tab-blog .bgside .f{margin-bottom:10px}
#tab-blog .cnt{font-size:12px;color:var(--muted);float:right}#tab-blog .cnt.ok{color:#4ade80}#tab-blog .cnt.bad{color:#f87171}
#tab-blog .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}#tab-blog .chip{background:var(--panel-2);border-radius:99px;padding:3px 10px;font-size:13px;cursor:pointer}#tab-blog .chip:after{content:" ×";color:var(--muted)}
#tab-blog .serp{background:#fff;border-radius:8px;padding:10px 12px;font-family:Arial,sans-serif}#tab-blog .serp .u{color:#202124;font-size:12px}#tab-blog .serp .t{color:#1a0dab;font-size:18px;line-height:1.25;margin:2px 0}#tab-blog .serp .d{color:#4d5156;font-size:13px}
#tab-blog .seochk{list-style:none;margin:8px 0 0;padding:0;font-size:13px}#tab-blog .seochk li{display:flex;gap:8px;padding:3px 0}#tab-blog .seochk i{font-style:normal;flex:none;width:16px}
#tab-blog .score{display:inline-flex;width:38px;height:38px;border-radius:50%;align-items:center;justify-content:center;font-weight:800;color:#fff;font-size:14px}
#tab-blog .thumb{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px;border:1px solid var(--line);display:block;margin-bottom:8px;background:var(--bg)}
#tab-blog.fullscr{position:fixed;inset:0;z-index:7000;background:var(--bg);overflow:auto;padding:12px}
#tab-blog .bgedit figure.pb-fig.pbsel img{outline:3px solid var(--cyan)}
#tab-blog .bgedit .pb-video{position:relative}
#tab-blog .bgedit details>summary{cursor:text}
`;
  document.head.appendChild(css);

  /* ---------------- mount ---------------- */
  function mount() {
    const nav = document.querySelector("nav.tabs"); if (!nav || $("#tab-blog")) return;
    const btn = document.createElement("button"); btn.setAttribute("role", "tab"); btn.dataset.tab = "blog"; btn.setAttribute("aria-selected", "false"); btn.textContent = "11. Blog";
    nav.appendChild(btn); btn.onclick = () => { showTab("blog"); open(); };
    const sec = document.createElement("section"); sec.id = "tab-blog"; sec.hidden = true;
    sec.innerHTML = '<div class="bgsub" data-sub><button type="button" data-v="list">All posts</button><button type="button" data-v="edit">Add new post</button><button type="button" data-v="media">Images</button><button type="button" data-v="stats">Visitors</button></div><div id="bgView"></div>';
    const host = document.querySelector("#tab-fixtures"); (host ? host.parentNode : document.body).appendChild(sec);
    $("[data-sub]", sec).addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; go(b.dataset.v); });
  }
  async function open() {
    if (!loaded) { await load(); }
    go(view === "edit" && cur ? "edit" : view === "edit" ? "list" : view);
  }
  async function load() {
    try {
      const s = await fs().collection("blog_posts").get(); posts = []; s.forEach(d => posts.push(d.data()));
      posts.forEach(p => { if (p.status === "scheduled" && p.publishAt && p.publishAt <= nowIso()) p.status = "published"; });
      totals = await T.totals(); loaded = true;
    } catch (e) { $("#bgView").innerHTML = '<div class="card"><p>Could not load posts (' + esc(e.code || e.message) + "). Publish the new Firestore rules (firestore.rules) first, then reload.</p></div>"; throw e; }
  }
  function go(v) {
    if (view === "edit" && v !== "edit" && dirty && !confirm("You have unsaved changes in this post. Leave without saving?")) return;
    if (view === "edit" && v !== "edit") { dirty = false; clearInterval(tickTimer); }
    view = v;
    $$("#tab-blog [data-sub] button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === v)));
    const host = $("#bgView"); host.innerHTML = "";
    if (v === "list") list(host);
    else if (v === "edit") { if (!cur) newPost(); editView(host); }
    else if (v === "media") { host.innerHTML = '<div class="card"><h2>Images</h2><div data-lib></div></div>'; T.mediaLibrary($("[data-lib]", host), {}); }
    else if (v === "stats") { host.innerHTML = '<div class="card"><h2>Blog visitors</h2><div data-an></div></div>'; T.analytics($("[data-an]", host), posts); }
  }

  /* ---------------- list of posts ---------------- */
  function list(host) {
    const cnt = k => posts.filter(p => k === "all" ? p.status !== "trash" : p.status === k).length;
    const rows = posts.filter(p => (filter === "all" ? p.status !== "trash" : p.status === filter) && (!q || (p.title + " " + p.slug + " " + (p.cat || "")).toLowerCase().indexOf(q.toLowerCase()) >= 0)).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    host.innerHTML = '<div class="card"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px"><h2 style="margin:0">Blog posts</h2><button class="btn" data-new>+ Add new post</button></div>' +
      '<div class="bgfilters">' + [["all", "All"], ["published", "Published"], ["scheduled", "Scheduled"], ["draft", "Drafts"], ["trash", "Trash"]].map(f => '<a data-f="' + f[0] + '" class="' + (filter === f[0] ? "on" : "") + '">' + f[1] + " (" + cnt(f[0]) + ")</a>").join("") + "</div>" +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><input data-q placeholder="Search posts" value="' + esc(q) + '" style="max-width:280px"><select data-bulk style="width:auto"><option value="">Bulk actions</option>' + (filter === "trash" ? '<option value="restore">Restore as draft</option><option value="purge">Delete forever</option>' : '<option value="trash">Move to trash</option>') + '</select><button class="btn ghost" data-apply>Apply</button></div>' +
      '<div style="overflow:auto"><table class="bgt"><thead><tr><th style="width:28px"><input type="checkbox" data-all></th><th>Title</th><th>Category</th><th>Status</th><th>Views</th></tr></thead><tbody>' +
      (rows.length ? rows.map(p => '<tr><td><input type="checkbox" data-pick="' + p.id + '"' + (sel[p.id] ? " checked" : "") + '></td><td><b>' + esc(p.title || "(no title)") + '</b><div class="acts">' + (filter === "trash" ? '<a data-act="restore" data-id="' + p.id + '">Restore</a><a class="red" data-act="purge" data-id="' + p.id + '">Delete forever</a>' : '<a data-act="edit" data-id="' + p.id + '">Edit</a><a data-act="dup" data-id="' + p.id + '">Duplicate</a>' + (p.status === "published" ? '<a href="/blog/' + esc(p.slug) + '" target="_blank" rel="noopener">View</a>' : "") + '<a class="red" data-act="trash" data-id="' + p.id + '">Trash</a>') + '</div></td><td>' + esc(p.cat || "") + '</td><td><span class="stp ' + p.status + '">' + p.status + '</span><div class="muted" style="font-size:12px;margin-top:3px">' + esc(fmtDate(p.status === "draft" ? p.updatedAt : p.publishAt || p.updatedAt)) + '</div></td><td>' + ((totals[p.slug] && totals[p.slug].views) || 0) + "</td></tr>").join("") : '<tr><td colspan="5" class="muted" style="padding:24px">No posts here yet.</td></tr>') + "</tbody></table></div>" +
      '<p class="note" style="margin-top:12px">The blog posts that were already on the site before this editor (in data.js) stay as they are; everything you write here is new.</p></div>';
    $("[data-new]", host).onclick = () => { cur = null; go("edit"); };
    $("[data-q]", host).oninput = e => { q = e.target.value; const pos = e.target.selectionStart; list(host); const i = $("[data-q]", host); i.focus(); i.setSelectionRange(pos, pos); };
    host.addEventListener("click", async e => {
      const f = e.target.closest("[data-f]"); if (f) { filter = f.dataset.f; sel = {}; list(host); return; }
      const a = e.target.closest("[data-act]"); if (a) { const p = posts.find(x => x.id === a.dataset.id); if (!p) return; await rowAct(a.dataset.act, p); return; }
      if (e.target.closest("[data-apply]")) {
        const act = $("[data-bulk]", host).value, ids = Object.keys(sel).filter(k => sel[k]); if (!act || !ids.length) { note("Choose an action and tick some posts"); return; }
        if (act === "purge" && !confirm("Delete " + ids.length + " post(s) forever?")) return;
        for (const id of ids) { const p = posts.find(x => x.id === id); if (p) await rowAct(act, p, true); }
        sel = {}; await writeIndex(); list(host); note("Done");
      }
    });
    host.addEventListener("change", e => {
      if (e.target.matches("[data-pick]")) sel[e.target.dataset.pick] = e.target.checked;
      if (e.target.matches("[data-all]")) { $$("[data-pick]", host).forEach(c => { c.checked = e.target.checked; sel[c.dataset.pick] = e.target.checked; }); }
    });
  }
  async function rowAct(act, p, quiet) {
    if (act === "edit") { cur = JSON.parse(JSON.stringify(p)); go("edit"); return; }
    if (act === "dup") {
      const c = JSON.parse(JSON.stringify(p)); c.id = newId(); c.title = (p.title || "Post") + " (copy)"; c.slug = uniqueSlug(T.slugify(c.title)); c.status = "draft"; c.createdAt = c.updatedAt = nowIso(); delete c.publishAt;
      await fs().collection("blog_posts").doc(c.id).set(c); posts.push(c); list($("#bgView")); note("Duplicated as a draft"); return;
    }
    if (act === "trash") { await setStatus(p, "trash"); }
    else if (act === "restore") { await setStatus(p, "draft"); }
    else if (act === "purge") { if (!quiet && !confirm("Delete this post forever?")) return; await unpublish(p); await fs().collection("blog_posts").doc(p.id).delete(); posts = posts.filter(x => x.id !== p.id); }
    if (!quiet) { await writeIndex(); list($("#bgView")); note("Done"); }
  }
  async function setStatus(p, status) {
    if (status !== "published" && status !== "scheduled") await unpublish(p);
    p.status = status; p.updatedAt = nowIso();
    await fs().collection("blog_posts").doc(p.id).set({ status, updatedAt: p.updatedAt }, { merge: true });
  }
  async function unpublish(p) { try { await fs().collection("public").doc("blog-" + p.slug).delete(); } catch (_) {} }
  function uniqueSlug(base, selfId) {
    base = base || "post"; let s = base, n = 2;
    const taken = x => posts.some(p => p.slug === x && p.id !== selfId) || (window.PB && PB.posts && PB.posts.some(p => p.id === x));
    while (taken(s)) s = base + "-" + (n++); return s;
  }
  async function writeIndex() {
    const items = posts.filter(p => p.status === "published" || p.status === "scheduled").sort((a, b) => String(b.publishAt).localeCompare(String(a.publishAt))).slice(0, 300)
      .map(p => ({ slug: p.slug, title: p.title, excerpt: p.excerpt || "", cover: p.cover || "", cat: p.cat || "", publishAt: p.publishAt, mins: p.mins || 1 }));
    await fs().collection("public").doc("blog-index").set({ json: JSON.stringify(items), updatedAt: nowIso() });
  }

  /* ---------------- editor ---------------- */
  function newPost() {
    cur = { id: newId(), title: "", slug: "", status: "draft", html: "", excerpt: "", cover: "", coverAlt: "", cat: "", tags: [], author: "PicksBible Desk", metaTitle: "", metaDesc: "", focusKw: "", canonical: "", noindex: false, createdAt: nowIso(), updatedAt: nowIso(), isNew: true };
  }
  const TB = [
    [["undo", "↶", "Undo (Ctrl+Z)"], ["redo", "↷", "Redo (Ctrl+Y)"]],
    [["block", "SEL"]],
    [["bold", "<b>B</b>", "Bold (Ctrl+B)"], ["italic", "<i>I</i>", "Italic (Ctrl+I)"], ["underline", "<u>U</u>", "Underline (Ctrl+U)"], ["strikeThrough", "<s>S</s>", "Strikethrough"], ["superscript", "x²", "Superscript"], ["subscript", "x₂", "Subscript"]],
    [["color", "A", "Text colour"], ["hilite", "🖍", "Highlight"]],
    [["justifyLeft", "⬅", "Align left"], ["justifyCenter", "↔", "Centre"], ["justifyRight", "➡", "Align right"], ["justifyFull", "☰", "Justify"]],
    [["insertUnorderedList", "• List", "Bullet list"], ["insertOrderedList", "1. List", "Numbered list"], ["outdent", "⇤", "Decrease indent"], ["indent", "⇥", "Increase indent"], ["quote", "❝", "Quote"]],
    [["link", "🔗", "Insert link (Ctrl+K)"], ["unlink", "⛓", "Remove link"]],
    [["image", "🖼 Image", "Insert image"], ["video", "▶ Video", "Embed a YouTube or Vimeo video"], ["table", "▦ Table", "Insert table"], ["hr", "―", "Divider line"]],
    [["callout", "💡 Box", "Info / tip / warning box"], ["pick", "🎯 Pick", "Prediction box"], ["faq", "❓ FAQ", "Question and answer (also helps Google)"], ["cta", "🔘 Button", "Button link"], ["toc", "☷ Contents", "Table of contents"]],
    [["clear", "Tx", "Clear formatting"], ["find", "🔍", "Find and replace"], ["tpl", "TPL"], ["import", "⬇ Paste from AI", "Paste Markdown or HTML (ChatGPT, Claude, Word)"]],
    [["source", "&lt;/&gt;", "Edit HTML code"], ["full", "⛶", "Full screen"]]
  ];
  function editView(host) {
    const p = cur; dtTouched = false; slugTouched = !!p.slug && !p.isNew; tags = (p.tags || []).slice(); sourceOn = false;
    const cats = Array.from(new Set(BASE_CATS.concat(posts.map(x => x.cat).filter(Boolean), p.cat ? [p.cat] : [])));
    host.innerHTML = '<div class="bgwrap"><div>' +
      '<input class="bgtitle" id="bgTitle" placeholder="Add title" value="' + esc(p.title) + '">' +
      '<div class="bgperm">Link: <b>picksbible.com/blog/<span id="bgSlugTxt">' + esc(p.slug || "...") + '</span></b> <button type="button" class="btn ghost" id="bgSlugEdit" style="padding:3px 10px">Edit</button><input id="bgSlug" value="' + esc(p.slug) + '" hidden></div>' +
      '<div class="bged"><div class="bgtb" id="bgTb">' + TB.map(g => '<div class="g">' + g.map(b => b[0] === "block" ? '<select data-cmd="block" title="Paragraph style"><option value="p">Paragraph</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option><option value="h4">Heading 4</option><option value="blockquote">Quote</option><option value="pre">Code block</option></select>' :
        b[0] === "tpl" ? '<select data-cmd="tpl" title="Start from a template"><option value="">Templates</option>' + Object.keys(T.templates).map(k => '<option value="' + k + '">' + esc(T.templates[k].name) + "</option>").join("") + "</select>" :
        '<button type="button" data-cmd="' + b[0] + '" title="' + esc(b[2] || "") + '">' + b[1] + "</button>").join("") + "</div>").join("") + '<input type="color" id="bgColor" hidden><input type="color" id="bgHi" value="#fde047" hidden></div>' +
      '<div class="bgctx" id="bgCtx"></div><div class="bgedit pbart" id="bgEd" contenteditable="true" spellcheck="true" data-ph="Start writing, paste from your AI tool, or pick a template..."></div><textarea class="bgsrc" id="bgSrc" spellcheck="false"></textarea>' +
      '<div class="bgstat"><span id="bgCount"></span><span id="bgSaved"></span></div></div></div>' +
      '<div class="bgside">' +
      '<div class="card"><h3>Publish</h3><div class="f"><label>Status</label><select id="bgStatus"><option value="draft">Draft (not on the site)</option><option value="published">Published</option><option value="scheduled">Scheduled</option></select></div><div class="f" id="bgDtW"><label id="bgDtL">Publish date (your computer\'s time)</label><input type="datetime-local" id="bgDt"></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="bgSave" style="flex:1">Save</button><button class="btn ghost" id="bgPrev">Preview</button></div><div style="display:flex;justify-content:space-between;margin-top:10px;font-size:13px"><a id="bgTrash" style="color:#f87171;cursor:pointer">Move to trash</a><a id="bgView2" href="#" target="_blank" rel="noopener" style="color:var(--cyan)" hidden>View live post</a></div></div>' +
      '<div class="card"><h3>Category &amp; tags</h3><div class="f"><label>Category</label><select id="bgCat"><option value="">Choose...</option>' + cats.map(c => "<option" + (c === p.cat ? " selected" : "") + ">" + esc(c) + "</option>").join("") + '<option value="__new">+ New category...</option></select></div><div class="f"><label>Tags (press Enter)</label><input id="bgTagIn" placeholder="e.g. morocco, world cup"><div class="chips" id="bgTags"></div></div><div class="f"><label>Author name</label><input id="bgAuthor" value="' + esc(p.author || "PicksBible Desk") + '"></div></div>' +
      '<div class="card"><h3>Featured image</h3><div id="bgCover"></div></div>' +
      '<div class="card"><h3>Excerpt <span class="cnt" id="bgExC"></span></h3><textarea id="bgEx" placeholder="A short summary shown on the blog page and in search results (if no meta description)." style="min-height:70px">' + esc(p.excerpt) + "</textarea></div>" +
      '<div class="card"><h3>SEO <span class="score" id="bgScore" style="float:right">0</span></h3><div class="serp" id="bgSerp"></div><div class="f" style="margin-top:10px"><label>Focus keyword</label><input id="bgKw" placeholder="e.g. morocco vs england prediction" value="' + esc(p.focusKw) + '"></div><div class="f"><label>SEO title <span class="cnt" id="bgMtC"></span></label><input id="bgMt" placeholder="Leave empty to use the post title" value="' + esc(p.metaTitle) + '"></div><div class="f"><label>Meta description <span class="cnt" id="bgMdC"></span></label><textarea id="bgMd" style="min-height:70px" placeholder="120 to 160 characters that make people click.">' + esc(p.metaDesc) + '</textarea></div><div class="f"><label>Canonical address (optional)</label><input id="bgCan" placeholder="https://..." value="' + esc(p.canonical) + '"></div><label class="chk" style="display:flex;gap:8px;align-items:center;text-transform:none;font-size:14px;color:var(--text)"><input type="checkbox" id="bgNoidx" style="width:auto"' + (p.noindex ? " checked" : "") + '> Hide from Google (noindex)</label><ul class="seochk" id="bgChk"></ul></div>' +
      '<div class="card"><h3>Revisions</h3><div id="bgRev" class="muted" style="font-size:13px">Saved versions appear here.</div></div></div></div>';
    ed = $("#bgEd");
    ed.innerHTML = decorate(p.html || "");
    $("#bgStatus").value = p.status === "trash" ? "draft" : p.status; $("#bgDt").value = localDT(p.publishAt);
    tagsPaint(); coverPaint(); statusUi(); stats(); seo(); revList();
    if (p.status === "published") { const a = $("#bgView2"); a.href = "/blog/" + p.slug; a.hidden = false; }
    wire(host);
    document.addEventListener("selectionchange", ctxUpdate);
    clearInterval(tickTimer); tickTimer = setInterval(tick, 3000);
    const local = localGet(p.id); if (local && local.html !== p.html && String(local.at) > String(p.updatedAt || "")) {
      const b = document.createElement("div"); b.className = "note"; b.style.cssText = "margin:8px 0;padding:8px 12px;border:1px solid var(--pend);border-radius:8px";
      b.innerHTML = 'A newer unsaved version from this browser was found. <a href="#" data-restore style="color:var(--cyan)">Restore it</a> or <a href="#" data-drop style="color:var(--muted)">ignore</a>.';
      host.firstChild.insertBefore(b, host.firstChild.firstChild);
      b.addEventListener("click", e => { const r = e.target.closest("[data-restore]"), d = e.target.closest("[data-drop]"); if (!r && !d) return; e.preventDefault(); if (r) { ed.innerHTML = decorate(local.html); if (local.title) $("#bgTitle").value = local.title; changed(); } localDel(p.id); b.remove(); });
    }
  }
  const decorate = h => T.sanitize(h).replace(/<div class="pb-video"/g, '<div class="pb-video" contenteditable="false"');
  function cleanHtml() { const c = ed.cloneNode(true); $$("[contenteditable]", c).forEach(n => n.removeAttribute("contenteditable")); $$(".pbsel", c).forEach(n => n.classList.remove("pbsel")); return T.sanitize(c.innerHTML); }
  const lkey = id => "pb.blog.draft." + id;
  const localGet = id => { try { return JSON.parse(localStorage.getItem(lkey(id)) || "null"); } catch (_) { return null; } };
  const localDel = id => { try { localStorage.removeItem(lkey(id)); } catch (_) {} };
  function changed() { dirty = true; stats(); seo(); const s = $("#bgSaved"); if (s) s.textContent = "Unsaved changes"; lastAuto = Date.now(); }
  function tick() {
    if (view !== "edit" || !ed) return;
    if (dirty) { try { localStorage.setItem(lkey(cur.id), JSON.stringify({ html: cleanHtml(), title: $("#bgTitle").value, at: nowIso() })); } catch (_) {} }
    if (dirty && $("#bgStatus").value === "draft" && cur.status !== "published" && cur.status !== "scheduled" && Date.now() - lastAuto > 45000 && ($("#bgTitle").value.trim() || words(ed.innerHTML) > 10)) { save(true).catch(() => {}); }
  }
  function stats() {
    const t = ed.innerText || "", w = words(ed.innerHTML), c = $("#bgCount"); if (!c) return;
    c.textContent = w + " words · " + t.replace(/\s/g, "").length + " characters · " + Math.max(1, Math.round(w / 220)) + " min read";
  }
  function statusUi() {
    const s = $("#bgStatus").value; $("#bgDtW").style.display = s === "draft" ? "none" : "";
    $("#bgDtL").textContent = s === "scheduled" ? "Go live on (your computer's time)" : "Publish date (your computer's time)";
    $("#bgSave").textContent = s === "published" ? (cur.status === "published" ? "Update post" : "Publish") : s === "scheduled" ? "Schedule" : "Save draft";
  }
  function tagsPaint() { $("#bgTags").innerHTML = tags.map((t, i) => '<span class="chip" data-i="' + i + '">' + esc(t) + "</span>").join(""); }
  function coverPaint() {
    const b = $("#bgCover"), p = cur;
    b.innerHTML = p.cover ? '<img class="thumb" src="' + esc(p.cover) + '" alt=""><div class="f"><label>Alt text</label><input id="bgCoverAlt" value="' + esc(p.coverAlt || "") + '"></div><button class="btn ghost" id="bgCoverSet">Change</button> <button class="btn danger" id="bgCoverDel">Remove</button>' : '<button class="btn ghost" id="bgCoverSet">Set featured image</button><p class="muted" style="font-size:12px;margin:6px 0 0">Shown at the top of the post, on the blog page and when shared on social media. Best size: 1200×630.</p>';
    $("#bgCoverSet").onclick = () => T.mediaPicker(m => { p.cover = m.url; p.coverAlt = m.alt || ""; coverPaint(); changed(); });
    const del = $("#bgCoverDel"); if (del) del.onclick = () => { p.cover = ""; p.coverAlt = ""; coverPaint(); changed(); };
    const al = $("#bgCoverAlt"); if (al) al.oninput = () => { p.coverAlt = al.value; changed(); };
  }

  /* ---------------- selection helpers and commands ---------------- */
  function saveSel() { const s = getSelection(); if (s.rangeCount && ed.contains(s.anchorNode)) savedRange = s.getRangeAt(0).cloneRange(); }
  function restoreSel() { ed.focus(); if (savedRange) { const s = getSelection(); s.removeAllRanges(); s.addRange(savedRange); } }
  function exec(cmd, val) { restoreSel(); document.execCommand("styleWithCSS", false, cmd === "foreColor" || cmd === "hiliteColor"); document.execCommand(cmd, false, val); changed(); saveSel(); }
  function insertHtml(h) { restoreSel(); document.execCommand("insertHTML", false, h); changed(); saveSel(); }
  /* big blocks (images, tables, boxes...) go after the paragraph the cursor is in, never inside a heading or a list */
  function insertBlock(h) {
    restoreSel(); const sl = getSelection(); let n = sl.rangeCount ? sl.anchorNode : null;
    if (n && ed.contains(n)) {
      while (n && n.parentNode !== ed) n = n.parentNode;
      if (n && n.nodeType === 1) {
        const r = document.createRange(), empty = n.tagName === "P" && !n.textContent.trim() && !n.querySelector("img,iframe");
        if (empty) r.selectNode(n); else r.setStartAfter(n), r.collapse(true);
        sl.removeAllRanges(); sl.addRange(r);
      }
    }
    document.execCommand("insertHTML", false, h); changed(); saveSel();
  }
  const inEd = n => n && ed.contains(n.nodeType === 3 ? n.parentNode : n);
  function closest(sel) { const s = getSelection(); if (!s.rangeCount || !inEd(s.anchorNode)) return null; const n = s.anchorNode.nodeType === 3 ? s.anchorNode.parentNode : s.anchorNode; return n.closest ? n.closest(sel) : null; }
  function ctxUpdate() {
    if (view !== "edit" || !ed) return; const s = getSelection(); if (s.rangeCount && inEd(s.anchorNode)) saveSel();
    const ctx = $("#bgCtx"); if (!ctx) return;
    const td = closest("td,th"), blk = closest("h2,h3,h4,blockquote,pre,p,li"), sl = $('[data-cmd="block"]');
    if (sl) sl.value = blk && /^(H2|H3|H4|BLOCKQUOTE|PRE)$/.test(blk.tagName) ? blk.tagName.toLowerCase() : "p";
    ["bold", "italic", "underline", "strikeThrough"].forEach(c => { const b = $('[data-cmd="' + c + '"]'); if (b) { let on = false; try { on = document.queryCommandState(c); } catch (_) {} b.classList.toggle("on", on); } });
    if (td) { ctx.className = "bgctx show"; ctx.innerHTML = "<b>Table:</b> " + [["rowA", "+ Row below"], ["colA", "+ Column right"], ["rowD", "− Row"], ["colD", "− Column"], ["tblD", "Delete table"]].map(x => '<button type="button" data-t="' + x[0] + '">' + x[1] + "</button>").join(""); return; }
    const fig = ed.querySelector("figure.pbsel");
    if (fig) { ctx.className = "bgctx show"; ctx.innerHTML = "<b>Image:</b> " + [["al-left", "Left"], ["al-center", "Centre"], ["al-right", "Right"], ["al-full", "Full width"], ["w100", "100%"], ["w75", "75%"], ["w50", "50%"], ["edit", "Alt text &amp; caption"], ["rm", "Remove"]].map(x => '<button type="button" data-i="' + x[0] + '">' + x[1] + "</button>").join(""); return; }
    ctx.className = "bgctx"; ctx.innerHTML = "";
  }
  function tableOp(op) {
    const td = closest("td,th"); if (!td) return; const tr = td.parentNode, tb = td.closest("table"), idx = Array.prototype.indexOf.call(tr.children, td);
    if (op === "rowA") { const n = tr.cloneNode(true); Array.from(n.children).forEach(c => { c.innerHTML = "<br>"; if (c.tagName === "TH") { const d = document.createElement("td"); d.innerHTML = "<br>"; c.replaceWith(d); } }); (tr.parentNode.tagName === "THEAD" ? (tb.tBodies[0] || tb.appendChild(document.createElement("tbody"))) : tr.parentNode).insertBefore(n, tr.parentNode.tagName === "THEAD" ? (tb.tBodies[0].firstChild) : tr.nextSibling); }
    else if (op === "rowD") { if (tb.rows.length > 1) tr.remove(); else tb.remove(); }
    else if (op === "colA") { Array.from(tb.rows).forEach(r => { const c = document.createElement(r.parentNode.tagName === "THEAD" ? "th" : "td"); c.innerHTML = "<br>"; r.insertBefore(c, r.children[idx + 1] || null); }); }
    else if (op === "colD") { if (tr.children.length > 1) Array.from(tb.rows).forEach(r => { if (r.children[idx]) r.children[idx].remove(); }); else tb.remove(); }
    else if (op === "tblD") tb.remove();
    changed(); ctxUpdate();
  }
  function imgOp(op) {
    const fig = ed.querySelector("figure.pbsel"); if (!fig) return;
    if (op === "rm") { fig.remove(); }
    else if (op.indexOf("al-") === 0) { fig.classList.remove("align-left", "align-center", "align-right", "align-full"); fig.classList.add("align-" + op.slice(3)); }
    else if (/^w\d+$/.test(op)) { fig.classList.remove("pb-w100", "pb-w75", "pb-w50"); if (op !== "w100") fig.classList.add("pb-" + op); }
    else if (op === "edit") { imageDialog(fig); return; }
    changed(); ctxUpdate();
  }
  function figHtml(m, o) {
    return '<figure class="pb-fig align-' + (o.align || "center") + (o.w && o.w !== "w100" ? " pb-" + o.w : "") + '"><img src="' + esc(m.url) + '" alt="' + esc(o.alt || "") + '"' + (m.w ? ' width="' + m.w + '" height="' + m.h + '"' : "") + ">" + (o.cap ? "<figcaption>" + esc(o.cap) + "</figcaption>" : "") + "</figure><p><br></p>";
  }
  function imageDialog(fig, meta) {
    const img = fig ? fig.querySelector("img") : null, capEl = fig ? fig.querySelector("figcaption") : null;
    const alt = img ? img.getAttribute("alt") || "" : meta.alt || "", cap = capEl ? capEl.textContent : "";
    const al = fig ? (/align-(left|right|full)/.exec(fig.className) || [0, "center"])[1] : "center", w = fig ? (/pb-(w\d+)/.exec(fig.className) || [0, "w100"])[1] : "w100";
    const body = document.createElement("div");
    body.innerHTML = '<div><label>Alt text (required for good SEO: describe what the picture shows)</label><input data-alt value="' + esc(alt) + '"></div><div><label>Caption (optional)</label><input data-cap value="' + esc(cap) + '"></div><div class="row"><div><label>Alignment</label><select data-al><option value="center">Centre</option><option value="left">Left, text wraps</option><option value="right">Right, text wraps</option><option value="full">Full width</option></select></div><div><label>Width</label><select data-w><option value="w100">100%</option><option value="w75">75%</option><option value="w50">50%</option></select></div></div>';
    $("[data-al]", body).value = al; $("[data-w]", body).value = w;
    T.dialog({ title: fig ? "Image settings" : "Insert image", body, actions: [{ label: "Cancel" }, { label: fig ? "Apply" : "Insert", primary: true, fn: () => {
      const o = { alt: $("[data-alt]", body).value.trim(), cap: $("[data-cap]", body).value.trim(), align: $("[data-al]", body).value, w: $("[data-w]", body).value };
      if (fig) { img.setAttribute("alt", o.alt); fig.className = "pb-fig align-" + o.align + (o.w !== "w100" ? " pb-" + o.w : "") + " pbsel"; let c = fig.querySelector("figcaption"); if (o.cap) { if (!c) { c = document.createElement("figcaption"); fig.appendChild(c); } c.textContent = o.cap; } else if (c) c.remove(); changed(); ctxUpdate(); }
      else insertBlock(figHtml(meta, o));
    } }] });
  }
  async function uploadInsert(file) {
    try { note("Uploading image..."); const m = await T.upload(file); m.alt = ""; insertBlock(figHtml(m, {})); note("Image added. Click it to add alt text."); } catch (e) { note("Upload failed: " + e.message); }
  }
  function ytId(u) { const m = String(u).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/); return m ? m[1] : ""; }
  function dialogs(cmd) {
    saveSel();
    if (cmd === "link") {
      const a = closest("a"), txt = getSelection().toString(), body = document.createElement("div");
      body.innerHTML = '<div><label>Address</label><input data-u list="bgLinks" placeholder="https://... or choose a page on this site" value="' + esc(a ? a.getAttribute("href") : "") + '"><datalist id="bgLinks">' + SITE_LINKS.map(l => '<option value="' + l[1] + '">' + esc(l[0]) + "</option>").join("") + posts.filter(x => x.status === "published").map(x => '<option value="/blog/' + esc(x.slug) + '">' + esc(x.title) + "</option>").join("") + "</datalist></div>" + (txt || a ? "" : '<div><label>Link text</label><input data-t></div>') +
        '<label class="chk"><input type="checkbox" data-nt' + (a && a.target === "_blank" ? " checked" : "") + '> Open in a new tab</label><label class="chk"><input type="checkbox" data-nf' + (a && /nofollow/.test(a.rel || "") ? " checked" : "") + '> Tell Google not to follow it (nofollow)</label><label class="chk"><input type="checkbox" data-sp' + (a && /sponsored/.test(a.rel || "") ? " checked" : "") + '> This is an advert or affiliate link (sponsored)</label>';
      T.dialog({ title: a ? "Edit link" : "Insert link", body, actions: [{ label: "Cancel" }, { label: "Apply", primary: true, fn: () => {
        let u = $("[data-u]", body).value.trim(); if (!u) return false; if (!/^(https?:|mailto:|tel:|\/|#)/i.test(u)) u = "https://" + u;
        const rel = []; if ($("[data-nf]", body).checked) rel.push("nofollow"); if ($("[data-sp]", body).checked) rel.push("sponsored"); const nt = $("[data-nt]", body).checked; if (nt) rel.push("noopener");
        const fix = el => { el.setAttribute("href", u); if (nt) el.setAttribute("target", "_blank"); else el.removeAttribute("target"); if (rel.length) el.setAttribute("rel", rel.join(" ")); else el.removeAttribute("rel"); };
        if (a) { fix(a); changed(); return; }
        if (!txt) { const t = ($("[data-t]", body) || {}).value || u; insertHtml('<a href="#pbtmp">' + esc(t) + "</a>"); }
        else exec("createLink", "#pbtmp");
        $$('a[href="#pbtmp"]', ed).forEach(fix); changed();
      } }] });
    } else if (cmd === "image") T.mediaPicker(m => imageDialog(null, m));
    else if (cmd === "video") {
      const body = document.createElement("div"); body.innerHTML = '<div><label>YouTube or Vimeo address</label><input data-u placeholder="https://www.youtube.com/watch?v=..."></div>';
      T.dialog({ title: "Embed a video", body, actions: [{ label: "Cancel" }, { label: "Embed", primary: true, fn: () => {
        const u = $("[data-u]", body).value.trim(); let src = ""; const y = ytId(u), v = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        if (y) src = "https://www.youtube-nocookie.com/embed/" + y; else if (v) src = "https://player.vimeo.com/video/" + v[1]; else { note("Paste a YouTube or Vimeo link"); return false; }
        insertBlock('<div class="pb-video" contenteditable="false"><iframe src="' + src + '" title="Video" allowfullscreen></iframe></div><p><br></p>');
      } }] });
    } else if (cmd === "table") {
      const body = document.createElement("div"); body.innerHTML = '<div class="row"><div><label>Rows</label><input type="number" data-r value="4" min="1" max="30"></div><div><label>Columns</label><input type="number" data-c value="3" min="1" max="10"></div></div><label class="chk"><input type="checkbox" data-h checked> First row is a header</label>';
      T.dialog({ title: "Insert table", body, actions: [{ label: "Cancel" }, { label: "Insert", primary: true, fn: () => {
        const r = Math.max(1, Math.min(30, +$("[data-r]", body).value || 3)), c = Math.max(1, Math.min(10, +$("[data-c]", body).value || 3)), hd = $("[data-h]", body).checked;
        const row = tag => "<tr>" + Array(c + 1).join("<" + tag + "><br></" + tag + ">") + "</tr>";
        let h = "<table>"; if (hd) h += "<thead>" + row("th") + "</thead>"; h += "<tbody>"; for (let i = hd ? 1 : 0; i < r; i++) h += row("td"); h += "</tbody></table><p><br></p>"; insertBlock(h);
      } }] });
    } else if (cmd === "callout") {
      const body = document.createElement("div"); body.innerHTML = '<div><label>Type</label><select data-k><option value="info">Info (blue)</option><option value="tip">Tip (green)</option><option value="warn">Warning (amber)</option><option value="bad">Important (red)</option></select></div>';
      T.dialog({ title: "Insert a highlighted box", body, actions: [{ label: "Cancel" }, { label: "Insert", primary: true, fn: () => insertBlock('<div class="pb-callout ' + $("[data-k]", body).value + '"><p>Write your note here.</p></div><p><br></p>') }] });
    } else if (cmd === "pick") {
      const body = document.createElement("div"); body.innerHTML = '<div><label>Match</label><input data-m placeholder="Morocco vs England"></div><div class="row"><div><label>Our tip</label><input data-t placeholder="Over 2.5 goals"></div><div><label>Odds</label><input data-o placeholder="1.85"></div></div><div><label>Note (optional)</label><input data-n placeholder="Confidence: 70%"></div>';
      T.dialog({ title: "Prediction box", body, actions: [{ label: "Cancel" }, { label: "Insert", primary: true, fn: () => {
        const g = s => esc($(s, body).value.trim());
        insertBlock('<div class="pb-pick"><div class="pb-pick-h">Our prediction</div><div class="pb-pick-m">' + (g("[data-m]") || "Team A vs Team B") + '</div><div class="pb-pick-t"><span>Tip</span> ' + (g("[data-t]") || "Your tip") + '</div><div class="pb-pick-o"><span>Odds</span> ' + (g("[data-o]") || "0.00") + "</div>" + (g("[data-n]") ? '<div class="pb-pick-n">' + g("[data-n]") + "</div>" : "") + "</div><p><br></p>");
      } }] });
    } else if (cmd === "faq") insertBlock('<details class="pb-faq" open><summary>Your question here?</summary><div class="pb-faq-a"><p>Your answer here.</p></div></details><p><br></p>');
    else if (cmd === "cta") {
      const body = document.createElement("div"); body.innerHTML = '<div><label>Button text</label><input data-t value="Get daily VIP tips"></div><div><label>Address</label><input data-u value="/premium.html"></div><div><label>Style</label><select data-s><option value="">Blue</option><option value="pb-btn-vip">Gold (VIP only)</option></select></div><label class="chk"><input type="checkbox" data-sp> This is an affiliate link (sponsored, opens a new tab)</label>';
      T.dialog({ title: "Button link", body, actions: [{ label: "Cancel" }, { label: "Insert", primary: true, fn: () => {
        const u = $("[data-u]", body).value.trim(); if (!u) return false; const sp = $("[data-sp]", body).checked;
        insertBlock('<p class="pb-cta"><a class="pb-btn ' + $("[data-s]", body).value + '" href="' + esc(u) + '"' + (sp ? ' target="_blank" rel="sponsored noopener"' : "") + ">" + esc($("[data-t]", body).value.trim() || "Learn more") + "</a></p><p><br></p>");
      } }] });
    } else if (cmd === "find") {
      const body = document.createElement("div"); body.innerHTML = '<div><label>Find</label><input data-f></div><div><label>Replace with</label><input data-r></div><label class="chk"><input type="checkbox" data-cs> Match capital letters</label>';
      T.dialog({ title: "Find and replace", body, actions: [{ label: "Close" }, { label: "Find next", keep: true, fn: () => { const f = $("[data-f]", body).value; if (f) { ed.focus(); window.find(f, $("[data-cs]", body).checked, false, true); } } }, { label: "Replace all", primary: true, keep: true, fn: () => {
        const f = $("[data-f]", body).value, r = $("[data-r]", body).value; if (!f) return; let n = 0; const re = new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $("[data-cs]", body).checked ? "g" : "gi");
        const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT); const list = []; while (w.nextNode()) list.push(w.currentNode);
        list.forEach(t => { if (re.test(t.nodeValue)) { re.lastIndex = 0; t.nodeValue = t.nodeValue.replace(re, () => { n++; return r; }); } re.lastIndex = 0; });
        note(n + " replaced"); if (n) changed();
      } }] });
    } else if (cmd === "import") {
      const body = document.createElement("div"); body.innerHTML = '<p class="note" style="margin:0">Paste an article written by ChatGPT, Claude, Gemini or Word. Markdown (## headings, **bold**, tables) and HTML are both turned into clean formatted text. A header block with <code>title:</code>, <code>slug:</code>, <code>description:</code>, <code>category:</code>, <code>tags:</code> between <code>---</code> lines fills in the post settings too.</p><textarea class="big" data-t placeholder="Paste here"></textarea><div><label>What to do</label><select data-m><option value="replace">Replace everything in the post</option><option value="insert">Insert at the cursor</option><option value="append">Add to the end</option></select></div>';
      T.dialog({ title: "Paste from AI", body, wide: true, actions: [{ label: "Cancel" }, { label: "Convert and add", primary: true, fn: () => {
        const raw = $("[data-t]", body).value; if (!raw.trim()) return false;
        let html, meta = {}; if (T.looksMarkdown(raw) || !/<[a-z][\s\S]*>/i.test(raw)) { const r = T.md2html(raw); html = r.html; meta = r.meta; } else html = raw;
        html = T.sanitize(html); const m = $("[data-m]", body).value;
        if (m === "replace") ed.innerHTML = decorate(html); else if (m === "append") ed.insertAdjacentHTML("beforeend", html); else insertHtml(html);
        applyMeta(meta); changed(); note("Added");
      } }] });
    }
  }
  function applyMeta(m) {
    if (!m) return; const set = (id, v) => { const e = $(id); if (e && v && !e.value.trim()) { e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); } };
    set("#bgTitle", m.title); set("#bgMd", m.description || m.meta_description); set("#bgMt", m.seo_title || m.meta_title); set("#bgKw", m.keyword || m.focus_keyword);
    if (m.slug && (!$("#bgSlug").value || !slugTouched)) { $("#bgSlug").value = T.slugify(m.slug); slugTouched = true; $("#bgSlugTxt").textContent = $("#bgSlug").value; }
    if (m.category) { const s = $("#bgCat"); if (!s.value) { if (!Array.from(s.options).some(o => o.value === m.category)) s.insertBefore(new Option(m.category, m.category), s.querySelector('[value="__new"]')); s.value = m.category; } }
    if (m.tags) m.tags.replace(/[\[\]]/g, "").split(",").map(x => x.trim()).filter(Boolean).forEach(t => { if (tags.indexOf(t) < 0) tags.push(t); }); tagsPaint();
    if (m.excerpt && !$("#bgEx").value) $("#bgEx").value = m.excerpt;
    if (m.image && !cur.cover) { cur.cover = m.image; coverPaint(); }
  }
  function command(cmd, val) {
    if (cmd === "undo" || cmd === "redo") { ed.focus(); document.execCommand(cmd); changed(); }
    else if (cmd === "block") {
      restoreSel(); const blk = closest("h2,h3,h4,blockquote,pre"); let v = val;
      if (v === "p" || (blk && blk.tagName.toLowerCase() === v)) v = "p"; document.execCommand("formatBlock", false, "<" + v + ">"); changed();
    }
    else if (cmd === "quote") { restoreSel(); const b = closest("blockquote"); document.execCommand("formatBlock", false, b ? "<p>" : "<blockquote>"); changed(); }
    else if (cmd === "color") { saveSel(); $("#bgColor").click(); }
    else if (cmd === "hilite") { saveSel(); $("#bgHi").click(); }
    else if (cmd === "unlink") exec("unlink");
    else if (cmd === "hr") insertBlock("<hr><p><br></p>");
    else if (cmd === "toc") { if (ed.querySelector("nav[data-toc]")) { note("This post already has a contents list"); return; } insertBlock('<nav class="pb-toc" data-toc><b>Contents</b><p>(The contents list is built from your headings when you publish)</p></nav><p><br></p>'); }
    else if (cmd === "clear") { exec("removeFormat"); const b = closest("h2,h3,h4,blockquote,pre"); if (b) document.execCommand("formatBlock", false, "<p>"); changed(); }
    else if (cmd === "source") toggleSource();
    else if (cmd === "full") { const t = $("#tab-blog"); t.classList.toggle("fullscr"); }
    else if (cmd === "tpl") tpl(val);
    else if (["link", "image", "video", "table", "callout", "pick", "faq", "cta", "find", "import"].indexOf(cmd) >= 0) dialogs(cmd);
    else exec(cmd, val);
  }
  function tpl(k) {
    const t = T.templates[k]; if (!t) return;
    if (words(ed.innerHTML) > 5 && !confirm("This replaces what you have written so far. Continue?")) { $('[data-cmd="tpl"]').value = ""; return; }
    ed.innerHTML = decorate(t.html);
    const ti = $("#bgTitle"); if (!ti.value.trim() && t.title) ti.value = t.title; ti.dispatchEvent(new Event("input", { bubbles: true }));
    if (t.cat) { const s = $("#bgCat"); if (!s.value) s.value = t.cat; }
    if (!$("#bgMd").value && t.desc) $("#bgMd").value = t.desc;
    $('[data-cmd="tpl"]').value = ""; changed(); note("Template added. Replace the [bracketed] parts.");
  }
  function toggleSource() {
    const src = $("#bgSrc"), b = $('[data-cmd="source"]');
    if (!sourceOn) { src.value = T.pretty(cleanHtml()); src.style.display = "block"; ed.style.display = "none"; b.classList.add("on"); sourceOn = true; }
    else { ed.innerHTML = decorate(src.value); src.style.display = "none"; ed.style.display = ""; b.classList.remove("on"); sourceOn = false; changed(); }
  }

  /* ---------------- SEO ---------------- */
  function seoData() {
    const html = sourceOn ? $("#bgSrc").value : cleanHtml(), doc = document.implementation.createHTMLDocument(""); doc.body.innerHTML = html;
    const title = $("#bgTitle").value.trim(), mt = $("#bgMt").value.trim(), md = $("#bgMd").value.trim() || $("#bgEx").value.trim(), kw = $("#bgKw").value.trim().toLowerCase(), slug = $("#bgSlug").value;
    const text = doc.body.textContent.replace(/\s+/g, " ").trim(), w = text ? text.split(" ").length : 0;
    const h2 = Array.from(doc.querySelectorAll("h2,h3")).map(h => h.textContent.toLowerCase());
    const links = Array.from(doc.querySelectorAll("a[href]")).map(a => a.getAttribute("href")), imgs = Array.from(doc.querySelectorAll("img"));
    const first = text.split(" ").slice(0, 100).join(" ").toLowerCase();
    const sents = text.split(/[.!?]+\s/).filter(Boolean), avg = sents.length ? w / sents.length : 0;
    const kwN = kw ? (text.toLowerCase().split(kw).length - 1) : 0, dens = w && kw ? kwN * kw.split(" ").length / w * 100 : 0;
    const t = (mt || title);
    const C = [];
    const add = (ok, good, bad) => C.push({ ok, txt: ok ? good : bad });
    add(t.length >= 30 && t.length <= 65, "SEO title length is good (" + t.length + ")", "SEO title should be 30 to 65 characters (now " + t.length + ")");
    add(md.length >= 110 && md.length <= 165, "Meta description length is good (" + md.length + ")", "Meta description should be 110 to 165 characters (now " + md.length + ")");
    add(w >= 600, "Length is good (" + w + " words)", "Aim for at least 600 words (now " + w + ")");
    add(h2.length >= 2, "Has " + h2.length + " subheadings", "Add at least two subheadings (Heading 2)");
    add(imgs.length >= 1 || !!cur.cover, "Has an image", "Add an image or a featured image");
    add(imgs.every(i => (i.getAttribute("alt") || "").trim()), "All images have alt text", "Some images have no alt text");
    add(links.filter(h => h[0] === "/" ).length >= 2, "Has 2+ links to other pages on your site", "Add at least 2 links to other pages on your site");
    add(links.some(h => /^https?:/.test(h)), "Has an outside link", "Add one link to a trusted outside source");
    add(slug.length > 0 && slug.length <= 75, "Link address length is good", "Link address is empty or too long");
    add(avg > 0 && avg <= 22, "Sentences are easy to read", "Sentences are long; shorten some");
    if (kw) {
      add(t.toLowerCase().indexOf(kw) >= 0, "Keyword is in the title", "Add the focus keyword to the title");
      add(md.toLowerCase().indexOf(kw) >= 0, "Keyword is in the meta description", "Add the focus keyword to the meta description");
      add(slug.indexOf(T.slugify(kw)) >= 0, "Keyword is in the link address", "Add the focus keyword to the link address");
      add(first.indexOf(kw) >= 0, "Keyword is in the first paragraph", "Use the focus keyword in the first 100 words");
      add(h2.some(h => h.indexOf(kw) >= 0), "Keyword is in a subheading", "Use the focus keyword in one subheading");
      add(dens >= 0.4 && dens <= 3, "Keyword used " + kwN + " times (" + dens.toFixed(1) + "%)", "Keyword used " + kwN + " times (" + dens.toFixed(1) + "%); aim for 0.5% to 2.5%");
    } else C.push({ ok: null, txt: "Set a focus keyword to get keyword checks" });
    return { C, t, md, slug, w };
  }
  function seo() {
    if (!$("#bgChk")) return; const r = seoData(), scored = r.C.filter(c => c.ok !== null), pass = scored.filter(c => c.ok).length, sc = scored.length ? Math.round(pass / scored.length * 100) : 0;
    const el = $("#bgScore"); el.textContent = sc; el.style.background = sc >= 80 ? "#16a34a" : sc >= 50 ? "#d97706" : "#dc2626";
    $("#bgSerp").innerHTML = '<div class="u">picksbible.com › blog › ' + esc(r.slug || "...") + '</div><div class="t">' + esc((r.t || "Post title").slice(0, 70)) + '</div><div class="d">' + esc((r.md || "No description yet.").slice(0, 160)) + "</div>";
    $("#bgChk").innerHTML = r.C.map(c => "<li><i>" + (c.ok === null ? "ℹ️" : c.ok ? "✅" : "⚠️") + "</i><span>" + esc(c.txt) + "</span></li>").join("");
    const cn = (id, n, lo, hi) => { const e = $(id); e.textContent = n + (hi ? " / " + hi : ""); e.className = "cnt " + (n >= lo && n <= hi ? "ok" : n ? "bad" : ""); };
    cn("#bgMtC", ($("#bgMt").value || $("#bgTitle").value).length, 30, 65); cn("#bgMdC", ($("#bgMd").value || $("#bgEx").value).length, 110, 165); cn("#bgExC", $("#bgEx").value.length, 40, 300);
  }

  /* ---------------- save / publish ---------------- */
  function collect() {
    const p = cur;
    if (sourceOn) { ed.innerHTML = decorate($("#bgSrc").value); }
    p.title = $("#bgTitle").value.trim(); p.slug = T.slugify($("#bgSlug").value || p.title); p.html = cleanHtml();
    p.excerpt = $("#bgEx").value.trim(); p.cat = $("#bgCat").value === "__new" ? "" : $("#bgCat").value; p.tags = tags.slice(); p.author = $("#bgAuthor").value.trim() || "PicksBible Desk";
    p.metaTitle = $("#bgMt").value.trim(); p.metaDesc = $("#bgMd").value.trim(); p.focusKw = $("#bgKw").value.trim(); p.canonical = $("#bgCan").value.trim(); p.noindex = $("#bgNoidx").checked;
    p.words = words(p.html); p.mins = Math.max(1, Math.round(p.words / 220));
    if (!p.excerpt) { const t = document.implementation.createHTMLDocument(""); t.body.innerHTML = p.html; const f = Array.from(t.querySelectorAll("p")).map(x => x.textContent.trim()).find(x => x.length > 40) || ""; p.autoExcerpt = f.slice(0, 200); }
  }
  async function save(auto) {
    if (!ed) return; collect(); const p = cur, want = $("#bgStatus").value, prev = p.status;
    if (!p.title) { if (auto) return; note("Please add a title first"); $("#bgTitle").focus(); return; }
    p.slug = uniqueSlug(p.slug || T.slugify(p.title), p.id); $("#bgSlug").value = p.slug; $("#bgSlugTxt").textContent = p.slug;
    const oldSlug = p.pubSlug && p.pubSlug !== p.slug ? p.pubSlug : "";
    let status = prev === "trash" && want === "draft" ? "draft" : want;
    if (auto) status = prev === "published" || prev === "scheduled" ? prev : "draft";
    let at = p.publishAt || "";
    if (status === "published" || status === "scheduled") {
      at = $("#bgDt").value ? new Date($("#bgDt").value).toISOString() : nowIso();
      if (status === "published" && prev !== "published" && !dtTouched) at = nowIso();
      if (status === "published" && new Date(at) > new Date(Date.now() + 60000)) status = "scheduled";
      if (status === "scheduled" && new Date(at) <= new Date(Date.now() + 30000)) { if (auto) return; note("Pick a time in the future to schedule, or choose Published"); return; }
      p.publishAt = at;
    }
    p.status = status; p.updatedAt = nowIso(); const wasNew = p.isNew; delete p.isNew;
    const rec = JSON.parse(JSON.stringify(p));
    try {
      if (!p.createdAt) p.createdAt = p.updatedAt;
      await fs().collection("blog_posts").doc(p.id).set(rec);
      if (status === "published" || status === "scheduled") {
        const pub = { slug: p.slug, title: p.title, html: T.finalize(p.html), excerpt: p.excerpt || p.autoExcerpt || "", cover: p.cover || "", coverAlt: p.coverAlt || "", cat: p.cat || "", tags: p.tags || [], author: p.author, metaTitle: p.metaTitle || "", metaDesc: p.metaDesc || "", canonical: p.canonical || "", noindex: !!p.noindex, publishAt: p.publishAt, updatedAt: p.updatedAt, mins: p.mins || 1 };
        await fs().collection("public").doc("blog-" + p.slug).set(pub);
        if (oldSlug) await fs().collection("public").doc("blog-" + oldSlug).set({ redirect: p.slug });
        p.pubSlug = p.slug; await fs().collection("blog_posts").doc(p.id).set({ pubSlug: p.slug }, { merge: true });
      } else if (prev === "published" || prev === "scheduled") { await unpublish({ slug: p.pubSlug || p.slug }); p.pubSlug = ""; await fs().collection("blog_posts").doc(p.id).set({ pubSlug: "" }, { merge: true }); }
      const i = posts.findIndex(x => x.id === p.id); if (i >= 0) posts[i] = JSON.parse(JSON.stringify(p)); else posts.push(JSON.parse(JSON.stringify(p)));
      await writeIndex();
      if (!auto) await addRevision(p);
    } catch (e) { note("Could not save: " + (e.code || e.message)); console.error(e); return; }
    dirty = false; localDel(p.id); lastAuto = Date.now();
    $("#bgSaved").textContent = (auto ? "Auto-saved " : "Saved ") + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    $("#bgStatus").value = p.status; statusUi();
    const a = $("#bgView2"); if (p.status === "published") { a.href = "/blog/" + p.slug; a.hidden = false; } else a.hidden = true;
    if (!auto) { note(p.status === "published" ? (prev === "published" ? "Post updated" : "Published! It may take a few minutes to appear everywhere.") : p.status === "scheduled" ? "Scheduled for " + fmtDate(p.publishAt) : "Draft saved"); revList(); }
  }
  async function addRevision(p) {
    try {
      const id = p.id + "_" + Date.now(); await fs().collection("blog_revisions").doc(id).set({ postId: p.id, title: p.title, html: p.html, at: nowIso() });
      const s = await fs().collection("blog_revisions").where("postId", "==", p.id).get(), a = []; s.forEach(d => a.push(d.id)); a.sort();
      for (const old of a.slice(0, Math.max(0, a.length - 15))) await fs().collection("blog_revisions").doc(old).delete();
    } catch (_) {}
  }
  async function revList() {
    const box = $("#bgRev"); if (!box || !cur || cur.isNew) return;
    try {
      const s = await fs().collection("blog_revisions").where("postId", "==", cur.id).get(), a = []; s.forEach(d => a.push(Object.assign({ id: d.id }, d.data()))); a.sort((x, y) => String(y.at).localeCompare(String(x.at)));
      box.innerHTML = a.length ? a.slice(0, 10).map(r => '<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid var(--line)"><span>' + esc(fmtDate(r.at)) + ' · ' + words(r.html) + ' words</span><a data-rev="' + r.id + '" style="color:var(--cyan);cursor:pointer">Restore</a></div>').join("") : "Saved versions appear here.";
      box._revs = a;
    } catch (_) {}
  }

  /* ---------------- events ---------------- */
  function wire(host) {
    const on = (id, ev, fn) => { const e = $(id); if (e) e.addEventListener(ev, fn); };
    on("#bgTitle", "input", () => { if (!slugTouched) { $("#bgSlug").value = T.slugify($("#bgTitle").value); $("#bgSlugTxt").textContent = $("#bgSlug").value || "..."; } changed(); });
    on("#bgSlugEdit", "click", () => { const i = $("#bgSlug"); i.hidden = !i.hidden; if (!i.hidden) i.focus(); });
    on("#bgSlug", "input", e => { slugTouched = true; e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"); $("#bgSlugTxt").textContent = e.target.value || "..."; changed(); });
    ["#bgEx", "#bgMt", "#bgMd", "#bgKw", "#bgCan", "#bgAuthor"].forEach(id => on(id, "input", changed));
    on("#bgNoidx", "change", changed);
    on("#bgStatus", "change", () => { statusUi(); dirty = true; });
    on("#bgDt", "change", () => { dirty = true; dtTouched = true; });
    on("#bgCat", "change", e => { if (e.target.value === "__new") { const n = (prompt("New category name") || "").trim(); if (n) { e.target.insertBefore(new Option(n, n), e.target.querySelector('[value="__new"]')); e.target.value = n; } else e.target.value = ""; } changed(); });
    on("#bgTagIn", "keydown", e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); const t = e.target.value.trim().replace(/,$/, ""); if (t && tags.indexOf(t) < 0) { tags.push(t); tagsPaint(); changed(); } e.target.value = ""; } });
    on("#bgTags", "click", e => { const c = e.target.closest(".chip"); if (c) { tags.splice(+c.dataset.i, 1); tagsPaint(); changed(); } });
    on("#bgSave", "click", () => save(false));
    on("#bgPrev", "click", preview);
    on("#bgTrash", "click", async () => { if (!confirm("Move this post to the trash?")) return; collect(); if (cur.isNew) { cur = null; dirty = false; go("list"); return; } await setStatus(cur, "trash"); const i = posts.findIndex(x => x.id === cur.id); if (i >= 0) posts[i].status = "trash"; await writeIndex(); dirty = false; cur = null; filter = "all"; go("list"); note("Moved to trash"); });
    on("#bgColor", "input", e => exec("foreColor", e.target.value));
    on("#bgHi", "input", e => exec("hiliteColor", e.target.value));
    on("#bgSrc", "input", changed);
    $("#bgTb").addEventListener("mousedown", e => { if (e.target.closest("button")) e.preventDefault(); });
    $("#bgTb").addEventListener("click", e => { const b = e.target.closest("button[data-cmd]"); if (b) command(b.dataset.cmd); });
    $("#bgTb").addEventListener("change", e => { const s = e.target.closest("select[data-cmd]"); if (s && s.value !== "") command(s.dataset.cmd, s.value); });
    $("#bgCtx").addEventListener("mousedown", e => e.preventDefault());
    $("#bgCtx").addEventListener("click", e => { const t = e.target.closest("[data-t]"), i = e.target.closest("[data-i]"); if (t) tableOp(t.dataset.t); else if (i) imgOp(i.dataset.i); });
    ed.addEventListener("input", changed);
    ed.addEventListener("keyup", ctxUpdate); ed.addEventListener("mouseup", ctxUpdate);
    ed.addEventListener("click", e => {
      const s = e.target.closest("summary"); if (s) e.preventDefault();
      $$("figure.pbsel", ed).forEach(f => f.classList.remove("pbsel"));
      const fig = e.target.closest("figure.pb-fig"); if (fig && e.target.tagName === "IMG") { fig.classList.add("pbsel"); const r = document.createRange(); r.selectNode(e.target); const sl = getSelection(); sl.removeAllRanges(); sl.addRange(r); }
      const a = e.target.closest("a"); if (a && (e.ctrlKey || e.metaKey)) window.open(a.href, "_blank");
      ctxUpdate();
    });
    ed.addEventListener("keydown", e => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === "s") { e.preventDefault(); save(false); }
      else if ((e.ctrlKey || e.metaKey) && k === "k") { e.preventDefault(); command("link"); }
      else if (e.key === "Tab" && closest("li")) { e.preventDefault(); document.execCommand(e.shiftKey ? "outdent" : "indent"); }
    });
    ed.addEventListener("paste", e => {
      const cd = e.clipboardData; if (!cd) return;
      const imgs = Array.from(cd.files || []).filter(f => /^image\//.test(f.type)); if (imgs.length) { e.preventDefault(); imgs.forEach(uploadInsert); return; }
      const html = cd.getData("text/html"), txt = cd.getData("text/plain"); e.preventDefault();
      let out;
      if (T.looksMarkdown(txt) && (!html || !/<(h[1-6]|ul|ol|table)\b/i.test(html))) out = T.sanitize(T.md2html(txt).html);
      else if (html) out = T.sanitize(html);
      else { if (txt.indexOf("\n") < 0) { document.execCommand("insertText", false, txt); changed(); return; } out = txt.split(/\n{2,}/).map(x => "<p>" + esc(x).replace(/\n/g, "<br>") + "</p>").join(""); }
      document.execCommand("insertHTML", false, out); changed();
    });
    ed.addEventListener("dragover", e => { if (e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf("Files") >= 0) e.preventDefault(); });
    ed.addEventListener("drop", e => { const fl = Array.from(e.dataTransfer.files || []).filter(f => /^image\//.test(f.type)); if (fl.length) { e.preventDefault(); fl.forEach(uploadInsert); } });
    on("#bgRev", "click", e => { const a = e.target.closest("[data-rev]"); if (!a) return; const r = ($("#bgRev")._revs || []).find(x => x.id === a.dataset.rev); if (r && confirm("Replace the editor with this saved version? (Your current text is kept in the revision list once you save.)")) { ed.innerHTML = decorate(r.html); changed(); } });
    window.onbeforeunload = () => dirty ? "You have unsaved changes." : undefined;
    ed.focus();
  }
  function preview() {
    collect(); const w = window.open("", "_blank"); if (!w) { note("Allow pop-ups to preview"); return; }
    const th = document.documentElement.getAttribute("data-theme") || "";
    w.document.write('<!doctype html><html lang="en"' + (th ? ' data-theme="' + th + '"' : "") + '><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preview: ' + esc(cur.title) + '</title><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/blog-article.css"></head><body><main style="max-width:780px;margin:0 auto;padding:24px 16px"><p style="color:#f59e0b;font-weight:700">PREVIEW (not published)</p>' +
      "<h1>" + esc(cur.title) + '</h1><p style="color:var(--muted)">' + esc(cur.cat || "") + " · by " + esc(cur.author) + " · " + cur.mins + " min read</p>" + (cur.cover ? '<img src="' + esc(cur.cover) + '" alt="' + esc(cur.coverAlt || "") + '" style="width:100%;border-radius:12px">' : "") + '<div class="pbart">' + T.finalize(cur.html) + "</div></main></body></html>");
    w.document.close();
  }
  mount();
})();
