// DUSKWICK test multiplayer server. Runs only on this computer: it listens on 127.0.0.1, so no other device can reach
// it. No npm packages needed. Start it with start-server.bat (or: node server.js), which opens the game in your browser.
//
// Protection: each run makes a fresh secret key. The browser gets it once through the link this server opens
// (/?k=...), stores it as a cookie, and every file and every network message needs that cookie. Only index.html,
// three.min.js, js/*.js, GLTFLoader.js, SkeletonUtils.js and models/models.js are ever served (server.js and
// everything else stay private).
//
// Networking: Server-Sent Events down (/net/events) and small JSON POSTs up (/net/send). The server only relays
// messages between connected players (the NET seam in js/09-party.js); it does not run game logic.
"use strict";
const http = require("http"),
  fs = require("fs"),
  path = require("path"),
  crypto = require("crypto"),
  { exec } = require("child_process");

const HOST = "127.0.0.1", // localhost only. Do not change to 0.0.0.0 unless you mean to let other devices in.
  PORT = +process.env.PORT || 8080,
  ROOT = __dirname,
  KEY = crypto.randomBytes(18).toString("base64url"),
  MAXMSG = 64 * 1024,
  TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".css": "text/css",
    ".txt": "text/plain; charset=utf-8",
  },
  // v31: plus the optional glTF loader libraries and the packed models file (models/models.js)
  ALLOW = /^(index\.html|three\.min\.js|GLTFLoader\.js|SkeletonUtils\.js|models\/models\.js|js\/[0-9a-z-]+\.js)$/;

const clients = new Map(); // connection id -> { res, pid }

const authed = (req) => {
  const c = req.headers.cookie || "";
  return c.split(/;\s*/).some((p) => p === "dk=" + KEY);
};
const deny = (res, code, msg) => {
  res.writeHead(code, { "Content-Type": "text/plain" });
  res.end(msg);
};
const broadcast = (line, except) => {
  for (const [id, c] of clients) if (id !== except) c.res.write("data: " + line + "\n\n");
};
// world owner: the longest-connected player's game runs the street monsters for everyone (see netFoes in the game)
const announceOwner = () => {
  const first = clients.keys().next().value;
  if (first) broadcast(JSON.stringify({ type: "owner", from: "server", at: Date.now(), data: { c: first } }));
};

function serveFile(req, res, p) {
  if (p === "/") p = "/index.html";
  let rel;
  try {
    rel = decodeURIComponent(p).replace(/^\/+/, "");
  } catch (e) {
    return deny(res, 400, "bad path");
  }
  // allow-list: only the page, the 3D library and the game scripts are ever sent
  if (!ALLOW.test(rel)) return deny(res, 404, "Not found");
  const full = path.join(ROOT, rel);
  fs.readFile(full, (err, buf) => {
    if (err) return deny(res, 404, "Not found");
    res.writeHead(200, { "Content-Type": TYPES[path.extname(full).toLowerCase()] || "application/octet-stream" });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://" + HOST);
  // first visit through the link: swap the key for a cookie, then reload without it in the address bar
  if (u.searchParams.get("k") === KEY) {
    res.writeHead(302, { "Set-Cookie": "dk=" + KEY + "; HttpOnly; SameSite=Strict; Path=/", Location: "/" });
    return res.end();
  }
  if (!authed(req))
    return deny(res, 403, "Duskwick test server: open the game with start-server.bat on this computer.");

  if (u.pathname === "/net/events") {
    const id = (u.searchParams.get("c") || "").slice(0, 40);
    if (!id) return deny(res, 400, "missing id");
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    res.write(": hi\n\n");
    const old = clients.get(id);
    clients.set(id, { res, pid: old ? old.pid : null });
    console.log("player connected (" + clients.size + " online)");
    announceOwner();
    req.on("close", () => {
      const c = clients.get(id);
      if (!c || c.res !== res) return; // this stream was already replaced by a reconnect
      clients.delete(id);
      if (c.pid) broadcast(JSON.stringify({ type: "bye", from: c.pid, at: Date.now(), data: {} }));
      console.log("player left (" + clients.size + " online)");
      announceOwner();
    });
    return;
  }
  if (u.pathname === "/net/send" && req.method === "POST") {
    const id = u.searchParams.get("c") || "",
      c = clients.get(id);
    let body = "";
    req.on("data", (d) => {
      body += d;
      if (body.length > MAXMSG) req.destroy();
    });
    req.on("end", () => {
      let m;
      try {
        m = JSON.parse(body);
      } catch (e) {
        return deny(res, 400, "bad json");
      }
      if (!c || !m || typeof m.type !== "string" || m.type.length > 20) return deny(res, 400, "bad message");
      if (m.from != null) c.pid = String(m.from).slice(0, 60);
      broadcast(JSON.stringify(m), id);
      res.writeHead(204);
      res.end();
    });
    return;
  }
  if (req.method !== "GET") return deny(res, 405, "no");
  serveFile(req, res, u.pathname);
});

// keep the event streams open through idle stretches
setInterval(() => clients.forEach((c) => c.res.write(": ping\n\n")), 20000);

server.listen(PORT, HOST, () => {
  const url = "http://" + HOST + ":" + PORT + "/?k=" + KEY;
  console.log("Duskwick test server running (this computer only).");
  console.log("Open a second window with: http://" + HOST + ":" + PORT + "/");
  console.log("Close this window to stop the server.");
  if (process.platform === "win32") exec('start "" "' + url + '"');
  else console.log("Open: " + url);
});
server.on("error", (e) => {
  console.error(e.code === "EADDRINUSE" ? "Port " + PORT + " is busy. Is the server already running?" : e);
});
