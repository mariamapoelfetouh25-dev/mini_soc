/* ==========================================================================
   Mini-SOC · network-graph.js — lightweight SVG attack-graph renderer
   --------------------------------------------------------------------------
   • Deterministic sample layout (explicit node coordinates, no simulation)
   • Pan / zoom with pointer, wheel, pinch and keyboard-friendly controls
   • Node & edge selection with details callbacks
   • Highlighted sample attack path with a restrained moving highlight
   • Animations pause when the graph is off-screen or the tab is hidden
   • prefers-reduced-motion (or the in-app motion setting) disables motion
   ========================================================================== */
(function () {
  "use strict";
  window.SOC = window.SOC || {};
  var util = SOC.util;

  var SVG_NS = "http://www.w3.org/2000/svg";
  var VB_W = 1280;
  var VB_H = 760;

  var TYPE_COLOR = {
    user: "var(--nt-user)",
    endpoint: "var(--nt-endpoint)",
    server: "var(--nt-server)",
    external: "var(--nt-external)",
    process: "var(--nt-process)",
    file: "var(--nt-file)",
    network: "var(--nt-network)",
    decoy: "var(--nt-decoy)"
  };
  var TYPE_LABEL = {
    user: "User",
    endpoint: "Endpoint",
    server: "Server",
    external: "External IP",
    process: "Process",
    file: "File",
    network: "Network connection",
    decoy: "Decoy asset"
  };
  var RISK_COLOR = {
    critical: "var(--sev-critical)",
    high: "var(--sev-high)",
    medium: "var(--sev-medium)",
    low: "var(--sev-low)"
  };

  function s(tag, attrs, text) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs)
      Object.keys(attrs).forEach(function (key) {
        if (attrs[key] === null || attrs[key] === undefined) return;
        node.setAttribute(key, attrs[key]);
      });
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function shapeFor(node) {
    var shape;
    switch (node.type) {
      case "endpoint":
        shape = s("rect", { x: -15, y: -15, width: 30, height: 30, rx: 7, class: "g-shape" });
        break;
      case "server":
        shape = s("polygon", { points: "-17,-11 0,-16 17,-11 17,11 0,16 -17,11", class: "g-shape" });
        break;
      case "external":
        shape = s("polygon", { points: "0,-18 18,0 0,18 -18,0", class: "g-shape" });
        break;
      case "process":
        shape = s("polygon", { points: "0,-17 16,13 -16,13", class: "g-shape" });
        break;
      case "file":
        shape = s("path", { d: "M-11,-16 h13 l8,8 v24 h-21 z", class: "g-shape" });
        break;
      case "network":
        shape = s("ellipse", { rx: 23, ry: 13, class: "g-shape" });
        break;
      case "decoy":
        shape = s("circle", { r: 15, class: "g-shape", "stroke-dasharray": "4 3.5" });
        break;
      default:
        shape = s("circle", { r: 15, class: "g-shape" });
    }
    return shape;
  }

  function ringFor(node) {
    if (node.type === "network") return s("ellipse", { rx: 29, ry: 19, class: "g-ring" });
    return s("circle", { r: node.type === "external" ? 24 : 22, class: "g-ring" });
  }

  function edgeGeometry(a, b, index) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    var ux = dx / dist;
    var uy = dy / dist;
    var startPad = 24;
    var endPad = 27;
    var x1 = a.x + ux * startPad;
    var y1 = a.y + uy * startPad;
    var x2 = b.x - ux * endPad;
    var y2 = b.y - uy * endPad;
    var bend = Math.min(26, dist * 0.09) * (index % 2 === 0 ? 1 : -1);
    var mx = (x1 + x2) / 2 - uy * bend;
    var my = (y1 + y2) / 2 + ux * bend;
    return {
      d: "M" + x1.toFixed(1) + " " + y1.toFixed(1) + " Q" + mx.toFixed(1) + " " + my.toFixed(1) + " " + x2.toFixed(1) + " " + y2.toFixed(1),
      mx: (x1 + x2) / 2 - uy * bend * 0.55,
      my: (y1 + y2) / 2 + ux * bend * 0.55
    };
  }

  /* ====================================================================== */
  function createGraph(container, options) {
    options = options || {};
    var nodeById = {};
    var state = {
      k: 1,
      tx: 0,
      ty: 0,
      selectedNode: null,
      selectedEdge: null,
      pathOn: options.showPath !== false,
      visible: true,
      nodeEls: {},
      edgeEls: {}
    };

    container.classList.add("graph-stage");
    container.innerHTML = "";

    var svg = s("svg", {
      viewBox: "0 0 " + VB_W + " " + VB_H,
      preserveAspectRatio: "xMidYMid meet",
      tabindex: "0",
      role: "application",
      "aria-label": options.ariaLabel || "Attack graph — use Tab to move between entities and Enter to select"
    });
    var viewport = s("g", { class: "g-viewport" });
    var edgeLayer = s("g", { class: "g-edges" });
    var nodeLayer = s("g", { class: "g-nodes" });
    viewport.appendChild(edgeLayer);
    viewport.appendChild(nodeLayer);
    svg.appendChild(viewport);

    var emptyBox = document.createElement("div");
    emptyBox.className = "graph-empty hidden";
    emptyBox.innerHTML = SOC.ui.emptyState({
      icon: "network",
      title: "No entities to display",
      desc: "The graph dataset is empty. Load a scenario or adjust the current filters.",
      actionLabel: "Reset view",
      actionAttr: 'data-graph-reset="1"'
    });

    var hint = document.createElement("div");
    hint.className = "graph-hint";
    hint.textContent = "Drag to pan · scroll or pinch to zoom · click an entity for details";

    container.appendChild(svg);
    container.appendChild(emptyBox);
    container.appendChild(hint);

    /* ---- controls ---------------------------------------------------- */
    var controls = document.createElement("div");
    controls.className = "graph-controls";
    controls.innerHTML =
      '<button type="button" data-act="in" aria-label="Zoom in" title="Zoom in">' + SOC.ui.icon("zoom-in") + "</button>" +
      '<button type="button" data-act="out" aria-label="Zoom out" title="Zoom out">' + SOC.ui.icon("zoom-out") + "</button>" +
      '<span class="divider"></span>' +
      '<button type="button" data-act="reset" aria-label="Reset view" title="Reset view">' + SOC.ui.icon("reset") + "</button>" +
      '<button type="button" data-act="path" aria-pressed="' + (state.pathOn ? "true" : "false") +
      '" aria-label="Highlight sample attack path" title="Highlight sample attack path">' + SOC.ui.icon("flag") + "</button>";
    container.appendChild(controls);

    /* ---- transform ---------------------------------------------------- */
    function applyTransform(animate) {
      viewport.style.transition = animate ? "transform 260ms cubic-bezier(.2,.7,.3,1)" : "none";
      viewport.setAttribute(
        "transform",
        "translate(" + state.tx.toFixed(2) + "," + state.ty.toFixed(2) + ") scale(" + state.k.toFixed(3) + ")"
      );
    }

    function zoomAt(factor, cx, cy) {
      var next = util.clamp(state.k * factor, 0.4, 3.4);
      var world = { x: (cx - state.tx) / state.k, y: (cy - state.ty) / state.k };
      state.k = next;
      state.tx = cx - world.x * next;
      state.ty = cy - world.y * next;
      applyTransform(true);
    }

    function zoomCenter(factor) {
      zoomAt(factor, VB_W / 2, VB_H / 2);
    }

    function reset() {
      state.k = 1;
      state.tx = 0;
      state.ty = 0;
      applyTransform(true);
      clearSelection();
      if (options.onReset) options.onReset();
    }

    /* ---- selection ---------------------------------------------------- */
    function clearSelection() {
      state.selectedNode = null;
      state.selectedEdge = null;
      Object.keys(state.nodeEls).forEach(function (id) {
        state.nodeEls[id].classList.remove("is-selected", "is-dim");
      });
      Object.keys(state.edgeEls).forEach(function (id) {
        var group = state.edgeEls[id];
        group.classList.remove("is-selected", "is-dim");
        group.querySelector(".g-edge").classList.remove("is-selected", "is-related", "is-dim");
      });
      if (options.onSelectNode) options.onSelectNode(null, api);
    }

    function selectNode(id, opts) {
      var node = nodeById[id];
      if (!node) return;
      state.selectedNode = id;
      state.selectedEdge = null;

      var connected = {};
      var neighbours = {};
      neighbours[id] = true;
      Object.keys(state.edgeEls).forEach(function (edgeId) {
        var group = state.edgeEls[edgeId];
        var from = group.dataset.from;
        var to = group.dataset.to;
        var related = from === id || to === id;
        group.classList.toggle("is-dim", !related);
        group.classList.toggle("is-selected", false);
        group.querySelector(".g-edge").classList.toggle("is-related", related);
        group.querySelector(".g-edge").classList.toggle("is-dim", !related);
        if (related) {
          connected[from] = true;
          connected[to] = true;
        }
      });

      Object.keys(state.nodeEls).forEach(function (nodeId) {
        var isRelated = !!connected[nodeId];
        state.nodeEls[nodeId].classList.toggle("is-selected", nodeId === id);
        state.nodeEls[nodeId].classList.toggle("is-dim", !isRelated);
      });

      if (options.onSelectNode) options.onSelectNode(node, api);
      if (opts && opts.focus) state.nodeEls[id].focus();
    }

    function selectEdge(id) {
      var group = state.edgeEls[id];
      if (!group) return;
      state.selectedEdge = id;
      state.selectedNode = null;
      Object.keys(state.nodeEls).forEach(function (nodeId) {
        state.nodeEls[nodeId].classList.remove("is-selected");
        state.nodeEls[nodeId].classList.toggle(
          "is-dim",
          nodeId !== group.dataset.from && nodeId !== group.dataset.to
        );
      });
      Object.keys(state.edgeEls).forEach(function (edgeId) {
        var g = state.edgeEls[edgeId];
        var sel = edgeId === id;
        g.classList.toggle("is-selected", sel);
        g.classList.toggle("is-dim", !sel);
        g.querySelector(".g-edge").classList.toggle("is-selected", sel);
        g.querySelector(".g-edge").classList.toggle("is-dim", !sel);
      });
      if (options.onSelectEdge) {
        options.onSelectEdge(
          SOC.services.getGraph().edges.filter(function (e) {
            return e.id === id;
          })[0] || null,
          api
        );
      }
    }

    function setPathVisible(on) {
      state.pathOn = !!on;
      Object.keys(state.edgeEls).forEach(function (id) {
        var g = state.edgeEls[id];
        g.classList.toggle("is-path", state.pathOn && g.dataset.path === "1");
      });
      Object.keys(state.nodeEls).forEach(function (id) {
        state.nodeEls[id].classList.toggle("is-path-node", state.pathOn && state.nodeEls[id].dataset.path === "1");
      });
      var btn = controls.querySelector('[data-act="path"]');
      if (btn) btn.setAttribute("aria-pressed", state.pathOn ? "true" : "false");
    }

    /* ---- rendering ----------------------------------------------------- */
    function render(data) {
      edgeLayer.innerHTML = "";
      nodeLayer.innerHTML = "";
      state.nodeEls = {};
      state.edgeEls = {};
      nodeById = {};

      var nodes = data.nodes || [];
      var edges = data.edges || [];
      nodes.forEach(function (n) {
        nodeById[n.id] = n;
      });

      var hasContent = nodes.length > 0;
      emptyBox.classList.toggle("hidden", hasContent);
      svg.classList.toggle("hidden", !hasContent);
      hint.classList.toggle("hidden", !hasContent);
      controls.classList.toggle("hidden", !hasContent);
      if (!hasContent) return;

      /* edges */
      edges.forEach(function (edge, index) {
        var a = nodeById[edge.from];
        var b = nodeById[edge.to];
        if (!a || !b) return;
        var geo = edgeGeometry(a, b, index);
        var group = s("g", { class: "g-edge-g" });
        group.dataset.id = edge.id;
        group.dataset.from = edge.from;
        group.dataset.to = edge.to;
        group.dataset.path = edge.onPath ? "1" : "0";

        var path = s("path", { d: geo.d, class: "g-edge" + (edge.onPath && state.pathOn ? " is-path" : "") });
        var hit = s("path", { d: geo.d, class: "g-edge-hit", tabindex: "-1" });
        var label = s(
          "text",
          { x: geo.mx, y: geo.my - 5, class: "g-edge-label", "text-anchor": "middle" },
          edge.label + (edge.technique ? " · " + edge.technique : "")
        );

        hit.addEventListener("click", function (event) {
          event.stopPropagation();
          selectEdge(edge.id);
        });

        group.appendChild(path);
        group.appendChild(label);
        group.appendChild(hit);
        edgeLayer.appendChild(group);
        state.edgeEls[edge.id] = group;
      });

      /* nodes */
      nodes.forEach(function (node) {
        var group = s("g", {
          class: "g-node" + (node.suspicious ? " suspicious" : ""),
          tabindex: "0",
          role: "button",
          /* accessible name must include every visible text run inside the
             group — axe concatenates adjacent SVG <text> without separator */
          "aria-label":
            node.label +
            (node.sub || "") +
            ", " + (TYPE_LABEL[node.type] || node.type) +
            ", risk " + (node.risk || "unknown")
        });
        group.dataset.id = node.id;
        group.dataset.path = (data.attackPath || []).indexOf(node.id) !== -1 ? "1" : "0";
        group.style.setProperty("--nc", TYPE_COLOR[node.type] || "var(--accent)");
        group.style.setProperty("--rc", RISK_COLOR[node.risk] || "transparent");
        group.setAttribute("transform", "translate(" + node.x + "," + node.y + ")");

        if (node.suspicious) group.appendChild(s("circle", { r: 24, class: "g-glow" }));
        group.appendChild(s("circle", { r: 24, class: "g-pulse" }));
        group.appendChild(ringFor(node));
        group.appendChild(shapeFor(node));
        group.appendChild(s("circle", { r: 27, class: "g-select-ring" }));
        group.appendChild(s("circle", { r: 30, class: "g-focus" }));
        group.appendChild(
          s("text", { y: node.type === "network" ? 34 : 36, class: "g-label" }, node.label)
        );
        if (node.sub) {
          group.appendChild(
            s("text", { y: node.type === "network" ? 46 : 48, class: "g-sub" }, node.sub)
          );
        }

        group.addEventListener("click", function (event) {
          event.stopPropagation();
          selectNode(node.id);
        });
        group.addEventListener("keydown", function (event) {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectNode(node.id);
          }
        });
        group.addEventListener("focus", function () {
          if (state.selectedNode !== node.id && options.onNodeFocus) options.onNodeFocus(node);
        });

        nodeLayer.appendChild(group);
        state.nodeEls[node.id] = group;
      });

      setPathVisible(state.pathOn);
      applyTransform(false);
    }

    /* ---- pointer interaction ------------------------------------------- */
    var pointers = {};
    var panStart = null;
    var pinchStart = null;

    function clientToViewBox(clientX, clientY) {
      var rect = svg.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * VB_W,
        y: ((clientY - rect.top) / rect.height) * VB_H
      };
    }

    svg.addEventListener("pointerdown", function (event) {
      if (event.target.closest(".g-node") || event.target.closest(".g-edge-hit")) return;
      pointers[event.pointerId] = { x: event.clientX, y: event.clientY };
      svg.setPointerCapture(event.pointerId);
      var ids = Object.keys(pointers);
      if (ids.length === 1) {
        panStart = { x: event.clientX, y: event.clientY, tx: state.tx, ty: state.ty, moved: false };
        svg.classList.add("is-panning");
      } else if (ids.length === 2) {
        var a = pointers[ids[0]];
        var b = pointers[ids[1]];
        pinchStart = {
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          k: state.k
        };
        panStart = null;
      }
    });

    svg.addEventListener("pointermove", function (event) {
      if (!pointers[event.pointerId]) return;
      pointers[event.pointerId] = { x: event.clientX, y: event.clientY };
      var ids = Object.keys(pointers);

      if (ids.length === 2 && pinchStart) {
        var a = pointers[ids[0]];
        var b = pointers[ids[1]];
        var dist = Math.hypot(a.x - b.x, a.y - b.y);
        var mid = clientToViewBox((a.x + b.x) / 2, (a.y + b.y) / 2);
        var factor = dist / Math.max(1, pinchStart.dist);
        var target = util.clamp(pinchStart.k * factor, 0.4, 3.4);
        zoomAt(target / state.k, mid.x, mid.y);
        pinchStart.dist = dist;
        pinchStart.k = target;
        return;
      }

      if (panStart) {
        var start = clientToViewBox(panStart.x, panStart.y);
        var now = clientToViewBox(event.clientX, event.clientY);
        if (Math.abs(now.x - start.x) + Math.abs(now.y - start.y) > 4) panStart.moved = true;
        state.tx = panStart.tx + (now.x - start.x);
        state.ty = panStart.ty + (now.y - start.y);
        applyTransform(false);
      }
    });

    function endPointer(event) {
      delete pointers[event.pointerId];
      if (Object.keys(pointers).length < 2) pinchStart = null;
      if (Object.keys(pointers).length === 0) {
        svg.classList.remove("is-panning");
        panStart = null;
      }
    }
    svg.addEventListener("pointerup", endPointer);
    svg.addEventListener("pointercancel", endPointer);

    svg.addEventListener(
      "wheel",
      function (event) {
        event.preventDefault();
        var point = clientToViewBox(event.clientX, event.clientY);
        zoomAt(event.deltaY < 0 ? 1.12 : 1 / 1.12, point.x, point.y);
      },
      { passive: false }
    );

    svg.addEventListener("click", function (event) {
      if (event.target.closest(".g-node") || event.target.closest(".g-edge-hit")) return;
      if (panStart && panStart.moved) return;
      clearSelection();
    });

    svg.addEventListener("keydown", function (event) {
      if (event.key === "Escape") clearSelection();
      if (event.key === "+" || event.key === "=") zoomCenter(1.2);
      if (event.key === "-" || event.key === "_") zoomCenter(1 / 1.2);
      if (event.key === "0") reset();
    });

    controls.addEventListener("click", function (event) {
      var button = event.target.closest("button");
      if (!button) return;
      var act = button.dataset.act;
      if (act === "in") zoomCenter(1.25);
      else if (act === "out") zoomCenter(1 / 1.25);
      else if (act === "reset") reset();
      else if (act === "path") setPathVisible(!state.pathOn);
    });

    container.addEventListener("click", function (event) {
      if (event.target.closest("[data-graph-reset]")) reset();
    });

    /* ---- pause animations when off-screen / tab hidden ------------------ */
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function syncMotion() {
      var reduced =
        reduceMotion || document.documentElement.getAttribute("data-motion") === "reduced";
      container.classList.toggle("is-paused", reduced || !state.visible);
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          state.visible = entry.isIntersecting;
          syncMotion();
        });
      });
      io.observe(container);
      state.io = io;
    }
    document.addEventListener("visibilitychange", function () {
      state.visible = !document.hidden;
      syncMotion();
    });
    SOC.util.on("motion:change", syncMotion);

    var api = {
      render: render,
      selectNode: function (id) {
        if (!id) clearSelection();
        else selectNode(id);
      },
      clearSelection: clearSelection,
      zoomIn: function () {
        zoomCenter(1.25);
      },
      zoomOut: function () {
        zoomCenter(1 / 1.25);
      },
      reset: reset,
      setPathVisible: setPathVisible,
      isPathVisible: function () {
        return state.pathOn;
      },
      getSelected: function () {
        return { node: state.selectedNode, edge: state.selectedEdge };
      },
      focusNode: function (id) {
        if (state.nodeEls[id]) state.nodeEls[id].focus();
      },
      destroy: function () {
        if (state.io) state.io.disconnect();
        container.innerHTML = "";
      }
    };

    syncMotion();
    return api;
  }

  /* ---- Legend markup shared by the dashboard and the graph page -------- */
  function legend() {
    function item(cls, colorVar, label) {
      return (
        '<span class="legend-item" role="listitem"><span class="legend-shape ' + cls +
        '" style="--lc:' + colorVar + '" aria-hidden="true"></span>' + util.esc(label) + "</span>"
      );
    }
    var risk = ["critical", "high", "medium", "low"]
      .map(function (risk) {
        return (
          '<span class="legend-item" role="listitem"><span class="legend-shape circle" style="--lc:var(--sev-' +
          risk +
          ')" aria-hidden="true"></span>' +
          risk.charAt(0).toUpperCase() +
          risk.slice(1) +
          " risk</span>"
        );
      })
      .join("");

    return (
      '<div class="graph-legend" role="list" aria-label="Graph legend">' +
      '<span class="eyebrow" role="presentation">Entity</span>' +
      item("circle", "var(--nt-user)", "User") +
      item("", "var(--nt-endpoint)", "Endpoint") +
      item("hex", "var(--nt-server)", "Server") +
      item("diamond", "var(--nt-external)", "External IP") +
      item("triangle", "var(--nt-process)", "Process") +
      item("", "var(--nt-file)", "File") +
      item("pill", "var(--nt-network)", "Network connection") +
      item("decoy", "var(--nt-decoy)", "Decoy asset") +
      '<span class="legend-sep" role="presentation"></span><span class="eyebrow" role="presentation">Risk ring</span>' +
      risk +
      "</div>"
    );
  }

  SOC.graph = { create: createGraph, legend: legend, TYPE_LABEL: TYPE_LABEL };
})();
