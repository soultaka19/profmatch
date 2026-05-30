# ProfMatch
Application web intelligente de gestion de CV et d'affectation des professeurs aux cours.

**Compétition :** Défi Informatique La Cité 2026 — 2ème édition  
**Équipe :** Souleymane Diallo · Mamadou Gando Baldé · Michel DONGMO · Arole KENFACK

---

## Secrets et variables d'environnement

Les valeurs sensibles du projet sont stockées dans **GitHub Secrets** — elles ne sont jamais dans le code.

### Pour les administrateurs du dépôt (Souleymane)

Aller dans **GitHub → Settings → Secrets and variables → Actions → New repository secret** et ajouter :

| Secret | Description |
|---|---|
| `POSTGRES_USER` | Utilisateur PostgreSQL |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL |
| `POSTGRES_DB` | Nom de la base de données |
| `DATABASE_URL` | URL complète de connexion à la base |
| `TEST_DATABASE_URL` | URL de connexion à la base de test (CI) |
| `REDIS_URL` | URL Redis |
| `SECRET_KEY` | Clé JWT — générer avec `python -c "import secrets; print(secrets.token_hex(32))"` |
| `LLM_API_URL` | URL de l'API LLM de la compétition |
| `LLM_API_COOKIE` | Token d'authentification de l'API LLM |
| `LLM_MODEL` | Nom du modèle LLM |

Ces secrets sont injectés automatiquement dans les workflows CI (GitHub Actions).

### Pour les coéquipiers (développement local)

Le fichier `.env` n'est pas dans le dépôt (gitignored). Pour l'obtenir :

1. Demander le fichier `.env` complet à **Souleymane** via un canal sécurisé (WhatsApp, Discord DM).
2. Le placer à la racine du projet : `profmatch/.env`
3. Ne jamais le partager publiquement ni le committer.

```bash
# Vérifier que .env est bien présent
ls -la .env
```

---

## Prérequis

| Outil | Version minimale | Vérification |
|---|---|---|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | dernière | `docker --version` |
| [Git](https://git-scm.com/) | 2.x | `git --version` |
| [Node.js](https://nodejs.org/) | 20.x | `node --version` *(dev local seulement)* |
| [Python](https://www.python.org/) | 3.11+ | `python --version` *(dev local seulement)* |

> **Windows :** activer WSL2 lors de l'installation de Docker Desktop.  
> **Important :** Docker Desktop doit être **ouvert et en cours d'exécution** (icône verte dans la barre des tâches) avant toute commande `docker`.

---

## Installation et démarrage

### 1. Cloner le dépôt

```bash
git clone <url-du-repo>
cd profmatch
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Ouvrir `.env` et remplir **toutes** les valeurs vides :

```env
# Base de données
POSTGRES_USER=profmatch
POSTGRES_PASSWORD=profmatch
POSTGRES_DB=profmatch
DATABASE_URL=postgresql+asyncpg://profmatch:profmatch@localhost:5432/profmatch
TEST_DATABASE_URL=postgresql+asyncpg://profmatch:profmatch@localhost:5432/profmatch_test

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT — générer avec : python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=<générer une clé aléatoire>
JWT_ALGORITHM=HS256
JWT_TTL_HOURS=24

# API LLM — valeurs fournies par le coordinateur de la compétition
LLM_API_URL=<url fournie>
LLM_API_COOKIE=<token fourni>
LLM_MODEL=gpt-oss-ctx24k:120b
LLM_MAX_RETRIES=2

# Upload
UPLOAD_DIR=/app/uploads
MAX_UPLOAD_SIZE_MB=10
```

> ⚠️ **Ne jamais committer `.env`** — il est dans `.gitignore`.  
> Les valeurs `LLM_API_URL` et `LLM_API_COOKIE` sont fournies par le coordinateur de la compétition.

### 3. Lancer l'application

```bash
docker compose up --build
```

**Premier lancement** (~3 min) : Docker télécharge les images et installe les dépendances.  
**Lancements suivants** (~30 sec) : les couches sont en cache.

L'application est accessible sur :

| Service | URL |
|---|---|
| **Frontend** | http://localhost:3000 |
| **API** | http://localhost:8000 |
| **Documentation API (Swagger)** | http://localhost:8000/docs |

---

## Développement local (hot-reload)

Pour coder avec rechargement automatique sans rebuilder Docker à chaque modification :

### Backend

```bash
cd backend

# Créer le virtualenv (une seule fois)
python -m venv .venv

# Activer le virtualenv
# Windows :
.venv\Scripts\activate
# Mac/Linux :
source .venv/bin/activate

# Installer les dépendances (une seule fois)
pip install -e ".[dev]"

# Lancer FastAPI avec hot-reload
uvicorn app.main:app --reload --port 8000
```

> La base de données et Redis doivent tourner. Lancer d'abord : `docker compose up db redis -d`

### Frontend

```bash
cd frontend
npm install        # une seule fois
npm run dev        # démarre sur http://localhost:3000
```

### Worker Celery (si nécessaire)

```bash
cd backend
.venv\Scripts\activate  # ou source .venv/bin/activate
celery -A app.worker worker --loglevel=info
```

---

## Migrations de base de données

```bash
# Appliquer toutes les migrations en attente
docker compose exec backend alembic upgrade head

# Créer une nouvelle migration après modification d'un modèle SQLAlchemy
docker compose exec backend alembic revision --autogenerate -m "description_courte"

# Annuler la dernière migration
docker compose exec backend alembic downgrade -1
```

> **Règle :** toute modification d'un modèle SQLAlchemy doit être accompagnée d'une migration.  
> Nommer les migrations de façon descriptive : `add_embedding_to_professeurs`, pas `auto_1`.

---

## Données de démonstration

```bash
docker compose exec backend python scripts/seed_demo.py
```

Comptes créés :

| Rôle | Email | Mot de passe |
|---|---|---|
| Professeur | prof@defi-lacite.ca | Prof@LaCite2026! |
| Responsable RH | rh@defi-lacite.ca | Rh@LaCite2026! |
| Administrateur | admin@defi-lacite.ca | Admin@LaCite2026! |

> En **mode démo** (`DEMO_MODE=true`), ces 3 comptes sont créés automatiquement
> au démarrage de l'application — aucune commande à lancer.

---

## Tests et qualité

```bash
# Backend — tests avec couverture
docker compose exec backend pytest --cov=app --cov-report=term-missing

# Backend — en local
cd backend && .venv\Scripts\activate && pytest --cov=app

# Frontend — vérification TypeScript
cd frontend && npm run type-check

# Frontend — lint
cd frontend && npm run lint
```

Cible : **≥ 70 % de couverture** sur les fichiers modifiés.

---

## Commandes utiles

```bash
# Voir les logs d'un service
docker compose logs -f backend
docker compose logs -f worker
docker compose logs -f frontend

# Redémarrer un seul service
docker compose restart backend

# Arrêter tous les services
docker compose down

# Arrêter ET supprimer les volumes (repart de zéro)
docker compose down -v

# Ouvrir un shell dans le backend
docker compose exec backend bash
```

---

## Workflow Git (conventions obligatoires)

### Branches

```bash
git checkout -b feature/nom-court     # nouvelle fonctionnalité
git checkout -b fix/description       # correction de bug
git checkout -b chore/description     # tâche technique
```

### Commits (Conventional Commits)

```bash
git commit -m "feat(api): add CV upload endpoint"
git commit -m "fix(auth): handle expired JWT token"
git commit -m "docs(readme): update setup instructions"
```

**Types valides :** `feat` · `fix` · `docs` · `test` · `chore` · `refactor`  
**Scopes valides :** `api` · `auth` · `cv` · `pipeline` · `algo` · `frontend` · `db` · `docker` · `ci`

### Pull Requests

- Aucun commit direct sur `main` — toujours passer par une PR.
- Minimum **1 approbation** d'un autre membre avant le merge.
- Les pipelines CI (pytest + lint/type-check) doivent **passer** avant le merge.

---

## Structure du projet

```
profmatch/
├── backend/           # FastAPI + Celery
│   ├── app/
│   │   ├── main.py        # Point d'entrée FastAPI
│   │   ├── worker.py      # Configuration Celery
│   │   ├── core/          # Config, sécurité, dépendances
│   │   ├── db/            # Session SQLAlchemy
│   │   ├── models/        # Modèles ORM
│   │   ├── schemas/       # Schémas Pydantic
│   │   ├── services/      # Logique métier
│   │   ├── routers/       # Endpoints HTTP
│   │   └── tasks/         # Tâches Celery asynchrones
│   ├── alembic/           # Migrations
│   └── tests/             # Tests pytest
├── frontend/          # Next.js 16 + React 19
│   ├── app/           # Pages (App Router)
│   ├── components/    # Composants React
│   └── lib/           # API client, hooks, types
├── docs/features/     # Documentation FOR/OF (gitignored)
├── .claude/commands/  # Skills Claude Code (/feature-dev, /review, /pr, /db-migration)
├── .github/workflows/ # CI GitHub Actions
├── docker-compose.yml
├── .env.example       # Modèle de configuration
└── CLAUDE.md          # Conventions d'équipe
```

---

## Résolution des erreurs courantes

### Docker n'est pas démarré

```
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified
```

**Solution :** Ouvrir Docker Desktop et attendre l'icône verte, puis relancer `docker compose up --build`.

---

### Port déjà utilisé

```
Error: bind: address already in use
```

**Solution :** Identifier et arrêter le processus qui utilise le port :

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <pid> /F

# Mac/Linux
lsof -i :3000 && kill -9 <pid>
```

---

### package-lock.json désynchronisé

```
npm error `npm ci` can only install packages when your package.json and package-lock.json are in sync
```

**Solution :**

```bash
cd frontend
npm install          # régénère package-lock.json
# puis committer le nouveau package-lock.json
git add package-lock.json
git commit -m "chore(frontend): sync package-lock.json"
```

---

### Erreur de migration Alembic

```
sqlalchemy.exc.ProgrammingError: relation "xxx" does not exist
```

**Solution :**

```bash
docker compose exec backend alembic upgrade head
```

---

### Variables d'environnement manquantes

```
pydantic_core.ValidationError: ... Field required
```

**Solution :** Vérifier que toutes les variables de `.env.example` sont renseignées dans `.env`.

---

## Documentation

- [`CLAUDE.md`](./CLAUDE.md) — Conventions d'équipe, règles strictes, architecture
- [`PRD-ProfMatch.md`](../PRD-ProfMatch.md) — Document des exigences produit complet
- [Swagger UI](http://localhost:8000/docs) — Documentation interactive de l'API (application en cours)
