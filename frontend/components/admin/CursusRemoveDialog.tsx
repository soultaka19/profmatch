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
import { cursusApi } from "@/lib/api/cursus";
import type { CursusItem, CoursReadOnly } from "@/lib/types/programmes";

interface Props {
  programmeId: number;
  etapeId: number;
  item: { cursus: CursusItem; cours: CoursReadOnly | null } | null;
  onClose: () => void;
  onDone: () => void;
}

export function CursusRemoveDialog({
  programmeId,
  etapeId,
  item,
  onClose,
  onDone,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!item) return;
    setSubmitting(true);
    setError(null);
    try {
      await cursusApi.remove(programmeId, etapeId, item.cursus.id);
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  const label = item?.cours
    ? `${item.cours.code} — ${item.cours.nom}`
    : `Cours #${item?.cursus.cours_id}`;

  return (
    <AlertDialog open={!!item} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retirer ce cours du cursus ?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{label}</strong> sera retiré de cette étape. Le cours lui-même
            reste dans le référentiel.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={submitting}>
            Retirer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
