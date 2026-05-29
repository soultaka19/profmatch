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
import { programmesApi } from "@/lib/api/programmes";
import type { Programme } from "@/lib/types/api";
import { toastSuccess, toastError } from "@/lib/toast";

interface Props {
  programme: Programme | null;
  onClose: () => void;
  onDone: () => void;
}

export function ProgrammeDeleteDialog({ programme, onClose, onDone }: Props) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!programme) return;
    setSubmitting(true);
    try {
      await programmesApi.remove(programme.id);
      toastSuccess(`Programme ${programme.code} supprimé.`);
      onDone();
      onClose();
    } catch (e) {
      toastError(e, "Suppression impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog open={!!programme} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer ce programme ?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{programme?.code} — {programme?.nom}</strong> et toutes ses étapes et liens cursus seront supprimés
            définitivement. Cette action est irréversible.
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
