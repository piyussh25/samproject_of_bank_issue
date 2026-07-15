@echo off
echo ==========================================
echo Starting Privileged Access Misuse Backend
echo ==========================================

if not exist "venv" (
    echo Virtual environment (venv) not found. Creating it...
    python -m venv venv
    if errorlevel 1 (
        echo Failed to create virtual environment. Please make sure Python is installed and in your PATH.
        pause
        exit /b 1
    )
    echo Virtual environment created successfully.
    echo Installing required packages...
    call venv\Scripts\activate.bat
    pip install --upgrade pip setuptools wheel
    pip install -r requirements.txt
    if errorlevel 1 (
        echo Failed to install dependencies.
        pause
        exit /b 1
    )
    echo Dependencies installed successfully.
) else (
    call venv\Scripts\activate.bat
)

echo Seeding database with historical profiles...
python app\seed.py

echo Starting Uvicorn API server on http://localhost:8000...
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause

