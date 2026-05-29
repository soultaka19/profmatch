"use client";

import { useState } from "react";
import useSWR from "swr";
import { sessionsApi } from "@/lib/api/sessions";
import type { Session } from "@/lib/types/api";
import { SessionsTable } from "@/components/admin/SessionsTable";
import { SessionCreateDialog } from "@/components/admin/SessionCreateDialog";
import { SessionDeleteDialog } from "@/components/admin/SessionDeleteDialog";
import {
  AdminTableEmpty, AdminTableLoading, AdminTableToolbar,
  TableSearch, TablePagination,
} from "@/components/admin/AdminDataTable";
import { useTableControls } from "@/lib/hooks/useTableControls";

const matchSession = (s: Session, q: string) =>
  s.nom.toLowerCase().includes(q.toLowerCase());

export default function Page() {
  const { data: sessions, mutate, isLoading } = useSWR<Session[]>(
    "sessions:list",
    () => sessionsApi.list(),
  );
  const [deleting, setDeleting] = useState<Session | null>(null);

  const ctrl = useTableControls(sessions ?? [], matchSession);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-display font-semibold text-fg">Sessions académiques</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Périodes d&apos;affectation (Automne 2026, Hiver 2027…). Les pondérations W1–W4
            sont configurées au niveau de chaque session.
          </p>
        </div>
        <SessionCreateDialog onCreated={() => mutate()} />
      </div>

      <AdminTableToolbar countLabel={`${ctrl.total} session${ctrl.total === 1 ? "" : "s"}`}>
        <TableSearch
          label="Rechercher une session"
          placeholder="Rechercher par nom…"
          value={ctrl.query}
          onChange={ctrl.setQuery}
        />
      </AdminTableToolbar>

      {isLoading ? (
        <AdminTableLoading />
      ) : ctrl.total === 0 ? (
        <AdminTableEmpty
          title="Aucune session"
          description={ctrl.query ? "Modifiez votre recherche." : "Créez une session académique pour commencer."}
        />
      ) : (
        <>
          <SessionsTable sessions={ctrl.pageItems} onDelete={setDeleting} />
          <TablePagination
            page={ctrl.page} pageCount={ctrl.pageCount} pageSize={ctrl.pageSize}
            total={ctrl.total} onPageChange={ctrl.setPage} onPageSizeChange={ctrl.setPageSize}
          />
        </>
      )}

      <SessionDeleteDialog
        session={deleting}
        onClose={() => setDeleting(null)}
        onDone={() => mutate()}
      />
    </div>
  );
}
