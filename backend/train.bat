@echo off
echo ==========================================
echo Step 1: Generating Synthetic Banking Dataset (CMU-aligned)
echo ==========================================
call venv\Scripts\activate.bat
python ml\generate_dataset.py

echo.
echo ==========================================
echo Step 2: Training ML Models (Isolation Forest + XGBoost)
echo ==========================================
python ml\train_models.py
echo ==========================================
echo Training completed! Models saved.
echo ==========================================
pause
