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

async function readWindowsIso({platform = process.platform, exec = execute} = {}) {
  if (platform !== "win32") throw failure("unsupported", "Dieser Lesetest benötigt Windows.");
  const compiler = path.win32.join(process.env.SystemRoot || "C:\\Windows",
    "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe");
  const directory = await mkdtemp(path.join(tmpdir(), "sony-wpd-")).catch(() => {
    throw failure("dependency", "Temporärer Ordner für den Windows-Lesetest konnte nicht erstellt werden.");
  });
  const binary = path.join(directory, "SonyIso.exe");
  const options = {cwd: directory, windowsHide: true, encoding: "utf8", maxBuffer: 64 * 1024};
  try {
    // Nur die mitgelieferten Quellen kompilieren. Kamera- und Browserdaten werden
    // weder als Kommandozeilenargumente noch als Programmtext verwendet.
    const sources = ["Wpd.cs", "SonyIso.cs", "Program.cs"].map(name => path.join(__dirname, name));
    try {
      await exec(compiler, ["/nologo", "/noconfig", "/codepage:65001", "/platform:x64", "/target:exe",
        "/reference:System.dll", "/reference:System.Core.dll", "/out:" + binary, ...sources],
        {...options, timeout: 10000});
    } catch (error) {
      if (error.code === "ENOENT")
        throw failure("dependency", "Der 64-Bit-Compiler von .NET Framework 4.x fehlt auf diesem Windows-PC.");
      throw failure("dependency", "Der Windows-Lesehelfer konnte nicht erstellt werden. Das aktuelle Projekt-ZIP vollständig entpacken.");
    }
    let stdout;
    try {
      ({stdout} = await exec(binary, [], {...options, timeout: 30000}));
    } catch (error) {
      if (error.killed) throw failure("timeout", "Der Windows-Treiber hat innerhalb von 30 Sekunden nicht geantwortet.");
      const diagnostic = /^WPD: ([^\r\n]{1,480})$/u.exec(String(error.stderr || "").trim());
      throw failure("readFailed", error.code === 1 && diagnostic
        ? diagnostic[1] : "Windows konnte den ISO-Lesetest nicht ausführen.");
    }
    const value = stdout.trim();
    if (value.toLowerCase() === "auto") return {model: "ILCE-6400", iso: "auto"};
    if (!/^[1-9]\d{1,5}$/.test(value) || Number(value) < 100 || Number(value) > 102400)
      throw failure("unsupported", "Die Kamera lieferte keinen unterstützten ISO-Wert.");
    return {model: "ILCE-6400", iso: Number(value)};
  } finally {
    await rm(directory, {recursive: true, force: true, maxRetries: 3}).catch(() => {});
  }
}

module.exports = {readWindowsIso};
