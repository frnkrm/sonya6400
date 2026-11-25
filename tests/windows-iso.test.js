"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {access} = require("node:fs/promises");
const path = require("node:path");
const {readWindowsIso} = require("../local/windows/iso.js");

test("WPD-Leser kompiliert lokale Quellen und akzeptiert nur gültige Messwerte", async () => {
  for (const value of ["400", "auto", "", "400\n200", "102401", "0"]) {
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
    if (value === "400" || value === "auto")
      assert.deepEqual(await read, {model: "ILCE-6400", iso: value === "auto" ? value : 400});
    else await assert.rejects(read, {code: "unsupported"});
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
