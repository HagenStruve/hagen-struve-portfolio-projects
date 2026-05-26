@echo off
cd /d "%~dp0"
title Rechnungsprogramm Starter
echo.
echo ============================================
echo   Rechnungsprogramm wird gestartet
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js wurde nicht gefunden.
  echo Bitte installiere Node.js LTS von https://nodejs.org
  echo Danach diese START_APP.bat nochmal doppelklicken.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installiere Abhaengigkeiten. Das kann beim ersten Start ein paar Minuten dauern...
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install ist fehlgeschlagen.
    echo Bitte ein Foto/Screenshot von diesem Fenster schicken.
    pause
    exit /b 1
  )
)

echo.
echo Starte App. Der Browser sollte sich automatisch oeffnen.
echo Wenn nicht, oeffne: http://127.0.0.1:5173
echo.
call npm run dev
pause
