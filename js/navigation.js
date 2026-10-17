/* ==========================================================================
   Mini-SOC · navigation.js — shared application shell (sidebar + topbar)
   Rendered once per page from a single source of truth: no duplicated
   markup across the ten pages.
   ========================================================================== */
(function () {
  "use strict";
  window.SOC = window.SOC || {};
  var util = SOC.util;
  var icon = SOC.ui.icon;
  var el = util.el;

  var NAV = [
    { group: "Monitor", items: [
      { id: "overview", label: "Overview", href: "index.html", icon: "overview" },
      { id: "events", label: "Security Events", href: "events.html", icon: "events" },
      { id: "incidents", label: "Incidents", href: "incidents.html", icon: "shield", badge: "open" },
      { id: "attack-graph", label: "Attack Graph", href: "attack-graph.html", icon: "network" }
    ] },
    { group: "Investigate", items: [
      { id: "ai-assistant", label: "AI Assistant", href: "ai-assistant.html", icon: "chat" },
      { id: "ai-analyst", label: "AI Analyst", href: "ai-analyst.html", icon: "ai" },
      { id: "threat-hunting", label: "Threat Hunting", href: "threat-hunting.html", icon: "hunting" },
      { id: "deception", label: "Cyber Deception", href: "deception.html", icon: "decoy" },
      { id: "incident-response", label: "Incident Response", href: "incident-response.html", icon: "response" }
    ] },
    { group: "Manage", items: [
      { id: "reports", label: "Reports", href: "reports.html", icon: "reports" },
      { id: "settings", label: "Settings", href: "settings.html", icon: "settings" }
    ] }
  ];

  /* Pages that belong to a parent section (breadcrumb/active-state mapping) */
  var SECTION_OF = { investigation: "incidents" };

  function root() {
    return document.body.dataset.root || ".";
  }

  /** Resolve a bare page href against the current document's depth. */
  function resolve(href) {
    var base = root();
    if (href.indexOf("http") === 0 || href.charAt(0) === "#") return href;
    var bare = href.replace(/^\.?\//, "");
    if (bare.indexOf("pages/") === 0) return base + "/" + bare;
    if (base === ".") return bare === "index.html" ? "index.html" : "pages/" + bare;
    return bare === "index.html" ? "../index.html" : bare;
  }

  function currentPageId() {
    var id = document.body.dataset.page || "overview";
    return SECTION_OF[id] || id;
  }

  /* ======================================================================
     Shell markup
     ====================================================================== */
  function renderShell() {
    var pageId = currentPageId();
    var pageKey = document.body.dataset.page;
    var host = document.getElementById("app-shell");
    if (!host) return;

    var openIncidents = SOC.services.incidentStatusCounts().open;
    var unread = SOC.services.unreadCount();

    /* ---- Sidebar ---- */
    var sidebar = el("aside", { class: "sidebar", id: "sidebar", "aria-label": "Primary" });
    sidebar.appendChild(
      el("a", { class: "brand", href: resolve("index.html") },
        el("span", { class: "brand-logo", html: icon("shield"), "aria-hidden": "true" }),
        el("span", { class: "brand-text" },
          el("span", { class: "brand-name", text: "Mini-SOC" }),
          el("span", { class: "brand-tag", text: "Threat hunting · IR" })
        )
      )
    );

    /* One hue per destination — cycles the shared glass tones down the whole
       sidebar (across groups, not restarting per group) so no two neighbouring
       links share a colour. */
    var TONES = ["tone-blue", "tone-violet", "tone-teal", "tone-amber", "tone-rose", "tone-indigo"];
    var toneIndex = 0;

    NAV.forEach(function (group) {
      var section = el("nav", { class: "nav-group", "aria-label": group.group });
      section.appendChild(el("div", { class: "nav-label", text: group.group }));
      var list = el("ul", { class: "nav-list" });
      group.items.forEach(function (item) {
        var active = item.id === pageId;
        var badgeValue = item.badge === "open" && openIncidents > 0 ? String(openIncidents) : null;
        var tone = TONES[toneIndex % TONES.length];
        toneIndex += 1;
        var link = el("a", {
          class: "nav-link " + tone + (active ? " is-active" : ""),
          href: resolve(item.href),
          html: icon(item.icon) + "<span>" + util.esc(item.label) + "</span>"
        });
        if (active) link.setAttribute("aria-current", "page");
        if (badgeValue) {
          link.appendChild(
            el("span", { class: "nav-badge", text: badgeValue, title: openIncidents + " open incidents" })
          );
        }
        list.appendChild(el("li", {}, link));
      });
      section.appendChild(list);
      sidebar.appendChild(section);
    });

    sidebar.appendChild(
      el("div", { class: "sidebar-foot" },
        el("div", { class: "env-chip", title: SOC.demo.env.claimNote },
          el("span", { html: icon("warning") }),
          el("span", { text: "Demo · sample data" })
        ),
        el("button", {
          class: "collapse-btn",
          type: "button",
          "data-sidebar-toggle": "",
          "aria-label": "Collapse sidebar",
          html: icon("chevron-left") + "<span>Collapse sidebar</span>"
        })
      )
    );

    /* ---- Topbar ---- */
    var searchInputId = "global-search-input";
    var topbar = el("header", { class: "topbar" });

    topbar.appendChild(
      el("button", {
        class: "icon-btn menu-btn",
        type: "button",
        "aria-label": "Open navigation menu",
        "aria-controls": "sidebar",
        "aria-expanded": "false",
        html: icon("menu"),
        onclick: toggleDrawer
      })
    );

    var pageMeta = pageTitle(pageKey);
    topbar.appendChild(
      el("nav", { class: "breadcrumb", "aria-label": "Breadcrumb" },
        el("span", { class: "crumb-root", text: "Mini-SOC" }),
        el("span", { class: "crumb-sep", html: icon("chevron-right") }),
        el("span", { class: "crumb-current", text: pageMeta.title })
      )
    );

    var searchWrap = el("div", { class: "global-search" },
      el("span", { class: "ico-search", html: icon("search"), "aria-hidden": "true" }),
      el("input", {
        id: searchInputId,
        type: "search",
        placeholder: "Search incidents, events, assets…",
        "aria-label": "Global search",
        autocomplete: "off",
        onkeydown: function (event) {
          if (event.key === "Enter") {
            event.preventDefault();
            openSearch(event.target.value);
          }
          if (event.key === "ArrowDown" || event.key === "Tab") {
            /* allow the dialog to take over */
          }
        },
        onfocus: function (event) {
          if (suppressFocusOpen) return; /* closing just restored focus here */
          if (event.target.value.length >= 2) openSearch(event.target.value);
          else openSearch("");
        }
      }),
      el("span", { class: "kbd-hint", html: "<kbd>Ctrl</kbd><kbd>K</kbd>" })
    );
    topbar.appendChild(searchWrap);

    var actions = el("div", { class: "topbar-actions" });

    /* AI assistant drawer — contextual chat available on every page.
       Guarded: the button only appears when the chat modules loaded. */
    if (SOC.chatUI && SOC.chatUI.openDrawer) {
      actions.appendChild(
        el("button", {
          class: "icon-btn",
          type: "button",
          "aria-label": "Open AI assistant",
          "aria-haspopup": "dialog",
          html: icon("chat"),
          onclick: function () {
            SOC.chatUI.openDrawer();
          }
        })
      );
    }

    /* notifications */
    var notifBtn = el("button", {
      class: "icon-btn",
      type: "button",
      "aria-label": "Notifications (" + unread + " unread)",
      "aria-haspopup": "true",
      "aria-expanded": "false",
      html: icon("bell") + (unread ? '<span class="unread-dot">' + unread + "</span>" : ""),
      onclick: function () {
        togglePopover(notifHost, renderNotifications());
      }
    });
    var notifHost = el("div", { class: "popover-host" }, notifBtn);

    /* theme */
    actions.appendChild(
      el("button", {
        class: "icon-btn",
        type: "button",
        "data-theme-toggle": "",
        html: '<span data-theme-icon>' + icon("moon") + "</span>"
      })
    );
    actions.appendChild(notifHost);

    /* profile */
    var profileBtn = el("button", {
      class: "profile-btn",
      type: "button",
      "aria-haspopup": "true",
      "aria-expanded": "false",
      /* name kept for narrow viewports where .profile-meta is hidden, and it
         contains every visible label text run (avatar initials included) */
      "aria-label": "DA Demo Analyst SOC operator · demo — account menu"
    },
      el("span", { class: "avatar", text: "DA", "aria-hidden": "true" }),
      el("span", { class: "profile-meta" },
        el("span", { class: "profile-name", text: "Demo Analyst" }),
        el("span", { class: "profile-role", text: "SOC operator · demo" })
      ),
      el("span", { html: icon("chevron-down"), "aria-hidden": "true", style: "display:flex;color:var(--text-3)" })
    );
    var profileHost = el("div", { class: "popover-host" }, profileBtn);
    profileBtn.addEventListener("click", function () {
      togglePopover(profileHost, renderProfileMenu());
    });
    actions.appendChild(profileHost);

    topbar.appendChild(actions);

    host.appendChild(sidebar);
    host.appendChild(el("div", { class: "sidebar-overlay", "aria-hidden": "true", onclick: closeDrawer }));
    host.appendChild(topbar);

    wireShortcuts();
    wirePopoverDismiss();
    SOC.theme.init();
    SOC.util.on("notifications:change", function () {
      refreshNotificationButton();
    });
  }

  function pageTitle(pageKey) {
    var map = {
      overview: { title: "Overview", desc: "Security posture across the demo environment." },
      events: { title: "Security Events", desc: "Search, filter and inspect the sample event stream." },
      incidents: { title: "Incidents", desc: "Triage, assign and track incident work." },
      investigation: { title: "Incident Investigation", desc: "Evidence, timeline and context for one incident." },
      "attack-graph": { title: "Attack Graph", desc: "Explore entities, relationships and the sample attack path." },
      "ai-assistant": { title: "AI Assistant", desc: "Demo cybersecurity chat — scripted sample replies, no model connected." },
      "ai-analyst": { title: "AI Security Analyst", desc: "Evidence-grounded sample analysis with explicit uncertainty." },
      "threat-hunting": { title: "Threat Hunting", desc: "Run queries against the local sample dataset." },
      deception: { title: "Cyber Deception", desc: "Simulated honeypots, decoys and triggered alerts." },
      "incident-response": { title: "Incident Response & Risk", desc: "Risk factors, recommendations and approval workflow." },
      reports: { title: "Reports", desc: "Sample summaries with print and CSV export." },
      settings: { title: "Settings", desc: "Theme, motion and demo environment information." }
    };
    return map[pageKey] || { title: "Mini-SOC", desc: "" };
  }

  /* ======================================================================
     Popovers
     ====================================================================== */
  var openHost = null;

  function togglePopover(host, content) {
    var existing = host.querySelector(".popover");
    closePopover();
    if (existing) return; /* second click closes */
    var popover = el("div", { class: "popover", role: "menu" });
    popover.appendChild(content);
    host.appendChild(popover);
    host.querySelector("button").setAttribute("aria-expanded", "true");
    openHost = host;
    var focusable = popover.querySelector("button, a");
    if (focusable) focusable.focus();
  }

  function closePopover() {
    if (!openHost) return;
    var popover = openHost.querySelector(".popover");
    if (popover) popover.parentNode.removeChild(popover);
    var trigger = openHost.querySelector("button");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    openHost = null;
  }

  function wirePopoverDismiss() {
    document.addEventListener("click", function (event) {
      if (openHost && !openHost.contains(event.target)) closePopover();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        if (openHost) {
          closePopover();
          return;
        }
        if (document.body.classList.contains("nav-open")) closeDrawer();
      }
    });
  }

  function renderNotifications() {
    var wrap = document.createDocumentFragment();
    var head = el("div", { class: "popover-head" },
      el("strong", { class: "small", text: "Notifications" }),
      el("button", {
        class: "btn btn-ghost btn-sm",
        type: "button",
        text: "Mark all read",
        onclick: function () {
          SOC.services.markAllNotificationsRead();
          closePopover();
          SOC.ui.toast("All notifications marked as read.", { tone: "success" });
        }
      })
    );
    wrap.appendChild(head);

    var body = el("div", { class: "popover-body" });
    var items = SOC.services.getNotifications();
    if (!items.length) {
      body.innerHTML = SOC.ui.emptyState({
        icon: "bell",
        title: "You are all caught up",
        desc: "New demo alerts will appear here as incidents change state."
      });
    } else {
      items.forEach(function (item) {
        var row = el("div", { class: "notif-item" + (item.read ? "" : " is-unread") },
          el("span", { class: "tl-dot", style: "--tl-color:var(--sev-" + (item.tone === "info" ? "info" : item.tone) + ")" }),
          el("div", { class: "n-body" },
            el("div", { class: "row between" },
              el("span", { class: "n-title", text: item.title }),
              el("span", { class: "n-time", text: util.relTime(item.ts) })
            ),
            el("div", { class: "n-desc", text: item.desc }),
            el("a", {
              class: "xsmall",
              href: resolve(item.link),
              text: "Open →"
            })
          ),
          el("button", {
            class: "notif-dismiss",
            type: "button",
            "aria-label": "Dismiss " + item.title,
            html: icon("close"),
            onclick: function () {
              SOC.services.dismissNotification(item.id);
              closePopover();
            }
          })
        );
        body.appendChild(row);
      });
    }
    wrap.appendChild(body);
    return wrap;
  }

  function refreshNotificationButton() {
    var host = document.querySelector(".topbar .popover-host");
    if (!host) return;
    var unread = SOC.services.unreadCount();
    var btn = host.querySelector(".icon-btn");
    if (!btn) return;
    btn.setAttribute("aria-label", "Notifications (" + unread + " unread)");
    var dot = btn.querySelector(".unread-dot");
    if (unread && !dot) {
      btn.appendChild(el("span", { class: "unread-dot", text: String(unread) }));
    } else if (unread && dot) {
      dot.textContent = String(unread);
    } else if (!unread && dot) {
      dot.parentNode.removeChild(dot);
    }
  }

  function renderProfileMenu() {
    var wrap = document.createDocumentFragment();
    wrap.appendChild(
      el("div", { class: "popover-head" },
        el("div", {},
          el("div", { class: "small strong", text: "Demo Analyst" }),
          el("div", { class: "xsmall subtle", text: "SOC operator · demo identity" })
        )
      )
    );
    var body = el("div", { class: "menu-list" });
    body.appendChild(
      el("a", {
        class: "menu-item",
        href: resolve("settings.html"),
        html: icon("settings") + "<span>Preferences &amp; demo info</span>"
      })
    );
    body.appendChild(
      el("button", {
        class: "menu-item",
        type: "button",
        html: icon("keyboard") + "<span>Keyboard shortcuts</span>",
        onclick: function () {
          closePopover();
          openShortcuts();
        }
      })
    );
    body.appendChild(el("div", { class: "menu-sep" }));
    body.appendChild(
      el("button", {
        class: "menu-item",
        type: "button",
        html: icon("lock") + "<span>Sign out</span>",
        onclick: function () {
          closePopover();
          SOC.ui.toast("Demo environment", {
            tone: "warning",
            desc: "Authentication is not part of this frontend demo, so sign-out is disabled."
          });
        }
      })
    );
    body.appendChild(
      el("div", { class: "menu-note", text: "Identity and permissions are illustrative only." })
    );
    wrap.appendChild(body);
    return wrap;
  }

  /* ======================================================================
     Global search dialog
     ====================================================================== */
  var searchPanel = null;
  /* True while closeSearch() is running: closeOverlay() restores focus to the
     topbar input, which would otherwise reopen the dialog via its onfocus. */
  var suppressFocusOpen = false;

  function closeSearch() {
    suppressFocusOpen = true;
    searchPanel = null;
    SOC.ui.closeOverlay();
    var topbarInput = document.getElementById("global-search-input");
    if (topbarInput && document.activeElement === topbarInput) topbarInput.blur();
    suppressFocusOpen = false;
  }

  function openSearch(initialQuery) {
    /* Reuse the panel only while it is still attached; a panel closed via
       closeOverlay() (footer button) is detached without onClose firing. */
    if (searchPanel && searchPanel.isConnected) {
      var existing = searchPanel.querySelector("#search-dialog-input");
      if (existing && initialQuery) existing.value = initialQuery;
      return;
    }
    searchPanel = null;
    var resultsBox = el("div", { class: "result-list", role: "listbox", "aria-label": "Search results" });
    var info = el("p", { class: "xsmall subtle", text: "Type at least two characters. Try an incident ID, host name or technique." });
    var input = el("input", {
      id: "search-dialog-input",
      class: "input",
      type: "search",
      placeholder: "Search incidents, events, assets, ATT&CK techniques…",
      "aria-label": "Search the demo workspace",
      autocomplete: "off",
      value: initialQuery || "",
      oninput: util.debounce(function (event) {
        renderResults(event.target.value);
      }, 90)
    });

    var body = el("div", { class: "stack" }, el("label", { class: "field-label", for: "search-dialog-input", text: "Search" }), input, info, resultsBox);

    var panel = SOC.ui.openDialog({
      title: "Search the demo workspace",
      body: body,
      footer: el("div", { class: "row between w-full" },
        el("span", { class: "xsmall subtle", html: "<kbd>↑</kbd> <kbd>↓</kbd> to move · <kbd>Enter</kbd> to open · <kbd>Esc</kbd> to close" }),
        el("button", { class: "btn btn-sm", type: "button", text: "Close", onclick: closeSearch })
      ),
      onClose: function () {
        closeSearch();
      }
    });
    searchPanel = panel;

    var activeIndex = -1;
    var currentResults = [];

    function renderResults(query) {
      activeIndex = -1;
      currentResults = SOC.services.searchAll(query);
      if (query.trim().length < 2) {
        resultsBox.innerHTML = "";
        info.textContent = "Type at least two characters. Try an incident ID, host name or technique.";
        return;
      }
      info.textContent = currentResults.length
        ? currentResults.length + " result(s) in the sample dataset"
        : "No matches in the sample dataset.";
      resultsBox.innerHTML = "";
      currentResults.forEach(function (result, index) {
        var item = el("button", {
          class: "result-item",
          type: "button",
          role: "option",
          "aria-selected": "false",
          onclick: function () {
            window.location.href = resolve(result.href);
          }
        },
          /* icon() returns markup — wrap it so el() stores HTML instead of text */
          el("span", { html: icon(result.icon) }),
          el("span", { class: "r-main" },
            el("span", { class: "r-title", text: result.title }),
            el("span", { class: "r-sub", text: result.sub })
          ),
          el("span", { class: "result-kind", text: result.kind })
        );
        item.dataset.index = String(index);
        resultsBox.appendChild(item);
      });
    }

    function move(delta) {
      var items = util.qsa(".result-item", resultsBox);
      if (!items.length) return;
      activeIndex = (activeIndex + delta + items.length) % items.length;
      items.forEach(function (node, index) {
        var active = index === activeIndex;
        node.classList.toggle("is-active", active);
        node.setAttribute("aria-selected", active ? "true" : "false");
        if (active) node.scrollIntoView({ block: "nearest" });
      });
    }

    input.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        move(1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        move(-1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        var items = util.qsa(".result-item", resultsBox);
        var target = items[activeIndex >= 0 ? activeIndex : 0];
        if (target) target.click();
      }
    });

    renderResults(initialQuery || "");
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  /* ======================================================================
     Shortcuts
     ====================================================================== */
  function openShortcuts() {
    var rows = [
      ["Ctrl / Cmd + K", "Open global search"],
      ["/", "Open global search (when not typing)"],
      ["D", "Toggle light / dark theme"],
      ["Esc", "Close dialog, drawer or popover"],
      ["Tab", "Move through controls; graph entities are focusable"],
      ["Enter", "Select the focused graph entity or result"]
    ];
    var table = el("div", { class: "stack-2" });
    rows.forEach(function (row) {
      table.appendChild(
        el("div", { class: "kv" }, el("span", { html: "<kbd>" + util.esc(row[0]) + "</kbd>" }), el("span", { class: "small muted", text: row[1] }))
      );
    });
    SOC.ui.openDialog({
      title: "Keyboard shortcuts",
      body: table,
      footer: el("div", { class: "row end w-full" },
        el("button", { class: "btn btn-primary", type: "button", text: "Got it", onclick: function () { SOC.ui.closeOverlay(); } })
      )
    });
  }

  function isTypingTarget(target) {
    if (!target) return false;
    var tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
  }

  function wireShortcuts() {
    document.addEventListener("keydown", function (event) {
      var key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "k") {
        event.preventDefault();
        openSearch("");
      } else if (key === "/" && !isTypingTarget(event.target)) {
        event.preventDefault();
        openSearch("");
      } else if (key === "d" && !isTypingTarget(event.target) && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        SOC.theme.toggle();
        SOC.ui.toast("Theme switched to " + SOC.theme.current() + " mode.", { tone: "info", duration: 2600 });
      }
    });
  }

  /* ======================================================================
     Mobile drawer
     ====================================================================== */
  function toggleDrawer() {
    document.body.classList.toggle("nav-open");
    syncDrawerState();
  }
  function closeDrawer() {
    document.body.classList.remove("nav-open");
    syncDrawerState();
  }
  function syncDrawerState() {
    var btn = document.querySelector(".menu-btn");
    if (btn) btn.setAttribute("aria-expanded", document.body.classList.contains("nav-open") ? "true" : "false");
  }

  /* Close the drawer after navigating (pages are separate documents,
     but the class must not survive a same-document state change). */
  document.addEventListener("click", function (event) {
    var link = event.target.closest(".nav-link");
    if (link && document.body.classList.contains("nav-open")) closeDrawer();
  });

  SOC.nav = {
    render: renderShell,
    resolve: resolve,
    openSearch: openSearch,
    pageTitle: pageTitle
  };
})();
