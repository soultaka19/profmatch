"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { etapesApi } from "@/lib/api/etapes";
import type { Etape } from "@/lib/types/programmes";

interface Props {
  programmeId: number;
  etape: Etape | null;
  onClose: () => void;
  onDone: () => void;
}

export function EtapeDeleteDialog({ programmeId, etape, onClose, onDone }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!etape) return;
    setSubmitting(true);
    setError(null);
    try {
      await etapesApi.remove(programmeId, etape.id);
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog open={!!etape} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer l&apos;étape ?</AlertDialogTitle>
          <AlertDialogDescription>
            L&apos;étape <strong>{etape?.ordre} — {etape?.nom ?? "sans nom"}</strong> et tous ses
            cours rattachés (cursus) seront supprimés.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={submitting}>
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
