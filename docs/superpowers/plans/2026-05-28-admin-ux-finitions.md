# LOT 2 — Finitions Admin & UX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polir l'espace admin et l'ergonomie transverse de ProfMatch (toasts, recherche/pagination, pondérations en lecture seule RH, pages de détail, compétences à la création de cours, dashboard admin réel) avant une démo interne, sans toucher au cœur métier des affectations.

**Architecture:** Frontend Next.js 16 / React 19 / shadcn / SWR ; un seul ajout backend FastAPI (endpoint de statistiques en lecture seule) + un durcissement de rôle. Pièces réutilisables (`lib/toast.ts`, `useTableControls`) factorisées pour rester DRY sur des changements répétitifs (18 dialogs, 5 tables).

**Tech Stack:** TypeScript strict, vitest + @testing-library/react (tests co-localisés `*.test.tsx`), `sonner` pour les toasts ; backend SQLAlchemy 2.0 async, pytest (`auth_headers_admin/rh/prof`, `db_session`, `client`).

**Spec :** `docs/superpowers/specs/2026-05-28-admin-ux-finitions-design.md`
**Branche :** `feature/admin-ux-finitions` (déjà créée sur `main`, spec déjà commitée).

---

## Structure des fichiers

**Créés :**
- `frontend/lib/toast.ts` — utilitaire `toastSuccess` / `toastError` (extraction message `ApiError`).
- `frontend/lib/toast.test.ts`
- `frontend/lib/hooks/useTableControls.ts` — recherche + pagination client réutilisable.
- `frontend/lib/hooks/useTableControls.test.ts`
- `backend/app/schemas/admin_stats.py` — `AdminStatsOut`.
- `backend/app/services/admin_stats_service.py` — agrégation des compteurs.
- `backend/app/routers/admin_stats.py` — `GET /api/admin/stats`.
- `backend/tests/test_admin_stats_router.py`
- `frontend/lib/api/adminStats.ts` + type `AdminStatsOut`.
- `frontend/components/admin/AdminStatsCards.tsx` + `.test.tsx`.

**Modifiés :**
- `frontend/components/admin/AdminDataTable.tsx` — ajout `TableSearch` + `TablePagination`.
- Les 18 dialogs de mutation admin (toasts).
- Les 5 tables paginées (cours, programmes, sessions, utilisateurs, RH professeurs) + leurs pages.
- `frontend/components/affectation/WeightSliders.tsx` (+ `GenerationForm.tsx`).
- `backend/app/routers/sessions.py` (rôle ponderations) + son test.
- `frontend/app/dashboard/admin/programmes/[id]/page.tsx` & `sessions/[id]/page.tsx` (affichage métadonnées).
- `frontend/components/admin/CoursCreateDialog.tsx` (compétences + Textarea).
- `frontend/app/dashboard/admin/page.tsx` (dashboard réel) + `backend/app/main.py` (router stats).

---

## Task 1 : Utilitaire de toasts (`lib/toast.ts`)

**Files:**
- Create: `frontend/lib/toast.ts`
- Test: `frontend/lib/toast.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

```ts
// frontend/lib/toast.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { toastSuccess, toastError } from "@/lib/toast";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("toast helpers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("toastSuccess transmet le message", () => {
    toastSuccess("Cours créé");
    expect(toast.success).toHaveBeenCalledWith("Cours créé");
  });

  it("toastError affiche le message d'une ApiError", () => {
    toastError(new ApiError("Code déjà utilisé", 409), "Échec");
    expect(toast.error).toHaveBeenCalledWith("Code déjà utilisé");
  });

  it("toastError retombe sur le fallback pour une erreur inconnue", () => {
    toastError("boom", "Échec de l'opération");
    expect(toast.error).toHaveBeenCalledWith("Échec de l'opération");
  });
});
```

- [ ] **Step 2 : Lancer le test (échec attendu)**

Run: `cd frontend && npx vitest run lib/toast.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/toast"`.

- [ ] **Step 3 : Implémenter**

```ts
// frontend/lib/toast.ts
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";

/** Toast de succès uniforme. */
export function toastSuccess(message: string): void {
  toast.success(message);
}

/**
 * Toast d'erreur : préfère le message lisible d'une ApiError/Error,
 * sinon le fallback fourni par l'appelant.
 */
export function toastError(err: unknown, fallback: string): void {
  const message =
    err instanceof ApiError || err instanceof Error ? err.message : fallback;
  toast.error(message || fallback);
}
```

- [ ] **Step 4 : Lancer le test (succès attendu)**

Run: `cd frontend && npx vitest run lib/toast.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5 : Commit**

```bash
git add frontend/lib/toast.ts frontend/lib/toast.test.ts
git commit -m "feat(frontend): utilitaire de toasts uniforme (succès/erreur ApiError)"
```

---

## Task 2 : Toasts sur le CRUD admin

Brancher chaque dialog de mutation sur `toastSuccess` / `toastError`. **Pattern unique** (à appliquer tel quel) : dans le `try`, après le `await … ; onDone()/onCreated()`, ajouter `toastSuccess(...)` ; remplacer le `setError(...)` du `catch` par `toastError(e, "…")` (on conserve l'erreur inline uniquement pour les validations de champ purement locales — ici aucune).

**Files (Modify) — un dialog servant d'exemple complet, puis liste mécanique :**

- [ ] **Step 1 : Exemple complet — `CoursDeleteDialog.tsx`**

Modifier `frontend/components/admin/CoursDeleteDialog.tsx` :

```tsx
import { toastSuccess, toastError } from "@/lib/toast";
// …
  async function handleConfirm() {
    if (!cours) return;
    setSubmitting(true);
    try {
      await coursApi.remove(cours.id);
      toastSuccess(`Cours ${cours.code} supprimé.`);
      onDone();
      onClose();
    } catch (e) {
      toastError(e, "Suppression impossible.");
    } finally {
      setSubmitting(false);
    }
  }
```

Supprimer l'état `error` et le bloc `{error && …}` devenus inutiles (`const [error, setError] = useState<string | null>(null);` et `setError(null);`).

- [ ] **Step 2 : Exemple complet — `CoursCreateDialog.tsx`** (le `handleSubmit` actuel garde `setError` pour les erreurs API → remplacer par toast)

```tsx
import { toastSuccess, toastError } from "@/lib/toast";
// dans handleSubmit :
      await coursApi.create({ /* …inchangé… */ });
      toastSuccess(`Cours ${code.trim()} créé.`);
      onCreated();
      setOpen(false);
      reset();
    } catch (e) {
      toastError(e, "Création impossible.");
    } finally {
      setSubmitting(false);
    }
```

(Garder l'`error` inline supprimé : retirer `error`/`setError` et le `{error && …}`.)

- [ ] **Step 3 : Appliquer le même pattern aux dialogs restants**

Pour chacun : import `toastSuccess/toastError`, toast de succès après la mutation, `toastError(e, "…")` dans le `catch`, suppression de l'état `error` inline + de son rendu.

- [ ] `CoursEditDialog.tsx` → succès `"Cours mis à jour."` / échec `"Mise à jour impossible."`
- [ ] `ProgrammeCreateDialog.tsx` → `"Programme créé."` / `"Création impossible."`
- [ ] `ProgrammeEditDialog.tsx` → `"Programme mis à jour."` / `"Mise à jour impossible."`
- [ ] `ProgrammeDeleteDialog.tsx` → `"Programme supprimé."` / `"Suppression impossible."`
- [ ] `SessionCreateDialog.tsx` → `"Session créée."` / `"Création impossible."`
- [ ] `SessionDeleteDialog.tsx` → `"Session supprimée."` / `"Suppression impossible."`
- [ ] `UserCreateDialog.tsx` → `"Utilisateur créé."` / `"Création impossible."`
- [ ] `UserEditDialog.tsx` → `"Utilisateur mis à jour."` / `"Mise à jour impossible."`
- [ ] `UserResetPasswordDialog.tsx` → `"Mot de passe réinitialisé."` / `"Réinitialisation impossible."`
- [ ] `UserToggleActifDialog.tsx` → `"Statut du compte modifié."` / `"Modification impossible."`
- [ ] `EtapeCreateDialog.tsx` → `"Étape créée."` / `"Création impossible."`
- [ ] `EtapeDeleteDialog.tsx` → `"Étape supprimée."` / `"Suppression impossible."`
- [ ] `CursusAddDialog.tsx` → `"Cours rattaché à l'étape."` / `"Rattachement impossible."`
- [ ] `CursusRemoveDialog.tsx` → `"Cours retiré de l'étape."` / `"Retrait impossible."`
- [ ] `CompetenceAddDialog.tsx` → `"Compétence ajoutée."` / `"Ajout impossible."`
- [ ] `CompetenceRemoveDialog.tsx` → `"Compétence retirée."` / `"Retrait impossible."`

> Note : si un dialog conserve une **validation de champ locale** (ex. champ requis non saisi), garder cette erreur inline ; les toasts ne couvrent que le résultat de l'appel réseau.

- [ ] **Step 4 : Test de régression représentatif**

Créer `frontend/components/admin/CoursDeleteDialog.test.tsx` :

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CoursDeleteDialog } from "./CoursDeleteDialog";
import { coursApi } from "@/lib/api/cours";
import { toast } from "sonner";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/cours", () => ({ coursApi: { remove: vi.fn() } }));

const cours = { id: 1, code: "INF1001", nom: "Intro", credits: 3, heures: 45 };

describe("CoursDeleteDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("toast de succès après suppression", async () => {
    (coursApi.remove as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    render(<CoursDeleteDialog cours={cours} onClose={() => {}} onDone={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(toast.success).toHaveBeenCalled();
  });

  it("toast d'erreur si l'API échoue", async () => {
    (coursApi.remove as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("boom"));
    render(<CoursDeleteDialog cours={cours} onClose={() => {}} onDone={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(toast.error).toHaveBeenCalled();
  });
});
```

- [ ] **Step 5 : Vérifier lint + types + tests**

Run: `cd frontend && npx vitest run components/admin/CoursDeleteDialog.test.tsx && npm run lint && npx tsc --noEmit`
Expected: tests PASS, 0 erreur lint/types.

- [ ] **Step 6 : Commit**

```bash
git add frontend/lib/toast.ts frontend/components/admin
git commit -m "feat(frontend): toasts de confirmation sur tout le CRUD admin"
```

---

## Task 3 : Hook `useTableControls` (recherche + pagination)

**Files:**
- Create: `frontend/lib/hooks/useTableControls.ts`
- Test: `frontend/lib/hooks/useTableControls.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

```ts
// frontend/lib/hooks/useTableControls.test.ts
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTableControls } from "./useTableControls";

interface Row { code: string; nom: string; }
const rows: Row[] = Array.from({ length: 12 }, (_, i) => ({
  code: `C${i}`,
  nom: i === 0 ? "Algorithmes" : `Cours ${i}`,
}));
const match = (r: Row, q: string) =>
  (r.code + r.nom).toLowerCase().includes(q.toLowerCase());

describe("useTableControls", () => {
  it("pagine 5 par défaut", () => {
    const { result } = renderHook(() => useTableControls(rows, match));
    expect(result.current.pageSize).toBe(5);
    expect(result.current.pageItems).toHaveLength(5);
    expect(result.current.pageCount).toBe(3);
    expect(result.current.total).toBe(12);
  });

  it("change de page", () => {
    const { result } = renderHook(() => useTableControls(rows, match));
    act(() => result.current.setPage(3));
    expect(result.current.pageItems).toHaveLength(2);
  });

  it("filtre par recherche et revient page 1", () => {
    const { result } = renderHook(() => useTableControls(rows, match));
    act(() => result.current.setPage(2));
    act(() => result.current.setQuery("Algorithmes"));
    expect(result.current.total).toBe(1);
    expect(result.current.page).toBe(1);
    expect(result.current.pageItems[0].nom).toBe("Algorithmes");
  });

  it("réinitialise la page quand pageSize change", () => {
    const { result } = renderHook(() => useTableControls(rows, match));
    act(() => result.current.setPage(3));
    act(() => result.current.setPageSize(10));
    expect(result.current.page).toBe(1);
    expect(result.current.pageItems).toHaveLength(10);
  });
});
```

- [ ] **Step 2 : Lancer le test (échec attendu)**

Run: `cd frontend && npx vitest run lib/hooks/useTableControls.test.ts`
Expected: FAIL — import non résolu.

- [ ] **Step 3 : Implémenter**

```ts
// frontend/lib/hooks/useTableControls.ts
import { useMemo, useState } from "react";

export const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;

export interface TableControls<T> {
  query: string;
  setQuery: (q: string) => void;
  pageSize: number;
  setPageSize: (n: number) => void;
  page: number;
  setPage: (n: number) => void;
  pageItems: T[];
  total: number;
  pageCount: number;
}

/**
 * Recherche + pagination côté client. Volumes de démo faibles : filtrage et
 * découpage en mémoire (useMemo). `match(item, query)` est fourni par chaque
 * domaine (ex. cours → code+nom). La page revient à 1 dès que la recherche ou
 * la taille de page change.
 */
export function useTableControls<T>(
  items: T[],
  match: (item: T, query: string) => boolean,
  defaultPageSize = 5,
): TableControls<T> {
  const [query, setQueryState] = useState("");
  const [pageSize, setPageSizeState] = useState(defaultPageSize);
  const [page, setPage] = useState(1);

  const setQuery = (q: string) => {
    setQueryState(q);
    setPage(1);
  };
  const setPageSize = (n: number) => {
    setPageSizeState(n);
    setPage(1);
  };

  const filtered = useMemo(
    () => (query.trim() ? items.filter((it) => match(it, query.trim())) : items),
    [items, query, match],
  );

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageItems = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  return {
    query, setQuery, pageSize, setPageSize,
    page: safePage, setPage, pageItems, total, pageCount,
  };
}
```

- [ ] **Step 4 : Lancer le test (succès attendu)**

Run: `cd frontend && npx vitest run lib/hooks/useTableControls.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5 : Commit**

```bash
git add frontend/lib/hooks/useTableControls.ts frontend/lib/hooks/useTableControls.test.ts
git commit -m "feat(frontend): hook useTableControls (recherche + pagination client)"
```

---

## Task 4 : Composants `TableSearch` + `TablePagination`

**Files:**
- Modify: `frontend/components/admin/AdminDataTable.tsx`

- [ ] **Step 1 : Ajouter les composants dans `AdminDataTable.tsx`**

Ajouter en tête `import { Input } from "@/components/ui/input";`, `import { Button } from "@/components/ui/button";`, `import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";`, `import { PAGE_SIZE_OPTIONS } from "@/lib/hooks/useTableControls";`, puis :

```tsx
export function TableSearch({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <Input
      type="search"
      aria-label={label}
      className="w-full sm:w-72"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function TablePagination({
  page,
  pageCount,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (n: number) => void;
  onPageSizeChange: (n: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-col items-center justify-between gap-3 px-1 py-2 text-sm text-fg-muted sm:flex-row">
      <div className="flex items-center gap-2">
        <span>Par page</span>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger className="h-8 w-[72px]" aria-label="Lignes par page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <span aria-live="polite">{from}–{to} sur {total}</span>
        <Button
          size="sm" variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >Précédent</Button>
        <Button
          size="sm" variant="outline"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >Suivant</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier les types**

Run: `cd frontend && npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add frontend/components/admin/AdminDataTable.tsx
git commit -m "feat(frontend): composants TableSearch et TablePagination réutilisables"
```

---

## Task 5 : Brancher recherche + pagination sur les tables

**Approche :** chaque page liste charge déjà la liste complète via SWR. On remplace la consommation de la liste brute par `useTableControls`, on rend `TableSearch` dans la toolbar et `TablePagination` sous la table. Pour `cours/page.tsx` qui faisait une recherche **serveur**, on bascule en recherche **client** (uniformité) : appeler `coursApi.list()` sans `q`.

**Files (exemple complet) :**
- Modify: `frontend/app/dashboard/admin/cours/page.tsx`

- [ ] **Step 1 : Exemple complet — page Cours**

```tsx
"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { coursApi } from "@/lib/api/cours";
import type { CoursReadOnly } from "@/lib/types/programmes";
import type { Cours } from "@/lib/types/cours";
import { CoursTable } from "@/components/admin/CoursTable";
import { CoursCreateDialog } from "@/components/admin/CoursCreateDialog";
import { CoursEditDialog } from "@/components/admin/CoursEditDialog";
import { CoursDeleteDialog } from "@/components/admin/CoursDeleteDialog";
import {
  AdminTableEmpty, AdminTableLoading, AdminTableToolbar,
  TableSearch, TablePagination,
} from "@/components/admin/AdminDataTable";
import { useTableControls } from "@/lib/hooks/useTableControls";

const matchCours = (c: CoursReadOnly, q: string) =>
  `${c.code} ${c.nom}`.toLowerCase().includes(q.toLowerCase());

export default function Page() {
  const { data: cours, mutate, isLoading } = useSWR<CoursReadOnly[]>(
    "cours:list",
    () => coursApi.list(),
  );
  const [editing, setEditing] = useState<Cours | null>(null);
  const [deleting, setDeleting] = useState<CoursReadOnly | null>(null);

  const ctrl = useTableControls(cours ?? [], matchCours);

  const openEdit = useCallback(async (c: CoursReadOnly) => {
    setEditing(await coursApi.get(c.id));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-display font-semibold text-fg">Cours</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Référentiel des cours académiques.
          </p>
        </div>
        <CoursCreateDialog onCreated={() => mutate()} />
      </div>

      <AdminTableToolbar countLabel={`${ctrl.total} cours`}>
        <TableSearch
          label="Rechercher un cours"
          placeholder="Rechercher par code ou nom…"
          value={ctrl.query}
          onChange={ctrl.setQuery}
        />
      </AdminTableToolbar>

      {isLoading ? (
        <AdminTableLoading />
      ) : ctrl.total === 0 ? (
        <AdminTableEmpty
          title="Aucun cours trouvé"
          description={ctrl.query ? "Modifiez votre recherche." : "Créez le premier cours."}
        />
      ) : (
        <>
          <CoursTable cours={ctrl.pageItems} onEdit={openEdit} onDelete={setDeleting} />
          <TablePagination
            page={ctrl.page} pageCount={ctrl.pageCount} pageSize={ctrl.pageSize}
            total={ctrl.total} onPageChange={ctrl.setPage} onPageSizeChange={ctrl.setPageSize}
          />
        </>
      )}

      <CoursEditDialog cours={editing} onClose={() => setEditing(null)} onUpdated={() => mutate()} />
      <CoursDeleteDialog cours={deleting} onClose={() => setDeleting(null)} onDone={() => mutate()} />
    </div>
  );
}
```

- [ ] **Step 2 : Appliquer le même schéma aux autres pages**

Pour chaque page : charger la liste complète, créer un `match…` (champs pertinents), instancier `useTableControls`, passer `ctrl.pageItems` à la table, rendre `TableSearch` (toolbar) + `TablePagination` (sous la table).

- [ ] `app/dashboard/admin/programmes/page.tsx` (`ProgrammesTable`) → match sur `code + nom + departement`.
- [ ] `app/dashboard/admin/sessions/page.tsx` (`SessionsTable`) → match sur `nom`.
- [ ] `app/dashboard/admin/utilisateurs/page.tsx` (`UsersTable`) → match sur `nom_complet + email`.
- [ ] `app/dashboard/rh/professeurs/…` page (`ProfesseursTable`, `frontend/components/rh/professeurs/`) → match sur `nom_complet` (+ email si présent). Importer `TableSearch`/`TablePagination` depuis `@/components/admin/AdminDataTable` (chrome de table partagé).

> Si une page faisait déjà une recherche serveur (cas cours), la remplacer par la recherche client pour uniformité. Vérifier que chaque table reçoit bien `pageItems` et non la liste brute.

- [ ] **Step 3 : Test d'intégration sur la pagination d'une page**

Créer `frontend/app/dashboard/admin/cours/__tests__/pagination.test.tsx` :

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import Page from "../page";
import { coursApi } from "@/lib/api/cours";

vi.mock("@/lib/api/cours", () => ({
  coursApi: {
    list: vi.fn().mockResolvedValue(
      Array.from({ length: 7 }, (_, i) => ({
        id: i + 1, code: `INF${i}`, nom: `Cours ${i}`, credits: 3, heures: 45,
      })),
    ),
    get: vi.fn(),
  },
}));

describe("Page Cours — pagination", () => {
  it("n'affiche que 5 lignes sur 7 et le compteur total", async () => {
    render(<Page />);
    await waitFor(() => expect(screen.getByText("7 cours")).toBeInTheDocument());
    expect(screen.getAllByRole("row").length).toBe(5 + 1); // 5 lignes + en-tête
    expect(screen.getByText("1–5 sur 7")).toBeInTheDocument();
  });
});
```

- [ ] **Step 4 : Vérifier**

Run: `cd frontend && npx vitest run app/dashboard/admin/cours && npm run lint && npx tsc --noEmit`
Expected: PASS, 0 erreur.

- [ ] **Step 5 : Commit**

```bash
git add frontend/app/dashboard frontend/components
git commit -m "feat(frontend): recherche + pagination configurable (5/déf) sur les tableaux"
```

---

## Task 6 : Pondérations W1–W4 en lecture seule côté RH

Deux volets : durcir le backend (`PUT ponderations` → admin seul) et figer le frontend RH (sliders read-only, plus de `updatePonderations`).

**Files:**
- Modify: `backend/app/routers/sessions.py:147`
- Modify: `backend/tests/test_sessions_router.py` (ou fichier de test des ponderations)
- Modify: `frontend/components/affectation/WeightSliders.tsx`
- Modify: `frontend/components/affectation/GenerationForm.tsx`

- [ ] **Step 1 : Test backend — RH refusé sur PUT ponderations**

Ajouter dans le fichier de test des sessions/ponderations :

```python
@pytest.mark.asyncio
async def test_update_ponderations_refuse_rh(
    client: AsyncClient, auth_headers_rh: dict, db_session: AsyncSession
):
    # créer une session minimale
    from app.models.session import Session, SessionStatut
    s = Session(nom="Automne 2026", statut=SessionStatut.OUVERTE)
    db_session.add(s)
    await db_session.commit()
    await db_session.refresh(s)
    r = await client.put(
        f"/api/sessions/{s.id}/ponderations",
        json={"w1": 0.4, "w2": 0.3, "w3": 0.2, "w4": 0.1},
        headers=auth_headers_rh,
    )
    assert r.status_code == 403
```

> Adapter la construction de `Session` aux champs réels du modèle (`session.py`). Si un test « admin peut éditer » existe déjà, le conserver.

- [ ] **Step 2 : Lancer le test (échec attendu — renvoie 200)**

Run: `cd backend && pytest tests/test_sessions_router.py::test_update_ponderations_refuse_rh -v`
Expected: FAIL (actuellement 200, RH autorisé).

- [ ] **Step 3 : Durcir le rôle**

`backend/app/routers/sessions.py` ligne ~147 :

```python
@router.put("/{session_id}/ponderations", response_model=PonderationsOut)
async def update_session_ponderations(
    session_id: int,
    payload: PonderationsUpdate,
    current_user: User = Depends(require_role("admin")),  # ← retirer "rh"
    db: AsyncSession = Depends(get_db),
) -> PonderationsOut:
    ...
```

(Laisser `GET /{session_id}/ponderations` en `("admin", "rh")` — le RH doit pouvoir lire.)

- [ ] **Step 4 : Lancer le test (succès attendu)**

Run: `cd backend && pytest tests/test_sessions_router.py -v`
Expected: PASS (le nouveau test + les existants ; corriger un éventuel test « rh peut éditer » devenu caduc).

- [ ] **Step 5 : `WeightSliders` — prop `readOnly`**

Modifier `frontend/components/affectation/WeightSliders.tsx` :

```tsx
interface WeightSlidersProps {
  value: Weights;
  onChange?: (weights: Weights) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

export function WeightSliders({
  value,
  onChange,
  disabled = false,
  readOnly = false,
}: WeightSlidersProps) {
  // …
  function handleChange(key: keyof Weights, newVal: number) {
    if (readOnly || !onChange) return;
    onChange({ ...value, [key]: Math.round(newVal * 1000) / 1000 });
  }
  // dans le JSX, sous le titre, quand readOnly :
  // remplacer le paragraphe d'aide par :
  //   <p className="text-xs text-fg-muted">Définies par l'administrateur pour cette session.</p>
  // et sur chaque <Slider/> : disabled={disabled || readOnly}
```

- [ ] **Step 6 : `GenerationForm` — lecture seule + plus de persistance**

Dans `frontend/components/affectation/GenerationForm.tsx` :
- Passer le slider en lecture seule :

```tsx
<WeightSliders value={weights} readOnly />
```

- Dans `handleLaunch`, **supprimer** la ligne `await sessionsApi.updatePonderations(selectedSessionId, weights);` (les poids sont déjà ceux de la session, fixés par l'admin).
- Conserver le chargement des `ponderations` et l'effet qui initialise `weights` (sert à l'affichage et au calcul de `sumValid`).

- [ ] **Step 7 : Test frontend — sliders non éditables**

Mettre à jour/compléter `WeightSliders.test.tsx` :

```tsx
it("ne déclenche pas onChange en lecture seule", () => {
  const onChange = vi.fn();
  render(<WeightSliders value={{ w1: 0.4, w2: 0.3, w3: 0.2, w4: 0.1 }} onChange={onChange} readOnly />);
  // les sliders sont désactivés
  for (const slider of screen.getAllByRole("slider")) {
    expect(slider).toHaveAttribute("data-disabled");
  }
});
```

> Adapter l'assertion au markup réel du `Slider` shadcn (attribut `data-disabled` ou `aria-disabled`). Vérifier d'abord le rendu avec un `screen.debug()` si besoin.

- [ ] **Step 8 : Vérifier**

Run: `cd backend && pytest tests/test_sessions_router.py -v` puis `cd frontend && npx vitest run components/affectation/WeightSliders.test.tsx && npm run lint && npx tsc --noEmit`
Expected: PASS, 0 erreur.

- [ ] **Step 9 : Commit**

```bash
git add backend/app/routers/sessions.py backend/tests frontend/components/affectation
git commit -m "feat(api,frontend): édition W1–W4 réservée à l'admin, lecture seule côté RH"
```

---

## Task 7 : Enrichir les pages de détail (programmes, sessions)

Affichage seulement (aucun champ DB ajouté). Cours détail affiche déjà la description → rien à faire.

**Files:**
- Modify: `frontend/app/dashboard/admin/programmes/[id]/page.tsx`
- Modify: `frontend/app/dashboard/admin/sessions/[id]/page.tsx`

- [ ] **Step 1 : Programme — afficher le nombre d'étapes/cours dans l'en-tête**

Dans l'en-tête de `programmes/[id]/page.tsx`, sous le bloc « Admission », ajouter un résumé dérivé des données déjà chargées (`etapesSwr.data`) :

```tsx
<div className="mt-2 text-sm text-fg-muted">
  {(etapesSwr.data?.length ?? 0)} étape{(etapesSwr.data?.length ?? 0) > 1 ? "s" : ""}
  {" · "}
  {(etapesSwr.data ?? []).reduce((n, e) => n + (e.cours?.length ?? 0), 0)} cours rattaché(s)
</div>
```

> Vérifier le champ réel des cours par étape dans le type `Etape` (`frontend/lib/types/programmes.ts`). Si le compte de cours n'est pas disponible sans appel supplémentaire, n'afficher que le nombre d'étapes (ne pas inventer de champ).

- [ ] **Step 2 : Session — enrichir l'en-tête**

Dans `sessions/[id]/page.tsx`, présenter clairement les métadonnées existantes de la session (statut via `SessionStatutBadge`, et les pondérations via `PonderationsBar` si la page les charge déjà). N'afficher que des champs réellement présents sur le type `Session` / la réponse ponderations — ne pas ajouter de champ description.

- [ ] **Step 3 : Test d'affichage (programme)**

Créer `frontend/app/dashboard/admin/programmes/__tests__/detail-header.test.tsx` :

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import Page from "../[id]/page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "3" }),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/lib/api/programmes", () => ({
  programmesApi: { get: vi.fn().mockResolvedValue({
    id: 3, code: "51046", nom: "Génie", departement: "TI", semestres_admission: ["AUTOMNE"],
  }) },
}));
vi.mock("@/lib/api/etapes", () => ({
  etapesApi: { list: vi.fn().mockResolvedValue([{ id: 1, ordre: 1, nom: "A", cours: [] }]) },
}));

describe("Détail programme", () => {
  it("affiche le département et le nombre d'étapes", async () => {
    render(<Page />);
    await waitFor(() => expect(screen.getByText("TI")).toBeInTheDocument());
    expect(screen.getByText(/1 étape/)).toBeInTheDocument();
  });
});
```

> Adapter les mocks aux signatures réelles (vérifier `etapesApi`/`programmesApi`). Si le champ `cours` n'existe pas sur `Etape`, retirer l'assertion correspondante.

- [ ] **Step 4 : Vérifier**

Run: `cd frontend && npx vitest run app/dashboard/admin/programmes && npm run lint && npx tsc --noEmit`
Expected: PASS, 0 erreur.

- [ ] **Step 5 : Commit**

```bash
git add frontend/app/dashboard/admin/programmes frontend/app/dashboard/admin/sessions
git commit -m "feat(frontend): enrichir l'affichage des pages de détail programmes et sessions"
```

---

## Task 8 : Compétences requises à la création d'un cours

Flux client : `coursApi.create` → pour chaque compétence saisie, `coursCompetencesApi.create(coursId, …)`. Échec partiel toléré (cours créé, compétences signalées). Description en `Textarea`.

**Files:**
- Modify: `frontend/components/admin/CoursCreateDialog.tsx`
- Test: `frontend/components/admin/CoursCreateDialog.test.tsx`

- [ ] **Step 1 : Écrire le test qui échoue**

```tsx
// frontend/components/admin/CoursCreateDialog.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CoursCreateDialog } from "./CoursCreateDialog";
import { coursApi } from "@/lib/api/cours";
import { coursCompetencesApi } from "@/lib/api/coursCompetences";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/cours", () => ({ coursApi: { create: vi.fn() } }));
vi.mock("@/lib/api/coursCompetences", () => ({ coursCompetencesApi: { create: vi.fn() } }));

describe("CoursCreateDialog — compétences", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crée le cours puis attache les compétences saisies", async () => {
    (coursApi.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 42, code: "INF1001", nom: "Intro" });
    (coursCompetencesApi.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
    render(<CoursCreateDialog onCreated={() => {}} />);

    await userEvent.click(screen.getByRole("button", { name: /Nouveau cours/i }));
    await userEvent.type(screen.getByLabelText("Code"), "INF1001");
    await userEvent.type(screen.getByLabelText("Nom"), "Intro");
    await userEvent.type(screen.getByLabelText(/Compétence/i), "Python");
    await userEvent.click(screen.getByRole("button", { name: /Ajouter à la liste/i }));
    await userEvent.click(screen.getByRole("button", { name: "Créer" }));

    expect(coursApi.create).toHaveBeenCalledTimes(1);
    expect(coursCompetencesApi.create).toHaveBeenCalledWith(42, { nom: "Python", importance: 3 });
  });
});
```

- [ ] **Step 2 : Lancer le test (échec attendu)**

Run: `cd frontend && npx vitest run components/admin/CoursCreateDialog.test.tsx`
Expected: FAIL — pas de champ compétence / pas d'appel `coursCompetencesApi.create`.

- [ ] **Step 3 : Implémenter (compétences en liste + Textarea + attache séquentielle)**

Modifier `CoursCreateDialog.tsx` :
- Importer `Textarea` (`@/components/ui/textarea`), `Select…`, `toastSuccess/toastError`, `coursCompetencesApi`.
- Ajouter un état local de compétences à attacher :

```tsx
type DraftComp = { nom: string; importance: number };
const [comps, setComps] = useState<DraftComp[]>([]);
const [compNom, setCompNom] = useState("");
const [compImp, setCompImp] = useState("3");

function addComp() {
  const nom = compNom.trim();
  if (!nom) return;
  setComps((prev) => [...prev, { nom, importance: Number(compImp) }]);
  setCompNom("");
  setCompImp("3");
}
function removeComp(i: number) {
  setComps((prev) => prev.filter((_, idx) => idx !== i));
}
```

- Remplacer le champ description `Input` par `Textarea` (label « Description (optionnel) »).
- Ajouter une section UI : `Input` (label « Compétence requise »), `Select` importance (réutiliser `IMPORTANCE_OPTIONS` extrait de `CompetenceAddDialog`, ou redéfinir localement les 5 options), bouton « Ajouter à la liste » (`onClick={addComp}`), et la liste des `comps` avec un bouton retrait par item.
- `handleSubmit` :

```tsx
async function handleSubmit() {
  setSubmitting(true);
  try {
    const cours = await coursApi.create({
      code: code.trim(),
      nom: nom.trim(),
      description: description.trim() || null,
      credits: credits.trim() === "" ? null : Number(credits),
      heures: heures.trim() === "" ? null : Number(heures),
    });
    const echecs: string[] = [];
    for (const c of comps) {
      try {
        await coursCompetencesApi.create(cours.id, { nom: c.nom, importance: c.importance });
      } catch {
        echecs.push(c.nom);
      }
    }
    if (echecs.length === 0) {
      toastSuccess(`Cours ${cours.code} créé${comps.length ? ` avec ${comps.length} compétence(s)` : ""}.`);
    } else {
      toastError(null, `Cours créé, mais ces compétences n'ont pas été ajoutées : ${echecs.join(", ")}. Complétez-les depuis le détail du cours.`);
    }
    onCreated();
    setOpen(false);
    reset();
  } catch (e) {
    toastError(e, "Création impossible.");
  } finally {
    setSubmitting(false);
  }
}
```

- Étendre `reset()` pour vider `comps`, `compNom`, `compImp`.
- Extraire `IMPORTANCE_OPTIONS` (présent dans `CompetenceAddDialog.tsx`) vers un module partagé `frontend/components/admin/competence-options.ts` et l'importer dans les deux dialogs (DRY).

> `toastError(null, msg)` : `null` n'est ni `ApiError` ni `Error`, donc le fallback (le message détaillé) est affiché — comportement voulu pour le chemin dégradé.

- [ ] **Step 4 : Lancer le test (succès attendu)**

Run: `cd frontend && npx vitest run components/admin/CoursCreateDialog.test.tsx`
Expected: PASS.

- [ ] **Step 5 : Vérifier**

Run: `cd frontend && npm run lint && npx tsc --noEmit`
Expected: 0 erreur.

- [ ] **Step 6 : Commit**

```bash
git add frontend/components/admin/CoursCreateDialog.tsx frontend/components/admin/CompetenceAddDialog.tsx frontend/components/admin/competence-options.ts frontend/components/admin/CoursCreateDialog.test.tsx
git commit -m "feat(frontend): compétences requises et description multi-lignes à la création d'un cours"
```

---

## Task 9 : Backend `GET /api/admin/stats`

**Files:**
- Create: `backend/app/schemas/admin_stats.py`
- Create: `backend/app/services/admin_stats_service.py`
- Create: `backend/app/routers/admin_stats.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_admin_stats_router.py`

- [ ] **Step 1 : Schéma de sortie**

```python
# backend/app/schemas/admin_stats.py
from pydantic import BaseModel


class AdminStatsOut(BaseModel):
    utilisateurs_total: int
    professeurs_total: int
    cv_traites: int
    cv_en_attente: int
    cours_total: int
    programmes_total: int
    sessions_total: int
    sessions_ouvertes: int
    affectations_total: int
    affectations_validees: int
```

- [ ] **Step 2 : Service d'agrégation**

```python
# backend/app/services/admin_stats_service.py
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.affectation import Affectation, AffectationStatut
from app.models.cours import Cours
from app.models.cv import CV, CVStatut
from app.models.professeur import Professeur
from app.models.programme import Programme
from app.models.session import Session, SessionStatut
from app.models.user import User
from app.schemas.admin_stats import AdminStatsOut


async def _count(db: AsyncSession, model, *conditions) -> int:
    stmt = select(func.count()).select_from(model)
    for cond in conditions:
        stmt = stmt.where(cond)
    return int((await db.execute(stmt)).scalar_one())


async def compute_admin_stats(db: AsyncSession) -> AdminStatsOut:
    """Compteurs agrégés du tableau de bord admin (une requête count par métrique)."""
    return AdminStatsOut(
        utilisateurs_total=await _count(db, User),
        professeurs_total=await _count(db, Professeur),
        cv_traites=await _count(db, CV, CV.statut == CVStatut.TRAITE),
        cv_en_attente=await _count(db, CV, CV.statut != CVStatut.TRAITE),
        cours_total=await _count(db, Cours),
        programmes_total=await _count(db, Programme),
        sessions_total=await _count(db, Session),
        sessions_ouvertes=await _count(db, Session, Session.statut == SessionStatut.OUVERTE),
        affectations_total=await _count(db, Affectation),
        affectations_validees=await _count(db, Affectation, Affectation.statut == AffectationStatut.VALIDEE),
    )
```

> Vérifier les chemins d'import réels (`app.models.cv.CV`, etc.). Si `CV` n'a pas de statut `EN_ATTENTE` distinct, `statut != TRAITE` couvre l'en-attente — adapter si l'enum diffère.

- [ ] **Step 3 : Router**

```python
# backend/app/routers/admin_stats.py
"""Statistiques du tableau de bord admin (lecture seule).

Préfixe : /api/admin/stats
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_role
from app.db.session import get_db
from app.models.user import User
from app.schemas.admin_stats import AdminStatsOut
from app.services.admin_stats_service import compute_admin_stats

router = APIRouter()


@router.get("", response_model=AdminStatsOut)
async def get_admin_stats(
    _: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
) -> AdminStatsOut:
    return await compute_admin_stats(db)
```

- [ ] **Step 4 : Enregistrer le router**

Dans `backend/app/main.py`, après l'import des routers :

```python
from app.routers import admin_stats as admin_stats_router
```

et après les `include_router` :

```python
app.include_router(admin_stats_router.router, prefix="/api/admin/stats", tags=["admin-stats"])
```

- [ ] **Step 5 : Écrire le test**

```python
# backend/tests/test_admin_stats_router.py
"""Tests endpoint /api/admin/stats."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cours import Cours


@pytest.mark.asyncio
async def test_stats_refuse_rh(client: AsyncClient, auth_headers_rh: dict):
    r = await client.get("/api/admin/stats", headers=auth_headers_rh)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_stats_refuse_prof(client: AsyncClient, auth_headers_prof: dict):
    r = await client.get("/api/admin/stats", headers=auth_headers_prof)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_stats_compte_les_entites(
    client: AsyncClient, auth_headers_admin: dict, db_session: AsyncSession
):
    db_session.add_all([
        Cours(code="INF1001", nom="Intro", credits=3, heures=45),
        Cours(code="INF2001", nom="Algo", credits=3, heures=45),
    ])
    await db_session.commit()

    r = await client.get("/api/admin/stats", headers=auth_headers_admin)
    assert r.status_code == 200
    data = r.json()
    assert data["cours_total"] == 2
    # l'admin authentifié compte au moins 1 utilisateur
    assert data["utilisateurs_total"] >= 1
    for key in (
        "professeurs_total", "cv_traites", "cv_en_attente", "programmes_total",
        "sessions_total", "sessions_ouvertes", "affectations_total", "affectations_validees",
    ):
        assert key in data and isinstance(data[key], int)
```

- [ ] **Step 6 : Lancer les tests**

Run: `cd backend && pytest tests/test_admin_stats_router.py -v`
Expected: PASS (3 tests).

- [ ] **Step 7 : Vérifier la couverture**

Run: `cd backend && pytest --cov=app.services.admin_stats_service --cov=app.routers.admin_stats tests/test_admin_stats_router.py`
Expected: ≥ 70 % sur les fichiers ajoutés.

- [ ] **Step 8 : Commit**

```bash
git add backend/app/schemas/admin_stats.py backend/app/services/admin_stats_service.py backend/app/routers/admin_stats.py backend/app/main.py backend/tests/test_admin_stats_router.py
git commit -m "feat(api): endpoint GET /api/admin/stats (compteurs du tableau de bord)"
```

---

## Task 10 : Dashboard admin — cartes de stats réelles

**Files:**
- Create: `frontend/lib/api/adminStats.ts`
- Modify: `frontend/lib/types/api.ts` (ajout type `AdminStatsOut`)
- Create: `frontend/components/admin/AdminStatsCards.tsx`
- Test: `frontend/components/admin/AdminStatsCards.test.tsx`
- Modify: `frontend/app/dashboard/admin/page.tsx`

- [ ] **Step 1 : Type + client API**

Ajouter dans `frontend/lib/types/api.ts` :

```ts
export interface AdminStatsOut {
  utilisateurs_total: number;
  professeurs_total: number;
  cv_traites: number;
  cv_en_attente: number;
  cours_total: number;
  programmes_total: number;
  sessions_total: number;
  sessions_ouvertes: number;
  affectations_total: number;
  affectations_validees: number;
}
```

```ts
// frontend/lib/api/adminStats.ts
import { apiClient } from "./client";
import type { AdminStatsOut } from "@/lib/types/api";

export const adminStatsApi = {
  get: (): Promise<AdminStatsOut> => apiClient.get<AdminStatsOut>("/api/admin/stats"),
};
```

- [ ] **Step 2 : Écrire le test du composant (échec attendu)**

```tsx
// frontend/components/admin/AdminStatsCards.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminStatsCards } from "./AdminStatsCards";

const stats = {
  utilisateurs_total: 5, professeurs_total: 3, cv_traites: 2, cv_en_attente: 1,
  cours_total: 8, programmes_total: 2, sessions_total: 1, sessions_ouvertes: 1,
  affectations_total: 4, affectations_validees: 2,
};

describe("AdminStatsCards", () => {
  it("affiche les compteurs et un squelette en chargement", () => {
    const { rerender } = render(<AdminStatsCards stats={undefined} isLoading />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    rerender(<AdminStatsCards stats={stats} isLoading={false} />);
    expect(screen.getByText("8")).toBeInTheDocument(); // cours
    expect(screen.getByText(/Cours/)).toBeInTheDocument();
  });
});
```

Run: `cd frontend && npx vitest run components/admin/AdminStatsCards.test.tsx` → FAIL (import non résolu).

- [ ] **Step 3 : Implémenter le composant de cartes**

```tsx
// frontend/components/admin/AdminStatsCards.tsx
import Link from "next/link";
import type { ReactNode } from "react";
import { UserCog, BookOpen, Calendar, GraduationCap, ClipboardCheck } from "lucide-react";
import type { AdminStatsOut } from "@/lib/types/api";

interface CardDef {
  title: string;
  value: number;
  hint?: string;
  href: string;
  icon: ReactNode;
}

export function AdminStatsCards({
  stats,
  isLoading,
}: {
  stats: AdminStatsOut | undefined;
  isLoading: boolean;
}) {
  if (isLoading || !stats) {
    return (
      <div role="status" aria-live="polite" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg border border-border bg-canvas-pure" />
        ))}
        <span className="sr-only">Chargement des statistiques…</span>
      </div>
    );
  }

  const cards: CardDef[] = [
    { title: "Utilisateurs", value: stats.utilisateurs_total, hint: `${stats.professeurs_total} professeurs`, href: "/dashboard/admin/utilisateurs", icon: <UserCog className="h-5 w-5 text-primary" /> },
    { title: "CV traités", value: stats.cv_traites, hint: `${stats.cv_en_attente} en attente`, href: "/dashboard/rh/professeurs", icon: <ClipboardCheck className="h-5 w-5 text-primary" /> },
    { title: "Cours", value: stats.cours_total, href: "/dashboard/admin/cours", icon: <BookOpen className="h-5 w-5 text-primary" /> },
    { title: "Programmes", value: stats.programmes_total, href: "/dashboard/admin/programmes", icon: <GraduationCap className="h-5 w-5 text-primary" /> },
    { title: "Sessions", value: stats.sessions_total, hint: `${stats.sessions_ouvertes} ouverte(s)`, href: "/dashboard/admin/sessions", icon: <Calendar className="h-5 w-5 text-primary" /> },
    { title: "Affectations validées", value: stats.affectations_validees, hint: `${stats.affectations_total} au total`, href: "/dashboard/rh/affectations", icon: <ClipboardCheck className="h-5 w-5 text-primary" /> },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((c) => (
        <Link
          key={c.title}
          href={c.href}
          className="rounded-lg border border-border bg-canvas-pure p-5 transition hover:bg-surface-hover"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-fg-muted">{c.title}</span>
            {c.icon}
          </div>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-fg">{c.value}</p>
          {c.hint && <p className="mt-1 text-xs text-fg-muted">{c.hint}</p>}
        </Link>
      ))}
    </div>
  );
}
```

Run: `cd frontend && npx vitest run components/admin/AdminStatsCards.test.tsx` → PASS.

- [ ] **Step 4 : Remplacer le placeholder du dashboard**

```tsx
// frontend/app/dashboard/admin/page.tsx
"use client";

import useSWR from "swr";
import { Scale } from "lucide-react";
import { adminStatsApi } from "@/lib/api/adminStats";
import type { AdminStatsOut } from "@/lib/types/api";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";

export default function Page() {
  const { data, isLoading } = useSWR<AdminStatsOut>("admin:stats", adminStatsApi.get);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display font-semibold text-fg flex items-center gap-2">
          <Scale className="h-6 w-6 text-primary" />
          Espace administrateur
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Vue d&apos;ensemble du système : comptes, catalogue, sessions et affectations.
        </p>
      </div>
      <AdminStatsCards stats={data} isLoading={isLoading} />
    </div>
  );
}
```

- [ ] **Step 5 : Vérifier**

Run: `cd frontend && npx vitest run components/admin/AdminStatsCards.test.tsx && npm run lint && npx tsc --noEmit`
Expected: PASS, 0 erreur.

- [ ] **Step 6 : Commit**

```bash
git add frontend/lib/api/adminStats.ts frontend/lib/types/api.ts frontend/components/admin/AdminStatsCards.tsx frontend/components/admin/AdminStatsCards.test.tsx frontend/app/dashboard/admin/page.tsx
git commit -m "feat(frontend): tableau de bord admin avec statistiques réelles et accès rapides"
```

---

## Vérification finale (avant PR)

- [ ] `cd backend && pytest --cov=app` — tous verts, couverture ≥ 70 % sur fichiers modifiés.
- [ ] `cd frontend && npm run lint && npx tsc --noEmit` — 0 erreur, aucun `any`.
- [ ] `cd frontend && npx vitest run` — suite complète verte.
- [ ] Revue manuelle rapide (démo) : toasts visibles, recherche+pagination sur chaque table (5 par défaut), sliders W1–W4 figés côté RH, dashboard admin avec vrais chiffres, compétences ajoutées à la création d'un cours, en-têtes de détail enrichis.
- [ ] Ouvrir la PR `feature/admin-ux-finitions` → `main` (CI verte, 1 review min, Conventional Commits).

## Notes de cohérence (self-review)

- Couverture spec : items 5 (T1–T2), 6 (T3–T5), 4 (T6), 3 (T7), 2 (T8), 1 (T9–T10) — tous couverts.
- Correction vs spec : l'item 4 inclut un durcissement backend (`PUT ponderations` → admin) car le RH persistait réellement les poids via `updatePonderations` ; le frontend seul aurait laissé une faille.
- Noms cohérents inter-tâches : `useTableControls` (T3) consommé en T5 ; `TableSearch`/`TablePagination` (T4) consommés en T5 ; `toastSuccess`/`toastError` (T1) consommés en T2 et T8 ; `AdminStatsOut` (T9 schéma ↔ T10 type) aligné.
- Points à confirmer pendant l'exécution (le worker vérifie le code réel, ne devine pas) : markup `disabled` du `Slider` shadcn (T6), champ « cours par étape » sur le type `Etape` (T7), champs réels du modèle `Session` pour le test (T6), enum `CVStatut` (T9).
