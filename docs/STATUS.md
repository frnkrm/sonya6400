# Bestandsaufnahme

Stand: **25.11.2026** · untersuchter Code: [`678e440`](https://github.com/frnkrm/sonya6400/commit/678e440489266b9fb514d9688f4d0f66c5a5543e).

[Überblick](../README.md) · [Architektur](ARCHITECTURE.md) · [Roadmap](ROADMAP.md) · [Erster Entwicklungsplan](plans/001-stabilisierung.md)

## Einschätzung

- Die App ist eine überschaubare Grundlage zur Weiterentwicklung: direkt bearbeitbares HTML, CSS und JavaScript.
- Die vorhandenen Funktionen reichen von Kameraempfehlungen bis zu Offline-Nutzung, Checklisten und Bildexport.
- Die regulären Auswahlkombinationen werden strukturell verarbeitet. Einige Fehlerfälle benötigen Absicherung, insbesondere beim Start und im Offline-Cache.
- Der aktuelle Dokumentationsauftrag behebt diese Fehler noch nicht. Die folgenden IDs dienen als gemeinsame Referenz für Pläne und spätere Änderungen.

## Was im Ausgangsstand vorhanden ist

| Bereich | Festgestellter Stand |
| --- | --- |
| Repository | Öffentlich, Standardbranch `main`; Ausgangsstand mit einem Import-Commit und elf Dateien |
| Anwendung | Fünf Bereiche, neun Objektivprofile, sechs Schnellstarts, fünf Setup-Karten |
| Umsetzung | HTML/CSS/JavaScript in `index.html`; zusätzlicher Service Worker und Manifest |
| Datenhaltung | Auswahl, Bag, zuletzt geöffneter Bereich und Checklisten in `localStorage` |
| Externe Daten | Open-Meteo für Wetter nach Browser-Standortfreigabe |
| Infrastruktur im Code | Kein Backend, keine Projektabhängigkeiten, kein Build-Skript |
| Qualitätssicherung | Keine versionierte Testsuite oder GitHub-Actions-Konfiguration im Ausgangsstand |
| Dokumentation | Vor diesem Dokumentations-Commit keine Markdown-Dateien |

Quellen: [ursprünglicher Dateibaum](https://github.com/frnkrm/sonya6400/tree/678e440489266b9fb514d9688f4d0f66c5a5543e), [Anwendung](../index.html), [Service Worker](../sw.js), [Manifest](../manifest.webmanifest).

## Tatsächlich ausgeführte Prüfungen

Die JavaScript-Funktionen wurden aus dem Originalcode in einer isolierten Node-Umgebung mit passenden Ersatzobjekten ausgeführt. Das war eine einmalige Analyse, keine bereits eingerichtete Testsuite.

| Prüfung | Ergebnis |
| --- | --- |
| `calc()`, `steps()` und Bokeh-Arithmetik für 9 × 4 × 4 × 3 × 2 Auswahlen | **864 von 864** ohne Ausnahme, fehlende Kernfelder oder nicht endliche Bokeh-Werte |
| Spezieller ungültiger Einstellungslink | Fehler bei der Verarbeitung reproduziert, siehe F-01 |
| Navigation mit simulierter HTTP-404-Antwort | Überschreiben des Offline-Eintrags reproduziert, siehe F-02 |
| Wetterantwort nach manueller Lichtwahl | Überschreiben der manuellen Wahl reproduziert, siehe F-03 |
| `wname(85)` und `wname(86)` | Ausgabe „Gewitter“ reproduziert, siehe F-04 |

**Grenzen:** Die 864 Fälle bestätigen Datenverarbeitung, nicht fotografische Richtigkeit. Vollständige Browser-, Mobilgeräte-, Installations-, Screenreader- und Live-Deployment-Tests wurden bei dieser Bestandsaufnahme nicht durchgeführt. Für den Import-Commit wurden keine GitHub-Checks oder Commit-Statusmeldungen gemeldet; daraus folgt kein erfolgreicher CI-Lauf.

## Nachgewiesene Fehler

### F-01 · P1 · Ungültige Auswahlwerte können den Start abbrechen

- **Status:** offen; isoliert reproduziert.
- **Stellen:** `index.html`, Einlesen von `st`, `readHash()`, `render()`.
- Gespeicherte Zustandswerte werden ohne vollständige Prüfung gegen erlaubte IDs übernommen.
- Die Prüfung in `readHash()` akzeptiert auch geerbte Objekt-Eigenschaften. Beispiel für ein lokales Testprofil: `#s=constructor.tag.steh.bokeh.tam`.
- Der Link wird angenommen; später scheitert die Verarbeitung mit `o.fl.split is not a function`.
- **Ziel:** Ein gemeinsamer Validator für alle fünf Auswahlfelder; ungültige Speicherwerte und Links führen zu sicheren Standardwerten. Bestehende gültige Links bleiben verwendbar.

### F-02 · P1 · Andere Seiten können den Offline-Einstieg überschreiben

- **Status:** offen; mit simuliertem Fetch-Ereignis reproduziert.
- **Stelle:** `sw.js`, Navigationszweig im Fetch-Handler.
- Jede Navigation derselben Origin speichert die Antwort unter `index.html`, auch andere Dokumente und HTTP-Fehler.
- Eine simulierte 404-Antwort für `/missing-page` wurde tatsächlich unter diesem Schlüssel gespeichert.
- **Folge:** Der nächste Offline-Start kann den falschen Inhalt erhalten. Das betrifft möglicherweise auch direkt besuchte, auf Netlify veröffentlichte Markdown-Dateien.
- **Ziel:** Nur erfolgreiche Antworten für den vorgesehenen App-Einstieg aktualisieren dessen Cache; Fehler und andere Dokumente lassen ihn intakt.

### F-03 · P2 · Wetterantwort überschreibt eine manuelle Lichtwahl

- **Status:** offen; Zustandsänderung isoliert reproduziert.
- **Stellen:** `index.html`, Auswahl-Listener, `detect()`, `setLight()`.
- Ein verspätetes Messergebnis schreibt bedingungslos in `st.licht`.
- Simulation: manuell `daemm` gesetzt, danach Wetterantwort mit `tag` verarbeitet; Ergebnis ist `tag`.
- **Ziel:** Manuelle Auswahl seit Beginn einer Anfrage behält Vorrang. Überholte Anfragen dürfen keine aktuellen Werte ersetzen.

### F-04 · P3 · Schneeschauer werden als Gewitter beschriftet

- **Status:** offen; Funktionsausgabe reproduziert und mit der API-Dokumentation abgeglichen.
- **Stelle:** `index.html`, `wname()`.
- Für die Codes 85 und 86 ergibt die vorhandene Bereichslogik „Gewitter“. Laut [Open-Meteo-Wettercodetabelle](https://open-meteo.com/en/docs?past_days=1) bezeichnen sie Schneeschauer.
- **Ziel:** Explizite Zuordnung der dokumentierten Wettercodes und neutrale Darstellung unbekannter Werte.

## Weitere Befunde mit offenen Browserprüfungen

| ID | Prio | Codebefund | Noch zu prüfen / Ziel |
| --- | --- | --- | --- |
| F-05 | P2 | `render()` ersetzt die Auswahlknöpfe bei jedem Klick vollständig | Tastaturfokus nach Enter/Leertaste erhalten; im Browser prüfen |
| F-06 | P2 | `sw.js` ignoriert einzelne Installationsfehler und löscht alle anderen Cache-Namen der Origin | Kritische Offline-Dateien verlässlich sichern; nur eigene alte Caches löschen; Fehlerfälle im Browser prüfen |
| F-07 | P2 | `controllerchange` zeigt „Neue Version geladen“, ohne die offene Seite neu zu laden | Zwischen verfügbarem und tatsächlich angezeigtem Update unterscheiden; Alt-Tab und installierte App prüfen |

Der Wetter-Fetch hat außerdem keinen eigenen Timeout und keine ausdrückliche HTTP-/Schema-Prüfung. Netzwerkabbrüche werden abgefangen; ein hängender oder formal unvollständiger Abruf ist gesondert zu behandeln.

## Fachliche und organisatorische offene Punkte

- Fotografische Regeln, Objektivgrenzen und Bedienhinweise anhand von Herstellerquellen und praktischen Szenarien prüfen. Die Anzeige `≥ 1/125` für eine Mindestverschlussgeschwindigkeit braucht beispielsweise eine eindeutige Formulierung als Belichtungsdauer.
- Die drei internen Speicher sind **kein festgestellter Fehler**: [Sonys α6400-Hilfe](https://helpguide.sony.net/ilc/1810/v1/de/contents/TP0002242297.html) beschreibt drei interne Speicher und zusätzliche Kartenplätze.
- Es fehlt eine festgelegte Projektlizenz. Die Wahl bleibt eine Entscheidung des Repository-Inhabers; diese Dokumentation ergänzt keine Lizenz.
- Aktueller Produktionsbranch, Publish-Verzeichnis und ein vollständiger Git-basierter Deploy sind im Netlify-Dashboard noch gesondert zu verifizieren. [DEVELOPMENT](DEVELOPMENT.md) enthält passende Sollwerte.
- Neue Produktwünsche und deren Reihenfolge sind noch offen; die [Roadmap](ROADMAP.md) kennzeichnet Vorschläge entsprechend.

## Pflege dieser Bestandsaufnahme

Bei einer Korrektur den Status der betreffenden ID ergänzen: Datum, Fix-Commit und tatsächlich ausgeführte Prüfung. Ein Eintrag bleibt offen, solange nur ein Plan oder eine Codeänderung ohne passenden Nachweis vorliegt. Neue Fehler erhalten eine neue ID; bestehende IDs nicht neu vergeben.
