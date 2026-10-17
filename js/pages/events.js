/* ==========================================================================
   Mini-SOC · pages/events.js — Security Events & Alerts (Page B)
   ========================================================================== */
(function () {
  "use strict";
  var util = SOC.util;
  var ui = SOC.ui;

  SOC.registerPage("events", function () {
    var services = SOC.services;
    var href = SOC.nav.resolve;

    var state = {
      q: "",
      severity: "all",
      source: "all",
      type: "all",
      status: "all",
      sort: "ts",
      dir: "desc",
      page: 1,
      pageSize: Number(SOC.prefs.get("pageSize", 10)) || 10
    };

    var searchInput = document.getElementById("ev-search");
    document.getElementById("ev-search-ico").innerHTML = ui.icon("search");

    /* ---- Filters -------------------------------------------------------- */
    var facets = services.distinctEventFacets();
    function fillSelect(id, values, allLabel) {
      var select = document.getElementById(id);
      select.innerHTML =
        '<option value="all">' + allLabel + "</option>" +
        values.map(function (value) {
          return '<option value="' + util.esc(value) + '">' + util.esc(value) + "</option>";
        }).join("");
      select.addEventListener("change", function () {
        state[id.replace("ev-", "")] = select.value;
        state.page = 1;
        render();
      });
    }
    fillSelect("ev-severity", facets.severity, "All severities");
    fillSelect("ev-source", facets.source, "All sources");
    fillSelect("ev-type", facets.type, "All event types");
    fillSelect("ev-status", facets.status, "All statuses");

    searchInput.addEventListener(
      "input",
      util.debounce(function () {
        state.q = searchInput.value.trim();
        state.page = 1;
        render();
      }, 160)
    );

    document.getElementById("ev-clear").addEventListener("click", function () {
      state.q = "";
      state.severity = state.source = state.type = state.status = "all";
      state.page = 1;
      searchInput.value = "";
      ["ev-severity", "ev-source", "ev-type", "ev-status"].forEach(function (id) {
        document.getElementById(id).value = "all";
      });
      render();
      ui.toast("Filters cleared.", { tone: "info", duration: 2200 });
    });

    /* ---- CSV export (uses the current filtered rows) -------------------- */
    document.getElementById("ev-export").addEventListener("click", function () {
      var result = services.listEvents({
        q: state.q,
        severity: state.severity,
        source: state.source,
        type: state.type,
        status: state.status,
        sort: state.sort,
        dir: state.dir,
        pageSize: 100000
      });
      var rows = [
        ["Event ID", "Timestamp", "Asset", "Event type", "Source", "Severity", "Status", "Title", "Incident", "Technique"]
      ];
      result.rows.forEach(function (ev) {
        rows.push([
          ev.id,
          util.fmtDateTime(ev.ts),
          ev.asset,
          ev.type,
          ev.source,
          ev.severity,
          ev.status,
          ev.title,
          ev.incident || "",
          ev.technique || ""
        ]);
      });
      util.downloadFile("mini-soc-events.csv", util.toCSV(rows), "text/csv");
      ui.toast("CSV exported", {
        tone: "success",
        desc: result.rows.length + " filtered sample rows written to mini-soc-events.csv."
      });
    });

    /* ---- Details drawer -------------------------------------------------- */
    function openDetails(ev) {
      if (!ev) return;
      var asset = services.getAsset(ev.asset);
      var incident = ev.incident ? services.getIncident(ev.incident) : null;
      var technique = ev.technique ? services.getTechnique(ev.technique) : null;

      var body =
        '<div class="stack-4">' +
        '<div class="row row-wrap" style="gap:8px">' + ui.sevBadge(ev.severity) + ui.statusBadge(ev.status) +
        (technique ? '<span class="mitre-id" title="' + util.esc(technique.name) + '">' + util.esc(technique.id) + "</span>" : "") +
        "</div>" +
        "<div><h3 class=\"strong\">" + util.esc(ev.title) + "</h3>" +
        '<p class="small muted" style="margin-top:6px">' + util.esc(ev.detail) + "</p></div>" +
        '<dl class="meta-grid">' +
        '<div class="meta-item"><dt>Timestamp</dt><dd>' + util.esc(util.fmtDateTime(ev.ts)) + "</dd></div>" +
        '<div class="meta-item"><dt>Source asset</dt><dd>' + util.esc(ev.asset) + "</dd></div>" +
        '<div class="meta-item"><dt>Zone</dt><dd>' + util.esc(asset ? asset.zone : "—") + "</dd></div>" +
        '<div class="meta-item"><dt>Event type</dt><dd>' + util.esc(ev.type) + "</dd></div>" +
        '<div class="meta-item"><dt>Collector</dt><dd>' + util.esc(ev.source) + "</dd></div>" +
        '<div class="meta-item"><dt>Event ID</dt><dd class="mono-id">' + util.esc(ev.id) + "</dd></div>" +
        "</dl>" +
        (technique
          ? '<div class="note note-info">' + ui.icon("target") +
            "<div><b>" + util.esc(technique.id) + " · " + util.esc(technique.name) + "</b>" +
            '<div class="xsmall">Tactic: ' + util.esc(technique.tactic) + " (ATT&amp;CK reference)</div></div></div>"
          : "") +
        "<div><div class=\"eyebrow\" style=\"margin-bottom:6px\">Evidence (sample log)</div>" +
        '<pre class="log-block">' + highlightEvidence(ev.evidence) + "</pre></div>" +
        (incident
          ? '<div class="note note-warn">' + ui.icon("shield") +
            "<div><b>Related incident " + util.esc(incident.id) + "</b>" +
            '<div class="xsmall">' + util.esc(incident.title) + "</div>" +
            '<a class="xsmall" href="' + href("investigation.html?id=" + incident.id) + '">Open investigation →</a></div></div>'
          : '<div class="note">' + ui.icon("info") + "<div>No incident is linked to this sample event.</div></div>") +
        "<div><div class=\"field-label\" style=\"margin-bottom:6px\">Update status (demo, local only)</div>" +
        '<div class="row row-wrap" style="gap:8px">' +
        ["Acknowledged", "Investigating", "Resolved"].map(function (status) {
          return '<button class="btn btn-sm" type="button" data-set-status="' + status + '"' +
            (ev.status === status ? " disabled" : "") + ">" + status + "</button>";
        }).join("") +
        "</div></div>" +
        "</div>";

      var panel = ui.openDrawer({
        title: ev.id,
        subtitle: util.esc(util.fmtDateTime(ev.ts)) + " · " + util.esc(ev.asset),
        body: body
      });

      panel.addEventListener("click", function (event) {
        var btn = event.target.closest("[data-set-status]");
        if (!btn) return;
        var next = btn.dataset.setStatus;
        ui.confirm({
          title: "Change event status?",
          message: "Set " + ev.id + " to \"" + next + "\" in this demo session?",
          detail: "Demo-only change — it is recorded in the local audit log and is not sent to any system.",
          confirmLabel: "Change status"
        }).then(function (ok) {
          if (!ok) return;
          services.updateEventStatus(ev.id, next);
          ui.closeOverlay();
          ui.toast(ev.id + " → " + next, { tone: "success" });
          render();
        });
      });
    }

    function highlightEvidence(text) {
      var safe = util.esc(text);
      return safe
        .replace(/([a-z_]+)=/gi, '<span class="k">$1</span>=')
        .replace(/\b(critical|malicious|blocked|fail(ed|ure)?|denied|none)\b/gi, '<span class="hl">$1</span>');
    }

    /* ---- Table ---------------------------------------------------------- */
    function render() {
      var result = services.listEvents(state);

      /* header with sortable columns */
      var thead = document.getElementById("ev-thead");
      thead.innerHTML = "";
      var headRow = document.createElement("tr");
      headRow.appendChild(ui.sortTh("Event ID", "id", state, onSort));
      headRow.appendChild(ui.sortTh("Timestamp", "ts", state, onSort));
      headRow.appendChild(ui.sortTh("Source asset", "asset", state, onSort));
      headRow.appendChild(ui.sortTh("Event type", "type", state, onSort));
      headRow.appendChild(ui.sortTh("Collector", "source", state, onSort));
      headRow.appendChild(ui.sortTh("Severity", "severity", state, onSort));
      headRow.appendChild(ui.sortTh("Status", "status", state, onSort));
      var actionTh = document.createElement("th");
      actionTh.scope = "col";
      actionTh.className = "cell-actions";
      actionTh.innerHTML = '<span class="sr-only">Actions</span>';
      headRow.appendChild(actionTh);
      thead.appendChild(headRow);

      var tbody = document.getElementById("ev-tbody");
      if (!result.rows.length) {
        tbody.innerHTML =
          '<tr><td colspan="8">' +
          ui.emptyState({
            icon: "search",
            title: "No events match these filters",
            desc: "Adjust the search text or clear the filters to see the sample records again.",
            actionLabel: "Clear filters",
            actionAttr: 'id="ev-empty-clear"'
          }) +
          "</td></tr>";
        var clear = document.getElementById("ev-empty-clear");
        if (clear)
          clear.addEventListener("click", function () {
            document.getElementById("ev-clear").click();
          });
      } else {
        tbody.innerHTML = result.rows
          .map(function (ev) {
            return (
              '<tr data-event="' + ev.id + '" tabindex="0">' +
              '<td class="event-id">' + util.esc(ev.id) + "</td>" +
              '<td class="nowrap num">' + util.esc(util.fmtDateTime(ev.ts)) + "</td>" +
              '<td class="cell-strong">' + util.esc(ev.asset) + "</td>" +
              "<td>" + util.esc(ev.type) + "</td>" +
              '<td class="subtle">' + util.esc(ev.source) + "</td>" +
              "<td>" + ui.sevBadge(ev.severity) + "</td>" +
              "<td>" + ui.statusBadge(ev.status) + "</td>" +
              '<td class="cell-actions"><button class="btn btn-sm" type="button" data-open="' + ev.id + '">Details</button></td>' +
              "</tr>"
            );
          })
          .join("");
      }

      document.getElementById("ev-meta").innerHTML =
        "Showing <b>" + (result.total ? (result.page - 1) * result.pageSize + 1 : 0) + "–" +
        Math.min(result.page * result.pageSize, result.total) + "</b> of <b>" + result.total +
        "</b> matching sample events" +
        (state.q || state.severity !== "all" || state.source !== "all" || state.type !== "all" || state.status !== "all"
          ? " · filtered"
          : "");

      var pagerHost = document.getElementById("ev-pager");
      pagerHost.innerHTML = "";
      pagerHost.appendChild(
        ui.pagination({
          page: result.page,
          totalPages: result.totalPages,
          onPage: function (page) {
            state.page = page;
            render();
            document.getElementById("ev-table-title").scrollIntoView({ behavior: "smooth", block: "start" });
          }
        })
      );
    }

    function onSort(key, dir) {
      if (state.sort === key) state.dir = dir;
      else {
        state.sort = key;
        state.dir = dir;
      }
      render();
    }

    document.getElementById("ev-tbody").addEventListener("click", function (event) {
      var button = event.target.closest("[data-open]");
      var row = event.target.closest("[data-event]");
      var id = button ? button.dataset.open : row ? row.dataset.event : null;
      if (!id) return;
      openDetails(services.getEvent(id));
    });
    document.getElementById("ev-tbody").addEventListener("keydown", function (event) {
      if (event.key !== "Enter") return;
      var row = event.target.closest("[data-event]");
      if (row) openDetails(services.getEvent(row.dataset.event));
    });

    document.getElementById("ev-record-note").textContent =
      services.listEvents({ pageSize: 100000 }).total + " detailed sample records · 07–09 Oct 2026";

    render();

    /* Deep link: events.html?event=EVT-9115 */
    var deepLink = util.params().get("event");
    if (deepLink && services.getEvent(deepLink)) openDetails(services.getEvent(deepLink));
  });
})();
