from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

class UserLogin(BaseModel):
    username: str
    password: str

class SessionEvaluationInput(BaseModel):
    user_id: str = Field(..., example="EMP1001")
    employee_name: str = Field(..., example="James Smith")
    employee_role: str = Field(..., example="Teller")
    privilege_level: int = Field(..., ge=1, le=4, example=1)
    login_hour: int = Field(..., ge=0, le=23, example=10)
    login_country: str = Field(..., example="US")
    login_ip: str = Field(..., example="192.168.1.55")
    device_id: str = Field(..., example="DEV_82736")
    device_changed: int = Field(..., ge=0, le=1, example=0)
    location_changed: int = Field(..., ge=0, le=1, example=0)
    session_duration: float = Field(..., ge=0.0, example=240.0)
    failed_login_attempts: int = Field(..., ge=0, example=0)
    files_downloaded: int = Field(..., ge=0, example=3)
    sensitive_files_accessed: int = Field(..., ge=0, example=5)
    admin_commands_executed: int = Field(..., ge=0, example=0)
    usb_usage: int = Field(..., ge=0, le=1, example=0)
    previous_incidents: int = Field(..., ge=0, example=0)

class AlertResolutionInput(BaseModel):
    status: str = Field(..., example="RESOLVED") # RESOLVED, DISMISSED, INVESTIGATING
    notes: Optional[str] = Field(None, example="Legitimate admin commands for database migration.")

class UserOverrideInput(BaseModel):
    action: str = Field(..., example="Block") # Allow, MFA, Block
    operator_notes: str = Field(..., example="Admin revoked access manually due to credential breach.")
