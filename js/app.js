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

  /* ---- Tinted-glass palette ------------------------------------------
     Cards ship colourless; this walks them and hands out a tone from a
     repeating cycle so no two neighbouring panels are the same wash.
     Opt a card out (or pin it) with data-tone="tone-teal" in the markup.
     Re-runs whenever new nodes appear, so cards rendered later — drawers,
     AI panels, detail views — get painted too. */
  var TONES = ["tone-blue", "tone-violet", "tone-teal", "tone-amber", "tone-rose", "tone-indigo"];
  var toneIndex = 0;

  function tintCards(root) {
    if (!root || root.nodeType !== 1) return;
    var targets = [];
    var selector = ".card, .setting-group, .report-sheet";
    if (root.classList && (root.matches ? root.matches(selector) : false)) targets.push(root);
    if (root.querySelectorAll) {
      targets = targets.concat(Array.prototype.slice.call(root.querySelectorAll(selector)));
    }
    targets.forEach(function (el) {
      if (el.classList.contains("is-toned")) return;
      el.classList.add("is-toned");
      var pinned = el.getAttribute("data-tone");
      if (pinned) {
        el.classList.add(pinned);
        return;
      }
      if (/\btone-/.test(el.className)) return; /* hand-authored tone wins */
      el.classList.add(TONES[toneIndex % TONES.length]);
      toneIndex += 1;
    });
  }

  function watchForCards() {
    if (!window.MutationObserver) return;
    new MutationObserver(function (records) {
      records.forEach(function (record) {
        Array.prototype.forEach.call(record.addedNodes, function (node) {
          if (node.nodeType === 1) tintCards(node);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
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

    /* Paint every card with a tone, then keep watching for new ones. */
    try {
      tintCards(document.body);
      watchForCards();
    } catch (err) {
      console.error("[Mini-SOC] card tinting failed", err);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  SOC.registerPage = registerPage;
  SOC.tintCards = tintCards;
})();
