import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "AgriShield"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "agrishield-ultra-secure-key-2026-production-farmers-first")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database Settings: Support MySQL with graceful SQLite fallback
    # MySQL default format: mysql+pymysql://agrishield_user:securepassword@localhost:3306/agrishield_db
    MYSQL_USER: str = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "127.0.0.1")
    MYSQL_PORT: int = int(os.getenv("MYSQL_PORT", "3306"))
    MYSQL_DB: str = os.getenv("MYSQL_DB", "agrishield")
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL", None)

    # Email / SMTP Settings (Real Email Verification)
    SMTP_ENABLED: bool = os.getenv("SMTP_ENABLED", "false").lower() in ("true", "1", "yes")
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")  # Dedicated App Password
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "noreply@agrishield.io")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "AgriShield Safety Platform")
    SMTP_TLS: bool = os.getenv("SMTP_TLS", "true").lower() in ("true", "1", "yes")
    SMTP_SSL: bool = os.getenv("SMTP_SSL", "false").lower() in ("true", "1", "yes")
    ALLOW_DEV_OTP_FALLBACK: bool = os.getenv("ALLOW_DEV_OTP_FALLBACK", "true").lower() in ("true", "1", "yes")
    
    # Device and Freshness Settings
    DATA_FRESHNESS_INTERVAL_SECONDS: int = 15  # STALE after 15s without reading
    DEVICE_HEARTBEAT_TIMEOUT_SECONDS: int = 30  # OFFLINE after 30s without heartbeat
    FALL_CANCELLATION_WINDOW_SECONDS: int = 20  # Time for farmer to cancel false positive fall
    
    # Upload paths
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    
    class Config:
        case_sensitive = True

settings = Settings()
