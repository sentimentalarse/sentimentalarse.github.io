d3.json("data/ars/attr.json", function(data) {
    for (var i = 1; i < 9; i++) {
        var row = data[i];
        var playerName = row["Name"];
        var stats = row["Stats"];
        var radarChartOptions = {
                      name: playerName
                    };
        RadarChart("#defenders", stats, radarChartOptions);
        //break;
    }

    for (var i = 9; i < 16; i++) {
        var row = data[i];
        var playerName = row["Name"];
        var stats = row["Stats"];
        var radarChartOptions = {
                      name: playerName
                    };
        RadarChart("#midfielders", stats, radarChartOptions);
        //break;
    }

    for (var i = 16; i < data.length - 1; i++) {
        var row = data[i];
        var playerName = row["Name"];
        var stats = row["Stats"];
        var radarChartOptions = {
                      name: playerName
                    };
        RadarChart("#strikers", stats, radarChartOptions);
        //break;
    }

});
