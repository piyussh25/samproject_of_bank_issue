@echo off
echo ==========================================
echo Starting Privileged Access Misuse Backend
echo ==========================================

if exist venv goto ACTIVATE
echo Virtual environment (venv) not found. Creating it...
python -m venv venv
if errorlevel 1 goto ERROR_VENV
echo Virtual environment created successfully.
echo Installing required packages...
call venv\Scripts\activate.bat
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
if errorlevel 1 goto ERROR_INSTALL
echo Dependencies installed successfully.
goto START_SERVER

:ACTIVATE
call venv\Scripts\activate.bat
goto START_SERVER

:START_SERVER
echo Starting Uvicorn API server on http://localhost:8000...
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
exit /b 0

:ERROR_VENV
echo Failed to create virtual environment. Please make sure Python is installed and in your PATH.
pause
exit /b 1

:ERROR_INSTALL
echo Failed to install dependencies.
pause
exit /b 1
