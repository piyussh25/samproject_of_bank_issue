import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta

# Set random seed for reproducibility
np.random.seed(42)
random.seed(42)

# Configuration
NUM_RECORDS = 10000
NUM_USERS = 40

# Employee Roles and baseline settings
ROLES = {
    'System Admin': {'privilege': 4, 'weight': 0.10, 'normal_admin_cmds': (10, 30), 'normal_sensitive_files': (2, 8)},
    'DBA': {'privilege': 4, 'weight': 0.10, 'normal_admin_cmds': (5, 20), 'normal_sensitive_files': (15, 35)},
    'Manager': {'privilege': 3, 'weight': 0.15, 'normal_admin_cmds': (0, 0), 'normal_sensitive_files': (5, 15)},
    'Teller': {'privilege': 1, 'weight': 0.50, 'normal_admin_cmds': (0, 0), 'normal_sensitive_files': (10, 25)},
    'Vendor': {'privilege': 2, 'weight': 0.15, 'normal_admin_cmds': (0, 3), 'normal_sensitive_files': (1, 5)}
}

# Dummy names for users
FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth',
               'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen']
LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
              'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin']

# User Profile Creation
users = []
role_choices = list(ROLES.keys())
role_weights = [ROLES[r]['weight'] for r in role_choices]

for i in range(NUM_USERS):
    uid = f"EMP{1000 + i}"
    name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
    role = random.choices(role_choices, weights=role_weights)[0]
    priv = ROLES[role]['privilege']
    users.append({
        'user_id': uid,
        'employee_name': name,
        'employee_role': role,
        'privilege_level': priv,
        'common_device': f"DEV_{random.randint(10000, 99999)}",
        'common_country': 'US' if random.random() < 0.9 else random.choice(['IN', 'GB', 'CA'])
    })

# Start generating records
data = []
start_date = datetime(2026, 1, 1)

for i in range(NUM_RECORDS):
    # Select user
    user = random.choice(users)
    uid = user['user_id']
    name = user['employee_name']
    role = user['employee_role']
    priv = user['privilege_level']
    
    # 1. Base time variables (CMU CERT style distributions)
    # Most logins are weekdays, office hours (8 AM - 6 PM)
    is_weekend = random.random() < 0.10 # 10% weekend logins
    if is_weekend:
        # Weekend: wider spread
        login_hour = int(np.clip(np.random.normal(12, 4), 0, 23))
    else:
        # Weekday: peak around 8 AM-9 AM and 1 PM
        if random.random() < 0.7:
            login_hour = int(np.clip(np.random.normal(8.5, 1.0), 0, 23))
        else:
            login_hour = int(np.clip(np.random.normal(13.5, 2.0), 0, 23))
            
    # Session duration (Log-normal distribution, CMU normal baseline: ~8 hours / 480 mins)
    session_duration = float(np.random.lognormal(mean=np.log(480), sigma=0.4))
    session_duration = np.clip(session_duration, 10, 720) # cap between 10m and 12h
    
    # Login Date
    days_offset = random.randint(0, 180)
    login_time = start_date + timedelta(days=days_offset, hours=login_hour, minutes=random.randint(0, 59))
    
    # Network location
    country = user['common_country']
    location_changed = 0
    if random.random() < 0.02: # 2% chance of travel/change
        country = random.choice(['GB', 'CA', 'SG', 'AE', 'DE'])
        if country != user['common_country']:
            location_changed = 1
            
    # Device ID
    device_id = user['common_device']
    device_changed = 0
    if random.random() < 0.03: # 3% chance of device change (e.g. mobile/laptop replacement)
        device_id = f"DEV_{random.randint(10000, 99999)}"
        device_changed = 1

    # Normal metrics behavior
    failed_login_attempts = int(np.random.poisson(0.05)) # Poisson: usually 0, occasionally 1
    failed_login_attempts = min(failed_login_attempts, 2)
    
    files_downloaded = int(np.random.lognormal(mean=np.log(5), sigma=0.6))
    files_downloaded = max(1, min(files_downloaded, 30))
    
    # Sensitive files and admin commands based on roles
    sens_range = ROLES[role]['normal_sensitive_files']
    sensitive_files_accessed = random.randint(sens_range[0], sens_range[1])
    
    admin_range = ROLES[role]['normal_admin_cmds']
    admin_commands_executed = random.randint(admin_range[0], admin_range[1])
    
    usb_usage = 1 if random.random() < 0.01 else 0 # 1% normal USB usage
    previous_incidents = int(np.random.poisson(0.02)) # very low incident rates normally
    
    # Defaults
    is_anomaly = False
    threat_scenario = "Normal"
    risk_label = "Low"
    
    # We will inject threat scenarios (~3% overall)
    # The random index determines if we inject an anomaly here
    if i % 33 == 0:
        is_anomaly = True
        scenario_type = random.choice([1, 2, 3])
        
        if scenario_type == 1:
            # SCENARIO 1: The Rogue Administrator (Sabotage / Admin commands spike)
            # Make sure we use a high-privilege account
            if role in ['System Admin', 'DBA']:
                threat_scenario = "Rogue Administrator Sabotage"
                login_hour = random.choice([23, 0, 1, 2, 3, 4]) # Late night
                session_duration = float(np.random.uniform(15, 60)) # Quick inside work
                admin_commands_executed = random.randint(40, 80) # Massive admin command count
                sensitive_files_accessed = random.randint(30, 60)
                files_downloaded = random.randint(40, 70)
                usb_usage = 1
                previous_incidents = random.randint(1, 3)
                risk_label = "Critical"
            else:
                is_anomaly = False # Reset if role doesn't fit, will model as normal
                
        elif scenario_type == 2:
            # SCENARIO 2: Data Exfiltration (IP Theft)
            threat_scenario = "Data Exfiltration Attempt"
            # Accessing sensitive database on a weekend
            login_hour = random.choice([20, 21, 22, 23, 0, 5, 6]) # Off-hours
            session_duration = float(np.random.uniform(300, 600)) # Stays logged in
            files_downloaded = random.randint(80, 150) # Massive download volume
            sensitive_files_accessed = random.randint(70, 120) # Accessing a lot of records
            usb_usage = 1 # Saving to USB
            if random.random() < 0.5:
                location_changed = 1
                country = random.choice(['RO', 'KP', 'RU', 'UA']) # Suspect location
            risk_label = "High"
            
        elif scenario_type == 3:
            # SCENARIO 3: Compromised Account (Credential Stuffing / Hijacking)
            threat_scenario = "Compromised Credentials Access"
            failed_login_attempts = random.randint(3, 5) # Brute force attempts first
            device_changed = 1 # Access from foreign device
            location_changed = 1 # Access from foreign country
            country = random.choice(['RU', 'KP', 'IR', 'CN'])
            login_hour = random.randint(0, 23)
            session_duration = float(np.random.uniform(5, 30)) # Quick reconnaissance
            files_downloaded = random.randint(20, 45)
            sensitive_files_accessed = random.randint(30, 55)
            admin_commands_executed = random.randint(5, 15) if priv == 4 else 0
            risk_label = "Critical"

    # Set risk labels for normal data based on standard risk heuristics
    if not is_anomaly:
        # Base risk assessment for normal users
        total_risk_score = 0
        if privilege_level := priv:
            total_risk_score += privilege_level * 1.5
        if failed_login_attempts > 0:
            total_risk_score += failed_login_attempts * 2.0
        if device_changed:
            total_risk_score += 2.0
        if location_changed:
            total_risk_score += 3.0
            
        if total_risk_score > 7.0:
            risk_label = "Medium"
        else:
            risk_label = "Low"

    data.append({
        'user_id': uid,
        'employee_name': name,
        'employee_role': role,
        'privilege_level': priv,
        'login_time': login_time.strftime("%Y-%m-%d %H:%M:%S"),
        'login_hour': login_hour,
        'login_country': country,
        'location_changed': location_changed,
        'device_id': device_id,
        'device_changed': device_changed,
        'session_duration': round(session_duration, 2),
        'failed_login_attempts': failed_login_attempts,
        'files_downloaded': files_downloaded,
        'sensitive_files_accessed': sensitive_files_accessed,
        'admin_commands_executed': admin_commands_executed,
        'usb_usage': usb_usage,
        'previous_incidents': previous_incidents,
        'threat_scenario': threat_scenario,
        'risk_label': risk_label
    })

# Convert to DataFrame
df = pd.DataFrame(data)

# Save to CSV
import os
os.makedirs("c:\\Users\\Piyush\\OneDrive\\Web development\\sam ka project\\backend\\ml\\data", exist_ok=True)
df.to_csv("c:\\Users\\Piyush\\OneDrive\\Web development\\sam ka project\\backend\\ml\\data\\synthetic_banking_activities.csv", index=False)

print(f"Dataset successfully generated with {len(df)} records.")
print(df['risk_label'].value_counts())
print(df['threat_scenario'].value_counts())
