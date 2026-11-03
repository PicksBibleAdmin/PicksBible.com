/* PicksBible Frontend Application Core */
(function() {
  "use strict";

  function escHtml(str) {
    return String(str || "").replace(/[&<>"']/g, function(s) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s];
    });
  }

  // Renders Basketball Player Props grouped into non-pulsating bordered cards per match
  window.renderGroupedPlayerProps = function(propsList, targetContainer) {
    if (!targetContainer) return;
    if (!propsList || !propsList.length) {
      targetContainer.innerHTML = '<div class="empty" style="padding:20px; text-align:center; color:var(--text-muted);">No player props available.</div>';
      return;
    }

    // Group props by match title
    var groups = {};
    propsList.forEach(function(item) {
      var matchTitle = item.game || item.match || "NBA Matchup";
      if (!groups[matchTitle]) groups[matchTitle] = [];
      groups[matchTitle].push(item);
    });

    var html = "";
    for (var matchName in groups) {
      // 4-side border card with small team/match text header
      html += '<div class="match-prop-group">';
      html += '<div class="match-prop-header">&#127936; ' + escHtml(matchName) + '</div>';
      
      groups[matchName].forEach(function(p) {
        var isWon = p.result === "won";
        var isLost = p.result === "lost";
        var statusBadge = isWon ? '<span style="background:#10b981; color:#fff; padding:2px 8px; border-radius:99px; font-size:11px; font-weight:700;">&#10003; WON</span>' :
                          (isLost ? '<span style="background:#ef4444; color:#fff; padding:2px 8px; border-radius:99px; font-size:11px; font-weight:700;">&#10007; LOST</span>' : '');

        html += '<div class="match-prop-row">';
        html += '<div>';
        html += '<strong style="font-size:15px;">' + escHtml(p.player) + '</strong> ';
        html += '<small style="color:var(--text-muted); font-size:12px;">' + escHtml(p.type) + '</small>';
        html += '</div>';
        html += '<div style="display:flex; align-items:center; gap: 10px;">';
        if (statusBadge) html += statusBadge;
        html += '<span style="font-weight:700; color:var(--primary); background:rgba(255,124,0,0.1); padding:4px 10px; border-radius:6px; font-size:13px;">' + escHtml(p.line) + '</span>';
        html += '<span style="font-weight:700; font-size:13px; color:var(--text);">' + escHtml(p.odds) + '</span>';
        html += '</div>';
        html += '</div>';
      });

      html += '</div>';
    }

    targetContainer.innerHTML = html;
  };
})();
