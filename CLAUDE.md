# CLAUDE.md — ProfMatch
## Défi Informatique La Cité 2026 (compétition 8 mai – 4 juin 2026)

ProfMatch automatise l'analyse de CV et l'affectation prof → cours via un algorithme pondéré (W1–W4) + un LLM produisant des justifications XAI narratives. Rôles : `prof` · `rh` · `admin`.

---

## Stack

| Couche | Techno |
|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + shadcn/ui + Tailwind |
| Backend | FastAPI 3.12 + SQLAlchemy 2.0 async + Alembic + Pydantic v2 |
| DB | PostgreSQL 16 |
| Queue | Celery + Redis 7 |
| IA | pdfplumber + python-docx · SDK OpenAI vers API compétition |
| Auth | JWT HS256, bcrypt min 12 rounds |
| Déploiement | Docker Compose |

**API LLM compétition :** voir `LLM_API_URL` et `LLM_API_COOKIE` dans `.env` (jamais en dur). Modèle `gpt-oss-ctx24k:120b`, compatible SDK OpenAI.

---

## Commandes essentielles

```bash
docker compose up --build              # tout lancer (démo)
cd backend && uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev

cd backend && alembic revision --autogenerate -m "description"
cd backend && alembic upgrade head
cd backend && pytest --cov=app
cd frontend && npm run lint && npx tsc --noEmit
```

---

## Conventions

**Commits — Conventional Commits obligatoires.** Scopes : `api · auth · cv · pipeline · algo · frontend · db · docker · ci`.

**Branches :** `feature/*`, `fix/*`, `docs/*`, `chore/*`. Aucun commit direct sur `main`. PR obligatoire, 1 approbation min, CI verte avant merge.

**Rétention après squash-merge :**
- **Garder** `feature/*` et `fix/*` (historique + recovery). Commande : `gh pr merge <num> --squash` (sans `--delete-branch`).
- **Supprimer** `docs/*` et `chore/*` : ajouter `--delete-branch`.

**Python / FastAPI :** 4 espaces · type hints partout · Pydantic v2 pour requêtes/réponses · SQLAlchemy ORM (pas de SQL brut) · routers dans `app/routers/`, logique métier dans `app/services/` (jamais dans le router) · dépendances via `Depends()`.

**TypeScript / Next.js :** mode strict · pas de `any` · composants dans `components/`, pages dans `app/` · API centralisée dans `lib/api/` · SWR pour polling (`refreshInterval: 2000`) · shadcn/ui obligatoire pour les éléments UI standards.

**Prompts LLM — framework ASPECCT** (Action, Steps, Persona, Examples, Context, Constraints, Template). Sortie toujours JSON structuré validé Pydantic, retry max 2× sur `ValidationError`.

---

## Règles strictes

**Migrations :**
- Ne jamais modifier une migration appliquée.
- Toute modif modèle SQLAlchemy → nouvelle migration `alembic revision --autogenerate -m "nom_descriptif"`.
- Downgrade implémenté + nom descriptif (jamais `auto_1`).

**Tests :**
- Tout endpoint a au moins un test pytest.
- Pipeline IA : fixtures dans `tests/fixtures/`, mock LLM avec `pytest-mock` (jamais d'appel réel).
- Intégration : base PostgreSQL dédiée via `TEST_DATABASE_URL`.
- Couverture ≥ 70 % sur les fichiers modifiés.

**Secrets :**
- Jamais en dur. Tout dans `.env` (gitignored), modèle dans `.env.example`.
- Variables clés : `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY` (32+ chars), `LLM_API_URL`, `LLM_API_COOKIE`, `LLM_MODEL`.
- Ne jamais logger les secrets.

**Sécurité :**
- Validation Pydantic sur **tous** les endpoints.
- Rôles via `Depends(require_role("rh"))` — jamais en dur dans la logique.
- CV : max 10 Mo, PDF + DOCX uniquement.

**Algo d'affectation :**
- Contrainte `W1 + W2 + W3 + W4 = 1.0` validée en base (`CHECK`) ET frontend.
- Scores en `DECIMAL(4,3)`, jamais arrondis avant stockage.
- Seuls profs `cv_statut = 'traite'` sont inclus.
- Top 3 minimum par cours — signaler les cours sans candidat.

**Calendrier académique :**
- Rythme dérivé de `Programme.semestres_admission` via `services/academic_calendar.py` (pas de colonne dédiée).
- `STANDARD` (admet uniquement Automne) → vacances Printemps. `CONTINU` (admet aussi Hiver/Printemps) → 3 sessions actives, sans vacances.

---

## Pondération de l'évaluation (compétition)

| Critère | Poids |
|---|---|
| Fonctionnalité (8 features core en démo live) | **40 %** |
| Qualité du code (architecture, lint, tests, lisibilité) | **20 %** |
| Innovation (XAI narratif + W4 sémantique embeddings) | **10 %** |
| Discipline Git (Conventional Commits, PRs, contributions équilibrées) | **10 %** |
| Présentation (démo 20 min) | **10 %** |
| Documentation (README, PRD, docstrings) | **10 %** |

**Priorité :** les 40 % fonctionnalité d'abord. En cas de manque de temps : sacrifier DEVRAIT/POURRAIT, jamais les DOIT.

### Scénario de démo

1. **Prof** : téléverser CV PDF → vérifier données extraites.
2. **Admin** : créer session → configurer pondérations.
3. **RH** : générer affectations → lire justifications XAI → valider.
4. **Admin** : ajuster sliders W1–W4 → recalcul en temps réel.

---

## Structure du dépôt

```
profmatch/
├── frontend/{app,components,lib/api,lib/types}/    # Next.js App Router
├── backend/app/
│   ├── routers/    # endpoints par domaine
│   ├── services/   # logique métier
│   ├── models/     # SQLAlchemy
│   ├── schemas/    # Pydantic
│   └── core/       # auth, config, deps
├── backend/alembic/versions/                       # migrations
├── backend/tests/fixtures/                         # CV de test
└── docker-compose.yml
```

---

## Definition of Done

- Endpoints du domaine : test pytest ≥ 1 chacun.
- `pytest --cov=app` ≥ 70 % sur fichiers modifiés.
- `npm run lint && npx tsc --noEmit` 0 erreur.
- PR approuvée ≥ 1 reviewer, CI verte.
- CLAUDE.md mis à jour si nouvelle convention introduite.

---

*Compétition : Défi Informatique La Cité 2026 — Collège La Cité, Ottawa.*
