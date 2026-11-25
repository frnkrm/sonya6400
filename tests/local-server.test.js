"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const {once} = require("node:events");
const {createApp} = require("../local/server.js");
const {SimulationAdapter} = require("../transfer-engine.js");

async function setup(t) {
  const adapter = new SimulationAdapter("M");
  const writes = [];
  const write = adapter.write.bind(adapter);
  adapter.write = async (...args) => {
    writes.push(args[0]);
    return write(...args);
  };
  const app = createApp(adapter);
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
