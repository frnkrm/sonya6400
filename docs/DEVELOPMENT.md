# Entwicklung und Veröffentlichung

Stand: 25.11.2026 · Ausgangscode: `678e440489266b9fb514d9688f4d0f66c5a5543e`.

Zurück zum [Überblick](../README.md) · [Architektur](ARCHITECTURE.md) · [Befunde](STATUS.md) · [Roadmap](ROADMAP.md)

## Schnellstart

Die App besteht aus statischen Dateien. Für die Auslieferung genügt ein Webserver.

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

## Testwerkzeuge

Für den lokalen Server genügt Python 3. Die Regeltests laufen mit dem integrierten Test-Runner von Node.js. Für die Browsertests sind Python mit Playwright und Chromium erforderlich. Die Testwerkzeuge dienen ausschließlich der Entwicklung.

Aus dem Repository-Stamm:

```bash
node --test tests/*.test.js
python3 -m unittest discover -s tests -p '*.py' -v
```

Die Browsertests nutzen einen lokalen Server und isolierte Browserprofile. Für den Update-Test braucht der Checkout das Git-Objekt `678e440489266b9fb514d9688f4d0f66c5a5543e` mit dem alten v3-Client. Bei einer flachen Kopie die Historie dieses Commits ergänzen. Die geprüfte Cloud-Umgebung verwendet Node 24.22.3, Python 3.12, Playwright 1.62.0 und Chromium 156. Die PWA-Prüfung nutzt die DevTools-Kommandos `PWA.install` und `PWA.launch` des vollständigen Chromium-Browsers. `CHROMIUM_PATH` kann auf dessen Programmdatei zeigen.

Auf einem Entwicklungsrechner ohne Playwright kann eine virtuelle Python-Umgebung außerhalb des Repositorys verwendet werden:

```bash
python3 -m venv ../a6400-testenv
. ../a6400-testenv/bin/activate
python -m pip install playwright==1.62.0
python -m playwright install chromium
export CHROMIUM_PATH="$(python -c 'from playwright.sync_api import sync_playwright; p=sync_playwright().start(); print(p.chromium.executable_path); p.stop()')"
```

Die [Architekturübersicht](ARCHITECTURE.md) ordnet Funktionen ihren Quelldateien zu. Zu Änderungen an Kamera- oder Objektivdaten gehören der Abgleich mit der [Fachreferenz](research/sony-a6400-kamera-objektive.md) und die betroffenen Kriterien in [Plan 002](plans/002-landschaft-und-kamerafunktionen.md).

## Arbeitsablauf

1. Den aktuellen Stand lesen: [STATUS](STATUS.md), [ROADMAP](ROADMAP.md) und [`AGENTS.md`](../AGENTS.md).
2. Für größere Änderungen einen konkreten Plan aus der [Vorlage](plans/TEMPLATE.md) anlegen.
3. Einen kleinen, zusammenhängenden Änderungsschritt bearbeiten. Bei späteren Funktionsänderungen bietet sich ein eigener Branch an.
4. Die betroffenen Funktionen anhand der Checkliste unten prüfen.
5. Befunde, Planstatus und relevante Dokumentation im selben Commit aktualisieren.
6. Commit und Zielbranch kontrollieren, dann pushen. Ein Push auf den verbundenen Produktionsbranch kann eine Veröffentlichung auslösen.

Bestehende Schlüssel für `localStorage` und das Linkformat `#s=motiv.licht.bew.look.lens` als Schnittstellen behandeln. Änderungen brauchen eine kompatible Übernahme alter Werte und Tests mit vorhandenen Links.

Neue Objektivdaten gegen die Regelberechnung prüfen. Kameramenüs und fotografische Aussagen anhand passender Herstellerquellen kontrollieren; die vorhandenen Texte sind keine unabhängige fachliche Verifikation.

## Nächster Codex-Lauf: Kameraverbindung

Der [vollständige Codex-Auftrag](CODEX-AUFTRAG.md) verweist auf [Plan 003](plans/003-kameraverbindung-und-presettransfer.md) und die [Verbindungsrecherche](research/sony-a6400-verbindung-und-presettransfer.md). Der aktuelle Stand enthält die bereits abgenommenen Pläne 001 und 002; diese nicht erneut implementieren.

1. Den aktuellen Remote-Stand und betroffene Module prüfen. Bestehende Quellen und Tests gezielt wiederverwenden.
2. Profilsemantik, Fähigkeiten und Übertragungslogik mit erkennbarer Simulation aufbauen; anschließend einen echten ausführbaren USB-Adapter ergänzen. Keine bloße Simulation als fertige Kameraverbindung ausweisen.
3. ISO, Blende und Zeit anhand tatsächlicher Fähigkeiten schreiben und zurücklesen. Modus, Auto ISO, Zeitgrenzen und Objektivgrenzen getrennt behandeln.
4. Website und lokalen Verbindungsweg zusammen prüfen. Wenn direkter Browserzugriff blockiert ist, den validierten Profilimport als Rückfallweg fertigstellen und dokumentieren.
5. Hardwareprüfungen H-01 bis H-10 aus der Recherche bei verfügbarer Kamera protokollieren. Ohne Gerät Softwarearbeiten abschließen; Hardwareabnahme und Persistenz bleiben offen.
6. C-01 bis C-08, relevante Projektdokumentation, Commit und tatsächlichen Veröffentlichungsstand nachführen. Keine zusätzliche Freigaberunde für bereits beauftragte Arbeit einführen; technische Zugriffsgrenzen respektieren.

**Prüfumfang:** Neue gezielte Tests sollen Profilvalidierung, A-/M-Semantik, Auto ISO, unzulässige Werte, Verbindungsabbruch, Rückleseabweichung, Teilerfolg und die betroffenen Browserabläufe abdecken. Bei einem lokalen Dienst zusätzlich unerlaubte Zugriffe prüfen. Bestehende Testbefehle oben weiterverwenden; konkrete Adapter-/Hardwarebefehle erst ergänzen, sobald sie tatsächlich implementiert und ausprobiert sind. Keine Kamera-Firmware ändern oder Service-Modus-Aktionen zur Einrichtung voraussetzen.

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

Die Regeltests schließen die 864 ursprünglichen Kombinationen ein. Neue Szenarien brauchen eigene Prüfungen, insbesondere Zoom-Endwerte, alternative Aufnahmeziele, Formatgrenzen und ungültige Rechnereingaben. Jeder K-Kennung ist ein konkreter Abnahmefall zugeordnet. [Plan 002](plans/002-landschaft-und-kamerafunktionen.md)

## Service Worker während der Entwicklung

- Cache-Version und Offline-Dateiliste stehen in [sw.js](../sw.js).
- Bei Änderungen an gecachten Runtime-Dateien `VERSION` und die HTML-Versionsmarke `app-release` zusammen erhöhen. Neue Pflichtdateien in `SHELL` aufnehmen.
- Für reine Markdown-Änderungen ist kein Cache-Versionswechsel nötig.
- In den Browser-Entwicklerwerkzeugen unter Application/Anwendung den aktiven Service Worker und Cache prüfen. Bei veraltetem lokalen Inhalt kann „Update on reload“ helfen.
- Ein vollständiges Löschen der Website-Daten entfernt auch lokal gespeicherte Auswahl und Checklisten. Für solche Tests ein separates lokales Testprofil verwenden.
- Beim Versionswechsel zusätzlich prüfen, welche Fassung der bereits geöffnete Tab nach dem Neuladen tatsächlich zeigt.

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
- Nach dem Deploy einzelne Runtime-Dateien und ihre Header vom Produktionshost prüfen. Den ausgelieferten Inhalt mit dem gepushten Commit vergleichen.
- Netlify-Konfiguration und Zugangsdaten nicht mit Projektwissen verwechseln: Keine Tokens, privaten Accountdaten oder lokalen `.netlify`-Dateien committen.
- Bei Veröffentlichung des gesamten Stammverzeichnisses können auch Dokumentationsdateien öffentlich erreichbar werden. Nur für das öffentliche Repository geeignete Inhalte ablegen.

## Dokumentation mitpflegen

- **Verhalten oder Dateiaufteilung geändert:** [Architektur](ARCHITECTURE.md) und diese Anleitung anpassen.
- **Fehler behoben:** [Befund](STATUS.md) mit Nachweis aktualisieren, Roadmap-Punkt verlinken und abschließen.
- **Neues Vorhaben:** [Planvorlage](plans/TEMPLATE.md) kopieren; Ziel, Grenzen und Abnahmekriterien festhalten.
- **Änderung veröffentlicht:** [`CHANGELOG.md`](../CHANGELOG.md) ergänzen.
- Nicht durchgeführte Browser-, Geräte- oder Deployment-Prüfungen ausdrücklich als offen kennzeichnen.
