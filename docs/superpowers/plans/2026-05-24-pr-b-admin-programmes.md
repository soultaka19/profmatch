# PR-B Gestion Programmes + Étapes + Cursus — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à l'admin de créer/modifier/supprimer des programmes académiques avec leurs étapes et le cursus (cours rattachés par étape avec catégorie), depuis l'UI.

**Architecture :** Les modèles SQLAlchemy `Programme`, `EtapeProgramme`, `CoursEtapeProgramme` existent déjà (créés en PR #13). Cette PR ajoute (1) les endpoints REST manquants (PUT/DELETE programme, CRUD étape, CRUD cursus, GET cours read-only), (2) les schémas Pydantic correspondants, (3) une page liste `/dashboard/admin/programmes`, (4) une page détail `/dashboard/admin/programmes/[id]` avec étapes en accordéon + cursus par étape. Le CRUD complet des cours (PR-C) reste dehors — on expose uniquement GET /api/cours pour pouvoir les rattacher dans le sélecteur.

**Tech Stack :** FastAPI + SQLAlchemy 2.0 async + Pydantic v2 + Alembic · Next.js 16 App Router + shadcn/ui + SWR · pytest-asyncio · TDD strict.

---

## File Structure

### Backend (créés)
- `backend/app/schemas/programme.py` — schémas `ProgrammeUpdate`, `EtapeCreate`, `EtapeUpdate`, `EtapeOut`, `CursusCreate`, `CursusOut`, `CoursReadOnlyOut`
- `backend/app/routers/etapes.py` — endpoints `POST /api/programmes/{programme_id}/etapes`, `GET …/etapes`, `PUT …/etapes/{etape_id}`, `DELETE …/etapes/{etape_id}`
- `backend/app/routers/cursus.py` — endpoints `POST /api/programmes/{programme_id}/etapes/{etape_id}/cours`, `GET …/cours`, `PUT …/cours/{lien_id}`, `DELETE …/cours/{lien_id}`
- `backend/app/routers/cours_readonly.py` — endpoint `GET /api/cours` (read-only, admin+rh)
- `backend/tests/test_programmes_router.py` — tests des nouveaux PUT/DELETE
- `backend/tests/test_etapes_router.py` — tests du router étapes
- `backend/tests/test_cursus_router.py` — tests du router cursus
- `backend/tests/test_cours_readonly_router.py` — tests du GET /api/cours

### Backend (modifiés)
- `backend/app/routers/programmes.py` — ajout PUT, DELETE
- `backend/app/main.py` — enregistrement des nouveaux routers
- `backend/app/schemas/affectation.py` — *aucun changement* (les schémas programme restent ici, on en ajoute juste de nouveaux dans `programme.py`)

### Frontend (créés)
- `frontend/lib/types/programmes.ts` — types `Etape`, `CursusItem`, `CategorieCours`, `CoursReadOnly`, `ProgrammeUpdateInput`, `EtapeCreateInput`, `EtapeUpdateInput`, `CursusCreateInput`
- `frontend/lib/api/programmes.ts` — client `programmesApi` (list/get/create/update/delete)
- `frontend/lib/api/etapes.ts` — client `etapesApi`
- `frontend/lib/api/cursus.ts` — client `cursusApi`
- `frontend/lib/api/cours.ts` — client `coursApi` (list read-only)
- `frontend/app/dashboard/admin/programmes/page.tsx` — page liste
- `frontend/app/dashboard/admin/programmes/[id]/page.tsx` — page détail
- `frontend/components/admin/ProgrammeCreateDialog.tsx`
- `frontend/components/admin/ProgrammeEditDialog.tsx`
- `frontend/components/admin/ProgrammeDeleteDialog.tsx`
- `frontend/components/admin/ProgrammesTable.tsx`
- `frontend/components/admin/EtapeAccordion.tsx`
- `frontend/components/admin/EtapeCreateDialog.tsx`
- `frontend/components/admin/EtapeDeleteDialog.tsx`
- `frontend/components/admin/CursusAddDialog.tsx`
- `frontend/components/admin/CursusRemoveDialog.tsx`

### Frontend (modifiés)
- `frontend/lib/nav/adminNav.ts` — activer le lien "Cours & programmes" (href `/dashboard/admin/programmes`, `disabled: false`)
- `frontend/lib/types/api.ts` — *aucun changement structurel*, on importe les nouveaux types depuis `programmes.ts`

---

## Conventions à respecter

- **Branche :** `feature/admin-programmes` (créée depuis main à jour)
- **Commits :** Conventional Commits, scopes `api`, `db`, `frontend`
- **Tests :** TDD strict — test rouge → impl minimale → test vert → commit
- **Schémas :** Pydantic v2 avec `model_config = {"from_attributes": True}`
- **Auth :** `Depends(require_role("admin"))` sur tous les endpoints d'écriture, `require_role("admin", "rh")` pour les lectures (cohérent avec `programmes.py` existant)
- **Catégorie :** enum `CategorieCours` = `obligatoire` | `choix_francais` | `choix_anglais` (existant)
- **Cascade :** `Programme→Etape→Cursus` toutes en cascade (déjà configuré au niveau modèle)

---

## Task 0: Préparation — branche + statut DB

**Files:** aucun

- [ ] **Step 1: Vérifier qu'on part de main à jour**

```bash
git checkout main && git pull origin main
git log --oneline -3
```
Expected: dernier commit doit être `feat(admin): gestion utilisateurs avec workflow d'invitation (PR-A)`.

- [ ] **Step 2: Créer la branche**

```bash
git checkout -b feature/admin-programmes
```

- [ ] **Step 3: Vérifier que pytest passe sur main**

```bash
cd backend && pytest -q
```
Expected: tous les tests passent (225+).

- [ ] **Step 4: Vérifier que la DB locale est sur head**

```bash
cd backend && alembic current
```
Expected: pointer sur `a0f6c61f68c2_make_password_hash_nullable_and_add_…`.

---

## Task 1: Schémas Pydantic Programme/Étape/Cursus

**Files:**
- Create: `backend/app/schemas/programme.py`
- Test: `backend/tests/test_programme_schemas.py`

- [ ] **Step 1: Écrire le test rouge**

```python
# backend/tests/test_programme_schemas.py
"""Tests unitaires des schémas Pydantic Programme/Étape/Cursus."""

import pytest
from pydantic import ValidationError

from app.models.cours_etape_programme import CategorieCours
from app.schemas.programme import (
    CursusCreate,
    EtapeCreate,
    EtapeUpdate,
    ProgrammeUpdate,
)


def test_programme_update_tous_champs_optionnels():
    p = ProgrammeUpdate()
    assert p.nom is None and p.departement is None


def test_programme_update_max_length():
    with pytest.raises(ValidationError):
        ProgrammeUpdate(nom="x" * 201)


def test_etape_create_ordre_positif():
    e = EtapeCreate(ordre=1, nom="Étape 1")
    assert e.ordre == 1 and e.nom == "Étape 1"


def test_etape_create_ordre_invalide():
    with pytest.raises(ValidationError):
        EtapeCreate(ordre=0)
    with pytest.raises(ValidationError):
        EtapeCreate(ordre=-1)


def test_etape_update_nom_optionnel():
    e = EtapeUpdate(nom=None)
    assert e.nom is None


def test_cursus_create_par_defaut_obligatoire():
    c = CursusCreate(cours_id=1)
    assert c.categorie == CategorieCours.OBLIGATOIRE


def test_cursus_create_categorie_explicite():
    c = CursusCreate(cours_id=42, categorie=CategorieCours.CHOIX_FRANCAIS)
    assert c.categorie == CategorieCours.CHOIX_FRANCAIS
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

```bash
cd backend && pytest tests/test_programme_schemas.py -v
```
Expected: FAIL avec `ModuleNotFoundError: No module named 'app.schemas.programme'`.

- [ ] **Step 3: Écrire les schémas**

```python
# backend/app/schemas/programme.py
"""Schémas Pydantic v2 pour Programmes, Étapes, Cursus (cours rattachés)."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.cours_etape_programme import CategorieCours


# ── Programme ────────────────────────────────────────────────────────────────

class ProgrammeUpdate(BaseModel):
    """Mise à jour partielle d'un programme (PATCH-like)."""

    nom: Optional[str] = Field(None, max_length=200)
    departement: Optional[str] = Field(None, max_length=120)


# ── Étape ────────────────────────────────────────────────────────────────────

class EtapeCreate(BaseModel):
    ordre: int = Field(ge=1, le=20)
    nom: Optional[str] = Field(None, max_length=120)


class EtapeUpdate(BaseModel):
    nom: Optional[str] = Field(None, max_length=120)


class EtapeOut(BaseModel):
    id: int
    programme_id: int
    ordre: int
    nom: Optional[str]
    cree_le: datetime

    model_config = {"from_attributes": True}


# ── Cursus (cours dans une étape d'un programme) ─────────────────────────────

class CursusCreate(BaseModel):
    cours_id: int = Field(ge=1)
    categorie: CategorieCours = CategorieCours.OBLIGATOIRE


class CursusUpdate(BaseModel):
    categorie: CategorieCours


class CursusOut(BaseModel):
    id: int
    programme_id: int
    etape_id: int
    cours_id: int
    categorie: CategorieCours
    cree_le: datetime

    model_config = {"from_attributes": True}


# ── Cours (read-only, exposé pour rattachement au cursus) ─────────────────────

class CoursReadOnlyOut(BaseModel):
    id: int
    code: str
    nom: str
    credits: Optional[int]
    heures: Optional[int]

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

```bash
cd backend && pytest tests/test_programme_schemas.py -v
```
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/programme.py backend/tests/test_programme_schemas.py
git commit -m "feat(api): add programme/etape/cursus pydantic schemas"
```

---

## Task 2: Router programmes — endpoint PUT

**Files:**
- Modify: `backend/app/routers/programmes.py`
- Test: `backend/tests/test_programmes_router.py`

- [ ] **Step 1: Écrire le test rouge**

```python
# backend/tests/test_programmes_router.py
"""Tests endpoints /api/programmes (PUT, DELETE et la suite du CRUD)."""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.programme import Programme


@pytest.mark.asyncio
async def test_update_programme_admin_met_a_jour_nom(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p = Programme(code="51046", nom="Programmation informatique", departement="TI")
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)

    r = await client.put(
        f"/api/programmes/{p.id}",
        json={"nom": "Programmation et développement"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["nom"] == "Programmation et développement"
    assert data["code"] == "51046"  # code immuable
    assert data["departement"] == "TI"  # champ non touché


@pytest.mark.asyncio
async def test_update_programme_404(client: AsyncClient, auth_headers_admin: dict):
    r = await client.put(
        "/api/programmes/999",
        json={"nom": "X"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_update_programme_refuse_rh(
    client: AsyncClient, auth_headers_rh: dict, db_session: AsyncSession
):
    p = Programme(code="51046", nom="P", departement=None)
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)
    r = await client.put(
        f"/api/programmes/{p.id}",
        json={"nom": "X"},
        headers=auth_headers_rh,
    )
    assert r.status_code == 403
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

```bash
cd backend && pytest tests/test_programmes_router.py -v
```
Expected: FAIL avec status 405 (Method Not Allowed) sur le premier test.

- [ ] **Step 3: Ajouter l'endpoint PUT dans le router programmes**

Ajouter à la fin de `backend/app/routers/programmes.py` (après `get_programme`) :

```python
from app.schemas.programme import ProgrammeUpdate


@router.put("/{programme_id}", response_model=ProgrammeOut)
async def update_programme(
    programme_id: int,
    payload: ProgrammeUpdate,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> ProgrammeOut:
    result = await db.execute(select(Programme).where(Programme.id == programme_id))
    prog = result.scalar_one_or_none()
    if not prog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programme introuvable")
    if payload.nom is not None:
        prog.nom = payload.nom
    if payload.departement is not None:
        prog.departement = payload.departement
    await db.commit()
    await db.refresh(prog)
    return prog
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

```bash
cd backend && pytest tests/test_programmes_router.py -v
```
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/programmes.py backend/tests/test_programmes_router.py
git commit -m "feat(api): add PUT /api/programmes/{id} for admin"
```

---

## Task 3: Router programmes — endpoint DELETE

**Files:**
- Modify: `backend/app/routers/programmes.py`
- Modify: `backend/tests/test_programmes_router.py`

- [ ] **Step 1: Écrire le test rouge**

Ajouter à la fin de `backend/tests/test_programmes_router.py` :

```python
from app.models.etape_programme import EtapeProgramme


@pytest.mark.asyncio
async def test_delete_programme_supprime_avec_cascade(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p = Programme(code="51046", nom="P", departement=None)
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)
    e = EtapeProgramme(programme_id=p.id, ordre=1, nom="Étape 1")
    db_session.add(e)
    await db_session.commit()

    r = await client.delete(f"/api/programmes/{p.id}", headers=auth_headers_admin)
    assert r.status_code == 204

    # Le programme et son étape doivent avoir disparu
    found = await db_session.execute(select(Programme).where(Programme.id == p.id))
    assert found.scalar_one_or_none() is None
    etapes = await db_session.execute(
        select(EtapeProgramme).where(EtapeProgramme.programme_id == p.id)
    )
    assert etapes.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_delete_programme_404(client: AsyncClient, auth_headers_admin: dict):
    r = await client.delete("/api/programmes/999", headers=auth_headers_admin)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_delete_programme_refuse_rh(
    client: AsyncClient, auth_headers_rh: dict, db_session: AsyncSession
):
    p = Programme(code="51046", nom="P", departement=None)
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)
    r = await client.delete(f"/api/programmes/{p.id}", headers=auth_headers_rh)
    assert r.status_code == 403
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

```bash
cd backend && pytest tests/test_programmes_router.py -v
```
Expected: 3 nouveaux tests échouent (405 Method Not Allowed).

- [ ] **Step 3: Ajouter l'endpoint DELETE**

À la fin de `backend/app/routers/programmes.py` :

```python
from fastapi import Response


@router.delete("/{programme_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_programme(
    programme_id: int,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> Response:
    result = await db.execute(select(Programme).where(Programme.id == programme_id))
    prog = result.scalar_one_or_none()
    if not prog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programme introuvable")
    await db.delete(prog)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
```

- [ ] **Step 4: Lancer les tests**

```bash
cd backend && pytest tests/test_programmes_router.py -v
```
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/programmes.py backend/tests/test_programmes_router.py
git commit -m "feat(api): add DELETE /api/programmes/{id} with cascade"
```

---

## Task 4: Router étapes — POST + GET liste

**Files:**
- Create: `backend/app/routers/etapes.py`
- Create: `backend/tests/test_etapes_router.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Écrire les tests rouges**

```python
# backend/tests/test_etapes_router.py
"""Tests endpoints /api/programmes/{programme_id}/etapes."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.etape_programme import EtapeProgramme
from app.models.programme import Programme


async def _make_programme(db_session: AsyncSession, code: str = "51046") -> Programme:
    p = Programme(code=code, nom="Programmation", departement="TI")
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)
    return p


@pytest.mark.asyncio
async def test_create_etape_admin(client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession):
    p = await _make_programme(db_session)
    r = await client.post(
        f"/api/programmes/{p.id}/etapes",
        json={"ordre": 1, "nom": "Étape 1"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 201
    data = r.json()
    assert data["programme_id"] == p.id
    assert data["ordre"] == 1
    assert data["nom"] == "Étape 1"


@pytest.mark.asyncio
async def test_create_etape_programme_inconnu(client: AsyncClient, auth_headers_admin: dict):
    r = await client.post(
        "/api/programmes/999/etapes",
        json={"ordre": 1},
        headers=auth_headers_admin,
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_create_etape_ordre_doublon(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p = await _make_programme(db_session)
    db_session.add(EtapeProgramme(programme_id=p.id, ordre=1, nom="A"))
    await db_session.commit()
    r = await client.post(
        f"/api/programmes/{p.id}/etapes",
        json={"ordre": 1, "nom": "B"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_create_etape_refuse_rh(
    client: AsyncClient, auth_headers_rh: dict, db_session: AsyncSession
):
    p = await _make_programme(db_session)
    r = await client.post(
        f"/api/programmes/{p.id}/etapes",
        json={"ordre": 1},
        headers=auth_headers_rh,
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_list_etapes_tri_par_ordre(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p = await _make_programme(db_session)
    db_session.add_all([
        EtapeProgramme(programme_id=p.id, ordre=2, nom="Deux"),
        EtapeProgramme(programme_id=p.id, ordre=1, nom="Un"),
        EtapeProgramme(programme_id=p.id, ordre=3, nom="Trois"),
    ])
    await db_session.commit()
    r = await client.get(f"/api/programmes/{p.id}/etapes", headers=auth_headers_admin)
    assert r.status_code == 200
    ordres = [e["ordre"] for e in r.json()]
    assert ordres == [1, 2, 3]


@pytest.mark.asyncio
async def test_list_etapes_rh_autorise(
    client: AsyncClient, auth_headers_rh: dict, db_session: AsyncSession
):
    p = await _make_programme(db_session)
    r = await client.get(f"/api/programmes/{p.id}/etapes", headers=auth_headers_rh)
    assert r.status_code == 200
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

```bash
cd backend && pytest tests/test_etapes_router.py -v
```
Expected: tous échouent (route inconnue, 404).

- [ ] **Step 3: Créer le router étapes**

```python
# backend/app/routers/etapes.py
"""Routes Admin : étapes d'un programme académique.

Préfixe : /api/programmes/{programme_id}/etapes
"""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.etape_programme import EtapeProgramme
from app.models.programme import Programme
from app.models.user import User
from app.schemas.programme import EtapeCreate, EtapeOut, EtapeUpdate

router = APIRouter()


async def _get_programme_or_404(programme_id: int, db: AsyncSession) -> Programme:
    result = await db.execute(select(Programme).where(Programme.id == programme_id))
    prog = result.scalar_one_or_none()
    if prog is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programme introuvable")
    return prog


@router.post(
    "/{programme_id}/etapes",
    response_model=EtapeOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_etape(
    programme_id: int,
    payload: EtapeCreate,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> EtapeOut:
    await _get_programme_or_404(programme_id, db)
    etape = EtapeProgramme(programme_id=programme_id, ordre=payload.ordre, nom=payload.nom)
    db.add(etape)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Une étape avec l'ordre {payload.ordre} existe déjà pour ce programme",
        )
    await db.refresh(etape)
    return etape


@router.get("/{programme_id}/etapes", response_model=list[EtapeOut])
async def list_etapes(
    programme_id: int,
    _: User = Depends(require_role("admin", "rh")),
    db: AsyncSession = Depends(get_db),
) -> list[EtapeOut]:
    await _get_programme_or_404(programme_id, db)
    result = await db.execute(
        select(EtapeProgramme)
        .where(EtapeProgramme.programme_id == programme_id)
        .order_by(EtapeProgramme.ordre)
    )
    return list(result.scalars().all())
```

- [ ] **Step 4: Enregistrer le router dans main.py**

Modifier `backend/app/main.py` :

```python
from app.routers import etapes as etapes_router
# ...
app.include_router(etapes_router.router, prefix="/api/programmes", tags=["etapes"])
```

(Ne pas oublier d'ajouter l'import en haut et la ligne `include_router` après celle des programmes.)

- [ ] **Step 5: Lancer les tests**

```bash
cd backend && pytest tests/test_etapes_router.py -v
```
Expected: 6 passed.

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/etapes.py backend/app/main.py backend/tests/test_etapes_router.py
git commit -m "feat(api): add etapes router with POST/GET endpoints"
```

---

## Task 5: Router étapes — PUT + DELETE

**Files:**
- Modify: `backend/app/routers/etapes.py`
- Modify: `backend/tests/test_etapes_router.py`

- [ ] **Step 1: Écrire les tests rouges**

Ajouter à `backend/tests/test_etapes_router.py` :

```python
@pytest.mark.asyncio
async def test_update_etape_nom(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p = await _make_programme(db_session)
    e = EtapeProgramme(programme_id=p.id, ordre=1, nom="Ancien")
    db_session.add(e)
    await db_session.commit()
    await db_session.refresh(e)
    r = await client.put(
        f"/api/programmes/{p.id}/etapes/{e.id}",
        json={"nom": "Nouveau"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 200
    assert r.json()["nom"] == "Nouveau"


@pytest.mark.asyncio
async def test_update_etape_404(client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession):
    p = await _make_programme(db_session)
    r = await client.put(
        f"/api/programmes/{p.id}/etapes/999",
        json={"nom": "X"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_update_etape_mauvais_programme(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p1 = await _make_programme(db_session, code="51046")
    p2 = await _make_programme(db_session, code="51047")
    e = EtapeProgramme(programme_id=p1.id, ordre=1)
    db_session.add(e)
    await db_session.commit()
    await db_session.refresh(e)
    r = await client.put(
        f"/api/programmes/{p2.id}/etapes/{e.id}",
        json={"nom": "X"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_delete_etape(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p = await _make_programme(db_session)
    e = EtapeProgramme(programme_id=p.id, ordre=1)
    db_session.add(e)
    await db_session.commit()
    await db_session.refresh(e)
    eid = e.id
    r = await client.delete(
        f"/api/programmes/{p.id}/etapes/{eid}", headers=auth_headers_admin
    )
    assert r.status_code == 204
    found = await db_session.execute(select(EtapeProgramme).where(EtapeProgramme.id == eid))
    assert found.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_delete_etape_refuse_rh(
    client: AsyncClient, auth_headers_rh: dict, db_session: AsyncSession
):
    p = await _make_programme(db_session)
    e = EtapeProgramme(programme_id=p.id, ordre=1)
    db_session.add(e)
    await db_session.commit()
    await db_session.refresh(e)
    r = await client.delete(
        f"/api/programmes/{p.id}/etapes/{e.id}", headers=auth_headers_rh
    )
    assert r.status_code == 403
```

- [ ] **Step 2: Vérifier que les tests échouent**

```bash
cd backend && pytest tests/test_etapes_router.py -v
```
Expected: 5 nouveaux tests échouent.

- [ ] **Step 3: Ajouter PUT et DELETE**

Ajouter à `backend/app/routers/etapes.py` :

```python
async def _get_etape_or_404(programme_id: int, etape_id: int, db: AsyncSession) -> EtapeProgramme:
    result = await db.execute(
        select(EtapeProgramme).where(
            EtapeProgramme.id == etape_id,
            EtapeProgramme.programme_id == programme_id,
        )
    )
    etape = result.scalar_one_or_none()
    if etape is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Étape introuvable")
    return etape


@router.put("/{programme_id}/etapes/{etape_id}", response_model=EtapeOut)
async def update_etape(
    programme_id: int,
    etape_id: int,
    payload: EtapeUpdate,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> EtapeOut:
    await _get_programme_or_404(programme_id, db)
    etape = await _get_etape_or_404(programme_id, etape_id, db)
    if payload.nom is not None:
        etape.nom = payload.nom
    await db.commit()
    await db.refresh(etape)
    return etape


@router.delete("/{programme_id}/etapes/{etape_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_etape(
    programme_id: int,
    etape_id: int,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await _get_programme_or_404(programme_id, db)
    etape = await _get_etape_or_404(programme_id, etape_id, db)
    await db.delete(etape)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
```

- [ ] **Step 4: Lancer les tests**

```bash
cd backend && pytest tests/test_etapes_router.py -v
```
Expected: 11 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/etapes.py backend/tests/test_etapes_router.py
git commit -m "feat(api): add PUT/DELETE endpoints for etapes"
```

---

## Task 6: Router cours (read-only)

**Files:**
- Create: `backend/app/routers/cours_readonly.py`
- Create: `backend/tests/test_cours_readonly_router.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Écrire les tests rouges**

```python
# backend/tests/test_cours_readonly_router.py
"""Tests endpoint /api/cours (lecture seule pour admin et rh)."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cours import Cours


async def _make_cours(db_session: AsyncSession, code: str, nom: str) -> Cours:
    c = Cours(code=code, nom=nom, credits=3, heures=45)
    db_session.add(c)
    await db_session.commit()
    await db_session.refresh(c)
    return c


@pytest.mark.asyncio
async def test_list_cours_admin(client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession):
    await _make_cours(db_session, "INF1001", "Intro programmation")
    await _make_cours(db_session, "INF2001", "Algorithmes")
    r = await client.get("/api/cours", headers=auth_headers_admin)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    codes = sorted(c["code"] for c in data)
    assert codes == ["INF1001", "INF2001"]


@pytest.mark.asyncio
async def test_list_cours_rh(client: AsyncClient, auth_headers_rh: dict, db_session: AsyncSession):
    await _make_cours(db_session, "INF1001", "Intro")
    r = await client.get("/api/cours", headers=auth_headers_rh)
    assert r.status_code == 200
    assert len(r.json()) == 1


@pytest.mark.asyncio
async def test_list_cours_refuse_prof(client: AsyncClient, auth_headers_prof: dict):
    r = await client.get("/api/cours", headers=auth_headers_prof)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_list_cours_recherche(client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession):
    await _make_cours(db_session, "INF1001", "Intro programmation")
    await _make_cours(db_session, "MAT2001", "Calcul")
    r = await client.get("/api/cours?q=programmation", headers=auth_headers_admin)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["code"] == "INF1001"
```

- [ ] **Step 2: Vérifier que les tests échouent**

```bash
cd backend && pytest tests/test_cours_readonly_router.py -v
```
Expected: 4 échecs (route inconnue).

- [ ] **Step 3: Créer le router**

```python
# backend/app/routers/cours_readonly.py
"""Endpoint de lecture des cours, utilisé par l'UI admin pour rattacher
les cours à un cursus. Le CRUD complet des cours sera dans PR-C.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.cours import Cours
from app.models.user import User
from app.schemas.programme import CoursReadOnlyOut

router = APIRouter()


@router.get("/", response_model=list[CoursReadOnlyOut])
async def list_cours(
    q: str | None = None,
    _: User = Depends(require_role("admin", "rh")),
    db: AsyncSession = Depends(get_db),
) -> list[CoursReadOnlyOut]:
    stmt = select(Cours).order_by(Cours.code)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Cours.code.ilike(like), Cours.nom.ilike(like)))
    result = await db.execute(stmt)
    return list(result.scalars().all())
```

- [ ] **Step 4: Enregistrer le router dans main.py**

```python
from app.routers import cours_readonly as cours_readonly_router
# ...
app.include_router(cours_readonly_router.router, prefix="/api/cours", tags=["cours"])
```

- [ ] **Step 5: Lancer les tests**

```bash
cd backend && pytest tests/test_cours_readonly_router.py -v
```
Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/cours_readonly.py backend/app/main.py backend/tests/test_cours_readonly_router.py
git commit -m "feat(api): add GET /api/cours read-only endpoint"
```

---

## Task 7: Router cursus — POST + GET

**Files:**
- Create: `backend/app/routers/cursus.py`
- Create: `backend/tests/test_cursus_router.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Écrire les tests rouges**

```python
# backend/tests/test_cursus_router.py
"""Tests endpoints cursus : /api/programmes/{p}/etapes/{e}/cours."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cours import Cours
from app.models.cours_etape_programme import CategorieCours, CoursEtapeProgramme
from app.models.etape_programme import EtapeProgramme
from app.models.programme import Programme


async def _seed(db_session: AsyncSession) -> tuple[Programme, EtapeProgramme, Cours]:
    p = Programme(code="51046", nom="Programmation", departement="TI")
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)
    e = EtapeProgramme(programme_id=p.id, ordre=1, nom="Étape 1")
    db_session.add(e)
    c = Cours(code="INF1001", nom="Intro", credits=3)
    db_session.add(c)
    await db_session.commit()
    await db_session.refresh(e)
    await db_session.refresh(c)
    return p, e, c


@pytest.mark.asyncio
async def test_create_cursus_admin(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p, e, c = await _seed(db_session)
    r = await client.post(
        f"/api/programmes/{p.id}/etapes/{e.id}/cours",
        json={"cours_id": c.id, "categorie": "obligatoire"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 201
    data = r.json()
    assert data["cours_id"] == c.id
    assert data["categorie"] == "obligatoire"


@pytest.mark.asyncio
async def test_create_cursus_categorie_par_defaut(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p, e, c = await _seed(db_session)
    r = await client.post(
        f"/api/programmes/{p.id}/etapes/{e.id}/cours",
        json={"cours_id": c.id},
        headers=auth_headers_admin,
    )
    assert r.status_code == 201
    assert r.json()["categorie"] == "obligatoire"


@pytest.mark.asyncio
async def test_create_cursus_doublon(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p, e, c = await _seed(db_session)
    db_session.add(
        CoursEtapeProgramme(
            programme_id=p.id, etape_id=e.id, cours_id=c.id, categorie=CategorieCours.OBLIGATOIRE
        )
    )
    await db_session.commit()
    r = await client.post(
        f"/api/programmes/{p.id}/etapes/{e.id}/cours",
        json={"cours_id": c.id},
        headers=auth_headers_admin,
    )
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_create_cursus_etape_inconnue(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p, _, c = await _seed(db_session)
    r = await client.post(
        f"/api/programmes/{p.id}/etapes/999/cours",
        json={"cours_id": c.id},
        headers=auth_headers_admin,
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_create_cursus_cours_inconnu(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p, e, _ = await _seed(db_session)
    r = await client.post(
        f"/api/programmes/{p.id}/etapes/{e.id}/cours",
        json={"cours_id": 999},
        headers=auth_headers_admin,
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_list_cursus(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p, e, c = await _seed(db_session)
    db_session.add(
        CoursEtapeProgramme(
            programme_id=p.id, etape_id=e.id, cours_id=c.id, categorie=CategorieCours.OBLIGATOIRE
        )
    )
    await db_session.commit()
    r = await client.get(
        f"/api/programmes/{p.id}/etapes/{e.id}/cours", headers=auth_headers_admin
    )
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["cours_id"] == c.id
```

- [ ] **Step 2: Vérifier que les tests échouent**

```bash
cd backend && pytest tests/test_cursus_router.py -v
```
Expected: 6 échecs.

- [ ] **Step 3: Créer le router cursus**

```python
# backend/app/routers/cursus.py
"""Routes Admin : liaison cours-étape-programme (cursus).

Préfixe : /api/programmes/{programme_id}/etapes/{etape_id}/cours
"""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.cours import Cours
from app.models.cours_etape_programme import CoursEtapeProgramme
from app.models.etape_programme import EtapeProgramme
from app.models.user import User
from app.schemas.programme import CursusCreate, CursusOut, CursusUpdate

router = APIRouter()


async def _validate_etape(
    programme_id: int, etape_id: int, db: AsyncSession
) -> EtapeProgramme:
    result = await db.execute(
        select(EtapeProgramme).where(
            EtapeProgramme.id == etape_id,
            EtapeProgramme.programme_id == programme_id,
        )
    )
    etape = result.scalar_one_or_none()
    if etape is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Étape introuvable pour ce programme",
        )
    return etape


async def _validate_cours(cours_id: int, db: AsyncSession) -> Cours:
    result = await db.execute(select(Cours).where(Cours.id == cours_id))
    cours = result.scalar_one_or_none()
    if cours is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Cours introuvable"
        )
    return cours


@router.post(
    "/{programme_id}/etapes/{etape_id}/cours",
    response_model=CursusOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_cursus(
    programme_id: int,
    etape_id: int,
    payload: CursusCreate,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> CursusOut:
    await _validate_etape(programme_id, etape_id, db)
    await _validate_cours(payload.cours_id, db)

    lien = CoursEtapeProgramme(
        programme_id=programme_id,
        etape_id=etape_id,
        cours_id=payload.cours_id,
        categorie=payload.categorie,
    )
    db.add(lien)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ce cours est déjà rattaché à cette étape pour ce programme",
        )
    await db.refresh(lien)
    return lien


@router.get(
    "/{programme_id}/etapes/{etape_id}/cours",
    response_model=list[CursusOut],
)
async def list_cursus(
    programme_id: int,
    etape_id: int,
    _: User = Depends(require_role("admin", "rh")),
    db: AsyncSession = Depends(get_db),
) -> list[CursusOut]:
    await _validate_etape(programme_id, etape_id, db)
    result = await db.execute(
        select(CoursEtapeProgramme)
        .where(
            CoursEtapeProgramme.programme_id == programme_id,
            CoursEtapeProgramme.etape_id == etape_id,
        )
        .order_by(CoursEtapeProgramme.id)
    )
    return list(result.scalars().all())
```

- [ ] **Step 4: Enregistrer le router**

Ajouter à `backend/app/main.py` :

```python
from app.routers import cursus as cursus_router
# ...
app.include_router(cursus_router.router, prefix="/api/programmes", tags=["cursus"])
```

- [ ] **Step 5: Lancer les tests**

```bash
cd backend && pytest tests/test_cursus_router.py -v
```
Expected: 6 passed.

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/cursus.py backend/app/main.py backend/tests/test_cursus_router.py
git commit -m "feat(api): add cursus router (POST/GET) for cours-etape-programme"
```

---

## Task 8: Router cursus — PUT (catégorie) + DELETE

**Files:**
- Modify: `backend/app/routers/cursus.py`
- Modify: `backend/tests/test_cursus_router.py`

- [ ] **Step 1: Écrire les tests rouges**

Ajouter à `backend/tests/test_cursus_router.py` :

```python
@pytest.mark.asyncio
async def test_update_cursus_categorie(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p, e, c = await _seed(db_session)
    lien = CoursEtapeProgramme(
        programme_id=p.id, etape_id=e.id, cours_id=c.id,
        categorie=CategorieCours.OBLIGATOIRE,
    )
    db_session.add(lien)
    await db_session.commit()
    await db_session.refresh(lien)
    r = await client.put(
        f"/api/programmes/{p.id}/etapes/{e.id}/cours/{lien.id}",
        json={"categorie": "choix_francais"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 200
    assert r.json()["categorie"] == "choix_francais"


@pytest.mark.asyncio
async def test_delete_cursus(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    p, e, c = await _seed(db_session)
    lien = CoursEtapeProgramme(
        programme_id=p.id, etape_id=e.id, cours_id=c.id,
        categorie=CategorieCours.OBLIGATOIRE,
    )
    db_session.add(lien)
    await db_session.commit()
    await db_session.refresh(lien)
    lid = lien.id
    r = await client.delete(
        f"/api/programmes/{p.id}/etapes/{e.id}/cours/{lid}",
        headers=auth_headers_admin,
    )
    assert r.status_code == 204
    from sqlalchemy import select as _select
    found = await db_session.execute(
        _select(CoursEtapeProgramme).where(CoursEtapeProgramme.id == lid)
    )
    assert found.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_delete_cursus_refuse_rh(
    client: AsyncClient, auth_headers_rh: dict, db_session: AsyncSession
):
    p, e, c = await _seed(db_session)
    lien = CoursEtapeProgramme(
        programme_id=p.id, etape_id=e.id, cours_id=c.id,
        categorie=CategorieCours.OBLIGATOIRE,
    )
    db_session.add(lien)
    await db_session.commit()
    await db_session.refresh(lien)
    r = await client.delete(
        f"/api/programmes/{p.id}/etapes/{e.id}/cours/{lien.id}",
        headers=auth_headers_rh,
    )
    assert r.status_code == 403
```

- [ ] **Step 2: Vérifier l'échec**

```bash
cd backend && pytest tests/test_cursus_router.py -v
```
Expected: 3 nouveaux tests échouent (405).

- [ ] **Step 3: Ajouter PUT et DELETE**

Ajouter à `backend/app/routers/cursus.py` :

```python
async def _get_lien_or_404(
    programme_id: int, etape_id: int, lien_id: int, db: AsyncSession
) -> CoursEtapeProgramme:
    result = await db.execute(
        select(CoursEtapeProgramme).where(
            CoursEtapeProgramme.id == lien_id,
            CoursEtapeProgramme.programme_id == programme_id,
            CoursEtapeProgramme.etape_id == etape_id,
        )
    )
    lien = result.scalar_one_or_none()
    if lien is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Lien cursus introuvable"
        )
    return lien


@router.put(
    "/{programme_id}/etapes/{etape_id}/cours/{lien_id}",
    response_model=CursusOut,
)
async def update_cursus(
    programme_id: int,
    etape_id: int,
    lien_id: int,
    payload: CursusUpdate,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> CursusOut:
    lien = await _get_lien_or_404(programme_id, etape_id, lien_id, db)
    lien.categorie = payload.categorie
    await db.commit()
    await db.refresh(lien)
    return lien


@router.delete(
    "/{programme_id}/etapes/{etape_id}/cours/{lien_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_cursus(
    programme_id: int,
    etape_id: int,
    lien_id: int,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> Response:
    lien = await _get_lien_or_404(programme_id, etape_id, lien_id, db)
    await db.delete(lien)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
```

- [ ] **Step 4: Lancer les tests**

```bash
cd backend && pytest tests/test_cursus_router.py -v
```
Expected: 9 passed.

- [ ] **Step 5: Lancer la suite complète backend**

```bash
cd backend && pytest -q
```
Expected: tous les tests passent (≥ 245).

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/cursus.py backend/tests/test_cursus_router.py
git commit -m "feat(api): add PUT/DELETE endpoints for cursus"
```

---

## Task 9: Frontend — types + clients API

**Files:**
- Create: `frontend/lib/types/programmes.ts`
- Create: `frontend/lib/api/programmes.ts`
- Create: `frontend/lib/api/etapes.ts`
- Create: `frontend/lib/api/cursus.ts`
- Create: `frontend/lib/api/cours.ts`

- [ ] **Step 1: Créer les types**

```typescript
// frontend/lib/types/programmes.ts
export type CategorieCours = "obligatoire" | "choix_francais" | "choix_anglais";

export const CATEGORIE_LABEL: Record<CategorieCours, string> = {
  obligatoire: "Obligatoire",
  choix_francais: "Choix français",
  choix_anglais: "Choix anglais",
};

export interface Etape {
  id: number;
  programme_id: number;
  ordre: number;
  nom: string | null;
  cree_le: string;
}

export interface CursusItem {
  id: number;
  programme_id: number;
  etape_id: number;
  cours_id: number;
  categorie: CategorieCours;
  cree_le: string;
}

export interface CoursReadOnly {
  id: number;
  code: string;
  nom: string;
  credits: number | null;
  heures: number | null;
}

export interface ProgrammeCreateInput {
  code: string;
  nom: string;
  departement: string | null;
}

export interface ProgrammeUpdateInput {
  nom?: string;
  departement?: string | null;
}

export interface EtapeCreateInput {
  ordre: number;
  nom: string | null;
}

export interface EtapeUpdateInput {
  nom?: string | null;
}

export interface CursusCreateInput {
  cours_id: number;
  categorie?: CategorieCours;
}

export interface CursusUpdateInput {
  categorie: CategorieCours;
}
```

- [ ] **Step 2: Créer le client programmes**

```typescript
// frontend/lib/api/programmes.ts
import { apiClient } from "./client";
import type { Programme } from "@/lib/types/api";
import type {
  ProgrammeCreateInput,
  ProgrammeUpdateInput,
} from "@/lib/types/programmes";

export const programmesApi = {
  list: (): Promise<Programme[]> => apiClient.get<Programme[]>("/api/programmes/"),
  get: (id: number): Promise<Programme> => apiClient.get<Programme>(`/api/programmes/${id}`),
  create: (input: ProgrammeCreateInput): Promise<Programme> =>
    apiClient.post<Programme>("/api/programmes/", input),
  update: (id: number, input: ProgrammeUpdateInput): Promise<Programme> =>
    apiClient.put<Programme>(`/api/programmes/${id}`, input),
  remove: (id: number): Promise<void> =>
    apiClient.delete<void>(`/api/programmes/${id}`),
};
```

- [ ] **Step 3: Créer le client étapes**

```typescript
// frontend/lib/api/etapes.ts
import { apiClient } from "./client";
import type {
  Etape,
  EtapeCreateInput,
  EtapeUpdateInput,
} from "@/lib/types/programmes";

export const etapesApi = {
  list: (programmeId: number): Promise<Etape[]> =>
    apiClient.get<Etape[]>(`/api/programmes/${programmeId}/etapes`),
  create: (programmeId: number, input: EtapeCreateInput): Promise<Etape> =>
    apiClient.post<Etape>(`/api/programmes/${programmeId}/etapes`, input),
  update: (programmeId: number, etapeId: number, input: EtapeUpdateInput): Promise<Etape> =>
    apiClient.put<Etape>(`/api/programmes/${programmeId}/etapes/${etapeId}`, input),
  remove: (programmeId: number, etapeId: number): Promise<void> =>
    apiClient.delete<void>(`/api/programmes/${programmeId}/etapes/${etapeId}`),
};
```

- [ ] **Step 4: Créer le client cursus**

```typescript
// frontend/lib/api/cursus.ts
import { apiClient } from "./client";
import type {
  CursusCreateInput,
  CursusItem,
  CursusUpdateInput,
} from "@/lib/types/programmes";

export const cursusApi = {
  list: (programmeId: number, etapeId: number): Promise<CursusItem[]> =>
    apiClient.get<CursusItem[]>(
      `/api/programmes/${programmeId}/etapes/${etapeId}/cours`
    ),
  create: (
    programmeId: number,
    etapeId: number,
    input: CursusCreateInput
  ): Promise<CursusItem> =>
    apiClient.post<CursusItem>(
      `/api/programmes/${programmeId}/etapes/${etapeId}/cours`,
      input
    ),
  update: (
    programmeId: number,
    etapeId: number,
    lienId: number,
    input: CursusUpdateInput
  ): Promise<CursusItem> =>
    apiClient.put<CursusItem>(
      `/api/programmes/${programmeId}/etapes/${etapeId}/cours/${lienId}`,
      input
    ),
  remove: (programmeId: number, etapeId: number, lienId: number): Promise<void> =>
    apiClient.delete<void>(
      `/api/programmes/${programmeId}/etapes/${etapeId}/cours/${lienId}`
    ),
};
```

- [ ] **Step 5: Créer le client cours (read-only)**

```typescript
// frontend/lib/api/cours.ts
import { apiClient } from "./client";
import type { CoursReadOnly } from "@/lib/types/programmes";

export const coursApi = {
  list: (q?: string): Promise<CoursReadOnly[]> => {
    const query = q ? `?q=${encodeURIComponent(q)}` : "";
    return apiClient.get<CoursReadOnly[]>(`/api/cours/${query}`);
  },
};
```

- [ ] **Step 6: Vérifier les types**

```bash
cd frontend && npm run type-check
```
Expected: 0 erreur (les imports sont valides puisque les types sont définis).

- [ ] **Step 7: Commit**

```bash
git add frontend/lib/types/programmes.ts frontend/lib/api/programmes.ts frontend/lib/api/etapes.ts frontend/lib/api/cursus.ts frontend/lib/api/cours.ts
git commit -m "feat(frontend): add types and api clients for programmes/etapes/cursus"
```

---

## Task 10: Frontend — table + dialogs de création/édition programme

**Files:**
- Create: `frontend/components/admin/ProgrammesTable.tsx`
- Create: `frontend/components/admin/ProgrammeCreateDialog.tsx`
- Create: `frontend/components/admin/ProgrammeEditDialog.tsx`
- Create: `frontend/components/admin/ProgrammeDeleteDialog.tsx`

- [ ] **Step 1: Créer la table**

```typescript
// frontend/components/admin/ProgrammesTable.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Programme } from "@/lib/types/api";
import { Pencil, Trash2, ArrowRight } from "lucide-react";

interface Props {
  programmes: Programme[];
  onEdit: (p: Programme) => void;
  onDelete: (p: Programme) => void;
}

export function ProgrammesTable({ programmes, onEdit, onDelete }: Props) {
  if (programmes.length === 0) {
    return <p className="text-sm text-fg-muted py-8 text-center">Aucun programme.</p>;
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg">
      <table className="w-full text-sm">
        <thead className="bg-bg-muted text-xs uppercase text-fg-muted">
          <tr>
            <th className="px-4 py-2 text-left">Code</th>
            <th className="px-4 py-2 text-left">Nom</th>
            <th className="px-4 py-2 text-left">Département</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {programmes.map((p) => (
            <tr key={p.id} className="hover:bg-bg-muted/40">
              <td className="px-4 py-3 font-mono">{p.code}</td>
              <td className="px-4 py-3 font-medium text-fg">{p.nom}</td>
              <td className="px-4 py-3 text-fg-muted">{p.departement ?? "—"}</td>
              <td className="px-4 py-3 text-right space-x-1">
                <Link href={`/dashboard/admin/programmes/${p.id}`}>
                  <Button size="sm" variant="ghost" title="Ouvrir">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Button size="sm" variant="ghost" onClick={() => onEdit(p)} title="Modifier">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(p)} title="Supprimer">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Créer le dialog de création**

```typescript
// frontend/components/admin/ProgrammeCreateDialog.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { programmesApi } from "@/lib/api/programmes";

interface Props {
  onCreated: () => void;
}

export function ProgrammeCreateDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [nom, setNom] = useState("");
  const [departement, setDepartement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setCode("");
    setNom("");
    setDepartement("");
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await programmesApi.create({
        code: code.trim(),
        nom: nom.trim(),
        departement: departement.trim() || null,
      });
      onCreated();
      setOpen(false);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de création");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = code.trim().length > 0 && nom.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau programme
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau programme</DialogTitle>
          <DialogDescription>
            Le code est unique (ex. 51046). Il ne pourra plus être modifié après création.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="51046" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Programmation informatique" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dept">Département (optionnel)</Label>
            <Input id="dept" value={departement} onChange={(e) => setDepartement(e.target.value)} placeholder="Technologies de l'information" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); setOpen(false); }}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création…</> : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Créer le dialog d'édition**

```typescript
// frontend/components/admin/ProgrammeEditDialog.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { programmesApi } from "@/lib/api/programmes";
import type { Programme } from "@/lib/types/api";

interface Props {
  programme: Programme | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function ProgrammeEditDialog({ programme, onClose, onUpdated }: Props) {
  const [nom, setNom] = useState("");
  const [departement, setDepartement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (programme) {
      setNom(programme.nom);
      setDepartement(programme.departement ?? "");
      setError(null);
    }
  }, [programme]);

  async function handleSubmit() {
    if (!programme) return;
    setSubmitting(true);
    setError(null);
    try {
      await programmesApi.update(programme.id, {
        nom: nom.trim() || undefined,
        departement: departement.trim() || null,
      });
      onUpdated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={!!programme} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le programme</DialogTitle>
          <DialogDescription>Code <span className="font-mono">{programme?.code}</span> (immuable).</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="enom">Nom</Label>
            <Input id="enom" value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edept">Département</Label>
            <Input id="edept" value={departement} onChange={(e) => setDepartement(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={submitting || !nom.trim()}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enregistrement…</> : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Créer le dialog de suppression**

```typescript
// frontend/components/admin/ProgrammeDeleteDialog.tsx
"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { programmesApi } from "@/lib/api/programmes";
import type { Programme } from "@/lib/types/api";

interface Props {
  programme: Programme | null;
  onClose: () => void;
  onDone: () => void;
}

export function ProgrammeDeleteDialog({ programme, onClose, onDone }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!programme) return;
    setSubmitting(true);
    setError(null);
    try {
      await programmesApi.remove(programme.id);
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog open={!!programme} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer ce programme ?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{programme?.code} — {programme?.nom}</strong> et toutes ses étapes et liens cursus seront supprimés
            définitivement. Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={submitting}>
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 5: Vérifier les types**

```bash
cd frontend && npm run type-check && npm run lint
```
Expected: 0 erreur.

- [ ] **Step 6: Commit**

```bash
git add frontend/components/admin/ProgrammesTable.tsx frontend/components/admin/ProgrammeCreateDialog.tsx frontend/components/admin/ProgrammeEditDialog.tsx frontend/components/admin/ProgrammeDeleteDialog.tsx
git commit -m "feat(frontend): add programmes table and CRUD dialogs"
```

---

## Task 11: Frontend — page liste programmes + activation nav

**Files:**
- Create: `frontend/app/dashboard/admin/programmes/page.tsx`
- Modify: `frontend/lib/nav/adminNav.ts`

- [ ] **Step 1: Créer la page liste**

```typescript
// frontend/app/dashboard/admin/programmes/page.tsx
"use client";

import { useState } from "react";
import useSWR from "swr";
import { programmesApi } from "@/lib/api/programmes";
import type { Programme } from "@/lib/types/api";
import { ProgrammesTable } from "@/components/admin/ProgrammesTable";
import { ProgrammeCreateDialog } from "@/components/admin/ProgrammeCreateDialog";
import { ProgrammeEditDialog } from "@/components/admin/ProgrammeEditDialog";
import { ProgrammeDeleteDialog } from "@/components/admin/ProgrammeDeleteDialog";

export default function Page() {
  const { data: programmes, mutate, isLoading } = useSWR<Programme[]>(
    "programmes:list",
    () => programmesApi.list()
  );
  const [editing, setEditing] = useState<Programme | null>(null);
  const [deleting, setDeleting] = useState<Programme | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Programmes</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Référentiel des programmes académiques avec leurs étapes et le cursus.
          </p>
        </div>
        <ProgrammeCreateDialog onCreated={() => mutate()} />
      </div>

      {isLoading ? (
        <p className="text-sm text-fg-muted py-8 text-center">Chargement…</p>
      ) : (
        <ProgrammesTable
          programmes={programmes ?? []}
          onEdit={setEditing}
          onDelete={setDeleting}
        />
      )}

      <ProgrammeEditDialog
        programme={editing}
        onClose={() => setEditing(null)}
        onUpdated={() => mutate()}
      />
      <ProgrammeDeleteDialog
        programme={deleting}
        onClose={() => setDeleting(null)}
        onDone={() => mutate()}
      />
    </div>
  );
}
```

- [ ] **Step 2: Activer le lien de navigation**

Modifier `frontend/lib/nav/adminNav.ts` : remplacer la ligne du lien "Cours & programmes" par :

```typescript
{ href: "/dashboard/admin/programmes", label: "Programmes", icon: BookOpen },
```

(Retirer `disabled: true` et renommer en "Programmes". PR-C activera un autre lien "Cours".)

- [ ] **Step 3: Vérifier**

```bash
cd frontend && npm run type-check && npm run lint
```
Expected: 0 erreur.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/dashboard/admin/programmes/page.tsx frontend/lib/nav/adminNav.ts
git commit -m "feat(frontend): add admin programmes list page and enable nav link"
```

---

## Task 12: Frontend — composants étapes (accordéon + dialogs)

**Files:**
- Create: `frontend/components/admin/EtapeAccordion.tsx`
- Create: `frontend/components/admin/EtapeCreateDialog.tsx`
- Create: `frontend/components/admin/EtapeDeleteDialog.tsx`

- [ ] **Step 1: Créer le dialog de création d'étape**

```typescript
// frontend/components/admin/EtapeCreateDialog.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { etapesApi } from "@/lib/api/etapes";

interface Props {
  programmeId: number;
  onCreated: () => void;
}

export function EtapeCreateDialog({ programmeId, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [ordre, setOrdre] = useState<number>(1);
  const [nom, setNom] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setOrdre(1);
    setNom("");
    setError(null);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await etapesApi.create(programmeId, { ordre, nom: nom.trim() || null });
      onCreated();
      setOpen(false);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-2 h-4 w-4" />Ajouter une étape
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle étape</DialogTitle>
          <DialogDescription>L&apos;ordre doit être unique dans le programme.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ordre">Ordre</Label>
            <Input
              id="ordre"
              type="number"
              min={1}
              max={20}
              value={ordre}
              onChange={(e) => setOrdre(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="enom">Nom (optionnel)</Label>
            <Input id="enom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Étape 1" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); setOpen(false); }}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={submitting || ordre < 1}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création…</> : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Créer le dialog de suppression d'étape**

```typescript
// frontend/components/admin/EtapeDeleteDialog.tsx
"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { etapesApi } from "@/lib/api/etapes";
import type { Etape } from "@/lib/types/programmes";

interface Props {
  programmeId: number;
  etape: Etape | null;
  onClose: () => void;
  onDone: () => void;
}

export function EtapeDeleteDialog({ programmeId, etape, onClose, onDone }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!etape) return;
    setSubmitting(true);
    setError(null);
    try {
      await etapesApi.remove(programmeId, etape.id);
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog open={!!etape} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer l&apos;étape ?</AlertDialogTitle>
          <AlertDialogDescription>
            L&apos;étape <strong>{etape?.ordre} — {etape?.nom ?? "sans nom"}</strong> et tous ses
            cours rattachés (cursus) seront supprimés.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={submitting}>
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 3: Créer l'accordéon étape (utilisera le composant cursus de Task 13)**

```typescript
// frontend/components/admin/EtapeAccordion.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Trash2 } from "lucide-react";
import type { Etape } from "@/lib/types/programmes";
import { CursusList } from "./CursusList";

interface Props {
  programmeId: number;
  etapes: Etape[];
  onDeleteEtape: (e: Etape) => void;
  onCursusChanged: () => void;
}

export function EtapeAccordion({
  programmeId,
  etapes,
  onDeleteEtape,
  onCursusChanged,
}: Props) {
  if (etapes.length === 0) {
    return (
      <p className="text-sm text-fg-muted py-8 text-center border border-dashed border-border rounded-md">
        Aucune étape. Ajoutez la première étape pour commencer à rattacher des cours.
      </p>
    );
  }
  return (
    <Accordion type="multiple" className="space-y-2">
      {etapes.map((e) => (
        <AccordionItem
          key={e.id}
          value={`etape-${e.id}`}
          className="rounded-lg border border-border bg-bg px-4"
        >
          <AccordionTrigger className="hover:no-underline">
            <div className="flex w-full items-center justify-between pr-4">
              <span className="font-medium">
                Étape {e.ordre}
                {e.nom ? ` — ${e.nom}` : ""}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pb-2">
              <CursusList
                programmeId={programmeId}
                etapeId={e.id}
                onChanged={onCursusChanged}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDeleteEtape(e)}
                  title="Supprimer cette étape"
                >
                  <Trash2 className="h-4 w-4 text-destructive mr-1" />
                  Supprimer l&apos;étape
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
```

- [ ] **Step 4: Vérifier qu'`Accordion` existe dans shadcn**

```bash
ls frontend/components/ui/accordion.tsx 2>/dev/null && echo OK || echo MISSING
```

Si MISSING :

```bash
cd frontend && npx shadcn@latest add accordion
```

- [ ] **Step 5: Vérifier les types (CursusList n'existe pas encore — type-check va échouer, c'est attendu)**

Note : on accepte un échec ici car `CursusList` sera créé en Task 13. C'est un commit intermédiaire ; la suite enchaîne immédiatement.

```bash
cd frontend && npm run type-check
```
Expected: erreur "Cannot find module './CursusList'" — c'est attendu.

- [ ] **Step 6: Commit**

```bash
git add frontend/components/admin/EtapeAccordion.tsx frontend/components/admin/EtapeCreateDialog.tsx frontend/components/admin/EtapeDeleteDialog.tsx frontend/components/ui/accordion.tsx
git commit -m "feat(frontend): add etape accordion and create/delete dialogs"
```

---

## Task 13: Frontend — liste/ajout/suppression cursus

**Files:**
- Create: `frontend/components/admin/CursusList.tsx`
- Create: `frontend/components/admin/CursusAddDialog.tsx`
- Create: `frontend/components/admin/CursusRemoveDialog.tsx`

- [ ] **Step 1: Créer le dialog d'ajout de cours au cursus**

```typescript
// frontend/components/admin/CursusAddDialog.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { coursApi } from "@/lib/api/cours";
import { cursusApi } from "@/lib/api/cursus";
import type {
  CategorieCours,
  CoursReadOnly,
} from "@/lib/types/programmes";
import { CATEGORIE_LABEL } from "@/lib/types/programmes";

interface Props {
  programmeId: number;
  etapeId: number;
  onAdded: () => void;
}

export function CursusAddDialog({ programmeId, etapeId, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [cours, setCours] = useState<CoursReadOnly[]>([]);
  const [coursId, setCoursId] = useState<number | null>(null);
  const [categorie, setCategorie] = useState<CategorieCours>("obligatoire");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    coursApi.list(search).then((r) => {
      if (!cancelled) setCours(r);
    });
    return () => { cancelled = true; };
  }, [open, search]);

  const options = useMemo(() => cours, [cours]);

  function reset() {
    setSearch("");
    setCoursId(null);
    setCategorie("obligatoire");
    setError(null);
  }

  async function handleSubmit() {
    if (coursId === null) return;
    setSubmitting(true);
    setError(null);
    try {
      await cursusApi.create(programmeId, etapeId, { cours_id: coursId, categorie });
      onAdded();
      setOpen(false);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-2 h-4 w-4" />Ajouter un cours
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un cours à cette étape</DialogTitle>
          <DialogDescription>Choisissez un cours existant dans le référentiel.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="search">Rechercher (code ou nom)</Label>
            <Input
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="INF1001"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cours">Cours</Label>
            <Select
              value={coursId !== null ? String(coursId) : undefined}
              onValueChange={(v) => setCoursId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder={options.length === 0 ? "Aucun résultat" : "Choisir un cours"} />
              </SelectTrigger>
              <SelectContent>
                {options.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.code} — {c.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat">Catégorie</Label>
            <Select value={categorie} onValueChange={(v) => setCategorie(v as CategorieCours)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="obligatoire">{CATEGORIE_LABEL.obligatoire}</SelectItem>
                <SelectItem value="choix_francais">{CATEGORIE_LABEL.choix_francais}</SelectItem>
                <SelectItem value="choix_anglais">{CATEGORIE_LABEL.choix_anglais}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); setOpen(false); }}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={submitting || coursId === null}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Ajout…</> : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Créer le dialog de suppression de cursus**

```typescript
// frontend/components/admin/CursusRemoveDialog.tsx
"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cursusApi } from "@/lib/api/cursus";
import type { CursusItem, CoursReadOnly } from "@/lib/types/programmes";

interface Props {
  programmeId: number;
  etapeId: number;
  item: { cursus: CursusItem; cours: CoursReadOnly | null } | null;
  onClose: () => void;
  onDone: () => void;
}

export function CursusRemoveDialog({
  programmeId,
  etapeId,
  item,
  onClose,
  onDone,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!item) return;
    setSubmitting(true);
    setError(null);
    try {
      await cursusApi.remove(programmeId, etapeId, item.cursus.id);
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  const label = item?.cours
    ? `${item.cours.code} — ${item.cours.nom}`
    : `Cours #${item?.cursus.cours_id}`;

  return (
    <AlertDialog open={!!item} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retirer ce cours du cursus ?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{label}</strong> sera retiré de cette étape. Le cours lui-même
            reste dans le référentiel.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={submitting}>
            Retirer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 3: Créer la liste cursus (qui consomme les deux dialogs)**

```typescript
// frontend/components/admin/CursusList.tsx
"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { coursApi } from "@/lib/api/cours";
import { cursusApi } from "@/lib/api/cursus";
import type {
  CategorieCours,
  CoursReadOnly,
  CursusItem,
} from "@/lib/types/programmes";
import { CATEGORIE_LABEL } from "@/lib/types/programmes";
import { CursusAddDialog } from "./CursusAddDialog";
import { CursusRemoveDialog } from "./CursusRemoveDialog";

interface Props {
  programmeId: number;
  etapeId: number;
  onChanged: () => void;
}

function CategorieBadge({ c }: { c: CategorieCours }) {
  if (c === "obligatoire") return <Badge variant="default">{CATEGORIE_LABEL[c]}</Badge>;
  if (c === "choix_francais") return <Badge variant="secondary">{CATEGORIE_LABEL[c]}</Badge>;
  return <Badge variant="outline">{CATEGORIE_LABEL[c]}</Badge>;
}

export function CursusList({ programmeId, etapeId, onChanged }: Props) {
  const swrKey = `cursus:${programmeId}:${etapeId}`;
  const { data: items, mutate, isLoading } = useSWR<CursusItem[]>(
    swrKey,
    () => cursusApi.list(programmeId, etapeId),
  );
  const [coursCache, setCoursCache] = useState<Record<number, CoursReadOnly>>({});
  const [removing, setRemoving] = useState<
    { cursus: CursusItem; cours: CoursReadOnly | null } | null
  >(null);

  useEffect(() => {
    if (!items || items.length === 0) return;
    const missing = items
      .map((i) => i.cours_id)
      .filter((id) => !(id in coursCache));
    if (missing.length === 0) return;
    coursApi.list().then((all) => {
      const map: Record<number, CoursReadOnly> = { ...coursCache };
      for (const c of all) map[c.id] = c;
      setCoursCache(map);
    });
  }, [items, coursCache]);

  function refresh() {
    mutate();
    onChanged();
  }

  if (isLoading) return <p className="text-sm text-fg-muted">Chargement…</p>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <CursusAddDialog
          programmeId={programmeId}
          etapeId={etapeId}
          onAdded={refresh}
        />
      </div>
      {(!items || items.length === 0) ? (
        <p className="text-sm text-fg-muted py-4 text-center border border-dashed border-border rounded-md">
          Aucun cours rattaché à cette étape.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-fg-muted">
            <tr>
              <th className="px-2 py-1 text-left">Code</th>
              <th className="px-2 py-1 text-left">Nom</th>
              <th className="px-2 py-1 text-left">Catégorie</th>
              <th className="px-2 py-1 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((it) => {
              const c = coursCache[it.cours_id];
              return (
                <tr key={it.id}>
                  <td className="px-2 py-2 font-mono">{c?.code ?? "…"}</td>
                  <td className="px-2 py-2">{c?.nom ?? `Cours #${it.cours_id}`}</td>
                  <td className="px-2 py-2"><CategorieBadge c={it.categorie} /></td>
                  <td className="px-2 py-2 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRemoving({ cursus: it, cours: c ?? null })}
                      title="Retirer"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <CursusRemoveDialog
        programmeId={programmeId}
        etapeId={etapeId}
        item={removing}
        onClose={() => setRemoving(null)}
        onDone={refresh}
      />
    </div>
  );
}
```

- [ ] **Step 4: Vérifier**

```bash
cd frontend && npm run type-check && npm run lint
```
Expected: 0 erreur (toutes les imports résolues maintenant).

- [ ] **Step 5: Commit**

```bash
git add frontend/components/admin/CursusList.tsx frontend/components/admin/CursusAddDialog.tsx frontend/components/admin/CursusRemoveDialog.tsx
git commit -m "feat(frontend): add cursus list and add/remove dialogs"
```

---

## Task 14: Frontend — page détail programme

**Files:**
- Create: `frontend/app/dashboard/admin/programmes/[id]/page.tsx`

- [ ] **Step 1: Créer la page détail**

```typescript
// frontend/app/dashboard/admin/programmes/[id]/page.tsx
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { programmesApi } from "@/lib/api/programmes";
import { etapesApi } from "@/lib/api/etapes";
import type { Programme } from "@/lib/types/api";
import type { Etape } from "@/lib/types/programmes";
import { EtapeAccordion } from "@/components/admin/EtapeAccordion";
import { EtapeCreateDialog } from "@/components/admin/EtapeCreateDialog";
import { EtapeDeleteDialog } from "@/components/admin/EtapeDeleteDialog";
import { ProgrammeEditDialog } from "@/components/admin/ProgrammeEditDialog";

export default function Page() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const programmeId = Number(params.id);

  const programmeSwr = useSWR<Programme>(
    Number.isFinite(programmeId) ? `programme:${programmeId}` : null,
    () => programmesApi.get(programmeId),
  );
  const etapesSwr = useSWR<Etape[]>(
    Number.isFinite(programmeId) ? `etapes:${programmeId}` : null,
    () => etapesApi.list(programmeId),
  );

  const [editing, setEditing] = useState(false);
  const [deletingEtape, setDeletingEtape] = useState<Etape | null>(null);

  if (!Number.isFinite(programmeId)) {
    return <p className="text-sm text-destructive">Identifiant invalide.</p>;
  }
  if (programmeSwr.isLoading) {
    return <p className="text-sm text-fg-muted py-8 text-center">Chargement…</p>;
  }
  if (programmeSwr.error || !programmeSwr.data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">Programme introuvable.</p>
        <Link className="text-sm text-primary underline" href="/dashboard/admin/programmes">
          Retour à la liste
        </Link>
      </div>
    );
  }

  const programme = programmeSwr.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/admin/programmes")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-sm text-fg-muted">{programme.code}</p>
          <h1 className="text-2xl font-semibold text-fg">{programme.nom}</h1>
          {programme.departement && (
            <p className="mt-1 text-sm text-fg-muted">{programme.departement}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditing(true)}>Modifier le programme</Button>
          <EtapeCreateDialog
            programmeId={programmeId}
            onCreated={() => etapesSwr.mutate()}
          />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-fg mb-3">Étapes et cours</h2>
        {etapesSwr.isLoading ? (
          <p className="text-sm text-fg-muted">Chargement…</p>
        ) : (
          <EtapeAccordion
            programmeId={programmeId}
            etapes={etapesSwr.data ?? []}
            onDeleteEtape={setDeletingEtape}
            onCursusChanged={() => etapesSwr.mutate()}
          />
        )}
      </div>

      <ProgrammeEditDialog
        programme={editing ? programme : null}
        onClose={() => setEditing(false)}
        onUpdated={() => programmeSwr.mutate()}
      />
      <EtapeDeleteDialog
        programmeId={programmeId}
        etape={deletingEtape}
        onClose={() => setDeletingEtape(null)}
        onDone={() => etapesSwr.mutate()}
      />
    </div>
  );
}
```

- [ ] **Step 2: Vérifier**

```bash
cd frontend && npm run type-check && npm run lint
```
Expected: 0 erreur.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/dashboard/admin/programmes/[id]/page.tsx
git commit -m "feat(frontend): add admin programme detail page with etapes accordion"
```

---

## Task 15: Validation finale + PR

**Files:** aucun (vérifications uniquement)

- [ ] **Step 1: Lancer toute la suite backend**

```bash
cd backend && pytest -q
```
Expected: tous les tests passent (≥ 245). Si flakiness sur certains tests d'isolation, relancer.

- [ ] **Step 2: Lancer lint + type-check frontend**

```bash
cd frontend && npm run lint && npm run type-check
```
Expected: 0 erreur, 0 warning bloquant.

- [ ] **Step 3: Smoke test manuel via docker compose**

```bash
docker compose up --build -d
```

Dans le navigateur :
1. Se connecter avec `admin@defi-lacite.ca` (ou autre admin existant).
2. Aller sur `/dashboard/admin/programmes`.
3. Créer un programme `51046 / Programmation informatique / TI`.
4. Cliquer sur la ligne → page détail s'ouvre.
5. Créer 4 étapes (ordre 1 à 4).
6. Sur l'étape 1, ajouter 2 cours via `Ajouter un cours` (nécessite des cours en base — sera couvert PR-C ; ici, on peut insérer 2-3 cours via psql ou laisser vide).
7. Modifier le nom du programme via "Modifier le programme".
8. Retour liste → supprimer le programme (vérifier cascade).

Note : si aucun cours en base, l'étape "ajouter un cours" affichera "Aucun résultat" — c'est OK, le CRUD complet des cours arrive en PR-C.

- [ ] **Step 4: Pousser la branche**

```bash
git push -u origin feature/admin-programmes
```

- [ ] **Step 5: Ouvrir la PR**

```bash
gh pr create --title "feat(admin): gestion programmes + étapes + cursus (PR-B)" --body "$(cat <<'EOF'
## Summary
- Ajout des endpoints CRUD pour Programmes (PUT, DELETE), Étapes (POST/GET/PUT/DELETE), Cursus (POST/GET/PUT/DELETE)
- Ajout du GET /api/cours read-only pour rattacher des cours au cursus (CRUD complet en PR-C)
- Page liste /dashboard/admin/programmes + page détail /dashboard/admin/programmes/[id] avec accordéon étapes et cursus par étape
- Toutes les opérations d'écriture restreintes à `require_role("admin")`
- Cascade Programme → Étape → Cursus déjà gérée par les modèles

## Endpoints ajoutés
- `PUT /api/programmes/{id}` — modifier nom/département
- `DELETE /api/programmes/{id}` — supprimer (cascade)
- `POST/GET /api/programmes/{pid}/etapes` — créer/lister étapes
- `PUT/DELETE /api/programmes/{pid}/etapes/{eid}` — modifier nom / supprimer étape
- `POST/GET /api/programmes/{pid}/etapes/{eid}/cours` — créer/lister cursus
- `PUT/DELETE /api/programmes/{pid}/etapes/{eid}/cours/{lid}` — modifier catégorie / supprimer cursus
- `GET /api/cours` — référentiel cours (read-only, admin+rh)

## Tests
- `test_programme_schemas.py` (7)
- `test_programmes_router.py` (PUT 3 + DELETE 3)
- `test_etapes_router.py` (11)
- `test_cursus_router.py` (9)
- `test_cours_readonly_router.py` (4)

## Test plan (E2E manuel)
- [ ] Admin crée un programme `51046`
- [ ] Page détail → ajoute 4 étapes
- [ ] Étape 1 → ajoute un cours obligatoire et un cours en choix_francais
- [ ] Modifier la catégorie depuis le cursus
- [ ] Supprimer l'étape 2 → cursus de cette étape disparaît
- [ ] Supprimer le programme → toutes les étapes et cursus disparaissent
- [ ] RH essaie de créer un programme → 403

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**1. Spec coverage** — pour chaque endpoint et écran promis dans la description, j'ai une tâche dédiée :
- ✅ Programme PUT (Task 2) / DELETE (Task 3)
- ✅ Étape POST/GET (Task 4) / PUT/DELETE (Task 5)
- ✅ Cours read-only (Task 6)
- ✅ Cursus POST/GET (Task 7) / PUT/DELETE (Task 8)
- ✅ Types + clients API (Task 9)
- ✅ Composants table + dialogs programme (Task 10)
- ✅ Page liste (Task 11)
- ✅ Étape accordéon + dialogs (Task 12)
- ✅ Cursus list + add/remove (Task 13)
- ✅ Page détail (Task 14)
- ✅ Validation finale + PR (Task 15)

**2. Placeholder scan** — aucun "TBD", "add appropriate validation", "implement later". Code complet à chaque step. La parenthèse pédagogique dans Task 4 sur le walrus opérateur est retirée (la version "propre" sans alias est celle à committer).

**3. Type consistency** — vérifications croisées :
- `EtapeOut.programme_id` → `Etape.programme_id` (frontend) ✓
- `CursusOut.categorie: CategorieCours` → `CursusItem.categorie: "obligatoire" | "choix_francais" | "choix_anglais"` ✓
- `programmesApi.update(id, ProgrammeUpdateInput)` → `PUT /api/programmes/{id}` body `ProgrammeUpdate` ✓
- `etapesApi.create(programmeId, EtapeCreateInput)` → `POST /api/programmes/{pid}/etapes` body `EtapeCreate` ✓
- `cursusApi.create(programmeId, etapeId, CursusCreateInput)` → `POST .../cours` body `CursusCreate` ✓
- Toutes les routes utilisent le préfixe `/api/programmes` enregistré dans `main.py` ✓
- Le router cursus est monté sous `prefix="/api/programmes"`, ses routes commencent par `/{programme_id}/etapes/{etape_id}/cours…` ✓
- Le router étapes idem : `prefix="/api/programmes"` + chemin `/{programme_id}/etapes…` ✓

Pas de migration DB (les tables existent déjà depuis PR #13). Aucun changement de modèle SQLAlchemy.
