"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const TransferEngine = require("../transfer-engine.js");
const {WindowsProfileAdapter} = require("../local/windows/profile.js");

const key = "ab".repeat(32);
const guard = "cd".repeat(32);
const fraction = (n, d) => n * 0x10000 + d;
const auto = 0xffffff;
const profile = {version: 1, model: "ILCE-6400", mode: "M", lens: "tam", focalMm: 17,
  iso: {kind: "auto", min: 100, max: 12800}, aperture: 3.5, shutter: {kind: "fixed", seconds: 1 / 125}};

function fixture() {
  return {id: key, guard, mode: "M", fields: {
    iso: {current: 500, writable: true, choices: [auto, 100, 500], relative: false},
    aperture: {current: 900, writable: true, choices: [], relative: true},
    shutter: {current: fraction(2, 320), writable: true, choices: [], relative: true}
  }};
}

test("Windows-Profil übernimmt ISO Auto, Blende und Zeit und liest jedes bestätigte Feld neu", async () => {
  const camera = fixture();
  const writes = [];
  const adapter = new WindowsProfileAdapter(async (args, {signal}) => {
    assert.ok(signal instanceof AbortSignal);
    if (args[0] === "--read-profile") return JSON.stringify(camera);
    const [flag, id, mode, field, expected, target, expectedGuard] = args;
    assert.equal(expectedGuard, camera.guard);
    assert.equal(flag, "--write-profile");
    assert.equal(id, key);
    assert.equal(mode, "M");
    assert.equal(String(camera.fields[field].current), expected);
    writes.push([field, target]);
    // The camera can return the same time using an unreduced fraction.
    const value = field === "shutter" ? fraction(2, 250) : Number(target);
    camera.fields[field].current = value;
    camera.guard = String(writes.length).padStart(64, "0");
    return String(value);
  });
  const snapshot = await TransferEngine.readForPreview(adapter);
  assert.notEqual(snapshot.id, key);
  assert.equal(snapshot.guard, undefined);
  assert.equal(snapshot.fields.shutter.current, 1 / 160);
  assert.deepEqual(snapshot.fields.iso.choices, ["auto", 100, 500]);
  const result = await TransferEngine.apply(adapter, profile, snapshot);
  assert.equal(result.status, "confirmed");
  assert.deepEqual(result.rows.map(row => row.current), ["auto", 3.5, 1 / 125]);
  assert.deepEqual(writes, [["iso", String(auto)], ["aperture", "350"], ["shutter", String(fraction(1, 125))]]);
  assert.equal((await TransferEngine.apply(adapter, profile, result.snapshot)).status, "unchanged");
  assert.equal(writes.length, 3);
});

test("Ein Profil-Schritt braucht aktuelle Werte, gültige Auswahl und eindeutige Bestätigung", async () => {
  const camera = fixture();
  let sends = 0;
  const adapter = new WindowsProfileAdapter(async args => {
    if (args.length === 1) return JSON.stringify(camera);
    sends++;
    return String(camera.fields[args[3]].current);
  });
  let expected = await adapter.read();
  await assert.rejects(adapter.write("iso", 320, expected), {code: "unsupported"});
  await assert.rejects(adapter.write("iso", 100, expected), {code: "stale"});
  expected = await adapter.read();
  await assert.rejects(adapter.write("aperture", 3.555, expected), {code: "unsupported"});
  expected = await adapter.read();
  camera.id = "cd".repeat(32);
  await adapter.read();
  await assert.rejects(adapter.write("aperture", 3.5, expected), {code: "stale"});
  assert.equal(sends, 0);
  expected = await adapter.read();
  await assert.rejects(adapter.write("aperture", 3.5, expected), {code: "readback"});
  assert.equal(sends, 1);
});

test("Unbekannte Modi, MFNR und BULB werden beim nativen Profil nicht schreibbar", async () => {
  const camera = fixture();
  const adapter = new WindowsProfileAdapter(async () => JSON.stringify(camera));
  camera.mode = "A";
  camera.fields.iso.current = 0x01ffffff;
  camera.fields.shutter.current = 0;
  let snapshot = await adapter.read();
  assert.equal(snapshot.fields.shutter.current, null);
  assert.equal(snapshot.fields.shutter.writable, false);
  assert.equal(snapshot.fields.iso.current, null);
  assert.equal(snapshot.fields.iso.writable, false);
  assert.equal(snapshot.fields.aperture.writable, true);
  camera.mode = "unknown";
  snapshot = await adapter.read();
  assert.ok(Object.values(snapshot.fields).every(field => !field.writable));
  camera.id = "bad";
  await assert.rejects(adapter.read(), {code: "readback"});
  await assert.rejects(adapter.write("aperture", 3.5, snapshot), {code: "stale"});
});

test("Windows-Profil verwirft beschädigte Helferausgabe vor dem Schreiben", async () => {
  for (const change of [
    data => { data.fields.iso.relative = true; },
    data => { data.fields.aperture.current = -1; },
    data => { data.fields.shutter.choices = ["1/125"]; },
    data => { delete data.fields.iso; },
    data => { data.mode = "invalid"; },
    data => { delete data.guard; },
    data => { data.guard = "bad"; }
  ]) {
    const camera = fixture();
    change(camera);
    const adapter = new WindowsProfileAdapter(async () => JSON.stringify(camera));
    await assert.rejects(adapter.read(), {code: "readback"});
  }
  const adapter = new WindowsProfileAdapter(async () => "invalid JSON");
  await assert.rejects(adapter.read(), {code: "readback"});
});

test("Nur native Profil-Schreibaufträge bekommen das Zeitbudget für mehrere Kameraschritte", async () => {
  const {runHelper} = require("../local/windows/iso.js");
  const times = [];
  const controller = new AbortController();
  const options = {platform: "win32", signal: controller.signal, exec: async (file, args, params) => {
    assert.equal(params.signal, controller.signal);
    times.push(params.timeout);
    return {stdout: "ok"};
  }};
  await runHelper(["--write-profile", key, "M", "aperture", "400", "350", guard], options);
  await runHelper(["--read-profile"], options);
  assert.deepEqual(times, [10_000, 140_000, 10_000, 30_000]);
  assert.equal(new WindowsProfileAdapter().writeTimeoutMs, 150_000);
  controller.abort();
  await assert.rejects(runHelper(["--read-profile"], options), {code: "timeout"});
  assert.equal(times.length, 4);
});
