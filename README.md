# ProfMatch

Application web intelligente d'analyse de CV et d'affectation des professeurs aux cours, avec justifications explicables (XAI).

**Compétition :** Défi Informatique La Cité 2026 — 2ᵉ édition
**Équipe :** Souleymane Diallo · Mamadou Gando Baldé · Michel DONGMO · Arole KENFACK

Ce guide explique comment **installer et lancer ProfMatch** sur un poste d'évaluation. Tout est conteneurisé : aucune installation de Python, Node ou PostgreSQL n'est requise.

---

## Prérequis

| Outil | Vérification | Remarque |
|---|---|---|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | `docker --version` | Doit être **ouvert et démarré** (icône verte) avant toute commande `docker`. |
| [Git](https://git-scm.com/) | `git --version` | Pour cloner le dépôt. |

> **Windows :** activer **WSL2** lors de l'installation de Docker Desktop.

---

## Installation

### 1. Cloner le dépôt

```bash
git clone <url-du-depot>
cd profmatch
```

### 2. Créer le fichier `.env`

```bash
cp .env.example .env
```

Ouvrir `.env` et le compléter. **La base de données et Redis sont gérés automatiquement par Docker** — il suffit de renseigner une clé JWT et les accès à l'API LLM de la compétition :

```env
# Base de données (valeurs par défaut — gérées par Docker)
POSTGRES_USER=profmatch
POSTGRES_PASSWORD=profmatch
POSTGRES_DB=profmatch
DATABASE_URL=postgresql+asyncpg://profmatch:profmatch@db:5432/profmatch
TEST_DATABASE_URL=postgresql+asyncpg://profmatch:profmatch@db:5432/profmatch_test

# Redis (géré par Docker)
REDIS_URL=redis://redis:6379/0

# JWT — générer une clé : python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=<coller une clé aléatoire de 64 caractères>
JWT_ALGORITHM=HS256
JWT_TTL_HOURS=24

# API LLM — valeurs fournies par le coordinateur de la compétition
LLM_API_URL=<url fournie>
LLM_API_COOKIE=<token fourni>
LLM_API_KEY=<clé fournie si requise>
LLM_MODEL=gpt-oss-ctx24k:120b
LLM_MAX_RETRIES=2

# Upload des CV
UPLOAD_DIR=/uploads
UPLOADS_DIR=/uploads
MAX_UPLOAD_SIZE_MB=10
CELERY_ALWAYS_EAGER=false
```

> Si vous ne disposez pas d'une clé `SECRET_KEY`, générez-la avec une installation Python locale, un site de génération de jetons, ou copiez 64 caractères hexadécimaux aléatoires.

### 3. Lancer l'application

```bash
docker compose up --build
```

- **Premier lancement** (~3 min) : Docker télécharge les images et installe les dépendances.
- Les **migrations de base de données sont appliquées automatiquement** au démarrage.
- L'application est prête lorsque les services `backend`, `frontend`, `db` et `redis` sont en bonne santé.

---

## Accès à l'application

| Service | URL |
|---|---|
| **Interface web** | http://localhost:3000 |
| **API** | http://localhost:8000 |
| **Documentation API (Swagger)** | http://localhost:8000/docs |

---

## Comptes de démonstration

Une fois l'application lancée, créer les comptes et les données de démonstration (dans un **second terminal**, le premier exécutant `docker compose up`) :

```bash
docker compose exec backend python scripts/seed_demo.py
```

| Rôle | Courriel | Mot de passe |
|---|---|---|
| Professeur | prof@lacite.ca | demo1234 |
| Responsable RH | rh@lacite.ca | demo1234 |
| Administrateur | admin@lacite.ca | demo1234 |

> **Parcours de démonstration suggéré :** le **professeur** téléverse un CV → l'**administrateur** crée une session et configure les pondérations → le **RH** génère les affectations, consulte les justifications et valide.

---

## Exploitation courante

```bash
# Voir les logs en direct
docker compose logs -f backend
docker compose logs -f frontend

# Arrêter l'application
docker compose down

# Tout réinitialiser (supprime aussi la base de données)
docker compose down -v
```

---

## Dépannage

### Docker n'est pas démarré

```
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified
```

**Solution :** ouvrir Docker Desktop, attendre l'icône verte, puis relancer `docker compose up --build`.

### Un port est déjà utilisé (3000, 8000, 5432 ou 6379)

```
Error: bind: address already in use
```

**Solution :** libérer le port concerné.

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <pid> /F

# Mac/Linux
lsof -i :3000 && kill -9 <pid>
```

### Variables d'environnement manquantes

```
pydantic_core.ValidationError: ... Field required
```

**Solution :** vérifier que toutes les variables de `.env.example` sont renseignées dans `.env` (en particulier `SECRET_KEY` et les accès `LLM_*`).

---

## Architecture du projet

| Couche | Technologies |
|---|---|
| Frontend | Next.js 16 (App Router) · React 19 · Tailwind · shadcn/ui |
| Backend | FastAPI · SQLAlchemy 2.0 (async) · Pydantic v2 · Alembic |
| Base de données | PostgreSQL 16 |
| File de tâches | Celery · Redis 7 |
| IA | Extraction CV (pdfplumber / python-docx) · embeddings sémantiques · API LLM de la compétition |

```
profmatch/
├── backend/           # FastAPI + Celery
│   ├── app/
│   │   ├── core/          # Config, sécurité, dépendances
│   │   ├── models/        # Modèles SQLAlchemy
│   │   ├── schemas/       # Schémas Pydantic
│   │   ├── services/      # Logique métier (scoring, calendrier, pipeline)
│   │   ├── routers/       # Endpoints HTTP
│   │   └── tasks/         # Tâches Celery asynchrones
│   ├── alembic/           # Migrations de base de données
│   └── tests/             # Tests pytest
├── frontend/          # Next.js 16 + React 19
│   ├── app/           # Pages (App Router)
│   ├── components/    # Composants React
│   └── lib/           # Client API, hooks, types
├── docker-compose.yml # Orchestration des services
└── .env.example       # Modèle de configuration
```

---

## Documentation

- [`PRD-ProfMatch.md`](../PRD-ProfMatch.md) — document des exigences produit complet
- [Swagger UI](http://localhost:8000/docs) — documentation interactive de l'API (application lancée)
