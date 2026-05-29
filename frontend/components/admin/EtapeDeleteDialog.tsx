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
import { toastSuccess, toastError } from "@/lib/toast";

interface Props {
  programmeId: number;
  etape: Etape | null;
  onClose: () => void;
  onDone: () => void;
}

export function EtapeDeleteDialog({ programmeId, etape, onClose, onDone }: Props) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!etape) return;
    setSubmitting(true);
    try {
      await etapesApi.remove(programmeId, etape.id);
      toastSuccess("Étape supprimée.");
      onDone();
      onClose();
    } catch (e) {
      toastError(e, "Suppression impossible.");
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
