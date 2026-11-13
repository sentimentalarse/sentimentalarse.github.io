/* Shared loading, failure reporting, and keyboard-readable data alternatives. */
(function () {
  "use strict";
  function element(tag, text, parent) {
    var node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (parent) parent.appendChild(node);
    return node;
  }
  function dataTable(url, data) {
    var rows = [];
    data.forEach(function (row) {
      if (row.Stats) row.Stats.forEach(function (stat) {
        rows.push({Player: row.Name, Position: row.Position, Metric: stat.axis, "Normalized value": stat.value});
      });
      else rows.push(row);
    });
    if (!rows.length) return;
    var details = element("details", undefined, document.getElementById("content"));
    details.className = "data-table";
    element("summary", "View accessible data: " + url.split("/").pop(), details);
    var download = element("a", "Download source data", details);
    download.href = "/" + url;
    download.setAttribute("download", "");
    var scroll = element("div", undefined, details);
    scroll.className = "table-scroll";
    scroll.tabIndex = 0;
    scroll.setAttribute("role", "region");
    scroll.setAttribute("aria-label", "Scrollable source data");
    var table = element("table", undefined, scroll);
    element("caption", "Historical source data — " + rows.length + " records", table);
    var keys = Object.keys(rows[0]);
    var head = element("tr", undefined, element("thead", undefined, table));
    keys.forEach(function (key) { element("th", key, head).scope = "col"; });
    var body = element("tbody", undefined, table);
    var status = element("p", undefined, details);
    status.setAttribute("aria-live", "polite");
    var page = 0, size = 50;
    var previous = element("button", "Previous records", details);
    var next = element("button", "Next records", details);
    previous.type = next.type = "button";
    function render() {
      body.textContent = "";
      rows.slice(page * size, (page + 1) * size).forEach(function (row) {
        var tr = element("tr", undefined, body);
        keys.forEach(function (key) { element("td", String(row[key]), tr); });
      });
      status.textContent = "Records " + (page * size + 1) + "–" + Math.min((page + 1) * size, rows.length) + " of " + rows.length;
      previous.disabled = page === 0;
      next.disabled = (page + 1) * size >= rows.length;
    }
    previous.onclick = function () { page--; render(); };
    next.onclick = function () { page++; render(); };
    render();
  }
  function enhance() {
    document.querySelectorAll("#content svg").forEach(function (svg) {
      var w = svg.getAttribute("width"), h = svg.getAttribute("height");
      if (w && h) svg.setAttribute("viewBox", "0 0 " + w + " " + h);
      svg.setAttribute("role", "group");
      svg.setAttribute("aria-label", "Historical football visualization. Source records are available in the data tables below.");
    });
    var marks = document.querySelectorAll("#chart circle, #chart rect, .radarInvisibleCircle");
    var selection = document.getElementById("chart-selection");
    if (marks.length && !selection) {
      selection = element("p", "Select a chart mark to read its values. Full records are available in the data tables.", document.getElementById("content"));
      selection.id = "chart-selection";
      selection.setAttribute("role", "status");
    }
    marks.forEach(function (node) {
      if (node.__valueReady) return;
      var d = node.__data__;
      if (!d || typeof d !== "object") return;
      node.__valueReady = true;
      var label;
      if (d.TEAM) label = d.TEAM + ": " + Number(d.PPG).toFixed(2) + " points per game (" + d.CNTRY + ")";
      else if (d.match_date) label = d.match_date + ": Arsenal vs " + d.opponent + ", " + d.venue + ", score " + d.fulltime;
      else if (d.axis) label = node.closest(".chart-container").querySelector(".lblP").textContent + ": " + d.axis + " " + Math.round(d.value * 100) + "% of team leader";
      else return;
      var title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = label;
      node.appendChild(title);
      node.setAttribute("aria-label", label);
      node.addEventListener("click", function () { selection.textContent = label; });
      // Avoid thousands of heatmap tab stops; its data table provides keyboard access.
      if (!d.match_date) {
        node.setAttribute("tabindex", "0");
        node.setAttribute("role", "button");
        node.addEventListener("keydown", function (event) {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selection.textContent = label;
          }
        });
      }
    });
    document.querySelectorAll("#chart .box, #chart .boxright, #chart .movement").forEach(function (node) {
      // The heatmap has thousands of cells; its paginated table is the keyboard alternative.
      if (node.__keyboardReady || !document.getElementById("tbl")) return;
      node.__keyboardReady = true;
      node.tabIndex = 0;
      var d = node.__data__;
      var path = node.tagName.toLowerCase() === "path";
      node.setAttribute("role", "button");
      node.setAttribute("aria-label", path ? "Show transitions from rank " + d.start + " to " + d.end : "Filter " + (node.classList.contains("boxright") ? "final" : "initial") + " rank " + d);
      node.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          node.dispatchEvent(new MouseEvent(path ? "mouseover" : "click", {bubbles: true}));
        }
      });
    });
  }
  window.SiteCharts = {
    load: function (type, url, callback) {
      var status = element("p", "Loading " + url.split("/").pop() + "…", document.getElementById("content"));
      status.className = "chart-status";
      status.setAttribute("role", "status");
      d3[type](url, function (error, data) {
        if (error || !Array.isArray(data) || !data.length) {
          status.classList.add("chart-error");
          status.textContent = "Unable to load " + url + ". Please reload the page or try again later.";
          return;
        }
        try {
          callback(data);
          dataTable(url, data);
          enhance();
          status.textContent = "Loaded " + data.length + " historical records from " + url + ".";
        } catch (failure) {
          status.classList.add("chart-error");
          status.textContent = "This visualization could not be rendered. Source data: " + url;
          var link = element("a", " Download data", status);
          link.href = "/" + url;
          console.error(failure);
        }
      });
    }
  };
}());
