# Hinweise für die Arbeit an diesem Repository

Diese Hinweise gelten für das gesamte Projekt. Konkrete aktuelle Nutzeraufträge und übergeordnete Vorgaben beachten.

## Vor einer Änderung

1. [README](README.md), [Bestandsaufnahme](docs/STATUS.md) und [Architektur](docs/ARCHITECTURE.md) lesen.
2. Die betroffenen Quelldateien im aktuellen Branch prüfen; Dokumentation kann hinter dem Code liegen.
3. Passende Punkte in [ROADMAP](docs/ROADMAP.md) und vorhandenen [Plänen](docs/plans/001-stabilisierung.md) beachten.
4. Nur den beauftragten Umfang umsetzen. Ein dokumentierter Vorschlag ist kein Auftrag zur sofortigen Implementierung.

## Technischer Rahmen

- Statische App ohne Build-System: HTML, CSS, Daten und Anwendungslogik in `index.html`.
- `sw.js` verwaltet den Offline-Cache; `manifest.webmanifest` die Installation.
- `_headers`, `robots.txt`, `sitemap.xml` und Bilddateien liegen im Stammverzeichnis.
- Keine vorhandenen npm-Skripte, Frameworks, Testsuiten oder Serverfunktionen voraussetzen.
- Neue Abhängigkeiten oder eine neue Architektur nur einführen, wenn der Auftrag das erfordert und der Nutzen klar ist.
- Kleine, zusammenhängende Änderungen bevorzugen; fachliche Korrekturen und größere Umstrukturierungen getrennt halten.

## Bestehende Schnittstellen erhalten

- DOM-IDs, Objektiv-IDs und Auswahlwerte werden an mehreren Stellen verwendet.
- `localStorage`: `st`, `bag`, `tab` sowie `ck0_0` bis `ck4_3`.
- Einstellungslinks: `#s=<motiv>.<licht>.<bew>.<look>.<lens>`.
- Gespeicherte Werte und Linkparameter als ungeprüfte Eingaben behandeln. Erlaubte Werte über eigene Objekteigenschaften beziehungsweise explizite Wertemengen prüfen.
- Bei Umbenennungen oder Formatänderungen vorhandene Links und gespeicherte Daten kompatibel übernehmen oder eine nachvollziehbare Migration ergänzen.
- Nach Änderungen an Kameraempfehlungen `calc()`, `steps()`, `SL`, Wissenstexte und geteilte PNG-Karten auf Übereinstimmung prüfen.
- Neue Objektivprofile gegen alle betroffenen Motive, Lichtklassen und Blendenregeln prüfen.

## Fachliche Inhalte und Oberfläche

- Kameraspezifikationen, Menüwege und Objektivgrenzen anhand passender primärer Herstellerquellen verifizieren; Quellen in der Dokumentation festhalten.
- Vorhandene Aussagen und heuristische Empfehlungen nicht als unabhängig bestätigte Fakten darstellen.
- Die relative Bokeh-Anzeige nicht als exakte Messung der Schärfentiefe bezeichnen.
- Deutsch, klare Bezeichnungen und kurze Abschnitte verwenden.
- Mobile Bedienbarkeit, sichtbaren Fokus, Tastatursteuerung, Dialogfokus und reduzierte Bewegung erhalten.
- Standortfreigabe darf für die manuelle Nutzung nicht erforderlich werden. Fehlerfälle verständlich anzeigen.
- Neue externe oder frei eingegebene Inhalte validieren und sicher ausgeben; keine ungeprüften Werte in `innerHTML` übernehmen.

## Prüfen und dokumentieren

- Lokal mit `python3 -m http.server 8080 --bind 127.0.0.1` starten; unter Windows gegebenenfalls `py` verwenden.
- Relevante Prüfungen aus [DEVELOPMENT](docs/DEVELOPMENT.md) auswählen, statt für jede kleine Änderung die gesamte Liste abzuarbeiten.
- Reine Markdown-Änderungen auf Richtigkeit, Pfade und Links prüfen; dafür keine unnötige App-Testserie aufbauen.
- Bei Änderungen an Regeln, Speicherung oder Links gezielte Regressionstests vorsehen; bei Offline-Änderungen auch Netzfehler und bestehende Clients prüfen.
- Die Service-Worker-Version bei Änderungen an gecachten Anwendungsdateien passend erhöhen und `SHELL` berücksichtigen. Dokumentationsänderungen allein benötigen das nicht.
- Ausgeführte Prüfungen und verbleibende Grenzen ehrlich benennen. Nicht ausgeführte Browser-, Mobilgeräte- oder Live-Prüfungen nicht als bestanden ausgeben.
- Bestandsaufnahme, Architektur, Planstatus und Changelog aktualisieren, soweit die Änderung sie betrifft.

## Git und Veröffentlichung

- Den tatsächlichen Zielbranch und aktuellen Remote-Stand vor dem Push prüfen; fremde Änderungen erhalten.
- Bestehende Autorisierung nutzen: Ein ausdrücklich gewünschter direkter Push auf `main` darf direkt erfolgen, sofern keine technische Schutzregel entgegensteht.
- Bei anderen Aufträgen den gewünschten Veröffentlichungsweg beachten. Keine zusätzlichen pauschalen Freigabeschritte erfinden.
- Kein Force-Push und kein Überschreiben fremder Arbeit als Standardlösung.
- Ein Push auf den verbundenen Produktionsbranch kann Netlify auslösen. Für reine Dokumentations-Commits kann `[skip ci]` verwendet werden.
- Nur öffentliche, projektbezogene Informationen committen. Keine Tokens, persönlichen Gesprächsinhalte oder lokalen `.netlify`-Dateien ablegen.
- Keine Lizenz ohne entsprechenden Auftrag festlegen.

## Abschlussbericht

- Kurz nennen: Was wurde geändert, warum, wo und wie geprüft?
- Commit beziehungsweise Pull Request verlinken und offene Einschränkungen benennen.
- Empfehlungen und tatsächlich erledigte Arbeit klar unterscheiden.
