# gphoto2 über WSL 2 unter Windows

Diese Variante dient der mehrfeldrigen USB-Vorschau und der ausdrücklich ausgelösten Profilübertragung, wenn sich gphoto2 an der angeschlossenen Kamera erfolgreich anmelden kann. Für einen ersten ISO-Leseversuch unter Windows verwende die [Anleitung für den nativen Windows-Treiber](WINDOWS-USB.md).

Im dokumentierten Versuch erkannten usbipd und gphoto2 die α6400. Die erste 16 Byte lange USB-OUT-Übertragung zum Öffnen der PTP-Sitzung endete wiederholt mit einem Timeout. Beide Anschlussreihenfolgen und ein neuer Sitzungsaufbau zeigten denselben Fehler. Für dieses Setup ist die WSL-Übertragung am Gerät weiterhin offen.

## 1. Projekt entpacken

Lade das [Projekt-ZIP](https://github.com/frnkrm/sonya6400/archive/refs/heads/main.zip) und wähle im Explorer **Alle extrahieren**. `Start-Kamera.cmd` liegt im entpackten Projektordner.

## 2. Windows und Ubuntu vorbereiten

Öffne das Startmenü, suche **PowerShell** und wähle **Als Administrator ausführen**. In diesem Windows-Fenster prüfst du zuerst die installierten Linux-Umgebungen:

```powershell
wsl --list --verbose
```

Steht dort bereits **Ubuntu** mit **VERSION 2**, verwende diese Installation. Fehlt Ubuntu, installiere es:

```powershell
wsl --install -d Ubuntu
```

Starte Windows neu, falls es dazu auffordert. Öffne über das Startmenü **Ubuntu**. Lege bei der ersten Einrichtung einen Linux-Benutzernamen und ein Passwort fest. Bei der Passworteingabe erscheinen keine Zeichen. Falls bereits eine Distribution namens `Ubuntu` mit **VERSION 1** eingerichtet war, führe in PowerShell `wsl --set-version Ubuntu 2` aus. Die lokale Anwendung verwendet den Distributionsnamen **Ubuntu**. [Microsofts WSL-Installation](https://learn.microsoft.com/de-de/windows/wsl/install)

Installiere in **PowerShell** die Geräteweiterleitung **usbipd-win** und **Node.js für Windows**, sofern noch nicht vorhanden:

```powershell
winget install --exact --id dorssel.usbipd-win
winget install --exact --id OpenJS.NodeJS.LTS
```

Öffne danach ein neues PowerShell-Fenster und kontrolliere die Versionen:

```powershell
wsl --update
wsl --list --verbose
usbipd --version
node --version
```

Erwartet werden **Ubuntu, Version 2**, **usbipd-win ab 5** und **Node.js ab 22**. Falls `node` fehlt, starte PowerShell erneut oder verwende den Windows-x64-LTS-Installer von Node.js. [Node.js herunterladen](https://nodejs.org/de/download)

Gib im **Ubuntu-Fenster** die folgenden Befehle ein. Bei `sudo` wird das Ubuntu-Passwort verwendet. Lass das Fenster während des Kameratests geöffnet.

```bash
sudo apt update
sudo apt install gphoto2 usbutils
gphoto2 --version
```

## 3. Genau die α6400 an Ubuntu weitergeben

1. Lade den Kameraakku, schalte die Kamera ein und wähle den Fotomodus. Stelle an der α6400 unter **MENU → Einstellung → USB-Verbindung** auf **PC-Fernbedienung**. Beende **Imaging Edge Remote** und andere Programme, die gerade auf die Kamera zugreifen. [Sony-Hilfe](https://helpguide.sony.net/ilc/1810/v1/en/contents/TP0002279243.html)
2. Ziehe das USB-Kabel der Kamera am PC ab. Führe in **Windows-PowerShell** `usbipd list` aus. Stecke es wieder ein und führe denselben Befehl nochmals aus.
3. Suche bei den verbundenen Geräten die **neu hinzugekommene** Zeile mit `054c:` am Anfang der Spalte **VID:PID**. `054c` ist Sonys Herstellerkennung. Der Abziehvergleich ordnet die Zeile deiner Kamera zu. Notiere die **BUSID** aus der ersten Spalte, etwa `2-4`, und die vierstellige Produktkennung hinter dem Doppelpunkt. Wenn mehrere Zeilen infrage kommen, wiederhole den Abziehvergleich.
4. Ersetze in den nächsten Befehlen **2-4** durch *deine* BUSID. Gib einmalig in einer **PowerShell als Administrator** genau dieses Gerät frei:

```powershell
usbipd bind --busid 2-4
```

5. Verbinde das freigegebene Gerät in einer normalen **Windows-PowerShell** mit WSL. Die Zeile sollte danach **Attached** anzeigen:

```powershell
usbipd attach --wsl --busid 2-4
usbipd list
```

6. Prüfe nun im **Ubuntu-Fenster**, was dort ankommt:

```bash
lsusb -d 054c:
gphoto2 --auto-detect
```

Erwartet werden eine Sony-Zeile und in der gphoto2-Liste ein Kameramodell mit einem Port wie `usb:001,002`. Beim Abziehen endet die Zuordnung an WSL. Nach erneutem Anstecken in Windows die aktuelle BUSID prüfen und den **attach**-Befehl wiederholen. Während **Attached** greift Ubuntu auf das USB-Gerät zu. [Microsofts Anleitung zum Anschließen von USB-Geräten](https://learn.microsoft.com/de-de/windows/wsl/connect-usb)

## 4. In der App den Istwert lesen

1. Doppelklicke im **entpackten Projektordner** auf **Start-Kamera.cmd**. Lass das Konsolenfenster geöffnet. Öffne im Windows-Browser die dort angezeigte Adresse `http://127.0.0.1:8765/`.
2. Öffne im **Kompass** den Abschnitt **Kameraverbindung & Profil**. Bei **Verbindung** wähle **USB am Computer** und klicke auf **USB-Istwerte lesen**.
3. Vergleiche Modell, Modus und die Zeile **ISO** mit der Anzeige auf der Kamera. Notiere den Ausgangswert. Bei Auto ISO ist **Auto** der eingestellte Modus. Eine von der Kamera für eine einzelne Aufnahme gemessene Zahl kann davon abweichen.

**Bis hierhin ist Lesen der gesamte Kameratest.** Wer nur die Verbindung prüfen möchte, kann direkt zu Schritt 6 gehen.

## 5. Optional nur ISO übertragen

Für diesen Versuch liefert ein M-Profil das Ziel ISO 100. Mit der Einzelaktion wird nur der ISO-Wert übertragen.

1. Notiere **vor jeder Änderung** den ursprünglichen Kameramodus und die zugehörige ISO-Einstellung, einschließlich Auto ISO. Stelle das Moduswahlrad auf **M** und notiere auch die dort angezeigte ISO, Blende und Zeit. Wähle in M eine feste ISO, etwa **400**, und lies die USB-Istwerte erneut ein.
2. Wähle im Kompass **Landschaft → Fließendes Wasser**, das Ziel **Weich zeichnen**, **Stativ** und **Wind → Ruhig**. Das Profil empfiehlt M und feste ISO 100. Alternativ kannst du eine bereits exportierte, passende M-Empfehlung mit **Profil aus Datei laden** übernehmen.
3. Prüfe, dass in der Vorschau für **ISO** der gewünschte andere Zielwert steht und dass das Gerät ihn als schreibbar meldet. Lies bei Bedarf nochmals mit **USB-Istwerte lesen**. Verwende für diesen Versuch ausschließlich **Nur ISO übertragen**.
4. Nach dem Klick muss die ISO-Zeile die **bestätigte Rücklesung** zeigen. Vergleiche mit der Kamera und notiere Sollwert, Rücklesung und Kameraanzeige. Blende und Zeit sollen ihre ursprünglichen Einstellungen behalten. Zeigt die App eine Abweichung oder fehlt die Rücklesung, lies zuerst die Istwerte neu ein.
5. Stelle in M die zuvor für M notierte ISO wieder ein. Wechsle anschließend zurück zum ursprünglichen Modus und prüfe dort die ursprüngliche ISO-Einstellung. Stelle sie bei Bedarf wieder her und vergleiche die Kameraanzeige mit **USB-Istwerte lesen**.

**Nur ISO übertragen** wird erst bei einer passenden Vorschau, passendem Kameramodus, schreibbarem ISO-Parameter und einer tatsächlichen Änderung aktiv. Klicks auf **Einstellungen übertragen** betreffen das gesamte Profil.

## 6. Beenden und später wieder verbinden

Beende die lokale Anwendung im Konsolenfenster mit **Strg+C**. Löse die Weiterleitung in **Windows-PowerShell** mit der aktuellen BUSID:

```powershell
usbipd detach --busid 2-4
```

Jetzt kann Imaging Edge Remote wieder auf die Kamera zugreifen. Die einmalige Freigabe bleibt gespeichert. Um sie ausdrücklich zu entfernen, nutze in einer Administrator-PowerShell `usbipd unbind --busid 2-4`. Für den nächsten Versuch genügen im Normalfall Ubuntu starten, Kamera einstecken, `usbipd list`, `attach` und **Start-Kamera.cmd**.

## Wenn die Kamera fehlt oder „Zugriff verweigert“ erscheint

| Beobachtung | Nächste Prüfung |
| --- | --- |
| In `usbipd list` ändert sich beim Anstecken nichts | Kamera einschalten, USB-Datenkabel und einen anderen Anschluss am PC prüfen. USB-Verbindung auf PC-Fernbedienung stellen. |
| `attach` meldet ein bereits belegtes Gerät | Remote, Fotoimport und andere Kameraanwendungen vollständig schließen. BUSID erneut anhand des Abziehvergleichs prüfen. |
| `Attached` steht in Windows, in Ubuntu fehlt die Sony-Zeile | In PowerShell `wsl --list --verbose` prüfen, Ubuntu gestartet lassen. Nach jedem Abziehen die Zuordnung per `attach` wiederherstellen. |
| gphoto2 fehlt oder die App findet Ubuntu nicht | In PowerShell `wsl -d Ubuntu --exec gphoto2 --version` prüfen. Das Paket in genau dieser Distribution installieren. |
| Die App zeigt eine Simulation | Den lokalen Dienst über **Start-Kamera.cmd** starten und in der lokalen Ansicht **USB am Computer** auswählen. |
| Port 8765 ist belegt | Ein bereits geöffnetes Kamerafenster verwenden oder den eigenen älteren Server dort mit Strg+C beenden. |
| Der normale Ubuntu-Benutzer darf das erkannte USB-Gerät nicht öffnen | Die gerätebezogenen Linux-Rechte wie unten prüfen. Der lokale Kameraserver soll mit deinem normalen Windows-Konto laufen. |

### Linux-Geräterechte prüfen

Führe die Prüfung im **Ubuntu-Fenster** als dein normaler Benutzer aus. Die Zahlen für *Bus* und *Device* stammen aus `lsusb -d 054c:`. Zeigt es beispielsweise `Bus 001 Device 002`, prüfe `ls -l /dev/bus/usb/001/002` und mit `id -nG` deine Gruppen. Eine erneute Verbindung kann die Device-Nummer ändern.

Falls gphoto2 wegen fehlender Rechte scheitert und die Ubuntu-Paketregeln deinem Benutzer keinen Zugriff geben, richte eine udev-Regel nur für das identifizierte Sony-Modell ein. Gib bei der folgenden Eingabe **die vierstellige Produktkennung deiner Kamera** aus `VID:PID` ein. Beispiel: Bei `054c:abcd` wäre die Eingabe `abcd`. Führe die Befehle in **Ubuntu** aus:

```bash
read -rp "Vierstellige Produktkennung der Kamera: " sony_pid
if [[ "$sony_pid" =~ ^[0-9A-Fa-f]{4}$ ]]; then
  sudo groupadd -f plugdev
  sudo usermod -aG plugdev "$USER"
  printf 'SUBSYSTEM=="usb", ENV{DEVTYPE}=="usb_device", ATTR{idVendor}=="054c", ATTR{idProduct}=="%s", GROUP="plugdev", MODE="0660"\n' "${sony_pid,,}" |
    sudo tee "/etc/udev/rules.d/99-local-sony-054c-${sony_pid,,}.rules"
  sudo udevadm control --reload-rules
else
  echo "Vier Hexadezimalzeichen aus der bestätigten Sony-Zeile eingeben."
fi
```

Öffne nach einer Gruppenänderung eine neue Ubuntu-Anmeldung und prüfe mit `id -nG`, dass `plugdev` enthalten ist. Führe in Windows **detach** aus, stecke die Kamera erneut an und verwende **attach** mit der überprüften BUSID. Prüfe die neue USB-Gerätedatei und wiederhole zuerst den **Lesetest**. Falls `udevadm` keinen laufenden Dienst erreicht, prüfe in Ubuntu `systemctl status systemd-udevd`. Die [Microsoft-Anleitung zu systemd in WSL](https://learn.microsoft.com/de-de/windows/wsl/systemd) beschreibt die Einrichtung für ältere WSL-Installationen.

Für eine Fehlermeldung reichen Windows-Version, Ausgabe von `wsl --list --verbose`, die Werkzeugversionen, der Status der bestätigten Sony-Zeile und die Meldung der App. Für den Hardware-Nachweis gehören Modell, Firmware, Objektiv, Kameramodus, Sollwert und Rücklesung ins [Protokoll](plans/003-kameraverbindung-und-presettransfer.md#hardwareprotokoll).
