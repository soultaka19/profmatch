# Spec PR-G — Saisie manuelle de CV

**Date :** 2026-05-25  
**Branche cible :** `feature/cv-manuel`  
**Priorité :** DOIT (bloque l'affectation des profs sans fichier CV)

---

## Contexte

Le dashboard prof (`/dashboard/prof`) impose actuellement l'upload d'un fichier PDF/DOCX pour passer le CV en statut `traite` et permettre la saisie des sections (compétences, expériences, formations, langues). Quand le LLM échoue ou que le prof n'a pas de fichier, il est bloqué.

PR-G ajoute un chemin alternatif : créer un CV manuel directement depuis l'UI, sans fichier, et remplir les sections une par une via les formulaires déjà existants.

---

## Approche retenue

**Colonne `source` sur le modèle `CV` + endpoint `POST /cv/me/manual`.**

Ajout d'une colonne `source: "upload" | "manual"` avec migration Alembic. Endpoint dédié crée un row CV avec `statut = TRAITE`, `source = MANUAL` et des valeurs sentinelles pour les champs fichier. Le reste de l'UI (CVExtractionPanel + sections CRUD) est inchangé.

---

## Backend

### 1. Modèle `CV` (`app/models/cv.py`)

Nouveau `CVSource` enum :
```python
class CVSource(str, Enum):
    UPLOAD = "upload"
    MANUAL = "manual"
```

Nouvelle colonne sur `CV` :
```python
source: Mapped[CVSource] = mapped_column(
    SQLEnum(CVSource, name="cvsource", values_callable=lambda e: [m.value for m in e]),
    nullable=False,
    default=CVSource.UPLOAD,
    server_default=CVSource.UPLOAD.value,
)
```

### 2. Migration Alembic

`alembic revision --autogenerate -m "add_cv_source_column"`  
Downgrade : `DROP COLUMN source` + `DROP TYPE cvsource`.

### 3. Schéma `CVResponse` (`app/schemas/cv.py`)

Ajoute :
```python
source: Literal["upload", "manual"]
```

### 4. Service `cv_service.py`

Nouvelle fonction :
```python
async def create_manual(current_user: User, db: AsyncSession) -> CV:
```
- Récupère le `Professeur` via `user_id`
- Si CV existant avec `statut IN (TRAITE, EN_ATTENTE, EN_COURS)` → lève `HTTPException(409, "Un CV actif existe déjà.")`
- Crée ou remplace le row CV : `nom_original="CV Manuel"`, `chemin_fichier="manual"`, `taille_octets=0`, `mime_type="manual"`, `statut=TRAITE`, `source=MANUAL`
- Commit + refresh → retourne le CV

Modification de `upload()` :
- Avant `old_path.unlink()`, vérifie `existing.source != CVSource.MANUAL` pour éviter une erreur sur un fichier inexistant.

### 5. Router `cv.py`

Nouveau endpoint :
```
POST /cv/me/manual
- Rôle : prof
- Body : (vide)
- Réponse : CVResponse 201
- Erreur : 409 si CV traité existe déjà
```

---

## Frontend

### 1. `lib/types/api.ts`

Ajoute `source: "upload" | "manual"` dans `CVResponse`.

### 2. `lib/api/cv.ts`

```typescript
createManual: (): Promise<CVResponse> =>
  apiClient.post<CVResponse>("/api/cv/manual"),
```

### 3. `/dashboard/prof/page.tsx`

**Quand `cv === null` (vide) ou `cv.statut === "erreur"` :**
- Affiche `CVDropzone` (existant)
- Affiche un bouton shadcn/ui `Button variant="outline"` : "Créer mon CV manuellement"
- Au clic : appel `cvApi.createManual()` (bouton en `loading` pendant l'appel), puis `mutate()`
- Erreur 409 → ignorée (cas de double-clic, SWR revalidera vers le CV existant)

**Quand `cv.statut === "traite"` et `cv.source === "manual"` :**
- Le libellé du bouton "Remplacer" dans `CVStatusCard` devient "Importer un fichier CV"
- Comportement identique (ouvre le dropzone)

### 4. `CVStatusCard.tsx`

Reçoit une prop optionnelle `isManual?: boolean`. Quand `true`, libellé "Importer un fichier CV" au lieu de "Remplacer le CV".

---

## Tests

### Backend (`pytest`)

| Test | Assertion |
|---|---|
| `test_create_manual_cv` | POST → 201, `statut=traite`, `source=manual` |
| `test_create_manual_cv_already_exists` | POST quand CV traité/en cours existant → 409 |
| `test_upload_replaces_manual_cv` | Upload après CV manuel → 200/201, pas d'exception sur `unlink` |
| `test_get_my_cv_includes_source` | GET `/cv/me` → champ `source` présent |

Couverture visée ≥ 70 % sur les fichiers modifiés.

### Frontend

Pas de nouveaux tests — les composants existants sont déjà couverts, la logique ajoutée dans `page.tsx` est triviale.

---

## Hors périmètre

- Pas d'import depuis LinkedIn / format texte libre
- Pas de wizard step-by-step (les sections existantes suffisent)
- Pas de suppression du CV manuel (le prof peut toujours uploader pour remplacer)

---

## Definition of Done

- [ ] Migration appliquée, downgrade fonctionnel
- [ ] `POST /cv/me/manual` : tests 201 + 409 verts
- [ ] Upload après CV manuel : pas d'erreur
- [ ] Frontend : bouton visible (vide + erreur), `CVExtractionPanel` s'affiche après création
- [ ] `npm run lint && npx tsc --noEmit` → 0 erreur
- [ ] `pytest --cov=app` ≥ 70 % sur fichiers modifiés
