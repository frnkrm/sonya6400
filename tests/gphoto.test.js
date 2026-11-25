"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { GPhotoAdapter } = require("../local/gphoto.js");

const header = "Model                          Port\n----------------------------------------------------------\n";
const device = "Sony ILCE-6400 (PC Control)    usb:001,009\n";
const detected = header + device;

function widget(path, current, {choices = [], type = "RADIO", readonly = "0", range = ""} = {}) {
  return [path, "Label: Test", "Readonly: " + readonly, "Type: " + type, "Current: " + current,
    ...choices.map((choice, index) => "Choice: " + index + " " + choice), range, "END"].join("\n");
}

function camera(options = {}) {
  return [
    widget("/main/status/cameramodel", options.model || "ILCE-6400", {type: "TEXT"}),
    widget("/main/status/serialnumber", options.serial || "example", {type: "TEXT"}),
    widget("/main/capturesettings/expprogram", options.mode || "M"),
    widget("/main/imgsettings/iso", options.iso || "100", {choices: ["Auto ISO", "100", "200", "102400", "204800", "400 Multi Frame Noise Reduction"]}),
    widget("/main/capturesettings/f-number", "f/5.6", options.aperture || {choices: ["f/4.5", "f/5.6", "f/8", "unknown"]}),
    widget("/main/capturesettings/shutterspeed", "1/125", {choices: ["1/125", "32/10", "1/4000", "1/32000", "Bulb"]}),
    options.extra || ""
  ].join("\n");
}

function fixture(config = camera(), devices = detected) {
  const fixture = { config, devices, writes: [], calls: [] };
  fixture.adapter = new GPhotoAdapter({run: async args => {
    fixture.calls.push(args);
    if (args[0] === "--auto-detect") return fixture.devices;
    assert.deepEqual(args.slice(0, 2), ["--port", "usb:001,009"]);
    if (args[2] === "--list-all-config") return fixture.config;
    assert.equal(args[2], "--set-config-value");
    fixture.writes.push(args[3]);
    return "";
  }});
  return fixture;
}

test("Gerätelesung unterscheidet auto, Einzel-ISO, Bruchsekunden und gemeldete Blenden", async () => {
  const f = fixture();
  const snapshot = await f.adapter.read();
  assert.equal(snapshot.source, "usb");
  assert.equal(snapshot.model, "ILCE-6400");
  assert.equal(snapshot.mode, "M");
  assert.deepEqual(snapshot.fields.iso, {current: 100, writable: true, choices: ["auto", 100, 200, 102400]});
  assert.deepEqual(snapshot.fields.shutter, {current: 1 / 125, writable: true, choices: [1 / 125, 3.2, 1 / 4000]});
  assert.deepEqual(snapshot.fields.aperture, {current: 5.6, writable: true, choices: [4.5, 5.6, 8]});
  assert.deepEqual(f.writes, []);
  assert.ok(!snapshot.id.includes("example"));
});

test("Ein einzelner Schreibbefehl übernimmt die exakte aktuelle Choice-Darstellung", async () => {
  const f = fixture();
  const snapshot = await f.adapter.read();
  await f.adapter.write("shutter", 3.2, snapshot);
  await f.adapter.write("iso", "auto", snapshot);
  await f.adapter.write("aperture", 8, snapshot);
  assert.deepEqual(f.writes, [
    "/main/capturesettings/shutterspeed=32/10", "/main/imgsettings/iso=Auto ISO", "/main/capturesettings/f-number=f/8"
  ]);
  assert.equal(f.calls.filter(a => a.includes("--list-all-config")).length, 4);
});

test("A, unbekannter Modus, Readonly und uneindeutiges Steuerelement begrenzen Fähigkeiten", async () => {
  const f = fixture(camera({mode: "A", aperture: {readonly: "1", choices: ["f/8"]}}));
  let snapshot = await f.adapter.read();
  assert.equal(snapshot.fields.iso.writable, true);
  assert.equal(snapshot.fields.aperture.writable, false);
  assert.equal(snapshot.fields.shutter.writable, false);
  await assert.rejects(f.adapter.write("shutter", 3.2, snapshot), {code: "unsupported"});
  f.config = camera({mode: "Movie"});
  snapshot = await f.adapter.read();
  assert.ok(Object.values(snapshot.fields).every(item => !item.writable));
  f.config = camera({extra: widget("/main/settings/iso", "200", {choices: ["200"]})});
  assert.deepEqual((await f.adapter.read()).fields.iso, {current: null, writable: false, choices: []});
  assert.deepEqual(f.writes, []);
});

test("Generische Blendenliste und numerischer Vollbereich sind kein Nachweis von Objektivwerten", async () => {
  const generic = {type: "RANGE", range: "Bottom: 0\nTop: 65535\nStep: 1"};
  const f = fixture(camera({extra: widget("/main/other/5007", "560", generic)}));
  const expected = {current: 5.6, writable: false, choices: []};
  assert.deepEqual((await f.adapter.read()).fields.aperture, expected);
  f.config = camera({aperture: {type: "RANGE", range: "Bottom: 0\nTop: 655.35\nStep: 0.01"}});
  assert.deepEqual((await f.adapter.read()).fields.aperture, expected);
  f.config = camera({extra: widget("/main/other/5007", "560", {type: "MENU", choices: ["560", "800"]})});
  assert.deepEqual((await f.adapter.read()).fields.aperture.choices, [5.6, 8]);
});

test("Kein Gerät, mehrere Geräte, nicht eindeutiger Port und falsches Modell", async () => {
  for (const [listing, code] of [[header, "disconnected"], [detected + device, "multiple"],
    [header + "Sony Camera   usb:\n", "unsupported"], ["kaputt", "unsupported"]]) {
    const f = fixture("", listing);
    await assert.rejects(f.adapter.read(), {code});
    assert.equal(f.calls.length, 1);
  }
  await assert.rejects(fixture(camera({model: "ILCE-6500"})).adapter.read(), {code: "unsupported"});
});

test("Frischer Modus, Gerätewechsel, veralteter Istwert und verlorene Wahl verhindern Schreiben", async () => {
  const f = fixture();
  const snapshot = await f.adapter.read();
  for (const changes of [{mode: "A"}, {serial: "anderes Gerät"}, {iso: "200"}]) {
    f.config = camera(changes);
    await assert.rejects(f.adapter.write("iso", "auto", snapshot), {code: "stale"});
  }
  f.config = camera({aperture: {choices: ["f/5.6"]}});
  await assert.rejects(f.adapter.write("aperture", 8, snapshot), {code: "stale"});
  f.config = camera();
  await assert.rejects(f.adapter.write("iso", "Auto ISO; example", snapshot), {code: "unsupported"});
  await assert.rejects(f.adapter.write("mode", "A", snapshot), {code: "unsupported"});
  await assert.rejects(f.adapter.write("iso", "auto", snapshot, {signal: AbortSignal.abort()}), {code: "timeout"});
  assert.deepEqual(f.writes, []);
});

test("Nicht lesbarer Istwert und Spezialmodi lösen keine Schreiboperation aus", async () => {
  const f = fixture(camera({iso: "Auto ISO Multi Frame Noise Reduction"}));
  const snapshot = await f.adapter.read();
  assert.deepEqual(snapshot.fields.iso, {current: null, writable: false, choices: []});
  await assert.rejects(f.adapter.write("iso", 200, snapshot), {code: "unsupported"});
  assert.deepEqual(f.writes, []);
});

test("Abgegrenzte Blendenraster und gemeldete Rohwerte werden geschnitten und exakt gesetzt", async () => {
  const range = {type: "RANGE", range: "Bottom: 4\nTop: 8\nStep: 0.5"};
  const f = fixture(camera({aperture: range}));
  let snapshot = await f.adapter.read();
  assert.deepEqual(snapshot.fields.aperture.choices, [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8]);
  await f.adapter.write("aperture", 6.5, snapshot);
  assert.deepEqual(f.writes, ["/main/capturesettings/f-number=6.5"]);
  f.config = camera({aperture: range, extra: widget("/main/other/5007", "560", {type: "MENU", choices: ["200", "450", "560", "800"]})});
  snapshot = await f.adapter.read();
  assert.deepEqual(snapshot.fields.aperture.choices, [4.5, 8]);
  f.config = camera({aperture: {type: "RANGE", range: "Bottom: 0\nTop: 655.35\nStep: 0.01"},
    extra: widget("/main/other/5007", "560", {type: "MENU", choices: ["560", "800"]})});
  assert.deepEqual((await f.adapter.read()).fields.aperture.choices, [5.6, 8]);
});

test("Windows führt Erkennung, Wertprüfung, ISO-Schreiben und Rücklesen in Ubuntu aus", async () => {
  const calls = [];
  let iso = "100";
  const adapter = new GPhotoAdapter({platform: "win32", exec: async (file, args, options) => {
    assert.match(file, /\\System32\\wsl\.exe$/i);
    assert.equal(options.windowsHide, true);
    assert.ok(!options.shell);
    const guestCommand = [
      "--distribution", "Ubuntu", "--cd", "/", "--exec", "/usr/bin/env", "LC_ALL=C", "LANG=C",
      "/usr/bin/timeout", "--kill-after=1s", "10s", "/usr/bin/gphoto2"
    ];
    assert.deepEqual(args.slice(0, guestCommand.length), guestCommand);
    const operation = args.slice(guestCommand.length);
    calls.push(operation);
    if (operation[0] === "--auto-detect") return {stdout: detected};
    if (operation[2] === "--list-all-config") return {stdout: camera({iso})};
    assert.deepEqual(operation, ["--port", "usb:001,009", "--set-config-value", "/main/imgsettings/iso=200"]);
    iso = "200";
    return {stdout: ""};
  }});
  const before = await adapter.read();
  assert.equal(before.fields.iso.current, 100);
  assert.equal(calls.length, 2);
  await adapter.write("iso", 200, before);
  assert.equal((await adapter.read()).fields.iso.current, 200);
  assert.equal(calls.filter(operation => operation.includes("--set-config-value")).length, 1);
});

test("Windows meldet fehlende Einrichtung, abgelaufenen Gastprozess und USB-Trennung", async () => {
  for (const [exit, stderr, code] of [
    ["ENOENT", "", "dependency"],
    [1, Buffer.from("Wsl/Service/WSL_E_DISTRO_NOT_FOUND", "utf16le").toString(), "dependency"],
    [127, "/usr/bin/gphoto2: No such file or directory", "dependency"],
    [124, "", "timeout"], [137, "", "timeout"],
    [1, "Permission denied", "permission"], [1, "Could not claim the USB device", "busy"]
  ]) {
    const adapter = new GPhotoAdapter({platform: "win32", exec: async () => {
      throw Object.assign(new Error(), {code: exit, stderr});
    }});
    await assert.rejects(adapter.read(), {code});
  }
  const detached = new GPhotoAdapter({platform: "win32", exec: async () => ({stdout: header})});
  await assert.rejects(detached.read(), {code: "disconnected", message: /usbipd/});
});

test("CLI-Prozess ordnet Sprache, USB-Fehler, Abbruch und unbestätigte Schreibfehler korrekt zu", {
  skip: process.platform === "win32" && "POSIX-Prozessfixture für den nativen Linux-Adapter"
}, async t => {
  const fs = require("node:fs/promises");
  const os = require("node:os");
  const path = require("node:path");
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sony-gphoto-test-"));
  const previousPath = process.env.PATH;
  process.env.PATH = dir;
  t.after(async () => {
    process.env.PATH = previousPath;
    await fs.rm(dir, {recursive: true, force: true});
  });
  const driver = path.join(dir, "gphoto2");
  const response = path.join(dir, "response");
  await fs.writeFile(path.join(dir, "config"), camera());
  await fs.writeFile(driver, `#!${process.execPath}
"use strict";
const fs = require("node:fs");
const state = fs.readFileSync(__dirname + "/response", "utf8");
if (process.env.LC_ALL !== "C") process.exit(2);
if (state === "timeout") {
  setInterval(() => {}, 1000);
} else if (["*** Could not claim the USB device ***", "Permission denied"].includes(state) || process.argv.includes("--set-config-value")) {
  console.error(state);
  process.exit(1);
} else if (process.argv.includes("--auto-detect")) {
  console.log(${JSON.stringify(detected)});
} else {
  console.log(fs.readFileSync(__dirname + "/config", "utf8"));
}
`, {mode: 0o700});
  const adapter = new GPhotoAdapter();
  for (const [msg, code] of [["*** Could not claim the USB device ***", "busy"], ["Permission denied", "permission"]]) {
    await fs.writeFile(response, msg);
    await assert.rejects(adapter.read(), {code});
  }
  await fs.writeFile(response, "timeout");
  await assert.rejects(adapter.read({signal: AbortSignal.timeout(150)}), {code: "timeout"});
  await fs.writeFile(response, "Some USB I/O error");
  const snapshot = await adapter.read();
  await assert.rejects(adapter.write("iso", 200, snapshot), {code: "unverified"});
  await fs.writeFile(response, "Not a valid choice");
  await assert.rejects(adapter.write("iso", 200, snapshot), {code: "rejected"});
  await fs.unlink(driver);
  await assert.rejects(adapter.read(), {code: "dependency"});
});
