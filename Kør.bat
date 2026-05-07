@echo off
cd /d "%~dp0"
title Uddannelsessystem — Opdatering

echo.
echo ==========================================
echo   Uddannelsessystem - Opdatering
echo ==========================================
echo.

echo [1/4] Henter certificeringer fra MS Learn...
node src\scrape-transcript.js
if %errorlevel% neq 0 (
  echo.
  echo FEJL i scraper. Se ovenfor.
  pause
  exit /b 1
)

echo.
echo [2/4] Matcher prioriteter...
node src\match-priorities.js
if %errorlevel% neq 0 (
  echo.
  echo FEJL i priority matcher. Se ovenfor.
  pause
  exit /b 1
)

echo.
echo [3/4] Sender varsler til Teams...
node src\notify.js

echo.
echo [4/4] Genererer og aabner dashboard...
start "" node src\generate-dashboard.js

echo.
echo Alt faerdigt!
timeout /t 4 /nobreak >nul
