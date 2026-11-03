/* PicksBible Admin Live Stats Module with Historical Date Selection */
(function() {
  "use strict";
  
  function initAdminStats() {
    var datePicker = document.getElementById("adminStatsDate");
    if (!datePicker) return;

    var today = new Date().toISOString().slice(0, 10);
    datePicker.value = today;

    datePicker.addEventListener("change", function(e) {
      var selectedDate = e.target.value;
      if (selectedDate) {
        fetchStatsForDate(selectedDate);
      }
    });

    fetchStatsForDate(today);
  }

  function fetchStatsForDate(ymd) {
    if (typeof firebase === "undefined" || !firebase.firestore) return;
    var fs = firebase.firestore();

    // Update active date title label if present
    var labelEl = document.getElementById("adminStatsDateLabel");
    if (labelEl) labelEl.textContent = ymd;
    
    // 1. Fetch Active Members for Selected Date
    fs.collection("activity").where("ymd", "==", ymd).get().then(function(snap) {
      var activeCount = snap.size;
      var el = document.getElementById("statActiveMembers");
      if (el) el.textContent = activeCount;
    }).catch(function(err) {
      console.error("Error fetching active members:", err);
    });

    // 2. Fetch Dice Rolls for Selected Date
    fs.collection("dice_rolls").where("ymd", "==", ymd).get().then(function(snap) {
      var totalRolls = snap.size;
      var el = document.getElementById("statDiceRolls");
      if (el) el.textContent = totalRolls;

      // Update Live Table Rows if container exists
      var tbody = document.getElementById("adminLiveRollsTable");
      if (tbody) {
        var rowsHtml = "";
        snap.forEach(function(doc) {
          var d = doc.data();
          rowsHtml += "<tr>" +
            "<td>" + (d.at ? d.at.slice(11, 19) : "--:--:--") + "</td>" +
            "<td>" + (d.email || d.uid || "Visitor") + "</td>" +
            "<td>" + (d.d1 || 0) + " + " + (d.d2 || 0) + "</td>" +
            "<td>" + (d.result || "no prize") + "</td>" +
            "</tr>";
        });
        tbody.innerHTML = rowsHtml || '<tr><td colspan="4">No dice rolls recorded for ' + ymd + '</td></tr>';
      }
    }).catch(function(err) {
      console.error("Error fetching dice rolls:", err);
    });
  }

  document.addEventListener("DOMContentLoaded", initAdminStats);
})();
