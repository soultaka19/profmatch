"use client";

import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CVResponse, CVStatut } from "@/lib/types/api";

interface Props {
  data: CVResponse | null | undefined;
  loading: boolean;
}

type BadgeVariant = "default" | "secondary" | "destructive";

const VARIANT_BY_STATUT: Record<CVStatut, BadgeVariant> = {
  traite: "default",
  erreur: "destructive",
  en_attente: "secondary",
  en_cours: "secondary",
};

const LABEL_BY_STATUT: Record<CVStatut, string> = {
  en_attente: "En file d'attente",
  en_cours: "Extraction en cours…",
  traite: "CV traité",
  erreur: "Erreur",
};

export function CVStatusCard({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-muted-foreground">
        Aucun CV téléversé pour le moment.
      </div>
    );
  }

  const variant = VARIANT_BY_STATUT[data.statut];
  const label = LABEL_BY_STATUT[data.statut];

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-center gap-3">
        <Badge variant={variant}>{label}</Badge>
        {(data.statut === "en_attente" || data.statut === "en_cours") && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        <span className="text-sm text-muted-foreground">{data.nom_original}</span>
      </div>
      {data.statut === "erreur" && data.message_erreur && (
        <p className="text-sm text-destructive">{data.message_erreur}</p>
      )}
    </div>
  );
}
