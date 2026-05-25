# PR-A — Gestion Utilisateurs admin (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Doter l'administrateur d'une UI complète pour gérer les comptes (prof / rh / admin) — création, lecture, modification, désactivation (soft-delete) et réactivation — bout-en-bout, backend + frontend + tests.

**Architecture:**
- Backend FastAPI : nouveau router `routers/utilisateurs.py` (CRUD + soft-delete), nouveaux schemas Pydantic v2 `schemas/users.py`, migration Alembic ajoutant `users.actif BOOLEAN NOT NULL DEFAULT true`, filtre `actif=True` dans `authenticate()`.
- Frontend Next.js 14 : nouvelle page `/dashboard/admin/utilisateurs` avec table shadcn/ui, dialogs création/édition, actions activer/désactiver. Nouvel API client `lib/api/utilisateurs.ts`.
- Sécurité : tous endpoints derrière `require_role("admin")`. Un admin ne peut pas désactiver son propre compte.

**Tech Stack:**
- Backend : FastAPI · SQLAlchemy 2.0 async · Alembic · Pydantic v2 · pytest-asyncio · bcrypt (`hash_password()`)
- Frontend : Next.js 14 App Router · TypeScript strict · shadcn/ui (Dialog, Table-like, Button, Input, Select) · SWR · React 18

---

## File Structure

**Backend** (créés/modifiés)
- `backend/alembic/versions/<rev>_add_actif_to_users.py` — nouvelle migration
- `backend/app/models/user.py` — ajout `actif: Mapped[bool]`
- `backend/app/services/auth_service.py` — `authenticate()` filtre `actif=True`
- `backend/app/schemas/users.py` — nouveau : `UserCreate`, `UserUpdate`, `UserAdminOut`
- `backend/app/routers/utilisateurs.py` — nouveau router (6 endpoints)
- `backend/app/main.py` — `include_router(utilisateurs.router, prefix="/api/admin/utilisateurs")`
- `backend/tests/test_utilisateurs_router.py` — nouveau, ~15 tests

**Frontend** (créés/modifiés)
- `frontend/lib/types/api.ts` — étendu avec `UserAdmin`, `UserCreate`, `UserUpdate`, `UserRole`
- `frontend/lib/api/utilisateurs.ts` — nouveau : `usersApi.list/get/create/update/deactivate/restore`
- `frontend/app/dashboard/admin/utilisateurs/page.tsx` — page principale
- `frontend/components/admin/UsersTable.tsx` — table avec colonnes (email, nom, rôle, statut, actions)
- `frontend/components/admin/UserCreateDialog.tsx` — dialog création
- `frontend/components/admin/UserEditDialog.tsx` — dialog édition (nom, rôle, optionnel password)
- `frontend/components/admin/UserToggleActifDialog.tsx` — confirm activer/désactiver
- `frontend/lib/nav/adminNav.ts` — retirer `disabled: true` sur l'entrée "Utilisateurs"

---

## API Contract (synthèse, prefix `/api/admin/utilisateurs`)

| Méthode | Route | Body / Query | Réponse | Rôle |
|---|---|---|---|---|
| POST | `/` | `UserCreate` (email, password, role, nom_complet) | `201` `UserAdminOut` | admin |
| GET | `/?actif=true` | `actif?: bool` (default: tous) | `200` `UserAdminOut[]` | admin |
| GET | `/{id}` | — | `200` `UserAdminOut` | admin |
| PUT | `/{id}` | `UserUpdate` (nom_complet?, role?, password?) | `200` `UserAdminOut` | admin |
| DELETE | `/{id}` | — (soft) | `200` `UserAdminOut` (actif=false) | admin |
| POST | `/{id}/restaurer` | — | `200` `UserAdminOut` (actif=true) | admin |

**Codes d'erreur attendus** :
- `400` : email existe déjà (création) · mot de passe < 8 caractères
- `403` : non-admin · admin tente de se désactiver lui-même
- `404` : utilisateur introuvable
- `409` : email existe déjà (PUT)

---

## Task 1 : Setup branche + migration Alembic `users.actif`

**Files:**
- Create: `backend/alembic/versions/<rev>_add_actif_to_users.py` (généré)

- [ ] **Step 1 : Créer la branche depuis `main`**

```bash
git checkout main
git pull origin main
git checkout -b feature/admin-utilisateurs
```

- [ ] **Step 2 : Modifier le modèle `User` pour ajouter `actif`**

Modifier `backend/app/models/user.py` :

```python
from sqlalchemy import BigInteger, Boolean, DateTime, String, func
# ...
class User(Base):
    __tablename__ = "users"
    # ... champs existants ...
    actif: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
```

- [ ] **Step 3 : Générer la migration**

```bash
cd backend
alembic revision --autogenerate -m "add_actif_to_users"
```

Vérifier que le fichier généré contient bien `op.add_column('users', sa.Column('actif', sa.Boolean(), server_default=sa.text('true'), nullable=False))` dans `upgrade()` et l'inverse dans `downgrade()`.

- [ ] **Step 4 : Appliquer + vérifier**

```bash
alembic upgrade head
```

Expected : "Running upgrade ... -> ..., add_actif_to_users".

- [ ] **Step 5 : Commit**

```bash
git add backend/app/models/user.py backend/alembic/versions/*_add_actif_to_users.py
git commit -m "feat(db): add actif column to users for soft-delete"
```

---

## Task 2 : Filtrer les utilisateurs inactifs au login

**Files:**
- Modify: `backend/app/services/auth_service.py`
- Test: `backend/tests/test_auth_service.py` (ajout)

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter à `backend/tests/test_auth_service.py` :

```python
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.services.auth_service import authenticate


@pytest.mark.asyncio
async def test_authenticate_refuse_utilisateur_inactif(db_session: AsyncSession):
    u = User(
        email="inactif@test.ca",
        password_hash=hash_password("Test@1234"),
        role=UserRole.PROF,
        nom_complet="Inactif",
        actif=False,
    )
    db_session.add(u)
    await db_session.commit()

    result = await authenticate(db_session, "inactif@test.ca", "Test@1234")
    assert result is None
```

- [ ] **Step 2 : Lancer le test et vérifier l'échec**

```bash
cd backend
pytest tests/test_auth_service.py::test_authenticate_refuse_utilisateur_inactif -v
```

Expected : FAIL (le test passe encore l'utilisateur inactif).

- [ ] **Step 3 : Modifier `authenticate()`**

Dans `backend/app/services/auth_service.py` :

```python
async def authenticate(db: AsyncSession, email: str, password: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email, User.actif.is_(True)))
    user = result.scalar_one_or_none()
    if user is None:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user
```

- [ ] **Step 4 : Lancer le test et vérifier le succès**

```bash
pytest tests/test_auth_service.py -v
```

Expected : PASS (tous les tests auth_service).

- [ ] **Step 5 : Commit**

```bash
git add backend/app/services/auth_service.py backend/tests/test_auth_service.py
git commit -m "feat(auth): exclude inactive users from authentication"
```

---

## Task 3 : Schemas Pydantic `users.py`

**Files:**
- Create: `backend/app/schemas/users.py`

- [ ] **Step 1 : Créer le fichier**

`backend/app/schemas/users.py` :

```python
from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: UserRole
    nom_complet: str = Field(min_length=1, max_length=255)


class UserUpdate(BaseModel):
    nom_complet: str | None = Field(default=None, min_length=1, max_length=255)
    role: UserRole | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserAdminOut(BaseModel):
    id: int
    email: EmailStr
    role: UserRole
    nom_complet: str
    actif: bool

    class Config:
        from_attributes = True
```

- [ ] **Step 2 : Smoke import**

```bash
cd backend
python -c "from app.schemas.users import UserCreate, UserUpdate, UserAdminOut; print('OK')"
```

Expected : `OK`.

- [ ] **Step 3 : Commit**

```bash
git add backend/app/schemas/users.py
git commit -m "feat(api): add pydantic schemas for admin user management"
```

---

## Task 4 : Router POST create utilisateur (TDD)

**Files:**
- Create: `backend/app/routers/utilisateurs.py`
- Create: `backend/tests/test_utilisateurs_router.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1 : Écrire les tests qui échouent**

`backend/tests/test_utilisateurs_router.py` (créer) :

```python
"""Tests endpoints /api/admin/utilisateurs."""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole


@pytest.mark.asyncio
async def test_create_utilisateur_admin(client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession):
    r = await client.post(
        "/api/admin/utilisateurs/",
        json={
            "email": "newprof@test.ca",
            "password": "MotDePasse123",
            "role": "prof",
            "nom_complet": "Nouveau Prof",
        },
        headers=auth_headers_admin,
    )
    assert r.status_code == 201
    data = r.json()
    assert data["email"] == "newprof@test.ca"
    assert data["role"] == "prof"
    assert data["actif"] is True
    assert "password" not in data
    assert "password_hash" not in data


@pytest.mark.asyncio
async def test_create_utilisateur_email_doublon(client: AsyncClient, auth_headers_admin: dict, test_user_prof: User):
    r = await client.post(
        "/api/admin/utilisateurs/",
        json={
            "email": "testprof@test.ca",  # existe déjà
            "password": "MotDePasse123",
            "role": "prof",
            "nom_complet": "Doublon",
        },
        headers=auth_headers_admin,
    )
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_create_utilisateur_refuse_rh(client: AsyncClient, auth_headers_rh: dict):
    r = await client.post(
        "/api/admin/utilisateurs/",
        json={
            "email": "x@test.ca",
            "password": "MotDePasse123",
            "role": "prof",
            "nom_complet": "X",
        },
        headers=auth_headers_rh,
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_create_utilisateur_password_trop_court(client: AsyncClient, auth_headers_admin: dict):
    r = await client.post(
        "/api/admin/utilisateurs/",
        json={
            "email": "y@test.ca",
            "password": "abc",
            "role": "prof",
            "nom_complet": "Y",
        },
        headers=auth_headers_admin,
    )
    assert r.status_code == 422
```

- [ ] **Step 2 : Créer le router (minimal pour POST)**

`backend/app/routers/utilisateurs.py` (créer) :

```python
"""Routes admin pour la gestion complète des utilisateurs."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.core.security import hash_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.users import UserAdminOut, UserCreate

router = APIRouter()


@router.post("/", response_model=UserAdminOut, status_code=status.HTTP_201_CREATED)
async def create_utilisateur(
    payload: UserCreate,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> UserAdminOut:
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email {payload.email} déjà utilisé",
        )
    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        nom_complet=payload.nom_complet,
        actif=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
```

- [ ] **Step 3 : Inclure le router dans `main.py`**

Modifier `backend/app/main.py` — ajouter avec les autres imports :

```python
from app.routers import utilisateurs as utilisateurs_router
```

Puis avant la dernière ligne :

```python
app.include_router(utilisateurs_router.router, prefix="/api/admin/utilisateurs", tags=["admin-utilisateurs"])
```

- [ ] **Step 4 : Lancer les tests POST**

```bash
cd backend
pytest tests/test_utilisateurs_router.py -v
```

Expected : 4 tests PASS.

- [ ] **Step 5 : Commit**

```bash
git add backend/app/routers/utilisateurs.py backend/tests/test_utilisateurs_router.py backend/app/main.py
git commit -m "feat(api): add admin POST /api/admin/utilisateurs with role guard"
```

---

## Task 5 : Router GET list + GET one (TDD)

**Files:**
- Modify: `backend/app/routers/utilisateurs.py`
- Modify: `backend/tests/test_utilisateurs_router.py`

- [ ] **Step 1 : Écrire les tests qui échouent**

Ajouter à `backend/tests/test_utilisateurs_router.py` :

```python
@pytest.mark.asyncio
async def test_list_utilisateurs(client: AsyncClient, auth_headers_admin: dict, test_user_admin: User, test_user_prof: User, test_user_rh: User):
    r = await client.get("/api/admin/utilisateurs/", headers=auth_headers_admin)
    assert r.status_code == 200
    data = r.json()
    emails = {u["email"] for u in data}
    assert "testadmin@test.ca" in emails
    assert "testprof@test.ca" in emails
    assert "testrh@test.ca" in emails


@pytest.mark.asyncio
async def test_list_utilisateurs_filtre_actif(client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession, test_user_admin: User):
    from app.core.security import hash_password
    u = User(email="inactif@test.ca", password_hash=hash_password("Test@1234"),
            role=UserRole.PROF, nom_complet="Inactif", actif=False)
    db_session.add(u)
    await db_session.commit()

    r = await client.get("/api/admin/utilisateurs/?actif=false", headers=auth_headers_admin)
    assert r.status_code == 200
    emails = {u["email"] for u in r.json()}
    assert emails == {"inactif@test.ca"}


@pytest.mark.asyncio
async def test_get_utilisateur_par_id(client: AsyncClient, auth_headers_admin: dict, test_user_prof: User):
    r = await client.get(f"/api/admin/utilisateurs/{test_user_prof.id}", headers=auth_headers_admin)
    assert r.status_code == 200
    assert r.json()["email"] == "testprof@test.ca"


@pytest.mark.asyncio
async def test_get_utilisateur_404(client: AsyncClient, auth_headers_admin: dict):
    r = await client.get("/api/admin/utilisateurs/99999", headers=auth_headers_admin)
    assert r.status_code == 404
```

- [ ] **Step 2 : Implémenter les endpoints GET**

Ajouter à `backend/app/routers/utilisateurs.py` :

```python
@router.get("/", response_model=list[UserAdminOut])
async def list_utilisateurs(
    actif: bool | None = None,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> list[UserAdminOut]:
    stmt = select(User).order_by(User.nom_complet)
    if actif is not None:
        stmt = stmt.where(User.actif.is_(actif))
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/{user_id}", response_model=UserAdminOut)
async def get_utilisateur(
    user_id: int,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> UserAdminOut:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")
    return user
```

- [ ] **Step 3 : Lancer les tests**

```bash
pytest tests/test_utilisateurs_router.py -v
```

Expected : tous PASS.

- [ ] **Step 4 : Commit**

```bash
git add backend/app/routers/utilisateurs.py backend/tests/test_utilisateurs_router.py
git commit -m "feat(api): add admin GET list and detail for utilisateurs"
```

---

## Task 6 : Router PUT update utilisateur (TDD)

**Files:**
- Modify: `backend/app/routers/utilisateurs.py`
- Modify: `backend/tests/test_utilisateurs_router.py`

- [ ] **Step 1 : Écrire les tests qui échouent**

Ajouter à `backend/tests/test_utilisateurs_router.py` :

```python
@pytest.mark.asyncio
async def test_update_utilisateur_nom_et_role(client: AsyncClient, auth_headers_admin: dict, test_user_prof: User):
    r = await client.put(
        f"/api/admin/utilisateurs/{test_user_prof.id}",
        json={"nom_complet": "Renommé", "role": "rh"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["nom_complet"] == "Renommé"
    assert data["role"] == "rh"


@pytest.mark.asyncio
async def test_update_utilisateur_password(client: AsyncClient, auth_headers_admin: dict, test_user_prof: User, db_session: AsyncSession):
    from app.core.security import verify_password
    r = await client.put(
        f"/api/admin/utilisateurs/{test_user_prof.id}",
        json={"password": "NouveauPass456"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 200
    await db_session.refresh(test_user_prof)
    assert verify_password("NouveauPass456", test_user_prof.password_hash)


@pytest.mark.asyncio
async def test_update_utilisateur_404(client: AsyncClient, auth_headers_admin: dict):
    r = await client.put(
        "/api/admin/utilisateurs/99999",
        json={"nom_complet": "X"},
        headers=auth_headers_admin,
    )
    assert r.status_code == 404
```

- [ ] **Step 2 : Implémenter PUT**

Ajouter à `backend/app/routers/utilisateurs.py` (et import du schema `UserUpdate`) :

```python
from app.schemas.users import UserAdminOut, UserCreate, UserUpdate

# ... après get_utilisateur ...

@router.put("/{user_id}", response_model=UserAdminOut)
async def update_utilisateur(
    user_id: int,
    payload: UserUpdate,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> UserAdminOut:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")

    if payload.nom_complet is not None:
        user.nom_complet = payload.nom_complet
    if payload.role is not None:
        user.role = payload.role
    if payload.password is not None:
        user.password_hash = hash_password(payload.password)

    await db.commit()
    await db.refresh(user)
    return user
```

- [ ] **Step 3 : Lancer les tests**

```bash
pytest tests/test_utilisateurs_router.py -v
```

Expected : tous PASS.

- [ ] **Step 4 : Commit**

```bash
git add backend/app/routers/utilisateurs.py backend/tests/test_utilisateurs_router.py
git commit -m "feat(api): add admin PUT update for utilisateurs"
```

---

## Task 7 : Router DELETE soft + POST /restaurer (TDD)

**Files:**
- Modify: `backend/app/routers/utilisateurs.py`
- Modify: `backend/tests/test_utilisateurs_router.py`

- [ ] **Step 1 : Écrire les tests qui échouent**

Ajouter :

```python
@pytest.mark.asyncio
async def test_delete_utilisateur_soft(client: AsyncClient, auth_headers_admin: dict, test_user_prof: User):
    r = await client.delete(f"/api/admin/utilisateurs/{test_user_prof.id}", headers=auth_headers_admin)
    assert r.status_code == 200
    assert r.json()["actif"] is False

    # Confirme que l'utilisateur existe toujours en BDD
    r2 = await client.get(f"/api/admin/utilisateurs/{test_user_prof.id}", headers=auth_headers_admin)
    assert r2.status_code == 200
    assert r2.json()["actif"] is False


@pytest.mark.asyncio
async def test_restaurer_utilisateur(client: AsyncClient, auth_headers_admin: dict, test_user_prof: User, db_session: AsyncSession):
    test_user_prof.actif = False
    await db_session.commit()

    r = await client.post(f"/api/admin/utilisateurs/{test_user_prof.id}/restaurer", headers=auth_headers_admin)
    assert r.status_code == 200
    assert r.json()["actif"] is True


@pytest.mark.asyncio
async def test_delete_utilisateur_404(client: AsyncClient, auth_headers_admin: dict):
    r = await client.delete("/api/admin/utilisateurs/99999", headers=auth_headers_admin)
    assert r.status_code == 404
```

- [ ] **Step 2 : Implémenter DELETE + restaurer**

Ajouter à `backend/app/routers/utilisateurs.py` :

```python
@router.delete("/{user_id}", response_model=UserAdminOut)
async def desactiver_utilisateur(
    user_id: int,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> UserAdminOut:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")
    user.actif = False
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/{user_id}/restaurer", response_model=UserAdminOut)
async def restaurer_utilisateur(
    user_id: int,
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> UserAdminOut:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")
    user.actif = True
    await db.commit()
    await db.refresh(user)
    return user
```

- [ ] **Step 3 : Lancer les tests**

```bash
pytest tests/test_utilisateurs_router.py -v
```

Expected : tous PASS.

- [ ] **Step 4 : Commit**

```bash
git add backend/app/routers/utilisateurs.py backend/tests/test_utilisateurs_router.py
git commit -m "feat(api): add admin DELETE (soft) and restaurer for utilisateurs"
```

---

## Task 8 : Garde-fou — admin ne peut pas se désactiver lui-même (TDD)

**Files:**
- Modify: `backend/app/routers/utilisateurs.py`
- Modify: `backend/tests/test_utilisateurs_router.py`

- [ ] **Step 1 : Écrire le test qui échoue**

```python
@pytest.mark.asyncio
async def test_admin_ne_peut_pas_se_desactiver(client: AsyncClient, auth_headers_admin: dict, test_user_admin: User):
    r = await client.delete(f"/api/admin/utilisateurs/{test_user_admin.id}", headers=auth_headers_admin)
    assert r.status_code == 403
    assert "lui-même" in r.json()["detail"].lower() or "soi-même" in r.json()["detail"].lower()
```

- [ ] **Step 2 : Lancer et vérifier l'échec**

```bash
pytest tests/test_utilisateurs_router.py::test_admin_ne_peut_pas_se_desactiver -v
```

Expected : FAIL (200 au lieu de 403).

- [ ] **Step 3 : Ajouter le garde-fou**

Modifier `desactiver_utilisateur` dans `backend/app/routers/utilisateurs.py` :

```python
@router.delete("/{user_id}", response_model=UserAdminOut)
async def desactiver_utilisateur(
    user_id: int,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> UserAdminOut:
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Un admin ne peut pas se désactiver lui-même",
        )
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")
    user.actif = False
    await db.commit()
    await db.refresh(user)
    return user
```

- [ ] **Step 4 : Lancer tous les tests utilisateurs**

```bash
pytest tests/test_utilisateurs_router.py -v
```

Expected : tous PASS.

- [ ] **Step 5 : Lancer la suite complète backend pour vérifier non-régression**

```bash
pytest
```

Expected : aucun test cassé.

- [ ] **Step 6 : Commit**

```bash
git add backend/app/routers/utilisateurs.py backend/tests/test_utilisateurs_router.py
git commit -m "feat(api): prevent admin from deactivating themselves"
```

---

## Task 9 : Frontend — types + API client

**Files:**
- Modify: `frontend/lib/types/api.ts`
- Create: `frontend/lib/api/utilisateurs.ts`

- [ ] **Step 1 : Étendre les types**

Ajouter à `frontend/lib/types/api.ts` (vérifier d'abord ce qui existe) :

```typescript
export type UserRole = "prof" | "rh" | "admin";

export interface UserAdmin {
  id: number;
  email: string;
  role: UserRole;
  nom_complet: string;
  actif: boolean;
}

export interface UserCreateInput {
  email: string;
  password: string;
  role: UserRole;
  nom_complet: string;
}

export interface UserUpdateInput {
  nom_complet?: string;
  role?: UserRole;
  password?: string;
}
```

- [ ] **Step 2 : Créer l'API client**

`frontend/lib/api/utilisateurs.ts` :

```typescript
import { apiClient } from "./client";
import type { UserAdmin, UserCreateInput, UserUpdateInput } from "@/lib/types/api";

export const usersApi = {
  list: (actif?: boolean): Promise<UserAdmin[]> => {
    const query = actif === undefined ? "" : `?actif=${actif}`;
    return apiClient.get<UserAdmin[]>(`/api/admin/utilisateurs/${query}`);
  },

  get: (id: number): Promise<UserAdmin> =>
    apiClient.get<UserAdmin>(`/api/admin/utilisateurs/${id}`),

  create: (input: UserCreateInput): Promise<UserAdmin> =>
    apiClient.post<UserAdmin>("/api/admin/utilisateurs/", input),

  update: (id: number, input: UserUpdateInput): Promise<UserAdmin> =>
    apiClient.put<UserAdmin>(`/api/admin/utilisateurs/${id}`, input),

  deactivate: (id: number): Promise<UserAdmin> =>
    apiClient.delete<UserAdmin>(`/api/admin/utilisateurs/${id}`),

  restore: (id: number): Promise<UserAdmin> =>
    apiClient.post<UserAdmin>(`/api/admin/utilisateurs/${id}/restaurer`, {}),
};
```

- [ ] **Step 3 : Vérifier la compilation**

```bash
cd frontend
npm run type-check
```

Expected : 0 erreurs.

- [ ] **Step 4 : Commit**

```bash
git add frontend/lib/types/api.ts frontend/lib/api/utilisateurs.ts
git commit -m "feat(frontend): add user admin types and API client"
```

---

## Task 10 : Frontend — Composant `UsersTable`

**Files:**
- Create: `frontend/components/admin/UsersTable.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UserAdmin } from "@/lib/types/api";
import { Pencil, Power, RotateCcw } from "lucide-react";

interface UsersTableProps {
  users: UserAdmin[];
  onEdit: (u: UserAdmin) => void;
  onDeactivate: (u: UserAdmin) => void;
  onRestore: (u: UserAdmin) => void;
}

const ROLE_LABEL: Record<string, string> = {
  prof: "Professeur",
  rh: "Responsable RH",
  admin: "Administrateur",
};

export function UsersTable({ users, onEdit, onDeactivate, onRestore }: UsersTableProps) {
  if (users.length === 0) {
    return <p className="text-sm text-fg-muted py-8 text-center">Aucun utilisateur.</p>;
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg">
      <table className="w-full text-sm">
        <thead className="bg-bg-muted text-xs uppercase text-fg-muted">
          <tr>
            <th className="px-4 py-2 text-left">Nom</th>
            <th className="px-4 py-2 text-left">Email</th>
            <th className="px-4 py-2 text-left">Rôle</th>
            <th className="px-4 py-2 text-left">Statut</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-bg-muted/40">
              <td className="px-4 py-3 font-medium text-fg">{u.nom_complet}</td>
              <td className="px-4 py-3 text-fg-muted">{u.email}</td>
              <td className="px-4 py-3">{ROLE_LABEL[u.role] ?? u.role}</td>
              <td className="px-4 py-3">
                <Badge variant={u.actif ? "default" : "secondary"}>
                  {u.actif ? "Actif" : "Inactif"}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right space-x-1">
                <Button size="sm" variant="ghost" onClick={() => onEdit(u)} title="Modifier">
                  <Pencil className="h-4 w-4" />
                </Button>
                {u.actif ? (
                  <Button size="sm" variant="ghost" onClick={() => onDeactivate(u)} title="Désactiver">
                    <Power className="h-4 w-4 text-destructive" />
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => onRestore(u)} title="Réactiver">
                    <RotateCcw className="h-4 w-4 text-primary" />
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2 : Commit**

```bash
git add frontend/components/admin/UsersTable.tsx
git commit -m "feat(frontend): add UsersTable with role label and actif badge"
```

---

## Task 11 : Frontend — Dialog création utilisateur

**Files:**
- Create: `frontend/components/admin/UserCreateDialog.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usersApi } from "@/lib/api/utilisateurs";
import type { UserRole } from "@/lib/types/api";
import { UserPlus, Loader2 } from "lucide-react";

interface Props {
  onCreated: () => void;
}

export function UserCreateDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("prof");
  const [nom, setNom] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setEmail(""); setPassword(""); setRole("prof"); setNom(""); setError(null);
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await usersApi.create({ email, password, role, nom_complet: nom });
      reset();
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = email && password.length >= 8 && nom.length >= 1;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Créer un utilisateur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel utilisateur</DialogTitle>
          <DialogDescription>
            Le mot de passe doit faire au moins 8 caractères. L&apos;utilisateur sera actif par défaut.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom complet</Label>
            <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Jean Tremblay" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jean@defi-lacite.ca" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères minimum" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="prof">Professeur</SelectItem>
                <SelectItem value="rh">Responsable RH</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>
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

- [ ] **Step 2 : Vérifier compilation**

```bash
cd frontend
npm run type-check
```

Expected : 0 erreurs.

- [ ] **Step 3 : Commit**

```bash
git add frontend/components/admin/UserCreateDialog.tsx
git commit -m "feat(frontend): add UserCreateDialog with role select and password validation"
```

---

## Task 12 : Frontend — Dialog édition utilisateur

**Files:**
- Create: `frontend/components/admin/UserEditDialog.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usersApi } from "@/lib/api/utilisateurs";
import type { UserAdmin, UserRole } from "@/lib/types/api";
import { Loader2 } from "lucide-react";

interface Props {
  user: UserAdmin | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function UserEditDialog({ user, onClose, onUpdated }: Props) {
  const [nom, setNom] = useState("");
  const [role, setRole] = useState<UserRole>("prof");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setNom(user.nom_complet);
      setRole(user.role);
      setPassword("");
      setError(null);
    }
  }, [user]);

  async function handleSubmit() {
    if (!user) return;
    setError(null);
    setSubmitting(true);
    try {
      const payload: { nom_complet?: string; role?: UserRole; password?: string } = {};
      if (nom !== user.nom_complet) payload.nom_complet = nom;
      if (role !== user.role) payload.role = role;
      if (password.length >= 8) payload.password = password;
      await usersApi.update(user.id, payload);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la modification");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier l&apos;utilisateur</DialogTitle>
          <DialogDescription>
            Laissez le mot de passe vide pour le conserver. L&apos;email n&apos;est pas modifiable.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nom-edit">Nom complet</Label>
            <Input id="nom-edit" value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role-edit">Rôle</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="prof">Professeur</SelectItem>
                <SelectItem value="rh">Responsable RH</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pwd-edit">Nouveau mot de passe (optionnel)</Label>
            <Input id="pwd-edit" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Laissez vide pour ne pas changer" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enregistrement…</> : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2 : Vérifier compilation**

```bash
cd frontend
npm run type-check
```

Expected : 0 erreurs.

- [ ] **Step 3 : Commit**

```bash
git add frontend/components/admin/UserEditDialog.tsx
git commit -m "feat(frontend): add UserEditDialog with optional password change"
```

---

## Task 13 : Frontend — AlertDialog confirmation activer/désactiver

**Files:**
- Create: `frontend/components/admin/UserToggleActifDialog.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
"use client";

import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usersApi } from "@/lib/api/utilisateurs";
import type { UserAdmin } from "@/lib/types/api";

interface Props {
  user: UserAdmin | null;
  mode: "deactivate" | "restore";
  onClose: () => void;
  onDone: () => void;
}

export function UserToggleActifDialog({ user, mode, onClose, onDone }: Props) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!user) return;
    setSubmitting(true);
    try {
      if (mode === "deactivate") await usersApi.deactivate(user.id);
      else await usersApi.restore(user.id);
      onDone();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog open={!!user} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {mode === "deactivate" ? "Désactiver l'utilisateur ?" : "Réactiver l'utilisateur ?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {mode === "deactivate"
              ? `${user?.nom_complet} ne pourra plus se connecter. Cette action est réversible.`
              : `${user?.nom_complet} pourra à nouveau se connecter.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={submitting}>
            {mode === "deactivate" ? "Désactiver" : "Réactiver"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 2 : Commit**

```bash
git add frontend/components/admin/UserToggleActifDialog.tsx
git commit -m "feat(frontend): add UserToggleActifDialog confirmation"
```

---

## Task 14 : Frontend — Page principale `/dashboard/admin/utilisateurs`

**Files:**
- Create: `frontend/app/dashboard/admin/utilisateurs/page.tsx`

- [ ] **Step 1 : Créer la page**

```tsx
"use client";

import { useState } from "react";
import useSWR from "swr";
import { UsersTable } from "@/components/admin/UsersTable";
import { UserCreateDialog } from "@/components/admin/UserCreateDialog";
import { UserEditDialog } from "@/components/admin/UserEditDialog";
import { UserToggleActifDialog } from "@/components/admin/UserToggleActifDialog";
import { usersApi } from "@/lib/api/utilisateurs";
import type { UserAdmin } from "@/lib/types/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Filter = "all" | "actifs" | "inactifs";

export default function Page() {
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<UserAdmin | null>(null);
  const [toggling, setToggling] = useState<{ user: UserAdmin; mode: "deactivate" | "restore" } | null>(null);

  const swrKey = `users:${filter}`;
  const { data: users, mutate, isLoading } = useSWR<UserAdmin[]>(swrKey, () => {
    if (filter === "actifs") return usersApi.list(true);
    if (filter === "inactifs") return usersApi.list(false);
    return usersApi.list();
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Utilisateurs</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Gestion des comptes professeurs, RH et administrateurs.
          </p>
        </div>
        <UserCreateDialog onCreated={() => mutate()} />
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-fg-muted">Filtrer :</span>
        <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="actifs">Actifs seulement</SelectItem>
            <SelectItem value="inactifs">Inactifs seulement</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-fg-muted py-8 text-center">Chargement…</p>
      ) : (
        <UsersTable
          users={users ?? []}
          onEdit={setEditing}
          onDeactivate={(u) => setToggling({ user: u, mode: "deactivate" })}
          onRestore={(u) => setToggling({ user: u, mode: "restore" })}
        />
      )}

      <UserEditDialog
        user={editing}
        onClose={() => setEditing(null)}
        onUpdated={() => mutate()}
      />
      <UserToggleActifDialog
        user={toggling?.user ?? null}
        mode={toggling?.mode ?? "deactivate"}
        onClose={() => setToggling(null)}
        onDone={() => mutate()}
      />
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier compilation**

```bash
cd frontend
npm run type-check && npm run lint
```

Expected : 0 erreurs.

- [ ] **Step 3 : Commit**

```bash
git add frontend/app/dashboard/admin/utilisateurs/page.tsx
git commit -m "feat(frontend): add admin utilisateurs page with filter and CRUD"
```

---

## Task 15 : Activer la nav + test E2E manuel

**Files:**
- Modify: `frontend/lib/nav/adminNav.ts`

- [ ] **Step 1 : Retirer `disabled` sur l'entrée Utilisateurs**

Modifier `frontend/lib/nav/adminNav.ts` :

```typescript
{ href: "/dashboard/admin/utilisateurs", label: "Utilisateurs", icon: UserCog },
```

(supprimer `disabled: true`)

- [ ] **Step 2 : Lancer docker compose**

```bash
docker compose up --build -d
```

Attendre que tous les services soient up.

- [ ] **Step 3 : Test E2E manuel**

Ouvrir http://localhost:3000 et tester :

1. Se connecter en admin (`admin@defi-lacite.ca` / `Admin@LaCite2026!`)
2. Aller dans Utilisateurs (sidebar)
3. Cliquer "Créer un utilisateur" → créer `prof13@defi-lacite.ca` rôle prof, mot de passe `TestPass123`
4. Le voir apparaître dans la table avec badge "Actif"
5. Cliquer Édition → changer le nom → enregistrer → vérifier la table mise à jour
6. Cliquer Désactiver → confirmer → vérifier badge "Inactif"
7. Filtrer "Inactifs seulement" → vérifier qu'il apparaît
8. Cliquer Réactiver → confirmer → vérifier badge "Actif"
9. Se déconnecter, tenter de se reconnecter en tant que admin et essayer de se désactiver → vérifier le 403
10. Désactiver prof13 → tenter de se connecter en prof13 → vérifier 401

- [ ] **Step 4 : Lancer toute la suite de tests backend une dernière fois**

```bash
cd backend
pytest
```

Expected : tous passent.

- [ ] **Step 5 : Lancer lint + type-check frontend**

```bash
cd frontend
npm run lint && npm run type-check
```

Expected : 0 erreurs.

- [ ] **Step 6 : Commit final + push + PR**

```bash
cd ..
git add frontend/lib/nav/adminNav.ts
git commit -m "feat(frontend): enable utilisateurs nav entry in admin sidebar"
git push -u origin feature/admin-utilisateurs
gh pr create --title "feat(admin): gestion utilisateurs — CRUD + soft-delete (PR-A)" --body "$(cat <<'EOF'
## Summary
- Migration: ajout `users.actif BOOLEAN NOT NULL DEFAULT true`
- Backend: nouveau router `/api/admin/utilisateurs` (POST, GET list/one, PUT, DELETE soft, POST /restaurer)
- Auth: `authenticate()` exclut les utilisateurs `actif=False`
- Garde-fou: un admin ne peut pas se désactiver lui-même
- Frontend: page `/dashboard/admin/utilisateurs` avec table, dialog création/édition, toggle actif

## Test plan
- [x] `pytest tests/test_utilisateurs_router.py` — 15 tests verts
- [x] `pytest` complet — aucune régression
- [x] `npm run type-check && npm run lint` — 0 erreurs
- [x] E2E manuel : créer prof13, éditer, désactiver, filtrer, réactiver
- [x] E2E manuel : prof13 désactivé → 401 au login
- [x] E2E manuel : admin tente de se désactiver → 403

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review checklist

- [x] **Spec coverage** : POST, GET list, GET one, PUT, DELETE soft, POST restaurer, garde-fou self-deactivation, exclusion login → toutes couvertes (Tasks 4, 5, 6, 7, 8, 2)
- [x] **Placeholder scan** : aucun TBD/TODO ; tout le code est complet
- [x] **Type consistency** : `UserAdminOut` côté backend ↔ `UserAdmin` côté frontend ; `usersApi.deactivate/restore` ↔ DELETE/POST restaurer
- [x] **Migration réversible** : `upgrade()` et `downgrade()` symétriques
- [x] **Tests** : 15 tests pytest couvrent les cas nominaux + erreurs (409, 403, 404, 422)
- [x] **Sécurité** : `require_role("admin")` partout · password jamais retourné dans les réponses · validation `min_length=8` sur le mot de passe · garde-fou self-deactivation
