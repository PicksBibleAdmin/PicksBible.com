/* Tells the page which country the visitor is in (Vercel adds the header), so affiliate buttons can be matched to the country.
   Nothing is stored and nothing identifies the visitor. */
module.exports = function handler(req, res) {
  const cc = String(req.headers["x-vercel-ip-country"] || "").toUpperCase();
  res.setHeader("Cache-Control", "private, no-store");
  res.status(200).json({ c: /^[A-Z]{2}$/.test(cc) ? cc : "" });
};
