# Design — PR-H : Override RH manuel (REV-04)

**Date :** 2026-05-25
**Branche :** `feature/override-rh-manuel`
**Exigence PRD :** REV-04 (DEVRAIT) — « Le RH peut affecter manuellement un autre professeur à un cours. Substitution stockée avec l'ID du RH comme auteur. »

---

## 1. Objectif

Permettre au RH, en phase de révision des affectations, d'**affecter manuellement** un professeur qui n'a pas été proposé par l'algorithme (hors top-3) à un cours d'une session. L'affectation manuelle :

- réutilise le **moteur de scoring existant** (W1–W4) pour rester cohérente avec les propositions algo et alimenter le `ScoreBreakdown` ;
- est créée **directement au statut `VALIDEE`** (le RH la choisit délibérément) ;
- est tracée avec l'**ID du RH comme auteur** (`valide_par_user_id`) et marquée d'une **origine** distincte (`manuel`) ;
- **n'altère pas** les autres propositions du même cours (pas de rejet automatique).

## 2. Décisions de conception (validées)

| Décision | Choix retenu |
|---|---|
| Score du prof affecté manuellement | **Calculé** via le moteur de scoring (réutilisé) |
| Statut résultant | **`VALIDEE`** immédiatement |
| Effet sur les autres candidats du cours | **Aucun** (on ajoute, on ne rejette pas) |
| Justification | **Statique** (`generer_justification_statique`), pas d'appel LLM |
| Traçabilité auteur | `origine=manuel` + `valide_par_user_id=<RH>` + `valide_le=now` |
| Vocabulaire | « professeurs **disponibles** » (et non « candidats ») |

## 3. Modèle de données

Ajout d'une colonne `origine` sur `affectations` :

```python
class AffectationOrigine(str, Enum):
    ALGO = "algo"       # proposée par l'algorithme de scoring
    MANUEL = "manuel"   # affectée manuellement par le RH

origine: Mapped[AffectationOrigine] = mapped_column(
    SQLEnum(
        AffectationOrigine,
        name="affectation_origine",
        values_callable=lambda e: [m.value for m in e],
    ),
    nullable=False,
    default=AffectationOrigine.ALGO,
    server_default="algo",
)
```

**Migration Alembic dédiée** (nom descriptif `add_affectation_origine_column`) :
- `upgrade` : créer l'enum `affectation_origine` (`checkfirst=True`) + `add_column` avec `server_default="algo"` (rétrocompat sur les lignes existantes).
- `downgrade` : `drop_column("affectations", "origine")` + `drop` du type enum (`checkfirst=True`).

La contrainte unique existante `uq_affectation_session_prof_cours (session_id, professeur_id, cours_id)` reste la garantie d'unicité ; la création manuelle fait un **upsert** sur ce triplet.

## 4. Service (`app/services/affectation_service.py`)

### 4.1 Refactor — extraction du scoring

La logique de scoring est aujourd'hui inline dans la boucle de `generer_affectations` (≈ lignes 213-281). On l'extrait en helper réutilisable :

```python
async def _scorer_paire(
    prof: Professeur,
    cours: Cours,
    competences_cours: list[CoursCompetence],
    poids: PoidsScoring,
    session_id: int,
    db: AsyncSession,
) -> tuple[Decimal, ScoresComposants, str]:
    """Calcule (score_total, composants W1–W4, justification statique) pour un couple prof↔cours."""
```

`generer_affectations` est réécrit pour appeler `_scorer_paire` (comportement identique, couvert par les tests existants). La fonction manuelle l'appelle aussi → scores strictement cohérents.

### 4.2 `creer_affectation_manuelle`

```python
async def creer_affectation_manuelle(
    session_id: int,
    professeur_id: int,
    cours_id: int,
    user_id: int,
    db: AsyncSession,
) -> Affectation:
```

Étapes :
1. Charger le prof (avec `competences`, `experiences`, `embedding`, `user`, `cv`) ; `ValueError("Professeur introuvable")` si absent.
2. Vérifier que le CV du prof est `traite` ; sinon `ValueError("CV non traité")` (→ 409).
3. Charger le cours (avec ses compétences) ; `ValueError("Cours introuvable")` si absent.
4. Charger les pondérations de la session (`_charger_ponderations`).
5. `_scorer_paire(...)` → score + composants + justification.
6. **Upsert** sur `(session_id, professeur_id, cours_id)` (la contrainte unique l'impose ; branche défensive même si le sélecteur UI exclut déjà ces profs) :
   - si une ligne existe (ex. le prof figurait déjà dans le top-3 proposé) → mettre à jour ses scores + champs ;
   - sinon → créer une nouvelle ligne ;
   - dans les deux cas : `statut=VALIDEE`, `origine=MANUEL`, `valide_par_user_id=user_id`, `valide_le=now(utc)`.
7. `commit` + `refresh`, retour de l'`Affectation`.

### 4.3 `lister_professeurs_disponibles`

```python
async def lister_professeurs_disponibles(
    session_id: int,
    cours_id: int,
    db: AsyncSession,
) -> list[tuple[int, str]]:
    """Profs avec CV traité n'ayant PAS déjà d'affectation pour ce (session, cours)."""
```

Renvoie `[(professeur_id, nom_complet)]` triés par nom. Exclut les profs déjà présents dans `affectations` pour ce couple `(session, cours)` (quel que soit leur statut) et ceux dont le CV n'est pas `traite` (garantit un scoring exploitable).

## 5. Schemas Pydantic (`app/schemas/affectation.py`)

```python
class AffectationManuelleCreate(BaseModel):
    session_id: int
    professeur_id: int
    cours_id: int

class ProfesseurDisponibleOut(BaseModel):
    professeur_id: int
    nom_complet: str
```

Ajout du champ `origine: AffectationOrigine` à `AffectationOut`.

## 6. Endpoints (`app/routers/affectations.py`)

| Méthode | Route | Rôle | Corps / Query | Réponse |
|---|---|---|---|---|
| `POST` | `/api/affectations/manuelle` | `rh` | `AffectationManuelleCreate` | `AffectationOut` (201) |
| `GET` | `/api/affectations/professeurs-disponibles` | `rh` | `?session_id=&cours_id=` | `list[ProfesseurDisponibleOut]` |

- `POST /manuelle` : appelle `creer_affectation_manuelle`, enrichit via `_to_out` (+ `_RELATIONS`). Mapping des erreurs : `ValueError` « introuvable » → `404`, « CV non traité » → `409`.
- Validation Pydantic systématique ; rôle via `Depends(require_role("rh"))`.

## 7. Frontend

### 7.1 API (`lib/api/affectations.ts`)

```ts
createManuelle(payload: { session_id: number; professeur_id: number; cours_id: number }): Promise<AffectationOut>
listProfesseursDisponibles(sessionId: number, coursId: number): Promise<ProfesseurDisponibleOut[]>
```

### 7.2 Types (`lib/types/api.ts`)

- `AffectationOut.origine: "algo" | "manuel"`
- `ProfesseurDisponibleOut { professeur_id: number; nom_complet: string }`

### 7.3 Composants

- **`AffectationTable`** : pour chaque section cours, un bouton **« + Affecter un autre professeur »** ouvre un `Dialog` (shadcn) contenant un `Select` peuplé via `listProfesseursDisponibles(sessionId, coursId)`. À la confirmation → `createManuelle(...)` → `mutate()` SWR (revalidation) + toast succès / erreur (via `ApiError.status` : 409 → message « CV non traité »).
- **`AffectationCard`** : badge **« Manuel »** affiché quand `origine === "manuel"`. Le `ScoreBreakdown` s'affiche normalement (score réel présent).

La page `app/dashboard/rh/affectations/page.tsx` passe `sessionId` et un callback de revalidation à `AffectationTable`.

## 8. Tests

### Backend
- **Service** :
  - `_scorer_paire` : cohérence des scores avec la génération (mêmes entrées → mêmes sorties).
  - `creer_affectation_manuelle` : création neuve (statut `VALIDEE`, `origine=MANUEL`, `valide_par_user_id` = RH, `valide_le` non nul, scores égaux à la sortie de `_scorer_paire`) ; **upsert** sur un prof déjà proposé ; `ValueError` si prof/cours introuvable ; `ValueError` si CV non `traite`.
  - `lister_professeurs_disponibles` : exclut les profs déjà affectés au couple `(session, cours)` et les profs sans CV `traite`.
- **Router** :
  - `POST /api/affectations/manuelle` happy path (201) ; 404 (prof/cours inconnu) ; 409 (CV non traité).
  - `GET /api/affectations/professeurs-disponibles` (liste correcte).
- Mock LLM via fixture autouse (aucun appel réel). Couverture ≥ 70 % sur fichiers modifiés.

### Frontend
- `AffectationCard` : badge « Manuel » présent ssi `origine === "manuel"`.
- Flux du `Dialog` : ouverture, peuplement du `Select`, confirmation déclenche `createManuelle` + revalidation (mock API).

## 9. Hors périmètre (YAGNI)

- Pas de justification LLM pour l'override (statique suffit, cohérent algo).
- Pas de rejet automatique des autres propositions du cours.
- Pas d'« édition » du prof sur une affectation déjà validée par l'algo (le flux manuel sert à ajouter **un autre** prof).
- Pas de contrainte « un seul prof validé par cours » (non exigée par REV-04).

## 10. Definition of Done

- Migration Alembic up/down testée (`upgrade head` puis `downgrade`).
- Chaque nouvel endpoint a ≥ 1 test pytest ; `pytest --cov=app` ≥ 70 % sur fichiers modifiés.
- `npm run lint && npx tsc --noEmit` : 0 erreur.
- Commits Conventional Commits (scopes `db|algo|api|frontend`), branche `feature/override-rh-manuel`.
- PR ouverte, CI verte.
