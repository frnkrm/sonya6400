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

function normalIso(raw) {
  if (raw === 0xffffff) return "auto";
  return (raw >= 100 && raw <= 102400) || extendedIso.has(raw) ? raw : null;
}

function decodeIso(rawIso) {
  if (!/^0x[0-9A-F]{8}$/.test(rawIso))
    throw failure("readback", "Der Windows-Helfer hat keinen vollständigen Sony-ISO-Rohwert geliefert.");
  const raw = Number(rawIso);
  const flags = raw >>> 24;
  const iso = normalIso(raw & 0x00ffffff);
  const model = "ILCE-6400";
  if (iso === null) return {model, iso, rawIso};
  const result = {model, iso};
  if (flags > 2) return {...result, mode: "unknown", rawIso};
  if (flags !== 0) result.mode = flags === 1 ? "mfnr" : "mfnrPlus";
  return result;
}

function validDeviceKey(key) {
  return typeof key === "string" && key.length === 64 && /^[0-9a-f]{64}$/u.test(key);
}

function matchesExposureStep(field, value, afterWrite) {
  if (field === "aperture") return value === (afterWrite ? 900 : 800);
  if (field !== "shutter" || !Number.isInteger(value) || value <= 0 || value > 0xffffffff) return false;
  const numerator = value >>> 16;
  return numerator > 0 && numerator * (afterWrite ? 160 : 125) === (value & 0xffff);
}

function readWindowsIso(options) {
  return runWindowsField("iso", null, options);
}

function stepWindowsIso(stepKey, options) {
  return stepWindowsExposure("iso", stepKey, options);
}

function readWindowsExposure(field, options) {
  return runWindowsField(field, null, options);
}

async function stepWindowsExposure(field, stepKey, options) {
  if (!validDeviceKey(stepKey)) throw failure("stale", "Eine aktuelle Vorschau der Kamera ist erforderlich.");
  return runWindowsField(field, stepKey, options);
}

async function runWindowsField(field, stepKey, options) {
  let args;
  if (field === "iso") args = stepKey ? ["--step-400-500", stepKey] : [];
  else if (field === "aperture" || field === "shutter")
    args = stepKey ? ["--step-" + field, stepKey] : ["--read-" + field];
  else throw failure("unsupported", "Unbekannte Windows-Kameraeinstellung.");

  const parts = (await runHelper(args, options)).trim().split(" ");
  if (field === "iso") return isoResult(parts, !!stepKey);
  const [raw, qualifier] = parts;
  if (parts.length > 2 || (raw !== "unavailable" && !/^0x[0-9A-F]{8}$/u.test(raw)))
    throw failure("readback", "Der Windows-Helfer hat keinen gültigen Kamerawert geliefert.");
  let value = raw === "unavailable" ? null : Number(raw);
  if (field === "aperture") {
    if (value > 0xffff) throw failure("readback", "Ungültiger Blendenwert im Windows-Helfer.");
    if (value === 0 || value === 0xffff) value = null;
  } else if (value && (!(value >>> 16) || !(value & 0xffff) || value === 0xffffffff)) {
    value = null;
  }
  const reading = {model: "ILCE-6400", field, value};
  if (stepKey) {
    if (qualifier !== undefined || !matchesExposureStep(field, value, true))
      throw failure("readback", "Die Rücklesung hat den Zielwert nicht bestätigt.");
  } else if (qualifier !== undefined) {
    if (["!value", "!mode", "!access", "!choices"].includes(qualifier))
      return {...reading, stepBlock: qualifier.slice(1)};
    if (!validDeviceKey(qualifier) || !matchesExposureStep(field, value, false))
      throw failure("readback", "Der Windows-Helfer hat eine ungültige Vorschau geliefert.");
    return {...reading, stepKey: qualifier};
  }
  return reading;
}

async function runHelper(args, {platform = process.platform, exec = execute, signal} = {}) {
  if (platform !== "win32") throw failure("unsupported", "Diese Kameraaktion benötigt Windows.");
  if (signal?.aborted) throw failure("timeout", "Windows-Kameraaktion abgebrochen.");
  const helperTimeout = args[0] === "--write-profile" ? 140_000 : 30_000;
  const compiler = path.win32.join(process.env.SystemRoot || "C:\\Windows",
    "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe");
  const directory = await mkdtemp(path.join(tmpdir(), "sony-wpd-")).catch(() => {
    throw failure("dependency", "Temporärer Ordner für den Windows-Kamerahelfer konnte nicht erstellt werden.");
  });
  const binary = path.join(directory, "SonyIso.exe");
  const options = {cwd: directory, windowsHide: true, encoding: "utf8", maxBuffer: 64 * 1024, signal};
  try {
    // Nur feste lokale Quelldateien kompilieren.
    const sources = ["Wpd.cs", "SonyIso.cs", "Program.cs"].map(name => path.join(__dirname, name));
    try {
      await exec(compiler, ["/nologo", "/noconfig", "/codepage:65001", "/platform:x64", "/target:exe",
        "/reference:System.dll", "/reference:System.Core.dll", "/out:" + binary, ...sources],
        {...options, timeout: 10000});
    } catch (error) {
      if (signal?.aborted) throw failure("timeout", "Windows-Kameraaktion abgebrochen.");
      if (error.code === "ENOENT")
        throw failure("dependency", "Der 64-Bit-Compiler von .NET Framework 4.x fehlt auf diesem Windows-PC.");
      throw failure("dependency", "Der Windows-Kamerahelfer konnte nicht erstellt werden. Das aktuelle Projekt-ZIP vollständig entpacken.");
    }
    try {
      if (signal?.aborted) throw failure("timeout", "Windows-Kameraaktion abgebrochen.");
      const {stdout} = await exec(binary, args, {...options, timeout: helperTimeout});
      return stdout;
    } catch (error) {
      if (signal?.aborted) throw failure("timeout", "Windows-Kameraaktion abgebrochen.");
      if (error.killed) throw failure("timeout", "Der Windows-Treiber hat innerhalb von " +
        helperTimeout / 1000 + " Sekunden nicht geantwortet.");
      const diagnostic = /^WPD: ([^\r\n]{1,480})$/u.exec(String(error.stderr || "").trim());
      throw failure("readFailed", error.code === 1 && diagnostic
        ? diagnostic[1] : "Windows konnte den Kamerazugriff nicht abschließen.");
    }
  } finally {
    await rm(directory, {recursive: true, force: true, maxRetries: 3}).catch(() => {});
  }
}

function isoResult(parts, afterWrite) {
  const result = decodeIso(parts[0]);
  if (afterWrite) {
    if (parts.length !== 1 || result.iso !== 500 || result.mode !== undefined)
      throw failure("readback", "Feste ISO 500 wurde nicht bestätigt. Windows-Istwert erneut lesen.");
    return result;
  }
  if (parts.length === 1) return result;
  if (parts.length === 2 && result.iso === 400 && result.mode === undefined &&
      ["!mode", "!access", "!choices"].includes(parts[1]))
    return {...result, stepBlock: parts[1].slice(1)};
  if (parts.length !== 2 || result.iso !== 400 || result.mode !== undefined || !validDeviceKey(parts[1]))
    throw failure("readback", "Der Windows-Helfer hat eine ungültige ISO-Vorschau geliefert.");
  return {...result, stepKey: parts[1]};
}

module.exports = {readWindowsIso, stepWindowsIso, readWindowsExposure, stepWindowsExposure, matchesExposureStep, validDeviceKey, runHelper, normalIso};
