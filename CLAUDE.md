# CLAUDE.md — ProfMatch
## Défi Informatique La Cité 2026

---

## Description du projet

**ProfMatch** est une application web intelligente qui automatise l'analyse des CV des professeurs et leur affectation aux cours d'un collège. Elle combine un algorithme de scoring pondéré configurable et un LLM pour remplacer un processus manuel, subjectif et chronophage.

**Flux principal :**
1. Le professeur téléverse son CV (PDF ou DOCX).
2. Le pipeline IA extrait compétences, expériences, formations et langues.
3. L'algorithme calcule un score composite (W1–W4) pour chaque paire professeur-cours.
4. Le responsable RH révise les propositions avec leurs justifications narratives (XAI) et confirme les affectations.

**Différenciateur :** IA Explicable (XAI) — chaque proposition est accompagnée d'une justification en quatre critères générée par le LLM.

**Compétition :** Défi Informatique La Cité 2026, 2ème édition — Collège La Cité, Ottawa.  
**Période :** 8 mai – 4 juin 2026.

---

## Stack technique

| Couche | Technologie | Version |
|---|---|---|
| Frontend | Next.js + React | 16.2.6 / 19 |
| UI Components | shadcn/ui + Tailwind CSS | latest |
| Backend | Python + FastAPI | 3.12 / latest |
| ORM | SQLAlchemy + Alembic | 2.0 / latest |
| Base de données | PostgreSQL | 16 |
| File d'attente | Celery + Redis | latest / 7 |
| IA — Extraction CV | pdfplumber + python-docx | latest |
| IA — LLM | SDK OpenAI → API compétition | latest |
| Validation | Pydantic | v2 |
| Auth | JWT HS256 | — |
| Déploiement | Docker + Docker Compose | latest |
| CI | GitHub Actions | — |
| Gestion de projet | Jira (projet DCITE) + GitHub | — |

**API LLM de la compétition :**
- URL : voir `LLM_API_URL` dans `.env` (ne jamais écrire l'URL en dur dans le code)
- Modèle : `gpt-oss-ctx24k:120b`
- Auth : voir `LLM_API_COOKIE` dans `.env` (⚠️ secret — ne jamais committer)
- Compatible SDK OpenAI — pointer `base_url` vers `settings.LLM_API_URL`.

---

## Architecture cible

```
┌─────────────────────────────────────────────────────┐
│                  Docker Compose                      │
│                                                     │
│  ┌──────────────┐  HTTP/JSON  ┌──────────────────┐  │
│  │  Next.js 14  │◄───────────►│  FastAPI         │  │
│  │  port 3000   │  port 8000  │  SQLAlchemy ORM  │  │
│  └──────────────┘             │  Worker Celery   │  │
│                               └────────┬─────────┘  │
│                                        │             │
│                             ┌──────────┴──────────┐  │
│                        ┌────▼───┐            ┌────▼──┐│
│                        │Postgres│            │ Redis ││
│                        │ :5432  │            │ :6379 ││
│                        └────────┘            └───────┘│
└─────────────────────────────────────────────────────┘
                                   │
                        ┌──────────▼──────────┐
                        │  API LLM compétition │
                        │  gpt-oss-ctx24k:120b │
                        └─────────────────────┘
```

**Services Docker :** `frontend` · `backend` · `db` · `redis` · `worker`

**Trois rôles utilisateurs :** `prof` · `rh` · `admin`

**Routage frontend par rôle :**
- `/dashboard/prof` — dépôt CV, vérification données IA, affectations
- `/dashboard/rh` — génération, révision propositions, historique
- `/dashboard/admin` — utilisateurs, cours, sessions, pondérations

---

## Commandes essentielles

### Démarrage

```bash
# Lancer toute l'application (seule commande autorisée pour la démo)
docker compose up --build

# Développement local backend
cd backend && uvicorn app.main:app --reload --port 8000

# Développement local frontend
cd frontend && npm run dev

# Lancer le worker Celery (dev local)
cd backend && celery -A app.worker worker --loglevel=info
```

### Base de données

```bash
# Créer une nouvelle migration (TOUJOURS après modification d'un modèle SQLAlchemy)
cd backend && alembic revision --autogenerate -m "description_courte"

# Appliquer les migrations
cd backend && alembic upgrade head

# Annuler la dernière migration
cd backend && alembic downgrade -1

# Seed des données de démonstration
cd backend && python scripts/seed_demo.py
```

### Tests

```bash
# Backend — tous les tests
cd backend && pytest

# Backend — avec couverture
cd backend && pytest --cov=app --cov-report=term-missing

# Frontend — lint + types
cd frontend && npm run lint && npm run type-check

# Frontend — tests
cd frontend && npm test
```

### Git

```bash
# Créer une branche de fonctionnalité
git checkout -b feature/nom-court

# Format de commit obligatoire (Conventional Commits)
git commit -m "feat(api): add CV upload endpoint with async Celery task queue"
```

---

## Conventions de code

### Commits — Conventional Commits (obligatoire)

```
feat(scope): description      # nouvelle fonctionnalité
fix(scope): description       # correction de bug
docs(scope): description      # documentation
test(scope): description      # tests
chore(scope): description     # tâche technique / config
refactor(scope): description  # refactoring sans changement fonctionnel
```

**Scopes valides :** `api` · `auth` · `cv` · `pipeline` · `algo` · `frontend` · `db` · `docker` · `ci`

**Exemple :** `feat(algo): implement W4 semantic score with cosine similarity`

### Branches

```
feature/nom-court          # ex. feature/cv-upload, feature/affectation-algo
fix/description            # ex. fix/jwt-refresh, fix/pydantic-validator
chore/description          # ex. chore/db-migrations, chore/ci-setup
```

- Aucun commit direct sur `main` — protection de branche activée.
- Toute modification passe par une Pull Request.
- Minimum 1 approbation d'un autre membre avant le merge.
- Les pipelines CI (pytest + ESLint/TS) doivent passer avant le merge.

### Python / FastAPI

- Indentation : 4 espaces.
- Type hints sur toutes les fonctions publiques.
- Modèles Pydantic v2 pour tous les schémas de requête/réponse et les sorties LLM.
- Pas de SQL brut — SQLAlchemy ORM uniquement.
- Dépendances injectées via `Depends()` de FastAPI.
- Endpoints organisés par router dans `app/routers/`.
- Logique métier dans `app/services/`, jamais directement dans les routers.

```python
# Bon
@router.post("/cv/upload")
async def upload_cv(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CVUploadResponse:
    return await cv_service.upload(file, current_user, db)

# Interdit — logique métier dans le router
@router.post("/cv/upload")
async def upload_cv(file: UploadFile):
    text = pdfplumber.open(file)  # NON
    ...
```

### TypeScript / Next.js

- TypeScript strict (`"strict": true` dans `tsconfig.json`).
- Pas de `any` — typer explicitement toutes les réponses API.
- Composants dans `components/`, pages dans `app/` (App Router Next.js 16.2.6).
- Appels API centralisés dans `lib/api/`.
- Polling SWR pour les statuts asynchrones (`refreshInterval: 2000`).
- shadcn/ui pour tous les composants UI — ne pas réinventer les boutons, formulaires, dialogues.

### Prompts LLM — Framework ASPECCT

Tous les prompts LLM doivent suivre le framework ASPECCT :

```
ACTION      — ce que le LLM doit faire
STEPS       — étapes détaillées
PERSONA     — rôle du LLM
EXAMPLES    — exemples de sortie attendue
CONTEXT     — données d'entrée
CONSTRAINTS — règles strictes (format JSON, longueur, etc.)
TEMPLATE    — schéma de sortie exact
```

Les sorties LLM sont **toujours** du JSON structuré validé par un modèle Pydantic.  
En cas de `ValidationError`, retry automatique max 2× — le 2e retry inclut l'erreur explicite.

---

## Règles strictes

### Migrations

- **Ne jamais modifier** un fichier de migration Alembic existant déjà appliqué.
- Toute modification de modèle SQLAlchemy → nouvelle migration avec `alembic revision --autogenerate`.
- Nommer les migrations de manière descriptive : `add_embedding_to_professeurs`, pas `auto_1`.
- Les migrations doivent être réversibles (`downgrade` implémenté).

### Tests

- Tout endpoint FastAPI doit avoir au moins un test pytest.
- Les tests du pipeline IA utilisent des CV fixtures (fichiers dans `tests/fixtures/`), pas de vrais appels LLM.
- Mocker l'API LLM dans les tests avec `pytest-mock` — ne jamais appeler l'API réelle dans les tests automatisés.
- Les tests d'intégration utilisent une base PostgreSQL de test dédiée (configurée via `TEST_DATABASE_URL`).

### Secrets et configuration

- **Jamais** de secret en dur dans le code.
- Toutes les variables d'environnement dans `.env` (non commité) — modèle dans `.env.example`.
- Variables obligatoires :

```env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/profmatch
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=<jwt-secret-min-32-chars>
LLM_API_URL=https://defi-informatique.cocalc.cloud/api
LLM_API_COOKIE=FC3yLm9Wyu4Fz7FS
LLM_MODEL=gpt-oss-ctx24k:120b
```

- `.env` et tout fichier `*.env` sont dans `.gitignore`.
- Ne jamais logger les valeurs de variables d'environnement sensibles.

### Sécurité

- Mots de passe hachés avec bcrypt, minimum 12 rounds — jamais SHA256 ou MD5.
- JWT HS256, TTL 24 h, secret minimum 32 caractères.
- Validation Pydantic sur **tous** les endpoints — ne jamais faire confiance au corps de requête brut.
- Vérification du rôle via `Depends(require_role("rh"))` — jamais en dur dans la logique métier.
- Taille max fichier CV : 10 Mo, formats acceptés : PDF et DOCX uniquement.

### Algorithme d'affectation

- La contrainte W1 + W2 + W3 + W4 = 1,0 est validée à l'écriture en base et côté frontend.
- Les scores sont stockés en `DECIMAL(4,3)` — ne pas arrondir avant le stockage.
- Seuls les professeurs avec `cv_statut = 'traite'` sont inclus dans la génération.
- Le top 3 minimum par cours doit être généré — signaler les cours sans candidat.

---

## Pondération de l'évaluation (compétition)

| Critère | Poids | Ce qui est évalué |
|---|---|---|
| **Fonctionnalité** | **40 %** | Les 8 features core fonctionnent en démo live : auth, upload CV, extraction IA, gestion académique, génération affectations, révision RH, historique, config pondérations |
| **Qualité du code** | **20 %** | Architecture en couches, absence d'erreurs lint, tests présents, pas de code mort, lisibilité |
| **Innovation** | **10 %** | Justifications XAI narratives + score sémantique W4 par embeddings |
| **Discipline Git** | **10 %** | Conventional Commits respectés, PRs approuvées, contributions équilibrées entre membres, branches courtes |
| **Présentation** | **10 %** | Démo 20 min fluide, tous les rôles démontrés, réponses aux questions du jury |
| **Documentation** | **10 %** | README complet, PRD, docstrings sur les fonctions clés, guide de déploiement |

**Priorité de développement :** les 40 % fonctionnalité d'abord.  
En cas de manque de temps : sacrifier les exigences DEVRAIT/POURRAIT, jamais les DOIT.

### Scénario de démo (ordre à respecter)

1. Connexion en tant que **Professeur** → téléverser un CV PDF → vérifier les données extraites.
2. Connexion en tant que **Admin** → créer une session → configurer les pondérations.
3. Connexion en tant que **RH** → générer les affectations → lire les justifications XAI → valider.
4. Retour **Admin** → ajuster les sliders W1–W4 → montrer le recalcul en temps réel.

---

## Structure du dépôt

```
profmatch/
├── frontend/                  # Next.js 14
│   ├── app/                   # App Router (pages et layouts)
│   ├── components/            # Composants React réutilisables
│   └── lib/api/               # Fonctions d'appel API centralisées
├── backend/                   # FastAPI
│   ├── app/
│   │   ├── main.py            # Point d'entrée FastAPI
│   │   ├── routers/           # Endpoints par domaine
│   │   ├── services/          # Logique métier
│   │   ├── models/            # Modèles SQLAlchemy
│   │   ├── schemas/           # Modèles Pydantic (requêtes/réponses)
│   │   ├── worker.py          # Configuration Celery
│   │   └── core/              # Auth, config, dépendances
│   ├── alembic/               # Migrations BDD
│   ├── tests/                 # Tests pytest
│   │   └── fixtures/          # CV de test (PDF/DOCX)
│   └── scripts/seed_demo.py   # Données de démonstration
├── docs/
│   └── features/              # FOR[feature].md et OF[feature].md — ignorés par Git
├── docker-compose.yml
├── .env.example
├── PRD-ProfMatch.md           # Document des exigences produit
└── CLAUDE.md                  # Ce fichier
```

---

## Répartition des responsabilités

| Membre | Programme | Périmètre technique |
|---|---|---|
| **Souleymane Diallo** | PI | Chef de projet · Backend FastAPI · BDD PostgreSQL · Docker · Auth JWT · CI |
| **Mamadou Gando Baldé** | PI | Frontend Next.js · shadcn/ui · Toutes les maquettes (ECR-01 à ECR-08) |
| **Michel DONGMO** | IAI | Prompts LLM (ASPECCT) · Pipeline extraction CV · Celery worker |
| **Arole KENFACK** | IAI | Algorithme d'affectation · Scoring W1–W4 · Embeddings · XAI · Dashboards RH/Admin |

---

## Definition of Done

Une feature est terminée quand :

- [ ] Tous les endpoints du domaine ont un test pytest
- [ ] `pytest --cov=app` affiche ≥ 70 % de couverture sur les fichiers modifiés
- [ ] `npm run lint && npm run type-check` passe sans erreur
- [ ] La PR est approuvée par au minimum 1 autre membre
- [ ] Un fichier `docs/features/FOR[nom-feature].md` est créé
- [ ] Le CLAUDE.md est mis à jour si une nouvelle convention a été introduite

---

## Convention de documentation — FOR / OF

Chaque feature complétée génère deux fichiers dans `docs/features/`.  
Ces fichiers sont **ignorés par Git** (voir `.gitignore`) — ils servent au travail interne de l'équipe, pas à la livraison.

---

### FOR[feature].md — Ce qui a été fait

Créé à la fin de chaque feature, avant le merge de la PR.

**Structure obligatoire :**

```markdown
# FOR[nom-feature]

## Ce qui a été implémenté
- Liste des fichiers créés ou modifiés
- Endpoints ajoutés (méthode + route)
- Modèles DB ajoutés ou modifiés
- Composants frontend créés

## Comment tester
- Commandes à lancer
- Cas nominaux à vérifier
- Données de test utilisées

## Dépendances
- Features ou services dont cette feature dépend
- Ce qui dépend de cette feature
```

**Exemples de noms :** `FORcv-upload.md` · `FORaffectation-algo.md` · `FORauth.md`

---

### OF[feature].md — Ce qui a été appris

Créé au même moment que le FOR, ou mis à jour après un bug en prod.

**Structure obligatoire :**

```markdown
# OF[nom-feature]

## Erreurs rencontrées
Pour chaque erreur :
- **Symptôme** : ce qui s'est passé
- **Cause** : pourquoi c'est arrivé
- **Fix** : ce qui a été fait pour corriger

## Enseignements
- Ce qu'on referait différemment
- Les pièges à éviter sur ce domaine
- Les décisions techniques et leur justification

## Règles ajoutées au CLAUDE.md
- Liste des règles ajoutées suite à cette feature
```

**Exemples de noms :** `OFcv-upload.md` · `OFaffectation-algo.md` · `OFauth.md`

---

*Document maintenu par Souleymane Diallo. Dernière mise à jour : 2026-05-18.*  
*Compétition : Défi Informatique La Cité 2026 — Collège La Cité, Ottawa.*
