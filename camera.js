// Shared by the browser, the PNG renderer and the rule tests.
(function () {
  "use strict";
  const sony = "https://www.sony.co.uk/electronics/";
  const sigma = "https://www.sigma-global.com/en/lenses/";
  const guide = "https://helpguide.sony.net/ilc/1810/v1/";
  const profiles = {
    tam: {brand: "Tamron", model: "17–70 mm F2.8 Di III-A VC RXD (B070)", range: [17, 70], opening: [2.8, 2.8], filter: 67, near: "0,19 m (weit) / 0,39 m (tele)", stabilizer: "VC", source: "https://www.tamron.com/global/consumer/lenses/b070/spec.html"},
    s50: {brand: "Sony", model: "E 50 mm F1.8 OSS (SEL50F18)", range: [50, 50], opening: [1.8, 1.8], filter: 49, near: "0,39 m", stabilizer: "OSS", source: sony + "camera-lenses/sel50f18/specifications"},
    t210: {brand: "Sony", model: "E 55–210 mm F4.5–6.3 OSS (SEL55210)", range: [55, 210], opening: [4.5, 6.3], filter: 49, near: "1,00 m", stabilizer: "OSS", source: sony + "interchangeable-lenses/sel55210/specifications"},
    k1650: {brand: "Sony", model: "E PZ 16–50 mm OSS (SELP1650, 1. Generation)", range: [16, 50], opening: [3.5, 5.6], filter: 40.5, near: "0,25–0,30 m", stabilizer: "OSS", source: sony + "camera-lenses/selp1650/specifications"},
    sg1850: {brand: "Sigma", model: "18–50 mm F2.8 DC DN Contemporary C021", range: [18, 50], opening: [2.8, 2.8], filter: 55, near: "0,121 m (weit) / 0,30 m (tele)", stabilizer: "ohne", source: sigma + "c021_18_50_28/"},
    sg30: {brand: "Sigma", model: "30 mm F1.4 DC DN Contemporary C016", range: [30, 30], opening: [1.4, 1.4], filter: 52, near: "0,30 m", stabilizer: "ohne", source: sigma + "c016_30_14/"},
    sg16: {brand: "Sigma", model: "16 mm F1.4 DC DN Contemporary C017", range: [16, 16], opening: [1.4, 1.4], filter: 67, near: "0,25 m", stabilizer: "ohne", source: sigma + "c017_16_14/"},
    sg56: {brand: "Sigma", model: "56 mm F1.4 DC DN Contemporary C018", range: [56, 56], opening: [1.4, 1.4], filter: 55, near: "0,50 m", stabilizer: "ohne", source: sigma + "c018_56_14/"},
    s18135: {brand: "Sony", model: "E 18–135 mm F3.5–5.6 OSS (SEL18135)", range: [18, 135], opening: [3.5, 5.6], filter: 55, near: "0,45 m", stabilizer: "OSS", source: sony + "camera-lenses/sel18135/specifications"}
  };

  // First option is the migration default for old settings and links.
  const options = {
    scene: [["mountains", "Weite Berge"], ["forest", "Wald"], ["lake", "See"], ["detail", "Entferntes Detail"], ["water", "Fließendes Wasser"], ["sun", "Sonnenauf- oder -untergang"], ["snow", "Schnee oder Nebel"], ["stars", "Sternenhimmel"]],
    support: [["hand", "Aus der Hand"], ["tripod", "Stativ"]],
    wind: [["calm", "Ruhig"], ["light", "Leichter Wind"], ["strong", "Starker Wind"]],
    depth: [["far", "Ferne"], ["near", "Vordergrund und Ferne"]],
    water: [["soft", "Weich zeichnen"], ["frozen", "Bewegung einfrieren"]],
    priority: [["water", "Weiches Wasser"], ["leaves", "Scharfe Blätter"]],
    format: [["raw", "RAW"], ["jpeg", "JPEG"], ["rawjpeg", "RAW+JPEG"]]
  };

  function normalize(input = {}, core = {}) {
    const lens = Object.hasOwn(profiles, core.lens) ? profiles[core.lens] : profiles.tam;
    const [wide, tele] = lens.range;
    const value = input?.mm;
    const numeric = typeof value === "number" || (typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value)) ? Number(value) : NaN;
    const result = {mm: Number.isFinite(numeric) ? Math.max(wide, Math.min(tele, Math.round(numeric))) : wide};
    for (const [key, choices] of Object.entries(options)) {
      const saved = input && Object.hasOwn(input, key) ? input[key] : null;
      result[key] = choices.some(([id]) => saved === id) ? saved : choices[0][0];
    }
    return result;
  }

  function apertureLimits(lens, mm) {
    const profile = profiles[lens];
    const [wide, tele] = profile.range;
    const variable = profile.opening[0] !== profile.opening[1];
    // At intermediate zoom positions the supported opening curve is unknown.
    const open = mm === wide ? profile.opening[0] : profile.opening[1];
    // Restrict advice on variable-aperture zooms to f/22 throughout the range.
    const closed = profile.brand === "Sigma" && wide === tele ? 16 : 22;
    return {open, closed, conservative: variable && mm > wide && mm < tele};
  }

  function framing(s, bag) {
    const available = bag.filter(id => Object.hasOwn(profiles, id));
    if (!available.length) return "";
    // A forest path benefits from a normal angle, a distant peak from a tight frame.
    const normal = s.scene === "forest";
    const detail = s.scene === "detail";
    function focal(profile) {
      const [wide, tele] = profile.range;
      if (normal) return Math.max(wide, Math.min(tele, 32));
      return detail ? tele : wide;
    }
    function score(profile) {
      const mm = focal(profile);
      if (normal) return Math.abs(mm - 32);
      return detail ? -mm : mm;
    }
    const best = profiles[available.reduce((a, b) => score(profiles[b]) < score(profiles[a]) ? b : a)];
    const reasons = {
      forest: "Für einen Waldweg wirkt ein normaler Bildwinkel natürlich. Prüfe die Bildränder auf angeschnittene Stämme.",
      detail: "Die längste verfügbare Brennweite gibt entfernten Details mehr Platz im Bild.",
      stars: "Der weiteste Bildwinkel zeigt mehr Himmel. Bei längeren Brennweiten früh auf Sternspuren prüfen."
    };
    const reason = reasons[s.scene] || "Die kürzeste verfügbare Brennweite nimmt viel Umgebung ins Bild.";
    let suggestion = reason + " Vorschlag aus deiner Tasche: " + best.model + " bei " + focal(best) + " mm.";
    if (s.scene !== "stars" && s.depth === "near") suggestion += " Beim gewählten Objektiv die Naheinstellgrenze von " + profiles[s.lens].near + " ab Sensorebene beachten.";
    return suggestion;
  }

  function stability(lens, tripod) {
    const type = profiles[lens].stabilizer;
    if (type === "ohne") return "Dieses Objektiv hat keinen optischen Stabilisator. Die α6400 hat keine Sensorstabilisierung.";
    const control = type === "VC" ? "VC über SteadyShot an der Kamera" : "OSS über SteadyShot";
    return tripod ? control + " am festen Stativ ausschalten. Beim Wechsel in die Hand wieder einschalten." :
      control + " für die Handaufnahme einschalten. Bewegte Bildteile brauchen weiterhin eine passende Zeit.";
  }

  function handDenominator(mm, minimum) {
    // Conservative starting points; these full-stop settings exist in ISO AUTO Min. SS.
    return [30, 60, 125, 250, 500, 1000, 2000, 4000].find(n => n >= Math.max(minimum, mm * 2)) || 4000;
  }

  function autoThreshold(o, denominator) {
    o.shutter = {kind: "minAuto", seconds: 1 / denominator};
    o.ss = String(denominator);
    o.t = "1/" + denominator + " s";
    o.how = "In A die Blende wählen. ISO AUTO Min. SS (P/A mit Auto ISO) auf " + o.t + " stellen. Ziel: " + o.t + " oder kürzer. Am ISO-Limit kann die Kamera länger belichten.";
  }

  function fixedTime(o, seconds) {
    o.shutter = {kind: "fixed", seconds};
    const time = (seconds < 0.5 ? "1/" + Math.round(1 / seconds) : String(seconds).replace(".", ",")) + " s";
    o.t = time;
    o.ss = time;
    o.how = "Im Modus M " + time + " einstellen. Zeit und Blende sind vorgegeben.";
    if (o.isoTarget.kind === "auto") {
      o.how += " Am Auto-ISO-Limit kann das Bild zu dunkel werden.";
    } else {
      o.evn = null;
      o.ev = "Belichtung manuell prüfen";
    }
  }

  function landscape(s, limits) {
    const moving = s.wind !== "calm";
    const water = s.scene === "water";
    const soft = water && s.water === "soft" && !(moving && s.priority === "leaves");
    const frozen = water && s.water === "frozen";
    const stars = s.scene === "stars";
    const tripod = s.support === "tripod" || soft || stars;
    const dark = ["nacht", "daemm"].includes(s.licht);
    const windMinimum = s.wind === "strong" ? 500 : 250;
    const o = {
      tripod, dark, arch: false, mode: "A", slot: "Landschaft", aperture: s.depth === "near" ? 11 : 8,
      focus: stars ? "MF" : "AF-S", fs: stars ? "Fokuslupe" : "Flex. Spot M",
      field: stars ? "Hellen Stern vergrößern" : "Flexible Spot M", evn: 0, ev: "0 EV als Ausgangspunkt",
      isoTarget: {kind: "auto", min: 100, max: dark ? 6400 : 3200}, drive: tripod ? "Selbstauslöser 2 s" : "Einzelbild",
      drs: tripod ? "⏲ 2 s" : "Einzelbild", w: [], tip: []
    };
    if (stars) {
      o.mode = "M";
      o.isoTarget = {kind: "fixed", value: 1600};
      o.aperture = limits.open;
      const exposure = [8, 6, 5, 4, 3.2, 2.5, 2, 1.6, 1.3, 1, 0.8, 0.6, 0.5].find(time => time <= 128 / s.mm);
      fixedTime(o, exposure);
      o.reason = "Sterne bewegen sich im Bild. Kurze Brennweite, offene Blende und Stativ geben Spielraum für einen ersten Versuch.";
      o.tip.push("An einem hellen Stern mit MF und Fokuslupe fein einstellen. Auch am Unendlichanschlag vergrößert prüfen. Bei Strichen Zeit verkürzen und ISO nach dem Probebild anpassen.");
    } else if (soft) {
      o.mode = "M";
      o.isoTarget = {kind: "fixed", value: 100};
      fixedTime(o, 1);
      o.reason = "Für weiches Wasser soll während der Belichtung Bewegung sichtbar werden. Beginne auf einem festen Stativ mit einer Sekunde.";
      o.tip.push("Probebild bei fester ISO und Blende prüfen. Werden helle Wasserflächen zu hell, kann ein ND-Filter die gewünschte lange Zeit ermöglichen.");
      if (moving) o.w.push("Weiches Wasser hat Vorrang. Blätter im Wind verwischen ebenfalls. Für schärfere Blätter die Priorität wechseln.");
    } else if (moving || frozen) {
      o.mode = "M";
      const minimum = frozen ? (s.wind === "strong" ? 1000 : 500) : windMinimum;
      const denom = tripod ? minimum : handDenominator(s.mm, minimum);
      fixedTime(o, 1 / denom);
      o.reason = frozen ? "Die kurze Zeit soll Strukturen im fließenden Wasser zeigen. Bei Schlieren weiter verkürzen." :
        "Wind bewegt Blätter und Gras auch am Stativ. Eine kurze Zeit begrenzt ihre Bewegung im Bild.";
      o.tip.push("Alternative S: Zeit für die Bewegung vorgeben und die von der Kamera gewählte Blende prüfen. In M bleiben beide Werte unter deiner Kontrolle.");
      if (water && s.water === "soft") o.w.push("Scharfe Blätter haben Vorrang. Das Wasser wirkt bei dieser Zeit weniger weich. Für beide Effekte getrennte Aufnahmen versuchen.");
    } else if (tripod) {
      o.isoTarget = {kind: "fixed", value: 100};
      o.shutter = {kind: "metered"};
      o.t = o.ss = "Auto";
      o.how = "Modus A mit ISO 100. Die Kamera misst die Zeit. Vor dem Auslösen auf Bewegung achten.";
      o.reason = "Das Stativ trägt die Kamera, die Szene ist ruhig. ISO 100 erlaubt eine längere Belichtung.";
    } else {
      autoThreshold(o, handDenominator(s.mm, 125));
      o.reason = "Aus der Hand erhöht ein enger Bildwinkel die Sichtbarkeit des Verwackelns. Die Startschwelle berücksichtigt die gewählten " + s.mm + " mm.";
    }

    if ((soft || stars) && s.support === "hand") o.w.unshift("Für dieses Bildziel zuerst auf ein Stativ oder eine feste Unterlage wechseln.");
    if (!stars && s.depth === "near") {
      o.reason += " Für den nahen Vordergrund f/11 versuchen und beide Entfernungen vergrößern.";
      o.tip.push("Einen Fokuspunkt zwischen den relevanten Entfernungen wählen. Vordergrund und Ferne getrennt kontrollieren. Reicht die Schärfentiefe nicht, eine manuelle Fokusserie erwägen.");
    } else if (!stars) {
      o.tip.push("Mit AF-S auf ein markantes Detail der entfernten Landschaft fokussieren. Bei Bedarf in DMF manuell nachstellen.");
    }
    if (s.scene === "sun") o.tip.push("Im Probebild helle Wolken und Sonnensaum mit Histogramm und Zebra kontrollieren. Lichter-Messung kann den Vordergrund abdunkeln. Bei zu großem Kontrast eine Belichtungsreihe für die spätere Zusammenführung aufnehmen.");
    if (s.scene === "forest") o.tip.push("Im Wald die hellen Lücken zwischen den Bäumen prüfen. Bei Wind die tatsächliche Zeit kontrollieren.");
    if (s.scene === "lake") o.tip.push("Am See Horizont und gewünschte Spiegelung prüfen. Bei Wellen entscheidet die tatsächliche Zeit über die Wasserstruktur.");
    if (s.scene === "snow") o.tip.push("Schnee oder heller Nebel wirkt im Probebild grau? Schrittweise heller belichten, etwa +0,3 EV testen. Helle Details kontrollieren und den Weißabgleich nach gewünschter Stimmung wählen. Für AF eine Kontrastkante suchen.");
    if (s.scene === "detail") o.tip.push("Für entfernte Details einen engeren Bildausschnitt mit langer Brennweite prüfen.");
    o.wb = dark ? "AWB, Lichtstimmung im Probebild prüfen" : "Tageslicht oder AWB";
    return o;
  }

  function legacyRecommendation(s, base, limits) {
    const o = {...base, tripod: Boolean(base.arch), w: [], tip: []};
    o.aperture = Math.min(limits.closed, Math.max(limits.open, base.aperture));
    if (o.arch) {
      o.reason = "Stativ und ruhige Architektur erlauben eine längere Belichtung bei ISO 100.";
      o.shutter = {kind: "metered"};
      o.t = o.ss = "Auto";
      o.how = "In A die Zeit von der Kamera messen lassen. Für Lichtquellen f/8 als Startwert testen.";
    } else if (o.mode === "A") {
      autoThreshold(o, handDenominator(s.mm, base.denominator));
      o.reason = s.motiv === "gruppe" ? "Mehrere Gesichter brauchen Schärfentiefe. Personen möglichst in einer Ebene aufstellen und auf die vordere Reihe fokussieren." :
        s.look === "bokeh" ? "Die große Öffnung trennt das Motiv vom Hintergrund." : "Leichtes Abblenden gibt Spielraum beim Fokussieren. Schärfe im Probebild prüfen.";
    } else {
      const motion = s.bew === "act" ? 250 : s.bew === "geh" ? 125 : 30;
      const denom = Math.max(base.denominator, handDenominator(s.mm, motion));
      fixedTime(o, 1 / denom);
      o.reason = "Bei wenig Licht hält M die Zeit für das Motiv fest. ISO nach dem Probebild prüfen.";
    }
    const zoom = profiles[s.lens].range[0] !== profiles[s.lens].range[1];
    const frame = zoom ? "Für den Bildausschnitt " + base.framingSuggestion + " ausprobieren." :
      "Bei " + base.framingSuggestion + " den Bildausschnitt über den Standort wählen.";
    const distance = base.groupDistance ? " Für die Gruppe etwa " + base.groupDistance + " Abstand als Startwert testen. Gruppengröße und Bildränder prüfen." : "";
    o.tip.push(frame + distance);
    o.framingStep = zoom ? "Bei verändertem Ausschnitt die tatsächliche Zoomstellung im Kompass nachführen." :
      "Mit dieser Festbrennweite durch einen Standortwechsel den Bildausschnitt anpassen.";
    if (s.motiv === "gruppe" && s.look === "bokeh") o.tip.push("Für die Gruppe hat die gemeinsame Schärfe Vorrang vor maximaler Freistellung.");
    if (s.licht === "tag" && o.aperture <= 2.2) o.tip.push("Bei großer Öffnung die Lichter prüfen. Reichen 1/4000 s bei niedrigster ISO nicht, abblenden oder Schatten suchen.");
    if (["daemm", "nacht"].includes(s.licht)) o.tip.push("Bei LED-Licht auf Streifen achten. Lautlose Aufnahme gegebenenfalls ausschalten.");
    return o;
  }

  function steps(s, o) {
    const rows = [];
    if (s.motiv === "landscape") rows.push((o.tripod ? "Kamera auf ein festes Stativ setzen. " : "Kamera ruhig in die Hand nehmen. ") + "Moduswahlrad auf " + o.mode + ".");
    else rows.push("Am Moduswahlrad " + (o.arch ? "A einstellen und die Kamera auf ein Stativ setzen." : "MR wählen und " + o.slot + " als Ausgangsprofil aufrufen.") +
      " Die tatsächlichen Einstellungen kontrollieren.");
    rows.push(profiles[s.lens].model + " bei " + o.fl + " verwenden. " + o.stability);
    if (o.framingStep) rows.push(o.framingStep);
    rows.push("Blende f/" + o.f + " und ISO " + o.iso + " wählen. " + o.how + " Drehregler oben und Einstellrad hinten entsprechend der gewählten Radbelegung verwenden.");
    rows.push("Fokus " + o.focus + ", " + o.field + ". " + (s.motiv === "landscape" ?
      "Unter MENU → Kameraeinstlg.1 die Fokusvergrößerung aufrufen. In den Peaking-Einstellungen die Kantenanzeige einschalten (engl. Peaking Setting → Peaking Display). Peaking markiert Kanten. Zur Schärfekontrolle vergrößern." :
      s.motiv === "portrait" ? "Gesicht und Auge kontrollieren." : "Den Fokuspunkt am Motiv prüfen."));
    rows.push("Bildfolge " + o.drive + ", Weißabgleich " + o.wb + ". " + o.formatLabel + " wählen. " +
      (o.mode === "M" && o.isoTarget.kind === "fixed" ? "Probebild aufnehmen, bei Bedarf Zeit, Blende oder ISO ändern." : "Belichtung mit " + o.ev + " beginnen und am Probebild prüfen."));
    if (s.motiv === "landscape") rows.push(...o.tip.filter(text => !text.startsWith("Bei dieser Zoomstellung")));
    return rows;
  }

  function recommend(input, base = null) {
    const s = {...input, ...normalize(input, input)};
    const limits = apertureLimits(s.lens, s.mm);
    const o = s.motiv === "landscape" ? landscape(s, limits) : legacyRecommendation(s, base, limits);
    o.aperture = Math.min(limits.closed, Math.max(limits.open, o.aperture));
    o.profile = {
      version: 1, model: "ILCE-6400", mode: o.mode,
      lens: s.lens, focalMm: s.mm, aperture: o.aperture,
      iso: o.isoTarget, shutter: o.shutter
    };
    const iso = o.isoTarget;
    o.iso = iso.kind === "auto" ? "Auto " + iso.min + "–" + iso.max :
      iso.value + (s.motiv === "landscape" && s.scene === "stars" ? " (Testwert)" : " (fest)");
    o.f = String(o.aperture);
    o.fl = s.mm + " mm";
    o.formatLabel = options.format.find(([key]) => key === s.format)[1];
    o.stability = stability(s.lens, o.tripod);
    if (limits.conservative) o.tip.push("Bei dieser Zoomstellung fehlt eine belegte Offenblende. Der Startwert berücksichtigt die sichere Telegrenze f/" + limits.open + ".");
    if (s.format !== "raw") o.wb += " · JPEG-Farben im Probebild prüfen";
    o.sources = [
      {name: profiles[s.lens].brand + " · Objektivdaten", url: profiles[s.lens].source},
      {name: "Sony · ISO AUTO Min. SS", url: guide + "en/contents/TP0002264687.html"},
      {name: "Sony · Fokuslupe", url: guide + "en/contents/TP0002241206.html"},
      {name: "Sony · Zebra", url: guide + "de/contents/TP0002279517.html"},
      {name: "Sony · SteadyShot", url: guide + "en/contents/TP0002273522.html"}
    ];
    if (s.motiv === "landscape") {
      o.sources.push({name: "Sony · Peaking", url: guide + "en/contents/TP0002279214.html"});
      const readings = {
        stars: {name: "Sony · Sternenhimmel fotografieren", url: "https://www.sony.com/electronics/support/e-mount-body-nex-5-series/nex-5nk/articles/00223374"},
        water: {name: "Tamron · Wasser und Filter", url: "https://tamron-americas.com/blog/camera-lens-accessories-guide/"},
        snow: {name: "Nikon · Schneelandschaften belichten", url: "https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/tips-for-shooting-in-cold-weather"},
        sun: {name: "Sony · Belichtungsreihe", url: guide + "en/contents/TP0002241225.html"}
      };
      o.sources.push(readings[s.scene] || {name: "Sony · Landschaften fotografieren", url: "https://www.sony.com/electronics/support/articles/00199911"});
    }
    if (s.lens === "tam") o.sources.push({name: "Tamron · VC beim B070", url: "https://s3-ap-northeast-1.amazonaws.com/tamron-docs/consumer/support/download/inst/b070/b070x_inst_2312_de.pdf"});
    o.steps = steps(s, o);
    return o;
  }

  const api = {profiles, options, normalize, apertureLimits, framing, recommend};
  if (typeof module === "object" && module.exports) module.exports = api;
  else globalThis.CameraGuide = api;
})();
