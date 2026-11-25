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
            ["node", "-e", "const fs=require('node:fs'); const dir=process.env.CAMERA_FIXTURE;"
             "const {createApp}=require('./local/server.js'); const singleTests=[undefined, async () => {"
             "fs.appendFileSync(dir+'/native-reads', 'read\\n');"
             "if(fs.existsSync(dir+'/native-error'))throw Error('Kamera getrennt.');"
             "if(fs.existsSync(dir+'/native-result'))return JSON.parse(fs.readFileSync(dir+'/native-result','utf8'));"
             "return {model:'ILCE-6400',iso:400}; }, async key => {"
             "if(key!=='ab'.repeat(32))throw Error('Schlüssel passt nicht.');"
             "fs.appendFileSync(dir+'/native-steps', 'step\\n');"
             "if(fs.existsSync(dir+'/step-error'))throw Error('Rücklesung fehlgeschlagen.');"
             "return {model:'ILCE-6400',iso:500}; }, async field => {"
             "const data=JSON.parse(fs.readFileSync(dir+'/exposure-reading','utf8'));"
             "return {model:'ILCE-6400',field,...data}; }, async (field,key) => {"
             "if(key!=='ab'.repeat(32))throw Error('Schlüssel passt nicht.');"
             "fs.appendFileSync(dir+'/exposure-steps', field+'\\n');"
             "if(fs.existsSync(dir+'/other-aperture'))return {model:'ILCE-6400',field,value:1100};"
             "return {model:'ILCE-6400',field,value:field==='aperture'?900:2*65536+320}; }];"
             """
             const snapshot = {
                 source: 'usb', id: 'windows-profile-fixture', model: 'ILCE-6400', mode: 'M',
                 fields: {
                     iso: {current: 200, choices: [200, 'auto'], writable: true},
                     aperture: {current: 4, choices: [], relative: true, writable: true},
                     shutter: {current: 1/60, choices: [1/60, 1/125], writable: true}
                 }
             };
             const profileAdapter = {
                 read: async () => structuredClone(snapshot),
                 async write(field, value) {
                     snapshot.fields[field].current = value;
                     fs.appendFileSync(dir + '/profile-writes', field + ' ' + value + '\\n');
                 }
             };
             const servers = [createApp(...singleTests), createApp(...singleTests, profileAdapter)];
             Promise.all(servers.map(server => new Promise(resolve =>
                 server.listen(0, '127.0.0.1', () => resolve(server.address().port)))
             )).then(ports => console.log(ports.join(' ')));
             """],
            cwd=ROOT, env=env, stdout=subprocess.PIPE, text=True
        )
        def stop():
            proc.terminate()
            proc.wait(timeout=5)
            proc.stdout.close()
        cls.addClassCleanup(stop)
        legacy_port, windows_port = map(int, proc.stdout.readline().split())
        cls.companion = f"http://127.0.0.1:{legacy_port}/"
        cls.windows_companion = f"http://127.0.0.1:{windows_port}/"

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

    def test_usb_iso_single_write_then_full_profile(self):
        state, writes = self.reset_camera()
        self.open_panel(self.companion + "#s=landscape.tag.steh.sweet.tam&scene=water&water=soft")
        page = self.page
        page.locator("#transfer-source").select_option("usb")
        expect(page.get_by_role("link", name="Windows-Anleitung")).to_be_visible()
        button = page.get_by_role("button", name="Nur ISO übertragen")
        expect(button).to_be_disabled()
        page.locator("#transfer-read").click()
        expect(button).to_be_enabled()
        button.press("Enter")
        expect(page.locator("#transfer-status")).to_contain_text("USB · ISO-Einzeltest · Bestätigt")
        rows = page.locator("#transfer-rows section")
        expect(rows).to_have_count(1)
        expect(rows).to_contain_text("Rücklesung bestätigt")
        self.assertEqual(writes.read_text().splitlines(), ["imgsettings/iso 100"])
        self.assertEqual(json.loads(state.read_text()), {
            "imgsettings/iso":"100", "capturesettings/f-number":"4", "capturesettings/shutterspeed":"1/60"
        })
        page.locator("#transfer-read").click()
        expect(button).to_be_disabled()
        expect(page.locator("#transfer-apply")).to_be_enabled()

    def test_windows_profile_import_preview_and_confirmed_write(self):
        self.open_panel(self.windows_companion)
        page = self.page
        target = {
            "version": 1, "model": "ILCE-6400", "mode": "M", "lens": "tam",
            "focalMm": 17, "aperture": 3.5, "iso": {"kind": "auto", "min": 100, "max": 12800},
            "shutter": {"kind": "fixed", "seconds": 1/125}
        }
        page.locator("#transfer-import").set_input_files({
            "name": "a6400-M-17mm.json", "mimeType": "application/json", "buffer": json.dumps(target).encode()
        })
        expect(page.locator("#transfer-status")).to_contain_text("Dateiprofil geladen")
        page.locator("#transfer-source").select_option("usb")
        transport = page.get_by_label("USB-Zugriff")
        expect(transport).to_have_value("windows")
        read = page.get_by_role("button", name="Windows-Istwerte lesen")
        apply = page.get_by_role("button", name="Einstellungen übertragen")
        expect(page.locator("#transfer-native-help")).to_be_hidden()
        expect(page.locator("#transfer-windows-step")).to_be_hidden()
        read.click()
        expect(page.locator("#transfer-device")).to_contain_text("Windows · ILCE-6400 · Modus M")
        rows = page.locator("#transfer-rows")
        self.assertEqual(rows.inner_text().count("Übertragbar"), 2)
        expect(rows.locator("section").nth(1)).to_contain_text("In Kamerastufen versuchen")
        expect(page.locator("#transfer-manual")).to_contain_text("Auto-ISO-Grenzen 100–12800")
        writes = self.fixture / "profile-writes"
        self.assertFalse(writes.exists())

        # Ein Wechsel zum Einzeltest oder zu WSL verwirft die Profilvorschau.
        transport.select_option("tests")
        expect(page.locator("#transfer-windows")).to_be_visible()
        expect(apply).to_be_hidden()
        transport.select_option("gphoto")
        expect(page.get_by_role("button", name="USB-Istwerte lesen")).to_be_visible()
        expect(apply).to_be_disabled()
        transport.select_option("windows")
        expect(apply).to_be_disabled()
        read.click()
        delayed = []
        page.route("**/api/apply", lambda route: delayed.append(route))
        with page.expect_request("**/api/apply"):
            apply.press("Enter")
        expect(page.locator("#transfer-status")).to_contain_text("Jede Kamerastufe wird zurückgelesen")
        expect(apply).to_be_disabled()
        delayed[0].continue_()
        expect(page.locator("#transfer-status")).to_contain_text("Windows · Bestätigt übernommen")
        self.assertEqual(rows.inner_text().count("Rücklesung bestätigt"), 3)
        self.assertEqual(writes.read_text().splitlines(), ["iso auto", "aperture 3.5", "shutter 0.008"])
        expect(apply).to_be_disabled()
        read.click()
        expect(page.locator("#transfer-status")).to_contain_text("Windows-Istwerte gelesen")
        self.assertEqual(rows.inner_text().count("Bereits eingestellt"), 3)
        expect(apply).to_be_disabled()
        self.assertTrue(page.evaluate("document.documentElement.scrollWidth <= innerWidth"))

    def test_native_windows_read_does_not_authorize_writes(self):
        state, writes = self.reset_camera()
        self.open_panel(self.companion + "#s=landscape.tag.steh.sweet.tam&scene=water")
        page = self.page
        button = page.get_by_role("button", name="ISO über Windows lesen")
        expect(button).to_be_hidden()
        page.locator("#transfer-source").select_option("usb")
        expect(button).to_be_visible()
        reads = self.fixture / "native-reads"
        self.assertFalse(reads.exists())
        page.locator("#transfer-read").click()
        expect(page.locator("#transfer-apply")).to_be_enabled()
        button.press("Enter")
        expect(page.locator("#transfer-status")).to_contain_text("Sony ILCE-6400 · ISO 400")
        expect(page.locator("#transfer-iso")).to_be_disabled()
        expect(page.locator("#transfer-apply")).to_be_disabled()
        self.assertEqual(reads.read_text().splitlines(), ["read"])
        self.assertFalse(writes.exists())
        self.assertEqual(json.loads(state.read_text())["imgsettings/iso"], "200")
        fixture = self.fixture / "native-result"
        self.addCleanup(fixture.unlink, missing_ok=True)
        for reading, label in [
            ({"iso": 400, "stepBlock": "access"}, "keine Schreibfreigabe für ISO"),
            ({"iso": 400, "stepBlock": "choices"}, "nicht als eindeutige nächste Stufe"),
            ({"iso": 400, "stepBlock": "mode"}, "keinen Fotomodus M"),
            ({"iso": "auto", "mode": "mfnr"}, "ISO Auto · Mehrbild-Rauschminderung ·"),
            ({"iso": 409600, "mode": "mfnrPlus"}, "ISO 409.600 · Mehrbild-Rauschminderung Plus ·"),
            ({"iso": 400, "mode": "unknown", "rawIso": "0xA5000190"}, "ISO 400 · Modus unbekannt · Rohwert 0xA5000190"),
            ({"iso": "auto", "mode": "unknown", "rawIso": "0xA5FFFFFF"}, "ISO Auto · Modus unbekannt · Rohwert 0xA5FFFFFF"),
            ({"iso": None, "rawIso": "0xFA01F0C3"}, "Kamera hat geantwortet · ISO-Zuordnung offen · Rohwert 0xFA01F0C3"),
        ]:
            with self.subTest(reading=reading):
                fixture.write_text(json.dumps({"model": "ILCE-6400", **reading}))
                button.click()
                expect(page.locator("#transfer-status")).to_contain_text(label)
                expect(page.locator("#transfer-iso")).to_be_disabled()
                expect(page.locator("#transfer-apply")).to_be_disabled()
                self.assertFalse(writes.exists())
        fail = self.fixture / "native-error"
        fail.touch()
        self.addCleanup(fail.unlink)
        button.click()
        expect(page.locator("#transfer-status")).to_contain_text("Windows-Lesetest: Kamera getrennt")
        expect(page.locator("#transfer-status")).not_to_contain_text("ISO 400")
        expect(page.locator("#transfer-apply")).to_be_disabled()
        page.locator("#transfer-source").select_option("simulation")
        expect(button).to_be_hidden()

    def test_windows_step_requires_fresh_read_and_deliberate_click(self):
        self.open_panel(self.companion)
        page = self.page
        page.locator("#transfer-source").select_option("usb")
        read = page.get_by_role("button", name="ISO über Windows lesen")
        step = page.get_by_role("button", name="ISO von 400 auf 500 ändern")
        status = page.locator("#transfer-status")
        expect(step).to_be_disabled()
        read.click()
        expect(status).to_contain_text("optionale Schreibtest")
        expect(step).to_be_disabled()
        result = self.fixture / "native-result"
        self.addCleanup(result.unlink, missing_ok=True)
        result.write_text(json.dumps({"model": "ILCE-6400", "iso": 400, "stepKey": "ab" * 32}))
        calls = self.fixture / "native-steps"
        read.click()
        expect(step).to_be_enabled()
        self.assertFalse(calls.exists())
        step.press("Enter")
        expect(status).to_contain_text("ISO 500 bestätigt zurückgelesen")
        expect(step).to_be_disabled()
        fail = self.fixture / "step-error"
        fail.touch()
        self.addCleanup(fail.unlink, missing_ok=True)
        read.click()
        step.click()
        expect(status).to_contain_text("ISO-Schritt unbestätigt")
        expect(status).to_contain_text("erneut lesen")
        expect(step).to_be_disabled()
        result.write_text(json.dumps({"model": "ILCE-6400", "iso": 500}))
        read.click()
        expect(status).to_contain_text("ISO 500 · gelesen")
        expect(step).to_be_disabled()
        self.assertEqual(calls.read_text().splitlines(), ["step", "step"])

        # Eine inzwischen geänderte Empfehlung erhält das Ergebnis als früheren Auftrag.
        fail.unlink()
        result.write_text(json.dumps({"model": "ILCE-6400", "iso": 400, "stepKey": "ab" * 32}))
        read.click()
        expect(step).to_be_enabled()
        delayed = []
        page.route("**/api/windows-iso-step", lambda route: delayed.append(route))
        with page.expect_request("**/api/windows-iso-step"):
            step.click()
        page.locator('#f-lens [data-value="s50"]').click()
        delayed[0].fulfill(response=delayed[0].fetch())
        expect(status).to_contain_text("Ergebnis des vorherigen Windows-Schritts")
        expect(page.locator("#transfer-history")).to_contain_text("ISO 500 bestätigt zurückgelesen")
        expect(step).to_be_disabled()

    def test_windows_aperture_and_shutter_steps(self):
        page = self.page
        self.open_panel(self.companion)
        page.locator("#transfer-source").select_option("usb")
        picker = page.get_by_label("Windows-Test")
        status = page.locator("#transfer-status")
        read = page.locator("#transfer-windows")
        step = page.locator("#transfer-windows-step")
        reading = self.fixture / "exposure-reading"
        self.addCleanup(reading.unlink, missing_ok=True)
        log = self.fixture / "exposure-steps"
        self.addCleanup(log.unlink, missing_ok=True)
        calls = []
        for field, start, display, button, target in [
            ("aperture", 800, "Blende f/8", "Blende ab f/8 um eine Stufe schließen", "f/9"),
            ("shutter", 2 * 65536 + 250, "Belichtungszeit 1/125 s",
             "Belichtungszeit ab 1/125 s um eine Stufe verkürzen", "1/160 s"),
        ]:
            with self.subTest(field=field):
                picker.select_option(field)
                expect(step).to_have_text(button)
                expect(step).to_be_disabled()
                reading.write_text(json.dumps({"value": start, "stepKey": "ab" * 32}))
                read.click()
                expect(status).to_contain_text(display)
                expect(step).to_be_enabled()
                self.assertEqual(log.read_text().splitlines() if log.exists() else [], calls)
                picker.select_option("iso")
                expect(step).to_be_disabled()
                picker.select_option(field)
                expect(step).to_be_disabled()
                read.click()
                expect(step).to_be_enabled()
                step.press("Enter")
                expect(status).to_contain_text(target + " bestätigt zurückgelesen")
                expect(step).to_be_disabled()
                expect(page.locator("#transfer-apply")).to_be_disabled()
                calls.append(field)
                self.assertEqual(log.read_text().splitlines(), calls)
        # Bei einem relativen Schritt kann die Kamera eine andere Stufe erreichen.
        # Allein die korrekte Rücklesung darf das Testziel bestätigen.
        other = self.fixture / "other-aperture"
        other.touch()
        self.addCleanup(other.unlink)
        reading.write_text(json.dumps({"value": 800, "stepKey": "ab" * 32}))
        picker.select_option("aperture")
        read.click()
        expect(step).to_be_enabled()
        step.click()
        expect(status).to_contain_text("Blendenschritt unbestätigt")
        expect(step).to_be_disabled()
        self.assertEqual(log.read_text().splitlines(), calls + ["aperture"])
        self.assertTrue(page.evaluate("document.documentElement.scrollWidth <= innerWidth"))

    def test_windows_exposure_read_and_blocked_reasons(self):
        self.open_panel(self.companion)
        page = self.page
        page.locator("#transfer-source").select_option("usb")
        picker = page.get_by_label("Windows-Test")
        reading = self.fixture / "exposure-reading"
        self.addCleanup(reading.unlink, missing_ok=True)
        for field, raw, block, expected, reason in [
            ("shutter", 0, "value", "BULB", "optionale Schreibtest"),
            ("shutter", 3 * 65536 + 2, "mode", "3/2 s", "keinen Fotomodus M"),
            ("shutter", 4 * 65536 + 2, "choices", "2 s", "Einzelschritt"),
            ("aperture", 280, "access", "f/2,8", "keine Schreibfreigabe"),
            ("aperture", None, "value", "nicht gemeldet", "optionale Schreibtest"),
        ]:
            with self.subTest(field=field, raw=raw):
                reading.write_text(json.dumps({"value": raw, "stepBlock": block}))
                picker.select_option(field)
                page.locator("#transfer-windows").click()
                status = page.locator("#transfer-status")
                expect(status).to_contain_text(expected)
                expect(status).to_contain_text(reason)
                expect(page.locator("#transfer-windows-step")).to_be_disabled()

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
