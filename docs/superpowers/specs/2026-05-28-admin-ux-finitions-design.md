# LOT 2 — Finitions Admin & UX (avant démo interne)

> Spec — 2026-05-28 · branche cible `feature/admin-ux-finitions` (base `main`)
> Contexte : items 🟡 (moyens) et 🟢 (UX) remontés par l'équipe avant une démo interne.
> Le LOT 1 (critiques : shortlist `en_examen` + réaffectation, avec rejet auto des
> concurrents d'un cours) fera l'objet d'un spec et d'une PR séparés, **après** ce lot.

## Objectif

Polir l'espace admin et l'ergonomie transverse pour une démo crédible, **sans toucher
au cœur métier des affectations** (réservé au LOT 1). Aucun changement de schéma DB :
le seul backend ajouté est un endpoint de statistiques en lecture seule.

## Périmètre (6 items)

| # | Item | Sévérité | Backend ? |
|---|------|----------|-----------|
| 1 | Dashboard admin : vraies valeurs (cartes de stats + accès rapides) | 🟡 | Oui — `GET /api/admin/stats` |
| 2 | Compétences requises dans le formulaire de création de cours | 🟡 | Non (réutilise API compétences existante) |
| 3 | Description / métadonnées sur les pages de détail (programmes, cours, sessions) | 🟡 | Non |
| 4 | Restreindre l'édition W1–W4 à l'admin (RH en lecture seule) | 🟢 | Non |
| 5 | Toasts de confirmation sur toutes les actions (CRUD admin) | 🟢 | Non |
| 6 | Recherche + pagination configurable (5 par défaut) sur les tableaux | 🟢 | Non |

**Hors périmètre (→ LOT 1) :** sélection multiple / shortlist `en_examen`, réaffectation
d'un prof, rejet auto des concurrents, blocage de sélection sans cours dispo.

---

## Item 1 — Dashboard admin : vraies valeurs

**État actuel :** `frontend/app/dashboard/admin/page.tsx` est un `RoadmapPlaceholder`
statique. Les sous-pages (cours, programmes, sessions, utilisateurs, pondérations) sont
déjà fonctionnelles.

**Cible :** remplacer le placeholder par des cartes de statistiques réelles + accès
rapides vers les sous-pages.

**Backend — `GET /api/admin/stats`** (`require_role("admin")`) :
- Nouveau router `app/routers/admin_stats.py` (ou extension de `admin_maintenance.py`),
  logique dans `app/services/admin_stats_service.py`.
- Réponse Pydantic `AdminStatsOut` : compteurs agrégés via `func.count` (pas de SQL brut) :
  - `utilisateurs_total`, `professeurs_total`, `cv_traites`, `cv_en_attente`
  - `cours_total`, `programmes_total`
  - `sessions_total`, `sessions_ouvertes`
  - `affectations_total`, `affectations_validees`
- Une seule requête par compteur ou regroupement par `group_by` pour éviter le N+1.

**Frontend :**
- `lib/api/adminStats.ts` + type `AdminStatsOut` dans `lib/types`.
- `app/dashboard/admin/page.tsx` : SWR sur `/api/admin/stats`, cartes shadcn (réutiliser
  le style des cartes existantes), squelette de chargement, lien « Voir » par carte.
- Conserver une section « accès rapides » vers chaque module.

**Tests :** pytest sur l'endpoint (compteurs corrects sur une base seedée + garde de rôle
admin) ; vitest léger sur le rendu des cartes (données mockées).

---

## Item 2 — Compétences requises à la création d'un cours

**État actuel :** `CoursCreateDialog` crée un cours (code, nom, description, crédits,
heures). Les compétences sont gérées **après coup** via `CoursCompetencesPanel` et l'API
`coursCompetences` (`POST /api/cours/{id}/competences`). La création n'a ni compétences ni
`Textarea`.

**Cible :** permettre d'attacher des compétences requises dès le formulaire de création.

**Approche (zéro backend) :** flux séquentiel côté client —
1. `coursApi.create(...)` → récupère l'`id` du cours créé.
2. Pour chaque compétence saisie, `coursCompetencesApi.create(id, input)`.
3. Toast récapitulatif ; `onCreated()` rafraîchit la liste.
- En cas d'échec d'une compétence après création du cours : le cours reste créé, on
  signale par toast les compétences non attachées (l'admin complète via le panneau détail).
  Ce comportement dégradé est explicite et documenté dans le composant.
- Réutiliser le sous-composant de saisie de compétence déjà présent dans
  `CompetenceAddDialog` / `CoursCompetencesPanel` (extraire si nécessaire pour éviter la
  duplication — DRY).
- Passer le champ description en `Textarea`.

**Tests :** vitest — création avec 2 compétences appelle bien `create` cours puis 2×
`competences.create` ; chemin dégradé (échec compétence) garde le cours et affiche le toast.

---

## Item 3 — Description / métadonnées sur les pages de détail

**Précision utilisateur :** il s'agit d'**afficher** les données existantes sur les pages
de détail (ex. `/dashboard/admin/programmes/3`), **sans ajouter de colonne** DB.

**État actuel :**
- Cours `/[id]` : description **déjà affichée**. → vérifier seulement la mise en page +
  `Textarea` à la création (couvert par l'item 2).
- Programme `/[id]` : affiche code, nom, `departement`, semestres d'admission. `Programme`
  **n'a pas** de colonne description → on enrichit l'affichage des métadonnées existantes
  (département, admission, nb d'étapes/cours) sans champ nouveau.
- Session `/[id]` : enrichir l'en-tête avec les métadonnées existantes (statut, dates /
  rythme dérivé, pondérations) ; pas de champ description en base.

**Cible :** harmoniser les en-têtes de détail (programmes, cours, sessions) pour présenter
clairement les métadonnées disponibles. Pur frontend, aucune migration.

**Tests :** vitest — chaque page détail affiche les métadonnées présentes et n'affiche pas
de bloc vide quand une donnée optionnelle est absente.

---

## Item 4 — Restreindre l'édition W1–W4 à l'admin

**État actuel :** `GenerationForm` (page RH `/dashboard/rh/affectations`) embarque
`WeightSliders` **éditables**. La source canonique des poids est pourtant la pondération de
session, configurée par l'admin (`/dashboard/admin/sessions/[id]` + `PUT
/sessions/{id}/ponderations`, déjà protégé). Côté backend, l'édition est donc déjà admin ;
le frontend laisse le RH croire qu'il peut régler les poids.

**Cible :** côté RH, afficher les pondérations de la session en **lecture seule** (héritées),
sans contrôle d'édition. L'édition reste exclusivement dans le détail de session admin.

**Approche :**
- `WeightSliders` : prop `readOnly` (sliders désactivés + libellé « définies par
  l'administrateur ») OU remplacer par un composant d'affichage `PonderationsBar` (déjà
  existant) dans `GenerationForm`.
- Charger les poids via `sessionsApi.getPonderations(sessionId)` (déjà utilisé ailleurs)
  et les passer en lecture seule ; la génération utilise les poids de session.
- Vérifier qu'aucun appel `updatePonderations` ne part de la page RH.

**Tests :** vitest — en contexte RH, les sliders sont non éditables / absents et la barre
reflète les poids de session.

---

## Item 5 — Toasts de confirmation sur toutes les actions

**État actuel :** les actions d'affectation utilisent déjà `sonner`. **Aucun** dialog admin
(`CoursCreateDialog`, `*EditDialog`, `*DeleteDialog`, `User*`, `Etape*`, `Cursus*`,
`Competence*`, `Session*`, `Programme*`) n'émet de toast — ils affichent une erreur inline
au mieux.

**Cible :** toast `success` après chaque mutation réussie, toast `error` (message API
lisible) en cas d'échec, sur l'ensemble du CRUD admin.

**Approche (DRY) :**
- Petit utilitaire `lib/toast.ts` : `toastSuccess(msg)` / `toastError(err, fallback)` qui
  extrait un message lisible d'`ApiError` (statut → message). Évite de dupliquer le
  `try/catch + toast` dans 18 dialogs.
- Brancher chaque dialog de mutation sur cet utilitaire (création, édition, suppression,
  reset mot de passe, toggle actif, ajout/retrait compétence & cursus, étapes).
- Conserver l'erreur inline là où elle guide la saisie (validation de champ), le toast
  couvrant le résultat de l'appel réseau.

**Tests :** vitest — un dialog représentatif par famille (create / edit / delete) déclenche
le toast attendu sur succès et sur erreur (API mockée).

---

## Item 6 — Recherche + pagination configurable (5 par défaut)

**État actuel :** `AdminDataTable.tsx` ne fournit que `Toolbar / Shell / Loading / Empty`.
Les tables (`CoursTable`, `ProgrammesTable`, `SessionsTable`, `UsersTable`, et côté RH
`ProfesseursTable`) rendent toutes les lignes sans recherche ni pagination.

**Cible :** champ de recherche + sélecteur de taille de page (5 par défaut, options 5/10/25)
+ pagination, sur les tableaux admin et la table RH professeurs.

**Approche (réutilisable, isolée) :**
- Hook `lib/hooks/useTableControls.ts` : entrée = liste + fonction de filtre texte +
  options de page ; sortie = `{ query, setQuery, pageSize, setPageSize, page, setPage,
  pageItems, total, pageCount }`. Filtrage et pagination **côté client** (volumes de démo
  faibles), `useMemo` pour la dérivation.
- Composant `TableControls` (recherche + select page size) et `TablePagination`
  (précédent/suivant + indicateur « x–y sur N »), branchés dans `AdminTableToolbar`.
- Adapter chaque table pour consommer `pageItems` au lieu de la liste brute ; passer la
  fonction de filtre propre à chaque domaine (ex. cours → code+nom ; users → nom+email).
- Réinitialiser `page` à 1 quand `query` ou `pageSize` change.

**Tests :** vitest sur `useTableControls` (filtre, changement de page, reset, taille par
défaut = 5) + un test d'intégration sur une table montrant la pagination active.

---

## Découpage en commits (Conventional Commits)

Ordre conseillé (du plus isolé au plus transverse), chacun testé :

1. `feat(frontend): utilitaire toasts + toasts sur le CRUD admin` (item 5)
2. `feat(frontend): recherche + pagination configurable sur les tableaux` (item 6)
3. `feat(frontend): pondérations W1–W4 en lecture seule côté RH` (item 4)
4. `feat(frontend): enrichir les pages de détail programmes/cours/sessions` (item 3)
5. `feat(frontend): compétences requises à la création d'un cours` (item 2)
6. `feat(api,frontend): dashboard admin avec statistiques réelles` (item 1)

Une seule PR `feature/admin-ux-finitions` regroupant ces commits (PR démontrable d'un bloc),
ou scission 2 PR (UX transverse / dashboard) si la review l'exige.

## Definition of Done (rappel projet)

- Chaque endpoint nouveau a ≥ 1 test pytest ; `pytest --cov=app` ≥ 70 % sur fichiers modifiés.
- `npm run lint && npx tsc --noEmit` : 0 erreur ; pas de `any`.
- shadcn/ui pour tout élément UI standard ; API centralisée dans `lib/api/`.
- PR approuvée ≥ 1 reviewer, CI verte.

## Risques / points d'attention

- **Item 2 (séquence create → competences)** : pas d'atomicité (le cours peut exister sans
  ses compétences si un appel échoue). Comportement dégradé assumé et signalé par toast.
- **Item 6** : filtrage/pagination client uniquement — acceptable aux volumes de démo ;
  documenter la limite si les volumes grossissent (passage à pagination serveur ultérieur).
- **Item 1** : veiller au N+1 sur les compteurs (agréger en requêtes `count`/`group_by`).
- **Indépendance LOT 1** : ne pas modifier la logique de validation d'affectation ici.
