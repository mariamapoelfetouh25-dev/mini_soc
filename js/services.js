/* ==========================================================================
   Mini-SOC · services.js — data access layer (presentation never reads
   SOC.demo directly; it talks to SOC.services only)
   --------------------------------------------------------------------------
   DEMO MODE: every function below resolves synchronously from the local
   sample dataset. To connect a real backend, replace the body of a function
   with a fetch() call — page code stays unchanged apart from `await`.

   Backend integration points are declared in API_CONFIG. None of these URLs
   exist yet; they are placeholders documenting where a future API plugs in
   and what shape it must return.
   ========================================================================== */
(function () {
  "use strict";
  window.SOC = window.SOC || {};

  var util = SOC.util;

  /* ---- Placeholder endpoint map (NOT deployed, NOT called) ------------- */
  var API_CONFIG = {
    baseUrl: "", // e.g. "https://api.example.com/v1" when a backend exists
    endpoints: {
      events: "/api/events", // GET ?q=&severity=&source=&type=&status=&page=
      incidents: "/api/incidents",
      incident: "/api/incidents/{id}",
      assets: "/api/assets",
      graph: "/api/graph",
      hunt: "/api/hunt", // POST { text, filters[] }
      decoys: "/api/deception/assets",
      analysis: "/api/incidents/{id}/analysis",
      recommendations: "/api/incidents/{id}/recommendations",
      audit: "/api/audit",
      notifications: "/api/notifications"
    },
    notes:
      "Configure baseUrl and endpoints here, then swap demo bodies for fetch(). " +
      "Response schemas are documented on each service function."
  };

  var SEV_ORDER = { Critical: 5, High: 4, Medium: 3, Low: 2, Informational: 1, Info: 1 };
  var OPEN_STATUSES = ["New", "Investigating", "Contained"];

  function sevRank(sev) {
    return SEV_ORDER[sev] || 0;
  }

  /* ======================================================================
     Events
     Schema: { id, ts, asset, type, source, severity, status, title,
               detail, incident, technique, evidence }
     ====================================================================== */
  function matchText(haystack, needle) {
    return haystack.toLowerCase().indexOf(needle.toLowerCase()) !== -1;
  }

  function eventHaystack(ev) {
    return [ev.id, ev.title, ev.detail, ev.evidence, ev.asset, ev.type, ev.source, ev.incident || ""].join(" ");
  }

  /**
   * listEvents({ q, severity, source, type, status, incident, sort, dir, page, pageSize })
   * → { rows, total, page, pageSize, totalPages }
   */
  function listEvents(opts) {
    opts = opts || {};
    var rows = SOC.demo.events.slice();

    if (opts.incident) {
      rows = rows.filter(function (ev) {
        return ev.incident === opts.incident;
      });
    }
    if (opts.q) {
      rows = rows.filter(function (ev) {
        return matchText(eventHaystack(ev), opts.q);
      });
    }
    ["severity", "source", "type", "status"].forEach(function (key) {
      if (opts[key] && opts[key] !== "all") {
        rows = rows.filter(function (ev) {
          return String(ev[key]).toLowerCase() === String(opts[key]).toLowerCase();
        });
      }
    });

    var sort = opts.sort || "ts";
    var dir = opts.dir === "asc" ? 1 : -1;
    rows.sort(function (a, b) {
      var av;
      var bv;
      if (sort === "severity") {
        av = sevRank(a.severity);
        bv = sevRank(b.severity);
      } else if (sort === "ts") {
        av = a.ts;
        bv = b.ts;
      } else {
        av = String(a[sort] || "").toLowerCase();
        bv = String(b[sort] || "").toLowerCase();
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return a.id < b.id ? 1 : -1;
    });

    var pageSize = opts.pageSize || 10;
    var page = Math.max(1, opts.page || 1);
    var total = rows.length;
    var totalPages = Math.max(1, Math.ceil(total / pageSize));
    page = Math.min(page, totalPages);

    return {
      rows: rows.slice((page - 1) * pageSize, page * pageSize),
      total: total,
      page: page,
      pageSize: pageSize,
      totalPages: totalPages
    };
  }

  function getEvent(id) {
    return (
      SOC.demo.events.filter(function (ev) {
        return ev.id === id;
      })[0] || null
    );
  }

  function distinctEventFacets() {
    var seen = { severity: [], source: [], type: [], status: [] };
    SOC.demo.events.forEach(function (ev) {
      Object.keys(seen).forEach(function (key) {
        if (seen[key].indexOf(ev[key]) === -1) seen[key].push(ev[key]);
      });
    });
    seen.severity.sort(function (a, b) {
      return sevRank(b) - sevRank(a);
    });
    return seen;
  }

  function updateEventStatus(id, status) {
    var ev = getEvent(id);
    if (!ev) return null;
    ev.status = status;
    addAudit({
      actor: "Demo analyst",
      action: "Event status → " + status,
      target: ev.id,
      result: "Recorded locally (demo)",
      incident: ev.incident
    });
    return ev;
  }

  /* ======================================================================
     Incidents
     ====================================================================== */
  function listIncidents(opts) {
    opts = opts || {};
    var rows = SOC.demo.incidents.slice();

    if (opts.status && opts.status !== "all") {
      if (opts.status === "open") {
        rows = rows.filter(function (inc) {
          return OPEN_STATUSES.indexOf(inc.status) !== -1;
        });
      } else {
        rows = rows.filter(function (inc) {
          return inc.status.toLowerCase() === opts.status.toLowerCase();
        });
      }
    }
    if (opts.severity && opts.severity !== "all") {
      rows = rows.filter(function (inc) {
        return inc.severity.toLowerCase() === opts.severity.toLowerCase();
      });
    }
    if (opts.owner && opts.owner !== "all") {
      rows = rows.filter(function (inc) {
        return inc.owner === opts.owner;
      });
    }
    if (opts.q) {
      rows = rows.filter(function (inc) {
        return matchText(
          [inc.id, inc.title, inc.summary, inc.owner, inc.status].join(" "),
          opts.q
        );
      });
    }

    var sort = opts.sort || "riskScore";
    var dir = opts.dir === "asc" ? 1 : -1;
    rows.sort(function (a, b) {
      var av;
      var bv;
      if (sort === "severity") {
        av = sevRank(a.severity);
        bv = sevRank(b.severity);
      } else if (sort === "riskScore" || sort === "createdAt" || sort === "updatedAt") {
        av = a[sort];
        bv = b[sort];
      } else {
        av = String(a[sort] || "").toLowerCase();
        bv = String(b[sort] || "").toLowerCase();
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    var pageSize = opts.pageSize || 8;
    var page = Math.max(1, opts.page || 1);
    var totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    page = Math.min(page, totalPages);

    return {
      rows: rows.slice((page - 1) * pageSize, page * pageSize),
      total: rows.length,
      page: page,
      pageSize: pageSize,
      totalPages: totalPages,
      counts: incidentStatusCounts()
    };
  }

  function incidentStatusCounts() {
    var counts = { all: SOC.demo.incidents.length, open: 0, New: 0, Investigating: 0, Contained: 0, Resolved: 0, Closed: 0 };
    SOC.demo.incidents.forEach(function (inc) {
      counts[inc.status] = (counts[inc.status] || 0) + 1;
      if (OPEN_STATUSES.indexOf(inc.status) !== -1) counts.open += 1;
    });
    return counts;
  }

  function getIncident(id) {
    return (
      SOC.demo.incidents.filter(function (inc) {
        return inc.id === id;
      })[0] || null
    );
  }

  function updateIncidentStatus(id, status) {
    var inc = getIncident(id);
    if (!inc) return null;
    inc.status = status;
    inc.updatedAt = SOC.demo.env.now;
    addAudit({
      actor: "Demo analyst",
      action: "Status → " + status,
      target: inc.id,
      result: "Recorded locally (demo)",
      incident: inc.id
    });
    return inc;
  }

  /** Everything an investigation page needs in one call. */
  function getIncidentBundle(id) {
    var inc = getIncident(id);
    if (!inc) return null;
    var events = SOC.demo.events
      .filter(function (ev) {
        return ev.incident === inc.id;
      })
      .sort(function (a, b) {
        return a.ts - b.ts;
      });
    var assets = inc.assetIds
      .map(getAsset)
      .filter(Boolean);
    var techniques = inc.techniques
      .map(getTechnique)
      .filter(Boolean);
    var graphNodes = inc.graphNodes
      .map(getGraphNode)
      .filter(Boolean);
    return {
      incident: inc,
      events: events,
      assets: assets,
      techniques: techniques,
      graphNodes: graphNodes,
      ai: getAIAnalysis(inc.id),
      recommendations: getRecommendations(inc.id)
    };
  }

  /* ======================================================================
     Assets & techniques
     ====================================================================== */
  function listAssets(opts) {
    opts = opts || {};
    return SOC.demo.assets.filter(function (a) {
      if (opts.type && opts.type !== "all" && a.type !== opts.type) return false;
      if (opts.q && !matchText([a.id, a.name, a.type, a.os, a.zone, a.ip].join(" "), opts.q)) return false;
      return true;
    });
  }
  function getAsset(id) {
    return (
      SOC.demo.assets.filter(function (a) {
        return a.id === id;
      })[0] || null
    );
  }
  function getTechnique(id) {
    return (
      SOC.demo.techniques.filter(function (tech) {
        return tech.id === id;
      })[0] || { id: id, name: id, tactic: "—" }
    );
  }
  function getActor(id) {
    return (
      SOC.demo.actors.filter(function (a) {
        return a.id === id;
      })[0] || null
    );
  }

  /* ======================================================================
     Aggregates for charts
     ====================================================================== */
  function getEventSeries() {
    return SOC.demo.eventSeries.slice();
  }
  function getSeverityTotals() {
    return SOC.demo.severityTotals.slice();
  }
  function kpis() {
    var open = SOC.demo.incidents.filter(function (inc) {
      return OPEN_STATUSES.indexOf(inc.status) !== -1;
    }).length;
    var totalEvents = util.sum(SOC.demo.eventSeries, function (b) {
      return b.value;
    });
    return {
      events: totalEvents,
      openIncidents: open,
      threats: SOC.demo.env.detectedThreats,
      assets: SOC.demo.assets.length,
      criticalNow: SOC.demo.incidents.filter(function (i) {
        return i.severity === "Critical" && OPEN_STATUSES.indexOf(i.status) !== -1;
      }).length
    };
  }

  /* ======================================================================
     Threat hunting — local query engine over sample events
     Supported syntax: free text (AND) + field:value tokens.
     Fields: type · severity · status · asset · source · incident · technique
     Filters: network · endpoints · credentials · behavioral
     ====================================================================== */
  var FILTER_PREDICATES = {
    network: function (ev) {
      return ["Network Sensor", "VPN", "Cloud Logs"].indexOf(ev.source) !== -1 || ["Network", "DNS"].indexOf(ev.type) !== -1;
    },
    endpoints: function (ev) {
      return ev.source === "EDR" || ["Process", "Malware", "File"].indexOf(ev.type) !== -1 || /^EP-/.test(ev.asset);
    },
    credentials: function (ev) {
      return ["Authentication", "Identity"].indexOf(ev.type) !== -1 || /^(T1110|T1003|T1078|T1558)/.test(ev.technique || "");
    },
    behavioral: function (ev) {
      return /beacon|lateral|impossible|fatigue|staging|encoded|shadow|bulk|spike/i.test(
        ev.title + " " + ev.detail
      );
    }
  };

  var FIELD_KEYS = ["type", "severity", "status", "asset", "source", "incident", "technique"];

  function parseQuery(text) {
    var terms = [];
    var fields = {};
    String(text || "")
      .split(/\s+/)
      .filter(Boolean)
      .forEach(function (token) {
        var m = token.match(/^([a-z]+):(.+)$/i);
        if (m && FIELD_KEYS.indexOf(m[1].toLowerCase()) !== -1) {
          var key = m[1].toLowerCase();
          fields[key] = fields[key] || [];
          fields[key].push(m[2]);
        } else {
          terms.push(token);
        }
      });
    return { terms: terms, fields: fields };
  }

  /**
   * runHuntQuery({ text, filters:[], limit })
   * → { rows, matches, terms, fields, filters, note }
   */
  function runHuntQuery(opts) {
    opts = opts || {};
    var parsed = parseQuery(opts.text);
    var filters = opts.filters || [];

    var rows = SOC.demo.events.filter(function (ev) {
      var hay = eventHaystack(ev).toLowerCase();
      var ok = parsed.terms.every(function (term) {
        return hay.indexOf(term.toLowerCase()) !== -1;
      });
      if (!ok) return false;

      var fieldOk = Object.keys(parsed.fields).every(function (key) {
        return parsed.fields[key].some(function (value) {
          var needle = String(value).toLowerCase();
          var actual = String(ev[key] === undefined ? "" : ev[key]).toLowerCase();
          return actual === needle || actual.indexOf(needle) !== -1;
        });
      });
      if (!fieldOk) return false;

      return filters.every(function (name) {
        var predicate = FILTER_PREDICATES[name];
        return predicate ? predicate(ev) : true;
      });
    });

    rows.sort(function (a, b) {
      return b.ts - a.ts;
    });

    return {
      rows: opts.limit ? rows.slice(0, opts.limit) : rows,
      matches: rows.length,
      terms: parsed.terms,
      fields: parsed.fields,
      filters: filters,
      note: "Executed locally against " + SOC.demo.events.length + " sample records — this query did not touch a real network."
    };
  }

  function getSavedQueries() {
    return SOC.demo.hunting.saved.slice();
  }
  function getQueryHistory() {
    return SOC.demo.hunting.history.slice();
  }
  function pushQueryHistory(text, filters, matches) {
    SOC.demo.hunting.history.unshift({
      id: "QH-" + (SOC.demo.hunting.history.length + 1),
      ts: SOC.demo.env.now,
      text: text,
      filters: filters || [],
      matches: matches
    });
    return SOC.demo.hunting.history;
  }

  /* ======================================================================
     Cyber deception
     ====================================================================== */
  function listDecoys(opts) {
    opts = opts || {};
    return SOC.demo.decoys.filter(function (d) {
      if (opts.status && opts.status !== "all" && d.status !== opts.status) return false;
      if (opts.q && !matchText([d.id, d.name, d.type, d.purpose, d.represents].join(" "), opts.q)) return false;
      return true;
    });
  }
  function getDecoy(id) {
    return (
      SOC.demo.decoys.filter(function (d) {
        return d.id === id;
      })[0] || null
    );
  }
  function getDeceptionTimeline(decoyId) {
    return SOC.demo.deceptionTimeline.filter(function (row) {
      return !decoyId || row.decoy === decoyId;
    });
  }

  /* ======================================================================
     AI analysis (sample records — never presented as verified fact)
     ====================================================================== */
  function getAIAnalysis(incidentId) {
    return SOC.demo.ai[incidentId] || null;
  }

  /* ======================================================================
     Incident response
     ====================================================================== */
  function getRecommendations(incidentId) {
    return SOC.demo.response.recommendations.filter(function (rec) {
      return rec.incidentId === incidentId;
    });
  }
  function getRecommendation(id) {
    return (
      SOC.demo.response.recommendations.filter(function (rec) {
        return rec.id === id;
      })[0] || null
    );
  }
  function setRecommendationStatus(id, status) {
    var rec = getRecommendation(id);
    if (!rec) return null;
    rec.status = status;
    addAudit({
      actor: "Demo analyst",
      action: status + " · " + rec.title,
      target: rec.id,
      result: "Simulated decision — no action executed",
      incident: rec.incidentId
    });
    return rec;
  }
  function getWorkflow() {
    return SOC.demo.response.workflow.slice();
  }
  function getAudit(incidentId) {
    var rows = SOC.demo.response.audit.slice();
    if (incidentId) {
      rows = rows.filter(function (row) {
        return row.incident === incidentId;
      });
    }
    return rows.sort(function (a, b) {
      return b.ts - a.ts;
    });
  }
  function addAudit(entry) {
    SOC.demo.response.audit.unshift({
      ts: SOC.demo.env.now,
      actor: entry.actor || "Demo analyst",
      action: entry.action,
      target: entry.target,
      result: entry.result || "Recorded locally (demo)",
      incident: entry.incident || null
    });
    SOC.util.emit("audit:change", entry);
  }

  /** Risk score factors for the response page. */
  function getRiskFactors(incident) {
    var factorSets = {
      "INC-2026-1039": [
        { label: "Confirmed lateral movement", value: 24, max: 25, tone: "critical", evidence: "EVT-9119 · SMB admin share to SRV-DB-02" },
        { label: "Active command-and-control channel", value: 22, max: 25, tone: "critical", evidence: "EVT-9121 · 60-second HTTPS beacon" },
        { label: "Impact-stage behaviour observed", value: 20, max: 20, tone: "high", evidence: "EVT-9124 · shadow copy deletion attempt" },
        { label: "Privileged service account misuse", value: 16, max: 15, tone: "high", evidence: "EVT-9108 · svc-backup used interactively" },
        { label: "Blast radius (3 core assets)", value: 10, max: 15, tone: "medium", evidence: "SRV-DB-02, SRV-FILE-01, SRV-AD-01" }
      ],
      "INC-2026-1042": [
        { label: "Successful hostile sign-in", value: 28, max: 30, tone: "critical", evidence: "EVT-9116 · success from unseen ASN" },
        { label: "Missing MFA claim", value: 24, max: 25, tone: "critical", evidence: "EVT-9116 · mfa=not-challenged" },
        { label: "Volume of authentication abuse", value: 20, max: 20, tone: "high", evidence: "EVT-9115 · 412 failures / 6 min" },
        { label: "Finance account targeted", value: 8, max: 15, tone: "medium", evidence: "u-jchen · Support engineer" },
        { label: "Unknown dwell time", value: 6, max: 10, tone: "medium", evidence: "No session-termination record in demo data" }
      ]
    };
    if (factorSets[incident.id]) return factorSets[incident.id];
    return [
      { label: "Severity of related events", value: Math.round(incident.riskScore * 0.4), max: 40, tone: "high", evidence: incident.eventIdsHint || "Linked sample events" },
      { label: "Asset criticality", value: Math.round(incident.riskScore * 0.3), max: 30, tone: "medium", evidence: (incident.assetIds || []).join(", ") || "—" },
      { label: "Status of containment", value: Math.round(incident.riskScore * 0.3), max: 30, tone: "medium", evidence: "Current state: " + incident.status }
    ];
  }

  /* ======================================================================
     Notifications / activity
     ====================================================================== */
  function getNotifications() {
    return SOC.demo.notifications.slice().sort(function (a, b) {
      return b.ts - a.ts;
    });
  }
  function unreadCount() {
    return SOC.demo.notifications.filter(function (n) {
      return !n.read;
    }).length;
  }
  function markAllNotificationsRead() {
    SOC.demo.notifications.forEach(function (n) {
      n.read = true;
    });
    SOC.util.emit("notifications:change", {});
  }
  function dismissNotification(id) {
    SOC.demo.notifications = SOC.demo.notifications.filter(function (n) {
      return n.id !== id;
    });
    SOC.util.emit("notifications:change", {});
  }
  function getActivity() {
    return SOC.demo.activity.slice();
  }
  function getHuntingFindings() {
    return SOC.demo.huntingFindings.slice();
  }

  /* ======================================================================
     Attack graph
     ====================================================================== */
  function getGraph() {
    return { nodes: SOC.demo.graph.nodes, edges: SOC.demo.graph.edges, attackPath: SOC.demo.graph.attackPath };
  }
  function getGraphNode(id) {
    return (
      SOC.demo.graph.nodes.filter(function (n) {
        return n.id === id;
      })[0] || null
    );
  }
  function graphEventsForNode(nodeId) {
    var node = getGraphNode(nodeId);
    if (!node) return [];
    return (node.eventIds || [])
      .map(getEvent)
      .filter(Boolean)
      .sort(function (a, b) {
        return b.ts - a.ts;
      });
  }

  /* ======================================================================
     Reports
     ====================================================================== */
  function getReport(opts) {
    opts = opts || {};
    var from = opts.from || Date.parse("2026-10-07T00:00:00");
    var to = opts.to || SOC.demo.env.now;
    var severity = opts.severity && opts.severity !== "all" ? opts.severity : null;
    var rangeLabel = util.fmtDate(from) + " – " + util.fmtDate(to);

    var incidents = SOC.demo.incidents.filter(function (inc) {
      if (inc.createdAt < from || inc.createdAt > to) return false;
      if (severity && inc.severity !== severity) return false;
      return true;
    });
    var events = SOC.demo.events.filter(function (ev) {
      if (ev.ts < from || ev.ts > to) return false;
      if (severity && ev.severity !== severity) return false;
      return true;
    });

    return {
      rangeLabel: rangeLabel,
      from: from,
      to: to,
      severity: severity || "All severities",
      generatedAt: SOC.demo.env.now,
      incidents: incidents,
      events: events,
      incidentBySeverity: util.countBy(incidents, function (i) {
        return i.severity;
      }),
      incidentByStatus: util.countBy(incidents, function (i) {
        return i.status;
      }),
      eventBySeverity: util.countBy(events, function (e) {
        return e.severity;
      }),
      eventBySource: util.countBy(events, function (e) {
        return e.source;
      }),
      hunting: getHuntingFindings(),
      decoyTriggers: SOC.demo.deceptionTimeline.filter(function (row) {
        return row.ts >= from && row.ts <= to;
      })
    };
  }

  /* ======================================================================
     Global search (topbar)
     ====================================================================== */
  function searchAll(query) {
    var q = String(query || "").trim();
    if (q.length < 2) return [];
    var lower = q.toLowerCase();
    var results = [];

    SOC.demo.incidents.forEach(function (inc) {
      if ((inc.id + " " + inc.title + " " + inc.owner).toLowerCase().indexOf(lower) !== -1)
        results.push({ kind: "Incident", title: inc.id + " · " + inc.title, sub: inc.severity + " · " + inc.status + " · " + inc.owner, icon: "shield", href: "investigation.html?id=" + inc.id });
    });
    SOC.demo.events.forEach(function (ev) {
      if ((ev.id + " " + ev.title + " " + ev.asset + " " + ev.detail).toLowerCase().indexOf(lower) !== -1)
        results.push({ kind: "Event", title: ev.id + " · " + ev.title, sub: ev.severity + " · " + ev.asset + " · " + util.fmtDateTime(ev.ts), icon: "activity", href: "events.html?event=" + ev.id });
    });
    SOC.demo.assets.forEach(function (asset) {
      if ((asset.id + " " + asset.type + " " + asset.ip).toLowerCase().indexOf(lower) !== -1)
        results.push({ kind: "Asset", title: asset.id, sub: asset.type + " · " + asset.zone + " · " + asset.status, icon: "server", href: "attack-graph.html?focus=" + encodeURIComponent(asset.id) });
    });
    SOC.demo.techniques.forEach(function (tech) {
      if ((tech.id + " " + tech.name + " " + tech.tactic).toLowerCase().indexOf(lower) !== -1)
        results.push({ kind: "ATT&CK", title: tech.id + " · " + tech.name, sub: tech.tactic, icon: "target", href: "attack-graph.html" });
    });
    SOC.demo.decoys.forEach(function (decoy) {
      if ((decoy.id + " " + decoy.name + " " + decoy.type).toLowerCase().indexOf(lower) !== -1)
        results.push({ kind: "Deception", title: decoy.name, sub: decoy.type + " · " + decoy.status, icon: "decoy", href: "deception.html?decoy=" + decoy.id });
    });

    return results.slice(0, 12);
  }

  SOC.api = API_CONFIG;
  SOC.services = {
    sevRank: sevRank,
    OPEN_STATUSES: OPEN_STATUSES,
    /* events */
    listEvents: listEvents,
    getEvent: getEvent,
    distinctEventFacets: distinctEventFacets,
    updateEventStatus: updateEventStatus,
    /* incidents */
    listIncidents: listIncidents,
    getIncident: getIncident,
    getIncidentBundle: getIncidentBundle,
    updateIncidentStatus: updateIncidentStatus,
    incidentStatusCounts: incidentStatusCounts,
    /* assets & techniques */
    listAssets: listAssets,
    getAsset: getAsset,
    getTechnique: getTechnique,
    getActor: getActor,
    /* aggregates */
    getEventSeries: getEventSeries,
    getSeverityTotals: getSeverityTotals,
    kpis: kpis,
    /* hunting */
    runHuntQuery: runHuntQuery,
    getSavedQueries: getSavedQueries,
    getQueryHistory: getQueryHistory,
    pushQueryHistory: pushQueryHistory,
    /* deception */
    listDecoys: listDecoys,
    getDecoy: getDecoy,
    getDeceptionTimeline: getDeceptionTimeline,
    /* ai + response */
    getAIAnalysis: getAIAnalysis,
    getRecommendations: getRecommendations,
    setRecommendationStatus: setRecommendationStatus,
    getRiskFactors: getRiskFactors,
    getWorkflow: getWorkflow,
    getAudit: getAudit,
    addAudit: addAudit,
    /* notifications */
    getNotifications: getNotifications,
    unreadCount: unreadCount,
    markAllNotificationsRead: markAllNotificationsRead,
    dismissNotification: dismissNotification,
    getActivity: getActivity,
    getHuntingFindings: getHuntingFindings,
    /* graph */
    getGraph: getGraph,
    getGraphNode: getGraphNode,
    graphEventsForNode: graphEventsForNode,
    /* reports + search */
    getReport: getReport,
    searchAll: searchAll
  };
})();
