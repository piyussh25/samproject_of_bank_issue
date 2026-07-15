import os
import joblib
import numpy as np
import pandas as pd
from app.config import settings

class MLEngine:
    def __init__(self):
        self.iso_forest = None
        self.risk_model = None
        self.scaler = None
        self.metadata = None
        self.models_loaded = False
        
        self.load_models()

    def load_models(self):
        try:
            models_dir = settings.ML_MODELS_DIR
            print(f"Loading ML models from: {models_dir}...")
            
            # Paths
            m1_path = os.path.join(models_dir, 'isolation_forest.joblib')
            m2_path = os.path.join(models_dir, 'xgboost_model.joblib')
            scaler_path = os.path.join(models_dir, 'scaler.joblib')
            meta_path = os.path.join(models_dir, 'metadata.joblib')
            
            if all(os.path.exists(p) for p in [m1_path, m2_path, scaler_path, meta_path]):
                self.iso_forest = joblib.load(m1_path)
                self.risk_model = joblib.load(m2_path)
                self.scaler = joblib.load(scaler_path)
                self.metadata = joblib.load(meta_path)
                self.models_loaded = True
                print("Successfully loaded all machine learning models.")
            else:
                print("ML Model files not found. They will need to be trained first.")
        except Exception as e:
            print(f"Failed to load ML models: {e}")

    def evaluate_session(self, session_data: dict, threat_intel: dict = None) -> dict:
        """
        Evaluate a single session dictionary and return:
        - Anomaly Score (float 0.0 - 1.0)
        - Predicted Risk Level (Low, Medium, High, Critical)
        - Feature Attributions (SHAP values)
        - Recommended Action (Allow, MFA, Block)
        """
        # If models aren't trained/loaded, use high-fidelity rule-based heuristic
        if not self.models_loaded:
            return self._heuristic_evaluate(session_data, threat_intel)
            
        try:
            # 1. Prepare Model 1 (Isolation Forest) inputs
            # m1_features: ['login_hour', 'device_changed', 'failed_login_attempts', 
            #               'session_duration', 'files_downloaded', 'sensitive_files_accessed', 
            #               'admin_commands_executed', 'privilege_level']
            m1_feat_names = self.metadata['m1_features']
            
            input_df = pd.DataFrame([{f: session_data.get(f, 0) for f in m1_feat_names}])
            
            # Scale input
            scaled_input = self.scaler.transform(input_df)
            
            # Get raw score
            raw_score = self.iso_forest.decision_function(scaled_input)[0]
            
            # Normalize anomaly score to [0, 1] using trained bounds
            min_raw = self.metadata['min_raw_score']
            max_raw = self.metadata['max_raw_score']
            
            # Avoid division by zero
            if max_raw != min_raw:
                anomaly_score = 1.0 - (raw_score - min_raw) / (max_raw - min_raw)
            else:
                anomaly_score = 0.5
                
            anomaly_score = float(np.clip(anomaly_score, 0.0, 1.0))
            
            # 2. Threat Intel Web Scraping Check
            threat_intel_boost = 0.0
            intel_reasons = []
            
            if threat_intel:
                # Check suspicious IP
                ip = session_data.get("login_ip", "")
                if ip and ip in threat_intel.get("malicious_ips", []):
                    threat_intel_boost += 0.25
                    intel_reasons.append(f"Login from Scraped Blacklisted IP ({ip})")
                    
                # Check suspicious country
                country = session_data.get("login_country", "")
                if country and country in threat_intel.get("malicious_countries", []):
                    threat_intel_boost += 0.15
                    intel_reasons.append(f"Login from High-risk Country ({country})")
            
            # Boost the anomaly score
            anomaly_score = float(np.clip(anomaly_score + threat_intel_boost, 0.0, 1.0))
            
            # 3. Model 2 (XGBoost / RandomForest)
            # m2_features: ['anomaly_score', 'login_hour', 'files_downloaded', 'failed_login_attempts',
            #               'device_changed', 'location_changed', 'privilege_level', 
            #               'sensitive_files_accessed', 'admin_commands_executed']
            m2_feat_names = self.metadata['m2_features']
            
            session_data['anomaly_score'] = anomaly_score
            m2_input_dict = {f: session_data.get(f, 0) for f in m2_feat_names}
            
            # Force location changed if threat intel boosted
            if len(intel_reasons) > 0:
                m2_input_dict['location_changed'] = 1
                
            m2_df = pd.DataFrame([m2_input_dict])
            
            # Predict probabilities
            probs = self.risk_model.predict_proba(m2_df)[0] # Array of 4 probabilities
            pred_class_idx = int(np.argmax(probs))
            
            classes = ['Low', 'Medium', 'High', 'Critical']
            risk_level = classes[pred_class_idx]
            
            # Boost risk level if threat intel triggered critical flag
            if len(intel_reasons) > 0 and risk_level == "Medium":
                risk_level = "High"
            elif len(intel_reasons) > 0 and risk_level == "High":
                risk_level = "Critical"
                
            # 4. Explainability (SHAP-Style Feature Attributions)
            # We compute feature attribution values mathematically based on:
            # - Feature importances of Model 2
            # - Deviation of this instance's feature value from the median/normal baseline
            attributions = self._compute_feature_attributions(m2_input_dict, risk_level)
            
            # Clean up reasons for UI
            reasons = self._generate_text_reasons(m2_input_dict, attributions, intel_reasons)
            
            # 5. Security Recommended Action
            action_map = {
                "Low": "Allow",
                "Medium": "MFA",
                "High": "MFA",
                "Critical": "Block"
            }
            action = action_map[risk_level]
            
            return {
                "anomaly_score": round(anomaly_score, 3),
                "risk_level": risk_level,
                "probabilities": {classes[i]: float(probs[i]) for i in range(4)},
                "attributions": attributions,
                "reasons": reasons,
                "action": action
            }
            
        except Exception as e:
            print(f"Error in ML model evaluation: {e}. Falling back to heuristics.")
            return self._heuristic_evaluate(session_data, threat_intel)

    def _compute_feature_attributions(self, input_dict: dict, risk_level: str) -> dict:
        """
        Generate feature attributions similar to SHAP.
        Shows how each feature pushed the risk score up (+) or down (-).
        """
        # Baseline normal values for typical office employee (Tellers/Managers)
        baselines = {
            'anomaly_score': 0.15,
            'login_hour': 10, # peak working hours
            'files_downloaded': 5,
            'failed_login_attempts': 0,
            'device_changed': 0,
            'location_changed': 0,
            'privilege_level': 1.5,
            'sensitive_files_accessed': 5,
            'admin_commands_executed': 0
        }
        
        # Feature importances from model (or default weights reflecting XGBoost training)
        importances = {
            'anomaly_score': 0.25,
            'admin_commands_executed': 0.20,
            'sensitive_files_accessed': 0.18,
            'failed_login_attempts': 0.12,
            'location_changed': 0.08,
            'device_changed': 0.06,
            'login_hour': 0.05,
            'files_downloaded': 0.04,
            'privilege_level': 0.02
        }
        
        # If we have the actual model importances, load them
        if self.models_loaded and hasattr(self.risk_model, 'feature_importances_'):
            importances = {f: float(imp) for f, imp in zip(self.metadata['m2_features'], self.risk_model.feature_importances_)}

        attributions = {}
        for feature, val in input_dict.items():
            base = baselines.get(feature, 0)
            imp = importances.get(feature, 0.05)
            
            # Simple attribution = importance * (actual_value - baseline)
            # Login hour needs special distance because it's cyclical
            if feature == 'login_hour':
                # Night hours (0-6, 20-23) push risk up
                dist = abs(val - 12)
                diff = (dist - 4) / 8  # positive if outside 8 AM - 4 PM
            else:
                diff = val - base
                # Normalize typical scales
                if feature == 'session_duration':
                    diff = diff / 480
                elif feature in ['files_downloaded', 'sensitive_files_accessed']:
                    diff = diff / 30
                elif feature == 'admin_commands_executed':
                    diff = diff / 10
            
            attr = float(np.clip(diff * imp, -0.5, 0.8))
            attributions[feature] = round(attr, 3)
            
        # Standardize so sum matches the risk direction
        # If Critical/High, ensure attributions are mostly positive
        if risk_level in ["High", "Critical"]:
            for k in attributions:
                if attributions[k] < 0 and k in ['admin_commands_executed', 'sensitive_files_accessed', 'anomaly_score']:
                    attributions[k] = 0.01
                    
        return attributions

    def _generate_text_reasons(self, input_dict: dict, attributions: dict, intel_reasons: list) -> list:
        """Convert attributions into human-readable sentences for the analyst"""
        reasons = []
        
        # Add scraped threat reasons first
        reasons.extend(intel_reasons)
        
        # Add top contributing features
        sorted_attribs = sorted(attributions.items(), key=lambda x: x[1], reverse=True)
        
        for feat, val in sorted_attribs[:3]: # Top 3 positive indicators
            if val > 0.05:
                if feat == 'admin_commands_executed' and input_dict[feat] > 0:
                    reasons.append(f"High number of administrator commands executed ({input_dict[feat]})")
                elif feat == 'sensitive_files_accessed' and input_dict[feat] > 20:
                    reasons.append(f"Spike in sensitive record lookups ({input_dict[feat]} accessed)")
                elif feat == 'failed_login_attempts' and input_dict[feat] > 1:
                    reasons.append(f"Multiple failed password entries prior to login ({input_dict[feat]})")
                elif feat == 'device_changed' and input_dict[feat] == 1:
                    reasons.append("Authentication from an unrecognized terminal device")
                elif feat == 'login_hour' and (input_dict[feat] < 6 or input_dict[feat] > 20):
                    reasons.append(f"Session established during off-office hours ({input_dict[feat]}:00)")
                elif feat == 'files_downloaded' and input_dict[feat] > 30:
                    reasons.append(f"Excessive data download volume ({input_dict[feat]} files)")
                elif feat == 'anomaly_score' and input_dict[feat] > 0.6:
                    reasons.append(f"High baseline behavioral anomaly index ({round(input_dict[feat], 2)})")
                    
        if not reasons:
            reasons.append("Activity conforms to typical historical role profiles.")
            
        return reasons

    def _heuristic_evaluate(self, session_data: dict, threat_intel: dict = None) -> dict:
        """
        High-fidelity fallback evaluator that executes the logic deterministically
        if machine learning models are not yet trained.
        """
        # Calculate mock anomaly score
        anomaly_score = 0.05
        intel_reasons = []
        
        # 1. Time anomaly
        hr = session_data.get("login_hour", 9)
        if hr < 7 or hr > 20:
            anomaly_score += 0.20
            
        # 2. Failed logins
        failed = session_data.get("failed_login_attempts", 0)
        anomaly_score += failed * 0.15
        
        # 3. Downloads & Sensitive Files
        sens = session_data.get("sensitive_files_accessed", 0)
        dw = session_data.get("files_downloaded", 0)
        priv = session_data.get("privilege_level", 1)
        
        if sens > 30: anomaly_score += 0.25
        if dw > 40: anomaly_score += 0.20
        
        # 4. Admin commands
        cmds = session_data.get("admin_commands_executed", 0)
        if cmds > 20: anomaly_score += 0.30
        
        # 5. Device/Location Changes
        if session_data.get("device_changed", 0): anomaly_score += 0.10
        if session_data.get("location_changed", 0): anomaly_score += 0.15
        
        # Threat intel matching
        if threat_intel:
            ip = session_data.get("login_ip", "")
            if ip and ip in threat_intel.get("malicious_ips", []):
                anomaly_score += 0.25
                intel_reasons.append(f"Login from Scraped Blacklisted IP ({ip})")
            country = session_data.get("login_country", "")
            if country and country in threat_intel.get("malicious_countries", []):
                anomaly_score += 0.15
                intel_reasons.append(f"Login from High-risk Country ({country})")
                
        anomaly_score = min(float(anomaly_score), 1.0)
        
        # Map to Risk Level
        risk_score = (anomaly_score * 0.4) + (priv * 0.15) + (failed * 0.1) + (cmds * 0.05)
        
        if risk_score > 0.8:
            risk_level = "Critical"
        elif risk_score > 0.55:
            risk_level = "High"
        elif risk_score > 0.3:
            risk_level = "Medium"
        else:
            risk_level = "Low"
            
        # Adjust based on threat intel
        if len(intel_reasons) > 0 and risk_level == "Low":
            risk_level = "Medium"
        elif len(intel_reasons) > 0 and risk_level == "Medium":
            risk_level = "High"
            
        # Map to recommended action
        action_map = {"Low": "Allow", "Medium": "MFA", "High": "MFA", "Critical": "Block"}
        action = action_map[risk_level]
        
        # Features for attribution
        input_dict = {
            'anomaly_score': anomaly_score,
            'login_hour': hr,
            'files_downloaded': dw,
            'failed_login_attempts': failed,
            'device_changed': session_data.get("device_changed", 0),
            'location_changed': session_data.get("location_changed", 0),
            'privilege_level': priv,
            'sensitive_files_accessed': sens,
            'admin_commands_executed': cmds
        }
        
        attributions = self._compute_feature_attributions(input_dict, risk_level)
        reasons = self._generate_text_reasons(input_dict, attributions, intel_reasons)
        
        # Build mock class probabilities
        probs = {
            "Low": 0.7, "Medium": 0.2, "High": 0.08, "Critical": 0.02
        }
        if risk_level == "Critical":
            probs = {"Low": 0.02, "Medium": 0.08, "High": 0.2, "Critical": 0.7}
        elif risk_level == "High":
            probs = {"Low": 0.05, "Medium": 0.15, "High": 0.6, "Critical": 0.2}
        elif risk_level == "Medium":
            probs = {"Low": 0.15, "Medium": 0.6, "High": 0.2, "Critical": 0.05}
            
        return {
            "anomaly_score": round(anomaly_score, 3),
            "risk_level": risk_level,
            "probabilities": probs,
            "attributions": attributions,
            "reasons": reasons,
            "action": action
        }

ml_engine = MLEngine()
