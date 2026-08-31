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
    # Spécifique au proxy CoCalc de la compétition : laissée vide pour tout
    # autre fournisseur (Gemini, OpenAI, Ollama…), auquel cas aucun cookie
    # n'est envoyé — voir services/llm_client.py.
    LLM_API_COOKIE: str = ""
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
    # Plafond de génération de l'extraction CV. Valait 2000 en dur, dimensionné
    # pour gpt-oss-120B qui n'émettait que du texte de sortie.
    #
    # Les modèles à raisonnement (Gemini 3.x) imputent AUSSI leurs jetons de
    # réflexion à ce plafond : mesuré sur un CV court, 640 jetons de réflexion
    # pour 160 de sortie, et un appel plafonné à 100 s'arrête avec
    # `finish_reason: "length"` après 1 seul jeton produit. À 2000, un CV fourni
    # verrait donc son JSON tronqué — donc invalide, donc trois tentatives puis
    # échec. 4000 laisse la marge nécessaire ; à baisser pour un modèle sans
    # raisonnement, où la valeur d'origine suffit.
    LLM_EXTRACTION_MAX_TOKENS: int = 4000

    # Embeddings du score sémantique W4 (services/embeddings.py). Calculés par
    # l'API du fournisseur, sur le même endpoint et la même clé que le LLM.
    EMBEDDING_MODEL: str = "gemini-embedding-001"
    # 384 : dimension native de l'ancien modèle local (all-MiniLM-L6-v2), donc
    # aucun changement de schéma ni d'empreinte de stockage. Les colonnes sont
    # des `double precision[]` sans dimension fixe : monter à 768 ou 3072 ne
    # demande qu'un backfill --force, pas de migration.
    EMBEDDING_DIMENSIONS: int = 384
    # Timeout de la narration XAI. Génération légère (~500 tokens) mais sur un
    # modèle 120B souvent lent : 15 s faisait trop souvent retomber sur la
    # justification statique. Depuis le découplage Niveau 2 (enrichissement lazy
    # en arrière-plan, statique déjà affichée), on peut accorder ~45 s sans
    # bloquer l'utilisateur. Baisser à 30 s pour une démo plus réactive.
    LLM_XAI_TIMEOUT_S: float = 45.0

    # Upload CV : dossier de stockage des fichiers et taille max acceptée
    # (services/cv_service.py)
    UPLOADS_DIR: Path = Path("/uploads")
    MAX_UPLOAD_SIZE_MB: int = 10

    # Frontend (utilisé pour construire l'URL d'activation envoyée à l'admin)
    FRONTEND_URL: str = "http://localhost:3000"

    # --- Démonstration publique ------------------------------------------
    # Bac à sable jetable : trois comptes (prof/rh/admin) et une session
    # académique par visiteur, effacés à l'expiration.
    DEMO_DUREE_MINUTES: int = 60
    # Plafond de bacs vivants. Il ne dépend d'aucun en-tête : c'est le
    # garde-fou qui tient encore si la limite par adresse IP est contournée.
    DEMO_MAX_VIVANTS: int = 30
    # Créations autorisées par adresse IP et par fenêtre.
    DEMO_LIMITE_CREATIONS: int = 3
    DEMO_FENETRE_MINUTES: int = 10
    DEMO_PURGE_INTERVALLE_SECONDES: int = 300

    # --- Budget des appels au modèle -------------------------------------
    # Appels LLM accordés à un bac à sable : l'extraction d'un CV en consomme
    # un, chaque narration XAI consultée en consomme un autre.
    DEMO_APPELS_IA: int = 6
    # Plafond global quotidien, tous bacs confondus. Mesuré au tarif
    # gemini-3.6-flash (0,75 $/M en entrée, 3,75 $/M en sortie, jetons de
    # réflexion facturés en sortie) : une extraction de CV coûte de l'ordre
    # de 0,8 ¢ et une narration XAI de 0,3 ¢, soit moins de 0,50 $ par jour
    # à ce plafond.
    DEMO_APPELS_IA_PAR_JOUR: int = 60


settings = Settings()
