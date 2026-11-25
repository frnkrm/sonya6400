@echo off
setlocal
pushd "%~dp0" || exit /b 1
node.exe -e "process.exit(Number(process.versions.node.split('.')[0]) >= 22 ? 0 : 1)" >nul 2>&1
if errorlevel 1 (
    echo Bitte zuerst Node.js LTS ab Version 22 fuer Windows installieren.
    echo Die Einrichtung steht im Projektordner unter docs\WINDOWS-USB.md.
    pause
    exit /b 1
)
echo Dieses Fenster waehrend des Kameratests offen lassen.
echo Nach dem Start die angezeigte lokale Adresse im Browser oeffnen.
node.exe local\server.js
if errorlevel 1 (
    pause
    exit /b 1
)
