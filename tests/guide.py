"""Landschaftseingaben, Objektivgrenzen und Checkliste im Chromium prüfen."""

import unittest

from playwright.sync_api import expect

from browser_case import BrowserCase


class GuideTests(BrowserCase):
    def setUp(self):
        context = self.browser.new_context(
            service_workers="block", viewport={"width": 320, "height": 720},
        )
        self.addCleanup(context.close)
        self.page = context.new_page()
        self.errors = []
        self.page.on("pageerror", lambda error: self.errors.append(str(error)))

    def tearDown(self):
        self.assertEqual(self.errors, [])

    def open(self, lens="tam"):
        self.page.goto(self.url + "#s=landscape.tag.steh.sweet." + lens)
        expect(self.page.locator("#guide-scene")).to_be_visible()

    def select(self, name, value):
        self.page.locator("#guide-" + name).select_option(value)

    def test_mountain_focus_framing_and_tripod(self):
        self.open()
        page = self.page
        expect(page.locator("#f-look")).to_be_hidden()
        expect(page.locator("#steps")).to_contain_text("AF-S")
        expect(page.locator("#hud")).to_contain_text("1/125 s")
        page.get_by_text("Warum diese Startwerte?", exact=True).click()
        expect(page.locator("#guide-framing")).to_contain_text("17 mm")
        expect(page.locator("#guide-profile")).to_contain_text("B070")
        expect(page.locator("#guide-sources a").first).to_have_attribute(
            "href", "https://www.tamron.com/global/consumer/lenses/b070/spec.html",
        )
        self.select("depth", "near")
        expect(page.locator("#steps")).to_contain_text("f/11")
        expect(page.locator("#steps")).to_contain_text("Vordergrund")
        expect(page.locator("#guide-framing")).to_contain_text("Naheinstellgrenze")
        self.select("scene", "detail")
        expect(page.locator("#guide-framing")).to_contain_text("210 mm")
        self.select("support", "tripod")
        expect(page.locator("#hud")).to_contain_text("Selbstauslöser")
        expect(page.locator("#guide-stability")).to_contain_text("ausschalten")
        self.select("support", "hand")
        expect(page.locator("#guide-stability")).to_contain_text("einschalten")

    def test_wind_water_stars_and_keyboard_checklist(self):
        self.open()
        page = self.page
        self.select("scene", "water")
        expect(page.locator("#guide-priority")).to_be_hidden()
        self.select("wind", "strong")
        expect(page.locator("#guide-priority")).to_be_visible()
        expect(page.locator("#hud")).to_contain_text("Blätter")
        time = page.locator("#hud .ex span").nth(1)
        expect(time).to_have_text("1 s")
        self.select("priority", "leaves")
        expect(time).to_have_text("1/500 s")
        self.select("water", "frozen")
        expect(time).to_have_text("1/1000 s")
        expect(page.locator("#guide-priority")).to_be_hidden()
        self.select("scene", "stars")
        expect(page.locator("#steps")).to_contain_text("Fokuslupe")
        expect(page.locator("#steps")).to_contain_text("MF")
        summary = page.get_by_text("Checkliste vor Ort", exact=True)
        summary.focus()
        summary.press("Enter")
        summary.press("Tab")
        box = page.locator("#guide-checklist input").first
        expect(box).to_be_focused()
        box.press("Space")
        expect(box).to_be_checked()
        self.assertTrue(page.evaluate("document.documentElement.scrollWidth <= innerWidth"))

    def test_zoom_input_error_and_tele_aperture(self):
        self.open("t210")
        page = self.page
        focal = page.locator("#guide-mm")
        focal.fill("210")
        focal.press("Tab")
        expect(page.locator("#guide-mm-description")).to_contain_text("315 mm")
        expect(page.locator("#steps")).to_contain_text("210 mm")
        focal.fill("211")
        focal.press("Tab")
        expect(page.locator("#guide-mm-error")).to_contain_text("55 bis 210 mm")
        expect(page.locator("#steps")).to_contain_text("210 mm")
        page.get_by_text("Warum diese Startwerte?", exact=True).click()
        page.locator("#guide-aperture").fill("4.5")
        result = page.locator("#guide-aperture-result")
        expect(result).to_contain_text("Außerhalb")
        focal.fill("100")
        focal.press("Tab")
        expect(result).to_contain_text("unbekannt")
        expect(page.locator("#guide-aperture-note")).to_be_visible()

    def test_prime_aperture_and_scenario_specific_exposure(self):
        self.open("sg30")
        page = self.page
        expect(page.locator("#guide-mm")).to_have_attribute("readonly", "")
        page.get_by_text("Warum diese Startwerte?", exact=True).click()
        page.locator("#guide-aperture").fill("22")
        expect(page.locator("#guide-aperture-result")).to_contain_text("Außerhalb")
        self.select("scene", "sun")
        expect(page.locator("#steps")).to_contain_text("Belichtungsreihe")
        self.select("scene", "snow")
        expect(page.locator("#steps")).to_contain_text("Helle Details")


if __name__ == "__main__":
    unittest.main()
