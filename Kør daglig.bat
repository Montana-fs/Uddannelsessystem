@echo off
cd /d "%~dp0"
node src\catalog-sync.js
node src\notify.js
node src\notify-runner.js
