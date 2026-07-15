@echo off
echo ==========================================
echo Starting Privileged Access Misuse Backend
echo ==========================================
call venv\Scripts\activate.bat

echo Seeding database with historical profiles...
python app\seed.py

echo Starting Uvicorn API server on http://localhost:8000...
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
