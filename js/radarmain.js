(function () {
  SiteCharts.load("json", "data/ars/attr.json", function (data) {
    data.forEach(function (player) {
      var target;
      if (player.Position === "GK") return; // Outfield metrics do not describe goalkeepers.
      if (player.Position.indexOf("FW") !== -1) target = "#strikers";
      else if (/^D\(/.test(player.Position)) target = "#defenders";
      else target = "#midfielders";
      RadarChart(target, player.Stats, {name: player.Name});
    });
  });
}());
