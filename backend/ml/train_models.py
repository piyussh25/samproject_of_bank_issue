import pandas as pd
import numpy as np
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import classification_report, accuracy_score

# Try to import XGBoost, fallback to RandomForest if unavailable
try:
    import xgboost as xgb
    USE_XGBOOST = True
    print("Using XGBoost for Risk Classification Model.")
except ImportError:
    from sklearn.ensemble import RandomForestClassifier
    USE_XGBOOST = False
    print("XGBoost not found. Falling back to RandomForestClassifier.")

# Load dataset
DATA_PATH = "c:\\Users\\Piyush\\OneDrive\\Web development\\sam ka project\\backend\\ml\\data\\synthetic_banking_activities.csv"
if not os.path.exists(DATA_PATH):
    raise FileNotFoundError(f"Dataset not found at {DATA_PATH}. Run generate_dataset.py first.")

df = pd.read_csv(DATA_PATH)

# ==========================================
# 1. Feature Engineering & Scaling
# ==========================================

# Features for Model 1: Isolation Forest
# (Anomaly score is computed from these inputs)
m1_features = [
    'login_hour', 
    'device_changed', 
    'failed_login_attempts', 
    'session_duration', 
    'files_downloaded', 
    'sensitive_files_accessed', 
    'admin_commands_executed',
    'privilege_level'
]

# Scale features for Isolation Forest
scaler = MinMaxScaler()
df_scaled = df.copy()
df_scaled[m1_features] = scaler.fit_transform(df[m1_features])

# ==========================================
# 2. Model 1: Behavior Anomaly Detection (Isolation Forest)
# ==========================================
print("Training Model 1: Isolation Forest (Anomaly Detection)...")
# Contamination set to 4% since around 3% of data has injected threats plus standard outliers
iso_forest = IsolationForest(n_estimators=100, contamination=0.04, random_state=42)
iso_forest.fit(df_scaled[m1_features])

# Compute raw anomaly score from decision_function
# decision_function: lower is more anomalous (negative for anomalies, positive for normal)
raw_scores = iso_forest.decision_function(df_scaled[m1_features])

# Normalize anomaly score to [0.0, 1.0] where 1.0 is highly anomalous
# Using min-max scale on decision function (inverted)
min_raw = raw_scores.min()
max_raw = raw_scores.max()
# Normalization mapping: lower raw score -> higher anomaly score
anomaly_scores = 1.0 - (raw_scores - min_raw) / (max_raw - min_raw)
df['anomaly_score'] = anomaly_scores

# ==========================================
# 3. Model 2: Insider Threat Risk Classification (XGBoost / RandomForest)
# ==========================================
# Features for Model 2: Risk Classification
m2_features = [
    'anomaly_score',
    'login_hour',
    'files_downloaded',
    'failed_login_attempts',
    'device_changed',
    'location_changed',
    'privilege_level',
    'sensitive_files_accessed',
    'admin_commands_executed'
]

# Encode target variable: Low=0, Medium=1, High=2, Critical=3
risk_mapping = {'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3}
inv_risk_mapping = {v: k for k, v in risk_mapping.items()}
X = df[m2_features]
y = df['risk_label'].map(risk_mapping)

# Split dataset
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

print("Training Model 2: Insider Threat Risk Classifier...")
if USE_XGBOOST:
    model2 = xgb.XGBClassifier(
        n_estimators=150,
        max_depth=5,
        learning_rate=0.1,
        objective='multi:softprob',
        num_class=4,
        random_state=42,
        eval_metric='mlogloss'
    )
else:
    model2 = RandomForestClassifier(n_estimators=150, max_depth=8, random_state=42)

model2.fit(X_train, y_train)

# Evaluate model
y_pred = model2.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print(f"Model 2 Evaluation Accuracy: {accuracy:.4f}")
print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=['Low', 'Medium', 'High', 'Critical']))

# Save models and assets
models_dir = "c:\\Users\\Piyush\\OneDrive\\Web development\\sam ka project\\backend\\ml\\models"
os.makedirs(models_dir, exist_ok=True)

joblib.dump(iso_forest, os.path.join(models_dir, 'isolation_forest.joblib'))
joblib.dump(model2, os.path.join(models_dir, 'xgboost_model.joblib'))
joblib.dump(scaler, os.path.join(models_dir, 'scaler.joblib'))

# Save metadata (raw scores bounds for runtime normalization)
meta = {
    'min_raw_score': float(min_raw),
    'max_raw_score': float(max_raw),
    'm1_features': m1_features,
    'm2_features': m2_features,
    'use_xgboost': USE_XGBOOST
}
joblib.dump(meta, os.path.join(models_dir, 'metadata.joblib'))

print(f"All ML components successfully saved to {models_dir}")
print("Training Pipeline complete!")
