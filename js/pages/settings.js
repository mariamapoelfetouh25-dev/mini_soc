/* ==========================================================================
   Mini-SOC · pages/settings.js — Settings (Page K)
   Preferences persist in localStorage; the demo dataset is reloaded from
   js/demo-data.js / js/demo-scenarios.js on refresh.
   ========================================================================== */
(function () {
  "use strict";
  var util = SOC.util;
  var ui = SOC.ui;

  SOC.registerPage("settings", function () {
    var theme = SOC.theme;
    var prefs = SOC.prefs;

    /* ---- Theme cards ------------------------------------------------------- */
    function syncThemeCards() {
      var active = theme.current();
      util.qsa("[data-theme-choice]").forEach(function (card) {
        var choice = card.dataset.themeChoice;
        card.setAttribute("aria-pressed", choice === active ? "true" : "false");
        var slot = card.querySelector("[data-theme-icon]");
        if (slot) slot.innerHTML = ui.icon(choice === "dark" ? "moon" : "sun");
      });
    }
    document.getElementById("st-theme-cards").addEventListener("click", function (event) {
      var card = event.target.closest("[data-theme-choice]");
      if (!card) return;
      theme.apply(card.dataset.themeChoice);
      syncThemeCards();
      ui.toast("Theme set to " + card.dataset.themeChoice + ".", { tone: "info", duration: 2200 });
    });
    util.on("theme:change", syncThemeCards);
    syncThemeCards();

    /* ---- Motion ------------------------------------------------------------- */
    var motionSwitch = document.getElementById("st-motion");
    var motionLabel = document.getElementById("st-motion-label");
    function syncMotion() {
      var reduced = theme.motion() === "reduced";
      motionSwitch.checked = reduced;
      motionLabel.textContent = reduced ? "Reduced" : "Follow system";
    }
    motionSwitch.addEventListener("change", function () {
      var next = theme.applyMotion(motionSwitch.checked ? "reduced" : "system");
      syncMotion();
      ui.toast(
        next === "reduced" ? "Reduced motion enabled." : "Motion follows your system setting again.",
        { tone: "info", duration: 2400 }
      );
    });
    syncMotion();

    /* ---- Sidebar ------------------------------------------------------------ */
    var sidebarSwitch = document.getElementById("st-sidebar");
    var sidebarLabel = document.getElementById("st-sidebar-label");
    function syncSidebar() {
      var collapsed = document.body.getAttribute("data-sidebar") === "collapsed";
      sidebarSwitch.checked = collapsed;
      sidebarLabel.textContent = collapsed ? "Collapsed" : "Expanded";
    }
    sidebarSwitch.addEventListener("change", function () {
      theme.applySidebar(sidebarSwitch.checked ? "collapsed" : "expanded");
      syncSidebar();
    });
    syncSidebar();

    /* ---- Rows per page -------------------------------------------------------- */
    var pageSize = document.getElementById("st-page-size");
    pageSize.value = prefs.get("pageSize", "10");
    if (!pageSize.value) pageSize.value = "10";
    pageSize.addEventListener("change", function () {
      prefs.set("pageSize", pageSize.value);
      ui.toast("Tables will show " + pageSize.value + " rows per page.", { tone: "success" });
    });

    /* ---- Reset / clear ---------------------------------------------------------- */
    function confirmAndReload(title, message, detail) {
      ui.confirm({
        title: title,
        message: message,
        detail: detail,
        confirmLabel: "Reload now",
        danger: true
      }).then(function (ok) {
        if (ok) window.location.reload();
      });
    }
    document.getElementById("st-reload").addEventListener("click", function () {
      confirmAndReload(
        "Reset the demo session?",
        "Reload the page to restore the original sample dataset.",
        "In-memory status changes, audit entries and hunt history from this session will be discarded."
      );
    });
    document.getElementById("st-reload-2").addEventListener("click", function () {
      confirmAndReload(
        "Reload sample data?",
        "Restore the original demo dataset by reloading the page.",
        "Demo-only data lives in memory, so a reload is the reset mechanism."
      );
    });
    document.getElementById("st-clear").addEventListener("click", function () {
      ui.confirm({
        title: "Clear saved preferences?",
        message: "Theme, motion, sidebar and table preferences will be removed from this browser.",
        detail: "Only localStorage entries created by this demo are deleted. The sample dataset is untouched.",
        confirmLabel: "Clear preferences",
        danger: true
      }).then(function (ok) {
        if (!ok) return;
        var count = prefs.clear();
        try {
          ["soc.theme", "soc.motion", "soc.sidebar"].forEach(function (key) {
            localStorage.removeItem(key);
          });
        } catch (e) {}
        ui.toast(count + " preference(s) cleared. Reloading…", { tone: "success" });
        setTimeout(function () {
          window.location.reload();
        }, 500);
      });
    });

    /* ---- About --------------------------------------------------------------- */
    var env = SOC.demo.env;
    var about = [
      ["Application", "Mini-SOC frontend " + env.version],
      ["Environment", env.mode === "demo" ? "Demo workspace (sample data)" : env.mode],
      ["Sample events", SOC.demo.events.length + " detailed + " + util.sum(SOC.demo.eventSeries, function (b) { return b.value; }).toLocaleString("en-US") + " aggregated"],
      ["Incidents", SOC.demo.incidents.length],
      ["Assets", SOC.demo.assets.length + " (including " + SOC.demo.decoys.length + " decoys)"],
      ["Graph", SOC.demo.graph.nodes.length + " entities / " + SOC.demo.graph.edges.length + " relationships"],
      ["Backend", "Not connected — data layer resolves locally"],
      ["Data range", env.rangeLabel]
    ];
    document.getElementById("st-about").innerHTML = about
      .map(function (row) {
        return (
          '<div class="about-item"><div class="ai-label">' + util.esc(row[0]) + "</div>" +
          '<div class="ai-value">' + util.esc(String(row[1])) + "</div></div>"
        );
      })
      .join("");
    document.getElementById("st-claim").textContent = env.claimNote;

    /* ---- Placeholder endpoints -------------------------------------------------- */
    var labels = {
      events: "Security events",
      incidents: "Incident list",
      incident: "Single incident",
      assets: "Asset inventory",
      graph: "Attack graph",
      hunt: "Hunt query execution",
      decoys: "Deception assets",
      analysis: "AI analysis per incident",
      recommendations: "Response recommendations",
      audit: "Audit log",
      notifications: "Notifications"
    };
    document.getElementById("st-api-body").innerHTML = Object.keys(SOC.api.endpoints)
      .map(function (key) {
        return (
          "<tr><td>" + util.esc(labels[key] || key) + "</td>" +
          '<td><code class="mono-id">' + util.esc(SOC.api.endpoints[key]) + "</code></td></tr>"
        );
      })
      .join("");
  });
})();
