@echo off
echo ============================================================
echo  IndieLance AI Matchmaking Service
echo  Model : all-MiniLM-L6-v2 (sentence-transformers)
echo  Port  : 8765
echo ============================================================
echo.

cd /d "%~dp0"

REM ── Check for venv, create if missing ──────────────────────────
if not exist venv (
    echo [setup] Creating virtual environment...
    python -m venv venv
    echo [setup] Installing dependencies...
    venv\Scripts\pip install -r requirements.txt
) else (
    echo [setup] Virtual environment found.
)

echo.
echo [start] Starting FastAPI server on http://127.0.0.1:8765 ...
echo         Press Ctrl+C to stop.
echo.
venv\Scripts\python main.py
pause
