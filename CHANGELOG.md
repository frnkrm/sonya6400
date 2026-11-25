# Änderungsprotokoll

Hier stehen nachvollziehbare Änderungen am Projekt. Neue Einträge kommen nach oben; zukünftige Vorhaben stehen in der [Roadmap](docs/ROADMAP.md).

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
