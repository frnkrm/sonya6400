# Roadmap

Stand: **25.11.2026** · Grundlagen: [Bestandsaufnahme](STATUS.md) und [Kamera-/Objektivrecherche](research/sony-a6400-kamera-objektive.md).

Alle 26 recherchierten Kamera- und Landschaftspunkte sind in die Entwicklungsplanung aufgenommen. Ihre Implementierung ist offen. Die folgende Reihenfolge ist eine Empfehlung; Release-Termine und Aufwandsschätzungen sind nicht festgelegt.

## Bereits erledigt

- [x] Importierten Quellstand erfassen und vorhandene Funktionen dokumentieren.
- [x] Reguläre Berechnungen und konkrete Fehlerfälle isoliert prüfen.
- [x] Überblick, Entwicklungsanleitung und Regeln für weitere Aufträge anlegen.
- [x] Einen ersten umsetzbaren Plan und eine wiederverwendbare Planvorlage erstellen.
- [x] Kamera-, Objektiv- und Landschaftsgrundlagen mit Herstellerquellen dokumentieren.
- [x] Alle 26 Funktionspunkte in [Plan 002](plans/002-landschaft-und-kamerafunktionen.md) mit Anforderungen und Abnahmekriterien aufnehmen.

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
| CONTENT-01 | Kamera- und Objektivhinweise fachlich prüfen und korrigieren | Recherchegrundlage ist dokumentiert; Abgleich und Korrekturen in Kompass, Slots und Teilen-Karte bleiben offen und sind in Plan 002 eingeordnet |
| OPS-01 | Git-zu-Netlify-Veröffentlichung verifizieren | Produktionsbranch, Publish-Verzeichnis, Header und erster geprüfter Funktions-Deploy sind dokumentiert |
| DEV-02 | CSS, Daten und Logik bei Bedarf aufteilen | Verantwortlichkeiten sind getrennt; Verhalten, gespeicherte Daten, Links und Offline-Funktion bleiben kompatibel |

DEV-02 ist eine mögliche spätere Strukturverbesserung. Ein Framework-Wechsel ist für die aktuelle App nicht erforderlich und nicht beschlossen.

## 4. Landschaft und Kamerafunktionen

**Aufgenommen:** alle 26 Punkte der [Recherche](research/sony-a6400-kamera-objektive.md). Die Kennungen `K-01` bis `K-26` entsprechen den ursprünglichen Nummern 1 bis 26. Anforderungen, Abnahme und Abhängigkeiten stehen gemeinsam in [Plan 002 — Landschaft und Kamerafunktionen](plans/002-landschaft-und-kamerafunktionen.md).

„Geplant“ bedeutet hier: zur Entwicklung aufgenommen, noch nicht implementiert oder abgenommen. Die technischen Befunde F-01 bis F-07 behalten ihren bisherigen Status.

### Landschaft und Aufnahmesituation

| ID | Vorhaben | Ziel | Status |
| --- | --- | --- | --- |
| K-01 | Eigener Landschaftsmodus | Ganze Landschaften mit Bergen, Wald, See und weiten Ansichten passend behandeln | Geplant |
| K-02 | Hand oder Stativ | Aufnahmeart für Zeit, Auslösung und Stabilisierung berücksichtigen | Geplant |
| K-03 | Wind und Bewegung | Zeitstrategie an bewegte Blätter, Gras und andere Bildteile anpassen | Geplant |
| K-04 | Naher Vordergrund und Ferne | Fokus und Schärfentiefe für die gewünschten Entfernungen erklären | Geplant |
| K-05 | Fokushelfer | AF-S, DMF, MF, Fokuslupe und Peaking passend anleiten | Geplant |
| K-06 | Wasser gestalten | Weiches Wasser oder eingefrorene Bewegung gezielt ermöglichen | Geplant |
| K-07 | Sonnenaufgang und Sonnenuntergang | Gegenlicht und große Helligkeitsunterschiede berücksichtigen | Geplant |
| K-08 | Schnee und Nebel | Belichtung, Fokus und Farbstimmung heller, kontrastarmer Szenen erklären | Geplant |
| K-09 | Sternenhimmel | Objektivwahl, Stativ, manuellen Fokus und Testbelichtung verbinden | Geplant |

### Objektive und Zusammenspiel

| ID | Vorhaben | Ziel | Status |
| --- | --- | --- | --- |
| K-10 | Genaue Objektivprofile und eigene Tasche | Modellvarianten, bestätigte Daten und vorhandene Ausrüstung unterscheiden | Geplant |
| K-11 | Aktuelle Brennweite | Empfehlungen an die tatsächliche manuell angegebene Zoomposition anpassen | Geplant |
| K-12 | Verfügbare Blenden prüfen | Objektiv- und brennweitenabhängige Grenzen einhalten | Geplant |
| K-13 | OSS und VC passend einsetzen | Vorhandene Stabilisierung und ihre Grenzen korrekt berücksichtigen | Geplant |
| K-14 | Objektiv und Bildausschnitt wählen | Geeignete Weitwinkel-, Normal- und Teleoptionen aus der eigenen Tasche erklären | Geplant |

### Bedienung und zusätzliche Hilfen

| ID | Vorhaben | Ziel | Status |
| --- | --- | --- | --- |
| K-15 | Modus und Auto ISO | A, S, M, Min. SS und ISO-Grenzen verständlich zusammenführen | Geplant |
| K-16 | Belichtung kontrollieren | Histogramm, Zebra und Lichter-Messung mit ihren Grenzen erklären | Geplant |
| K-17 | Belichtungsreihen und HDR | RAW-Reihe, kamerainternes HDR und bewegte Szenen unterscheiden | Geplant |
| K-18 | RAW, JPEG und Bildwirkung | Dateiformat, Weißabgleich und Kreativmodus am Bearbeitungsziel ausrichten | Geplant |
| K-19 | Verschlussart wählen | Lautlose Aufnahme und elektronischen ersten Verschlussvorhang situationsgerecht erklären | Geplant |
| K-20 | Langzeitbelichtung und BULB | Ablauf, Auslösung und Rauschminderungs-Wartezeit berücksichtigen | Geplant |
| K-21 | Filterhilfe mit ND-Rechner | Belichtungszeit, ND-Stärke, Polfilterwirkung und Filtergewinde zusammenbringen | Geplant |
| K-22 | Intervall und Zeitraffer | Aufnahmeabstand, Bildzahl und Dauer nachvollziehbar planen | Geplant |
| K-23 | Schärfentiefe und manuelle Fokusserie | Schwierige Nah-Fern-Szenen mit sichtbaren Annahmen unterstützen | Geplant |
| K-24 | Fehlerdiagnose nach dem Foto | Bildprobleme in überprüfbare nächste Schritte übersetzen | Geplant |
| K-25 | Kurze Aufnahmecheckliste | Horizont, Bildränder, Fokus, Belichtung und Aufnahmeart kontrollieren | Geplant |
| K-26 | Warum dieser Wert? | Empfehlungen begründen, Quellen zeigen und Zielkonflikte erklären | Geplant |

### Empfohlene Reihenfolge

1. **Stabilität berücksichtigen:** Plan 001 vor Eingriffen in Zustand, Offline-Verhalten und Wetterübernahme; F-01 bis F-03 bleiben bis zum nachgewiesenen Fix offen.
2. **Gemeinsame Grundlagen:** K-10 bis K-13, K-15 und K-26.
3. **Landschaft zuerst nutzbar machen:** K-01 bis K-05, K-14, K-16 und K-25.
4. **Weitere Situationen und Kamerafunktionen:** K-06 bis K-09, K-17 bis K-20.
5. **Zusätzliche Werkzeuge:** K-21 bis K-24.

Die Reihenfolge bündelt gemeinsame Regeln. Sie begrenzt den aufgenommenen Umfang nicht; alle 26 Punkte bleiben eingeplant.

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
| [002 — Landschaft und Kamerafunktionen](plans/002-landschaft-und-kamerafunktionen.md) | Geplant; Implementierung offen | Alle 26 recherchierten Punkte K-01 bis K-26 mit Anforderungen und Abnahmekriterien umsetzen |
| [Vorlage](plans/TEMPLATE.md) | Vorlage | Ein neues Vorhaben strukturiert vorbereiten |

## So bleibt die Roadmap aktuell

1. Ein Vorhaben auswählen und einen Plan unter `docs/plans/NNN-kurztitel.md` anlegen.
2. In dieser Übersicht verlinken und den tatsächlichen Status pflegen.
3. Fertige Arbeit mit Commit und Prüfung im Plan sowie bei der Befund-ID dokumentieren.
4. Relevante Änderungen in [CHANGELOG](../CHANGELOG.md) und [Architektur](ARCHITECTURE.md) nachführen.
