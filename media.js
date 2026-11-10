/* Serves images uploaded in the admin blog editor: /media/<name>-<id>.<ext> reads public/media-<id> from Firestore. */
const FS = "https://firestore.googleapis.com/v1/projects/picksbible-7fa7f/databases/(default)/documents/public/media-";
const KEY = "AIzaSyBBnSFHx_z1YWwOXz6sdKOSzelTIuvusa8";
module.exports = async function handler(req, res) {
  const raw = String((req.query && req.query.id) || ""), m = raw.match(/([a-z0-9]+)\.[a-z0-9]+$/i), id = m ? m[1] : "";
  if (!/^[a-z0-9]{6,40}$/i.test(id)) { res.statusCode = 404; return res.end("Not found"); }
  try {
    const r = await fetch(FS + id + "?key=" + KEY);
    if (r.status === 404) { res.statusCode = 404; res.setHeader("Cache-Control", "public, s-maxage=60"); return res.end("Not found"); }
    if (!r.ok) throw new Error("Firestore " + r.status);
    const f = ((await r.json()).fields) || {}, mime = (f.mime && f.mime.stringValue) || "image/webp", b = (f.b64 && f.b64.stringValue) || "";
    if (!/^image\/(webp|png|jpeg|gif|svg\+xml)$/.test(mime) || !b) { res.statusCode = 404; return res.end("Not found"); }
    const buf = Buffer.from(b, "base64");
    res.statusCode = 200; res.setHeader("Content-Type", mime); res.setHeader("Content-Length", buf.length);
    res.setHeader("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");
    if (mime === "image/svg+xml") res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'");
    res.setHeader("X-Content-Type-Options", "nosniff"); res.end(buf);
  } catch (e) { res.statusCode = 502; res.setHeader("Cache-Control", "no-store"); res.end("Error"); }
};
