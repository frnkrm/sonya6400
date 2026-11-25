# Architektur

Stand: 25.11.2026 · analysierter Ausgangscommit: [`678e440`](https://github.com/frnkrm/sonya6400/commit/678e440489266b9fb514d9688f4d0f66c5a5543e).

## Aufbau in einem Blick

- Statische, deutschsprachige Web-App für Kamera-Empfehlungen zur Sony α6400.
- HTML, CSS, Daten und Anwendungslogik stehen gemeinsam in [`index.html`](../index.html).
- JavaScript ohne Framework; kein Paketmanager, Build-Schritt oder Backend im Ausgangsstand.
- Netlify liefert die Dateien aus. Berechnung und Speicherung passieren im Browser.
- Die App zeigt Empfehlungen; sie liest oder verändert keine Einstellungen einer verbundenen Kamera.

## Dateien und Verantwortung

| Datei | Aufgabe |
| --- | --- |
| [`index.html`](../index.html) | Oberfläche, Fotografie-Inhalte, Empfehlungsregeln, Zustand, Teilen und Wetterabruf |
| [`sw.js`](../sw.js) | Service Worker für Offline-Nutzung und Cache-Verwaltung |
| [`manifest.webmanifest`](../manifest.webmanifest) | Name, Startadresse, Darstellungsmodus, Sprache und Icons der installierbaren App |
| [`_headers`](../_headers) | Netlify-Header für Cache, Manifest-Typ und Browser-Berechtigungen |
| [`robots.txt`](../robots.txt), [`sitemap.xml`](../sitemap.xml) | Suchmaschinen-Hinweise und öffentliche Startadresse |
| `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | App-Icons |
| `apple-touch-icon.png`, `og-image.png` | Homescreen-Icon und Vorschau beim Teilen einer Website-Adresse |

## Oberfläche und Funktionen

| Bereich | Inhalt |
| --- | --- |
| Kompass (`t1`) | Objektiv, Motiv, Licht, Bewegung und Look; sechs Schnellstart-Presets; Einstellungen und Schrittfolge |
| Slots (`t2`) | Fünf im Code definierte Setup-Karten mit jeweils vier gespeicherten Kontrollkästchen |
| Tasten (`t3`) | Vorschläge für Custom-Tasten, Fn-Menü und Mein Menü |
| Wissen (`t4`) | Fotografie-Hinweise in aufklappbaren Abschnitten |
| Lightroom (`t5`) | Bearbeitungsvorschläge für ARW-Dateien |

Weitere Funktionen: Objektivauswahl im „Bag“, Installationshinweise, teilbarer Einstellungslink und lokal erzeugte PNG-Karte.

Die Fotografie-Angaben sind vorhandene Anwendungsinhalte. Ihre technische Richtigkeit wurde durch diese Architekturaufnahme nicht bestätigt.

## Datenmodell

Alle Tabellen liegen im Anwendungsskript von `index.html`:

- **`LENS`**: neun Objektivprofile; Namen, Blendenbereiche, Stabilisierung, Gruppenabstände und Brennweiten je Motiv.
- **`OPT`**: auswählbare Werte für Motiv, Licht, Bewegung und Look. Die Objektivoptionen werden aus dem Bag abgeleitet.
- **`PRE`**: sechs Presets; sie ändern Motiv, Licht, Bewegung und Look, behalten aber das gewählte Objektiv bei.
- **`SL`**: fünf feste Setup-Karten einschließlich Hinweisen und Checklisten. Sie werden unabhängig von `calc()` gepflegt.
- **`st`**: aktuelle Auswahl mit `lens`, `motiv`, `licht`, `bew`, `look`.
- **`bag`**: eingeblendete Objektiv-IDs; standardmäßig `tam`, `s50`, `t210`. Die Oberfläche lässt mindestens ein Objektiv aktiv.

### Gespeicherter Zustand

Der Wrapper `S` liest und schreibt `localStorage`. Bei Speicherfehlern nutzt er einen flüchtigen Speicher für die laufende Seite.

| Schlüssel | Format / Inhalt |
| --- | --- |
| `st` | JSON-Objekt der aktuellen Auswahl |
| `bag` | JSON-Liste der eingeblendeten Objektiv-IDs |
| `tab` | Zuletzt gewählter Bereich, z. B. `t1` |
| `ck0_0` bis `ck4_3` | 20 Checklistenwerte, jeweils `"1"` oder `"0"` |

Es gibt keine Anmeldung, Gerätesynchronisierung oder Exportfunktion für diesen gespeicherten Zustand. Standort und Wetter werden im vorhandenen Code nicht in `localStorage` abgelegt. Die Schlüssel haben bisher weder einen gemeinsamen Präfix noch eine Schema-Version.

## Wichtige Funktionen

| Funktion | Verantwortung |
| --- | --- |
| `calc(s)` | Leitet Modus, Slot, Blende, Zeit, ISO, Fokus, Brennweite, EV, Weißabgleich, Drive und Hinweise aus einer Auswahl ab |
| `steps(s, o)` | Formuliert eine Bedienfolge aus Auswahl und berechneter Empfehlung |
| `render()` | Erzeugt Auswahlknöpfe, Ergebnisanzeige, relative Bokeh-Anzeige und Bedienfolge neu |
| `showTab(id)` | Wechselt den sichtbaren Bereich und speichert dessen ID |
| `renderSlots()` | Zeichnet die festen Setup-Karten und gespeicherten Haken |
| `openMd()` / `closeMd()` | Öffnen und schließen den gemeinsamen Dialog; verwalten Fokus und inaktiven Hintergrund |
| `readHash()` / `shareUrl()` | Lesen beziehungsweise erzeugen einen Einstellungslink |
| `drawCard()` / `cardBlob()` | Zeichnen eine 1080 × 1350 Pixel große Karte und erzeugen daraus ein PNG |
| `detect()` / `setLight()` / `byClock()` | Ermitteln Licht anhand Standort und Wetter oder ersatzweise der Geräteuhr |

Die Bokeh-Prozentzahl ist eine interne Näherung aus Brennweite und Blende bei angenommenem gleichem Motivabstand. Sie ist keine Messung der Schärfentiefe.

## Start und Änderungen

1. Gespeicherte Auswahl und Bag werden eingelesen; Ereignisse werden verbunden.
2. Ein gültiger Link-Hash überschreibt die Auswahl.
3. `render()` und `renderSlots()` bauen die dynamische Oberfläche auf.
4. Ohne gültigen Einstellungslink startet automatisch `detect()`. Mit Link startet keine automatische Wetterabfrage.
5. Der zuletzt gespeicherte Bereich wird wieder geöffnet.
6. Beim `load`-Ereignis wird nach Möglichkeit `sw.js` registriert.

Ein Klick auf einen Auswahlknopf oder ein Preset speichert `st` und ruft `render()` auf. Eine Bag-Änderung speichert `bag` und zeichnet die Auswahl neu.

### Einstellungslinks und Teilen

Das Fragment hat dieses Format:

```text
#s=<motiv>.<licht>.<bew>.<look>.<lens>
#s=portrait.tag.steh.bokeh.s50
```

- `readHash()` prüft die IDs gegen die im Code vorhandenen Wertetabellen.
- Ein im Link enthaltenes Objektiv wird bei Bedarf für die laufende Seite zum Bag ergänzt.
- Der Hash wird beim Start gelesen; ein eigener `hashchange`-Handler ist nicht vorhanden.
- PNGs werden im Browser gezeichnet. Teilen verwendet die Web Share API; alternativ wird das Bild heruntergeladen.
- „Link kopieren“ verwendet die Clipboard API und zeigt bei einem Fehler die Adresse als Text.

## Wetter und externe Dienste

`detect()` fragt die Browser-Geolocation mit acht Sekunden Standort-Timeout und höchstens zehn Minuten alten Standortdaten ab. Bei Freigabe sendet die App auf drei Nachkommastellen gerundete Koordinaten an `https://api.open-meteo.com/v1/forecast`.

- Angefordert werden Temperatur, Wettercode, Bewölkung, Sonnenaufgang und Sonnenuntergang.
- Lichtklassen entstehen aus Bewölkung sowie einem Zeitfenster von 45 Minuten um Sonnenaufgang und Sonnenuntergang.
- Bei fehlendem Standort oder einem fehlgeschlagenen Wetterabruf schätzt `byClock()` anhand der lokalen Geräteuhr.
- Der Wetterabruf selbst hat im Ausgangscode keinen eigenen Timeout.
- Weitere externe Datenabrufe, Analyse-Skripte oder serverseitige API-Schlüssel sind im Anwendungscode nicht vorhanden.

## Offline-Verhalten und Installation

[`manifest.webmanifest`](../manifest.webmanifest) verwendet relative Start- und Scope-Adressen (`./`), `standalone` und Hochformat. Der App-Dialog erklärt die Installation über das Browsermenü.

Der Service Worker verwendet derzeit den Cache-Namen **`a6400-v3`**:

- **Installation:** lädt Startseite, Manifest und Icons aus `SHELL`; einzelne Ladefehler werden abgefangen. Danach folgt `skipWaiting()`.
- **Aktivierung:** löscht alle anderen Cache-Namen derselben Origin und übernimmt Clients mit `clients.claim()`.
- **Navigation:** versucht zuerst das Netz und legt die Antwort unter `index.html` ab; bei einem Netzfehler wird eine gespeicherte Startseite verwendet.
- **Andere GET-Anfragen derselben Origin:** bevorzugen den Cache und starten parallel einen Netzabruf zur Aktualisierung.
- **Fremde Origins und andere HTTP-Methoden:** werden nicht vom Fetch-Handler übernommen. Wetter bleibt damit eine Online-Funktion.

Offline-Nutzung setzt bereits erfolgreich gespeicherte Dateien voraus. Der Update-Handler in `index.html` zeigt bei einem Controller-Wechsel einen Hinweis, lädt die bereits offene Seite aber nicht automatisch neu.

## Grenzen für die Weiterentwicklung

- `calc()`, `SL`, statische Wissensabschnitte und erzeugte Bedienfolgen enthalten teilweise dieselben fachlichen Regeln. Änderungen müssen diese Stellen gemeinsam berücksichtigen.
- HTML wird an mehreren Stellen aus internen Daten zusammengesetzt. Neue externe oder frei eingegebene Inhalte benötigen passende Validierung und sichere Ausgabe.
- Gespeicherte Werte und geteilte Links bilden bestehende Datenformate. Umbenennungen brauchen eine bewusst geplante Migration.
- Cache-Verhalten bei Fehlerantworten und anderen Seiten, Zustand bei alten Speicherwerten sowie die Wetterautomatik benötigen gezielte Prüfung; siehe [Bestandsaufnahme](STATUS.md).
- Canonical-URL, Open-Graph-Daten, JSON-LD, `robots.txt` und `sitemap.xml` verwenden die feste Produktionsdomain. Ein Domainwechsel betrifft alle diese Stellen.
- Die derzeitige Struktur kann ohne Framework weiterentwickelt werden. Eine spätere Aufteilung von CSS, Daten und Logik ist eine eigene Änderung mit Regressionstests.
