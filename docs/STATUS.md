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

## Kameraanbindung

Die statische Website exportiert ein eigenes JSON-Profil. Die lokale USB-Anwendung nutzt gphoto2, prüft die am Gerät angebotenen Einstellungen und meldet den zurückgelesenen Wert für ISO, Blende und feste Zeit. Die Simulation ist ausdrücklich als solche gekennzeichnet. Die Hardwareabnahme H-01 bis H-10 ist offen, einschließlich Erhalt nach Trennen beziehungsweise Neustart und Übernahme in MR. Die frühere Softwareabnahme für Landschaft, Werkzeuge und PWA ist oben dokumentiert. [Plan 003](plans/003-kameraverbindung-und-presettransfer.md#ergebnisprotokoll) · [Anleitung am Gerät](plans/003-kameraverbindung-und-presettransfer.md#hardwareprotokoll)

Für den v5-Ausbau bestanden im gemeinsamen Lauf **45 von 45 Node-Tests und 28 von 28 Chromium-Tests**, jeweils ohne übersprungene Fälle. Beim abschließenden Nachtest der Übertragungsansicht bestanden alle drei Browserfälle, darunter ein zusätzlicher Fall für teilweise übernommene Werte. Damit umfasst die Suite 29 Browserfälle. Der Versionswechsel von v4 auf v5 mit Offline-Profilansicht ist abgedeckt. Beim kontrollierten Zugriff aus einer zweiten lokalen Origin war die Kamerasitzung für diese Seite gesperrt. Der JSON-Dateiweg blieb nutzbar. Der anschließend gestartete echte gphoto2-Adapter fand erwartungsgemäß keine angeschlossene Kamera.

## Veröffentlichung

Am 25. November 2026 bestätigte GitHub den Fast-Forward von `fb99192` auf den [Funktionscommit 3449a1f](https://github.com/frnkrm/sonya6400/commit/3449a1f2819b8b1b97279861746efd06050038bf). `git ls-remote origin refs/heads/main` bestätigte den Commit auf `main`.

Der zugehörige Netlify-Deploy und die ausgelieferte Fassung sind offen (C-08/OPS-01). Beim Zugriff auf `sonyalpha6400.frnkrm.com` und beim Abruf des Commitstatus über `api.github.com` antwortete der Cloud-Proxy auch nach dem Push mit HTTP 403. Für die Live-Abnahme im Netlify-Deploy den veröffentlichten Git-Commit prüfen, die Startseite mit der Marke `app-release=v5` laden und unter **Kameraverbindung & Profil** eine Empfehlung exportieren. [Produktionsseite](https://sonyalpha6400.frnkrm.com/)
