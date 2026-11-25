"""Bedienung der Aufnahmehilfen in der integrierten App mit Chromium."""

import functools
import os
import shutil
import threading
import unittest
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


class PhotoToolsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root = Path(__file__).resolve().parents[1]

        class Handler(SimpleHTTPRequestHandler):
            def log_message(self, *_args):
                pass

        server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=root))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        cls.addClassCleanup(server.server_close)
        cls.addClassCleanup(server.shutdown)
        cls.url = f"http://127.0.0.1:{server.server_port}/#s=landscape.tag.steh.sweet.tam"
        playwright = sync_playwright().start()
        cls.addClassCleanup(playwright.stop)
        cls.browser = playwright.chromium.launch(
            executable_path=os.environ.get("CHROMIUM_PATH") or shutil.which("chromium")
        )
        cls.addClassCleanup(cls.browser.close)

    def setUp(self):
        self.context = self.browser.new_context(viewport={"width": 360, "height": 800}, service_workers="block")
        self.addCleanup(self.context.close)
        self.page = self.context.new_page()
        self.errors = []
        self.page.on("pageerror", lambda error: self.errors.append(str(error)))
        self.page.goto(self.url)
        summary = self.page.locator(".photo-workbench > summary")
        summary.focus()
        summary.press("Enter")
        expect(self.field("tool")).to_be_visible()

    def tearDown(self):
        self.assertEqual(self.errors, [])

    def field(self, name):
        return self.page.locator("#pt-" + name)

    def test_format_hdr_and_brackets(self):
        expect(self.field("contrast").locator('[value="hdr"]')).to_have_js_property("disabled", True)
        self.field("format").select_option("jpeg")
        expect(self.page.locator("#hud .bd")).to_contain_text("JPEG")
        expect(self.page.locator("#steps")).to_contain_text("JPEG")
        self.field("contrast").select_option("hdr")
        self.field("moving").check()
        expect(self.field("hdr-result")).to_contain_text("Doppelkonturen")
        self.field("format").select_option("rawjpeg")
        expect(self.field("contrast")).to_have_value("bracket")
        expect(self.field("contrast").locator('[value="hdr"]')).to_have_js_property("disabled", True)
        self.field("iso").select_option("auto")
        expect(self.field("hdr-result")).to_contain_text("variiert die ISO")
        self.field("bits").locator("summary").click()
        expect(self.field("bits")).to_contain_text("12 Bit")

    def test_shutter_and_bulb_phases(self):
        self.field("tool").select_option("shutter")
        for value, phrase in (("bands", "Lautlose Aufnahme ausschalten"), ("rolling", "bewegte Formen"),
                              ("bokeh", "ersten Verschlussvorhang")):
            self.field("effect").select_option(value)
            expect(self.field("shutter-result")).to_contain_text(phrase)
        self.field("silent").check()
        expect(self.field("start")).to_be_disabled()
        self.field("silent").uncheck()
        self.field("drive").select_option("hdr")
        expect(self.field("start")).to_be_disabled()
        self.field("drive").select_option("single")
        self.field("bulb").fill("10")
        self.field("noise").check()
        self.page.clock.install()
        self.field("start").click()
        expect(self.field("clock")).to_contain_text("Belichtung")
        self.page.clock.fast_forward(10000)
        expect(self.field("clock")).to_contain_text("Rauschminderung")
        self.page.clock.fast_forward(10000)
        expect(self.field("clock")).to_contain_text("beendet")

    def test_filter_and_interval(self):
        self.field("tool").select_option("filter")
        expect(self.field("nd-result")).to_contain_text("0,512 s")
        expect(self.field("thread")).to_contain_text("67 mm")
        self.page.locator('#f-lens [data-value="s50"]').click()
        expect(self.field("thread")).to_contain_text("49 mm")
        self.field("direction").select_option("reverse")
        self.field("target").fill("0,512")
        expect(self.field("nd-result")).to_contain_text("6 ND-Stufen")
        self.field("base").fill("0")
        expect(self.field("nd-result")).to_contain_text("positive Ausgangszeit")
        self.field("tool").select_option("interval")
        expect(self.field("interval-result")).to_contain_text("4,8 s")
        self.field("exposure").fill("6")
        expect(self.field("interval-result")).to_contain_text("Intervall verlängern")

    def test_depth_and_diagnosis(self):
        self.field("tool").select_option("depth")
        expect(self.field("depth-result")).to_contain_text("17 mm")
        self.field("circle").fill("0,025")
        expect(self.field("depth-result")).to_contain_text("0,025 mm Toleranz")
        self.field("tool").select_option("diagnosis")
        for symptom, answer in (("all", "Verwacklung"), ("leaves", "Motiv"), ("focus", "Fokusfeld"),
                                ("near", "Abstand"), ("sky", "Histogramm")):
            self.field("symptom").select_option(symptom)
            expect(self.field("answer")).to_have_value("")
            self.field("answer").select_option("yes")
            expect(self.field("advice")).to_contain_text(answer)
        self.assertTrue(self.page.evaluate("document.documentElement.scrollWidth <= innerWidth"))


if __name__ == "__main__":
    unittest.main()
