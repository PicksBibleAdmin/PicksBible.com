/**
 * Blog visitor tracking. The blog page sends one small message when a post opens ("view"), when the reader has
 * scrolled past half the article ("read") and when they click a button in it ("cta"). Counts are added to
 * Firestore (blog_stats) with the service account, and the admin "Blog > Visitors" screen reads them.
 * Uses the same Vercel variable as the dice game: FIREBASE_SERVICE_ACCOUNT. Without it this answers 204 and nothing is counted.
 */
const crypto = require("crypto");
const PROJECT = "picksbible-7fa7f";
const DOCS = "projects/" + PROJECT + "/databases/(default)/documents";
const b64 = b => Buffer.from(b).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
let cached = null;
async function accessToken(sa) {
  if (cached && cached.exp > Date.now() + 60000) return cached.t;
  const now = Math.floor(Date.now() / 1000);
  const head = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/datastore", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3000 }));
  const sig = crypto.createSign("RSA-SHA256").update(head + "." + claim).sign(sa.private_key);
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=" + head + "." + claim + "." + b64(sig) });
  const j = await r.json(); if (!j.access_token) throw new Error("google sign-in failed");
  cached = { t: j.access_token, exp: Date.now() + 2900 * 1000 }; return cached.t;
}
const lagosDay = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
const BOT = /bot|crawl|spider|slurp|bing|facebookexternalhit|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|java\/|go-http|axios|node-fetch/i;

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).end();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT; if (!raw) return res.status(204).end();
  let body = req.body; if (typeof body === "string") { try { body = JSON.parse(body); } catch (_) { body = {}; } } body = body || {};
  const slug = String(body.slug || ""), ev = String(body.ev || "view");
  if (!/^[a-z0-9][a-z0-9-]{0,98}$/.test(slug) || ["view", "read", "cta"].indexOf(ev) < 0) return res.status(204).end();
  const ua = String(req.headers["user-agent"] || ""); if (!ua || BOT.test(ua)) return res.status(204).end();
  let sa; try { sa = JSON.parse(raw); } catch (_) { return res.status(204).end(); }
  const inc = { };
  if (ev === "view") {
    inc.views = 1; if (body.u) inc.uniq = 1;
    let ref = "direct"; try { const h = new URL(String(body.ref || "")).hostname.replace(/^www\./, "").toLowerCase(); if (h && h !== "picksbible.com") ref = h; else if (h === "picksbible.com") ref = "picksbible_com"; } catch (_) {}
    inc["ref_" + ref.replace(/[^a-z0-9]+/g, "_").slice(0, 40)] = 1;
    const cc = String(req.headers["x-vercel-ip-country"] || "").toLowerCase(); if (/^[a-z]{2}$/.test(cc)) inc["cty_" + cc] = 1;
    inc[/mobile|android|iphone|ipad/i.test(ua) ? "dev_m" : "dev_d"] = 1;
  } else if (ev === "read") inc.reads = 1; else inc.cta = 1;
  try {
    const token = await accessToken(sa), day = lagosDay();
    const write = (id, extra) => [
      { update: { name: DOCS + "/blog_stats/" + id, fields: Object.assign({ slug: { stringValue: slug } }, extra) }, updateMask: { fieldPaths: ["slug"].concat(Object.keys(extra).map(k => k)) } },
      { transform: { document: DOCS + "/blog_stats/" + id, fieldTransforms: Object.keys(inc).map(k => ({ fieldPath: k, increment: { integerValue: "1" } })) } }
    ];
    const writes = write(day + "_" + slug, { ymd: { stringValue: day }, kind: { stringValue: "day" } });
    const tot = { views: inc.views, uniq: inc.uniq, reads: inc.reads, cta: inc.cta }, ti = Object.keys(tot).filter(k => tot[k]);
    writes.push({ update: { name: DOCS + "/blog_stats/total_" + slug, fields: { slug: { stringValue: slug }, kind: { stringValue: "total" } } }, updateMask: { fieldPaths: ["slug", "kind"] } });
    writes.push({ transform: { document: DOCS + "/blog_stats/total_" + slug, fieldTransforms: ti.map(k => ({ fieldPath: k, increment: { integerValue: "1" } })) } });
    const r = await fetch("https://firestore.googleapis.com/v1/" + DOCS + ":commit", { method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify({ writes }) });
    if (!r.ok) console.error("blog-view commit", r.status, (await r.text()).slice(0, 200));
  } catch (e) { console.error("blog-view", e && e.message); }
  res.status(204).end();
};
