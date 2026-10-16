/**
 * PicksBible programmatic SEO pages.
 *
 * ONE Vercel serverless function that renders every SEO page on demand from the same Firestore
 * data the admin already writes (public/live + public/day-*). Pages are cached at Vercel's CDN
 * (s-maxage) so Firestore is barely touched. Nothing to rebuild, nothing to upload per day:
 * upload a CSV in admin and the match page, league page, date page, market hubs and sitemap
 * all exist/refresh by themselves.
 *
 * Routes (see vercel.json rewrites)
 *   /predictions/<home>-vs-<away>-prediction-<yyyy-mm-dd>   match page
 *   /leagues/<league>                                       league hub
 *   /football-predictions/<yyyy-mm-dd>                      date archive (also /basketball-predictions/<date>)
 *   /over-2-5-goals-predictions-today ... (HUBS below)      market hubs
 *   /blog/<id>                                              blog posts from data.js
 *   /sitemap-seo.xml                                        everything above
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SITE = 'https://picksbible.com';
const FS_BASE = 'https://firestore.googleapis.com/v1/projects/picksbible-7fa7f/databases/(default)/documents/public/';
const FS_KEY = 'AIzaSyBBnSFHx_z1YWwOXz6sdKOSzelTIuvusa8'; // the public web key the site already ships in app.js
const DAYS_BACK = 14;

/* ───────────── small helpers ───────────── */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = s => String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const aOrAn = w => (/^[aeiou]/i.test(String(w || '').trim()) ? 'an ' : 'a ') + w;
const ld = o => '<script type="application/ld+json">' + JSON.stringify(o).replace(/</g, '\\u003c') + '</script>';
const fmtLong = ymd => new Date(ymd + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const fmtShort = ymd => new Date(ymd + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const fmtDay = ymd => new Date(ymd + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
function watYmd(off) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date());
  const t = new Date(p + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + (off || 0)); return t.toISOString().slice(0, 10);
}
const addDays = (ymd, n) => { const t = new Date(ymd + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };

/* ───────────── Firestore (REST, public read) ───────────── */
function fsVal(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fsVal);
  if ('mapValue' in v) return fsMap(v.mapValue.fields || {});
  return null;
}
function fsMap(f) { const o = {}; Object.keys(f || {}).forEach(k => { o[k] = fsVal(f[k]); }); return o; }

async function getDoc(name) {
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 7000);
  try {
    const r = await fetch(FS_BASE + name + '?key=' + FS_KEY, { signal: ctl.signal });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('Firestore ' + r.status);
    const j = await r.json();
    return j && j.fields ? fsMap(j.fields) : null;
  } finally { clearTimeout(to); }
}

/* ───────────── static reference data (blog posts, league list) ───────────── */
function loadWindowFile(file) {
  try {
    const w = {}; w.window = w; w.self = w; // browser-style global so bare references (PB.x) work too
    try { vm.runInNewContext(fs.readFileSync(path.join(process.cwd(), file), 'utf8'), w, { timeout: 2000 }); }
    catch (e) { /* data.js ends with browser-only code (analytics); the data above it is already set */ }
    return w;
  } catch (e) { return {}; }
}
let STATIC = null;
function statics() {
  if (STATIC) return STATIC;
  const posts = ((loadWindowFile('data.js').PB || {}).posts) || [];
  const L = loadWindowFile('leagues.js').PB_LEAGUES || {};
  STATIC = { posts, leagues: L };
  return STATIC;
}

/* ───────────── league naming ───────────── */
const isContinental = c => /\(|^international$|^world$/i.test(String(c || '').trim());
function leagueInfo(country, comp, sport) {
  const c = String(country || '').replace(/\s*\(.*?\)\s*/g, '').trim();
  let name = String(comp || '').trim();
  if (c && name.toLowerCase().startsWith(c.toLowerCase() + ' ') && name.length > c.length + 1) name = name.slice(c.length).replace(/^[\s:\-\u00b7]+/, '');
  const cont = isContinental(country);
  return {
    sport, country: String(country || ''), name,
    slug: slug(cont ? name : (c + ' ' + name)),
    label: cont ? name : (c ? c + ': ' + name : name)
  };
}

/* ───────────── data layer ───────────── */
let MEM = { t: 0, data: null };
function normalise(f) {
  const sport = f.sport === 'basketball' ? 'basketball' : 'football';
  const v = (sport === 'basketball' ? f.bb : f.fb) || {};
  const k = String(f.kickoff || '');
  if (!v.live || !v.tip || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(k)) return null;
  const lg = leagueInfo(f.country, f.competition, sport);
  const o = sport === 'basketball' ? [v.o1, v.o2] : [v.o1, v.oX, v.o2];
  const spread = sport === 'basketball' ? String(v.spread || '').trim() : '';
  const tipFull = v.tip + (spread ? ' ' + spread : '');
  let tipOdds = v.tipOdds || '';
  if (!tipOdds && !spread) { const i = sport === 'basketball' ? { '1': 0, '2': 1 }[v.tip] : { '1': 0, 'X': 1, '2': 2 }[v.tip]; if (i !== undefined && o[i]) tipOdds = o[i]; }
  const m = {
    id: f.id, sport, league: lg, home: String(f.home || ''), away: String(f.away || ''),
    date: k.slice(0, 10), time: k.slice(11, 16),
    tip: String(v.tip), spread, tipFull, tipOdds: tipOdds ? String(tipOdds) : '',
    o: o.map(x => (x ? String(x) : '')), conf: String(v.conf || '').replace('%', ''),
    ou: sport === 'football' ? (v.ou || '') : '', ouOdds: v.ouOdds || '', btts: sport === 'football' ? (v.btts || '') : '', bttsOdds: v.bttsOdds || '',
    cs: sport === 'football' ? (v.cs || '') : '', totalSide: sport === 'basketball' ? (v.totalSide || '') : '', totalLine: sport === 'basketball' ? (v.totalLine || '') : '',
    score: v.score || '', st: v.st === 'won' || v.st === 'lost' ? v.st : '', sure: !!v.sure
  };
  m.slug = slug(m.home) + '-vs-' + slug(m.away) + '-prediction-' + m.date;
  m.url = '/predictions/' + m.slug;
  return m;
}

function normaliseProp(p) {
  const k = String((p && p.kickoff) || '');
  if (!p || !p.live || !/^\d{4}-\d{2}-\d{2}/.test(k)) return null;
  return {
    date: k.slice(0, 10), time: k.slice(11, 16), market: String(p.market || 'Player prop'), player: String(p.player || p.team || ''),
    team: String(p.team || ''), home: String(p.home || ''), away: String(p.away || ''), line: String(p.line || ''), side: String(p.side || ''),
    odds: p.odds ? String(p.odds) : '', st: p.st === 'won' || p.st === 'lost' ? p.st : ''
  };
}

async function loadAll() {
  if (MEM.data && Date.now() - MEM.t < 5 * 60 * 1000) return MEM.data;
  const names = ['live'];
  for (let i = 2; i <= DAYS_BACK; i++) names.push('day-' + addDays(watYmd(0), -i));
  const docs = await Promise.all(names.map((n, i) => getDoc(n).catch(e => { if (i === 0) throw e; return null; })));
  if (!docs[0]) throw new Error('live document missing');
  const seen = {}, matches = [];
  docs.forEach(d => ((d && d.fixtures) || []).forEach(f => {
    const m = normalise(f); if (!m || seen[m.slug]) return; seen[m.slug] = 1; matches.push(m);
  }));
  matches.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const pseen = {}, props = [];
  docs.forEach(d => ((d && d.props) || []).forEach(x => {
    const q = normaliseProp(x); if (!q) return; const key = [q.date, q.market, q.player, q.line, q.side].join('|'); if (pseen[key]) return; pseen[key] = 1; props.push(q);
  }));
  props.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const leagues = {};
  matches.forEach(m => { (leagues[m.league.slug] = leagues[m.league.slug] || m.league); });
  const S = statics();
  ['football', 'basketball'].forEach(sp => ((S.leagues || {})[sp] || []).forEach(g => (g.l || []).forEach(l => {
    const li = leagueInfo(g.c, l, sp); if (!leagues[li.slug]) leagues[li.slug] = li;
  })));
  MEM = { t: Date.now(), data: { matches, props, leagues, updated: new Date().toISOString() } };
  return MEM.data;
}

/* ───────────── result maths (from the full-time score) ───────────── */
function goals(score) { const m = String(score || '').match(/^\s*(\d+)\s*[-:]\s*(\d+)\s*$/); return m ? [+m[1], +m[2]] : null; }
function marketResult(m, market) {
  const g = goals(m.score);
  if (market === 'tip') return m.st || null;
  if (!g) return null;
  if (market === 'ou') return !m.ou ? null : ((m.ou === 'Over') === (g[0] + g[1] > 2.5) ? 'won' : 'lost');
  if (market === 'btts') return !m.btts ? null : ((m.btts === 'GG') === (g[0] > 0 && g[1] > 0) ? 'won' : 'lost');
  if (market === 'cs') { const c = goals(m.cs); return !c ? null : (c[0] === g[0] && c[1] === g[1] ? 'won' : 'lost'); }
  return null;
}
function record(list, market) {
  let w = 0, n = 0;
  list.forEach(m => { const r = marketResult(m, market); if (r) { n++; if (r === 'won') w++; } });
  return { won: w, total: n, pct: n ? Math.round(w * 100 / n) : 0 };
}
const recordLine = (r, what) => r.total >= 3 ? `In the last ${DAYS_BACK} days our ${what} landed ${r.won} of ${r.total} (${r.pct}%). Every result is published, wins and losses.` : '';

/* ───────────── text helpers ───────────── */
function tipText(m) {
  const h = m.home, a = m.away;
  if (m.sport === 'basketball') {
    const team = m.tip === '1' ? h : a;
    if (!m.spread) return `${team} to win the game outright`;
    const sp = parseFloat(m.spread); if (isNaN(sp)) return `${team} ${m.spread}`;
    const abs = Math.abs(sp);
    return sp < 0
      ? `${team} ${m.spread} on the spread (${team} must win by more than ${abs} points)`
      : `${team} ${m.spread} on the spread (${team} can lose by fewer than ${abs} points, or win, and the bet still wins)`;
  }
  return ({
    '1': `${h} to win`, '2': `${a} to win`, 'X': 'a draw',
    '1X': `${h} to win or draw (double chance 1X)`, 'X2': `${a} to win or draw (double chance X2)`, '12': 'either team to win, no draw (double chance 12)'
  })[m.tip] || m.tip;
}
const ouText = m => m.ou ? `${m.ou} 2.5 goals` : '';
const bttsText = m => m.btts === 'GG' ? 'Yes, both teams to score (GG)' : m.btts === 'NG' ? 'No, a team keeps a clean sheet (NG)' : '';
const sportWord = sp => sp === 'basketball' ? 'basketball' : 'football';
const confClass = c => { const n = parseFloat(c); return isNaN(n) ? '' : n < 45 ? 'lo' : n <= 55 ? 'mid' : 'hi'; };

/* ───────────── HTML building blocks ───────────── */
const CSS = `
.sp-head{background:#07051a;border-bottom:1px solid var(--line)}
.sp-head .wrap{display:flex;align-items:center;justify-content:space-between;gap:10px 18px;flex-wrap:wrap;padding-block:10px}
.sp-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--text);font:700 22px/1 var(--display)}
.sp-brand img{height:40px;width:auto;border-radius:6px}.sp-brand b{color:var(--cyan)}
.sp-nav{display:flex;gap:4px 16px;flex-wrap:wrap;font-size:14px}.sp-nav a{color:var(--text);text-decoration:none}.sp-nav a:hover{color:var(--cyan)}
main.sp{padding-block:18px 44px}
.sp-crumbs{font-size:13px;color:var(--muted);margin-bottom:8px}.sp-crumbs a{color:var(--muted)}
.sp h1{font-size:clamp(28px,5vw,44px);margin:4px 0 10px}
.sp h2{font-size:25px;margin:30px 0 10px}
.sp h3{font-size:18px;margin:16px 0 6px}
.sp p{max-width:76ch;margin:0 0 12px}
.sp-meta{color:var(--muted);font-size:13.5px}
.sp-card{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:16px}
.sp-hero{display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between}
.sp-tbl{overflow-x:auto;background:var(--panel);border:1px solid var(--line);border-radius:var(--r)}
.sp-tbl table{width:100%;border-collapse:collapse;min-width:620px}
.sp-tbl th{font:600 11px var(--body);text-transform:uppercase;letter-spacing:.06em;color:var(--muted);text-align:center;padding:9px 6px}
.sp-tbl td{padding:9px 6px;text-align:center;border-top:1px solid var(--line);font-size:14px}
.sp-tbl td.m{text-align:left;min-width:170px}.sp-tbl td.m a{color:var(--text);text-decoration:none;font-weight:600}.sp-tbl td.m a:hover{color:var(--cyan)}
.sp-tbl td.m small{color:var(--muted);margin-left:6px;font-weight:600}
.sp-tbl tr.lg td{background:var(--purple);text-align:left;font:700 15px var(--display);letter-spacing:.03em;padding:8px 12px}.sp-tbl tr.lg a{color:#fff;text-decoration:none}
.sp-tip{display:inline-flex;flex-direction:column;min-width:46px;border-radius:12px;overflow:hidden;text-align:center;font:800 14px/1.15 var(--body);background:var(--pend);color:var(--pend-ink)}
.sp-tip b{padding:5px 10px 3px;font-weight:800}.sp-tip i{font-style:normal;font-size:11px;padding:3px 8px 4px;background:#ffffff59}
.sp-tip.won{background:var(--won);color:#04220f}.sp-tip.lost{background:#8b90a3;color:#fff}
.sp-conf{display:inline-block;padding:4px 10px;border-radius:999px;font:700 13px var(--body);background:#e8f7ee;color:#14532d}
.sp-conf.mid{background:#fff6cf;color:#6b4e00}.sp-conf.lo{background:#e5e7eb;color:#374151}
.sp-res{display:inline-block;padding:3px 10px;border-radius:999px;font:700 12px var(--body)}.sp-res.won{background:var(--won);color:#04220f}.sp-res.lost{background:#8b90a3;color:#fff}
.sp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin:10px 0}
.sp-grid .sp-card b{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:4px}
.sp-links{display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0;margin:8px 0}
.sp-links a{display:inline-block;padding:6px 12px;border:1px solid var(--line);border-radius:999px;text-decoration:none;font-size:14px;background:var(--panel)}
.sp-faq details{background:var(--panel);border:1px solid var(--line);border-radius:var(--r);padding:12px 14px;margin:8px 0}.sp-faq summary{cursor:pointer;font-weight:700}
.sp-note{font-size:12.5px;color:var(--muted);margin-top:26px;max-width:80ch}
.sp-foot{border-top:1px solid var(--line);background:#07051a;padding:22px 0;color:var(--muted);font-size:13.5px}.sp-foot a{color:var(--muted)}
`;
const NAV = [['/', 'Home'], ['/predictions.html', 'Predictions'], ['/football-predictions.html', 'Football'], ['/basketball-predictions.html', 'Basketball'], ['/expert-tips.html', 'Expert Tips'], ['/blog.html', 'Blog'], ['/premium.html', 'VIP']];
const POPULAR = [
  ['/over-2-5-goals-predictions-today', 'Over 2.5 goals prediction today'], ['/btts-predictions-today', 'BTTS prediction today'], ['/correct-score-predictions-today', 'Correct score tips for today'],
  ['/double-chance-predictions-today', 'Double chance'], ['/sure-predictions-today', 'Sure prediction for today'], ['/nba-predictions-today', 'NBA picks and predictions'],
  ['/wnba-predictions-today', 'WNBA predictions'], ['/nba-player-props-today', 'NBA player props today'], ['/2-odds-predictions-today', '2 odds today'], ['/5-odds-predictions-today', '5 odds today'], ['/basketball-spread-predictions-today', 'NBA picks against the spread'], ['/football-predictions-tomorrow', 'Tomorrow']
];

function shell({ title, desc, canonical, body, schema = [], noindex = false }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(SITE + canonical)}">
<meta name="robots" content="${noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large'}">
<meta property="og:type" content="website"><meta property="og:site_name" content="PicksBible"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(SITE + canonical)}"><meta property="og:image" content="${SITE}/img/pb-logo.png">
<meta name="twitter:card" content="summary"><meta name="theme-color" content="#0b0820"><link rel="icon" href="/img/pb-logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&family=Saira+Condensed:wght@600;700&display=swap">
<link rel="stylesheet" href="/style.css"><style>${CSS}</style>
${schema.map(ld).join('\n')}
</head><body>
<header class="sp-head"><div class="wrap"><a class="sp-brand" href="/"><img src="/img/pb-logo.png" alt="PicksBible logo" width="55" height="40"><span>Picks<b>Bible</b></span></a><nav class="sp-nav" aria-label="Main">${NAV.map(n => `<a href="${n[0]}">${n[1]}</a>`).join('')}</nav></div></header>
<main class="sp wrap">${body}</main>
<footer class="sp-foot"><div class="wrap"><ul class="sp-links">${POPULAR.map(p => `<li><a href="${p[0]}">${p[1]}</a></li>`).join('')}</ul>
<p>PicksBible tips are based on statistical analysis of past events, current form and team news available when each prediction was made. No prediction is guaranteed. 18+ only, please gamble responsibly.</p>
<p>&copy; PicksBible &middot; <a href="/about.html">About</a> &middot; <a href="/contact.html">Contact</a> &middot; <a href="/legal.html">Legal</a></p></div></footer>
</body></html>`;
}

const crumbs = items => `<nav class="sp-crumbs" aria-label="Breadcrumb">${items.map((c, i) => i < items.length - 1 ? `<a href="${c[0]}">${esc(c[1])}</a> &rsaquo; ` : esc(c[1])).join('')}</nav>`;
const crumbSchema = items => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c[1], item: SITE + c[0] })) });
const faqSchema = faqs => faqs.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f[0], acceptedAnswer: { '@type': 'Answer', text: f[1] } })) } : null;
const faqHtml = faqs => faqs.length ? `<h2>Frequently asked questions</h2><div class="sp-faq">${faqs.map(f => `<details><summary>${esc(f[0])}</summary><p>${esc(f[1])}</p></details>`).join('')}</div>` : '';

const tipPill = m => `<span class="sp-tip ${m.st}"${m.st ? ` title="${m.st}"` : ''}><b>${esc(m.tipFull)}</b>${m.tipOdds ? `<i>${esc(m.tipOdds)}</i>` : ''}</span>`;
const confPill = m => m.conf ? `<span class="sp-conf ${confClass(m.conf)}">${esc(m.conf)}%</span>` : '-';
const withOdds = (label, odds) => label ? esc(label) + (odds ? ` <small style="color:var(--muted)">(${esc(odds)})</small>` : '') : '-';

function matchTable(list, sport, { showDate = false } = {}) {
  if (!list.length) return '';
  const fb = sport === 'football';
  const head = fb ? ['Time', 'Match', '1', 'X', '2', 'Tip', 'Conf.', 'Over/Under 2.5', 'BTTS', 'CS'] : ['Time', 'Match', '1', '2', 'Tip', 'Conf.', 'Total'];
  let last = '', rows = '';
  list.forEach(m => {
    if (m.league.slug !== last) { last = m.league.slug; rows += `<tr class="lg"><td colspan="${head.length}"><a href="/leagues/${m.league.slug}">${esc(m.league.label)}</a></td></tr>`; }
    const g = goals(m.score);
    const sc = g ? `<small>${g[0]}-${g[1]}</small>` : '';
    const t = (showDate ? fmtDay(m.date) + ' ' : '') + esc(m.time);
    rows += `<tr><td>${t}</td><td class="m"><a href="${m.url}">${esc(m.home)} vs ${esc(m.away)}</a>${sc}</td>` +
      (fb ? `<td>${esc(m.o[0] || '-')}</td><td>${esc(m.o[1] || '-')}</td><td>${esc(m.o[2] || '-')}</td>` : `<td>${esc(m.o[0] || '-')}</td><td>${esc(m.o[1] || '-')}</td>`) +
      `<td>${tipPill(m)}</td><td>${confPill(m)}</td>` +
      (fb ? `<td>${withOdds(m.ou ? m.ou + ' 2.5' : '', m.ouOdds)}</td><td>${withOdds(m.btts, m.bttsOdds)}</td><td>${esc(m.cs || '-')}</td>`
          : `<td>${m.totalSide ? esc(m.totalSide + ' ' + m.totalLine) : '-'}</td>`) + '</tr>';
  });
  return `<div class="sp-tbl"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

const moreLinks = (arr, label) => `<h2>${esc(label)}</h2><ul class="sp-links">${arr.map(a => `<li><a href="${a[0]}">${esc(a[1])}</a></li>`).join('')}</ul>`;
const updatedLine = d => `<p class="sp-meta">Updated ${esc(new Date(d.updated).toUTCString().replace(' GMT', ' UTC'))}. Odds were taken at the time of upload and can change. Kick-off times are shown in West Africa Time (WAT, UTC+1).</p>`;

/* ───────────── page: match ───────────── */
function matchPage(m, D) {
  const fb = m.sport === 'football';
  const L = m.league;
  const title = `${m.home} vs ${m.away} Prediction & Tips - ${fmtShort(m.date)} | PicksBible`;
  const g = goals(m.score);
  const pick = tipText(m);
  const odds = m.tipOdds ? ` at odds of ${m.tipOdds}` : '';
  const confS = m.conf ? ` with a confidence rating of ${m.conf}%` : '';
  const desc = `${m.home} vs ${m.away} prediction (${L.label}, ${fmtShort(m.date)}): our tip is ${pick}${odds}${confS}. Odds, markets and result.`.slice(0, 300);

  const faqs = [];
  faqs.push([`What is the prediction for ${m.home} vs ${m.away}?`, `Our prediction for ${m.home} vs ${m.away} on ${fmtLong(m.date)} is ${pick}${odds}${confS}.`]);
  if (fb && (m.o[0] || m.o[1] || m.o[2])) faqs.push([`What are the odds for ${m.home} vs ${m.away}?`, `At the time of our prediction the 1X2 odds were ${m.home} ${m.o[0] || '-'}, draw ${m.o[1] || '-'}, ${m.away} ${m.o[2] || '-'}.`]);
  if (!fb && (m.o[0] || m.o[1])) faqs.push([`What are the odds for ${m.home} vs ${m.away}?`, `At the time of our prediction the moneyline odds were ${m.home} ${m.o[0] || '-'} and ${m.away} ${m.o[1] || '-'}.`]);
  if (fb && m.btts) faqs.push([`Will both teams score in ${m.home} vs ${m.away}?`, `${bttsText(m)}${m.bttsOdds ? ' at odds of ' + m.bttsOdds : ''}.`]);
  if (fb && m.ou) faqs.push([`Will there be over 2.5 goals in ${m.home} vs ${m.away}?`, `Our pick is ${ouText(m)}${m.ouOdds ? ' at odds of ' + m.ouOdds : ''}.`]);
  if (fb && m.cs) faqs.push([`What is the correct score prediction for ${m.home} vs ${m.away}?`, `Our correct score tip is ${m.cs}. Correct score is a high-risk market, so treat it as a fun extra rather than a banker.`]);
  if (!fb && m.totalSide) faqs.push([`What is the total points pick for ${m.home} vs ${m.away}?`, `Our total points pick is ${m.totalSide} ${m.totalLine}.`]);
  if (!fb && m.spread) faqs.push([`What does the tip "${m.tipFull}" mean?`, `It is a point-spread tip: ${pick}.`]);
  if (fb && ['1X', 'X2', '12'].includes(m.tip)) faqs.push([`What does the tip "${m.tip}" mean?`, `${m.tip} is a double chance bet covering two of the three results: ${pick}.`]);

  const same = D.matches.filter(x => x.league.slug === L.slug && x.date === m.date && x.slug !== m.slug).slice(0, 8);
  const resultBlock = g
    ? `<div class="sp-card"><b>Result</b><p style="margin:6px 0 0"><strong>${esc(m.home)} ${g[0]}-${g[1]} ${esc(m.away)}</strong> &middot; our tip <span class="sp-res ${m.st || ''}">${m.st === 'won' ? 'WON' : m.st === 'lost' ? 'LOST' : 'settled'}</span></p></div>` : '';

  const cards = [`<div class="sp-card"><b>Our tip</b>${tipPill(m)}</div>`];
  if (m.conf) cards.push(`<div class="sp-card"><b>Confidence</b>${confPill(m)}</div>`);
  if (fb) {
    cards.push(`<div class="sp-card"><b>1X2 odds</b>${esc(m.home)} ${esc(m.o[0] || '-')} &middot; Draw ${esc(m.o[1] || '-')} &middot; ${esc(m.away)} ${esc(m.o[2] || '-')}</div>`);
    if (m.ou) cards.push(`<div class="sp-card"><b>Over / Under</b>${withOdds(ouText(m), m.ouOdds)}</div>`);
    if (m.btts) cards.push(`<div class="sp-card"><b>Both teams to score</b>${withOdds(m.btts, m.bttsOdds)}</div>`);
    if (m.cs) cards.push(`<div class="sp-card"><b>Correct score tip</b>${esc(m.cs)}</div>`);
  } else {
    cards.push(`<div class="sp-card"><b>Moneyline odds</b>${esc(m.home)} ${esc(m.o[0] || '-')} &middot; ${esc(m.away)} ${esc(m.o[1] || '-')}</div>`);
    if (m.totalSide) cards.push(`<div class="sp-card"><b>Total points</b>${esc(m.totalSide + ' ' + m.totalLine)}</div>`);
  }

  const cr = [['/', 'Home'], [fb ? '/football-predictions.html' : '/basketball-predictions.html', fb ? 'Football predictions' : 'Basketball predictions'], ['/leagues/' + L.slug, L.name], [m.url, `${m.home} vs ${m.away}`]];
  const body = crumbs(cr) +
    `<h1>${esc(m.home)} vs ${esc(m.away)} Prediction &amp; Tips</h1>` +
    `<p class="sp-meta">${esc(L.label)} &middot; ${esc(fmtLong(m.date))} &middot; ${esc(m.time)} WAT</p>` +
    `<p>Our pick for <strong>${esc(m.home)} vs ${esc(m.away)}</strong> in the ${esc(L.label)} on ${esc(fmtLong(m.date))} is <strong>${esc(pick)}</strong>${esc(odds)}${esc(confS)}.</p>` +
    resultBlock + `<div class="sp-grid">${cards.join('')}</div>` +
    `<h2>${esc(m.home)} vs ${esc(m.away)} betting tips explained</h2>` +
    `<p>${esc(m.tipFull)} means ${esc(pick)}.${fb && m.tipOdds ? ' The price shown is the bookmaker odds when we posted the tip, so always check the live price before you bet.' : ''}${!fb && m.spread ? ' A spread tip is not the same as backing the team to win: it only needs the team to beat the handicap.' : ''}</p>` +
    (same.length ? `<h2>More ${esc(L.name)} predictions for ${esc(fmtShort(m.date))}</h2>${matchTable([m, ...same], m.sport)}` : '') +
    faqHtml(faqs) +
    moreLinks([['/leagues/' + L.slug, `${L.name} predictions`], [`/${sportWord(m.sport)}-predictions/${m.date}`, `All ${sportWord(m.sport)} predictions for ${fmtShort(m.date)}`], ...(fb ? [['/btts-predictions-today', 'BTTS tips today'], ['/over-2-5-goals-predictions-today', 'Over 2.5 goals tips']] : [['/nba-predictions-today', 'NBA predictions today'], ['/basketball-spread-predictions-today', 'Basketball spread picks']])], 'Keep exploring') +
    updatedLine(D) + '<p class="sp-note">Betting involves risk. Only stake what you can afford to lose. 18+.</p>';

  const start = `${m.date}T${m.time}:00+01:00`;
  const schema = [
    crumbSchema(cr),
    { '@context': 'https://schema.org', '@type': 'SportsEvent', name: `${m.home} vs ${m.away}`, sport: fb ? 'Soccer' : 'Basketball', startDate: start, eventStatus: 'https://schema.org/EventScheduled', description: `${L.label}: ${m.home} vs ${m.away}`, homeTeam: { '@type': 'SportsTeam', name: m.home }, awayTeam: { '@type': 'SportsTeam', name: m.away }, url: SITE + m.url, location: { '@type': 'Place', name: L.label } },
    faqSchema(faqs)
  ].filter(Boolean);
  return shell({ title, desc, canonical: m.url, body, schema });
}

/* ───────────── page: league hub ───────────── */
function leaguePage(L, D) {
  const mine = D.matches.filter(m => m.league.slug === L.slug);
  const today = watYmd(0);
  const upcoming = mine.filter(m => m.date >= today);
  const past = mine.filter(m => m.date < today).reverse().slice(0, 20).reverse();
  const sport = L.sport || (mine[0] && mine[0].sport) || 'football';
  const rec = record(mine.filter(m => m.date < today), 'tip');
  const epl = L.slug === 'england-premier-league';
  const title = epl ? 'EPL Predictions Today - Premier League Tips | PicksBible' : `${L.name} Predictions Today & Tips${isContinental(L.country) || !L.country ? '' : ' (' + L.country + ')'} | PicksBible`;
  const desc = epl ? 'EPL predictions today: free Premier League tips with odds and confidence ratings, plus recent results. Updated daily by PicksBible.' : `${L.label} predictions and betting tips: today's picks with odds and confidence ratings, plus recent results. Updated daily by PicksBible.`;
  const faqs = [[`Who is predicted to win in the ${L.name} today?`, upcoming.length ? upcoming.slice(0, 5).map(m => `${m.home} vs ${m.away}: ${tipText(m)}`).join('. ') + '.' : `We have not posted ${L.name} picks yet. New predictions are added before each matchday.`],
    [`How accurate are PicksBible ${L.name} predictions?`, rec.total >= 3 ? `In the last ${DAYS_BACK} days our ${L.name} tips landed ${rec.won} of ${rec.total} (${rec.pct}%). We publish every result.` : `We publish every result, wins and losses, so you can judge the record yourself.`]];
  const cr = [['/', 'Home'], [sport === 'basketball' ? '/basketball-predictions.html' : '/football-predictions.html', sport === 'basketball' ? 'Basketball predictions' : 'Football predictions'], ['/leagues/' + L.slug, L.name]];
  const body = crumbs(cr) + `<h1>${epl ? 'EPL Predictions Today' : esc(L.name) + ' Predictions Today'}</h1><p class="sp-meta">${esc(L.label)}</p>` +
    `<p>Free ${esc(L.label)} predictions from PicksBible: every pick shows the tip, the bookmaker odds at the time we posted it and our confidence rating. ${esc(recordLine(rec, L.name + ' tips'))}</p>` +
    (upcoming.length ? `<h2>${esc(L.name)} predictions: today and upcoming</h2>${matchTable(upcoming, sport, { showDate: true })}` : `<p class="sp-card">No ${esc(L.name)} predictions are posted right now. New picks are added before each matchday, so check back soon or browse <a href="${sport === 'basketball' ? '/basketball-predictions.html' : '/football-predictions.html'}">all ${sportWord(sport)} predictions</a>.</p>`) +
    (past.length ? `<h2>Recent ${esc(L.name)} results</h2>${matchTable(past, sport, { showDate: true })}` : '') +
    faqHtml(faqs) + moreLinks(POPULAR.map(p => [p[0], p[1]]), 'More prediction pages') + updatedLine(D);
  return shell({ title, desc, canonical: '/leagues/' + L.slug, body, schema: [crumbSchema(cr), faqSchema(faqs)].filter(Boolean), noindex: !mine.length });
}

/* ───────────── page: date archive ───────────── */
function datePage(sport, date, D) {
  const list = D.matches.filter(m => m.sport === sport && m.date === date);
  if (!list.length) return null;
  const word = sportWord(sport), Word = word[0].toUpperCase() + word.slice(1);
  const title = `${Word} Predictions for ${fmtLong(date)} | PicksBible`;
  const desc = `All ${word} predictions and betting tips for ${fmtLong(date)}: ${list.length} matches with tips, odds and confidence ratings.`;
  const dates = [...new Set(D.matches.filter(m => m.sport === sport).map(m => m.date))].sort();
  const i = dates.indexOf(date), prev = dates[i - 1], next = dates[i + 1];
  const rec = record(list, 'tip');
  const cr = [['/', 'Home'], [`/${word}-predictions.html`, `${Word} predictions`], [`/${word}-predictions/${date}`, fmtShort(date)]];
  const body = crumbs(cr) + `<h1>${Word} Predictions for ${esc(fmtLong(date))}</h1>` +
    `<p>${list.length} ${word} predictions for ${esc(fmtLong(date))}, with tips, odds and confidence ratings. ${rec.total ? `Our tips on this day went ${rec.won} for ${rec.total}.` : ''}</p>` +
    matchTable(list, sport) +
    `<ul class="sp-links">${prev ? `<li><a href="/${word}-predictions/${prev}">&larr; ${esc(fmtDay(prev))}</a></li>` : ''}${next ? `<li><a href="/${word}-predictions/${next}">${esc(fmtDay(next))} &rarr;</a></li>` : ''}</ul>` +
    moreLinks(POPULAR.map(p => [p[0], p[1]]), 'More prediction pages') + updatedLine(D);
  return shell({ title, desc, canonical: `/${word}-predictions/${date}`, body, schema: [crumbSchema(cr)] });
}

/* ───────────── market hubs ───────────── */
const HUBS = {
  'over-2-5-goals-predictions-today': {
    sport: 'football', market: 'ou', filter: m => m.ou === 'Over', label: 'over 2.5 goals picks',
    title: 'Over 2.5 Goals Prediction Today - Free Over 2.5 Tips', h1: 'Over 2.5 Goals Prediction Today',
    intro: 'Over 2.5 goals prediction today: matches where we expect three or more goals, with bookmaker odds and a confidence rating for each pick.',
    explain: ['Over 2.5 goals wins when the match finishes with three or more goals in total (for example 2-1, 3-0 or 2-2). It is one of the most popular football markets because it does not depend on who wins.', 'We look at how often each team scores and concedes, recent form, head-to-head scorelines and team news. Matches between attackers with leaky defences get our highest confidence.'],
    faq: [['What does over 2.5 goals mean?', 'It means the match must have at least three goals in total for the bet to win. A 2-0 win loses the bet, a 2-1 win wins it.'], ['Are over 2.5 goals tips safe?', 'No tip is guaranteed. Check the confidence rating and the odds, and never stake more than you can afford to lose.']]
  },
  'under-2-5-goals-predictions-today': {
    sport: 'football', market: 'ou', filter: m => m.ou === 'Under', label: 'under 2.5 goals picks',
    title: 'Under 2.5 Goals Predictions Today - Free Tips', h1: 'Under 2.5 Goals Predictions Today',
    intro: 'Today\'s under 2.5 goals predictions: tight, low-scoring games where we expect two goals or fewer.',
    explain: ['Under 2.5 goals wins when the match ends with two goals or fewer in total (0-0, 1-0, 1-1, 2-0). It suits cagey fixtures between solid defences or teams with little to play for.'],
    faq: [['What does under 2.5 goals mean?', 'The bet wins if the match has zero, one or two goals in total, and loses at three or more.']]
  },
  'btts-predictions-today': {
    sport: 'football', market: 'btts', filter: m => !!m.btts, label: 'BTTS picks',
    title: 'BTTS Prediction Today - Both Teams To Score Tips', h1: 'BTTS Prediction Today',
    intro: 'BTTS prediction today and BTTS and win predictions today (both teams to score): GG picks where we expect each side to find the net, and NG picks where one team is likely to be kept out.',
    explain: ['BTTS, also called GG (goal-goal), wins if both teams score at least once, whatever the final result. NG (no goal) wins if at least one team fails to score.', 'We rate each side on goals scored and conceded, clean-sheet rate and injuries to key attackers or defenders before choosing GG or NG.'],
    faq: [['What does GG mean in football betting?', 'GG means both teams to score. NG means at least one team does not score.'], ['Does BTTS depend on who wins?', 'No. A 1-1 draw, a 3-2 win or a 2-1 loss all count as both teams scoring.']]
  },
  'correct-score-predictions-today': {
    sport: 'football', market: 'cs', filter: m => !!m.cs, label: 'correct score tips',
    title: 'Correct Score Prediction Today - Free Correct Score Tips', h1: 'Correct Score Prediction Today',
    intro: 'Correct score tips for today from PicksBible: today\'s correct score prediction for every featured match. Correct score is a high-risk, high-reward market, so we publish our record openly.',
    explain: ['A correct score bet wins only if you predict the exact final score. Because there are so many possible scorelines, odds are high and the hit rate is low.', 'Treat correct score tips as small, fun stakes rather than the core of your betting.'],
    faq: [['How accurate are correct score predictions?', 'Even the best correct score tipsters hit a minority of picks. Check our published record above and stake small.']]
  },
  'double-chance-predictions-today': {
    sport: 'football', market: 'tip', filter: m => ['1X', 'X2', '12'].includes(m.tip), label: 'double chance tips',
    title: 'Double Chance Predictions Today - 1X, X2, 12 Tips', h1: 'Double Chance Predictions Today',
    intro: 'Today\'s double chance predictions: 1X, X2 and 12 tips that cover two of the three possible results.',
    explain: ['Double chance covers two outcomes in one bet. 1X means the home team wins or draws, X2 means the away team wins or draws, and 12 means either team wins (no draw).', 'Because two results are covered, odds are shorter than a straight win bet, which makes double chance a popular lower-risk choice for accumulators.'],
    faq: [['What is the difference between 1X, X2 and 12?', '1X = home win or draw. X2 = draw or away win. 12 = home win or away win.']]
  },
  'sure-predictions-today': {
    sport: 'football', market: 'tip', filter: m => m.sure, label: 'sure predictions',
    title: 'Sure Prediction for Today - Banker Bet of the Day', h1: 'Sure Prediction for Today',
    intro: 'Sure prediction for today and the banker bet of the day: the matches our analysts rate as the strongest on the card, with no fixed games and no guarantees.',
    explain: ['Sure predictions are the handful of picks our analysts rate highest each day. No result is ever guaranteed, so we show our results openly.'],
    faq: [['Are sure predictions guaranteed to win?', 'No. Nothing in sport is guaranteed. "Sure" means the tip our analysts rate as strongest, not a certainty.']]
  },
  'football-predictions-tomorrow': {
    sport: 'football', market: 'tip', filter: () => true, dayOffset: 1, label: 'football tips',
    title: 'Football Predictions Tomorrow - Free Soccer Tips', h1: 'Football Predictions Tomorrow',
    intro: 'Tomorrow\'s football predictions: tips, odds and confidence ratings for the next matchday.',
    explain: ['Predictions for tomorrow are posted as soon as our analysts finish their research. Odds can move, so check the live price before betting.'],
    faq: [['When are tomorrow\'s football predictions posted?', 'Usually the evening before. Check back if the list below is empty.']]
  },
  'basketball-predictions-tomorrow': {
    sport: 'basketball', market: 'tip', filter: () => true, dayOffset: 1, label: 'basketball tips',
    title: 'Basketball Predictions Tomorrow - NBA & More', h1: 'Basketball Predictions Tomorrow',
    intro: 'Tomorrow\'s basketball predictions: moneyline, spread and totals picks with odds and confidence ratings.',
    explain: ['Basketball tips include straight wins and point-spread picks. A tip like "2 +9.5" means the away team can lose by up to nine points and the bet still wins.'],
    faq: [['What does a tip like "1 -6.5" mean?', 'It means the home team must win by more than 6.5 points (seven or more) for the bet to win.']]
  },
  'nba-predictions-today': {
    sport: 'basketball', market: 'tip', filter: m => m.league.name === 'NBA', label: 'NBA picks',
    title: 'NBA Predictions Today - NBA Picks and Predictions', h1: 'NBA Predictions Today',
    intro: 'NBA picks and predictions today, including our NBA computer picks today: point-spread and moneyline picks with odds and confidence ratings.',
    explain: ['Our NBA tips cover straight wins and spread bets. A spread tip such as "1 -6.5" needs the home team to win by seven or more; "2 +9.5" lets the away team lose by up to nine and still cash.', 'We weigh rest days, injuries, home/away splits and recent scoring trends before every pick.'],
    faq: [['How do NBA spread picks work?', 'A negative spread means the team must win by more than that number. A positive spread means the team can lose by less than that number, or win.']]
  },
  'wnba-predictions-today': {
    sport: 'basketball', market: 'tip', filter: m => m.league.name === 'WNBA', label: 'WNBA picks',
    title: 'WNBA Predictions Today - Picks Against the Spread', h1: 'WNBA Predictions Today',
    intro: 'WNBA predictions today and WNBA best bets today: spread and moneyline picks with odds and confidence ratings.',
    explain: ['WNBA games are often decided by a handful of possessions, so the spread is a key market. We publish both straight-win and spread tips with the odds at posting time.'],
    faq: [['Where can I find WNBA predictions today?', 'Right here. Picks are posted before tip-off with odds and a confidence rating.']]
  },
  'basketball-spread-predictions-today': {
    sport: 'basketball', market: 'tip', filter: m => !!m.spread, label: 'spread picks',
    title: 'NBA Picks Against the Spread - Basketball Spread Predictions', h1: 'Basketball Spread Predictions Today',
    intro: 'NBA picks against the spread and NBA spread predictions today, plus every other basketball point-spread pick. A spread pick is not about who wins, it is about covering the handicap.',
    explain: ['With a negative spread (for example -6.5) the team must win by more than that margin. With a positive spread (+9.5) the team can lose by fewer than 9.5 points, or win, and the bet still wins.', 'That is how a heavy underdog can still be a winning tip, and how a big favourite can lose the bet while winning the game.'],
    faq: [['Can a spread bet win if my team loses?', 'Yes. With a positive spread, losing by fewer points than the spread still wins the bet.']]
  },
  'basketball-over-under-predictions-today': {
    sport: 'basketball', market: 'tip', filter: m => !!m.totalSide, label: 'total points picks',
    title: 'NBA Over Under Picks - Basketball Totals Predictions Today', h1: 'Basketball Over/Under Predictions Today',
    intro: 'NBA over under picks and NBA over under predictions today: basketball totals predictions, over/under picks on the combined points in each game.',
    explain: ['A totals bet is on the combined score of both teams. Over wins if the total points exceed the line, under wins if they fall short. Pace, defence and injuries drive our totals picks.'],
    faq: [['What does over 222.5 points mean?', 'The two teams must score 223 or more points combined for the over to win.']]
  }
};

function pickDate(list, today, forced) {  // list items only need a .date
  if (forced) return forced;
  if (list.some(m => m.date === today)) return today;
  const fut = list.filter(m => m.date > today).map(m => m.date).sort()[0];
  if (fut) return fut;
  const past = list.map(m => m.date).sort().pop();
  return past || today;
}

function hubPage(key, D) {
  const H = HUBS[key]; if (!H) return null;
  const today = watYmd(0);
  const pool = D.matches.filter(m => m.sport === H.sport && H.filter(m));
  const date = pickDate(pool, today, H.dayOffset ? watYmd(H.dayOffset) : null);
  const list = pool.filter(m => m.date === date);
  const rec = record(pool.filter(m => m.date < today), H.market);
  const stale = date !== today && !H.dayOffset;
  const desc = H.intro.slice(0, 200) + (list.length ? ` ${list.length} picks for ${fmtShort(date)}.` : '');
  const cr = [['/', 'Home'], ['/' + key, H.h1]];
  const body = crumbs(cr) + `<h1>${esc(H.h1)}</h1>` +
    `<p>${esc(H.intro)}</p>` +
    (list.length
      ? (stale ? `<p class="sp-card">We have no ${esc(H.label)} for today yet, so this is the latest list: <strong>${esc(fmtLong(date))}</strong>.</p>` : `<p class="sp-meta">${esc(fmtLong(date))}</p>`) + matchTable(list, H.sport)
      : `<p class="sp-card">No ${esc(H.label)} are posted yet. Picks are added before each matchday, so check back soon or browse <a href="/${sportWord(H.sport)}-predictions.html">all ${sportWord(H.sport)} predictions</a>.</p>`) +
    (recordLine(rec, H.label) ? `<p>${esc(recordLine(rec, H.label))}</p>` : '') +
    `<h2>How ${esc(H.label)} work</h2>${H.explain.map(p => `<p>${esc(p)}</p>`).join('')}` +
    faqHtml(H.faq) + moreLinks(POPULAR.filter(p => p[0] !== '/' + key), 'More prediction pages') + updatedLine(D);
  return shell({ title: H.title + ' | PicksBible', desc, canonical: '/' + key, body, schema: [crumbSchema(cr), faqSchema(H.faq)].filter(Boolean), noindex: !pool.length });
}

/* ───────────── "N odds" slips, built automatically from the day's tips ───────────── */
const SLIPS = { '2-odds-predictions-today': 2, '3-odds-predictions-today': 3, '5-odds-predictions-today': 5, '10-odds-predictions-today': 10 };
function buildSlip(list, target) {
  const c = list.filter(m => m.sport === 'football' && parseFloat(m.tipOdds) > 1)
    .sort((a, b) => (parseFloat(b.conf) || 0) - (parseFloat(a.conf) || 0) || parseFloat(a.tipOdds) - parseFloat(b.tipOdds));
  const legs = []; let prod = 1;
  for (const m of c) {
    const o = parseFloat(m.tipOdds);
    if (prod * o > target * 1.4) continue;
    legs.push(m); prod *= o;
    if (prod >= target * 0.95 || legs.length >= 8) break;
  }
  if (legs.length < 2 || prod < target * 0.9) return null;
  const st = legs.every(l => l.st === 'won') ? 'won' : legs.some(l => l.st === 'lost') ? 'lost' : '';
  return { legs, total: prod, st };
}
function slipPage(key, D) {
  const target = SLIPS[key], today = watYmd(0);
  const pool = D.matches.filter(m => m.sport === 'football' && parseFloat(m.tipOdds) > 1);
  const date = pickDate(pool, today);
  const slip = buildSlip(pool.filter(m => m.date === date), target);
  let w = 0, n = 0;
  [...new Set(pool.filter(m => m.date < today).map(m => m.date))].forEach(d => { const sl = buildSlip(pool.filter(m => m.date === d), target); if (sl && sl.st) { n++; if (sl.st === 'won') w++; } });
  const faqs = [[`What are ${target} odds predictions?`, `A ${target} odds prediction is a short accumulator: several tips whose odds multiply to about ${target}. Every leg must win for the slip to win.`],
    [`Are ${target} odds predictions guaranteed?`, 'No. Each extra leg adds risk. We publish whether every slip won or lost.']];
  const cr = [['/', 'Home'], ['/' + key, `${target} odds predictions`]];
  const body = crumbs(cr) + `<h1>${target} Odds Predictions Today</h1>` +
    `<p>Today's ${target} odds slip, built automatically from our highest-confidence football tips. Combined odds multiply across the legs below.</p>` +
    (slip
      ? `<p class="sp-meta">${esc(fmtLong(date))}${date !== today ? ' (latest slip, today\'s is not ready yet)' : ''}</p><div class="sp-tbl"><table><thead><tr><th>Time</th><th>Match</th><th>Tip</th><th>Conf.</th></tr></thead><tbody>${slip.legs.map(m => `<tr><td>${esc(m.time)}</td><td class="m"><a href="${m.url}">${esc(m.home)} vs ${esc(m.away)}</a><small>${esc(m.league.name)}</small></td><td>${tipPill(m)}</td><td>${confPill(m)}</td></tr>`).join('')}<tr><td colspan="2" class="m"><strong>Total odds</strong></td><td colspan="2"><strong>${slip.total.toFixed(2)}</strong>${slip.st ? ` <span class="sp-res ${slip.st}">${slip.st === 'won' ? 'WON' : 'LOST'}</span>` : ''}</td></tr></tbody></table></div><p class="sp-meta">A stake of 100 at these odds would return about ${Math.round(slip.total * 100)} if every leg wins.</p>`
      : `<p class="sp-card">There are not enough priced tips yet to build a ${target} odds slip. Check back once today's picks are posted, or browse <a href="/football-predictions.html">all football predictions</a>.</p>`) +
    (n >= 3 ? `<p>In the last ${DAYS_BACK} days our ${target} odds slips won ${w} of ${n}. Every result is published.</p>` : '') +
    '<h2>How the slip is built</h2><p>We take the day\'s football tips with bookmaker odds, rank them by our confidence rating and add legs until the combined odds reach the target. Higher confidence picks go in first.</p>' +
    faqHtml(faqs) + moreLinks(POPULAR.filter(p => p[0] !== '/' + key), 'More prediction pages') + updatedLine(D);
  return shell({ title: `${target} Odds Predictions Today - Free Accumulator Tips | PicksBible`, desc: `Today's ${target} odds football predictions: an accumulator built from our highest-confidence tips, with every leg, odds and result.`, canonical: '/' + key, body, schema: [crumbSchema(cr), faqSchema(faqs)].filter(Boolean), noindex: !slip });
}

/* ───────────── NBA / basketball player props hub ───────────── */
function propsPage(D) {
  const today = watYmd(0), key = 'nba-player-props-today';
  const date = pickDate(D.props, today);
  const list = D.props.filter(x => x.date === date);
  const settled = D.props.filter(x => x.date < today && x.st);
  const won = settled.filter(x => x.st === 'won').length;
  const faqs = [['What are player props?', 'Player props are bets on one player\'s statistics in a game, such as points, rebounds or assists, instead of on the final result. If the player does not play, most bookmakers void the bet.'],
    ['What does Over 24.5 points mean?', 'The player must score 25 or more points for the over to win. Under wins if he scores 24 or fewer.']];
  let rows = '', last = '';
  list.forEach(x => {
    if (x.market !== last) { last = x.market; rows += `<tr class="lg"><td colspan="5">${esc(x.market)}</td></tr>`; }
    rows += `<tr><td class="m"><strong>${esc(x.player)}</strong>${x.team && x.team !== x.player ? `<small>${esc(x.team)}</small>` : ''}</td><td>${esc(x.home && x.away ? x.home + ' vs ' + x.away : '-')}</td><td>${esc(x.line || '-')}</td><td><span class="sp-tip ${x.st}"><b>${esc(x.side || '-')}</b>${x.odds ? `<i>${esc(x.odds)}</i>` : ''}</span></td><td>${x.st ? `<span class="sp-res ${x.st}">${x.st === 'won' ? 'WON' : 'LOST'}</span>` : '-'}</td></tr>`;
  });
  const stale = date !== today;
  const cr = [['/', 'Home'], ['/' + key, 'NBA player props today']];
  const body = crumbs(cr) + '<h1>NBA Player Props Today</h1>' +
    '<p>NBA player props today and NBA player props predictions today: our best basketball player prop bets of the day, with player point totals, rebounds, assists and more, each with the line, the pick and the bookmaker odds when we posted it.</p>' +
    (list.length
      ? (stale ? `<p class="sp-card">No props are posted for today yet, so this is the latest list: <strong>${esc(fmtLong(date))}</strong>.</p>` : `<p class="sp-meta">${esc(fmtLong(date))}</p>`) +
        `<div class="sp-tbl"><table><thead><tr><th style="text-align:left">Player</th><th>Match</th><th>Line</th><th>Pick</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table></div>`
      : '<p class="sp-card">No player props are posted yet. Props are added before tip-off, so check back soon.</p>') +
    (settled.length >= 3 ? `<p>In the last ${DAYS_BACK} days our player props landed ${won} of ${settled.length} (${Math.round(won * 100 / settled.length)}%). Every result is published.</p>` : '') +
    '<h2>How player props work</h2><p>A player prop is a bet on a single player\'s stat line. You pick over or under a number set by the bookmaker, for example over 24.5 points. We look at minutes, usage, matchup, pace and injuries before posting a prop.</p>' +
    faqHtml(faqs) + moreLinks(POPULAR.filter(p => p[0] !== '/' + key), 'More prediction pages') + updatedLine(D);
  return shell({ title: 'NBA Player Props Today - Best Player Prop Bets | PicksBible', desc: 'NBA player props today and NBA player point totals today: points, rebounds and assists picks with lines and odds, plus our published results.', canonical: '/' + key, body, schema: [crumbSchema(cr), faqSchema(faqs)].filter(Boolean), noindex: !D.props.length });
}

/* ───────────── blog ───────────── */
function blogPage(id) {
  const p = statics().posts.find(x => x.id === id); if (!p) return null;
  const iso = (() => { const d = new Date(p.date + ' 12:00 UTC'); return isNaN(d) ? undefined : d.toISOString(); })();
  const cat = String(p.cat || '').toLowerCase();
  const rel = cat === 'basketball' ? [['/nba-predictions-today', 'NBA predictions today'], ['/basketball-spread-predictions-today', 'Basketball spread picks'], ['/basketball-predictions.html', 'All basketball predictions']] : [['/btts-predictions-today', 'BTTS tips today'], ['/over-2-5-goals-predictions-today', 'Over 2.5 goals tips'], ['/football-predictions.html', 'All football predictions']];
  const cr = [['/', 'Home'], ['/blog.html', 'Blog'], ['/blog/' + p.id, p.title]];
  const body = crumbs(cr) + `<h1>${esc(p.title)}</h1><p class="sp-meta">${esc(p.cat || '')} &middot; ${esc(p.date || '')}</p>` +
    (p.body || []).map(t => `<p>${esc(t)}</p>`).join('') + moreLinks(rel, 'Put it into practice') + '<p class="sp-note">Betting involves risk. 18+.</p>';
  return shell({
    title: `${p.title} | PicksBible`, desc: String(p.excerpt || (p.body || [])[0] || '').slice(0, 300), canonical: '/blog/' + p.id, body,
    schema: [crumbSchema(cr), { '@context': 'https://schema.org', '@type': 'Article', headline: p.title, datePublished: iso, dateModified: iso, author: { '@type': 'Organization', name: 'PicksBible' }, publisher: { '@type': 'Organization', name: 'PicksBible', logo: { '@type': 'ImageObject', url: SITE + '/img/pb-logo.png' } }, mainEntityOfPage: SITE + '/blog/' + p.id }]
  });
}

/* ───────────── sitemap ───────────── */
function sitemap(D) {
  const today = watYmd(0), urls = [];
  const add = (loc, lastmod, pr) => urls.push(`<url><loc>${SITE}${esc(loc)}</loc><lastmod>${lastmod}</lastmod>${pr ? `<priority>${pr}</priority>` : ''}</url>`);
  Object.keys(HUBS).forEach(k => { if (D.matches.some(m => m.sport === HUBS[k].sport && HUBS[k].filter(m))) add('/' + k, today, '0.9'); });
  if (D.props.length) add('/nba-player-props-today', today, '0.9');
  const priced = D.matches.filter(m => m.sport === 'football' && parseFloat(m.tipOdds) > 1), pd = pickDate(priced, today);
  Object.keys(SLIPS).forEach(k => { if (buildSlip(priced.filter(m => m.date === pd), SLIPS[k])) add('/' + k, today, '0.9'); });
  const bySlug = {};
  D.matches.forEach(m => { (bySlug[m.league.slug] = bySlug[m.league.slug] || []).push(m.date); });
  Object.keys(bySlug).forEach(s => add('/leagues/' + s, bySlug[s].sort().pop(), '0.8'));
  const seen = {};
  D.matches.forEach(m => { const k = m.sport + m.date; if (!seen[k]) { seen[k] = 1; add(`/${sportWord(m.sport)}-predictions/${m.date}`, m.date, '0.6'); } });
  D.matches.forEach(m => add(m.url, m.date, '0.7'));
  statics().posts.forEach(p => add('/blog/' + p.id, (() => { const d = new Date(p.date + ' 12:00 UTC'); return isNaN(d) ? today : d.toISOString().slice(0, 10); })(), '0.6'));
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;
}

/* ───────────── 404 ───────────── */
const notFound = () => shell({
  title: 'Page not found | PicksBible', desc: 'This prediction page is no longer available.', canonical: '/', noindex: true,
  body: `<h1>Page not found</h1><p>That prediction page is no longer available. Try today's picks:</p>${moreLinks([['/football-predictions.html', 'Football predictions'], ['/basketball-predictions.html', 'Basketball predictions'], ...POPULAR], 'Popular pages')}`
});

/* ───────────── router ───────────── */
module.exports = async function handler(req, res) {
  const q = req.query || {};
  const send = (status, type, text, cache) => {
    res.statusCode = status; res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', cache || 'public, s-maxage=900, stale-while-revalidate=43200');
    res.end(text);
  };
  try {
    const t = q.t;
    if (t === 'blog') { const h = blogPage(String(q.slug || '')); return h ? send(200, 'text/html; charset=utf-8', h) : send(404, 'text/html; charset=utf-8', notFound(), 'public, s-maxage=300'); }
    const D = await loadAll();
    if (t === 'sitemap') return send(200, 'application/xml; charset=utf-8', sitemap(D), 'public, s-maxage=1800, stale-while-revalidate=43200');
    let html = null;
    if (t === 'match') { const m = D.matches.find(x => x.slug === String(q.slug || '')); html = m && matchPage(m, D); }
    else if (t === 'league') { const L = D.leagues[String(q.slug || '')]; html = L && leaguePage(L, D); }
    else if (t === 'date') { const d = String(q.date || ''); if (/^\d{4}-\d{2}-\d{2}$/.test(d) && (q.sport === 'football' || q.sport === 'basketball')) html = datePage(q.sport, d, D); }
    else if (t === 'hub') html = String(q.slug) === 'nba-player-props-today' ? propsPage(D) : SLIPS[String(q.slug)] ? slipPage(String(q.slug), D) : hubPage(String(q.slug || ''), D);
    return html ? send(200, 'text/html; charset=utf-8', html) : send(404, 'text/html; charset=utf-8', notFound(), 'public, s-maxage=300');
  } catch (e) {
    // never cache an error: crawlers must not see an empty page
    console.error('seo error', e && e.message);
    return send(503, 'text/html; charset=utf-8', '<!doctype html><title>Temporarily unavailable</title><p>Please try again in a minute.</p>', 'no-store');
  }
};
module.exports._test = { SLIPS, buildSlip, slug, normalise, leagueInfo, marketResult, record, tipText, HUBS, matchPage, leaguePage, datePage, hubPage, sitemap };
