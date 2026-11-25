# Änderungsprotokoll

Hier stehen nachvollziehbare Änderungen am Projekt. Neue Einträge kommen nach oben; zukünftige Vorhaben stehen in der [Roadmap](docs/ROADMAP.md).

## Windows-Geräteerkennung beim ISO-Lesetest

- Die Suche berücksichtigt öffentliche und private WPD-Endpunkte und deren Plug-&-Play-Zuordnung zur USB-Kamera. Modell, Hersteller- und Produktkennung werden vor der ISO-Abfrage geprüft. Die Fehlermeldung unterscheidet leere Listen von fehlender Zuordnung.
- Der vorherige Versuch mit `5b6454c` endete am Gerät bereits bei der Endpunktsuche. Die [Windows-Anleitung](docs/WINDOWS-USB.md) beschreibt den unveränderten einmaligen Lesetest und die offenen Nachweise.

## Nativer ISO-Lesetest unter Windows

- Die lokale App bietet auf Windows 11 x64 **ISO über Windows lesen** an. Die Kamera bleibt dem Windows-Treiber zugeordnet. Die [Kurzanleitung](docs/WINDOWS-USB.md) führt vom frischen Projekt-ZIP bis zur Anzeige von ISO oder Fehler.
- Der beobachtete WSL-Timeout beim ersten OpenSession-Transfer und der separate Befund ISO 400 aus Sony Imaging Edge Remote sind im [Prüfstand](docs/STATUS.md#kameraanbindung) dokumentiert. Die native Rücklesung am Gerät ist offen.

## 2026-11-25 — USB-Einrichtung unter Windows

- Das Projekt-ZIP enthält einen Windows-Starter für den lokalen Kameradienst. Node.js läuft unter Windows, gphoto2 in Ubuntu unter WSL 2. Eine [Anleitung](docs/WINDOWS-USB.md) erklärt die Gerätezuordnung und den ersten Lesetest.
- **Nur ISO übertragen** ermöglicht den gezielten Erstversuch mit einer einzigen Einstellung und anschließender Rücklesung. In einem Praxistest zeigte Sony Imaging Edge Remote unter Windows ISO 400 an. Für den Projektadapter steht der Geräteversuch aus.

## 2026-11-25 — Übertragungsprofile und lokale USB-Verbindung

- Kameraempfehlungen liefern strukturierte ISO-, Blenden- und Zeitangaben für ein versioniertes JSON-Profil. Modus A behält seine Belichtungsautomatik, auch wenn eine Schwelle für ISO AUTO Min. SS gewählt wurde.
- Die lokale Anwendung auf dem Rechner am USB-Kabel verwendet gphoto2. Die Oberfläche zeigt Ziel, Fähigkeiten, Rücklesung und manuelle Restschritte. Simulation und Datei-Export stehen auch auf der statischen Seite zur Verfügung.
- Für echte Kameraversuche gibt es ein [H-01–H-10-Protokoll](docs/plans/003-kameraverbindung-und-presettransfer.md#hardwareprotokoll). Der Prüfstand für Software und Veröffentlichung steht im [Projektstand](docs/STATUS.md).

## 2026-11-25 — Kameraanbindung recherchiert und Codex-Auftrag vorbereitet

- [Verbindungsrecherche](docs/research/sony-a6400-verbindung-und-presettransfer.md) mit Sony- und Community-Quellen zu WLAN, Imaging Edge, NFC, USB, SD-Profilen und Modding ergänzt. Ungeprüfte Fähigkeiten und Hardwarefälle H-01 bis H-10 ausdrücklich benannt.
- [Plan 003](docs/plans/003-kameraverbindung-und-presettransfer.md) mit C-01 bis C-08 angelegt: strukturierte Profile, echter lokaler USB-Adapter, Rücklesung, optionale Oberfläche, Import-Rückfallweg und getrennte Software-/Hardwareabnahme.
- [Codex-Auftrag mit Startprompt](docs/CODEX-AUFTRAG.md) für autonome, gezielte Umsetzung und direkten Push auf `main` ergänzt. Bereits implementierte Landschafts- und Stabilisierungsarbeit bleibt Grundlage.
- README, Agentenhinweise, Roadmap, Projektstand, Architektur und Entwicklungsanleitung verknüpft und auf die geplante Erweiterung abgestimmt.
- Umfang: ausschließlich Markdown. Dateipfade, interne Verweise und Statuskonsistenz geprüft; keine neue Runtime, keine Kameraanbindung implementiert und keine neuen Kamera-/Browser-/Produktionsprüfungen durchgeführt.

## 2026-11-25 — Landschaftskompass und Aufnahmehilfen

- Der Kompass berücksichtigt Landschaftsszene, Wind, Hand oder Stativ, nahen Vordergrund und die manuell gewählte Brennweite. Für Wasser kann die Zeichnung im Wasser oder in bewegten Blättern priorisiert werden.
- Neun modellbezogene Objektivprofile liefern Blendenlimits, OSS/VC, Filtergewinde, Bildwinkel und Naheinstellgrenze. Kompass, Bedienfolge und PNG verwenden die gemeinsame Empfehlung.
- Neue Hilfen begleiten RAW/JPEG, Reihen/HDR, Verschlusswahl, BULB und die Diagnose am Probebild. ND-, Intervall- und Schärfentiefenrechner verwenden die eingegebenen Aufnahmeparameter.
- Gespeicherte Auswahlen und Einstellungslinks werden validiert. Die Lichtmessung berücksichtigt eine nachträgliche manuelle Auswahl. Der Offline-Cache prüft die Pflichtdateien und die HTML-Version.
- Regressionstests decken Regeln und Browserabläufe ab. Prüfergebnisse, Geräteabdeckung und Veröffentlichungsstand stehen im [Projektstand](docs/STATUS.md).

## 2026-11-25 — Landschafts- und Kamerafunktionen eingeplant

### Ergänzt und aktualisiert

- Alle **26 Recherchepunkte** als K-01 bis K-26 in [Plan 002](docs/plans/002-landschaft-und-kamerafunktionen.md) mit Anforderungen und überprüfbaren Abnahmekriterien aufgenommen.
- [Fachreferenz](docs/research/sony-a6400-kamera-objektive.md) mit Herstellerquellen, neun Objektivprofilen, Landschaftsszenarien und fachlichen Korrekturhinweisen ergänzt.
- [Roadmap](docs/ROADMAP.md), Überblick und Bestandsaufnahme auf den eingeplanten Umfang abgestimmt.
- Geplante Architekturergänzungen, gezielte Prüfziele und Hinweise für weitere Entwicklungsaufträge dokumentiert.

### Umfang und Prüfstand

- Die Funktionen sind **geplant, noch nicht implementiert**. Bestehende technische Befunde F-01 bis F-07 bleiben offen.
- Nummerierung und Vollständigkeit der 26 Punkte, interne Dokumentationslinks und der reine Markdown-Umfang wurden geprüft.
- Keine neuen Kamera-, Browser- oder Live-Deployment-Tests durchgeführt; Aufnahmevorschläge bleiben praktische Startwerte.

## 2026-11-25 — Dokumentationsgrundlage

### Ergänzt

- Projektüberblick und Hinweise für künftige Entwicklungsaufträge.
- Architektur, Datenformate und Anleitung für lokale Entwicklung und Veröffentlichung.
- Bestandsaufnahme mit reproduzierten Fehlern und klar benannten Prüfgrenzen.
- Priorisierte Roadmap, konkreter Stabilisierungsplan und Vorlage für weitere Vorhaben.

### Prüfstand

- Die Empfehlungslogik wurde isoliert mit allen 864 erlaubten Auswahlkombinationen geprüft.
- Einzelne Fehler bei Einstellungslinks, Offline-Cache und Wetterautomatik wurden reproduziert; Details in [STATUS](docs/STATUS.md).
- Diese Ergänzung umfasst Dokumentation. Die dort beschriebenen Anwendungsfehler sind weiterhin offen.

## 2026-11-25 — Import aus Netlify

- Erster Repository-Commit: [`678e440`](https://github.com/frnkrm/sonya6400/commit/678e440489266b9fb514d9688f4d0f66c5a5543e), „Initial commit via Netlify [skip ci]“.
- Enthalten: statische App, Service Worker, Manifest, fünf PNG-Dateien, Header und Suchmaschinen-Dateien.
- Aus dem Import lässt sich keine frühere Entwicklungshistorie ableiten. Die Cache-Kennung `a6400-v3` ist keine dokumentierte Release-Version des Repositories.
