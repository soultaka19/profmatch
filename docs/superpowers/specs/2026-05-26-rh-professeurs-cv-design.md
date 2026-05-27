# Conception — Consultation RH des CV des professeurs

**Date :** 2026-05-26
**Branche :** `feature/rh-professeurs-cv`
**Statut :** approuvée

## Objectif

Permettre au rôle `rh` de consulter, **en lecture seule**, la liste des
professeurs et de prévisualiser le profil extrait de leur CV dans un drawer
latéral (depuis la droite). Aucune modification des données prof, de
l'affectation, du scoring ou du thème global.

## Périmètre

**Inclus**
- Page RH `/dashboard/rh/professeurs` avec liste paginée + recherche.
- Drawer latéral (sheet) affichant le profil structuré d'un professeur.
- Endpoints backend RH en lecture seule (GET uniquement).

**Exclus (doivent rester intacts)**
- Fonctionnalités d'affectation et règles de scoring.
- Système de thème global.
- Toute écriture sur les données / le CV d'un professeur depuis l'espace RH.
- Texte brut du CV (décision : on n'affiche que les données structurées).

## Décisions de conception

1. **Pagination côté serveur** : `page`, `page_size`, `q` (recherche).
2. **Liste = tous les professeurs**, avec un badge de statut CV (y compris
   « aucun CV »).
3. **Données structurées uniquement** dans le drawer (pas de texte brut).
4. **Composants d'affichage read-only dédiés** : on ne réutilise pas les
   sections éditables de l'espace prof (`CompetenceSection`, etc.) afin de
   garantir l'absence de toute action de mutation.

## Backend

### Router — `app/routers/rh_professeurs.py`
Monté dans `main.py` : `prefix="/api/rh/professeurs"`, `tags=["rh-professeurs"]`.
Tous les endpoints protégés par `Depends(require_role("rh"))`. **GET uniquement.**

| Méthode | Chemin | Description |
|---|---|---|
| GET | `/api/rh/professeurs` | Liste paginée. Query : `page` (≥1, défaut 1), `page_size` (1–100, défaut 10), `q` (optionnel). |
| GET | `/api/rh/professeurs/{professeur_id}` | Détail du profil complet. 404 si introuvable. |

- `q` filtre `User.nom_complet` **ou** `User.email` en `ILIKE %q%`.
- Tri par `User.nom_complet` (ASC).
- Liste = `User` de rôle `prof` (LEFT JOIN `Professeur` LEFT JOIN `CV`).

### Service — `app/services/rh_professeur_service.py`
- `list_professeurs(db, page, page_size, q) -> tuple[list[Row], int]`
  LIMIT/OFFSET + `func.count()` pour le total.
- `get_professeur_detail(db, professeur_id) -> ProfesseurDetailResponse | None`
  Reprend les requêtes du router `extraction` mais filtrées par `professeur_id`
  (compétences/expériences/formations/langues + résumé profil + méta CV).

### Schémas — `app/schemas/rh_professeur.py`
- `ProfesseurListItem` : `professeur_id, nom_complet, email, cv_statut: CVStatut | None,
  cv_nom_original: str | None, traite_le: datetime | None`.
- `ProfesseurListResponse` : `items: list[ProfesseurListItem], total, page, page_size`.
- `ProfesseurDetailResponse` : `professeur_id, nom_complet, email, cv_statut,
  cv_nom_original, traite_le` + **réutilise** `ProfilResponse`, `CompetenceResponse`,
  `ExperienceResponse`, `FormationResponse`, `LangueResponse` (importés de
  `schemas/extraction.py`).

Pas de nouveau modèle SQLAlchemy → **pas de migration Alembic**.

## Frontend

### Navigation — `lib/nav/rhNav.ts`
Remplacer le placeholder désactivé `{ "/dashboard/rh/cv", "CV des profs", disabled }`
par `{ href: "/dashboard/rh/professeurs", label: "Professeurs", icon: Users }` (activé).

### Composant UI — `components/ui/sheet.tsx`
Drawer shadcn standard (Radix `@radix-ui/react-dialog`, déjà installé),
variante `side="right"`. Fournit nativement la fermeture par bouton ✕, touche
**Escape** et **clic sur l'overlay**. Aligné sur les tokens de `dialog.tsx`
(overlay `bg-fg/40 backdrop-blur`, `bg-canvas-pure`, `shadow-lift`).

### Page — `app/dashboard/rh/professeurs/page.tsx`
- Champ de recherche (debounce ~300 ms) → met à jour `q`, réinitialise `page` à 1.
- Tableau : colonnes **Nom**, **Email**, **Statut CV** (badge), action
  **« Prévisualiser le CV »**.
- Contrôles de pagination (précédent / suivant + indicateur page/total).
- États **chargement** / **vide** / **erreur** calqués sur les pages existantes.

### Composants feature — `components/rh/professeurs/`
- `ProfesseursTable.tsx` — rendu des lignes + bouton de prévisualisation + badge statut.
- `CvStatutBadge.tsx` — mappe `CVStatut | null` → libellé + variante de `Badge`.
- `ProfesseurCvDrawer.tsx` — le sheet latéral ; reçoit `professeurId` et `open`,
  charge le détail via SWR à l'ouverture ; états chargement/erreur.
- Vues read-only : `ProfilReadOnly`, `CompetencesReadOnly`, `ExperiencesReadOnly`,
  `FormationsReadOnly`, `LanguesReadOnly` — mêmes tokens visuels que l'espace prof,
  **sans aucun bouton modifier / ajouter / supprimer**.

### API & hooks
- `lib/api/rhProfesseurs.ts` : `list({ page, pageSize, q })`, `get(professeurId)`.
  Réutilise les DTO `CompetenceDto`, `ExperienceDto`, `FormationDto`, `LangueDto`,
  `ProfilDto` de `lib/api/extraction.ts`.
- Hook liste : clé SWR incluant `page` + `q`. Hook détail : clé par `professeurId`,
  `null` quand le drawer est fermé (pas de fetch).

## Garanties « lecture seule »
- Backend : aucun POST/PATCH/DELETE sur ce router ; `require_role("rh")` partout.
- Frontend : composants read-only sans handler de mutation ; aucun import de
  fonction mutante (`extractionApi.*.add/update/remove`).

## Tests

### Backend (pytest, `TEST_DATABASE_URL`)
- Liste : pagination (page/page_size), recherche `q`, présence du badge statut,
  **403** si rôle non-RH, **401** sans token.
- Détail : profil trouvé (profil + collections), **404** si `professeur_id` inconnu,
  **403** si non-RH.
- Pas de mock LLM requis (aucun appel IA).

### Frontend (Vitest + RTL, dossiers `__tests__` existants)
- `ProfesseursTable` : rendu des lignes + déclenchement de l'action prévisualiser.
- `ProfesseurCvDrawer` : ouverture, affichage des sections, fermeture (bouton + Escape).
- Vues read-only : **absence** de boutons d'édition/suppression.

## Definition of Done
- ≥ 1 test pytest par endpoint ; couverture ≥ 70 % sur fichiers modifiés.
- `npm run lint && npx tsc --noEmit` sans erreur.
- Aucune régression sur affectations / scoring / thème.
- Commits Conventional Commits, **sans** trailer Co-Authored-By (convention projet).
