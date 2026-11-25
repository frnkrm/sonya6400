"use strict";
const {test} = require("node:test");
const assert = require("node:assert/strict");
const camera = require("../camera.js");
const legacy = require("../legacy.js");
const {validate} = require("../transfer-profile.js");

function profile(patch = {}) {
  const s = {lens: "tam", motiv: "landscape", licht: "tag", bew: "steh", look: "sweet", ...patch};
  return camera.recommend(s, s.motiv === "landscape" ? null : legacy.calculate(s)).profile;
}

test("C-02 · Modus A mit Zeitgrenze und Auto ISO bleibt beim Import erhalten", () => {
  const target = profile();
  assert.deepEqual(target, {
    version: 1, model: "ILCE-6400", mode: "A", lens: "tam", focalMm: 17, aperture: 8,
    iso: {kind: "auto", min: 100, max: 3200}, shutter: {kind: "minAuto", seconds: 1 / 125}
  });
  const imported = validate(JSON.parse(JSON.stringify(target)));
  assert.deepEqual(imported, target);
  assert.notEqual(imported.iso, target.iso);
});

test("C-02 · Modus A am Stativ delegiert die Messung bei fester ISO an die Kamera", () => {
  const p = validate(profile({support: "tripod"}));
  assert.deepEqual(p.shutter, {kind: "metered"});
  assert.deepEqual(p.iso, {kind: "fixed", value: 100});
});

test("C-02 · M hat feste Sekunden, Auto ISO bei Wind und feste ISO für Sterne", () => {
  const stars = validate(profile({scene: "stars", lens: "sg16"}));
  assert.deepEqual(stars.shutter, {kind: "fixed", seconds: 8});
  assert.deepEqual(stars.iso, {kind: "fixed", value: 1600});
  assert.equal(stars.aperture, 1.4);
  const wind = validate(profile({wind: "strong"}));
  assert.equal(wind.mode, "M");
  assert.deepEqual(wind.shutter, {kind: "fixed", seconds: 1 / 500});
  assert.equal(wind.iso.kind, "auto");
});

test("C-02 · Alte Motive und alle aktiven Varianten produzieren importierbare Zahlen", () => {
  for (const [lens, spec] of Object.entries(camera.profiles)) {
    for (const mm of new Set(spec.range)) {
      for (const motiv of ["street", "portrait", "gruppe", "city"]) {
        for (const licht of ["tag", "wolke", "daemm", "nacht"]) {
          for (const bew of ["steh", "geh", "act"]) {
            for (const look of ["bokeh", "sweet"]) {
              const p = profile({lens, mm, motiv, licht, bew, look});
              assert.deepEqual(validate(p), p);
            }
          }
        }
      }
      for (const [scene] of camera.options.scene) {
        for (const [wind] of camera.options.wind) {
          for (const [support] of camera.options.support) {
            const p = profile({lens, mm, scene, wind, support});
            assert.deepEqual(validate(p), p);
          }
        }
      }
    }
  }
});

test("C-02 · Ungültige Modell-/Objektivgrenzen, Typen und Moduskonflikte werden abgelehnt", () => {
  const invalid = [
    {version: 2}, {version: "1"}, {model: "ILCE-7"}, {mode: "S"},
    {lens: "constructor"}, {lens: "s50", focalMm: 17}, {lens: "sg30", focalMm: 30, aperture: 22},
    {lens: "t210", focalMm: 210, aperture: 4.5}, {focalMm: null}, {aperture: Infinity},
    {iso: {kind: "auto", min: 3200, max: 800}}, {iso: {kind: "fixed", value: NaN}},
    {iso: {kind: "auto", min: 100, max: "6400"}}, {iso: {kind: "auto", min: 100}},
    {mode: "M"}, {shutter: {kind: "fixed", seconds: 1}}, {shutter: {kind: "minAuto", seconds: -1}},
    {shutter: {kind: "minAuto", seconds: 31}}, {iso: {kind: "fixed", value: 100}},
    {shutter: {kind: "metered", seconds: 1}}, {label: "hello"},
    {iso: {kind: "auto", min: 100, max: 3200, spare: 0}}
  ];
  for (const patch of invalid) assert.throws(() => validate({...profile(), ...patch}));
  for (const malformed of [undefined, null, [], {}, {version: 1}]) assert.throws(() => validate(malformed));
});
