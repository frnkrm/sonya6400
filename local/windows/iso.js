"use strict";

const {execFile} = require("node:child_process");
const {mkdtemp, rm} = require("node:fs/promises");
const {tmpdir} = require("node:os");
const path = require("node:path");
const {promisify} = require("node:util");

const execute = promisify(execFile);

function failure(code, message) {
  return Object.assign(new Error(message), {code});
}

// libgphoto2's Sony ISO decoder and its ILCE-6400 configuration dump document
// these additional sensitivities outside the profile's normal exposure range.
const extendedIso = new Set([25, 50, 64, 80, 128000, 160000, 204800, 256000, 320000, 409600]);

function decodeIso(rawIso) {
  if (!/^0x[0-9A-F]{8}$/.test(rawIso))
    throw failure("readback", "Der Windows-Helfer hat keinen vollständigen Sony-ISO-Rohwert geliefert.");
  const raw = Number(rawIso);
  const flags = raw >>> 24;
  const sensitivity = raw & 0x00ffffff;
  const auto = sensitivity === 0x00ffffff;
  const fixed = (sensitivity >= 100 && sensitivity <= 102400) || extendedIso.has(sensitivity);
  const model = "ILCE-6400";
  if (!auto && !fixed) return {model, iso: null, rawIso};
  const result = {model, iso: auto ? "auto" : sensitivity};
  if (flags > 2) return {...result, mode: "unknown", rawIso};
  if (flags !== 0) result.mode = flags === 1 ? "mfnr" : "mfnrPlus";
  return result;
}

async function readWindowsIso({platform = process.platform, exec = execute} = {}) {
  if (platform !== "win32") throw failure("unsupported", "Dieser Lesetest benötigt Windows.");
  const compiler = path.win32.join(process.env.SystemRoot || "C:\\Windows",
    "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe");
  const directory = await mkdtemp(path.join(tmpdir(), "sony-wpd-")).catch(() => {
    throw failure("dependency", "Temporärer Ordner für den Windows-Lesetest konnte nicht erstellt werden.");
  });
  const binary = path.join(directory, "SonyIso.exe");
  const options = {cwd: directory, windowsHide: true, encoding: "utf8", maxBuffer: 64 * 1024};
  try {
    // Nur die mitgelieferten Quellen kompilieren. Kamera- und Browserdaten werden
    // weder als Kommandozeilenargumente noch als Programmtext verwendet.
    const sources = ["Wpd.cs", "SonyIso.cs", "Program.cs"].map(name => path.join(__dirname, name));
    try {
      await exec(compiler, ["/nologo", "/noconfig", "/codepage:65001", "/platform:x64", "/target:exe",
        "/reference:System.dll", "/reference:System.Core.dll", "/out:" + binary, ...sources],
        {...options, timeout: 10000});
    } catch (error) {
      if (error.code === "ENOENT")
        throw failure("dependency", "Der 64-Bit-Compiler von .NET Framework 4.x fehlt auf diesem Windows-PC.");
      throw failure("dependency", "Der Windows-Lesehelfer konnte nicht erstellt werden. Das aktuelle Projekt-ZIP vollständig entpacken.");
    }
    let stdout;
    try {
      ({stdout} = await exec(binary, [], {...options, timeout: 30000}));
    } catch (error) {
      if (error.killed) throw failure("timeout", "Der Windows-Treiber hat innerhalb von 30 Sekunden nicht geantwortet.");
      const diagnostic = /^WPD: ([^\r\n]{1,480})$/u.exec(String(error.stderr || "").trim());
      throw failure("readFailed", error.code === 1 && diagnostic
        ? diagnostic[1] : "Windows konnte den ISO-Lesetest nicht ausführen.");
    }
    return decodeIso(stdout.trim());
  } finally {
    await rm(directory, {recursive: true, force: true, maxRetries: 3}).catch(() => {});
  }
}

module.exports = {readWindowsIso};
