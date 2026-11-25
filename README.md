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

Die App zeigt Empfehlungen. Sie steuert keine Kamera und überträgt keine Einstellungen an die α6400.

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
| [Kamera- und Objektivrecherche](docs/research/sony-a6400-kamera-objektive.md) | Herstellerdaten, Aufnahmebeispiele, Grenzen und Quellen |
| [Planvorlage](docs/plans/TEMPLATE.md) | Neue Ideen in umsetzbare Vorhaben übersetzen |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Dateien, Funktionen, Zustand, Wetter und Service Worker |
| [DEVELOPMENT](docs/DEVELOPMENT.md) | Einrichtung, Arbeitsablauf, gezielte Prüfungen und Netlify-Veröffentlichung |
| [AGENTS](AGENTS.md) | Projektregeln für spätere Entwicklungsaufträge und KI-Agenten |
| [CHANGELOG](CHANGELOG.md) | Nachvollziehbare Änderungen am Projekt |

Für ein neues Vorhaben zuerst STATUS und ROADMAP lesen, dann die Planvorlage verwenden. In den Ergebnisprotokollen der Pläne stehen die Abnahmekriterien und die ausgeführten Prüfungen.

## Veröffentlichung

Die Website wird auf Netlify gehostet. Änderungen am verbundenen Produktionsbranch können automatisch veröffentlicht werden. Einzelheiten und die zu prüfenden Einstellungen stehen in [DEVELOPMENT](docs/DEVELOPMENT.md#netlify).

Eine Open-Source-Lizenz wurde für dieses Repository noch nicht festgelegt.
