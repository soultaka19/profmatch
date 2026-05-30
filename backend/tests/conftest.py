from pathlib import Path
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.cv import CV  # noqa: F401  - register model with metadata
from app.models.competence import Competence  # noqa: F401  - register model with metadata
from app.models.experience import Experience  # noqa: F401  - register model with metadata
from app.models.formation import Formation  # noqa: F401  - register model with metadata
from app.models.langue import Langue  # noqa: F401  - register model with metadata
from app.models.professeur import Professeur
from app.models.user import User, UserRole


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Crée un engine + schéma propre par test (function scope pour éviter les
    conflits d'event loop avec pytest-asyncio 1.x)."""
    engine = create_async_engine(settings.TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)
    async with SessionLocal() as session:
        yield session
        await session.rollback()
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


async def _create_user(db_session: AsyncSession, email: str, role: UserRole, nom: str) -> User:
    user = User(
        email=email,
        password_hash=hash_password("Test@1234"),
        role=role,
        nom_complet=nom,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_user_prof(db_session) -> User:
    return await _create_user(db_session, "testprof@test.ca", UserRole.PROF, "Test Prof")


@pytest_asyncio.fixture
async def test_user_rh(db_session) -> User:
    return await _create_user(db_session, "testrh@test.ca", UserRole.RH, "Test RH")


@pytest_asyncio.fixture
async def test_user_admin(db_session) -> User:
    return await _create_user(db_session, "testadmin@test.ca", UserRole.ADMIN, "Test Admin")


def _headers_for(user: User) -> dict[str, str]:
    token = create_access_token(subject=user.id, role=user.role.value)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_prof(test_user_prof) -> dict[str, str]:
    return _headers_for(test_user_prof)


@pytest.fixture
def auth_headers_rh(test_user_rh) -> dict[str, str]:
    return _headers_for(test_user_rh)


@pytest.fixture
def auth_headers_admin(test_user_admin) -> dict[str, str]:
    return _headers_for(test_user_admin)


@pytest.fixture
def tmp_uploads_dir(tmp_path: Path, monkeypatch) -> Path:
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir()
    monkeypatch.setattr("app.core.config.settings.UPLOADS_DIR", upload_dir)
    return upload_dir


@pytest.fixture
def celery_eager(monkeypatch):
    from app.worker import celery_app
    monkeypatch.setattr(celery_app.conf, "task_always_eager", True)
    monkeypatch.setattr(celery_app.conf, "task_eager_propagates", True)


@pytest.fixture(autouse=True)
def default_llm_api_key(monkeypatch):
    """Garantit un LLM_API_KEY non vide pour les tests qui instancient le SDK OpenAI.

    En CI le secret n'est pas exposé et le défaut de Settings est "" ; le SDK
    OpenAI refuse alors `api_key=""`. On force un placeholder qui n'est PAS
    une vraie clé pour que `get_llm_client()` construise un client utilisable
    dans les tests d'instanciation (`test_llm_client.py`)."""
    if not settings.LLM_API_KEY:
        monkeypatch.setattr(
            "app.core.config.settings.LLM_API_KEY",
            "test-placeholder-not-for-prod",
        )


@pytest.fixture(autouse=True)
def mock_embedding_model(monkeypatch):
    """Neutralise le chargement de sentence-transformers/PyTorch en CI.

    `compute_embedding` reste réel mais s'appuie sur un encodeur déterministe
    léger (hash → vecteur normalisé), sans modèle ML ni téléchargement réseau.
    Les tests qui patchent `_get_model` ou `compute_embedding` localement priment.
    """
    import hashlib

    import numpy as np

    class _FakeModel:
        def encode(self, text, normalize_embeddings=True):
            digest = hashlib.sha256(text.encode("utf-8")).digest()
            vec = np.frombuffer(digest, dtype=np.uint8).astype("float32")
            norm = float(np.linalg.norm(vec)) or 1.0
            return vec / norm

    monkeypatch.setattr("app.services.embeddings._get_model", lambda: _FakeModel())


@pytest.fixture(autouse=True)
def no_real_enqueue_enrichissement(monkeypatch):
    """Neutralise par défaut l'enqueue Celery de l'enrichissement XAI lazy.

    Évite tout appel réel au broker Redis pendant les tests (ex. le GET
    justification déclenche l'enrichissement). Les tests qui veulent observer
    l'enqueue le re-patchent localement pour capturer les appels."""
    monkeypatch.setattr(
        "app.services.affectation_service._enqueue_enrichissement",
        lambda *a, **k: None,
        raising=False,
    )


@pytest.fixture(autouse=True)
def mock_llm_client(monkeypatch):
    """Mock global du client LLM — JAMAIS d'appel API réel en CI.

    Retourne par défaut un client qui produit un JSON valide d'extraction (ok_complete).
    Tests qui veulent un comportement différent doivent override via patch local.
    """
    from unittest.mock import MagicMock
    fixture_path = FIXTURES_DIR / "llm_responses" / "ok_complete.json"
    if not fixture_path.exists():
        return  # fixtures pas encore créées (avant Task 10), pas de mock
    content = fixture_path.read_text(encoding="utf-8")

    def fake_factory():
        client = MagicMock()
        client.chat.completions.create.return_value = MagicMock(
            choices=[MagicMock(message=MagicMock(content=content))]
        )
        return client

    monkeypatch.setattr("app.services.llm_client.get_llm_client", fake_factory)
    monkeypatch.setattr("app.tasks.extraction_tasks.get_llm_client", fake_factory)


@pytest_asyncio.fixture
async def professeur_prof(db_session: AsyncSession, test_user_prof: User) -> Professeur:
    result = await db_session.execute(
        select(Professeur).where(Professeur.user_id == test_user_prof.id)
    )
    prof = result.scalar_one()
    return prof


FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def cv_sample_pdf_bytes() -> bytes:
    return (FIXTURES_DIR / "cv_sample.pdf").read_bytes()


@pytest.fixture
def cv_sample_docx_bytes() -> bytes:
    return (FIXTURES_DIR / "cv_sample.docx").read_bytes()


@pytest.fixture
def cv_corrupt_pdf_bytes() -> bytes:
    return (FIXTURES_DIR / "cv_corrupt.pdf").read_bytes()


@pytest.fixture
def cv_image_only_pdf_bytes() -> bytes:
    return (FIXTURES_DIR / "cv_image_only.pdf").read_bytes()
