from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),  # racine du projet (dev local) ou backend/ (Docker)
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Base de données
    DATABASE_URL: str

    # Redis / Celery
    REDIS_URL: str = "redis://redis:6379/0"

    # JWT
    SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_TTL_HOURS: int = 24

    # API LLM
    LLM_API_URL: str
    LLM_API_COOKIE: str
    LLM_MODEL: str = "gpt-oss-ctx24k:120b"
    LLM_MAX_RETRIES: int = 2

    # Upload CV
    UPLOAD_DIR: str = "/app/uploads"
    MAX_UPLOAD_SIZE_MB: int = 10


settings = Settings()
