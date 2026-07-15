# GuardInsider: AI-Powered Privileged Access Misuse & Insider Threat Detection

A real-time cybersecurity dashboard and machine learning classification system designed for the banking sector. GuardInsider monitors privileged user activities, detects anomalies, classifies threat risks, and provides Explainable AI (SHAP) attributions to assist security analysts in automated and manual intervention.

Developed for the **"Privileged Access Misuse & Insider Threat Detection"** Hackathon.

---

## Key Features

1. **Dual ML Model Pipeline**:
   * **Model 1: Behavioral Anomaly Detection (Isolation Forest)**: Analyzes user session variables (login hours, fails, download volumes, sensitive database lookups, admin commands) to output a normalized `Anomaly Index` (0.0 - 1.0).
   * **Model 2: Threat Risk Classifier (XGBoost)**: Leverages the anomaly score and activity metrics to classify session risks into **Low**, **Medium**, **High**, or **Critical**.
2. **Explainable AI (SHAP Attributions)**:
   * Maps positive (+) and negative (-) risk drivers onto an analyst-friendly horizontal bar chart, showing exactly *why* a privileged user was flagged.
3. **Web-Scraped OSINT Integration (Innovation)**:
   * Dynamic BeautifulSoup scraper that pulls live cybersecurity advisories from **CISA** and compromised IP blocklists from **Emerging Threats**.
   * Logs from blocked threat IPs/countries automatically escalate anomaly and risk scores.
4. **Active Defense Overrides**:
   * Integrated intervention console enabling security operators to investigate, resolve clean, or execute overrides (Allow, Force MFA challenge, or Block session).
5. **Standalone DB Fallback Engine**:
   * Standard MongoDB integration with automatic fallback to structured local JSON files, guaranteeing a **zero-configuration run** for judges.
6. **Hackathon Simulator Deck**:
   * In-app panel to trigger live session simulations (normal users vs database sabotage, exfiltration, or compromised credentials) and watch the AI react in real time.

---

## Directory Structure

```text
sam-ka-project/
├── backend/
│   ├── app/                 # FastAPI routes, schemas, database fallback, scraper, & ML engine
│   ├── ml/                  # ML training script, data generator, and serialized joblib models
│   ├── requirements.txt     # Python backend dependencies
│   ├── train.bat            # Script to run dataset generation and train ML models
│   └── run.bat              # Script to seed database and start FastAPI
├── frontend/
│   ├── src/                 # React UI components, page views, and API state context
│   ├── package.json         # Node frontend dependencies
│   └── run.bat              # Script to start React Vite Server
└── README.md                # Quickstart instructions
```

---

## Quick Start Instructions

Ensure you have **Python 3.10+** and **Node.js 18+** installed.

### Step 1: Initialize and Run Backend
Open a terminal in the project root:
```cmd
cd backend

# 1. Generate CMU-aligned banking dataset and train ML models
train.bat

# 2. Seed database and launch FastAPI server
run.bat
```
*The FastAPI server will start on [http://localhost:8000](http://localhost:8000).*

### Step 2: Run React Frontend
Open a second terminal in the project root:
```cmd
cd frontend

# Start Vite UI Server
run.bat
```
*The React Console will open on [http://localhost:3000](http://localhost:3000).*

---

## Demo Operator Credentials

Log in to the security console using the following credentials:
* **Username**: `admin`
* **Access Keyphrase**: `security2026`
