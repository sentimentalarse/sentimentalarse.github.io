/* Load GoatCounter only on explicitly configured production hosts. */
(function () {
  "use strict";
  var config = document.currentScript;
  if (!config || window.location.protocol !== "https:") return;
  var endpoint = config.getAttribute("data-endpoint");
  var hosts = (config.getAttribute("data-production-hosts") || "").split(",");
  if (!endpoint || hosts.indexOf(window.location.hostname) === -1) return;
  if (document.querySelector('script[src="https://gc.zgo.at/count.js"]')) return;
  var script = document.createElement("script");
  script.async = true;
  script.src = "https://gc.zgo.at/count.js";
  script.setAttribute("data-goatcounter", endpoint);
  document.head.appendChild(script);
}());
