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

## Nächster Entwicklungsauftrag: Kameraanbindung

**Planungsstand: aufgenommen, Software und Kameraabnahme noch offen.** Die [Recherche](research/sony-a6400-verbindung-und-presettransfer.md) und [Plan 003](plans/003-kameraverbindung-und-presettransfer.md) beschreiben die Grundlage für einen Button „Einstellungen übertragen“. Der [Codex-Auftrag](CODEX-AUFTRAG.md) enthält Ablauf und Startprompt.

| Kennungen | Geplanter Umfang | Status |
| --- | --- | --- |
| C-01, C-02 | Tatsächliche Kamerafähigkeiten und ein eindeutiges Übertragungsprofil | Geplant |
| C-03, C-04 | Ausführbarer lokaler USB-Adapter; Werte schreiben und zurücklesen | Geplant |
| C-05, C-06 | Kompakte Verbindungsansicht, manuelle Restschritte und Profilimport | Geplant |
| C-07, C-08 | Gezielte Tests, Einrichtung, Dokumentation und Veröffentlichung | Geplant |
| H-01 bis H-10 | Tatsächliche Kamera-, Persistenz-, MR- und ergänzende Prüfungen aus der Recherche | Offen; keine Hardwaretests erfolgt |

Zuerst ISO, Blende und Belichtungszeit über USB umsetzen. Weitergehende WLAN-, Android- und SD-Wege gezielt nachprüfen, sobald ein konkreter Bedarf besteht. Die direkte Übergabe von Website-Profilen an Imaging Edge und die dauerhafte Speicherung in MR sind nicht bestätigt. Die bereits abgenommenen Pläne 001/002 bleiben Grundlage; nur nachgewiesene Restarbeiten erneut bearbeiten. OPS-01 bleibt bis zur dokumentierten Produktionsprüfung offen.

## Ideenparkplatz

Mögliche Erweiterungen, **noch nicht zur Umsetzung eingeplant**:

- Eigene Presets und Favoriten speichern.
- Bag und Checklisten als Sicherung exportieren und importieren.
- Weitere geprüfte Objektive ergänzen.
- Optional einen hellen Darstellungsmodus anbieten.

Vor Beginn Nutzen, Aufwand, gewünschtes Verhalten und Abnahmekriterien in einem eigenen Plan festhalten.

Für ein neues Vorhaben gibt es eine [Planvorlage](plans/TEMPLATE.md).
