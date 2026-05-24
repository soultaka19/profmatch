"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { programmesApi } from "@/lib/api/programmes";
import { etapesApi } from "@/lib/api/etapes";
import type { Programme } from "@/lib/types/api";
import type { Etape } from "@/lib/types/programmes";
import { EtapeAccordion } from "@/components/admin/EtapeAccordion";
import { EtapeCreateDialog } from "@/components/admin/EtapeCreateDialog";
import { EtapeDeleteDialog } from "@/components/admin/EtapeDeleteDialog";
import { ProgrammeEditDialog } from "@/components/admin/ProgrammeEditDialog";

export default function Page() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const programmeId = Number(params.id);

  const programmeSwr = useSWR<Programme>(
    Number.isFinite(programmeId) ? `programme:${programmeId}` : null,
    () => programmesApi.get(programmeId),
  );
  const etapesSwr = useSWR<Etape[]>(
    Number.isFinite(programmeId) ? `etapes:${programmeId}` : null,
    () => etapesApi.list(programmeId),
  );

  const [editing, setEditing] = useState(false);
  const [deletingEtape, setDeletingEtape] = useState<Etape | null>(null);

  if (!Number.isFinite(programmeId)) {
    return <p className="text-sm text-destructive">Identifiant invalide.</p>;
  }
  if (programmeSwr.isLoading) {
    return <p className="text-sm text-fg-muted py-8 text-center">Chargement…</p>;
  }
  if (programmeSwr.error || !programmeSwr.data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">Programme introuvable.</p>
        <Link className="text-sm text-primary underline" href="/dashboard/admin/programmes">
          Retour à la liste
        </Link>
      </div>
    );
  }

  const programme = programmeSwr.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/admin/programmes")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-sm text-fg-muted">{programme.code}</p>
          <h1 className="text-2xl font-semibold text-fg">{programme.nom}</h1>
          {programme.departement && (
            <p className="mt-1 text-sm text-fg-muted">{programme.departement}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditing(true)}>Modifier le programme</Button>
          <EtapeCreateDialog
            programmeId={programmeId}
            onCreated={() => etapesSwr.mutate()}
          />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-fg mb-3">Étapes et cours</h2>
        {etapesSwr.isLoading ? (
          <p className="text-sm text-fg-muted">Chargement…</p>
        ) : (
          <EtapeAccordion
            programmeId={programmeId}
            etapes={etapesSwr.data ?? []}
            onDeleteEtape={setDeletingEtape}
            onCursusChanged={() => etapesSwr.mutate()}
          />
        )}
      </div>

      <ProgrammeEditDialog
        programme={editing ? programme : null}
        onClose={() => setEditing(false)}
        onUpdated={() => programmeSwr.mutate()}
      />
      <EtapeDeleteDialog
        programmeId={programmeId}
        etape={deletingEtape}
        onClose={() => setDeletingEtape(null)}
        onDone={() => etapesSwr.mutate()}
      />
    </div>
  );
}
