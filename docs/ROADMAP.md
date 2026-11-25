# Roadmap

Stand 25. November 2026. Die Pläne ordnen jede Anforderung ihrer Abnahme zu. Ergebnisse der veröffentlichten und der lokal geprüften Version lassen sich über den [Projektstand](STATUS.md) unterscheiden.

| Paket | Umfang | Nachweise |
| --- | --- | --- |
| F-01, F-03, F-04, F-05 | Zustand, Einstellungslinks, Wetter und Tastatur | [Stabilisierung](plans/001-stabilisierung.md), [Befundtabelle](STATUS.md) |
| F-02, F-06, F-07 | Offline-Einstieg, Cache-Installation und Clientwechsel | [Stabilisierung](plans/001-stabilisierung.md), [Befundtabelle](STATUS.md) |
| K-01 bis K-09 | Landschaft, Wind, Stativ, Nah-Fern-Fokus, Wasser, Sonne, Schnee und Sterne | [Plan 002](plans/002-landschaft-und-kamerafunktionen.md) |
| K-10 bis K-16 | Objektivmodell, Brennweite, Blendenlimits, Stabilisierung, Bildausschnitt, Modus und Belichtung | [Plan 002](plans/002-landschaft-und-kamerafunktionen.md) |
| K-17 bis K-26 | Ausgabe, HDR, Verschluss, Filter, Intervall, Fokusserie, Diagnose, Checkliste und Begründung | [Plan 002](plans/002-landschaft-und-kamerafunktionen.md) |
| DEV-01 | Wiederholbare Tests der Regeln und Browserfunktionen | [Testanleitung](DEVELOPMENT.md) |
| CONTENT-01 | Abgleich der Kamera- und Objektivhinweise über alle Ausgaben | [Fachreferenz](research/sony-a6400-kamera-objektive.md), [Plan 002](plans/002-landschaft-und-kamerafunktionen.md) |
| DEV-02 | Regelberechnung und Fachwerkzeuge als eigenständige statische Dateien | [Architektur](ARCHITECTURE.md) |
| OPS-01 | Git-Stand, Netlify-Deploy, Produktionsdateien und Header prüfen | [Veröffentlichung](STATUS.md#veröffentlichung) |

## Kameraanbindung

| Kennungen | Umfang | Nachweis |
| --- | --- | --- |
| C-01, C-02 | Gerätezustand und versioniertes Profil für ISO, Blende und Zeitstrategie | [Plan 003](plans/003-kameraverbindung-und-presettransfer.md#ergebnisprotokoll) |
| C-03, C-04 | Lokale USB-Verbindung, Schreiben und Rücklesung je Feld | [Architektur](ARCHITECTURE.md#optionale-kameraanbindung) |
| C-05, C-06 | Simulationsansicht, manuelle Restschritte und Dateiübergabe zwischen statischer und lokaler Oberfläche | [Einrichtung](DEVELOPMENT.md#lokale-usb-anwendung) |
| C-07, C-08 | Softwaretests und Nachweise für Git und Produktion | [Projektstand](STATUS.md) |
| H-01 bis H-10 | Erkennung, tatsächliche Schreibbarkeit, Persistenz, MR und ergänzende Möglichkeiten an einer α6400 | [Offenes Hardwareprotokoll](plans/003-kameraverbindung-und-presettransfer.md#hardwareprotokoll) |

Als nächster Windows-Hardwareversuch steht die native ISO-Rücklesung und der Vergleich mit dem Display der α6400 an. Sony Imaging Edge Remote zeigte ISO 400 an. Für WSL ist am getesteten Setup der Timeout bei PTP OpenSession reproduziert. Profilübertragung und Persistenz bleiben eigenständige Hardwarefälle. [Windows-Lesetest](WINDOWS-USB.md)

## Ideenparkplatz

Mögliche Erweiterungen, **noch nicht zur Umsetzung eingeplant**:

- Eigene Presets und Favoriten speichern.
- Bag und Checklisten als Sicherung exportieren und importieren.
- Weitere geprüfte Objektive ergänzen.
- Optional einen hellen Darstellungsmodus anbieten.

Vor Beginn Nutzen, Aufwand, gewünschtes Verhalten und Abnahmekriterien in einem eigenen Plan festhalten.

Für ein neues Vorhaben gibt es eine [Planvorlage](plans/TEMPLATE.md).
