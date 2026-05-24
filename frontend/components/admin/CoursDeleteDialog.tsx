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
import { coursApi } from "@/lib/api/cours";
import type { CoursReadOnly } from "@/lib/types/programmes";

interface Props {
  cours: CoursReadOnly | null;
  onClose: () => void;
  onDone: () => void;
}

export function CoursDeleteDialog({ cours, onClose, onDone }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!cours) return;
    setSubmitting(true);
    setError(null);
    try {
      await coursApi.remove(cours.id);
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog open={!!cours} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer ce cours ?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{cours?.code} — {cours?.nom}</strong> sera supprimé. Toutes les
            compétences requises et les rattachements aux cursus de programmes
            seront aussi supprimés. Cette action est irréversible.
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
