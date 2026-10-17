/* ==========================================================================
   Mini-SOC · pages/deception.js — Cyber Deception (Page H)
   Simulated honeypots/decoys; every interaction below is sample content.
   ========================================================================== */
(function () {
  "use strict";
  var util = SOC.util;
  var ui = SOC.ui;

  SOC.registerPage("deception", function () {
    var services = SOC.services;
    var href = SOC.nav.resolve;

    var statusFilter = "all";

    /* ---- KPIs ------------------------------------------------------------- */
    var decoys = SOC.demo.decoys;
    var triggered = decoys.filter(function (d) {
      return d.status === "Triggered";
    });
    var interactions = decoys.reduce(function (acc, d) {
      return acc + d.interactions;
    }, 0);
    var linkedIncidents = {};
    SOC.demo.deceptionTimeline.forEach(function (row) {
      if (row.incident) linkedIncidents[row.incident] = true;
    });

    document.getElementById("dc-kpis").innerHTML =
      ui.kpi({
        label: "Deception assets",
        value: String(decoys.length),
        hint: "Shares, documents, accounts, honeypots (simulated)",
        icon: "decoy",
        tone: "var(--nt-decoy)"
      }) +
      ui.kpi({
        label: "Triggered",
        value: String(triggered.length),
        hint: "Assets with at least one simulated touch",
        icon: "bolt",
        tone: "var(--sev-high)"
      }) +
      ui.kpi({
        label: "Interactions recorded",
        value: String(interactions),
        hint: "Cumulative across the demo window",
        icon: "activity",
        tone: "var(--sev-medium)"
      }) +
      ui.kpi({
        label: "Incidents raised",
        value: String(Object.keys(linkedIncidents).length),
        hint: "Alerts promoted to the incident queue",
        icon: "incidents",
        tone: "var(--lav)"
      });

    /* ---- Asset grid -------------------------------------------------------- */
    function statusBadge(status) {
      return ui.statusBadge(status);
    }

    function renderGrid() {
      var host = document.getElementById("dc-grid");
      var rows = services.listDecoys({ status: statusFilter });
      document.getElementById("dc-assets-sub").textContent =
        rows.length + " of " + decoys.length + " simulated assets shown";

      if (!rows.length) {
        host.innerHTML = ui.emptyState({
          icon: "decoy",
          title: "No assets with this status",
          desc: "Change the status filter to see the rest of the simulated deception inventory.",
          actionLabel: "Show all",
          actionAttr: 'id="dc-empty-reset"'
        });
        var reset = document.getElementById("dc-empty-reset");
        if (reset)
          reset.addEventListener("click", function () {
            statusFilter = "all";
            document.getElementById("dc-status").value = "all";
            renderGrid();
          });
        return;
      }

      host.innerHTML = rows
        .map(function (decoy) {
          return (
            '<button class="decoy-card" type="button" data-decoy="' + decoy.id + '">' +
            '<span class="dc-head">' +
            '<span class="decoy-icon">' + ui.icon("decoy") + "</span>" +
            "<span>" +
            '<span class="dc-name">' + util.esc(decoy.name) + "</span>" +
            '<span class="dc-type" style="display:block">' + util.esc(decoy.type) + "</span>" +
            "</span>" +
            "</span>" +
            '<span class="dc-desc">' + util.esc(decoy.purpose) + "</span>" +
            '<span class="dc-foot">' + statusBadge(decoy.status) +
            "<span>" + decoy.interactions + " interaction(s)</span></span>" +
            "</button>"
          );
        })
        .join("");
    }

    document.getElementById("dc-status").addEventListener("change", function (event) {
      statusFilter = event.target.value;
      renderGrid();
    });

    /* ---- Details drawer ------------------------------------------------------ */
    function openDetails(decoy) {
      if (!decoy) return;
      var rows = services.getDeceptionTimeline(decoy.id);

      var body =
        '<div class="stack-4">' +
        '<div class="row row-wrap" style="gap:8px">' + statusBadge(decoy.status) +
        '<span class="badge badge-outline">' + util.esc(decoy.type) + "</span></div>" +
        "<div><h3 class=\"strong\">What this decoy represents</h3>" +
        '<p class="small muted" style="margin-top:6px">' + util.esc(decoy.represents) + "</p></div>" +
        '<dl class="meta-grid">' +
        '<div class="meta-item"><dt>Asset ID</dt><dd class="mono-id">' + util.esc(decoy.id) + "</dd></div>" +
        '<div class="meta-item"><dt>Address</dt><dd class="mono-id">' + util.esc(decoy.ip) + "</dd></div>" +
        '<div class="meta-item"><dt>Last trigger</dt><dd>' + util.esc(util.fmtDateTime(decoy.lastTrigger)) + "</dd></div>" +
        '<div class="meta-item"><dt>Interactions</dt><dd>' + decoy.interactions + "</dd></div>" +
        "</dl>" +
        (decoy.relatedIncidents.length
          ? '<div class="note note-warn">' + ui.icon("shield") +
            "<div><b>Linked incident</b><div class=\"xsmall\">" +
            decoy.relatedIncidents
              .map(function (id) {
                return (
                  '<a href="' + href("investigation.html?id=" + id) + '">' + util.esc(id) + "</a>"
                );
              })
              .join(", ") +
            "</div></div></div>"
          : '<div class="note">' + ui.icon("info") + "<div>No incident is linked to this asset.</div></div>") +
        "<div><div class=\"eyebrow\" style=\"margin-bottom:6px\">Interaction history (simulated)</div>" +
        (rows.length
          ? '<ul class="list-divided">' +
            rows
              .map(function (row) {
                return (
                  "<li><div class=\"stack-2\">" +
                  '<div class="row row-wrap" style="gap:8px">' + ui.sevBadge(row.severity) +
                  '<span class="xsmall strong">' + util.esc(row.action) + "</span></div>" +
                  '<div class="xsmall subtle">' + util.esc(util.fmtDateTime(row.ts)) + " · actor " +
                  util.esc(row.actor) + "</div></div></li>"
                );
              })
              .join("") +
            "</ul>"
          : '<p class="small muted">No recorded interactions in the demo window.</p>') +
        "</div>" +
        '<div class="note note-info">' + ui.icon("warning") +
        "<div>Simulated asset: no actual honeypot is deployed by this demo frontend.</div></div>" +
        "</div>";

      ui.openDrawer({ title: decoy.name, subtitle: util.esc(decoy.type), body: body });
    }

    document.getElementById("dc-grid").addEventListener("click", function (event) {
      var card = event.target.closest("[data-decoy]");
      if (!card) return;
      openDetails(services.getDecoy(card.dataset.decoy));
    });

    /* ---- Interaction timeline ------------------------------------------------ */
    document.getElementById("dc-timeline").innerHTML = services
      .getDeceptionTimeline()
      .map(function (row) {
        return (
          "<tr>" +
          '<td class="nowrap num">' + util.esc(util.fmtDateTime(row.ts)) + "</td>" +
          '<td class="cell-strong nowrap">' + util.esc(row.decoy) + "</td>" +
          "<td><code>" + util.esc(row.actor) + "</code></td>" +
          "<td>" + util.esc(row.action) + "</td>" +
          "<td>" + ui.sevBadge(row.severity) + "</td>" +
          "<td>" +
          (row.incident
            ? '<a class="mono-id" href="' + href("investigation.html?id=" + row.incident) + '">' +
              util.esc(row.incident) + "</a>"
            : '<span class="subtle">—</span>') +
          "</td></tr>"
        );
      })
      .join("");

    renderGrid();

    var deepLink = util.params().get("decoy");
    if (deepLink && services.getDecoy(deepLink)) openDetails(services.getDecoy(deepLink));
  });
})();
