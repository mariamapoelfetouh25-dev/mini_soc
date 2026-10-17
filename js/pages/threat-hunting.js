/* ==========================================================================
   Mini-SOC · pages/threat-hunting.js — Threat Hunting console (Page G)
   ========================================================================== */
(function () {
  "use strict";
  var util = SOC.util;
  var ui = SOC.ui;

  SOC.registerPage("threat-hunting", function () {
    var services = SOC.services;
    var href = SOC.nav.resolve;

    var state = { text: "", filters: [], lastResult: null };
    var input = document.getElementById("hq-query");
    var resultsHost = document.getElementById("hq-results");
    var countEl = document.getElementById("hq-count");
    var statusEl = document.getElementById("hq-status");

    /* ---- Scope filters ---------------------------------------------------- */
    document.querySelector(".query-builder").addEventListener("click", function (event) {
      var button = event.target.closest("[data-filter]");
      if (!button) return;
      var name = button.dataset.filter;
      var pressed = button.getAttribute("aria-pressed") === "true";
      button.setAttribute("aria-pressed", pressed ? "false" : "true");
      button.classList.toggle("btn-primary", !pressed);
      if (pressed) {
        state.filters = state.filters.filter(function (f) {
          return f !== name;
        });
      } else {
        state.filters.push(name);
      }
    });

    /* ---- Run -------------------------------------------------------------- */
    function run(text) {
      var query = (text !== undefined ? text : input.value).trim();
      if (!query && !state.filters.length) {
        ui.toast("Enter a query or pick a scope filter first.", { tone: "warning", duration: 3200 });
        input.focus();
        return;
      }
      input.value = query;
      state.text = query;

      countEl.textContent = "Running…";
      statusEl.textContent = "";

      /* Local execution against the sample dataset (no network). */
      var result = services.runHuntQuery({ text: query, filters: state.filters });
      state.lastResult = result;
      services.pushQueryHistory(query, state.filters, result.matches);

      countEl.textContent = result.matches + " matching sample event" + (result.matches === 1 ? "" : "s");
      statusEl.textContent = result.note;
      renderResults(result);
      renderHistory();

      SOC.util.emit("hunt:run", { text: query, matches: result.matches });
    }

    function renderResults(result) {
      if (!result.rows.length) {
        resultsHost.innerHTML = ui.emptyState({
          icon: "hunting",
          title: "No events matched",
          desc:
            "Nothing in the sample dataset matches this query with the current scope. Try fewer words, " +
            "remove a scope filter, or start from a saved query below.",
          actionLabel: "Load a saved query",
          actionAttr: 'id="hq-empty-saved"'
        });
        var shortcut = document.getElementById("hq-empty-saved");
        if (shortcut)
          shortcut.addEventListener("click", function () {
            var first = document.querySelector(".query-card");
            if (first) {
              first.click();
              first.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          });
        return;
      }

      resultsHost.innerHTML =
        '<div class="table-wrap"><table class="table"><caption class="sr-only">Hunt query results</caption>' +
        "<thead><tr>" +
        '<th scope="col">Time</th><th scope="col">Event</th><th scope="col">Asset</th>' +
        '<th scope="col">Type</th><th scope="col">Severity</th><th scope="col">Status</th>' +
        "</tr></thead><tbody>" +
        result.rows
          .map(function (ev) {
            return (
              "<tr>" +
              '<td class="nowrap num">' + util.esc(util.fmtDateTime(ev.ts)) + "</td>" +
              '<td><a class="mono-id" href="' + href("events.html?event=" + ev.id) + '">' + util.esc(ev.id) + "</a>" +
              '<div class="small muted truncate" style="max-width:40ch">' + util.esc(ev.title) + "</div></td>" +
              '<td class="cell-strong nowrap">' + util.esc(ev.asset) + "</td>" +
              "<td>" + util.esc(ev.type) + "</td>" +
              "<td>" + ui.sevBadge(ev.severity) + "</td>" +
              "<td>" + ui.statusBadge(ev.status) + "</td>" +
              "</tr>"
            );
          })
          .join("") +
        "</tbody></table></div>";
    }

    /* ---- Saved queries ------------------------------------------------------ */
    function renderSaved() {
      var host = document.getElementById("hq-saved");
      host.innerHTML =
        '<div class="stack-2">' +
        services
          .getSavedQueries()
          .map(function (saved) {
            return (
              '<button class="query-card" type="button" data-sq="' + saved.id + '">' +
              '<span class="qc-name">' + ui.icon("hunting") + util.esc(saved.name) + "</span>" +
              '<span class="qc-text">' + util.esc(saved.text) + "</span>" +
              '<span class="qc-meta">' + util.esc(saved.id) + " · " + saved.filters.join(", ") +
              " · owner " + util.esc(saved.owner) + " · updated " + util.esc(util.fmtDate(saved.updated)) + "</span>" +
              '<span class="qc-meta">' + util.esc(saved.description) + "</span>" +
              "</button>"
            );
          })
          .join("") +
        "</div>";
    }

    document.getElementById("hq-saved").addEventListener("click", function (event) {
      var card = event.target.closest("[data-sq]");
      if (!card) return;
      var saved = services.getSavedQueries().filter(function (sq) {
        return sq.id === card.dataset.sq;
      })[0];
      if (!saved) return;
      input.value = saved.text;
      state.filters = saved.filters.slice();
      util.qsa("[data-filter]").forEach(function (button) {
        var on = state.filters.indexOf(button.dataset.filter) !== -1;
        button.setAttribute("aria-pressed", on ? "true" : "false");
        button.classList.toggle("btn-primary", on);
      });
      run(saved.text);
      input.focus();
    });

    /* ---- History ------------------------------------------------------------ */
    function renderHistory() {
      var host = document.getElementById("hq-history");
      var rows = services.getQueryHistory();
      if (!rows.length) {
        host.innerHTML = '<p class="small muted">No queries have been run in this session.</p>';
        return;
      }
      host.innerHTML =
        '<ul class="list-divided">' +
        rows
          .map(function (row) {
            return (
              "<li><div class=\"row between row-wrap\" style=\"gap:10px\">" +
              '<div class="stack-2" style="min-width:0">' +
              '<code class="qc-text" style="font-family:var(--font-mono);font-size:var(--fs-xs)">' +
              util.esc(row.text || "(scope filters only)") + "</code>" +
              '<div class="xsmall subtle">' + util.esc(util.fmtDateTime(row.ts)) +
              (row.filters && row.filters.length ? " · " + row.filters.join(", ") : "") + "</div></div>" +
              ui.badge("badge-outline", row.matches + " matches") +
              "</div></li>"
            );
          })
          .join("") +
        "</ul>";
    }

    /* ---- Export ------------------------------------------------------------- */
    document.getElementById("hq-export").addEventListener("click", function () {
      if (!state.lastResult || !state.lastResult.rows.length) {
        ui.toast("Run a query first — there are no results to export.", { tone: "warning", duration: 3200 });
        return;
      }
      var rows = [["Event ID", "Timestamp", "Asset", "Event type", "Source", "Severity", "Status", "Title"]];
      state.lastResult.rows.forEach(function (ev) {
        rows.push([
          ev.id,
          util.fmtDateTime(ev.ts),
          ev.asset,
          ev.type,
          ev.source,
          ev.severity,
          ev.status,
          ev.title
        ]);
      });
      util.downloadFile("mini-soc-hunt-results.csv", util.toCSV(rows), "text/csv");
      ui.toast("Results exported", {
        tone: "success",
        desc: state.lastResult.rows.length + " rows written to mini-soc-hunt-results.csv."
      });
    });

    /* ---- Controls ------------------------------------------------------------ */
    document.getElementById("hq-run").addEventListener("click", function () {
      run();
    });
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        run();
      }
    });
    document.getElementById("hq-focus").addEventListener("click", function () {
      input.value = "";
      state.lastResult = null;
      countEl.textContent = "Not run yet";
      statusEl.textContent = "";
      resultsHost.innerHTML = ui.emptyState({
        icon: "hunting",
        title: "Ready for a new hypothesis",
        desc: "Type a query above, optionally add scope filters, then run it against the sample records."
      });
      input.focus();
    });

    /* ---- Initial state -------------------------------------------------------- */
    renderSaved();
    renderHistory();
    resultsHost.innerHTML = ui.emptyState({
      icon: "hunting",
      title: "No query executed yet",
      desc: "Run a saved query below or write your own to search the sample event records."
    });

    var deepQuery = util.params().get("q");
    if (deepQuery) {
      var saved = services.getSavedQueries().filter(function (sq) {
        return sq.id === deepQuery;
      })[0];
      if (saved) {
        input.value = saved.text;
        state.filters = saved.filters.slice();
        util.qsa("[data-filter]").forEach(function (button) {
          var on = state.filters.indexOf(button.dataset.filter) !== -1;
          button.setAttribute("aria-pressed", on ? "true" : "false");
          button.classList.toggle("btn-primary", on);
        });
        run(saved.text);
      } else {
        input.value = deepQuery;
        run(deepQuery);
      }
    } else if (util.params().get("query")) {
      input.value = util.params().get("query");
      run(input.value);
    }
  });
})();
