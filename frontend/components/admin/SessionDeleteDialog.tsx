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
import { sessionsApi } from "@/lib/api/sessions";
import type { Session } from "@/lib/types/api";

interface Props {
  session: Session | null;
  onClose: () => void;
  onDone: () => void;
}

export function SessionDeleteDialog({ session, onClose, onDone }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!session) return;
    setSubmitting(true);
    setError(null);
    try {
      await sessionsApi.remove(session.id);
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog open={!!session} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer cette session ?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{session?.nom}</strong> sera supprimée avec ses pondérations W1–W4 et
            toutes les affectations rattachées. Cette action est irréversible.
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
