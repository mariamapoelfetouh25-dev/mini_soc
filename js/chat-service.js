/* ==========================================================================
   Mini-SOC · chat-service.js — AI Assistant data layer + provider adapter
   --------------------------------------------------------------------------
   SOC.chat owns everything below the UI: provider configuration, the current
   (mock) provider, conversation state and local persistence. It performs NO
   DOM rendering — chat-ui.js subscribes to the "chat:changed" event and draws
   whatever the store contains. This keeps submission/data access separate
   from presentation.

   PROVIDER ADAPTER BOUNDARY — the single place to swap in a real backend:
     CONFIG.provider = "mock" → scripted, clearly-labelled demo responses
                                 generated locally in this browser (current).
     CONFIG.provider = "http" → POST CONFIG.endpoints.send to a future server
                                 (see httpSend below — unreachable today).

   Honesty rules baked into this module:
     • No AI model, LLM or backend is connected. Nothing here calls the
       network. No API keys are ever embedded client-side.
     • Mock replies about workspace data only quote records that really exist
       in the local demo dataset (SOC.services), and the UI labels them.
     • Two documented demo test hooks exist so error/empty states can be
       exercised without a backend: send "/error" or "/empty".

   Proposed (NOT deployed, NOT called) future endpoints:
     POST /api/chat            { mode, message, conversationId, context }
                               → { text, … }
     GET  /api/chat/conversations → [ { id, title, messages, … } ]
     GET  /api/chat/context?incidentId=… → authorized record context
   ========================================================================== */
(function () {
  "use strict";
  window.SOC = window.SOC || {};
  var util = SOC.util;

  /* ---- Configuration (keep API configuration in one place) -------------- */
  var CONFIG = {
    provider: "mock", // "mock" | "http" ("http" requires a deployed backend)
    baseUrl: "", // e.g. "https://api.example.com" once a backend exists
    endpoints: {
      send: "/api/chat",
      conversations: "/api/chat/conversations",
      context: "/api/chat/context"
    },
    providerLabel: "Demo provider", // shown in the UI status chip
    maxMessageChars: 4000,
    maxConversations: 20,
    maxMessagesPerConversation: 100,
    mockLatencyMs: [550, 1150] // simulated round-trip window
  };

  /* ---- Store ------------------------------------------------------------ */
  var STORE_KEY = "soc.chat.store";
  var NEW = "new"; // activeId sentinel: a fresh, not-yet-saved conversation

  var state = {
    conversations: [], // newest first; only conversations with messages persist
    activeId: NEW,
    mode: "general", // "general" | "soc"
    pending: false,
    lastFailed: null, // { text, context } kept for retry()
    storageAvailable: true
  };

  var seq = 0;
  function nextId(prefix) {
    seq += 1;
    return prefix + "-" + Date.now().toString(36) + "-" + seq;
  }

  /* ---- Persistence (localStorage, fails safe) --------------------------- */
  function normalizeMessage(raw) {
    if (!raw || typeof raw !== "object") return null;
    var role = raw.role === "user" ? "user" : "assistant";
    var text = typeof raw.text === "string" ? raw.text.slice(0, CONFIG.maxMessageChars) : "";
    if (!text && raw.code !== "empty" && raw.code !== "failed") return null;
    return {
      id: typeof raw.id === "string" ? raw.id : nextId("m"),
      role: role,
      text: text,
      ts: typeof raw.ts === "number" ? raw.ts : Date.now(),
      code: typeof raw.code === "string" ? raw.code : null
    };
  }

  function normalizeConversation(raw) {
    if (!raw || typeof raw !== "object" || typeof raw.id !== "string") return null;
    var messages = Array.isArray(raw.messages)
      ? raw.messages.map(normalizeMessage).filter(Boolean)
      : [];
    if (!messages.length) return null; // never persist empty conversations
    return {
      id: raw.id,
      title: typeof raw.title === "string" && raw.title ? raw.title.slice(0, 80) : "Conversation",
      mode: raw.mode === "soc" ? "soc" : "general",
      created: typeof raw.created === "number" ? raw.created : Date.now(),
      messages: messages.slice(-CONFIG.maxMessagesPerConversation)
    };
  }

  function load() {
    var raw = null;
    try {
      raw = localStorage.getItem(STORE_KEY);
    } catch (e) {
      state.storageAvailable = false;
      return;
    }
    if (!raw) return;
    try {
      var data = JSON.parse(raw);
      if (!data || data.v !== 1 || !Array.isArray(data.conversations)) return;
      state.conversations = data.conversations
        .map(normalizeConversation)
        .filter(Boolean)
        .slice(0, CONFIG.maxConversations);
      var active = data.activeId;
      state.activeId =
        active && state.conversations.some(function (c) {
          return c.id === active;
        })
          ? active
          : NEW;
    } catch (e) {
      state.conversations = [];
      state.activeId = NEW;
    }
  }

  var saveWarned = false;
  function persist() {
    if (!state.storageAvailable) return;
    try {
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({
          v: 1,
          activeId: state.activeId === NEW ? null : state.activeId,
          conversations: state.conversations
        })
      );
    } catch (e) {
      state.storageAvailable = false;
      if (!saveWarned) {
        saveWarned = true;
        // Conversation history stays usable in memory; only persistence is lost.
        console.warn("[Mini-SOC] Chat: local storage is unavailable — conversations will not survive a reload.");
        util.emit("chat:storage-warning", e);
      }
    }
  }

  /* ---- Change notification --------------------------------------------- */
  function emit(reason) {
    util.emit("chat:changed", { reason: reason });
  }
  function subscribe(fn) {
    return util.on("chat:changed", fn);
  }

  /* ---- Conversation accessors ------------------------------------------ */
  function listConversations() {
    return state.conversations.slice();
  }
  function getActiveConversation() {
    var id = state.activeId;
    if (id === NEW) return null;
    for (var i = 0; i < state.conversations.length; i++) {
      if (state.conversations[i].id === id) return state.conversations[i];
    }
    return null;
  }
  function titleFrom(text) {
    var flat = String(text).replace(/\s+/g, " ").trim();
    return flat.length > 48 ? flat.slice(0, 47) + "…" : flat || "New conversation";
  }

  function newConversation() {
    state.activeId = NEW;
    state.lastFailed = null;
    emit("new-conversation");
  }

  function selectConversation(id) {
    var found = state.conversations.some(function (c) {
      return c.id === id;
    });
    if (!found) return false;
    state.activeId = id;
    state.lastFailed = null;
    persist();
    emit("select-conversation");
    return true;
  }

  function deleteConversation(id) {
    var wasActive = state.activeId === id;
    state.conversations = state.conversations.filter(function (c) {
      return c.id !== id;
    });
    if (wasActive) {
      state.activeId = NEW;
      state.lastFailed = null;
    }
    persist();
    emit("delete-conversation");
  }

  /* ---- Mode ------------------------------------------------------------- */
  function getMode() {
    return state.mode;
  }
  function setMode(mode) {
    var next = mode === "soc" ? "soc" : "general";
    if (next === state.mode) return state.mode;
    state.mode = next;
    SOC.prefs.set("chatMode", next);
    emit("mode-change");
    return state.mode;
  }

  /* ---- Sending ---------------------------------------------------------- */
  function ensureConversation(firstText) {
    var convo = getActiveConversation();
    if (convo) return convo;
    convo = {
      id: nextId("conv"),
      title: titleFrom(firstText),
      mode: state.mode,
      created: Date.now(),
      messages: []
    };
    state.conversations.unshift(convo);
    if (state.conversations.length > CONFIG.maxConversations) {
      state.conversations.length = CONFIG.maxConversations;
    }
    state.activeId = convo.id;
    return convo;
  }

  function recentHistory(convo) {
    return convo.messages.slice(-6).map(function (m) {
      return { role: m.role, text: m.text };
    });
  }

  /** Append the provider's outcome to the conversation that asked for it. */
  function settle(convo, result) {
    state.pending = false;
    var now = Date.now();
    if (result && result.ok && result.text) {
      convo.messages.push({
        id: nextId("m"),
        role: "assistant",
        text: result.text,
        ts: now,
        code: null
      });
      state.lastFailed = null;
    } else if (result && result.ok) {
      // Empty response — surfaced honestly as an empty-state bubble.
      convo.messages.push({ id: nextId("m"), role: "assistant", text: "", ts: now, code: "empty" });
    } else {
      convo.messages.push({
        id: nextId("m"),
        role: "assistant",
        text: (result && result.message) || "The provider could not answer.",
        ts: now,
        code: "failed"
      });
    }
    while (convo.messages.length > CONFIG.maxMessagesPerConversation) convo.messages.shift();
    persist();
    emit("reply");
    return result;
  }

  function toFailure(message) {
    return { ok: false, code: "failed", message: message };
  }

  /**
   * Send a user message. Resolves (never rejects) with a result envelope:
   *   { ok, code: "ok"|"empty"|"invalid"|"busy"|"failed", text?, message? }
   * `context` is the view's attached context list (page- or drawer-derived).
   */
  function send(text, context) {
    var trimmed = String(text === null || text === undefined ? "" : text).trim();
    if (!trimmed) {
      return Promise.resolve({ ok: false, code: "invalid", message: "Type a message before sending." });
    }
    if (trimmed.length > CONFIG.maxMessageChars) {
      return Promise.resolve({
        ok: false,
        code: "invalid",
        message: "Message is limited to " + CONFIG.maxMessageChars + " characters."
      });
    }
    if (state.pending) {
      return Promise.resolve({ ok: false, code: "busy", message: "The assistant is still responding." });
    }

    var convo = ensureConversation(trimmed);
    convo.messages.push({ id: nextId("m"), role: "user", text: trimmed, ts: Date.now(), code: null });
    var ctx = Array.isArray(context) ? context.slice() : [];
    state.lastFailed = { text: trimmed, context: ctx };
    state.pending = true;
    persist();
    emit("user-message");

    return providerSend({ text: trimmed, mode: state.mode, context: ctx, conversationId: convo.id, history: recentHistory(convo) })
      .then(function (result) {
        return settle(convo, result);
      })
      ["catch"](function () {
        return settle(convo, toFailure("The chat provider failed unexpectedly. This is expected while no backend is deployed."));
      });
  }

  /**
   * Re-ask the provider for the last failed message without duplicating the
   * user's bubble. Returns null when there is nothing to retry.
   */
  function retry() {
    if (!state.lastFailed) return Promise.resolve(null);
    if (state.pending) {
      return Promise.resolve({ ok: false, code: "busy", message: "The assistant is still responding." });
    }
    var convo = getActiveConversation();
    if (!convo) return Promise.resolve(null);
    var failed = state.lastFailed;
    state.pending = true;
    emit("retry");

    return providerSend({
      text: failed.text,
      mode: state.mode,
      context: failed.context || [],
      conversationId: convo.id,
      history: recentHistory(convo),
      isRetry: true
    })
      .then(function (result) {
        return settle(convo, result);
      })
      ["catch"](function () {
        return settle(convo, toFailure("The chat provider failed unexpectedly. This is expected while no backend is deployed."));
      });
  }

  /* ---- Provider adapter ------------------------------------------------- */
  function providerSend(payload) {
    if (CONFIG.provider === "http") return httpSend(payload);
    return mockSend(payload);
  }

  /* FUTURE ADAPTER — unreachable while CONFIG.provider === "mock".
     Requires a served backend; file:// builds must keep provider "mock".
     Authentication belongs on the server; never put API keys in this file. */
  function httpSend(payload) {
    var url = (CONFIG.baseUrl || "") + CONFIG.endpoints.send;
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: payload.mode,
        message: payload.text,
        conversationId: payload.conversationId || null,
        context: (payload.context || []).map(function (c) {
          return { type: c.type, id: c.id || null };
        })
      })
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || typeof data.text !== "string" || !data.text.trim()) {
          return { ok: true, code: "empty", text: "" };
        }
        return { ok: true, code: "ok", text: String(data.text), meta: { provider: "http" } };
      })
      ["catch"](function () {
        return toFailure("The chat backend is not reachable. This is expected while no backend is deployed.");
      });
  }

  /* ---- Mock provider (scripted sample knowledge base) ------------------- */
  function delay(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function mockSend(payload) {
    var window_ = CONFIG.mockLatencyMs;
    var ms = window_[0] + Math.random() * (window_[1] - window_[0]);
    return delay(ms).then(function () {
      var text = payload.text;
      // Documented demo test hooks (see module header / README).
      // "/error" fails the first attempt; retrying it succeeds so the full
      // error → retry → recovery path can be exercised without a backend.
      if (/^\/error\b/i.test(text)) {
        if (!payload.isRetry) {
          return toFailure("Simulated provider failure (demo test hook: “/error”). Nothing was lost — use Retry to ask again.");
        }
        return {
          ok: true,
          code: "ok",
          text:
            "### Recovery confirmed\n" +
            "The previous failure was a **simulated transient error** (demo test hook `/error`). " +
            "Retry re-issued the same request through the normal submission flow and it succeeded.\n\n" +
            "With a real backend, the same button would re-call `POST /api/chat` with the original message and context."
        };
      }
      if (/^\/empty\b/i.test(text)) {
        return { ok: true, code: "empty", text: "" };
      }
      return { ok: true, code: "ok", text: composeReply(payload), meta: { provider: "mock", demo: true } };
    });
  }

  /* ---- Scripted knowledge base ------------------------------------------ */

  var DEMO_NOTE =
    "> Generated from the built-in demo knowledge base in `js/chat-service.js` — no AI model is connected.";

  var SOC_NOTE =
    "> **SOC Analyst mode** — the SOC backend is not connected yet, so this answer uses the demo knowledge base. Attach an incident or alert from a Mini-SOC page for labelled *demo-record* context.";

  var TACTIC_BLURBS = {
    "Initial Access":
      "Getting the first foothold: phishing links/attachments, exposed services, or credentials bought/reused from other breaches. Defences centre on phishing-resistant MFA, patching internet-facing systems and mail-gateway controls.",
    Execution:
      "Running attacker-controlled code on a host. In Windows environments this most often means Living-off-the-Land binaries — PowerShell, rundll32, mshta, wmic — so detections focus on suspicious process lineage and command-line arguments, not just file hashes.",
    "Defense Evasion":
      "Avoiding tools and controls: disabling or tampering with security products, clearing logs, obfuscating commands, abusing signed system utilities. Behavioural detections and tamper alerts matter more than static indicators here.",
    Persistence:
      "Keeping access across restarts and credential changes: rogue accounts, new services, scheduled tasks, registry run keys or implants on legitimate channels. Hunt for 'new and rare' rather than 'known bad'.",
    "Credential Access":
      "Stealing logons: LSASS memory dumping, Kerberoasting, password spraying, credential stuffing. High-value signals are unusual access to authentication material and failure bursts followed by success.",
    Discovery:
      "Mapping the environment: which users, shares, services and hosts exist. Noisy on its own, but in sequence it telegraphs lateral movement — correlate with the account's normal scope.",
    "Lateral Movement":
      "Moving between systems with remote services: SMB/admin shares, RDP, WinRM, remote execution. Look for east-west traffic that normal users never generate and for token reuse across hosts.",
    Collection:
      "Gathering the target data, often staged into archives before exfiltration. Large archives created outside backup windows are a classic tell.",
    "Command and Control":
      "Maintaining a channel to handlers — HTTPS beacons with regular cadence, DNS tunnelling, uncommon ports. Regular beacon intervals and rare destination ASNs are strong hunting filters.",
    Impact:
      "The objective stage: data encrypted for ransom, backups inhibited (shadow-copy deletion), service disruption. Early precursor activity is where prevention still pays off."
  };

  function techLookup(id) {
    try {
      return SOC.services.getTechnique(id) || null;
    } catch (e) {
      return null;
    }
  }

  function replyTechnique(tech) {
    var blurb = TACTIC_BLURBS[tech.tactic] || "Part of the MITRE ATT&CK knowledge base used by this demo workspace.";
    return (
      "### " + tech.id + " — " + tech.name + "\n" +
      "- **Tactic:** " + tech.tactic + "\n" +
      "- **Source:** MITRE ATT&CK reference present in the local demo dataset\n\n" +
      "### What it means\n" + blurb + "\n\n" +
      "### Where to look in a SOC\n" +
      "- **Telemetry:** the raw source that would reveal it (process command lines, authentication events, network flows).\n" +
      "- **Correlation:** this technique rarely happens alone — check the events before and after on the timeline.\n" +
      "- **Coverage:** ask whether your detections would catch it in the first place (ATT&CK-mapped coverage).\n\n" +
      "> Demo dataset lookup — a connected backend could add live sightings and Intel context."
    );
  }

  function replyIncident(id) {
    var inc = null;
    try {
      inc = SOC.services.getIncident(id);
    } catch (e) {
      inc = null;
    }
    if (!inc) {
      return (
        "I can't find an incident with id **" + id + "** in the local demo dataset, so there is nothing to summarise for it.\n\n" +
        "- Open a real record from the **Incidents** page and attach it as context, or\n" +
        "- Try a demo id such as `INC-2026-1039`.\n\n" +
        "> No incident data was invented. Once the backend is connected, live records would flow in via `GET /api/incidents/:id` + `POST /api/chat`."
      );
    }
    var techLines = (inc.techniques || []).slice(0, 5).map(function (tid) {
      var t = techLookup(tid);
      return "- `" + tid + "` " + (t ? t.name + " (" + t.tactic + ")" : "");
    });
    return (
      "### Incident " + inc.id + " — demo record\n" +
      "- **Title:** " + inc.title + "\n" +
      "- **Severity:** " + inc.severity + " · **Status:** " + inc.status + " · **Risk score:** " + inc.riskScore + "\n" +
      "- **Priority:** " + inc.priority + " · **Owner:** " + inc.owner + "\n" +
      "- **Affected assets:** " + (inc.assetIds ? inc.assetIds.length : 0) + " (" + (inc.assetIds || []).slice(0, 4).join(", ") + ")\n" +
      (techLines.length ? "- **ATT&CK techniques:**\n" + techLines.join("\n") + "\n" : "") +
      "\n### Why it is flagged (demo summary)\n" + (inc.summary || "No summary recorded.") + "\n\n" +
      "### Suggested next steps\n" +
      "1. Walk the **evidence and timeline** tabs in the Investigation workspace — check that the story is complete, not just plausible.\n" +
      "2. Validate **scope**: any asset or account in the blast radius not yet covered?\n" +
      "3. Review **containment** in the response workflow and record the decisions.\n\n" +
      "> Read from the **local demo dataset** — not a live system. A connected backend would let me analyse real records via `POST /api/chat`."
    );
  }

  function replyIncidentDigest() {
    var incidents = [];
    try {
      incidents = SOC.services.listIncidents() || [];
    } catch (e) {
      incidents = [];
    }
    if (!incidents.length) {
      return "The demo dataset contains no incidents right now.";
    }
    var byStatus = {};
    var bySev = {};
    incidents.forEach(function (i) {
      byStatus[i.status] = (byStatus[i.status] || 0) + 1;
      bySev[i.severity] = (bySev[i.severity] || 0) + 1;
    });
    var statusLines = Object.keys(byStatus).map(function (k) {
      return "- **" + k + "** — " + byStatus[k];
    });
    var sevLines = Object.keys(bySev).map(function (k) {
      return "- **" + k + "** — " + bySev[k];
    });
    var top = incidents.slice().sort(function (a, b) {
      return b.riskScore - a.riskScore;
    }).slice(0, 3);
    var topLines = top.map(function (i) {
      return "- `" + i.id + "` **" + i.severity + "** — " + i.title + " (" + i.status + ", risk " + i.riskScore + ")";
    });
    return (
      "### Incident digest — demo dataset (" + incidents.length + " sample incidents)\n\n" +
      "**By status**\n" + statusLines.join("\n") + "\n\n" +
      "**By severity**\n" + sevLines.join("\n") + "\n\n" +
      "**Highest risk right now**\n" + topLines.join("\n") + "\n\n" +
      "### What stands out\n" +
      "Critical incidents cluster around credential access followed by lateral movement — the usual ransomware precursor pattern. Prioritise identity containment first; it tends to cut off every other path.\n\n" +
      "> Aggregated from the **local demo dataset** (`SOC.services.listIncidents`), not live telemetry. Attach a specific incident (e.g. via `?incident=`) for a focused summary."
    );
  }

  var REPLIES = {
    connection: function () {
      return (
        "### About this assistant\n" +
        "I'm the **Mini-SOC demo assistant**. In this build:\n\n" +
        "- **No AI model or LLM is connected** — every reply comes from a scripted sample knowledge base in `js/chat-service.js`.\n" +
        "- No backend, telemetry, analytics or API keys are involved; everything runs locally in your browser.\n" +
        "- In **SOC Analyst** mode I can quote *demo records* that genuinely exist in the sample dataset (clearly labelled), but I cannot see live logs or your real environment.\n\n" +
        "When a backend exists, this widget will call `POST /api/chat` and the header status chip will show the **verified** provider — until then it reads *Demo provider · no live model*."
      );
    },
    capabilities: function (mode) {
      return (
        "### What I can help with (demo knowledge base)\n" +
        "- Security fundamentals and terminology — phishing, ransomware, MITRE ATT&CK, MFA, zero trust…\n" +
        "- Alert and event explanation — how to triage, what evidence matters, false-positive reasoning.\n" +
        "- Threat hunting concepts — hypotheses, query design, promoting hunts into detections.\n" +
        "- Investigation methodology and defensive best-practice recommendations.\n\n" +
        "### SOC Analyst mode\n" +
        "Adds **workspace context** from Mini-SOC pages: I can summarise an attached incident from the demo dataset and reason about its evidence chain. Live analysis requires the backend integration (`POST /api/chat`), which is **not connected yet** — the UI says so rather than faking it.\n\n" +
        (mode === "soc" ? SOC_NOTE : DEMO_NOTE)
      );
    },
    logins: function () {
      return (
        "### Investigating suspicious sign-ins\n" +
        "1. **Establish the baseline** — the account's usual locations, ASNs, devices and working hours.\n" +
        "2. **Correlate failures with success** — a successful login right after a failure burst is the classic credential-stuffing-then-access pattern.\n" +
        "3. **Check MFA** — was a challenge issued and passed? `mfa=not-challenged` on a new device is a red flag.\n" +
        "4. **Validate the session** — new device fingerprint, impossible travel, mailbox rules or forwards created right after sign-in.\n" +
        "5. **Contain through the workflow** — session revoke, password reset, conditional-access block via the response approval flow; never straight from chat.\n\n" +
        "```text\n" +
        "Hunt query ideas (Mini-SOC demo query syntax):\n" +
        "user:j.chen status:401\n" +
        "user:j.chen asn:204745\n" +
        "```\n\n" +
        "> Methodology from the demo knowledge base. In this workspace, INC-2026-1042 is a demo incident following exactly this pattern — attach it in SOC Analyst mode to have me walk its record."
      );
    },
    alert: function () {
      return (
        "### Triaging an alert — five questions\n" +
        "1. **What fired?** Detection name, data source (EDR / identity / network) and the raw evidence fields behind it.\n" +
        "2. **Is it accurate?** Does the evidence actually satisfy the rule logic? Could a legitimate admin action look identical?\n" +
        "3. **What is the scope?** One host or many? First vs latest occurrence — is this the tip or the tail?\n" +
        "4. **What is the blast radius?** Asset criticality, account privileges, data touched.\n" +
        "5. **What next?** Close as false positive *with reasoning*, or escalate to an incident with the evidence attached.\n\n" +
        "In this demo, open an alert on the **Security Events** page, inspect its drawer, and follow the link to its incident. In **SOC Analyst** mode you can attach an alert (`?event=EVT-…`) and I'll explain the attached record.\n\n" +
        DEMO_NOTE
      );
    },
    mitre: function () {
      return (
        "### MITRE ATT&CK in two minutes\n" +
        "A public knowledge base of the **techniques** adversaries use, grouped by **tactics** — the *why* of each action: Initial Access, Execution, Credential Access, Lateral Movement, Command and Control, Impact and so on.\n\n" +
        "Why SOC teams use it:\n" +
        "- a **shared vocabulary** for detections, reports and threat intel.\n" +
        "- **Coverage mapping** — which tactics have no detection at all yet.\n" +
        "- **Hunt hypotheses** — \"if technique T1059 occurs here, what process lineage should my logs show?\"\n\n" +
        "Ask me about a specific technique id — for example **T1003**, **T1059.001** or **T1486**. The demo dataset carries ATT&CK references for every incident, and I can explain any of them.\n\n" +
        DEMO_NOTE
      );
    },
    hunting: function () {
      return (
        "### The hunting loop\n" +
        "1. **Hypothesis** — e.g. \"an attacker with a valid password shows spray-like failure bursts from rare ASNs\".\n" +
        "2. **Data** — authentication logs, EDR telemetry, network flows.\n" +
        "3. **Query** — start broad, then narrow by field, count and time. The **Threat Hunting** page runs such queries against the local demo dataset (`field:value` syntax plus free text).\n" +
        "4. **Result** — nothing means refine or park the hypothesis; leads become evidence on an incident.\n" +
        "5. **Detection** — promote the validated hunt into an automated rule so it runs without you.\n\n" +
        "Good hypotheses come from ATT&CK techniques your current detections do **not** cover.\n\n" +
        DEMO_NOTE
      );
    },
    investigation: function () {
      return (
        "### A practical investigation workflow\n" +
        "1. **Triage** — confirm the alert is real and capture exactly what triggered it.\n" +
        "2. **Scope** — which assets, accounts and time range; pivot on observables (IP, hash, user, hostname).\n" +
        "3. **Timeline** — order the events. An intrusion must tell a coherent story: execution → credential access → lateral movement → objective. Gaps mean missing evidence or a wrong hypothesis.\n" +
        "4. **Evidence handling** — save artefacts and links; mark each conclusion as observed fact vs inference.\n" +
        "5. **Contain & report** — containment through the approval workflow; the report reconstructs who/what/when/how for the audience.\n\n" +
        "In Mini-SOC: the **Investigation** workspace gives evidence + timeline per incident; **Incident Response** models approvals. Both run on demo data.\n\n" +
        DEMO_NOTE
      );
    },
    response: function () {
      return (
        "### Containment → eradication → recovery\n" +
        "- **Contain fast, but evidence-safe** — isolate the host *before* mass password resets; capture volatile evidence (sessions, memory) when business impact allows.\n" +
        "- **Eradicate the root cause** — persistence, rogue accounts, exposed credentials — not just the visible symptom.\n" +
        "- **Recover carefully** — restore from known-good backups and watch the recovered asset for re-detection.\n" +
        "- **Learn** — every detection gap becomes a new hunt or rule; the final timeline becomes the report.\n\n" +
        "The **Incident Response** page models this with a human approval workflow — approving a simulated action only records a decision in this browser; nothing is executed.\n\n" +
        DEMO_NOTE
      );
    },
    phishing: function () {
      return (
        "### Phishing — what actually matters\n" +
        "**Objective:** steal credentials or gain initial access via links, attachments, or MFA-fatigue prompts.\n\n" +
        "**Triaging a reported mail:**\n" +
        "- inspect full headers and the true link destination (not the display text),\n" +
        "- detonate attachments in a sandbox before opening anywhere,\n" +
        "- check identity/app logs: was the link *visited*, and did anything sign in right after?\n\n" +
        "**High-value detections:** impossible travel after a click, newly created inbox rules or forwards, token replay without an MFA challenge.\n\n" +
        "**Reducing impact:** phishing-resistant MFA (FIDO2/passkeys) defeats credential replay far better than one-time codes; a visible report button shortens dwell time dramatically.\n\n" +
        DEMO_NOTE
      );
    },
    ransomware: function () {
      return (
        "### Ransomware — the modern kill chain\n" +
        "Access is usually bought or reused (credential stuffing, exposed services, phishing) rather than 'hacked'. Then: **lateral movement → credential theft → backup tampering → mass encryption / extortion**.\n\n" +
        "**Highest-value signals *before* encryption:**\n" +
        "- shadow-copy deletion (`vssadmin delete shadows`) and backup-service tampering,\n" +
        "- mass file renames or large archives created outside backup windows,\n" +
        "- new services/scheduled tasks and admin-share write bursts,\n" +
        "- credential-dumping tooling touching LSASS.\n\n" +
        "**Preparation that pays:** immutable/offline backups *with tested restores*, server segmentation, least privilege on admin shares.\n\n" +
        "> In the demo workspace, incident `INC-2026-1039` walks this exact precursor pattern — attach it in SOC Analyst mode and I'll summarise its demo record."
      );
    },
    malware: function () {
      return (
        "### Malware triage basics\n" +
        "1. **Contain first** — isolate the host before deep analysis when impact is high.\n" +
        "2. **Hash & reputation** — sha256 against intelligence sources (offline demo here).\n" +
        "3. **Static pass** — signature, strings, packer, import table.\n" +
        "4. **Dynamic pass** — sandbox behaviour: network beacons, persistence mechanisms, dropped files, process injections.\n" +
        "5. **Trace scope** — where else did this hash or process family appear?\n\n" +
        "In this demo the EDR events carry verdicts — filter the **Security Events** page by `type:Malware` to see the sample set.\n\n" +
        DEMO_NOTE
      );
    },
    defense: function () {
      return (
        "### Defensive priorities that pay off\n" +
        "1. **Phishing-resistant MFA** (FIDO2/passkeys) on all privileged and remote access.\n" +
        "2. **EDR everywhere** with tuned detections for living-off-the-land binaries (PowerShell, rundll32, wmic, vssadmin).\n" +
        "3. **Least privilege & tiering** — no daily-driver admin accounts; dedicated admin workstations; backups treated as crown jewels.\n" +
        "4. **Patch the exposure** — internet-facing services first (RDP, VPN gateways, web apps).\n" +
        "5. **Test recovery** — rehearsed restores beat assumed backups.\n" +
        "6. **Detection engineering** — map coverage to ATT&CK, hunt the blank spots, and promote every validated hunt into a rule.\n\n" +
        DEMO_NOTE
      );
    },
    greeting: function (mode) {
      return (
        "Hello, analyst. I'm the **Mini-SOC demo assistant** — scripted sample replies, no model connected.\n\n" +
        "- **General Assistant** mode: concepts, alert explanation, hunting and investigation methodology.\n" +
        "- **SOC Analyst** mode: workspace context from your pages (attach an incident or alert); demo records only until the backend is connected.\n\n" +
        "Try \"Explain a MITRE ATT&CK technique\", or switch to SOC Analyst mode and attach an incident for a demo-record summary." +
        (mode === "soc" ? "\n\n" + SOC_NOTE : "")
      );
    },
    thanks: function () {
      return (
        "Happy to help. Reminder: everything here — data and replies — runs on the **demo dataset** in your browser. " +
        "Treat my answers as training material, not production analysis."
      );
    },
    fallback: function (mode) {
      return (
        "I don't have a scripted answer for that in this demo build — my replies come from a fixed sample knowledge base, not a real language model.\n\n" +
        "Things I *can* talk about:\n" +
        "- \"Explain this security alert\" or \"Investigate suspicious login attempts\"\n" +
        "- \"Summarize recent incidents\" (SOC Analyst mode — real demo aggregates)\n" +
        "- \"Explain a MITRE ATT&CK technique\" — e.g. T1003, T1486\n" +
        "- phishing, ransomware, malware triage, hunting, defensive practices\n\n" +
        "For the future backend integration, see README → *AI Assistant integration*." +
        (mode === "soc" ? "\n\n" + SOC_NOTE : "")
      );
    }
  };

  /** Decide which scripted reply fits the message. Never invents data. */
  function composeReply(payload) {
    var msg = payload.text.toLowerCase();
    var mode = payload.mode;
    var ctx = payload.context || [];

    // Connection / honesty questions first.
    if (/(are you (a )?(real|human)|connected|which model|what model|gpt|llm|chatgpt|openai|backend|api key|do you use ai)/.test(msg)) {
      return REPLIES.connection();
    }
    // Capabilities.
    if (/(what can you|help me with|capabilit|what do you know|options|commands)/.test(msg)) {
      return REPLIES.capabilities(mode);
    }
    // Specific technique id (e.g. T1003, T1059.001).
    var techMatch = payload.text.match(/\bT\d{4}(?:\.\d{3})?\b/i);
    if (techMatch) {
      var tech = techLookup(techMatch[0].toUpperCase());
      if (tech) return replyTechnique(tech);
    }
    // Attached incident record (SOC mode) — quote the real demo record only.
    var incCtx = null;
    for (var i = 0; i < ctx.length; i++) {
      if (ctx[i].type === "incident") incCtx = ctx[i];
    }
    if (incCtx && /(explain|summari|investigat|why|analy|suspicious|detail|walk|tell|status|evidence)/.test(msg)) {
      return replyIncident(incCtx.id);
    }
    // Incident digest across the demo dataset (SOC mode only — it reads workspace data).
    if (mode === "soc" && /(summari|digest|overview|how many|status of).{0,40}incident|incident.{0,30}(summari|digest|overview)/.test(msg)) {
      return replyIncidentDigest();
    }
    if (/(login|logon|sign-?in|sign on|credential stuff|brute|password spray|spraying|kerberoast|sso)/.test(msg)) {
      return REPLIES.logins();
    }
    if (/(alert|detection|false positive|triage this event|security event)/.test(msg)) {
      return REPLIES.alert();
    }
    if (/(mitre|att&?ck|attack technique|technique)/.test(msg)) {
      return REPLIES.mitre();
    }
    if (/(hunt|hypoth|sigma)/.test(msg)) {
      return REPLIES.hunting();
    }
    if (/(investigat|methodolog|workflow|incident process|how do i investigate)/.test(msg)) {
      return REPLIES.investigation();
    }
    if (/(contain|eradicat|remediat|recover|response plan|playbook|respond to)/.test(msg)) {
      return REPLIES.response();
    }
    if (/(phish)/.test(msg)) {
      return REPLIES.phishing();
    }
    if (/(ransom)/.test(msg)) {
      return REPLIES.ransomware();
    }
    if (/(malware|virus|trojan|ransomware sample)/.test(msg)) {
      return REPLIES.malware();
    }
    if (/(defen|hardening|best practice|hardening|zero trust|mfa|backup|priorit)/.test(msg)) {
      return REPLIES.defense();
    }
    if (/^(hi|hello|hey|yo|hiya|good (morning|afternoon|evening)|howdy)\b/.test(msg)) {
      return REPLIES.greeting(mode);
    }
    if (/(thank|thanks|cheers|appreciate)/.test(msg)) {
      return REPLIES.thanks();
    }
    return REPLIES.fallback(mode);
  }

  /* ---- Boot ------------------------------------------------------------- */
  state.mode = SOC.prefs.get("chatMode", "general") === "soc" ? "soc" : "general";
  load();

  /* ---- Public API ------------------------------------------------------- */
  SOC.chat = {
    CONFIG: CONFIG,
    NEW: NEW,
    getState: function () {
      return state;
    },
    getMode: getMode,
    setMode: setMode,
    isPending: function () {
      return state.pending;
    },
    listConversations: listConversations,
    getActiveConversation: getActiveConversation,
    newConversation: newConversation,
    selectConversation: selectConversation,
    deleteConversation: deleteConversation,
    send: send,
    retry: retry,
    subscribe: subscribe
  };
})();
