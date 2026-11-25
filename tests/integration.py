"""Integrierte Abläufe vom Kompass über Speicherplätze bis zur Offline-PNG."""
from pathlib import Path
import struct
import unittest
from playwright.sync_api import expect
from browser_case import BrowserCase


class CompassFlow(BrowserCase):
    def setUp(self):
        self.context = self.browser.new_context(viewport={"width": 360, "height": 740})
        self.addCleanup(self.context.close)
        self.page = self.context.new_page()
        self.errors = []
        self.page.on("pageerror", lambda err: self.errors.append(str(err)))

    def tearDown(self):
        self.assertEqual(self.errors, [])

    def test_slot_uses_current_compass_and_preserves_checks(self):
        page = self.page
        page.goto(self.url + "#s=gruppe.nacht.geh.bokeh.t210&mm=210")
        hud = page.locator("#hud")
        hud.get_by_text("Alle Einstellungen und Hinweise", exact=True).click()
        values = hud.locator("table tr").evaluate_all(
            "(rows) => Object.fromEntries(rows.map(row => [...row.cells].map(td => td.textContent)))"
        )
        self.assertEqual(values["Blende"], "f/6.3")
        self.assertEqual(values["Brennweite"], "210 mm")
        for name in ("Tasten", "Wissen", "Lightroom", "Slots"):
            page.get_by_role("button", name=name, exact=True).click()
        slot = page.locator("#slots .card").filter(has_text="Aktuelle Auswahl")
        expect(slot).to_have_count(1)
        for key in ("Blende", "ISO", "Drive", "Weißabgleich", "Brennweite"):
            expect(slot).to_contain_text(values[key])
        checkbox = slot.locator("input").first
        checkbox.check()
        page.reload()
        expect(checkbox).to_be_checked()
        expect(page.locator("nav [aria-current=page]")).to_contain_text("Slots")
        page.get_by_role("button", name="Alle Haken zurücksetzen").click()
        expect(checkbox).not_to_be_checked()
        page.get_by_role("button", name="Kompass").click()
        page.locator("#bagb").click()
        page.locator("#mdx").focus()
        page.keyboard.press("Tab")
        expect(page.locator("#mdb input").first).to_be_focused()
        page.keyboard.press("Escape")
        expect(page.locator("#bagb")).to_be_focused()
        self.assertLessEqual(page.evaluate("document.documentElement.scrollWidth"), 360)

    def test_offline_landscape_export_matches_display(self):
        page = self.page
        page.add_init_script("""{
          const draw = CanvasRenderingContext2D.prototype.fillText;
          window.cardText = [];
          CanvasRenderingContext2D.prototype.fillText = function(...args) {
            window.cardText.push(String(args[0]));
            return draw.apply(this, args);
          };
        }""")
        page.goto(self.url + "#s=landscape.tag.steh.sweet.tam&mm=70&scene=water&wind=strong&priority=leaves&format=jpeg")
        page.wait_for_function("navigator.serviceWorker.controller !== null")
        self.context.set_offline(True)
        response = page.reload()
        self.assertTrue(response.ok and response.from_service_worker)
        expect(page.locator("#hud")).to_contain_text("1/500 s")
        expect(page.locator("#steps")).to_contain_text("JPEG")
        page.get_by_role("button", name="Einstellung teilen").click()
        expect(page.get_by_role("dialog")).to_be_visible()
        expected = ["1/500 s", "f/8", "70 mm", "JPEG", "M"]
        labels = page.evaluate("window.cardText")
        for label in expected:
            self.assertIn(label, labels)
        self.assertIn("Vorrang: Scharfe Blätter", " ".join(labels))
        with page.expect_download() as pending:
            page.get_by_role("button", name="Bild speichern").click()
        download = pending.value
        png = Path(download.path()).read_bytes()
        self.assertEqual(png[:8], b"\x89PNG\r\n\x1a\n")
        self.assertEqual(struct.unpack(">II", png[16:24]), (1080, 1350))
        self.assertGreater(len(png), 30_000)
        page.keyboard.press("Escape")
        expect(page.locator("#shb")).to_be_focused()
        page.set_viewport_size({"width": 740, "height": 360})
        page.locator("#guide-scene").select_option("stars")
        expect(page.locator("#steps")).to_contain_text("Fokuslupe")
        self.assertTrue(page.evaluate("document.documentElement.scrollWidth <= innerWidth"))


if __name__ == "__main__":
    unittest.main()
