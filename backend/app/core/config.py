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

    # Démo : crée les 3 comptes (prof/rh/admin) au démarrage du backend si true
    # (idempotent, lu par entrypoint.sh). Le jeu de données riche reste optionnel
    # via le bouton admin « Charger le jeu de démo ».
    SEED_DEMO_ACCOUNTS_ON_START: bool = False

    # JWT
    SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_TTL_HOURS: int = 24

    # API LLM
    LLM_API_URL: str
    LLM_API_COOKIE: str
    # Vide par défaut pour ne pas bloquer les tests CI (le client LLM est mocké
    # autouse). Doit être renseignée en .env pour les appels live au proxy CoCalc.
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gpt-oss-ctx24k:120b"
    LLM_MAX_RETRIES: int = 2
    # Timeout dédié à l'extraction CV : appel bien plus lourd que la narration
    # XAI (modèle 120B, max_tokens=2000, tout le texte du CV) et exécuté en
    # tâche Celery de fond, donc on peut accorder largement plus que les 15 s du
    # client par défaut.
    LLM_EXTRACTION_TIMEOUT_S: float = 90.0
    # Timeout de la narration XAI. Génération légère (~500 tokens) mais sur un
    # modèle 120B souvent lent : 15 s faisait trop souvent retomber sur la
    # justification statique. Depuis le découplage Niveau 2 (enrichissement lazy
    # en arrière-plan, statique déjà affichée), on peut accorder ~45 s sans
    # bloquer l'utilisateur. Baisser à 30 s pour une démo plus réactive.
    LLM_XAI_TIMEOUT_S: float = 45.0

    # Upload CV
    UPLOAD_DIR: str = "/app/uploads"
    UPLOADS_DIR: Path = Path("/uploads")
    MAX_UPLOAD_SIZE_MB: int = 10

    # Frontend (utilisé pour construire l'URL d'activation envoyée à l'admin)
    FRONTEND_URL: str = "http://localhost:3000"


settings = Settings()
