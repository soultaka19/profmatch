# Spec — Mode démo & package de livraison (Livrables 2 & 3)

**Date :** 2026-05-29
**Branche :** `feature/mode-demo-livraison`
**Compétition :** Défi Informatique La Cité 2026 — échéances L2 (31 mai 23 h 59) · L3 (4 juin)

---

## 1. Contexte & objectif

Le coordinateur demande pour le **Livrable 2** : dépôt du code source dans le répertoire d'équipe (Google Drive partagé), envoi par courriel du lien Git, et un fichier expliquant la procédure d'installation. Pour le **Livrable 3** (4 juin, avant passage jury) : version finale + vidéo de démo de secours recommandée.

**Objectif transverse :** rendre l'application **« clone-and-run »** pour le jury — installation, test et compréhension sans friction — tout en respectant les normes de sécurité et un niveau de finition professionnel.

L'application est mature : `README.md` complet, `docker-compose.yml` avec healthchecks, migrations Alembic appliquées automatiquement au démarrage (`backend/entrypoint.sh`). Ce qui manque pour une démo sans accroc : des données utilisables immédiatement, un login qui marche dès le premier lancement, et un package de soumission propre.

---

## 2. Décisions validées (avec le mainteneur)

| # | Décision |
|---|---|
| Dépôt code | **Google Drive partagé** — un ZIP de release y est déposé. |
| `.env` | **Jamais dans git.** Un `.env` rempli est ajouté manuellement dans le ZIP/Drive uniquement. |
| Visibilité GitHub | Repo **privé** + invitation du coordinateur en lecture. |
| Filet LLM | **Vidéo de secours** (pas de fallback runtime). Risque API neutralisé *par les données* (CV pré-traités + XAI pré-calculé dans le seed). |
| Orchestration | Un flag unique **`DEMO_MODE`** active l'auto-bootstrap des comptes + le panneau admin de seed/reset. Défaut `false` (sûr). |
| Découpage | **Phase A** (incontournable) + **Phase B** (forte valeur, si le temps le permet). |

---

## 3. Périmètre

**Dans le périmètre :**
- Flag `DEMO_MODE` (config Pydantic).
- Bootstrap idempotent des 3 comptes (admin/rh/prof) au démarrage, gardé par `DEMO_MODE`.
- Service de seed réutilisable (refactor des scripts CLI existants) incluant des CV déjà `cv_statut='traite'` + justifications XAI pré-calculées.
- Endpoints admin « charger le jeu de démo » et « réinitialiser », gardés `DEMO_MODE` + rôle admin (Phase B).
- Panneau admin frontend correspondant (Phase B).
- Artefacts de livraison : `INSTALL.md` dédié jury, script `make-release-zip.ps1`, gabarit de courriel, checklist préflight jour J.

**Hors périmètre (YAGNI) :**
- Tout fallback/cache LLM runtime (écarté — couvert par la vidéo + données pré-calculées).
- Réécriture de l'historique git (cf. §5).
- Gestion des fichiers Claude locaux non suivis (`.claude/agents/`, `frontend/.claude/`) — décision d'équipe, hors spec.
- Toute relance du LOT 1 (en attente de réunion d'équipe).

---

## 4. Architecture

### 4.1 Flag `DEMO_MODE` — `backend/app/core/config.py`
Ajout d'un champ Pydantic `DEMO_MODE: bool = False`. Source unique de vérité, lue partout via `settings.DEMO_MODE`. Ajouté aussi à `.env.example` (commenté) et au `.env` de livraison (= `true` pour le jury).

### 4.2 Bootstrap des 3 comptes — lifespan FastAPI
`main.py` n'a aujourd'hui **aucun** hook de démarrage. On ajoute un `lifespan` (contextmanager async passé à `FastAPI(lifespan=...)`).

- Au démarrage, **si `settings.DEMO_MODE`** : appel d'un service `ensure_demo_users(db)` **idempotent** (get-or-create sur l'email). Crée admin@lacite.ca / rh@lacite.ca / prof@lacite.ca (mot de passe `demo1234`, hashé bcrypt comme partout).
- Hors `DEMO_MODE` : ne fait rien (aucun compte à mot de passe connu en prod).
- Idempotent → aucun crash au redémarrage des conteneurs (`restart: unless-stopped`).
- Fonctionne en Docker **et** en uvicorn local (contrairement à un hook dans `entrypoint.sh` qui est spécifique au conteneur).

### 4.3 Service de seed réutilisable — `backend/app/services/demo_seed_service.py`
Aujourd'hui la logique de seed est éclatée entre `scripts/seed_demo.py`, `scripts/seed_affectation_demo.py`, `scripts/seed_historique_demo.py` et `services/seed_historique.py`. On consolide la logique **métier** dans un service appelable depuis :
1. les scripts CLI existants (conservés comme points d'entrée pour `docker compose exec`),
2. le lifespan (bootstrap minimal uniquement),
3. les endpoints admin (Phase B).

Deux niveaux exposés :
- `ensure_demo_users(db)` — bootstrap minimal : les 3 comptes seulement. L'app n'est jamais inutilisable.
- `load_demo_dataset(db)` — jeu riche : programmes, cours, profs **avec CV déjà traités** et **justifications XAI déjà persistées**, affectations d'exemple. Idempotent (upsert / skip-if-exists).

### 4.4 Endpoints admin (Phase B) — `routers/admin_maintenance.py`
Le router `/api/admin/maintenance` existe déjà (admin-only, contient `/backfill-embeddings`). On y ajoute :
- `POST /seed-demo` → `load_demo_dataset(db)`, renvoie des compteurs.
- `POST /reset` → vide les tables applicatives puis re-bootstrappe les 3 comptes.

**Garde commune :** une dépendance `require_demo_mode()` qui renvoie **404** si `DEMO_MODE` est `false` (l'endpoint n'existe pas en prod), en plus de `require_role("admin")`.

Le `/reset` : `TRUNCATE ... RESTART IDENTITY CASCADE` sur les tables applicatives dans **une transaction**, **jamais** sur `alembic_version` ni sur le schéma. La liste des tables est dérivée des métadonnées SQLAlchemy en excluant explicitement `alembic_version`.

### 4.5 Panneau admin frontend (Phase B)
Une carte sur la page admin (visible **uniquement si `DEMO_MODE`**, exposé via un champ `demo_mode` ajouté à la réponse `/health`, lu côté frontend) avec deux actions :
- **« Charger les données de démo »** → `POST /seed-demo`.
- **« Réinitialiser »** → modal de confirmation avec saisie du mot `RÉINITIALISER` avant `POST /reset`.
Composants shadcn/ui, appels via `lib/api/`, états de chargement/erreur explicites.

### 4.6 Fiabilité de la démo par les données
Le jeu riche (`load_demo_dataset`) persiste des profs `cv_statut='traite'` et leurs **justifications XAI déjà calculées en base**. À l'étape RH de la démo, la génération d'affectations et le récit XAI s'affichent **instantanément**, sans appel à l'API LLM instable (Cloudflare 524). Ce n'est pas un fallback runtime : ce sont des données de démo pré-remplies, 100 % légitimes.

### 4.7 Artefacts de livraison
- **`INSTALL.md`** (1 page, racine) : prérequis Docker → **une commande** → 3 comptes → URLs. Le `README.md` reste la doc exhaustive.
- **`make-release-zip.ps1`** : produit `profmatch-release.zip` reproductible, **excluant** `node_modules`, `.venv`, `.git`, `__pycache__`, `.pytest_cache`, `backend/htmlcov/`, contenu de `backend/uploads/`, et **`.env`** ; **incluant** code, `.env.example`, `README.md`, `INSTALL.md`, `docker-compose.yml`, `docs/`. Le `.env` rempli est ajouté **manuellement** au ZIP/Drive après coup.
- **Gabarit de courriel** au coordinateur : lien GitHub + mention de l'invitation collaborateur + pointeur vers `INSTALL.md`.
- **Checklist préflight jour J** : Docker lancé → `docker compose up` → login des 3 rôles → 1 affectation générée à blanc → vérification écran de démo.

---

## 5. Sécurité & garde-fous

- **Secrets hors git :** `.env` reste gitignored ; les secrets ne vivent que dans le `.env` du Drive. Le courriel GitHub ne contient aucun secret.
- **`SECRET_KEY` neuf** généré pour le `.env` de livraison (pas une clé de dev recyclée).
- **Comptes à mot de passe connu** (`demo1234`) : créés **uniquement** si `DEMO_MODE=true`. Jamais en prod.
- **Endpoints destructifs** (`/reset`, `/seed-demo`) : double garde `require_role("admin")` + `require_demo_mode()` (404 sinon). `/reset` ne touche jamais `alembic_version` ni le schéma. Confirmation explicite côté UI.
- **Cookie LLM `FC3yLm9Wyu4Fz7FS` présent dans l'historique git** (ancien `CLAUDE.md`) : **non purgé**. Raison : c'est un credential **partagé de la compétition** distribué à toutes les équipes dans le PDF officiel et déjà connu du coordinateur ; réécrire l'historique à J-2 (`git filter-repo`) casse tous les SHA, peut briser PRs/CI, pour un bénéfice marginal. Aucun secret **propre à l'équipe** (vrai `SECRET_KEY` de prod, vrais mots de passe) n'a été trouvé dans l'historique. Décision documentée et assumée.

---

## 6. Tests (règle CLAUDE.md : ≥ 1 test par endpoint, couverture ≥ 70 % sur fichiers modifiés)

- `ensure_demo_users` : idempotence (2 appels → 3 comptes, pas de doublon).
- `load_demo_dataset` : idempotence + présence de profs `cv_statut='traite'` avec justification XAI.
- `POST /seed-demo` & `POST /reset` : 200 en `DEMO_MODE`, **404 hors `DEMO_MODE`**, 403 si non-admin.
- `/reset` : `alembic_version` intacte après exécution.
- LLM toujours mocké (fixture autouse), jamais d'appel réel.

---

## 7. Découpage & échéancier

### Phase A — incontournable (avant L2, J-2) — *suffit à un Livrable 2 « clone-and-run »*
1. `DEMO_MODE` dans config + `.env.example`.
2. Lifespan + `ensure_demo_users` (3 comptes auto, gardés).
3. `demo_seed_service.load_demo_dataset` avec CV traités + XAI pré-calculé (réutilise/consolide les scripts existants).
4. `INSTALL.md` + `make-release-zip.ps1` + gabarit courriel.
5. Tests Phase A.

### Phase B — forte valeur ajoutée (si temps + feu vert réunion)
6. Endpoints `/seed-demo` et `/reset` gardés + tests.
7. Panneau admin frontend (Charger / Réinitialiser).

> Si la réunion d'équipe ou le temps manquent : on livre **A** (déjà impeccable) et **B** reste un bonus. Les scripts seed existants restent disponibles via `docker compose exec`.

### Jalons de livraison
- **L2 (31 mai) :** Phase A mergée → ZIP propre + `.env` rempli sur Drive → courriel lien GitHub + invitation coordinateur.
- **Entre L2 et L3 :** vidéo de démo (~5-8 min, scénario Prof→Admin→RH→sliders W1-W4).
- **L3 (4 juin) :** tag `v1.0`, version figée, checklist préflight, vidéo prête.

---

## 8. Risques

| Risque | Mitigation |
|---|---|
| API LLM tombe pendant la démo | Données pré-calculées (§4.6) + vidéo de secours. |
| Phase B pas finie à temps | Phasée comme bonus ; A est autosuffisant. |
| `/reset` vide une vraie base par erreur | Garde `DEMO_MODE` (404) + admin + confirmation + jamais `alembic_version`. |
| Régression sur `main` | Branche dédiée, PR + CI verte + 1 review avant merge (conventions). |
| Coordination équipe (LOT 1 en attente) | Aucune relance LOT 1 ; périmètre limité au mode démo / livraison. |
