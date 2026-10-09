/* ==========================================================================
   Mini-SOC · components.js — shared UI kit (icons, badges, dialogs, toasts)
   Exposed as window.SOC.ui
   ========================================================================== */
(function () {
  "use strict";
  window.SOC = window.SOC || {};
  var util = SOC.util;
  var el = util.el;

  /* ======================================================================
     Icon set — consistent 24×24 stroke icons (no emoji, no icon font)
     ====================================================================== */
  var ICONS = {
    overview: '<path d="M4 4.5h6.5V11H4zM13.5 4.5H20V8.5h-6.5zM13.5 11.5H20v8h-6.5zM4 14.5h6.5v5H4z"/>',
    activity: '<path d="M3 12h4l3 7 4-14 3 7h4"/>',
    events: '<rect x="4" y="4.5" width="16" height="15" rx="2"/><path d="M7.5 9.5h9M7.5 13h6.5M7.5 16.5h4"/>',
    shield: '<path d="M12 3.2l7 2.9v5.4c0 4.2-2.9 7.3-7 8.5-4.1-1.2-7-4.3-7-8.5V6.1z"/><path d="M9 12.2l2.2 2.2 3.8-4.1"/>',
    incidents: '<path d="M12 4.5l8.7 15H3.3z"/><path d="M12 10v4.4M12 17.3h.01"/>',
    network: '<circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="19" r="2.2"/><circle cx="19" cy="19" r="2.2"/><path d="M12 7.2v4.3M12 11.5L5.8 17.1M12 11.5l6.2 5.6"/>',
    ai: '<path d="M12 3.2l1.9 4.4 4.4 1.9-4.4 1.9L12 15.8l-1.9-4.4L5.7 9.5l4.4-1.9z"/><path d="M18 15.2l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9z"/>',
    chat: '<path d="M4.5 5.5h15A1.5 1.5 0 0 1 21 7v8a1.5 1.5 0 0 1-1.5 1.5H12l-4.8 3.8V16.5H4.5A1.5 1.5 0 0 1 3 15V7a1.5 1.5 0 0 1 1.5-1.5z"/>',
    send: '<path d="M20.6 3.4L3.9 10.1l6.6 2.7 2.7 6.6z"/><path d="M10.5 12.8l10.1-9.4"/>',
    hunting: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.4"/><path d="M12 12l5.7-5.7"/>',
    decoy: '<path d="M12 3.2l8 4.4v8.8L12 20.8l-8-4.4V7.6z"/><path d="M12 12l8-4.4M12 12v8.8M12 12L4 7.6"/>',
    response: '<path d="M9.5 3.8h5v3.4h-5z"/><path d="M9 5.5H6.5A1.5 1.5 0 0 0 5 7v12.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V7a1.5 1.5 0 0 0-1.5-1.5H15"/><path d="M8.7 14.2l2.5 2.5 4.4-5"/>',
    reports: '<path d="M6.5 3.5h7l4.5 4.5V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20V4a.5.5 0 0 1 .5-.5z"/><path d="M13 3.5V8h4.6M9.2 13h5.6M9.2 16.5h5.6"/>',
    settings: '<path d="M4 7.5h8.5M17.5 7.5H20M4 16.5h3.5M13.5 16.5H20"/><circle cx="15" cy="7.5" r="2.5"/><circle cx="10.5" cy="16.5" r="2.5"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/>',
    bell: '<path d="M6.5 9.7a5.5 5.5 0 0 1 11 0c0 4.4 1.8 5.7 1.8 5.7H4.7s1.8-1.3 1.8-5.7z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.6v2.3M12 19.1v2.3M4.4 4.4l1.6 1.6M18 18l1.6 1.6M2.6 12h2.3M19.1 12h2.3M4.4 19.6L6 18M18 6l1.6-1.6"/>',
    moon: '<path d="M20 14.6A8.6 8.6 0 0 1 9.4 4a8.6 8.6 0 1 0 10.6 10.6z"/>',
    "chevron-down": '<path d="M6 9.5l6 6 6-6"/>',
    "chevron-right": '<path d="M9.5 6l6 6-6 6"/>',
    "chevron-left": '<path d="M14.5 6l-6 6 6 6"/>',
    "chevron-up": '<path d="M6 14.5l6-6 6 6"/>',
    user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.6c1.4-3.2 4-4.8 7-4.8s5.6 1.6 7 4.8"/>',
    users: '<circle cx="9.5" cy="8.5" r="3.2"/><path d="M3.6 19.5c1.2-3 3.4-4.6 5.9-4.6s4.7 1.6 5.9 4.6"/><path d="M16 5.7a3.2 3.2 0 0 1 0 5.7M17.6 15.3c1.5.8 2.6 2.1 3.3 4.2"/>',
    filter: '<path d="M4 5.5h16l-6.2 7.2V19l-3.6 1.8v-8.1z"/>',
    "sort-asc": '<path d="M12 19V5.5M6.8 10.7L12 5.5l5.2 5.2"/>',
    "sort-desc": '<path d="M12 5v13.5M6.8 13.3L12 18.5l5.2-5.2"/>',
    refresh: '<path d="M19.6 12A7.6 7.6 0 1 1 17.3 6.6"/><path d="M19.6 4.6V9H15.2"/>',
    download: '<path d="M12 4v10.4M8.2 10.9L12 14.7l3.8-3.8M5 19.5h14"/>',
    print: '<path d="M7 8.5V4h10v4.5"/><path d="M7 17H5.5A1.5 1.5 0 0 1 4 15.5v-5A1.5 1.5 0 0 1 5.5 9h13A1.5 1.5 0 0 1 20 10.5v5A1.5 1.5 0 0 1 18.5 17H17"/><path d="M7 14h10v6.5H7z"/>',
    play: '<path d="M8.5 5.5l9.5 6.5-9.5 6.5z"/>',
    plus: '<path d="M12 5.5v13M5.5 12h13"/>',
    check: '<path d="M5 12.6l4.6 4.6L19 7.4"/>',
    "check-circle": '<circle cx="12" cy="12" r="8.5"/><path d="M8.2 12.3l2.6 2.6 5-5.2"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.2v5.2l3.3 2"/>',
    external: '<path d="M14 4.5h5.5V10M19.5 4.5L12 12"/><path d="M18 14v5.5a.5.5 0 0 1-.5.5h-13A.5.5 0 0 1 4 19.5v-13A.5.5 0 0 1 4.5 6H10"/>',
    "arrow-right": '<path d="M4.5 12h14M13 6.5l5.5 5.5L13 17.5"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11.2v5.4M12 7.8h.01"/>',
    warning: '<path d="M12 4.5l8.7 15H3.3z"/><path d="M12 10v4.4M12 17.3h.01"/>',
    eye: '<path d="M2.6 12S6.2 6.2 12 6.2 21.4 12 21.4 12 17.8 17.8 12 17.8 2.6 12 2.6 12z"/><circle cx="12" cy="12" r="2.8"/>',
    "zoom-in": '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3M8.5 11h5M11 8.5v5"/>',
    "zoom-out": '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3M8.5 11h5"/>',
    reset: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.4"/><path d="M12 2.2v2.6M12 19.2v2.6M2.2 12h2.6M19.2 12h2.6"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.4"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    server: '<rect x="4" y="4.5" width="16" height="6" rx="1.6"/><rect x="4" y="13.5" width="16" height="6" rx="1.6"/><path d="M7.6 7.5h.01M7.6 16.5h.01"/>',
    database: '<ellipse cx="12" cy="6.5" rx="7" ry="3"/><path d="M5 6.5v11c0 1.7 3.1 3 7 3s7-1.3 7-3v-11"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
    file: '<path d="M6.5 3.5h7L18 8v12a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20V4a.5.5 0 0 1 .5-.5z"/><path d="M13 3.5V8h4.6"/>',
    cpu: '<rect x="7.5" y="7.5" width="9" height="9" rx="1.5"/><rect x="4" y="4" width="16" height="16" rx="2.6"/><path d="M9.6 2v2.4M14.4 2v2.4M9.6 19.6V22M14.4 19.6V22M2 9.6h2.4M2 14.4h2.4M19.6 9.6H22M19.6 14.4H22"/>',
    link: '<path d="M10.6 13.4a3.6 3.6 0 0 0 5.1 0l2.6-2.6a3.6 3.6 0 1 0-5.1-5.1L12 7.3"/><path d="M13.4 10.6a3.6 3.6 0 0 0-5.1 0l-2.6 2.6a3.6 3.6 0 1 0 5.1 5.1L12 16.7"/>',
    trash: '<path d="M4.6 6.6h14.8M9.6 6.6V5.2a1 1 0 0 1 1-1h2.8a1 1 0 0 1 1 1v1.4"/><path d="M6.6 6.6l.9 13a1 1 0 0 0 1 .9h7a1 1 0 0 0 1-.9l.9-13"/>',
    lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8.4 10.5V8a3.6 3.6 0 0 1 7.2 0v2.5"/>',
    dot: '<circle cx="12" cy="12" r="4.6" fill="currentColor" stroke="none"/>',
    layers: '<path d="M12 3.4l8.4 4.4L12 12.2 3.6 7.8z"/><path d="M3.6 12.2L12 16.6l8.4-4.4M3.6 16.2L12 20.6l8.4-4.4"/>',
    keyboard: '<rect x="3" y="6.5" width="18" height="11" rx="2"/><path d="M7 10h.01M10.5 10h.01M14 10h.01M17.5 10h.01M7 13.5h.01M17.5 13.5h.01M9.8 16.5h4.4"/>',
    help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .9-1 1.6v.4M12 17.4h.01"/>',
    ban: '<circle cx="12" cy="12" r="8.5"/><path d="M6.2 6.2l11.6 11.6"/>',
    list: '<path d="M8 7h12M8 12h12M8 17h12"/><path d="M4 7h.01M4 12h.01M4 17h.01"/>',
    flag: '<path d="M6 21V4.5h11l-1.6 3.6L17 12H6"/>',
    bolt: '<path d="M13.4 3L5.5 13.6h5.4L10 21l8.5-10.6h-5.6z"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.6 12h16.8M12 3.5c2.3 2.4 3.4 5.3 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.3-3.4-8.5S9.7 5.9 12 3.5z"/>',
    history: '<path d="M4.6 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.6 4.6V9H9"/><path d="M12 8.4V12l2.8 1.8"/>'
  };

  function icon(name, extraClass) {
    var body = ICONS[name] || ICONS.dot;
    return (
      '<svg class="ico' + (extraClass ? " " + extraClass : "") +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      body + "</svg>"
    );
  }

  /* ======================================================================
     Badges — severity and status always carry a text label
     ====================================================================== */
  function sevBadge(severity) {
    return '<span class="badge ' + util.sevSlug(severity) + '"><span class="badge-mark"></span>' +
      util.esc(severity) + "</span>";
  }
  function statusBadge(status) {
    return '<span class="badge ' + util.statusSlug(status) + '">' + util.esc(status) + "</span>";
  }
  function badge(classes, label, withMark) {
    return (
      '<span class="badge ' + classes + '">' +
      (withMark ? '<span class="badge-mark"></span>' : "") +
      util.esc(label) + "</span>"
    );
  }
  function priorityFlag(priority) {
    var tone = { P1: "sev-critical", P2: "sev-high", P3: "sev-medium", P4: "sev-low" }[priority] || "badge-outline";
    return '<span class="priority ' + tone + '">' + icon("flag") + util.esc(priority) + "</span>";
  }

  /* ======================================================================
     Static blocks
     ====================================================================== */
  function emptyState(opts) {
    opts = opts || {};
    return (
      '<div class="empty">' +
      '<div class="empty-ico">' + icon(opts.icon || "search") + "</div>" +
      '<div class="empty-title">' + util.esc(opts.title || "Nothing to show") + "</div>" +
      '<p class="empty-desc">' + util.esc(opts.desc || "") + "</p>" +
      (opts.actionLabel
        ? '<button type="button" class="btn btn-primary" ' + (opts.actionAttr || "") + ">" +
          icon("refresh") + util.esc(opts.actionLabel) + "</button>"
        : "") +
      "</div>"
    );
  }

  function kpi(opts) {
    var tone = opts.tone || "var(--accent)";
    return (
      '<div class="kpi" style="--kpi-accent:' + tone + '">' +
      '<div class="kpi-top"><span class="kpi-label">' + util.esc(opts.label) + "</span>" +
      '<span class="kpi-ico">' + icon(opts.icon || "activity") + "</span></div>" +
      '<div class="kpi-value">' + util.esc(opts.value) + "</div>" +
      '<div class="kpi-hint">' + (opts.hintHtml || util.esc(opts.hint || "")) + "</div>" +
      "</div>"
    );
  }

  function note(tone, icoName, html) {
    return '<div class="note note-' + tone + '">' + icon(icoName) + "<div>" + html + "</div></div>";
  }

  /* ======================================================================
     Pagination
     ====================================================================== */
  function pagination(state) {
    var page = state.page;
    var totalPages = state.totalPages;
    var wrap = el("nav", { class: "pager", "aria-label": "Table pagination" });

    function btn(label, target, opts) {
      opts = opts || {};
      var b = el("button", {
        type: "button",
        html: label,
        "aria-label": opts.aria || label
      });
      if (opts.current) b.setAttribute("aria-current", "page");
      if (opts.disabled || target < 1 || target > totalPages) b.disabled = true;
      else
        b.addEventListener("click", function () {
          state.onPage(target);
        });
      return b;
    }

    wrap.appendChild(btn("&laquo;", page - 1, { disabled: page <= 1, aria: "Previous page" }));

    var start = Math.max(1, page - 2);
    var end = Math.min(totalPages, start + 4);
    start = Math.max(1, end - 4);
    if (start > 1) wrap.appendChild(btn("1", 1));
    if (start > 2) wrap.appendChild(el("span", { class: "subtle xsmall", text: "…" }));
    for (var i = start; i <= end; i++) {
      wrap.appendChild(btn(String(i), i, { current: i === page, aria: "Page " + i }));
    }
    if (end < totalPages - 1) wrap.appendChild(el("span", { class: "subtle xsmall", text: "…" }));
    if (end < totalPages) wrap.appendChild(btn(String(totalPages), totalPages));

    wrap.appendChild(btn("&raquo;", page + 1, { disabled: page >= totalPages, aria: "Next page" }));
    return wrap;
  }

  /* ======================================================================
     Tabs — roving focus, arrow-key support
     ====================================================================== */
  function bindTabs(container, onChange) {
    var tabs = util.qsa("[role=tab]", container);
    function select(tab) {
      tabs.forEach(function (t) {
        var selected = t === tab;
        t.setAttribute("aria-selected", selected ? "true" : "false");
        t.tabIndex = selected ? 0 : -1;
        var panelId = t.getAttribute("aria-controls");
        if (panelId) {
          var panel = document.getElementById(panelId);
          if (panel) panel.hidden = !selected;
        }
      });
      if (onChange) onChange(tab.dataset.tab || tab.getAttribute("aria-controls"), tab);
    }
    tabs.forEach(function (tab, index) {
      tab.addEventListener("click", function () {
        select(tab);
      });
      tab.addEventListener("keydown", function (event) {
        var next = null;
        if (event.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
        else if (event.key === "ArrowLeft") next = tabs[(index - 1 + tabs.length) % tabs.length];
        else if (event.key === "Home") next = tabs[0];
        else if (event.key === "End") next = tabs[tabs.length - 1];
        if (next) {
          event.preventDefault();
          next.focus();
          select(next);
        }
      });
    });
    return select;
  }

  /* ======================================================================
     Overlays: drawer + dialog (Esc closes, focus returns to trigger)
     ====================================================================== */
  var overlayState = { open: null, lastFocus: null };

  function ensureHost() {
    var host = document.getElementById("overlay-root");
    if (!host) {
      host = el("div", { id: "overlay-root" });
      document.body.appendChild(host);
    }
    return host;
  }

  function trapFocus(container) {
    container.addEventListener("keydown", function (event) {
      if (event.key !== "Tab") return;
      var focusables = util.qsa(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        container
      ).filter(function (node) {
        return node.offsetParent !== null;
      });
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  function closeOverlay() {
    if (!overlayState.open) return;
    var state = overlayState.open;
    overlayState.open = null;
    document.removeEventListener("keydown", state.onKey, true);
    if (state.scrim && state.scrim.parentNode) state.scrim.parentNode.removeChild(state.scrim);
    if (state.panel && state.panel.parentNode) state.panel.parentNode.removeChild(state.panel);
    document.body.style.overflow = state.prevOverflow || "";
    if (overlayState.lastFocus && overlayState.lastFocus.focus) overlayState.lastFocus.focus();
  }

  function openOverlay(kind, opts) {
    closeOverlay();
    var host = ensureHost();
    overlayState.lastFocus = document.activeElement;
    var prevOverflow = document.body.style.overflow;

    var scrim = el("div", { class: "scrim" });
    var panel = el("div", {
      class: kind === "drawer" ? "drawer" : "dialog",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": opts.ariaLabel || opts.title || "Dialog"
    });

    var close = el("button", {
      class: "icon-btn",
      type: "button",
      "aria-label": "Close dialog",
      html: icon("close"),
      onclick: function () {
        if (opts.onClose) opts.onClose(false);
        closeOverlay();
      }
    });

    if (kind === "drawer") {
      panel.appendChild(
        el("div", { class: "drawer-head" }, el("div", { class: "grow" },
          el("h2", { class: "drawer-title", text: opts.title }),
          opts.subtitle ? el("div", { class: "subtle xsmall", html: opts.subtitle }) : null
        ), close)
      );
      var body = el("div", { class: "drawer-body" });
      if (typeof opts.body === "string") body.innerHTML = opts.body;
      else if (opts.body) body.appendChild(opts.body);
      panel.appendChild(body);
      if (opts.footer) {
        var foot = el("div", { class: "drawer-foot" });
        if (typeof opts.footer === "string") foot.innerHTML = opts.footer;
        else foot.appendChild(opts.footer);
        panel.appendChild(foot);
      }
    } else {
      panel.appendChild(
        el("div", { class: "dialog-head" },
          el("h2", { class: "dialog-title grow", text: opts.title }),
          opts.title ? close : null
        )
      );
      var dbody = el("div", { class: "dialog-body" });
      if (typeof opts.body === "string") dbody.innerHTML = opts.body;
      else if (opts.body) dbody.appendChild(opts.body);
      panel.appendChild(dbody);
      if (opts.footer) {
        var dfoot = el("div", { class: "dialog-foot" });
        if (typeof opts.footer === "string") dfoot.innerHTML = opts.footer;
        else dfoot.appendChild(opts.footer);
        panel.appendChild(dfoot);
      }
    }

    host.appendChild(scrim);
    host.appendChild(panel);
    document.body.style.overflow = "hidden";

    scrim.addEventListener("click", function () {
      if (opts.onClose) opts.onClose(false);
      closeOverlay();
    });

    function onKey(event) {
      if (event.key === "Escape") {
        event.stopPropagation();
        if (opts.onClose) opts.onClose(false);
        closeOverlay();
      }
    }
    document.addEventListener("keydown", onKey, true);
    overlayState.open = { panel: panel, scrim: scrim, onKey: onKey, prevOverflow: prevOverflow };
    trapFocus(panel);

    var focusTarget = panel.querySelector("[autofocus], input, textarea, button:not([aria-label='Close dialog'])") || close;
    if (focusTarget && focusTarget.focus) focusTarget.focus();
    if (opts.onOpen) opts.onOpen(panel);
    return panel;
  }

  function openDrawer(opts) {
    return openOverlay("drawer", opts);
  }
  function openDialog(opts) {
    return openOverlay("dialog", opts);
  }

  /** Promise-based confirmation — used for demo status changes. */
  function confirm(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var done = function (value) {
        closeOverlay();
        resolve(value);
      };
      var cancelBtn = el("button", { class: "btn", type: "button", text: opts.cancelLabel || "Cancel", onclick: function () { done(false); } });
      var okBtn = el("button", {
        class: "btn " + (opts.danger ? "btn-danger" : "btn-primary"),
        type: "button",
        html: (opts.icon ? icon(opts.icon) : "") + util.esc(opts.confirmLabel || "Confirm"),
        onclick: function () {
          done(true);
        }
      });
      openDialog({
        title: opts.title || "Confirm action",
        body:
          '<div class="stack-4">' +
          "<p>" + util.esc(opts.message || "") + "</p>" +
          (opts.detail ? note("warn", "warning", "<div>" + opts.detail + "</div>") : "") +
          "</div>",
        footer: el("div", { class: "row end w-full" }, cancelBtn, okBtn),
        onClose: function () {
          resolve(false);
        }
      });
    });
  }

  /* ======================================================================
     Toasts
     ====================================================================== */
  function toast(message, opts) {
    opts = opts || {};
    var stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = el("div", { class: "toast-stack", "aria-live": "polite", "aria-atomic": "false" });
      document.body.appendChild(stack);
    }
    var node = el("div", { class: "toast", dataset: { tone: opts.tone || "info" } },
      /* icon() returns markup — wrap it so el() stores HTML instead of text */
      el("span", {
        html: icon(opts.icon || (opts.tone === "success" ? "check-circle" : opts.tone === "danger" ? "warning" : "info"))
      }),
      el("div", { class: "t-body" },
        el("div", { class: "t-title", text: message }),
        opts.desc ? el("div", { class: "t-desc", html: opts.desc }) : null
      ),
      el("button", {
        class: "notif-dismiss",
        type: "button",
        "aria-label": "Dismiss notification",
        html: icon("close"),
        onclick: function () {
          if (node.parentNode) node.parentNode.removeChild(node);
        }
      })
    );
    stack.appendChild(node);
    setTimeout(function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, opts.duration || 5000);
    return node;
  }

  /* ======================================================================
     Sortable column header helper
     ====================================================================== */
  function sortTh(label, key, state, onSort) {
    var active = state.sort === key;
    var dir = active ? state.dir : null;
    var th = el("th", {
      scope: "col",
      "aria-sort": active ? (state.dir === "asc" ? "ascending" : "descending") : "none"
    });
    var button = el("button", {
      class: "th-sort",
      type: "button",
      html: util.esc(label) + icon(active && state.dir === "asc" ? "sort-asc" : "sort-desc")
    });
    if (dir) button.dataset.dir = dir;
    button.setAttribute(
      "aria-label",
      "Sort by " + label + (active ? (state.dir === "asc" ? ", currently ascending" : ", currently descending") : "")
    );
    button.addEventListener("click", function () {
      var nextDir = state.sort === key && state.dir === "desc" ? "asc" : "desc";
      onSort(key, nextDir);
    });
    th.appendChild(button);
    return th;
  }

  SOC.ui = {
    icon: icon,
    sevBadge: sevBadge,
    statusBadge: statusBadge,
    badge: badge,
    priorityFlag: priorityFlag,
    emptyState: emptyState,
    kpi: kpi,
    note: note,
    pagination: pagination,
    bindTabs: bindTabs,
    openDrawer: openDrawer,
    openDialog: openDialog,
    closeOverlay: closeOverlay,
    confirm: confirm,
    toast: toast,
    sortTh: sortTh
  };
})();
