/* ==========================================================================
   Mini-SOC · pages/overview.js — Overview dashboard (Page A)
   ========================================================================== */
(function () {
  "use strict";
  var util = SOC.util;
  var ui = SOC.ui;

  SOC.registerPage("overview", function () {
    var services = SOC.services;
    var href = SOC.nav.resolve; /* resolves bare page links for any page depth */

    /* ---- KPI row ------------------------------------------------------- */
    var k = services.kpis();
    document.getElementById("kpi-row").innerHTML =
      ui.kpi({
        label: "Total security events",
        value: k.events.toLocaleString("en-US"),
        hint: "Last 7 days · 6-hour buckets (sample)",
        icon: "activity",
        tone: "var(--accent)"
      }) +
      ui.kpi({
        label: "Open incidents",
        value: String(k.openIncidents),
        hint: k.criticalNow + " critical currently open",
        icon: "incidents",
        tone: "var(--sev-high)"
      }) +
      ui.kpi({
        label: "Detected threats",
        value: String(k.threats),
        hint: "Blocked or flagged indicators (sample)",
        icon: "target",
        tone: "var(--sev-critical)"
      }) +
      ui.kpi({
        label: "Monitored assets",
        value: String(k.assets),
        hint: services.listAssets().length + " detailed records · 5 are decoys",
        icon: "server",
        tone: "var(--lav)"
      });

    /* ---- Events over time --------------------------------------------- */
    SOC.charts.areaChart(document.getElementById("chart-events"), {
      series: services.getEventSeries(),
      height: 230,
      ariaLabel: "Security events over the last seven days, six-hour buckets, sample data",
      summary:
        "Sample event volume rises from roughly 140 per bucket on 07 Oct to a peak of 388 on 09 Oct."
    });

    /* ---- Severity distribution ---------------------------------------- */
    var sevColors = {
      Critical: "var(--sev-critical)",
      High: "var(--sev-high)",
      Medium: "var(--sev-medium)",
      Low: "var(--sev-low)",
      Informational: "var(--sev-info)"
    };
    var totals = services.getSeverityTotals();
    var sum = util.sum(totals, function (row) {
      return row.value;
    });
    SOC.charts.donut(document.getElementById("chart-severity"), {
      data: totals.map(function (row) {
        return { label: row.severity, value: row.value, color: sevColors[row.severity] || "var(--accent)" };
      }),
      centerValue: sum.toLocaleString("en-US"),
      centerLabel: "events",
      ariaLabel: "Severity distribution of sample security events"
    });

    /* ---- Network graph (signature component) --------------------------- */
    var graphHost = document.getElementById("overview-graph");
    var detailHost = document.getElementById("overview-graph-detail");
    var legendHost = document.getElementById("overview-graph-legend");
    legendHost.innerHTML = SOC.graph.legend();

    var graph = SOC.graph.create(graphHost, {
      ariaLabel: "Attack graph overview — sample entity relationships",
      onSelectNode: function (node) {
        if (!node) {
          detailHost.hidden = true;
          detailHost.innerHTML = "";
          return;
        }
        var events = services.graphEventsForNode(node.id);
        detailHost.hidden = false;
        detailHost.innerHTML =
          '<div class="row between row-wrap" style="gap:12px">' +
          '<div class="row" style="gap:12px">' +
          '<span class="nd-badge" style="--nc:' + (SOC.graph.TYPE_LABEL[node.type] ? "var(--nt-" + node.type + ")" : "var(--accent)") + '">' +
          ui.icon(node.type === "endpoint" ? "cpu" : node.type === "server" ? "server" : node.type === "user" ? "user" : node.type === "file" ? "file" : node.type === "decoy" ? "decoy" : "globe") +
          "</span>" +
          "<div><div class=\"nd-title\">" + util.esc(node.label) + "</div>" +
          '<div class="nd-sub">' + util.esc(SOC.graph.TYPE_LABEL[node.type] || node.type) +
          (node.sub ? " · " + util.esc(node.sub) : "") + "</div></div></div>" +
          '<div class="row" style="gap:8px">' +
          ui.sevBadge(node.risk.charAt(0).toUpperCase() + node.risk.slice(1)) +
          '<span class="badge badge-outline">' + events.length + " related sample events</span>" +
          '<a class="btn btn-sm" href="' + href("attack-graph.html?focus=" + encodeURIComponent(node.id)) + '">Inspect</a>' +
          "</div></div>";
      }
    });
    graph.render(services.getGraph());

    var pathBtn = document.getElementById("ov-graph-path");
    pathBtn.addEventListener("click", function () {
      var next = !graph.isPathVisible();
      graph.setPathVisible(next);
      pathBtn.setAttribute("aria-pressed", next ? "true" : "false");
      pathBtn.textContent = next ? "Attack path" : "Show path";
    });

    /* ---- Activity timeline -------------------------------------------- */
    var timeline = document.getElementById("activity-timeline");
    timeline.innerHTML = services.getActivity().map(function (item) {
      return (
        '<li class="tl-item">' +
        '<span class="tl-dot" style="--tl-color:var(--sev-' + (item.tone === "low" ? "low" : item.tone) + ')"></span>' +
        '<div class="tl-body">' +
        '<div class="tl-head"><span class="tl-title">' + util.esc(item.title) + "</span>" +
        '<time class="tl-time" datetime="' + new Date(item.ts).toISOString() + '">' + util.esc(util.fmtDateTime(item.ts)) + "</time></div>" +
        '<div class="tl-desc">' + util.esc(item.desc) + "</div>" +
        '<a class="xsmall" href="' + util.esc(href(item.link)) + '">' + util.esc(item.linkLabel) + " →</a>" +
        "</div></li>"
      );
    }).join("");

    /* ---- High-priority incidents -------------------------------------- */
    var priority = services
      .listIncidents({ status: "open", sort: "riskScore", dir: "desc", pageSize: 100 })
      .rows.filter(function (inc) {
        return inc.severity === "Critical" || inc.severity === "High";
      })
      .slice(0, 5);

    var host = document.getElementById("priority-incidents");
    if (!priority.length) {
      host.innerHTML = ui.emptyState({
        icon: "check-circle",
        title: "No high-priority incidents",
        desc: "Open incidents with Critical or High severity will appear here."
      });
    } else {
      host.innerHTML =
        '<ul class="list-divided" style="padding:16px 20px">' +
        priority.map(function (inc) {
          return (
            '<li><div class="row between row-wrap" style="gap:10px">' +
            '<div class="stack-2" style="min-width:0">' +
            '<div class="row row-wrap" style="gap:8px">' + ui.sevBadge(inc.severity) +
            ui.statusBadge(inc.status) +
            '<a class="strong small" href="' + href("investigation.html?id=" + inc.id) + '">' + util.esc(inc.id) + "</a></div>" +
            '<div class="small muted truncate">' + util.esc(inc.title) + "</div>" +
            '<div class="xsmall subtle">' + util.esc(inc.owner) + " · updated " + util.esc(util.relTime(inc.updatedAt)) + "</div>" +
            "</div>" +
            '<div class="risk-pill"><span class="rp-num" style="color:var(--sev-' +
            (inc.riskScore >= 80 ? "critical" : inc.riskScore >= 60 ? "high" : "medium") + ')">' +
            inc.riskScore + '</span><span class="rp-label">risk</span></div>' +
            "</div></li>"
          );
        }).join("") +
        "</ul>";
    }

    /* ---- Hunting findings --------------------------------------------- */
    var findings = services.getHuntingFindings();
    var huntHost = document.getElementById("hunting-results");
    huntHost.innerHTML =
      '<ul class="list-divided" style="padding:16px 20px">' +
      findings.map(function (finding) {
        return (
          '<li><div class="row between row-wrap" style="gap:10px">' +
          '<div class="stack-2" style="min-width:0">' +
          '<div class="row row-wrap" style="gap:8px">' +
          ui.badge(finding.status === "Escalated" ? "status-investigating" : "badge-outline", finding.status, true) +
          '<span class="small strong">' + util.esc(finding.title) + "</span></div>" +
          '<div class="mono-id">' + util.esc(finding.queryId) + " · " + finding.matches +
          " matches · " + util.esc(util.fmtDateTime(finding.ts)) + "</div>" +
          (finding.incident
            ? '<a class="xsmall" href="' + href("investigation.html?id=" + finding.incident) + '">Linked to ' + finding.incident + " →</a>"
            : '<span class="xsmall subtle">No incident linked</span>') +
          "</div>" +
          '<a class="btn btn-sm" href="' + href("threat-hunting.html?q=" + encodeURIComponent(finding.queryId)) + '">Re-run</a>' +
          "</div></li>"
        );
      }).join("") +
      "</ul>";

    /* ---- Quick links ---------------------------------------------------- */
    var counts = services.incidentStatusCounts();
    var links = [
      { href: "incidents.html?status=open", icon: "shield", title: "Active investigations", desc: counts.open + " incidents are still open and need analyst time." },
      { href: "incidents.html?status=New", icon: "flag", title: "Waiting for triage", desc: counts.New + " incident(s) have no owner yet." },
      { href: "attack-graph.html?path=1", icon: "network", title: "Sample attack path", desc: "Walk the highlighted chain from external IP to payload." },
      { href: "incident-response.html?id=INC-2026-1039", icon: "response", title: "Pending response approvals", desc: "Sensitive actions are waiting for human confirmation." },
      { href: "deception.html", icon: "decoy", title: "Deception alerts", desc: "Simulated decoys that were triggered in the demo window." },
      { href: "threat-hunting.html", icon: "hunting", title: "Threat hunting", desc: "Six saved queries with history and local results." }
    ];
    document.getElementById("quick-links").innerHTML = links
      .map(function (link) {
        return (
          '<a class="card card-pad" href="' + href(link.href) + '" style="text-decoration:none">' +
          '<div class="row" style="gap:10px;margin-bottom:6px">' +
          '<span class="kpi-ico" style="--kpi-accent:var(--accent)">' + ui.icon(link.icon) + "</span>" +
          '<span class="strong">' + util.esc(link.title) + "</span>" +
          '<span style="margin-left:auto;color:var(--text-3)">' + ui.icon("arrow-right") + "</span></div>" +
          '<p class="small muted" style="margin:0">' + util.esc(link.desc) + "</p>" +
          "</a>"
        );
      })
      .join("");
  });
})();
