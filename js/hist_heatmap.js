var dataFile = "arsenal_result";
    var margin = { top: 25, right: 0, bottom: 50, left: 15 },
      width = 480 - margin.left - margin.right,
      height = 800 - margin.top - margin.bottom,
      boxWidth = 8,
      boxHeight = 8,
      gridSize = 60,
      rows = 50,
      strokeColor = "#E6E6E6",
      strokeWidth = 1,
      colors = ["#449458", "#edebe8", "#f17f51"];
    
    var svg = d3.select("#chart").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g");
    
    d3.csv(dataFile, function(csvData) {
        var data = csvData;
        svg.selectAll(".box")
          .data(data)
          .enter()
          .append('rect')
          .attr('class', 'box')
          .attr('x', function(d, i) { return (i % gridSize) * boxWidth; })
          .attr('y', function(d, i) { return Math.floor(i/gridSize) * boxHeight; })
          .attr('width', boxWidth)
          .attr('height', boxHeight)
          .style('fill', function(d, i) {
                            var index = d["ArsenalWin"];
                            return colors[index];
                        })
          .style('opacity', 0.9)
          .style("stroke-width", strokeWidth)
          .style("stroke", strokeColor )
          .on('mousemove', function(d){mousemove(d)})
          .on("mouseover", mouseover)
          .on("mouseout", mouseout);
        
        var div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 1e-6);

        function mousemove(d){
            div
            .html("Date: " + d["match_date"] + "<br/>"  + "Vs: " + d.opponent
                 + "<br/>" + "Venue: " + d.venue
                 + "<br/>" + "Score: " + d.fulltime)
            .style("left", (d3.event.pageX ) + "px")
            .style("top", (d3.event.pageY) + "px");
        }

        function mouseover() {
            div.transition()
            .duration(300)
            .style("opacity", 1);
        }

        function mouseout() {
            div.transition()
            .duration(300)
            .style("opacity", 1e-6);
        }
    });
