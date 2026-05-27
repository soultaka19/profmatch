# Conception — Formulaires en drawers + correctif d'overlay

**Date :** 2026-05-27
**Branche :** `feature/dialogs-to-drawers` (depuis `feature/rh-professeurs-cv`, stackée sur la PR #29)
**Statut :** approuvée

## Objectif

Uniformiser l'UX des fenêtres modales de l'application :
1. Convertir les **dialogues de formulaire** (création/édition) en **drawers latéraux droits** (primitive `Sheet`), cohérents avec la consultation RH déjà livrée et la référence visuelle OpenClassrooms.
2. Corriger un **bug d'overlay invisible** présent dans `dialog.tsx` et `alert-dialog.tsx` (le voile ne s'affichait pas).
3. Conserver les **confirmations destructives** (`AlertDialog`) en modales centrées — seul leur voile est corrigé.

## Contexte technique

- `Sheet` (créé dans la PR #29) et `Dialog`/`AlertDialog` reposent tous sur `@radix-ui/react-dialog` (resp. `react-alert-dialog`) → tous exposent `role="dialog"`. La conversion `Dialog → Sheet` est donc **mécanique** et préserve le DOM accessible : les tests existants qui ciblent `getByRole("dialog")`, les boutons déclencheurs et les champs restent valides.
- **Bug d'overlay :** les couleurs Tailwind sont câblées `fg: "var(--fg)"` avec `--fg` en hex (`#111827`). En Tailwind v3.4, `bg-fg/40` génère `rgb(var(--fg)/.4)` = CSS **invalide** → voile transparent. Seul `backdrop-blur-[2px]` donnait un indice visuel. Correctif : `bg-black/50` (Tailwind convertit `black` en canaux → `rgb(0 0 0/.5)` valide).
- `cn()` utilise `tailwind-merge` → on peut donner des classes par défaut à `SheetContent` et les surcharger par instance.

## Périmètre

### À convertir — 17 fichiers `Dialog` → `Sheet`
**Admin (10) :** `SessionCreateDialog`, `ProgrammeCreateDialog`, `ProgrammeEditDialog`, `CoursCreateDialog`, `CoursEditDialog`, `EtapeCreateDialog`, `CursusAddDialog`, `CompetenceAddDialog`, `UserCreateDialog`, `UserEditDialog`.
**Affectation (2) :** `ManualAssignDialog`, et le visualiseur de justification interne à `AffectationTable`.
**CV prof (5) :** `ProfilForm`, `CompetenceForm`, `ExperienceForm`, `FormationForm`, `LangueForm`.

### À NE PAS toucher
- `components/ui/command.tsx` (palette de commandes — usage interne de `Dialog`).
- Les 13 consommateurs d'`AlertDialog` (confirmations) : `SessionDeleteDialog`, `CoursDeleteDialog`, `CompetenceRemoveDialog`, `ProgrammeDeleteDialog`, `EtapeDeleteDialog`, `CursusRemoveDialog`, `UserToggleActifDialog`, `UserResetPasswordDialog`, `NewGenerationButton`, et les 4 sections CV (`LangueSection`, `FormationSection`, `ExperienceSection`, `CompetenceSection`). Inchangés.

## Modifications

### 1. Primitive `Sheet` (`components/ui/sheet.tsx`)
- Ajouter un composant **`SheetFooter`** (rangée d'actions, calquée sur `DialogFooter` : `flex flex-col-reverse gap-2 sm:flex-row sm:justify-end`, avec espacement haut adapté au bas d'un drawer).
- Ajouter des **défauts** à `SheetContent` pour un rendu de formulaire uniforme : `overflow-y-auto` + padding `p-6`. (`side="right"` reste le défaut.) Le drawer RH existant qui passe déjà `overflow-y-auto p-7` reste correct via `tailwind-merge`.
- Exporter `SheetFooter`.

### 2. Correctif overlay (2 primitives)
- `dialog.tsx` et `alert-dialog.tsx` : remplacer `"... bg-fg/40 backdrop-blur-[2px] ..."` par `"... bg-black/50 ..."` (voile net, sans flou, cohérent avec le drawer).

### 3. Conversion par fichier (mapping 1:1)
`Dialog→Sheet`, `DialogTrigger→SheetTrigger`, `DialogContent→SheetContent`, `DialogHeader→SheetHeader`, `DialogTitle→SheetTitle`, `DialogDescription→SheetDescription`, `DialogFooter→SheetFooter`, `DialogClose→SheetClose`. **Aucune** modification de logique, d'état, d'appels API ni de validation. Seuls l'import et les balises JSX changent.

## Tests
- Relancer les suites impactées : `components/admin/`, `components/affectation/`, `components/cv/extraction/`.
- Objectif : **toutes vertes sans modification de test**. Si un test assertait une structure spécifique au dialogue (peu probable), correctif ponctuel documenté.
- Pas de nouveau test (conversion à comportement constant). `npx tsc --noEmit` sans erreur.

## Hors périmètre / intact
Logique métier, endpoints, validations, scoring, affectations, thème global, données. `command.tsx` et les confirmations `AlertDialog`.

## Branche / PR
`feature/dialogs-to-drawers` depuis `feature/rh-professeurs-cv` (stackée sur #29). À merger après #29 (ou recibler la PR sur `main` une fois #29 mergée). Conventional Commits, **sans** trailer Co-Authored-By.

## Risques
- `npm run lint` reste cassé au niveau dépôt (ESLint 9 incompat.) — préexistant, hors périmètre.
- Conflit potentiel sur `sheet.tsx` entre #29 et cette branche au merge → résolu en mergeant #29 d'abord (changements additifs).
