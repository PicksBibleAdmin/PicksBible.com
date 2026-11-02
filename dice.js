/**
 * PicksBible dice game (server side). Every result is decided here, never in the browser.
 *
 *   Visitors without an account: 3 rolls a day (counted per device and per network).
 *   Free members:                6 rolls a day in total (the 3 visitor rolls count, so 3 extra after signing up).
 *   The day resets at midnight Lagos time.
 *
 * Every roll is written to dice_log so the admin can watch rolls live. A prize won by a visitor is saved
 * with a claim code and is attached to their account when they sign up (action "claim").
 *
 * Needs ONE Vercel environment variable (Project > Settings > Environment Variables):
 *   FIREBASE_SERVICE_ACCOUNT   the whole JSON of a Firebase service-account key.
 * Without it this endpoint answers 503 and the page says "opens very soon".
 */
const crypto = require("crypto");
const FIREBASE_KEY = "AIzaSyBBnSFHx_z1YWwOXz6sdKOSzelTIuvusa8";
const PROJECT = "picksbible-7fa7f";
const DB = "https://firestore.googleapis.com/v1/projects/" + PROJECT + "/databases/(default)/documents";
const GUEST_MAX = 3, MEMBER_MAX = 6, NET_MAX = 15;

const b64 = b => Buffer.from(b).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
async function accessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/datastore", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3000 }));
  const sig = crypto.createSign("RSA-SHA256").update(head + "." + claim).sign(sa.private_key);
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=" + head + "." + claim + "." + b64(sig) });
  const j = await r.json(); if (!j.access_token) throw new Error("token"); return j.access_token;
}
const lagosDay = d => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(d || new Date());
const str = v => ({ stringValue: String(v) }), int = v => ({ integerValue: String(v) }), bool = v => ({ booleanValue: !!v });
const getInt = (f, k) => parseInt((f && f[k] && f[k].integerValue) || "0", 10);
const getStr = (f, k) => (f && f[k] && f[k].stringValue) || "";

/* prize ladder, rarest first. The jackpot odds are deliberately not shown on the site. */
function drawPrize(firstOfDay, streak) {
  if (crypto.randomInt(25000000) === 0) return { id: "jackpot", name: "the $1,000 JACKPOT" };
  if (crypto.randomInt(2000) === 0) return { id: "vip7", name: "1 week of free VIP" };
  if (crypto.randomInt(500) === 0) return { id: "vip1", name: "a free VIP day" };
  if (crypto.randomInt(4) === 0 || (firstOfDay && streak > 0 && streak % 7 === 0)) return { id: "pick", name: "a bonus pick" };
  return null;
}
function faces(prize) {
  if (prize && prize.id === "jackpot") return [6, 6];   /* two sixes is the jackpot, and only the jackpot */
  let a, b; do { a = 1 + crypto.randomInt(6); b = 1 + crypto.randomInt(6); } while (a === 6 && b === 6);
  return [a, b];
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return res.status(503).json({ error: "not_ready" });
  let sa; try { sa = JSON.parse(raw); } catch (_) { return res.status(503).json({ error: "not_ready" }); }
  let body = req.body; if (typeof body === "string") { try { body = JSON.parse(body); } catch (_) { body = {}; } } body = body || {};
  const action = body.action === "status" || body.action === "claim" ? body.action : "roll";
  const gid = /^[a-z0-9]{12,40}$/.test(String(body.gid || "")) ? String(body.gid) : "";
  const today = lagosDay(), yest = lagosDay(new Date(Date.now() - 864e5));
  try {
    const token = await accessToken(sa), H = { Authorization: "Bearer " + token, "Content-Type": "application/json" };
    const get = async p => { const r = await fetch(DB + "/" + p, { headers: H }); if (r.status === 404) return null; if (!r.ok) throw new Error("get"); return r.json(); };
    const pre = d => d ? "currentDocument.updateTime=" + encodeURIComponent(d.updateTime) : "currentDocument.exists=false";
    const patch = (p, fields, d) => fetch(DB + "/" + p + "?" + pre(d) + Object.keys(fields).map(k => "&updateMask.fieldPaths=" + k).join(""), { method: "PATCH", headers: H, body: JSON.stringify({ fields }) });
    const create = (col, fields, id) => fetch(DB + "/" + col + (id ? "?documentId=" + id : ""), { method: "POST", headers: H, body: JSON.stringify({ fields }) });

    /* who is rolling: a signed-in member, or a visitor */
    let uid = "", email = "";
    const idt = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (idt) {
      const lk = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + FIREBASE_KEY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: idt }) });
      if (!lk.ok) return res.status(401).json({ error: "login expired" });
      const u = ((await lk.json()).users || [])[0]; if (!u) return res.status(401).json({ error: "login expired" });
      uid = u.localId; email = u.email || "";
      if (!(await get("users/" + uid))) return res.status(403).json({ error: "no account" });
    }
    const guestDoc = gid ? await get("dice_guest/" + today + "_d_" + gid) : null;
    const guestUsed = Math.min(GUEST_MAX, getInt(guestDoc && guestDoc.fields, "n"));

    /* ---------- claim: attach a visitor's earlier prizes to the new account ---------- */
    if (action === "claim") {
      if (!uid) return res.status(401).json({ error: "login required" });
      const out = [];
      for (const c of (Array.isArray(body.codes) ? body.codes : []).slice(0, 10)) {
        if (!/^[a-f0-9]{16}$/.test(String(c))) continue;
        const d = await get("dice_wins/g_" + c); if (!d || getStr(d.fields, "uid")) continue;
        const w = await patch("dice_wins/g_" + c, { uid: str(uid), email: str(email), guest: bool(false), claimedAt: str(new Date().toISOString()) }, d);
        if (!w.ok) continue;
        const name = getStr(d.fields, "prizeName"), at = new Date().toISOString();
        await create("notes", { to: str(uid), title: str("You won " + name + "!"), body: str("Your dice prize (" + name + ") is added to your account by our team, normally within 24 hours."), createdAt: str(at) });
        out.push(name);
      }
      return res.status(200).json({ claimed: out });
    }

    /* ---------- today's allowance ---------- */
    let cur = null, used = guestUsed, limit = GUEST_MAX, streak = 0, last = "";
    if (uid) {
      cur = await get("dice/" + uid); const f = cur && cur.fields;
      last = getStr(f, "lastDate"); streak = getInt(f, "streak"); limit = MEMBER_MAX;
      used = last === today ? (f.count ? getInt(f, "count") : 1) : guestUsed;   /* visitor rolls from this device count towards the 6 */
    }
    if (action === "status") {
      const f = cur && cur.fields;
      return res.status(200).json({ member: !!uid, used, limit, left: Math.max(0, limit - used), streak: last === today || last === yest ? streak : 0, d1: f && last === today ? getInt(f, "lastD1") : 0, d2: f && last === today ? getInt(f, "lastD2") : 0 });
    }

    /* ---------- roll ---------- */
    if (used >= limit) return res.status(429).json({ error: "no rolls left", member: !!uid, used, limit, left: 0 });
    let firstOfDay = false;
    if (uid) {
      firstOfDay = last !== today;
      if (firstOfDay) streak = (last === yest ? streak : 0) + 1;
    } else {
      /* a second limit per network stops one person clearing their browser to roll again and again */
      const ip = String(req.headers["x-forwarded-for"] || req.socket && req.socket.remoteAddress || "").split(",")[0].trim();
      const ih = crypto.createHash("sha256").update("pb-dice|" + ip).digest("hex").slice(0, 16);
      if (!gid) return res.status(400).json({ error: "bad request" });
      const nd = await get("dice_guest/" + today + "_i_" + ih);
      if (getInt(nd && nd.fields, "n") >= NET_MAX) return res.status(429).json({ error: "no rolls left", member: false, used: GUEST_MAX, limit: GUEST_MAX, left: 0 });
      const w2 = await patch("dice_guest/" + today + "_i_" + ih, { n: int(getInt(nd && nd.fields, "n") + 1), day: str(today) }, nd);
      if (!w2.ok) return res.status(429).json({ error: "busy" });
    }
    const prize = drawPrize(firstOfDay, streak), [d1, d2] = faces(prize);
    const n = used + 1;
    /* the precondition makes two simultaneous rolls impossible: the second write is rejected */
    let w;
    if (uid) w = await patch("dice/" + uid, { lastDate: str(today), count: int(n), streak: int(streak), rolls: int(getInt(cur && cur.fields, "rolls") + 1), lastD1: int(d1), lastD2: int(d2) }, cur);
    else w = await patch("dice_guest/" + today + "_d_" + gid, { n: int(n), day: str(today) }, guestDoc);
    if (!w.ok) return res.status(429).json({ error: "busy" });

    const at = new Date().toISOString();
    let claim = "";
    if (prize) {
      if (uid) {
        await create("dice_wins", { uid: str(uid), email: str(email), guest: bool(false), prize: str(prize.id), prizeName: str(prize.name), at: str(at), fulfilled: bool(false) });
        await create("notes", { to: str(uid), title: str("You won " + prize.name + "!"), body: str(prize.id === "jackpot" ? "Congratulations! You hit the jackpot. Our team will contact you to verify and pay your prize." : "Your dice prize (" + prize.name + ") will be added to your account by our team, normally within 24 hours."), createdAt: str(at) });
      } else {
        claim = crypto.randomBytes(8).toString("hex");
        await create("dice_wins", { uid: str(""), email: str(""), guest: bool(true), prize: str(prize.id), prizeName: str(prize.name), at: str(at), fulfilled: bool(false) }, "g_" + claim);
      }
    }
    /* live feed for the admin */
    await create("dice_log", { uid: str(uid), email: str(email), guest: bool(!uid), d1: int(d1), d2: int(d2), prize: str(prize ? prize.id : ""), prizeName: str(prize ? prize.name : ""), at: str(at), ymd: str(today), n: int(n) });
    return res.status(200).json({ d1, d2, member: !!uid, used: n, limit, left: limit - n, streak: uid ? streak : 0, prize: prize ? prize.id : null, prizeName: prize ? prize.name : "", claim });
  } catch (e) {
    return res.status(500).json({ error: "server error" });
  }
};
