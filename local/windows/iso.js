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

function readWindowsIso(options) {
  return runWindowsIso(null, options);
}

async function stepWindowsIso(stepKey, options) {
  if (typeof stepKey !== "string" || stepKey.length !== 64 || !/^[a-f0-9]{64}$/.test(stepKey))
    throw failure("stale", "Eine aktuelle ISO-Vorschau der Kamera ist erforderlich.");
  return runWindowsIso(stepKey, options);
}

async function runWindowsIso(stepKey, {platform = process.platform, exec = execute} = {}) {
  if (platform !== "win32") throw failure("unsupported", "Diese Kameraaktion benötigt Windows.");
  const compiler = path.win32.join(process.env.SystemRoot || "C:\\Windows",
    "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe");
  const directory = await mkdtemp(path.join(tmpdir(), "sony-wpd-")).catch(() => {
    throw failure("dependency", "Temporärer Ordner für den Windows-Kamerahelfer konnte nicht erstellt werden.");
  });
  const binary = path.join(directory, "SonyIso.exe");
  const options = {cwd: directory, windowsHide: true, encoding: "utf8", maxBuffer: 64 * 1024};
  try {
    // Nur feste lokale Quelldateien kompilieren.
    const sources = ["Wpd.cs", "SonyIso.cs", "Program.cs"].map(name => path.join(__dirname, name));
    try {
      await exec(compiler, ["/nologo", "/noconfig", "/codepage:65001", "/platform:x64", "/target:exe",
        "/reference:System.dll", "/reference:System.Core.dll", "/out:" + binary, ...sources],
        {...options, timeout: 10000});
    } catch (error) {
      if (error.code === "ENOENT")
        throw failure("dependency", "Der 64-Bit-Compiler von .NET Framework 4.x fehlt auf diesem Windows-PC.");
      throw failure("dependency", "Der Windows-Kamerahelfer konnte nicht erstellt werden. Das aktuelle Projekt-ZIP vollständig entpacken.");
    }
    let stdout;
    try {
      ({stdout} = await exec(binary, stepKey ? ["--step-400-500", stepKey] : [], {...options, timeout: 30000}));
    } catch (error) {
      if (error.killed) throw failure("timeout", "Der Windows-Treiber hat innerhalb von 30 Sekunden nicht geantwortet.");
      const diagnostic = /^WPD: ([^\r\n]{1,480})$/u.exec(String(error.stderr || "").trim());
      throw failure("readFailed", error.code === 1 && diagnostic
        ? diagnostic[1] : "Windows konnte den Kamerazugriff nicht abschließen.");
    }
    const parts = stdout.trim().split(" ");
    const result = decodeIso(parts[0]);
    if (stepKey) {
      if (parts.length !== 1 || result.iso !== 500 || result.mode !== undefined)
        throw failure("readback", "Feste ISO 500 wurde nicht bestätigt. Windows-Istwert erneut lesen.");
      return result;
    }
    if (parts.length === 1) return result;
    if (parts.length === 2 && result.iso === 400 && result.mode === undefined &&
        ["!mode", "!access", "!choices"].includes(parts[1]))
      return {...result, stepBlock: parts[1].slice(1)};
    if (parts.length !== 2 || result.iso !== 400 || result.mode !== undefined || !/^[0-9a-f]{64}$/.test(parts[1]))
      throw failure("readback", "Der Windows-Helfer hat eine ungültige ISO-Vorschau geliefert.");
    return {...result, stepKey: parts[1]};
  } finally {
    await rm(directory, {recursive: true, force: true, maxRetries: 3}).catch(() => {});
  }
}

module.exports = {readWindowsIso, stepWindowsIso};
