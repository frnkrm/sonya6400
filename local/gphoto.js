"use strict";

const { execFile } = require("node:child_process");
const { createHash } = require("node:crypto");
const { win32 } = require("node:path");
const { promisify } = require("node:util");
const { snapshotDifference } = require("../transfer-engine.js");

const execute = promisify(execFile);
const MODEL = "ILCE-6400";
const widgetNames = {
  model: ["cameramodel", "model"],
  serial: ["serialnumber"],
  mode: ["expprogram", "exposureprogram", "autoexposuremode"],
  iso: ["iso"],
  aperture: ["f-number", "aperture"],
  shutter: ["shutterspeed"]
};

function failure(code, message) {
  return Object.assign(new Error(message), { code });
}

async function command(args, signal, platform, exec) {
  const windows = platform === "win32";
  // WSL2 erhält ausschließlich die vom Adapter erzeugten Argumente. Auch im
  // Gast begrenzt timeout die Laufzeit, falls der Windows-Client beendet wird.
  const program = windows
    ? win32.join(process.env.SystemRoot || "C:\\Windows", "System32", "wsl.exe")
    : "gphoto2";
  const argv = windows ? [
    "--distribution", "Ubuntu", "--cd", "/", "--exec", "/usr/bin/env", "LC_ALL=C", "LANG=C",
    "/usr/bin/timeout", "--kill-after=1s", "10s", "/usr/bin/gphoto2", ...args
  ] : args;
  try {
    const result = await exec(program, argv, {
      env: { ...process.env, LC_ALL: "C", LANG: "C", ...(windows && { WSL_UTF8: "1" }) },
      timeout: 12000, killSignal: "SIGKILL", maxBuffer: 4 * 1024 * 1024,
      signal, encoding: "utf8", windowsHide: true
    });
    return result.stdout;
  } catch (error) {
    const details = [error.stderr, error.stdout].join("\n").replaceAll("\0", "");
    if (error.killed || error.signal || error.code === "ABORT_ERR" || (windows && [124, 137].includes(error.code))) {
      throw failure("timeout", "USB-Abfrage abgebrochen oder Zeitlimit erreicht. Kamerawerte erneut lesen.");
    }
    if (windows && (error.code === "ENOENT" || /Wsl\/|WSL_E_|0x80370102|0x8007019e|wsl\.exe --install/i.test(details))) {
      throw failure("dependency", "WSL 2 mit der Distribution Ubuntu starten. In PowerShell mit wsl --list --verbose prüfen.");
    }
    if (windows && error.code === 127) {
      throw failure("dependency", "gphoto2 fehlt in Ubuntu. Dort sudo apt install gphoto2 ausführen.");
    }
    if (error.code === "ENOENT") throw failure("dependency", "gphoto2 fehlt. Installiere das lokale Kommandozeilenprogramm.");
    if (/permission denied|insufficient permissions|access denied/i.test(details) || error.code === "EACCES") {
      throw failure("permission", "USB-Zugriff verweigert. Geräteberechtigungen und Zugriff auf gphoto2 prüfen.");
    }
    if (/could not claim|device.*busy|resource busy|PTP.*busy/i.test(details)) {
      throw failure("busy", "USB-Schnittstelle belegt. Andere Kamera- und Importprogramme schließen.");
    }
    if (/no camera found|could not find.*device|device.*disconnected|no such device|could not detect any camera/i.test(details)) {
      throw failure("disconnected", "Kamera getrennt. USB-Kabel und USB-Verbindung »PC-Fernbedienung« prüfen.");
    }
    if (/timeout|timed out/i.test(details)) throw failure("timeout", "Die Kamera hat nicht rechtzeitig geantwortet.");
    if (/not a valid choice|not in the range|widget is read.only|invalid value/i.test(details)) {
      throw failure("rejected", "Der Treiber lehnt den Zielwert ab.");
    }
    const code = args.includes("--set-config-value") ? "unverified" : "readFailed";
    throw failure(code, "gphoto2 meldet einen Fehler. Kameraeinstellung und Verbindung erneut prüfen.");
  }
}

function usbPort(listing) {
  const lines = listing.trim().split(/\r?\n/);
  const header = lines.findIndex(line => /^-{4,}[ -]*$/.test(line.trim()));
  if (header < 0) throw failure("unsupported", "Die Geräteliste von gphoto2 ist unlesbar.");
  const devices = lines.slice(header + 1).filter(line => line.trim());
  if (!devices.length) throw failure("disconnected", "Keine Kamera erkannt. USB-Kabel und PC-Fernbedienung prüfen. Unter Windows muss usbipd die Kamera an WSL durchreichen.");
  if (devices.length !== 1) throw failure("multiple", "Mehrere Geräte erkannt. Nur die gewünschte α6400 anschließen.");
  const match = /\s+(usb:\d{1,3},\d{1,3})\s*$/.exec(devices[0]);
  if (!match) throw failure("unsupported", "Das erkannte Gerät meldet keinen eindeutigen USB-Anschluss.");
  return match[1];
}

// Nur vollständige Widgets aus --list-all-config übernehmen. Kein Ausführen von
// Pfaden, Kommandos oder gphoto2-Optionen aus dem importierten Aufnahmeprofil.
function widgets(listing) {
  const result = [];
  let widget = null;
  for (const line of listing.split(/\r?\n/)) {
    if (/^\/main\/[a-zA-Z0-9_/-]+$/.test(line)) {
      widget = { path: line, choices: [] };
    } else if (line === "END" && widget) {
      result.push(widget);
      widget = null;
    } else if (widget) {
      const property = /^(Type|Current|Readonly|Bottom|Top|Step):\s*(.*)$/.exec(line);
      if (property) widget[property[1]] = property[2].trim();
      const choice = /^Choice: \d+ (.+)$/.exec(line);
      if (choice) widget.choices.push(choice[1].trim());
    }
  }
  return result;
}

function findWidget(list, key) {
  const matches = list.filter(item => {
    const parts = item.path.split("/");
    const [, , group, name] = parts;
    return ["imgsettings", "capturesettings", "settings", "status"].includes(group) &&
      parts.length === 4 && widgetNames[key].includes(name);
  });
  return matches.length === 1 ? matches[0] : null;
}

function modeName(value) {
  const names = { "Aperture Priority": "A", "Manual": "M", "Shutter Priority": "S", "Program": "P" };
  return Object.hasOwn(names, value) ? names[value] : (value || "unknown");
}

function valueOf(field, text) {
  if (typeof text !== "string") return null;
  if (field === "iso") {
    if (/^(?:auto|auto iso)$/i.test(text)) return "auto";
    if (!/^\d+$/.test(text)) return null; // Keine Mehrbild-Rauschminderung aktivieren.
    const iso = Number(text);
    return iso >= 100 && iso <= 102400 ? iso : null;
  }
  if (field === "aperture") {
    const match = /^(?:f\/)?(\d+(?:\.\d+)?)$/i.exec(text);
    const f = match && Number(match[1]);
    return f > 0 && f < 100 ? f : null;
  }
  const match = /^(\d+(?:\.\d+)?)(?:\/(\d+))?(?:\s*s)?$/.exec(text);
  if (!match) return null;
  const seconds = Number(match[1]) / Number(match[2] || 1);
  return seconds >= 1 / 4000 && seconds <= 30 ? seconds : null;
}

// F-Zahlen in ganzzahligen Hundertsteln behandeln, damit die Raster beider
// Widgets auch bei Dezimalwerten exakt verglichen werden können.
function apertureRange(widget, scale) {
  if (widget?.Type !== "RANGE") return null;
  const bounds = ["Bottom", "Top", "Step"].map(key => {
    const text = widget[key];
    if (!text || !/^\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(text)) return NaN;
    const n = Number(text) * scale;
    return Math.abs(n - Math.round(n)) < 1e-6 ? Math.round(n) : NaN;
  });
  const [min, max, step] = bounds;
  if (!bounds.every(Number.isSafeInteger) || max < min || step <= 0) return null;
  return { min, max, step };
}

function apertureSettings(widget, raw) {
  if (!["RADIO", "MENU", "RANGE"].includes(widget.Type)) return [];
  const namedRange = apertureRange(widget, 100);
  const rawRange = apertureRange(raw, 1);
  if ((widget.Type === "RANGE" && !namedRange) || (raw?.Type === "RANGE" && !rawRange)) return [];
  const ranges = [namedRange, rawRange].filter(Boolean);
  const rawChoices = raw && ["RADIO", "MENU"].includes(raw.Type)
    ? new Set(raw.choices.filter(n => /^\d+$/.test(n)).map(Number)) : null;
  const bounded = ranges.filter(r => r.min > 0 && r.max < 10000);
  let labels;
  if (["RADIO", "MENU"].includes(widget.Type)) {
    // Der Sony-Treiber bildet auch generische Zahlenbereiche auf eine Liste
    // seiner Standardblenden ab. Diese Liste verrät nichts über das Objektiv.
    if (rawRange && !bounded.length) return [];
    labels = widget.choices;
  } else if (widget.Type === "RANGE" && rawChoices) {
    labels = [...rawChoices].map(n => String(n / 100));
  } else {
    // Keine tausenden Dezimalwerte aus dem synthetischen PTP-Vollbereich
    // erzeugen. Von den brauchbaren Rastern genügt das mit weniger Stufen.
    const range = bounded.filter(r => (r.max - r.min) / r.step < 256)
      .sort((a, b) => (a.max - a.min) / a.step - (b.max - b.min) / b.step)[0];
    if (!range) return [];
    labels = [];
    for (let n = range.min; n <= range.max; n += range.step) labels.push(String(n / 100));
  }
  return labels.filter(label => {
    const f = valueOf("aperture", label);
    if (f === null) return false;
    const n = Math.round(f * 100);
    return Math.abs(f * 100 - n) < 1e-6 && (!rawChoices || rawChoices.has(n)) &&
      ranges.every(r => n >= r.min && n <= r.max && (n - r.min) % r.step === 0);
  });
}

function fieldInfo(field, widget, mode, rawAperture) {
  const current = valueOf(field, widget?.Current);
  const labels = new Map();
  const modeAllows = mode === "M" || (mode === "A" && field !== "shutter");
  if (current !== null && widget?.Readonly === "0" && modeAllows) {
    const available = field === "aperture" ? apertureSettings(widget, rawAperture)
      : ["RADIO", "MENU"].includes(widget.Type) ? widget.choices : [];
    for (const label of available) {
      const value = valueOf(field, label);
      if (value !== null) labels.set(value, label);
    }
  }
  return { public: { current, writable: labels.size > 0, choices: [...labels.keys()] }, labels, path: widget?.path };
}

class GPhotoAdapter {
  constructor({ run, platform = process.platform, exec = execute } = {}) {
    this.run = run || ((args, signal) => command(args, signal, platform, exec));
  }

  async inspect(signal) {
    const port = usbPort(await this.run(["--auto-detect"], signal));
    const list = widgets(await this.run(["--port", port, "--list-all-config"], signal));
    const model = findWidget(list, "model")?.Current;
    if (model !== MODEL) throw failure("unsupported", "Die angeschlossene Kamera ist nicht als Sony ILCE-6400 bestätigt.");
    const serial = findWidget(list, "serial")?.Current || "";
    const id = createHash("sha256").update([model, port, serial].join("\0")).digest("hex");
    const mode = modeName(findWidget(list, "mode")?.Current);
    const fields = {}, controls = {};
    const rawAperture = list.find(widget => widget.path === "/main/other/5007");
    for (const field of ["iso", "aperture", "shutter"]) {
      controls[field] = fieldInfo(field, findWidget(list, field), mode, rawAperture);
      fields[field] = controls[field].public;
    }
    return { snapshot: { source: "usb", id, model, mode, fields }, port, controls };
  }

  async read({ signal } = {}) {
    return (await this.inspect(signal)).snapshot;
  }

  async write(field, value, expected, { signal } = {}) {
    if (!["iso", "aperture", "shutter"].includes(field) || expected?.source !== "usb") {
      throw failure("unsupported", "Ungültiger USB-Schreibauftrag.");
    }
    const { snapshot, port, controls } = await this.inspect(signal);
    const difference = snapshotDifference(expected, snapshot);
    if (difference) throw failure("stale", difference);
    const control = controls[field];
    if (!control.labels.has(value)) throw failure("unsupported", "Dieser Zielwert ist aktuell nicht als schreibbar bestätigt.");
    if (signal?.aborted) throw failure("timeout", "Übertragung abgebrochen.");
    // libgphoto2 setzt den exakten Choice-Text. Ältere Sony-Protokolle können
    // dafür intern schrittweise verstellen. Der Aufrufer liest danach neu.
    const setting = control.path + "=" + control.labels.get(value);
    await this.run(["--port", port, "--set-config-value", setting], signal);
  }
}

module.exports = { GPhotoAdapter };
