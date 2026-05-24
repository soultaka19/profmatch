"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { coursApi } from "@/lib/api/cours";
import type { Cours } from "@/lib/types/cours";
import { CoursEditDialog } from "@/components/admin/CoursEditDialog";
import { CoursCompetencesPanel } from "@/components/admin/CoursCompetencesPanel";

export default function Page() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const coursId = Number(params.id);

  const { data: cours, error, isLoading, mutate } = useSWR<Cours>(
    Number.isFinite(coursId) ? `cours:${coursId}` : null,
    () => coursApi.get(coursId),
  );
  const [editing, setEditing] = useState(false);

  if (!Number.isFinite(coursId)) {
    return <p className="text-sm text-destructive">Identifiant invalide.</p>;
  }
  if (isLoading) {
    return <p className="text-sm text-fg-muted py-8 text-center">Chargement…</p>;
  }
  if (error || !cours) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">Cours introuvable.</p>
        <Link className="text-sm text-primary underline" href="/dashboard/admin/cours">
          Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/admin/cours")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-sm text-fg-muted">{cours.code}</p>
          <h1 className="text-2xl font-semibold text-fg">{cours.nom}</h1>
          {cours.description && (
            <p className="mt-2 text-sm text-fg-muted max-w-2xl">{cours.description}</p>
          )}
          <div className="mt-3 flex gap-4 text-sm text-fg-muted">
            <span>Crédits : <strong className="text-fg">{cours.credits ?? "—"}</strong></span>
            <span>Heures : <strong className="text-fg">{cours.heures ?? "—"}</strong></span>
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditing(true)}>Modifier le cours</Button>
      </div>

      <CoursCompetencesPanel coursId={coursId} />

      <CoursEditDialog
        cours={editing ? cours : null}
        onClose={() => setEditing(false)}
        onUpdated={() => mutate()}
      />
    </div>
  );
}
