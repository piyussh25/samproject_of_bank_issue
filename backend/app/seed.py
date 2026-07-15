import os
import pandas as pd
import json
from datetime import datetime, timedelta
import random
import uuid

# Set python path if running as script
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.database import (
    get_sessions_collection, 
    get_alerts_collection, 
    get_users_collection, 
    get_threat_intel_collection,
    db_manager
)
from app.scraper import get_threat_intel
from app.ml_engine import ml_engine

def seed_database():
    print("Initializing Database Seeding...")
    
    # 1. Clear database collections
    print("Clearing existing collections...")
    get_sessions_collection().delete_many({})
    get_alerts_collection().delete_many({})
    get_users_collection().delete_many({})
    get_threat_intel_collection().delete_many({})
    
    # 2. Scrape & Cache Threat Intel
    print("Scraping live threat intelligence...")
    intel = get_threat_intel()
    get_threat_intel_collection().insert_one(intel)
    print(f"Scraped threat intelligence cached (Malicious IPs: {len(intel['malicious_ips'])}).")
    
    # 3. Read Synthetic CSV
    csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml", "data", "synthetic_banking_activities.csv")
    if not os.path.exists(csv_path):
        print(f"Synthetic dataset not found at {csv_path}. Please run generate_dataset.py and train_models.py first.")
        return
        
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} records from synthetic dataset. Preparing seed data...")
    
    # 4. Generate User Profiles
    # Collect unique users
    unique_users = df.groupby('user_id').first().reset_index()
    user_records = []
    
    for _, row in unique_users.iterrows():
        uid = row['user_id']
        name = row['employee_name']
        role = row['employee_role']
        priv = int(row['privilege_level'])
        
        # Calculate summary statistics for this user from the full dataset
        user_df = df[df['user_id'] == uid]
        session_count = len(user_df)
        high_risk_count = len(user_df[user_df['risk_label'].isin(['High', 'Critical'])])
        
        user_records.append({
            "user_id": uid,
            "employee_name": name,
            "employee_role": role,
            "privilege_level": priv,
            "session_count": session_count,
            "high_risk_incidents": high_risk_count,
            "latest_risk_level": "Low",
            "latest_anomaly_score": 0.05
        })
        
    get_users_collection().insert_many(user_records)
    print(f"Seeded {len(user_records)} employee user profiles.")
    
    # 5. Seed Sessions and Alerts
    # Take a diverse slice of 150 sessions (normal and anomalies) to seed database logs
    # Make sure we select all injected threat scenarios for excellent dashboard visibility
    threats_df = df[df['threat_scenario'] != 'Normal'].sample(n=min(30, len(df[df['threat_scenario'] != 'Normal'])), random_state=42)
    normals_df = df[df['threat_scenario'] == 'Normal'].sample(n=120, random_state=42)
    
    seed_df = pd.concat([threats_df, normals_df]).sort_values(by='login_time', ascending=False)
    
    sessions_to_insert = []
    alerts_to_insert = []
    
    # We will run real ML evaluations on these seeded records if models are loaded, 
    # otherwise we use the CSV pre-calculated risk labels and anomaly scores
    print("Evaluating seed sessions through ML engine...")
    for idx, row in seed_df.iterrows():
        session_id = str(uuid.uuid4())
        
        # Parse login date
        try:
            # Shift timestamps to recent dates (the last 5 days) so the dashboard looks fresh
            days_ago = random.randint(0, 5)
            recent_time = datetime.now() - timedelta(days=days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))
            login_time_str = recent_time.strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            login_time_str = row['login_time']
            
        session_dict = {
            "_id": session_id,
            "user_id": row['user_id'],
            "employee_name": row['employee_name'],
            "employee_role": row['employee_role'],
            "privilege_level": int(row['privilege_level']),
            "login_time": login_time_str,
            "login_hour": int(row['login_hour']),
            "login_country": row['login_country'],
            "login_ip": f"198.51.100.{random.randint(10, 200)}" if row['threat_scenario'] == 'Normal' else random.choice(intel['malicious_ips'][:5]),
            "device_id": row['device_id'],
            "device_changed": int(row['device_changed']),
            "location_changed": int(row['location_changed']),
            "session_duration": float(row['session_duration']),
            "failed_login_attempts": int(row['failed_login_attempts']),
            "files_downloaded": int(row['files_downloaded']),
            "sensitive_files_accessed": int(row['sensitive_files_accessed']),
            "admin_commands_executed": int(row['admin_commands_executed']),
            "usb_usage": int(row['usb_usage']),
            "previous_incidents": int(row['previous_incidents']),
            "threat_scenario": row['threat_scenario']
        }
        
        # Evaluate using ML engine to populate explainability details
        ml_result = ml_engine.evaluate_session(session_dict, intel)
        
        session_dict.update({
            "anomaly_score": ml_result["anomaly_score"],
            "risk_level": ml_result["risk_level"],
            "probabilities": ml_result["probabilities"],
            "attributions": ml_result["attributions"],
            "reasons": ml_result["reasons"],
            "action_taken": ml_result["action"],
            "override_action": None,
            "override_notes": None
        })
        
        sessions_to_insert.append(session_dict)
        
        # Seed user's latest stats
        for u in user_records:
            if u["user_id"] == row['user_id']:
                u["latest_risk_level"] = ml_result["risk_level"]
                u["latest_anomaly_score"] = ml_result["anomaly_score"]
                break
                
        # Generate alert if high or critical
        if ml_result["risk_level"] in ["High", "Critical"]:
            # Some alerts will be marked as RESOLVED or INVESTIGATING to make the dashboard look like a real operation
            status_choice = random.choices(["OPEN", "INVESTIGATING", "RESOLVED"], weights=[0.6, 0.2, 0.2])[0]
            notes = "Investigated and verified login credentials with employee" if status_choice == "RESOLVED" else None
            
            alerts_to_insert.append({
                "_id": str(uuid.uuid4()),
                "session_id": session_id,
                "user_id": row['user_id'],
                "employee_name": row['employee_name'],
                "employee_role": row['employee_role'],
                "privilege_level": int(row['privilege_level']),
                "risk_level": ml_result["risk_level"],
                "anomaly_score": ml_result["anomaly_score"],
                "reasons": ml_result["reasons"],
                "attributions": ml_result["attributions"],
                "action_taken": ml_result["action"],
                "status": status_choice,
                "notes": notes,
                "timestamp": login_time_str
            })

    # Save to database
    if sessions_to_insert:
        get_sessions_collection().insert_many(sessions_to_insert)
    if alerts_to_insert:
        get_alerts_collection().insert_many(alerts_to_insert)
        
    # Update the users in DB with their latest fields
    for u in user_records:
        get_users_collection().update_one({"user_id": u["user_id"]}, {"$set": u})
        
    print(f"Seeded {len(sessions_to_insert)} sessions.")
    print(f"Seeded {len(alerts_to_insert)} security alerts.")
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    # Ensure models are loaded
    ml_engine.load_models()
    seed_database()
