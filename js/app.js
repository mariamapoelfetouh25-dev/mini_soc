/* ==========================================================================
   Mini-SOC · app.js — bootstrap
   Loads the shared shell, then the current page's registered init function.
   Page modules register themselves with SOC.registerPage(id, init).
   ========================================================================== */
(function () {
  "use strict";
  window.SOC = window.SOC || {};
  SOC.pages = SOC.pages || {};

  function registerPage(id, init) {
    SOC.pages[id] = init;
  }

  function boot() {
    var pageId = document.body.dataset.page || "overview";

    try {
      SOC.nav.render();
    } catch (err) {
      console.error("[Mini-SOC] shell render failed", err);
    }

    var init = SOC.pages[pageId];
    if (init) {
      try {
        init();
      } catch (err) {
        console.error("[Mini-SOC] page init failed:", pageId, err);
        var host = document.getElementById("main-content");
        if (host) {
          host.innerHTML =
            '<div class="page-inner"><div class="card card-pad">' +
            '<h1 class="section-title">This page could not be initialised</h1>' +
            '<p class="muted">Details were written to the browser console.</p>' +
            "</div></div>";
        }
      }
    } else if (pageId !== "overview") {
      console.warn("[Mini-SOC] no init registered for page:", pageId);
    }

    /* Keep the document title consistent with the shell's page metadata. */
    if (!/— Mini-SOC/.test(document.title)) {
      var meta = SOC.nav.pageTitle(pageId);
      document.title = meta.title + " — Mini-SOC";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  SOC.registerPage = registerPage;
})();
