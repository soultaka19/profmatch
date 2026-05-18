Effectue une revue de code complète des changements en cours avant le commit ou la PR.

Cible optionnelle : $ARGUMENTS (si vide, analyse tous les fichiers modifiés)

---

## Collecte des changements

```bash
git diff HEAD
git diff --cached
git status
```

Si $ARGUMENTS est précisé (ex: `backend/app/routers/cv.py`), analyser uniquement ce fichier.

---

## Grilles d'analyse

### 1. Architecture (critique)

**Backend :**
- [ ] Les routers ne contiennent que le minimum HTTP : valider, déléguer au service, retourner
- [ ] Toute logique métier est dans `services/`, jamais dans `routers/`
- [ ] Les services reçoivent `AsyncSession` en paramètre — pas d'import global de session
- [ ] Pas d'import circulaire entre models → schemas → services → routers
- [ ] Les tâches Celery (`tasks/`) délèguent aux services, pas l'inverse

**Frontend :**
- [ ] Les pages (`app/dashboard/`) importent des composants, pas du code API direct
- [ ] Les appels API passent par `lib/api/`, jamais `fetch()` en dur dans un composant
- [ ] Les hooks SWR sont dans `lib/hooks/`, réutilisables

### 2. Sécurité (critique)

- [ ] Aucun secret, token, mot de passe, ou clé API en dur dans le code
- [ ] Aucune variable d'environnement sensible loggée (`print`, `logger.debug`)
- [ ] Tous les endpoints FastAPI ont une dépendance d'authentification (`Depends(get_current_user)`)
- [ ] Les routes sensibles ont une vérification de rôle (`Depends(require_role("rh"))`)
- [ ] Pas de SQL brut — uniquement SQLAlchemy ORM
- [ ] Les mots de passe sont hachés avec `passlib[bcrypt]`, jamais SHA256/MD5
- [ ] La taille et le format des fichiers CV sont validés avant traitement
- [ ] Validation Pydantic sur TOUS les nouveaux endpoints — pas de `dict` brut accepté

### 3. Qualité du code

**Python :**
- [ ] Type hints sur toutes les fonctions publiques
- [ ] Fonctions async (`async def`) pour tous les handlers FastAPI et services DB
- [ ] Modèles Pydantic v2 : `model_config = ConfigDict(from_attributes=True)` pour les schémas ORM
- [ ] Pas de `except Exception` sans logging de l'erreur
- [ ] Les valeurs de retour sont des schémas Pydantic, pas des `dict` bruts

**TypeScript :**
- [ ] Zéro `any` dans le code modifié
- [ ] Zéro `@ts-ignore` ou `// eslint-disable`
- [ ] Toutes les réponses API sont typées via `lib/types/`
- [ ] Les props des composants React sont typées (interface Props)

### 4. LLM / IA (si applicable)

- [ ] Les prompts LLM suivent le framework ASPECCT (Action, Steps, Persona, Examples, Context, Constraints, Template)
- [ ] La sortie LLM est toujours du JSON validé par un modèle Pydantic
- [ ] La logique de retry (max 2×) est implémentée pour les `ValidationError`
- [ ] Le 2e retry injecte l'erreur explicite dans le prompt
- [ ] Le `task_id` est retourné immédiatement, le traitement LLM est dans un worker Celery

### 5. Base de données (si applicable)

- [ ] Toute modification de modèle SQLAlchemy est accompagnée d'une migration Alembic
- [ ] La migration a un `downgrade()` implémenté (pas juste `pass`)
- [ ] Le nom de la migration est descriptif : `add_embedding_to_professeurs`, pas `auto_1`
- [ ] Les nouvelles colonnes NOT NULL ont une valeur par défaut ou une migration de données

### 6. Tests

- [ ] Chaque nouvel endpoint a au moins un test dans `tests/`
- [ ] Les appels LLM sont mockés avec `pytest-mock` — pas d'appels réels dans les tests
- [ ] Les cas d'erreur sont testés : 401 (sans auth), 403 (mauvais rôle), 404, 422

### 7. Conventions Git

- [ ] Le message de commit suit le format Conventional Commits : `type(scope): description`
- [ ] Le scope est valide : `api` · `auth` · `cv` · `pipeline` · `algo` · `frontend` · `db` · `docker` · `ci`
- [ ] La description est en anglais, à l'impératif, max 72 caractères

---

## Rapport de revue

Présente les résultats sous ce format :

```
## Revue de code — <nom du fichier ou feature>

### Bloquants (à corriger avant le commit)
- [liste des problèmes critiques avec la ligne concernée]

### Avertissements (à corriger avant la PR)
- [liste des points à améliorer]

### Points positifs
- [ce qui est bien fait]

### Verdict
✅ Prêt pour le commit  /  ⛔ Corrections requises
```

Si des corrections sont nécessaires, propose le code corrigé directement.
