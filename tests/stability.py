"""Chromium regression tests for stored settings, links, keyboard and weather."""

import json
import unittest

from browser_case import BrowserCase
from playwright.sync_api import expect


class StabilityTests(BrowserCase):
    def setUp(self):
        self.context = self.browser.new_context(service_workers="block")
        self.addCleanup(self.context.close)
        self.page = self.context.new_page()
        self.errors = []
        self.page.on("pageerror", lambda error: self.errors.append(str(error)))
        # Real geolocation/fetch ordering is controlled by the test, including cancellation.
        self.page.add_init_script("""
          window.locations = [];
          Object.defineProperty(navigator, 'geolocation', {value: {
            getCurrentPosition(success, failure) { locations.push({success, failure}); }
          }});
        """)

    def tearDown(self):
        self.assertEqual(self.errors, [])

    def open(self, fragment="", storage=None):
        if storage:
            self.page.add_init_script(
                "Object.entries(" + json.dumps(storage) +
                ").forEach(([key, value]) => localStorage.setItem(key, value));"
            )
        self.page.goto(self.url + fragment)

    def active(self, group):
        return self.page.locator(f"#f-{group} [aria-pressed=true]").get_attribute("data-value")

    def weather_data(self, code=0):
        return {
            "current": {"time": "2026-11-25T12:00", "temperature_2m": 8,
                        "weather_code": code, "cloud_cover": 10},
            "daily": {"sunrise": ["2026-11-25T07:00"], "sunset": ["2026-11-25T17:00"]},
        }

    def send_location(self, index=-1):
        self.page.evaluate("i => { locations.at(i).success({coords: {latitude: 52, longitude: 13}}); }", index)

    def test_broken_storage_and_invalid_hash(self):
        self.open("#s=constructor.tag.steh.bokeh.tam", {"st": "{", "bag": '["unknown"]', "tab": "hud"})
        expect(self.page.locator("#hud .ex")).to_be_visible()
        self.assertEqual(self.active("motiv"), "street")
        self.assertEqual(self.active("lens"), "tam")
        self.assertEqual(self.page.evaluate("locations.length"), 1)

    def test_partial_state_safe_bag_and_legacy_checklist(self):
        self.open(storage={"bag": '["s50","s50","invalid"]', "tab": "t2", "ck4_3": "1",
                           "st": '{"motiv":"gruppe","licht":"nacht","lens":"bad","look":7}'})
        expect(self.page.locator("#t2")).to_be_visible()
        expect(self.page.locator('[data-k="ck4_3"]')).to_be_checked()
        self.assertEqual(self.active("motiv"), "gruppe")
        self.assertEqual(self.active("licht"), "nacht")
        self.assertEqual(self.active("look"), "sweet")
        self.assertEqual(self.active("lens"), "s50")
        expect(self.page.locator("#f-lens button")).to_have_count(1)

    def test_legacy_link(self):
        self.open("#s=portrait.wolke.steh.bokeh.sg30")
        self.assertEqual([self.active(k) for k in ("motiv","licht","bew","look","lens")],
                         ["portrait", "wolke", "steh", "bokeh", "sg30"])
        expect(self.page.locator("#steps li").first).to_be_visible()
        self.assertEqual(self.page.evaluate("locations.length"), 0)

    def test_shared_settings_open_compass_then_keep_edits_and_tab(self):
        self.open("#s=portrait.tag.steh.bokeh.sg30", {"tab": "t3", "bag": '["tam","s50"]'})
        expect(self.page.locator("#t1")).to_be_visible()
        self.page.locator('#f-licht [data-value="nacht"]').click()
        self.page.locator('nav [data-t="t4"]').click()
        self.page.reload()
        expect(self.page.locator("#t4")).to_be_visible()
        self.page.locator('nav [data-t="t1"]').click()
        self.assertEqual(self.active("licht"), "nacht")
        self.assertEqual(self.active("lens"), "sg30")
        self.page.locator("#bagb").click()
        expect(self.page.locator('[data-l="sg30"]')).not_to_be_checked()
        self.page.locator('[data-l="s50"]').uncheck()
        self.assertEqual(self.page.evaluate("JSON.parse(localStorage.bag)"), ["tam"])
        self.page.locator("#mdx").click()
        self.assertEqual(self.active("lens"), "sg30")

    def test_follow_link_in_same_tab_cancels_obsolete_measurement(self):
        self.open()
        self.page.locator('nav [data-t="t2"]').click()
        self.page.evaluate("location.hash='s=gruppe.nacht.geh.sweet.s50'")
        expect(self.page.locator("#t1")).to_be_visible()
        self.page.evaluate("locations[0].failure({code:1})")
        self.assertEqual(self.active("licht"), "nacht")
        self.assertEqual(self.active("motiv"), "gruppe")

    def test_extended_settings_link_round_trip(self):
        self.page.add_init_script("""
          Object.defineProperty(navigator,'clipboard',{value:{
            writeText(text){window.copied=text;return Promise.resolve()}
          }});
        """)
        self.open("#s=landscape.tag.steh.sweet.tam")
        focal = self.page.locator("#guide-mm")
        focal.fill("70")
        focal.press("Tab")
        expect(focal).to_have_value("70")
        self.page.locator("#shb").click()
        self.page.locator("#shl span").click()
        expect(self.page.locator("#shm")).to_contain_text("Link kopiert")
        link = self.page.evaluate("window.copied")
        self.assertIn("mm=70", link)
        # A different document has neither this tab's storage nor its DOM.
        other = self.browser.new_context(service_workers="block")
        try:
            page = other.new_page()
            page.goto(link)
            expect(page.locator("#guide-mm")).to_have_value("70")
            expect(page.locator("#wx")).to_contain_text("Geteilte Einstellung")
            self.assertEqual(page.locator("#f-motiv [aria-pressed=true]").get_attribute("data-value"),
                             "landscape")
        finally:
            other.close()

    def test_keyboard_focus_and_storage_disabled(self):
        self.page.add_init_script("""
          for (const method of ['setItem','getItem']) {
            Storage.prototype[method] = () => {throw new Error('Speicher gesperrt')};
          }
        """)
        self.open()
        for group, value, key in (("motiv","portrait","Enter"), ("licht","daemm","Space")):
            button = self.page.locator(f'#f-{group} [data-value="{value}"]')
            button.focus()
            button.press(key)
            expect(button).to_be_focused()
            expect(button).to_have_attribute("aria-pressed", "true")
        self.page.evaluate("locations[0].failure({code:1})")
        self.assertEqual(self.active("licht"), "daemm")

    def test_failed_storage_write_overrides_previous_checkmark_in_session(self):
        self.open(storage={"ck0_0":"0", "tab":"t2"})
        self.page.evaluate("""
          () => { Storage.prototype.setItem = () => { throw new Error("Quota exhausted"); }; }
        """)
        self.page.locator('[data-k="ck0_0"]').check()
        self.page.locator('nav [data-t="t3"]').click()
        self.page.locator('nav [data-t="t2"]').click()
        expect(self.page.locator('[data-k="ck0_0"]')).to_be_checked()

    def test_late_weather_after_manual_choice_and_reload(self):
        pending = []
        self.page.route("https://api.open-meteo.com/**", lambda route: pending.append(route))
        self.open()
        with self.page.expect_request("https://api.open-meteo.com/**"):
            self.send_location()
        self.page.locator('#f-licht [data-value="daemm"]').click()
        pending[0].fulfill(json=self.weather_data())
        expect(self.page.locator("#wx")).to_contain_text("manuell")
        self.assertEqual(self.active("licht"), "daemm")
        self.page.reload()
        self.assertEqual(self.active("licht"), "daemm")
        self.assertEqual(self.page.evaluate("locations.length"), 0)

    def test_two_measurements_and_preset(self):
        self.open()
        self.page.route("https://api.open-meteo.com/**",
                        lambda route: route.fulfill(json=self.weather_data(86)))
        self.page.locator("#wxb").click()
        self.send_location()
        expect(self.page.locator("#wx")).to_contain_text("Schneeschauer")
        self.page.evaluate("locations[0].failure({code:1})")
        expect(self.page.locator("#wx")).to_contain_text("Schneeschauer")
        self.page.locator("#wxb").click()
        self.page.locator("#pre button").first.click()
        self.send_location()
        expect(self.page.locator("#wx")).to_contain_text("manuell")
        self.assertEqual(self.active("licht"), "tag")

    def test_unknown_code_status_schema_and_geo_errors(self):
        self.open()
        responses = [(200,self.weather_data(87)), (503,{}), (200,{"current":{}})]
        def reply(route):
            status, data = responses.pop(0)
            route.fulfill(status=status,json=data)
        self.page.route("https://api.open-meteo.com/**", reply)
        for label in ("Wettercode unbekannt","Schätzung nach Uhrzeit","Schätzung nach Uhrzeit"):
            self.page.locator("#wxb").click()
            self.send_location()
            expect(self.page.locator("#wx")).to_contain_text(label)
        self.page.locator("#wxb").click()
        self.page.evaluate("locations.at(-1).failure({code:1})")
        expect(self.page.locator("#wx")).to_contain_text("Standort nicht freigegeben")
        self.assertEqual(responses, [])

    def test_automatic_estimate_refreshes_on_next_visit(self):
        self.open()
        self.page.evaluate("locations.at(-1).failure({code:1})")
        expect(self.page.locator("#wx")).to_contain_text("Schätzung nach Uhrzeit")
        self.page.reload()
        self.assertEqual(self.page.evaluate("locations.length"), 1)

    def test_fetch_timeout(self):
        self.page.clock.install()
        pending = []
        self.page.route("https://api.open-meteo.com/**", lambda route: pending.append(route))
        self.open()
        with self.page.expect_request("https://api.open-meteo.com/**"):
            self.send_location()
        self.page.clock.fast_forward(8100)
        expect(self.page.locator("#wx")).to_contain_text("Wetterabfrage abgelaufen")
        pending[0].abort()
        self.page.locator('#f-licht [data-value="nacht"]').click()
        self.assertEqual(self.active("licht"), "nacht")


if __name__ == "__main__":
    unittest.main()
