"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {access} = require("node:fs/promises");
const path = require("node:path");
const {readWindowsIso, stepWindowsIso, readWindowsExposure, stepWindowsExposure} = require("../local/windows/iso.js");

test("WPD-Leser kompiliert lokale Quellen und akzeptiert nur gültige Messwerte", async () => {
  const cases = [
    ["0x00000190", {iso: 400}], ["0x00FFFFFF", {iso: "auto"}],
    ["0x01000190", {iso: 400, mode: "mfnr"}], ["0x02000190", {iso: 400, mode: "mfnrPlus"}],
    ["0x01FFFFFF", {iso: "auto", mode: "mfnr"}], ["0x02FFFFFF", {iso: "auto", mode: "mfnrPlus"}],
    ["0x00000050", {iso: 80}], ["0x00032000", {iso: 204800}],
    ["0xA5000190", {iso: 400, mode: "unknown", rawIso: "0xA5000190"}],
    ["0xFFFFFFFF", {iso: "auto", mode: "unknown", rawIso: "0xFFFFFFFF"}],
    ["0x00000000", {iso: null, rawIso: "0x00000000"}], ["0x0FFFFFFE", {iso: null, rawIso: "0x0FFFFFFE"}],
    ["0x00019001", {iso: null, rawIso: "0x00019001"}],
    ["", null], ["0x0190", null], ["0x00000190\n0x00000320", null]
  ];
  for (const [value, expected] of cases) {
    const calls = [];
    const read = readWindowsIso({platform: "win32", exec: async (file, args, options) => {
      calls.push(file);
      assert.ok(!options.shell);
      if (calls.length === 1) {
        assert.match(file, /Framework64\\v4\.0\.30319\\csc\.exe$/);
        for (const name of ["Wpd.cs", "SonyIso.cs", "Program.cs"])
          assert.ok(args.some(arg => path.basename(arg) === name));
        return {stdout: ""};
      }
      assert.equal(path.basename(file), "SonyIso.exe");
      assert.deepEqual(args, []);
      return {stdout: value};
    }});
    if (expected) assert.deepEqual(await read, {model: "ILCE-6400", ...expected});
    else await assert.rejects(read, {code: "readback"});
    assert.equal(calls.length, 2);
    await assert.rejects(access(path.dirname(calls[1])), {code: "ENOENT"});
  }
});

test("WPD-Leser trennt Compilerfehler, Treibermeldung und Zeitlimit", async () => {
  await assert.rejects(readWindowsIso({platform: "linux"}), {code: "unsupported"});
  const cases = [
    [1, {code: "ENOENT"}, "dependency"],
    [2, {code: 1, stderr: "WPD: Sony-Sitzung: Treiberfehler 0x80070005."}, "readFailed"],
    [2, {killed: true}, "timeout"]
  ];
  for (const [failAt, error, code] of cases) {
    let count = 0;
    await assert.rejects(readWindowsIso({platform: "win32", exec: async () => {
      if (++count === failAt) throw Object.assign(new Error(), error);
      return {stdout: ""};
    }}), {code});
    assert.equal(count, failAt);
  }
});

test("Windows-Einzelschritt bindet Gerätekennung und bestätigt ausschließlich feste ISO 500", async () => {
  const key = "ab".repeat(32);
  let calls = 0;
  await assert.rejects(stepWindowsIso("ungültig", {platform: "win32", exec: () => { calls++; }}), {code: "stale"});
  assert.equal(calls, 0);
  async function invoke(step, output) {
    const options = {platform: "win32", exec: async (file, args) => {
      if (file.endsWith("csc.exe")) return {};
      assert.deepEqual(args, step ? ["--step-400-500", key] : []);
      return {stdout: output};
    }};
    return step ? stepWindowsIso(key, options) : readWindowsIso(options);
  }
  assert.deepEqual(await invoke(false, "0x00000190 " + key), {model: "ILCE-6400", iso: 400, stepKey: key});
  for (const stepBlock of ["mode", "access", "choices"])
    assert.deepEqual(await invoke(false, "0x00000190 !" + stepBlock), {model: "ILCE-6400", iso: 400, stepBlock});
  assert.deepEqual(await invoke(true, "0x000001F4"), {model: "ILCE-6400", iso: 500});
  for (const invalid of ["0x01000190 " + key, "0x00000190 bad", "0x00000190 !other", "0x000001F4 " + key])
    await assert.rejects(invoke(false, invalid), {code: "readback"});
  for (const mismatch of ["0x00000190", "0x010001F4", "0x000001F4 " + key])
    await assert.rejects(invoke(true, mismatch), {code: "readback"});
});

test("Windows-Blende und Belichtungszeit prüfen Auftrag, Ausgangswert und tatsächliche Rücklesung", async () => {
  const key = "ab".repeat(32), model = "ILCE-6400";
  async function invoke(field, output, step = false) {
    const options = {platform: "win32", exec: async (file, args) => {
      if (file.endsWith("csc.exe")) return {};
      assert.deepEqual(args, step ? ["--step-" + field, key] : ["--read-" + field]);
      return {stdout: output};
    }};
    return step ? stepWindowsExposure(field, key, options) : readWindowsExposure(field, options);
  }
  for (const [field, initial, target] of [
    ["aperture", "0x00000320", "0x00000384"], ["shutter", "0x0001007D", "0x000100A0"],
    ["shutter", "0x000200FA", "0x00020140"]
  ]) {
    assert.deepEqual(await invoke(field, initial + " " + key), {model, field, value: Number(initial), stepKey: key});
    assert.deepEqual(await invoke(field, target, true), {model, field, value: Number(target)});
    assert.deepEqual(await invoke(field, initial + " !access"), {model, field, value: Number(initial), stepBlock: "access"});
    assert.deepEqual(await invoke(field, "unavailable"), {model, field, value: null});
    for (const text of [initial, target + " " + key, target + " !mode", "unavailable"])
      await assert.rejects(invoke(field, text, true), {code: "readback"});
    for (const text of [target + " " + key, initial + " !unknown", "unavailable " + key, "0xBAD"])
      await assert.rejects(invoke(field, text), {code: "readback"});
  }
  assert.equal((await invoke("shutter", "0x00000000 !value")).value, 0);
  assert.equal((await invoke("shutter", "0x00010000 !value")).value, null);
  assert.equal((await invoke("aperture", "0x00000000 !value")).value, null);
  await assert.rejects(invoke("aperture", "0x00010000"), {code: "readback"});
  await assert.rejects(readWindowsExposure("focus"), {code: "unsupported"});
  await assert.rejects(stepWindowsExposure("shutter", ""), {code: "stale"});
});
