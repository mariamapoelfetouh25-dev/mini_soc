/* ==========================================================================
   Mini-SOC · pages/ai-analyst.js — AI Security Analyst (Page F)
   Sample analysis only: every claim carries Observed / Inference /
   Recommendation classification and links back to the source events.
   ========================================================================== */
(function () {
  "use strict";
  var util = SOC.util;
  var ui = SOC.ui;

  SOC.registerPage("ai-analyst", function () {
    var services = SOC.services;
    var href = SOC.nav.resolve;
    var params = util.params();

    document.getElementById("ai-note-ico").innerHTML = ui.icon("warning");

    var select = document.getElementById("ai-incident");
    var ids = SOC.demo.incidents.map(function (inc) {
      return inc.id;
    });
    select.innerHTML = ids
      .map(function (id) {
        var has = !!SOC.demo.ai[id];
        var inc = services.getIncident(id);
        return (
          '<option value="' + id + '">' + util.esc(id) + " — " + util.esc(inc.title.slice(0, 42)) +
          (has ? "" : " (no sample analysis)") + "</option>"
        );
      })
      .join("");

    var requested = params.get("id");
    var current = requested && services.getIncident(requested) ? requested : "INC-2026-1039";
    select.value = current;

    function refChips(refs) {
      if (!refs || !refs.length) return '<span class="xsmall subtle">No direct event reference.</span>';
      return (
        '<div class="ref-chips">' +
        refs
          .map(function (ref) {
            return (
              '<a class="ref-chip" href="' + href("events.html?event=" + encodeURIComponent(ref)) + '">' +
              util.esc(ref) + "</a>"
            );
          })
          .join("") +
        "</div>"
      );
    }

    function confidenceBlock(value) {
      return (
        '<div class="confidence"><div class="confidence-top"><span>Confidence (sample value)</span><b>' +
        value + "%</b></div>" +
        '<div class="confidence-track"><div class="confidence-fill" style="width:' + value + '%"></div></div>' +
        '<div class="confidence-scale"><span>Low</span><span>Moderate</span><span>High</span></div></div>'
      );
    }

    function render() {
      var incident = services.getIncident(current);
      var analysis = services.getAIAnalysis(current);
      var host = document.getElementById("ai-root");
      var openLink = document.getElementById("ai-open-incident");
      openLink.setAttribute("href", href("investigation.html?id=" + current));
      document.title = current + " analysis — Mini-SOC";

      if (!analysis) {
        host.innerHTML = ui.emptyState({
          icon: "ai",
          title: "No sample analysis for " + current,
          desc:
            "Authored analysis samples exist for INC-2026-1039 (ransomware precursor), INC-2026-1042 " +
            "(credential stuffing) and INC-2026-1035 (suspicious PowerShell). Pick one of those in the " +
            "incident selector, or connect a backend model as described in the README.",
          actionLabel: "Show INC-2026-1039",
          actionAttr: 'id="ai-switch"'
        });
        var switcher = document.getElementById("ai-switch");
        if (switcher)
          switcher.addEventListener("click", function () {
            select.value = "INC-2026-1039";
            current = "INC-2026-1039";
            render();
          });
        return;
      }

      host.innerHTML =
        /* ---- Summary ---- */
        '<section class="ai-block">' +
        '<div class="ai-block-head">' +
        '<span class="ai-block-title">' + ui.icon("ai") + "Incident summary — " + util.esc(analysis.incidentId) + "</span>" +
        '<span class="ai-classification ai-inference">Inference · unverified</span></div>' +
        '<p class="ai-prose">' + util.esc(analysis.summary) + "</p>" +
        '<div class="row row-wrap" style="gap:20px;align-items:flex-end">' +
        confidenceBlock(analysis.confidence) +
        '<div class="stack-2 xsmall subtle">' +
        "<div>Generated: " + util.esc(util.fmtDateTime(analysis.generatedAt)) + "</div>" +
        "<div>" + util.esc(analysis.label) + "</div>" +
        (incident ? "<div>Incident state: " + util.esc(incident.status) + " · owner " + util.esc(incident.owner) + "</div>" : "") +
        "</div></div></section>" +

        /* ---- Observed facts ---- */
        '<section class="card"><div class="card-head bordered">' +
        '<div><h2 class="card-title">Observed evidence</h2>' +
        '<div class="card-sub">Facts pulled from sample event records — verifiable, not inferred</div></div>' +
        '<span class="ai-classification ai-fact">Observed fact</span></div>' +
        '<div class="card-body"><ul class="fact-list">' +
        analysis.facts
          .map(function (fact) {
            return (
              '<li><span class="f-mark">' + ui.icon("eye") + "</span>" +
              '<div class="f-body"><div>' + util.esc(fact.text) + "</div>" +
              refChips(fact.refs) + "</div></li>"
            );
          })
          .join("") +
        "</ul></div></section>" +

        /* ---- Hypotheses ---- */
        '<section class="card"><div class="card-head bordered">' +
        '<div><h2 class="card-title">Possible explanations</h2>' +
        '<div class="card-sub">Ranked hypotheses — the top answer is not guaranteed to be correct</div></div>' +
        '<span class="ai-classification ai-inference">Inference</span></div>' +
        '<div class="card-body"><div class="stack-4">' +
        analysis.hypotheses
          .map(function (hyp) {
            var likelihoodSlug =
              hyp.likelihood === "Most likely"
                ? "status-investigating"
                : hyp.likelihood === "Possible"
                ? "status-new"
                : "badge-outline";
            return (
              '<article class="hypothesis"><div class="hypothesis-head">' +
              '<span class="hypothesis-title">' + util.esc(hyp.title) + "</span>" +
              ui.badge(likelihoodSlug, hyp.likelihood, true) +
              "</div>" +
              '<p class="ai-prose" style="font-size:var(--fs-sm)">' + util.esc(hyp.text) + "</p>" +
              '<div class="row row-wrap" style="gap:16px;align-items:flex-end">' +
              '<div style="min-width:220px;flex:1">' + confidenceBlock(hyp.confidence) + "</div>" +
              "<div>" + refChips(hyp.refs) + "</div>" +
              "</div></article>"
            );
          })
          .join("") +
        "</div></div></section>" +

        /* ---- Recommendations ---- */
        '<section class="card"><div class="card-head bordered">' +
        '<div><h2 class="card-title">Recommended investigation steps</h2>' +
        '<div class="card-sub">Suggested actions for the analyst — none of them execute automatically</div></div>' +
        '<span class="ai-classification ai-recommend">Recommendation</span></div>' +
        '<div class="card-body"><ol class="steps-list">' +
        analysis.recommendations
          .map(function (item) {
            return "<li><span>" + util.esc(item) + "</span></li>";
          })
          .join("") +
        "</ol>" +
        '<div class="note note-info" style="margin-top:14px">' + ui.icon("info") +
        "<div>Response actions that change state live on the Incident Response page and require explicit confirmation.</div></div>" +
        "</div></section>" +

        /* ---- Uncertainty ---- */
        '<section class="ai-block">' +
        '<div class="ai-block-head"><span class="ai-block-title">' + ui.icon("warning") +
        "Uncertainty &amp; what this analysis cannot tell you</span>" +
        '<span class="ai-classification ai-fact">Data limitation</span></div>' +
        '<p class="ai-prose">' + util.esc(analysis.uncertainty) + "</p>" +
        '<div class="xsmall subtle">Alternative explanations are listed above with their own confidence values. ' +
        "Treat a hypothesis as a starting point for investigation, not as a conclusion.</div></section>";

      SOC.util.emit("ai:rendered", current);
    }

    select.addEventListener("change", function () {
      current = select.value;
      render();
      ui.toast("Loaded sample analysis for " + current + ".", { tone: "info", duration: 2200 });
    });

    render();
  });
})();
