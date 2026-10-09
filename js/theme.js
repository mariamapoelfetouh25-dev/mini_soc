/* ==========================================================================
   Mini-SOC · theme.js — Light/Dark theme + motion preference
   - Initial theme is applied by a tiny inline <head> script (no flash).
   - This module owns persistence and control wiring.
   ========================================================================== */
(function () {
  "use strict";
  var KEY_THEME = "soc.theme";
  var KEY_MOTION = "soc.motion";
  var KEY_SIDEBAR = "soc.sidebar";

  function read(key) {
    try {
      return localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (err) {
      /* storage may be unavailable (private mode) — app still works */
    }
  }

  function systemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function current() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function apply(theme) {
    var next = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    write(KEY_THEME, next);
    syncControls(next);
    SOC.util.emit("theme:change", { theme: next });
  }

  function toggle() {
    apply(current() === "dark" ? "light" : "dark");
  }

  function applyMotion(mode) {
    var next = mode === "reduced" ? "reduced" : "system";
    if (next === "system") document.documentElement.removeAttribute("data-motion");
    else document.documentElement.setAttribute("data-motion", "reduced");
    write(KEY_MOTION, next);
    SOC.util.emit("motion:change", { motion: next });
    return next;
  }

  function motion() {
    return read(KEY_MOTION) || "system";
  }

  /** Sidebar collapse (desktop only; drawer overrides on mobile). */
  function sidebarState() {
    return read(KEY_SIDEBAR) || "expanded";
  }
  function applySidebar(state) {
    document.body.setAttribute("data-sidebar", state === "collapsed" ? "collapsed" : "expanded");
    write(KEY_SIDEBAR, state === "collapsed" ? "collapsed" : "expanded");
    SOC.util.emit("sidebar:change", { state: state });
  }

  /** Reflect state on every control that declares data-theme-toggle. */
  function syncControls(theme) {
    SOC.util.qsa("[data-theme-toggle]").forEach(function (btn) {
      var dark = theme === "dark";
      btn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
      btn.setAttribute("title", dark ? "Switch to light theme" : "Switch to dark theme");
      var label = btn.querySelector("[data-theme-label]");
      if (label) label.textContent = dark ? "Light theme" : "Dark theme";
      var slot = btn.querySelector("[data-theme-icon]");
      if (slot) slot.innerHTML = SOC.ui.icon(dark ? "sun" : "moon");
    });
    var live = document.querySelector("[data-theme-live]");
    if (live) live.textContent = theme === "dark" ? "Dark" : "Light";
  }

  function init() {
    /* Restore persisted preferences (head script already applied the theme). */
    var stored = read(KEY_THEME);
    if (stored !== "dark" && stored !== "light") apply(systemTheme());
    else document.documentElement.setAttribute("data-theme", stored);

    var motionPref = motion();
    if (motionPref === "reduced") document.documentElement.setAttribute("data-motion", "reduced");

    document.body.setAttribute("data-sidebar", sidebarState());

    document.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-theme-toggle]");
      if (btn) {
        event.preventDefault();
        toggle();
      }
      var collapse = event.target.closest("[data-sidebar-toggle]");
      if (collapse) {
        event.preventDefault();
        applySidebar(
          document.body.getAttribute("data-sidebar") === "collapsed" ? "expanded" : "collapsed"
        );
      }
    });

    /* Keyboard: "D" is handled by navigation.js (global search owns "/"). */
    SOC.util.on("theme:request", function (payload) {
      apply(payload && payload.theme);
    });

    syncControls(current());
  }

  SOC.theme = {
    init: init,
    apply: apply,
    toggle: toggle,
    current: current,
    applyMotion: applyMotion,
    motion: motion,
    applySidebar: applySidebar
  };
})();
