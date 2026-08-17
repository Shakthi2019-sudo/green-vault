import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True)

    BASE_DIR: Path = BASE_DIR
    BASE_DIR: Path = BASE_DIR
    PROJECT_ROOT: Path = PROJECT_ROOT
    PROJECT_NAME: str = "GREEN VAULT"
    PROJECT_DESCRIPTION: str = "A Trusted Digital Vault for Legal Records"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Security & JWT
    JWT_SECRET_KEY: str = "green-vault-super-secure-jwt-key-2026-dresden-heritage-production-grade"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours for demo ease

    # AES-256-GCM Master Encryption Key (32 bytes = 256 bits in hex)
    # In production this would be stored in a HSM / KMS.
    AES_MASTER_KEY_HEX: str = "7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b"

    # Database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'green_vault.db'}"

    # File Size Limits (Configurable in MB)
    MAX_DOCUMENT_SIZE_MB: int = 25
    MAX_IMAGE_SIZE_MB: int = 25
    MAX_VIDEO_SIZE_MB: int = 250

    # Supported File Extensions
    ALLOWED_EXTENSIONS: list[str] = [
        "pdf", "doc", "docx", "txt", "jpg", "jpeg", "png",
        "mp4", "webm", "mov", "avi", "m4v", "mpeg", "mpg", "3gp", "mkv"
    ]
    VIDEO_EXTENSIONS: list[str] = ["mp4", "webm", "mov", "avi", "m4v", "mpeg", "mpg", "3gp", "mkv"]
    IMAGE_EXTENSIONS: list[str] = ["jpg", "jpeg", "png"]
    DOCUMENT_EXTENSIONS: list[str] = ["pdf", "doc", "docx", "txt"]

    # Vault Storage Paths
    STORAGE_DIR: Path = BASE_DIR / "storage"
    PRIMARY_VAULT_DIR: Path = BASE_DIR / "storage" / "primary_vault"
    RECOVERY_VAULT_DIR: Path = BASE_DIR / "storage" / "recovery_vault"
    TEMP_DIR: Path = BASE_DIR / "storage" / "temp"

    # Demo Credentials Path
    DEMO_CREDENTIALS_DIR: Path = PROJECT_ROOT / "demo" / "credentials"
    DEMO_CREDENTIALS_FILE: Path = PROJECT_ROOT / "demo" / "credentials" / "GREEN_VAULT_DEMO_CREDENTIALS.md"
    DEMO_DOCUMENTS_DIR: Path = PROJECT_ROOT / "demo" / "documents"

settings = Settings()

# Ensure required directories exist
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
settings.PRIMARY_VAULT_DIR.mkdir(parents=True, exist_ok=True)
settings.RECOVERY_VAULT_DIR.mkdir(parents=True, exist_ok=True)
settings.TEMP_DIR.mkdir(parents=True, exist_ok=True)
settings.DEMO_CREDENTIALS_DIR.mkdir(parents=True, exist_ok=True)
settings.DEMO_DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)
