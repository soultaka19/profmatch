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
            Référentiel des cours académiques. Les cours peuvent être rattachés aux étapes
            d&apos;un programme depuis la page Programmes.
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
