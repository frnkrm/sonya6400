# Projektstand

Stand 26. November 2026. Der Ausbau setzt auf dem dokumentierten Stand [83b1d4b](https://github.com/frnkrm/sonya6400/commit/83b1d4b29d70f95ce4b56254d9b8dc89539fb7ce) auf. Die Anforderungen und Einzelnachweise stehen in [Plan 001](plans/001-stabilisierung.md) und [Plan 002](plans/002-landschaft-und-kamerafunktionen.md).

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

Die statische Website exportiert ein eigenes JSON-Profil. Die lokale USB-Anwendung nutzt gphoto2, prüft die am Gerät angebotenen Einstellungen und meldet den zurückgelesenen Wert für ISO, Blende und feste Zeit. Die Simulation ist ausdrücklich als solche gekennzeichnet. Für H-01 stimmten unter Windows feste ISO 400, feste ISO 500 und ISO Auto jeweils mit der ISO-Anzeige der α6400 überein. Für H-02 bestätigten Rücklesung und Display alle drei nativen Windows-Einzelschritte in M. Mit v10 wurde ISO 400 → 500 geprüft, mit v11 f/8 → f/9 und 1/125 s → 1/160 s. Für H-06 zeigte die α6400 im Modus M vor dem Abziehen des USB-Kabels, danach und nach dem Aus- und Einschalten jeweils ISO 500, f/9 und 1/160 s. Der optionale MR-Abruf (H-07) wurde übersprungen. Für H-08 wurde ein Profil von der Produktionsseite exportiert und unter Windows erfolgreich in den lokalen Kompass importiert. Nach manueller Einstellung stimmten die nativen Windows-Einzelabfragen für ISO Auto, f/3,5 und 1/125 s mit Profil und Kameradisplay überein. Die vollständige Profilübertragung über gphoto2, die übrigen Fähigkeiten aus H-01 sowie H-03 bis H-05 und H-09 bis H-10 sind offen. Die frühere Softwareabnahme für Landschaft, Werkzeuge und PWA ist oben dokumentiert. [Plan 003](plans/003-kameraverbindung-und-presettransfer.md#ergebnisprotokoll) · [Anleitung am Gerät](plans/003-kameraverbindung-und-presettransfer.md#hardwareprotokoll)

Für den v5-Ausbau bestanden im gemeinsamen Lauf **45 von 45 Node-Tests und 28 von 28 Chromium-Tests**, jeweils ohne übersprungene Fälle. Beim abschließenden Nachtest der Übertragungsansicht bestanden alle drei Browserfälle, darunter ein zusätzlicher Fall für teilweise übernommene Werte. Damit umfasst die Suite 29 Browserfälle. Der Versionswechsel von v4 auf v5 mit Offline-Profilansicht ist abgedeckt. Beim kontrollierten Zugriff aus einer zweiten lokalen Origin war die Kamerasitzung für diese Seite gesperrt. Der JSON-Dateiweg blieb nutzbar. Der anschließend gestartete echte gphoto2-Adapter fand erwartungsgemäß keine angeschlossene Kamera.

### Windows-USB-Prüfstand

**Am Gerät beobachtet.** Sony Imaging Edge Remote zeigte an der angeschlossenen α6400 **ISO 400**. Windows meldete für die WPD-Klasse den Dienst `WUDFWpdMtp` mit Status **OK**. In WSL erreichte die Erkennung `gphoto2 --auto-detect`. Der erste 16-Byte-USB-OUT-Transfer zum Öffnen der PTP-Sitzung (`OpenSession`) endete bei beiden getesteten Anschlussreihenfolgen mit Timeout. Auch eine frische Sitzung erreichte keine ISO-Abfrage. Das grenzt den beobachteten Ausfall auf den Sitzungsaufbau dieses Setups ein.

**Nativer Versuch am Gerät mit Stand `5b6454c`.** Trotz des CIM-Eintrags mit Status **OK** konnte der Helfer keinen WPD-Endpunkt der α6400 zuordnen. Der Versuch endete vor der ersten ISO-Abfrage. Mit `b10226a` lieferten die reguläre und die private WPD-Managerliste keinen Eintrag. PnPUtil führte beim Gerät die reguläre WPD-Schnittstellenklasse auf. Der Helfer ermittelt die aktiven Schnittstellen dieser Klasse zusätzlich direkt über Windows Plug & Play. Mit dem Stand `ca5aac4` öffnete der Helfer die Kamera, durchlief den Sony-Verbindungsaufbau und las die vollständige Eigenschaftsliste mit ISO-Feld `0xD21E`. Die damalige Auswertung lehnte dessen unbekannten Wert ab. Es wurde keine ISO-Zahl angezeigt und keine Einstellung geschrieben. [Nativer Lesetest](WINDOWS-USB.md) · [Hardwareprotokoll](plans/003-kameraverbindung-und-presettransfer.md#hardwareprotokoll)

**Hardwarelesung mit v8.** Die lokale Windows-App meldete über WPD für die physische ILCE-6400 **ISO 400**. Das Kameradisplay bestätigte den gelesenen Wert als **feste ISO 400**. Die Aktion war rein lesend.

**Windows-Schreibversuch mit v9 (H-02).** Nach dem einzelnen Klick von ISO 400 auf 500 zeigte die α6400 am Display ISO 500. Die drei unmittelbaren Abfragen des Kompass in der Schreibsitzung lieferten weiterhin ISO 400. Die separate Abfrage über „ISO über Windows lesen“ meldete anschließend für die ILCE-6400 ebenfalls ISO 500. Damit stimmen Display und nachträglich gelesener Wert überein. Beim anschließenden Gerätetest mit v10 meldete der Kompass direkt nach dem Schreibklick „ISO 500 bestätigt zurückgelesen“. Das Kameradisplay zeigte 500. [Ablauf für den Vergleich](WINDOWS-USB.md#optionaler-hardwaretest-von-iso-400-auf-500)

**Windows-Gerätetest mit v11 (H-02).** Nach dem Blendenschritt von f/8 auf f/9 las der Kompass automatisch f/9 zurück. Die α6400 zeigte ebenfalls f/9 am Display. Beim separaten Zeittest verkürzte der Kompass die Belichtungszeit von 1/125 s auf 1/160 s. Die automatische Rücklesung und das Display bestätigten beide 1/160 s. [Blendentest](WINDOWS-USB.md#zuerst-die-blende-testen) · [Zeittest](WINDOWS-USB.md#belichtungszeit-separat-testen)

**Softwareprüfung v11.** 62 Node-Tests und 16 Chromium-Tests (acht für die Übertragungsansicht, acht für die PWA einschließlich des Upgrades von v10) bestanden. Der x64-Windows-Helfer kompilierte mit C# 5 unter Mono. Dort bestanden 147 Prüfungen für Protokoll, Geräteauswahl und Einzelschritte sowie zehn Prüfungen der USB-Kennung. 27 Aufrufe des kompilierten Programmeinstiegs mit simuliertem WPD prüften unter anderem Gerätewechsel und verspätete Rückmeldung. Ein zusätzlicher Test über HTTP, den Node-Dienst und den kompilierten Helfer verwendete die generischen Sony-Datenbereiche für Blende und Zeit. Beide Versuche sendeten genau einen Schreibbefehl und bestätigten den Zielwert in einer neuen Lesesitzung.

**Softwareprüfung v10.** Der x64-Helfer kompilierte unter Mono. 81 ISO-/WPD-Prüfungen, zehn Prüfungen der USB-Kennung und 13 Node-Tests für Windows-Aufruf und lokalen Server bestanden. Am kompilierten Programmeinstieg mit simuliertem WPD wurden sofortige und verspätete Bestätigung, weiterhin gemeldete ISO 400 und ein Gerätewechsel geprüft. Jeder Versuch sendete genau einen Schreibbefehl. Sechs Chromium-Übertragungstests und sieben PWA-Tests bestanden. Der Wechsel von v9 auf v10 mit anschließendem Offline-Neustart wurde zusätzlich geprüft.

**Softwareprüfung v9.** Unter Linux bestanden 59 Node-Tests sowie sechs Chromium-Fälle zur Übertragung und sieben zur PWA, einschließlich des Updates von v8 auf v9. Der x64-Helfer kompilierte mit C# 5 unter Mono. Dort bestanden 74 ISO- und WPD-Prüfungen sowie zehn Prüfungen der USB-Gerätekennung. In einem zusätzlichen Test mit simulierten WPD-Antworten durchlief der Auftrag den lokalen HTTP-Dienst, den Node-Aufruf und den kompilierten C#-Helfer. Auf die Vorschau mit ISO 400 folgten genau ein Schreibaufruf und die bestätigte Rücklesung von ISO 500. Eine abweichende Gerätekennung sowie eine zweite Verwendung derselben Freigabe wurden abgewiesen.

Für die direkte Schnittstellensuche bestanden unter Linux/Mono acht zusätzliche Fälle, darunter leere Managerlisten, doppelte Einträge, abweichende Modelle und inaktive Registrierungen. Ein kontrollierter nativer Aufruf prüfte außerdem GUID, Suchflags, erneute Abfrage bei Gerätezuwachs und UTF-16-Pfadlisten. Der x64-Helfer kompilierte, und alle acht Node-Tests des Windows-Wrappers und des lokalen Dienstes bestanden.

**Softwareprüfung v8.** Unter Linux bestanden 55 Node-Tests, fünf Chromium-Fälle zur Übertragung und sechs zur PWA einschließlich Wechsel von v7 auf v8. Der Windows-Helfer kompilierte als x64-Programm unter Mono. Ein kontrolliertes Sony-Datenpaket durchlief den C#-Helfer und den Node-Leser mit ISO-Anteil 400 und einer unbekannten Moduskennung. Der genaue Rohwert der physischen Kamera im gemeldeten Versuch ist offen.

**Softwareprüfung v7.** Auf Linux bestanden 54 von 54 Node-Tests sowie jeweils 5 von 5 Chromium-Fällen für Übertragung und PWA, einschließlich des Clientwechsels von v6 auf v7. Der 64-Bit-Lesehelfer ließ sich mit C# 5 unter Mono kompilieren. 21 Sony-Protokollprüfungen mit konstruierten Daten bestanden. Der spätere Lauf mit `ca5aac4` bestätigte die Windows-Treibersitzung. Mit v8 wurde der Vergleich für feste ISO 400 bestätigt.

Für die frühere WSL-Erweiterung v6 bestanden unter Linux **50 von 50 Node-Tests** sowie im Chromium-Nachtest **4 von 4 Übertragungsfällen** und **4 von 4 PWA-Fällen**. Dazu gehörten kontrollierte WSL-Argumente, Fehler bei der WSL-Ausführung und eine ISO-Einzelaktion mit kontrolliertem gphoto2-Prozess. Eine Prüfung mit dem veröffentlichten ILCE-6400-Konfigurationsdump ergab Modus M, Istwert ISO 1250 und die angebotene Wahl ISO 100. Der [Windows-Workflow](../.github/workflows/windows-usb.yml) startet den Dienst über die CMD-Datei und öffnet eine Sitzung. Das Ergebnis auf dem Windows-Runner ist gesondert zu prüfen.

## Veröffentlichung

Am 25. November 2026 bestätigte GitHub den Fast-Forward von `fb99192` auf den [Funktionscommit 3449a1f](https://github.com/frnkrm/sonya6400/commit/3449a1f2819b8b1b97279861746efd06050038bf). `git ls-remote origin refs/heads/main` bestätigte den Commit auf `main`.

Der zugehörige Netlify-Deploy und die ausgelieferte Fassung sind offen (C-08/OPS-01). Beim Zugriff auf `sonyalpha6400.frnkrm.com` und beim Abruf des Commitstatus über `api.github.com` antwortete der Cloud-Proxy auch nach dem Push mit HTTP 403. Für die Live-Abnahme im Netlify-Deploy den veröffentlichten Git-Commit prüfen, die Startseite mit der Marke `app-release=v11` laden und unter **Kameraverbindung & Profil** eine Empfehlung exportieren. [Produktionsseite](https://sonyalpha6400.frnkrm.com/)
