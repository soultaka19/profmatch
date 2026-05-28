"use client";

import { useState } from "react";
import useSWR from "swr";
import { programmesApi } from "@/lib/api/programmes";
import type { Programme } from "@/lib/types/api";
import { ProgrammesTable } from "@/components/admin/ProgrammesTable";
import { ProgrammeCreateDialog } from "@/components/admin/ProgrammeCreateDialog";
import { ProgrammeEditDialog } from "@/components/admin/ProgrammeEditDialog";
import { ProgrammeDeleteDialog } from "@/components/admin/ProgrammeDeleteDialog";
import { AdminTableEmpty, AdminTableLoading, AdminTableToolbar } from "@/components/admin/AdminDataTable";

export default function Page() {
  const { data: programmes, mutate, isLoading } = useSWR<Programme[]>(
    "programmes:list",
    () => programmesApi.list()
  );
  const [editing, setEditing] = useState<Programme | null>(null);
  const [deleting, setDeleting] = useState<Programme | null>(null);

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

      <AdminTableToolbar countLabel={`${programmes?.length ?? 0} programme${programmes?.length === 1 ? "" : "s"}`} />

      {isLoading ? (
        <AdminTableLoading />
      ) : !programmes?.length ? (
        <AdminTableEmpty title="Aucun programme" description="Créez un programme pour structurer le cursus." />
      ) : (
        <ProgrammesTable
          programmes={programmes}
          onEdit={setEditing}
          onDelete={setDeleting}
        />
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
    </div>
  );
}
