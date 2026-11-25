# Sony α6400 Spickzettel

Eine deutschsprachige Web-App mit Kamera-Empfehlungen für Landschaft, Porträt, Street, Gruppenfotos und City Lights.

**[Website öffnen](https://sonyalpha6400.frnkrm.com/)** · **[Repository](https://github.com/frnkrm/sonya6400)** · **[Entwicklungsstand](docs/STATUS.md)**

## Was die App bietet

- **Kompass:** Blende, Belichtungszeit, ISO, Fokus und Bedienfolge passend zur ausgewählten Situation.
- **9 Objektivprofile** und ein anpassbarer Kamera-Bag.
- **6 Schnellstart-Presets** sowie freie Auswahl von Motiv, Licht, Bewegung und Look.
- **5 Bereiche:** Kompass, Slots, Tasten, Wissen und Lightroom.
- Gespeicherte Auswahl und Checklisten im Browser.
- Lichtvorschlag anhand Standort und Wetter; bei Ausfällen eine Uhrzeitschätzung.
- Teilbare Einstellungslinks und eine als PNG speicherbare Karte.
- Installation als Web-App und Offline-Nutzung nach erfolgreichem Laden der benötigten Dateien.

## Eine Empfehlung an die Kamera übertragen

Wähle zuerst dein Motiv und die Aufnahmebedingungen. Die optionale Verbindung zeigt, welche Werte für ISO, Blende und Belichtungszeit im gewählten Modus übertragen werden können. Die Rückmeldung nennt den pro Feld zurückgelesenen Wert. Fokus, Stabilisierung und weitere manuelle Schritte bleiben im Kompass sichtbar.

Öffne im Kompass **Kameraverbindung & Profil** und wähle **Empfehlung als JSON speichern**. Öffne die lokale Anwendung auf dem Rechner am USB-Kabel, wähle **Profil aus Datei laden** und verbinde deine α6400 im USB-Modus **PC-Fernbedienung**. Stelle die Verbindung in der Oberfläche auf **USB am Computer** und lies die Istwerte ein. Prüfe die Vorschau und klicke auf **Einstellungen übertragen**. Zum Ausprobieren ohne Kamera gibt es eine gekennzeichnete Simulation. Für die lokale App steht die Prüfung an einem physischen Gerät aus. [Lokale Einrichtung](docs/DEVELOPMENT.md#lokale-usb-anwendung) · [Hardwareprotokoll](docs/plans/003-kameraverbindung-und-presettransfer.md#hardwareprotokoll)

**Windows 11 (x64):** Lade die Projekt-ZIP herunter, entpacke sie und verwende **Start-Kamera.cmd**. Die Windows-Anleitung führt dich durch die einmalige Einrichtung mit WSL 2, das sichere Erkennen deiner Kamera und den ersten Lesetest. Als separaten Versuch kannst du anschließend **Nur ISO übertragen**. [Windows-Anleitung mit ZIP-Download](docs/WINDOWS-USB.md)

## Eine Landschaftsaufnahme vorbereiten

Wähle im Kompass **Landschaft**, dein Objektiv und die aktuelle Brennweite. Für bewegte Blätter kannst du Wind angeben. Bei einem Wasserfall entscheidest du, ob das Wasser weich oder eingefroren erscheinen soll. Der Kompass zeigt die dazugehörigen Startwerte und führt dich durch die Kontrolle am Probebild.

Zu den aufklappbaren Hilfen gehören ND-Filter, Intervallaufnahmen, Langzeitbelichtung und Schärfentiefe. Bei einem misslungenen Foto hilft die Fehlerdiagnose, den nächsten Versuch zu planen. Modellgrenzen und Herstellerquellen stehen in der [Fachreferenz](docs/research/sony-a6400-kamera-objektive.md).

## Technischer Stand

- Statische Website mit **HTML, CSS und JavaScript**, aus Netlify nach GitHub exportiert.
- Der Kompass startet in [index.html](index.html). Die zuständigen Regel- und Oberflächenmodule beschreibt die [Architektur](docs/ARCHITECTURE.md).
- Der Browser lädt die Projektdateien direkt. Python 3 genügt für den lokalen Webserver.
- Einstellungen bleiben lokal im Browser. Für die Wetterfunktion werden nach Standortfreigabe gerundete Koordinaten an Open-Meteo gesendet.
- Bekannte technische Befunde und noch nicht geprüfte fachliche Aussagen stehen in [STATUS](docs/STATUS.md).

## Lokal starten

Mit Git und Python 3 im Terminal:

```bash
git clone https://github.com/frnkrm/sonya6400.git
cd sonya6400
python3 -m http.server 8080 --bind 127.0.0.1
```

Unter Windows mit Python-Launcher lautet der letzte Befehl `py -m http.server 8080 --bind 127.0.0.1`.

Dann **[http://localhost:8080/](http://localhost:8080/)** öffnen. Datei bearbeiten, Browser neu laden; `Strg+C` beendet den Server. Für Offline- und Browserfunktionen über `localhost` arbeiten.

## Dokumentation und nächste Schritte

| Datei | Wofür? |
| --- | --- |
| [STATUS](docs/STATUS.md) | Bestandsaufnahme, konkrete Befunde und Grenzen der bisherigen Prüfung |
| [ROADMAP](docs/ROADMAP.md) | Arbeitsstand, Prüfgrenzen und Ideen für spätere Vorhaben |
| [Erster Plan: Stabilisierung](docs/plans/001-stabilisierung.md) | Konkretes erstes Arbeitspaket mit Abnahmekriterien |
| [Plan 002: Landschaft und Kamerafunktionen](docs/plans/002-landschaft-und-kamerafunktionen.md) | Anforderungen und Abnahmekriterien für die 26 Punkte K-01 bis K-26 |
| [Plan 003: Kameraverbindung und Presetübertragung](docs/plans/003-kameraverbindung-und-presettransfer.md) | C-01 bis C-08: Übertragungsprofil, USB-Adapter, Rücklesung, Oberfläche und Abnahme |
| [Kamera- und Objektivrecherche](docs/research/sony-a6400-kamera-objektive.md) | Herstellerdaten, Aufnahmebeispiele, Grenzen und Quellen |
| [Verbindung und Presettransfer](docs/research/sony-a6400-verbindung-und-presettransfer.md) | Belegte Sony-/Community-Wege und offene Hardwareprüfungen H-01 bis H-10 |
| [Ursprünglicher Implementierungsauftrag](docs/CODEX-AUFTRAG.md) | Ausgangsauftrag der USB-Erweiterung |
| [Planvorlage](docs/plans/TEMPLATE.md) | Neue Ideen in umsetzbare Vorhaben übersetzen |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Dateien, Funktionen, Zustand, Wetter und Service Worker |
| [DEVELOPMENT](docs/DEVELOPMENT.md) | Einrichtung, Arbeitsablauf, gezielte Prüfungen und Netlify-Veröffentlichung |
| [AGENTS](AGENTS.md) | Projektregeln für spätere Entwicklungsaufträge und KI-Agenten |
| [CHANGELOG](CHANGELOG.md) | Nachvollziehbare Änderungen am Projekt |

Für ein neues Vorhaben zuerst STATUS und ROADMAP lesen, dann die Planvorlage verwenden. In den Ergebnisprotokollen der Pläne stehen die Abnahmekriterien und die ausgeführten Prüfungen.

## Veröffentlichung

Die Website wird auf Netlify gehostet. Änderungen am verbundenen Produktionsbranch können automatisch veröffentlicht werden. Einzelheiten und die zu prüfenden Einstellungen stehen in [DEVELOPMENT](docs/DEVELOPMENT.md#netlify).

Eine Open-Source-Lizenz wurde für dieses Repository noch nicht festgelegt.
