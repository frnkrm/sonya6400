# Architektur

Kompass, Werkzeuge, Simulation und Profil-Export laufen im Browser. Die statischen Dateien im Repository-Stamm bilden die Netlify-Site. Für eine USB-Verbindung liefert ein lokaler Node-Dienst dieselbe Bedienoberfläche auf dem Rechner am Kamerakabel aus.

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

## Optionale Kameraanbindung

Die eigentliche Aufnahmeabsicht entsteht bei der gemeinsamen Berechnung in `camera.js`. Neben den deutschen Anzeigetexten liefert die Regel strukturierte Zielwerte. Die gespeicherten Einstellungen des Kompasses und seine Einstellungslinks beschreiben weiterhin die gewünschte Aufnahme. Die Rücklesung einer angeschlossenen Kamera erscheint separat als Istwert.

### Profil für Export und Import

[transfer-profile.js](../transfer-profile.js) prüft die JSON-Struktur beim Import. Version 1 enthält `version`, `model`, `mode`, `lens`, `focalMm`, `aperture`, `iso` und `shutter`. Die Brennweite in Millimetern stammt aus der manuellen Objektivauswahl. Das Modell ist `ILCE-6400`, der Modus A oder M. Unbekannte Felder, Profilversionen und ungültige Zahlen führen zu einer Fehlermeldung.

| Aufnahmewunsch | Maschinenlesbare Angabe | Wirkung |
| --- | --- | --- |
| Feste ISO | `iso.kind = "fixed"`, `value` | Konkreter Empfindlichkeitswert |
| Auto ISO | `iso.kind = "auto"`, `min` und `max` | Automatik und gewünschte Grenzen sind eigenständige Angaben |
| Feste Zeit in M | `shutter.kind = "fixed"`, `seconds` | Zielzeit in Sekunden |
| Zeitstrategie in A | `shutter.kind = "metered"` oder `"minAuto"` mit `seconds` | Kamera misst die Zeit. Bei Auto ISO kann eine Umschaltschwelle hinzukommen |

Ein vollständiges Beispiel für weite Berge aus der Hand mit dem Tamron B070:

```json
{
  "version": 1,
  "model": "ILCE-6400",
  "mode": "A",
  "lens": "tam",
  "focalMm": 17,
  "aperture": 8,
  "iso": { "kind": "auto", "min": 100, "max": 3200 },
  "shutter": { "kind": "minAuto", "seconds": 0.008 }
}
```

0,008 Sekunden entsprechen 1/125 s. Diese Schwelle und die beiden ISO-Grenzen sind manuelle Schritte. Die laufende Verbindung kann Auto ISO als einzelnen Zielwert anfordern, wenn das Gerät diese Wahl anbietet. Blendenzahl und Brennweite werden gegen das gewählte Objektivprofil geprüft. Für den Schreibvorgang zählen zusätzlich die aktuell vom Gerät angebotenen Werte. Unterstützt die Verbindung eine Einstellung nicht, bleibt sie als manueller Schritt sichtbar.

### Verbindungsablauf

[transfer-ui.js](../transfer-ui.js) zeigt die Vorschau für die aktuelle Empfehlung oder ein importiertes Profil. [transfer-engine.js](../transfer-engine.js) vergleicht das Ziel mit den aktuellen Fähigkeiten und Istwerten des Adapters. Der Modus bleibt eine manuelle Voraussetzung. Bereits passende und nicht schreibbare Felder werden in der Vorschau gekennzeichnet. Beim Übertragen erfolgen Schreibversuch und Rücklesung pro Feld nacheinander. Ablehnung, Abweichung und fehlende Bestätigung erscheinen in den Teilergebnissen.

[local/server.js](../local/server.js) bedient die Loopback-Origin. Nach Sitzungsaufbau benötigt eine USB-Aktion die dazugehörige Sitzung und den lokalen Ursprung. Zum Schreiben ist zusätzlich die zu dieser Sitzung gehörende gelesene Vorschau nötig. Eine laufende Kameraaktion sperrt konkurrierende Zugriffe. [local/gphoto.js](../local/gphoto.js) startet gphoto2 mit getrennten Argumenten und wertet Modell, Modus, aktuelle Werte und verfügbare Optionen aus den tatsächlich gemeldeten Konfigurationseigenschaften aus.

### Zwei Verbindungswege

- Die gekennzeichnete **Simulation** liefert kontrollierte Fähigkeiten und Istwerte im Browser. Ein Profil lässt sich auf diese Weise auch offline ausprobieren.
- Für **USB** startet der Benutzer auf dem Linux-Rechner [local/server.js](../local/server.js). Dieser Dienst hört auf Loopback und liefert die Oberfläche auf derselben Origin wie die lokale API. Die Sitzung ist lokal gebunden. Der USB-Adapter liest die gphoto2-Konfiguration des erkannten Geräts und gleicht Sollwert, angebotene Auswahl und Rücklesung je Feld ab.
- Die öffentliche Website übergibt ihre Empfehlung als JSON-Datei. Zum tatsächlichen Schreiben wird die Datei auf dem Rechner am Kabel eingelesen, geprüft und bewusst übertragen. Die Verbindungshilfe deckt auch Sonys getrennte WLAN-/NFC-Verbindung über Imaging Edge Mobile ab. [Einrichtung](DEVELOPMENT.md#lokale-usb-anwendung) · [Verbindungsrecherche](research/sony-a6400-verbindung-und-presettransfer.md)


### Windows mit WSL 2

Auf Windows 11 x64 startet `Start-Kamera.cmd` den Node-Dienst auf der Windows-Seite. Der Adapter startet die Windows-Systemdatei `wsl.exe` mit `--distribution Ubuntu` und `--exec`. Im Gast setzt `/usr/bin/env` die Sprache für die gphoto2-Ausgabe und `/usr/bin/timeout` begrenzt die Laufzeit. gphoto2 erhält die einzelnen Argumente direkt. Die Ubuntu-Distribution greift über usbipd-win auf das zuvor ausgewählte USB-Gerät zu. Linux verwendet gphoto2 direkt. Beide Varianten verwenden dieselbe Fähigkeitsprüfung und Rücklesung.

**Nur ISO übertragen** begrenzt den bewussten Schreibversuch auf das ISO-Feld der aktuellen Vorschau. Die vollständige Profilübertragung bleibt eine eigene Aktion. Die [Windows-Anleitung](WINDOWS-USB.md) führt durch die Zuordnung der Kamera über BUSID und den Vergleich von Zielwert, Rücklesung und Kameradisplay.
