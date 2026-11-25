/* Die Verbindung wird nur hier bedient. Änderungen im Kompass lösen keine Kamerabefehle aus. */
const TransferUI = (() => {
  "use strict";

  const fields = {iso: "ISO", aperture: "Blende", shutter: "Belichtungszeit"};
  const rowStates = {
    ready: "Übertragbar", already: "Bereits eingestellt", manual: "Manuell",
    verified: "Rücklesung bestätigt", rejected: "Abgewiesen", mismatch: "Rücklesung weicht ab",
    unverified: "Rücklesung fehlt", interrupted: "Unterbrochen", skipped: "Übersprungen"
  };
  const resultStates = {
    confirmed: "Bestätigt übernommen (übertragbare Werte)", partial: "Teilweise übernommen",
    failed: "Übertragung fehlgeschlagen", unchanged: "Bereits eingestellt", manual: "Manuell einstellen"
  };
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(location.hostname);
  const maxFileSize = 32 * 1024;
  let root;
  let recommendation;
  let recommendationKey;
  let imported;
  let disabledProfile = false;
  let snapshot;
  let simulation;
  let token;
  let connecting;
  let windowsIso = false;
  let revision = 0;
  let busy = false;
  let pendingRead = false;
  let lastTransfer;

  const el = id => root.querySelector("#transfer-" + id);
  const profile = () => disabledProfile ? null : (imported ? imported.profile : recommendation);
  const isSim = () => el("source").value === "simulation";
  const fmt = n => n.toLocaleString("de-DE", {maximumFractionDigits: 6});
  function node(tag, text) {
    const result = document.createElement(tag);
    result.textContent = text;
    return result;
  }
  function seconds(n) {
    if (n < 1 && n > 0 && Math.abs(1 / n - Math.round(1 / n)) < 0.00001) {
      return "1/" + Math.round(1 / n) + " s";
    }
    return fmt(n) + " s";
  }
  function value(field, v) {
    if (v === "auto") return "Auto";
    if (typeof v !== "number" || !Number.isFinite(v)) return "—";
    if (field === "aperture") return "f/" + fmt(v);
    return field === "shutter" ? seconds(v) : fmt(v);
  }

  function init(container) {
    root = container;
    root.innerHTML = `
      <details id="transfer-panel">
        <summary>Kameraverbindung &amp; Profil</summary>
        <div class="transfer-body">
          <p id="transfer-profile"></p>
          <div class="transfer-actions">
            <button type="button" id="transfer-export" class="chip">Empfehlung als JSON speichern</button>
            <label class="transfer-file">Profil aus Datei laden
              <input id="transfer-import" type="file" accept=".json,application/json">
            </label>
            <button type="button" id="transfer-current" class="chip" hidden>Aktuelle Empfehlung verwenden</button>
          </div>
          <div class="transfer-inputs">
            <label>Verbindung<select id="transfer-source">
              <option value="simulation">Simulation</option>
              <option value="usb">USB am Computer</option>
            </select></label>
            <label id="transfer-mode-label">Simulierter Kameramodus<select id="transfer-mode">
              <option value="A">A · Blendenpriorität</option><option value="M">M · Manuell</option>
            </select></label>
          </div>
          <div id="transfer-usb-help" hidden>
            <p>Unter Windows 11 nach der Einrichtung <code>Start-Kamera.cmd</code> starten.
              <a href="https://github.com/frnkrm/sonya6400/blob/main/docs/WINDOWS-USB.md">Windows-Anleitung</a></p>
            <p>Unter Linux im Projektordner <code>node local/server.js</code> starten.
              <a href="https://github.com/frnkrm/sonya6400/blob/main/docs/DEVELOPMENT.md#lokale-usb-anwendung">Linux-Einrichtung</a></p>
            <p>Auf dem Kameracomputer <code>http://127.0.0.1:8765/</code> öffnen und das Profil laden.
              Die Prüfung an einer echten α6400 steht aus.</p>
          </div>
          <p id="transfer-native-help" hidden>Für den Windows-Lesetest Imaging Edge Remote schließen und die Kamera
            direkt mit Windows verbinden. Für Übertragungen dient die separate USB-Vorschau über gphoto2.</p>
          <div class="transfer-actions">
            <button type="button" id="transfer-windows" class="chip" hidden>ISO über Windows lesen</button>
            <button type="button" id="transfer-read" class="chip">Simulationswerte lesen</button>
            <button type="button" id="transfer-iso" class="chip" disabled>Nur ISO übertragen</button>
            <button type="button" id="transfer-apply" class="chip on" disabled>Einstellungen übertragen</button>
          </div>
          <p id="transfer-status" role="status" aria-live="polite"></p>
          <p id="transfer-device" hidden></p>
          <div id="transfer-rows"></div>
          <details id="transfer-capabilities" hidden><summary>Gemeldete Kamerafähigkeiten</summary><div></div></details>
          <div id="transfer-manual"></div>
          <details id="transfer-history" hidden><summary>Letzte Übertragung</summary><div></div></details>
          <details id="transfer-hand"><summary>Profil von Hand einstellen</summary><div></div></details>
          <details><summary>USB und WLAN einrichten</summary><div>
            <p>Für USB an der α6400 unter USB-Verbindung „PC-Fernbedienung“ wählen. Ein Datenkabel verwenden, andere Fernsteuerungsprogramme schließen und in der lokalen Anwendung die Istwerte lesen.</p>
            <p>Die JSON-Datei dient dieser Anwendung. Ein direkter Sony-Import an der Kamera ist damit nicht möglich. Am Moduswahlrad den angegebenen Modus wählen und die manuellen Schritte an der Kamera ausführen. Ein dauerhaftes MR-Profil wird separat an der Kamera gespeichert.</p>
            <p>Für Imaging Edge Mobile unter MENU → Netzwerk „Strg mit Smartphone“ einschalten und das Smartphone per QR-Code oder SSID verbinden. NFC kann die WLAN-Verbindung einrichten. In IEM die Aufnahmeparameter von Hand einstellen.</p>
            <p>Die praktische Hardwareprüfung mit einer α6400 ist offen.</p>
          </div></details>
        </div>
      </details>`;
    el("export").onclick = exportFile;
    el("import").onchange = importFile;
    el("current").onclick = () => {
      imported = null;
      disabledProfile = false;
      invalidate("Aktuelle Empfehlung gewählt. Istwerte neu lesen.");
    };
    el("source").onchange = el("mode").onchange = () => {
      simulation = null;
      invalidate("Nicht verbunden. Istwerte für die gewählte Verbindung lesen.");
      if (!isSim() && local) {
        // Nur die Fähigkeiten der lokalen Anwendung erfragen. Geräte werden erst auf Klick gelesen.
        connect().then(controls, controls);
      }
    };
    el("read").onclick = () => read();
    el("windows").onclick = () => read(true);
    el("apply").onclick = () => apply();
    el("iso").onclick = () => apply("iso");
  }

  function describeProfile() {
    const p = profile();
    el("hand").hidden = !p;
    if (!p) {
      el("profile").textContent = "Profil ungültig. Eine passende Datei laden oder die aktuelle Empfehlung wählen.";
      return;
    }
    const origin = imported ? "Dateiprofil „" + imported.name + "“" : "Aktuelle Empfehlung";
    const iso = p.iso.kind === "auto" ? "Auto ISO " + fmt(p.iso.min) + "–" + fmt(p.iso.max) : "ISO " + fmt(p.iso.value);
    const shutter = p.shutter.kind === "fixed" ? seconds(p.shutter.seconds) :
      p.shutter.kind === "minAuto" ? "Auto-ISO-Schwelle " + seconds(p.shutter.seconds) : "Zeit nach Kameramessung";
    el("profile").textContent = [origin, "Modus " + p.mode, CameraGuide.profiles[p.lens].model + " bei " +
      fmt(p.focalMm) + " mm (manuelle Angabe)", value("aperture", p.aperture), iso, shutter].join(" · ");

    const steps = [
      "Moduswahlrad auf " + p.mode + " stellen. Objektiv und " + fmt(p.focalMm) + " mm an der Kamera prüfen.",
      "Blende " + value("aperture", p.aperture) + " und " + iso + " einstellen."
    ];
    if (p.shutter.kind === "fixed") steps.push("Belichtungszeit " + seconds(p.shutter.seconds) + " einstellen.");
    else if (p.shutter.kind === "minAuto") steps.push("ISO AUTO Min. SS auf " + seconds(p.shutter.seconds) +
      " stellen. Die Kamera misst die Zeit und kann am ISO-Limit länger belichten.");
    else steps.push("Die Kamera misst die Zeit. Vor dem Auslösen die angezeigte Zeit prüfen.");
    steps.push(imported ? "Fokus, Bildfolge und Weißabgleich passend zum Motiv an der Kamera wählen. Diese Werte stehen außerhalb des Dateiprofils." :
      "Fokus, Bildfolge und Weißabgleich nach der Bedienfolge im Kompass wählen.");
    const list = document.createElement("ol");
    list.append(...steps.map(text => node("li", text)));
    el("hand").querySelector("div").replaceChildren(list);
  }

  function controls() {
    const usb = !isSim();
    el("mode-label").hidden = usb;
    el("usb-help").hidden = !usb;
    el("windows").hidden = !usb || !local || !windowsIso;
    el("windows").disabled = busy || el("windows").hidden;
    el("native-help").hidden = el("windows").hidden;
    el("read").textContent = usb ? "USB-Istwerte lesen" : "Simulationswerte lesen";
    el("read").disabled = busy || !profile() || (usb && !local);
    const ready = !busy && snapshot && profile()
      ? TransferEngine.preview(profile(), snapshot).rows.filter(row => row.status === "ready") : [];
    el("apply").disabled = ready.length === 0;
    el("iso").disabled = !ready.some(row => row.field === "iso");
    for (const id of ["source", "mode", "import", "current"]) el(id).disabled = busy;
    el("export").textContent = imported ? "Dateiprofil als JSON speichern" : "Empfehlung als JSON speichern";
    el("export").disabled = !profile();
    el("current").hidden = !imported && !disabledProfile;
  }

  function invalidate(message) {
    revision++;
    snapshot = null;
    el("rows").replaceChildren();
    el("manual").replaceChildren();
    el("device").hidden = true;
    el("capabilities").hidden = true;
    el("status").textContent = message;
    describeProfile();
    showHistory();
    controls();
  }

  function showRows(result, rowArea = el("rows"), manual = el("manual")) {
    const rows = result.rows.map(row => {
      const wrapper = node("section", "");
      wrapper.className = "transfer-row";
      const heading = node("strong", fields[row.field]);
      const state = node("span", rowStates[row.status] || "Unbekannt");
      state.className = "transfer-field-status";
      wrapper.append(heading, state);
      wrapper.append(node("p", "Ziel " + value(row.field, row.target) + " · Zuletzt gelesen " + value(row.field, row.current)));
      if (row.message) wrapper.append(node("p", row.message));
      return wrapper;
    });
    rowArea.replaceChildren(...rows);
    manual.replaceChildren();
    if (result.manual.length) {
      const list = document.createElement("ul");
      list.append(...result.manual.map(text => node("li", text)));
      manual.append(node("h3", "An der Kamera einstellen"), list);
    }
  }

  function showHistory() {
    const history = el("history");
    history.hidden = !lastTransfer || lastTransfer.revision === revision;
    if (history.hidden) return;
    const {target, time, message, result} = lastTransfer;
    const contents = history.querySelector("div");
    contents.replaceChildren(node("p", time + " · " + target), node("p", message));
    if (result) {
      const rows = document.createElement("div");
      const manual = document.createElement("div");
      showRows(result, rows, manual);
      contents.append(rows, manual);
    }
  }

  function showDevice(s) {
    const time = new Date().toLocaleTimeString("de-DE");
    el("device").textContent = [isSim() ? "Simulation" : "USB", s.model, "Modus " + s.mode, "gelesen um " + time].join(" · ");
    el("device").hidden = false;
    const panel = el("capabilities");
    const list = document.createElement("dl");
    for (const [key, label] of Object.entries(fields)) {
      const field = s.fields[key];
      const choices = field?.choices || [];
      list.append(node("dt", label + (field?.writable ? " · schreibbar" : " · manuell")),
        node("dd", choices.length ? choices.map(v => value(key, v)).join(", ") : "Keine Auswahl gemeldet"));
    }
    panel.querySelector("div").replaceChildren(list);
    panel.hidden = false;
  }

  async function request(path, body) {
    // Für bis zu drei Felder je Vorprüfung, Schreiben und drei Rücklesungen zulassen.
    const timeout = path === "/api/apply" ? 8 * 60_000 : path === "/api/session" ? 10_000 : 45_000;
    const options = {signal: AbortSignal.timeout(timeout), cache: "no-store", credentials: "same-origin", redirect: "error"};
    if (body) {
      options.method = "POST";
      options.headers = {"Content-Type": "application/json", "X-Session": token};
      options.body = JSON.stringify(body);
    }
    const response = await fetch(path, options);
    if (!response.headers.get("Content-Type")?.includes("application/json")) {
      throw new Error("Lokale USB-Anwendung starten und deren Adresse auf Port 8765 öffnen.");
    }
    const data = await response.json();
    if (!response.ok) {
      if (data.code === "session") token = null;
      throw new Error(data.error || "Die lokale Anwendung hat den Vorgang abgewiesen.");
    }
    return data;
  }

  async function connect() {
    if (token) return;
    if (!connecting) {
      connecting = request("/api/session").then(session => {
        if (typeof session.token !== "string" || !session.token) throw new Error("Lokale Sitzung fehlt.");
        token = session.token;
        windowsIso = session.windowsIso === true;
      }).finally(() => { connecting = null; });
    }
    await connecting;
  }

  async function read(native = false) {
    if (el(native ? "windows" : "read").disabled || busy) return;
    busy = true;
    pendingRead = true;
    invalidate("Istwerte werden gelesen …");
    const active = revision;
    try {
      let state;
      if (isSim()) {
        simulation ??= new TransferEngine.SimulationAdapter(el("mode").value);
        state = await simulation.read();
      } else {
        await connect();
        if (revision !== active) return;
        if (native) {
          const result = await request("/api/windows-iso", {});
          if (revision !== active) return;
          if (result.model !== "ILCE-6400" || !(result.iso === "auto" || (Number.isSafeInteger(result.iso) && result.iso > 0))) {
            throw new Error("Kein gültiger ISO-Messwert der α6400.");
          }
          el("status").textContent = "Windows · Sony " + result.model + " · ISO " + value("iso", result.iso) +
            " · gelesen um " + new Date().toLocaleTimeString("de-DE");
          return;
        }
        state = await request("/api/read", {});
        if (state.source !== "usb") throw new Error("Die lokale Anwendung meldet keine USB-Kamera.");
      }
      if (revision !== active) return;
      const preview = TransferEngine.preview(profile(), state);
      showRows(preview);
      showDevice(state);
      snapshot = state;
      el("status").textContent = isSim() ? "Simulation verbunden. Ziel- und Istwerte prüfen." : "USB-Istwerte gelesen. Ziel und aktuellen Gerätestand vergleichen.";
    } catch (error) {
      if (revision === active) invalidate("Nicht verbunden. " + error.message);
    } finally {
      busy = pendingRead = false;
      controls();
    }
  }

  async function apply(scope) {
    if (busy || el(scope === "iso" ? "iso" : "apply").disabled) return;
    busy = true;
    const expected = snapshot;
    const source = (isSim() ? "Simulation" : "USB") + (scope === "iso" ? " · ISO-Einzeltest" : "");
    const record = {
      revision, target: el("profile").textContent,
      time: new Date().toLocaleTimeString("de-DE"), message: "", result: null
    };
    snapshot = null;
    const active = revision;
    controls();
    el("status").textContent = source + " · Übertragung läuft …";
    try {
      const result = isSim()
        ? await TransferEngine.apply(simulation, profile(), expected, scope)
        : await request("/api/apply", {profile: profile(), expected, scope});
      record.result = result;
      record.message = [source + " · " + (resultStates[result.status] || "Ergebnis unklar"),
        result.message, result.stale ? "Letzter Gerätestand veraltet." : ""].filter(Boolean).join(" ");
      lastTransfer = record;
      if (revision !== active) {
        el("status").textContent = "Übertragungsauftrag für die frühere Empfehlung abgeschlossen. Ergebnis unter „Letzte Übertragung“. Aktuelle Istwerte neu lesen.";
        showHistory();
        el("history").open = true;
        return;
      }
      showRows(result);
      if (result.snapshot && !result.stale) showDevice(result.snapshot);
      else {
        el("device").hidden = true;
        el("capabilities").hidden = true;
      }
      el("history").hidden = true;
      el("status").textContent = record.message + " Vor einem weiteren Versuch Istwerte neu lesen.";
    } catch (error) {
      record.message = source + " · Ergebnis unbestätigt. " + error.message;
      lastTransfer = record;
      invalidate(record.message + " Istwerte neu lesen.");
    } finally {
      busy = false;
      controls();
    }
  }

  function exportFile() {
    const selected = profile();
    if (!selected) return;
    const file = new Blob([JSON.stringify(selected, null, 2) + "\n"], {type: "application/json"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = "a6400-" + selected.mode + "-" + selected.focalMm + "mm.json";
    root.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  async function importFile(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file || busy) return;
    imported = null;
    disabledProfile = true;
    invalidate("Dateiprofil wird geprüft …");
    const active = revision;
    try {
      if (file.size > maxFileSize) throw new Error("Die Datei überschreitet 32 KiB.");
      let data;
      try { data = JSON.parse(await file.text()); }
      catch { throw new Error("Die Datei enthält kein gültiges JSON."); }
      const validated = TransferProfile.validate(data);
      if (revision !== active) return;
      imported = {name: file.name, profile: validated};
      disabledProfile = false;
      invalidate("Dateiprofil geladen. Für die Vorschau Istwerte lesen.");
    } catch (error) {
      if (revision === active) invalidate("Datei abgelehnt. " + error.message);
    }
  }

  function render(container, next) {
    if (!root) init(container);
    const key = JSON.stringify(next);
    if (key === recommendationKey) return;
    const first = !recommendation;
    recommendation = next;
    recommendationKey = key;
    if (imported || disabledProfile) return;
    let message = "Nicht verbunden.";
    if (!first) message = busy && !pendingRead
      ? "Empfehlung geändert. Ein bereits gestarteter Übertragungsauftrag kann weiterlaufen. Anschließend Istwerte neu lesen."
      : "Empfehlung geändert. Istwerte für diese Einstellung lesen.";
    invalidate(message);
  }
  return {render};
})();
