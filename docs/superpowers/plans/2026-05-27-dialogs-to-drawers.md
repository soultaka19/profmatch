# Formulaires en drawers + correctif overlay — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir les 17 dialogues de formulaire (`Dialog`) en drawers latéraux (`Sheet`), corriger le bug d'overlay invisible des primitives `dialog.tsx`/`alert-dialog.tsx`, et conserver les confirmations `AlertDialog` en modales.

**Architecture:** Refactor mécanique. `Dialog` et `Sheet` partagent `@radix-ui/react-dialog` → substitution déterministe d'identifiants `Dialog*`→`Sheet*` + changement d'import, sans toucher la logique. La primitive `Sheet` gagne un `SheetFooter` et des défauts de contenu (padding/scroll). L'overlay des deux primitives passe à `bg-black/50`.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, shadcn/ui (Radix), Tailwind v3.4, Vitest + Testing Library.

**Convention commits :** Conventional Commits scope `frontend`, **sans** trailer `Co-Authored-By`.

---

## File Structure

**Modifier — primitives (3) :**
- `frontend/components/ui/sheet.tsx` — ajouter `SheetFooter`, défauts sur `SheetContent`.
- `frontend/components/ui/dialog.tsx` — correctif overlay.
- `frontend/components/ui/alert-dialog.tsx` — correctif overlay.

**Modifier — 17 formulaires (Dialog→Sheet) :**
- Admin (10) : `SessionCreateDialog`, `ProgrammeCreateDialog`, `ProgrammeEditDialog`, `CoursCreateDialog`, `CoursEditDialog`, `EtapeCreateDialog`, `CursusAddDialog`, `CompetenceAddDialog`, `UserCreateDialog`, `UserEditDialog` (sous `frontend/components/admin/`).
- Affectation (2) : `frontend/components/affectation/ManualAssignDialog.tsx`, `frontend/components/affectation/AffectationTable.tsx`.
- CV prof (5) : `ProfilForm`, `CompetenceForm`, `ExperienceForm`, `FormationForm`, `LangueForm` (sous `frontend/components/cv/extraction/`).

**Ne pas toucher :** `frontend/components/ui/command.tsx`, et les 13 consommateurs d'`AlertDialog`.

---

## Recette de conversion (déterministe, utilisée aux Tasks 3-5)

Dans chaque fichier de formulaire :

1. **Import** : remplacer la source `"@/components/ui/dialog"` par `"@/components/ui/sheet"`, et renommer chaque symbole importé selon le mapping ci-dessous.
2. **JSX** : remplacer chaque identifiant `Dialog*` par son équivalent `Sheet*` (mot entier uniquement).

Mapping exact des identifiants :

| Avant (`Dialog`) | Après (`Sheet`) |
|---|---|
| `Dialog` | `Sheet` |
| `DialogTrigger` | `SheetTrigger` |
| `DialogContent` | `SheetContent` |
| `DialogHeader` | `SheetHeader` |
| `DialogTitle` | `SheetTitle` |
| `DialogDescription` | `SheetDescription` |
| `DialogFooter` | `SheetFooter` |
| `DialogClose` | `SheetClose` |

**Règles :**
- NE PAS modifier la logique, l'état, les appels API, la validation, les `className` passés explicitement (ils sont conservés et surchargent les défauts via `tailwind-merge`).
- `SheetContent` a `side="right"` par défaut — ne pas ajouter de prop `side`.
- Après conversion, vérifier qu'il ne reste **aucune** référence à un identifiant `Dialog*` ni à l'import `@/components/ui/dialog` dans le fichier.

Exemple concret (extrait de `UserCreateDialog.tsx`) — la ligne d'import :
```tsx
// AVANT
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
// APRÈS
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
```
…et dans le JSX, `<Dialog open={open} …>` → `<Sheet open={open} …>`, `<DialogContent>` → `<SheetContent>`, etc.

---

## Task 1 : Enrichir la primitive `Sheet`

**Files:** Modify `frontend/components/ui/sheet.tsx`.

- [ ] **Step 1 : Ajouter les défauts de contenu à `sheetVariants`**

Dans `frontend/components/ui/sheet.tsx`, remplacer la chaîne de base de `sheetVariants` :
```tsx
const sheetVariants = cva(
  "fixed z-50 flex flex-col bg-canvas-pure shadow-lift transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
```
par :
```tsx
const sheetVariants = cva(
  "fixed z-50 flex flex-col gap-5 overflow-y-auto p-6 bg-canvas-pure shadow-lift transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
```

- [ ] **Step 2 : Ajouter le composant `SheetFooter`**

Dans `frontend/components/ui/sheet.tsx`, juste après la définition de `SheetHeader` (et avant `SheetTitle`), ajouter :
```tsx
const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";
```

- [ ] **Step 3 : Exporter `SheetFooter`**

Dans le bloc `export { … }` final de `frontend/components/ui/sheet.tsx`, ajouter `SheetFooter` (par exemple après `SheetHeader`) :
```tsx
export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
```

- [ ] **Step 4 : Vérifier types + drawer RH existant**

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 erreur.
Run: `cd frontend && npx vitest run components/rh/professeurs/ProfesseurCvDrawer.test.tsx`
Expected: 3 passed (le drawer RH passe `p-7`/`overflow-y-auto` qui surchargent les défauts via tailwind-merge).

- [ ] **Step 5 : Commit**
```bash
git add frontend/components/ui/sheet.tsx
git commit -m "feat(frontend): SheetFooter + defauts de contenu sur SheetContent"
```

---

## Task 2 : Corriger l'overlay des primitives modales

**Files:** Modify `frontend/components/ui/dialog.tsx`, `frontend/components/ui/alert-dialog.tsx`.

- [ ] **Step 1 : `dialog.tsx` — voile visible sans flou**

Dans `frontend/components/ui/dialog.tsx`, dans `DialogOverlay`, remplacer :
```tsx
      "fixed inset-0 z-50 bg-fg/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
```
par :
```tsx
      "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
```

- [ ] **Step 2 : `alert-dialog.tsx` — voile visible sans flou**

Dans `frontend/components/ui/alert-dialog.tsx`, dans `AlertDialogOverlay`, remplacer :
```tsx
      "fixed inset-0 z-50 bg-fg/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
```
par :
```tsx
      "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
```

- [ ] **Step 3 : Vérifier types**

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 4 : Commit**
```bash
git add frontend/components/ui/dialog.tsx frontend/components/ui/alert-dialog.tsx
git commit -m "fix(frontend): rendre le voile des modales visible (bg-black/50, sans flou)"
```

---

## Task 3 : Convertir les formulaires admin (10 fichiers)

**Files (Modify):**
`frontend/components/admin/SessionCreateDialog.tsx`, `ProgrammeCreateDialog.tsx`, `ProgrammeEditDialog.tsx`, `CoursCreateDialog.tsx`, `CoursEditDialog.tsx`, `EtapeCreateDialog.tsx`, `CursusAddDialog.tsx`, `CompetenceAddDialog.tsx`, `UserCreateDialog.tsx`, `UserEditDialog.tsx`.

- [ ] **Step 1 : Appliquer la recette de conversion à chacun des 10 fichiers**

Pour chaque fichier, appliquer la **Recette de conversion** (voir section dédiée plus haut) : changer l'import vers `@/components/ui/sheet` et renommer tous les identifiants `Dialog*`→`Sheet*`. Ne rien changer d'autre.

- [ ] **Step 2 : Vérifier qu'aucune référence `Dialog` ne subsiste dans ces fichiers**

Run: `cd frontend && grep -rn "Dialog\|ui/dialog\"" components/admin/SessionCreateDialog.tsx components/admin/ProgrammeCreateDialog.tsx components/admin/ProgrammeEditDialog.tsx components/admin/CoursCreateDialog.tsx components/admin/CoursEditDialog.tsx components/admin/EtapeCreateDialog.tsx components/admin/CursusAddDialog.tsx components/admin/CompetenceAddDialog.tsx components/admin/UserCreateDialog.tsx components/admin/UserEditDialog.tsx`
Expected: aucune sortie (aucune occurrence restante).

- [ ] **Step 3 : Vérifier types + suite de tests admin**

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 erreur.
Run: `cd frontend && npx vitest run components/admin`
Expected: tous les tests passent (le DOM accessible `role="dialog"` est préservé).

Si un test échoue parce qu'il ciblait une particularité visuelle du dialogue (peu probable), corriger le test de façon minimale en préservant l'intention.

- [ ] **Step 4 : Commit**
```bash
git add frontend/components/admin/
git commit -m "refactor(frontend): convertir les formulaires admin en drawers (Sheet)"
```

---

## Task 4 : Convertir les dialogues d'affectation (2 fichiers)

**Files (Modify):** `frontend/components/affectation/ManualAssignDialog.tsx`, `frontend/components/affectation/AffectationTable.tsx`.

> Note : `AffectationTable.tsx` n'utilise `Dialog` que pour le visualiseur de justification. La recette s'applique telle quelle ; conserver tout `className` passé à `DialogContent`.

- [ ] **Step 1 : Appliquer la recette de conversion aux 2 fichiers**

Appliquer la **Recette de conversion** à `ManualAssignDialog.tsx` et `AffectationTable.tsx` (import + identifiants `Dialog*`→`Sheet*`). Ne rien changer d'autre (logique de génération, scoring, etc. intacts).

- [ ] **Step 2 : Vérifier qu'aucune référence `Dialog` ne subsiste**

Run: `cd frontend && grep -rn "Dialog\|ui/dialog\"" components/affectation/ManualAssignDialog.tsx components/affectation/AffectationTable.tsx`
Expected: aucune sortie.

- [ ] **Step 3 : Vérifier types + suite de tests affectation**

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 erreur.
Run: `cd frontend && npx vitest run components/affectation`
Expected: tous les tests passent (notamment `AffectationTable.test.tsx` « ouvre une justification dans un dialogue » — `getByRole("dialog")` reste valide car `Sheet` est un dialog Radix).

- [ ] **Step 4 : Commit**
```bash
git add frontend/components/affectation/
git commit -m "refactor(frontend): convertir les dialogues d'affectation en drawers (Sheet)"
```

---

## Task 5 : Convertir les formulaires CV prof (5 fichiers)

**Files (Modify):** `frontend/components/cv/extraction/ProfilForm.tsx`, `CompetenceForm.tsx`, `ExperienceForm.tsx`, `FormationForm.tsx`, `LangueForm.tsx`.

> Note : les **sections** (`CompetenceSection`, etc.) utilisent `AlertDialog` pour la suppression → NE PAS les toucher. Seuls les 5 *Form* utilisent `Dialog`.

- [ ] **Step 1 : Appliquer la recette de conversion aux 5 formulaires**

Appliquer la **Recette de conversion** à `ProfilForm.tsx`, `CompetenceForm.tsx`, `ExperienceForm.tsx`, `FormationForm.tsx`, `LangueForm.tsx`. Ne rien changer d'autre.

- [ ] **Step 2 : Vérifier qu'aucune référence `Dialog` ne subsiste**

Run: `cd frontend && grep -rn "Dialog\|ui/dialog\"" components/cv/extraction/ProfilForm.tsx components/cv/extraction/CompetenceForm.tsx components/cv/extraction/ExperienceForm.tsx components/cv/extraction/FormationForm.tsx components/cv/extraction/LangueForm.tsx`
Expected: aucune sortie.

- [ ] **Step 3 : Vérifier types + suite de tests cv**

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 erreur.
Run: `cd frontend && npx vitest run components/cv`
Expected: tous les tests passent.

- [ ] **Step 4 : Commit**
```bash
git add frontend/components/cv/extraction/
git commit -m "refactor(frontend): convertir les formulaires CV prof en drawers (Sheet)"
```

---

## Task 6 : Vérification finale

**Files:** aucun (vérification only).

- [ ] **Step 1 : Plus aucun import de `@/components/ui/dialog` hors `command.tsx`**

Run: `cd frontend && grep -rn "from \"@/components/ui/dialog\"" components app`
Expected: une seule occurrence — `components/ui/command.tsx`.

- [ ] **Step 2 : Suite frontend complète**

Run: `cd frontend && npx vitest run`
Expected: tous les fichiers/tests passent (aucune régression vs la baseline de 131 tests, +/- selon l'état de la branche #29).

- [ ] **Step 3 : Types**

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 4 : Revue manuelle de cohérence**

Confirmer : les 13 consommateurs `AlertDialog` sont inchangés ; `command.tsx` inchangé ; aucune modification de logique métier dans les 17 fichiers convertis (le diff ne doit montrer que des renommages d'identifiants et le changement d'import).

---

## Self-Review (effectuée par le rédacteur du plan)

**Couverture de la spec :**
- `SheetFooter` + défauts `SheetContent` → Task 1 ✓
- Correctif overlay `dialog.tsx` + `alert-dialog.tsx` → Task 2 ✓
- Conversion 17 formulaires (10 admin + 2 affectation + 5 cv) → Tasks 3/4/5 ✓
- Confirmations `AlertDialog` et `command.tsx` intacts → spec + Task 6 Step 1/Step 4 ✓
- Tests verts sans modification → Tasks 3/4/5 Step 3 + Task 6 ✓

**Placeholders :** aucun. La « recette » est une substitution déterministe complète (mapping exhaustif + exemple concret), pas un placeholder.

**Cohérence des identifiants :** le mapping `Dialog*`→`Sheet*` est unique et réutilisé identiquement aux Tasks 3-5. `SheetFooter` défini en Task 1 et utilisé par toute conversion ayant un `DialogFooter`.
