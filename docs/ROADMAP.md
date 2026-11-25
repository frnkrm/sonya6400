# Roadmap

Stand: **25.11.2026** · Priorisierungsvorschlag aus der [Bestandsaufnahme](STATUS.md).

Diese Reihenfolge hilft bei der nächsten Entwicklungsentscheidung. Funktionsänderungen sind noch nicht umgesetzt; Release-Termine und zusätzliche Produktwünsche sind nicht festgelegt.

## Bereits erledigt

- [x] Importierten Quellstand erfassen und vorhandene Funktionen dokumentieren.
- [x] Reguläre Berechnungen und konkrete Fehlerfälle isoliert prüfen.
- [x] Überblick, Entwicklungsanleitung und Regeln für weitere Aufträge anlegen.
- [x] Einen ersten umsetzbaren Plan und eine wiederverwendbare Planvorlage erstellen.

## 1. Stabilität der vorhandenen App

**Empfohlener nächster Schritt:** [Plan 001 — Stabilisierung](plans/001-stabilisierung.md).

| ID | Priorität | Vorhaben | Fertig, wenn … |
| --- | --- | --- | --- |
| F-01 | P1 | Auswahlwerte und Einstellungslinks validieren | Ungültige Werte sicher abgefangen werden; gültige Links und alle 864 Auswahlen weiter funktionieren |
| F-02 | P1 | Cache für die Offline-Startseite begrenzen | Dokumente und Fehlerantworten die gespeicherte App nicht überschreiben |
| F-03 | P2 | Manuelle Lichtwahl vor späten Wetterantworten schützen | Nur aktuelle, weiterhin gewünschte Messungen die Lichtwahl ändern |

P1 bedeutet hier: beim nächsten Stabilisierungsschritt zuerst bearbeiten. Die Einstufung ist eine Priorisierung der Funktionalität, keine Einstufung einer Sicherheitslücke.

## 2. Bedienung und Offline-Verlässlichkeit

| ID | Priorität | Vorhaben | Fertig, wenn … |
| --- | --- | --- | --- |
| F-05 | P2 | Tastaturfokus beim Neuzeichnen erhalten | Auswahl, Dialoge und Navigation ohne Fokusverlust bedienbar sind |
| F-06 | P2 | Cache-Installation und Aufräumen absichern | Fehlende Pflichtdateien erkannt werden und fremde Cache-Einträge erhalten bleiben |
| F-07 | P2 | Verständlicher Update-Ablauf | Ein offener Tab und die installierte App nachvollziehbar auf den neuen Stand wechseln |
| F-04 | P3 | Wettercodes korrekt beschriften | Dokumentierte Codes korrekt und unbekannte Codes neutral angezeigt werden |

## 3. Weiterentwicklung leichter machen

| ID | Vorhaben | Konkretes Ergebnis |
| --- | --- | --- |
| DEV-01 | Kleine reproduzierbare Regressionstests einführen | Ein dokumentierter Befehl prüft Berechnungsregeln und bereits behobene Fehlerfälle |
| CONTENT-01 | Kamera- und Objektivhinweise fachlich prüfen | Quellen je Aussage sowie klare, widerspruchsfreie Angaben in Kompass, Slots und Teilen-Karte |
| OPS-01 | Git-zu-Netlify-Veröffentlichung verifizieren | Produktionsbranch, Publish-Verzeichnis, Header und erster geprüfter Funktions-Deploy sind dokumentiert |
| DEV-02 | CSS, Daten und Logik bei Bedarf aufteilen | Verantwortlichkeiten sind getrennt; Verhalten, gespeicherte Daten, Links und Offline-Funktion bleiben kompatibel |

DEV-02 ist eine mögliche spätere Strukturverbesserung. Ein Framework-Wechsel ist für die aktuelle App nicht erforderlich und nicht beschlossen.

## Ideenparkplatz

Mögliche Erweiterungen, **noch nicht zur Umsetzung eingeplant**:

- Eigene Presets und Favoriten speichern.
- Bag und Checklisten als Sicherung exportieren und importieren.
- Weitere geprüfte Objektive ergänzen.
- Optional einen hellen Darstellungsmodus anbieten.

Vor Beginn Nutzen, Aufwand, gewünschtes Verhalten und Abnahmekriterien in einem eigenen Plan festhalten.

## Planübersicht

| Plan | Status | Zweck |
| --- | --- | --- |
| [001 — Stabilisierung](plans/001-stabilisierung.md) | Vorgeschlagen | F-01, F-02 und F-03 in kleinen, prüfbaren Schritten bearbeiten |
| [Vorlage](plans/TEMPLATE.md) | Vorlage | Ein neues Vorhaben strukturiert vorbereiten |

## So bleibt die Roadmap aktuell

1. Ein Vorhaben auswählen und einen Plan unter `docs/plans/NNN-kurztitel.md` anlegen.
2. In dieser Übersicht verlinken und den tatsächlichen Status pflegen.
3. Fertige Arbeit mit Commit und Prüfung im Plan sowie bei der Befund-ID dokumentieren.
4. Relevante Änderungen in [CHANGELOG](../CHANGELOG.md) und [Architektur](ARCHITECTURE.md) nachführen.
