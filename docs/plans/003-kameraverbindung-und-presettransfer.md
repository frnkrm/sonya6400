# Plan 003 — Kameraverbindung und Presetübertragung

## Eckdaten

- **Status:** Geplant; Software noch nicht umgesetzt, Hardwareabnahme offen.
- **Erstellt / aktualisiert:** 2026-11-25 / 2026-11-25.
- **Basis:** [`1aa7cd7`](https://github.com/frnkrm/sonya6400/commit/1aa7cd744d18c9460127836e7d678ce6670a92ee). Vor Umsetzung den aktuellen Branch und Code erneut abgleichen.
- **Kennungen:** `C-01` bis `C-08`; die bestehenden Kennungen `F-01` bis `F-07` und `K-01` bis `K-26` bleiben erhalten.
- **Grundlage:** [Verbindungsrecherche](../research/sony-a6400-verbindung-und-presettransfer.md), [Projektstand](../STATUS.md), [Architektur](../ARCHITECTURE.md).
- **Ausführung:** [Codex-Auftrag](../CODEX-AUFTRAG.md). Dieser Plan dokumentiert das Vorhaben; sein Anlegen implementiert keine Kamerasteuerung.

## Ziel und Ausgangslage

Die Website berechnet bereits Empfehlungen für Landschaft und andere Motive. Sie kennt die tatsächlichen Einstellungen einer angeschlossenen Kamera bisher nicht und überträgt keine Werte. Die bisherigen Pläne 001 und 002 sind laut ihren Ergebnisprotokollen lokal abgenommen; diese Arbeit nicht erneut aufbauen.

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

- [ ] Kamera erkennen, Modell, Modus und lesbare Einstellungen erfassen; Schreibbarkeit und verfügbare Werte pro Parameter ermitteln.
- [ ] Mehrere Geräte, eine andere Kamera, fehlende Verbindung, belegte USB-Schnittstelle und nicht unterstützte Werte verständlich behandeln.
- [ ] Veraltete Werte nach Verbindungsabbruch als veraltet kennzeichnen. Kein Simulationsgerät als echte Kamera anzeigen.
- **Abnahme:** Ohne Gerät bleibt die Empfehlung vollständig nutzbar. Ein simulierter oder tatsächlicher Anschluss zeigt Herkunft und verfügbare Parameter. Ein fester Wert ist nur auswählbar, wenn der Adapter ihn im aktuellen Modus erlaubt.

### C-02 · Eindeutiges Übertragungsprofil

- [ ] Ein kleines versioniertes Datenformat für Aufnahmeabsicht und konkrete Zielwerte definieren; Zahlen, Einheiten, erlaubte Felder und Schema-Version validieren.
- [ ] Die bestehende gemeinsame Empfehlung in `camera.js` verwenden. Falls zusätzliche strukturierte Felder nötig sind, sie dort ergänzen; keine zweite unabhängige Fotografie-Regellogik aufbauen und keine Befehle aus übersetzten Anzeigetexten erraten.
- [ ] Festen ISO-Wert, Auto ISO und ISO-Grenzen unterscheiden. Fest vorgegebene Belichtungszeit, gewünschte Zeitgrenze und ISO AUTO Min. SS unterscheiden.
- [ ] In Modus A keine feste Verschlusszeit aus einer Empfehlung wie „1/125 s oder kürzer“ ableiten. Einen am Moduswahlrad erforderlichen Schritt anzeigen, ohne den Belichtungsmodus stillschweigend umzudeuten.
- [ ] Tatsächlich gemeldete Objektiv-/Blendenmöglichkeiten und bekannte Herstellergrenzen berücksichtigen. Die manuelle Brennweitenauswahl der Website ist kein Messwert der Kamera.
- **Abnahme:** Ein Landschaftsprofil mit A, f/8 und Auto ISO bleibt semantisch erhalten; fehlende Auto-ISO-Grenzen werden als manuelle Schritte ausgewiesen. Ein M-Profil mit festen Werten enthält eindeutige Zahlen. Ungültige, unbekannte oder veraltete Profilformate werden verständlich abgelehnt.

### C-03 · Lokale USB-Verbindung

- [ ] Einen kleinen Adapter für Erkennung, Lesen, verfügbare Werte und Schreiben implementieren. Vorhandene gphoto2-Fähigkeiten verwenden, Kamera-Konfigurationspfade am Gerät ermitteln und keine allgemeine Beispieltabelle als bestätigte α6400-Fähigkeit übernehmen.
- [ ] Fehlende lokale Abhängigkeiten und Kameraeinstellungen mit einer kurzen Einrichtungshilfe behandeln. Keine automatische Treiberersetzung oder Service-Modus-Aktion ausführen.
- [ ] Falls ein lokaler HTTP-Dienst verwendet wird: standardmäßig nur Loopback, explizit erlaubte Origins und eine lokal gebundene Sitzung verwenden. Keine anonymen Schreibzugriffe aus beliebigen Websites, keine Tokens in geteilten Links oder Logs und keine frei ausführbaren Shell-Befehle aus Profilwerten.
- [ ] Den vorgesehenen USB-Weg und den Profilimport dokumentieren. Der bereits vorhandene statische Netlify-Betrieb bleibt nutzbar; eine Netlify Function kann nicht auf den USB-Port des Nutzergeräts zugreifen.
- **Abnahme:** Der echte Adapter ist implementiert, seine Ein-/Ausgaben und Fehlerfälle werden mit kontrollierten Antworten geprüft. Eine fehlende Kamera verhindert die Hardwareabnahme, nicht den Abschluss des ausführbaren Softwarepakets. Eine ausschließlich simulierte Verbindung reicht nicht als Implementierung dieses Punkts.

### C-04 · Schreiben und Rücklesen

- [ ] Änderungen explizit starten, nacheinander durchführen und pro Feld den tatsächlich zurückgelesenen Wert vergleichen. Modusabhängige Schritte und gegebenenfalls schrittweise Wertänderungen berücksichtigen.
- [ ] Eine begrenzte Anzahl von Versuchen und feste Zeitlimits vorsehen. Verbindungsabbruch, Ablehnung, abweichender Istwert und Teilerfolg erhalten unterschiedliche Ergebnisse.
- [ ] Wiederholte Klicks während einer Übertragung abfangen. Nach Fehlern nicht unbegrenzt erneut schreiben und keine erfolgreiche Wiederherstellung alter Werte behaupten, wenn sie nicht zurückgelesen wurde.
- **Abnahme:** Bei einer absichtlich abgewiesenen Blende werden zuvor erfolgreich gesetzte Werte korrekt ausgewiesen. Bei ausbleibender Rücklesung erscheint keine pauschale Erfolgsmeldung. Automatisch übertragene Werte werden nicht mit dauerhaft registrierten MR-Profilen gleichgesetzt.

### C-05 · Verständliche Bedienung

- [ ] Eine kompakte optionale Verbindungsansicht mit Istwerten, Zielwerten, manuellen Restschritten und „Einstellungen übertragen“ ergänzen.
- [ ] Das bloße Öffnen eines Links, Wechseln eines Motivs oder Wiederverbinden überträgt nichts. Die bewusste Übertragen-Aktion genügt; keine unnötige Kette von Bestätigungsdialogen einführen.
- [ ] „Simulation“, „nicht verbunden“, „teilweise übernommen“, „bestätigt übernommen“ und „Hardwareprüfung offen“ passend unterscheiden.
- [ ] Die bestehenden manuellen Empfehlungen, PNG-Karten, Links, gespeicherten Daten und Offline-Funktionen erhalten. Istwerte der Kamera nicht ungefragt in die gewünschte Empfehlung zurückschreiben.
- **Abnahme:** Eine Landschaftsempfehlung lässt sich mit Tastatur und in schmaler Ansicht verwenden. Ohne Kamera bleibt die App bedienbar. Simulation ist erkennbar und wird nicht als Aufnahmeprüfung beworben.

### C-06 · Nutzbarer Rückfallweg und Verbindungshilfe

- [ ] Export/Import des eigenen Profils und die manuelle Bedienfolge als Rückfallweg anbieten. Eindeutig benennen, dass die JSON-Datei für unsere lokale Anwendung bestimmt ist und kein Sony-Importformat darstellt.
- [ ] Die Einrichtung für IEM/WLAN, NFC und USB anhand der Recherche knapp erklären. Ein Link zu einer Drittanbieter-App ist keine automatische Profilübergabe.
- [ ] Falls die HTTPS-Website den lokalen Dienst im getesteten Browser nicht direkt erreicht, den Importweg fertigstellen und die Einschränkung sichtbar dokumentieren. Eine ausschließlich auf localhost geprüfte Oberfläche nicht als fertige Netlify-Anbindung ausgeben.
- **Abnahme:** Das exportierte Profil kommt unverfälscht im lokalen Adapter an, wird validiert und bleibt vor dem Übertragen überprüfbar. Unbekannte Felder oder nicht unterstützte Werte erzeugen klare Meldungen.

### C-07 · Software- und Hardwareprüfungen

- [ ] Gezielte Tests für die Profilsemantik, Modus-/Objektivgrenzen, Verbindungsfehler, Teilübertragung, Rücklesung und die berührten Browserabläufe ergänzen.
- [ ] Den echten Adapter anhand kontrollierter Prozess-/Transportantworten prüfen; Simulation und echte Hardwaretests getrennt protokollieren. Keine Tests schreiben, die nur den eigenen Quelltext nach erwarteten Zeichenketten durchsuchen.
- [ ] Die Hardwareprüfungen H-01 bis H-10 aus der Fachreferenz in einem Ergebnisprotokoll führen. Besonders H-01 bis H-08 sind für die tatsächliche Grundübertragung und Aussagen zur Persistenz relevant.
- [ ] Wenn keine Kamera angeschlossen werden kann, alle unabhängig ausführbaren Softwarearbeiten abschließen und eine kurze reproduzierbare Testanleitung für das Gerät hinterlassen. Fehlende Hardware weder simulativ als bestanden ausgeben noch als Grund nutzen, bei einer bloßen Konzeptskizze aufzuhören.
- **Abnahme:** Die vorhandenen betroffenen Regressionstests und die neuen Softwarefälle bestehen. Kamera-Modell, Firmware, Objektiv, Modus, Plattform und Version werden bei echten Tests notiert; nicht ausgeführte H-Prüfungen bleiben offen.

### C-08 · Dokumentation und Veröffentlichung

- [ ] Einrichtung, unterstützte Plattform, Architekturentscheidung, konkrete Befehle und bekannte Grenzen dokumentieren.
- [ ] Projektstand, Roadmap, Planstatus und Changelog auf die tatsächlich erreichte Stufe aktualisieren. Bereits erledigte K-/F-Punkte nur bei einem nachgewiesenen neuen Befund wieder öffnen.
- [ ] Änderungen in zusammenhängenden Commits auf den gewünschten aktuellen `main`-Stand bringen; fremde Änderungen erhalten und keinen Force-Push verwenden.
- [ ] Bei Änderungen gecachter Dateien `sw.js` und `app-release` zusammen aktualisieren. Funktions-Commits normal veröffentlichen; bei reiner Dokumentation ist `[skip ci]` möglich.
- [ ] GitHub-Stand, zugehörigen Netlify-Deploy und ausgelieferte Fassung prüfen, soweit die Umgebung Zugriff bietet. Einen angenommenen Push nicht mit einem nachgewiesenen Deploy gleichsetzen.
- **Abnahme:** Commit und Remote-Stand sind nachgewiesen. Software-, Hardware- und Produktionsprüfung sind jeweils separat berichtet; offene externe Prüfungen haben einen konkreten nächsten Schritt.

## Effiziente Reihenfolge

1. Aktuellen Code und vorhandene Nachweise abgleichen. Nur reale Restarbeiten aus den älteren Plänen übernehmen.
2. C-01/C-02 und die Übertragungslogik aus C-04 mit Simulation umsetzen.
3. C-03 mit ausführbarem USB-Adapter sowie Profilimport fertigstellen.
4. C-05/C-06 mit bestehenden Empfehlungs- und UI-Modulen verbinden.
5. C-07 gezielt prüfen; Hardwarefälle nach Verfügbarkeit, ohne Softwarefortschritt davon abhängig zu machen.
6. C-08 abschließen. Zusätzliche WLAN-/Android-/SD-Entwicklung nur beginnen, wenn ein konkreter verbliebener Bedarf und ein prüfbarer Weg feststehen.

## Ergebnisprotokoll

| Bereich | Stand beim Anlegen dieses Plans |
| --- | --- |
| Quellen und Machbarkeit | Dokumentiert; keine eigene Kameraabnahme |
| C-01 bis C-08, Software | Geplant; noch nicht implementiert |
| H-01 bis H-10, Hardware | Offen; keine Kamera verbunden |
| Produktionsbetrieb der Verbindung | Nicht vorhanden; noch nicht geprüft |

Bei Umsetzung hier geprüfte Befehle, Ergebnisse, Commit(s), Plattformen und verbleibende Blockaden ergänzen. Ein Punkt kann softwareseitig fertig sein, während der zugehörige Hardware-Nachweis offen bleibt; beide Zustände ausdrücklich nennen.
