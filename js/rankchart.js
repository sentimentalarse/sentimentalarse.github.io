WIDTH = 350;
HEIGHT = 460;

LEFT_MARGIN = 10;
RIGHT_MARGIN = 20;
TOP_MARGIN = 10;
BOTTOM_MARGIN = 10;

RANK_RECT_WIDTH = 7;
RANK_RECT_HEIGHT = 15;
RANK_GAP = 5;

points = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

var svg = d3.select("#chart").append("svg")
      .attr("width", WIDTH + LEFT_MARGIN + RIGHT_MARGIN)
      .attr("height", HEIGHT + TOP_MARGIN + BOTTOM_MARGIN)
      .append("g");

function updateTable(side, index) {
    var tblData = []
    if (side == "left") {
        var tblData = eplRankChangeData.filter(function (obj) {
            return obj.start == index+1;
        });
    }
    if (side == "right") {
        var tblData = eplRankChangeData.filter(function (obj) {
            return obj.end == index+1;
        });
    }
    createTableBody(tblData);
}

svg.selectAll(".boxleft")
          .data(points)
          .enter()
          .append('rect')
          .attr('class', 'box')
          .attr('y', function(d, i) { return i*(RANK_RECT_HEIGHT+RANK_GAP); })
          .attr('x', function(d, i) { return 10; })
          .attr('width', RANK_RECT_WIDTH)
          .attr('height', RANK_RECT_HEIGHT)
          .style("stroke", "black")
          .style('fill', "#5F9F9F")
          .style('opacity', 0.9)
          .on('click', function(d, i) {updateTable("left", i)});

svg.selectAll(".boxright")
          .data(points)
          .enter()
          .append('rect')
          .attr('class', 'boxright')
          .attr('y', function(d, i) { return i*(RANK_RECT_HEIGHT+RANK_GAP); })
          .attr('x', function(d, i) { return 300; })
          .attr('width', RANK_RECT_WIDTH)
          .attr('height', RANK_RECT_HEIGHT)
          .style("stroke", "black")
          .style('fill', "#5F9F9F")
          .style('opacity', 0.7)
          .on('click', function(d, i) {updateTable("right", i)});

var diag = d3.svg.diagonal()
        .source(function(d) { return {"x":23, "y":(parseInt(d.start) - 1) * (RANK_RECT_HEIGHT+RANK_GAP) + RANK_RECT_HEIGHT/2.0};})
        .target(function(d) { return {"x":295, "y":(parseInt(d.end) - 1) * (RANK_RECT_HEIGHT+RANK_GAP) + RANK_RECT_HEIGHT/2.0};});


var columns = [{text: 'Standing after 12 games', colName: "start"},
               {text: 'Final Standing', colName: "end"},
               {text: 'Team', colName: "team"},
               {text: 'Season', colName: "season"}
              ];

var table = d3.select('#tbl').append('table');
table.attr('id', "minimalist-table");

table.append('thead').append('tr')
    .selectAll('th')
    .data(columns).enter()
    .append('th')
    .attr('class', 'fullrow')
    .text(function(d, i) {return d['text'];});

var tbody = table.append('tbody');

function createTableBody(tableData) {
    var rows = tbody.selectAll("tr")
        .data(tableData);

    rows.enter()
        .append("tr");

    rows.order();

    var cells = rows.selectAll("td")
        .data(function(row, i) {
            return columns.map(function(c) {
                return {column: c['colName'], value: row[c['colName']]};
            });
        });

    cells.enter()
        .append('td')

    cells.text(function(d) {return d['value'];});

    cells.exit().remove();
    rows.exit().remove();
}

var eplRankChangeData= [];
d3.csv("data/eplrankchange.csv", function(csvData) {
    eplRankChangeData = csvData;
    createTableBody(eplRankChangeData)
});

d3.csv("data/rankchangedn.csv", function(csvData) {
    var data = csvData;
    var link = svg.selectAll(".link")
        .data(data)
        .enter().append("path")
        .attr("class", "movement")
        .attr("stroke", "#e4e4e4")
        .attr('opacity', 0.7)
        .attr("stroke-width", function(d, i) {return d.counts * 2;})
        .attr("d", diag)
        .on("mouseover", mouseover)
        .on("mouseout", mouseout);

       function mouseover(d) {
            var start = d.start;
            var end = d.end;
            d3.select(this)
            .transition()
            .duration(100)
            .style("stroke", "#ffb2b2");
            var tblData = eplRankChangeData.filter(function (obj) {
                return obj.start == start && obj.end == end;
            });
            createTableBody(tblData);
        }

        function mouseout(d) {
            d3.selectAll('path')
            .transition()
            .duration(400)
            .style("stroke", "#e4e4e4");
            createTableBody(eplRankChangeData);
        } 
});

