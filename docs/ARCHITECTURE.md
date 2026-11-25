# Architektur

Die App läuft vollständig im Browser. Die statischen Dateien im Repository-Stamm bilden die Netlify-Site und den lokalen Entwicklungsstand. Die α6400, das Objektiv und deren Einstellungen werden vom Benutzer gewählt. Die Website benötigt weder eine Kameraverbindung noch ein Backend.

## Einstieg und Verantwortlichkeiten

| Datei | Verantwortung |
| --- | --- |
| [index.html](../index.html) | Fünf Bereiche, sechs Schnellstarts, Bag, Speicher, Dialoge, Teilen, Wetter und Verknüpfung der Module |
| [legacy.js](../legacy.js) | Ausgangsempfehlungen für Porträt, Gruppe, Street und City |
| [camera.js](../camera.js) | Neun konkrete Objektivprofile, gültige Brennweiten und Blenden, Landschaftsszenarien und gemeinsame Ableitung der Empfehlung |
| [guide-ui.js](../guide-ui.js), [guide.css](../guide.css) | Brennweite, situationsabhängige Landschaftseingaben, Begründungen und Aufnahmecheckliste |
| [photo-tools.js](../photo-tools.js), [photo-tools.css](../photo-tools.css) | Ausgabeformat und Kamerahilfen für Reihen, Verschluss, Langzeitbelichtung, ND, Intervall, Schärfentiefe und Fehlerdiagnose |
| [sw.js](../sw.js) | Installation der Offline-Dateien, Navigation und Versionswechsel |
| [manifest.webmanifest](../manifest.webmanifest), PNG-Dateien | Startadresse, Standalone-Modus, App-Icons und Vorschaubild |
| [_headers](../_headers), [robots.txt](../robots.txt), [sitemap.xml](../sitemap.xml) | HTTP-Header für Netlify und Metadaten für Suchmaschinen |
| [tests](../tests) | Regeltests und End-to-End-Prüfungen im Browser |

## Von der Auswahl zur Aufnahme

1. Die App liest Bag, Auswahl und zuletzt geöffneten Bereich. Ein gültiger Einstellungslink liefert die Werte für den Start.
2. Eingaben werden auf erlaubte IDs und auf den Brennweitenbereich des aktiven Objektivs geprüft. Bei einer unbekannten Zwischenblende eines Zooms greift eine konservative Grenze.
3. Bei Landschaft bestimmen unter anderem Wind, Stativ, Brennweite und Bildziel die Zeitstrategie. Bei den vier älteren Motiven fließen deren bisherigen Regeln in dieselbe Berechnung der tatsächlich empfohlenen Werte ein.
4. Der Kompass rendert Werte und Bedienfolge. Die Teilen-Karte bezieht ihre Angaben aus derselben Empfehlung. Die gespeicherten Slot-Checklisten verwenden stabile IDs. Die Werkzeuge rechnen lokal mit den sichtbaren Eingaben.

Der Kleinbildvergleich beschreibt den Bildwinkel. Für Zeit- und Schärfentiefenrechnungen zählt die tatsächliche Brennweite. Die Bokeh-Anzeige drückt eine relative Wirkung bei angenommenem gleichem Motivabstand aus. Annahmen und Herstellerquellen dokumentiert die [Fachreferenz](research/sony-a6400-kamera-objektive.md).

## Gespeicherte Auswahl und Links

| Schlüssel | Inhalt |
| --- | --- |
| `st` | Auswahl im Kompass als JSON, mit geprüften Standardwerten für fehlende Felder |
| `bag` | JSON-Liste der Objektiv-IDs |
| `tab` | Zuletzt geöffneter Bereich von `t1` bis `t5` |
| `ck0_0` bis `ck4_3` | 20 Haken in den fünf ursprünglichen Slot-Karten |

`st` speichert unter anderem Motiv, Licht, Bewegung, Look und Objektiv. Für frühere Daten ergänzt die Normalisierung die kurze Brennweite des aktiven Objektivs, RAW, Handaufnahme, ruhige Berge und Fokus auf die Ferne. Bei einem Zoom wird die manuelle Brennweite auf den Modellbereich begrenzt. Die neue situative Aufnahmecheckliste gehört zur gerade gewählten Einstellung und ist von den dauerhaft gespeicherten Slot-Haken unabhängig.

Ein bestehender Link wie `#s=portrait.tag.steh.bokeh.s50` bleibt lesbar. Neue Links hängen Zusatzfelder im selben Fragment an, beispielsweise `#s=landscape.tag.steh.sweet.tam&mm=70&scene=detail`. Ein gültiger Link öffnet den Kompass auch beim Wechsel im selben Tab. Ein verlinktes Objektiv außerhalb des Bags bleibt vorübergehend auswählbar. Beim Bearbeiten passt sich das Fragment an die neue Einstellung an. Der Speicherwrapper hält Einstellungen während der Sitzung im Arbeitsspeicher, falls der Browser den dauerhaften Zugriff verweigert.

## Wetter und Offline-Betrieb

Für die Lichtschätzung kann der Browser nach Standortfreigabe auf drei Nachkommastellen gerundete Koordinaten an Open-Meteo senden. Jede Messung ist einer Anfrage zugeordnet. Manuelle Lichtwahl, Schnellstart und eine neuere Messung haben Vorrang vor verspäteten Ergebnissen. Bei abgelehntem Standort oder fehlenden Wetterdaten schätzt die App das Licht anhand der Uhrzeit. Ein gültiger Einstellungslink und eine gespeicherte manuelle Lichtwahl lassen die automatische Startmessung aus. Das Feld `autoLight` merkt sich automatisch bestimmte Werte, damit beim nächsten regulären Start eine neue Schätzung möglich ist. Ältere Speicherstände mit gültiger Lichtwahl gelten als manuell. „Neu messen“ fordert ausdrücklich einen neuen Vorschlag an.

Das Manifest verwendet relative Start- und Scope-Adressen. Der Service Worker sichert die Anwendungsdateien für den Offline-Start. Die Dateiliste und Cache-Version stehen im Worker. Die zugehörige Marke `app-release` im HTML muss mit der Version übereinstimmen. Pflichtdateien werden vor Aktivierung auf HTTP-Status und Typ geprüft. Nur erfolgreiche passende HTML-Antworten für den jeweiligen App-Einstieg können den Offline-Stand aktualisieren. Bei einem Wechsel von einer älteren Cache-Fassung navigiert der Worker die bereits geöffneten App-Fenster erneut. Bei einer neuen Runtime gehören die Prüfung eines frischen Profils und der Versionswechsel eines bereits geöffneten Clients zur Abnahme. Die Entwicklungsanleitung beschreibt die Testbefehle und die getrennte Kontrolle auf der Produktionsdomain. [Entwicklung und Veröffentlichung](DEVELOPMENT.md)
