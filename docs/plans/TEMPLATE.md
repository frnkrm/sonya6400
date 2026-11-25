# NNN · Kurztitel

Diese Vorlage als `NNN-kurztitel.md` in diesen Ordner kopieren; die nächste freie Nummer verwenden. Platzhalter ersetzen und den Plan in der [Roadmap](../ROADMAP.md) verlinken. Vorhandene [Befunde](../STATUS.md) berücksichtigen.

## Eckdaten

- **Status:** Entwurf · Geplant · In Arbeit · Erledigt · Pausiert — einen auswählen
- **Erstellt / zuletzt aktualisiert:** JJJJ-MM-TT / JJJJ-MM-TT
- **Roadmap-Punkt / Issue:** Link oder Kennung
- **Ausgangscommit:** vollständiger Commit-SHA

## Problem und Ziel

- **Ausgangslage:** Was passiert heute? Beobachtung oder Annahme kennzeichnen und Quelle/Reproduktion verlinken.
- **Ziel:** Welches konkrete Verhalten soll sich ändern?
- **Nutzen:** Was wird für die Nutzer einfacher oder zuverlässiger?

## Umfang

- **Enthalten:** die betroffenen Funktionen und notwendigen Dokumentationsänderungen
- **Nicht enthalten:** bewusst ausgeschlossene Arbeiten und spätere Ideen
- **Betroffener Code:** Dateien, Funktionen und Datenstrukturen mit relativen Links

## Entscheidungen und Alternativen

- **Gewählter Ansatz:** kurze Beschreibung mit Begründung
- **Alternative:** relevanter anderer Ansatz und dessen Nachteil für dieses Vorhaben
- **Offene Frage:** konkrete Unsicherheit und wie sie geklärt wird; weglassen, falls keine

## Kleine Umsetzungsschritte

- [ ] Ausgangsverhalten anhand eines konkreten Beispiels prüfen.
- [ ] Kleinsten zusammenhängenden Umsetzungsschritt durchführen: …
- [ ] Betroffene Randfälle bearbeiten: …
- [ ] Abnahme prüfen und Ergebnis unten festhalten.
- [ ] Roadmap, Befunde und bei Bedarf Architektur/Entwicklungsanleitung aktualisieren.

## Abnahme und Tests

| Fall | Aktion / Eingabe | Erwartetes Ergebnis | Ergebnis / Nachweis |
| --- | --- | --- | --- |
| Hauptfall | konkret ausfüllen | beobachtbares Verhalten | offen |
| Fehler- oder Randfall | konkret ausfüllen | verständlicher, stabiler Zustand | offen |
| Bestehende Funktion | betroffene Funktion erneut prüfen | bisheriges Verhalten bleibt nutzbar | offen |

Nur tatsächlich durchgeführte Prüfungen als bestanden markieren. Browser/Gerät und verbleibende Grenzen nennen; Checklisten aus [DEVELOPMENT](../DEVELOPMENT.md) passend auswählen.

## Kompatibilität und Veröffentlichung

- **Gespeicherte Daten:** Auswirkungen auf `localStorage`; bei Formatänderungen Übernahme alter Werte beschreiben.
- **Geteilte Links:** bestehendes `#s=`-Format und ältere Links berücksichtigen.
- **PWA / Offline:** Auswirkungen auf Cache, `SHELL`, offene Tabs und installierte App prüfen.
- **Deployment:** bei Runtime-Änderungen Cache-Version und Netlify-Prüfung einplanen; reine Dokumentation benötigt keinen Runtime-Versionswechsel.

## Ergebnis

- **Umgesetzt:** Änderungen mit Commit-/PR-Link
- **Geprüft:** durchgeführte Fälle und Nachweise; offene Prüfungen benennen
- **Verbleibend:** Folgeaufgaben in der Roadmap verlinken
- **Änderungsverlauf:** Datum und wesentliche Planänderung; veröffentlichte Änderungen zusätzlich im [Changelog](../../CHANGELOG.md) festhalten
