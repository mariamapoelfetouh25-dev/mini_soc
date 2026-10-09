/* ==========================================================================
   Mini-SOC · tools/serve.js  (OPTIONAL dev helper)
   --------------------------------------------------------------------------
   The frontend does NOT need a server: every page runs from file:// because
   the shared shell is rendered by JavaScript (no fetch(), no ES modules).

   Use this helper only if your browser restricts local files, or if you
   prefer http://localhost while developing:

       node tools/serve.js [port]        # default: 8080

   Then open http://localhost:8080/
   ========================================================================== */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const port = Number(process.argv[2]) || 8080;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8",
  ".csv": "text/csv; charset=utf-8"
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

  const filePath = path.join(root, path.normalize(urlPath));
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      return res.end("<h1>404 — not found</h1><p><a href='/'>Back to Mini-SOC</a></p>");
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log("Mini-SOC demo server running at http://localhost:" + port + "/");
  console.log("Serving: " + root);
});
