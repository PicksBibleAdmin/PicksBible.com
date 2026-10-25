/* Puts today's real date (Nigeria time) into the page banners of the HTML itself,
   so Google sees "Football Predictions — 25th October 2026" without running any script.
   Fail-safe: on ANY problem this does nothing and the normal static page is served. */
export const config = {
  matcher: [
    "/", "/predictions.html", "/football-predictions.html", "/basketball-predictions.html",
    "/best-1x2-predictions-today.html", "/best-btts-predictions-today.html",
    "/best-correct-score-predictions-today.html", "/best-double-chance-tips-today.html",
    "/best-nba-ats-picks-today.html", "/best-nba-over-under-picks-today.html",
    "/best-nba-player-props-today.html", "/best-over-under-2-5-predictions-today.html"
  ]
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function pretty(ymd) {
  const p = String(ymd).split("-"), d = +p[2];
  const sf = (d % 10 === 1 && d !== 11) ? "st" : (d % 10 === 2 && d !== 12) ? "nd" : (d % 10 === 3 && d !== 13) ? "rd" : "th";
  return d + sf + " " + MONTHS[+p[1] - 1] + " " + p[0];
}

function stamp(html, D) {
  html = html.replace(/(<span data-slot="title">)([^<]*)(<\/span>)/g, function (m, a, t, c) {
    if (t.indexOf("—") >= 0) return m;
    let x = t;
    if (/^Sure Predictions for Today$/i.test(x)) x = "Sure ⚽ Football Predictions";
    else if (/^Prediction &amp; tips for today$/i.test(x)) x = "⚽ All Football Predictions &amp; Tips";
    else x = x.replace(/\s*Today\s*$/i, "");
    return a + x + " — " + D + c;
  });
  return html.replace(/<h2>(Banker Bet of the Day|Bets of the Day)<\/h2>/g, "<h2>$1 — " + D + "</h2>");
}

export default async function middleware(request) {
  try {
    if (request.method !== "GET" || request.headers.get("x-pb-skip")) return;
    const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
    const res = await fetch(request.url, { headers: { "x-pb-skip": "1", "accept": "text/html" } });
    const type = res.headers.get("content-type") || "";
    if (!res.ok || type.indexOf("text/html") < 0) return;
    const html = stamp(await res.text(), pretty(ymd));
    return new Response(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate" }
    });
  } catch (e) {
    return; /* serve the normal page */
  }
}
