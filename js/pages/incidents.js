/* ==========================================================================
   Mini-SOC · pages/incidents.js — Incident Management (Page C)
   ========================================================================== */
(function () {
  "use strict";
  var util = SOC.util;
  var ui = SOC.ui;

  SOC.registerPage("incidents", function () {
    var services = SOC.services;
    var href = SOC.nav.resolve;

    var params = util.params();
    var state = {
      status: params.get("status") || "all",
      severity: "all",
      owner: "all",
      q: "",
      sort: "riskScore",
      dir: "desc",
      page: 1,
      pageSize: Number(SOC.prefs.get("pageSize", 6)) || 6
    };
    if (state.status === "open") state.status = "open";

    document.getElementById("inc-search-ico").innerHTML = ui.icon("search");

    /* ---- Owners --------------------------------------------------------- */
    var owners = {};
    SOC.demo.incidents.forEach(function (inc) {
      owners[inc.owner] = true;
    });
    document.getElementById("inc-owner").innerHTML =
      '<option value="all">All owners</option>' +
      Object.keys(owners).map(function (owner) {
        return '<option value="' + util.esc(owner) + '">' + util.esc(owner) + "</option>";
      }).join("");

    /* ---- Controls ------------------------------------------------------- */
    document.getElementById("inc-search").addEventListener(
      "input",
      util.debounce(function (event) {
        state.q = event.target.value.trim();
        state.page = 1;
        render();
      }, 160)
    );
    document.getElementById("inc-severity").addEventListener("change", function (event) {
      state.severity = event.target.value;
      state.page = 1;
      render();
    });
    document.getElementById("inc-owner").addEventListener("change", function (event) {
      state.owner = event.target.value;
      state.page = 1;
      render();
    });
    document.getElementById("inc-sort").addEventListener("change", function (event) {
      var parts = event.target.value.split(":");
      state.sort = parts[0];
      state.dir = parts[1];
      render();
    });
    document.getElementById("inc-clear").addEventListener("click", function () {
      state.status = "all";
      state.severity = "all";
      state.owner = "all";
      state.q = "";
      state.page = 1;
      document.getElementById("inc-search").value = "";
      document.getElementById("inc-severity").value = "all";
      document.getElementById("inc-owner").value = "all";
      render();
      ui.toast("Filters cleared.", { tone: "info", duration: 2000 });
    });

    function renderTabs(counts) {
      var tabsHost = document.getElementById("inc-status-tabs");
      var tabs = [
        { id: "all", label: "All", count: counts.all },
        { id: "open", label: "Open", count: counts.open },
        { id: "New", label: "New", count: counts.New },
        { id: "Investigating", label: "Investigating", count: counts.Investigating },
        { id: "Contained", label: "Contained", count: counts.Contained },
        { id: "Resolved", label: "Resolved", count: counts.Resolved },
        { id: "Closed", label: "Closed", count: counts.Closed }
      ];
      tabsHost.innerHTML = tabs
        .map(function (tab) {
          return (
            '<button type="button" data-status="' + tab.id + '" aria-pressed="' +
            (state.status === tab.id ? "true" : "false") + '">' +
            util.esc(tab.label) + '<span class="seg-count">' + (tab.count || 0) + "</span></button>"
          );
        })
        .join("");
    }

    document.getElementById("inc-status-tabs").addEventListener("click", function (event) {
      var button = event.target.closest("[data-status]");
      if (!button) return;
      state.status = button.dataset.status;
      state.page = 1;
      render();
    });

    /* ---- Demo status change -------------------------------------------- */
    var STATUSES = ["New", "Investigating", "Contained", "Resolved", "Closed"];
    function changeStatus(incident) {
      var select = util.el("select", { class: "select", id: "inc-new-status", "aria-label": "New status" });
      select.innerHTML = STATUSES.map(function (status) {
        return (
          '<option value="' + status + '"' + (incident.status === status ? " selected" : "") + ">" + status + "</option>"
        );
      }).join("");

      var dialog = ui.openDialog({
        title: "Change status · " + incident.id,
        body:
          '<div class="stack-4">' +
          '<p class="small muted">' + util.esc(incident.title) + "</p>" +
          '<div class="row" style="gap:12px">' +
          '<span class="small">Current:</span>' + ui.statusBadge(incident.status) + "</div>" +
          '<div class="field"><label class="field-label" for="inc-new-status">New status</label>' +
          select +
          '<span class="field-hint">Demo change: stored in memory and written to the local audit log.</span></div>' +
          "</div>",
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
                detail: "Demo-only change. No ticketing, SOAR or directory system is updated by this interface.",
                confirmLabel: "Apply status"
              }).then(function (ok) {
                if (!ok) return;
                services.updateIncidentStatus(incident.id, next);
                ui.toast(incident.id + " → " + next, { tone: "success" });
                render();
                updateNavBadge();
              });
            }
          })
        )
      });
      void dialog;
    }

    function updateNavBadge() {
      var badge = document.querySelector(".nav-link .nav-badge");
      if (!badge) return;
      var open = services.incidentStatusCounts().open;
      if (open > 0) {
        badge.textContent = String(open);
        badge.title = open + " open incidents";
      } else if (badge.parentNode) {
        badge.parentNode.removeChild(badge);
      }
    }

    /* ---- Render ---------------------------------------------------------- */
    function render() {
      var counts = services.incidentStatusCounts();
      renderTabs(counts);

      var result = services.listIncidents(state);
      var list = document.getElementById("inc-list");

      if (!result.rows.length) {
        list.innerHTML = ui.emptyState({
          icon: "shield",
          title: "No incidents match these filters",
          desc: "Nothing in the sample queue matches the current status, severity, owner and search text.",
          actionLabel: "Reset filters",
          actionAttr: 'id="inc-empty-reset"'
        });
        var reset = document.getElementById("inc-empty-reset");
        if (reset)
          reset.addEventListener("click", function () {
            document.getElementById("inc-clear").click();
          });
      } else {
        list.innerHTML = result.rows
          .map(function (inc) {
            var riskTone = inc.riskScore >= 80 ? "critical" : inc.riskScore >= 60 ? "high" : inc.riskScore >= 40 ? "medium" : "low";
            var eventCount = SOC.demo.events.filter(function (ev) {
              return ev.incident === inc.id;
            }).length;
            return (
              '<article class="incident-row">' +
              '<div class="ir-main">' +
              '<div class="ir-title">' +
              ui.sevBadge(inc.severity) + ui.statusBadge(inc.status) + ui.priorityFlag(inc.priority) +
              '<a class="ir-title" style="font-size:var(--fs-md)" href="' +
              href("investigation.html?id=" + inc.id) + '">' + util.esc(inc.id) + " · " + util.esc(inc.title) + "</a>" +
              "</div>" +
              '<div class="ir-meta">' +
              '<span class="m">' + ui.icon("user") + util.esc(inc.owner) + "</span>" +
              '<span class="m">' + ui.icon("clock") + "Created " + util.esc(util.fmtDateTime(inc.createdAt)) + "</span>" +
              '<span class="m">' + ui.icon("events") + eventCount + " related events</span>" +
              '<span class="m">' + ui.icon("target") + util.esc(inc.source) + "</span>" +
              "</div></div>" +
              '<div class="ir-side">' +
              '<div class="risk-pill" title="Risk score out of 100 (sample computation)">' +
              '<span class="rp-num" style="color:var(--sev-' + riskTone + ')">' + inc.riskScore + "</span>" +
              '<span class="rp-label">risk</span></div>' +
              '<div class="row" style="gap:8px">' +
              '<button class="btn btn-sm" type="button" data-status-for="' + inc.id + '">Change status</button>' +
              '<a class="btn btn-sm btn-primary" href="' + href("investigation.html?id=" + inc.id) + '">Investigate</a>' +
              "</div></div></article>"
            );
          })
          .join("");
      }

      document.getElementById("inc-meta").innerHTML =
        "Showing <b>" + result.total + "</b> of <b>" + counts.all + "</b> sample incidents" +
        (state.status !== "all" ? " · status: " + util.esc(state.status) : "");

      var pagerHost = document.getElementById("inc-pager");
      pagerHost.innerHTML = "";
      pagerHost.appendChild(
        ui.pagination({
          page: result.page,
          totalPages: result.totalPages,
          onPage: function (page) {
            state.page = page;
            render();
          }
        })
      );
    }

    document.getElementById("inc-list").addEventListener("click", function (event) {
      var button = event.target.closest("[data-status-for]");
      if (!button) return;
      var incident = services.getIncident(button.dataset.statusFor);
      if (incident) changeStatus(incident);
    });

    render();
    updateNavBadge();
  });
})();
