# Sony α6400 unter Windows per USB testen

Mit v10 bestätigten die lokale App und das Kameradisplay den ISO-Schritt von 400 auf 500. Mit v11 bestätigten Rücklesung und Kameradisplay auch den Blendenschritt von f/8 auf f/9 und den separaten Zeitschritt von 1/125 s auf 1/160 s. Bei beiden Versuchen bleibt das USB-Kabel dem Treiber von **Windows 11 x64** zugeordnet. Du brauchst die vollständig entpackte App, Node.js ab Version 22 für Windows und den 64-Bit-Compiler von .NET Framework 4.x. Die Versuche laufen ohne WSL, Ubuntu und gphoto2.

## Vorbereiten

1. **Kamera für Windows freigeben.** Schließe Sony Imaging Edge Remote und andere Programme, die die Kamera geöffnet haben. Lass die α6400 eingeschaltet, per USB-Datenkabel am PC und bei **USB-Verbindung → PC-Fernbedienung**. Falls du bisher ohne WSL gearbeitet hast, gehe direkt zum nächsten Schritt. Nach WSL-Versuchen kontrolliere in PowerShell mit `usbipd list` den Status der bestätigten Sony-Zeile. Bei **Shared** ist alles bereit. Nur bei **Attached** löse die Weiterleitung mit `usbipd detach --busid DEINE-BUSID` und setze für `DEINE-BUSID` die tatsächliche BUSID der Kamera ein. Die Freigabe darf **Shared** bleiben.
2. **Alte App schließen.** Falls noch ein lokaler Kameraserver läuft, beende ihn im zugehörigen Konsolenfenster mit **Strg+C**. Schließe den alten Kameratab im Browser.
3. **Die aktuelle Fassung frisch entpacken.** Lade das ZIP von `main` herunter und wähle im Windows-Explorer **Alle extrahieren**. Verwende einen neuen Ordner, damit Windows-Helfer und Oberfläche aus derselben Fassung stammen. [Aktuelles Projekt-ZIP herunterladen](https://github.com/frnkrm/sonya6400/archive/refs/heads/main.zip)
4. **Node.js prüfen.** In PowerShell zeigt `node --version` die installierte Version. Ab `v22` kannst du fortfahren. Andernfalls installiere die Windows-x64-LTS-Version und öffne PowerShell neu. [Node.js herunterladen](https://nodejs.org/de/download)
5. **Lokale App öffnen.** Doppelklicke im frisch entpackten Projektordner auf **Start-Kamera.cmd**. Lass das Konsolenfenster offen. Öffne die angezeigte Adresse `http://127.0.0.1:8765/` im Windows-Browser. Öffne im Kompass **Kameraverbindung & Profil** und wähle **USB am Computer**.

## Zuerst die Blende testen

1. Verwende ein Objektiv, dessen Blende du am Kamerarad einstellen kannst, zum Beispiel das Sony E PZ 16–50 mm OSS. Bei einem Zoom wähle eine Brennweite und behalte sie während des Versuchs bei. Notiere Objektiv, Brennweite und den ursprünglichen Aufnahmemodus.
2. Wähle am Moduswahlrad den **Fotomodus M**. Notiere die bisherige Blende in M und stelle am Kamerarad **f/8** ein. Zeit und ISO kannst du für diesen Versuch belassen.
3. Wähle im Kompass unter **Windows-Test** die **Blende**. Klicke **Blende über Windows lesen**. Kontrolliere, dass Kompass und Display **f/8** zeigen. Bleibt die Schaltfläche für den nächsten Schritt inaktiv, notiere die Meldung und gehe direkt zum Wiederherstellen der Ausgangswerte in Schritt 5.
4. Klicke **einmal** auf **Blende ab f/8 um eine Stufe schließen**. Warte auf die Rückmeldung und lies dann das Kameradisplay ab. Erwartet wird **f/9**. Notiere die Anzeige am Gerät und die Rückmeldung im Kompass, auch wenn sie voneinander abweichen.
5. Wenn die Bestätigung fehlt oder ein anderer Wert erscheint, lass die Kamera in diesem Zustand und klicke nur **Blende über Windows lesen**. Notiere das Ergebnis der separaten Lesung. Stelle anschließend die zuvor notierte Blende von Hand an der Kamera wieder her und wähle wieder den ursprünglichen Modus.

## Belichtungszeit separat testen

1. Wähle im Kompass unter **Windows-Test** die **Belichtungszeit**. Notiere den ursprünglichen Modus. Stelle die Kamera auf **Fotomodus M**, notiere die dort eingestellte Zeit und wähle am Kamerarad **1/125 s**. Blende und ISO können unverändert bleiben.
2. Klicke **Belichtungszeit über Windows lesen**. Prüfe, ob auf dem Display und im Kompass **1/125 s** steht. Bleibt die Schaltfläche für den nächsten Schritt inaktiv, notiere die Meldung und stelle die Ausgangswerte wie in Schritt 4 wieder her.
3. Klicke **einmal** auf **Belichtungszeit ab 1/125 s um eine Stufe verkürzen**. Warte auf die Rückmeldung. Erwartet wird **1/160 s**. Notiere den zurückgelesenen Wert im Kompass und den Wert auf dem Display.
4. Fehlt die Bestätigung oder weichen die Werte ab, belasse die Kamera für eine zusätzliche Lesung auf ihrem aktuellen Stand. Klicke nur **Belichtungszeit über Windows lesen** und notiere das Ergebnis. Stelle dann die ursprüngliche Zeit in M und den ursprünglichen Modus von Hand wieder her. Mit **Strg+C** im Konsolenfenster beendest du den lokalen Server.

Bei beiden Versuchen fordert der Kompass einen relativen Schritt an. Welche Einstellung die Kamera tatsächlich übernommen hat, zeigt erst die Rücklesung. Zu einem bestandenen Geräteversuch gehören der bestätigte Zielwert im Kompass und derselbe Wert auf dem Display. [Prüfstand](STATUS.md#kameraanbindung)

## ISO einmal lesen

1. Öffne die lokale App wie unter **Vorbereiten** beschrieben.
2. Wähle im Kompass unter **Windows-Test** den Eintrag **ISO**.
3. Lies am Kameradisplay die **aktuelle ISO-Einstellung** ab. Notiere die Zahl oder **ISO AUTO** und, falls angezeigt, **Multiframe-Rauschminderung** mit ihrer Stufe. Belasse die Kamera für den Vergleich in dieser Einstellung.
4. Klicke einmal auf **ISO über Windows lesen**. Vergleiche die Zahl beziehungsweise **Auto ISO** sowie einen etwaigen Zusatz zur **Mehrbild-Rauschminderung** (Standard oder +) mit der Kameraanzeige.
5. Meldet die App einen unbekannten ISO-Wert, notiere **den vollständigen Hexwert einschließlich `0x` und aller acht Stellen zusammen mit der Anzeige am Kameradisplay**. Bei einer anderen Fehlermeldung genügt deren genauer Wortlaut. Für diesen Vergleich werden keine Einstellungen geschrieben.
6. Wenn du nur lesen möchtest, beende den lokalen Server mit **Strg+C**.

Wenn **ISO über Windows lesen** fehlt, prüfe, ob der neue lokale Windows-Server läuft, die lokale Adresse geöffnet und **USB am Computer** ausgewählt ist. Lade die Seite neu. Meldet die App einen fehlenden 64-Bit-Compiler oder einen unvollständigen Helfer, halte diese Meldung fest. Der Lesetest erstellt seinen Helfer aus den mitgelieferten Projektquellen auf dem Windows-PC.

Die App fragt zusätzlich die aktiven WPD-Schnittstellen direkt bei Windows Plug & Play ab. Sind nur inaktive oder frühere Registrierungen auffindbar, meldet der Kompass das vor dem Öffnen der Kamera. Andernfalls nennt eine erfolglose Suche die Anzahl der regulären, privaten und direkt von Plug & Play gemeldeten aktiven Endpunkte. Für die Diagnose genügt die Ergebniszeile im Kompass.

## Optionaler Hardwaretest von ISO 400 auf 500

1. Verwende die **neu entpackte Fassung** und den daraus gestarteten lokalen Server. Notiere vor jeder Änderung den ursprünglichen Modus und die ISO-Einstellung (auch Auto ISO). Wähle am Moduswahlrad den **Fotomodus M**. Falls M eigene Einstellungen hatte, notiere dessen bisherige ISO ebenfalls. Stelle an der Kamera **feste ISO 400** ein.
2. Wähle im Kompass **Kameraverbindung & Profil → USB am Computer**, dann unter **Windows-Test** den Eintrag **ISO** und **ISO über Windows lesen**. Vergleiche die native Windows-Vorschau mit dem Display. Beide müssen **ISO 400** zeigen.
3. Prüfe die Vorschau für **400 → 500**. Die App kann den Schritt nur freigeben, wenn die Kamera den passenden Aufnahmemodus und ISO-Zustand, die erforderliche Schreibfreigabe und den nächsten ISO-Schritt 500 meldet. Bleibt die Schaltfläche inaktiv, notiere die angezeigte Rückmeldung. Eine erteilte Freigabe gilt zwei Minuten. Bei Ablauf erneut lesen.
4. Sobald die Voraussetzungen erfüllt sind, klicke **genau einmal auf „ISO von 400 auf 500 ändern“**. Lass Kamera und Kabel bis zur Rückmeldung in Ruhe. Native Abfrage und Schreibversuch laufen in Windows. Ein Einstellungsprofil wird dafür nicht benötigt.
5. Vergleiche die **Rücklesung im Kompass** mit dem **Kameradisplay**. Für einen bestätigten Geräteversuch müssen beide **feste ISO 500** zeigen. Notiere vorher/nachher sowie die Rückmeldung. Bei einer Ablehnung, einer Abweichung oder fehlender Bestätigung klicke auf **ISO über Windows lesen** und notiere den tatsächlichen Stand. Die App wiederholt das Schreiben nicht automatisch.
6. Stelle bei Bedarf die ursprüngliche ISO in M **von Hand an der Kamera** wieder her. Wechsle zurück zum ursprünglichen Modus und kontrolliere auch dessen ISO-Einstellung. Beende anschließend den lokalen Server mit **Strg+C**.

Die Schaltfläche **ISO von 400 auf 500 ändern** gehört ausschließlich zu diesem nativen Windows-Test. Die separate gphoto2-Profilübertragung verwendet **Einstellungen übertragen**. Im Gerätetest mit v9 zeigte das Display nach diesem Klick ISO 500, die unmittelbare Rücklesung im Kompass blieb bei 400. Der anschließende Klick auf **ISO über Windows lesen** bestätigte ISO 500. Mit v10 meldete der Kompass nach dem Schreibklick automatisch **„ISO 500 bestätigt zurückgelesen“**. Das Kameradisplay zeigte ebenfalls **ISO 500**.

## Was am Gerät bereits beobachtet wurde

- **Sony Imaging Edge Remote** zeigte **ISO 400** an der α6400 an.
- Die Windows-Geräteabfrage (CIM) führte die Kamera in der Klasse **WPD** (Windows Portable Devices) mit dem Dienst **WUDFWpdMtp** und Status **OK**. Beim Gerätetest mit Stand `5b6454c` endete die Suche der lokalen App ohne zugeordneten WPD-Endpunkt. Mit `b10226a` blieben beide WPD-Managerlisten leer. PnPUtil führte am selben Kameramodell die reguläre WPD-Schnittstellenklasse `6ac27878-a6fa-4155-ba85-f98f491d4f33` auf. Mit Stand `ca5aac4` öffnete die App die Kamera, schloss den Sony-Verbindungsaufbau ab und las die gesamte Eigenschaftsliste einschließlich des ISO-Felds `0xD21E`. Die damalige Auswertung wies den Wert als unbekannt ab. Mit der Folgefassung v8 zeigte die App am Gerät **ISO 400** an. Auch das Kameradisplay zeigte feste ISO 400. Der Versuch führte keine Schreibaktion aus.
- Über **WSL 2** gelang die Geräteerkennung bis einschließlich `gphoto2 --auto-detect`. Beim ersten **16-Byte-USB-OUT-Transfer** für **PTP OpenSession** lief die Zeit ab. Das trat bei beiden getesteten Anschlussreihenfolgen und mit einer frisch aufgebauten Sitzung erneut auf. Über diesen Weg wurde im Versuch kein ISO-Wert gelesen.

Die Mehrfeld-Vorschau **USB-Istwerte lesen** und die vollständige Profilübertragung verwenden weiterhin den separaten gphoto2-Weg. Für den nächsten Hardwareversuch über Windows bleibt die Kamera dem Windows-Treiber zugeordnet. Die Einrichtung für andere Installationen mit funktionierender gphoto2-Sitzung steht in der [WSL-Anleitung](WINDOWS-WSL.md). [Software- und Hardwareprüfstand](STATUS.md#kameraanbindung)
