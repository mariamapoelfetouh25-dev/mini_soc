/* ==========================================================================
   Mini-SOC · pages/attack-graph.js — Attack Graph explorer (Page E)
   ========================================================================== */
(function () {
  "use strict";
  var util = SOC.util;
  var ui = SOC.ui;

  SOC.registerPage("attack-graph", function () {
    var services = SOC.services;
    var href = SOC.nav.resolve;
    var params = util.params();

    var data = services.getGraph();
    document.getElementById("ag-sub").textContent =
      data.nodes.length + " entities · " + data.edges.length + " relationships · deterministic sample layout";
    document.getElementById("ag-legend").innerHTML = SOC.graph.legend();
    document.getElementById("ag-help-ico").innerHTML = ui.icon("info");

    var pathBtn = document.getElementById("ag-path");
    var detailHost = document.getElementById("ag-detail");
    var eventsHost = document.getElementById("ag-events");
    var eventsSub = document.getElementById("ag-events-sub");

    /* ---- Side panel: entity details ------------------------------------- */
    function renderDetail(node) {
      if (!node) {
        detailHost.innerHTML = ui.emptyState({
          icon: "network",
          title: "No entity selected",
          desc: "Click or focus an entity in the graph to see its details, techniques and related sample events."
        });
        return;
      }

      var asset = node.asset ? services.getAsset(node.asset) : null;
      var techniqueIds = node.techniques || [];
      var relatedEdges = data.edges.filter(function (edge) {
        return edge.from === node.id || edge.to === node.id;
      });

      detailHost.innerHTML =
        '<div class="node-detail">' +
        '<div class="row" style="gap:12px">' +
        '<span class="nd-badge" style="--nc:var(--nt-' + node.type + ')">' +
        ui.icon(iconForType(node.type)) +
        "</span>" +
        '<div><div class="nd-title">' + util.esc(node.label) + "</div>" +
        '<div class="nd-sub">' + util.esc(SOC.graph.TYPE_LABEL[node.type] || node.type) +
        (node.sub ? " · " + util.esc(node.sub) : "") + "</div></div></div>" +
        '<div class="row row-wrap" style="gap:8px;margin-top:12px">' +
        ui.sevBadge(node.risk.charAt(0).toUpperCase() + node.risk.slice(1)) +
        (node.compromised ? ui.badge("status-triggered", "Compromised", true) : "") +
        (node.suspicious ? ui.badge("status-investigating", "Suspicious", true) : "") +
        "</div>" +
        (asset
          ? '<dl class="meta-grid" style="margin-top:12px">' +
            '<div class="meta-item"><dt>Zone</dt><dd>' + util.esc(asset.zone) + "</dd></div>" +
            '<div class="meta-item"><dt>Address</dt><dd class="mono-id">' + util.esc(asset.ip) + "</dd></div>" +
            '<div class="meta-item"><dt>Owner</dt><dd>' + util.esc(asset.owner) + "</dd></div>" +
            '<div class="meta-item"><dt>Status</dt><dd>' + util.esc(asset.status) + "</dd></div>" +
            "</dl>"
          : "") +
        (techniqueIds.length
          ? '<div style="margin-top:12px"><div class="eyebrow" style="margin-bottom:6px">ATT&amp;CK techniques</div>' +
            techniqueIds
              .map(function (id) {
                var tech = services.getTechnique(id);
                return (
                  '<span class="ref-chip" title="' + util.esc(tech.name) + ' · ' + util.esc(tech.tactic) + '">' +
                  util.esc(id) + " · " + util.esc(tech.name) + "</span>"
                );
              })
              .join(" ") +
            "</div>"
          : "") +
        '<div class="xsmall subtle" style="margin-top:12px">Connected to ' + relatedEdges.length +
        " relationship(s) in the sample graph.</div>" +
        "</div>";

      eventsSub.textContent = "Events attached to " + node.label + " (sample records)";
      var events = services.graphEventsForNode(node.id);
      eventsHost.innerHTML = events.length
        ? '<ul class="list-divided">' +
          events
            .map(function (ev) {
              return (
                "<li><div class=\"row between row-wrap\" style=\"gap:10px\">" +
                '<div class="stack-2" style="min-width:0">' +
                '<div class="row row-wrap" style="gap:8px">' + ui.sevBadge(ev.severity) +
                '<a class="mono-id" href="' + href("events.html?event=" + ev.id) + '">' + util.esc(ev.id) + "</a></div>" +
                '<div class="small">' + util.esc(ev.title) + "</div>" +
                '<div class="xsmall subtle">' + util.esc(util.fmtDateTime(ev.ts)) + " · " + util.esc(ev.source) + "</div>" +
                "</div>" +
                ui.statusBadge(ev.status) +
                "</div></li>"
              );
            })
            .join("") +
          "</ul>"
        : ui.emptyState({
            icon: "events",
            title: "No events attached",
            desc: "This entity has no detailed sample events, but it may still appear in aggregates."
          });
    }

    function iconForType(type) {
      return {
        user: "user",
        endpoint: "cpu",
        server: "server",
        external: "globe",
        process: "bolt",
        file: "file",
        network: "link",
        decoy: "decoy"
      }[type] || "network";
    }

    /* ---- Side panel: sample attack path ---------------------------------- */
    function renderPathSummary() {
      var host = document.getElementById("ag-path-summary");
      host.innerHTML =
        '<div class="xsmall subtle">Eight entities in the sample chain, external → impact:</div>' +
        '<div class="path-chain">' +
        data.attackPath
          .map(function (id, index) {
            var node = services.getGraphNode(id);
            if (!node) return "";
            return (
              (index ? '<span class="subtle" aria-hidden="true">→</span>' : "") +
              '<button class="path-node" type="button" data-path-node="' + id + '">' +
              ui.icon(iconForType(node.type)) + util.esc(node.label) + "</button>"
            );
          })
          .join("") +
        "</div>" +
        '<p class="xsmall subtle" style="margin:6px 0 0">This chain is illustrative sample content, not a measured replay.</p>';
    }

    document.getElementById("ag-path-summary").addEventListener("click", function (event) {
      var button = event.target.closest("[data-path-node]");
      if (!button) return;
      graph.selectNode(button.dataset.pathNode);
      graph.focusNode(button.dataset.pathNode);
    });

    /* ---- Graph instance ---------------------------------------------------- */
    var host = document.getElementById("attack-graph");
    host.classList.add("tall");

    var graph = SOC.graph.create(host, {
      ariaLabel: "Attack graph — Tab to move between entities, Enter to select, Escape to clear",
      onSelectNode: function (node) {
        renderDetail(node);
      }
    });
    graph.render(data);
    renderDetail(null);
    renderPathSummary();

    /* ---- Toolbar ----------------------------------------------------------- */
    document.getElementById("ag-reset").addEventListener("click", function () {
      graph.reset();
      ui.toast("View reset to the full graph.", { tone: "info", duration: 2000 });
    });

    function syncPathButton() {
      var on = graph.isPathVisible();
      pathBtn.setAttribute("aria-pressed", on ? "true" : "false");
      pathBtn.textContent = "Attack path: " + (on ? "on" : "off");
    }
    pathBtn.addEventListener("click", function () {
      graph.setPathVisible(!graph.isPathVisible());
      syncPathButton();
    });
    syncPathButton();

    /* ---- Deep links --------------------------------------------------------- */
    if (params.get("path") === "0") {
      graph.setPathVisible(false);
      syncPathButton();
    }
    if (params.get("incident")) {
      var incident = services.getIncident(params.get("incident"));
      if (incident && incident.graphNodes && incident.graphNodes.length) {
        graph.selectNode(incident.graphNodes[0]);
        ui.toast("Showing the first entity linked to " + incident.id + ".", {
          tone: "info",
          duration: 3000
        });
      }
    }
    var focusId = params.get("focus");
    if (focusId && services.getGraphNode(focusId)) {
      graph.selectNode(focusId);
      graph.focusNode(focusId);
    }
  });
})();
