# Plan 003 — Kameraverbindung und Presetübertragung

## Eckdaten

- **Status:** C-01 bis C-07 lokal softwareseitig geprüft. H-01 bis H-10 offen. Git- und Produktionsnachweis unter [Veröffentlichung](../STATUS.md#veröffentlichung).
- **Erstellt / aktualisiert:** 2026-11-25 / 2026-11-25.
- **Basis:** [`1aa7cd7`](https://github.com/frnkrm/sonya6400/commit/1aa7cd744d18c9460127836e7d678ce6670a92ee). Die Umsetzung baut auf dem [Planungscommit fb99192](https://github.com/frnkrm/sonya6400/commit/fb99192936c61e61a431abe0e83a46b57e19f219) auf.
- **Kennungen:** `C-01` bis `C-08`; die bestehenden Kennungen `F-01` bis `F-07` und `K-01` bis `K-26` bleiben erhalten.
- **Grundlage:** [Verbindungsrecherche](../research/sony-a6400-verbindung-und-presettransfer.md), [Projektstand](../STATUS.md), [Architektur](../ARCHITECTURE.md).
- **Ausführung:** [Codex-Auftrag](../CODEX-AUFTRAG.md). Die Ergebnisse stehen am Ende dieses Plans.

## Ziel und Ausgangslage

Vor diesem Ausbau berechnete die Website Empfehlungen für Landschaft und andere Motive. Das Einstellen an der Kamera erfolgte von Hand. Die frühere Softwareabnahme der Pläne 001 und 002 ist in deren Ergebnisprotokollen dokumentiert.

Ziel ist ein verständlicher Ablauf: Empfehlung wählen, Kamera verbinden, tatsächlich unterstützte Werte sehen, per bewusstem Klick übertragen und die zurückgelesenen Kamerawerte anzeigen. Nicht übertragbare Teile bleiben kurze manuelle Schritte. Der erste Übertragungsumfang sind **ISO, Blende und Belichtungszeit**, soweit Kameramodus und Objektiv sie erlauben.

**Fertigkeitsstufen getrennt führen:** Software implementiert und mit Simulation geprüft; mit echter α6400 geprüft; auf der Produktionsseite geprüft. Keine dieser Stufen beweist automatisch die anderen.

## Umfang und Entscheidungen

### Erster Entwicklungsweg

1. Eine transportunabhängige Übertragungslogik mit einem klar gekennzeichneten Simulationsadapter erstellen.
2. Einen echten lokalen **USB-Adapter auf Basis von gphoto2/libgphoto2** anbinden. Die Recherche belegt Unterstützung der ILCE-6400. Eine schlanke lokale Anwendung ist für den ersten Versuch ausreichend; keine zusätzliche Cloud-Infrastruktur ist erforderlich.
3. Die lokale Anwendung kann ein Website-eigenes JSON-Profil importieren. Damit existiert ein vollständiger Weg vom Website-Export zur lokalen Übertragung, auch wenn der direkte Zugriff der HTTPS-Website auf den lokalen Dienst im Zielbrowser scheitert.
4. Direkte Browserkommunikation erst anbieten, wenn der tatsächliche Verbindungsweg geprüft ist. Browserregeln für HTTPS, lokale Netzwerke, CORS und gegebenenfalls WebUSB gezielt prüfen; keine pauschale Browserunterstützung behaupten und keine Schutzfunktionen abschalten lassen.

Die Referenzplattform anhand der vorhandenen Entwicklungsumgebung wählen und dokumentieren; keine ungetestete Unterstützung für Windows, macOS, Linux oder Mobilgeräte zusagen. SimpleAlphaDroid ist eine mögliche spätere Android-Alternative. Für den ersten Durchlauf nicht gleichzeitig mehrere native Apps und Funkprotokolle bauen. Fremden Code und seine Lizenzbedingungen vor einer Übernahme prüfen; keine Projektlizenz eigenmächtig festlegen.

### Getrennte Folgewege

- **WLAN:** IEM und Drittanbieter-Apps belegen Fernsteuerung. Eine direkte Website-Schnittstelle bleibt zu prüfen; keine erfundenen Endpunkte oder App-Links verwenden.
- **NFC:** Verbindungshilfe für WLAN, kein eigener Importtransport.
- **SD/MR:** Echte α6400-Aufnahmeprofile können laut Sony auf demselben Modell geladen werden. Website-Dateigenerator und fernsteuerbare MR-Registrierung sind nicht bestätigt.
- **Firmware:** Für den USB-Weg nicht erforderlich. Service-Modus, Treiberersetzung, Firmware-Flashen und Modding sind keine Schritte dieses Implementierungsauftrags.

Die Belege und offenen Fragen stehen in der [Fachreferenz](../research/sony-a6400-verbindung-und-presettransfer.md). Herstellerangaben, Projektangaben und eigene Testergebnisse getrennt führen.

## Anforderungen und Abnahme

### C-01 · Verbindung und tatsächliche Fähigkeiten

- [x] Kamera erkennen, Modell, Modus und lesbare Einstellungen erfassen; Schreibbarkeit und verfügbare Werte pro Parameter ermitteln.
- [x] Mehrere Geräte, eine andere Kamera, fehlende Verbindung, belegte USB-Schnittstelle und nicht unterstützte Werte verständlich behandeln.
- [x] Veraltete Werte nach Verbindungsabbruch als veraltet kennzeichnen. Kein Simulationsgerät als echte Kamera anzeigen.
- **Abnahme:** Ohne Gerät bleibt die Empfehlung vollständig nutzbar. Ein simulierter oder tatsächlicher Anschluss zeigt Herkunft und verfügbare Parameter. Ein fester Wert ist nur auswählbar, wenn der Adapter ihn im aktuellen Modus erlaubt.

### C-02 · Eindeutiges Übertragungsprofil

- [x] Ein kleines versioniertes Datenformat für Aufnahmeabsicht und konkrete Zielwerte definieren; Zahlen, Einheiten, erlaubte Felder und Schema-Version validieren.
- [x] Die bestehende gemeinsame Empfehlung in `camera.js` verwenden. Falls zusätzliche strukturierte Felder nötig sind, sie dort ergänzen; keine zweite unabhängige Fotografie-Regellogik aufbauen und keine Befehle aus übersetzten Anzeigetexten erraten.
- [x] Festen ISO-Wert, Auto ISO und ISO-Grenzen unterscheiden. Fest vorgegebene Belichtungszeit, gewünschte Zeitgrenze und ISO AUTO Min. SS unterscheiden.
- [x] In Modus A keine feste Verschlusszeit aus einer Empfehlung wie „1/125 s oder kürzer“ ableiten. Einen am Moduswahlrad erforderlichen Schritt anzeigen, ohne den Belichtungsmodus stillschweigend umzudeuten.
- [x] Tatsächlich gemeldete Objektiv-/Blendenmöglichkeiten und bekannte Herstellergrenzen berücksichtigen. Die manuelle Brennweitenauswahl der Website ist kein Messwert der Kamera.
- **Abnahme:** Ein Landschaftsprofil mit A, f/8 und Auto ISO bleibt semantisch erhalten; fehlende Auto-ISO-Grenzen werden als manuelle Schritte ausgewiesen. Ein M-Profil mit festen Werten enthält eindeutige Zahlen. Ungültige, unbekannte oder veraltete Profilformate werden verständlich abgelehnt.

### C-03 · Lokale USB-Verbindung

- [x] Einen kleinen Adapter für Erkennung, Lesen, verfügbare Werte und Schreiben implementieren. Vorhandene gphoto2-Fähigkeiten verwenden, Kamera-Konfigurationspfade am Gerät ermitteln und keine allgemeine Beispieltabelle als bestätigte α6400-Fähigkeit übernehmen.
- [x] Fehlende lokale Abhängigkeiten und Kameraeinstellungen mit einer kurzen Einrichtungshilfe behandeln. Keine automatische Treiberersetzung oder Service-Modus-Aktion ausführen.
- [x] Falls ein lokaler HTTP-Dienst verwendet wird: standardmäßig nur Loopback, explizit erlaubte Origins und eine lokal gebundene Sitzung verwenden. Keine anonymen Schreibzugriffe aus beliebigen Websites, keine Tokens in geteilten Links oder Logs und keine frei ausführbaren Shell-Befehle aus Profilwerten.
- [x] Den vorgesehenen USB-Weg und den Profilimport dokumentieren. Der bereits vorhandene statische Netlify-Betrieb bleibt nutzbar; eine Netlify Function kann nicht auf den USB-Port des Nutzergeräts zugreifen.
- **Abnahme:** Der echte Adapter ist implementiert, seine Ein-/Ausgaben und Fehlerfälle werden mit kontrollierten Antworten geprüft. Eine fehlende Kamera verhindert die Hardwareabnahme, nicht den Abschluss des ausführbaren Softwarepakets. Eine ausschließlich simulierte Verbindung reicht nicht als Implementierung dieses Punkts.

### C-04 · Schreiben und Rücklesen

- [x] Änderungen explizit starten, nacheinander durchführen und pro Feld den tatsächlich zurückgelesenen Wert vergleichen. Modusabhängige Schritte und gegebenenfalls schrittweise Wertänderungen berücksichtigen.
- [x] Eine begrenzte Anzahl von Versuchen und feste Zeitlimits vorsehen. Verbindungsabbruch, Ablehnung, abweichender Istwert und Teilerfolg erhalten unterschiedliche Ergebnisse.
- [x] Wiederholte Klicks während einer Übertragung abfangen. Nach Fehlern nicht unbegrenzt erneut schreiben und keine erfolgreiche Wiederherstellung alter Werte behaupten, wenn sie nicht zurückgelesen wurde.
- **Abnahme:** Bei einer absichtlich abgewiesenen Blende werden zuvor erfolgreich gesetzte Werte korrekt ausgewiesen. Bei ausbleibender Rücklesung erscheint keine pauschale Erfolgsmeldung. Automatisch übertragene Werte werden nicht mit dauerhaft registrierten MR-Profilen gleichgesetzt.

### C-05 · Verständliche Bedienung

- [x] Eine kompakte optionale Verbindungsansicht mit Istwerten, Zielwerten, manuellen Restschritten und „Einstellungen übertragen“ ergänzen.
- [x] Das bloße Öffnen eines Links, Wechseln eines Motivs oder Wiederverbinden überträgt nichts. Die bewusste Übertragen-Aktion genügt; keine unnötige Kette von Bestätigungsdialogen einführen.
- [x] „Simulation“, „nicht verbunden“, „teilweise übernommen“, „bestätigt übernommen“ und „Hardwareprüfung offen“ passend unterscheiden.
- [x] Die bestehenden manuellen Empfehlungen, PNG-Karten, Links, gespeicherten Daten und Offline-Funktionen erhalten. Istwerte der Kamera nicht ungefragt in die gewünschte Empfehlung zurückschreiben.
- **Abnahme:** Eine Landschaftsempfehlung lässt sich mit Tastatur und in schmaler Ansicht verwenden. Ohne Kamera bleibt die App bedienbar. Simulation ist erkennbar und wird nicht als Aufnahmeprüfung beworben.

### C-06 · Nutzbarer Rückfallweg und Verbindungshilfe

- [x] Export/Import des eigenen Profils und die manuelle Bedienfolge als Rückfallweg anbieten. Eindeutig benennen, dass die JSON-Datei für unsere lokale Anwendung bestimmt ist und kein Sony-Importformat darstellt.
- [x] Die Einrichtung für IEM/WLAN, NFC und USB anhand der Recherche knapp erklären. Ein Link zu einer Drittanbieter-App ist keine automatische Profilübergabe.
- [x] Falls die HTTPS-Website den lokalen Dienst im getesteten Browser nicht direkt erreicht, den Importweg fertigstellen und die Einschränkung sichtbar dokumentieren. Eine ausschließlich auf localhost geprüfte Oberfläche nicht als fertige Netlify-Anbindung ausgeben.
- **Abnahme:** Das exportierte Profil kommt unverfälscht im lokalen Adapter an, wird validiert und bleibt vor dem Übertragen überprüfbar. Unbekannte Felder oder nicht unterstützte Werte erzeugen klare Meldungen.

### C-07 · Software- und Hardwareprüfungen

- [x] Gezielte Tests für die Profilsemantik, Modus-/Objektivgrenzen, Verbindungsfehler, Teilübertragung, Rücklesung und die berührten Browserabläufe ergänzen.
- [x] Den echten Adapter anhand kontrollierter Prozess-/Transportantworten prüfen; Simulation und echte Hardwaretests getrennt protokollieren. Keine Tests schreiben, die nur den eigenen Quelltext nach erwarteten Zeichenketten durchsuchen.
- [x] Die Hardwareprüfungen H-01 bis H-10 aus der Fachreferenz in einem Ergebnisprotokoll führen. Besonders H-01 bis H-08 sind für die tatsächliche Grundübertragung und Aussagen zur Persistenz relevant.
- [x] Wenn keine Kamera angeschlossen werden kann, alle unabhängig ausführbaren Softwarearbeiten abschließen und eine kurze reproduzierbare Testanleitung für das Gerät hinterlassen. Fehlende Hardware weder simulativ als bestanden ausgeben noch als Grund nutzen, bei einer bloßen Konzeptskizze aufzuhören.
- **Abnahme:** Die vorhandenen betroffenen Regressionstests und die neuen Softwarefälle bestehen. Kamera-Modell, Firmware, Objektiv, Modus, Plattform und Version werden bei echten Tests notiert; nicht ausgeführte H-Prüfungen bleiben offen.

### C-08 · Dokumentation und Veröffentlichung

- [x] Einrichtung, unterstützte Plattform, Architekturentscheidung, konkrete Befehle und bekannte Grenzen dokumentieren.
- [x] Projektstand, Roadmap, Planstatus und Changelog auf die tatsächlich erreichte Stufe aktualisieren. Bereits erledigte K-/F-Punkte nur bei einem nachgewiesenen neuen Befund wieder öffnen.
- [x] Änderungen in zusammenhängenden Commits auf den gewünschten aktuellen `main`-Stand bringen; fremde Änderungen erhalten und keinen Force-Push verwenden.
- [x] Bei Änderungen gecachter Dateien `sw.js` und `app-release` zusammen aktualisieren. Funktions-Commits normal veröffentlichen; bei reiner Dokumentation ist `[skip ci]` möglich.
- [x] GitHub-Stand nach dem Push durch Remote-Abfrage bestätigt. [Funktionscommit 3449a1f](https://github.com/frnkrm/sonya6400/commit/3449a1f2819b8b1b97279861746efd06050038bf)
- [ ] Netlify-Deploy und ausgelieferte Fassung auf der Produktionsdomain bestätigen. Der Cloud-Proxy meldete HTTP 403. [Veröffentlichungsprotokoll](../STATUS.md#veröffentlichung)
- **Abnahme:** Commit und Remote-Stand sind nachgewiesen. Software-, Hardware- und Produktionsprüfung sind jeweils separat berichtet; offene externe Prüfungen haben einen konkreten nächsten Schritt.

## Arbeitsliste und Prüfnachweise

| Umfang | Abhängigkeit | Softwareabnahme |
| --- | --- | --- |
| C-01, C-02 | Gemeinsame Empfehlung und aktuelle Geräteeigenschaften | Modell, Modus, A mit Auto ISO und Zeitgrenze, M mit festen Werten, ungültige Profile |
| C-03, C-04 | Erkanntes Gerät und passende Parameter | Reale gphoto2-Befehlsfolge mit kontrollierten Antworten, begrenztes Schreiben, Rücklesung und Teilergebnis |
| C-05, C-06 | Profil, Plan und gültige lokale Sitzung | Erkennbarer Simulationsmodus, expliziter Klick, Export auf der statischen Seite und Import in die lokale Anwendung |
| C-07 | Integrierter Funktionsstand | Regel-, Adapter- und Browserabläufe, manuelle Restschritte und H-Protokoll |
| C-08 | Geprüftes Softwarepaket | Dokumentation, Release, Git-Stand, Deploy und ausgelieferte Fassung |

## Ergebnisprotokoll

**Integration:** 45 von 45 Node-Tests und 28 von 28 Chromium-Tests bestanden ohne Skip. Der PWA-Test aktualisierte den v4-Client auf v5 und öffnete die Profilansicht auch offline. Bei einer kontrollierten zweiten lokalen Origin verweigerte der Browser den Zugriff auf die lokale Kamerasitzung. Der Export-/Importweg blieb funktionsfähig.

Fünf [Profiltests](../../tests/profile.test.js) und elf bestehende [Kameraregeltests](../../tests/camera.test.js) bestanden. Berücksichtigt wurden unter anderem A mit Zeitgrenze, feste ISO auf dem Stativ, feste Sekunden in M, alte Motive und ungültige Felder. Das A-Beispiel in der Architektur ließ sich mit dem v1-Validator einlesen.

Zwölf [Tests der Übertragung](../../tests/transfer-engine.test.js) bestanden. Sie prüfen unter anderem geänderte Gerätefähigkeiten, abgelehnte Blende nach bereits bestätigter ISO, fehlende und verspätete Rücklesung, getrenntes Gerät, Doppelklick und Timeout. Die Engine schreibt höchstens einmal pro Feld und versucht die Bestätigung bis zu dreimal. Das Zeitlimit beträgt 28 Sekunden je Lesen und 40 Sekunden je Schreiben.

Neun [Adapterfälle](../../tests/gphoto.test.js) bestanden, einschließlich kontrollierter Antworten über einen gestarteten CLI-Testprozess. Modell- und Moduswechsel, belegte Schnittstelle, Rechtefehler, mehrere Geräte, gemeldete Blendenauswahl, unbrauchbare Vollbereiche und nicht bestätigte Schreibversuche werden geprüft. Die CLI-Aufrufe haben jeweils ein Limit von zwölf Sekunden.

Drei [Tests des lokalen Dienstes](../../tests/local-server.test.js) bestätigen Sitzung, Vorschau und gegenseitigen Ausschluss laufender Kameraaktionen. Die [Chromium-Abläufe](../../tests/transfer_browser.py) durchlaufen bei 320 Pixeln Ansichtsbreite den JSON-Download vom statischen Testserver, Dateiimport, Lesen und Bestätigen in der lokalen Anwendung sowie den Offline-Start der Simulation. Beim M-Profil für weiches Wasser wurden über einen kontrollierten CLI-Prozess ISO 100, f/8 und 1 s erst nach dem Tastendruck geschrieben und anschließend einzeln zurückgelesen.

**Nachtest der finalen Übertragungsansicht:** `python3 -B tests/transfer_browser.py -v` bestand mit 3/3 Fällen. Beim zusätzlichen Fall nahm der kontrollierte CLI-Prozess zuerst die ISO an und wies dann die Blende ab. Die Oberfläche zeigte die bestätigte ISO, die abgewiesene Blende und die übersprungene Zeit als Teilergebnis. Der erneute Export des geladenen Profils erhielt dessen Zielwerte. Mit diesem Zusatzfall enthält die Browsersuite 29 Fälle.

Auf Debian GNU/Linux 13 (amd64) meldete `gphoto2 --version` gphoto2 2.5.28, libgphoto2 2.5.31 und libgphoto2_port 0.12.2. Die Modellliste enthält die ILCE-6400. `gphoto2 --auto-detect` fand kein angeschlossenes Gerät. Beim Start mit `node local/server.js` und echter gphoto2-CLI meldete der USB-Leseversuch in Chromium „Keine Kamera erkannt“. Die Schaltfläche zum Schreiben blieb inaktiv. Der Adapter meldete `disconnected`. Die physischen H-Prüfungen stehen aus. Der Soll-/Ist-Vergleich pro Wert gilt jeweils für den Zeitpunkt der Rücklesung. Der Erhalt nach dem Trennen und ein späterer MR-Abruf benötigen eigene Versuche.

## Windows-Erweiterung

Auf Windows 11 x64 führt der lokale Dienst gphoto2 über WSL 2 mit Ubuntu aus. Die USB-Zuordnung erfolgt über usbipd-win ab Version 5. **Nur ISO übertragen** dient als kleinster Schreibversuch nach dem reinen Lesen. In einem Praxistest zeigte Sony Imaging Edge Remote unter Windows **ISO 400** an. Für H-01 und H-02 ist ein eigener Versuch in der Projektoberfläche erforderlich. [Windows-Anleitung](../WINDOWS-USB.md)

Die lokalen Windows-Zweigtests liefen auf Linux. 50/50 Node-Tests, 4/4 Chromium-Übertragungsfälle und 4/4 Chromium-PWA-Fälle bestanden. Der Browser-Einzelversuch schrieb nach dem ausdrücklichen Klick genau ISO über einen kontrollierten CLI-Prozess. Der öffentliche ILCE-6400-Konfigurationsdump lieferte beim kontrollierten Windows-Aufruf M, ISO 1250 und das erlaubte Ziel ISO 100. Der separate Windows-Runner prüft den Start der CMD-Datei und die Sitzung. Den Ausführungsstand nennt [STATUS](../STATUS.md#veröffentlichung).

## Hardwareprotokoll

Referenzablauf am Rechner mit USB-Datenkabel, gphoto2 und der lokalen Web-App. Vor dem Versuch Datum, Betriebssystem, Browser, Commit, Ausgabe von `gphoto2 --version`, Kameramodell und Firmware, Objektivmodell, Zoomstellung, Foto-/Fokusmodus sowie die Ausgangswerte für ISO, Blende und Zeit notieren. Die [Einrichtung](../DEVELOPMENT.md#lokale-usb-anwendung) beschreibt Start und Verbindung.

| ID | Schritte am Gerät | Beobachtung im Protokoll | Status |
| --- | --- | --- | --- |
| H-01 | Unter Windows zunächst die bestätigte Sony-BUSID an WSL weiterreichen. Einzige ILCE-6400 auf USB-Verbindung **PC-Fernbedienung / PC Remote** stellen, mit Datenkabel anschließen und in der lokalen App verbinden. | Modell und Modus, gemeldete Istwerte und Auswahlmöglichkeiten mit Kameradisplay vergleichen. | Offen |
| H-02 | Am Moduswahlrad M wählen. Mit **Nur ISO übertragen** zuerst einen angezeigten und vom Istwert abweichenden ISO-Zielwert ausprobieren. Für Blende und Zeit anschließend jeweils ein Profil mit genau einem abweichenden, am Gerät angebotenen Ziel vorbereiten und bewusst übertragen. | Ausgangs-, Ziel-, zurückgelesenen und angezeigten Wert je Feld notieren, inklusive Ablehnungen. | Offen |
| H-03 | In A mit Auto ISO ein Landschaftsprofil übertragen, anschließend die Fähigkeiten in M erneut laden und vergleichen. | Auto ISO, seine Grenzen und die Min.-SS-Schwelle einzeln protokollieren. Prüfen, dass die in A gemessene Zeit automatisch bleibt. | Offen |
| H-04 | Ein variables Zoom am kurzen und langen Ende prüfen, etwa SEL55210 bei 55 und 210 mm. Eine am langen Ende unzulässige Zielblende vorbereiten. | Verfügbare Blenden und angezeigte Begründung festhalten. Die manuell angegebene Brennweite und die gemeldeten Gerätewerte einzeln vermerken. | Offen |
| H-05 | In M mehrere unterstützte Zielwerte wählen. Übertragung starten und die USB-Verbindung während der Operation trennen. | Pro Feld letzte bestätigte Rücklesung, Unterbrechung und ausstehende Werte notieren. Erneut verbinden und neu einlesen. | Offen |
| H-06 | Bestätigte Werte bei laufender Kamera nach dem Abziehen des Kabels und nach Aus-/Einschalten erneut am Display prüfen. | Zwei getrennte Beobachtungen je Feld, mit Modus und etwaigen Änderungen. | Offen |
| H-07 | Falls ein freier MR-Speicherplatz verfügbar ist, die bestätigten Werte an der Kamera manuell registrieren, Einstellungen ändern und den Platz abrufen. | Platz, registrierte Werte und tatsächlich wiederhergestellte Werte festhalten. Bereits belegte Plätze erhalten. | Offen |
| H-08 | Auf dem Zielrechner ein Profil von der Produktionsseite exportieren, lokal importieren, USB verbinden und die zurückgelesenen Werte mit dem Display vergleichen. | Host, Browser, Profilversion, Berechtigungen, Transport, ggf. Fehlermeldungen und Ergebnis je Feld. | Offen |
| H-09 | Zusätzlich gemeldete Fähigkeiten wie Weißabgleich, EV, Fokus und Stabilisierung im jeweiligen Modus über `gphoto2 --list-config` und `gphoto2 --get-config` am ermittelten Pfad nachsehen. | Pro Parameter gemeldete Lesbarkeit, Schreibbarkeit und angebotene Werte erfassen. Eine Aussage zum Schreiben erfordert einen gesonderten Versuch. | Offen |
| H-10 | Optional ein echtes, auf einer α6400 erzeugtes Kartenprofil an einer zweiten ILCE-6400 über MR laden. Eine Karte mit freien Speicherplätzen verwenden. | Beide Modell-/Firmwarestände, Objektive, gewählter Platz und tatsächlich übernommene Felder festhalten. | Offen |

Für H-09 und H-10 dokumentiert die [Verbindungsrecherche](../research/sony-a6400-verbindung-und-presettransfer.md) die offenen Folgefragen. Ein Haken setzt einen tatsächlich beobachteten Hardwareversuch voraus.
