# Plan 001 — Start, Offline-Cache und Wetterwahl stabilisieren

- **Status:** Vorgeschlagen; Implementierung noch nicht begonnen.
- **Erstellt:** 25.11.2026.
- **Basis:** [`678e440`](https://github.com/frnkrm/sonya6400/commit/678e440489266b9fb514d9688f4d0f66c5a5543e).
- **Befunde:** [F-01, F-02, F-03](../STATUS.md).
- **Einordnung:** [Roadmap, erster Schritt](../ROADMAP.md).

## Ziel

Die vorhandene App soll mit ungültigen gespeicherten Werten startfähig bleiben, eine verlässliche Offline-Startseite behalten und eine bewusste Lichtwahl respektieren.

## Umfang

Betroffen sind [`index.html`](../../index.html) und [`sw.js`](../../sw.js). Änderungen an Speicherformaten, Cache-Verhalten und bestehenden Einstellungslinks müssen kompatibel bleiben.

Ein neues Design, neue Objektive, eigene Presets und eine vollständige Aufteilung des Anwendungscodes gehören nicht zu diesem Schritt.

## Schritt 1 — Auswahlwerte absichern

- [ ] Eine gemeinsame Normalisierung für `lens`, `motiv`, `licht`, `bew` und `look` festlegen.
- [ ] Nur ausdrücklich vorhandene IDs akzeptieren; geerbte Eigenschaften nicht als Datenwerte behandeln.
- [ ] Gespeicherten Zustand, Bag und Einstellungslinks vor ihrer Verwendung prüfen.
- [ ] Fehlerhafte Einzelwerte auf passende Defaults zurücksetzen; gültige gespeicherte Werte möglichst erhalten.
- [ ] Bag mindestens mit einem gültigen Objektiv initialisieren; gespeicherte Bereichs-ID auf die fünf echten Bereiche begrenzen.

**Abnahme:**

- Ein frischer Start sowie ein Start mit beschädigtem JSON oder ungültigen Auswahlwerten erzeugen eine bedienbare App.
- Der Test-Hash `#s=constructor.tag.steh.bokeh.tam` verursacht keinen Absturz.
- Ein gültiger Link wie `#s=portrait.tag.steh.bokeh.s50` stellt alle fünf Werte wieder her.
- Die 864 regulären Kombinationen liefern weiterhin vollständige Berechnungen und Bedienfolgen.

## Schritt 2 — Offline-Einstieg schützen

- [ ] Festlegen, welche URLs die App-Startseite repräsentieren: insbesondere `/` und `/index.html` im jeweiligen App-Scope.
- [ ] Nur erfolgreiche, geeignete App-Antworten unter dem Offline-Einstieg speichern.
- [ ] Andere Dokumente und HTTP-Fehler vom Aktualisieren dieses Eintrags ausschließen.
- [ ] Verhalten bei Netzfehler, Serverfehler und fehlendem Offline-Cache getrennt behandeln.
- [ ] Cache-Version für diese Runtime-Änderung erhöhen; vorhandene Nutzer bei der Umstellung berücksichtigen.

**Abnahme:**

- Nach Online-Start, Besuch einer fehlenden URL und anschließendem Offline-Neuladen startet die App.
- Ein auf derselben Origin aufgerufenes Dokument überschreibt den App-Einstieg nicht.
- Eine erfolgreiche Aktualisierung der Startseite wird weiterhin gespeichert.
- Tests mit einem bereits aktiven alten Worker und einem frischen Browserprofil sind dokumentiert.

## Schritt 3 — Absicht bei der Lichtwahl erhalten

- [ ] Eine eindeutige Kennung für die aktuelle Wetteranfrage beziehungsweise den Auswahlstand einführen.
- [ ] Späte Ergebnisse ignorieren, wenn seit ihrem Start manuell Licht oder ein Preset gewählt wurde.
- [ ] Mehrfaches „Neu messen“ so behandeln, dass nur die aktuelle Anfrage übernehmen kann.
- [ ] Wetter-Fetch zeitlich begrenzen und Antwortstatus sowie erforderliche Werte prüfen.
- [ ] Uhrzeit-Fallback als Schätzung anzeigen und ebenfalls vor dem Überschreiben neuer manueller Eingaben schützen.

**Vorgeschlagenes Verhalten:** „Neu messen“ startet bewusst eine neue automatische Ermittlung. Eine danach vorgenommene manuelle Auswahl hat Vorrang. Diese Bedienentscheidung vor der Implementierung im Plan festhalten.

**Abnahme:**

- Bei langsamer Antwort bleibt eine zwischenzeitlich gewählte Lichtklasse erhalten.
- Ein älteres von zwei Messergebnissen setzt einen neueren Stand nicht zurück.
- Standortablehnung, Wetter-Timeout und unvollständige Antworten lassen die manuelle Bedienung nutzbar.
- Beim Start über einen gültigen Einstellungslink bleibt die bisherige Übernahme ohne automatische Wetterabfrage erhalten.

## Umsetzung und Veröffentlichung

- Die drei Schritte möglichst getrennt umsetzen und jeweils gezielt prüfen.
- Bestehende Daten und Link-IDs nicht nebenbei umbenennen.
- Relevante manuelle Prüfungen aus [DEVELOPMENT](../DEVELOPMENT.md) ergänzen; insbesondere Offline- und Mobilverhalten.
- Bei Funktions-Commits den normalen Netlify-Deploy auslösen und prüfen; `[skip ci]` dafür nicht verwenden.
- Jede behobene ID in [STATUS](../STATUS.md) mit Nachweis aktualisieren; Ergebnis in [CHANGELOG](../../CHANGELOG.md) ergänzen.

## Ergebnisprotokoll

Noch keine Implementierung, kein Fix-Commit und keine Abnahme erfolgt.

Bei Umsetzung ergänzen: Commit(s), ausgeführte Prüfungen, Browser/Geräte, Deployment-Ergebnis und verbleibende Einschränkungen.
