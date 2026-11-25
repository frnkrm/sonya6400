"use strict";

// Ein lokaler Ursprung für Oberfläche und USB. Die öffentliche Website verwendet
// den Dateiaustausch. Weder Sitzung noch gelesene Kamera gehören in den PWA-Cache.
const http = require("node:http");
const path = require("node:path");
const {readFile} = require("node:fs/promises");
const {randomBytes} = require("node:crypto");
const TransferProfile = require("../transfer-profile.js");
const TransferEngine = require("../transfer-engine.js");
const {GPhotoAdapter} = require("./gphoto.js");

const HOST = "127.0.0.1";
const ROOT = path.resolve(__dirname, "..");
const MAX_BYTES = 32 * 1024;
const SESSION_MS = 30 * 60 * 1000;
const ISO_STEP_MS = 2 * 60 * 1000;
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".png": "image/png",
  ".webmanifest": "application/manifest+json", ".md": "text/plain; charset=utf-8"
};
const PUBLIC = new Set([
  "index.html", "manifest.webmanifest", "sw.js", "apple-touch-icon.png", "og-image.png",
  "icon-192.png", "icon-512.png", "icon-maskable-512.png",
  "camera.js", "legacy.js", "guide-ui.js", "guide.css", "photo-tools.js", "photo-tools.css",
  "transfer-profile.js", "transfer-engine.js", "transfer-ui.js", "transfer.css",
  "docs/research/sony-a6400-kamera-objektive.md"
]);

function fail(code, message, status) {
  throw Object.assign(new Error(message), {code, status});
}

function json(res, status, value) {
  res.writeHead(status, {"Content-Type": "application/json; charset=utf-8"}).end(JSON.stringify(value));
}

async function readBody(req) {
  if (req.headers["content-type"]?.split(";")[0].trim() !== "application/json")
    fail("format", "Bitte eine JSON-Anfrage verwenden.", 415);
  if (Number(req.headers["content-length"]) > MAX_BYTES) fail("format", "Die Anfrage ist zu groß.", 413);
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BYTES) fail("format", "Die Anfrage ist zu groß.", 413);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    fail("format", "Ungültige JSON-Daten.", 400);
  }
}

const windows = process.platform === "win32" ? require("./windows/iso.js") : {};

function createApp(adapter = new GPhotoAdapter(), windowsIso = windows.readWindowsIso, windowsStep = windows.stepWindowsIso) {
  const sessions = new Map();
  let busy = false;
  function clearPreviews() {
    for (const entry of sessions.values()) {
      entry.snapshot = null;
      entry.step = null;
    }
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    res.setHeader("Content-Security-Policy", "frame-ancestors 'none'; base-uri 'none'; object-src 'none'");
    try {
      const host = HOST + ":" + server.address().port;
      if (req.headers.host !== host) fail("host", "Bitte die angezeigte lokale Adresse öffnen.", 403);
      const route = req.url.split("?")[0];
      if (!route.startsWith("/api/")) {
        if (req.method !== "GET" && req.method !== "HEAD") fail("method", "Nur Lesezugriff.", 405);
        const name = route === "/" ? "index.html" : route.slice(1);
        if (!PUBLIC.has(name)) fail("missing", "Datei fehlt.", 404);
        const data = await readFile(path.join(ROOT, name));
        res.writeHead(200, {"Content-Type": MIME[path.extname(name)]}).end(req.method === "HEAD" ? null : data);
        return;
      }
      const origin = "http://" + host;
      if ((req.headers.origin && req.headers.origin !== origin) ||
          req.headers["sec-fetch-site"] === "cross-site")
        fail("origin", "Kamerazugriff ist nur in der lokalen Anwendung möglich.", 403);
      const now = Date.now();
      for (const [key, session] of sessions) {
        if (session.expires <= now) sessions.delete(key);
      }
      if (route === "/api/session" && req.method === "GET") {
        if (sessions.size >= 64) fail("busy", "Zu viele lokale Sitzungen. Anwendung neu starten.", 429);
        const token = randomBytes(32).toString("hex");
        sessions.set(token, {expires: now + SESSION_MS, snapshot: null, step: null});
        json(res, 200, {token, windowsIso: typeof windowsIso === "function"});
        return;
      }
      if (!["/api/read", "/api/apply", "/api/windows-iso", "/api/windows-iso-step"].includes(route)) fail("missing", "Unbekannte Anfrage.", 404);
      if (req.method !== "POST") fail("method", "Die Kamera-Aktion erfordert POST.", 405);
      if (req.headers.origin !== origin) fail("origin", "Lokalen Browserursprung prüfen.", 403);
      const session = sessions.get(req.headers["x-session"]);
      if (!session) fail("session", "Lokale Sitzung abgelaufen. Erneut verbinden.", 403);
      const body = await readBody(req);
      if (!body || typeof body !== "object" || Array.isArray(body)) fail("format", "Ein Objekt wird erwartet.", 400);
      if (busy) fail("busy", "Eine Kamera-Aktion läuft bereits.", 409);
      busy = true;
      try {
        session.expires = Date.now() + SESSION_MS;
        if (route === "/api/windows-iso") {
          if (Object.keys(body).length) fail("format", "Die native ISO-Abfrage benötigt keine Parameter.", 400);
          if (!windowsIso) fail("platform", "Das direkte ISO-Lesen benötigt die lokale Anwendung unter Windows.", 409);
          clearPreviews();
          const {model, iso, mode, rawIso, stepKey, stepBlock} = await windowsIso();
          if (model !== "ILCE-6400") fail("readback", "Windows hat keine α6400 gemeldet.", 502);
          const readable = iso === "auto" || (Number.isInteger(iso) && iso >= 25 && iso <= 409600);
          const raw = typeof rawIso === "string" && /^0x[0-9A-F]{8}$/u.test(rawIso);
          const known = readable && rawIso === undefined && [undefined, "mfnr", "mfnrPlus"].includes(mode);
          const unknown = raw && (iso === null && mode === undefined || readable && mode === "unknown");
          if (!known && !unknown) fail("readback", "Windows hat keine gültigen ISO-Daten der α6400 zurückgegeben.", 502);
          const reading = {model, iso, mode, rawIso};
          if (["mode", "access", "choices"].includes(stepBlock)) reading.stepBlock = stepBlock;
          if (typeof windowsStep === "function" && stepBlock === undefined && iso === 400 && mode === undefined && rawIso === undefined &&
              typeof stepKey === "string" && /^[0-9a-f]{64}$/u.test(stepKey)) {
            const ticket = randomBytes(16).toString("hex");
            session.step = {ticket, key: stepKey, expires: Date.now() + ISO_STEP_MS};
            reading.stepTicket = ticket;
          }
          json(res, 200, reading);
        } else if (route === "/api/windows-iso-step") {
          if (Object.keys(body).length !== 1 || typeof body.ticket !== "string")
            fail("format", "Der ISO-Einzelschritt erwartet ausschließlich das Leseticket.", 400);
          const step = session.step;
          if (!windowsStep || !step || step.expires <= Date.now() || step.ticket !== body.ticket)
            fail("stale", "Freigabe fehlt oder ist abgelaufen. ISO über Windows erneut lesen.", 409);
          clearPreviews();
          const result = await windowsStep(step.key);
          if (result?.model !== "ILCE-6400" || result.iso !== 500 || result.mode !== undefined || result.rawIso !== undefined)
            fail("readback", "Die Rücklesung hat feste ISO 500 nicht bestätigt.", 502);
          json(res, 200, {model: result.model, iso: result.iso});
        } else if (route === "/api/read") {
          clearPreviews();
          if (Object.keys(body).length) fail("format", "Die Leseanfrage benötigt keine Parameter.", 400);
          const snapshot = await TransferEngine.readForPreview(adapter);
          session.snapshot = {...snapshot, ticket: randomBytes(16).toString("hex")};
          json(res, 200, session.snapshot);
        } else {
          if (Object.keys(body).some(key => !["profile", "expected", "scope"].includes(key)) ||
              (Object.hasOwn(body, "scope") && body.scope !== "iso")) {
            fail("scope", "Unbekannter Übertragungsumfang.", 400);
          }
          const expected = session.snapshot;
          if (!expected || expected.ticket !== body.expected?.ticket)
            fail("stale", "Vorschau abgelaufen. Kamera erneut auslesen.", 409);
          let profile;
          try {
            profile = TransferProfile.validate(body.profile);
          } catch (error) {
            fail("profile", error.message, 400);
          }
          // Die freigegebene Vorschau kommt aus der Sitzung, nie aus frei
          // veränderbaren Formularfeldern. Eine Aktion verbraucht die Vorschau.
          clearPreviews();
          const result = await TransferEngine.apply(adapter, profile, expected, body.scope);
          json(res, 200, result);
        }
      } finally {
        busy = false;
      }
    } catch (error) {
      const status = error.status || ({busy:409, disconnected:503, timeout:504, missing:503}[error.code]) || 400;
      json(res, status, {code: error.code || "adapter", error: error.message});
    }
  });
  server.requestTimeout = 15_000;
  return server;
}

if (require.main === module) {
  const server = createApp();
  server.on("error", err => {
    console.error(err.code === "EADDRINUSE" ? "Port 8765 ist belegt. Eine laufende Kamera-Anwendung über ihre lokale Adresse öffnen." : err.message);
    process.exitCode = 1;
  });
  server.listen(8765, HOST, () => console.log("Kamera-Anwendung läuft auf http://127.0.0.1:8765/ · Beenden mit Strg+C"));
}

module.exports = {createApp};
