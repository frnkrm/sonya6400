# Änderungsprotokoll

Hier stehen nachvollziehbare Änderungen am Projekt. Neue Einträge kommen nach oben; zukünftige Vorhaben stehen in der [Roadmap](docs/ROADMAP.md).

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
