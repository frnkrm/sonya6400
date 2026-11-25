# Plan 002 — Landschaft und Kamerafunktionen

## Eckdaten

- **Status:** Geplant; Implementierung offen.
- **Erstellt / aktualisiert:** 2026-11-25 / 2026-11-25.
- **Umfang:** Alle 26 recherchierten Funktionspunkte sind in die Entwicklungsplanung aufgenommen.
- **Kennungen:** `K-01` bis `K-26` entsprechen unverändert den Punkten 1 bis 26 der Recherche. `F-01` bis `F-07` bleiben die getrennten technischen Befunde.
- **Basis:** [`c1b50a9b7d7eddc2156225a6e25f53a691323eb1`](https://github.com/frnkrm/sonya6400/commit/c1b50a9b7d7eddc2156225a6e25f53a691323eb1).
- **Einordnung:** [Roadmap](../ROADMAP.md), [Bestandsaufnahme](../STATUS.md), [Recherche und Herstellerquellen](../research/sony-a6400-kamera-objektive.md).

Dieser Plan beschreibt künftige Arbeit. Das Anlegen der Dokumentation implementiert keine der Funktionen und schließt keinen bestehenden Fehler ab. Termine und Aufwandsschätzungen sind noch nicht festgelegt.

## Problem und Ziel

Die vorhandene App bietet Empfehlungen für Porträt, Gruppe, Street und City. Für ganze Landschaften mit Bergen, Bäumen, Wald und Wasser fehlen eigene Auswahlmöglichkeiten und Regeln. Außerdem sollen Brennweite, Objektivgrenzen, Stabilisierung und die tatsächlichen Möglichkeiten der α6400 genauer zusammenwirken.

Ziel ist ein verständlicher Ablauf: Situation auswählen, passende Startwerte erhalten und erfahren, was am Probebild zu prüfen ist. Einstellungen werden erklärt; die Website steuert keine Kamera und kennt weder deren tatsächliche Belichtung noch ihre aktuelle Zoomstellung automatisch.

**Betroffener Code bei der späteren Umsetzung:** [`index.html`](../../index.html), insbesondere `LENS`, `OPT`, `PRE`, `calc()`, `steps()`, `SL`, Wissenstexte, `render()`, Speicherung, Einstellungslinks und PNG-Ausgabe. Bei Änderungen an gecachten Dateien ist [`sw.js`](../../sw.js) zu berücksichtigen. Ein Framework-Wechsel gehört nicht zu diesem Plan.

## Gemeinsame Regeln

- Die [Fachreferenz](../research/sony-a6400-kamera-objektive.md) trennt Herstellerdaten, fotografische Startwerte und noch fehlende Angaben. Diese Trennung muss auch in den Empfehlungen sichtbar bleiben.
- Objektivdaten gelten für die genaue Modellvariante. Der aktuelle Bag ist kein Nachweis des tatsächlichen Besitzes aller neun Profile.
- Belichtungszeit, ISO, Blende, Fokus und Stabilisierung gemeinsam bestimmen; widersprüchliche Wünsche sichtbar machen. Weiches Wasser und scharfe Blätter im Wind können unterschiedliche Aufnahmen verlangen.
- Eine kurze Haupterklärung anzeigen und Vertiefungen auf Wunsch öffnen. Keine 26 gleichzeitigen Pflichtfragen einführen.
- Empfehlungen in Kompass, Schrittfolge, Slots, Wissen und PNG-Karte müssen zusammenpassen. Dieselbe fachliche Regel nicht unabhängig mit abweichenden Werten pflegen.
- Manuelle Angaben haben Vorrang vor Wettervorschlägen. Wetterdaten ersetzen keine Belichtungsmessung und keine Beobachtung der Bewegung vor Ort.

## Anforderungen und Abnahme

Die folgenden Kästchen bleiben offen, bis die jeweilige Funktion umgesetzt und überprüft ist. Die genannten Prüfungen sind Ziele für spätere Funktionsänderungen, keine bereits durchgeführten Tests.

### Landschaft und Aufnahmesituation

#### K-01 · Eigener Landschaftsmodus

- **Anforderung:** Ganze Landschaften mit Bergen, Wald, See und weiten Ansichten als eigenes Motiv anbieten. Blende, Zeitstrategie, ISO und Fokus aus den Landschaftseingaben ableiten.
- [ ] **Abnahme:** Eine weite Berglandschaft lässt sich ohne Porträt- oder Freistellungsziel auswählen. Eine vollständige Empfehlung und Bedienfolge erscheinen; bisherige Motive bleiben verwendbar.

#### K-02 · Hand oder Stativ

- **Anforderung:** Aufnahmeart abfragen und Auslösung, Zeitstrategie sowie vorhandene Objektivstabilisierung entsprechend berücksichtigen.
- [ ] **Abnahme:** Der Wechsel zwischen Hand und Stativ verändert die betroffenen Hinweise nachvollziehbar. Bei Stativ wird eine passende Auslöseverzögerung erklärt; nach Rückkehr zur Hand wird der Stabilisierungsstatus erneut berücksichtigt.

#### K-03 · Wind und Bewegung

- **Anforderung:** Ruhige, leicht bewegte und stark bewegte Landschaft unterscheiden. Zeitvorschläge nach gewünschter Schärfe bewegter Bildteile richten.
- [ ] **Abnahme:** Bei bewegten Blättern wird eine kürzere Zeitstrategie als bei ruhiger Landschaft angeboten. Das gilt auch mit Stativ; Stabilisierung wird nicht als Mittel zum Einfrieren von Bewegung dargestellt.

#### K-04 · Naher Vordergrund und Ferne

- **Anforderung:** Abfragen, ob zusätzlich zur Ferne ein naher Vordergrund scharf erscheinen soll. Blende und Fokus mit einer Kontrolle beider Entfernungen verbinden.
- [ ] **Abnahme:** „Nur entfernte Berge“ und „nahe Steine plus Berge“ erzeugen unterschiedliche Fokushinweise. Weder Unendlichstellung noch eine pauschale Ein-Drittel-Regel werden als Schärfegarantie ausgegeben.

#### K-05 · Fokushelfer

- **Anforderung:** AF-S, DMF und MF situationsgerecht erklären und den Weg zu Fokuslupe und Peaking zeigen. Menüangaben für die α6400 aus der Fachreferenz verwenden.
- [ ] **Abnahme:** Für eine ruhende Landschaft und für schlecht automatisch fokussierbare Sterne erscheinen passende Abläufe. Peaking bleibt eine Orientierungshilfe; die vergrößerte Schärfeprüfung wird erklärt.

#### K-06 · Wasser gestalten

- **Anforderung:** Weiches Wasser und eingefrorene Bewegung als unterschiedliche Bildziele anbieten; Zeit, Stativ und möglichen ND-Bedarf zusammen erklären.
- [ ] **Abnahme:** Beide Ziele führen zu unterschiedlichen Zeitvorschlägen. Bei „weiches Wasser + Wind“ wird die mögliche Unschärfe von Blättern genannt und eine bewusste Prioritätswahl angeboten.

#### K-07 · Sonnenaufgang und Sonnenuntergang

- **Anforderung:** Hellen Himmel, Gegenlicht und dunklen Vordergrund berücksichtigen; Einzelaufnahme, Belichtungskontrolle und gegebenenfalls Belichtungsreihe erklären.
- [ ] **Abnahme:** Die Anleitung enthält eine Prüfung wichtiger heller Bildteile und eine nachvollziehbare Alternative bei zu großem Kontrast. Eine Uhrzeit allein bestimmt keine vermeintlich exakte Belichtung.

#### K-08 · Schnee und Nebel

- **Anforderung:** Graue Darstellung heller Szenen, wenig Kontrast für den Fokus und die gewünschte Farbstimmung behandeln. Belichtungskorrektur schrittweise prüfen lassen.
- [ ] **Abnahme:** Die Anleitung empfiehlt eine Probebelichtung und eine anschließende Korrektur mit Kontrolle heller Details. Sie verordnet weder immer denselben positiven EV-Wert noch eine einzige zwingende Weißabgleichseinstellung.

#### K-09 · Sternenhimmel

- **Anforderung:** Einen Ablauf für geeignete Brennweite, Stativ, M, offene oder leicht geschlossene Blende und MF mit Lupe anbieten. Belichtungszeit und ISO durch Probebilder anpassen lassen.
- [ ] **Abnahme:** Eine Testzeit wird als Ausgangspunkt bezeichnet. Bei Sternspuren wird Verkürzen erklärt; die Unendlichstellung des Fokusrings gilt nicht als garantierter Fokus. Das gewählte Objektiv begrenzt die möglichen Werte.

### Objektive und Zusammenspiel

#### K-10 · Genaue Objektivprofile und eigene Tasche

- **Anforderung:** Hersteller, Modell, Generation, Sony-E-Variante und bestätigte Datenquelle erfassen. Auswahl der eigenen Ausrüstung ermöglichen und unbekannte Daten kenntlich machen.
- [ ] **Abnahme:** Sony SEL50F18 wird nicht mit SEL50F18F verwechselt; SELP1650 wird von SELP16502 getrennt. Vorhandene Objektiv-IDs und gespeicherte Bags bleiben zuordenbar. Alle neun vorhandenen Profile sind nachvollziehbar dokumentiert.

#### K-11 · Aktuelle Brennweite

- **Anforderung:** Bei Zoomobjektiven die manuell angegebene aktuelle Brennweite berücksichtigen; Festbrennweiten eindeutig behandeln. Optional den Kleinbild-Bildwinkel getrennt erläutern.
- [ ] **Abnahme:** 17 mm und 70 mm desselben Zooms können unterschiedliche Handaufnahme-Hinweise erzeugen. Werte außerhalb des Objektivbereichs werden abgefangen. Crop-Faktor und tatsächliche Brennweite werden nicht verwechselt.

#### K-12 · Verfügbare Blenden prüfen

- **Anforderung:** Objektivabhängige Grenzen und variable Offenblende berücksichtigen. Nur verifizierte Zwischenwerte verwenden; fehlende Daten transparent oder konservativ behandeln.
- [ ] **Abnahme:** Beim Sony 55–210 mm wird bei 210 mm kein f/4,5 empfohlen; beim Sony 16–50 bei 50 mm und Sony 18–135 bei 135 mm kein f/3,5. Bei Sigma 16/30/56 mm wird kein f/22 angeboten. Die Fachreferenz belegt diese Grenzen.

#### K-13 · OSS und VC passend einsetzen

- **Anforderung:** Objektivstabilisierung und ihre Bedienung je Modell berücksichtigen. Die α6400 ohne Gehäusestabilisierung korrekt darstellen; Stativhinweise aus den jeweiligen Anleitungen ableiten.
- [ ] **Abnahme:** Ein Sigma-Profil ohne OS erhält keine Aufforderung, einen vorhandenen Stabilisator einzuschalten. Für das Tamron B070 wird die Kameraeinstellung für VC erklärt. Bewegte Motive bleiben ein eigener Einfluss auf die Zeitwahl.

#### K-14 · Objektiv und Bildausschnitt wählen

- **Anforderung:** Passende Weitwinkel-, Normal- und Teleoptionen aus der eigenen Tasche begründen. Bei nahem Vordergrund die Naheinstellgrenze berücksichtigen.
- [ ] **Abnahme:** Für weite Landschaft und entfernte Bergdetails werden nachvollziehbar unterschiedliche Ausschnitte vorgeschlagen. Nicht vorhandene Objektive werden nicht als vorhandene Ausrüstung behandelt; fehlende Nahdistanzdaten werden nicht erfunden.

### Bedienung und zusätzliche Hilfen

#### K-15 · Modus und Auto ISO

- **Anforderung:** A, S und M nach Aufnahmeziel erklären. ISO AUTO Min. SS in P/A mit Auto ISO als Umschaltschwelle darstellen; die Folgen der ISO-Grenze erläutern. Belichtungszeiten eindeutig als „1/125 s oder kürzer“ formulieren.
- [ ] **Abnahme:** Die Anleitung verspricht keine harte Zeitgrenze durch Min. SS. Bei M mit Auto ISO bleiben Zeit und Blende vorgegeben; mögliche Unterbelichtung am ISO-Limit wird erklärt. Bedienrad-Bezeichnungen passen zur Kamera. Grundlage: [Sony Min. SS](https://helpguide.sony.net/ilc/1810/v1/en/contents/TP0002264687.html).

#### K-16 · Belichtung kontrollieren

- **Anforderung:** Histogramm, Zebra und Lichter-Messung situationsbezogen erklären, einschließlich möglicher dunklerer übriger Bildbereiche.
- [ ] **Abnahme:** Bei hellem Himmel erscheint ein konkreter Kontrollschritt. Keine Kombination aus Neutral-Kontrastwert und Zebra wird als garantierte RAW-Clipping-Grenze bezeichnet. Grundlage: [Sony Zebra](https://helpguide.sony.net/ilc/1810/v1/de/contents/TP0002279517.html).

#### K-17 · Belichtungsreihen und HDR

- **Anforderung:** Eine Reihe für spätere Bearbeitung und kamerainternes Auto HDR getrennt erklären. Dateiformat, Bewegung, Auslöseverzögerung sowie das Verhalten von M mit fester oder automatischer ISO berücksichtigen.
- [ ] **Abnahme:** Bei RAW/RAW+JPEG wird Auto HDR nicht als verfügbare Funktion angeboten. Bei Wind oder Wasser werden mögliche Verrechnungsfehler erklärt. Die Belichtungsreihe benennt, welche Einstellung sich verändert. Grundlage: [Sony Auto HDR](https://helpguide.sony.net/ilc/1810/v1/en/contents/TP0002264689.html).

#### K-18 · RAW, JPEG und Bildwirkung

- **Anforderung:** Gewünschte spätere Bearbeitung abfragen; Dateiformat, Kreativmodus und Weißabgleich passend erklären. Situative RAW-Sonderfälle als Vertiefung anbieten.
- [ ] **Abnahme:** „Direkt nutzbares JPEG“ und „spätere RAW-Bearbeitung“ erhalten passende Hinweise. Dokumentierte 12-Bit-Sonderfälle werden korrekt genannt; starke Unterbelichtung wird nicht pauschal mit ISO-Invarianz als folgenlos dargestellt. Grundlage: [Sony RAW](https://helpguide.sony.net/ilc/1810/v1/en/contents/TP0002279217.html).

#### K-19 · Verschlussart wählen

- **Anforderung:** Lautlose Aufnahme und elektronischen ersten Verschlussvorhang unterscheiden. Bewegung, flackerndes Licht sowie mögliche Bokeh- oder Belichtungsauffälligkeiten berücksichtigen.
- [ ] **Abnahme:** Bei Streifen unter Kunstlicht oder Verzerrung bewegter Motive erscheint ein passender Hinweis zur lautlosen Aufnahme. Sonys Vorsichtsregel für Fremdobjektive wird nicht zur behaupteten generellen Unverträglichkeit aller Sigma-/Tamron-Modelle erweitert.

#### K-20 · Langzeitbelichtung und BULB

- **Anforderung:** Ablauf, Stativ, Auslösung und Wartezeit der Langzeit-Rauschminderung erklären. Dokumentierte Kombinationen ausschließen, die BULB verhindern.
- [ ] **Abnahme:** Lautlose Aufnahme wird nicht gleichzeitig als BULB-Ablauf empfohlen. Bei aktivierter Langzeit-Rauschminderung berücksichtigt eine Zeitanzeige die zusätzliche Wartephase; diese wird nicht als Defekt erklärt. Grundlage: [Sony BULB](https://helpguide.sony.net/ilc/1810/v1/en/contents/TP0002264647.html).

#### K-21 · Filterhilfe mit ND-Rechner

- **Anforderung:** Bei fester Blende und ISO aus Ausgangszeit und ND-Stufen eine neue Zeit berechnen beziehungsweise nötige Stufen für eine Zielzeit ermitteln. Filtergewinde und CPL-Wirkung berücksichtigen.
- [ ] **Abnahme:** 1/125 s mit sechs ND-Stufen ergibt etwa 0,512 s; nichtpositive Belichtungszeiten oder ungültige Eingaben werden abgefangen. Bei 0 ND-Stufen bleibt die Ausgangszeit unverändert. Passendes Objektivgewinde wird angezeigt. Eine gewünschte Wasserspiegelung wird nicht ungeprüft zum Entfernen empfohlen.

#### K-22 · Intervall und Zeitraffer

- **Anforderung:** Intervall, Bildanzahl, Belichtungszeit und spätere Wiedergaberate für eine verständliche Planung nutzen. Aufnahmedauer von Videolänge unterscheiden; Ausgabe als Einzelbilder erklären.
- [ ] **Abnahme:** Die Kamera-Grenzen von 1–60 s Intervall und 1–9999 Bildern werden berücksichtigt. Bei zu langer Belichtung im Verhältnis zum Intervall erscheint ein Hinweis. Die Berechnung nennt ihre Annahmen und verspricht kein automatisch fertig erzeugtes Video. Grundlage: [Sony Intervall](https://helpguide.sony.net/ilc/1810/v1/en/contents/TP0002280327.html).

#### K-23 · Schärfentiefe und manuelle Fokusserie

- **Anforderung:** Für schwierige Nah-Fern-Szenen eine Vertiefung mit nachvollziehbaren Annahmen zur Schärfentiefe anbieten. Eine Fokusserie als manuelle Folge mit späterer Zusammenführung beschreiben.
- [ ] **Abnahme:** Hyperfokale Angaben nennen Brennweite, Blende und angenommene Schärfetoleranz. Die α6400 erhält keine erfundene automatische Fokus-Bracketing-Funktion. Wind und unterschiedliche Bildteile werden als mögliche Probleme beim Zusammenführen erklärt.

#### K-24 · Fehlerdiagnose nach dem Foto

- **Anforderung:** Beobachtbare Symptome mit kurzen Rückfragen und passenden nächsten Schritten verbinden: Verwacklung, Bewegungsunschärfe, falscher Fokus, unzureichende Schärfentiefe und verlorene Lichter.
- [ ] **Abnahme:** „Alles unscharf“, „nur Blätter unscharf“, „Ferne scharf, Vordergrund weich“ und „Himmel weiß“ führen zu unterscheidbaren Empfehlungen. Ursachen werden als zu prüfende Möglichkeiten bezeichnet, nicht als sichere Ferndiagnose.

#### K-25 · Kurze Aufnahmecheckliste

- **Anforderung:** Situative Kontrolle von Horizont, Bildrändern, Fokus, Belichtung und tatsächlicher Zeit anbieten. Rückkehr vom Stativ zur Hand berücksichtigen.
- [ ] **Abnahme:** Die Checkliste bleibt mobil überschaubar, mit Tastatur bedienbar und zum aktiven Szenario passend. Bereits gespeicherte Slot-Haken werden bei einer Erweiterung nicht unbeabsichtigt vertauscht oder gelöscht.

#### K-26 · Warum dieser Wert?

- **Anforderung:** Empfehlungen kurz begründen, Quellen und Startwert-Charakter kenntlich machen und Zielkonflikte erklären. Manuelle Eingaben erhalten Vorrang vor automatisch vorgeschlagenem Licht.
- [ ] **Abnahme:** Eine Empfehlung nennt ihren entscheidenden Grund, etwa Wind oder nahen Vordergrund. Widersprüchliche Wünsche erzeugen eine Wahl zwischen verständlichen Alternativen. Eine späte Wetterantwort überschreibt keine neue manuelle Auswahl; dazu F-03 beachten.

## Empfohlene Umsetzungsschritte

Alle 26 Punkte bleiben Bestandteil des Plans. Die Reihenfolge bündelt gemeinsame Grundlagen und stellt den Landschaftsmodus früh bereit.

1. **Vorbereitung:** F-01, F-02 und F-03 aus [Plan 001](001-stabilisierung.md) berücksichtigen und vor Änderungen an Zustand, Offline-Verhalten oder Wetterübernahme gezielt absichern. Die Fehler bleiben bis zu ihrer tatsächlichen Korrektur offen.
2. **Gemeinsame Daten und Regeln:** K-10 bis K-13 sowie K-15 und K-26. Verifizierte Objektivdaten, Brennweite, Blendenlimits, Modus und Begründungen zusammenführen.
3. **Landschaftsgrundlage:** K-01 bis K-05, K-14, K-16 und K-25. Berge, Bäume und Wälder aus der Hand oder mit Stativ einschließlich Fokus- und Belichtungskontrolle abdecken.
4. **Weitere Situationen:** K-06 bis K-09 sowie K-17 bis K-20. Wasser, Gegenlicht, Schnee/Nebel und Sterne mit den passenden Kamerafunktionen verbinden.
5. **Zusätzliche Werkzeuge:** K-21 bis K-24. Filter, Intervall, Schärfentiefenhilfe und Fehlerdiagnose ergänzen.

Jeder Schritt braucht nur die für ihn relevanten Tests und eine eigene nachvollziehbare Abnahme. Eine Änderung der Reihenfolge entfernt keine Punkte aus dem Umfang.

## Kompatibilität und Veröffentlichung

- **Zustand:** Neue Felder brauchen validierte Standardwerte. `st`, `bag`, `tab` und `ck0_0` bis `ck4_3` kompatibel übernehmen; eine nötige Migration ausdrücklich beschreiben.
- **Links:** Vorhandene Links nach `#s=<motiv>.<licht>.<bew>.<look>.<lens>` weiter lesen. Für neue Angaben ein eindeutiges, geprüftes Format festlegen; fehlende neue Werte in alten Links sicher ergänzen.
- **Teilen:** Neue Angaben, die die Empfehlung beeinflussen, in Link und PNG konsistent berücksichtigen. Die Bildkarte darf keine anderen Werte als die Hauptansicht zeigen.
- **Bedienbarkeit:** Neue Auswahlfelder mobil, mit Tastatur und sichtbarem Fokus nutzbar halten; Details bei Bedarf aufklappen. Standortfreigabe bleibt optional.
- **PWA:** Bei Runtime-Änderungen Cache-Version und gegebenenfalls `SHELL` aktualisieren; frische Installation und bereits vorhandenen Client prüfen. Fachliche Hinweise sollen im vorgesehenen Offline-Umfang verfügbar sein.
- **Veröffentlichung:** Funktionsänderungen mit tatsächlichem Netlify-Deploy und passenden Live-Prüfungen abschließen. Dieser Dokumentationsschritt benötigt keinen Runtime-Versionswechsel.

## Übergreifende Abnahme

- [ ] Jede umgesetzte Kennung besitzt einen nachvollziehbaren Nachweis aus den obigen Kriterien.
- [ ] Bestehende Motive, gültige alte Links und gespeicherte Auswahl bleiben nutzbar.
- [ ] Gezielt gewählte Kombinationen aus Objektiv, Brennweite, Situation und Aufnahmeart erzeugen gültige, widerspruchsfreie Werte.
- [ ] Unbekannte Werte, ungültige Eingaben und nicht kombinierbare Kameraeinstellungen werden verständlich behandelt.
- [ ] Kamera-Fakten sind auf die α6400 und genaue Objektivvariante bezogen; Startwerte sind als solche erkennbar.
- [ ] [STATUS](../STATUS.md), [ROADMAP](../ROADMAP.md), [ARCHITECTURE](../ARCHITECTURE.md), [DEVELOPMENT](../DEVELOPMENT.md) und [CHANGELOG](../../CHANGELOG.md) spiegeln den tatsächlich erreichten Stand wider.

## Ergebnisprotokoll

- **2026-11-25:** Alle 26 Funktionspunkte als geplante Anforderungen mit Abnahmekriterien aufgenommen; Implementierung weiterhin offen.
- **Funktions-Commits, Kameraprüfung, Browserabnahme und Deployment:** noch keine Nachweise für diesen Ausbau.

Bei späteren Änderungen je Kennung ergänzen: Datum, Commit, geprüfte Fälle, Browser beziehungsweise Kamera/Objektiv und verbleibende Einschränkungen. Erst danach die betreffende Abnahme als erledigt markieren.
