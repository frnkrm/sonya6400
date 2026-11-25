"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const {once} = require("node:events");
const {createApp} = require("../local/server.js");
const {SimulationAdapter} = require("../transfer-engine.js");

async function setup(t, windowsIso = null, windowsStep = null, readExposure = null, stepExposure = null, windowsProfile = null) {
  const adapter = new SimulationAdapter("M");
  const writes = [];
  const write = adapter.write.bind(adapter);
  adapter.write = async (...args) => {
    writes.push(args[0]);
    return write(...args);
  };
  const app = createApp(adapter, windowsIso, windowsStep, readExposure, stepExposure, windowsProfile);
  app.listen(0, "127.0.0.1");
  await once(app, "listening");
  t.after(() => new Promise(resolve => {
    app.close(resolve);
    app.closeAllConnections();
  }));
  const origin = "http://127.0.0.1:" + app.address().port;
  async function session() {
    const response = await fetch(origin + "/api/session");
    assert.equal(response.headers.get("cache-control"), "no-store");
    return (await response.json()).token;
  }
  function post(action, token, body, overrides) {
    return fetch(origin + "/api/" + action, {
      method: "POST", headers: {
        Origin: origin, "Content-Type": "application/json", "X-Session": token, ...overrides
      }, body: JSON.stringify(body)
    });
  }
  return {adapter, origin, session, post, writes};
}

const profile = {
  version: 1, model: "ILCE-6400", mode: "M", lens: "tam", focalMm: 17,
  aperture: 8, iso: {kind: "fixed", value: 100}, shutter: {kind: "fixed", seconds: 1}
};

test("Kamerasitzung verlangt lokale Adresse, Ursprung und gültige Sitzung", async t => {
  const {origin, session, post, writes} = await setup(t);
  assert.equal((await fetch(origin + "/local/server.js")).status, 404);
  assert.equal((await fetch(origin + "/api/read")).status, 405);
  const token = await session();
  assert.equal((await post("read", "", {})).status, 403);
  const denied = await post("read", token, {}, {Origin: "https://sonyalpha6400.frnkrm.com"});
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get("access-control-allow-origin"), null);
  const wrongHost = await new Promise((resolve, reject) => {
    http.get(origin + "/api/session", {headers: {Host: "localhost.invalid"}}, res => {
      res.resume();
      resolve(res.statusCode);
    }).on("error", reject);
  });
  assert.equal(wrongHost, 403);
  assert.equal((await post("apply", token, {profile})).status, 409);
  assert.deepEqual(writes, []);
});

test("Nur eine Vorschau aus der eigenen Sitzung startet einen Schreibauftrag", async t => {
  const {session, post, writes} = await setup(t);
  const token = await session();
  const other = await session();
  const read = await post("read", token, {});
  assert.equal(read.status, 200);
  const expected = await read.json();
  assert.equal((await post("apply", other, {profile, expected})).status, 409);
  assert.equal((await post("apply", token, {profile: {...profile, version: 2}, expected})).status, 400);
  assert.deepEqual(writes, []);
  const response = await post("apply", token, {profile, expected});
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.status, "confirmed");
  assert.deepEqual(result.rows.map(row => row.current), [100, 8, 1]);
  assert.equal((await post("apply", token, {profile, expected})).status, 409);
  assert.deepEqual(writes, ["iso", "aperture", "shutter"]);
});

test("Ein laufender Lesevorgang sperrt die Kamera auch für andere Sitzungen", async t => {
  const {adapter, session, post} = await setup(t);
  const first = await session();
  const second = await session();
  const original = adapter.read.bind(adapter);
  let release, notify;
  const started = new Promise(resolve => { notify = resolve; });
  adapter.read = async () => {
    notify();
    await new Promise(resolve => { release = resolve; });
    return original();
  };
  const pending = post("read", first, {});
  await started;
  try {
    assert.equal((await post("read", second, {})).status, 409);
  } finally {
    release();
  }
  assert.equal((await pending).status, 200);
});

test("Die USB-Sitzung akzeptiert explizit ISO allein und verbraucht diese Vorschau", async t => {
  const {session, post, writes} = await setup(t);
  const token = await session();
  const expected = await (await post("read", token, {})).json();
  for (const body of [{scope: null}, {scope: "aperture"}, {scope: ["iso"]}, {scopes: ["iso"]}]) {
    assert.equal((await post("apply", token, {profile, expected, ...body})).status, 400);
  }
  assert.deepEqual(writes, []);
  const result = await (await post("apply", token, {profile, expected, scope: "iso"})).json();
  assert.equal(result.status, "confirmed");
  assert.deepEqual(result.rows.map(row => row.field), ["iso"]);
  assert.deepEqual(writes, ["iso"]);
  assert.equal((await post("apply", token, {profile, expected})).status, 409);
});

test("Native Windows-Abfrage liest nur Modell und ISO und entwertet Schreibvorschauen", async t => {
  let reads = 0;
  const {origin, post, writes} = await setup(t, async () => {
    reads++;
    return {model: "ILCE-6400", iso: 400, serial: "fixture-private"};
  });
  const {token, windowsIso} = await (await fetch(origin + "/api/session")).json();
  assert.equal(windowsIso, true);
  const expected = await (await post("read", token, {})).json();
  assert.equal((await post("windows-iso", token, {iso: 800})).status, 400);
  assert.equal((await post("windows-iso", "", {})).status, 403);
  assert.equal((await post("windows-iso", token, {}, {Origin: "https://example.org"})).status, 403);
  assert.equal(reads, 0);
  const res = await post("windows-iso", token, {});
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.deepEqual(await res.json(), {model: "ILCE-6400", iso: 400});
  assert.equal((await post("apply", token, {profile, expected})).status, 409);
  assert.equal(reads, 1);
  assert.deepEqual(writes, []);
});

test("Lokale Anwendung ohne Windows-Leser meldet die Fähigkeit als inaktiv", async t => {
  const {origin, post} = await setup(t);
  const session = await (await fetch(origin + "/api/session")).json();
  assert.equal(session.windowsIso, false);
  assert.equal((await post("windows-iso", session.token, {})).status, 409);
});

test("Der Windows-Lesetest liefert Modus und unveränderten Rohwert nur zur Anzeige", async t => {
  const model = "ILCE-6400";
  let reading;
  const {post, session, writes} = await setup(t, async () => ({model, ...reading, serial: "private"}));
  const token = await session();
  for (reading of [
    {iso: "auto", mode: "mfnr"}, {iso: 25}, {iso: 409600, mode: "mfnrPlus"},
    {iso: 400, mode: "unknown", rawIso: "0xA5000190"}, {iso: "auto", mode: "unknown", rawIso: "0xA5FFFFFF"},
    {iso: null, rawIso: "0xFA01F0C3"}
  ]) {
    const result = await post("windows-iso", token, {});
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), {model, ...reading});
  }
  for (reading of [
    {iso: 400, mode: "unbekannt"}, {iso: null, rawIso: "0x01"},
    {iso: 400, rawIso: "0x00000001"}, {iso: null, rawIso: "0x000000af"}, {iso: 409601}
  ]) {
    assert.equal((await post("windows-iso", token, {})).status, 502);
  }
  assert.deepEqual(writes, []);
});

const nativeKey = "ab".repeat(32);
const qualified = {model: "ILCE-6400", iso: 400, stepKey: nativeKey};

test("Windows-Schritt ist sitzungsgebunden, einmalig und verwendet den internen Schlüssel", async t => {
  const called = [];
  const {session, post, writes} = await setup(t, async () => qualified, async key => {
    called.push(key);
    return {model: "ILCE-6400", iso: 500};
  });
  const token = await session(), other = await session();
  const value = await (await post("windows-iso", token, {})).json();
  assert.match(value.stepTicket, /^[0-9a-f]{32}$/);
  assert.deepEqual(Object.keys(value).sort(), ["iso", "model", "stepTicket"]);
  assert.notEqual(value.stepTicket, nativeKey);
  const action = "windows-iso-step", body = {ticket: value.stepTicket};
  assert.equal((await post(action, other, body)).status, 409);
  assert.equal((await post(action, token, body, {Origin: "https://example.org"})).status, 403);
  assert.equal((await post(action, token, {...body, iso: 800})).status, 400);
  assert.deepEqual(called, []);
  const res = await post(action, token, body);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {model: "ILCE-6400", iso: 500});
  assert.equal((await post(action, token, body)).status, 409);
  assert.deepEqual(called, [nativeKey]);
  assert.deepEqual(writes, []);
});

test("Nur feste ISO 400 mit gültigem Schlüssel qualifiziert, erneutes Lesen und Zeitablauf sperren", async t => {
  let reading = qualified;
  let count = 0;
  const {session, post} = await setup(t, async () => reading, async () => { count++; });
  const token = await session(), other = await session();
  async function readTicket() {
    return (await (await post("windows-iso", token, {})).json()).stepTicket;
  }
  const previous = await readTicket();
  await post("read", other, {});
  assert.equal((await post("windows-iso-step", token, {ticket: previous})).status, 409);
  for (reading of [{...qualified, iso: 500}, {...qualified, mode: "mfnr"}, {...qualified, stepKey: "invalid"},
    {model: "ILCE-6400", iso: null, rawIso: "0xA1000001"}]) {
    assert.equal(await readTicket(), undefined);
  }
  reading = qualified;
  const ticket = await readTicket(), now = Date.now();
  t.mock.method(Date, "now", () => now + 120_001);
  assert.equal((await post("windows-iso-step", token, {ticket})).status, 409);
  assert.equal(count, 0);
});

test("Unbestätigtes Ergebnis verbraucht den Windows-Schritt und sperrt parallel laufende Aufträge", async t => {
  let started, finish;
  const running = new Promise(resolve => { started = resolve; });
  const {session, post} = await setup(t, async () => qualified, async () => {
    started();
    return new Promise(resolve => { finish = resolve; });
  });
  const token = await session();
  const {stepTicket: ticket} = await (await post("windows-iso", token, {})).json();
  const pending = post("windows-iso-step", token, {ticket});
  await running;
  try {
    assert.equal((await post("windows-iso", token, {})).status, 409);
    assert.equal((await post("windows-iso-step", token, {ticket})).status, 409);
  } finally {
    finish({model: "ILCE-6400", iso: 400});
  }
  assert.equal((await pending).status, 502);
  assert.equal((await post("windows-iso-step", token, {ticket})).status, 409);
});

test("Die Windows-Freigabe gilt genau für die gelesene Einstellung und das zugeordnete Gerät", async t => {
  const called = [];
  const model = "ILCE-6400";
  const key = nativeKey;
  const readings = {
    aperture: {model, field: "aperture", value: 800, stepKey: key},
    shutter: {model, field: "shutter", value: (2 << 16) + 250, stepKey: key}
  };
  const {session, post, origin} = await setup(t, () => qualified, () => assert.fail("ISO"), field => readings[field],
    (field, deviceKey) => {
      called.push([field, deviceKey]);
      return {model, field, value: field === "aperture" ? 900 : (2 << 16) + 320};
    });
  const token = await session(), other = await session();
  assert.equal((await (await fetch(origin + "/api/session")).json()).windowsExposure, true);
  for (const field of ["aperture", "shutter"]) {
    const path = "windows-" + field;
    const response = await (await post(path, token, {})).json();
    assert.equal(response.value, readings[field].value);
    assert.equal(response.stepKey, undefined);
    assert.match(response.stepTicket, /^[a-f0-9]{32}$/u);
    const body = {ticket: response.stepTicket};
    const wrongField = field === "aperture" ? "shutter" : "aperture";
    assert.equal((await post("windows-" + wrongField + "-step", token, body)).status, 409);
    assert.equal((await post("windows-iso-step", token, body)).status, 409);
    assert.equal((await post(path + "-step", other, body)).status, 409);
    assert.equal((await post(path + "-step", token, {...body, target: 900})).status, 400);
    const success = await post(path + "-step", token, body);
    assert.equal(success.status, 200);
    assert.deepEqual(await success.json(), {model, field, value: field === "aperture" ? 900 : (2 << 16) + 320});
    assert.equal((await post(path + "-step", token, body)).status, 409);
  }
  assert.deepEqual(called, [["aperture", key], ["shutter", key]]);
});

test("Abweichende Rücklesungen, neue Vorschauen und gesperrte Felder bestätigen keinen Windows-Schritt", async t => {
  const model = "ILCE-6400", field = "aperture";
  const preview = {model, field, value: 800, stepKey: nativeKey};
  let reading = preview, result;
  const {session, post} = await setup(t, () => qualified, null, () => reading, () => result);
  const token = await session();
  const read = async () => (await post("windows-aperture", token, {})).json();
  const step = ticket => post("windows-aperture-step", token, {ticket});
  const first = await read();
  await post("windows-iso", token, {});
  assert.equal((await step(first.stepTicket)).status, 409);
  for (reading of [{...preview, value: 900}, {...preview, stepBlock: "access"},
    {...preview, value: null}, {...preview, stepKey: "bad"}]) assert.equal((await read()).stepTicket, undefined);
  reading = preview;
  for (result of [{model, field, value: 800}, {model, field: "shutter", value: 900},
    {model, field, value: 900, stepBlock: "mode"}, {model: "other", field, value: 900}]) {
    const {stepTicket} = await read();
    assert.equal((await step(stepTicket)).status, 502);
    assert.equal((await step(stepTicket)).status, 409);
  }
});

test("Native Profilaufträge bleiben an Kameraweg, Sitzung und die aktuelle Vorschau gebunden", async t => {
  const windows = new SimulationAdapter("M");
  const {origin, post, session, writes} = await setup(t, null, null, null, null, windows);
  const first = await (await fetch(origin + "/api/session")).json();
  const other = await session();
  assert.equal(first.windowsProfile, true);
  const transport = "windows";
  const read = async () => (await post("read", first.token, {transport})).json();
  const expected = await read();
  assert.equal(expected.transport, transport);
  assert.equal((await post("apply", other, {transport, profile, expected})).status, 409);
  assert.equal((await post("apply", first.token, {profile, expected})).status, 409);
  assert.equal((await post("apply", first.token, {transport: "other", profile, expected})).status, 400);
  assert.deepEqual(writes, []);
  // A fresh preview over a different transport also revokes this ticket.
  const gphoto = await (await post("read", other, {})).json();
  assert.equal((await post("apply", first.token, {transport, expected, profile})).status, 409);
  assert.equal((await post("apply", other, {transport, expected: gphoto, profile})).status, 409);
  const ticket = (await read()).ticket;
  const response = await post("apply", first.token, {transport, expected: {ticket}, profile});
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.status, "confirmed");
  assert.deepEqual(result.rows.map(row => row.current), [100, 8, 1]);
  assert.equal((await post("apply", first.token, {transport, expected: {ticket}, profile})).status, 409);
  assert.deepEqual(writes, []);
});

test("Natives Profil auf einem Host ohne WPD führt keinen Fallback-Schreibauftrag aus", async t => {
  const {post, session, writes} = await setup(t);
  const token = await session();
  const expected = await (await post("read", token, {})).json();
  assert.equal((await post("read", token, {transport: "windows"})).status, 409);
  assert.equal((await post("apply", token, {transport: "windows", profile, expected})).status, 409);
  assert.equal((await post("read", token, {transport: null})).status, 400);
  assert.deepEqual(writes, []);
});
