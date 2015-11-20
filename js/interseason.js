var table2 = d3.select('#mtbl').append('table');
table2.attr('id', "minimalist-table");
table2.attr("class", "u-full-width");

var thead = table2.append('thead')
var topHRow = thead.append('tr')
topHRow.append('th')
    .attr('colspan', "1")
    .attr("style", "border-bottom:none;")
    .text("");

topHRow.append('th')
    .attr("colspan", "5")
    .attr("style", "border-bottom:2px solid #d3d3d3; text-align:center;")
    .attr("align", "center")
    .text("Destination class");

columnNames = ["Origin class", 'Elites', 'Wannabes', 'Middlers', 'Strugglers', 'No-hopers'];

thead.append('tr')
    .selectAll('th')
    .data(columnNames).enter()
    .append('th')
    .attr("style", "border-bottom:2px solid #d3d3d3; border-top:none;")
    .text(function(d, i) {return d;});

var tbody2 = table2.append('tbody');

d3.csv("data/interseasonal.csv", function(data){
    var rows = tbody2.selectAll("tr")
        .data(data)

    rows.enter()
        .append("tr")

    var cells = rows.selectAll("td")
        .data(function(row, i) {
            return columnNames.map(function(c) {
                console.log(row);
                console.log(c);
                return {column: c, value: row[c]};
            });
        });

    cells.enter()
        .append('td')

    cells.text(function(d) { return d['value'];});

    cells.exit().remove();
    rows.exit().remove();
});
