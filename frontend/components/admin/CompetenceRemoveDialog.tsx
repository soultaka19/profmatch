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
import { coursCompetencesApi } from "@/lib/api/coursCompetences";
import type { CoursCompetence } from "@/lib/types/cours";

interface Props {
  coursId: number;
  competence: CoursCompetence | null;
  onClose: () => void;
  onDone: () => void;
}

export function CompetenceRemoveDialog({ coursId, competence, onClose, onDone }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!competence) return;
    setSubmitting(true);
    setError(null);
    try {
      await coursCompetencesApi.remove(coursId, competence.id);
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog open={!!competence} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retirer la compétence ?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{competence?.nom}</strong> sera retirée des compétences requises pour ce cours.
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
