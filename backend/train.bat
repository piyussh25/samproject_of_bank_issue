@echo off
echo ==========================================
echo Step 1: Checking environment and dependencies
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
goto TRAIN

:ACTIVATE
call venv\Scripts\activate.bat
goto TRAIN

:TRAIN
echo ==========================================
echo Step 2: Generating Synthetic Banking Dataset (CMU-aligned)
echo ==========================================
python ml\generate_dataset.py

echo.
echo ==========================================
echo Step 3: Training ML Models (Isolation Forest + XGBoost)
echo ==========================================
python ml\train_models.py
echo ==========================================
echo Training completed! Models saved.
echo ==========================================
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
