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

### Landschaft und Kamerafunktionen umsetzen

Die 26 Punkte **K-01 bis K-26** sind in [Plan 002](plans/002-landschaft-und-kamerafunktionen.md) eingeplant. Für einen Umsetzungsschritt die betroffenen IDs und Abnahmekriterien auswählen; die [Fachreferenz](research/sony-a6400-kamera-objektive.md) ist die gemeinsame Grundlage für Kamera- und Objektivangaben.

1. Herstellerquelle, exaktes Kameramodell beziehungsweise Objektivmodell und zugehörige Grenze prüfen. Bei veränderten Angaben die Fachreferenz mit Quelle und Prüfdatum aktualisieren.
2. Harte Geräte- und Objektivgrenzen von fotografischen Startwerten trennen. Fehlende Daten kennzeichnen; keine präzise Blendenkurve, Schärfe- oder Belichtungsgarantie erfinden.
3. Regel und Erklärung zusammen umsetzen. Danach Kompass, Bedienfolge, Slots, Wissen und Teilen-Karte auf übereinstimmende Werte prüfen.
4. Die passenden Fälle aus der folgenden Tabelle und aus dem Plan durchführen. Vorhandene gespeicherte Werte und Links bei neuen Eingaben gezielt einbeziehen.
5. Erst nach nachgewiesener Abnahme die betreffende K-ID als umgesetzt markieren. Recherche und Planung allein schließen weder eine K-ID noch einen offenen F-Befund ab.

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

### Geplante fachliche Abnahmefälle für Plan 002

**Alle Fälle sind offen.** Sie beschreiben erwartetes Verhalten für spätere Funktionsänderungen. Nach einer Erweiterung reichen die bisherigen 864 Kombinationen allein nicht zur Abdeckung der neuen Eingaben. Nur die vom jeweiligen Änderungsschritt betroffenen Fälle ausführen und Ergebnisse im Plan protokollieren.

| K-IDs | Fall | Erwartetes Verhalten | Prüfstand |
| --- | --- | --- | --- |
| K-01 bis K-05 | Ruhige Landschaft aus der Hand; danach Wind, Stativ und nahen Vordergrund jeweils ändern | Zeitstrategie, Fokus und Stabilisierung reagieren nachvollziehbar; ein Stativ wird nicht als Lösung für bewegte Blätter dargestellt | Offen |
| K-06, K-20, K-26 | Weiches Wasser und scharfe Blätter im Wind gleichzeitig verlangen | Zielkonflikt erklären, Priorität oder Alternative anbieten; keine Garantie, beide Wünsche mit derselben langen Belichtung zu erfüllen | Offen |
| K-07, K-08, K-16 | Heller Himmel sowie Schnee oder Nebel | Belichtungskontrolle und schrittweise Korrektur erklären; weder universelle EV-Korrektur noch exakte RAW-Clipping-Garantie behaupten | Offen |
| K-09, K-05 | Sterne mit kurzer Brennweite | M, Stativ und manuelle Schärfeprüfung erklären; Zeit als Testwert und Unendlichstellung nicht als Fokusgarantie darstellen | Offen |
| K-10, K-11, K-12, K-14 | Sony 55–210 bei 210 mm; danach Objektiv und Brennweite wechseln | Keine Blende weiter offen als f/6,3 am langen Ende; unbekannte Zwischenwerte nicht erfinden; Auswahl bleibt auf passende Profile und gültige Brennweiten begrenzt | Offen |
| K-12 | Sigma 16/30/56 mm und Wunsch f/22 | Nicht verfügbare Einstellung abfangen; diese Profile schließen laut Referenz nur bis f/16 | Offen |
| K-13 | Sigma ohne OS sowie Tamron B070 aus der Hand und am Stativ | Keine Sensorstabilisierung für die α6400 erfinden; objektivabhängige OSS/VC-Hinweise und Stativempfehlung berücksichtigen | Offen |
| K-15 | A mit Auto ISO und erreichter ISO-Obergrenze; anschließend M mit Auto ISO | Min. SS als überschreitbare Schwelle erklären; bei M vorgegebene Zeit/Blende und mögliche Unterbelichtung am Limit benennen | Offen |
| K-17, K-18 | RAW beziehungsweise RAW+JPEG mit Wunsch nach kamerainternem Auto HDR | Nicht verfügbare Kombination erklären; Belichtungsreihe zur späteren Bearbeitung als eigenen Weg darstellen und Bewegung berücksichtigen | Offen |
| K-19, K-20 | Lautlose Aufnahme mit Bewegung/Kunstlicht oder gleichzeitigem Wunsch nach BULB | Passende Einschränkungen anzeigen; keine unzulässige Kombination empfehlen; Wartezeit durch Langzeit-Rauschminderung erklären | Offen |
| K-21 | ND64, ursprüngliche Zeit 1/125 s, unveränderte ISO/Blende; Filtergewinde wechseln | Ungefähr 0,512 s berechnen; Gewinde dem exakten Objektiv zuordnen und ungültige Eingaben abfangen | Offen |
| K-22 | Intervall- und Bildanzahlgrenzen sowie Belichtungszeit länger als Intervall | Grenzen gemäß Referenz berücksichtigen, Zeitkonflikt erklären und Einzelbilder von einem fertig erzeugten Video unterscheiden | Offen |
| K-23 | Sehr naher Vordergrund und ferne Berge | Annahmen einer Schärfentiefenrechnung sichtbar machen; Fokusserie als manuelle Aufnahmefolge erklären | Offen |
| K-24, K-25 | Ganze Aufnahme verwackelt, nur Blätter unscharf oder nur Vordergrund weich | Unterschiedliche Ursachen und nächste Schritte anbieten; Checkliste mit Horizont-, Fokus- und Belichtungskontrolle | Offen |
| K-26, F-03 | Langsamer Wetterabruf nach manueller Auswahl und Vergleich aller Ausgaben | Manuelle Wahl behält Vorrang; Empfehlung, Begründung, Bedienfolge und PNG bleiben konsistent | Offen |
| Alle betroffenen K-IDs | Alte Speicherwerte und alte gültige Links nach Erweiterung laden; danach offline starten | Gültige Angaben erhalten, neue Felder nachvollziehbar ergänzen, ungültige Werte abfangen; Grundfunktionen ohne Wetter nutzbar | Offen |

Diese Abnahmefälle ersetzen keine praktische Aufnahmeprüfung, wenn eine neue fotografische Heuristik als besonders zuverlässig beworben werden soll. Herstellerangaben und vorgeschlagene Startwerte bleiben entsprechend gekennzeichnet.

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
