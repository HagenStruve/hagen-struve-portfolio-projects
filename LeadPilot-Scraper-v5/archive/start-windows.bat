@echo off
title LeadPilot Scraper v4
cd /d "%~dp0"
echo.
echo Starte LeadPilot Scraper v4...
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js wurde nicht gefunden.
  echo Bitte installiere Node.js LTS von https://nodejs.org/
  pause
  exit /b
)

if not exist node_modules (
  echo Installiere Abhaengigkeiten...
  npm install
)

start http://localhost:8787
npm start
pause
