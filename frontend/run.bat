@echo off
echo ==========================================
echo Starting React + Tailwind Security Console
echo ==========================================

if exist node_modules goto START_DEV
echo node_modules not found. Installing dependencies...
npm install
if errorlevel 1 goto ERROR_INSTALL

:START_DEV
npm run dev -- --host 0.0.0.0 --port 3000
pause
exit /b 0

:ERROR_INSTALL
echo Failed to install npm packages. Make sure Node.js is installed.
pause
exit /b 1
