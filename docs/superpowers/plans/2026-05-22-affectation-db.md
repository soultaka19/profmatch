# Affectation DB Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pose la couche persistance de la chaîne d'affectation : 6 nouveaux modèles SQLAlchemy + 1 migration Alembic + tests d'invariants. Aucun service, aucun endpoint.

**Architecture:** Modèles ORM SQLAlchemy 2.0 dans `backend/app/models/`, miroir du pattern existant `Competence/Professeur`. Invariant `W1+W2+W3+W4=1.0` redondé en CHECK constraint Postgres. Auto-création de `PonderationsSession` via listener `after_insert` sur `Session`, miroir du listener existant `_create_professeur_for_prof_user`. Migration Alembic unique générée par autogenerate, revue manuellement.

**Tech Stack:** Python 3.12, SQLAlchemy 2.0 (async), Alembic, PostgreSQL 16, pytest-asyncio.

**Spec source:** `docs/superpowers/specs/2026-05-22-affectation-db-design.md`

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `backend/app/models/session.py` | **CREATE** | `Session` modèle + `SessionStatut` enum + listener auto-création ponderations |
| `backend/app/models/cours.py` | **CREATE** | `Cours` modèle |
| `backend/app/models/competence_cours.py` | **CREATE** | `CompetenceCours` modèle (1-N owned-by-Cours) |
| `backend/app/models/affectation.py` | **CREATE** | `Affectation` modèle + `AffectationStatut` enum |
| `backend/app/models/affectation_feedback.py` | **CREATE** | `AffectationFeedback` modèle |
| `backend/app/models/ponderations_session.py` | **CREATE** | `PonderationsSession` modèle + CHECK constraint W=1.0 |
| `backend/app/models/__init__.py` | **MODIFY** | Enregistrer les 6 nouveaux modèles |
| `backend/alembic/versions/<rev>_add_affectation_tables.py` | **CREATE (autogen)** | Migration : 6 tables + 2 enums + 1 CHECK + indexes |
| `backend/tests/test_session_model.py` | **CREATE** | Session + auto-création ponderations + unicité code |
| `backend/tests/test_cours_model.py` | **CREATE** | Cours + CompetenceCours + unicité (session, code) |
| `backend/tests/test_affectation_model.py` | **CREATE** | Affectation + unicité triplet + cascade + SET NULL |
| `backend/tests/test_affectation_feedback_model.py` | **CREATE** | Feedback + CHECK note_rh 1-5 + cascade |
| `backend/tests/test_ponderations_session_model.py` | **CREATE** | Invariant W=1.0 + tolérance + unicité session |

**Files separated by entity** (small focused files), tests miroir 1-pour-1 du fichier modèle, à l'identique du pattern `competence.py`/`test_competence_model.py`.

---

## Task 0 : Branche de travail

**Files:** aucun

- [ ] **Step 1: Vérifier que main est à jour**

Run:
```bash
cd C:/workflow/defis-cite/profmatch && git checkout main && git pull origin main
```
Expected: `Already up to date.` ou fast-forward propre. HEAD doit être `c71a2b3 feat(algo): scoring W1-W4 + justification XAI statique (#12)`.

- [ ] **Step 2: Créer la branche feature**

Run:
```bash
git checkout -b feature/affectation-db
```
Expected: `Switched to a new branch 'feature/affectation-db'`.

- [ ] **Step 3: Vérifier l'environnement Python**

Run:
```bash
cd backend && python -c "import sqlalchemy; print(sqlalchemy.__version__)"
```
Expected: `2.0.x`.

---

## Task 1 : Modèle Session + enum SessionStatut

**Files:**
- Create: `backend/app/models/session.py`
- Create: `backend/tests/test_session_model.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Écrire le test échouant — création Session minimale**

Create `backend/tests/test_session_model.py`:

```python
from datetime import date

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session import Session, SessionStatut


@pytest.mark.asyncio
async def test_create_session(db_session: AsyncSession):
    sess = Session(
        code="A2026",
        nom="Automne 2026",
        date_debut=date(2026, 9, 1),
        date_fin=date(2026, 12, 20),
    )
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)

    assert sess.id is not None
    assert sess.code == "A2026"
    assert sess.statut == SessionStatut.PLANIFIEE
    assert sess.cree_le is not None


@pytest.mark.asyncio
async def test_session_code_unique(db_session: AsyncSession):
    db_session.add(
        Session(code="A2026", nom="Automne 2026",
                date_debut=date(2026, 9, 1), date_fin=date(2026, 12, 20))
    )
    await db_session.commit()

    db_session.add(
        Session(code="A2026", nom="Doublon",
                date_debut=date(2027, 1, 1), date_fin=date(2027, 4, 30))
    )
    with pytest.raises(IntegrityError):
        await db_session.commit()
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run:
```bash
cd backend && pytest tests/test_session_model.py -v
```
Expected: `ImportError` ou `ModuleNotFoundError: No module named 'app.models.session'`.

- [ ] **Step 3: Créer le modèle Session minimal**

Create `backend/app/models/session.py`:

```python
from datetime import date, datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Date, DateTime, Enum as SQLEnum, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.cours import Cours
    from app.models.affectation import Affectation
    from app.models.ponderations_session import PonderationsSession


class SessionStatut(str, Enum):
    PLANIFIEE = "planifiee"
    ACTIVE = "active"
    CLOTUREE = "cloturee"


class Session(Base):
    """Session académique — regroupe les cours offerts sur un trimestre donné."""

    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    nom: Mapped[str] = mapped_column(String(120), nullable=False)
    date_debut: Mapped[date] = mapped_column(Date, nullable=False)
    date_fin: Mapped[date] = mapped_column(Date, nullable=False)
    statut: Mapped[SessionStatut] = mapped_column(
        SQLEnum(
            SessionStatut,
            name="session_statut",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
        default=SessionStatut.PLANIFIEE,
        server_default=SessionStatut.PLANIFIEE.value,
    )
    cree_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    mis_a_jour_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    cours: Mapped[list["Cours"]] = relationship(
        "Cours", back_populates="session", cascade="all, delete-orphan"
    )
    affectations: Mapped[list["Affectation"]] = relationship(
        "Affectation", back_populates="session", cascade="all, delete-orphan"
    )
    ponderations: Mapped["PonderationsSession | None"] = relationship(
        "PonderationsSession",
        back_populates="session",
        uselist=False,
        cascade="all, delete-orphan",
    )
```

- [ ] **Step 4: Enregistrer dans `app/models/__init__.py`**

Modify `backend/app/models/__init__.py` — ajouter cette ligne après les imports existants :

```python
from app.models.session import Session, SessionStatut  # noqa: F401
```

- [ ] **Step 5: Lancer le test pour vérifier qu'il passe**

Run:
```bash
cd backend && pytest tests/test_session_model.py::test_create_session tests/test_session_model.py::test_session_code_unique -v
```
Expected: 2 PASS. (Le test ImportError disparaît.)

- [ ] **Step 6: Commit**

```bash
git add backend/app/models/session.py backend/app/models/__init__.py backend/tests/test_session_model.py
git commit -m "feat(db): add Session model with SessionStatut enum"
```

---

## Task 2 : Modèle Cours + CompetenceCours

**Files:**
- Create: `backend/app/models/cours.py`
- Create: `backend/app/models/competence_cours.py`
- Create: `backend/tests/test_cours_model.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Écrire les tests échouants**

Create `backend/tests/test_cours_model.py`:

```python
from datetime import date

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.competence_cours import CompetenceCours
from app.models.cours import Cours
from app.models.session import Session


async def _make_session(db_session: AsyncSession, code: str = "A2026") -> Session:
    sess = Session(code=code, nom=f"Session {code}",
                   date_debut=date(2026, 9, 1), date_fin=date(2026, 12, 20))
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)
    return sess


@pytest.mark.asyncio
async def test_create_cours(db_session: AsyncSession):
    sess = await _make_session(db_session)
    cours = Cours(
        session_id=sess.id, code="PI-301", titre="Algorithmes",
        description="Tri, recherche, complexité", programme="PI",
    )
    db_session.add(cours)
    await db_session.commit()
    await db_session.refresh(cours)
    assert cours.id is not None
    assert cours.code == "PI-301"


@pytest.mark.asyncio
async def test_cours_unique_par_session(db_session: AsyncSession):
    sess = await _make_session(db_session, "A2026")
    db_session.add(Cours(session_id=sess.id, code="PI-301", titre="Algo 1"))
    await db_session.commit()

    db_session.add(Cours(session_id=sess.id, code="PI-301", titre="Doublon"))
    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_cours_meme_code_ok_sessions_differentes(db_session: AsyncSession):
    s1 = await _make_session(db_session, "A2026")
    s2 = await _make_session(db_session, "H2027")
    db_session.add(Cours(session_id=s1.id, code="PI-301", titre="Algo A"))
    db_session.add(Cours(session_id=s2.id, code="PI-301", titre="Algo B"))
    await db_session.commit()
    result = await db_session.execute(select(Cours))
    assert len(result.scalars().all()) == 2


@pytest.mark.asyncio
async def test_competence_cours_cascade_delete(db_session: AsyncSession):
    sess = await _make_session(db_session)
    cours = Cours(session_id=sess.id, code="PI-301", titre="Algo")
    db_session.add(cours)
    await db_session.commit()
    await db_session.refresh(cours)

    db_session.add(CompetenceCours(cours_id=cours.id, nom="Python"))
    db_session.add(CompetenceCours(cours_id=cours.id, nom="Tri"))
    await db_session.commit()

    await db_session.delete(cours)
    await db_session.commit()

    result = await db_session.execute(select(CompetenceCours))
    assert result.scalars().all() == []
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run:
```bash
cd backend && pytest tests/test_cours_model.py -v
```
Expected: `ModuleNotFoundError: No module named 'app.models.cours'`.

- [ ] **Step 3: Créer le modèle Cours**

Create `backend/app/models/cours.py`:

```python
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.session import Session
    from app.models.competence_cours import CompetenceCours
    from app.models.affectation import Affectation


class Cours(Base):
    """Cours offert dans une session — porte les compétences requises."""

    __tablename__ = "cours"
    __table_args__ = (
        UniqueConstraint("session_id", "code", name="uq_cours_session_code"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    titre: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    programme: Mapped[str | None] = mapped_column(String(120), nullable=True)
    cree_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    mis_a_jour_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(),
        onupdate=func.now(), nullable=False,
    )

    session: Mapped["Session"] = relationship("Session", back_populates="cours")
    competences: Mapped[list["CompetenceCours"]] = relationship(
        "CompetenceCours", back_populates="cours", cascade="all, delete-orphan"
    )
    affectations: Mapped[list["Affectation"]] = relationship(
        "Affectation", back_populates="cours", cascade="all, delete-orphan"
    )
```

- [ ] **Step 4: Créer le modèle CompetenceCours**

Create `backend/app/models/competence_cours.py`:

```python
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.cours import Cours


class CompetenceCours(Base):
    """Compétence requise par un cours (miroir du pattern Competence côté Professeur)."""

    __tablename__ = "competences_cours"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    cours_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("cours.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    nom: Mapped[str] = mapped_column(String(120), nullable=False)
    cree_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    cours: Mapped["Cours"] = relationship("Cours", back_populates="competences")
```

- [ ] **Step 5: Enregistrer dans `__init__.py`**

Add to `backend/app/models/__init__.py`:

```python
from app.models.cours import Cours  # noqa: F401
from app.models.competence_cours import CompetenceCours  # noqa: F401
```

- [ ] **Step 6: Lancer les tests**

Run:
```bash
cd backend && pytest tests/test_cours_model.py -v
```
Expected: 4 PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/app/models/cours.py backend/app/models/competence_cours.py backend/app/models/__init__.py backend/tests/test_cours_model.py
git commit -m "feat(db): add Cours and CompetenceCours models with session-scoped unique code"
```

---

## Task 3 : Modèle Affectation + enum AffectationStatut

**Files:**
- Create: `backend/app/models/affectation.py`
- Create: `backend/tests/test_affectation_model.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Écrire les tests échouants**

Create `backend/tests/test_affectation_model.py`:

```python
from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.affectation import Affectation, AffectationStatut
from app.models.cours import Cours
from app.models.professeur import Professeur
from app.models.session import Session
from app.models.user import User, UserRole


async def _setup(db_session: AsyncSession, professeur_prof: Professeur):
    sess = Session(code="A2026", nom="A2026",
                   date_debut=date(2026, 9, 1), date_fin=date(2026, 12, 20))
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)
    cours = Cours(session_id=sess.id, code="PI-301", titre="Algo")
    db_session.add(cours)
    await db_session.commit()
    await db_session.refresh(cours)
    return sess, cours


@pytest.mark.asyncio
async def test_create_affectation(db_session: AsyncSession, professeur_prof: Professeur):
    sess, cours = await _setup(db_session, professeur_prof)
    aff = Affectation(
        session_id=sess.id, professeur_id=professeur_prof.id, cours_id=cours.id,
        score_global=Decimal("0.840"),
        score_competences=Decimal("0.857"),
        score_experience=Decimal("0.750"),
        score_historique=Decimal("1.000"),
        score_semantique=Decimal("0.620"),
    )
    db_session.add(aff)
    await db_session.commit()
    await db_session.refresh(aff)
    assert aff.id is not None
    assert aff.statut == AffectationStatut.PROPOSEE
    assert aff.score_global == Decimal("0.840")


@pytest.mark.asyncio
async def test_affectation_unique_triplet(db_session: AsyncSession, professeur_prof: Professeur):
    sess, cours = await _setup(db_session, professeur_prof)
    db_session.add(Affectation(
        session_id=sess.id, professeur_id=professeur_prof.id, cours_id=cours.id,
        score_global=Decimal("0.5"), score_competences=Decimal("0.5"),
        score_experience=Decimal("0.5"), score_historique=Decimal("0.5"),
        score_semantique=Decimal("0.5"),
    ))
    await db_session.commit()

    db_session.add(Affectation(
        session_id=sess.id, professeur_id=professeur_prof.id, cours_id=cours.id,
        score_global=Decimal("0.9"), score_competences=Decimal("0.9"),
        score_experience=Decimal("0.9"), score_historique=Decimal("0.9"),
        score_semantique=Decimal("0.9"),
    ))
    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_affectation_cascade_par_session(db_session: AsyncSession, professeur_prof: Professeur):
    sess, cours = await _setup(db_session, professeur_prof)
    db_session.add(Affectation(
        session_id=sess.id, professeur_id=professeur_prof.id, cours_id=cours.id,
        score_global=Decimal("0.5"), score_competences=Decimal("0.5"),
        score_experience=Decimal("0.5"), score_historique=Decimal("0.5"),
        score_semantique=Decimal("0.5"),
    ))
    await db_session.commit()

    await db_session.delete(sess)
    await db_session.commit()

    result = await db_session.execute(select(Affectation))
    assert result.scalars().all() == []


@pytest.mark.asyncio
async def test_affectation_cascade_par_professeur(db_session: AsyncSession, professeur_prof: Professeur):
    sess, cours = await _setup(db_session, professeur_prof)
    db_session.add(Affectation(
        session_id=sess.id, professeur_id=professeur_prof.id, cours_id=cours.id,
        score_global=Decimal("0.5"), score_competences=Decimal("0.5"),
        score_experience=Decimal("0.5"), score_historique=Decimal("0.5"),
        score_semantique=Decimal("0.5"),
    ))
    await db_session.commit()

    await db_session.delete(professeur_prof)
    await db_session.commit()

    result = await db_session.execute(select(Affectation))
    assert result.scalars().all() == []


@pytest.mark.asyncio
async def test_affectation_valide_par_set_null(
    db_session: AsyncSession, professeur_prof: Professeur, test_user_rh: User
):
    sess, cours = await _setup(db_session, professeur_prof)
    aff = Affectation(
        session_id=sess.id, professeur_id=professeur_prof.id, cours_id=cours.id,
        score_global=Decimal("0.84"), score_competences=Decimal("0.86"),
        score_experience=Decimal("0.75"), score_historique=Decimal("1.0"),
        score_semantique=Decimal("0.62"),
        statut=AffectationStatut.VALIDEE,
        valide_par_user_id=test_user_rh.id,
    )
    db_session.add(aff)
    await db_session.commit()
    await db_session.refresh(aff)
    assert aff.valide_par_user_id == test_user_rh.id

    await db_session.delete(test_user_rh)
    await db_session.commit()
    await db_session.refresh(aff)
    assert aff.valide_par_user_id is None
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run:
```bash
cd backend && pytest tests/test_affectation_model.py -v
```
Expected: `ModuleNotFoundError: No module named 'app.models.affectation'`.

- [ ] **Step 3: Créer le modèle Affectation**

Create `backend/app/models/affectation.py`:

```python
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger, DateTime, Enum as SQLEnum, ForeignKey, Numeric, Text,
    UniqueConstraint, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.session import Session
    from app.models.cours import Cours
    from app.models.professeur import Professeur
    from app.models.user import User
    from app.models.affectation_feedback import AffectationFeedback


class AffectationStatut(str, Enum):
    PROPOSEE = "proposee"
    VALIDEE = "validee"
    REJETEE = "rejetee"


class Affectation(Base):
    """Proposition d'affectation professeur ↔ cours pour une session donnée."""

    __tablename__ = "affectations"
    __table_args__ = (
        UniqueConstraint(
            "session_id", "professeur_id", "cours_id",
            name="uq_affectation_session_prof_cours",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    professeur_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("professeurs.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    cours_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("cours.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    score_global: Mapped[Decimal] = mapped_column(Numeric(4, 3), nullable=False)
    score_competences: Mapped[Decimal] = mapped_column(Numeric(4, 3), nullable=False)
    score_experience: Mapped[Decimal] = mapped_column(Numeric(4, 3), nullable=False)
    score_historique: Mapped[Decimal] = mapped_column(Numeric(4, 3), nullable=False)
    score_semantique: Mapped[Decimal] = mapped_column(Numeric(4, 3), nullable=False)

    justification: Mapped[str | None] = mapped_column(Text, nullable=True)
    statut: Mapped[AffectationStatut] = mapped_column(
        SQLEnum(
            AffectationStatut,
            name="affectation_statut",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
        default=AffectationStatut.PROPOSEE,
        server_default=AffectationStatut.PROPOSEE.value,
    )
    valide_par_user_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    valide_le: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cree_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    mis_a_jour_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(),
        onupdate=func.now(), nullable=False,
    )

    session: Mapped["Session"] = relationship("Session", back_populates="affectations")
    professeur: Mapped["Professeur"] = relationship("Professeur")
    cours: Mapped["Cours"] = relationship("Cours", back_populates="affectations")
    valide_par: Mapped["User | None"] = relationship("User")
    feedbacks: Mapped[list["AffectationFeedback"]] = relationship(
        "AffectationFeedback", back_populates="affectation", cascade="all, delete-orphan"
    )
```

- [ ] **Step 4: Enregistrer dans `__init__.py`**

Add to `backend/app/models/__init__.py`:

```python
from app.models.affectation import Affectation, AffectationStatut  # noqa: F401
```

- [ ] **Step 5: Lancer les tests**

Run:
```bash
cd backend && pytest tests/test_affectation_model.py -v
```
Expected: 5 PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/models/affectation.py backend/app/models/__init__.py backend/tests/test_affectation_model.py
git commit -m "feat(db): add Affectation model with AffectationStatut enum and unique triplet"
```

---

## Task 4 : Modèle AffectationFeedback + CHECK note_rh 1-5

**Files:**
- Create: `backend/app/models/affectation_feedback.py`
- Create: `backend/tests/test_affectation_feedback_model.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Écrire les tests échouants**

Create `backend/tests/test_affectation_feedback_model.py`:

```python
from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.affectation import Affectation
from app.models.affectation_feedback import AffectationFeedback
from app.models.cours import Cours
from app.models.professeur import Professeur
from app.models.session import Session
from app.models.user import User


async def _setup_aff(db_session: AsyncSession, professeur_prof: Professeur) -> Affectation:
    sess = Session(code="A2026", nom="A2026",
                   date_debut=date(2026, 9, 1), date_fin=date(2026, 12, 20))
    db_session.add(sess)
    await db_session.commit()
    cours = Cours(session_id=sess.id, code="PI-301", titre="Algo")
    db_session.add(cours)
    await db_session.commit()
    aff = Affectation(
        session_id=sess.id, professeur_id=professeur_prof.id, cours_id=cours.id,
        score_global=Decimal("0.5"), score_competences=Decimal("0.5"),
        score_experience=Decimal("0.5"), score_historique=Decimal("0.5"),
        score_semantique=Decimal("0.5"),
    )
    db_session.add(aff)
    await db_session.commit()
    await db_session.refresh(aff)
    return aff


@pytest.mark.asyncio
async def test_create_feedback(db_session: AsyncSession, professeur_prof: Professeur, test_user_rh: User):
    aff = await _setup_aff(db_session, professeur_prof)
    fb = AffectationFeedback(
        affectation_id=aff.id, note_rh=4,
        commentaire="Très bon profil", cree_par_user_id=test_user_rh.id,
    )
    db_session.add(fb)
    await db_session.commit()
    await db_session.refresh(fb)
    assert fb.id is not None
    assert fb.note_rh == 4


@pytest.mark.asyncio
@pytest.mark.parametrize("note", [0, 6, -1, 10])
async def test_feedback_note_rh_check_constraint_invalide(
    db_session: AsyncSession, professeur_prof: Professeur, note: int
):
    aff = await _setup_aff(db_session, professeur_prof)
    db_session.add(AffectationFeedback(affectation_id=aff.id, note_rh=note))
    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
@pytest.mark.parametrize("note", [1, 3, 5])
async def test_feedback_note_rh_check_constraint_valide(
    db_session: AsyncSession, professeur_prof: Professeur, note: int
):
    aff = await _setup_aff(db_session, professeur_prof)
    db_session.add(AffectationFeedback(affectation_id=aff.id, note_rh=note))
    await db_session.commit()


@pytest.mark.asyncio
async def test_feedback_cascade_par_affectation(db_session: AsyncSession, professeur_prof: Professeur):
    aff = await _setup_aff(db_session, professeur_prof)
    db_session.add(AffectationFeedback(affectation_id=aff.id, note_rh=3))
    db_session.add(AffectationFeedback(affectation_id=aff.id, note_rh=5))
    await db_session.commit()

    await db_session.delete(aff)
    await db_session.commit()

    result = await db_session.execute(select(AffectationFeedback))
    assert result.scalars().all() == []
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run:
```bash
cd backend && pytest tests/test_affectation_feedback_model.py -v
```
Expected: `ModuleNotFoundError`.

- [ ] **Step 3: Créer le modèle AffectationFeedback**

Create `backend/app/models/affectation_feedback.py`:

```python
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger, CheckConstraint, DateTime, ForeignKey, SmallInteger, Text, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.affectation import Affectation
    from app.models.user import User


class AffectationFeedback(Base):
    """Retour RH sur une affectation passée — alimentera le bonus W3 historique."""

    __tablename__ = "affectation_feedbacks"
    __table_args__ = (
        CheckConstraint("note_rh BETWEEN 1 AND 5", name="ck_feedback_note_rh_1_5"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    affectation_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("affectations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    note_rh: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    commentaire: Mapped[str | None] = mapped_column(Text, nullable=True)
    cree_par_user_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    cree_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    affectation: Mapped["Affectation"] = relationship("Affectation", back_populates="feedbacks")
    cree_par: Mapped["User | None"] = relationship("User")
```

- [ ] **Step 4: Enregistrer dans `__init__.py`**

Add to `backend/app/models/__init__.py`:

```python
from app.models.affectation_feedback import AffectationFeedback  # noqa: F401
```

- [ ] **Step 5: Lancer les tests**

Run:
```bash
cd backend && pytest tests/test_affectation_feedback_model.py -v
```
Expected: 1 + 4 + 3 + 1 = 9 PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/models/affectation_feedback.py backend/app/models/__init__.py backend/tests/test_affectation_feedback_model.py
git commit -m "feat(db): add AffectationFeedback model with CHECK constraint note_rh 1-5"
```

---

## Task 5 : Modèle PonderationsSession + invariant CHECK W=1.0 + auto-création

**Files:**
- Create: `backend/app/models/ponderations_session.py`
- Modify: `backend/app/models/session.py` (ajout du listener `after_insert`)
- Create: `backend/tests/test_ponderations_session_model.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Écrire les tests échouants**

Create `backend/tests/test_ponderations_session_model.py`:

```python
from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ponderations_session import PonderationsSession
from app.models.session import Session


async def _make_session_orphan(db_session: AsyncSession, code: str = "A2026") -> Session:
    sess = Session(code=code, nom=code,
                   date_debut=date(2026, 9, 1), date_fin=date(2026, 12, 20))
    db_session.add(sess)
    await db_session.commit()
    await db_session.refresh(sess)
    return sess


@pytest.mark.asyncio
async def test_session_cree_ponderations_par_defaut(db_session: AsyncSession):
    sess = await _make_session_orphan(db_session)
    result = await db_session.execute(
        select(PonderationsSession).where(PonderationsSession.session_id == sess.id)
    )
    pond = result.scalar_one()
    assert pond.w1 == Decimal("0.400")
    assert pond.w2 == Decimal("0.300")
    assert pond.w3 == Decimal("0.200")
    assert pond.w4 == Decimal("0.100")


@pytest.mark.asyncio
async def test_ponderations_unique_par_session(db_session: AsyncSession):
    sess = await _make_session_orphan(db_session)
    # Listener a déjà créé une ligne → ajouter une seconde doit échouer
    db_session.add(PonderationsSession(
        session_id=sess.id,
        w1=Decimal("0.4"), w2=Decimal("0.3"),
        w3=Decimal("0.2"), w4=Decimal("0.1"),
    ))
    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_ponderations_invariant_somme_violee(db_session: AsyncSession):
    sess = await _make_session_orphan(db_session, "H2027")
    # Récupérer la ligne auto-créée et la modifier hors invariant
    result = await db_session.execute(
        select(PonderationsSession).where(PonderationsSession.session_id == sess.id)
    )
    pond = result.scalar_one()
    pond.w1 = Decimal("0.500")  # somme = 0.500+0.300+0.200+0.100 = 1.100
    with pytest.raises(IntegrityError):
        await db_session.commit()


@pytest.mark.asyncio
async def test_ponderations_tolerance_acceptee(db_session: AsyncSession):
    sess = await _make_session_orphan(db_session, "E2028")
    result = await db_session.execute(
        select(PonderationsSession).where(PonderationsSession.session_id == sess.id)
    )
    pond = result.scalar_one()
    # Somme = 0.401+0.300+0.200+0.100 = 1.001 → dans la tolérance ≤ 0.001
    pond.w1 = Decimal("0.401")
    await db_session.commit()
    assert pond.w1 == Decimal("0.401")
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run:
```bash
cd backend && pytest tests/test_ponderations_session_model.py -v
```
Expected: `ModuleNotFoundError: No module named 'app.models.ponderations_session'`.

- [ ] **Step 3: Créer le modèle PonderationsSession avec CHECK**

Create `backend/app/models/ponderations_session.py`:

```python
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger, CheckConstraint, DateTime, ForeignKey, Numeric, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.session import Session


class PonderationsSession(Base):
    """Poids W1-W4 par session — invariant CHECK W1+W2+W3+W4 ≈ 1.0 ± 0.001."""

    __tablename__ = "ponderations_sessions"
    __table_args__ = (
        CheckConstraint(
            "ABS((w1 + w2 + w3 + w4) - 1.0) <= 0.001",
            name="ck_ponderations_somme_1",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("sessions.id", ondelete="CASCADE"),
        unique=True, nullable=False,
    )
    w1: Mapped[Decimal] = mapped_column(
        Numeric(4, 3), nullable=False, server_default="0.400"
    )
    w2: Mapped[Decimal] = mapped_column(
        Numeric(4, 3), nullable=False, server_default="0.300"
    )
    w3: Mapped[Decimal] = mapped_column(
        Numeric(4, 3), nullable=False, server_default="0.200"
    )
    w4: Mapped[Decimal] = mapped_column(
        Numeric(4, 3), nullable=False, server_default="0.100"
    )
    mis_a_jour_le: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(),
        onupdate=func.now(), nullable=False,
    )

    session: Mapped["Session"] = relationship("Session", back_populates="ponderations")
```

- [ ] **Step 4: Ajouter le listener `after_insert` sur Session**

Modify `backend/app/models/session.py` — ajouter à la **fin du fichier** :

```python
from sqlalchemy import event


@event.listens_for(Session, "after_insert")
def _create_ponderations_for_session(mapper, connection, target: Session) -> None:
    from app.models.ponderations_session import PonderationsSession
    connection.execute(
        PonderationsSession.__table__.insert().values(session_id=target.id)
    )
```

**Note** : import à l'intérieur de la fonction pour éviter l'import circulaire au chargement du module.

- [ ] **Step 5: Enregistrer dans `__init__.py`**

Add to `backend/app/models/__init__.py`:

```python
from app.models.ponderations_session import PonderationsSession  # noqa: F401
```

- [ ] **Step 6: Lancer les tests**

Run:
```bash
cd backend && pytest tests/test_ponderations_session_model.py -v
```
Expected: 4 PASS. Si le test de tolérance échoue avec `decimal precision` : vérifier que `Numeric(4,3)` arrondit bien `0.401` → conservé tel quel (4 chiffres total dont 3 décimales).

- [ ] **Step 7: Commit**

```bash
git add backend/app/models/ponderations_session.py backend/app/models/session.py backend/app/models/__init__.py backend/tests/test_ponderations_session_model.py
git commit -m "feat(db): add PonderationsSession with CHECK invariant and auto-create listener"
```

---

## Task 6 : Migration Alembic

**Files:**
- Create: `backend/alembic/versions/<rev>_add_affectation_tables.py` (autogenerate puis revue)

- [ ] **Step 1: Vérifier que la BDD locale est à jour**

Run:
```bash
cd backend && alembic upgrade head
```
Expected: pas d'erreur, "Running upgrade ... -> 849d836e4480, add_resume_profil_to_professeurs" ou similaire si déjà à jour.

- [ ] **Step 2: Générer la migration**

Run:
```bash
cd backend && alembic revision --autogenerate -m "add_affectation_tables"
```
Expected: nouveau fichier dans `alembic/versions/` du type `<rev>_add_affectation_tables.py`.

- [ ] **Step 3: Réviser manuellement la migration**

Ouvrir le fichier généré et vérifier :
- L'ordre `op.create_table` respecte les FK : `sessions` → `cours` → `competences_cours` → `ponderations_sessions` → `affectations` → `affectation_feedbacks`
- Les 2 enums (`session_statut`, `affectation_statut`) sont créés avant les tables qui les utilisent
- La `CheckConstraint("ABS((w1 + w2 + w3 + w4) - 1.0) <= 0.001")` est bien présente sur `ponderations_sessions`
- La `CheckConstraint("note_rh BETWEEN 1 AND 5")` est bien présente sur `affectation_feedbacks`
- Le `UniqueConstraint(session_id, code)` est bien sur `cours`
- Le `UniqueConstraint(session_id, professeur_id, cours_id)` est bien sur `affectations`
- Les indexes sur les FK (`session_id`, `professeur_id`, `cours_id`, `affectation_id`) sont créés
- Le `downgrade()` fait l'inverse strict + `op.execute("DROP TYPE IF EXISTS session_statut")` et `affectation_statut`

Corriger manuellement si Alembic a manqué un ordre ou un enum. Modèle de référence : `alembic/versions/f6af933b2298_create_competences_table.py`.

- [ ] **Step 4: Tester upgrade**

Run:
```bash
cd backend && alembic upgrade head
```
Expected: la migration s'applique sans erreur. Vérifier via `psql` ou un client SQL que les 6 tables existent.

- [ ] **Step 5: Tester downgrade**

Run:
```bash
cd backend && alembic downgrade -1
```
Expected: les 6 tables et 2 enums disparaissent. `alembic current` doit pointer sur la migration précédente.

- [ ] **Step 6: Re-upgrade pour finir**

Run:
```bash
cd backend && alembic upgrade head
```
Expected: tout repart proprement (idempotent roundtrip prouvé).

- [ ] **Step 7: Commit**

```bash
git add backend/alembic/versions/
git commit -m "feat(db): add Alembic migration for affectation tables and enums"
```

---

## Task 7 : Suite complète de tests + couverture

**Files:** aucun nouveau, validation uniquement

- [ ] **Step 1: Lancer tous les tests d'affectation**

Run:
```bash
cd backend && pytest tests/test_session_model.py tests/test_cours_model.py tests/test_affectation_model.py tests/test_affectation_feedback_model.py tests/test_ponderations_session_model.py -v
```
Expected: 2 + 4 + 5 + 9 + 4 = 24 PASS, 0 FAIL.

- [ ] **Step 2: Lancer toute la suite backend (non-régression)**

Run:
```bash
cd backend && pytest -q
```
Expected: tous les tests pré-existants (auth, cv, scoring, etc.) + les nouveaux passent. 0 erreur, 0 régression.

- [ ] **Step 3: Vérifier la couverture sur les nouveaux modèles**

Run:
```bash
cd backend && pytest --cov=app/models --cov-report=term-missing tests/test_session_model.py tests/test_cours_model.py tests/test_affectation_model.py tests/test_affectation_feedback_model.py tests/test_ponderations_session_model.py
```
Expected: couverture ≥ 70 % sur `app/models/session.py`, `cours.py`, `competence_cours.py`, `affectation.py`, `affectation_feedback.py`, `ponderations_session.py`.

- [ ] **Step 4: Si couverture insuffisante**

Identifier les branches non couvertes via `term-missing` et ajouter un test ciblé. Re-lancer le step 3. Sinon, passer au step 5.

- [ ] **Step 5: Commit (si tests ajoutés au step 4 seulement)**

```bash
git add backend/tests/
git commit -m "test(db): add coverage tests for affectation models"
```

Si rien n'a été ajouté, passer ce step.

---

## Task 8 : FOR / OF docs + PR

**Files:**
- Create: `docs/features/FORaffectation-db.md`
- Create: `docs/features/OFaffectation-db.md`

- [ ] **Step 1: Créer FORaffectation-db.md**

Create `docs/features/FORaffectation-db.md`:

```markdown
# FORaffectation-db

## Ce qui a été implémenté

**Modèles SQLAlchemy** (6) :
- `app/models/session.py` — Session + SessionStatut + listener auto-création
- `app/models/cours.py` — Cours (UNIQUE session_id+code)
- `app/models/competence_cours.py` — CompetenceCours (1-N owned-by-Cours)
- `app/models/affectation.py` — Affectation + AffectationStatut (UNIQUE triplet)
- `app/models/affectation_feedback.py` — Feedback (CHECK note_rh 1-5)
- `app/models/ponderations_session.py` — Ponderations (CHECK W=1±0.001)

**Migration Alembic** :
- `alembic/versions/<rev>_add_affectation_tables.py` — 6 tables + 2 enums + 2 CHECK + indexes

**Tests pytest** (5 fichiers, 23 cas) :
- `test_session_model.py`, `test_cours_model.py`, `test_affectation_model.py`,
  `test_affectation_feedback_model.py`, `test_ponderations_session_model.py`

**Endpoints ajoutés** : aucun (out of scope).

**Composants frontend créés** : aucun (out of scope).

## Comment tester

```bash
cd backend
alembic upgrade head
pytest tests/test_session_model.py tests/test_cours_model.py tests/test_affectation_model.py tests/test_affectation_feedback_model.py tests/test_ponderations_session_model.py -v
```

Cas nominaux vérifiés :
- Création Session → PonderationsSession auto-créée avec défauts 0.4/0.3/0.2/0.1
- Tentative de violation invariant W=1 rejetée par Postgres
- Cascade delete Session → tous les enfants effacés
- SET NULL sur valide_par_user_id si User supprimé

## Dépendances

**Dépend de** :
- `users`, `professeurs` (PR #3, #4)
- `app/services/scoring.py` (PR #12) — contrat des noms de sous-scores

**Ce qui dépend de F1** :
- F2 affectation-service (orchestrateur)
- F3 affectation-xai (LLM)
- F4 affectation-api (REST)
- F5 frontend RH revue
- F6 frontend Admin sliders ponderations
- gestion-academique (CRUD cours/sessions)
```

- [ ] **Step 2: Créer OFaffectation-db.md (squelette, à enrichir si erreurs en cours d'implé)**

Create `docs/features/OFaffectation-db.md`:

```markdown
# OFaffectation-db

## Erreurs rencontrées

(À compléter si un bug surgit pendant l'implémentation.)

## Enseignements

- CHECK constraint Postgres sur `Numeric(4,3)` : `ABS((w1+w2+w3+w4) - 1.0) <= 0.001` fonctionne tel quel — pas besoin de cast.
- Listener `after_insert` sur Session : import du modèle enfant à l'intérieur de la fonction pour éviter l'import circulaire.
- Une migration unique pour 6 tables est plus simple à reviewer qu'une migration par table : Alembic autogenerate gère bien l'ordre des FK quand les modèles sont déjà tous enregistrés dans `app/models/__init__.py`.
- Tests d'invariants (UNIQUE, CHECK, cascade) : utiliser `pytest.raises(IntegrityError)` sur le `commit()` qui doit échouer ; rollback automatique par la fixture `db_session`.

## Règles ajoutées au CLAUDE.md

Aucune nouvelle convention introduite — F1 réutilise strictement les patterns existants (Competence/Professeur).
```

- [ ] **Step 3: Lancer toute la CI localement**

Run:
```bash
cd backend && pytest --cov=app --cov-report=term-missing --cov-fail-under=70
```
Expected: ≥ 70 % global, 0 fail.

- [ ] **Step 4: Push de la branche**

Run:
```bash
git push -u origin feature/affectation-db
```
Expected: branche poussée, GitHub propose la création d'une PR.

- [ ] **Step 5: Créer la PR**

Run:
```bash
gh pr create --title "feat(db): affectation tables — sessions, cours, affectations, ponderations" --body "$(cat <<'EOF'
## Summary

Pose la couche persistance de la chaîne d'affectation (F1) :
- 6 nouveaux modèles SQLAlchemy : Session, Cours, CompetenceCours, Affectation, AffectationFeedback, PonderationsSession
- 1 migration Alembic : 6 tables + 2 enums + 2 CHECK constraints + indexes
- 23 tests pytest (5 fichiers) : invariants FK, unicité, CHECK, cascade, défauts

## Out of scope (volontairement)

- Aucun service métier
- Aucun endpoint REST
- Aucun seed
- Aucun champ embedding (déféré à F2)
- Aucun frontend

## Invariants validés en BDD

- `UNIQUE(sessions.code)` — un code de session unique global
- `UNIQUE(cours.session_id, cours.code)` — un code de cours unique par session
- `UNIQUE(affectations.session_id, professeur_id, cours_id)` — un triplet unique
- `CHECK(ABS((w1+w2+w3+w4) - 1.0) <= 0.001)` — invariant W1+W2+W3+W4=1.0 de la PRD §10
- `CHECK(note_rh BETWEEN 1 AND 5)` — note de feedback RH bornée
- Auto-création `PonderationsSession` via listener `after_insert` sur `Session`

## Test plan

- [ ] `alembic upgrade head` puis `alembic downgrade -1` puis `alembic upgrade head` sans erreur
- [ ] 23 tests verts dans les 5 fichiers `test_*_model.py` ajoutés
- [ ] Toute la suite `pytest -q` reste verte (0 régression)
- [ ] Couverture ≥ 70 % sur `app/models/`

Spec : `docs/superpowers/specs/2026-05-22-affectation-db-design.md`
Plan : `docs/superpowers/plans/2026-05-22-affectation-db.md`
EOF
)"
```
Expected: URL de la PR retournée.

- [ ] **Step 6: Vérifier que la CI passe**

Run:
```bash
gh pr checks
```
Expected: Backend CI vert. Si rouge, lire les logs (`gh run view <id> --log-failed`) et corriger.

- [ ] **Step 7: Attendre approbation + merger (squash)**

Une fois la PR approuvée (1 reviewer minimum, convention CLAUDE.md) :

```bash
gh pr merge --squash --admin --subject "feat(db): affectation tables — sessions, cours, affectations, ponderations"
```

**Garder la branche** (pas `--delete-branch`) — politique de rétention `feature/*`.

- [ ] **Step 8: Synchroniser main local**

Run:
```bash
git checkout main && git pull origin main
```
Expected: fast-forward jusqu'au merge commit.

---

## Résumé attendu

| Métrique | Cible |
|---|---|
| Fichiers créés | 13 (6 modèles + 5 tests + 1 migration + 2 docs FOR/OF) |
| Lignes ajoutées | ~700 (tests inclus) |
| Tests ajoutés | 24 cas pytest, tous verts |
| Couverture | ≥ 70 % sur `app/models/` |
| Commits | 6 sur la branche feature (squashés en 1 au merge) |
| Régression | 0 — toute la suite pré-existante reste verte |
| Conventions CLAUDE.md respectées | OUI (4 espaces, type hints, SQLAlchemy ORM, Conventional Commits, scope `db`) |
