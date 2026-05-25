"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { sessionsApi } from "@/lib/api/sessions";
import type { Session } from "@/lib/types/api";
import { SessionStatusSwitcher } from "@/components/admin/SessionStatusSwitcher";
import { PonderationsPanel } from "@/components/admin/PonderationsPanel";
import { ProgrammesEligiblesPanel } from "@/components/admin/ProgrammesEligiblesPanel";

export default function Page() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = Number(params.id);

  const { data, mutate, isLoading, error } = useSWR<Session>(
    Number.isFinite(sessionId) ? `session:${sessionId}` : null,
    () => sessionsApi.get(sessionId),
  );

  if (!Number.isFinite(sessionId)) {
    return <p className="text-sm text-destructive">Identifiant invalide.</p>;
  }
  if (isLoading) {
    return <p className="text-sm text-fg-muted py-8 text-center">Chargement…</p>;
  }
  if (error || !data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">Session introuvable.</p>
        <Link className="text-sm text-primary underline" href="/dashboard/admin/sessions">
          Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/admin/sessions")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-fg">{data.nom}</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Session académique #{data.id} — créée le{" "}
            {new Date(data.cree_le).toLocaleDateString("fr-CA")}.
          </p>
        </div>
        <SessionStatusSwitcher session={data} onUpdated={() => mutate()} />
      </div>

      <PonderationsPanel sessionId={sessionId} />

      <ProgrammesEligiblesPanel sessionId={sessionId} />
    </div>
  );
}
