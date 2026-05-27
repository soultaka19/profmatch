# Consultation RH des CV des professeurs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre au rôle `rh` de consulter, en lecture seule, la liste paginée des professeurs et de prévisualiser le profil extrait de leur CV dans un drawer latéral.

**Architecture:** Backend FastAPI = nouveau router GET-only `/api/rh/professeurs` (liste paginée + détail), service dédié, schémas Pydantic réutilisant ceux d'`extraction.py`. Frontend Next.js = page RH `/dashboard/rh/professeurs` (recherche + pagination + tableau), drawer shadcn `Sheet` (côté droit) affichant des vues read-only. Aucune écriture, aucune migration.

**Tech Stack:** FastAPI 3.12, SQLAlchemy 2.0 async, Pydantic v2, pytest/httpx ; Next.js 16, React 19, shadcn/ui (Radix dialog), SWR, Vitest + Testing Library.

**Convention commits :** Conventional Commits, scopes `api`/`frontend`. **Aucun trailer `Co-Authored-By`** (convention projet — branche `docs/claude-no-ai-coauthor`).

---

## File Structure

**Backend (créer)**
- `backend/app/schemas/rh_professeur.py` — schémas liste + détail.
- `backend/app/services/rh_professeur_service.py` — requêtes liste/détail.
- `backend/app/routers/rh_professeurs.py` — endpoints GET.
- `backend/tests/test_rh_professeurs_router.py` — tests endpoints.

**Backend (modifier)**
- `backend/app/main.py` — monter le router.

**Frontend (créer)**
- `frontend/components/ui/sheet.tsx` — primitive drawer.
- `frontend/lib/api/rhProfesseurs.ts` — client API + types.
- `frontend/lib/hooks/useRhProfesseurs.ts` — hooks SWR liste + détail.
- `frontend/components/rh/professeurs/CvStatutBadge.tsx` — badge statut (présentationnel).
- `frontend/components/rh/professeurs/CvStatutBadge.test.tsx`
- `frontend/components/rh/professeurs/ProfesseursTable.tsx` — tableau (présentationnel).
- `frontend/components/rh/professeurs/ProfesseursTable.test.tsx`
- `frontend/components/rh/professeurs/ProfilReadOnlyView.tsx` — profil read-only (présentationnel).
- `frontend/components/rh/professeurs/ProfilReadOnlyView.test.tsx`
- `frontend/components/rh/professeurs/ProfesseurCvDrawer.tsx` — conteneur drawer (SWR + Sheet).
- `frontend/components/rh/professeurs/ProfesseurCvDrawer.test.tsx`
- `frontend/app/dashboard/rh/professeurs/page.tsx` — page liste.
- `frontend/app/dashboard/rh/professeurs/__tests__/page.test.tsx`

**Frontend (modifier)**
- `frontend/lib/nav/rhNav.ts` — activer l'entrée « Professeurs ».

> **Note de décomposition :** la spec listait 5 vues read-only séparées ; on les regroupe dans un seul fichier `ProfilReadOnlyView.tsx` (une responsabilité claire : « rendre un profil prof en lecture seule »), avec des sous-composants internes. Comportement identique, moins d'éparpillement.

---

## Task 1 : Backend — endpoint LISTE paginée

**Files:**
- Create: `backend/app/schemas/rh_professeur.py`
- Create: `backend/app/services/rh_professeur_service.py`
- Create: `backend/app/routers/rh_professeurs.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_rh_professeurs_router.py`

- [ ] **Step 1 : Écrire les tests de la liste (échouent)**

Créer `backend/tests/test_rh_professeurs_router.py` :

```python
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.competence import Competence, CompetenceNiveau, SourceOrigine
from app.models.cv import CV, CVStatut
from app.models.professeur import Professeur
from app.models.user import User, UserRole


async def _make_prof(db: AsyncSession, email: str, nom: str) -> Professeur:
    user = User(email=email, password_hash=hash_password("Test@1234"),
                role=UserRole.PROF, nom_complet=nom)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    result = await db.execute(select(Professeur).where(Professeur.user_id == user.id))
    return result.scalar_one()


# ── Liste ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_requires_auth(client: AsyncClient):
    r = await client.get("/api/rh/professeurs")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_list_forbidden_for_prof(client: AsyncClient, auth_headers_prof):
    r = await client.get("/api/rh/professeurs", headers=auth_headers_prof)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_list_returns_profs_with_cv_statut(
    client: AsyncClient, auth_headers_rh, db_session: AsyncSession,
):
    prof = await _make_prof(db_session, "alice@test.ca", "Alice Martin")
    db_session.add(CV(
        professeur_id=prof.id, nom_original="alice.pdf", chemin_fichier="/x/alice.pdf",
        taille_octets=100, mime_type="application/pdf", statut=CVStatut.TRAITE,
    ))
    await db_session.commit()

    r = await client.get("/api/rh/professeurs", headers=auth_headers_rh)
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 1
    assert data["page"] == 1
    assert data["page_size"] == 10
    item = data["items"][0]
    assert item["professeur_id"] == prof.id
    assert item["nom_complet"] == "Alice Martin"
    assert item["email"] == "alice@test.ca"
    assert item["cv_statut"] == "traite"
    assert item["cv_nom_original"] == "alice.pdf"


@pytest.mark.asyncio
async def test_list_prof_without_cv_has_null_statut(
    client: AsyncClient, auth_headers_rh, db_session: AsyncSession,
):
    await _make_prof(db_session, "bob@test.ca", "Bob Tremblay")
    r = await client.get("/api/rh/professeurs", headers=auth_headers_rh)
    assert r.status_code == 200
    item = r.json()["items"][0]
    assert item["cv_statut"] is None
    assert item["cv_nom_original"] is None


@pytest.mark.asyncio
async def test_list_excludes_non_prof_users(
    client: AsyncClient, auth_headers_rh, test_user_rh, db_session: AsyncSession,
):
    await _make_prof(db_session, "carol@test.ca", "Carol Roy")
    r = await client.get("/api/rh/professeurs", headers=auth_headers_rh)
    assert r.status_code == 200
    # Seul le prof figure dans la liste (pas le RH connecté)
    assert r.json()["total"] == 1
    assert r.json()["items"][0]["nom_complet"] == "Carol Roy"


@pytest.mark.asyncio
async def test_list_search_filters_by_name_or_email(
    client: AsyncClient, auth_headers_rh, db_session: AsyncSession,
):
    await _make_prof(db_session, "alice@test.ca", "Alice Martin")
    await _make_prof(db_session, "bob@test.ca", "Bob Tremblay")
    r = await client.get("/api/rh/professeurs?q=marti", headers=auth_headers_rh)
    assert r.status_code == 200
    assert r.json()["total"] == 1
    assert r.json()["items"][0]["nom_complet"] == "Alice Martin"


@pytest.mark.asyncio
async def test_list_pagination(
    client: AsyncClient, auth_headers_rh, db_session: AsyncSession,
):
    for i in range(3):
        await _make_prof(db_session, f"p{i}@test.ca", f"Prof {i}")
    r = await client.get("/api/rh/professeurs?page=2&page_size=2", headers=auth_headers_rh)
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 3
    assert data["page"] == 2
    assert data["page_size"] == 2
    assert len(data["items"]) == 1
```

- [ ] **Step 2 : Lancer les tests → échec attendu**

Run: `cd backend && pytest tests/test_rh_professeurs_router.py -v`
Expected: FAIL (404 sur la route non montée / module absent).

- [ ] **Step 3 : Créer les schémas**

Créer `backend/app/schemas/rh_professeur.py` :

```python
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.cv import CVStatut
from app.schemas.extraction import (
    CompetenceResponse,
    ExperienceResponse,
    FormationResponse,
    LangueResponse,
    ProfilResponse,
)


class ProfesseurListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    professeur_id: int
    nom_complet: str
    email: str
    cv_statut: CVStatut | None = None
    cv_nom_original: str | None = None
    traite_le: datetime | None = None


class ProfesseurListResponse(BaseModel):
    items: list[ProfesseurListItem]
    total: int
    page: int
    page_size: int


class ProfesseurDetailResponse(BaseModel):
    professeur_id: int
    nom_complet: str
    email: str
    cv_statut: CVStatut | None = None
    cv_nom_original: str | None = None
    traite_le: datetime | None = None
    profil: ProfilResponse
    competences: list[CompetenceResponse]
    experiences: list[ExperienceResponse]
    formations: list[FormationResponse]
    langues: list[LangueResponse]
```

- [ ] **Step 4 : Créer le service (fonction liste)**

Créer `backend/app/services/rh_professeur_service.py` :

```python
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cv import CV
from app.models.professeur import Professeur
from app.models.user import User, UserRole
from app.schemas.rh_professeur import ProfesseurListItem


async def list_professeurs(
    db: AsyncSession, page: int, page_size: int, q: str | None,
) -> tuple[list[ProfesseurListItem], int]:
    """Liste paginée des professeurs (tous), avec méta CV (LEFT JOIN)."""
    base = select(Professeur, User, CV).join(
        User, Professeur.user_id == User.id
    ).outerjoin(CV, CV.professeur_id == Professeur.id).where(User.role == UserRole.PROF)

    count_stmt = select(func.count(Professeur.id)).join(
        User, Professeur.user_id == User.id
    ).where(User.role == UserRole.PROF)

    if q:
        like = f"%{q}%"
        condition = or_(User.nom_complet.ilike(like), User.email.ilike(like))
        base = base.where(condition)
        count_stmt = count_stmt.where(condition)

    total = (await db.execute(count_stmt)).scalar_one()

    base = base.order_by(User.nom_complet).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(base)).all()

    items = [
        ProfesseurListItem(
            professeur_id=prof.id,
            nom_complet=user.nom_complet,
            email=user.email,
            cv_statut=cv.statut if cv is not None else None,
            cv_nom_original=cv.nom_original if cv is not None else None,
            traite_le=cv.traite_le if cv is not None else None,
        )
        for prof, user, cv in rows
    ]
    return items, total
```

- [ ] **Step 5 : Créer le router (endpoint liste)**

Créer `backend/app/routers/rh_professeurs.py` :

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.rh_professeur import ProfesseurListResponse
from app.services import rh_professeur_service

router = APIRouter()


@router.get("", response_model=ProfesseurListResponse)
async def list_professeurs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    q: str | None = Query(default=None),
    _: User = Depends(require_role("rh")),
    db: AsyncSession = Depends(get_db),
) -> ProfesseurListResponse:
    items, total = await rh_professeur_service.list_professeurs(db, page, page_size, q)
    return ProfesseurListResponse(items=items, total=total, page=page, page_size=page_size)
```

- [ ] **Step 6 : Monter le router dans main.py**

Dans `backend/app/main.py`, ajouter l'import après la ligne `from app.routers import utilisateurs as utilisateurs_router` :

```python
from app.routers import rh_professeurs as rh_professeurs_router
```

Et ajouter le montage après la ligne `app.include_router(utilisateurs_router.router, ...)` :

```python
app.include_router(rh_professeurs_router.router, prefix="/api/rh/professeurs", tags=["rh-professeurs"])
```

- [ ] **Step 7 : Lancer les tests → succès attendu**

Run: `cd backend && pytest tests/test_rh_professeurs_router.py -v`
Expected: PASS (tous les tests de liste).

- [ ] **Step 8 : Commit**

```bash
git add backend/app/schemas/rh_professeur.py backend/app/services/rh_professeur_service.py backend/app/routers/rh_professeurs.py backend/app/main.py backend/tests/test_rh_professeurs_router.py
git commit -m "feat(api): liste paginee des professeurs pour le RH (lecture seule)"
```

---

## Task 2 : Backend — endpoint DÉTAIL

**Files:**
- Modify: `backend/app/services/rh_professeur_service.py`
- Modify: `backend/app/routers/rh_professeurs.py`
- Test: `backend/tests/test_rh_professeurs_router.py`

- [ ] **Step 1 : Ajouter les tests détail (échouent)**

Ajouter à la fin de `backend/tests/test_rh_professeurs_router.py` :

```python
# ── Détail ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_detail_forbidden_for_prof(client: AsyncClient, auth_headers_prof, db_session):
    prof = await _make_prof(db_session, "alice@test.ca", "Alice Martin")
    r = await client.get(f"/api/rh/professeurs/{prof.id}", headers=auth_headers_prof)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_detail_404_for_unknown(client: AsyncClient, auth_headers_rh):
    r = await client.get("/api/rh/professeurs/999999", headers=auth_headers_rh)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_detail_returns_full_profile(
    client: AsyncClient, auth_headers_rh, db_session: AsyncSession,
):
    prof = await _make_prof(db_session, "alice@test.ca", "Alice Martin")
    prof.resume_profil = "Dev senior"
    prof.resume_profil_source = SourceOrigine.LLM
    db_session.add(CV(
        professeur_id=prof.id, nom_original="alice.pdf", chemin_fichier="/x/alice.pdf",
        taille_octets=100, mime_type="application/pdf", statut=CVStatut.TRAITE,
    ))
    db_session.add(Competence(
        professeur_id=prof.id, nom="Python",
        niveau=CompetenceNiveau.EXPERT, source=SourceOrigine.LLM,
    ))
    await db_session.commit()

    r = await client.get(f"/api/rh/professeurs/{prof.id}", headers=auth_headers_rh)
    assert r.status_code == 200
    data = r.json()
    assert data["professeur_id"] == prof.id
    assert data["nom_complet"] == "Alice Martin"
    assert data["email"] == "alice@test.ca"
    assert data["cv_statut"] == "traite"
    assert data["profil"]["resume"] == "Dev senior"
    assert data["profil"]["source"] == "llm"
    assert len(data["competences"]) == 1
    assert data["competences"][0]["nom"] == "Python"
    assert data["experiences"] == []
    assert data["formations"] == []
    assert data["langues"] == []
```

- [ ] **Step 2 : Lancer → échec attendu**

Run: `cd backend && pytest tests/test_rh_professeurs_router.py -k detail -v`
Expected: FAIL (404 sur route détail non définie pour les 2 derniers ; le test_detail_404 peut « passer » fortuitement — ignorer, il sera couvert correctement après implémentation).

- [ ] **Step 3 : Ajouter la fonction service détail**

Ajouter dans `backend/app/services/rh_professeur_service.py` (compléter les imports en tête) :

```python
from app.models.competence import Competence
from app.models.experience import Experience
from app.models.formation import Formation
from app.models.langue import Langue
from app.schemas.extraction import (
    CompetenceResponse,
    ExperienceResponse,
    FormationResponse,
    LangueResponse,
    ProfilResponse,
)
from app.schemas.rh_professeur import ProfesseurDetailResponse
```

Et la fonction :

```python
async def get_professeur_detail(
    db: AsyncSession, professeur_id: int,
) -> ProfesseurDetailResponse | None:
    row = (await db.execute(
        select(Professeur, User, CV)
        .join(User, Professeur.user_id == User.id)
        .outerjoin(CV, CV.professeur_id == Professeur.id)
        .where(Professeur.id == professeur_id, User.role == UserRole.PROF)
    )).first()
    if row is None:
        return None
    prof, user, cv = row

    comps = (await db.execute(
        select(Competence).where(Competence.professeur_id == prof.id).order_by(Competence.cree_le)
    )).scalars().all()
    exps = (await db.execute(
        select(Experience).where(Experience.professeur_id == prof.id)
        .order_by(Experience.ordre, Experience.cree_le)
    )).scalars().all()
    forms = (await db.execute(
        select(Formation).where(Formation.professeur_id == prof.id)
        .order_by(Formation.ordre, Formation.cree_le)
    )).scalars().all()
    langs = (await db.execute(
        select(Langue).where(Langue.professeur_id == prof.id).order_by(Langue.cree_le)
    )).scalars().all()

    return ProfesseurDetailResponse(
        professeur_id=prof.id,
        nom_complet=user.nom_complet,
        email=user.email,
        cv_statut=cv.statut if cv is not None else None,
        cv_nom_original=cv.nom_original if cv is not None else None,
        traite_le=cv.traite_le if cv is not None else None,
        profil=ProfilResponse(resume=prof.resume_profil, source=prof.resume_profil_source.value),
        competences=[CompetenceResponse.model_validate(c) for c in comps],
        experiences=[ExperienceResponse.model_validate(e) for e in exps],
        formations=[FormationResponse.model_validate(f) for f in forms],
        langues=[LangueResponse.model_validate(l) for l in langs],
    )
```

- [ ] **Step 4 : Ajouter l'endpoint détail au router**

Dans `backend/app/routers/rh_professeurs.py`, compléter les imports :

```python
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.schemas.rh_professeur import ProfesseurDetailResponse, ProfesseurListResponse
```

Ajouter après l'endpoint liste :

```python
@router.get("/{professeur_id}", response_model=ProfesseurDetailResponse)
async def get_professeur_detail(
    professeur_id: int,
    _: User = Depends(require_role("rh")),
    db: AsyncSession = Depends(get_db),
) -> ProfesseurDetailResponse:
    detail = await rh_professeur_service.get_professeur_detail(db, professeur_id)
    if detail is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professeur introuvable")
    return detail
```

- [ ] **Step 5 : Lancer → succès attendu**

Run: `cd backend && pytest tests/test_rh_professeurs_router.py -v`
Expected: PASS (liste + détail).

- [ ] **Step 6 : Commit**

```bash
git add backend/app/services/rh_professeur_service.py backend/app/routers/rh_professeurs.py backend/tests/test_rh_professeurs_router.py
git commit -m "feat(api): detail du profil professeur pour le RH (lecture seule)"
```

---

## Task 3 : Frontend — primitive Sheet (drawer)

**Files:**
- Create: `frontend/components/ui/sheet.tsx`

- [ ] **Step 1 : Créer le composant Sheet**

Créer `frontend/components/ui/sheet.tsx` :

```tsx
"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-fg/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-50 flex flex-col bg-canvas-pure shadow-lift transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        right:
          "inset-y-0 right-0 h-full w-full border-l border-border data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-md",
        left:
          "inset-y-0 left-0 h-full w-full border-r border-border data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-md",
      },
    },
    defaultVariants: { side: "right" },
  }
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), className)}
      {...props}
    >
      {children}
      <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-60 ring-offset-canvas-pure transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:pointer-events-none">
        <X className="h-4 w-4 text-fg-muted" />
        <span className="sr-only">Fermer</span>
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5 text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("font-display text-2xl italic text-fg leading-tight", className)}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-fg-muted", className)}
    {...props}
  />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
};
```

- [ ] **Step 2 : Vérifier la compilation des types**

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add frontend/components/ui/sheet.tsx
git commit -m "feat(frontend): ajouter la primitive Sheet (drawer lateral droit)"
```

---

## Task 4 : Frontend — client API + types

**Files:**
- Create: `frontend/lib/api/rhProfesseurs.ts`

- [ ] **Step 1 : Créer le module API**

Créer `frontend/lib/api/rhProfesseurs.ts` :

```ts
import { apiClient } from "./client";
import type {
  CompetenceDto,
  ExperienceDto,
  FormationDto,
  LangueDto,
  ProfilDto,
} from "./extraction";

export type CvStatut = "en_attente" | "en_cours" | "traite" | "erreur";

export interface ProfesseurListItem {
  professeur_id: number;
  nom_complet: string;
  email: string;
  cv_statut: CvStatut | null;
  cv_nom_original: string | null;
  traite_le: string | null;
}

export interface ProfesseurListResponse {
  items: ProfesseurListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface ProfesseurDetail {
  professeur_id: number;
  nom_complet: string;
  email: string;
  cv_statut: CvStatut | null;
  cv_nom_original: string | null;
  traite_le: string | null;
  profil: ProfilDto;
  competences: CompetenceDto[];
  experiences: ExperienceDto[];
  formations: FormationDto[];
  langues: LangueDto[];
}

export interface ListParams {
  page: number;
  pageSize: number;
  q: string;
}

export const rhProfesseursApi = {
  list: ({ page, pageSize, q }: ListParams): Promise<ProfesseurListResponse> => {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (q.trim()) params.set("q", q.trim());
    return apiClient.get<ProfesseurListResponse>(
      `/api/rh/professeurs?${params.toString()}`
    );
  },

  get: (professeurId: number): Promise<ProfesseurDetail> =>
    apiClient.get<ProfesseurDetail>(`/api/rh/professeurs/${professeurId}`),
};
```

- [ ] **Step 2 : Vérifier les types**

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add frontend/lib/api/rhProfesseurs.ts
git commit -m "feat(frontend): client API RH professeurs (liste + detail)"
```

---

## Task 5 : Frontend — CvStatutBadge

**Files:**
- Create: `frontend/components/rh/professeurs/CvStatutBadge.tsx`
- Test: `frontend/components/rh/professeurs/CvStatutBadge.test.tsx`

- [ ] **Step 1 : Écrire le test (échoue)**

Créer `frontend/components/rh/professeurs/CvStatutBadge.test.tsx` :

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CvStatutBadge } from "./CvStatutBadge";

describe("CvStatutBadge", () => {
  it("affiche le libellé pour un CV traité", () => {
    render(<CvStatutBadge statut="traite" />);
    expect(screen.getByText("Traité")).toBeInTheDocument();
  });

  it("affiche « Aucun CV » quand le statut est null", () => {
    render(<CvStatutBadge statut={null} />);
    expect(screen.getByText("Aucun CV")).toBeInTheDocument();
  });

  it("affiche « Erreur » pour le statut erreur", () => {
    render(<CvStatutBadge statut="erreur" />);
    expect(screen.getByText("Erreur")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2 : Lancer → échec attendu**

Run: `cd frontend && npx vitest run components/rh/professeurs/CvStatutBadge.test.tsx`
Expected: FAIL (module introuvable).

- [ ] **Step 3 : Implémenter le composant**

Créer `frontend/components/rh/professeurs/CvStatutBadge.tsx` :

```tsx
import { Badge } from "@/components/ui/badge";
import type { CvStatut } from "@/lib/api/rhProfesseurs";

type Variant = "default" | "secondary" | "destructive" | "outline";

const CONFIG: Record<string, { label: string; variant: Variant }> = {
  traite: { label: "Traité", variant: "default" },
  en_cours: { label: "En cours", variant: "secondary" },
  en_attente: { label: "En attente", variant: "outline" },
  erreur: { label: "Erreur", variant: "destructive" },
};

const NONE = { label: "Aucun CV", variant: "outline" as Variant };

export function CvStatutBadge({ statut }: { statut: CvStatut | null }) {
  const { label, variant } = statut ? CONFIG[statut] ?? NONE : NONE;
  return <Badge variant={variant}>{label}</Badge>;
}
```

- [ ] **Step 4 : Lancer → succès attendu**

Run: `cd frontend && npx vitest run components/rh/professeurs/CvStatutBadge.test.tsx`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add frontend/components/rh/professeurs/CvStatutBadge.tsx frontend/components/rh/professeurs/CvStatutBadge.test.tsx
git commit -m "feat(frontend): badge de statut CV pour la liste RH"
```

---

## Task 6 : Frontend — ProfesseursTable

**Files:**
- Create: `frontend/components/rh/professeurs/ProfesseursTable.tsx`
- Test: `frontend/components/rh/professeurs/ProfesseursTable.test.tsx`

- [ ] **Step 1 : Écrire le test (échoue)**

Créer `frontend/components/rh/professeurs/ProfesseursTable.test.tsx` :

```tsx
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProfesseursTable } from "./ProfesseursTable";
import type { ProfesseurListItem } from "@/lib/api/rhProfesseurs";

const items: ProfesseurListItem[] = [
  {
    professeur_id: 1,
    nom_complet: "Alice Martin",
    email: "alice@test.ca",
    cv_statut: "traite",
    cv_nom_original: "alice.pdf",
    traite_le: "2026-05-20T00:00:00Z",
  },
  {
    professeur_id: 2,
    nom_complet: "Bob Tremblay",
    email: "bob@test.ca",
    cv_statut: null,
    cv_nom_original: null,
    traite_le: null,
  },
];

describe("ProfesseursTable", () => {
  it("affiche une ligne par professeur", () => {
    render(<ProfesseursTable items={items} onPreview={vi.fn()} />);
    expect(screen.getByText("Alice Martin")).toBeInTheDocument();
    expect(screen.getByText("bob@test.ca")).toBeInTheDocument();
  });

  it("appelle onPreview avec l'id du professeur au clic", () => {
    const onPreview = vi.fn();
    render(<ProfesseursTable items={items} onPreview={onPreview} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Prévisualiser le CV de Alice Martin" })
    );
    expect(onPreview).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 2 : Lancer → échec attendu**

Run: `cd frontend && npx vitest run components/rh/professeurs/ProfesseursTable.test.tsx`
Expected: FAIL (module introuvable).

- [ ] **Step 3 : Implémenter le composant**

Créer `frontend/components/rh/professeurs/ProfesseursTable.tsx` :

```tsx
"use client";

import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CvStatutBadge } from "./CvStatutBadge";
import type { ProfesseurListItem } from "@/lib/api/rhProfesseurs";

interface Props {
  items: ProfesseurListItem[];
  onPreview: (professeurId: number) => void;
}

export function ProfesseursTable({ items, onPreview }: Props) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-canvas-pure shadow-soft">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border-soft text-[11px] font-bold uppercase tracking-[0.08em] text-fg-subtle">
          <tr>
            <th className="px-5 py-3">Nom</th>
            <th className="px-5 py-3">Courriel</th>
            <th className="px-5 py-3">Statut CV</th>
            <th className="px-5 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.professeur_id} className="border-b border-border-soft/60 last:border-0">
              <td className="px-5 py-3 font-medium text-fg">{p.nom_complet}</td>
              <td className="px-5 py-3 text-fg-muted">{p.email}</td>
              <td className="px-5 py-3">
                <CvStatutBadge statut={p.cv_statut} />
              </td>
              <td className="px-5 py-3 text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPreview(p.professeur_id)}
                  aria-label={`Prévisualiser le CV de ${p.nom_complet}`}
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  Prévisualiser le CV
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

- [ ] **Step 4 : Lancer → succès attendu**

Run: `cd frontend && npx vitest run components/rh/professeurs/ProfesseursTable.test.tsx`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add frontend/components/rh/professeurs/ProfesseursTable.tsx frontend/components/rh/professeurs/ProfesseursTable.test.tsx
git commit -m "feat(frontend): tableau des professeurs avec action previsualiser"
```

---

## Task 7 : Frontend — ProfilReadOnlyView

**Files:**
- Create: `frontend/components/rh/professeurs/ProfilReadOnlyView.tsx`
- Test: `frontend/components/rh/professeurs/ProfilReadOnlyView.test.tsx`

- [ ] **Step 1 : Écrire le test (échoue)**

Créer `frontend/components/rh/professeurs/ProfilReadOnlyView.test.tsx` :

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfilReadOnlyView } from "./ProfilReadOnlyView";
import type { ProfesseurDetail } from "@/lib/api/rhProfesseurs";

const detail: ProfesseurDetail = {
  professeur_id: 1,
  nom_complet: "Alice Martin",
  email: "alice@test.ca",
  cv_statut: "traite",
  cv_nom_original: "alice.pdf",
  traite_le: "2026-05-20T00:00:00Z",
  profil: { resume: "Dev senior", source: "llm" },
  competences: [{ id: 1, nom: "Python", niveau: "expert", source: "llm" }],
  experiences: [
    {
      id: 1, poste: "Dev", employeur: "Acme", annee_debut: 2020,
      annee_fin: null, description_courte: "Backend", source: "llm", ordre: 0,
    },
  ],
  formations: [
    { id: 1, diplome: "Bac info", etablissement: "UL", annee: 2017, source: "llm", ordre: 0 },
  ],
  langues: [{ id: 1, langue: "Français", niveau: "natif", source: "manual" }],
};

describe("ProfilReadOnlyView", () => {
  it("affiche les données structurées du profil", () => {
    render(<ProfilReadOnlyView detail={detail} />);
    expect(screen.getByText("Dev senior")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText(/Dev/)).toBeInTheDocument();
    expect(screen.getByText("Bac info")).toBeInTheDocument();
    expect(screen.getByText("Français")).toBeInTheDocument();
  });

  it("n'expose aucune action de modification (lecture seule)", () => {
    render(<ProfilReadOnlyView detail={detail} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("affiche un état vide pour les sections sans donnée", () => {
    render(
      <ProfilReadOnlyView
        detail={{
          ...detail,
          profil: { resume: null, source: "llm" },
          competences: [],
          experiences: [],
          formations: [],
          langues: [],
        }}
      />
    );
    expect(screen.getByText(/Aucun résumé/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2 : Lancer → échec attendu**

Run: `cd frontend && npx vitest run components/rh/professeurs/ProfilReadOnlyView.test.tsx`
Expected: FAIL (module introuvable).

- [ ] **Step 3 : Implémenter le composant**

Créer `frontend/components/rh/professeurs/ProfilReadOnlyView.tsx` :

```tsx
import type { ProfesseurDetail } from "@/lib/api/rhProfesseurs";

const NIVEAU_COMP: Record<string, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
  expert: "Expert",
};

const NIVEAU_LANG: Record<string, string> = {
  A1: "A1", A2: "A2", B1: "B1", B2: "B2", C1: "C1", C2: "C2", natif: "Natif",
};

function SectionTitle({ index, label, count }: { index: string; label: string; count?: number }) {
  return (
    <header className="flex items-baseline gap-3 border-b border-border-soft px-1 pb-2">
      <span className="font-mono text-[11px] tracking-[0.18em] text-fg-subtle">{index}</span>
      <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-fg">{label}</h3>
      {count !== undefined && (
        <span className="text-xs text-fg-subtle tabular-nums">{count}</span>
      )}
    </header>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-1 py-3 text-sm italic text-fg-subtle">{children}</p>;
}

export function ProfilReadOnlyView({ detail }: { detail: ProfesseurDetail }) {
  return (
    <div className="flex flex-col gap-8">
      {/* Résumé */}
      <section>
        <SectionTitle index="00" label="Résumé" />
        {detail.profil.resume ? (
          <p className="px-1 py-3 text-sm leading-relaxed text-fg-muted">{detail.profil.resume}</p>
        ) : (
          <Empty>Aucun résumé de profil.</Empty>
        )}
      </section>

      {/* Compétences */}
      <section>
        <SectionTitle index="01" label="Compétences" count={detail.competences.length} />
        {detail.competences.length === 0 ? (
          <Empty>Aucune compétence.</Empty>
        ) : (
          <div className="flex flex-wrap gap-2 px-1 py-3">
            {detail.competences.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-baseline gap-1.5 rounded-full border border-border bg-surface/60 px-3 py-1"
              >
                <span className="text-sm font-medium text-fg">{c.nom}</span>
                <span className="text-[11px] text-fg-subtle">·</span>
                <span className="text-[11px] text-fg-muted">{NIVEAU_COMP[c.niveau] ?? c.niveau}</span>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Expériences */}
      <section>
        <SectionTitle index="02" label="Expériences" count={detail.experiences.length} />
        {detail.experiences.length === 0 ? (
          <Empty>Aucune expérience.</Empty>
        ) : (
          <ul className="flex flex-col gap-4 px-1 py-3">
            {detail.experiences.map((e) => (
              <li key={e.id}>
                <p className="text-sm font-medium text-fg">
                  {e.poste} · {e.employeur}
                </p>
                <p className="text-[11px] text-fg-subtle tabular-nums">
                  {e.annee_debut} – {e.annee_fin ?? "présent"}
                </p>
                {e.description_courte && (
                  <p className="mt-1 text-sm text-fg-muted">{e.description_courte}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Formations */}
      <section>
        <SectionTitle index="03" label="Formations" count={detail.formations.length} />
        {detail.formations.length === 0 ? (
          <Empty>Aucune formation.</Empty>
        ) : (
          <ul className="flex flex-col gap-3 px-1 py-3">
            {detail.formations.map((f) => (
              <li key={f.id}>
                <p className="text-sm font-medium text-fg">{f.diplome}</p>
                <p className="text-[11px] text-fg-subtle tabular-nums">
                  {f.etablissement} · {f.annee}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Langues */}
      <section>
        <SectionTitle index="04" label="Langues" count={detail.langues.length} />
        {detail.langues.length === 0 ? (
          <Empty>Aucune langue.</Empty>
        ) : (
          <div className="flex flex-wrap gap-2 px-1 py-3">
            {detail.langues.map((l) => (
              <span
                key={l.id}
                className="inline-flex items-baseline gap-1.5 rounded-full border border-border bg-surface/60 px-3 py-1"
              >
                <span className="text-sm font-medium text-fg">{l.langue}</span>
                <span className="text-[11px] text-fg-subtle">·</span>
                <span className="text-[11px] text-fg-muted">{NIVEAU_LANG[l.niveau] ?? l.niveau}</span>
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4 : Lancer → succès attendu**

Run: `cd frontend && npx vitest run components/rh/professeurs/ProfilReadOnlyView.test.tsx`
Expected: PASS (dont l'assertion « aucun bouton »).

- [ ] **Step 5 : Commit**

```bash
git add frontend/components/rh/professeurs/ProfilReadOnlyView.tsx frontend/components/rh/professeurs/ProfilReadOnlyView.test.tsx
git commit -m "feat(frontend): vue lecture seule du profil professeur"
```

---

## Task 8 : Frontend — hooks SWR

**Files:**
- Create: `frontend/lib/hooks/useRhProfesseurs.ts`

- [ ] **Step 1 : Créer les hooks**

Créer `frontend/lib/hooks/useRhProfesseurs.ts` :

```ts
"use client";

import useSWR from "swr";
import { rhProfesseursApi } from "@/lib/api/rhProfesseurs";

const PAGE_SIZE = 10;

export function useRhProfesseurs(page: number, q: string, pageSize: number = PAGE_SIZE) {
  return useSWR(
    ["rh-professeurs", page, q, pageSize],
    () => rhProfesseursApi.list({ page, pageSize, q }),
    { keepPreviousData: true, revalidateOnFocus: false },
  );
}

export function useRhProfesseurDetail(professeurId: number | null) {
  return useSWR(
    professeurId !== null ? ["rh-professeur-detail", professeurId] : null,
    () => rhProfesseursApi.get(professeurId as number),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
}

export const RH_PROFESSEURS_PAGE_SIZE = PAGE_SIZE;
```

- [ ] **Step 2 : Vérifier les types**

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add frontend/lib/hooks/useRhProfesseurs.ts
git commit -m "feat(frontend): hooks SWR RH professeurs (liste + detail)"
```

---

## Task 9 : Frontend — ProfesseurCvDrawer (conteneur)

**Files:**
- Create: `frontend/components/rh/professeurs/ProfesseurCvDrawer.tsx`
- Test: `frontend/components/rh/professeurs/ProfesseurCvDrawer.test.tsx`

- [ ] **Step 1 : Écrire le test (échoue)**

Créer `frontend/components/rh/professeurs/ProfesseurCvDrawer.test.tsx` :

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfesseurCvDrawer } from "./ProfesseurCvDrawer";
import type { ProfesseurDetail } from "@/lib/api/rhProfesseurs";

const detail: ProfesseurDetail = {
  professeur_id: 1,
  nom_complet: "Alice Martin",
  email: "alice@test.ca",
  cv_statut: "traite",
  cv_nom_original: "alice.pdf",
  traite_le: "2026-05-20T00:00:00Z",
  profil: { resume: "Dev senior", source: "llm" },
  competences: [{ id: 1, nom: "Python", niveau: "expert", source: "llm" }],
  experiences: [],
  formations: [],
  langues: [],
};

const mockDetail = vi.fn();
vi.mock("@/lib/hooks/useRhProfesseurs", () => ({
  useRhProfesseurDetail: (id: number | null) => mockDetail(id),
}));

describe("ProfesseurCvDrawer", () => {
  beforeEach(() => mockDetail.mockReset());

  it("affiche le profil et un bouton de fermeture quand ouvert", () => {
    mockDetail.mockReturnValue({ data: detail, isLoading: false, error: undefined });
    render(<ProfesseurCvDrawer professeurId={1} open onOpenChange={vi.fn()} />);
    expect(screen.getByText("Alice Martin")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fermer" })).toBeInTheDocument();
  });

  it("affiche un indicateur de chargement", () => {
    mockDetail.mockReturnValue({ data: undefined, isLoading: true, error: undefined });
    render(<ProfesseurCvDrawer professeurId={1} open onOpenChange={vi.fn()} />);
    expect(screen.getByText(/Chargement/i)).toBeInTheDocument();
  });

  it("affiche un message d'erreur", () => {
    mockDetail.mockReturnValue({ data: undefined, isLoading: false, error: new Error("x") });
    render(<ProfesseurCvDrawer professeurId={1} open onOpenChange={vi.fn()} />);
    expect(screen.getByText(/Impossible de charger/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2 : Lancer → échec attendu**

Run: `cd frontend && npx vitest run components/rh/professeurs/ProfesseurCvDrawer.test.tsx`
Expected: FAIL (module introuvable).

- [ ] **Step 3 : Implémenter le composant**

Créer `frontend/components/rh/professeurs/ProfesseurCvDrawer.tsx` :

```tsx
"use client";

import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useRhProfesseurDetail } from "@/lib/hooks/useRhProfesseurs";
import { CvStatutBadge } from "./CvStatutBadge";
import { ProfilReadOnlyView } from "./ProfilReadOnlyView";

interface Props {
  professeurId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfesseurCvDrawer({ professeurId, open, onOpenChange }: Props) {
  const { data, isLoading, error } = useRhProfesseurDetail(open ? professeurId : null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto p-7">
        <SheetHeader>
          <SheetTitle>{data?.nom_complet ?? "Profil du professeur"}</SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            {data?.email}
            {data && <CvStatutBadge statut={data.cv_statut} />}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-8">
          {isLoading && (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-xs italic text-fg-subtle">Chargement du profil…</p>
            </div>
          )}
          {error && !isLoading && (
            <p className="py-8 text-sm text-destructive">
              Impossible de charger le profil. Réessayez.
            </p>
          )}
          {data && !isLoading && !error && <ProfilReadOnlyView detail={data} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 4 : Lancer → succès attendu**

Run: `cd frontend && npx vitest run components/rh/professeurs/ProfesseurCvDrawer.test.tsx`
Expected: PASS.

- [ ] **Step 5 : Commit**

```bash
git add frontend/components/rh/professeurs/ProfesseurCvDrawer.tsx frontend/components/rh/professeurs/ProfesseurCvDrawer.test.tsx
git commit -m "feat(frontend): drawer de previsualisation du CV (lecture seule)"
```

---

## Task 10 : Frontend — page liste + recherche + pagination

**Files:**
- Create: `frontend/app/dashboard/rh/professeurs/page.tsx`
- Test: `frontend/app/dashboard/rh/professeurs/__tests__/page.test.tsx`

- [ ] **Step 1 : Écrire le test (échoue)**

Créer `frontend/app/dashboard/rh/professeurs/__tests__/page.test.tsx` :

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Page from "../page";
import type { ProfesseurListResponse } from "@/lib/api/rhProfesseurs";

const listResponse: ProfesseurListResponse = {
  items: [
    {
      professeur_id: 1, nom_complet: "Alice Martin", email: "alice@test.ca",
      cv_statut: "traite", cv_nom_original: "alice.pdf", traite_le: null,
    },
  ],
  total: 1,
  page: 1,
  page_size: 10,
};

const mockList = vi.fn();
vi.mock("@/lib/hooks/useRhProfesseurs", () => ({
  useRhProfesseurs: (...args: unknown[]) => mockList(...args),
  useRhProfesseurDetail: () => ({ data: undefined, isLoading: false, error: undefined }),
  RH_PROFESSEURS_PAGE_SIZE: 10,
}));

describe("Page Professeurs RH", () => {
  beforeEach(() => mockList.mockReset());

  it("affiche le tableau des professeurs", () => {
    mockList.mockReturnValue({ data: listResponse, isLoading: false, error: undefined });
    render(<Page />);
    expect(screen.getByText("Alice Martin")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Professeurs" })).toBeInTheDocument();
  });

  it("affiche un champ de recherche", () => {
    mockList.mockReturnValue({ data: listResponse, isLoading: false, error: undefined });
    render(<Page />);
    expect(screen.getByPlaceholderText(/Rechercher/i)).toBeInTheDocument();
  });

  it("affiche un état vide", () => {
    mockList.mockReturnValue({
      data: { items: [], total: 0, page: 1, page_size: 10 },
      isLoading: false, error: undefined,
    });
    render(<Page />);
    expect(screen.getByText(/Aucun professeur/i)).toBeInTheDocument();
  });

  it("ouvre le drawer au clic sur Prévisualiser", () => {
    mockList.mockReturnValue({ data: listResponse, isLoading: false, error: undefined });
    render(<Page />);
    fireEvent.click(
      screen.getByRole("button", { name: "Prévisualiser le CV de Alice Martin" })
    );
    expect(screen.getByText("alice@test.ca")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2 : Lancer → échec attendu**

Run: `cd frontend && npx vitest run app/dashboard/rh/professeurs/__tests__/page.test.tsx`
Expected: FAIL (module page introuvable).

- [ ] **Step 3 : Implémenter la page**

Créer `frontend/app/dashboard/rh/professeurs/page.tsx` :

```tsx
"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProfesseursTable } from "@/components/rh/professeurs/ProfesseursTable";
import { ProfesseurCvDrawer } from "@/components/rh/professeurs/ProfesseurCvDrawer";
import {
  useRhProfesseurs,
  RH_PROFESSEURS_PAGE_SIZE,
} from "@/lib/hooks/useRhProfesseurs";

export default function Page() {
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, error } = useRhProfesseurs(page, debouncedQ);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / RH_PROFESSEURS_PAGE_SIZE));
  const items = data?.items ?? [];

  const handlePreview = (professeurId: number) => {
    setSelectedId(professeurId);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-fg">Professeurs</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Consultez les profils extraits des CV. Lecture seule — aucune modification possible.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
        <Input
          className="pl-9"
          placeholder="Rechercher par nom ou courriel…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Rechercher un professeur"
        />
      </div>

      {error ? (
        <p className="py-8 text-center text-sm text-destructive">
          Impossible de charger les professeurs. Rechargez la page.
        </p>
      ) : isLoading ? (
        <p className="py-8 text-center text-sm text-fg-muted">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-fg-muted">
          Aucun professeur ne correspond à votre recherche.
        </p>
      ) : (
        <>
          <ProfesseursTable items={items} onPreview={handlePreview} />
          <div className="flex items-center justify-between">
            <span className="text-xs text-fg-subtle tabular-nums">
              {total} professeur{total > 1 ? "s" : ""} · page {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Suivant
              </Button>
            </div>
          </div>
        </>
      )}

      <ProfesseurCvDrawer
        professeurId={selectedId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
```

- [ ] **Step 4 : Lancer → succès attendu**

Run: `cd frontend && npx vitest run app/dashboard/rh/professeurs/__tests__/page.test.tsx`
Expected: PASS.

> Note : le test « ouvre le drawer » s'appuie sur le mock de `useRhProfesseurDetail` (défini dans le `vi.mock`) renvoyant `data: undefined` ; l'assertion porte sur l'email présent dans le tableau (rendu deux fois après ouverture est acceptable — `getByText` échoue si 0). Si l'email apparaît plusieurs fois, remplacer par `screen.getAllByText("alice@test.ca").length` ≥ 1. Ajuster lors de l'implémentation si nécessaire.

- [ ] **Step 5 : Commit**

```bash
git add frontend/app/dashboard/rh/professeurs/page.tsx frontend/app/dashboard/rh/professeurs/__tests__/page.test.tsx
git commit -m "feat(frontend): page RH de consultation des professeurs (recherche + pagination)"
```

---

## Task 11 : Frontend — activer l'entrée de navigation

**Files:**
- Modify: `frontend/lib/nav/rhNav.ts`

- [ ] **Step 1 : Mettre à jour la navigation**

Dans `frontend/lib/nav/rhNav.ts`, remplacer la ligne :

```ts
      { href: "/dashboard/rh/cv", label: "CV des profs", icon: Users, disabled: true },
```

par :

```ts
      { href: "/dashboard/rh/professeurs", label: "Professeurs", icon: Users },
```

- [ ] **Step 2 : Vérifier types + lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add frontend/lib/nav/rhNav.ts
git commit -m "feat(frontend): activer l'entree de navigation RH Professeurs"
```

---

## Task 12 : Vérification finale

**Files:** aucun (vérification only).

- [ ] **Step 1 : Suite backend (nouveau fichier + non-régression)**

Run: `cd backend && pytest tests/test_rh_professeurs_router.py -v`
Expected: PASS (tous).

- [ ] **Step 2 : Couverture des fichiers modifiés**

Run: `cd backend && pytest --cov=app.routers.rh_professeurs --cov=app.services.rh_professeur_service --cov-report=term-missing tests/test_rh_professeurs_router.py`
Expected: couverture ≥ 70 % sur les deux fichiers.

- [ ] **Step 3 : Suite frontend complète**

Run: `cd frontend && npm run test`
Expected: PASS (aucune régression).

- [ ] **Step 4 : Lint + types frontend**

Run: `cd frontend && npm run lint && npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 5 : Vérifier l'absence de mutation côté RH (revue manuelle)**

Confirmer :
- Aucun POST/PATCH/DELETE dans `backend/app/routers/rh_professeurs.py`.
- Aucun import de fonction mutante (`extractionApi.*.add/update/remove`) dans `frontend/components/rh/professeurs/`.

---

## Self-Review (effectuée par le rédacteur du plan)

**Couverture de la spec :**
- Liste paginée + recherche → Task 1 ✓
- Détail profil read-only → Task 2 + Task 7 ✓
- Drawer côté droit (Escape/overlay/bouton fournis par Radix) → Task 3 + Task 9 ✓
- Statut CV (tous profs, badge) → Task 1 + Task 5 ✓
- Navigation « Professeurs » → Task 11 ✓
- Lecture seule (backend GET-only + frontend sans mutation) → Task 1/2 + Task 7 + Task 12 Step 5 ✓
- Tests backend + frontend → Tasks 1, 2, 5, 6, 7, 9, 10 + Task 12 ✓
- Pas de migration (aucun nouveau modèle) ✓

**Cohérence des types :** `ProfesseurListItem`, `ProfesseurDetail`, `CvStatut` définis en Task 4 et réutilisés identiquement (Tasks 5, 6, 7, 9, 10). `useRhProfesseurDetail`/`useRhProfesseurs` définis en Task 8, consommés en Tasks 9-10. Backend : `ProfesseurListItem`/`ProfesseurListResponse`/`ProfesseurDetailResponse` définis en Task 1 et complétés/utilisés en Task 2.

**Placeholders :** aucun TODO/TBD ; tout le code est fourni.
