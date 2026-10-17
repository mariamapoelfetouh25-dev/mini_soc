/* ==========================================================================
   Mini-SOC · pages/reports.js — Reports builder + print/CSV output (Page J)
   ========================================================================== */
(function () {
  "use strict";
  var util = SOC.util;
  var ui = SOC.ui;

  SOC.registerPage("reports", function () {
    var services = SOC.services;

    var state = { report: null, sections: null };

    function readOptions() {
      var from = document.getElementById("rp-from").value || "2026-10-07";
      var to = document.getElementById("rp-to").value || "2026-10-09";
      return {
        from: Date.parse(from + "T00:00:00"),
        to: Date.parse(to + "T23:59:59"),
        severity: document.getElementById("rp-severity").value,
        status: document.getElementById("rp-status").value,
        format: document.getElementById("rp-format").value,
        sections: {
          overview: document.getElementById("rp-sec-overview").checked,
          incidents: document.getElementById("rp-sec-incidents").checked,
          events: document.getElementById("rp-sec-events").checked,
          hunting: document.getElementById("rp-sec-hunting").checked,
          deception: document.getElementById("rp-sec-deception").checked
        }
      };
    }

    function statusFilter(rows) {
      var status = document.getElementById("rp-status").value;
      if (status === "all") return rows;
      if (status === "open") {
        return rows.filter(function (inc) {
          return services.OPEN_STATUSES.indexOf(inc.status) !== -1;
        });
      }
      return rows.filter(function (inc) {
        return inc.status === status;
      });
    }

    /* ---- Section renderers -------------------------------------------------- */
    function overviewSection(report, incidents) {
      var open = incidents.filter(function (inc) {
        return services.OPEN_STATUSES.indexOf(inc.status) !== -1;
      }).length;
      var critical = report.events.filter(function (ev) {
        return ev.severity === "Critical";
      }).length;
      var sevRows = ["Critical", "High", "Medium", "Low"].map(function (sev) {
        return "<tr><td>" + ui.sevBadge(sev) + "</td><td class='num'>" + (report.eventBySeverity[sev] || 0) +
          "</td><td class='num'>" + (report.incidentBySeverity[sev] || 0) + "</td></tr>";
      }).join("");

      return (
        '<section class="report-section"><h3>Overview statistics</h3>' +
        '<div class="report-stats">' +
        '<div class="report-stat"><div class="rs-value">' + incidents.length + '</div><div class="rs-label">Incidents in range</div></div>' +
        '<div class="report-stat"><div class="rs-value">' + open + '</div><div class="rs-label">Still open</div></div>' +
        '<div class="report-stat"><div class="rs-value">' + report.events.length + '</div><div class="rs-label">Detailed sample events</div></div>' +
        '<div class="report-stat"><div class="rs-value">' + critical + '</div><div class="rs-label">Critical events</div></div>' +
        "</div>" +
        '<table class="table"><thead><tr><th scope="col">Severity</th>' +
        '<th scope="col" class="num">Events</th><th scope="col" class="num">Incidents</th></tr></thead>' +
        "<tbody>" + sevRows + "</tbody></table></section>"
      );
    }

    function incidentsSection(incidents) {
      if (!incidents.length) {
        return '<section class="report-section"><h3>Incident list</h3><p class="small muted">No incidents match this window and filter.</p></section>';
      }
      return (
        '<section class="report-section"><h3>Incident list</h3>' +
        '<table class="table"><thead><tr><th scope="col">ID</th><th scope="col">Severity</th>' +
        '<th scope="col">Status</th><th scope="col">Title</th><th scope="col">Owner</th>' +
        '<th scope="col">Created</th><th scope="col" class="num">Risk</th></tr></thead><tbody>' +
        incidents
          .map(function (inc) {
            return (
              "<tr><td class='mono-id'>" + util.esc(inc.id) + "</td>" +
              "<td>" + ui.sevBadge(inc.severity) + "</td>" +
              "<td>" + ui.statusBadge(inc.status) + "</td>" +
              "<td>" + util.esc(inc.title) + "</td>" +
              "<td>" + util.esc(inc.owner) + "</td>" +
              "<td class='nowrap num'>" + util.esc(util.fmtDate(inc.createdAt)) + "</td>" +
              "<td class='num'>" + inc.riskScore + "</td></tr>"
            );
          })
          .join("") +
        "</tbody></table></section>"
      );
    }

    function eventsSection(report) {
      var bySource = Object.keys(report.eventBySource).map(function (source) {
        return "<tr><td>" + util.esc(source) + "</td><td class='num'>" + report.eventBySource[source] + "</td></tr>";
      });
      var bySeverity = ["Critical", "High", "Medium", "Low"].map(function (sev) {
        var count = report.eventBySeverity[sev] || 0;
        return "<tr><td>" + ui.sevBadge(sev) + "</td><td class='num'>" + count + "</td></tr>";
      });

      return (
        '<section class="report-section"><h3>Event summary</h3>' +
        '<div class="grid grid-2" style="gap:16px">' +
        '<div><div class="eyebrow" style="margin-bottom:6px">By severity</div>' +
        '<table class="table"><thead><tr><th scope="col">Severity</th><th scope="col" class="num">Events</th></tr></thead>' +
        "<tbody>" + bySeverity.join("") + "</tbody></table></div>" +
        '<div><div class="eyebrow" style="margin-bottom:6px">By collector</div>' +
        '<table class="table"><thead><tr><th scope="col">Source</th><th scope="col" class="num">Events</th></tr></thead>' +
        "<tbody>" + bySource.join("") + "</tbody></table></div>" +
        "</div></section>"
      );
    }

    function huntingSection(report) {
      if (!report.hunting.length) {
        return '<section class="report-section"><h3>Threat-hunting results</h3><p class="small muted">No hunting findings recorded.</p></section>';
      }
      return (
        '<section class="report-section"><h3>Threat-hunting results</h3>' +
        '<table class="table"><thead><tr><th scope="col">Finding</th><th scope="col">Query</th>' +
        '<th scope="col" class="num">Matches</th><th scope="col">Status</th><th scope="col">Incident</th></tr></thead><tbody>' +
        report.hunting
          .map(function (finding) {
            return (
              "<tr><td>" + util.esc(finding.title) + "</td>" +
              "<td class='mono-id'>" + util.esc(finding.queryId) + "</td>" +
              "<td class='num'>" + finding.matches + "</td>" +
              "<td>" + ui.badge(finding.status === "Escalated" ? "status-investigating" : "badge-outline", finding.status) + "</td>" +
              "<td class='mono-id'>" + util.esc(finding.incident || "—") + "</td></tr>"
            );
          })
          .join("") +
        "</tbody></table></section>"
      );
    }

    function deceptionSection(report) {
      if (!report.decoyTriggers.length) {
        return '<section class="report-section"><h3>Deception activity</h3><p class="small muted">No deception interactions in this window.</p></section>';
      }
      return (
        '<section class="report-section"><h3>Deception activity (simulated)</h3>' +
        '<table class="table"><thead><tr><th scope="col">Time</th><th scope="col">Decoy</th>' +
        '<th scope="col">Actor</th><th scope="col">Interaction</th></tr></thead><tbody>' +
        report.decoyTriggers
          .map(function (row) {
            return (
              "<tr><td class='nowrap num'>" + util.esc(util.fmtDateTime(row.ts)) + "</td>" +
              "<td class='cell-strong'>" + util.esc(row.decoy) + "</td>" +
              "<td><code>" + util.esc(row.actor) + "</code></td>" +
              "<td>" + util.esc(row.action) + "</td></tr>"
            );
          })
          .join("") +
        "</tbody></table></section>"
      );
    }

    /* ---- Generate ------------------------------------------------------------ */
    function generate() {
      var opts = readOptions();
      if (isNaN(opts.from) || isNaN(opts.to) || opts.from > opts.to) {
        ui.toast("Choose a valid date range first.", { tone: "warning", duration: 3200 });
        return;
      }

      var report = services.getReport({ from: opts.from, to: opts.to, severity: opts.severity });
      var incidents = statusFilter(report.incidents);
      report.incidents = incidents;
      state.report = report;
      state.sections = opts.sections;

      var include = function (key) {
        return opts.sections[key];
      };
      var anySection = opts.sections.overview || opts.sections.incidents || opts.sections.events ||
        opts.sections.hunting || opts.sections.deception;

      document.getElementById("rp-preview").innerHTML =
        '<article class="report-sheet" id="rp-sheet">' +
        '<header class="report-head"><div>' +
        '<div class="eyebrow">Mini-SOC · sample workspace</div>' +
        '<h2 class="report-title">Security Operations Report</h2>' +
        '<div class="xsmall subtle">Demo data — generated locally, no backend involved</div>' +
        "</div>" +
        '<div class="report-meta">' +
        "<div>Window: <b>" + util.esc(report.rangeLabel) + "</b></div>" +
        "<div>Severity filter: <b>" + util.esc(report.severity) + "</b></div>" +
        "<div>Status filter: <b>" + util.esc(opts.status === "all" ? "All statuses" : opts.status) + "</b></div>" +
        "<div>Generated: <b>" + util.esc(util.fmtDateTime(report.generatedAt)) + "</b></div>" +
        "<div class=\"demo-flag\" style=\"margin-top:6px\">Sample data</div>" +
        "</div></header>" +
        (anySection
          ? (include("overview") ? overviewSection(report, incidents) : "") +
            (include("incidents") ? incidentsSection(incidents) : "") +
            (include("events") ? eventsSection(report) : "") +
            (include("hunting") ? huntingSection(report) : "") +
            (include("deception") ? deceptionSection(report) : "")
          : '<p class="small muted">No sections are selected — pick at least one in the builder above.</p>') +
        '<footer class="xsmall subtle" style="border-top:1px solid var(--border);padding-top:12px">' +
        "Mini-SOC report · all figures come from the demo dataset described in the README · " +
        "page " + "1" + "</footer>" +
        "</article>";

      ui.toast("Report generated", {
        tone: "success",
        desc: incidents.length + " incidents and " + report.events.length + " events in the current window."
      });
      document.getElementById("rp-sheet").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    /* ---- CSV ------------------------------------------------------------------ */
    function exportCSV() {
      if (!state.report) generate();
      if (!state.report) return;
      var report = state.report;
      var rows = [
        ["Mini-SOC report (demo data)"],
        ["Window", report.rangeLabel],
        ["Severity filter", report.severity],
        ["Generated", util.fmtDateTime(report.generatedAt)],
        [],
        ["Incidents"],
        ["ID", "Severity", "Status", "Title", "Owner", "Created", "Risk score"]
      ];
      report.incidents.forEach(function (inc) {
        rows.push([inc.id, inc.severity, inc.status, inc.title, inc.owner, util.fmtDateTime(inc.createdAt), inc.riskScore]);
      });
      rows.push([], ["Events by severity"], ["Severity", "Events"]);
      Object.keys(report.eventBySeverity).forEach(function (sev) {
        rows.push([sev, report.eventBySeverity[sev]]);
      });
      rows.push([], ["Events by collector"], ["Source", "Events"]);
      Object.keys(report.eventBySource).forEach(function (source) {
        rows.push([source, report.eventBySource[source]]);
      });
      rows.push([], ["Threat-hunting results"], ["Finding", "Query", "Matches", "Status", "Incident"]);
      report.hunting.forEach(function (finding) {
        rows.push([finding.title, finding.queryId, finding.matches, finding.status, finding.incident || ""]);
      });

      util.downloadFile("mini-soc-report.csv", util.toCSV(rows), "text/csv");
      ui.toast("Report CSV exported", { tone: "success", desc: "Written to mini-soc-report.csv." });
    }

    /* ---- Controls ---------------------------------------------------------------- */
    document.getElementById("rp-generate").addEventListener("click", generate);
    document.getElementById("rp-export").addEventListener("click", exportCSV);
    document.getElementById("rp-print").addEventListener("click", function () {
      if (!state.report) generate();
      setTimeout(function () {
        window.print();
      }, 60);
    });
    util.qsa("#rp-preview input, #rp-preview select").forEach(function (node) {
      node.addEventListener("change", generate);
    });
    ["rp-from", "rp-to", "rp-severity", "rp-status"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", generate);
    });
    util.qsa("input[type=checkbox]").forEach(function (box) {
      box.addEventListener("change", generate);
    });

    /* First render without a toast. */
    var opts = readOptions();
    var report = services.getReport({ from: opts.from, to: opts.to, severity: opts.severity });
    report.incidents = statusFilter(report.incidents);
    state.report = report;
    state.sections = opts.sections;
    document.getElementById("rp-preview").innerHTML =
      '<article class="report-sheet"><header class="report-head"><div>' +
      '<div class="eyebrow">Mini-SOC · sample workspace</div>' +
      '<h2 class="report-title">Security Operations Report</h2></div>' +
      '<div class="report-meta">Report not generated yet<br>press <b>Generate report</b></div>' +
      "</header>" +
      '<p class="small muted">Choose a window and sections above, then generate the report. ' +
      "Everything shown here will be sample data from the demo dataset.</p></article>";
  });
})();
