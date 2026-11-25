# Projektstand

Stand 25. November 2026. Der Ausbau setzt auf dem dokumentierten Stand [83b1d4b](https://github.com/frnkrm/sonya6400/commit/83b1d4b29d70f95ce4b56254d9b8dc89539fb7ce) auf. Die Anforderungen und Einzelnachweise stehen in [Plan 001](plans/001-stabilisierung.md) und [Plan 002](plans/002-landschaft-und-kamerafunktionen.md).

## Technische Befunde

| ID | Fehler im Ausgangsstand | Korrektur und zugehöriger Prüfpfad |
| --- | --- | --- |
| F-01 | Ungültige Werte im Speicher oder Einstellungslink konnten den Start abbrechen. | Kernfelder und Zusatzwerte validieren, gültige Teilwerte erhalten. Tests mit beschädigtem JSON, leerem Bag, ungültiger Bereichs-ID sowie alten und erweiterten Links. |
| F-02 | Fremde Dokumente und HTTP-Fehler konnten die Startseite im Offline-Cache ersetzen. | Nur App-Einstiege mit passender HTML-Fassung aktualisieren den Eintrag. Navigation über ein anderes Dokument und eine Fehlerseite vor dem Offline-Start prüfen. |
| F-03 | Eine verspätete Wetterantwort überschreibt die manuelle Lichtwahl. | Anfragegeneration und Abbruchsignal verwenden. Manuelle Wahl, Schnellstart, neue Messung, Timeout und fehlerhafte Daten prüfen. |
| F-04 | Schneeschauer erschienen als Gewitter. | Open-Meteo-Codes 85/86 als Schneeschauer, 95/96/99 als Gewitter, unbekannte Codes neutral ausgeben. |
| F-05 | Nach einer Auswahl verlor der Knopf den Tastaturfokus. | Bei unveränderten Optionen dieselben DOM-Elemente weiterverwenden. Mit Enter und Leertaste sowie Fokuswechsel prüfen. |
| F-06 | Unvollständige Installationen und Löschung fremder Caches waren möglich. | Pflichtdateien und Typen vor Aktivierung prüfen. Eigene alte Caches gezielt erkennen. Installation mit einer fehlenden Datei und einem fremden Cache prüfen. |
| F-07 | Alter HTML-Code meldete bei Controllerwechsel bereits die neue Version. | Nach dem Wechsel bringt eine Navigation den geöffneten App-Einstieg auf den installierten Stand. Test vergleicht die tatsächlich geladene Fassung. |

## Ausgeführte Prüfungen

Alle 16 Regel- und 25 Chromium-Tests bestanden am 25. November 2026. [Funktionscommit 57b8df8](https://github.com/frnkrm/sonya6400/commit/57b8df83418377e44b2fc625dd3f8fdcd75ee7b5)

Die elf Kameraregeltests prüfen unter anderem 864 ältere Auswahlkombinationen an beiden Brennweiten-Enden. Fünf Rechentests betreffen Reihen/HDR, BULB, ND, Intervall und Schärfentiefe. Die Browserfälle nutzen lokale, kontrollierte Wetter- und HTTP-Antworten. Auf der Desktop-PWA lief der Updateversuch vom importierten v3-Stand aus.

| Browserprüfung | Ergebnis |
| --- | --- |
| Zustand, Tastatur und Wetter | 13 bestanden. Einzelheiten im [Stabilisierungsplan](plans/001-stabilisierung.md) |
| Landschaft, Objektiv, Checkliste | 4 bestanden |
| Foto-Werkzeuge und Diagnose | 4 bestanden |
| Offline-Start und Update einer installierten PWA | 2 bestanden |
| Integrierte Slots, Mobilansicht und Offline-PNG | 2 bestanden |

## Qualität und Grenzen

- Die [Entwicklungsanleitung](DEVELOPMENT.md) enthält die Befehle für unabhängige Testläufe. Die Ergebnisprotokolle der Pläne nennen die beobachteten Resultate.
- Herstellerquellen belegen Gerätefunktionen und Objektivgrenzen. Vorschläge für Wind, Handhaltung, Sternspuren und Schärfentiefe bleiben Startwerte für Probebilder. Praktische Aufnahmen mit Kamera und Objektiven stehen aus.
- Native Mobilgeräte, VoiceOver/TalkBack, System-Teilen und die Installation auf einem realen Handy erfordern gesonderte Prüfungen. Die Browserprüfungen der Landschaftsansicht und Werkzeuge liefen mit 320 beziehungsweise 360 Pixeln Ansichtsbreite.
- Die drei internen Kameraspeicher und die zusätzlichen Kartenplätze entsprechen der [Sony-Hilfe](https://helpguide.sony.net/ilc/1810/v1/de/contents/TP0002242297.html).
- Die Projektlizenz ist offen.

## Geplante Kameraanbindung

Die [Verbindungsrecherche](research/sony-a6400-verbindung-und-presettransfer.md) vom 25. November 2026 dokumentiert Sony-Fernsteuerung, NFC, USB, Community-Anwendungen sowie Grenzen vollständiger Profile und von Firmware-Erweiterungen. Quellenbelege und Anbieterangaben ersetzen keine eigene Kameraabnahme.

- **Vorhandene App:** Empfehlungen und Aufnahmehilfen; keine echte Kameraverbindung oder Übertragung.
- **Plan 003 / C-01 bis C-08:** Zur Entwicklung aufgenommen; Software noch nicht implementiert. Einstieg sind ISO, Blende und Zeit über einen lokalen USB-Adapter mit Rücklesung.
- **Hardware H-01 bis H-10:** Offen. Keine Kamera verbunden; Persistenz nach Trennen/Neustart und MR-Übernahme nicht bestätigt.
- **Codex-Unterlagen:** [Plan 003](plans/003-kameraverbindung-und-presettransfer.md), [Architekturergänzung](ARCHITECTURE.md#geplante-optionale-kameraanbindung) und [autonomer Arbeitsauftrag](CODEX-AUFTRAG.md) vorhanden.
- **Diese Ergänzung:** Dokumentation; die oben genannten Ergebnisse des bestehenden Funktionsstands bleiben erhalten. Es wurden dadurch keine neuen App-, Kamera- oder Produktionsprüfungen durchgeführt.

## Veröffentlichung

Am 25. November 2026 nahm GitHub den Push des geprüften Funktionsstands und seiner Dokumentation an. Ein anschließendes `git ls-remote origin refs/heads/main` bestätigte den [Stand cb45331](https://github.com/frnkrm/sonya6400/commit/cb4533190ffdf0eebfc95df0d23d61bd47c3e39d) auf `main`. Die Produktionsprüfung für OPS-01 ist offen. Beim Abruf der Produktionsdomain antwortete der Cloud-Proxy mit HTTP 403 auf CONNECT. Auch der Netlify-Status am GitHub-Commit war über die API aus dieser Umgebung gesperrt. Eine erfolgreiche Veröffentlichung auf Netlify muss anhand des zugehörigen Deploys und der Live-Fassung bestätigt werden. [Produktionsseite](https://sonyalpha6400.frnkrm.com/)
