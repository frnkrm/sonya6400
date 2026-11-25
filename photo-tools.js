// Aufnahmehilfen für die ILCE-6400. Rechner arbeiten in Sekunden und Millimetern.
(function () {
  "use strict";

  const numberFormat = new Intl.NumberFormat("de-DE", { maximumSignificantDigits: 5 });
  const fmt = value => numberFormat.format(value);

  function decimal(value) {
    const str = String(value).trim().replace(",", ".");
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(str)) return NaN;
    return Number(str);
  }

  function seconds(value) {
    const parts = String(value).trim().split("/");
    if (parts.length > 2) return NaN;
    const result = decimal(parts[0]) / (parts.length === 2 ? decimal(parts[1]) : 1);
    return Number.isFinite(result) && result > 0 ? result : NaN;
  }

  function filterPlan(baseInput, setting, reverse) {
    const base = seconds(baseInput);
    if (!Number.isFinite(base)) throw Error("Gib eine positive Ausgangszeit ein, zum Beispiel 1/125.");
    const target = reverse ? seconds(setting) : base * 2 ** decimal(setting);
    if (!Number.isFinite(target) || target < base) {
      throw Error(reverse ? "Die Zielzeit muss mindestens der Ausgangszeit entsprechen." : "Gib eine gültige Anzahl ND-Stufen ab 0 ein.");
    }
    const stops = reverse ? Math.log2(target) - Math.log2(base) : decimal(setting);
    return { time: target, stops };
  }

  function intervalPlan(gapInput, countInput, timeInput, rateInput) {
    const gap = decimal(gapInput), count = decimal(countInput);
    const exposure = seconds(timeInput), rate = decimal(rateInput);
    if (!Number.isInteger(gap) || gap < 1 || gap > 60) throw Error("Wähle einen ganzen Abstand von 1 bis 60 Sekunden.");
    if (!Number.isInteger(count) || count < 1 || count > 9999) throw Error("Wähle 1 bis 9999 Einzelbilder.");
    if (!Number.isFinite(exposure)) throw Error("Gib eine positive Belichtungszeit ein.");
    if (!Number.isFinite(rate) || rate <= 0) throw Error("Gib eine positive Wiedergaberate in Bildern pro Sekunde ein.");
    const span = (count - 1) * gap + exposure, movie = count / rate;
    if (!Number.isFinite(span) || !Number.isFinite(movie)) throw Error("Die Dauer liegt außerhalb des Rechenbereichs.");
    return { span, movie, overlap: count > 1 && exposure >= gap };
  }

  function hyperfocal(focal, aperture, tolerance) {
    const c = decimal(tolerance);
    if (![focal, aperture, c].every(n => Number.isFinite(n) && n > 0)) throw Error("Gib eine positive Schärfetoleranz in mm ein.");
    const distance = (focal * focal / (aperture * c) + focal) / 1000;
    if (!Number.isFinite(distance)) throw Error("Die Schärfetoleranz ist zu klein.");
    return distance;
  }

  function bulbPlan(timeInput, noiseReduction, silent, drive) {
    if (silent) throw Error("Für BULB zuerst die lautlose Aufnahme ausschalten.");
    if (drive !== "single") throw Error("Für diesen BULB-Ablauf auf Einzelaufnahme wechseln und Auto HDR ausschalten.");
    const time = seconds(timeInput);
    if (!Number.isFinite(time) || time < 1 || !Number.isSafeInteger(Math.ceil(time * 2000))) {
      throw Error("Gib für den Langzeit-Timer eine gültige Belichtungszeit ab 1 Sekunde ein.");
    }
    return { time, total: noiseReduction ? 2 * time : time };
  }

  function timerPhase(elapsed, plan) {
    if (elapsed >= plan.total) return "Aufnahmeplan beendet. Prüfe die Bereitschaft der Kamera.";
    if (elapsed >= plan.time) return "Rauschminderung · noch etwa " + fmt(Math.ceil(plan.total - elapsed)) + " s";
    return "Belichtung · noch " + fmt(Math.ceil(plan.time - elapsed)) + " s";
  }

  function showHDR(format, method, autoISO, moving) {
    const warn = moving ? " Bewegte Blätter oder Wasser können Doppelkonturen erzeugen. Bei Bewegung eine gut belichtete Einzelaufnahme vergleichen." : "";
    if (method === "hdr") {
      if (format !== "jpeg") return "Auto HDR erfordert JPEG. Verwende für RAW oder RAW+JPEG eine Belichtungsreihe.";
      return "Auto HDR verrechnet drei Aufnahmen in der Kamera. Halte den Bildausschnitt ruhig und verwende eine passende Belichtungsdifferenz." + warn;
    }
    return "Im Bildfolgemodus eine Serien-Belichtungsreihe wählen und die Auslöseverzögerung in den Reihen-Einstellungen setzen. " +
      (autoISO ? "In M mit Auto ISO variiert die ISO." : "In M mit fester ISO variiert die Belichtungszeit.") +
      " Die Einzelbilder später bei Bedarf zusammenführen." + warn;
  }

  const diagnoses = {
    all: ["Alles wirkt unscharf", "Sind auch ruhige Kanten in dieselbe Richtung verwischt?",
      "Das spricht für Verwacklung. Kamera abstützen und mit kürzerer Zeit vergleichen. Vorhandene Objektivstabilisierung aus der Hand prüfen.",
      "Suche bei vergrößerter Wiedergabe eine scharfe Ebene. Mit AF-S und kleinem Fokusfeld gezielt auf eine kontrastreiche ruhige Kante fokussieren."],
    leaves: ["Nur Blätter oder Personen verwischt", "Bleibt die Umgebung scharf?",
      "Wahrscheinlich bewegt sich das Motiv. In M oder S z. B. 1/250 s probieren und bei Bedarf weiter verkürzen, auch am Stativ.",
      "Kontrolliere zuerst eine unbewegte Kante. Sind auch dort Doppelkonturen sichtbar, Kamera abstützen und kürzer belichten."],
    focus: ["Die falsche Stelle ist scharf", "Ist eine Ebene vor oder hinter deinem Motiv schärfer?",
      "Das Fokusfeld gezielt auf das Motiv legen. Ruhende Details mit AF-S oder DMF und Fokuslupe prüfen.",
      "Fokuslupe verwenden und auf eine kontrastreiche Struktur zielen. Bleibt auch dort alles weich, Zeit und Verwacklung prüfen."],
    near: ["Ferne scharf, Vordergrund weich", "Ist der Vordergrund näher an der Sensorebene als die Naheinstellgrenze deines Objektivs?",
      "Mehr Abstand zum Vordergrund gewinnen und die Naheinstellgrenze ab der Sensorebene beachten. Dann im Sucher erneut fokussieren.",
      "Die Schärfentiefe könnte zu klein sein. Fokus näher legen, etwas abblenden und beide Ebenen vergrößern. Bei ruhigem Motiv eine manuelle Fokusserie versuchen."],
    sky: ["Himmel weiß", "Fehlt in wichtigen hellen Wolken die Zeichnung?",
      "Histogramm und Zebra prüfen. Belichtung in kleinen Schritten reduzieren. Für einen weiterhin zu dunklen Boden eine Belichtungsreihe erwägen.",
      "Spitzlichter und helle Nebelpartien dürfen hell sein. Prüfe die wichtigen Motivdetails in vergrößerter Wiedergabe, bevor du die Belichtung änderst."]
  };

  function select(id, caption, choices) {
    const options = choices.map(([value, label]) => '<option value="' + value + '">' + label + '</option>').join("");
    return '<label>' + caption + '<select id="pt-' + id + '">' + options + '</select></label>';
  }

  function input(id, caption, value, fraction = false) {
    return '<label>' + caption + '<input id="pt-' + id + '" type="text"' +
      (fraction ? '' : ' inputmode="decimal"') + ' autocomplete="off" value="' + value + '"></label>';
  }

  function check(id, caption) {
    return '<label class="pt-check"><input id="pt-' + id + '" type="checkbox"> ' + caption + '</label>';
  }

  function output(id) {
    return '<output id="pt-' + id + '"></output>';
  }

  const panels = [
    ["picture", "Dateiformat und Belichtungsreihe"],
    ["shutter", "Verschluss und BULB-Timer"],
    ["filter", "ND- und Polfilter"],
    ["interval", "Intervall und Zeitraffer"],
    ["depth", "Schärfentiefe und Fokusserie"],
    ["diagnosis", "Fehler am Probebild"]
  ];

  function markup() {
    return '<details class="photo-workbench"><summary>Aufnahme planen und Probebild prüfen</summary><div>' +
      select("tool", "Aufnahmehilfe", panels) +
      '<section data-panel="picture">' +
      select("format", "Was möchtest du mit dem Bild machen?", [
        ["raw", "RAW für die Bearbeitung"], ["jpeg", "JPEG direkt verwenden"], ["rawjpeg", "RAW bearbeiten und JPEG direkt nutzen"]
      ]) + output("color") +
      '<details id="pt-bits"><summary>RAW und Farbtiefe</summary><div>Die α6400 speichert komprimiertes RAW. Unter anderem bei lautloser Aufnahme, Serienaufnahme, BULB und Langzeit-Rauschminderung sinkt die RAW-Aufzeichnung von 14 auf 12 Bit. Eine starke Aufhellung kann Schattenrauschen sichtbar machen.</div></details>' +
      select("contrast", "Hoher Motivkontrast", [["single", "Einzelaufnahme"], ["bracket", "Belichtungsreihe für später"], ["hdr", "Auto HDR in der Kamera"]]) +
      '<div id="pt-bracket-iso">' + select("iso", "Für die Belichtungsreihe in M", [["fixed", "Feste ISO"], ["auto", "Auto ISO"]]) + '</div>' +
      '<div id="pt-moving-wrap">' + check("moving", "Bewegung zwischen den Bildern") + '</div>' + output("hdr-result") +
      '</section><section data-panel="shutter">' +
      select("effect", "Was beobachtest du?", [["none", "Verschluss prüfen"], ["bands", "Streifen unter Kunstlicht"], ["rolling", "Schiefe Linien bei Bewegung"], ["bokeh", "Ungleichmäßiges Bokeh bei offener Blende"]]) +
      output("shutter-result") + '<h3>Langzeitaufnahme mit BULB</h3>' +
      '<p>Die Kamera aufs Stativ setzen, M, feste ISO und Einzelaufnahme wählen. In M die Zeit bis BULB verlängern. Mit geeigneter Fernauslösung den Verschluss öffnen und nach der geplanten Zeit schließen. Starte den Timer gleichzeitig mit der Kamera.</p>' +
      check("silent", "Lautlose Aufnahme aktiv") +
      select("drive", "Bildfolge / HDR an der Kamera", [["single", "Einzelaufnahme, Auto HDR aus"], ["continuous", "Serie, Selbsttimer-Serie oder Serienreihe"], ["hdr", "Auto HDR aktiv"]]) +
      input("bulb", "Belichtung in Sekunden", "60") + check("noise", "Langzeit-Rauschminderung aktiv") +
      output("bulb-result") + '<button class="chip" type="button" id="pt-start">Timer starten</button>' +
      '<p id="pt-clock" role="timer" aria-label="Verbleibende Zeit"></p></section>' +
      '<section data-panel="filter">' + output("thread") +
      select("direction", "ND-Rechner", [["forward", "Zeit mit Filter berechnen"], ["reverse", "Nötige ND-Stufen berechnen"]]) +
      input("base", "Belichtung ohne Filter in Sekunden", "1/125", true) +
      '<div id="pt-stops-wrap">' + input("stops", "ND-Stufen (ND64 hat 6)", "6") + '</div>' +
      '<div id="pt-target-wrap">' + input("target", "Gewünschte Zeit in Sekunden", "0,5", true) + '</div>' + output("nd-result") +
      '<p>Blende und ISO für beide Zeiten gleich lassen. Bei variablen ND-Filtern auf dunkle Kreuzmuster achten. Einen Polfilter langsam drehen und die Reflexion prüfen, bis Wasser oder Blätter wie gewünscht erscheinen.</p></section>' +
      '<section data-panel="interval"><div class="pt-grid">' +
      input("gap", "Abstand der Starts (1–60 s)", "5") + input("count", "Einzelbilder (1–9999)", "120") +
      input("exposure", "Belichtungszeit je Bild in s", "1/125", true) + input("rate", "Wiedergabe in Bildern/s", "25") +
      '</div>' + output("interval-result") + '<p>Vom ersten Auslösen bis zum Ende der letzten Belichtung gerechnet, ohne Startverzögerung und Verarbeitungszeit. Die Kamera liefert Einzelbilder. Setze sie anschließend mit der gewählten Wiedergaberate zum Video zusammen.</p></section>' +
      '<section data-panel="depth">' + input("circle", "Angenommener Zerstreuungskreis in mm", "0,02") + output("depth-result") +
      '<p>Die Toleranz hängt von Ausgabegröße und Betrachtungsabstand ab. Prüfe Vordergrund und Ferne am Probebild vergrößert. Bei zu wenig Schärfentiefe die Kamera fixieren, manuell auf überlappende Ebenen von nah bis fern fokussieren und je ein Bild aufnehmen. Später zusammenführen. Wind und bewegtes Wasser erschweren deckungsgleiche Übergänge.</p></section>' +
      '<section data-panel="diagnosis">' + select("symptom", "Was fällt am Probebild auf?", Object.entries(diagnoses).map(([key, values]) => [key, values[0]])) +
      '<label><span id="pt-question"></span><select id="pt-answer"><option value="">Bitte prüfen</option><option value="yes">Ja</option><option value="no">Nein</option></select></label>' + output("advice") + '</section>' +
      '<p class="pt-sources"><a href="docs/research/sony-a6400-kamera-objektive.md">Fachreferenz und Herstellerquellen</a></p></div></details>';
  }

  const sessions = new WeakMap();

  function mount(root) {
    root.innerHTML = markup(); // Markup enthält ausschließlich feste Bedienelemente.
    const get = key => root.querySelector("#pt-" + key);
    const val = key => get(key).value;
    const write = (key, message) => {
      const node = get(key);
      if (node.textContent !== message) node.textContent = message;
    };
    const show = (key, visible) => { get(key).hidden = !visible; };
    const session = { state: null, result: null, change: null };
    let timer = null;
    let movementContext;

    function result(key, calculate) {
      try { write(key, calculate()); }
      catch (error) { write(key, error.message); }
    }

    function refresh() {
      const { state, result: r } = session;
      const format = state.format;
      const moving = state.motiv === "landscape" ? state.wind !== "calm" || state.scene === "water" : state.bew !== "steh";
      if (moving !== movementContext) get("moving").checked = moving;
      movementContext = moving;
      get("format").value = format;
      root.querySelectorAll("[data-panel]").forEach(panel => { panel.hidden = panel.dataset.panel !== val("tool"); });
      const hdr = get("contrast").querySelector('[value="hdr"]');
      hdr.disabled = format !== "jpeg";
      if (hdr.disabled && val("contrast") === "hdr") get("contrast").value = "bracket";
      const method = val("contrast");
      show("bracket-iso", method === "bracket");
      show("moving-wrap", method !== "single");
      show("bits", format !== "jpeg");
      const jpeg = "Wähle für das JPEG einen Kreativmodus passend zum Motiv, etwa Landschaft oder Sonnenuntergang. Prüfe, ob Tageslicht die Wärme erhält oder AWB besser zur Szene passt.";
      write("color", format === "raw" ? "RAW bewahrt Spielraum für die Bearbeitung. Weißabgleich und Kreativmodus prägen die Vorschau. Helle Details schon am Aufnahmeort prüfen." :
        (format === "rawjpeg" ? "RAW für die Bearbeitung sichern. " : "") + jpeg);
      write("hdr-result", method === "single" ?
        "Helle Details mit Histogramm und Zebra kontrollieren. Wenn Himmel und Schatten den Kontrastumfang sprengen, eine Reihe erwägen." + (hdr.disabled ? " Kamera-internes Auto HDR erfordert JPEG." : "") :
        showHDR(format, method, val("iso") === "auto", get("moving").checked));

      const shutterAdvice = {
        none: "Lautlos liest die Kamera elektronisch aus. Der elektronische erste Verschlussvorhang (EFCS) ist eine eigene Einstellung.",
        bands: "Lautlose Aufnahme ausschalten. Bei flackernder Beleuchtung anschließend mehrere Belichtungszeiten vergleichen.",
        rolling: "Die zeilenweise Auslesung bei lautloser Aufnahme kann bewegte Formen verzerren. Mit ausgeschalteter lautloser Aufnahme vergleichen.",
        bokeh: "Bei sehr kurzen Zeiten und großer Öffnung den elektronischen ersten Verschlussvorhang ausschalten und vergleichen. Sony rät bei Fremdobjektiven zu dieser Prüfung."
      };
      write("shutter-result", shutterAdvice[val("effect")]);
      result("bulb-result", () => {
        get("start").disabled = timer === null;
        const plan = bulbPlan(val("bulb"), get("noise").checked, get("silent").checked, val("drive"));
        get("start").disabled = false;
        return "Belichten " + fmt(plan.time) + " s. " + (get("noise").checked ?
          "Danach für die Rauschminderung etwa " + fmt(plan.time) + " s warten. Geplante Gesamtdauer ca. " + fmt(plan.total) + " s." : "Ohne zusätzliche Wartephase geplant.");
      });

      write("thread", "Filtergewinde am gewählten Objektiv: " + fmt(CameraGuide.profiles[state.lens].filter) + " mm.");
      const reverse = val("direction") === "reverse";
      show("stops-wrap", !reverse);
      show("target-wrap", reverse);
      result("nd-result", () => {
        const plan = filterPlan(val("base"), val(reverse ? "target" : "stops"), reverse);
        return reverse ? "Benötigte Dichte: " + fmt(plan.stops) + " ND-Stufen." : "Zeit mit Filter: " + fmt(plan.time) + " s.";
      });
      result("interval-result", () => {
        const plan = intervalPlan(val("gap"), val("count"), val("exposure"), val("rate"));
        const clip = " Videolänge bei vollständiger Serie: " + fmt(plan.movie) + " s.";
        return plan.overlap ? "Die Belichtung lässt keinen Zeitpuffer bis zum nächsten Start. Intervall verlängern oder kürzer belichten." + clip :
          "Aufnahmedauer: ca. " + fmt(plan.span) + " s." + clip;
      });
      result("depth-result", () => {
        const distance = hyperfocal(state.mm, r.aperture, val("circle"));
        return "Bei " + fmt(state.mm) + " mm, f/" + fmt(r.aperture) + " und " + fmt(decimal(val("circle"))) +
          " mm Toleranz liegt die hyperfokale Entfernung rechnerisch bei etwa " + fmt(distance) + " m. Fokussierst du dorthin, reicht der rechnerisch akzeptable Bereich näherungsweise von halber Entfernung bis unendlich.";
      });
      const diagnosis = diagnoses[val("symptom")];
      write("question", diagnosis[1]);
      write("advice", val("answer") === "" ? "" : diagnosis[val("answer") === "yes" ? 2 : 3]);
    }

    function endTimer() {
      clearInterval(timer);
      timer = null;
      get("start").textContent = "Timer starten";
      for (const id of ["bulb", "silent", "drive", "noise"]) get(id).disabled = false;
    }

    get("start").addEventListener("click", () => {
      if (timer !== null) {
        endTimer();
        write("clock", "Timer beendet.");
        return;
      }
      const plan = bulbPlan(val("bulb"), get("noise").checked, get("silent").checked, val("drive"));
      const start = Date.now();
      function tick() {
        const elapsed = (Date.now() - start) / 1000;
        write("clock", timerPhase(elapsed, plan));
        if (elapsed >= plan.total) endTimer();
      }
      for (const id of ["bulb", "silent", "drive", "noise"]) get(id).disabled = true;
      get("start").textContent = "Timer beenden";
      timer = setInterval(tick, 250);
      tick();
    });
    root.addEventListener("input", event => {
      if (event.target.id === "pt-format") {
        session.change({ format: val("format") });
        return;
      }
      if (event.target.id === "pt-symptom") get("answer").value = "";
      refresh();
    });
    session.refresh = refresh;
    return session;
  }

  function render(root, state, result, change) {
    if (!sessions.has(root)) sessions.set(root, mount(root));
    const session = sessions.get(root);
    Object.assign(session, { state, result, change });
    session.refresh();
  }

  const api = { render, seconds, filterPlan, intervalPlan, hyperfocal, bulbPlan, timerPhase, showHDR };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else globalThis.PhotoTools = api;
})();
