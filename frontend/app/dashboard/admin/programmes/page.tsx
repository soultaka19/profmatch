"use client";

import { useState } from "react";
import useSWR from "swr";
import { programmesApi } from "@/lib/api/programmes";
import type { Programme } from "@/lib/types/api";
import { ProgrammesTable } from "@/components/admin/ProgrammesTable";
import { ProgrammeCreateDialog } from "@/components/admin/ProgrammeCreateDialog";
import { ProgrammeEditDialog } from "@/components/admin/ProgrammeEditDialog";
import { ProgrammeDeleteDialog } from "@/components/admin/ProgrammeDeleteDialog";
import { ProgrammeDetailDrawer } from "@/components/admin/ProgrammeDetailDrawer";
import {
  AdminTableEmpty, AdminTableLoading, AdminTableToolbar,
  TableSearch, TablePagination,
} from "@/components/admin/AdminDataTable";
import { useTableControls } from "@/lib/hooks/useTableControls";

const matchProgramme = (p: Programme, q: string) =>
  `${p.code} ${p.nom} ${p.departement ?? ""}`.toLowerCase().includes(q.toLowerCase());

export default function Page() {
  const { data: programmes, mutate, isLoading } = useSWR<Programme[]>(
    "programmes:list",
    () => programmesApi.list()
  );
  const [editing, setEditing] = useState<Programme | null>(null);
  const [deleting, setDeleting] = useState<Programme | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);

  const ctrl = useTableControls(programmes ?? [], matchProgramme);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-display font-semibold text-fg">Programmes</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Référentiel des programmes académiques avec leurs étapes et le cursus.
          </p>
        </div>
        <ProgrammeCreateDialog onCreated={() => mutate()} />
      </div>

      <AdminTableToolbar countLabel={`${ctrl.total} programme${ctrl.total === 1 ? "" : "s"}`}>
        <TableSearch
          label="Rechercher un programme"
          placeholder="Rechercher par code, nom ou département…"
          value={ctrl.query}
          onChange={ctrl.setQuery}
        />
      </AdminTableToolbar>

      {isLoading ? (
        <AdminTableLoading />
      ) : ctrl.total === 0 ? (
        <AdminTableEmpty
          title="Aucun programme"
          description={ctrl.query ? "Modifiez votre recherche." : "Créez un programme pour structurer le cursus."}
        />
      ) : (
        <>
          <ProgrammesTable
            programmes={ctrl.pageItems}
            onOpen={(p) => setDetailId(p.id)}
            onEdit={setEditing}
            onDelete={setDeleting}
          />
          <TablePagination
            page={ctrl.page} pageCount={ctrl.pageCount} pageSize={ctrl.pageSize}
            total={ctrl.total} onPageChange={ctrl.setPage} onPageSizeChange={ctrl.setPageSize}
          />
        </>
      )}

      <ProgrammeEditDialog
        programme={editing}
        onClose={() => setEditing(null)}
        onUpdated={() => mutate()}
      />
      <ProgrammeDeleteDialog
        programme={deleting}
        onClose={() => setDeleting(null)}
        onDone={() => mutate()}
      />

      <ProgrammeDetailDrawer
        programmeId={detailId}
        open={detailId !== null}
        onOpenChange={(o) => {
          if (!o) setDetailId(null);
        }}
        onChanged={() => mutate()}
      />
    </div>
  );
}
