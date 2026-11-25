"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {access} = require("node:fs/promises");
const path = require("node:path");
const {readWindowsIso} = require("../local/windows/iso.js");

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
