# Spec — `feature/affectation-db`

**Date** : 2026-05-22  
**Auteur** : Souleymane Diallo  
**Pipeline Superpowers** : brainstorming ✓ → writing-plans → impl Phase 1 backend → FOR/OF → PR  
**Branche** : `feature/affectation-db` (créée depuis `main` à `c71a2b3`)

---

## 1. Objectif

Poser la couche persistance de la chaîne d'affectation : tables qui matérialisent en BDD les notions manipulées par `app/services/scoring.py` et le futur orchestrateur (`affectation-service`).

Cette feature **ne contient ni service métier ni endpoint** — uniquement modèles SQLAlchemy + migration Alembic + tests d'invariants. Elle débloque toutes les features avals (F2 service, F3 XAI, F4 API, F5 frontend RH, F6 frontend ponderations).

## 2. Périmètre — IN

| # | Élément | Détail |
|---|---|---|
| 1 | `Session` | Session académique : `code` (ex. `A2026`), `nom`, `date_debut`, `date_fin`, `statut` |
| 2 | `Cours` | `code` (ex. `PI-301`), `titre`, `description`, `programme`, `session_id` (FK) |
| 3 | `CompetenceCours` | 1-N owned-by-Cours : `nom: String(120)` — miroir du pattern `Competence` côté Professeur |
| 4 | `Affectation` | `professeur_id`, `cours_id`, `session_id`, score_global + 4 sous-scores `DECIMAL(4,3)`, `justification: Text`, `statut`, `valide_par_user_id`, `valide_le` |
| 5 | `AffectationFeedback` | `affectation_id`, `note_rh` (1-5), `commentaire` — alimente W3 historique dans F2 |
| 6 | `PonderationsSession` | `session_id`, `w1`, `w2`, `w3`, `w4` `DECIMAL(4,3)`, defaults 0.40/0.30/0.20/0.10 |
| 7 | Migration Alembic | `add_affectation_tables` — autogenerate, downgrade testé |
| 8 | Tests pytest | Création, contraintes FK, invariant W=1.0, unicité, cascade delete, défauts |

## 3. Périmètre — OUT (explicite)

- Aucun service `app/services/affectation_*.py`
- Aucun router REST `app/routers/affectations.py`
- Aucun seed de cours / professeurs / sessions
- Aucun champ embedding (vecteur) — déféré à F2 où le service en aura besoin
- Aucun frontend
- Aucun appel LLM

**Justification** : "Une PR = un scope" (CLAUDE.md). Garder F1 strictement persistance permet un review rapide et débloque les 4-5 features avals en parallèle.

## 4. Modèles détaillés

### 4.1 `Session` (table `sessions`)

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | `BigInteger` | PK, autoincrement |
| `code` | `String(20)` | unique, not null — ex. `A2026`, `H2027` |
| `nom` | `String(120)` | not null — ex. "Automne 2026" |
| `date_debut` | `Date` | not null |
| `date_fin` | `Date` | not null |
| `statut` | `Enum(SessionStatut)` | not null, default `PLANIFIEE` — `planifiee / active / cloturee` |
| `cree_le` | `DateTime(tz=True)` | server_default `now()` |
| `mis_a_jour_le` | `DateTime(tz=True)` | server_default `now()`, onupdate `now()` |

**Relations** : `cours: list[Cours]`, `affectations: list[Affectation]`, `ponderations: PonderationsSession | None`.

### 4.2 `Cours` (table `cours`)

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | `BigInteger` | PK |
| `session_id` | `BigInteger` | FK `sessions.id` ON DELETE CASCADE, indexed, not null |
| `code` | `String(20)` | not null — ex. `PI-301` |
| `titre` | `String(200)` | not null |
| `description` | `Text` | nullable |
| `programme` | `String(120)` | nullable — ex. "PI", "IAI" |
| `cree_le`, `mis_a_jour_le` | idem | |

**Unicité** : `UNIQUE(session_id, code)` — un même code de cours peut réapparaître entre sessions.

### 4.3 `CompetenceCours` (table `competences_cours`)

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | `BigInteger` | PK |
| `cours_id` | `BigInteger` | FK `cours.id` ON DELETE CASCADE, indexed, not null |
| `nom` | `String(120)` | not null |
| `cree_le` | `DateTime(tz=True)` | server_default `now()` |

**Justification** : miroir exact de `Competence.nom: String(120)` côté `Professeur`. Permet `score_competences(set_prof, set_cours)` sans transformation.

### 4.4 `Affectation` (table `affectations`)

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | `BigInteger` | PK |
| `session_id` | `BigInteger` | FK `sessions.id` ON DELETE CASCADE, indexed, not null |
| `professeur_id` | `BigInteger` | FK `professeurs.id` ON DELETE CASCADE, indexed, not null |
| `cours_id` | `BigInteger` | FK `cours.id` ON DELETE CASCADE, indexed, not null |
| `score_global` | `Numeric(4,3)` | not null |
| `score_competences` | `Numeric(4,3)` | not null |
| `score_experience` | `Numeric(4,3)` | not null |
| `score_historique` | `Numeric(4,3)` | not null |
| `score_semantique` | `Numeric(4,3)` | not null |
| `justification` | `Text` | nullable (XAI statique injectée par F2, LLM par F3) |
| `statut` | `Enum(AffectationStatut)` | not null, default `PROPOSEE` — `proposee / validee / rejetee` |
| `valide_par_user_id` | `BigInteger` | FK `users.id` ON DELETE SET NULL, nullable |
| `valide_le` | `DateTime(tz=True)` | nullable |
| `cree_le`, `mis_a_jour_le` | idem | |

**Unicité** : `UNIQUE(session_id, professeur_id, cours_id)` — éviter les doublons sur une même session.

**Justification** : permet de stocker plusieurs candidatures par cours (le top 3 RH) sans collision.

### 4.5 `AffectationFeedback` (table `affectation_feedbacks`)

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | `BigInteger` | PK |
| `affectation_id` | `BigInteger` | FK `affectations.id` ON DELETE CASCADE, indexed, not null |
| `note_rh` | `SmallInteger` | not null, CHECK `note_rh BETWEEN 1 AND 5` |
| `commentaire` | `Text` | nullable |
| `cree_par_user_id` | `BigInteger` | FK `users.id` ON DELETE SET NULL, nullable |
| `cree_le` | `DateTime(tz=True)` | server_default `now()` |

### 4.6 `PonderationsSession` (table `ponderations_sessions`)

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | `BigInteger` | PK |
| `session_id` | `BigInteger` | FK `sessions.id` ON DELETE CASCADE, **unique**, not null |
| `w1` | `Numeric(4,3)` | not null, default `0.400` |
| `w2` | `Numeric(4,3)` | not null, default `0.300` |
| `w3` | `Numeric(4,3)` | not null, default `0.200` |
| `w4` | `Numeric(4,3)` | not null, default `0.100` |
| `mis_a_jour_le` | `DateTime(tz=True)` | onupdate `now()` |

**Invariant DB** : `CheckConstraint("ABS((w1+w2+w3+w4) - 1.0) <= 0.001", name="ck_ponderations_somme_1")` — défense en profondeur en complément de `PoidsScoring.__post_init__` (scoring.py:43) qui valide côté service.

**Auto-création** : un listener `after_insert` sur `Session` insère une `PonderationsSession` avec les défauts — symétrique au listener `_create_professeur_for_prof_user` (professeur.py:76).

## 5. Enums (Python `str, Enum`)

```python
class SessionStatut(str, Enum):
    PLANIFIEE = "planifiee"
    ACTIVE = "active"
    CLOTUREE = "cloturee"

class AffectationStatut(str, Enum):
    PROPOSEE = "proposee"
    VALIDEE = "validee"
    REJETEE = "rejetee"
```

**Convention SQLEnum** : `values_callable=lambda e: [m.value for m in e]` (lowercase en BDD), `name="session_statut"` / `name="affectation_statut"` — cohérent avec `competence_niveau` et `source_origine` existants.

## 6. Migration Alembic

Fichier généré : `alembic/versions/<rev>_add_affectation_tables.py`

**Ordre `upgrade()`** :
1. Create enums `session_statut`, `affectation_statut`
2. Create `sessions`
3. Create `cours` (FK `sessions`)
4. Create `competences_cours` (FK `cours`)
5. Create `ponderations_sessions` (FK `sessions`, CHECK W=1)
6. Create `affectations` (FK `sessions`, `professeurs`, `cours`, `users`)
7. Create `affectation_feedbacks` (FK `affectations`, `users`)

**Ordre `downgrade()`** : inverse strict + drop des enums.

**Vérifications** :
- `alembic upgrade head` puis `alembic downgrade -1` puis `alembic upgrade head` sans erreur sur Postgres test.
- Les FK ON DELETE CASCADE / SET NULL sont préservées.

## 7. Tests (`backend/tests/test_affectation_models.py`)

| # | Test | Cas |
|---|---|---|
| 1 | `test_session_creee_avec_ponderations_par_defaut` | Insérer Session → PonderationsSession auto-créée avec 0.4/0.3/0.2/0.1 |
| 2 | `test_session_code_unique` | Insérer 2 sessions avec même code → `IntegrityError` |
| 3 | `test_cours_unique_par_session` | 2 cours `PI-301` dans même session → `IntegrityError`, dans 2 sessions différentes → OK |
| 4 | `test_competences_cours_cascade_delete` | Supprimer Cours → CompetenceCours associées supprimées |
| 5 | `test_affectation_unique_triplet` | 2 affectations sur même (session, prof, cours) → `IntegrityError` |
| 6 | `test_affectation_cascade_delete_par_session` | Supprimer Session → Affectations supprimées |
| 7 | `test_affectation_cascade_delete_par_professeur` | Supprimer Professeur → ses Affectations supprimées |
| 8 | `test_affectation_valide_par_set_null_si_user_supprime` | Supprimer User RH → `valide_par_user_id` passe à NULL, affectation conservée |
| 9 | `test_feedback_note_rh_check_constraint` | `note_rh=0` ou `note_rh=6` → `IntegrityError` ; `note_rh=3` OK |
| 10 | `test_feedback_cascade_delete_par_affectation` | Supprimer Affectation → Feedbacks supprimés |
| 11 | `test_ponderations_invariant_w_somme_1` | W=(0.5, 0.5, 0.5, 0.5) → `IntegrityError` ; W=(0.4, 0.3, 0.2, 0.1) → OK ; W=(0.4, 0.3, 0.2, 0.1005) tolérance → OK |
| 12 | `test_ponderations_unique_par_session` | 2 PonderationsSession pour même session → `IntegrityError` |
| 13 | `test_score_decimal_precision` | Stocker `Decimal("0.840")` puis relire → précision conservée (DECIMAL(4,3)) |

## 8. Pièges à éviter (issus de `feedback_profmatch_workflow`)

- **Imports modèles** : ajouter les 6 nouveaux modèles dans `app/models/__init__.py` ET dans `alembic/env.py`. **Pas** dans `app/db/base.py` (import circulaire).
- **Listener `after_insert`** sur Session : pattern déjà validé sur Professeur. Reproduire à l'identique.
- **pytest-asyncio function-scoped** : utiliser `db_session` fixture existant (conftest.py:24).
- **Enum lowercase** : ne pas oublier `values_callable` (regression sur PR #7).
- **CHECK constraint Numeric** : sous Postgres natif, `ABS()` fonctionne sur `NUMERIC`. Tester explicitement sur Postgres (pas SQLite).
- **`onupdate=func.now()`** : valable uniquement quand la modif passe par l'ORM. Acceptable pour MVP.

## 9. Definition of Done (alignée CLAUDE.md)

- [x] Tous les modèles ont une docstring courte
- [ ] `pytest backend/tests/test_affectation_models.py` : 13 tests verts
- [ ] `pytest --cov=app/models --cov-report=term-missing` ≥ 70 %
- [ ] `alembic upgrade head && alembic downgrade -1 && alembic upgrade head` sans erreur
- [ ] PR ouverte avec corps respectant Conventional Commits (`feat(db):`)
- [ ] `docs/features/FORaffectation-db.md` + `OFaffectation-db.md` créés
- [ ] CLAUDE.md inchangé (pas de nouvelle convention introduite)

## 10. Dépendances et ce qui dépend de F1

**Dépend de** :
- `users`, `professeurs` (déjà mergés en PR #3 et #4)
- `app/services/scoring.py` (PR #12, sert de contrat pour les noms de sous-scores)

**Bloque** :
- F2 `affectation-service` : orchestrateur qui peuplera `affectations` à partir de `scoring.py`
- F3 `affectation-xai` : LLM justification écrira dans `affectations.justification`
- F4 `affectation-api` : router REST
- F5 frontend RH
- F6 frontend Admin sliders (lit/écrit `ponderations_sessions`)
- `gestion-academique` (Admin CRUD cours/sessions) peut démarrer en parallèle après F1

## 11. Risques et mitigation

| Risque | Probabilité | Mitigation |
|---|---|---|
| CHECK constraint Postgres rejette `Numeric` literals | Moyenne | Tester explicitement le test #11 avant de figer la migration |
| Listener `after_insert` Session ne déclenche pas dans pytest async | Faible | Pattern déjà validé sur Professeur — réutiliser le test idiomatique |
| Cascade delete trop agressive | Faible | Tests #6/#7/#10 valident le comportement avant merge |
| Auto-gen Alembic produit des `op.add_column` orphelins | Faible | Revue manuelle systématique de la migration avant commit |

---

*Spec validée par : (à compléter)*  
*Prochaine étape : `writing-plans` → plan TDD task-par-task.*
