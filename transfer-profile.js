/* Gemeinsames Importformat für Website, Simulation und lokalen USB-Adapter. */
(function () {
  "use strict";
  const camera = typeof module === "object" && module.exports ? require("./camera.js") : globalThis.CameraGuide;

  function fields(object, names, section) {
    if (!object || typeof object !== "object" || Array.isArray(object)) {
      throw new Error(section + " muss ein Objekt sein.");
    }
    for (const name of names) {
      if (!Object.hasOwn(object, name)) throw new Error(section + ": Feld „" + name + "“ fehlt.");
    }
    for (const name of Object.keys(object)) {
      if (!names.includes(name)) throw new Error(section + " enthält ein unbekanntes Feld: " + name);
    }
  }

  function number(value, min, max, field) {
    if (!Number.isFinite(value) || value < min || value > max) {
      throw new Error(field + " muss eine Zahl zwischen " + min + " und " + max + " sein.");
    }
    return value;
  }

  function isoNumber(value, maximum) {
    if (!Number.isInteger(value)) throw new Error("ISO benötigt einen ganzzahligen Wert.");
    return number(value, 100, maximum, "ISO");
  }

  function validateISO(iso) {
    if (iso?.kind === "fixed") {
      fields(iso, ["kind", "value"], "ISO");
      return {kind: "fixed", value: isoNumber(iso.value, 102400)};
    }
    if (iso?.kind === "auto") {
      fields(iso, ["kind", "min", "max"], "Auto ISO");
      const min = isoNumber(iso.min, 32000);
      const max = isoNumber(iso.max, 32000);
      if (min > max) throw new Error("Die Auto-ISO-Untergrenze liegt über der Obergrenze.");
      return {kind: "auto", min, max};
    }
    throw new Error("ISO benötigt die Art fixed oder auto.");
  }

  function validateShutter(shutter, mode, iso) {
    const kind = shutter?.kind;
    if (mode === "A" && kind === "metered") {
      fields(shutter, ["kind"], "Belichtungsautomatik");
      return {kind};
    }
    if (kind === "minAuto" && (mode !== "A" || iso.kind !== "auto")) {
      throw new Error("ISO AUTO Min. SS benötigt Modus A mit Auto ISO.");
    }
    if (mode === "M" && kind !== "fixed") throw new Error("Modus M benötigt eine feste Belichtungszeit.");
    if (mode === "A" && kind !== "minAuto") throw new Error("Modus A erwartet eine gemessene Zeit oder eine Auto-ISO-Zeitschwelle.");
    fields(shutter, ["kind", "seconds"], "Belichtungszeit");
    return {kind, seconds: number(shutter.seconds, 1 / 4000, 30, "Zeit in Sekunden")};
  }

  function validate(profile) {
    fields(profile, ["version", "model", "mode", "lens", "focalMm", "aperture", "iso", "shutter"], "Das Profil");
    if (profile.version !== 1) throw new Error("Unbekannte Profilversion. Unterstützt wird Version 1.");
    if (profile.model !== "ILCE-6400") throw new Error("Das Profil muss für die Sony ILCE-6400 bestimmt sein.");
    if (!["A", "M"].includes(profile.mode)) throw new Error("Das Profil benötigt Modus A oder M.");
    if (typeof profile.lens !== "string" || !Object.hasOwn(camera.profiles, profile.lens)) throw new Error("Unbekanntes Objektivprofil.");
    const [wide, tele] = camera.profiles[profile.lens].range;
    const focalMm = number(profile.focalMm, wide, tele, "Brennweite in mm");
    const limits = camera.apertureLimits(profile.lens, focalMm);
    const aperture = number(profile.aperture, limits.open, limits.closed, "Blendenzahl");
    const iso = validateISO(profile.iso);
    const shutter = validateShutter(profile.shutter, profile.mode, iso);
    return {version: 1, model: profile.model, mode: profile.mode, lens: profile.lens, focalMm, aperture, iso, shutter};
  }

  const api = {validate};
  if (typeof module === "object" && module.exports) module.exports = api;
  else globalThis.TransferProfile = api;
})();
