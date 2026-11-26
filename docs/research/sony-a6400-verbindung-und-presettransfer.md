# Fachreferenz — α6400 verbinden und Einstellungen übertragen

Stand: **26.11.2026** · Zielmodell: **Sony ILCE-6400**.

[Überblick](../../README.md) · [Roadmap](../ROADMAP.md) · [Bestandsaufnahme](../STATUS.md) · [Kamera und Objektive](sony-a6400-kamera-objektive.md) · [Plan 003](../plans/003-kameraverbindung-und-presettransfer.md) · [Codex-Auftrag](../CODEX-AUFTRAG.md)

## Zweck und Prüfgrenzen

Diese Recherche dokumentiert die fachlichen Grundlagen der Übertragung. Den tatsächlichen Softwarestand sowie die offenen Geräteversuche beschreibt [Plan 003](../plans/003-kameraverbindung-und-presettransfer.md).

- **Herstellerbeleg:** Sony dokumentiert eine Funktion ausdrücklich für die ILCE-6400.
- **Projekt- oder Anbieterangabe:** Eine App beziehungsweise ein Projekt nennt Unterstützung. Das ist kein eigener Funktionstest.
- **Ableitung:** Ein vorgeschlagener Entwicklungsweg, der durch die vorhandenen Schnittstellen plausibel wird, aber noch praktisch geprüft werden muss.
- **Offen:** Nicht anhand der ausgewerteten Quellen bestätigt. Fehlende Dokumentation ist kein Beweis technischer Unmöglichkeit.
- Keine Kamera wurde für diese Recherche verbunden, verändert oder geflasht. Es gab keinen eigenen Hardwaretest und keine vollständige Codeprüfung der genannten Community-Projekte.

## Ergebnis in einem Blick

| Frage | Rechercheergebnis | Evidenz |
| --- | --- | --- |
| Einzelne Werte per WLAN einstellen? | Ja: Imaging Edge Mobile dokumentiert unter anderem Blende, Zeit und ISO für die α6400. | Sony, Abschnitt 1 |
| NFC für die eigentliche Übertragung verwenden? | Sony beschreibt NFC als Einstieg in die WLAN-Verbindung. Es ist hier kein eigenständiger Profilimport. | Sony, Abschnitt 1 |
| Ein vollständiges Website-Profil an Imaging Edge übergeben? | Keine dokumentierte direkte Übergabe beziehungsweise fertige Importfunktion für diesen Anwendungsfall gefunden. | Offen, Abschnitt 2 |
| Einstellungen über USB verändern? | Sony Desktop Remote und die Modellliste von libgphoto2 belegen einen entsprechenden Weg. | Sony / Projekt, Abschnitte 3–4 |
| Browsersteuerung mit zusätzlicher Anwendung? | SimpleAlphaDroid beschreibt genau diesen Ansatz für die α6400: USB zur Kamera, Browserzugriff über das Android-Gerät. | Experimentelles Projekt, Abschnitt 4 |
| Bleiben übertragene Werte nach Trennen oder Neustart erhalten? | An der ILCE-6400 im Fotomodus M blieben ISO 500, f/9 und 1/160 s nach dem Trennen der nativen Windows-Verbindung und nach einem Neustart erhalten. Der MR-Abruf steht aus. | [Gerätetest H-06](../plans/003-kameraverbindung-und-presettransfer.md#displayvergleich-nach-dem-trennen) |
| Aufnahmeprofile über SD-Karte austauschen? | Sony dokumentiert das Laden gespeicherter Einstellungen auf anderen Kameras desselben Modells. Ein passender Website-Dateigenerator ist nicht bestätigt. | Sony / offene Entwicklung, Abschnitt 5 |
| Ist eine andere Firmware erforderlich? | Die dokumentierten Fernsteuerungswege setzen keine solche Erweiterung voraus. Ein fertiger Firmware-Presetimport wurde nicht bestätigt. | Abschnitte 1, 3 und 6 |

## 1. WLAN und NFC mit Imaging Edge Mobile

Sony führt für die ILCE-6400 bei Fotoaufnahmen folgende fernsteuerbare Einstellungen auf:

- Blendenwert, Belichtungszeit und ISO-Empfindlichkeit.
- Belichtungskorrektur, Weißabgleich und Selbstauslöser.
- Zoom nur mit einem geeigneten **Powerzoom-Objektiv**.

Die nutzbaren Einstellungen hängen vom Aufnahmezustand und Modus ab. Sony nennt zwar eine Änderung des Belichtungsmodus, schränkt aber den Wechsel des Aufnahmetyps, etwa Foto zu Video, ein: Dafür ist das Moduswahlrad der Kamera zu verwenden. Daraus keine universell fernsteuerbare Moduswahl ableiten.

Quelle: [Sony ILCE-6400 — Photo Shooting Settings](https://support.d-imaging.sony.co.jp/www/cscs/pmm/page2.php?abil=32100&area=eu&lang=en&mdl=ILCE-6400).

Für Fernaufnahmen wird **MENU → Netzwerk → Strg mit Smartphone / Ctrl w/ Smartphone → Ein** aktiviert. Die Verbindung kann über die von Sony beschriebenen QR-/SSID-Verfahren beziehungsweise NFC hergestellt werden. NFC hilft dabei, die WLAN-Verbindung einzurichten; die anschließende Fernsteuerung läuft über WLAN.

Quellen: [Sony ILCE-6400 — Remote shooting und NFC](https://support.d-imaging.sony.co.jp/www/cscs/pmm/page2.php?abil=31100&area=eu&lang=en&mdl=ILCE-6400), [α6400-Hilfe — Ctrl w/ Smartphone](https://helpguide.sony.net/ilc/1810/v1/en/contents/TP0002273504.html).

**Nicht als bestätigt behandeln:** Ein frei beschreibbares vollständiges Kameramenü, sämtliche AF-Optionen, Stabilisierung, ISO-AUTO-Grenzen, ISO AUTO Min. SS oder das Registrieren von MR-Speichern. Die oben belegten Einzelwerte beweisen diese zusätzlichen Fähigkeiten nicht.

## 2. Einzelwerte sind noch kein vollständiger Profilimport

Vier verschiedene Ziele müssen getrennt nachverfolgt werden:

1. Einen aktuellen Einstellungswert fernsteuern.
2. Mehrere Werte nacheinander aus einem Website-Profil übernehmen.
3. Die Werte nach Verbindungsende beziehungsweise Neustart behalten.
4. Ein ganzes Profil dauerhaft in einen Kamera- oder Kartenspeicher schreiben.

Der Nachweis für Punkt 1 bestätigt die Punkte 2–4 nicht automatisch. Mehrere Schreibvorgänge können teilweise erfolgreich sein; eine Übertragung braucht deshalb je Wert eine Rücklesung und einen nachvollziehbaren Ergebnisstatus.

Imaging Edge Mobile besitzt für bestimmte Kameras **Save and Apply Settings**. Sony nennt diese Funktion in seiner Modellübersicht **nicht im Abschnitt ILCE-6400**. Die allgemeine Anleitung erklärt außerdem, dass die Funktion bei fehlendem Menüeintrag nicht verfügbar ist. Sie darf deshalb nicht als vorhandener α6400-Profilimport eingeplant werden.

Quellen: [Sony Imaging Edge Mobile — Modellübersicht](https://support.d-imaging.sony.co.jp/app/iemobile/en/instruction/index.php), [Sony — Save and Apply Settings](https://support.d-imaging.sony.co.jp/app/iemobile/en/instruction/5_1_save_apply.php).

Eine dokumentierte Schnittstelle nach dem Muster **Website → Imaging Edge Mobile → vollständiges Kameraprofil** wurde in dieser Recherche nicht gefunden. Keine erfundenen App-Links, Dateiformate oder API-Endpunkte verwenden. Das JSON-Profil der Website ist das Austauschformat für die lokale Anwendung.

## 3. Sony-Wege für Computer und eigene Software

### Imaging Edge Desktop Remote

Die α6400-Hilfe beschreibt Fernaufnahmen und Einstellungsänderungen vom Computer **über USB**. Die Kamera wird dafür auf **USB Connection → PC Remote** gestellt. Diese Bestätigung für USB nicht auf eine WLAN-Verbindung in Desktop Remote übertragen.

Quelle: [Sony α6400 — Imaging Edge](https://helpguide.sony.net/ilc/1810/v1/en/contents/TP0002279243.html).

Beim Vergleich mit der angeschlossenen ILCE-6400 unter Windows waren in der geprüften Remote-Ansicht keine eigenen Bedienelemente für Auto-ISO-Minimum, Auto-ISO-Maximum oder ISO AUTO Min. VS erkennbar. Ob diese drei Werte über USB beschreibbar sind, bleibt offen. Kompass v12 zeigt die Profilvorgaben dafür als manuelle Schritte an. [Gerätetest H-03](../plans/003-kameraverbindung-und-presettransfer.md#hardwareprotokoll)

### Camera Remote Command und Camera Remote SDK unterscheiden

- **Camera Remote Command** führt die ILCE-6400 ausdrücklich als unterstütztes Modell. Es verwendet Sony-Erweiterungen des PTP-Protokolls.
- Sony beschreibt allgemein USB-, LAN- und WLAN-Verbindungen, verweist für den konkreten Modellumfang aber auf die mitgelieferte Dokumentation. Daraus keine bestätigte WLAN-Schnittstelle für die α6400 ableiten.
- Die offizielle Downloadmöglichkeit richtet sich laut Sony derzeit an **Firmenkunden**, nicht an Privatpersonen. Sie daher nicht als ohne Weiteres verfügbare Voraussetzung des Projekts festlegen.
- In der ausgewerteten Liste des separaten **Camera Remote SDK** ist die α6400 nicht aufgeführt. Unterstützung durch Camera Remote Command bedeutet keine SDK-Kompatibilität.

Quellen: [Sony Camera Remote Command](https://support.d-imaging.sony.co.jp/app/cameraremotecommand/en/index.html), [Sony Camera Remote SDK](https://support.d-imaging.sony.co.jp/app/sdk/en/index.html).

## 4. Apps und Community-Projekte

### Shutter+ — fertige App laut Anbieter

Die modellspezifische Seite nennt die α6400 mit **WLAN- und USB-Verbindung** für iPhone/iPad sowie Unterstützung der Apple Watch. Genannt werden Belichtungssteuerung, zeitgesteuerte BULB-Aufnahmen, Intervallaufnahmen und Belichtungsreihen.

Die Seite schließt für dieses Modell unter anderem **Tap-to-focus und Focus Bracketing** aus. App-eigene Histogramm- oder Zebra-Anzeigen sind kein Nachweis, dass entsprechende Einstellungen im Kameramenü verändert werden können. Eine Schnittstelle für unsere Website-Presets wurde nicht bestätigt.

Quelle und Evidenzstufe: [Shutter+ — Sony a6400](https://shutter.dev/docs/sony-a6400), **Anbieterangabe, kein eigener Test**.

### SimpleAlphaDroid — besonders passender experimenteller Ansatz

Die Kamera wird **per USB mit einem Android-Handy** verbunden. Die Android-Anwendung stellt eine Weboberfläche bereit; ein zweites Gerät greift über WLAN oder einen Hotspot mit dem Browser darauf zu. Die WLAN-Strecke liegt hier **zwischen Browsergerät und Android-Handy**, nicht zwischen Handy und Kamera.

Laut README lassen sich Zeit, Blende, ISO und Belichtungskorrektur ändern. Das Projekt nennt die α6400 ausdrücklich als bekannt funktionierendes Modell. Der Autor bezeichnet die Software jedoch als experimentell, nur auf wenigen Android-Geräten geprüft und ohne zugesicherte Pflege.

Das ist ein konkreter Kandidat für einen Machbarkeitstest. Es ist keine bereits geprüfte Integration der auf Netlify veröffentlichten Website. Der fremde Code wurde hier nicht vollständig geprüft oder ausgeführt.

Für die nativen Windows-Einzeltests ab v11 ist der veröffentlichte Protokollbefund zur α6400 relevant. Die Referenz beschreibt für `0x9207` den relativen Schritt +1 als `01 00` bei Blende (`0x5007`, größere Blendenzahl) und Zeit (`0xD20D`, kürzere Zeit). Das bestätigt die Richtung des Befehls. Den erreichten Wert für die hier angeschlossene Kamera und das Objektiv liefert der jeweilige Versuch. [Protokoll bei Git-Stand 197c206](https://github.com/qkhanhpro/simplealphadroid/blob/197c20638d414e429c4a5826b94134da91050a5a/docs/PROTOCOL.md#exposure-and-locks) · [Implementierung des relativen Schritts](https://github.com/qkhanhpro/simplealphadroid/blob/197c20638d414e429c4a5826b94134da91050a5a/app/src/main/java/com/simplealphadroid/SonyCam.java#L769-L777)

### gphoto2 / libgphoto2 — Grundlage für eine lokale USB-Anbindung

Die offizielle Projektliste führt **Sony ILCE-6400 (PC Control)** mit Einstellungsänderungen, Aufnahmeauslösung und Livebild. Im Repository liegt ein modellspezifischer Konfigurationsdump, der unter anderem ISO, Weißabgleich, Belichtungskorrektur und Blende als schreibbar ausweist.

Dieser Dump ist kein Nachweis, dass jeder dort aufgeführte Wert in jedem Modus funktioniert. Wertebereiche können generische Einträge enthalten. Beim tatsächlichen Anschluss müssen Modus, verfügbare Werte, Schreibbarkeit und Rücklesung geprüft werden.

Quellen: [libgphoto2 — unterstützte Kameras](https://gphoto.sourceforge.io/proj/libgphoto2/support.php), [Konfigurationsdump Sony a6400](https://github.com/gphoto/libgphoto2/blob/master/camlibs/ptp2/cameras/sony-a6400.txt).

## 5. Aufnahmeprofile auf SD-Karte

Sony dokumentiert die Speicherung häufig verwendeter Aufnahmeeinstellungen in der Kamera oder auf Speicherkarte und den Abruf über **MR**. Auf einer Speicherkarte gespeicherte Einstellungen können von anderen Kameras **desselben Modells** gelesen werden.

Das bestätigt den Austausch eines auf einer α6400 erzeugten Aufnahmeprofils. Es bestätigt weder eine vollständige Sicherung aller Kameramenüs noch eine freie Erzeugung gültiger Profildateien durch unsere Website. Ein geprüfter α6400-Dateigenerator wurde nicht gefunden; Formate anderer Sony-Modelle dürfen nicht ungeprüft übernommen werden.

Quelle: [Sony α6400 — Registering and recalling sets of frequently used camera settings](https://support.d-imaging.sony.co.jp/support/tutorial/ilc/ilce-6400/en/15.php).

### Machbarkeit unterwegs mit einem Android-Handy

| Gewünschtes Ergebnis | Was dafür spricht | Was noch fehlt |
| --- | --- | --- |
| Per Kamera-WLAN Aufnahmeparameter einstellen | Imaging Edge Mobile und α6400 zeigten in M ISO AUTO, f/8 und 1/125 s. Die am Handy gewählte ISO 400 wurde am Kameradisplay bestätigt und blieb nach dem Trennen sichtbar. | Als Nächstes die Werte an der Kamera über **Speicher** auf einem freien Kartenplatz registrieren und über MR abrufen. |
| Ein Kompass-JSON am Handy öffnen und unterstützte Werte über USB übernehmen | SimpleAlphaDroid v0.0.1 nennt die α6400 als vom Autor getestet. Die App setzt Android 11 oder neuer und USB-Host voraus. Ihr eigener Browserclient liest den Kamerastatus und fordert einzelne Belichtungsschritte an. | Als Kandidat für einen späteren lokalen Android-Import zuerst auf **demselben Handy** mit Datenkabel einen Wert lesen, einen Schritt ändern und zurücklesen. Ein Import bräuchte Profilvorschau, Modusprüfung und Rücklesung je Feld. Zugriff aus der öffentlichen Kompass-Seite und MR-Registrierung sind offen. |
| Einen gespeicherten Platz vom Handy aus wiederherstellen | Die drei internen Plätze **1–3** und die vier Kartenplätze **M1–M4** haben unterschiedliche Speicherorte. Ein Android-Handy mit USB-C-Kartenleser könnte originale Kartendateien sichern und unverändert zurückkopieren. | Dateipfad, Zahl der beteiligten Dateien und Zuordnung zu M1–M4 sind für diese α6400 ungeklärt. Ein gemeinsamer Speicher für mehrere Slots ist möglich. Ein Rückrufversuch mit einer zweiten Testkarte muss zeigen, ob ein einzelner Platz wiederherstellbar ist. |

Für die internen Plätze 1–3 ergab sich aus den ausgewerteten Sony-Unterlagen, der SimpleAlphaDroid-Schnittstelle und dem modellspezifischen libgphoto2-Konfigurationsdump kein belegter Fernbefehl zum Registrieren oder Überschreiben. Auch die Erzeugung eines neuen Sony-Kartenprofils aus Kompass-JSON bleibt offen. Ein erfolgreicher Rückruf einer unverändert kopierten Sony-Datei würde ausschließlich die Wiederverwendung eines zuvor an der Kamera registrierten Profils belegen. Auto-ISO-Grenzen und ISO AUTO Min. VS sind beim Vergleich gesondert am Kameramenü abzulesen.

Quellen für die Mobil- und Karteneinordnung. [Sony-Speicheranleitung](https://helpguide.sony.net/ilc/1810/v1/de/contents/TP0002242297.html) · [Sony-Funktionsliste für Imaging Edge Mobile](https://support.d-imaging.sony.co.jp/www/cscs/pmm/page2.php?abil=32100&area=eu&lang=en&mdl=ILCE-6400) · [SimpleAlphaDroid v0.0.1](https://github.com/qkhanhpro/simplealphadroid/tree/v0.0.1) · [Android-Status und Belichtungsschritte](https://github.com/qkhanhpro/simplealphadroid/blob/v0.0.1/app/src/main/java/com/simplealphadroid/Web.java#L281-L318) · [libgphoto2-Gerätedump](https://github.com/gphoto/libgphoto2/blob/6d5c61ef7687b74fe792e4aeae7fc40f2ad42d88/camlibs/ptp2/cameras/sony-a6400.txt)

Am 26.11.2026 wurden der veröffentlichte Android-Quellstand und der α6400-Konfigurationsdump eingesehen. Die Sony-Modellangaben stammen aus der bestehenden Quellenprüfung. Der erneute Abruf der Sony-Seiten war aus der Arbeitsumgebung gesperrt (HTTP 403). Der [Prüfplan für Android und MR](../plans/003-kameraverbindung-und-presettransfer.md#machbarkeitsprüfung-mit-android-und-mr) beschreibt die offenen Versuche.

## 6. Kamera-Apps, Service-Modus und Firmwareforschung

### Klassische Kamera-Apps

Die verbreiteten PlayMemories-/OpenMemories-Kamera-Apps benötigen die entsprechende Kamera-App-Plattform. **Sony PMCA WebControl** bietet zwar Browsersteuerung und zusätzliche Funktionen für ältere Modelle, schließt die **α6400** wegen der fehlenden Plattform aber ausdrücklich aus. Dieses Projekt nicht als installierbare α6400-Lösung verwenden.

Quelle: [Sony PMCA WebControl — unterstützte und ausgeschlossene Kameras](https://github.com/hhb/sony-pmca-webcontrol).

### Community-Berichte sind kein fertiger Presetimport

Im Projekt **Sony-PMCA-RE** gibt es einen α6400-Erfahrungsbericht zur Arbeit im USB-Service-Modus und zur Sprachfreischaltung. Das belegt einen berichteten Eingriff, aber keinen Import von Landschaftsprofilen und keine Unterstützung klassischer Kamera-Apps.

Quelle: [Sony-PMCA-RE, Issue 513 — α6400 unter Windows](https://github.com/ma1co/Sony-PMCA-RE/issues/513).

Neuere Forschung wie **bionz-x-research** untersucht weitere Eingriffe. Die ausgewertete WiFiSync-Dokumentation benennt eine ausstehende Prüfung an physischer Hardware; das Vorhaben betrifft Bildübertragung und bestätigt keinen allgemeinen Einstellungsimport. Ungeprüfte Aussagen zu erweiterten WLAN-Fähigkeiten nicht als Kameraspezifikation übernehmen.

Quelle: [bionz-x-research — WiFiSync und Prüfstand](https://github.com/ivica00/bionz-x-research/blob/main/mods/wifisync/README.md).

**Entwicklungsentscheidung aus der Recherche:** Eine Firmwareänderung ist keine Voraussetzung des vorgeschlagenen Übertragungswegs. Modding bleibt eine gesonderte Forschungsrichtung. Keine Service-Modus-, Treiberwechsel- oder Flashroutine in den normalen Verbindungsablauf einbauen.

## 7. Abgeleiteter Entwicklungsweg

Aus der Recherche wurde für die erste Umsetzung eine lokale USB-Anwendung mit gphoto2/libgphoto2 ausgewählt. SimpleAlphaDroid bleibt ein eigener Android-Ansatz. Die folgenden Grundsätze beschreiben die Auswahl des Übertragungswegs.

- Zuerst **ISO, Blende und Belichtungszeit** auslesen, ändern und zurücklesen. Weitere Werte erst nach bestätigter Fähigkeit ergänzen.
- Kameramodus und verfügbare Objektivblenden berücksichtigen. Eine Empfehlung wie „A, f/8, Auto ISO“ darf nicht stillschweigend in ein anderes Belichtungskonzept umgewandelt werden.
- Grenzen oder Hinweise einer Empfehlung sind keine identischen Kameraparameter: Eine empfohlene maximale Belichtungsdauer ist beispielsweise nicht automatisch ein fest einzustellender Verschlusswert oder ISO AUTO Min. SS.
- Pro Feld zwischen vorgeschlagen, unterstützt, übertragen, zurückgelesen und fehlgeschlagen unterscheiden. Ein fehlender Fehler ist kein Übertragungsnachweis.
- Nicht übertragbare Angaben als manuelle Schritte erhalten. Keine vollständige Übernahme aller Punkte K-01 bis K-26 versprechen.
- Die Netlify-Website und eine lokale Verbindungsschicht sind gesonderte Komponenten. Browserzugriff, Verbindungsaufbau und Transport müssen auf der tatsächlichen Zielplattform überprüft werden; eine lokale Projekt-Weboberfläche beweist noch keine Verbindung aus der veröffentlichten Website.
- Eine Simulation kann die Anwendungslogik prüfen, ersetzt aber keine Kameraabnahme. Hardwareabhängige Ergebnisse ausdrücklich offen lassen, wenn kein Gerät verfügbar ist.

## 8. Konkrete offene Prüfungen an der Kamera

Die Tabelle beschreibt die Prüfziele. Bereits ausgeführte Windows-Versuche und die je Verbindung offenen Punkte stehen im [Hardwareprotokoll](../plans/003-kameraverbindung-und-presettransfer.md#hardwareprotokoll). Zu jedem späteren Test gehören Datum, Kamerafirmware, Objektiv, Aufnahme-/Fokusmodus, Betriebssystem, verwendete Softwareversion sowie beobachtetes Ergebnis.

| ID | Prüfung | Erforderlicher Nachweis |
| --- | --- | --- |
| H-01 | Kamera erkennen und Istwerte auslesen | Tatsächlich erkannte ILCE-6400; Werte mit Anzeige an der Kamera vergleichen |
| H-02 | ISO, Blende und Zeit einzeln schreiben | Sollwert, Bestätigung und zurückgelesener Istwert; Ablehnung im jeweiligen Modus erfassen |
| H-03 | Auto ISO und Modusabhängigkeit | Unterstützte Werte/Modi feststellen; keine angenommene Umwandlung von Auto ISO in festen ISO-Wert |
| H-04 | Objektiv- und Brennweitengrenzen | Nicht verfügbare Blenden verständlich ablehnen; keine erfundene Zwischenkurve für variable Offenblende |
| H-05 | Mehrere Werte übertragen und Verbindung unterbrechen | Teilweise erfolgreiche Übertragung korrekt anzeigen; kein pauschales „übernommen“ |
| H-06 | Verbindung trennen und Kamera neu starten | Je Wert dokumentieren, ob und unter welchen Bedingungen er erhalten bleibt |
| H-07 | Übernommene Werte in MR registrieren und abrufen | Manuelle Registrierung zunächst getrennt prüfen; fernsteuerbare Speicherung erst nach eigenem Nachweis behaupten |
| H-08 | Tatsächlichen Browser-/App-Weg prüfen | Zielgerät, USB/WLAN-Strecken, Verbindungsaufbau, erforderliche Berechtigungen und Fehlerfälle dokumentieren |
| H-09 | Weiterführende Parameter | Weißabgleich, EV, Fokus, Stabilisierung und weitere Werte einzeln auf Fähigkeiten prüfen |
| H-10 | SD-Profil auf gleichem Kameramodell laden | Nur echte, auf einer α6400 erzeugte Profile als Ausgangspunkt verwenden; Umfang und Grenzen erfassen |

## Pflege und Umsetzung

- Bestehende Quellen gezielt wiederverwenden. Neue Recherche nur für konkrete verbleibende Fragen oder erkennbar geänderte Kompatibilität durchführen.
- [Plan 003](../plans/003-kameraverbindung-und-presettransfer.md) weist Softwareabnahme und Hardwareabnahme getrennt aus. Quellenbelege, Testsimulationen und Kameratests bleiben unterschiedliche Nachweise.
- Ergebnisse in [Bestandsaufnahme](../STATUS.md), [Roadmap](../ROADMAP.md), Architektur und zugehörigem Entwicklungsplan nachführen. Keine fertige Kameraanbindung allein aufgrund dieser Recherche behaupten.
