/* PicksBible Player Props Ingestion Engine */
function processNewPropEntry(rawPropData) {
  if (typeof firebase === "undefined" || !firebase.firestore) {
    return Promise.reject("Firebase Firestore not initialized");
  }

  var prop = {
    game: rawPropData.game || rawPropData.match || "NBA Game",
    player: rawPropData.player || "Unknown Player",
    type: rawPropData.type || "Player Points (Over/Under)",
    line: rawPropData.line || "0.5",
    odds: rawPropData.odds || "1.85",
    result: rawPropData.result || "pending",
    // AUTOMATIC LIVE TOGGLE: Defaults to true so props go live immediately upon creation
    live: rawPropData.live !== undefined ? Boolean(rawPropData.live) : true,
    createdAt: new Date().toISOString()
  };

  return firebase.firestore().collection("player_props").add(prop);
}
