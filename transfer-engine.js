/* Gemeinsame Vorschau und bestätigte Einzelübertragung für USB und Simulation. */
(function () {
  "use strict";
  const profiles = typeof module === "object" && module.exports
    ? require("./transfer-profile.js") : globalThis.TransferProfile;
  const fields = ["iso", "aperture", "shutter"];
  const labels = {iso: "ISO", aperture: "Blende", shutter: "Belichtungszeit"};
  const applying = new WeakSet();
  const pending = new WeakSet();

  function failure(code, message) {
    return Object.assign(new Error(message), {code});
  }

  function validateSnapshot(snapshot) {
    if (!snapshot || !["simulation", "usb"].includes(snapshot.source) ||
        typeof snapshot.id !== "string" || !snapshot.id.trim() ||
        typeof snapshot.mode !== "string" || !snapshot.mode.trim()) {
      throw failure("stale", "Gerät und Aufnahmemodus konnten nicht eindeutig gelesen werden.");
    }
    if (snapshot.model !== "ILCE-6400") {
      throw failure("unsupported", "Die verbundene Kamera meldet sich nicht als Sony ILCE-6400.");
    }
    for (const field of fields) {
      const cap = snapshot.fields?.[field];
      const valid = value => value === "auto" ||
        (Number.isFinite(value) && value > 0);
      if (!cap || typeof cap.writable !== "boolean" || !Array.isArray(cap.choices) ||
          !cap.choices.every(valid) || !(cap.current === null || valid(cap.current))) {
        throw failure("stale", "Unvollständige Geräteantwort für " + labels[field] + ".");
      }
    }
    return snapshot;
  }

  function preview(input, snapshot) {
    const profile = profiles.validate(input);
    validateSnapshot(snapshot);
    const targets = {
      iso: profile.iso.kind === "auto" ? "auto" : profile.iso.value,
      aperture: profile.aperture,
      shutter: profile.shutter.kind === "fixed" ? profile.shutter.seconds : null
    };
    const manual = [];
    if (snapshot.mode !== profile.mode) {
      manual.push("Moduswahlrad auf " + profile.mode + " stellen und Kamera erneut lesen.");
    }
    if (profile.iso.kind === "auto") {
      manual.push("Auto-ISO-Grenzen " + profile.iso.min + "–" + profile.iso.max + " an der Kamera einstellen.");
    }
    if (profile.shutter.kind === "minAuto") {
      const denominator = 1 / profile.shutter.seconds;
      const time = Number.isInteger(denominator) && denominator > 1 ? "1/" + denominator : profile.shutter.seconds;
      manual.push("ISO AUTO Min. SS auf " + time + " s als Umschaltschwelle einstellen.");
    }
    manual.push("Profilobjektiv und " + profile.focalMm + " mm vor Ort prüfen. Fokus, Stabilisierung und Bildfolge gemäß Bedienfolge einstellen.");
    const rows = fields.map(field => {
      const target = targets[field];
      const {current, writable, choices} = snapshot.fields[field];
      let message;
      if (target === null) message = profile.shutter.kind === "minAuto"
        ? "Umschaltschwelle manuell einstellen." : "Die Kamera bestimmt die Zeit.";
      else if (snapshot.mode !== profile.mode) message = "Zuerst den Moduswahlrad-Schritt ausführen.";
      else if (current === null) message = "Istwert kann nicht gelesen werden.";
      else if (current === target) return {field, target, current, status: "already"};
      else if (!writable) message = "Die Kamera erlaubt hierfür keinen Schreibzugriff.";
      else if (!choices.includes(target)) message = "Zielwert wird in den aktuellen Kameraoptionen nicht angeboten.";
      else return {field, target, current, status: "ready"};
      if (target !== null && snapshot.mode === profile.mode) manual.push(labels[field] + " vor Ort prüfen. " + message);
      return {field, target, current, status: "manual", message};
    });
    return {rows, manual};
  }

  function snapshotDifference(before, after, writing) {
    if (before.source !== after.source || before.id !== after.id || before.model !== after.model) {
      return "Die Geräteidentität hat sich seit der Vorschau geändert.";
    }
    if (before.mode !== after.mode) return "Der Aufnahmemodus hat sich seit der Vorschau geändert.";
    for (const field of fields) {
      const previous = before.fields[field];
      const next = after.fields[field];
      if (previous.writable !== next.writable || previous.choices.length !== next.choices.length ||
          previous.choices.some(choice => !next.choices.includes(choice))) {
        return "Die verfügbaren Einstellungen für " + labels[field] + " haben sich geändert.";
      }
      // Im A-Modus darf die Belichtungsmessung die automatische Zeit laufend ändern.
      if (field !== writing && !(field === "shutter" && before.mode === "A" && !previous.writable) &&
          previous.current !== next.current) {
        return "Der gelesene Wert für " + labels[field] + " hat sich inzwischen geändert.";
      }
    }
    return null;
  }

  async function bounded(adapter, timeout, invoke) {
    const controller = new AbortController();
    let timer;
    // Ein Adapter kann das Signal verspätet beachten. Bis zur tatsächlichen Beendigung
    // des Aufrufs darf ein weiterer Klick kein zweites Schreiben starten.
    pending.add(adapter);
    const operation = Promise.resolve().then(() => invoke(controller.signal))
      .finally(() => pending.delete(adapter));
    try {
      return await Promise.race([operation, new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(failure("timeout", "Die Kamera hat innerhalb des Zeitlimits nicht geantwortet."));
        }, timeout);
      })]);
    } finally {
      clearTimeout(timer);
    }
  }

  async function read(adapter) {
    return structuredClone(validateSnapshot(await bounded(adapter, 28000, signal => adapter.read({signal}))));
  }

  async function apply(adapter, input, expectedSnapshot) {
    if (applying.has(adapter) || pending.has(adapter)) {
      throw failure("busy", "Eine Kameraoperation läuft bereits.");
    }
    const expected = structuredClone(expectedSnapshot);
    const {rows, manual} = preview(input, expected);
    const result = {rows, manual, status: "unchanged", stale: false, snapshot: null};
    function stop(message, stale) {
      for (const row of rows) {
        if (row.status === "ready") row.status = "skipped";
      }
      result.status = rows.some(row => row.status === "verified") ? "partial" : "failed";
      result.stale = stale;
      result.message = message;
      return result;
    }
    function accept(snapshot, baseline, writing) {
      result.snapshot = snapshot;
      const change = snapshotDifference(baseline, snapshot, writing);
      if (snapshot.id === expected.id && snapshot.source === expected.source && snapshot.mode === expected.mode) {
        for (const row of rows) {
          row.current = snapshot.fields[row.field].current;
          if (["verified", "already"].includes(row.status) && row.current !== row.target) {
            row.status = "mismatch";
            row.message = "Der zuvor gelesene Zielwert hat sich wieder geändert.";
          }
        }
      }
      if (change) throw failure("stale", change);
    }

    applying.add(adapter);
    try {
      let baseline = expected;
      let started = false;
      for (const row of rows) {
        if (row.status !== "ready") continue;
        // Auch nach einer bestätigten Änderung erneut prüfen, bevor das nächste Feld geschrieben wird.
        const before = await read(adapter);
        accept(before, baseline);
        started = true;
        try {
          await bounded(adapter, 40000, signal => adapter.write(row.field, row.target, before, {signal}));
        } catch (error) {
          const rejected = ["unsupported", "rejected"].includes(error.code);
          row.status = rejected ? "rejected" : error.code === "disconnected" ? "interrupted" : "unverified";
          row.current = null;
          row.message = error.message;
          return stop(error.message, true);
        }
        row.status = "unverified";
        row.current = null;
        // Höchstens drei Leseversuche für zeitversetzte Kameraanzeigen. Pro Feld nur ein Schreibbefehl.
        for (let attempt = 0; attempt < 3; attempt++) {
          if (attempt) await new Promise(resolve => setTimeout(resolve, 180));
          const after = await read(adapter);
          accept(after, before, row.field);
          if (row.current === row.target) {
            row.status = "verified";
            baseline = after;
            break;
          }
        }
        if (row.status !== "verified") {
          row.status = row.current === null ? "unverified" : "mismatch";
          row.message = row.current === null ? "Rücklesung des Werts fehlt." : "Rückgelesener Wert weicht vom Ziel ab.";
          return stop(row.message, true);
        }
      }
      if (!started) accept(await read(adapter), expected);
      const outstanding = rows.some(row => row.target !== null && row.status === "manual");
      if (started) result.status = outstanding ? "partial" : "confirmed";
      else result.status = outstanding ? "manual" : "unchanged";
      return result;
    } catch (error) {
      const uncertain = rows.find(row => row.status === "unverified");
      if (uncertain) {
        uncertain.message = error.message;
        if (error.code === "disconnected") uncertain.status = "interrupted";
      }
      return stop(error.message, true);
    } finally {
      applying.delete(adapter);
    }
  }

  let simulationId = 0;
  class SimulationAdapter {
    constructor(mode = "A") {
      if (!["A", "M"].includes(mode)) throw new Error("Simulation unterstützt A und M.");
      const choices = {
        iso: ["auto",100,125,160,200,250,320,400,500,640,800,1000,1250,1600,2000,2500,3200,4000,5000,6400,8000,10000,12800,16000,20000,25600,32000],
        aperture: [2.8,3.2,3.5,4,4.5,5,5.6,6.3,7.1,8,9,10,11,13,14,16],
        shutter: [1/4000,1/2000,1/1000,1/500,1/250,1/125,1/60,1/30,1/15,1/8,1/4,0.5,1,2,4,8,15,30]
      };
      this.snapshot = {
        source: "simulation", id: "simulation-" + ++simulationId, model: "ILCE-6400", mode,
        fields: {
          iso: {current: 200, writable: true, choices: choices.iso},
          aperture: {current: 4, writable: true, choices: choices.aperture},
          shutter: {current: 1/60, writable: mode === "M", choices: mode === "M" ? choices.shutter : []}
        }
      };
    }
    async read() {
      return structuredClone(this.snapshot);
    }
    async write(field, value, expected) {
      const change = snapshotDifference(expected, this.snapshot);
      if (change) throw failure("stale", change);
      const capability = this.snapshot.fields[field];
      if (!fields.includes(field) || !capability.writable || !capability.choices.includes(value)) {
        throw failure("rejected", "Simulation lehnt diesen Wert ab.");
      }
      capability.current = value;
    }
  }

  async function readForPreview(adapter) {
    if (applying.has(adapter) || pending.has(adapter)) throw failure("busy", "Eine Kameraoperation läuft bereits.");
    return read(adapter);
  }

  const api = {preview, apply, readForPreview, SimulationAdapter, snapshotDifference};
  if (typeof module === "object" && module.exports) module.exports = api;
  else globalThis.TransferEngine = api;
})();
