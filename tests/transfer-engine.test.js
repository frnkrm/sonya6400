"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {preview, apply, SimulationAdapter} = require("../transfer-engine.js");

const base = {version: 1, model: "ILCE-6400", lens: "tam", focalMm: 17, aperture: 8};
const landscape = {...base, mode: "A", iso: {kind: "auto", min: 100, max: 3200},
  shutter: {kind: "minAuto", seconds: 1/125}};
const manual = {...base, mode: "M", iso: {kind: "fixed", value: 100}, shutter: {kind: "fixed", seconds: 1/250}};
const statuses = result => result.rows.map(row => row.status);

function tracked(mode = "M") {
  const device = new SimulationAdapter(mode);
  const writes = [];
  return {
    device, writes,
    read: options => device.read(options),
    write: async (field, value, snapshot, options) => {
      writes.push(field);
      await device.write(field, value, snapshot, options);
    }
  };
}

test("C-01/04: A-Vorschau und Übertragung trennen Auto ISO, Grenzen und Min. SS", async () => {
  const adapter = tracked("A");
  const snapshot = await adapter.read();
  const plan = preview(landscape, snapshot);
  assert.deepEqual(statuses(plan), ["ready", "ready", "manual"]);
  assert.equal(plan.rows[0].target, "auto");
  assert.equal(plan.rows[2].target, null);
  assert.match(plan.manual.join(" "), /100–3200.*1\/125/);
  assert.deepEqual(adapter.writes, []);
  const result = await apply(adapter, landscape, snapshot);
  assert.equal(result.status, "confirmed");
  assert.deepEqual(adapter.writes, ["iso","aperture"]);
  assert.deepEqual(statuses(result), ["verified","verified","manual"]);
  assert.equal(result.snapshot.source, "simulation");
  assert.deepEqual(result.rows.map(row => row.current), ["auto",8,1/60]);
});

test("C-04: real gelesene Istwerte, eine Schreiboperation pro Ziel, bereits passend ohne Schreiben", async () => {
  const adapter = tracked();
  const result = await apply(adapter, manual, await adapter.read());
  assert.equal(result.status, "confirmed");
  assert.deepEqual(result.rows.map(row => row.current), [100,8,1/250]);
  assert.deepEqual(statuses(result), ["verified","verified","verified"]);
  const repeated = await apply(adapter, manual, result.snapshot);
  assert.equal(repeated.status, "unchanged");
  assert.deepEqual(statuses(repeated), ["already","already","already"]);
  assert.deepEqual(adapter.writes, ["iso","aperture","shutter"]);
});

test("C-01: falscher Modus, fehlende Wahlwerte und fehlende Lesbarkeit lassen manuelle Schritte offen", async () => {
  const adapter = tracked();
  const wrongMode = await apply(adapter, landscape, await adapter.read());
  assert.equal(wrongMode.status, "manual");
  assert.match(wrongMode.manual.join(" "), /Moduswahlrad auf A/);
  assert.deepEqual(adapter.writes, []);
  adapter.device.snapshot.fields.aperture.choices = [4,5.6];
  adapter.device.snapshot.fields.shutter.current = null;
  const result = await apply(adapter, manual, await adapter.read());
  assert.equal(result.status,"partial");
  assert.deepEqual(statuses(result), ["verified","manual","manual"]);
  assert.deepEqual(adapter.writes, ["iso"]);
});

test("C-01: Gerätewechsel, geänderte Fähigkeiten und Bedienung seit Vorschau sperren Schreiben", async () => {
  for (const alter of [s => s.id = "neu", s => s.source = "usb", s => s.mode = "A",
    s => s.fields.iso.writable = false, s => s.fields.iso.choices.pop(), s => s.fields.iso.current = 500]) {
    const adapter = tracked();
    const expected = await adapter.read();
    alter(adapter.device.snapshot);
    const result = await apply(adapter, manual, expected);
    assert.equal(result.status, "failed");
    assert.equal(result.stale,true);
    assert.deepEqual(adapter.writes, []);
  }
});

test("C-04: abgewiesene Blende kennzeichnet bestätigte ISO und überspringt die Zeit", async () => {
  const adapter = tracked();
  const write = adapter.write;
  adapter.write = async (...args) => {
    if (args[0] === "aperture") throw Object.assign(new Error("Abgewiesen"), {code:"rejected"});
    await write(...args);
  };
  const result = await apply(adapter, manual, await adapter.read());
  assert.equal(result.status,"partial");
  assert.deepEqual(statuses(result), ["verified","rejected","skipped"]);
  assert.deepEqual(adapter.writes, ["iso"]);
  assert.equal(result.rows[0].current, 100);
});

test("Native Stufensteuerung bietet das Ziel unter Vorbehalt an und prüft die Freigabe erneut", async () => {
  const adapter = tracked();
  const state = adapter.device.snapshot;
  state.source = "usb";
  state.fields.aperture = {current: 4, writable: true, choices: [], relative: true};
  const snapshot = await adapter.read();
  const row = preview(manual, snapshot).rows[1];
  assert.equal(row.status, "ready");
  assert.match(row.message, /Stufen/);
  state.fields.aperture.relative = false;
  assert.equal(preview(manual, state).rows[1].status, "manual");
  const result = await apply(adapter, manual, snapshot);
  assert.equal(result.stale, true);
  assert.deepEqual(adapter.writes, []);
});

test("ISO braucht angebotene Ziele, auch bei nativer Stufensteuerung für andere Felder", async () => {
  const state = await new SimulationAdapter("M").read();
  state.source = "usb";
  state.fields.iso = {current: 400, writable: true, choices: []};
  assert.equal(preview(manual, state).rows[0].status, "manual");
  state.fields.iso.relative = true;
  assert.throws(() => preview(manual, state), /Unvollständige Geräteantwort für ISO/);
});

test("C-04: ausbleibende und abweichende Rücklesung bewirken keinen zweiten Schreibbefehl", async () => {
  for (const current of [null,200]) {
    const adapter = tracked();
    adapter.write = async field => {
      adapter.writes.push(field);
      adapter.device.snapshot.fields[field].current = current;
    };
    const result = await apply(adapter, manual, await adapter.read());
    assert.deepEqual(adapter.writes, ["iso"]);
    assert.equal(result.status, "failed");
    assert.equal(result.rows[0].status, current === null ? "unverified" : "mismatch");
    assert.equal(result.rows[0].current, current);
    assert.equal(result.stale, true);
  }
});

test("C-04: verzögert sichtbare Kameraänderung wird erst nach gelesener Bestätigung gemeldet", async () => {
  const adapter = tracked();
  const read = adapter.read;
  let delay = true;
  adapter.read = async () => {
    const state = await read();
    if (delay && adapter.writes.length === 1) {
      delay = false;
      state.fields.iso.current = 200;
    }
    return state;
  };
  const result = await apply(adapter, manual, await adapter.read());
  assert.equal(result.status,"confirmed");
  assert.deepEqual(adapter.writes, ["iso","aperture","shutter"]);
});

test("C-04: Moduswechsel zwischen Feldern stoppt den nächsten Schreibbefehl", async () => {
  const adapter = tracked();
  const read = adapter.read;
  let readbacks = 0;
  adapter.read = async () => {
    if (adapter.writes.length === 1 && ++readbacks === 2) adapter.device.snapshot.mode = "A";
    return read();
  };
  const result = await apply(adapter, manual, await adapter.read());
  assert.deepEqual(adapter.writes, ["iso"]);
  assert.equal(result.status, "partial");
  assert.deepEqual(statuses(result), ["verified","skipped","skipped"]);
  assert.equal(result.stale,true);
});

test("C-04: Fremdgerät während Rücklesung und Verbindungsabbruch bestätigen keinen neuen Wert", async () => {
  for (const disconnect of [true,false]) {
    const adapter = tracked();
    const read = adapter.read;
    adapter.read = async () => {
      if (adapter.writes.length === 1) {
        if (disconnect) throw Object.assign(new Error("Getrennt"), {code:"disconnected"});
        adapter.device.snapshot.id = "anderes Gerät";
      }
      return read();
    };
    const result = await apply(adapter, manual, await adapter.read());
    assert.equal(result.status, "failed");
    assert.equal(result.rows[0].status, disconnect ? "interrupted" : "unverified");
    assert.equal(result.rows[0].current,null);
    assert.deepEqual(adapter.writes, ["iso"]);
  }
});

test("C-04: paralleles Übertragen wird geblockt, ungültige Profile lösen keine Operation aus", async () => {
  const adapter = tracked();
  const expected = await adapter.read();
  await assert.rejects(apply(adapter, {...manual, version:4}, expected), /Profilversion/);
  assert.deepEqual(adapter.writes, []);
  const first = apply(adapter,manual,expected);
  await assert.rejects(apply(adapter,manual,expected), error => error.code === "busy");
  assert.equal((await first).status,"confirmed");
});

test("C-04: Zeitlimit bricht hängendes Schreiben ab und sperrt bis Ende des laufenden Aufrufs", async t => {
  t.mock.timers.enable({apis:["setTimeout"]});
  const adapter = tracked();
  let unblock, signal, started;
  const writing = new Promise(resolve => { started = resolve; });
  adapter.write = (field, value, expected, options) => {
    adapter.writes.push(field);
    signal = options.signal;
    started();
    return new Promise(resolve => { unblock = resolve; });
  };
  const expected = await adapter.read();
  const operation = apply(adapter, manual, expected);
  await writing;
  t.mock.timers.tick(41000);
  const result = await operation;
  assert.equal(signal.aborted, true);
  assert.equal(result.rows[0].status, "unverified");
  assert.deepEqual(adapter.writes, ["iso"]);
  await assert.rejects(apply(adapter, manual, expected), error => error.code === "busy");
  unblock();
});

test("C-04: Die gemessene Zeit in A darf sich ändern, ein zuvor bestätigter ISO-Wert in M nicht", async () => {
  const auto = tracked("A");
  const readAuto = auto.read;
  auto.read = async () => {
    const snapshot = await readAuto();
    snapshot.fields.shutter.current = auto.writes.length ? 1/250 : "auto";
    return snapshot;
  };
  const ok = await apply(auto, landscape, await auto.read());
  assert.equal(ok.status, "confirmed");
  assert.equal(ok.rows[2].current, 1/250);

  const device = tracked();
  const readFixed = device.read;
  device.read = async () => {
    const snapshot = await readFixed();
    if (device.writes.length === 2) snapshot.fields.iso.current = 400;
    return snapshot;
  };
  const stale = await apply(device, manual, await device.read());
  assert.equal(stale.stale, true);
  assert.deepEqual(device.writes, ["iso", "aperture"]);
  assert.equal(stale.rows[0].status, "mismatch");
  assert.equal(stale.rows[0].current, 400);
  assert.notEqual(stale.status, "confirmed");
});

test("Einzeltest prüft und überträgt nur ISO mit bestätigter Rücklesung", async () => {
  const adapter = tracked("M");
  const before = await adapter.read();
  assert.deepEqual(preview(manual, before, "iso").rows.map(row => row.field), ["iso"]);
  await assert.rejects(apply(adapter, manual, before, "shutter"), {code: "scope"});
  const result = await apply(adapter, manual, before, "iso");
  assert.equal(result.status, "confirmed");
  assert.deepEqual(result.rows, [{field: "iso", target: 100, current: 100, status: "verified"}]);
  assert.deepEqual(result.snapshot.fields.aperture, before.fields.aperture);
  assert.deepEqual(result.snapshot.fields.shutter, before.fields.shutter);
  assert.deepEqual(adapter.writes, ["iso"]);
});

test("ISO-Einzeltest respektiert Modus, gemeldete Werte und unverändertes ISO", async () => {
  const adapter = tracked("A");
  const before = await adapter.read();
  assert.equal((await apply(adapter, manual, before, "iso")).status, "manual");
  const profile = {...base, mode:"A", iso:{kind:"fixed",value:200}, shutter:{kind:"metered"}};
  assert.equal((await apply(adapter, profile, before, "iso")).status, "unchanged");
  assert.equal((await apply(adapter, {...profile, iso:{kind:"fixed",value:211}}, before, "iso")).status, "manual");
  assert.deepEqual(adapter.writes, []);
});
