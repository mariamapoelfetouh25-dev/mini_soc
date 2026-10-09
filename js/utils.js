/* ==========================================================================
   Mini-SOC · utils.js — tiny DOM + formatting helpers (no dependencies)
   Exposed as window.SOC.util
   ========================================================================== */
(function () {
  "use strict";
  window.SOC = window.SOC || {};

  /* Page registry — page modules call this before app.js boots. */
  SOC.pages = SOC.pages || {};
  SOC.registerPage = function (id, init) {
    SOC.pages[id] = init;
  };

  /* Persistent preference store (localStorage-backed, fails safe). */
  SOC.prefs = {
    get: function (key, fallback) {
      try {
        var value = localStorage.getItem("soc.pref." + key);
        return value === null || value === undefined ? fallback : value;
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem("soc.pref." + key, String(value));
      } catch (e) {}
      return value;
    },
    clear: function () {
      try {
        var doomed = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf("soc.pref.") === 0) doomed.push(k);
        }
        doomed.forEach(function (k) {
          localStorage.removeItem(k);
        });
        return doomed.length;
      } catch (e) {
        return 0;
      }
    }
  };

  /**
   * DOM builder.
   *   el('button', { class:'btn', text:'Save', onclick: fn, dataset:{id:'1'} })
   */
  function el(tag, attrs) {
    var node = document.createElement(tag);
    var children = Array.prototype.slice.call(arguments, 2);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (value === null || value === undefined || value === false) return;
        if (key === "class") node.className = value;
        else if (key === "text") node.textContent = value;
        else if (key === "html") node.innerHTML = value;
        else if (key === "dataset")
          Object.keys(value).forEach(function (d) {
            node.dataset[d] = value[d];
          });
        else if (key === "style" && typeof value === "object")
          Object.keys(value).forEach(function (s) {
            node.style[s] = value[s];
          });
        else if (key.slice(0, 2) === "on" && typeof value === "function")
          node.addEventListener(key.slice(2).toLowerCase(), value);
        else if (value === true) node.setAttribute(key, "");
        else node.setAttribute(key, value);
      });
    }
    appendChildren(node, children);
    return node;
  }

  function appendChildren(node, children) {
    children.forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      if (Array.isArray(child)) appendChildren(node, child);
      else if (typeof child === "string" || typeof child === "number")
        node.appendChild(document.createTextNode(String(child)));
      else node.appendChild(child);
    });
  }

  function esc(value) {
    return String(value === null || value === undefined ? "" : value).replace(
      /[&<>"']/g,
      function (ch) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
      }
    );
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }
  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }
  function dateObj(ts) {
    return ts instanceof Date ? ts : new Date(ts);
  }
  /** "07 Oct 2026" */
  function fmtDate(ts) {
    var d = dateObj(ts);
    return pad(d.getDate()) + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
  }
  /** "07 Oct 2026, 14:32" */
  function fmtDateTime(ts) {
    var d = dateObj(ts);
    return fmtDate(d) + ", " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  /** "14:32:07" */
  function fmtTime(ts) {
    var d = dateObj(ts);
    return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }
  /** "2h ago" — anchored to the demo clock so sample data stays coherent. */
  function relTime(ts, nowTs) {
    var ref = nowTs || (SOC.demo && SOC.demo.env ? SOC.demo.env.now : Date.now());
    var diff = Math.max(0, ref - dateObj(ts).getTime());
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    var days = Math.floor(hrs / 24);
    if (days < 30) return days + "d ago";
    return fmtDate(ts);
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(ctx, args);
      }, wait || 180);
    };
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function sum(list, fn) {
    return list.reduce(function (acc, item) {
      return acc + (fn ? fn(item) : item);
    }, 0);
  }

  /** Count items by key resolver → { key: count } */
  function countBy(list, fn) {
    return list.reduce(function (acc, item) {
      var key = fn(item);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  function params() {
    return new URLSearchParams(window.location.search);
  }

  function downloadFile(filename, content, mime) {
    var blob = new Blob([content], { type: (mime || "text/plain") + ";charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 400);
  }

  /** CSV cell escaping (RFC 4180 subset). */
  function csvCell(value) {
    var str = String(value === null || value === undefined ? "" : value);
    return /[",\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
  }

  function toCSV(rows) {
    return rows.map(function (row) {
      return row.map(csvCell).join(",");
    }).join("\r\n");
  }

  var counter = 0;
  function uid(prefix) {
    counter += 1;
    return (prefix || "id") + "-" + counter;
  }

  function slug(value) {
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function statusSlug(status) {
    return "status-" + slug(status);
  }
  function sevSlug(severity) {
    return "sev-" + slug(severity);
  }

  /** Simple event bus so pages/services stay decoupled. */
  var bus = {};
  var on = function (name, fn) {
    (bus[name] = bus[name] || []).push(fn);
    return function () {
      off(name, fn);
    };
  };
  var off = function (name, fn) {
    if (!bus[name]) return;
    bus[name] = bus[name].filter(function (f) {
      return f !== fn;
    });
  };
  var emit = function (name, payload) {
    (bus[name] || []).forEach(function (fn) {
      try {
        fn(payload);
      } catch (err) {
        console.error("[SOC bus]", name, err);
      }
    });
  };

  SOC.util = {
    el: el,
    esc: esc,
    qs: qs,
    qsa: qsa,
    fmtDate: fmtDate,
    fmtDateTime: fmtDateTime,
    fmtTime: fmtTime,
    relTime: relTime,
    debounce: debounce,
    clamp: clamp,
    sum: sum,
    countBy: countBy,
    params: params,
    downloadFile: downloadFile,
    toCSV: toCSV,
    uid: uid,
    slug: slug,
    sevSlug: sevSlug,
    statusSlug: statusSlug,
    on: on,
    off: off,
    emit: emit
  };
})();
