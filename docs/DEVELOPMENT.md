# Entwicklung und Veröffentlichung

Stand: 25.11.2026 · Ausgangscode: `678e440489266b9fb514d9688f4d0f66c5a5543e`.

Zurück zum [Überblick](../README.md) · [Architektur](ARCHITECTURE.md) · [Befunde](STATUS.md) · [Roadmap](ROADMAP.md)

## Schnellstart

Die App besteht aus statischen Dateien. Im Ausgangsstand gibt es kein `package.json`, keinen Build-Befehl und keine installierbaren Projektabhängigkeiten.

Voraussetzungen: Git, ein Texteditor, ein aktueller Browser und Python 3 für den lokalen Webserver.

```bash
git clone https://github.com/frnkrm/sonya6400.git
cd sonya6400
```

Unter Linux/macOS:

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

Unter Windows mit installiertem Python-Launcher:

```powershell
py -m http.server 8080 --bind 127.0.0.1
```

- Im Browser `http://localhost:8080/` öffnen.
- Nach Dateiänderungen neu laden. Der Server erzeugt keinen Build.
- Mit `Strg+C` den Server beenden.
- Für Service Worker, Teilen und Standortfunktionen über `localhost` testen; ein Doppelklick auf `index.html` bildet diese Funktionen nicht vollständig ab.
- Der Python-Server wertet Netlifys `_headers` nicht aus. Header-Verhalten auf Netlify separat prüfen.

## Wo wird was geändert?

| Aufgabe | Datei / Einstieg |
| --- | --- |
| Layout, Farben, Texte und Navigation | [`index.html`](../index.html): HTML und eingebetteter `<style>`-Block |
| Objektive, Auswahlwerte, Schnellstarts | `index.html`: `LENS`, `OPT`, `PRE` |
| Kameraempfehlungen und Anleitung | `index.html`: `calc()`, `steps()`, `render()` |
| Speicherplätze und Checklisten | `index.html`: `SL`, `renderSlots()` |
| Bag, Dialoge und Teilen | `index.html`: `openMd()`, `readHash()`, `drawCard()` und zugehörige Listener |
| Wetter und Lichtauswahl | `index.html`: `detect()`, `setLight()`, `byClock()`, `wname()` |
| Offline-Cache und Versionswechsel | [`sw.js`](../sw.js): `VERSION`, `SHELL` und Ereignisbehandlung |
| Installierte App und Icons | [`manifest.webmanifest`](../manifest.webmanifest) und PNG-Dateien im Stammverzeichnis |
| Antwort-Header auf Netlify | [`_headers`](../_headers) |
| Suchmaschinen und öffentliche URL | Metadaten in `index.html`, [`robots.txt`](../robots.txt), [`sitemap.xml`](../sitemap.xml) |

## Arbeitsablauf

1. Den aktuellen Stand lesen: [STATUS](STATUS.md), [ROADMAP](ROADMAP.md) und [`AGENTS.md`](../AGENTS.md).
2. Für größere Änderungen einen konkreten Plan aus der [Vorlage](plans/TEMPLATE.md) anlegen.
3. Einen kleinen, zusammenhängenden Änderungsschritt bearbeiten. Bei späteren Funktionsänderungen bietet sich ein eigener Branch an.
4. Die betroffenen Funktionen anhand der Checkliste unten prüfen.
5. Befunde, Planstatus und relevante Dokumentation im selben Commit aktualisieren.
6. Commit und Zielbranch kontrollieren, dann pushen. Ein Push auf den verbundenen Produktionsbranch kann eine Veröffentlichung auslösen.

Bestehende Schlüssel für `localStorage` und das Linkformat `#s=motiv.licht.bew.look.lens` als Schnittstellen behandeln. Änderungen brauchen eine kompatible Übernahme alter Werte und Tests mit vorhandenen Links.

Neue Objektivdaten gegen die Regelberechnung prüfen. Kameramenüs und fotografische Aussagen anhand passender Herstellerquellen kontrollieren; die vorhandenen Texte sind keine unabhängige fachliche Verifikation.

## Prüfcheckliste für Funktionsänderungen

Diese Punkte beschreiben Prüfziele. Sie sind kein Nachweis, dass bereits alle Tests durchgeführt wurden oder bestehen. Bekannte Abweichungen stehen in [STATUS](STATUS.md).

### Grundfunktionen und Empfehlungen

- [ ] Alle fünf Bereiche öffnen; der aktive Bereich ist erkennbar und wird nach Neuladen wiederhergestellt.
- [ ] Alle sechs Schnellstarts prüfen: Auswahl, Empfehlung und Anleitung passen zusammen.
- [ ] Motiv, Licht, Bewegung, Look und Objektiv einzeln ändern; keine JavaScript-Fehler oder leeren Werte.
- [ ] Besonders prüfen: dunkles Gruppenfoto, bewegte Personen, City/Sweetspot als Stativmodus und lichtschwaches Teleobjektiv.
- [ ] Werte in Hauptansicht, Schrittfolge und geteiltem Bild stimmen überein.

### Gespeicherte Einstellungen

- [ ] Bag bearbeiten; mindestens ein Objektiv bleibt ausgewählt.
- [ ] Das aktuell verwendete Objektiv ausblenden; die App wechselt nachvollziehbar zu einem verfügbaren Objektiv.
- [ ] Auswahl und Checklisten nach Neuladen prüfen; „Alle Haken zurücksetzen“ betrifft die Checklisten.
- [ ] In einem getrennten Testprofil blockierten Speicher und ungültige gespeicherte Auswahlwerte testen.
- [ ] Erwartete Wiederherstellung bei automatischer Lichtmessung prüfen: Die Messung darf eine bewusste neue Auswahl nicht überraschend überschreiben.

### Teilen und Dialoge

- [ ] Link kopieren und in einem frischen Tab öffnen; alle fünf Auswahlwerte übernehmen.
- [ ] Link mit einem Objektiv außerhalb des bisherigen Bags prüfen.
- [ ] Ungültiger Link verursacht keinen Absturz.
- [ ] PNG speichern; Motiv, Objektiv und Werte prüfen. Native Teilen-Funktion auf einem unterstützten Mobilgerät separat prüfen.
- [ ] App-, Bag- und Teilen-Dialog mit Tastatur bedienen: Fokus sichtbar, Tab/Shift+Tab bleiben im Dialog, Escape schließt, Fokus kehrt zum Auslöser zurück.

### Wetter und Offline-Betrieb

- [ ] Standort ablehnen; verständliche Uhrzeitschätzung und weiterhin bedienbare manuelle Lichtauswahl.
- [ ] Mit freigegebenem oder simuliertem Standort Wetterabruf prüfen; Netzwerkfehler ebenfalls testen.
- [ ] Während einer langsamen Wetterabfrage manuell Licht wählen; Verhalten auf unbeabsichtigtes Überschreiben prüfen.
- [ ] App einmal vollständig online öffnen, Service-Worker-Aktivierung prüfen, dann offline neu laden.
- [ ] Offline Navigation, Empfehlungen, Checklisten und Bildexport prüfen; aktuelles Wetter benötigt Netzwerk.
- [ ] Vor dem Offline-Test eine fehlende URL öffnen; der App-Cache darf dadurch nicht durch eine Fehlerseite ersetzt werden.
- [ ] Nach einer Runtime-Änderung einen bereits geöffneten Tab sowie eine installierte App aktualisieren und den tatsächlich sichtbaren Stand prüfen.

### Darstellung und Veröffentlichung

- [ ] Kleine Mobilansicht, Hoch-/Querformat und große Schrift: keine verdeckten Bedienelemente.
- [ ] Fokusmarkierung und reduzierte Bewegung prüfen; Screenreader-Verhalten bei relevanten Änderungen separat testen.
- [ ] Manifest, alle Icons und interne Dateien erreichbar; Domainangaben in Metadaten, Sitemap und `robots.txt` konsistent.
- [ ] In der Veröffentlichungsumgebung Service Worker, Header und Konsole auf Fehler prüfen.

Im Ausgangsstand ist keine automatisierte Testsuite oder GitHub-Actions-Konfiguration enthalten. Bei Änderungen an `calc()` sind gezielte automatisierte Tests sinnvoll; ein vollständiger Lauf aller erlaubten Auswahlen umfasst derzeit 864 Kombinationen. Reine Markdown-Änderungen benötigen keine vollständige App-Testserie.

## Service Worker während der Entwicklung

- Der aktuelle Cache heißt `a6400-v3`; die Offline-Dateiliste steht in `SHELL`.
- Bei Änderungen an gecachten Runtime-Dateien die `VERSION` sinnvoll erhöhen und neue Dateien in `SHELL` berücksichtigen.
- Für reine Markdown-Änderungen ist kein Cache-Versionswechsel nötig.
- In den Browser-Entwicklerwerkzeugen unter Application/Anwendung den aktiven Service Worker und Cache prüfen. Bei veraltetem lokalen Inhalt kann „Update on reload“ helfen.
- Ein vollständiges Löschen der Website-Daten entfernt auch lokal gespeicherte Auswahl und Checklisten. Für solche Tests ein separates lokales Testprofil verwenden.
- Der vorhandene Hinweis „Neue Version geladen“ ist noch kein Nachweis, dass ein offener Tab bereits den neuen HTML-/JavaScript-Stand ausführt; siehe [STATUS](STATUS.md).

## Netlify

Website: [sonyalpha6400.frnkrm.com](https://sonyalpha6400.frnkrm.com/). Repository: [frnkrm/sonya6400](https://github.com/frnkrm/sonya6400).

Für den vorhandenen statischen Aufbau passen folgende Einstellungen. **Dies sind aus dem Repository abgeleitete Sollwerte; die aktuellen Dashboard-Einstellungen wurden für diese Dokumentation nicht vollständig geprüft.**

| Einstellung | Passender Wert |
| --- | --- |
| Produktionsbranch | `main`, sofern dieser in Netlify verbunden ist |
| Base directory | Repository-Stammverzeichnis |
| Build command | Leer; die vorhandenen Dateien brauchen keinen Build |
| Publish directory | `.` / Repository-Stammverzeichnis |
| Eigene Umgebungsvariablen | Im vorhandenen App-Code werden keine benötigt |

- Nach einem Funktions-Push den zugehörigen Deploy prüfen und anschließend die Live-Seite kontrollieren.
- Für reine Dokumentations-Commits kann `[skip ci]` im Commit-Text einen unnötigen Netlify-Deploy vermeiden.
- Dokumentation über GitHub lesen. Bis der bekannte Navigations-Cache-Befund behoben ist, Dokumentations- und Fehlerseiten unter der Live-Domain nicht als Einstieg verwenden; sie können den Offline-Eintrag ersetzen.
- Netlify-Konfiguration und Zugangsdaten nicht mit Projektwissen verwechseln: Keine Tokens, privaten Accountdaten oder lokalen `.netlify`-Dateien committen.
- Bei Veröffentlichung des gesamten Stammverzeichnisses können auch Dokumentationsdateien öffentlich erreichbar werden. Nur für das öffentliche Repository geeignete Inhalte ablegen.

## Dokumentation mitpflegen

- **Verhalten oder Dateiaufteilung geändert:** [Architektur](ARCHITECTURE.md) und diese Anleitung anpassen.
- **Fehler behoben:** [Befund](STATUS.md) mit Nachweis aktualisieren, Roadmap-Punkt verlinken und abschließen.
- **Neues Vorhaben:** [Planvorlage](plans/TEMPLATE.md) kopieren; Ziel, Grenzen und Abnahmekriterien festhalten.
- **Änderung veröffentlicht:** [`CHANGELOG.md`](../CHANGELOG.md) ergänzen.
- Nicht durchgeführte Browser-, Geräte- oder Deployment-Prüfungen ausdrücklich als offen kennzeichnen.
