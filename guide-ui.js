/* Bedienelemente für die Aufnahme. Regeln und Herstellerdaten liefert CameraGuide. */
const GuideUI = (() => {
  const labels = {
    scene: 'Was fotografierst du?',
    support: 'Kamerahaltung',
    wind: 'Wind am Motiv',
    depth: 'Gewünschter Schärfebereich',
    water: 'Wie soll das Wasser aussehen?',
    priority: 'Was soll im Bild Vorrang haben?'
  };

  let inputs;
  let details;
  let applySelection;
  let checklistKey;

  function element(tag, text) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function field(key, control) {
    const wrapper = element('div');
    wrapper.className = 'guide-field';
    const label = element('label', labels[key] || 'Aktuelle Brennweite (mm)');
    control.id = 'guide-' + key;
    control.name = key;
    label.htmlFor = control.id;
    wrapper.append(label, control);
    return wrapper;
  }

  function initialize() {
    inputs = document.getElementById('guide-inputs');
    details = document.getElementById('guide-details');
    inputs.classList.add('guide-grid');
    const focal = element('input');
    focal.type = 'number';
    focal.inputMode = 'numeric';
    focal.step = '1';
    focal.required = true;
    focal.setAttribute('aria-describedby', 'guide-mm-description guide-mm-error');
    const focalField = field('mm', focal);
    const description = element('span');
    description.className = 'guide-hint';
    description.id = 'guide-mm-description';
    const error = element('span');
    error.id = 'guide-mm-error';
    error.className = 'guide-error';
    error.setAttribute('role', 'status');
    focalField.append(description, error);
    inputs.append(focalField);

    // Ungültige Eingaben bleiben zur Korrektur stehen. Die letzte gültige Empfehlung bleibt nutzbar.
    focal.addEventListener('change', () => {
      if (!focal.validity.valid) {
        focal.setAttribute('aria-invalid', 'true');
        error.textContent = 'Eine ganze Brennweite von ' + focal.min + ' bis ' + focal.max +
          ' mm eingeben. Die Empfehlung gilt weiter für ' + focal.dataset.applied + ' mm.';
        return;
      }
      applySelection({mm: focal.valueAsNumber});
    });
    for (const key of Object.keys(labels)) {
      const select = element('select');
      for (const [value, text] of CameraGuide.options[key]) {
        const option = element('option', text);
        option.value = value;
        select.append(option);
      }
      select.addEventListener('change', () => applySelection({[key]: select.value}));
      inputs.append(field(key, select));
    }

    details.innerHTML = `
      <details><summary>Warum diese Startwerte?</summary><div>
        <p id="guide-reason"></p>
        <p id="guide-stability"></p>
        <p id="guide-framing"></p>
        <p id="guide-profile"></p>
        <p id="guide-aperture-note"></p>
        <div class="guide-field">
          <label for="guide-aperture">Blendenwunsch am Objektiv prüfen (f-Zahl)</label>
          <input type="number" id="guide-aperture" step="any" min="0.1" inputmode="decimal"
                 placeholder="z. B. 22" aria-describedby="guide-aperture-result">
          <p id="guide-aperture-result" class="guide-hint" role="status"></p>
        </div>
        <ul id="guide-sources" aria-label="Quellen zu dieser Empfehlung"></ul>
      </div></details>
      <details><summary>Checkliste vor Ort</summary><div id="guide-checklist"></div></details>`;
  }

  function showSelection(key, value, visible) {
    const select = document.getElementById('guide-' + key);
    select.parentElement.hidden = !visible;
    select.value = value;
  }

  function setText(id, text) {
    document.getElementById(id).textContent = text;
  }

  function updateChecklist(s, o) {
    const checks = [
      'Horizont mit der Wasserwaage ausrichten und die vier Bildränder prüfen.',
      o.tripod ? 'Stativ fixieren und Auslösung prüfen. ' + o.stability : o.stability,
      s.motiv === 'landscape' && s.depth === 'near' && s.scene !== 'stars'
        ? 'Vordergrund und Ferne im Probebild getrennt vergrößern.'
        : 'Fokus am wichtigsten Motivdetail vergrößert prüfen.',
      'Helle Bildteile im Histogramm und am Motiv prüfen.',
      'Tatsächliche Zeit im Sucher ablesen und die Bewegung im Probebild prüfen.'
    ];
    const key = JSON.stringify([s, checks]);
    if (key === checklistKey) return;
    checklistKey = key;
    const rows = checks.map(text => {
      const label = element('label');
      label.className = 'ck';
      const box = element('input');
      box.type = 'checkbox';
      label.append(box, element('span', text));
      return label;
    });
    document.getElementById('guide-checklist').replaceChildren(...rows);
  }

  function render(s, o, bag, changeSelection) {
    if (!inputs) initialize();
    applySelection = changeSelection;
    const landscape = s.motiv === 'landscape';
    const water = landscape && s.scene === 'water';
    const profile = CameraGuide.profiles[s.lens];
    const [short, long] = profile.range;
    const focal = document.getElementById('guide-mm');
    focal.min = short;
    focal.max = long;
    focal.readOnly = short === long;
    // Bei einem asynchronen Wetterupdate eine laufende Eingabe am selben Zoom erhalten.
    const sameSetting = focal.dataset.lens === s.lens && focal.dataset.applied === String(s.mm);
    if (!sameSetting || document.activeElement !== focal) {
      focal.value = s.mm;
      focal.removeAttribute('aria-invalid');
      setText('guide-mm-error', '');
    }
    focal.dataset.lens = s.lens;
    focal.dataset.applied = s.mm;
    const kb = (s.mm * 1.5).toLocaleString('de-DE');
    const range = short === long ? 'Festbrennweite' : short + '–' + long + ' mm am Zoom';
    setText('guide-mm-description', range + ' · Bildwinkel wie ' + kb + ' mm an Kleinbild');
    showSelection('scene', s.scene, landscape);
    showSelection('support', s.support, landscape);
    showSelection('wind', s.wind, landscape);
    showSelection('depth', s.depth, landscape);
    showSelection('water', s.water, water);
    showSelection('priority', s.priority, water && s.water === 'soft' && s.wind !== 'calm');

    setText('guide-reason', o.reason);
    setText('guide-stability', o.stability);
    const framing = document.getElementById('guide-framing');
    framing.hidden = !landscape;
    framing.textContent = landscape ? CameraGuide.framing(s, bag) : '';
    setText('guide-profile', profile.brand + ' ' + profile.model + ' · Sony E · Filtergewinde ' +
      Number(profile.filter).toLocaleString('de-DE') + ' mm · Naheinstellgrenze ' + profile.near);
    const limits = CameraGuide.apertureLimits(s.lens, s.mm);
    const note = document.getElementById('guide-aperture-note');
    note.hidden = !limits.conservative;
    note.textContent = 'Für diese Zoomstellung fehlt eine belegte Offenblende. Die Empfehlung verwendet deshalb die am langen Ende verfügbare Öffnung.';
    document.getElementById('guide-sources').replaceChildren(...o.sources.map(source => {
      const item = element('li');
      const link = element('a', source.name);
      link.href = source.url;
      item.append(link);
      return item;
    }));
    const aperture = document.getElementById('guide-aperture');
    function checkAperture() {
      const format = n => n.toLocaleString('de-DE');
      const desired = aperture.valueAsNumber;
      let result;
      if (aperture.validity.badInput || (aperture.value !== '' && !(desired > 0))) {
        result = 'Eine positive Blendenzahl eingeben.';
      } else if (aperture.value === '') {
        result = 'Für die Empfehlung nutzbarer Bereich von f/' + format(limits.open) + ' bis f/' + format(limits.closed) + '.';
      } else if (desired < limits.open && limits.conservative && desired >= profile.opening[0]) {
        result = 'Die Offenblende bei dieser Zoomstellung ist unbekannt. Für diesen Wunsch die Anzeige an der Kamera prüfen.';
      } else if (desired < limits.open || desired > limits.closed) {
        result = 'Außerhalb des belegten Bereichs. Als Startwert f/' + format(o.aperture) + ' versuchen.';
      } else {
        result = 'Innerhalb der berücksichtigten Grenzen. Die verfügbare Blendenstufe am Einstellrad prüfen.';
      }
      setText('guide-aperture-result', result);
    }
    aperture.oninput = checkAperture;
    checkAperture();
    updateChecklist(s, o);
  }

  return {render};
})();
