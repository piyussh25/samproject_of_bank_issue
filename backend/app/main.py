from fastapi import FastAPI, HTTPException, Depends, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import uuid

from app.config import settings
from app.database import (
    get_sessions_collection, 
    get_alerts_collection, 
    get_users_collection, 
    get_threat_intel_collection
)
from app.scraper import get_threat_intel
from app.ml_engine import ml_engine
from app.schemas import UserLogin, SessionEvaluationInput, AlertResolutionInput, UserOverrideInput

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Powered Privileged Access Misuse & Insider Threat Detection API"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For prototype, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper function to get or initialize threat intelligence in DB
def fetch_cached_threat_intel():
    col = get_threat_intel_collection()
    intel = col.find_one()
    if not intel:
        print("Threat intelligence not cached. Running live scraping...")
        intel = get_threat_intel()
        col.insert_one(intel)
    return intel

@app.on_event("startup")
def startup_event():
    # Pre-fetch threat intel on startup
    try:
        fetch_cached_threat_intel()
    except Exception as e:
        print(f"Failed to fetch threat intel on startup: {e}")
    
    # Force reload models in case they were trained after backend start
    ml_engine.load_models()

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "models_loaded": ml_engine.models_loaded
    }

# ==========================================
# 1. AUTHENTICATION
# ==========================================
@app.post("/api/auth/login")
def login(login_data: UserLogin):
    # Standard dummy login for bank security analyst
    if login_data.username == "admin" and login_data.password == "security2026":
        return {
            "token": "mock-jwt-token-xyz-123",
            "user": {
                "username": "admin",
                "role": "Security Analyst",
                "name": "Alex Mercer"
            }
        }
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials. Hint: use admin / security2026"
    )

# ==========================================
# 2. DASHBOARD STATS
# ==========================================
@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    session_col = get_sessions_collection()
    alert_col = get_alerts_collection()
    intel = fetch_cached_threat_intel()
    
    total_sessions = session_col.count_documents()
    active_alerts = alert_col.count_documents({"status": "OPEN"})
    critical_alerts = alert_col.count_documents({"risk_level": "Critical", "status": "OPEN"})
    high_alerts = alert_col.count_documents({"risk_level": "High", "status": "OPEN"})
    
    # Get recent risk distribution
    sessions = session_col.find(limit=100, sort=[("login_time", -1)])
    risk_counts = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
    for s in sessions:
        rl = s.get("risk_level", "Low")
        if rl in risk_counts:
            risk_counts[rl] += 1
            
    return {
        "total_sessions": total_sessions,
        "active_alerts": active_alerts,
        "critical_alerts": critical_alerts,
        "high_alerts": high_alerts,
        "risk_distribution": risk_counts,
        "threat_intel": {
            "last_updated": intel.get("last_updated"),
            "blocked_ips_count": len(intel.get("malicious_ips", [])),
            "flagged_countries_count": len(intel.get("malicious_countries", []))
        }
    }

# ==========================================
# 3. LIVE SESSIONS & EVALUATIONS
# ==========================================
@app.get("/api/sessions/live")
def get_live_sessions():
    session_col = get_sessions_collection()
    # Return latest 50 sessions
    sessions = session_col.find(limit=50, sort=[("login_time", -1)])
    return sessions

@app.post("/api/sessions/evaluate")
def evaluate_session(input_data: SessionEvaluationInput):
    session_col = get_sessions_collection()
    alert_col = get_alerts_collection()
    user_col = get_users_collection()
    
    # Fetch current threat intelligence
    threat_intel = fetch_cached_threat_intel()
    
    # Prepare session data
    session_dict = input_data.dict()
    session_id = str(uuid.uuid4())
    session_dict["_id"] = session_id
    session_dict["login_time"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Run ML prediction + threat intel checks
    ml_result = ml_engine.evaluate_session(session_dict, threat_intel)
    
    # Merge ML results into session record
    session_dict.update({
        "anomaly_score": ml_result["anomaly_score"],
        "risk_level": ml_result["risk_level"],
        "probabilities": ml_result["probabilities"],
        "attributions": ml_result["attributions"],
        "reasons": ml_result["reasons"],
        "action_taken": ml_result["action"], # Initial action taken (Allow, MFA, Block)
        "override_action": None,
        "override_notes": None
    })
    
    # Save session
    session_col.insert_one(session_dict)
    
    # Update or insert user record (aggregating history)
    user_record = user_col.find_one({"user_id": input_data.user_id})
    if not user_record:
        user_record = {
            "user_id": input_data.user_id,
            "employee_name": input_data.employee_name,
            "employee_role": input_data.employee_role,
            "privilege_level": input_data.privilege_level,
            "session_count": 0,
            "high_risk_incidents": 0,
            "latest_risk_level": "Low",
            "latest_anomaly_score": 0.0
        }
    
    user_record["session_count"] += 1
    user_record["latest_risk_level"] = ml_result["risk_level"]
    user_record["latest_anomaly_score"] = ml_result["anomaly_score"]
    
    # If High or Critical, generate alert incident
    if ml_result["risk_level"] in ["High", "Critical"]:
        user_record["high_risk_incidents"] += 1
        
        # Create alert
        alert_dict = {
            "_id": str(uuid.uuid4()),
            "session_id": session_id,
            "user_id": input_data.user_id,
            "employee_name": input_data.employee_name,
            "employee_role": input_data.employee_role,
            "privilege_level": input_data.privilege_level,
            "risk_level": ml_result["risk_level"],
            "anomaly_score": ml_result["anomaly_score"],
            "reasons": ml_result["reasons"],
            "attributions": ml_result["attributions"],
            "action_taken": ml_result["action"],
            "status": "OPEN", # OPEN, INVESTIGATING, RESOLVED, DISMISSED
            "notes": None,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        alert_col.insert_one(alert_dict)
        
    user_col.update_one({"user_id": input_data.user_id}, {"$set": user_record})
    
    return session_dict

# ==========================================
# 4. ALERTS MANAGEMENT
# ==========================================
@app.get("/api/alerts")
def get_alerts():
    alert_col = get_alerts_collection()
    alerts = alert_col.find(sort=[("timestamp", -1)])
    return alerts

@app.post("/api/alerts/{alert_id}/action")
def update_alert_status(alert_id: str, action_data: AlertResolutionInput):
    alert_col = get_alerts_collection()
    alert = alert_col.find_one({"_id": alert_id})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    alert_col.update_one(
        {"_id": alert_id},
        {"$set": {
            "status": action_data.status,
            "notes": action_data.notes
        }}
    )
    return {"status": "success", "alert_id": alert_id}

@app.post("/api/sessions/{session_id}/override")
def override_session_action(session_id: str, override_data: UserOverrideInput):
    session_col = get_sessions_collection()
    alert_col = get_alerts_collection()
    
    session = session_col.find_one({"_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Update session override status
    session_col.update_one(
        {"_id": session_id},
        {"$set": {
            "override_action": override_data.action,
            "override_notes": override_data.operator_notes,
            "action_taken": override_data.action # Update the current active state
        }}
    )
    
    # Also update any associated alert notes
    alert_col.update_one(
        {"session_id": session_id},
        {"$set": {
            "status": "RESOLVED",
            "notes": f"[Analyst Override to {override_data.action}]: {override_data.operator_notes}"
        }}
    )
    
    return {"status": "success", "session_id": session_id}

# ==========================================
# 5. USER DETAILS & TIMELINES
# ==========================================
@app.get("/api/users/{user_id}")
def get_user_profile(user_id: str):
    user_col = get_users_collection()
    session_col = get_sessions_collection()
    
    user = user_col.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Get user session history for behavioral summary and timeline
    history = session_col.find({"user_id": user_id}, sort=[("login_time", -1)])
    
    # Generate behavior averages/baselines
    averages = {
        "avg_session_duration": 0.0,
        "avg_files_downloaded": 0.0,
        "avg_sensitive_files": 0.0,
        "avg_admin_cmds": 0.0
    }
    
    if history:
        count = len(history)
        averages["avg_session_duration"] = sum(h.get("session_duration", 0) for h in history) / count
        averages["avg_files_downloaded"] = sum(h.get("files_downloaded", 0) for h in history) / count
        averages["avg_sensitive_files"] = sum(h.get("sensitive_files_accessed", 0) for h in history) / count
        averages["avg_admin_cmds"] = sum(h.get("admin_commands_executed", 0) for h in history) / count
        
        # Round values
        for k in averages:
            averages[k] = round(averages[k], 2)
            
    return {
        "profile": user,
        "history": history,
        "baselines": averages
    }

# ==========================================
# 6. THREAT INTELLIGENCE
# ==========================================
@app.get("/api/threat-intel")
def get_scraped_threat_intel():
    intel = fetch_cached_threat_intel()
    return intel

@app.post("/api/threat-intel/refresh")
def refresh_threat_intel(background_tasks: BackgroundTasks):
    col = get_threat_intel_collection()
    
    # Run scraping and update DB
    intel = get_threat_intel()
    col.delete_many({}) # Clear old cache
    col.insert_one(intel)
    
    # Reload model engines check
    ml_engine.load_models()
    
    return {"status": "success", "last_updated": intel["last_updated"]}
