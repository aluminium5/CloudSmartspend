@echo off
TITLE CloudSmartSpend - Building Executable
echo ---------------------------------------------------
echo CloudSmartSpend - Desktop Packaging Utility
echo ---------------------------------------------------

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed. 
    echo Please install Node.js from https://nodejs.org
    pause
    exit
)

echo [1/3] Installing Electron dependencies (this may take a few minutes)...
call npm install

echo [2/3] Packaging for Windows x64...
call npm run package-win

echo ---------------------------------------------------
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Packaging failed. Check the error messages above.
) else (
    echo [SUCCESS] CloudSmartSpend EXE has been created!
    echo [INFO] You can find it in: dist\CloudSmartSpend-win32-x64
)
echo ---------------------------------------------------
pause
