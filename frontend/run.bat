@echo off
echo ==========================================
echo Starting React + Tailwind Security Console
echo ==========================================

if not exist "node_modules" (
    echo node_modules not found. Installing dependencies...
    npm install
    if errorlevel 1 (
        echo Failed to install npm packages. Make sure Node.js is installed.
        pause
        exit /b 1
    )
)

npm run dev -- --host 0.0.0.0 --port 3000
pause

