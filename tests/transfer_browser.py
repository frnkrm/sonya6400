"""Profil von der statischen App zur lokalen USB-Oberfläche. Das CLI in diesem
Test liefert kontrollierte Antworten. Es greift auf keine Systemkamera zu."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

from playwright.sync_api import expect

from browser_case import BrowserCase


ROOT = Path(__file__).resolve().parents[1]
USB_FIXTURE = """#!/usr/bin/env python3
import json, os, sys
from pathlib import Path

root = Path(os.environ["CAMERA_FIXTURE"])
args = sys.argv[1:]
state = json.loads((root / "state").read_text())
def widget(path, value, choices=()):
    print("/main/" + path, "Type: " + ("RADIO" if choices else "TEXT"),
          "Readonly: 0", "Current: " + value, sep="\\n")
    for i, option in enumerate(choices):
        print(f"Choice: {i} {option}")
    print("END")

if args == ["--auto-detect"]:
    print("Model                          Port", "----------------------------------",
          "Sony Alpha-A6400                usb:001,002", sep="\\n")
elif args == ["--port", "usb:001,002", "--list-all-config"]:
    widget("status/cameramodel", "ILCE-6400")
    widget("status/serialnumber", "fixture")
    widget("capturesettings/expprogram", "M", ["A", "M"])
    for name, options in {"imgsettings/iso":["100", "200", "Auto"],
                          "capturesettings/f-number":["4", "8"],
                          "capturesettings/shutterspeed":["1/60", "1"]}.items():
        widget(name, state[name], options)
elif args[:3] == ["--port", "usb:001,002", "--set-config-value"]:
    key, value = args[3].removeprefix("/main/").split("=")
    assert key in state
    if key == "capturesettings/f-number" and (root / "reject-aperture").exists():
        print("Not a valid choice", file=sys.stderr)
        sys.exit(1)
    state[key] = value
    (root / "state").write_text(json.dumps(state))
    with (root / "writes").open("a") as f:
        print(key, value, file=f)
else:
    sys.exit(2)
"""


class TransferFlow(BrowserCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        tmp = tempfile.TemporaryDirectory()
        cls.addClassCleanup(tmp.cleanup)
        cls.fixture = Path(tmp.name)
        cli = cls.fixture / "gphoto2"
        cli.write_text(USB_FIXTURE)
        cli.chmod(0o700)
        env = dict(os.environ, CAMERA_FIXTURE=tmp.name, PATH=tmp.name + os.pathsep + os.environ["PATH"])
        proc = subprocess.Popen(
            ["node", "-e", "const s=require('./local/server.js').createApp();"
             "s.listen(0,'127.0.0.1',()=>console.log(s.address().port))"],
            cwd=ROOT, env=env, stdout=subprocess.PIPE, text=True
        )
        def stop():
            proc.terminate()
            proc.wait(timeout=5)
            proc.stdout.close()
        cls.addClassCleanup(stop)
        cls.companion = f"http://127.0.0.1:{int(proc.stdout.readline())}/"

    def setUp(self):
        self.context = self.browser.new_context(viewport={"width": 320, "height": 740})
        self.addCleanup(self.context.close)
        self.page = self.context.new_page()
        self.errors = []
        self.page.on("pageerror", lambda err: self.errors.append(str(err)))

    def tearDown(self):
        self.assertEqual(self.errors, [])

    def open_panel(self, url):
        self.page.goto(url)
        summary = self.page.locator("#transfer-panel > summary")
        summary.focus()
        summary.press("Enter")
        expect(self.page.locator("#transfer-export")).to_be_visible()
        expect(self.page.locator("#transfer-apply")).to_be_disabled()

    def reset_camera(self):
        state = self.fixture / "state"
        state.write_text(json.dumps({"imgsettings/iso": "200", "capturesettings/f-number": "4",
                                     "capturesettings/shutterspeed": "1/60"}))
        writes = self.fixture / "writes"
        writes.unlink(missing_ok=True)
        return state, writes

    def test_export_to_companion_read_explicit_apply_and_readback(self):
        self.open_panel(self.url + "#s=landscape.tag.steh.sweet.tam&scene=water&water=soft&support=tripod")
        # Der statische Entwicklungsserver und die lokale Anwendung haben verschiedene Origins.
        readable = self.page.evaluate("""async base => {
            try { return (await fetch(base + "api/session")).ok; }
            catch { return false; }
        }""", self.companion)
        self.assertFalse(readable)
        with self.page.expect_download() as pending:
            self.page.locator("#transfer-export").click()
        file = self.fixture / "aufnahme.json"
        pending.value.save_as(file)
        target = json.loads(file.read_text())
        self.assertEqual((target["mode"], target["iso"], target["aperture"], target["shutter"]),
                         ("M", {"kind": "fixed", "value": 100}, 8, {"kind": "fixed", "seconds": 1}))
        state, writes = self.reset_camera()
        self.open_panel(self.companion + "#s=portrait.tag.steh.bokeh.tam")
        self.page.locator("#transfer-import").set_input_files(file)
        expect(self.page.locator("#transfer-profile")).to_contain_text("Modus M")
        with self.page.expect_download() as imported_export:
            self.page.locator("#transfer-export").click()
        self.assertEqual(json.loads(Path(imported_export.value.path()).read_text()), target)
        self.page.locator("#transfer-source").select_option("usb")
        self.page.locator("#transfer-read").click()
        expect(self.page.locator("#transfer-apply")).to_be_enabled()
        self.assertFalse(writes.exists())
        self.page.locator("#transfer-apply").press("Enter")
        expect(self.page.locator("#transfer-status")).to_contain_text("bestätigt", ignore_case=True)
        self.assertEqual(len(writes.read_text().splitlines()), 3)
        self.assertEqual(json.loads(state.read_text()), {"imgsettings/iso": "100", "capturesettings/f-number": "8",
                                                       "capturesettings/shutterspeed": "1"})
        self.assertEqual(self.page.locator("#transfer-rows").inner_text().count("Rücklesung bestätigt"), 3)
        expect(self.page.locator("#transfer-apply")).to_be_disabled()
        self.assertTrue(self.page.evaluate("document.documentElement.scrollWidth <= innerWidth"))

    def test_rejected_aperture_after_confirmed_iso(self):
        state, writes = self.reset_camera()
        reject = self.fixture / "reject-aperture"
        reject.touch()
        self.addCleanup(reject.unlink)
        self.open_panel(self.companion + "#s=landscape.tag.steh.sweet.tam&scene=water&water=soft")
        self.page.locator("#transfer-source").select_option("usb")
        self.page.locator("#transfer-read").click()
        self.page.locator("#transfer-apply").click()
        expect(self.page.locator("#transfer-status")).to_contain_text("Teilweise übernommen")
        rows = self.page.locator("#transfer-rows section")
        expect(rows.nth(0)).to_contain_text("Rücklesung bestätigt")
        expect(rows.nth(1)).to_contain_text("Abgewiesen")
        expect(rows.nth(2)).to_contain_text("Übersprungen")
        self.assertEqual(writes.read_text().splitlines(), ["imgsettings/iso 100"])
        self.assertEqual(json.loads(state.read_text())["capturesettings/f-number"], "4")
        expect(self.page.locator("#transfer-apply")).to_be_disabled()

    def test_invalid_file_and_offline_simulation(self):
        page = self.page
        self.open_panel(self.url + "#s=landscape.tag.steh.sweet.tam")
        page.wait_for_function("!!navigator.serviceWorker.controller")
        self.context.set_offline(True)
        self.assertTrue(page.reload().from_service_worker)
        page.locator("#transfer-panel > summary").click()
        page.locator("#transfer-import").set_input_files(
            {"name": "falsch.json", "mimeType": "application/json", "buffer": b'{"version":9}'}
        )
        expect(page.locator("#transfer-status")).to_contain_text("abgelehnt")
        expect(page.locator("#transfer-read")).to_be_disabled()
        page.locator("#transfer-current").click()
        page.locator("#transfer-mode").select_option("M")
        page.locator("#transfer-read").click()
        expect(page.locator("#transfer-manual")).to_contain_text("Moduswahlrad")
        expect(page.locator("#transfer-apply")).to_be_disabled()
        page.locator("#transfer-mode").select_option("A")
        page.locator("#transfer-read").click()
        expect(page.locator("#transfer-status")).to_contain_text("Simulation")
        page.locator("#transfer-apply").click()
        expect(page.locator("#transfer-status")).to_contain_text("bestätigt", ignore_case=True)
        expect(page.locator("#transfer-manual")).to_contain_text("Auto-ISO-Grenzen")
        expect(page.locator("#steps")).to_contain_text("f/8")


if __name__ == "__main__":
    unittest.main()
