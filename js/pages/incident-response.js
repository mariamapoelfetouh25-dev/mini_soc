/* ==========================================================================
   Mini-SOC · pages/incident-response.js — Response & Risk (Page I)
   Approvals are recorded locally; nothing is executed anywhere.
   ========================================================================== */
(function () {
  "use strict";
  var util = SOC.util;
  var ui = SOC.ui;

  SOC.registerPage("incident-response", function () {
    var services = SOC.services;
    var href = SOC.nav.resolve;
    var params = util.params();

    document.getElementById("ir-note-ico").innerHTML = ui.icon("warning");

    var withRecs = {};
    SOC.demo.response.recommendations.forEach(function (rec) {
      withRecs[rec.incidentId] = true;
    });

    var select = document.getElementById("ir-incident");
    select.innerHTML = SOC.demo.incidents
      .map(function (inc) {
        return (
          '<option value="' + inc.id + '">' + util.esc(inc.id) +
          (withRecs[inc.id] ? "" : " (no recommendations)") + "</option>"
        );
      })
      .join("");

    var current = params.get("id");
    if (!current || !withRecs[current]) {
      current = Object.keys(withRecs)[0] || SOC.demo.incidents[0].id;
    }
    select.value = current;

    /* ---- Actions ---------------------------------------------------------- */
    function applyStatus(rec, status, opts) {
      opts = opts || {};
      var sensitive = rec.requiresApproval;
      var run = function () {
        services.setRecommendationStatus(rec.id, status);
        ui.toast(opts.toast || rec.id + " → " + status, { tone: opts.tone || "success" });
        render();
      };

      if (opts.confirm) {
        ui.confirm({
          title: opts.confirmTitle,
          message: opts.confirmMessage,
          detail: sensitive
            ? "<b>Sensitive action.</b> " + (rec.disclaimer || "")
            : (rec.disclaimer || ""),
          confirmLabel: opts.confirmLabel || "Confirm",
          danger: !!opts.danger
        }).then(function (ok) {
          if (ok) run();
        });
      } else {
        run();
      }
    }

    function recommendationCard(rec) {
      var statusSlug = util.statusSlug(rec.status);
      var sensitive = rec.requiresApproval;
      var classes = "rec-card" + (rec.status === "Approved" ? " is-approved" : "") + (sensitive ? " is-sensitive" : "");

      var actions = "";
      if (rec.status === "Proposed" || rec.status === "Reviewed") {
        actions =
          '<button class="btn btn-sm btn-primary" type="button" data-rec-action="approve" data-rec="' + rec.id + '">' +
          ui.icon("check") + "Approve</button>" +
          '<button class="btn btn-sm" type="button" data-rec-action="reject" data-rec="' + rec.id + '">Reject</button>' +
          '<button class="btn btn-sm btn-ghost" type="button" data-rec-action="defer" data-rec="' + rec.id + '">Defer</button>';
      } else if (rec.status === "Approved") {
        actions =
          '<button class="btn btn-sm btn-primary" type="button" data-rec-action="execute" data-rec="' + rec.id + '">' +
          ui.icon("play") + "Record simulated execution</button>" +
          '<span class="xsmall subtle">Approved — ready for the (simulated) execute step.</span>';
      } else {
        actions = '<span class="xsmall subtle">No further actions: this recommendation is ' +
          util.esc(rec.status.toLowerCase()) + ".</span>";
      }

      return (
        '<article class="' + classes + '">' +
        '<div class="rec-head"><span class="rec-title">' + ui.icon(rec.sensitivity === "Sensitive" ? "warning" : "bolt") +
        util.esc(rec.title) + "</span>" +
        '<span class="rec-badges">' +
        ui.badge(statusSlug, rec.status, true) +
        ui.badge(sensitive ? "sev-medium" : "badge-outline", rec.sensitivity, true) +
        ui.badge("badge-outline", rec.source) +
        "</span></div>" +
        '<p class="rec-rationale">' + util.esc(rec.rationale) + "</p>" +
        '<div class="rec-evidence"><div class="re-label">' + ui.icon("file") + "Supporting evidence (sample)</div><ul>" +
        rec.evidence
          .map(function (item) {
            return "<li>" + util.esc(item) + "</li>";
          })
          .join("") +
        "</ul></div>" +
        '<div class="rec-actions">' + actions +
        (sensitive ? '<span class="xsmall subtle">' + ui.icon("lock") + " requires human approval</span>" : "") +
        "</div></article>"
      );
    }

    function handleAction(button) {
      var rec = services.getRecommendations(current).filter(function (r) {
        return r.id === button.dataset.rec;
      })[0];
      if (!rec) return;
      var action = button.dataset.recAction;

      if (action === "approve") {
        applyStatus(rec, "Approved", {
          confirm: true,
          confirmTitle: "Approve “" + rec.title + "”?",
          confirmMessage:
            "Approving this " +
            (rec.requiresApproval ? "sensitive" : "standard") +
            " recommendation for " +
            rec.incidentId +
            " records a human decision in the local audit log.",
          confirmLabel: "Approve (demo)",
          toast: rec.id + " approved · decision recorded locally"
        });
      } else if (action === "reject") {
        applyStatus(rec, "Rejected", {
          confirm: true,
          confirmTitle: "Reject this recommendation?",
          confirmMessage: rec.title,
          confirmLabel: "Reject",
          danger: true,
          tone: "warning",
          toast: rec.id + " rejected · decision recorded locally"
        });
      } else if (action === "defer") {
        applyStatus(rec, "Deferred", {
          toast: rec.id + " deferred",
          tone: "info"
        });
      } else if (action === "execute") {
        ui.confirm({
          title: "Simulate execution?",
          message:
            "This records a simulated execution entry for “" + rec.title + "” and appends it to the audit log.",
          detail: "<b>Simulation only.</b> " + (rec.disclaimer || ""),
          confirmLabel: "Record simulation"
        }).then(function (ok) {
          if (!ok) return;
          services.addAudit({
            actor: "Demo analyst",
            action: "Simulated execution recorded",
            target: rec.id + " · " + rec.title,
            result: "Simulation only — no endpoint, firewall or identity provider was changed",
            incident: rec.incidentId
          });
          ui.toast("Simulated execution recorded — no system was contacted.", { tone: "info" });
          renderAudit();
        });
      }
    }

    /* ---- Render ------------------------------------------------------------ */
    function render() {
      var incident = services.getIncident(current);
      var host = document.getElementById("ir-root");
      document.getElementById("ir-open-incident").setAttribute("href", href("investigation.html?id=" + current));
      document.title = current + " response — Mini-SOC";

      if (!incident) {
        host.innerHTML = ui.emptyState({
          icon: "response",
          title: "Incident not found",
          desc: "Choose another incident from the selector above."
        });
        return;
      }

      var factors = services.getRiskFactors(incident);
      var recs = services.getRecommendations(current);
      var riskTone = incident.riskScore >= 80 ? "critical" : incident.riskScore >= 60 ? "high" : "medium";

      host.innerHTML =
        /* ---- Risk hero ---- */
        '<section class="risk-hero">' +
        '<div class="risk-gauge">' +
        '<div class="ring"><div id="ir-gauge" style="width:100%;height:100%"></div>' +
        '<div class="ring-center"><div class="rg-num" style="color:var(--sev-' + riskTone + ')">' +
        incident.riskScore + '</div><div class="rg-max">risk / 100</div></div></div>' +
        '<div class="row row-wrap" style="gap:6px;justify-content:center">' + ui.sevBadge(incident.severity) +
        ui.statusBadge(incident.status) + "</div>" +
        '<span class="xsmall subtle" style="text-align:center">Sample risk computation</span>' +
        "</div>" +
        "<div>" +
        '<div class="eyebrow">Risk factors</div>' +
        '<div class="ih-title" style="margin:6px 0 14px;font-size:var(--fs-md)">' + util.esc(incident.id) +
        " · " + util.esc(incident.title) + "</div>" +
        factors
          .map(function (factor) {
            var pct = Math.min(100, Math.round((factor.value / factor.max) * 100));
            return (
              '<div class="meter" style="margin-bottom:12px">' +
              '<div class="meter-top"><span class="meter-label">' + util.esc(factor.label) +
              '</span><span class="meter-value">' + factor.value + " / " + factor.max + "</span></div>" +
              '<div class="meter-track"><div class="meter-fill" style="width:' + pct +
              "%;--meter-color:var(--sev-" + factor.tone + ')"></div></div>' +
              '<div class="xsmall subtle" style="margin-top:3px">' + util.esc(factor.evidence) + "</div>" +
              "</div>"
            );
          })
          .join("") +
        '<p class="xsmall subtle">Scores are illustrative calculations over sample fields — they are not a risk engine.</p>' +
        "</div></section>" +

        '<div class="grid grid-2">' +
        /* ---- Recommendations ---- */
        "<div>" +
        '<section class="card" style="margin-bottom:16px"><div class="card-head bordered">' +
        '<div><h2 class="card-title">Response recommendations</h2>' +
        '<div class="card-sub">' + recs.length + " item(s) · AI-suggested and analyst-authored (sample)</div></div>" +
        '<span class="badge status-new">Human approval required</span></div>' +
        '<div class="card-body">' +
        (recs.length
          ? recs.map(recommendationCard).join("")
          : ui.emptyState({
              icon: "response",
              title: "No recommendations for this incident",
              desc: "Sample recommendations exist for INC-2026-1039 and INC-2026-1042. Pick one of those, or connect a backend as described in the README."
            })) +
        "</div></section>" +
        "</div>" +

        /* ---- Workflow + audit ---- */
        "<div>" +
        '<section class="card card-pad" style="margin-bottom:16px"><h2 class="card-title">Response workflow</h2>' +
        '<div class="workflow" style="margin-top:14px">' +
        services
          .getWorkflow()
          .map(function (step, index) {
            var cls = step.state === "done" ? "is-done" : step.state === "current" ? "is-current" : "";
            var mark = step.state === "done" ? ui.icon("check") : String(index + 1);
            return (
              '<div class="workflow-step ' + cls + '"><span class="wf-mark">' + mark + "</span>" +
              '<div class="wf-body"><div class="wf-title">' + util.esc(step.title) + "</div>" +
              '<div class="wf-desc">' + util.esc(step.desc) + "</div></div></div>"
            );
          })
          .join("") +
        "</div></section>" +

        '<section class="card card-pad"><div class="row between">' +
        '<h2 class="card-title">Audit log</h2>' +
        '<span class="xsmall subtle">local session</span></div>' +
        '<div class="audit-log" style="margin-top:12px" id="ir-audit" tabindex="0"></div></section>' +
        "</div></div>";

      SOC.charts.gauge(document.getElementById("ir-gauge"), {
        value: incident.riskScore,
        color: "var(--sev-" + riskTone + ")"
      });
      renderAudit();
    }

    function renderAudit() {
      var host = document.getElementById("ir-audit");
      if (!host) return;
      var rows = services.getAudit(current);
      if (!rows.length) {
        rows = services.getAudit();
      }
      host.innerHTML = rows.length
        ? rows
            .map(function (row) {
              return (
                '<div class="audit-entry"><span class="ae-time">' +
                util.esc(util.fmtTime(row.ts)) + "</span>" +
                '<span class="ae-body"><b>' + util.esc(row.actor) + "</b> · " + util.esc(row.action) +
                '<div class="xsmall">' + util.esc(row.target) + " — " + util.esc(row.result) + "</div></span></div>"
              );
            })
            .join("")
        : '<p class="small muted">No audit entries for this incident yet.</p>';
    }

    document.getElementById("ir-root").addEventListener("click", function (event) {
      var button = event.target.closest("[data-rec-action]");
      if (button) handleAction(button);
    });

    SOC.util.on("audit:change", function () {
      renderAudit();
    });

    select.addEventListener("change", function () {
      current = select.value;
      render();
    });

    render();
  });
})();
