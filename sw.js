/* Service Worker: macht den Spickzettel offline nutzbar.
   Version erhöhen, wenn du Dateien änderst, damit Handys die neue Fassung laden. */
const VERSION = "a6400-v3";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png", "og-image.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  /* Fremde Anfragen (z. B. Wetter von Open-Meteo) laufen direkt über das Netz. */
  if (url.origin !== self.location.origin) return;

  /* Seitenaufrufe: erst Netz, bei Fehler die gespeicherte Seite. */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const copy = r.clone();
          caches.open(VERSION).then((c) => c.put("index.html", copy));
          return r;
        })
        .catch(() => caches.match("index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  /* Dateien: sofort aus dem Speicher, im Hintergrund aktualisieren. */
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((r) => {
          if (r && r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
          return r;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
