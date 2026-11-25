"use strict";
const {test} = require("node:test");
const assert = require("node:assert/strict");
const C = require("../camera.js");
const legacy = require("../legacy.js");

const baseline = {lens: "tam", motiv: "landscape", licht: "tag", bew: "steh", look: "sweet"};
function rec(patch) {
  const state = {...baseline, ...patch};
  return C.recommend(state, state.motiv === "landscape" ? null : legacy.calculate(state));
}

test("K-01, K-26 · Berglandschaft erhält eigenständige Anleitung mit gemeinsamen Werten und Quelle", () => {
  const o = rec({scene: "mountains"});
  assert.equal(o.mode, "A");
  assert.equal(o.focus, "AF-S");
  assert.match(o.steps.join(" "), /Peaking Setting.*Peaking Display/);
  assert.equal(o.aperture, 8);
  assert.equal(o.slot, "Landschaft");
  assert.ok(o.steps.some(step => step.includes("f/" + o.f) && step.includes(o.iso) && step.includes(o.t)));
  assert.match(o.reason, /Hand/);
  assert.ok(o.sources.some(link => link.url.includes("sony.net")));
});

test("K-02, K-03, K-13 · Stativ, Rückkehr zur Hand und Wind am Stativ", () => {
  const tripod = rec({support: "tripod"});
  assert.equal(tripod.iso, "100 (fest)");
  assert.match(tripod.drive, /2 s/);
  assert.match(tripod.stability, /VC über SteadyShot.*ausschalten/);
  assert.match(rec({support: "hand"}).stability, /VC über SteadyShot.*einschalten/);
  const light = rec({wind: "light", support: "tripod"});
  assert.equal(light.mode, "M");
  assert.equal(light.t, "1/250 s");
  assert.equal(rec({wind: "strong", support: "tripod"}).t, "1/500 s");
  assert.match(rec({lens: "sg30", support: "hand"}).stability, /keinen optischen Stabilisator/);
});

test("K-04, K-05 · Vordergrund, Ferne und Fokuslupe", () => {
  const near = rec({depth: "near"});
  assert.equal(near.aperture, 11);
  assert.match(near.steps.join(" "), /Vordergrund und Ferne getrennt/);
  const far = rec({depth: "far"});
  assert.match(far.steps.join(" "), /AF-S.*DMF/);
  assert.match(far.steps.join(" "), /Peaking.*Kanten.*vergrößern/);
});

test("K-06, K-26 · Bildziel und Priorität ändern Zeit und begründen Zielkonflikt", () => {
  const soft = rec({scene: "water", wind: "strong", priority: "water"});
  assert.equal(soft.t, "1 s");
  assert.ok(soft.tripod);
  assert.match(soft.w.join(" "), /Stativ/);
  assert.match(soft.w.join(" "), /Blätter.*verwischen/);
  assert.match(soft.tip.join(" "), /ND-Filter/);
  const leaves = rec({scene: "water", wind: "strong", priority: "leaves"});
  assert.equal(leaves.t, "1/500 s");
  assert.match(leaves.w.join(" "), /Scharfe Blätter.*Wasser/);
  assert.equal(rec({scene: "water", water: "frozen", wind: "calm"}).mode, "M");
});

test("K-07, K-08, K-16 · Heller Himmel, Wald, Schnee und Nebel", () => {
  const sun = rec({scene: "sun"});
  assert.match(sun.steps.join(" "), /Histogramm und Zebra.*Lichter-Messung.*Vordergrund.*Reihe|Histogramm und Zebra.*Belichtungsreihe/);
  const snow = rec({scene: "snow"});
  assert.match(snow.steps.join(" "), /Probebild grau.*Schrittweise.*Helle Details.*Weißabgleich/);
  assert.equal(snow.evn, 0);
  assert.match(rec({scene: "forest"}).tip.join(" "), /hellen Lücken/);
});

test("K-09 · Sterne auf Stativ mit MF und brennweitenabhängiger Testzeit", () => {
  const wide = rec({scene: "stars", lens: "sg16"});
  assert.equal(wide.mode, "M");
  assert.equal(wide.focus, "MF");
  assert.equal(wide.aperture, 1.4);
  assert.equal(wide.t, "8 s");
  assert.match(wide.steps.join(" "), /Unendlichanschlag vergrößert prüfen.*Strichen Zeit verkürzen/);
  const long = rec({scene: "stars", lens: "t210", mm: 210});
  assert.equal(long.aperture, 6.3);
  assert.ok(parseFloat(long.t.replace(",", ".")) < 8);
});

test("K-10, K-11, K-12 · Modellgrenzen, Legacy-Standardwerte und geschlossene Wertemengen", () => {
  assert.equal(Object.keys(C.profiles).length, 9);
  assert.match(C.profiles.s50.model, /SEL50F18\)/);
  assert.match(C.profiles.k1650.model, /SELP1650, 1. Generation/);
  assert.ok(Object.values(C.profiles).every(p => p.filter > 0 && p.near && p.source.startsWith("https://")));
  assert.equal(C.normalize({mm: 800}, {lens: "tam"}).mm, 70);
  assert.equal(C.normalize({mm: "x", scene: "constructor"}, {lens: "tam"}).scene, "mountains");
  assert.equal(C.normalize({}, {lens: "sg56"}).mm, 56);
  assert.equal(C.normalize({}, {lens: "tam"}).mm, 17);
  assert.notEqual(rec({mm: 17}).t, rec({mm: 70}).t);
  for (const [id, open] of [["t210", 6.3], ["k1650", 5.6], ["s18135", 5.6]]) {
    const [wide, tele] = C.profiles[id].range;
    assert.equal(C.apertureLimits(id, tele).open, open);
    assert.deepEqual(C.apertureLimits(id, wide + 1), {open, closed: 22, conservative: true});
    assert.equal(rec({lens: id, mm: tele, motiv: "portrait", look: "bokeh"}).aperture, open);
  }
  for (const lens of ["sg16", "sg30", "sg56"]) assert.equal(C.apertureLimits(lens, C.profiles[lens].range[0]).closed, 16);
});

test("K-14 · Weitwinkel, Normal, Tele und Naheinstellgrenze aus der eigenen Tasche", () => {
  const bag = ["sg56", "sg30", "sg16"];
  for (const [scene, mm] of [["mountains", 16], ["forest", 30], ["detail", 56]]) {
    const suggestion = C.framing({...baseline, scene}, bag);
    assert.ok(suggestion.includes("bei " + mm + " mm"));
    assert.doesNotMatch(suggestion, /Tamron/);
  }
  assert.match(C.framing({...baseline, depth: "near"}, ["tam"]), /0,19 m.*Sensorebene/);
});

test("K-11, K-14 · Bildausschnitt als Vorschlag getrennt von der gewählten Brennweite", () => {
  const portrait = rec({motiv: "portrait", lens: "tam", mm: 32});
  assert.equal(portrait.fl, "32 mm");
  assert.match(portrait.tip.join(" "), /50–70 mm ausprobieren/);
  assert.match(portrait.steps.join(" "), /tatsächliche Zoomstellung/);
  assert.match(rec({motiv: "street", lens: "tam"}).tip.join(" "), /24–35 mm/);
  const group = rec({motiv: "gruppe", lens: "s50"});
  assert.match(group.tip.join(" "), /50 mm.*Standort.*5–8 m.*Startwert/);
  assert.match(group.steps.join(" "), /Festbrennweite.*Standortwechsel/);
});

test("K-15 · Auto-ISO-Schwelle, M mit Auto ISO sowie M mit fester ISO", () => {
  assert.match(rec({}).how, /Am ISO-Limit.*länger/);
  assert.match(rec({wind: "light"}).how, /M.*Zeit und Blende.*Auto-ISO-Limit.*dunkel/);
  assert.doesNotMatch(rec({scene: "stars"}).how, /Auto-ISO/);
  assert.match(rec({wind: "strong"}).steps.join(" "), /Alternative S.*Zeit.*Blende/);
  assert.equal(rec({scene: "stars"}).evn, null);
  assert.deepEqual(rec({scene: "stars", wind: "strong", depth: "near"}), rec({scene: "stars"}));
});

test("K-01, K-11, K-12, K-15, K-26 · 864 bisherige Kombinationen an weit und tele", () => {
  let runs = 0;
  for (const lens of Object.keys(C.profiles)) {
    for (const motiv of ["street", "city", "gruppe", "portrait"]) {
      for (const licht of ["tag", "daemm", "wolke", "nacht"]) {
        for (const bew of ["steh", "geh", "act"]) {
          for (const look of ["bokeh", "sweet"]) {
            for (const mm of C.profiles[lens].range) {
              const o = rec({lens, mm, motiv, licht, bew, look});
              const limits = C.apertureLimits(lens, mm);
              assert.ok(o.aperture >= limits.open && o.aperture <= limits.closed);
              assert.ok(o.t && !/NaN|undefined|≥/.test([o.t, ...o.steps].join(" ")));
              assert.equal(o.fl, mm + " mm");
              assert.ok(o.steps.some(step => step.includes(o.slot) || o.arch));
            }
            runs++;
          }
        }
      }
    }
  }
  assert.equal(runs, 864);
});
