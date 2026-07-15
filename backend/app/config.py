import os
from dotenv import load_dotenv

# Load .env file if it exists
load_dotenv()

class Settings:
    PROJECT_NAME: str = "Privileged Access Misuse & Insider Threat Detection"
    API_V1_STR: str = "/api"
    
    # Database Settings
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    DB_NAME: str = os.getenv("DB_NAME", "insider_threat_db")
    
    # Local File Fallback (if MongoDB is not available)
    FALLBACK_DB_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "db")
    
    # ML Models Paths
    ML_MODELS_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ml", "models")
    
    # Threat Intelligence Configuration
    DEFAULT_SUSPICIOUS_COUNTRIES: list = ["KP", "RU", "IR", "SY", "UA", "RO"]
    
    # Secret Key for Mock JWT (just for prototype auth)
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-for-bank-security-system")

settings = Settings()
