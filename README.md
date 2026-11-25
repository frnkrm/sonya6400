# Sony α6400 Spickzettel

Eine deutschsprachige Web-App mit Kamera-Empfehlungen für Porträt, Street, Gruppenfotos und City Lights.

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

## Technischer Stand

- Statische Website mit **HTML, CSS und JavaScript**, aus Netlify nach GitHub exportiert.
- Der bearbeitbare Anwendungscode steckt in [`index.html`](index.html); Offline-Verhalten in [`sw.js`](sw.js).
- Kein Framework, Backend, Paketmanager oder Build-Schritt im Ausgangsstand.
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
| [ROADMAP](docs/ROADMAP.md) | Prioritäten und vorgeschlagene Entwicklungsschritte |
| [Erster Plan: Stabilisierung](docs/plans/001-stabilisierung.md) | Konkretes erstes Arbeitspaket mit Abnahmekriterien |
| [Planvorlage](docs/plans/TEMPLATE.md) | Neue Ideen in umsetzbare Vorhaben übersetzen |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Dateien, Funktionen, Zustand, Wetter und Service Worker |
| [DEVELOPMENT](docs/DEVELOPMENT.md) | Einrichtung, Arbeitsablauf, gezielte Prüfungen und Netlify-Veröffentlichung |
| [AGENTS](AGENTS.md) | Projektregeln für spätere Entwicklungsaufträge und KI-Agenten |
| [CHANGELOG](CHANGELOG.md) | Nachvollziehbare Änderungen am Projekt |

Für ein neues Vorhaben zuerst STATUS und ROADMAP lesen, dann die Planvorlage verwenden. Die Pläne beschreiben künftige Arbeit; offene Punkte sind noch keine implementierten Funktionen.

## Veröffentlichung

Die Website wird auf Netlify gehostet. Änderungen am verbundenen Produktionsbranch können automatisch veröffentlicht werden. Einzelheiten und die zu prüfenden Einstellungen stehen in [DEVELOPMENT](docs/DEVELOPMENT.md#netlify).

Eine Open-Source-Lizenz wurde für dieses Repository noch nicht festgelegt.
