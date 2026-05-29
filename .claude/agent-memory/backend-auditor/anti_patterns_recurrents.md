---
name: anti-patterns-recurrents
description: Anti-patterns identifiés dans le backend ProfMatch — pour les suivre dans le temps sans les re-signaler à chaque audit.
metadata:
  type: project
---

Anti-patterns confirmés au 2026-05-28. Suivre leur résolution dans le temps.

**Why :** éviter de re-signaler à chaque audit les mêmes points déjà flaggés, ET savoir quand un point résolu réapparaît (régression).

**How to apply :** avant de signaler un point en audit, vérifier ici s'il est déjà connu. Si oui, ne le mentionner que si (a) il s'est aggravé ou (b) un commit récent y touche.

## Anti-patterns ACTIFS (à corriger un jour)

1. **A1 — God Object `services/affectation_service.py`** (640 LOC). Découpe envisagée en 4 modules (generation/lifecycle/status/ponderations) non priorisée pour la démo.

2. **A2 — Helper `core/crud_helpers.get_or_404` sous-utilisé** : seuls `routers/cours.py` et `routers/sessions.py` l'emploient. Les routers `etapes`, `cursus`, `cours_competences`, `extraction`, `programmes` redéfinissent localement leurs propres `_get_X_or_404`. ~50 LOC dupliquées.

3. **A3 — Schémas Pydantic v1 résiduels** : `schemas/auth.py:23` (`class Config`), `schemas/users.py:44` (`class Config`). Tous les autres schémas utilisent `model_config = {...}`.

4. **A4 — `cv_service.upload` lève `HTTPException` depuis un service** (`services/cv_service.py:27,34,42,120`). Couplage couche service → couche HTTP, incohérent avec le reste (qui utilise `ValueError`/exceptions custom).

5. **A5 — `GET /api/affectations/generation/{task_id}` sans `response_model`** (`routers/affectations.py:86`). Seul endpoint non typé Pydantic du backend. Pas de test pytest dédié.

6. **A6 — Logique métier dans router** : `routers/affectations.py:208-229` (autorisation prof = "voit uniquement ses affectations" implémentée dans le router, devrait être dans `affectation_service.get_for_user`).

7. **A7 — Imports tardifs non justifiés** dans `services/affectation_service.py` lignes 111, 421, 487, 572, 596 (pas de cycle réel, modèles importés au top dans le même fichier).

## Anti-patterns POTENTIELS (risques fonctionnels)

8. **R1 — `asyncio.gather` sans `return_exceptions`** dans `services/affectation_service.py:371`. Une seule exception non-attrapée du LLM annule TOUTES les autres justifications → la génération entière échoue avant `commit()`. Le fallback statique de `generer_justification_llm` couvre la majorité des cas mais pas les exceptions remontant du `to_thread` lui-même (timeout httpx avant entrée dans le try).

9. **R2 — Sémaphore XAI appliqué aussi quand `xai_actif=False`** (statique pur, pas d'I/O). Inutilement séquentialise le mode démo sans LLM.

10. **R3 — Backfill embeddings non transactionnel par chunk + pas de protection contre collision avec extractions Celery en parallèle**. Sur faible volume démo OK, mais piège connu pour reuse post-démo.

11. **R4 — `seed_historique_session` peut viser n'importe quelle `session_id`** : si une session a déjà des VALIDEE sans feedback, le seed les complète avec un faux feedback noté 4/5. Pas de garde-fou "session active vs terminée".

Lié : [[architecture-snapshot]]
