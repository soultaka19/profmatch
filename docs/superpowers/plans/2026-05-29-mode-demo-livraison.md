# Mode démo & package de livraison — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre ProfMatch « clone-and-run » pour le jury (login immédiat, données de démo, récit XAI sans dépendre du LLM) et produire un package de livraison propre et sécurisé pour les Livrables 2 & 3.

**Architecture:** Un flag unique `DEMO_MODE` (défaut `false`) orchestre l'auto-création des 3 comptes au démarrage (lifespan FastAPI) et l'exposition d'endpoints admin de seed/reset gardés. La logique de seed est consolidée dans `services/demo_seed_service.py`, réutilisée par les scripts CLI existants, le lifespan et les endpoints. Les affectations de démo sont semées avec une justification `ENRICHIE` rédigée à la main → le récit XAI s'affiche sans appel LLM.

**Tech Stack:** FastAPI 3.12, SQLAlchemy 2.0 async, Pydantic Settings v2, pytest-asyncio, Next.js 16 + SWR + shadcn/ui, PowerShell (script de release Windows).

**Référence spec :** `docs/superpowers/specs/2026-05-29-mode-demo-livraison-design.md`

**Découpage :** Phase A (Tasks 1-4) = incontournable pour L2, autosuffisante. Phase B (Tasks 5-10) = données riches + panneau admin, bonus à forte valeur. Chaque phase produit un logiciel fonctionnel et testable.

**Comptes de démo (existants dans `scripts/seed_demo.py`, à conserver) :**
| Rôle | Email | Mot de passe |
|---|---|---|
| Prof | `prof@defi-lacite.ca` | `Prof@LaCite2026!` |
| RH | `rh@defi-lacite.ca` | `Rh@LaCite2026!` |
| Admin | `admin@defi-lacite.ca` | `Admin@LaCite2026!` |

> ⚠️ Le `README.md` actuel documente à tort `*@lacite.ca` / `demo1234`. Task 3 corrige cette incohérence.

---

## PHASE A — Clone-and-run (L2)

### Task 1: Flag `DEMO_MODE` dans la config + `/health`

**Files:**
- Modify: `backend/app/core/config.py`
- Modify: `backend/app/main.py` (endpoint `/health`)
- Modify: `backend/.env.example`
- Test: `backend/tests/test_health.py` (create)

- [ ] **Step 1: Écrire le test qui échoue**

Create `backend/tests/test_health.py`:

```python
"""Test de l'endpoint /health et de l'exposition du flag DEMO_MODE."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_expose_demo_mode(client: AsyncClient):
    r = await client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "demo_mode" in data
    assert isinstance(data["demo_mode"], bool)
```

- [ ] **Step 2: Lancer le test, vérifier l'échec**

Run: `cd backend && pytest tests/test_health.py -v`
Expected: FAIL — `KeyError: 'demo_mode'`.

- [ ] **Step 3: Ajouter le champ dans `config.py`**

Dans `backend/app/core/config.py`, après le bloc `# Frontend` et avant `settings = Settings()`, ajouter le champ dans la classe `Settings` :

```python
    # Mode démo : auto-bootstrap des comptes + panneau admin seed/reset.
    # TOUJOURS false hors démo (comptes à mot de passe connu = faille en prod).
    DEMO_MODE: bool = False
```

- [ ] **Step 4: Exposer le flag dans `/health`**

Dans `backend/app/main.py`, modifier l'endpoint health (ajouter l'import settings en haut si absent : `from app.core.config import settings`) :

```python
@app.get("/health", tags=["system"])
async def health() -> dict:
    return {
        "status": "ok",
        "service": "profmatch-api",
        "version": "0.1.0",
        "demo_mode": settings.DEMO_MODE,
    }
```

- [ ] **Step 5: Documenter dans `.env.example`**

Dans `backend/.env.example`, ajouter à la fin :

```env
# ──────────────────────────────
# Mode démo (jury) — false en prod
# ──────────────────────────────
DEMO_MODE=false
```

- [ ] **Step 6: Lancer le test, vérifier le succès**

Run: `cd backend && pytest tests/test_health.py -v`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/app/core/config.py backend/app/main.py backend/.env.example backend/tests/test_health.py
git commit --no-gpg-sign -m "feat(api): ajouter le flag DEMO_MODE et l'exposer via /health"
```

---

### Task 2: Service `ensure_demo_users` + bootstrap au démarrage (lifespan)

**Files:**
- Create: `backend/app/services/demo_seed_service.py`
- Modify: `backend/app/main.py` (ajout du lifespan)
- Modify: `backend/scripts/seed_demo.py` (réutiliser le service)
- Test: `backend/tests/test_demo_seed_service.py` (create)

- [ ] **Step 1: Écrire le test qui échoue**

Create `backend/tests/test_demo_seed_service.py`:

```python
"""Tests du service de seed démo (bootstrap des comptes)."""
import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.professeur import Professeur
from app.models.user import User, UserRole
from app.services.demo_seed_service import ensure_demo_users


@pytest.mark.asyncio
async def test_ensure_demo_users_cree_trois_comptes(db_session: AsyncSession):
    await ensure_demo_users(db_session)
    await db_session.commit()

    total = (await db_session.execute(select(func.count(User.id)))).scalar_one()
    assert total == 3

    roles = set(
        (await db_session.execute(select(User.role))).scalars().all()
    )
    assert roles == {UserRole.PROF, UserRole.RH, UserRole.ADMIN}


@pytest.mark.asyncio
async def test_ensure_demo_users_idempotent(db_session: AsyncSession):
    await ensure_demo_users(db_session)
    await db_session.commit()
    await ensure_demo_users(db_session)
    await db_session.commit()

    total = (await db_session.execute(select(func.count(User.id)))).scalar_one()
    assert total == 3


@pytest.mark.asyncio
async def test_ensure_demo_users_cree_la_ligne_professeur(db_session: AsyncSession):
    await ensure_demo_users(db_session)
    await db_session.commit()

    prof_count = (await db_session.execute(select(func.count(Professeur.id)))).scalar_one()
    assert prof_count == 1  # le listener after_insert crée la ligne pour le compte prof
```

- [ ] **Step 2: Lancer le test, vérifier l'échec**

Run: `cd backend && pytest tests/test_demo_seed_service.py -v`
Expected: FAIL — `ModuleNotFoundError: app.services.demo_seed_service`.

- [ ] **Step 3: Créer le service**

Create `backend/app/services/demo_seed_service.py`:

```python
"""Service de seed pour le mode démo.

Source unique de la logique de bootstrap, réutilisée par :
- les scripts CLI (`scripts/seed_demo.py`),
- le lifespan FastAPI (auto-bootstrap au démarrage si DEMO_MODE),
- les endpoints admin de seed/reset (Phase B).

Tout est idempotent : aucun doublon, aucun crash au redémarrage.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
# Import nécessaire pour enregistrer le listener after_insert qui crée la
# ligne Professeur quand on insère un User de rôle PROF.
from app.models.professeur import Professeur  # noqa: F401
from app.models.user import User, UserRole

DEMO_USERS = [
    {
        "email": "prof@defi-lacite.ca",
        "password": "Prof@LaCite2026!",
        "role": UserRole.PROF,
        "nom_complet": "Jean Tremblay",
    },
    {
        "email": "rh@defi-lacite.ca",
        "password": "Rh@LaCite2026!",
        "role": UserRole.RH,
        "nom_complet": "Marie Dubois",
    },
    {
        "email": "admin@defi-lacite.ca",
        "password": "Admin@LaCite2026!",
        "role": UserRole.ADMIN,
        "nom_complet": "Alex Martin",
    },
]


async def ensure_demo_users(db: AsyncSession) -> int:
    """Crée les 3 comptes de démo s'ils n'existent pas. Idempotent.

    Ne commit PAS : le commit est de la responsabilité de l'appelant.
    Retourne le nombre de comptes effectivement créés.
    """
    crees = 0
    for u in DEMO_USERS:
        existing = await db.execute(select(User).where(User.email == u["email"]))
        if existing.scalar_one_or_none() is not None:
            continue
        db.add(
            User(
                email=u["email"],
                password_hash=hash_password(u["password"]),
                role=u["role"],
                nom_complet=u["nom_complet"],
            )
        )
        crees += 1
    await db.flush()
    return crees


async def bootstrap_on_startup() -> None:
    """Appelé par le lifespan FastAPI. No-op si DEMO_MODE est désactivé."""
    if not settings.DEMO_MODE:
        return
    async with AsyncSessionLocal() as db:
        await ensure_demo_users(db)
        await db.commit()
```

- [ ] **Step 4: Lancer le test, vérifier le succès**

Run: `cd backend && pytest tests/test_demo_seed_service.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Câbler le lifespan dans `main.py`**

Dans `backend/app/main.py`, en haut ajouter :

```python
from contextlib import asynccontextmanager

from app.services.demo_seed_service import bootstrap_on_startup
```

Puis remplacer la création de l'app `app = FastAPI(...)` par :

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    await bootstrap_on_startup()
    yield


app = FastAPI(
    title="ProfMatch API",
    version="0.1.0",
    description="Gestion de CV et affectation des professeurs — Défi La Cité 2026",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)
```

- [ ] **Step 6: Réutiliser le service dans le script CLI**

Remplacer le contenu de `backend/scripts/seed_demo.py` par un appelant mince :

```python
"""Crée les 3 comptes de démo : prof, rh, admin.

Usage :
    docker compose exec backend python scripts/seed_demo.py
Idempotent : ne crée pas de doublons.
"""
import asyncio

from app.services.demo_seed_service import bootstrap_on_startup_forced


if __name__ == "__main__":
    asyncio.run(bootstrap_on_startup_forced())
```

Et ajouter dans `demo_seed_service.py` la variante non gardée (le script doit semer même hors DEMO_MODE) :

```python
async def bootstrap_on_startup_forced() -> None:
    """Comme bootstrap_on_startup mais sans la garde DEMO_MODE (usage CLI explicite)."""
    async with AsyncSessionLocal() as db:
        n = await ensure_demo_users(db)
        await db.commit()
    print(f"Seed terminé : {n} compte(s) créé(s).")
```

- [ ] **Step 7: Vérifier que toute la suite passe toujours**

Run: `cd backend && pytest tests/test_demo_seed_service.py tests/test_health.py tests/test_auth.py -v`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/app/services/demo_seed_service.py backend/app/main.py backend/scripts/seed_demo.py backend/tests/test_demo_seed_service.py
git commit --no-gpg-sign -m "feat(api): bootstrap idempotent des comptes démo au démarrage si DEMO_MODE"
```

---

### Task 3: `INSTALL.md` jury + correction des identifiants du README

**Files:**
- Create: `INSTALL.md` (racine du dépôt)
- Modify: `README.md` (section « Données de démonstration »)

- [ ] **Step 1: Créer `INSTALL.md`**

Create `INSTALL.md` à la racine :

```markdown
# Installation — ProfMatch (jury Défi La Cité 2026)

Application clé en main via Docker. **Une seule commande** suffit.

## Prérequis
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) **ouvert et démarré** (icône verte).
  Windows : activer WSL2 à l'installation.

## Démarrage

```bash
docker compose up --build
```

Premier lancement ~3 min (téléchargement des images). Les migrations de base
de données et les 3 comptes de démo sont créés **automatiquement** au démarrage
(`DEMO_MODE=true` dans le `.env` fourni).

## Accès

| Service | URL |
|---|---|
| Application | http://localhost:3000 |
| API (Swagger) | http://localhost:8000/docs |

## Comptes de démonstration

| Rôle | Email | Mot de passe |
|---|---|---|
| Professeur | `prof@defi-lacite.ca` | `Prof@LaCite2026!` |
| Responsable RH | `rh@defi-lacite.ca` | `Rh@LaCite2026!` |
| Administrateur | `admin@defi-lacite.ca` | `Admin@LaCite2026!` |

## Charger un jeu de données complet (optionnel)

Connecté en **admin**, ouvrir l'espace administrateur → carte **« Données de
démonstration »** → bouton **« Charger les données de démo »** (programmes, cours,
professeurs avec CV traités, affactations avec justifications XAI).

> Alternative en ligne de commande :
> `docker compose exec backend python scripts/seed_affectation_demo.py`

## Arrêt

```bash
docker compose down        # arrêt
docker compose down -v     # arrêt + remise à zéro des données
```

## En cas de souci
- **Docker non démarré** → ouvrir Docker Desktop, attendre l'icône verte, relancer.
- **Port occupé (3000/8000)** → fermer l'application qui l'utilise, relancer.
- Documentation complète : voir `README.md`.
```

- [ ] **Step 2: Corriger les identifiants dans `README.md`**

Dans `README.md`, section « Données de démonstration », remplacer le tableau des comptes (`prof@lacite.ca` / `demo1234`, etc.) par les identifiants réels :

```markdown
| Rôle | Email | Mot de passe |
|---|---|---|
| Professeur | prof@defi-lacite.ca | Prof@LaCite2026! |
| Responsable RH | rh@defi-lacite.ca | Rh@LaCite2026! |
| Administrateur | admin@defi-lacite.ca | Admin@LaCite2026! |
```

Et ajouter une note sous le tableau :

```markdown
> En **mode démo** (`DEMO_MODE=true`), ces 3 comptes sont créés automatiquement
> au démarrage de l'application — aucune commande à lancer.
```

- [ ] **Step 3: Vérifier la cohérence**

Run: `grep -rn "demo1234\|@lacite.ca" README.md INSTALL.md`
Expected: aucune occurrence (uniquement `@defi-lacite.ca`).

- [ ] **Step 4: Commit**

```bash
git add INSTALL.md README.md
git commit --no-gpg-sign -m "docs(readme): guide d'installation jury + correction des identifiants démo"
```

---

### Task 4: Script de release ZIP + gabarit courriel + checklist préflight

**Files:**
- Create: `scripts/make-release-zip.ps1` (racine du dépôt)
- Create: `docs/livraison/courriel-livrable2.md`
- Create: `docs/livraison/checklist-preflight.md`

- [ ] **Step 1: Créer le script de ZIP de release**

Create `scripts/make-release-zip.ps1` :

```powershell
# Produit un ZIP de release propre pour le dépôt Google Drive (Livrable 2).
# Exclut node_modules, .venv, .git, caches, uploads et .env (secrets).
# Usage : powershell -ExecutionPolicy Bypass -File scripts/make-release-zip.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$staging = Join-Path $env:TEMP "profmatch-release"
$zipPath = Join-Path $root "profmatch-release.zip"

$exclude = @(
    "node_modules", ".venv", "venv", ".git", "__pycache__",
    ".pytest_cache", "htmlcov", ".next", ".superpowers"
)

if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null

# Copie via robocopy en excluant les répertoires lourds/sensibles
robocopy $root $staging /E /XD $exclude /XF ".env" "profmatch-release.zip" | Out-Null

# Vide le contenu des uploads mais garde le dossier
$uploads = Join-Path $staging "backend\uploads"
if (Test-Path $uploads) {
    Get-ChildItem $uploads -Exclude ".gitkeep" | Remove-Item -Recurse -Force
}

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $zipPath
Remove-Item $staging -Recurse -Force

Write-Host "ZIP de release cree : $zipPath"
Write-Host "ETAPE MANUELLE : ajouter le fichier .env rempli dans le ZIP/Drive."
```

- [ ] **Step 2: Vérifier que le script produit un ZIP sans secrets**

Run: `powershell -ExecutionPolicy Bypass -File scripts/make-release-zip.ps1`
Puis vérifier l'absence de `.env`, `node_modules`, `.git` dans l'archive :
Run (PowerShell): `Expand-Archive profmatch-release.zip -DestinationPath $env:TEMP\check -Force; Get-ChildItem $env:TEMP\check -Recurse -Force | Where-Object { $_.Name -eq ".env" -or $_.Name -eq "node_modules" }`
Expected: aucun résultat.

- [ ] **Step 3: Créer le gabarit de courriel**

Create `docs/livraison/courriel-livrable2.md` :

```markdown
Objet : [Défi La Cité 2026] Livrable 2 — Équipe ProfMatch — dépôt du code

Bonjour Monsieur Bouhlel,

Veuillez trouver le Livrable 2 de l'équipe ProfMatch :

- Code source déposé dans notre répertoire d'équipe (Google Drive partagé),
  sous forme d'archive `profmatch-release.zip` accompagnée du fichier `.env`
  et de la procédure d'installation `INSTALL.md`.
- Dépôt Git (privé) : https://github.com/soultaka19/profmatch
  Nous vous avons ajouté comme collaborateur en lecture
  (compte : <à compléter>). Merci de nous confirmer l'accès.

Installation : une seule commande `docker compose up --build` (détails dans
`INSTALL.md`). Les comptes de démonstration et les migrations sont créés
automatiquement au démarrage.

Cordialement,
L'équipe ProfMatch — Souleymane Diallo, Mamadou Gando Baldé, Michel Dongmo, Arole Kenfack
```

- [ ] **Step 4: Créer la checklist préflight jour J**

Create `docs/livraison/checklist-preflight.md` :

```markdown
# Checklist préflight — démo jury (4 juin)

## La veille
- [ ] `git pull` sur `main`, version figée + tag `v1.0`.
- [ ] Vidéo de démo enregistrée et déposée sur le Drive.
- [ ] `.env` de démo prêt (`DEMO_MODE=true`, `SECRET_KEY` dédié, identifiants LLM du PDF).

## 30 min avant le passage
- [ ] Docker Desktop ouvert (icône verte).
- [ ] `docker compose up --build` → attendre les healthchecks.
- [ ] http://localhost:3000 répond.
- [ ] Connexion testée pour les 3 rôles (prof / rh / admin).
- [ ] Données de démo chargées (panneau admin ou script).
- [ ] 1 génération d'affectations à blanc → justifications XAI s'affichent.
- [ ] Sliders W1-W4 → recalcul OK.

## Plan B
- [ ] Vidéo de secours accessible hors ligne si l'API LLM ou le réseau lâche.
```

- [ ] **Step 5: Commit**

```bash
git add scripts/make-release-zip.ps1 docs/livraison/
git commit --no-gpg-sign -m "chore(livraison): script de ZIP de release, gabarit courriel et checklist préflight"
```

> **Fin de Phase A.** À ce stade : `clone + docker compose up` → app fonctionnelle, login des 3 rôles, doc d'install jury, package de soumission propre. Suffisant pour le Livrable 2.

---

## PHASE B — Données riches + panneau admin (bonus à forte valeur)

### Task 5: Extraire les données de référence dans le service

**Files:**
- Modify: `backend/app/services/demo_seed_service.py` (ajout `seed_reference_data`)
- Test: `backend/tests/test_demo_seed_service.py` (ajout)

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `backend/tests/test_demo_seed_service.py` :

```python
from app.models.cours import Cours
from app.models.programme import Programme
from app.models.session import Session
from app.services.demo_seed_service import seed_reference_data


@pytest.mark.asyncio
async def test_seed_reference_data_cree_catalogue(db_session: AsyncSession):
    await seed_reference_data(db_session)
    await db_session.commit()

    n_prog = (await db_session.execute(select(func.count(Programme.id)))).scalar_one()
    n_cours = (await db_session.execute(select(func.count(Cours.id)))).scalar_one()
    n_session = (await db_session.execute(select(func.count(Session.id)))).scalar_one()
    assert n_prog >= 2
    assert n_cours >= 5
    assert n_session >= 1


@pytest.mark.asyncio
async def test_seed_reference_data_idempotent(db_session: AsyncSession):
    await seed_reference_data(db_session)
    await db_session.commit()
    await seed_reference_data(db_session)
    await db_session.commit()
    n_cours = (await db_session.execute(select(func.count(Cours.id)))).scalar_one()
    n_cours2 = (await db_session.execute(select(func.count(Cours.id)))).scalar_one()
    assert n_cours == n_cours2  # pas de doublon
```

- [ ] **Step 2: Lancer le test, vérifier l'échec**

Run: `cd backend && pytest tests/test_demo_seed_service.py::test_seed_reference_data_cree_catalogue -v`
Expected: FAIL — `ImportError: cannot import name 'seed_reference_data'`.

- [ ] **Step 3: Extraire la logique du script existant vers le service**

Dans `backend/scripts/seed_affectation_demo.py`, la fonction `async def seed()` crée son propre engine et contient toute la logique (constantes `PROGRAMMES`, `COURS_DATA`, création des programmes/étapes/cours/compétences/session). **Déplacer** :
1. Les constantes `PROGRAMMES` et `COURS_DATA` et le corps de création vers une nouvelle fonction `seed_reference_data(db: AsyncSession) -> None` dans `demo_seed_service.py`, en **remplaçant** la création d'engine/session par le paramètre `db` reçu et en supprimant le `await db.commit()` final (l'appelant commit). Conserver toutes les vérifications « skip si existe déjà » pour l'idempotence.
2. Réduire `scripts/seed_affectation_demo.py` à un appelant :

```python
"""Données de démo pour la chaîne d'affectation (catalogue de cours).
Usage : docker compose exec backend python scripts/seed_affectation_demo.py
"""
import asyncio

from app.db.session import AsyncSessionLocal
from app.services.demo_seed_service import seed_reference_data


async def main() -> None:
    async with AsyncSessionLocal() as db:
        await seed_reference_data(db)
        await db.commit()
    print("Seed catalogue terminé.")


if __name__ == "__main__":
    asyncio.run(main())
```

Ajouter en tête de `demo_seed_service.py` les imports nécessaires (repris du script) :

```python
from app.models.cours import Cours
from app.models.cours_competence import CoursCompetence
from app.models.cours_etape_programme import CategorieCours, CoursEtapeProgramme
from app.models.etape_programme import EtapeProgramme
from app.models.programme import Programme
from app.models.session import Semestre, Session, SessionStatut
```

> Conserver à l'identique le contenu des constantes `PROGRAMMES`/`COURS_DATA` et la logique de création présentes dans `seed_affectation_demo.py` au moment de l'extraction — ne pas réinventer les données.

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `cd backend && pytest tests/test_demo_seed_service.py -v`
Expected: PASS (tous).

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/demo_seed_service.py backend/scripts/seed_affectation_demo.py backend/tests/test_demo_seed_service.py
git commit --no-gpg-sign -m "refactor(api): extraire le seed catalogue dans demo_seed_service réutilisable"
```

---

### Task 6: Seed de professeurs avec CV traité

**Files:**
- Modify: `backend/app/services/demo_seed_service.py` (ajout `seed_professeurs_traites`)
- Test: `backend/tests/test_demo_seed_service.py` (ajout)

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `backend/tests/test_demo_seed_service.py` :

```python
from app.models.competence import Competence
from app.models.cv import CV, CVStatut
from app.services.demo_seed_service import seed_professeurs_traites


@pytest.mark.asyncio
async def test_seed_professeurs_traites(db_session: AsyncSession):
    n = await seed_professeurs_traites(db_session)
    await db_session.commit()

    assert n >= 3
    cvs_traites = (
        await db_session.execute(
            select(func.count(CV.id)).where(CV.statut == CVStatut.TRAITE)
        )
    ).scalar_one()
    assert cvs_traites >= 3
    comp_count = (await db_session.execute(select(func.count(Competence.id)))).scalar_one()
    assert comp_count >= 3


@pytest.mark.asyncio
async def test_seed_professeurs_traites_idempotent(db_session: AsyncSession):
    await seed_professeurs_traites(db_session)
    await db_session.commit()
    await seed_professeurs_traites(db_session)
    await db_session.commit()
    profs = (
        await db_session.execute(
            select(func.count(CV.id)).where(CV.statut == CVStatut.TRAITE)
        )
    ).scalar_one()
    # même nombre après 2 passages
    assert profs == (
        await db_session.execute(
            select(func.count(CV.id)).where(CV.statut == CVStatut.TRAITE)
        )
    ).scalar_one()
```

- [ ] **Step 2: Lancer le test, vérifier l'échec**

Run: `cd backend && pytest tests/test_demo_seed_service.py::test_seed_professeurs_traites -v`
Expected: FAIL — `ImportError`.

- [ ] **Step 3: Implémenter `seed_professeurs_traites`**

Ajouter dans `demo_seed_service.py` (imports + fonction). Le listener `after_insert` crée la ligne `Professeur` à l'insertion du `User` prof ; on récupère ensuite cette ligne pour y rattacher CV et compétences :

```python
from datetime import datetime, timezone

from app.models.competence import Competence, CompetenceNiveau, SourceOrigine
from app.models.cv import CV, CVSource, CVStatut

DEMO_PROFESSEURS = [
    {
        "email": "celine.roy@defi-lacite.ca",
        "nom_complet": "Céline Roy",
        "resume": "Développeuse Python senior, 8 ans en backend FastAPI et bases de données.",
        "competences": [
            ("Python", CompetenceNiveau.EXPERT),
            ("FastAPI", CompetenceNiveau.AVANCE),
            ("SQL", CompetenceNiveau.AVANCE),
        ],
    },
    {
        "email": "marc.lavoie@defi-lacite.ca",
        "nom_complet": "Marc Lavoie",
        "resume": "Spécialiste données et IA, expérience en NLP et PostgreSQL.",
        "competences": [
            ("SQL", CompetenceNiveau.EXPERT),
            ("PostgreSQL", CompetenceNiveau.AVANCE),
            ("Algorithmique", CompetenceNiveau.AVANCE),
        ],
    },
    {
        "email": "sofia.nguyen@defi-lacite.ca",
        "nom_complet": "Sofia Nguyen",
        "resume": "Architecte logiciel, analyse et conception de systèmes, UML.",
        "competences": [
            ("UML", CompetenceNiveau.EXPERT),
            ("Analyse fonctionnelle", CompetenceNiveau.AVANCE),
            ("Python", CompetenceNiveau.INTERMEDIAIRE),
        ],
    },
]


async def seed_professeurs_traites(db: AsyncSession) -> int:
    """Crée des professeurs de démo avec un CV `TRAITE` et des compétences.
    Idempotent (skip si l'email existe). Ne commit pas. Retourne le nombre créé."""
    crees = 0
    for p in DEMO_PROFESSEURS:
        existing = await db.execute(select(User).where(User.email == p["email"]))
        if existing.scalar_one_or_none() is not None:
            continue
        user = User(
            email=p["email"],
            password_hash=hash_password("Prof@LaCite2026!"),
            role=UserRole.PROF,
            nom_complet=p["nom_complet"],
        )
        db.add(user)
        await db.flush()  # déclenche le listener -> ligne Professeur créée

        prof = (
            await db.execute(select(Professeur).where(Professeur.user_id == user.id))
        ).scalar_one()
        prof.resume_profil = p["resume"]
        prof.resume_profil_source = SourceOrigine.LLM

        db.add(
            CV(
                professeur_id=prof.id,
                nom_original=f"cv_{p['email'].split('@')[0]}.pdf",
                chemin_fichier=f"/uploads/demo/{p['email'].split('@')[0]}.pdf",
                taille_octets=12345,
                mime_type="application/pdf",
                statut=CVStatut.TRAITE,
                source=CVSource.MANUAL,
                texte_brut=p["resume"],
                traite_le=datetime.now(timezone.utc),
            )
        )
        for nom, niveau in p["competences"]:
            db.add(
                Competence(
                    professeur_id=prof.id,
                    nom=nom,
                    niveau=niveau,
                    source=SourceOrigine.LLM,
                )
            )
        crees += 1
    await db.flush()
    return crees
```

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `cd backend && pytest tests/test_demo_seed_service.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/demo_seed_service.py backend/tests/test_demo_seed_service.py
git commit --no-gpg-sign -m "feat(api): seed de professeurs démo avec CV traité et compétences"
```

---

### Task 7: Seed d'affectations avec justification XAI `ENRICHIE`

**Files:**
- Modify: `backend/app/services/demo_seed_service.py` (ajout `seed_affectations_enrichies`)
- Test: `backend/tests/test_demo_seed_service.py` (ajout)

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `backend/tests/test_demo_seed_service.py` :

```python
from app.models.affectation import Affectation, JustificationStatut
from app.services.demo_seed_service import (
    seed_affectations_enrichies,
    seed_professeurs_traites,
    seed_reference_data,
)


@pytest.mark.asyncio
async def test_seed_affectations_enrichies(db_session: AsyncSession):
    await seed_reference_data(db_session)
    await seed_professeurs_traites(db_session)
    await db_session.commit()

    n = await seed_affectations_enrichies(db_session)
    await db_session.commit()
    assert n >= 1

    rows = (await db_session.execute(select(Affectation))).scalars().all()
    assert len(rows) >= 1
    for a in rows:
        assert a.justification_statut == JustificationStatut.ENRICHIE
        assert a.justification and len(a.justification) > 20  # récit présent
```

- [ ] **Step 2: Lancer le test, vérifier l'échec**

Run: `cd backend && pytest tests/test_demo_seed_service.py::test_seed_affectations_enrichies -v`
Expected: FAIL — `ImportError`.

- [ ] **Step 3: Implémenter `seed_affectations_enrichies`**

Ajouter dans `demo_seed_service.py`. On rattache les premiers profs traités au premier cours/session, avec des scores plausibles `Numeric(4,3)` et un récit XAI rédigé → `justification_statut = ENRICHIE`, **sans aucun appel LLM** :

```python
from decimal import Decimal

from app.models.affectation import (
    Affectation,
    AffectationOrigine,
    AffectationStatut,
    JustificationStatut,
)
from app.models.cours import Cours


async def seed_affectations_enrichies(db: AsyncSession) -> int:
    """Crée des affectations de démo avec une justification XAI déjà rédigée
    (statut ENRICHIE) → le récit s'affiche sans dépendre de l'API LLM.

    Prérequis : seed_reference_data + seed_professeurs_traites déjà exécutés.
    Idempotent grâce à la contrainte unique (session, prof, cours) : skip si présent.
    """
    session = (await db.execute(select(Session).limit(1))).scalar_one_or_none()
    cours = (await db.execute(select(Cours).limit(1))).scalar_one_or_none()
    profs = (await db.execute(select(Professeur).limit(3))).scalars().all()
    if session is None or cours is None or not profs:
        return 0

    barème = [
        (Decimal("0.910"), Decimal("0.950"), Decimal("0.880"), Decimal("0.800"), Decimal("0.900"),
         "Profil très aligné : maîtrise experte des compétences clés du cours "
         "(Python, FastAPI) et forte expérience pertinente. Candidat recommandé en priorité."),
        (Decimal("0.780"), Decimal("0.820"), Decimal("0.760"), Decimal("0.700"), Decimal("0.760"),
         "Bonne adéquation : compétences techniques solides et expérience proche du domaine "
         "visé, avec une marge de progression sur quelques compétences secondaires."),
        (Decimal("0.640"), Decimal("0.700"), Decimal("0.600"), Decimal("0.550"), Decimal("0.650"),
         "Adéquation correcte : couverture partielle des compétences requises, "
         "profil polyvalent pouvant convenir en complément."),
    ]

    crees = 0
    for prof, (total, comp, exp, hist, sem, recit) in zip(profs, barème):
        existing = await db.execute(
            select(Affectation).where(
                Affectation.session_id == session.id,
                Affectation.professeur_id == prof.id,
                Affectation.cours_id == cours.id,
            )
        )
        if existing.scalar_one_or_none() is not None:
            continue
        db.add(
            Affectation(
                session_id=session.id,
                professeur_id=prof.id,
                cours_id=cours.id,
                score_total=total,
                score_comp=comp,
                score_exp=exp,
                score_hist=hist,
                score_sem=sem,
                justification=recit,
                justification_statut=JustificationStatut.ENRICHIE,
                statut=AffectationStatut.PROPOSEE,
                origine=AffectationOrigine.ALGO,
            )
        )
        crees += 1
    await db.flush()
    return crees
```

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `cd backend && pytest tests/test_demo_seed_service.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/demo_seed_service.py backend/tests/test_demo_seed_service.py
git commit --no-gpg-sign -m "feat(api): seed d'affectations démo avec justification XAI enrichie (sans LLM)"
```

---

### Task 8: Orchestrateur `load_demo_dataset` + `reset_demo_data`

**Files:**
- Modify: `backend/app/services/demo_seed_service.py`
- Test: `backend/tests/test_demo_seed_service.py` (ajout)

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `backend/tests/test_demo_seed_service.py` :

```python
from app.services.demo_seed_service import load_demo_dataset, reset_demo_data


@pytest.mark.asyncio
async def test_load_demo_dataset(db_session: AsyncSession):
    summary = await load_demo_dataset(db_session)
    await db_session.commit()
    assert summary["professeurs"] >= 3
    assert summary["affectations"] >= 1


@pytest.mark.asyncio
async def test_reset_demo_data_vide_puis_rebootstrap(db_session: AsyncSession):
    await load_demo_dataset(db_session)
    await db_session.commit()

    await reset_demo_data(db_session)
    await db_session.commit()

    # Après reset : tables applicatives vidées, seuls les 3 comptes rebootstrappés
    total_users = (await db_session.execute(select(func.count(User.id)))).scalar_one()
    total_aff = (await db_session.execute(select(func.count(Affectation.id)))).scalar_one()
    assert total_users == 3
    assert total_aff == 0
```

- [ ] **Step 2: Lancer le test, vérifier l'échec**

Run: `cd backend && pytest tests/test_demo_seed_service.py::test_load_demo_dataset -v`
Expected: FAIL — `ImportError`.

- [ ] **Step 3: Implémenter l'orchestrateur et le reset**

Ajouter dans `demo_seed_service.py` :

```python
from sqlalchemy import text

from app.db.base import Base


async def load_demo_dataset(db: AsyncSession) -> dict[str, int]:
    """Charge le jeu de démo complet (idempotent). Ne commit pas."""
    await ensure_demo_users(db)
    await seed_reference_data(db)
    n_profs = await seed_professeurs_traites(db)
    n_aff = await seed_affectations_enrichies(db)
    return {"professeurs": n_profs, "affectations": n_aff}


async def reset_demo_data(db: AsyncSession) -> None:
    """Vide TOUTES les tables applicatives puis recrée les 3 comptes.

    Sécurité : ne touche JAMAIS `alembic_version` ni le schéma. TRUNCATE dans
    une transaction unique, CASCADE pour respecter les clés étrangères.
    """
    tables = [
        t.name for t in Base.metadata.sorted_tables if t.name != "alembic_version"
    ]
    if tables:
        await db.execute(
            text(f'TRUNCATE TABLE {", ".join(tables)} RESTART IDENTITY CASCADE')
        )
    await ensure_demo_users(db)
```

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `cd backend && pytest tests/test_demo_seed_service.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/demo_seed_service.py backend/tests/test_demo_seed_service.py
git commit --no-gpg-sign -m "feat(api): orchestrateur load_demo_dataset et reset_demo_data gardé"
```

---

### Task 9: Endpoints admin `/seed-demo` et `/reset` (gardés DEMO_MODE)

**Files:**
- Modify: `backend/app/core/deps.py` (dépendance `require_demo_mode`)
- Modify: `backend/app/routers/admin_maintenance.py`
- Test: `backend/tests/test_admin_maintenance_router.py` (create)

- [ ] **Step 1: Écrire les tests qui échouent**

Create `backend/tests/test_admin_maintenance_router.py` :

```python
"""Tests des endpoints démo de maintenance (seed/reset), gardés DEMO_MODE."""
import pytest
from httpx import AsyncClient

from app.core.config import settings


@pytest.fixture
def demo_mode_on(monkeypatch):
    monkeypatch.setattr(settings, "DEMO_MODE", True)


@pytest.fixture
def demo_mode_off(monkeypatch):
    monkeypatch.setattr(settings, "DEMO_MODE", False)


@pytest.mark.asyncio
async def test_seed_demo_404_hors_demo_mode(client: AsyncClient, auth_headers_admin, demo_mode_off):
    r = await client.post("/api/admin/maintenance/seed-demo", headers=auth_headers_admin)
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_seed_demo_403_pour_rh(client: AsyncClient, auth_headers_rh, demo_mode_on):
    r = await client.post("/api/admin/maintenance/seed-demo", headers=auth_headers_rh)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_seed_demo_ok_admin(client: AsyncClient, auth_headers_admin, demo_mode_on):
    r = await client.post("/api/admin/maintenance/seed-demo", headers=auth_headers_admin)
    assert r.status_code == 200
    data = r.json()
    assert "professeurs" in data and "affectations" in data


@pytest.mark.asyncio
async def test_reset_ok_admin(client: AsyncClient, auth_headers_admin, demo_mode_on):
    r = await client.post("/api/admin/maintenance/reset", headers=auth_headers_admin)
    assert r.status_code == 200
    assert r.json()["status"] == "reset"
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `cd backend && pytest tests/test_admin_maintenance_router.py -v`
Expected: FAIL — 404 attendu mais route inexistante / import.

- [ ] **Step 3: Ajouter la dépendance `require_demo_mode`**

Dans `backend/app/core/deps.py`, ajouter (avec l'import `from app.core.config import settings` en tête) :

```python
def require_demo_mode() -> None:
    """Dépendance FastAPI : rend l'endpoint introuvable (404) hors mode démo.

    404 plutôt que 403 pour ne pas révéler l'existence de l'endpoint en prod.
    """
    if not settings.DEMO_MODE:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Introuvable")
```

- [ ] **Step 4: Ajouter les endpoints dans `admin_maintenance.py`**

Dans `backend/app/routers/admin_maintenance.py`, ajouter les imports et les routes :

```python
from app.core.deps import require_demo_mode
from app.services.demo_seed_service import load_demo_dataset, reset_demo_data


class SeedDemoOut(BaseModel):
    professeurs: int
    affectations: int


@router.post("/seed-demo", response_model=SeedDemoOut)
async def seed_demo(
    _: User = Depends(require_role("admin")),
    __: None = Depends(require_demo_mode),
    db: AsyncSession = Depends(get_db),
) -> SeedDemoOut:
    """Charge le jeu de données de démo complet (idempotent). DEMO_MODE only."""
    summary = await load_demo_dataset(db)
    await db.commit()
    return SeedDemoOut(**summary)


@router.post("/reset")
async def reset_demo(
    _: User = Depends(require_role("admin")),
    __: None = Depends(require_demo_mode),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Réinitialise les données applicatives puis recrée les 3 comptes. DEMO_MODE only."""
    await reset_demo_data(db)
    await db.commit()
    return {"status": "reset"}
```

- [ ] **Step 5: Lancer les tests, vérifier le succès**

Run: `cd backend && pytest tests/test_admin_maintenance_router.py -v`
Expected: PASS (4 tests).

- [ ] **Step 6: Vérifier la non-régression + couverture**

Run: `cd backend && pytest --cov=app/services/demo_seed_service --cov=app/routers/admin_maintenance --cov-report=term-missing`
Expected: PASS, couverture ≥ 70 % sur les deux fichiers.

- [ ] **Step 7: Commit**

```bash
git add backend/app/core/deps.py backend/app/routers/admin_maintenance.py backend/tests/test_admin_maintenance_router.py
git commit --no-gpg-sign -m "feat(api): endpoints admin seed-demo et reset gardés par DEMO_MODE"
```

---

### Task 10: Panneau admin frontend (Charger / Réinitialiser)

**Files:**
- Create: `frontend/lib/api/maintenance.ts`
- Create: `frontend/components/admin/DemoDataPanel.tsx`
- Modify: `frontend/app/dashboard/admin/page.tsx`

- [ ] **Step 1: Créer le client API**

Create `frontend/lib/api/maintenance.ts` (suit le pattern de `lib/api/adminStats.ts` avec `apiClient`) :

```typescript
import { apiClient } from "./client";

export interface SeedDemoOut {
  professeurs: number;
  affectations: number;
}

export const maintenanceApi = {
  seedDemo: () => apiClient.post<SeedDemoOut>("/api/admin/maintenance/seed-demo", {}),
  reset: () => apiClient.post<{ status: string }>("/api/admin/maintenance/reset", {}),
};

export interface HealthOut {
  status: string;
  demo_mode: boolean;
}

export const healthApi = {
  get: () => apiClient.get<HealthOut>("/health"),
};
```

- [ ] **Step 2: Créer le composant `DemoDataPanel`**

Create `frontend/components/admin/DemoDataPanel.tsx`. Carte shadcn/ui avec deux actions ; le bouton « Réinitialiser » exige une saisie de confirmation. Le panneau ne s'affiche que si `demo_mode` est vrai (lu via `/health`) :

```tsx
"use client";

import { useState } from "react";
import useSWR from "swr";
import { Database, RotateCcw } from "lucide-react";
import { maintenanceApi, healthApi, type HealthOut } from "@/lib/api/maintenance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DemoDataPanel() {
  const { data: health } = useSWR<HealthOut>("health", healthApi.get);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");

  if (!health?.demo_mode) return null;

  async function handleSeed() {
    setBusy(true);
    setMessage(null);
    try {
      const r = await maintenanceApi.seedDemo();
      setMessage(`Données chargées : ${r.professeurs} prof(s), ${r.affectations} affectation(s).`);
    } catch {
      setMessage("Échec du chargement des données.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (confirm !== "RÉINITIALISER") return;
    setBusy(true);
    setMessage(null);
    try {
      await maintenanceApi.reset();
      setMessage("Base réinitialisée. Les 3 comptes de démo ont été recréés.");
      setConfirm("");
    } catch {
      setMessage("Échec de la réinitialisation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <h2 className="text-lg font-semibold text-fg flex items-center gap-2">
        <Database className="h-5 w-5 text-primary" />
        Données de démonstration
      </h2>
      <p className="text-sm text-fg-muted">
        Mode démo actif. Chargez un jeu complet (programmes, cours, profs avec CV
        traités, affectations avec justifications XAI) ou réinitialisez la base.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSeed} disabled={busy}>
          <Database className="mr-2 h-4 w-4" />
          Charger les données de démo
        </Button>
      </div>
      <div className="space-y-2 border-t border-border pt-4">
        <p className="text-sm text-fg-muted">
          Pour réinitialiser, tapez <code>RÉINITIALISER</code> puis confirmez :
        </p>
        <div className="flex gap-3">
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="RÉINITIALISER"
            className="max-w-xs"
          />
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={busy || confirm !== "RÉINITIALISER"}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Réinitialiser
          </Button>
        </div>
      </div>
      {message && <p className="text-sm text-fg">{message}</p>}
    </div>
  );
}
```

> Vérifier les chemins d'import shadcn réels (`@/components/ui/button`, `@/components/ui/input`) ; les ajouter via `npx shadcn@latest add button input` s'ils n'existent pas encore.

- [ ] **Step 3: Monter le panneau dans la page admin**

Dans `frontend/app/dashboard/admin/page.tsx`, importer et ajouter le composant après `<AdminStatsCards .../>` :

```tsx
import { DemoDataPanel } from "@/components/admin/DemoDataPanel";
```

et dans le JSX, après la carte de stats :

```tsx
      <AdminStatsCards stats={data} isLoading={isLoading} error={Boolean(error)} />
      <DemoDataPanel />
```

- [ ] **Step 4: Vérifier le lint et les types**

Run: `cd frontend && npm run lint && npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/api/maintenance.ts frontend/components/admin/DemoDataPanel.tsx frontend/app/dashboard/admin/page.tsx
git commit --no-gpg-sign -m "feat(frontend): panneau admin de chargement/réinitialisation des données démo"
```

> **Fin de Phase B.** Le jury peut charger un jeu complet en un clic (récit XAI instantané, sans LLM) et réinitialiser entre deux essais.

---

## Finalisation (après Phase A, et après Phase B si réalisée)

- [ ] **PR** : `gh pr create --base main --head feature/mode-demo-livraison` — titre Conventional Commits, description résumant Phase A (+ B). CI verte + 1 review avant merge (conventions CLAUDE.md).
- [ ] **Merge** : `gh pr merge <num> --squash` (garder la branche `feature/*`).
- [ ] **Livraison L2** : générer le ZIP (`scripts/make-release-zip.ps1`), y ajouter le `.env` rempli, déposer sur le Drive partagé, inviter le coordinateur en lecture sur GitHub, envoyer le courriel (`docs/livraison/courriel-livrable2.md`).
- [ ] **L3** : tag `v1.0`, vidéo de démo, checklist préflight.

---

## Notes de cohérence (auto-revue)

- **Signatures du service** utilisées de façon cohérente partout : `ensure_demo_users(db) -> int`, `seed_reference_data(db) -> None`, `seed_professeurs_traites(db) -> int`, `seed_affectations_enrichies(db) -> int`, `load_demo_dataset(db) -> dict[str,int]`, `reset_demo_data(db) -> None`, `bootstrap_on_startup() -> None`, `bootstrap_on_startup_forced() -> None`.
- **Aucune fonction ne commit** sauf `bootstrap_on_startup(_forced)` (pas de session reçue) et les endpoints (qui commitent après appel). Les tests commitent explicitement.
- **Garde de sécurité** : `require_demo_mode` (404) + `require_role("admin")` (403) sur `/seed-demo` et `/reset` ; `reset_demo_data` exclut `alembic_version`.
- **Zéro LLM** dans le seed : les justifications sont rédigées en dur avec `JustificationStatut.ENRICHIE`.
