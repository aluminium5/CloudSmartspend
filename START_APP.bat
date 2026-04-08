@echo off
TITLE CloudSmartSpend - Portable Launcher
echo ---------------------------------------------------
echo CloudSmartSpend - Starting Local Server...
echo ---------------------------------------------------

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed. 
    echo Please install Node.js from https://nodejs.org to run this app locally.
    pause
    exit
)

:: Check if 'serve' is installed, if not, use npx (which is part of node)
echo [INFO] Launching app on http://localhost:3000
echo [INFO] Keep this window open while using the app.
echo ---------------------------------------------------

npx serve -l 3000 .
