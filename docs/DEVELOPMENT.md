# Entwicklung und Veröffentlichung

Stand: 25.11.2026 · Ausgangscode: `678e440489266b9fb514d9688f4d0f66c5a5543e`.

Zurück zum [Überblick](../README.md) · [Architektur](ARCHITECTURE.md) · [Befunde](STATUS.md) · [Roadmap](ROADMAP.md)

## Schnellstart

Die App besteht aus statischen Dateien. Für die Auslieferung genügt ein Webserver.

Voraussetzungen: Git, ein Texteditor, ein aktueller Browser und Python 3 für den lokalen Webserver.

```bash
git clone https://github.com/frnkrm/sonya6400.git
cd sonya6400
```

Unter Linux/macOS:

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

Unter Windows mit installiertem Python-Launcher:

```powershell
py -m http.server 8080 --bind 127.0.0.1
```

- Im Browser `http://localhost:8080/` öffnen.
- Nach Dateiänderungen neu laden. Der Server erzeugt keinen Build.
- Mit `Strg+C` den Server beenden.
- Für Service Worker, Teilen und Standortfunktionen über `localhost` testen; ein Doppelklick auf `index.html` bildet diese Funktionen nicht vollständig ab.
- Der Python-Server wertet Netlifys `_headers` nicht aus. Header-Verhalten auf Netlify separat prüfen.

## Testwerkzeuge

Für den statischen Testserver genügt Python 3. Regel-, Adapter- und Diensttests laufen mit dem integrierten Test-Runner von Node.js. Für die Browsertests sind Python mit Playwright und Chromium erforderlich. Die Testwerkzeuge dienen ausschließlich der Entwicklung.

Aus dem Repository-Stamm:

```bash
node --test tests/*.test.js
python3 -m unittest discover -s tests -p '*.py' -v
```

Die Browsertests nutzen einen lokalen Server und isolierte Browserprofile. Für die Update-Tests braucht der Checkout die Git-Objekte `678e440489266b9fb514d9688f4d0f66c5a5543e` (v3), `1aa7cd744d18c9460127836e7d678ce6670a92ee` (v4), `3449a1f2819b8b1b97279861746efd06050038bf` (v5), `5dc338e8f7a0cafb90ef61425ff5d0590369dece` (v6), `ca5aac4c0656b24458b711f2613e612b7e9165e3` (v7) und `fa280c7b26e106c0f5b77591ac4a32f694f13316` (v8). Bei einer flachen Kopie die Historie bis zu diesen Commits ergänzen. Die geprüfte Cloud-Umgebung verwendet Node 24.22.3, Python 3.12, Playwright 1.62.0 und Chromium 156. Die PWA-Prüfung nutzt die DevTools-Kommandos `PWA.install` und `PWA.launch` des vollständigen Chromium-Browsers. `CHROMIUM_PATH` kann auf dessen Programmdatei zeigen.

Auf einem Entwicklungsrechner ohne Playwright kann eine virtuelle Python-Umgebung außerhalb des Repositorys verwendet werden:

```bash
python3 -m venv ../a6400-testenv
. ../a6400-testenv/bin/activate
python -m pip install playwright==1.62.0
python -m playwright install chromium
export CHROMIUM_PATH="$(python -c 'from playwright.sync_api import sync_playwright; p=sync_playwright().start(); print(p.chromium.executable_path); p.stop()')"
```

Die [Architekturübersicht](ARCHITECTURE.md) ordnet Funktionen ihren Quelldateien zu. Zu Änderungen an Kamera- oder Objektivdaten gehören der Abgleich mit der [Fachreferenz](research/sony-a6400-kamera-objektive.md) und die betroffenen Kriterien in [Plan 002](plans/002-landschaft-und-kamerafunktionen.md).

## Arbeitsablauf

1. Den aktuellen Stand lesen: [STATUS](STATUS.md), [ROADMAP](ROADMAP.md) und [`AGENTS.md`](../AGENTS.md).
2. Für größere Änderungen einen konkreten Plan aus der [Vorlage](plans/TEMPLATE.md) anlegen.
3. Einen kleinen, zusammenhängenden Änderungsschritt bearbeiten. Bei späteren Funktionsänderungen bietet sich ein eigener Branch an.
4. Die betroffenen Funktionen anhand der Checkliste unten prüfen.
5. Befunde, Planstatus und relevante Dokumentation im selben Commit aktualisieren.
6. Commit und Zielbranch kontrollieren, dann pushen. Ein Push auf den verbundenen Produktionsbranch kann eine Veröffentlichung auslösen.

Bestehende Schlüssel für `localStorage` und das Linkformat `#s=motiv.licht.bew.look.lens` als Schnittstellen behandeln. Änderungen brauchen eine kompatible Übernahme alter Werte und Tests mit vorhandenen Links.

Neue Objektivdaten gegen die Regelberechnung prüfen. Kameramenüs und fotografische Aussagen anhand passender Herstellerquellen kontrollieren; die vorhandenen Texte sind keine unabhängige fachliche Verifikation.

## Lokale USB-Anwendung

Unter Windows 11 x64 beginnt der Hardwareversuch mit dem [nativen ISO-Lesetest](WINDOWS-USB.md). Der optionale Profiltransfer über gphoto2 hat eine eigene [WSL-Einrichtung](WINDOWS-WSL.md). Die folgenden Befehle gelten für die native Linux-Variante. Der kleine Node-Dienst läuft auf dem Rechner am USB-Kabel. Er liefert die Browseroberfläche und führt gphoto2 lokal aus. Für die statische Website und den Profil-Export genügt weiterhin ein Webserver.

1. Unter Linux Node.js ab Version 22 und das Distributionspaket `gphoto2` bereitstellen. Auf Debian-Systemen ist das Paket über `apt install gphoto2` erhältlich.
2. An der α6400 im Fotomodus unter **USB-Verbindung** die Option **PC-Fernbedienung (PC Remote)** wählen. Ein USB-Datenkabel anschließen. Andere Anwendungen wie Bildimport oder Imaging Edge, die gerade auf diese Kamera zugreifen, beenden. [Sony-Hilfe zur ILCE-6400](https://helpguide.sony.net/ilc/1810/v1/en/contents/TP0002279243.html)
3. Im Repository-Stamm zunächst die Werkzeugversion und Erkennung prüfen und dann die lokale Anwendung starten:

```bash
node --version
gphoto2 --version
gphoto2 --auto-detect
node local/server.js
```

4. Im Browser `http://127.0.0.1:8765/` öffnen. Empfehlung auswählen oder die zuvor exportierte JSON-Datei importieren. Unter **Kameraverbindung & Profil** den Eintrag **USB am Computer** wählen, die Kamera lesen und die angebotenen Zielwerte und manuellen Schritte prüfen. Falls ein anderer Modus nötig ist, das Moduswahlrad umstellen und die Fähigkeiten neu einlesen.
5. **Einstellungen übertragen** bewusst anklicken. Bei einem Teilerfolg die einzeln zurückgelesenen Werte prüfen. Nach Verbindungsverlust die Kamera neu verbinden und aktuelle Istwerte lesen. `Strg+C` beendet den Dienst.

Der Profilweg von der Produktionswebsite führt über einen Dateidownload und den Import in die Oberfläche auf dem USB-Rechner. Mit der ausdrücklich gewählten Simulation lässt sich der Ablauf auch ohne Kamera erproben. Geprüfte Referenz für den lokalen Dienst ist Debian GNU/Linux 13 (amd64) mit gphoto2 2.5.28 und libgphoto2 2.5.31. Ein generischer Blendenbereich wie 0–655,35 reicht zur Freigabe einer Zielblende nicht aus. Wenn das Gerät keine passenden Wahlmöglichkeiten liefert, die Blende am Objektiv beziehungsweise Kamerarad einstellen. Der gphoto2-Profiltransfer mit physischer α6400 ist unter Linux und Windows offen. Unter Windows 11 x64 nutzt die native ISO-Abfrage den Windows-Treiber. Feste ISO 400 wurde damit am Gerät gelesen und am Display bestätigt. Beim nativen Einzelschritt zeigte das Gerät ISO 500. Die unmittelbare v9-Rücklesung meldete 400, die separat gestartete Lesung 500. Beim Gerätetest mit v10 bestätigte der Kompass ISO 500 automatisch und der Wert stimmte mit dem Kameradisplay überein. Nur der WSL-Transferweg erfordert zusätzlich usbipd-win ab 5 und Ubuntu in WSL 2. Auf macOS und Mobilgeräten wurde kein lokaler USB-Ablauf abgenommen. Die H-Fälle benennen zu jedem echten Versuch die erwartete Beobachtung. [Plan 003](plans/003-kameraverbindung-und-presettransfer.md#hardwareprotokoll)

## Prüfcheckliste für Funktionsänderungen

Diese Punkte beschreiben Prüfziele. Sie sind kein Nachweis, dass bereits alle Tests durchgeführt wurden oder bestehen. Bekannte Abweichungen stehen in [STATUS](STATUS.md).

### Grundfunktionen und Empfehlungen

- [ ] Alle fünf Bereiche öffnen; der aktive Bereich ist erkennbar und wird nach Neuladen wiederhergestellt.
- [ ] Alle sechs Schnellstarts prüfen: Auswahl, Empfehlung und Anleitung passen zusammen.
- [ ] Motiv, Licht, Bewegung, Look und Objektiv einzeln ändern; keine JavaScript-Fehler oder leeren Werte.
- [ ] Besonders prüfen: dunkles Gruppenfoto, bewegte Personen, City/Sweetspot als Stativmodus und lichtschwaches Teleobjektiv.
- [ ] Werte in Hauptansicht, Schrittfolge und geteiltem Bild stimmen überein.

### Gespeicherte Einstellungen

- [ ] Bag bearbeiten; mindestens ein Objektiv bleibt ausgewählt.
- [ ] Das aktuell verwendete Objektiv ausblenden; die App wechselt nachvollziehbar zu einem verfügbaren Objektiv.
- [ ] Auswahl und Checklisten nach Neuladen prüfen; „Alle Haken zurücksetzen“ betrifft die Checklisten.
- [ ] In einem getrennten Testprofil blockierten Speicher und ungültige gespeicherte Auswahlwerte testen.
- [ ] Erwartete Wiederherstellung bei automatischer Lichtmessung prüfen: Die Messung darf eine bewusste neue Auswahl nicht überraschend überschreiben.

### Teilen und Dialoge

- [ ] Link kopieren und in einem frischen Tab öffnen; alle fünf Auswahlwerte übernehmen.
- [ ] Link mit einem Objektiv außerhalb des bisherigen Bags prüfen.
- [ ] Ungültiger Link verursacht keinen Absturz.
- [ ] PNG speichern; Motiv, Objektiv und Werte prüfen. Native Teilen-Funktion auf einem unterstützten Mobilgerät separat prüfen.
- [ ] App-, Bag- und Teilen-Dialog mit Tastatur bedienen: Fokus sichtbar, Tab/Shift+Tab bleiben im Dialog, Escape schließt, Fokus kehrt zum Auslöser zurück.

### Wetter und Offline-Betrieb

- [ ] Standort ablehnen; verständliche Uhrzeitschätzung und weiterhin bedienbare manuelle Lichtauswahl.
- [ ] Mit freigegebenem oder simuliertem Standort Wetterabruf prüfen; Netzwerkfehler ebenfalls testen.
- [ ] Während einer langsamen Wetterabfrage manuell Licht wählen; Verhalten auf unbeabsichtigtes Überschreiben prüfen.
- [ ] App einmal vollständig online öffnen, Service-Worker-Aktivierung prüfen, dann offline neu laden.
- [ ] Offline Navigation, Empfehlungen, Checklisten und Bildexport prüfen; aktuelles Wetter benötigt Netzwerk.
- [ ] Vor dem Offline-Test eine fehlende URL öffnen; der App-Cache darf dadurch nicht durch eine Fehlerseite ersetzt werden.
- [ ] Nach einer Runtime-Änderung einen bereits geöffneten Tab sowie eine installierte App aktualisieren und den tatsächlich sichtbaren Stand prüfen.

### Darstellung und Veröffentlichung

- [ ] Kleine Mobilansicht, Hoch-/Querformat und große Schrift: keine verdeckten Bedienelemente.
- [ ] Fokusmarkierung und reduzierte Bewegung prüfen; Screenreader-Verhalten bei relevanten Änderungen separat testen.
- [ ] Manifest, alle Icons und interne Dateien erreichbar; Domainangaben in Metadaten, Sitemap und `robots.txt` konsistent.
- [ ] In der Veröffentlichungsumgebung Service Worker, Header und Konsole auf Fehler prüfen.

Die Regeltests schließen die 864 ursprünglichen Kombinationen ein. Neue Szenarien brauchen eigene Prüfungen, insbesondere Zoom-Endwerte, alternative Aufnahmeziele, Formatgrenzen und ungültige Rechnereingaben. Jeder K-Kennung ist ein konkreter Abnahmefall zugeordnet. [Plan 002](plans/002-landschaft-und-kamerafunktionen.md)

## Service Worker während der Entwicklung

- Cache-Version und Offline-Dateiliste stehen in [sw.js](../sw.js).
- Bei Änderungen an gecachten Runtime-Dateien `VERSION` und die HTML-Versionsmarke `app-release` zusammen erhöhen. Neue Pflichtdateien in `SHELL` aufnehmen.
- Für reine Markdown-Änderungen ist kein Cache-Versionswechsel nötig.
- In den Browser-Entwicklerwerkzeugen unter Application/Anwendung den aktiven Service Worker und Cache prüfen. Bei veraltetem lokalen Inhalt kann „Update on reload“ helfen.
- Ein vollständiges Löschen der Website-Daten entfernt auch lokal gespeicherte Auswahl und Checklisten. Für solche Tests ein separates lokales Testprofil verwenden.
- Beim Versionswechsel zusätzlich prüfen, welche Fassung der bereits geöffnete Tab nach dem Neuladen tatsächlich zeigt.

Bei späteren Regressionstests prüfen, ob die aktualisierte lokale Windows-Oberfläche **ISO über Windows lesen** und **ISO von 400 auf 500 ändern** anbietet. Der Einzelschritt benötigt die aktuelle Freigabe aus der nativen Lesung. Bei unbekannter ISO-Kodierung den vollständigen Rohwert aus der Anzeige protokollieren. Für den Geräteversuch beide Anzeigen vor und nach dem Klick vergleichen. [Ablauf für die α6400](WINDOWS-USB.md#optionaler-hardwaretest-von-iso-400-auf-500)

## Netlify

Website: [sonyalpha6400.frnkrm.com](https://sonyalpha6400.frnkrm.com/). Repository: [frnkrm/sonya6400](https://github.com/frnkrm/sonya6400).

Für den vorhandenen statischen Aufbau passen folgende Einstellungen. **Dies sind aus dem Repository abgeleitete Sollwerte; die aktuellen Dashboard-Einstellungen wurden für diese Dokumentation nicht vollständig geprüft.**

| Einstellung | Passender Wert |
| --- | --- |
| Produktionsbranch | `main`, sofern dieser in Netlify verbunden ist |
| Base directory | Repository-Stammverzeichnis |
| Build command | Leer; die vorhandenen Dateien brauchen keinen Build |
| Publish directory | `.` / Repository-Stammverzeichnis |
| Eigene Umgebungsvariablen | Im vorhandenen App-Code werden keine benötigt |

- Nach einem Funktions-Push den zugehörigen Deploy prüfen und anschließend die Live-Seite kontrollieren.
- Für reine Dokumentations-Commits kann `[skip ci]` im Commit-Text einen unnötigen Netlify-Deploy vermeiden.
- Nach dem Deploy einzelne Runtime-Dateien und ihre Header vom Produktionshost prüfen. Den ausgelieferten Inhalt mit dem gepushten Commit vergleichen.
- Netlify-Konfiguration und Zugangsdaten nicht mit Projektwissen verwechseln: Keine Tokens, privaten Accountdaten oder lokalen `.netlify`-Dateien committen.
- Bei Veröffentlichung des gesamten Stammverzeichnisses können auch Dokumentationsdateien öffentlich erreichbar werden. Nur für das öffentliche Repository geeignete Inhalte ablegen.

## Dokumentation mitpflegen

- **Verhalten oder Dateiaufteilung geändert:** [Architektur](ARCHITECTURE.md) und diese Anleitung anpassen.
- **Fehler behoben:** [Befund](STATUS.md) mit Nachweis aktualisieren, Roadmap-Punkt verlinken und abschließen.
- **Neues Vorhaben:** [Planvorlage](plans/TEMPLATE.md) kopieren; Ziel, Grenzen und Abnahmekriterien festhalten.
- **Änderung veröffentlicht:** [`CHANGELOG.md`](../CHANGELOG.md) ergänzen.
- Nicht durchgeführte Browser-, Geräte- oder Deployment-Prüfungen ausdrücklich als offen kennzeichnen.
