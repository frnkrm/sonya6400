"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const {once} = require("node:events");
const {createApp} = require("../local/server.js");
const {SimulationAdapter} = require("../transfer-engine.js");

async function setup(t, windowsIso = null) {
  const adapter = new SimulationAdapter("M");
  const writes = [];
  const write = adapter.write.bind(adapter);
  adapter.write = async (...args) => {
    writes.push(args[0]);
    return write(...args);
  };
  const app = createApp(adapter, windowsIso);
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
