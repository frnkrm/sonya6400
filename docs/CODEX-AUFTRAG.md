# Codex-Auftrag — Kameraanbindung autonom umsetzen

Stand: **25.11.2026** · Repository: [frnkrm/sonya6400](https://github.com/frnkrm/sonya6400) · Zielbranch: `main`.

Dieses Dokument ist der vollständige Arbeitsauftrag für den nächsten Codex-Lauf, wenn der Nutzer ihn startet. Das Speichern dieser Datei ist keine Implementierung der geplanten Funktionen.

## Auftrag und Lesereihenfolge

Setze die noch offenen Softwarearbeiten aus [Plan 003 — Kameraverbindung und Presetübertragung](plans/003-kameraverbindung-und-presettransfer.md) eigenständig und vollständig um. Übernimm relevante tatsächlich offene Restarbeiten aus dem aktuellen Projektstand. Arbeite bis zu einem überprüfbaren, ausführbaren Ergebnis; bleibe nicht bei einer Analyse oder einem Plan stehen.

Lies zu Beginn einmal gezielt:

1. [AGENTS.md](../AGENTS.md), [Projektstand](STATUS.md) und [Roadmap](ROADMAP.md).
2. [Architektur](ARCHITECTURE.md), die relevanten Abschnitte aus [DEVELOPMENT](DEVELOPMENT.md) und Plan 003.
3. Die [Verbindungsrecherche](research/sony-a6400-verbindung-und-presettransfer.md) und anschließend die tatsächlich betroffenen Quelldateien.

Der dokumentierte Stand `1aa7cd7` enthält bereits die Umsetzung und lokale Abnahme der Pläne 001 und 002. Prüfe den aktuellen Code; baue fertige Landschafts-, Kamera- und Stabilisierungsfunktionen nicht erneut. Im Ideenparkplatz liegende zusätzliche Wünsche gehören nicht automatisch zum Auftrag.

## Autonomie

- Triff übliche technische Entscheidungen selbst und halte wichtige Annahmen kurz im Plan fest. Stelle keine Rückfragen zu bereits beauftragter Arbeit und fordere keine erneuten Freigaben für Implementierung, Tests, Commits oder den gewünschten Push an.
- Nutze vorhandene Berechtigungen. Technische Zugriffsbeschränkungen, geschützte Branches und notwendige Browser-/Geräteberechtigungen werden nicht durch diesen Auftrag aufgehoben. Falls ein Weg blockiert ist, nutze eine zulässige Alternative und arbeite an allen unabhängig ausführbaren Teilen weiter.
- Fehlende Kamera, Zugangsdaten oder externe Dienste dürfen keine erfundenen Erfolgsmeldungen erzeugen. Dokumentiere den konkreten Blocker, liefere den ausführbaren Softwarestand und eine kurze Anleitung für die verbleibende Prüfung.
- Ändere keine Kamera-Firmware und verwende keinen Service-Modus. Für die geplante USB-Verbindung sind diese Eingriffe nicht nötig. Übertrage echte Werte nur in einer ausdrücklich gestarteten lokalen Anwendung beziehungsweise einem ausdrücklich aktivierten Hardwaretest.

## Technisches Ziel

- Implementiere C-01 bis C-08 aus Plan 003: Fähigkeiten erfassen, strukturiertes Profil, lokalen USB-Adapter, Schreiben mit Rücklesung, kompakte Oberfläche, Profilimport als Rückfallweg, gezielte Tests und Dokumentation.
- Beginne mit ISO, Blende und Belichtungszeit. Halte festen Wert, Auto ISO, Grenzwert und Modusabsicht auseinander. Verwende die vorhandene gemeinsame Empfehlungslogik; keine zweite Regelbasis und keine Befehle aus Anzeigetexten erraten.
- Liefere sowohl eine erkennbare Simulation für Tests als auch einen echten, ausführbaren USB-Adapter. Ohne angeschlossene Kamera bleibt dessen Hardwareabnahme offen. Ein Dummy allein erfüllt den Auftrag nicht.
- Halte manuelle Empfehlungen und nicht übertragbare Schritte nutzbar. Versprich keine direkte Website→Imaging-Edge-Übergabe, keinen vollständigen Kameramenüimport und keine dauerhafte MR-Speicherung ohne Nachweis.
- Prüfe den tatsächlichen Weg vom Browser zur lokalen Anwendung. Falls der direkte Zugriff der Produktionswebsite nicht funktioniert, stelle den validierten Export-/Importweg fertig und dokumentiere die Einschränkung.

## Nutzungslimit und Qualität

- Verwende die vorhandene Recherche und vorhandene Tests. Recherchiere nur konkrete offene Schnittstellenfragen oder erkennbar geänderte Angaben; wiederhole nicht die gesamte Kamerarecherche.
- Suche mit gezielten Dateinamen und `rg`. Bündele unabhängige Lesevorgänge; lies große Dateien nicht wiederholt vollständig. Halte Statusmeldungen kurz und aussagekräftig.
- Teile die Arbeit in wenige zusammenhängende Schritte. Nutze zusätzliche Agenten nur für klar getrennte Aufgaben, wenn sie voraussichtlich Zeit oder Fehler sparen; keine doppelte Vollprüfung derselben Arbeit.
- Erhalte die schlanke statische Website und ihre bestehenden Daten-/Linkformate. Ergänze nur die für den lokalen Adapter erforderlichen Abhängigkeiten und dokumentiere ihre Einrichtung.
- Teste die betroffenen Regeln, Fehlerfälle und Browserabläufe. Vermeide Tests, die nur die Implementierung nachzeichnen, und wiederhole große Testläufe nur nach einer relevanten Änderung oder bei einem konkreten verbleibenden Risiko.
- Halte Softwaretests, echte Kameratests und Produktionsprüfungen auseinander. Schließe Einträge erst mit passendem Nachweis; bereits vorhandene Resultate nicht als selbst erneut ausgeführte Tests ausgeben.
- Falls ein hartes Laufzeit- oder Kontextlimit erreicht wird, sichere einen konsistenten Stand und notiere exakt den nächsten Schritt im Plan. Begrenze den fachlich vereinbarten Umfang nicht aus Bequemlichkeit.

## Git und Abschluss

Der Nutzer wünscht einen direkten Push auf `main`. Prüfe den aktuellen Remote-Stand, erhalte fremde Änderungen, committe zusammenhängend und pushe ohne Force-Push. Führe keine zusätzliche Freigaberunde ein. Wenn eine technische Branchregel den direkten Push verhindert, nutze den zulässigen Projektweg und benenne die verbleibende Veröffentlichungsgrenze.

Pflege Plan 003, STATUS, ROADMAP, ARCHITECTURE, DEVELOPMENT und CHANGELOG passend zum Ergebnis. Bei Runtime-Änderungen Cache-Version und `app-release` zusammen aktualisieren. Prüfe den zugehörigen Netlify-Deploy und die ausgelieferte Fassung, soweit Zugriff möglich ist; fehlenden Zugriff als offene Produktionsprüfung dokumentieren.

Beende den Auftrag mit einem kurzen Bericht in Stichpunkten:

- Umgesetzt und wie zu starten.
- Tatsächlich ausgeführte Tests und Resultate.
- Commit/Branch und bestätigter Push-/Deploy-Stand.
- Konkrete verbleibende Hardware- oder Zugriffsprüfungen.

## Kurzer Startprompt

```text
Arbeite im Repository frnkrm/sonya6400 auf dem aktuellen main-Stand.
Führe docs/CODEX-AUFTRAG.md vollständig aus und setze die noch offenen
Softwarearbeiten aus docs/plans/003-kameraverbindung-und-presettransfer.md um.

Arbeite autonom ohne Rückfragen oder erneute Freigaberunden für die
beauftragte Arbeit. Nutze die vorhandene Recherche, ändere gezielt,
prüfe die betroffenen Abläufe und baue bereits fertige Funktionen nicht neu.

Fehlende Kamera oder externe Zugriffe: alle unabhängig möglichen Arbeiten
fertigstellen, echte Prüfungen offen dokumentieren und konkrete Testschritte
hinterlassen. Keine Kamerafirmware ändern und keine Zugriffsregeln umgehen.

Committe und pushe die geprüften Änderungen direkt auf main, ohne Force-Push.
Aktualisiere die Projektdokumentation. Berichte am Ende kurz über Ergebnis,
Tests, Commit und tatsächlichen Deploy-Stand.
```
