---
name: architecture-snapshot
description: État architectural figé du backend ProfMatch au 2026-05-28 (branche feature/perf-affectations-parallel) — pour comparaison aux audits suivants.
metadata:
  type: project
---

Snapshot du backend ProfMatch au 2026-05-28, après les 4 commits perf-affectations-parallel.

**Why :** sert de référence pour mesurer l'évolution entre audits — savoir si un God Object grossit, si la duplication recule, si la couverture progresse, sans tout recartographier à chaque fois.

**How to apply :** comparer un futur snapshot aux chiffres ci-dessous ; tout fichier qui dépasse ses lignes "audit précédent" ou tout nouveau service > 200 LOC mérite un examen ciblé. Ne pas re-signaler les God Objects déjà connus à moins que la situation change.

## LOC par couche

| Couche | LOC totale | Fichiers |
|---|---|---|
| services/ | ~1858 | 13 |
| routers/ | ~1693 | 14 |
| models/ | ~795 | 14 |
| schemas/ | ~644 | 7 |
| tasks/ | 123 | 3 |
| core/ | 144 | 4 |
| db/ | ~30 | 2 |
| tests/ | 7364 | 47 |

## God Objects connus (à surveiller pour grossissement)

- `services/affectation_service.py` : **640 LOC** (vs ~600 à l'audit précédent A1, +40 dus à phase 2 gather). 13 fonctions. Découpe naturelle = generation / lifecycle / status / ponderations.
- `routers/extraction.py` : **333 LOC** (8 endpoints CRUD répétitifs pour 4 entités). Factorisation = `extraction_crud_service`.
- `routers/affectations.py` : **265 LOC** (10 endpoints).
- `services/scoring.py` : 224 LOC (sain, formule + dataclasses).
- `schemas/affectation.py` : 182 LOC (cohérent).

## Nouveautés (4 commits branche)

- `services/backfill_service.py` (78 LOC) + endpoint admin `POST /api/admin/maintenance/backfill-embeddings`.
- `services/seed_historique.py` (74 LOC) + script `scripts/seed_historique_demo.py`.
- `XAI_MAX_CONCURRENCE=8` (semaphore) + gather parallèle dans `generer_affectations`.
- LLM client : `timeout=15s max_retries=0`.

## Architecture saine (ne pas re-signaler)

- 75 endpoints, 75 protégés par `require_role` (sauf health, login, activate — légitimes).
- Pas de SQL brut.
- Pas de secret en dur ; `Settings` Pydantic depuis `.env`.
- 14 migrations Alembic toutes nommées explicitement, `downgrade()` partout.
- `selectinload` partout dans le scoring (anti-N+1).
- `asyncio.to_thread` autour des CPU/I/O bloquants.
- Conftest `mock_llm_client` autouse + `mock_embedding_model` autouse — pas d'appel réseau réel en CI.

Lié : [[anti-patterns-recurrents]]
