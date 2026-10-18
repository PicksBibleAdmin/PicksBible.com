/**
 * PicksBible: send a message to members by email (Brevo).
 * Called ONLY from the admin page. The browser sends its Firebase login token; this function checks that the
 * token belongs to the admin before sending anything. The Brevo key lives in a Vercel environment variable
 * (BREVO_API_KEY), never in the website code.
 *
 * Environment variables (Vercel > Project > Settings > Environment Variables):
 *   BREVO_API_KEY   required   the key you generated in Brevo
 *   MAIL_FROM       optional   default picks@picksbible.com  (must be on the authenticated domain)
 *   MAIL_FROM_NAME  optional   default PicksBible
 *   MAIL_REPLY_TO   optional   default picksbiblesupport@gmail.com
 *   ADMIN_EMAILS    optional   comma list, default p.ejigabusiness@gmail.com
 */
const FIREBASE_KEY = "AIzaSyBBnSFHx_z1YWwOXz6sdKOSzelTIuvusa8";
const MAX = 300;          /* Brevo free plan: 300 emails a day */
const CHUNK = 100;

const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const isEmail = e => typeof e === "string" && e.length < 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

function htmlOf(title, body, link) {
  const paras = String(body).split(/\n+/).map(p => `<p style="margin:0 0 14px;font-size:16px;line-height:1.5;color:#1a1a1a">${esc(p)}</p>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#f2f2f7;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden" cellpadding="0" cellspacing="0">
<tr><td style="background:#141032;padding:18px 24px;color:#ffffff;font-size:20px;font-weight:bold">Picks<span style="color:#22d3ee">Bible</span></td></tr>
<tr><td style="padding:26px 24px 10px"><h1 style="margin:0 0 14px;font-size:22px;color:#111">${esc(title)}</h1>${paras}
<p style="margin:22px 0"><a href="${esc(link)}" style="background:#1a1a1a;color:#ffffff;text-decoration:none;padding:13px 24px;border-radius:999px;font-weight:bold;display:inline-block">Open your VIP dashboard</a></p></td></tr>
<tr><td style="padding:14px 24px 22px;color:#777;font-size:12px">You get this email because you have a PicksBible account. Reply to this email if you need help.<br>PicksBible.com</td></tr>
</table></td></tr></table></body></html>`;
}

/* the free daily email: model's top picks, one button to the homepage, and a per-person unsubscribe link */
function freeHtml(picks) {
  const items = picks.map((p, i) => `<tr><td style="padding:12px 0;border-bottom:1px solid #eee"><div style="font-size:12px;color:#777;margin-bottom:3px">${esc(p.meta || "")}</div>
<div style="font-size:17px;font-weight:bold;color:#111">${i + 1}. ${esc(p.match)}</div><div style="font-size:16px;color:#16a34a;font-weight:bold;margin-top:3px">${esc(p.pick)}</div></td></tr>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#f2f2f7;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden" cellpadding="0" cellspacing="0">
<tr><td style="background:#141032;padding:18px 24px;color:#ffffff;font-size:20px;font-weight:bold">Picks<span style="color:#22d3ee">Bible</span></td></tr>
<tr><td style="padding:26px 24px 6px"><p style="margin:0 0 12px;font-size:17px;color:#111">Hello {{params.NAME}},</p>
<p style="margin:0 0 14px;font-size:16px;line-height:1.5;color:#1a1a1a">Our predictive model is backing these three picks as the best banker bets of today:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table>
<p style="margin:24px 0 8px;text-align:center"><a href="https://picksbible.com/" style="background:#16a34a;color:#ffffff;text-decoration:none;padding:14px 26px;border-radius:999px;font-weight:bold;display:inline-block">See all free winning picks</a></p></td></tr>
<tr><td style="padding:16px 24px 22px;color:#777;font-size:12px;line-height:1.5">You get this because you signed up at PicksBible.com. Predictions are not guarantees; bet responsibly.<br>
<a href="{{params.UNSUB}}" style="color:#777">Unsubscribe</a></td></tr>
</table></td></tr></table></body></html>`;
}

async function verifyAdmin(token, env) {
  if (!token) return null;
  const r = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + FIREBASE_KEY, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: token })
  });
  if (!r.ok) return null;
  const j = await r.json(); const u = j && j.users && j.users[0];
  if (!u || !u.email) return null;
  const admins = String(env.ADMIN_EMAILS || "p.ejigabusiness@gmail.com").toLowerCase().split(",").map(s => s.trim());
  return admins.includes(String(u.email).toLowerCase()) ? u.email : null;
}

async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const env = process.env;
  if (!env.BREVO_API_KEY) return res.status(500).json({ error: "BREVO_API_KEY is not set in Vercel" });
  const auth = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  let admin; try { admin = await verifyAdmin(auth, env); } catch (e) { admin = null; }
  if (!admin) return res.status(401).json({ error: "Not allowed" });

  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const free = b.mode === "free";
  const subject = String(b.subject || "").trim().slice(0, 150), text = free ? "free picks" : String(b.text || "").trim().slice(0, 2000);
  if (!subject || !text) return res.status(400).json({ error: "subject and text are required" });
  const picks = free ? (Array.isArray(b.picks) ? b.picks : []).slice(0, 3).map(p => ({ match: String(p.match || "").slice(0, 120), pick: String(p.pick || "").slice(0, 120), meta: String(p.meta || "").slice(0, 120) })).filter(p => p.match && p.pick) : [];
  if (free && !picks.length) return res.status(400).json({ error: "add at least one pick" });
  const seen = new Set(), list = [];
  (Array.isArray(b.recipients) ? b.recipients : []).forEach(x => {
    const e = String((x && x.email) || "").trim().toLowerCase();
    if (isEmail(e) && !seen.has(e)) { seen.add(e); list.push({ email: e, name: String((x && x.name) || "").slice(0, 60), unsub: /^https:\/\/picksbible\.com\/unsubscribe/.test(String(x && x.unsub)) ? String(x.unsub).slice(0, 400) : "" }); }
  });
  if (!list.length) return res.status(400).json({ error: "no valid recipients" });
  if (list.length > MAX) return res.status(400).json({ error: "Too many recipients for one send (max " + MAX + ")" });

  const from = { email: env.MAIL_FROM || "picks@picksbible.com", name: env.MAIL_FROM_NAME || "PicksBible" };
  const replyTo = { email: env.MAIL_REPLY_TO || "picksbiblesupport@gmail.com", name: "PicksBible Support" };
  const html = free ? freeHtml(picks) : htmlOf(subject, text, "https://picksbible.com/vip.html");
  const plain = free ? "Hello {{params.NAME}},\nOur predictive model is backing these three picks as the best banker bets of today:\n" + picks.map((p, i) => (i + 1) + ". " + p.match + " - " + p.pick).join("\n") + "\nSee all free winning picks: https://picksbible.com/\nUnsubscribe: {{params.UNSUB}}" : text;
  let sent = 0; const failed = [];
  for (let i = 0; i < list.length; i += CHUNK) {
    const part = list.slice(i, i + CHUNK);
    /* messageVersions: every person gets their own email, nobody sees anyone else's address */
    const payload = { sender: from, replyTo, subject, htmlContent: html, textContent: plain, messageVersions: part.map(p => ({ to: [p.name ? { email: p.email, name: p.name } : { email: p.email }], params: { NAME: p.name || "there", UNSUB: p.unsub || "https://picksbible.com/unsubscribe.html" } })) };
    try {
      const r = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", accept: "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) sent += part.length; else { const t = await r.text(); failed.push({ n: part.length, status: r.status, detail: t.slice(0, 300) }); }
    } catch (e) { failed.push({ n: part.length, detail: String(e.message || e) }); }
  }
  return res.status(failed.length && !sent ? 502 : 200).json({ sent, failed });
}
module.exports = handler;
module.exports._test = { htmlOf, freeHtml, isEmail, verifyAdmin };
