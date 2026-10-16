/* Builds PicksBible-keyword-map.csv. Run: node tools/keyword-map.js
   Volume tier and difficulty are ESTIMATES from SERP titles and general industry knowledge, not tool data.
   Validate the P1 rows in Google Search Console / Google Keyword Planner (both free) before betting on them. */
const fs = require('fs'), vm = require('vm'), path = require('path');
process.chdir(path.join(__dirname, '..'));
const T = require('../api/seo.js')._test;
const w = {}; w.window = w; vm.runInNewContext(fs.readFileSync('leagues.js', 'utf8'), w);
const rows = [];
const add = (o) => rows.push(Object.assign({ priority: 'P2', cluster: '', keyword: '', variants: '', intent: 'Commercial', sport: 'Football', pageType: '', url: '', status: '', whoRanks: '', volume: '', difficulty: '', money: '', edge: '' }, o));

/* 1. head terms */
add({ priority: 'P1', cluster: 'Head term', keyword: 'football predictions today', variants: 'soccer predictions today; football tips today; today football predictions; football betting tips', pageType: 'Hub (existing, JS table)', url: '/football-predictions.html', status: 'Live', whoRanks: 'Forebet, PredictZ, SportyTrader, Vitibet, Betimate', volume: 'Very high', difficulty: 'Very high (entrenched brands)', money: 'Bookmaker CPA + VIP', edge: 'Static league/market/match pages feed this page with internal links; fresher data and published record' });
add({ priority: 'P1', cluster: 'Head term', keyword: 'basketball predictions today', variants: 'basketball tips today; basketball betting tips; basketball picks today', sport: 'Basketball', pageType: 'Hub (existing, JS table)', url: '/basketball-predictions.html', status: 'Live', whoRanks: 'Covers, Action Network, CBS Sports, BetMGM blog', volume: 'High', difficulty: 'Very high (US publishers)', money: 'US-style affiliate + VIP', edge: 'Spread-cover tips with odds, results shown' });

/* 2. market hubs (built, auto-refresh) */
const hubs = [
  ['over-2-5-goals-predictions-today', 'over 2.5 goals predictions today', 'over 2.5 tips; over 2.5 goals tips today; over 2.5 goals prediction', 'Football', 'P1', 'High', 'Medium-low: the SERP titles I checked were mostly thin or off-topic pages', 'Scores24 hub; odd expired-domain blogs; small tip sites'],
  ['under-2-5-goals-predictions-today', 'under 2.5 goals predictions today', 'under 2.5 tips; under 2.5 goals tips', 'Football', 'P2', 'Medium', 'Medium', 'Scores24, prediction sites'],
  ['btts-predictions-today', 'btts predictions today', 'both teams to score predictions today; btts tips today; gg predictions today; gg tips', 'Football', 'P1', 'High', 'Medium-low: SERP mixes Squawka, PlanetSport and low-quality pages', 'Squawka, PlanetSport, footballgroundguide'],
  ['correct-score-predictions-today', 'correct score predictions today', 'correct score tips today; exact score predictions; correct score prediction tomorrow', 'Football', 'P1', 'High', 'Medium-low: SERP had many off-topic or spammy results', 'Footballwhispers, Patreon tipsters, scattered blogs'],
  ['double-chance-predictions-today', 'double chance predictions today', '1x2 double chance tips; 1x tips today; x2 predictions; 12 predictions', 'Football', 'P2', 'Medium', 'Medium', 'Forebet, PredictZ sections'],
  ['sure-predictions-today', 'sure predictions today', 'sure football predictions; sure tips today; banker of the day; sure win predictions', 'Football', 'P1', 'High (strong in Nigeria and Ghana)', 'High: many Nigerian sites target it', 'Naija tip sites, accurate-predict style domains'],
  ['football-predictions-tomorrow', 'football predictions tomorrow', 'soccer predictions tomorrow; tomorrow football tips', 'Football', 'P1', 'High', 'Medium', 'Forebet, PredictZ'],
  ['basketball-predictions-tomorrow', 'basketball predictions tomorrow', 'nba predictions tomorrow', 'Basketball', 'P2', 'Medium', 'High', 'Action Network, Covers'],
  ['nba-predictions-today', 'nba predictions today', 'nba picks today; nba best bets today; nba spread picks', 'Basketball', 'P1', 'Very high', 'Very high (Covers, Action Network, CBS, BetMGM)', 'US publishers'],
  ['wnba-predictions-today', 'wnba predictions today', 'wnba picks today; wnba best bets', 'Basketball', 'P1', 'Medium (seasonal, summer peak)', 'High (CBS, BetMGM, Action Network) but fewer pages than NBA', 'CBS Sports, BetMGM, Action Network, BleacherNation'],
  ['basketball-spread-predictions-today', 'basketball spread predictions today', 'nba spread picks; point spread predictions; handicap tips basketball', 'Basketball', 'P1', 'Medium-high', 'Medium-high', 'Action Network, Covers'],
  ['basketball-over-under-predictions-today', 'basketball over under predictions today', 'nba totals picks; over under points predictions', 'Basketball', 'P2', 'Medium', 'Medium-high', 'Action Network, Covers'],
  ['nba-player-props-today', 'nba player props today', 'best nba player props today; nba prop bets today; nba prop picks', 'Basketball', 'P1', 'Very high in the US', 'Very high (Covers, Action Network, TheLines)', 'Covers, Action Network, TheLines, FantasyAlarm'],
  ['2-odds-predictions-today', '2 odds predictions today', '2 odds today; 2 odds tips; 2 odds ticket today', 'Football', 'P1', 'High (strong in Nigeria and Ghana)', 'Medium: demand is local, fewer quality sites', 'Naija tip sites'],
  ['3-odds-predictions-today', '3 odds predictions today', '3 odds today; 3 odds tips', 'Football', 'P2', 'Medium-high', 'Medium', 'Naija tip sites'],
  ['5-odds-predictions-today', '5 odds predictions today', '5 odds today; 5 odds tips; 5 odds ticket', 'Football', 'P1', 'High (strong in Nigeria and Ghana)', 'Medium', 'Naija tip sites'],
  ['10-odds-predictions-today', '10 odds predictions today', '10 odds today; 10 odds tips', 'Football', 'P2', 'Medium', 'Medium', 'Naija tip sites']
];
hubs.forEach(h => add({ priority: h[4], cluster: 'Market hub (auto)', keyword: h[1], variants: h[2], sport: h[3], pageType: 'Hub page, auto-built from today\'s tips', url: '/' + h[0], status: 'Built, goes live on upload', whoRanks: h[7], volume: h[5], difficulty: h[6], money: h[3] === 'Football' ? 'Bookmaker CPA + VIP' : 'Affiliate + VIP', edge: 'Fresh daily from your CSV, odds + confidence, published win record for that exact market, explainer + FAQ, structured data' }));

/* 3. league x predictions */
const P1 = new Set(['england-premier-league', 'spain-laliga', 'italy-serie-a', 'germany-bundesliga', 'france-ligue-1', 'champions-league', 'europa-league', 'usa-nba', 'usa-wnba', 'nigeria-premier-football-league-npfl']);
const P2 = new Set(['conference-league', 'netherlands-eredivisie', 'portugal-liga-portugal', 'turkey-super-lig', 'england-championship', 'usa-mls', 'scotland-premiership', 'belgium-pro-league', 'saudi-arabia-saudi-pro-league', 'brazil-serie-a', 'argentina-liga-profesional', 'mexico-liga-mx', 'egypt-premier-league', 'south-africa-premier-soccer-league', 'south-africa-betway-premiership', 'ghana-premier-league', 'kenya-premier-league', 'england-fa-cup', 'england-efl-cup', 'spain-copa-del-rey', 'usa-march-madness', 'eurobasket', 'uefa-nations-league']);
const seen = new Set();
['football', 'basketball'].forEach(sp => (w.PB_LEAGUES[sp] || []).forEach(g => g.l.forEach(l => {
  const li = T.leagueInfo(g.c, l, sp); if (seen.has(li.slug)) return; seen.add(li.slug);
  const pr = P1.has(li.slug) ? 'P1' : P2.has(li.slug) ? 'P2' : 'P3';
  add({ priority: pr, cluster: 'League hub (auto)', keyword: `${li.name.toLowerCase()} predictions`, variants: `${li.name.toLowerCase()} predictions today; ${li.name.toLowerCase()} tips; ${li.name.toLowerCase()} betting tips; ${li.name.toLowerCase()} predictions this weekend`, sport: sp === 'football' ? 'Football' : 'Basketball', pageType: 'League hub, auto-built', url: '/leagues/' + li.slug, status: 'Built, indexed once the league has picks', whoRanks: pr === 'P1' ? 'Forebet, SportyTrader, PredictZ, local media' : 'Mostly aggregators; thin competition on small leagues', volume: pr === 'P1' ? 'High' : pr === 'P2' ? 'Medium' : 'Long-tail', difficulty: pr === 'P1' ? 'High' : pr === 'P2' ? 'Medium' : 'Low-medium', money: 'Bookmaker CPA + VIP', edge: 'Today\'s picks + recent results + published record + FAQ, one page per league with no manual work' });
})));

/* 4. match + date patterns */
add({ priority: 'P1', cluster: 'Match page (auto)', keyword: '{home} vs {away} prediction', variants: '{home} vs {away} tips; {home} vs {away} prediction and odds; {home} v {away} betting tips', pageType: 'One page per fixture with a tip', url: '/predictions/{home}-vs-{away}-prediction-{date}', status: 'Built, a page is created for every CSV row', whoRanks: 'footballgroundguide, dailysports, PredictZ, SportyTrader, Forebet', volume: 'Long-tail each, large in total', difficulty: 'Low-medium per page (many rivals are templated and thin)', money: 'Bookmaker CPA', edge: 'Tip explained in plain words, odds, confidence, all markets, result and verdict after the match, SportsEvent schema' });
add({ priority: 'P2', cluster: 'Match page (auto)', keyword: '{home} vs {away} prediction (basketball)', variants: '{team} vs {team} prediction spread; {team} vs {team} odds', sport: 'Basketball', pageType: 'One page per fixture', url: '/predictions/{home}-vs-{away}-prediction-{date}', status: 'Built', whoRanks: 'Covers, Action Network, CBS', volume: 'Long-tail', difficulty: 'Medium-high', money: 'Affiliate', edge: 'Spread tip explained in plain language with the cover maths' });
add({ priority: 'P2', cluster: 'Date archive (auto)', keyword: 'football predictions {weekday/date}', variants: 'football predictions saturday; football predictions for 18 october 2026; weekend football predictions', pageType: 'Date page', url: '/football-predictions/{yyyy-mm-dd}', status: 'Built', whoRanks: 'Forebet, PredictZ', volume: 'Medium in total', difficulty: 'Medium', money: 'Bookmaker CPA', edge: 'Every day gets a permanent page with prev/next navigation' });

/* 5. planned */
const plan = [
  ['P1', 'Nigeria bookmaker', 'bet9ja predictions today', 'sportybet predictions today; 1xbet predictions today; betking predictions; msport predictions; nairabet predictions', 'Football', 'Hub per bookmaker, reuse today\'s tips with that bookmaker\'s market names', 'Goal.com Nigeria and Nigerian tip sites', 'High in Nigeria', 'Medium-high', 'Bookmaker CPA (best Nigerian money keywords)', 'Needs: your affiliate links per bookmaker. Not built yet.'],
  ['P1', 'Nigeria bookmaker', 'bet9ja booking code today', 'sportybet booking code today; 1xbet booking code; football booking codes', 'Football', 'Daily booking-code hub', 'Nigerian tip and forum sites', 'Very high in Nigeria', 'Medium', 'Bookmaker CPA', 'Needs: a booking-code field per slip in the CSV/admin (one new column). Not built yet.'],
  ['P1', 'Intent: compare', 'best football prediction sites', 'forebet alternatives; most accurate football prediction site; best free betting tips sites', 'Football', 'Comparison article (skyscraper)', '11v11, thefootballfaithful, leadership.ng listicles', 'Medium', 'Medium', 'Brand + VIP', 'Write once, link from home page. Not built yet.'],
  ['P2', 'Evergreen guide', 'what does gg mean in football betting', 'what is btts; what does 1x2 mean; double chance explained; what does x2 mean in betting', 'Football', 'Blog guide', 'Many thin explainers', 'Medium', 'Low-medium', 'Top-of-funnel, feeds hubs', 'Blog engine is built (/blog/slug from data.js). Content to write.'],
  ['P2', 'Evergreen guide', 'how to read a basketball spread', 'what does +9.5 mean in betting; nba spread explained; what does -6.5 mean', 'Basketball', 'Blog guide', 'Covers, Action Network explainers', 'Medium', 'Medium', 'Top-of-funnel', 'One guide already live at /blog/spreads'],
  ['P2', 'Evergreen guide', 'how accurate is forebet', 'are betting tips worth it; are prediction sites accurate', 'Football', 'Trust article using your own published record', 'Review sites', 'Medium', 'Low-medium', 'Trust for VIP sales', 'Needs your real accuracy numbers from the results data. Not built yet.']
];
plan.forEach(p => add({ priority: p[0], cluster: p[1], keyword: p[2], variants: p[3], sport: p[4], pageType: p[5], status: 'Planned', whoRanks: p[6], volume: p[7], difficulty: p[8], money: p[9], edge: p[10] }));

const cols = [['priority', 'Priority'], ['cluster', 'Cluster'], ['keyword', 'Primary keyword'], ['variants', 'Variants to cover'], ['sport', 'Sport'], ['pageType', 'Page type'], ['url', 'PicksBible URL'], ['status', 'Status'], ['whoRanks', 'Who ranks today (from my SERP checks)'], ['volume', 'Volume tier (ESTIMATE)'], ['difficulty', 'Difficulty (my read of the SERP)'], ['money', 'Money angle'], ['edge', 'How we beat them']];
const q = v => '"' + String(v).replace(/"/g, '""') + '"';
const order = { P1: 0, P2: 1, P3: 2 };
rows.sort((a, b) => order[a.priority] - order[b.priority]);
fs.writeFileSync('PicksBible-keyword-map.csv', '﻿' + cols.map(c => q(c[1])).join(',') + '\n' + rows.map(r => cols.map(c => q(r[c[0]])).join(',')).join('\n') + '\n');
const by = {}; rows.forEach(r => { by[r.priority] = (by[r.priority] || 0) + 1; });
console.log('rows', rows.length, by);
