var dataFile = ['data/combined.csv'];
var lineYs = {"England": 10, "France": 50, "Germany": 90, "Italy":130, "Spain": 170};
var cntrySvg = {"England": "images/eng.svg", "France": "images/fra.svg", "Germany": "images/ger.svg", "Italy": "images/ita.svg", "Spain": "images/spa.svg"};
var colorParam = "#53868B";

var margin = {top: 10, right: 10, bottom: 10, left: 10},
    width = 500 - margin.left - margin.right,
    height = 280 - margin.top - margin.bottom;

var svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);


d3.csv(dataFile, function(csvData) {
    var data = csvData;
    var bins = {};

    for(var inx = 0; inx < data.length; inx++){
        var d = data[inx];
        var cntry = d['CNTRY'];

        if (bins.hasOwnProperty(cntry)) {
            var record = bins[cntry];
            if (record.hasOwnProperty(d["PPG"].toString())) {
                record[d["PPG"].toString()].push(d["Team"]);
            } else {
                record[d["PPG"].toString()] = [d["Team"]]; 
            }
            bins[cntry] = record;
        } else {
            var record = {};
            record[d["PPG"].toString()] = [d["Team"]]; 
            bins[cntry] = record;
        }
    }

    var binnedData = [];
    for (property in bins) {
        var cntryData = bins[property];
        
        for (prop in cntryData){
            var teams = cntryData[prop];
            for (var i = 0; i < teams.length; i++) {
                var row = {};
                row["PPG"] = prop;
                row["RANK"] = i*5;
                row["TEAM"] = teams[i];
                row["CNTRY"] = property;
                binnedData.push(row);
            }
            
            
            var lineY = lineYs[property];
            //Chart line
            svg.append("line")
                .attr("class", "line")
                .attr("x1", 5)
                .attr("y1", lineY)
                .attr("x2", 305)
                .attr("y2", lineY);
            
            //Flag icons
            svg.append("image")
                .attr("xlink:href", cntrySvg[property])
                .attr("width", 30)
                .attr("height", 20)
                .attr("x", 310)
                .attr("y", lineY - 10);
        }
    }

    svg.selectAll("circle")
        .data(binnedData)
        .enter()
        .append('circle')
        .attr('class', 'circle')
        .style("fill", function(d, i) {return ((d["TEAM"]=="Arsenal") ? "#EF0107" : colorParam)})
        .attr("r", 5)
        .attr("cx", function(d, i) {return (parseFloat(d["PPG"]) * 100);})
        .attr("cy", function(d, i) {return (d["RANK"] + lineYs[d["CNTRY"]]);})
        .style("opacity", 0.9)
        .on('mousemove', function(d){mousemove(d)})
        .on("mouseover", mouseover)
        .on("mouseout", mouseout);
    
    //Tooltip for club circle
    var div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 1e-6);

    function mousemove(d){
        div
        .style("height", ((d["TEAM"].length > 10) ? 38 : 25) + "px")//Find better way to change size of tooltip
        .html(d["TEAM"] + ": " + parseFloat(d["PPG"])   .toFixed(2))
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
    
    //Axis line
    svg.append("line")
        .attr("class", "line")
        .attr("x1", 5)
        .attr("y1", 210)
        .attr("x2", 305)
        .attr("y2", 210);
    
    svg.append("line")
        .attr("class", "line")
        .attr("x1", 5)
        .attr("y1", 210)
        .attr("x2", 5)
        .attr("y2", 207);
    
    svg.append("line")
        .attr("class", "line")
        .attr("x1", 305)
        .attr("y1", 210)
        .attr("x2", 305)
        .attr("y2", 207);
    
    svg.append("line")
        .attr("class", "line")
        .attr("x1", 155)
        .attr("y1", 210)
        .attr("x2", 155)
        .attr("y2", 205);
    
    //Axis label
    svg.append("text")
        .attr("class", "axlbl")
        .attr("x", 303)
        .attr("y", 205)
        .text("3"); 

    svg.append("text")
        .attr("class", "axlbl")
        .attr("x", 2)
        .attr("y", 205)
        .text("0");

    //Chart title
    svg.append("text")
        .attr("class", "lbl")
        .attr("x", 18)
        .attr("y", 230)
        .text("Current points per game in top European leagues");
    
    });
