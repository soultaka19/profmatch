"use client";

import { useState } from "react";
import useSWR from "swr";
import { sessionsApi } from "@/lib/api/sessions";
import type { Session } from "@/lib/types/api";
import { SessionsTable } from "@/components/admin/SessionsTable";
import { SessionCreateDialog } from "@/components/admin/SessionCreateDialog";
import { SessionDeleteDialog } from "@/components/admin/SessionDeleteDialog";
import { TopbarAction } from "@/components/shell";
import { AdminTableEmpty, AdminTableLoading, AdminTableToolbar } from "@/components/admin/AdminDataTable";

export default function Page() {
  const { data: sessions, mutate, isLoading } = useSWR<Session[]>(
    "sessions:list",
    () => sessionsApi.list(),
  );
  const [deleting, setDeleting] = useState<Session | null>(null);

  return (
    <div className="space-y-6">
      <TopbarAction>
        <SessionCreateDialog onCreated={() => mutate()} />
      </TopbarAction>
      <div>
        <div>
          <h1 className="text-2xl font-semibold text-fg">Sessions académiques</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Périodes d&apos;affectation (Automne 2026, Hiver 2027…). Les pondérations W1–W4
            sont configurées au niveau de chaque session.
          </p>
        </div>
      </div>

      <AdminTableToolbar countLabel={`${sessions?.length ?? 0} session${sessions?.length === 1 ? "" : "s"}`} />

      {isLoading ? (
        <AdminTableLoading />
      ) : !sessions?.length ? (
        <AdminTableEmpty title="Aucune session" description="Créez une session académique pour commencer." />
      ) : (
        <SessionsTable sessions={sessions} onDelete={setDeleting} />
      )}

      <SessionDeleteDialog
        session={deleting}
        onClose={() => setDeleting(null)}
        onDone={() => mutate()}
      />
    </div>
  );
}
