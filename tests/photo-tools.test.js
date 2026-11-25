"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { seconds, filterPlan, intervalPlan, hyperfocal, bulbPlan, timerPhase, showHDR } = require("../photo-tools.js");

test("K-17/18 – Auto HDR nur für JPEG, getrennte Reihen mit Bewegung und beiden ISO-Verfahren", () => {
  for (const format of ["raw", "rawjpeg"]) {
    assert.match(showHDR(format, "hdr", false, false), /erfordert JPEG/);
    assert.match(showHDR(format, "bracket", true, true), /variiert die ISO/);
    assert.match(showHDR(format, "bracket", false, true), /variiert die Belichtungszeit/);
  }
  assert.match(showHDR("jpeg", "hdr", false, true), /Doppelkonturen/);
  assert.match(showHDR("jpeg", "hdr", false, false), /drei Aufnahmen/);
});

test("K-19/20 – BULB nur im geeigneten Modus und Timer mit getrennter Wartephase", () => {
  for (const drive of ["hdr", "continuous"]) assert.throws(() => bulbPlan(60, true, false, drive));
  assert.throws(() => bulbPlan(60, true, true, "single"));
  assert.throws(() => bulbPlan(0, true, false, "single"));
  const plan = bulbPlan("60", true, false, "single");
  assert.deepEqual(plan, { time: 60, total: 120 });
  assert.match(timerPhase(0.1, plan), /Belichtung · noch 60 s/);
  assert.match(timerPhase(60, plan), /Rauschminderung · noch etwa 60 s/);
  assert.match(timerPhase(120, plan), /beendet/);
  assert.match(timerPhase(60, bulbPlan(60, false, false, "single")), /beendet/);
});

test("K-21 – ND64, neutrale Dichte, Umkehrrechnung und Dezimalkomma", () => {
  assert.equal(filterPlan("1/125", 6, false).time, 0.512);
  assert.equal(filterPlan("0,125", "0", false).time, 0.125);
  assert.ok(Math.abs(filterPlan("1/125", "0,512", true).stops - 6) < 1e-12);
  assert.equal(filterPlan("1/4", "0.25", true).stops, 0);
  for (const val of [0, -1, "1/0", "1/2/3", "Infinity", "", "0x11", "oops"]) {
    assert.ok(Number.isNaN(seconds(val)));
    assert.throws(() => filterPlan(val, 3, false));
  }
  assert.throws(() => filterPlan("1/125", -2, false));
  assert.throws(() => filterPlan("1/125", "1/250", true));
});

test("K-22 – Bildgrenzen, Aufnahme bis zum letzten Verschlussschluss und Videolänge", () => {
  assert.deepEqual(intervalPlan("5", "120", "1/125", "25"), { span: 595.008, movie: 4.8, overlap: false });
  assert.deepEqual(intervalPlan(1, 1, 2, 25), { span: 2, movie: 0.04, overlap: false });
  assert.equal(intervalPlan(60, 9999, 65, 60).overlap, true);
  assert.equal(intervalPlan(60, 2, 60, 60).overlap, true);
  for (const args of [[0, 2, 1, 25], [61, 2, 1, 25], [1.5, 2, 1, 25], [5, 0, 1, 25], [5, 10000, 1, 25], [5, 2.2, 1, 25], [5, 2, -1, 25], [5, 2, 1, 0]]) {
    assert.throws(() => intervalPlan(...args));
  }
});

test("K-23 – Hyperfokale Entfernung mit tatsächlicher Brennweite, Blende und Toleranz", () => {
  assert.equal(hyperfocal(20, 8, "0,02"), 2.52);
  assert.ok(hyperfocal(70, 8, 0.02) > hyperfocal(17, 8, 0.02));
  assert.ok(hyperfocal(20, 8, 0.01) > hyperfocal(20, 8, 0.02));
  assert.throws(() => hyperfocal(20, 8, ""));
  assert.throws(() => hyperfocal(20, 0, 0.02));
});
