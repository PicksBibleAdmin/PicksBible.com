/* Offline test for api/seo.js: fakes Firestore, calls every route, checks output. Run: node tools/seo-test.js */
const path = require('path');
process.chdir(path.join(__dirname, '..'));
const enc = v => v === null || v === undefined ? { nullValue: null } : typeof v === 'string' ? { stringValue: v } : typeof v === 'boolean' ? { booleanValue: v } :
  typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }) : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } :
  { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
const doc = o => ({ fields: Object.fromEntries(Object.entries(o).map(([k, x]) => [k, enc(x)])) });

const wat = off => { const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date()); const t = new Date(p + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + off); return t.toISOString().slice(0, 10); };
const T = wat(0), Y = wat(-1), TM = wat(1);
const fb = (id, k, country, comp, home, away, v) => ({ id, sport: 'football', kickoff: k, country, competition: comp, home, away, fb: Object.assign({ live: true, o1: '2.1', oX: '3.3', o2: '3.4' }, v) });
const bb = (id, k, country, comp, home, away, v) => ({ id, sport: 'basketball', kickoff: k, country, competition: comp, home, away, bb: Object.assign({ live: true, o1: '1.71', o2: '2.03' }, v) });
const fixtures = [
  fb('a', Y + 'T12:30', 'England', 'Premier League', 'Arsenal', 'Leeds', { tip: '1', conf: '61', ou: 'Over', ouOdds: '1.83', btts: 'NG', bttsOdds: '1.71', cs: '3-0', score: '2-1', st: 'won' }),
  fb('b', Y + 'T19:45', 'France', 'Ligue 1', 'Monaco', 'Toulouse', { tip: '1X', tipOdds: '1.19', conf: '58', ou: 'Over', ouOdds: '1.65', btts: 'GG', bttsOdds: '1.62', cs: '2-1', score: '2-2', st: 'won' }),
  fb('c', T + 'T17:45', 'Europe (UEFA)', 'Europa League', 'RB Salzburg', 'AC Milan', { tip: '12', tipOdds: '1.30', conf: '53', ou: 'Over', ouOdds: '1.45', btts: 'GG', bttsOdds: '1.40', cs: '1-2', sure: true }),
  fb('d', T + 'T19:00', 'England', 'Premier League', 'Chelsea', 'Spurs', { tip: 'X2', tipOdds: '1.5', conf: '42', btts: 'GG', bttsOdds: '1.7', cs: '1-1' }),
  fb('e', TM + 'T20:00', 'Netherlands', 'Eredivisie', 'Ajax', 'Nijmegen', { tip: '1', conf: '57', ou: 'Under', ouOdds: '1.9' }),
  bb('f', T + 'T02:30', 'USA', 'NBA', 'Detroit Pistons', 'LA Lakers', { tip: '1', spread: '-6.5', tipOdds: '1.99', conf: '50', totalSide: 'Over', totalLine: '222.5' }),
  bb('g', T + 'T20:30', 'USA', 'WNBA', 'GS Valkyries', 'Atlanta Dream', { tip: '2', spread: '+9.5', tipOdds: '1.30', conf: '73', totalSide: 'Under', totalLine: '170.5' }),
  bb('h', Y + 'T02:30', 'USA', 'NBA', 'Boston Celtics', 'Miami Heat', { tip: '1', spread: '-4.5', tipOdds: '1.9', conf: '66', score: '110-102', st: 'won' }),
  { id: 'x', sport: 'football', kickoff: T + 'T10:00', country: 'Spain', competition: 'LaLiga', home: 'No', away: 'Tip', fb: { live: true } },       // no tip -> skipped
  { id: 'y', sport: 'football', kickoff: T + 'T10:00', country: 'Spain', competition: 'LaLiga', home: 'Hidden', away: 'Game', fb: { live: false, tip: '1' } } // not live -> skipped
];
const props = [
  { live: true, kickoff: T + 'T02:30', market: 'Player Points (Over/Under)', player: 'Cade Cunningham', team: 'Detroit Pistons', home: 'Detroit Pistons', away: 'LA Lakers', line: '24.5', side: 'Over', odds: '1.85' },
  { live: true, kickoff: Y + 'T02:30', market: 'Player Points (Over/Under)', player: 'Jayson Tatum', team: 'Boston Celtics', home: 'Boston Celtics', away: 'Miami Heat', line: '27.5', side: 'Over', odds: '1.9', st: 'won' },
  { live: false, kickoff: T + 'T02:30', market: 'x', player: 'Hidden' }
];
const calls = [];
global.fetch = async url => {
  calls.push(url);
  const n = String(url).split('/public/')[1].split('?')[0];
  if (n === 'live') return { status: 200, ok: true, json: async () => doc({ fixtures, props, updatedAt: 'x' }) };
  return { status: 404, ok: false, json: async () => ({}) };
};
const handler = require('../api/seo.js');
const get = async q => new Promise(async resolve => {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { resolve({ status: this.statusCode, headers: this.headers, body: b }); } };
  await handler({ query: q }, res);
});
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('  FAIL:', m); } else console.log('  ok:', m); };

(async () => {
  const sm = await get({ t: 'sitemap' });
  ok(sm.status === 200 && sm.headers['Content-Type'].includes('xml'), 'sitemap 200 xml');
  const locs = [...sm.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace('https://picksbible.com', ''));
  console.log('  sitemap urls:', locs.length); locs.forEach(l => console.log('   ', l));
  ok(!locs.some(l => /hidden|no-vs-tip/.test(l)), 'skipped (not live / no tip) fixtures excluded');
  ok(new Set(locs).size === locs.length, 'no duplicate URLs');
  ok(sm.body.includes('<lastmod>'), 'lastmod present');

  const rewrite = l => {  // same mapping as vercel.json
    let m;
    if ((m = l.match(/^\/predictions\/(.+)$/))) return { t: 'match', slug: m[1] };
    if ((m = l.match(/^\/leagues\/(.+)$/))) return { t: 'league', slug: m[1] };
    if ((m = l.match(/^\/(football|basketball)-predictions\/(\d{4}-\d{2}-\d{2})$/))) return { t: 'date', sport: m[1], date: m[2] };
    if ((m = l.match(/^\/blog\/(.+)$/))) return { t: 'blog', slug: m[1] };
    return { t: 'hub', slug: l.slice(1) };
  };
  const pages = {};
  for (const l of locs) {
    const r = await get(rewrite(l)); pages[l] = r;
    const title = (r.body.match(/<title>([^<]*)<\/title>/) || [])[1];
    const jsonld = [...r.body.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)];
    let jsonOk = true; jsonld.forEach(j => { try { JSON.parse(j[1].replace(/\\u003c/g, '<')); } catch (e) { jsonOk = false; } });
    const h1 = (r.body.match(/<h1>(.*?)<\/h1>/) || [])[1];
    ok(r.status === 200 && title && h1 && jsonOk && r.body.includes('rel="canonical"'), `${l} -> 200 | ${title} | schema:${jsonld.length}`);
  }
  // internal links must resolve
  const linkRe = /href="(\/(?:predictions|leagues|football-predictions|basketball-predictions|blog)\/[^"]+|\/[a-z0-9-]+-today|\/[a-z0-9-]+-tomorrow)"/g;
  const bad = new Set();
  for (const [l, r] of Object.entries(pages)) for (const m of r.body.matchAll(linkRe)) { const t = m[1]; if (t === '/football-predictions.html' || t === '/basketball-predictions.html') continue; if (!locs.includes(t) && !(t in pages)) { const rr = await get(rewrite(t)); if (rr.status !== 200) bad.add(l + ' -> ' + t + ' (' + rr.status + ')'); } }
  ok(bad.size === 0, 'all internal links resolve' + (bad.size ? ' BAD: ' + [...bad].slice(0, 8).join('; ') : ''));

  console.log('\n--- sample: match page text');
  const mp = pages[locs.find(l => l.includes('detroit'))].body;
  console.log(mp.match(/<p>Our pick for.*?<\/p>/)[0].replace(/<[^>]+>/g, ''));
  console.log(mp.match(/<h2>Frequently[\s\S]*?<\/div>/)[0].replace(/<summary>/g, '\nQ: ').replace(/<p>/g, '\nA: ').replace(/<[^>]+>/g, '').slice(0, 700));
  console.log('\n--- sample: BTTS hub record');
  console.log((pages['/btts-predictions-today'].body.match(/In the last[^<]*/) || ['(no record line yet: needs >=3 settled)'])[0]);
  console.log('\n--- 404s + error caching');
  const nf = await get({ t: 'match', slug: 'nobody-vs-nobody-prediction-2020-01-01' }); ok(nf.status === 404 && /noindex/.test(nf.body), '404 + noindex for unknown match');
  const bd = await get({ t: 'date', sport: 'football', date: '1999-01-01' }); ok(bd.status === 404, '404 for empty date');
  ok(calls.length <= 15, 'Firestore reads for a full crawl: ' + calls.length + ' (memory cache works)');
  global.fetch = async () => { throw new Error('boom'); };
  // new module instance to clear memory cache
  delete require.cache[require.resolve('../api/seo.js')]; const h2 = require('../api/seo.js');
  const r503 = await new Promise(async rs => { const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { rs({ status: this.statusCode, headers: this.headers }); } }; await h2({ query: { t: 'hub', slug: 'btts-predictions-today' } }, res); });
  ok(r503.status === 503 && r503.headers['Cache-Control'] === 'no-store', 'Firestore failure -> 503 no-store (never cached)');
  console.log(fail ? '\n' + fail + ' FAILED' : '\nALL PASSED'); process.exit(fail ? 1 : 0);
})();
