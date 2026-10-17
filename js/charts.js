/* ==========================================================================
   Mini-SOC · charts.js — lightweight SVG/HTML visualisations
   All colours are CSS custom properties, so charts switch theme live with
   no re-render and no canvas/CSS mismatch.
   ========================================================================== */
(function () {
  "use strict";
  window.SOC = window.SOC || {};
  var util = SOC.util;

  function svgEl(name, attrs) {
    var node = document.createElementNS("http://www.w3.org/2000/svg", name);
    if (attrs)
      Object.keys(attrs).forEach(function (key) {
        if (attrs[key] === null || attrs[key] === undefined) return;
        node.setAttribute(key, attrs[key]);
      });
    return node;
  }

  function niceMax(value) {
    if (value <= 0) return 10;
    var magnitude = Math.pow(10, Math.floor(Math.log(value) / Math.LN10));
    var normalized = value / magnitude;
    var step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return step * magnitude;
  }

  /* ======================================================================
     Area / line chart  →  { series:[{from,to,value}] }
     ====================================================================== */
  function areaChart(container, opts) {
    opts = opts || {};
    container.innerHTML = "";
    var series = opts.series || [];
    if (!series.length) {
      container.innerHTML = util.esc(opts.emptyMessage || "No data in this range.");
      return;
    }

    var W = 760;
    var H = opts.height || 230;
    var padL = 46;
    var padR = 14;
    var padT = 16;
    var padB = 30;
    var innerW = W - padL - padR;
    var innerH = H - padT - padB;

    var max = niceMax(Math.max.apply(null, series.map(function (d) { return d.value; })));
    var ticks = 4;

    var x = function (i) {
      return padL + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
    };
    var y = function (v) {
      return padT + innerH - (v / max) * innerH;
    };

    var svg = svgEl("svg", {
      viewBox: "0 0 " + W + " " + H,
      role: "img",
      "aria-label": opts.ariaLabel || "Events over time (sample data)"
    });

    /* grid + y labels */
    for (var i = 0; i <= ticks; i++) {
      var val = (max / ticks) * i;
      var yy = y(val);
      svg.appendChild(
        svgEl("line", {
          x1: padL,
          x2: W - padR,
          y1: yy,
          y2: yy,
          style: "stroke:var(--border);stroke-width:1"
        })
      );
      var label = svgEl("text", {
        x: padL - 8,
        y: yy + 4,
        "text-anchor": "end",
        style: "font-size:10px;fill:var(--text-3);font-variant-numeric:tabular-nums"
      });
      label.textContent = Math.round(val);
      svg.appendChild(label);
    }

    /* area + line */
    var linePts = series.map(function (d, idx) {
      return x(idx) + "," + y(d.value);
    });
    var areaPath =
      "M" + x(0) + "," + (padT + innerH) +
      " L" + linePts.join(" L") +
      " L" + x(series.length - 1) + "," + (padT + innerH) + " Z";

    svg.appendChild(
      svgEl("path", {
        d: areaPath,
        style: "fill:var(--accent-soft)"
      })
    );
    svg.appendChild(
      svgEl("path", {
        d: "M" + linePts.join(" L"),
        style: "fill:none;stroke:var(--accent);stroke-width:2;stroke-linejoin:round;stroke-linecap:round"
      })
    );

    /* x labels */
    var labelEvery = Math.ceil(series.length / 7);
    series.forEach(function (d, idx) {
      if (idx % labelEvery !== 0 && idx !== series.length - 1) return;
      var date = new Date(d.from);
      var text =
        date.getHours() === 0
          ? util.fmtDate(date).slice(0, 6)
          : (date.getHours() < 10 ? "0" : "") + date.getHours() + ":00";
      var node = svgEl("text", {
        x: x(idx),
        y: H - 10,
        "text-anchor": "middle",
        style: "font-size:10px;fill:var(--text-3)"
      });
      node.textContent = text;
      svg.appendChild(node);
    });

    /* hover guide */
    var guide = svgEl("line", {
      y1: padT,
      y2: padT + innerH,
      style: "stroke:var(--border-strong);stroke-width:1;opacity:0"
    });
    var hoverDot = svgEl("circle", {
      r: 4,
      style: "fill:var(--surface);stroke:var(--accent);stroke-width:2.5;opacity:0"
    });
    svg.appendChild(guide);
    svg.appendChild(hoverDot);

    var tip = document.createElement("div");
    tip.className = "chart-tip";
    tip.style.display = "none";
    container.appendChild(svg);
    container.appendChild(tip);

    function move(event) {
      var rect = svg.getBoundingClientRect();
      var px = ((event.clientX - rect.left) / rect.width) * W;
      var idx = Math.round(((px - padL) / innerW) * (series.length - 1));
      idx = util.clamp(idx, 0, series.length - 1);
      var d = series[idx];
      guide.setAttribute("x1", x(idx));
      guide.setAttribute("x2", x(idx));
      guide.style.opacity = "1";
      hoverDot.setAttribute("cx", x(idx));
      hoverDot.setAttribute("cy", y(d.value));
      hoverDot.style.opacity = "1";

      tip.innerHTML =
        '<div class="tip-title">' + util.esc(util.fmtDate(d.from)) + "</div>" +
        '<div class="tip-row"><span>' + util.esc(opts.bucketLabel || "6-hour bucket") + "</span><b>" +
        util.esc((new Date(d.from).getHours() < 10 ? "0" : "") + new Date(d.from).getHours() + ":00") + "</b></div>" +
        '<div class="tip-row"><span>Events</span><b>' + d.value + "</b></div>";
      tip.style.display = "block";
      tip.style.left = (x(idx) / W) * rect.width + "px";
      tip.style.top = (y(d.value) / H) * rect.height + "px";
    }
    function leave() {
      guide.style.opacity = "0";
      hoverDot.style.opacity = "0";
      tip.style.display = "none";
    }
    svg.addEventListener("mousemove", move);
    svg.addEventListener("mouseleave", leave);

    if (opts.summary) {
      var sr = document.createElement("p");
      sr.className = "sr-only";
      sr.textContent = opts.summary;
      container.appendChild(sr);
    }
  }

  /* ======================================================================
     Donut → { data:[{label,value,color}], centerValue, centerLabel }
     ====================================================================== */
  function donut(container, opts) {
    opts = opts || {};
    var data = (opts.data || []).filter(function (d) {
      return d.value > 0;
    });
    var total = data.reduce(function (acc, d) {
      return acc + d.value;
    }, 0);
    container.innerHTML = "";
    if (!total) {
      container.innerHTML = util.esc(opts.emptyMessage || "No data in this range.");
      return;
    }

    var size = opts.size || 148;
    var stroke = opts.stroke || 18;
    var r = (size - stroke) / 2;
    var circumference = 2 * Math.PI * r;

    var wrap = document.createElement("div");
    wrap.className = "donut-wrap";

    var donutBox = document.createElement("div");
    donutBox.className = "donut";
    donutBox.style.width = size + "px";
    donutBox.style.height = size + "px";

    var svg = svgEl("svg", { viewBox: "0 0 " + size + " " + size, role: "img", "aria-label": opts.ariaLabel || "Distribution" });
    var offset = 0;
    data.forEach(function (slice) {
      var frac = slice.value / total;
      var circle = svgEl("circle", {
        cx: size / 2,
        cy: size / 2,
        r: r,
        fill: "none",
        "stroke-width": stroke
      });
      circle.style.stroke = slice.color;
      circle.setAttribute("stroke-dasharray", circumference * frac + " " + circumference * (1 - frac));
      circle.setAttribute("stroke-dashoffset", -circumference * offset);
      circle.setAttribute("stroke-linecap", "butt");
      svg.appendChild(circle);
      offset += frac;
    });
    donutBox.appendChild(svg);

    var center = document.createElement("div");
    center.className = "donut-center";
    center.innerHTML =
      '<div class="dv">' + util.esc(String(opts.centerValue !== undefined ? opts.centerValue : total)) + "</div>" +
      '<div class="dl">' + util.esc(opts.centerLabel || "total") + "</div>";
    donutBox.appendChild(center);

    var legend = document.createElement("div");
    legend.className = "donut-legend";
    data.forEach(function (slice) {
      var pct = Math.round((slice.value / total) * 100);
      var row = document.createElement("div");
      row.className = "lg-row";
      row.innerHTML =
        '<span class="swatch" style="--sw:' + slice.color + '"></span>' +
        "<span>" + util.esc(slice.label) + "</span>" +
        '<span class="lg-count">' + slice.value + "</span>" +
        '<span class="lg-pct">' + pct + "%</span>";
      legend.appendChild(row);
    });

    wrap.appendChild(donutBox);
    wrap.appendChild(legend);
    container.appendChild(wrap);
  }

  /* ======================================================================
     Horizontal bars (HTML meters) → { data:[{label,value,color}] }
     ====================================================================== */
  function hbars(container, opts) {
    opts = opts || {};
    var data = opts.data || [];
    var max = Math.max.apply(null, data.map(function (d) { return d.value; }).concat([1]));
    container.innerHTML = "";
    data.forEach(function (item) {
      var row = document.createElement("div");
      row.className = "meter";
      row.style.marginBottom = "12px";
      row.innerHTML =
        '<div class="meter-top"><span class="meter-label">' + util.esc(item.label) +
        '</span><span class="meter-value">' + util.esc(String(item.value)) + "</span></div>" +
        '<div class="meter-track"><div class="meter-fill" style="width:' +
        Math.max(3, (item.value / max) * 100) + "%;--meter-color:" + item.color + '"></div></div>';
      container.appendChild(row);
    });
  }

  /* ======================================================================
     Radial risk gauge → { value 0..100, color }
     ====================================================================== */
  function gauge(container, opts) {
    var value = util.clamp(opts.value || 0, 0, 100);
    var size = opts.size || 150;
    var stroke = opts.stroke || 14;
    var r = (size - stroke) / 2;
    var c = 2 * Math.PI * r;
    container.innerHTML = "";
    var svg = svgEl("svg", { viewBox: "0 0 " + size + " " + size, role: "img", "aria-label": "Risk score " + value + " of 100" });
    var track = svgEl("circle", { cx: size / 2, cy: size / 2, r: r, fill: "none", "stroke-width": stroke });
    track.style.stroke = "var(--surface-3)";
    var fill = svgEl("circle", {
      cx: size / 2,
      cy: size / 2,
      r: r,
      fill: "none",
      "stroke-width": stroke,
      "stroke-linecap": "round",
      transform: "rotate(-90 " + size / 2 + " " + size / 2 + ")"
    });
    fill.style.stroke = opts.color || "var(--sev-critical)";
    fill.setAttribute("stroke-dasharray", c * (value / 100) + " " + c);
    svg.appendChild(track);
    svg.appendChild(fill);
    container.appendChild(svg);
  }

  SOC.charts = {
    areaChart: areaChart,
    donut: donut,
    hbars: hbars,
    gauge: gauge
  };
})();
