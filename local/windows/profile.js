"use strict";

const {createHash} = require("node:crypto");
const {snapshotDifference} = require("../../transfer-engine.js");
const {normalIso, runHelper, validDeviceKey} = require("./iso.js");

const fields = ["iso", "aperture", "shutter"];

function failure(code, message) {
  return Object.assign(new Error(message), {code});
}

function rawValue(field, raw) {
  if (!Number.isInteger(raw) || raw < 0 || raw > (field === "aperture" ? 0xffff : 0xffffffff))
    throw failure("readback", "Der Windows-Helfer hat ungültige Sony-Eigenschaftsdaten geliefert.");
  if (field === "iso") return normalIso(raw);
  if (field === "aperture") return raw > 0 && raw < 0xffff ? raw / 100 : null;
  const numerator = raw >>> 16, denominator = raw & 0xffff;
  return numerator && denominator && raw !== 0xffffffff ? numerator / denominator : null;
}

function encodeRelative(field, target) {
  if (!Number.isFinite(target) || target <= 0) return null;
  if (field === "aperture") {
    const raw = Math.round(target * 100);
    return raw > 0 && raw < 0xffff && raw / 100 === target ? raw : null;
  }
  if (field !== "shutter" || target < 1 / 4000 || target > 30) return null;
  // Sony encodes a rational in two unsigned 16-bit words. Keep the exact
  // seconds from the validated profile (e.g. 1/125, 0.6 or 2.5).
  for (let denominator = 1; denominator <= 0xffff; denominator++) {
    const numerator = Math.round(target * denominator);
    if (numerator > 0xffff) break;
    if (numerator > 0 && numerator / denominator === target)
      return numerator * 0x10000 + denominator;
  }
  return null;
}

function parseReading(output) {
  let data;
  try {
    data = JSON.parse(output);
  } catch {
    throw failure("readback", "Der Windows-Helfer hat keine gültige Profilantwort geliefert.");
  }
  if (!validDeviceKey(data?.id) || !validDeviceKey(data.guard) || !["A", "M", "unknown"].includes(data.mode))
    throw failure("readback", "Gerätekennung, Prüfsumme oder Fotomodus der Windows-Antwort ist ungültig.");

  const controls = {}, capabilities = {};
  for (const field of fields) {
    const item = data.fields?.[field];
    if (typeof item?.writable !== "boolean" || typeof item.relative !== "boolean" ||
        !Array.isArray(item.choices) || (item.relative && (field === "iso" || item.choices.length || !item.writable)))
      throw failure("readback", "Unvollständige Windows-Fähigkeiten für " + field + ".");
    const current = item.current === null ? null : rawValue(field, item.current);
    const choices = new Map();
    for (const raw of item.choices) {
      const value = rawValue(field, raw);
      if (value !== null && !choices.has(value)) choices.set(value, raw);
    }
    const modeAllows = data.mode === "M" || (data.mode === "A" && field !== "shutter");
    const writable = modeAllows && current !== null && item.writable && (item.relative || choices.size > 0);
    controls[field] = {rawCurrent: item.current, choices};
    capabilities[field] = {current, writable, choices: [...choices.keys()], relative: writable && item.relative};
  }
  // The native device key used for writes stays inside the local server.
  const id = createHash("sha256").update("sony-wpd\0" + data.id).digest("hex");
  return {key: data.id, guard: data.guard, controls,
    snapshot: {source: "usb", model: "ILCE-6400", id, mode: data.mode, fields: capabilities}};
}

class WindowsProfileAdapter {
  constructor(helper = runHelper) {
    // Includes compiler start, camera steps with fresh reads, and helper exit.
    this.writeTimeoutMs = 150_000;
    this.helper = helper;
    this.last = null;
  }

  async read({signal} = {}) {
    this.last = null;
    const result = parseReading(await this.helper(["--read-profile"], {signal}));
    this.last = result;
    return structuredClone(result.snapshot);
  }

  async write(field, target, expected, {signal} = {}) {
    const last = this.last;
    this.last = null;
    if (!last || !fields.includes(field) || snapshotDifference(expected, last.snapshot))
      throw failure("stale", "Die native Windows-Vorschau ist veraltet. Kamera erneut lesen.");
    const capability = last.snapshot.fields[field];
    const control = last.controls[field];
    const rawTarget = capability.relative ? encodeRelative(field, target) : control.choices.get(target);
    if (!capability.writable || rawTarget == null)
      throw failure("unsupported", "Das gewählte Ziel wird von dieser Windows-Kameraverbindung nicht unterstützt.");
    const args = ["--write-profile", last.key, last.snapshot.mode, field, String(control.rawCurrent), String(rawTarget), last.guard];
    // Opening another WPD handle takes time. The helper checks this guard
    // against the full camera state again before sending the first notch.
    const result = (await this.helper(args, {signal})).trim();
    if (!/^\d{1,10}$/u.test(result) || rawValue(field, Number(result)) !== target)
      throw failure("readback", "Der Windows-Helfer hat den gewählten Zielwert nicht bestätigt. Kamera erneut lesen.");
  }
}

module.exports = {WindowsProfileAdapter};
