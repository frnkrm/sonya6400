/* Ausgangsprofile der fünf Speicherplätze. Die gemeinsamen Kameraregeln
   berücksichtigen anschließend die aktuelle Brennweite und Objektivgrenzen. */
(function () {
  "use strict";
  const profiles = {
    tam: {n: "Tamron 17–70 mm f/2.8 VC", s: "Tamron 17–70", open: 2.8, daylight: 4, cloudy: 2.8, dim: 3.5,
      groupDistance: "3–5 m", framing: {portrait: "50–70 mm", gruppe: "20–28 mm", street: "24–35 mm", city: "17–24 mm"}},
    s50: {n: "Sony E 50 mm f/1.8 OSS", s: "Sony 50 f/1.8", open: 1.8, daylight: 2.2, cloudy: 2, dim: 2.8,
      groupDistance: "5–8 m", framing: "50 mm (fix)"},
    t210: {n: "Sony E 55–210 mm f/4.5–6.3 OSS", s: "Sony 55–210", open: 4.5, daylight: 7.1, cloudy: 6.3, dim: 5.6,
      groupDistance: "10–15 m", framing: {portrait: "100–135 mm", gruppe: "55–70 mm", street: "70–110 mm", city: "55–100 mm"}},
    k1650: {n: "Sony E PZ 16–50 mm f/3.5–5.6 OSS", s: "Sony 16–50 Kit", open: 3.5, daylight: 5.6, cloudy: 5.6, dim: 5.6,
      groupDistance: "2–4 m", framing: {portrait: "35–50 mm", gruppe: "16–24 mm", street: "20–35 mm", city: "16–20 mm"}},
    sg1850: {n: "Sigma 18–50 mm f/2.8 DC DN", s: "Sigma 18–50", open: 2.8, daylight: 4, cloudy: 2.8, dim: 3.5,
      groupDistance: "3–5 m", framing: {portrait: "40–50 mm", gruppe: "18–28 mm", street: "24–35 mm", city: "18–24 mm"}},
    sg30: {n: "Sigma 30 mm f/1.4 DC DN", s: "Sigma 30 f/1.4", open: 1.4, daylight: 2, cloudy: 2, dim: 2,
      groupDistance: "3–5 m", framing: "30 mm (fix)"},
    sg16: {n: "Sigma 16 mm f/1.4 DC DN", s: "Sigma 16 f/1.4", open: 1.4, daylight: 2, cloudy: 2, dim: 2,
      groupDistance: "2–3 m", framing: "16 mm (fix)"},
    sg56: {n: "Sigma 56 mm f/1.4 DC DN", s: "Sigma 56 f/1.4", open: 1.4, daylight: 2, cloudy: 2, dim: 2,
      groupDistance: "6–9 m", framing: "56 mm (fix)"},
    s18135: {n: "Sony E 18–135 mm f/3.5–5.6 OSS", s: "Sony 18–135", open: 3.5, daylight: 5.6, cloudy: 5.6, dim: 5.6,
      groupDistance: "3–5 m", framing: {portrait: "70–100 mm", gruppe: "18–28 mm", street: "24–50 mm", city: "18–24 mm"}}
  };

  function calculate(s) {
    const lens = profiles[s.lens];
    const dark = ["daemm", "nacht"].includes(s.licht);
    const sunny = s.licht === "tag";
    const group = s.motiv === "gruppe";
    const portrait = s.motiv === "portrait";
    const city = s.motiv === "city";
    const arch = city && s.look === "sweet";
    const mode = dark && !arch && !group ? "M" : "A";
    const slot = arch ? "Stativ-Modus (kein MR)" : group ? "SD M1 (Slot 4)"
      : dark ? (city ? "SD M2 (Slot 5)" : "MR 3 (Slot 3)")
      : portrait ? "MR 2 (Slot 2)" : "MR 1 (Slot 1)";
    const aperture = arch ? 8 : group ? (sunny ? 5.6 : 4)
      : s.look === "bokeh" ? lens.open : dark ? lens.dim : sunny ? lens.daylight : lens.cloudy;
    const movement = {steh: 0, geh: 1, act: 2}[s.bew];
    const tele = s.lens === "t210";
    let denominator = null;
    if (mode === "M") {
      denominator = tele ? [250, 500, 1000][movement]
        : city ? [30, 60, 250][movement] : [60, 125, 250][movement];
    } else if (!arch) {
      denominator = (group && dark ? [60, 125, 250] : tele ? [250, 500, 1000] : [125, 250, 500])[movement];
    }
    const maxISO = mode === "A" ? (dark ? 6400 : sunny ? 1600 : 3200)
      : city && movement < 2 ? 3200 : movement === 2 || s.licht === "nacht" ? 12800 : 6400;
    const isoTarget = arch ? {kind: "fixed", value: 100} : {kind: "auto", min: 100, max: maxISO};
    const evn = arch ? 0 : city ? (dark ? -0.7 : -0.3)
      : sunny && s.motiv === "street" ? -0.3 : portrait && s.licht === "wolke" ? 0.3 : 0;
    const drive = arch ? "Selbstauslöser 2 s" : portrait ? "Serienbild Lo"
      : city && dark && !movement ? "Einzelbild" : "Serienbild Mid";
    return {
      framingSuggestion: typeof lens.framing === "string" ? lens.framing : lens.framing[s.motiv],
      groupDistance: group ? lens.groupDistance : null,
      mode, arch, dark, slot, aperture, denominator, isoTarget, evn, ev: (evn > 0 ? "+" : "") + evn + " EV",
      drive, drs: drive, focus: arch ? "AF-S" : city && !movement ? "DMF oder AF-S" : "AF-C",
      fs: portrait ? "Spot M" : city ? "Flex. Spot M" : "Zone",
      field: portrait ? "Tracking: Spot M + Augen-AF" : group ? "Zone auf die vordere Reihe" : city ? "Flexible Spot M" : "Tracking: Zone",
      wb: sunny ? "Tageslicht / AWB" : s.licht === "wolke" ? "Wolkig / AWB" : "AWB, am Probebild prüfen"
    };
  }
  const compass = {profiles, calculate};
  if (typeof module === "object" && module.exports) module.exports = compass;
  else globalThis.LegacyCompass = compass;
})();
