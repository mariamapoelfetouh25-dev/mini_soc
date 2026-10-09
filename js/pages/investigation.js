/* ==========================================================================
   Mini-SOC · pages/investigation.js — Incident Investigation (Page D)
   Six panels keep the same incident context while the analyst moves around.
   ========================================================================== */
(function () {
  "use strict";
  var util = SOC.util;
  var ui = SOC.ui;

  SOC.registerPage("investigation", function () {
    var services = SOC.services;
    var href = SOC.nav.resolve;

    var incidentId = util.params().get("id") || "INC-2026-1039";
    var bundle = services.getIncidentBundle(incidentId);
    var root = document.getElementById("investigation-root");

    if (!bundle) {
      root.innerHTML =
        '<h1 class="page-title">Incident not found</h1>' +
        ui.emptyState({
          icon: "shield",
          title: "Incident not found",
          desc: "No sample incident matches " + incidentId + ". It may have been filtered out of this demo dataset.",
          actionLabel: "Back to incidents",
          actionAttr: 'onclick="window.location.href=\'' + href("incidents.html") + '\'"'
        });
      return;
    }

    var incident = bundle.incident;
    document.title = incident.id + " — Mini-SOC";
    document.getElementById("inv-context").textContent =
      "Investigation workspace · " + incident.id + " · all data below is sample data for this incident.";
    document.getElementById("inv-back").setAttribute("href", href("incidents.html"));

    document.getElementById("inv-actions").innerHTML =
      '<a class="btn" href="' + href("ai-analyst.html?id=" + incident.id) + '">Full AI analysis</a>' +
      '<a class="btn btn-primary" href="' + href("incident-response.html?id=" + incident.id) + '">Response actions</a>';

    /* ---- Hero ------------------------------------------------------------ */
    var riskTone = incident.riskScore >= 80 ? "critical" : incident.riskScore >= 60 ? "high" : "medium";
    document.getElementById("incident-hero").innerHTML =
      '<div class="incident-hero">' +
      "<div>" +
      '<h1 class="ih-title"><span class="ih-id">' + util.esc(incident.id) + "</span>" + util.esc(incident.title) + "</h1>" +
      '<div class="row row-wrap" style="gap:8px;margin-top:10px">' +
      ui.sevBadge(incident.severity) + ui.statusBadge(incident.status) + ui.priorityFlag(incident.priority) +
      '<span class="badge badge-outline">' + util.esc(incident.source) + "</span>" +
      "</div>" +
      '<div class="ih-meta">' +
      "<span>Owner: <b>" + util.esc(incident.owner) + "</b></span>" +
      "<span>Created: <b>" + util.esc(util.fmtDateTime(incident.createdAt)) + "</b></span>" +
      "<span>Updated: <b>" + util.esc(util.fmtDateTime(incident.updatedAt)) + "</b></span>" +
      "<span>Related events: <b>" + bundle.events.length + "</b></span>" +
      "</div>" +
      '<p class="small muted" style="margin-top:12px;max-width:82ch">' + util.esc(incident.summary) + "</p>" +
      "</div>" +
      '<div class="ih-risk">' +
      '<div class="eyebrow">Risk score</div>' +
      '<div class="risk-score" style="margin:6px 0 4px">' +
      '<span class="risk-num" style="color:var(--sev-' + riskTone + ')">' + incident.riskScore + "</span>" +
      '<span class="risk-scale">/ 100<br>sample computation</span></div>' +
      '<div class="meter-track" style="margin-bottom:12px"><div class="meter-fill" style="width:' +
      incident.riskScore + "%;--meter-color:var(--sev-" + riskTone + ')"></div></div>' +
      '<button class="btn btn-sm btn-block" type="button" id="inv-status-btn">Change status</button>' +
      "</div></div>";

    /* ---- Status change (demo) ------------------------------------------- */
    var STATUSES = ["New", "Investigating", "Contained", "Resolved", "Closed"];
    document.getElementById("inv-status-btn").addEventListener("click", function () {
      var select = util.el("select", { class: "select", id: "inv-status-select", "aria-label": "New status" });
      select.innerHTML = STATUSES.map(function (status) {
        return '<option value="' + status + '"' + (incident.status === status ? " selected" : "") + ">" + status + "</option>";
      }).join("");
      ui.openDialog({
        title: "Change status · " + incident.id,
        body:
          '<div class="field"><label class="field-label" for="inv-status-select">New status</label>' + select +
          '<span class="field-hint">Recorded in the local audit log only.</span></div>',
        footer: util.el("div", { class: "row end w-full" },
          util.el("button", { class: "btn", type: "button", text: "Cancel", onclick: function () { ui.closeOverlay(); } }),
          util.el("button", {
            class: "btn btn-primary",
            type: "button",
            text: "Continue",
            onclick: function () {
              var next = select.value;
              ui.closeOverlay();
              ui.confirm({
                title: "Confirm status change",
                message: "Move " + incident.id + " from " + incident.status + " to " + next + "?",
                detail: "Demo-only change — nothing is sent to a ticketing or SOAR system.",
                confirmLabel: "Apply status"
              }).then(function (ok) {
                if (!ok) return;
                services.updateIncidentStatus(incident.id, next);
                ui.toast(incident.id + " → " + next, { tone: "success" });
                window.location.reload();
              });
            }
          })
        )
      });
    });

    /* ---- Panel: Overview -------------------------------------------------- */
    function renderOverview() {
      var host = document.getElementById("panel-overview");
      var assets = bundle.assets;
      var notes = incident.notes || [];
      var steps = incident.nextSteps || [];

      host.innerHTML =
        '<div class="grid grid-2">' +
        '<div class="stack-4">' +
        '<section class="card"><div class="card-head"><h2 class="card-title">Incident summary</h2></div>' +
        '<div class="card-body"><p class="muted">' + util.esc(incident.summary) + "</p>" +
        '<dl class="meta-grid" style="margin-top:16px">' +
        '<div class="meta-item"><dt>Status</dt><dd>' + incident.status + "</dd></div>" +
        '<div class="meta-item"><dt>Owner</dt><dd>' + util.esc(incident.owner) + "</dd></div>" +
        '<div class="meta-item"><dt>Priority</dt><dd>' + incident.priority + "</dd></div>" +
        '<div class="meta-item"><dt>Risk score</dt><dd>' + incident.riskScore + " / 100</dd></div>" +
        "</dl></div></section>" +

        '<section class="card"><div class="card-head"><h2 class="card-title">Related assets</h2>' +
        '<span class="card-sub">' + assets.length + " record(s)</span></div>" +
        '<div class="card-body">' +
        (assets.length
          ? '<ul class="list-divided">' + assets.map(function (asset) {
              return (
                "<li><div class=\"row between row-wrap\" style=\"gap:8px\">" +
                "<div><div class=\"small strong\">" + util.esc(asset.id) + "</div>" +
                '<div class="xsmall subtle">' + util.esc(asset.type) + " · " + util.esc(asset.zone) + " · " +
                util.esc(asset.ip) + "</div></div>" +
                '<div class="row" style="gap:6px">' + ui.sevBadge(asset.risk.charAt(0).toUpperCase() + asset.risk.slice(1)) +
                ui.badge(asset.status === "Compromised" ? "status-triggered" : "badge-outline", asset.status, true) +
                "</div></div></li>"
              );
            }).join("") + "</ul>"
          : '<p class="small muted">No assets are linked to this incident in the sample data.</p>') +
        "</div></section>" +

        '<section class="card"><div class="card-head"><h2 class="card-title">Related graph entities</h2>' +
        '<a class="btn btn-sm" href="' + href("attack-graph.html?incident=" + incident.id) + '">Open in graph</a></div>' +
        '<div class="card-body"><div class="chip-row">' +
        (bundle.graphNodes.length
          ? bundle.graphNodes.map(function (node) {
              return (
                '<a class="chip" href="' + href("attack-graph.html?focus=" + encodeURIComponent(node.id)) + '">' +
                ui.icon("network") + util.esc(node.label) + "</a>"
              );
            }).join("")
          : '<span class="small muted">No graph entities are linked to this incident.</span>') +
        "</div></div></section>" +
        "</div>" +

        '<div class="stack-4">' +
        '<section class="card"><div class="card-head"><h2 class="card-title">Suggested next steps</h2>' +
        '<span class="badge badge-outline">Analyst checklist</span></div>' +
        '<div class="card-body">' +
        (steps.length
          ? '<ol class="steps-list">' + steps.map(function (step) {
              return "<li><span>" + util.esc(step) + "</span></li>";
            }).join("") + "</ol>"
          : '<p class="small muted">No steps are recorded for this incident.</p>') +
        "</div></section>" +

        '<section class="card"><div class="card-head"><h2 class="card-title">Analyst notes</h2>' +
        '<span class="card-sub">' + notes.length + " note(s)</span></div>" +
        '<div class="card-body">' +
        (notes.length
          ? '<div class="notes-list">' + notes.map(function (note) {
              return (
                '<div class="note-item"><div class="ni-head"><span class="ni-author">' + util.esc(note.author) +
                "</span><span>" + util.esc(util.fmtDateTime(note.ts)) + "</span></div>" +
                '<div class="ni-text">' + util.esc(note.text) + "</div></div>"
              );
            }).join("") + "</div>"
          : '<p class="small muted">No analyst notes yet.</p>') +
        "</div></section>" +
        "</div></div>";
    }

    /* ---- Panel: Related events ------------------------------------------- */
    function renderEvents() {
      var host = document.getElementById("panel-events");
      if (!bundle.events.length) {
        host.innerHTML = ui.emptyState({
          icon: "events",
          title: "No linked events",
          desc: "This incident has no sample events attached to it yet."
        });
        return;
      }
      host.innerHTML =
        '<section class="card"><div class="card-head">' +
        '<div><h2 class="card-title">Related security events</h2>' +
        '<div class="card-sub">' + bundle.events.length + " records · chronological</div></div>" +
        '<a class="btn btn-sm" href="' + href("events.html?incident=" + incident.id) + '">Open event stream</a>' +
        "</div>" +
        '<div class="table-wrap"><table class="table"><thead><tr>' +
        "<th scope=\"col\">Time</th><th scope=\"col\">Event</th><th scope=\"col\">Asset</th>" +
        "<th scope=\"col\">Type</th><th scope=\"col\">Severity</th><th scope=\"col\">ATT&amp;CK</th>" +
        "</tr></thead><tbody>" +
        bundle.events.map(function (ev) {
          return (
            "<tr>" +
            '<td class="nowrap num">' + util.esc(util.fmtDateTime(ev.ts)) + "</td>" +
            '<td><a class="row-link" href="' + href("events.html?event=" + ev.id) + '">' + util.esc(ev.id) + "</a>" +
            '<div class="small muted truncate" style="max-width:38ch">' + util.esc(ev.title) + "</div></td>" +
            '<td class="cell-strong nowrap">' + util.esc(ev.asset) + "</td>" +
            "<td>" + util.esc(ev.type) + "</td>" +
            "<td>" + ui.sevBadge(ev.severity) + "</td>" +
            "<td>" + (ev.technique ? '<span class="mitre-id">' + util.esc(ev.technique) + "</span>" : '<span class="subtle">—</span>') + "</td>" +
            "</tr>"
          );
        }).join("") +
        "</tbody></table></div></section>";
    }

    /* ---- Panel: Timeline --------------------------------------------------- */
    function renderTimeline() {
      var host = document.getElementById("panel-timeline");
      var items = incident.timeline.slice().sort(function (a, b) {
        return a.ts - b.ts;
      });
      host.innerHTML =
        '<section class="card"><div class="card-head">' +
        '<div><h2 class="card-title">Chronological attack timeline</h2>' +
        '<div class="card-sub">Ordered by timestamp from sample records</div></div></div>' +
        '<div class="card-body"><ol class="timeline">' +
        items.map(function (item) {
          var tone = item.tone === "info" ? "info" : item.tone;
          return (
            '<li class="tl-item">' +
            '<span class="tl-dot" style="--tl-color:var(--sev-' + (tone === "info" ? "info" : tone) + ')"></span>' +
            '<div class="tl-body"><div class="tl-head">' +
            '<span class="tl-title">' + util.esc(item.title) + "</span>" +
            '<time class="tl-time" datetime="' + new Date(item.ts).toISOString() + '">' + util.esc(util.fmtDateTime(item.ts)) + "</time>" +
            '</div><div class="tl-desc">' + util.esc(item.desc) + "</div></div></li>"
          );
        }).join("") +
        "</ol></div></section>";
    }

    /* ---- Panel: MITRE ATT&CK ---------------------------------------------- */
    function renderMitre() {
      var host = document.getElementById("panel-mitre");
      if (!bundle.techniques.length) {
        host.innerHTML = ui.emptyState({
          icon: "target",
          title: "No ATT&CK techniques mapped",
          desc: "This incident has no technique references in the sample dataset."
        });
        return;
      }
      host.innerHTML =
        '<section class="card"><div class="card-head">' +
        '<div><h2 class="card-title">Mapped techniques</h2>' +
        '<div class="card-sub">Reference entries from the local ATT&amp;CK subset</div></div></div>' +
        '<div class="card-body"><div class="mitre-list">' +
        bundle.techniques.map(function (tech) {
          var related = bundle.events.filter(function (ev) {
            return ev.technique === tech.id;
          });
          return (
            '<div class="mitre-item"><span class="mitre-id">' + util.esc(tech.id) + "</span>" +
            '<div class="mitre-body"><div class="mitre-name">' + util.esc(tech.name) + "</div>" +
            '<div class="mitre-tactic">Tactic: ' + util.esc(tech.tactic) + " · " + related.length +
            " linked event(s)</div></div></div>"
          );
        }).join("") +
        "</div>" +
        '<p class="xsmall subtle" style="margin-top:12px">Technique names and tactics are reference data for the demo; mapping quality has not been validated against the live ATT&amp;CK catalogue.</p>' +
        "</div></section>";
    }

    /* ---- Panel: AI analysis ------------------------------------------------ */
    function renderAI() {
      var host = document.getElementById("panel-ai");
      var analysis = bundle.ai;
      if (!analysis) {
        host.innerHTML = ui.emptyState({
          icon: "ai",
          title: "No sample analysis for this incident",
          desc: "Evidence-grounded analysis samples exist for INC-2026-1039, INC-2026-1042 and INC-2026-1035.",
          actionLabel: "Open AI Analyst",
          actionAttr: 'onclick="window.location.href=\'' + href("ai-analyst.html") + '\'"'
        });
        return;
      }
      host.innerHTML =
        '<section class="ai-block">' +
        '<div class="ai-block-head">' +
        '<span class="ai-block-title">' + ui.icon("ai") + "Sample analysis summary</span>" +
        '<span class="ai-classification ai-inference">Inference · not verified</span></div>' +
        '<p class="ai-prose">' + util.esc(analysis.summary) + "</p>" +
        '<div class="row row-wrap" style="gap:16px">' +
        '<div class="confidence"><div class="confidence-top"><span>Model confidence (sample)</span><b>' +
        analysis.confidence + "%</b></div>" +
        '<div class="confidence-track"><div class="confidence-fill" style="width:' + analysis.confidence + '%"></div></div>' +
        '<div class="confidence-scale"><span>Low</span><span>Moderate</span><span>High</span></div></div>' +
        '<div class="stack-2 xsmall subtle" style="min-width:220px">' +
        "<div>" + analysis.facts.length + " observed facts · " + analysis.hypotheses.length + " hypotheses</div>" +
        "<div>Generated " + util.esc(util.fmtDateTime(analysis.generatedAt)) + "</div></div>" +
        "</div>" +
        '<div class="note note-warn">' + ui.icon("warning") +
        "<div>" + util.esc(analysis.label) + ". Treat every statement as an unverified hypothesis until confirmed by an analyst.</div></div>" +
        '<div class="row"><a class="btn btn-primary btn-sm" href="' +
        href("ai-analyst.html?id=" + incident.id) + '">Open full analysis</a></div>' +
        "</section>";
    }

    /* ---- Panel: Evidence ---------------------------------------------------- */
    function renderEvidence() {
      var host = document.getElementById("panel-evidence");
      host.innerHTML =
        '<div class="grid grid-2">' +
        '<section class="card"><div class="card-head">' +
        '<div><h2 class="card-title">Evidence &amp; indicators</h2>' +
        '<div class="card-sub">' + incident.evidence.length + " item(s) collected in the demo record</div></div></div>" +
        '<div class="card-body"><div class="stack-2">' +
        incident.evidence.map(function (item) {
          return (
            '<div class="evidence-card"><span class="ev-ico">' + ui.icon("file") + "</span>" +
            '<div class="ev-body"><div class="ev-kind">' + util.esc(item.kind) + "</div>" +
            '<div class="ev-value">' + util.esc(item.value) + "</div>" +
            '<div class="ev-note">' + util.esc(item.note) + "</div></div></div>"
          );
        }).join("") +
        "</div></div></section>" +

        '<section class="card"><div class="card-head">' +
        '<div><h2 class="card-title">Raw sample events</h2>' +
        '<div class="card-sub">Evidence as recorded by the demo collectors</div></div></div>' +
        '<div class="card-body"><div class="stack-2">' +
        (bundle.events.length
          ? bundle.events.slice(0, 4).map(function (ev) {
              return (
                '<div><div class="row between"><span class="mono-id">' + util.esc(ev.id) + "</span>" +
                '<a class="xsmall" href="' + href("events.html?event=" + ev.id) + '">Inspect →</a></div>' +
                '<pre class="log-block">' + util.esc(ev.evidence) + "</pre></div>"
              );
            }).join("")
          : '<p class="small muted">No raw events are linked to this incident.</p>') +
        "</div>" +
        '<div class="note note-info" style="margin-top:12px">' + ui.icon("info") +
        "<div>Sample-data notice: these log lines were written for the demo and do not come from a real sensor.</div></div>" +
        "</div></section></div>";
    }

    /* ---- Wire tabs ---------------------------------------------------------- */
    renderOverview();
    renderEvents();
    renderTimeline();
    renderMitre();
    renderAI();
    renderEvidence();

    ui.bindTabs(document.getElementById("inv-tabs"), function (key) {
      SOC.util.emit("investigation:tab", key);
    });
  });
})();
