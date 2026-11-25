# Plan 001 — Start, Offline-Cache und Wetterwahl stabilisieren

- **Status:** In Chromium mit frischem Profil, geöffnetem v3-Tab und installierter Desktop-Web-App lokal abgenommen.
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

- [x] Eine gemeinsame Normalisierung für `lens`, `motiv`, `licht`, `bew` und `look` festlegen.
- [x] Nur ausdrücklich vorhandene IDs akzeptieren; geerbte Eigenschaften nicht als Datenwerte behandeln.
- [x] Gespeicherten Zustand, Bag und Einstellungslinks vor ihrer Verwendung prüfen.
- [x] Fehlerhafte Einzelwerte auf passende Defaults zurücksetzen; gültige gespeicherte Werte möglichst erhalten.
- [x] Bag mindestens mit einem gültigen Objektiv initialisieren; gespeicherte Bereichs-ID auf die fünf echten Bereiche begrenzen.

**Abnahme:**

- Ein frischer Start sowie ein Start mit beschädigtem JSON oder ungültigen Auswahlwerten erzeugen eine bedienbare App.
- Der Test-Hash `#s=constructor.tag.steh.bokeh.tam` verursacht keinen Absturz.
- Ein gültiger Link wie `#s=portrait.tag.steh.bokeh.s50` stellt alle fünf Werte wieder her.
- Die 864 regulären Kombinationen liefern weiterhin vollständige Berechnungen und Bedienfolgen.

## Schritt 2 — Offline-Einstieg schützen

- [x] Festlegen, welche URLs die App-Startseite repräsentieren: insbesondere `/` und `/index.html` im jeweiligen App-Scope.
- [x] Nur erfolgreiche, geeignete App-Antworten unter dem Offline-Einstieg speichern.
- [x] Andere Dokumente und HTTP-Fehler vom Aktualisieren dieses Eintrags ausschließen.
- [x] Verhalten bei Netzfehler, Serverfehler und fehlendem Offline-Cache getrennt behandeln.
- [x] Cache-Version für diese Runtime-Änderung erhöhen; vorhandene Nutzer bei der Umstellung berücksichtigen.

**Abnahme:**

- Nach Online-Start, Besuch einer fehlenden URL und anschließendem Offline-Neuladen startet die App.
- Ein auf derselben Origin aufgerufenes Dokument überschreibt den App-Einstieg nicht.
- Eine erfolgreiche Aktualisierung der Startseite wird weiterhin gespeichert.
- Tests mit einem bereits aktiven alten Worker und einem frischen Browserprofil sind dokumentiert.

## Schritt 3 — Absicht bei der Lichtwahl erhalten

- [x] Eine eindeutige Kennung für die aktuelle Wetteranfrage beziehungsweise den Auswahlstand einführen.
- [x] Späte Ergebnisse ignorieren, wenn seit ihrem Start manuell Licht oder ein Preset gewählt wurde.
- [x] Mehrfaches „Neu messen“ so behandeln, dass nur die aktuelle Anfrage übernehmen kann.
- [x] Wetter-Fetch zeitlich begrenzen und Antwortstatus sowie erforderliche Werte prüfen.
- [x] Uhrzeit-Fallback als Schätzung anzeigen und ebenfalls vor dem Überschreiben neuer manueller Eingaben schützen.

**Bedienentscheidung:** „Neu messen“ startet eine neue automatische Ermittlung. Wer danach das Licht manuell oder über einen Schnellstart auswählt, behält diese Wahl.

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

[Funktionscommit 57b8df8](https://github.com/frnkrm/sonya6400/commit/57b8df83418377e44b2fc625dd3f8fdcd75ee7b5)

- **F-01, F-03, F-04, F-05:** Dreizehn Chromium-Tests in [stability.py](../../tests/stability.py) bestanden. Sie prüfen beschädigte und teilweise gültige Altdaten, den früheren und erweiterten Einstellungslink, deaktivierten Speicher, fehlgeschlagene Schreibzugriffe, Enter und Leertaste sowie verzögerte, überholte, unbekannte und fehlerhafte Wetterantworten. Ein Linkwechsel im selben Tab öffnete den Kompass. Nach einer manuellen Änderung und einem Reload blieben die geänderte Auswahl und der danach gewählte Bereich erhalten. Der Wetter-Timeout wurde mit einer virtuellen Uhr ausgelöst.
- **Lichtwahl:** Ein manuell gespeicherter Wert bleibt über einen Neustart erhalten. Ein zuvor automatisch übernommener Wert darf beim nächsten regulären Besuch aktualisiert werden. Ein gültiger Einstellungslink löst beim Laden keine neue Messung aus.

- **F-02, F-06, F-07:** Die beiden [PWA-Tests](../../tests/pwa.py) bestanden in Chromium. Ein anderes Dokument, eine 404/500-Antwort und eine Seite mit fremdem HTML ließen den Offline-Einstieg intakt. Ein fehlendes Pflichtmodul verhinderte die Aktivierung der neuen Fassung. Nach dessen Wiederherstellung wechselten der offene v3-Tab und die über Chromium installierte v3-App auf die neue HTML-Version. Gespeicherter Haken und fremder Cache blieben erhalten.
- **F-01, reguläre Auswahl:** [Kameraregeltests](../../tests/camera.test.js) prüften die 864 vorhandenen Kombinationen bei beiden Zoom-Endwerten einschließlich berechneter Zeit und Bedienfolge.
