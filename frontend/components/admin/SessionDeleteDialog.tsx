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
import { toastSuccess, toastError } from "@/lib/toast";

interface Props {
  session: Session | null;
  onClose: () => void;
  onDone: () => void;
}

export function SessionDeleteDialog({ session, onClose, onDone }: Props) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!session) return;
    setSubmitting(true);
    try {
      await sessionsApi.remove(session.id);
      toastSuccess("Session supprimée.");
      onDone();
      onClose();
    } catch (e) {
      toastError(e, "Suppression impossible.");
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
