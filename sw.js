/* Bei Änderungen an der App VERSION und die Versionsmarke in index.html erhöhen. */
const VERSION = "v5";
const SCOPE = self.registration.scope;
const PREFIX = "a6400:" + SCOPE + ":";
const CACHE = PREFIX + VERSION;
const ENTRY = new URL("index.html", SCOPE).href;
const SHELL = [
  "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png",
  "icon-maskable-512.png", "apple-touch-icon.png", "og-image.png",
  "camera.js", "legacy.js", "guide-ui.js", "guide.css", "photo-tools.js", "photo-tools.css",
  "transfer-profile.js", "transfer-engine.js", "transfer-ui.js", "transfer.css"
];
const ASSETS = new Set(SHELL.map(name => new URL(name, SCOPE).href));
const RELEASE_MARK = '<meta name="app-release" content="' + VERSION + '">';

function isEntry(url) {
  return url.origin + url.pathname === SCOPE || url.origin + url.pathname === ENTRY;
}

async function isReleasePage(response) {
  return response.status === 200 && !response.redirected &&
    /^text\/html(?:;|$)/i.test(response.headers.get("Content-Type") || "") &&
    (await response.clone().text()).includes(RELEASE_MARK);
}

async function installShell() {
  const cache = await caches.open(CACHE);
  const resources = SHELL.map(name => new Request(new URL(name, SCOPE), {
    cache: "reload", redirect: "error"
  }));
  // addAll schreibt den Satz von Antworten in einer einzigen Cache-Transaktion.
  await cache.addAll(resources);
  for (const name of SHELL) {
    const response = await cache.match(new URL(name, SCOPE));
    if (!response || response.status !== 200) throw new Error("Offline-Datei fehlt: " + name);
    if (name === "index.html" && !await isReleasePage(response)) throw new Error("Andere App-Version");
    const type = response.headers.get("Content-Type") || "";
    if (name.endsWith(".js") && !/javascript/i.test(type) ||
        name.endsWith(".css") && !/^text\/css/i.test(type) ||
        name.endsWith(".png") && !/^image\/png/i.test(type) ||
        name.endsWith(".webmanifest") && !/manifest\+json|application\/json/i.test(type)) {
      throw new Error("Falscher Dateityp: " + name);
    }
  }
  await self.skipWaiting();
}

self.addEventListener("install", event => event.waitUntil((async () => {
  // Ein misslungener neuer Release hinterlässt keinen Kandidaten im Cache.
  const existing = await caches.has(CACHE);
  try {
    await installShell();
  } catch (error) {
    if (!existing) await caches.delete(CACHE);
    throw error;
  }
})()));

async function activate() {
  let previousVersion = false;
  for (const name of await caches.keys()) {
    if (name === CACHE) continue;
    if (name.startsWith(PREFIX)) {
      previousVersion = true;
      await caches.delete(name);
    } else if (/^a6400-v[1-3]$/.test(name)) {
      // v3 nutzte einen originweiten Cache. Andere Installationspfade erhalten.
      const legacy = await caches.open(name);
      const keys = await legacy.keys();
      const own = keys.filter(key => isEntry(new URL(key.url)) || ASSETS.has(key.url));
      if (own.length) {
        previousVersion = true;
        if (own.length === keys.length) await caches.delete(name);
        else await Promise.all(own.map(key => legacy.delete(key)));
      }
    }
  }
  await self.clients.claim();
  if (previousVersion) {
    // Auch v3-Seiten kennen nur ihren alten Update-Handler. Eine Navigation
    // lädt HTML und Module aus derselben Version und erhält Einstellungslinks.
    for (const client of await self.clients.matchAll({type: "window"})) {
      if (isEntry(new URL(client.url))) {
        const updateURL = new URL(client.url);
        updateURL.searchParams.set("app-update", VERSION);
        // Eine Navigation wartet auf das Ende dieses Aktivierungsereignisses.
        client.navigate(updateURL.href).catch(() => {});
      }
    }
  }
}
self.addEventListener("activate", event => event.waitUntil(activate()));

async function navigate(request) {
  const cache = await caches.open(CACHE);
  let response;
  try {
    response = await fetch(request);
  } catch {
    return await cache.match(ENTRY) || new Response("Offline-Startseite fehlt.", {status: 503});
  }
  if (await isReleasePage(response)) {
    // Ein Speicherfehler darf eine funktionierende Online-Seite nicht blockieren.
    await cache.put(ENTRY, response.clone()).catch(() => {});
  } else if (response.ok) {
    // Während eines Deploys bleibt die installierte Fassung in sich konsistent.
    return await cache.match(ENTRY) || response;
  }
  return response;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (request.mode === "navigate") {
    if (isEntry(url)) event.respondWith(navigate(request));
    return;
  }
  if (ASSETS.has(url.href)) {
    event.respondWith(caches.match(url.href, {cacheName: CACHE}).then(hit => hit || fetch(request)));
  }
});
