# ISO der Sony α6400 direkt unter Windows lesen

Für diesen Versuch bleibt das USB-Kabel mit **Windows 11 x64** verbunden. Die lokale App fragt über den Windows-Kameratreiber die eingestellte ISO ab. Dafür genügen Node.js ab Version 22 für Windows, der 64-Bit-Compiler von .NET Framework 4.x und die vollständig entpackte App. **WSL, Ubuntu und gphoto2 werden für diesen Lesetest nicht benötigt.**

## Vorbereiten

1. **Kamera für Windows freigeben.** Schließe Sony Imaging Edge Remote und andere Programme, die die Kamera geöffnet haben. Lass die α6400 eingeschaltet, per USB-Datenkabel am PC und bei **USB-Verbindung → PC-Fernbedienung**. Falls du bisher ohne WSL gearbeitet hast, gehe direkt zum nächsten Schritt. Nach WSL-Versuchen kontrolliere in PowerShell mit `usbipd list` den Status der bestätigten Sony-Zeile. Bei **Shared** ist alles bereit. Nur bei **Attached** löse die Weiterleitung mit `usbipd detach --busid DEINE-BUSID` und setze für `DEINE-BUSID` die tatsächliche BUSID der Kamera ein. Die Freigabe darf **Shared** bleiben.
2. **Alte App schließen.** Falls noch ein lokaler Kameraserver läuft, beende ihn im zugehörigen Konsolenfenster mit **Strg+C**. Schließe den alten Kameratab im Browser.
3. **Die aktuelle Fassung frisch entpacken.** Lade das ZIP von `main` herunter und wähle im Windows-Explorer **Alle extrahieren**. Verwende einen neuen Ordner, damit Windows-Helfer und Oberfläche aus derselben Fassung stammen. [Aktuelles Projekt-ZIP herunterladen](https://github.com/frnkrm/sonya6400/archive/refs/heads/main.zip)
4. **Node.js prüfen.** In PowerShell zeigt `node --version` die installierte Version. Ab `v22` kannst du fortfahren. Andernfalls installiere die Windows-x64-LTS-Version und öffne PowerShell neu. [Node.js herunterladen](https://nodejs.org/de/download)

## ISO einmal lesen

1. Doppelklicke im **frisch entpackten Projektordner** auf **Start-Kamera.cmd**. Lass das Konsolenfenster offen. Öffne im Windows-Browser die vom Starter angezeigte lokale Adresse `http://127.0.0.1:8765/`.
2. Öffne im **Kompass** den Abschnitt **Kameraverbindung & Profil** und wähle unter **Verbindung** den Eintrag **USB am Computer**.
3. Klicke einmal auf **ISO über Windows lesen**. Der Test endet mit der Anzeige eines ISO-Werts oder einer Fehlermeldung. Für diesen Ablauf ist keine Schreibaktion erforderlich.
4. Vergleiche die angezeigte feste ISO-Zahl oder **Auto ISO** mit der Einstellung auf der Kamera. Notiere beide Werte. Bei einem Fehler notiere die **genaue Fehlermeldung** statt eines geschätzten Wertes. Diese kurze Meldung reicht für die weitere Diagnose. Geräte-IDs, Seriennummern und vollständige USB-Protokolle werden dafür nicht benötigt.
5. Beende den lokalen Server nach dem Versuch mit **Strg+C**.

Wenn **ISO über Windows lesen** fehlt, prüfe, ob der neue lokale Windows-Server läuft, die lokale Adresse geöffnet und **USB am Computer** ausgewählt ist. Lade die Seite neu. Meldet die App einen fehlenden 64-Bit-Compiler oder einen unvollständigen Helfer, halte diese Meldung fest. Der Lesetest erstellt seinen Helfer aus den mitgelieferten Projektquellen auf dem Windows-PC.

Die neue Fassung prüft auch die private WPD-Geräteliste und die Zuordnung des Endpunkts zur USB-Kamera über Windows Plug & Play. Scheitert die Suche, gibt die Meldung an, ob Windows keine WPD-Endpunkte lieferte oder ob sich gemeldete Endpunkte keiner passenden α6400 zuordnen ließen. Für den erneuten Versuch genügt derselbe Klick auf **ISO über Windows lesen** mit der frisch entpackten Fassung. Die Meldung enthält keine Gerätepfade.

## Was am Gerät bereits beobachtet wurde

- **Sony Imaging Edge Remote** zeigte **ISO 400** an der α6400 an.
- Die Windows-Geräteabfrage (CIM) führte die Kamera in der Klasse **WPD** (Windows Portable Devices) mit dem Dienst **WUDFWpdMtp** und Status **OK**. Beim Gerätetest mit Stand `5b6454c` endete die Suche der lokalen App ohne zugeordneten WPD-Endpunkt. Sie erreichte die ISO-Abfrage nicht.
- Über **WSL 2** gelang die Geräteerkennung bis einschließlich `gphoto2 --auto-detect`. Beim ersten **16-Byte-USB-OUT-Transfer** für **PTP OpenSession** lief die Zeit ab. Das trat bei beiden getesteten Anschlussreihenfolgen und mit einer frisch aufgebauten Sitzung erneut auf. Über diesen Weg wurde im Versuch kein ISO-Wert gelesen.

Der native Lesetest dient ausschließlich der ISO-Abfrage. Die Mehrfeld-Vorschau **USB-Istwerte lesen** und die Übertragungsaktionen verwenden nach wie vor den separaten gphoto2-Weg. Für den dokumentierten OpenSession-Timeout ist der nächste Versuch der native Lesetest oben. Die Einrichtung für andere Installationen mit funktionierender gphoto2-Sitzung steht in der [WSL-Anleitung](WINDOWS-WSL.md). [Software- und Hardwareprüfstand](STATUS.md#kameraanbindung)
