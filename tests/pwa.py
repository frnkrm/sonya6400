"""PWA-Regressionsprüfung mit echtem Chromium und einem wechselnden lokalen Deploy."""
import functools
import os
import re
import shutil
import socket
import subprocess
import tempfile
import threading
import unittest
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
RELEASE = re.search(r'const VERSION = "([^"]+)"', (ROOT / "sw.js").read_text())[1]
# Diese Revision enthält den tatsächlich veröffentlichten v3-Client.
V3 = "678e440489266b9fb514d9688f4d0f66c5a5543e"
V4 = "1aa7cd744d18c9460127836e7d678ce6670a92ee"
V5 = "3449a1f2819b8b1b97279861746efd06050038bf"


class Deploy(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = urlsplit(self.path).path
        asset = path.lstrip("/") or "index.html"
        if self.server.offline:
            self.connection.shutdown(socket.SHUT_RDWR)
            return
        if path == self.server.failure:
            self.send_error(500)
            return
        if path == self.server.wrong_html:
            data = b"<html><title>Andere Seite</title></html>"
        elif self.server.legacy and asset in self.server.old_files:
            data = self.server.old_files[asset]
        else:
            return super().do_GET()
        self.send_response(200)
        self.send_header("Content-Type", "text/html" if path == self.server.wrong_html else self.guess_type(asset))
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def handle(self):
        try:
            super().handle()
        except (BrokenPipeError, ConnectionResetError):
            pass  # Chromium bricht weitere Transfers nach einem Installationsfehler ab.

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *_args):
        pass


class OfflineAndUpdate(unittest.TestCase):
    def setUp(self):
        self.profile = tempfile.TemporaryDirectory()
        self.addCleanup(self.profile.cleanup)
        handler = functools.partial(Deploy, directory=ROOT)
        self.http = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        self.http.offline = self.http.legacy = False
        self.http.failure = self.http.wrong_html = None
        thread = threading.Thread(target=self.http.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(self.http.server_close)
        self.addCleanup(self.http.shutdown)
        self.url = f"http://127.0.0.1:{self.http.server_port}/"
        self.playwright = sync_playwright().start()
        self.addCleanup(self.playwright.stop)
        self.context = self.playwright.chromium.launch_persistent_context(
            self.profile.name,
            executable_path=os.environ.get("CHROMIUM_PATH") or shutil.which("chromium"),
        )
        self.addCleanup(self.context.close)
        self.tab = self.context.pages[0]

    def open_app(self):
        self.tab.goto(self.url + "#s=portrait.tag.steh.bokeh.tam")
        self.tab.wait_for_function("!!navigator.serviceWorker.controller")
        expect(self.tab.locator("#hud")).not_to_be_empty()

    def test_app_entry_survives_other_pages_and_http_errors(self):
        self.open_app()
        other = self.context.new_page()
        self.assertEqual(other.goto(self.url + "gibt-es-nicht").status, 404)
        self.assertTrue(other.goto(self.url + "robots.txt").ok)
        self.http.failure = "/index.html"
        self.assertEqual(other.goto(self.url + "index.html").status, 500)
        self.http.failure = None
        self.http.wrong_html = "/"
        self.assertTrue(other.goto(self.url).ok)
        expect(other.locator("#hud")).not_to_be_empty()
        self.http.offline = True
        response = self.tab.reload()
        self.assertTrue(response.ok and response.from_service_worker)
        expect(self.tab.locator("#steps li").first).to_be_visible()
        cached = self.tab.evaluate("""async () => {
            const cache = await caches.open((await caches.keys()).find(k => k.startsWith('a6400:')));
            return (await cache.keys()).map(r => new URL(r.url).pathname);
        }""")
        for src in self.tab.locator('script[src], link[rel=stylesheet]').evaluate_all(
            "els => els.map(el => new URL(el.src || el.href).pathname)"
        ):
            self.assertIn(src, cached)
        self.tab.evaluate("async () => Promise.all((await caches.keys()).map(k => caches.delete(k)))")
        self.assertEqual(self.tab.reload().status, 503)

    def test_v4_client_upgrades_to_offline_transfer_view(self):
        self.http.old_files = {
            name: subprocess.check_output(["git", "show", f"{V4}:{name}"], cwd=ROOT)
            for name in ("index.html", "sw.js", "camera.js", "legacy.js", "guide-ui.js", "photo-tools.js")
        }
        self.http.legacy = True
        self.open_app()
        expect(self.tab.locator("meta[name=app-release]")).to_have_attribute("content", "v4")
        self.assertEqual(self.tab.locator("#transfer-panel").count(), 0)
        self.http.legacy = False
        self.tab.evaluate("navigator.serviceWorker.ready.then(reg => reg.update()).then(() => true)")
        expect(self.tab.locator("meta[name=app-release]")).to_have_attribute("content", RELEASE)
        self.http.offline = True
        self.assertTrue(self.tab.reload().from_service_worker)
        self.tab.locator("#transfer-panel > summary").click()
        self.tab.locator("#transfer-read").click()
        expect(self.tab.locator("#transfer-status")).to_contain_text("Simulation")

    def test_v5_client_upgrades_to_offline_iso_test(self):
        self.http.old_files = {
            name: subprocess.check_output(["git", "show", f"{V5}:{name}"], cwd=ROOT)
            for name in ("index.html", "sw.js", "transfer-ui.js", "transfer-engine.js")
        }
        self.http.legacy = True
        self.open_app()
        expect(self.tab.locator("meta[name=app-release]")).to_have_attribute("content", "v5")
        self.assertEqual(self.tab.locator("#transfer-iso").count(), 0)
        self.http.legacy = False
        self.tab.evaluate("navigator.serviceWorker.ready.then(reg => reg.update()).then(() => true)")
        expect(self.tab.locator("meta[name=app-release]")).to_have_attribute("content", RELEASE)
        self.http.offline = True
        self.assertTrue(self.tab.reload().from_service_worker)
        self.tab.locator("#transfer-panel > summary").click()
        self.tab.locator("#transfer-read").click()
        self.tab.get_by_role("button", name="Nur ISO übertragen").click()
        expect(self.tab.locator("#transfer-status")).to_contain_text("Simulation · ISO-Einzeltest · Bestätigt")

    def test_failed_update_and_upgrade_of_existing_tab_and_installed_app(self):
        self.http.old_files = {
            name: subprocess.check_output(["git", "show", f"{V3}:{name}"], cwd=ROOT)
            for name in ("index.html", "sw.js")
        }
        self.http.legacy = True
        self.open_app()
        self.tab.evaluate("localStorage.setItem('ck0_0','1')")
        self.tab.evaluate("""async () => {
            await caches.open('andere-app');
            const shared = await caches.open('a6400-v2');
            await shared.put('index.html', new Response('alt'));
            await shared.put('/andere/index.html', new Response('separater Scope'));
        }""")
        cdp = self.context.new_cdp_session(self.tab)
        cdp.send("PWA.install", {"manifestId": self.url, "installUrlOrBundleUrl": self.url})
        with self.context.expect_page() as new_page:
            cdp.send("PWA.launch", {"manifestId": self.url})
        installed = new_page.value
        installed.wait_for_function("!!navigator.serviceWorker.controller")
        self.assertIsNone(installed.query_selector('meta[name=app-release]'))

        # Ein fehlendes Modul muss die Installation verwerfen. v3 bleibt aktiv.
        self.http.legacy = False
        self.http.failure = "/guide.css"
        self.tab.evaluate("""async () => {
            const reg = await navigator.serviceWorker.ready;
            const outcome = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Fehlerhafter Worker blieb aktiv')), 15000);
                reg.addEventListener('updatefound', () => {
                    const candidate = reg.installing;
                    candidate.addEventListener('statechange', () => {
                        if (candidate.state === 'redundant') {
                            clearTimeout(timeout);
                            resolve();
                        }
                    });
                }, {once:true});
            });
            await reg.update();
            await outcome;
        }""")
        self.assertIsNone(self.tab.query_selector('meta[name=app-release]'))
        caches = self.tab.evaluate("caches.keys()")
        self.assertIn("a6400-v3", caches)
        self.tab.wait_for_function("""async () =>
            !(await caches.keys()).some(name => name.startsWith('a6400:'))
        """)

        self.http.failure = None
        self.tab.evaluate("navigator.serviceWorker.ready.then(r => r.update()).then(() => true)")
        for client in (self.tab, installed):
            expect(client.locator('meta[name=app-release]')).to_have_attribute("content", RELEASE)
            expect(client.locator("#hud")).not_to_be_empty()
            self.assertEqual(client.evaluate("localStorage.getItem('ck0_0')"), "1")
        self.assertTrue(self.tab.url.endswith("#s=portrait.tag.steh.bokeh.tam"), self.tab.url)
        caches = self.tab.evaluate("caches.keys()")
        self.assertIn("andere-app", caches)
        self.assertNotIn("a6400-v3", caches)
        self.assertEqual(self.tab.evaluate("""async () =>
            (await (await caches.open('a6400-v2')).keys()).map(r => new URL(r.url).pathname)
        """), ["/andere/index.html"])
        self.http.offline = True
        self.assertTrue(installed.reload().from_service_worker)
        expect(installed.locator("#steps li").first).to_be_visible()


if __name__ == "__main__":
    unittest.main(verbosity=2)
