from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),  # racine du projet (dev local) ou backend/ (Docker)
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Base de données
    DATABASE_URL: str
    TEST_DATABASE_URL: str = ""

    # Redis / Celery
    REDIS_URL: str = "redis://redis:6379/0"
    CELERY_ALWAYS_EAGER: bool = False

    # JWT
    SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_TTL_HOURS: int = 24

    # API LLM
    LLM_API_URL: str = "http://localhost:11434/v1"
    LLM_API_COOKIE: str = ""
    # Vide par défaut pour ne pas bloquer les tests CI (le client LLM est mocké
    # autouse). Doit être renseignée en .env pour les appels live au proxy CoCalc.
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gpt-oss-ctx24k:120b"
    LLM_MAX_RETRIES: int = 2
    # Mode mock — extrait localement sans appeler le LLM.
    # Mettre à true quand l'API de compétition est indisponible (dev local).
    LLM_MOCK_MODE: bool = False

    # Upload CV
    UPLOAD_DIR: str = "/app/uploads"
    UPLOADS_DIR: Path = Path("/uploads")
    MAX_UPLOAD_SIZE_MB: int = 10

    # Frontend (utilisé pour construire l'URL d'activation envoyée à l'admin)
    FRONTEND_URL: str = "http://localhost:3000"


settings = Settings()
