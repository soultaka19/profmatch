Workflow complet d'implémentation d'une feature ProfMatch.

Feature à implémenter : $ARGUMENTS

---

## Étape 1 — Analyser la feature

Lis le CLAUDE.md du projet pour rappeler les conventions.
Identifie à quel domaine appartient la feature (auth, cv, pipeline, algo, frontend, db).
Identifie les fichiers à créer ou modifier selon cette matrice :

**Backend :**
- `app/models/` → modèle SQLAlchemy si nouvelle table ou colonne
- `app/schemas/` → schémas Pydantic request/response
- `app/services/` → logique métier
- `app/routers/` → endpoints HTTP (délèguent aux services, pas de logique)
- `app/tasks/` → uniquement si traitement asynchrone Celery
- `tests/` → un fichier de test par router ou service modifié

**Frontend :**
- `components/` → composants React réutilisables
- `app/dashboard/` → pages Next.js (App Router)
- `lib/api/` → appels API centralisés
- `lib/hooks/` → hooks SWR/React personnalisés
- `lib/types/` → types TypeScript des réponses API

Présente la liste des fichiers que tu vas créer ou modifier, et attends la validation avant de coder.

---

## Étape 2 — Préparer la branche Git

Vérifie la branche courante avec `git branch --show-current`.
Si on n'est pas sur une branche `feature/`, crée-la :

```bash
git checkout -b feature/<nom-court-kebab-case>
```

Le nom de branche doit être en kebab-case, court, et décrire la feature.
Exemple : `feature/cv-upload`, `feature/affectation-algo`, `feature/auth-jwt`

---

## Étape 3 — Implémenter dans l'ordre suivant (backend)

Respecte cet ordre strict pour éviter les dépendances circulaires :

1. **Model SQLAlchemy** (si table nouvelle ou modifiée)
   - Dans `app/models/<domaine>.py`
   - Hérite de `Base` (importée depuis `app/db/base.py`)
   - Type hints sur toutes les colonnes
   - Pas de logique métier dans les modèles

2. **Schémas Pydantic** (request + response)
   - Dans `app/schemas/<domaine>.py`
   - Un schéma `Create`, un `Out`, un `Update` si nécessaire
   - Utilise `model_config = ConfigDict(from_attributes=True)` pour les schémas ORM

3. **Service**
   - Dans `app/services/<domaine>_service.py`
   - Fonctions async uniquement (`async def`)
   - Reçoit `AsyncSession` en paramètre, jamais importée directement
   - Pas d'import de `Request` FastAPI — logique pure

4. **Router**
   - Dans `app/routers/<domaine>.py`
   - Délègue immédiatement au service : max 3 lignes par endpoint
   - Utilise `Depends(get_current_user)` et `Depends(require_role("rh"))` selon le rôle
   - Décore avec le tag métier pour grouper dans Swagger

5. **Enregistrement du router** dans `app/main.py`

6. **Tâche Celery** (uniquement si traitement asynchrone)
   - Dans `app/tasks/`
   - Retourne un `task_id` immédiatement, traitement en arrière-plan

---

## Étape 4 — Implémenter (frontend)

1. **Types TypeScript** dans `lib/types/` — décrire la réponse API exacte
2. **Fonction API** dans `lib/api/<domaine>.ts` — utilise le `client.ts` central
3. **Hook SWR** dans `lib/hooks/` si polling ou données partagées
4. **Composant** dans `components/<domaine>/` — props typées, pas de `any`
5. **Page** dans `app/dashboard/<role>/` — importe le composant, gère le layout

**Règles frontend :**
- shadcn/ui pour tous les éléments UI de base (boutons, inputs, cards, badges)
- Tailwind uniquement pour le layout et les overrides de design tokens
- Pas d'appel API direct dans les composants — passer par `lib/api/`
- TypeScript strict : zéro `any`, zéro `@ts-ignore`

---

## Étape 5 — Écrire les tests

**Backend :**
- Fichier `tests/test_<domaine>.py`
- Utilise les fixtures de `conftest.py` : `client`, `db`, `auth_headers_prof`, `auth_headers_rh`, `auth_headers_admin`
- Mocker l'API LLM avec `pytest-mock` — ne jamais appeler l'API réelle
- Couvrir : cas nominal, cas d'erreur (400/403/404/422), accès sans auth (401)

```python
# Structure type d'un test
async def test_<action>_<contexte>(client, auth_headers_rh, db):
    response = await client.post("/api/<endpoint>", json={...}, headers=auth_headers_rh)
    assert response.status_code == 200
    data = response.json()
    assert data["<champ>"] == <valeur_attendue>
```

**Frontend :**
- `npm run lint && npm run type-check` doit passer sans erreur

---

## Étape 6 — Vérifier les règles strictes

Avant de déclarer la feature terminée, vérifie chaque point :

**Sécurité :**
- [ ] Aucun secret en dur dans le code
- [ ] Validation Pydantic sur tous les nouveaux endpoints
- [ ] Vérification de rôle via `Depends(require_role(...))` sur les routes protégées
- [ ] Pas de SQL brut — SQLAlchemy ORM uniquement

**Architecture :**
- [ ] Aucune logique métier dans les routers
- [ ] Aucun import de router dans les services
- [ ] Toutes les fonctions publiques ont des type hints

**Qualité :**
- [ ] `pytest --cov=app` ≥ 70% sur les fichiers modifiés
- [ ] `npm run lint && npm run type-check` sans erreur

---

## Étape 7 — Documenter

Crée deux fichiers dans `docs/features/` :

**`docs/features/FOR<nom-feature>.md`** — ce qui a été implémenté :
```markdown
# FOR<nom-feature>

## Ce qui a été implémenté
- [liste des fichiers créés/modifiés]
- [endpoints ajoutés avec méthode + route]
- [modèles DB ajoutés ou modifiés]
- [composants frontend créés]

## Comment tester
- [commandes à lancer]
- [cas nominaux à vérifier]
- [données de test utilisées]

## Dépendances
- [features ou services dont dépend cette feature]
- [ce qui dépend de cette feature]
```

**`docs/features/OF<nom-feature>.md`** — ce qui a été appris :
```markdown
# OF<nom-feature>

## Erreurs rencontrées
(à compléter au fil de l'implémentation)

## Enseignements
(à compléter)

## Règles ajoutées au CLAUDE.md
(à compléter si une nouvelle convention a été introduite)
```

---

## Étape 8 — Commit

Format obligatoire (Conventional Commits) :
```
feat(<scope>): <description en anglais, impératif, max 72 chars>
```

Scopes valides : `api` · `auth` · `cv` · `pipeline` · `algo` · `frontend` · `db` · `docker` · `ci`

Propose le message de commit avant de le créer.
