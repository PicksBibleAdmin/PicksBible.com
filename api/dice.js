/* Updated Dice Spin Handler with state auto-initialization & streak fix */
const admin = require("firebase-admin");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  
  const { uid, email } = req.body || {};
  if (!uid) return res.status(400).json({ error: "User ID required" });

  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);
  const todayStr = new Date().toISOString().slice(0, 10);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(userRef);
      let data = doc.exists ? doc.data() : {};

      // Initialize default fields if missing to prevent transaction failures on existing registered accounts
      let lastSpin = data.lastSpinDate || "";
      let spinsToday = (lastSpin === todayStr) ? (data.spinsToday || 0) : 0;
      let streak = data.streak || 0;
      const tier = data.tier || "free";
      const maxSpins = (tier === "gold" || tier === "vip") ? 6 : 3;

      if (spinsToday >= maxSpins) {
        throw new Error("No spins remaining today");
      }

      // Roll dice (1-6)
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const isJackpot = (d1 === 6 && d2 === 6);

      // Calculate streak logic
      let newStreak = streak;
      if (lastSpin !== todayStr) {
        const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        newStreak = (lastSpin === yesterdayStr) ? streak + 1 : 1;
      }

      const updatedSpins = spinsToday + 1;

      // Update counters safely
      transaction.set(userRef, {
        spinsToday: updatedSpins,
        lastSpinDate: todayStr,
        streak: newStreak,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Record live roll activity for admin panel stats tracking
      const rollRef = db.collection("dice_rolls").doc();
      transaction.set(rollRef, {
        uid: uid,
        email: email || data.email || "Registered User",
        d1: d1,
        d2: d2,
        result: isJackpot ? "$1,000 Jackpot" : "no prize",
        ymd: todayStr,
        at: new Date().toISOString()
      });

      return {
        d1: d1,
        d2: d2,
        spinsLeft: maxSpins - updatedSpins,
        spinsToday: updatedSpins,
        maxSpins: maxSpins,
        streak: newStreak,
        isJackpot: isJackpot
      };
    });

    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message || "Spin processing failed" });
  }
};
