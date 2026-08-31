> 🇬🇧 Le README principal du dépôt est en anglais : [README.md](README.md). Ce document est le guide d'installation français remis au jury de la compétition.

# ProfMatch

Application web intelligente d'analyse de CV et d'affectation des professeurs aux cours, avec justifications explicables (XAI).

**Compétition :** Défi Informatique La Cité 2026 — 2ᵉ édition
**Équipe :** Souleymane Diallo · Mamadou Gando Baldé · Michel DONGMO · Arole KENFACK

Ce guide explique comment **installer et lancer ProfMatch** sur un poste d'évaluation. Tout est conteneurisé : aucune installation de Python, Node ou PostgreSQL n'est requise.

---

## Prérequis

Un seul outil à installer : **Docker Desktop**.

| Outil | Vérification | Remarque |
|---|---|---|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | `docker --version` | Doit être **ouvert et démarré** (icône verte) avant toute commande `docker`. |

> **Windows :** activer **WSL2** lors de l'installation de Docker Desktop (proposé par l'installateur).

---

## Installation

### 1. Récupérer le projet

Décompresser l'archive **ProfMatch** reçue, puis ouvrir un terminal dans le dossier `profmatch/`.

### 2. Vérifier le fichier `.env`

Le fichier `.env` est **déjà fourni et pré-rempli** (clé JWT et accès à l'API LLM de la compétition). **Aucune valeur n'est à renseigner.** Vérifier simplement sa présence à la racine du dossier :

```bash
# Windows (PowerShell)
Test-Path .env       # doit afficher : True

# Mac / Linux
ls -la .env
```

> 🔒 Ce fichier contient des secrets : ne pas le partager publiquement ni le republier.

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

## Essayer sans compte — `/demo`

`POST /api/demo/sandbox` (ou le bouton **« Essayer sans compte »** de la page de
connexion) ouvre un **espace de démonstration jetable** : trois comptes
prof/rh/admin, une session académique à soi, et un bandeau qui annonce en
permanence le temps restant et les appels à l'IA encore accordés. Rien n'est
demandé au visiteur — ni adresse courriel, ni mot de passe — et tout est effacé
au bout d'une heure.

**Ce que le visiteur peut faire :** téléverser un CV, générer et valider des
affectations dans **sa** session, ajuster les pondérations W1–W4, lire les
justifications XAI, et passer d'un rôle à l'autre sans se reconnecter.

**Ce qu'il ne peut pas faire :** écrire dans le référentiel partagé (programmes,
cours, compétences) ni toucher aux sessions de l'établissement. Il les voit —
sans elles la génération n'aurait aucun candidat — mais en lecture seule.

**Ce qu'il ne voit pas :** les comptes, professeurs et CV d'un autre visiteur.
C'est le point qui a dicté la conception : quelqu'un peut très bien téléverser
son vrai CV.

Réglages : `DEMO_DUREE_MINUTES`, `DEMO_MAX_VIVANTS`, `DEMO_LIMITE_CREATIONS`,
`DEMO_FENETRE_MINUTES`, `DEMO_PURGE_INTERVALLE_SECONDES`, `DEMO_APPELS_IA`,
`DEMO_APPELS_IA_PAR_JOUR`.

---

## Comptes de démonstration

Les trois comptes sont **créés automatiquement au démarrage** — aucune action requise :

| Rôle | Courriel | Mot de passe |
|---|---|---|
| Professeur | prof@defi-lacite.ca | Prof@LaCite2026! |
| Responsable RH | rh@defi-lacite.ca | Rh@LaCite2026! |
| Administrateur | admin@defi-lacite.ca | Admin@LaCite2026! |

### Charger le jeu de données complet (optionnel)

Pour que la génération d'affectations propose immédiatement des candidats, charger le jeu de données riche (programmes, cours et ~11 professeurs avec CV traité) :

1. Se connecter en **administrateur**.
2. Dans l'espace admin, cliquer sur **« Charger le jeu de démo »**.

Opération idempotente (rejouable sans doublon). Sinon, le **professeur** peut téléverser un CV en direct pendant la démonstration.

> **Parcours de démonstration suggéré :** charger le jeu de démo (admin) → le **professeur** téléverse un CV → l'**administrateur** crée/configure une session et ses pondérations → le **RH** génère les affectations, consulte les justifications et valide.

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

**Solution :** vérifier que le fichier `.env` fourni est bien présent **à la racine du dossier `profmatch/`** (et non dans un sous-dossier). C'est la cause la plus fréquente.
