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
import { usersApi } from "@/lib/api/utilisateurs";
import type { UserAdmin } from "@/lib/types/api";
import { toastSuccess, toastError } from "@/lib/toast";

interface Props {
  user: UserAdmin | null;
  mode: "deactivate" | "restore";
  onClose: () => void;
  onDone: () => void;
}

export function UserToggleActifDialog({ user, mode, onClose, onDone }: Props) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!user) return;
    setSubmitting(true);
    try {
      if (mode === "deactivate") await usersApi.deactivate(user.id);
      else await usersApi.restore(user.id);
      toastSuccess("Statut du compte modifié.");
      onDone();
      onClose();
    } catch (e) {
      toastError(e, "Modification impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog
      open={!!user}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {mode === "deactivate"
              ? "Désactiver l'utilisateur ?"
              : "Réactiver l'utilisateur ?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {mode === "deactivate"
              ? `${user?.nom_complet} ne pourra plus se connecter. Cette action est réversible.`
              : `${user?.nom_complet} pourra à nouveau se connecter.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={submitting}>
            {mode === "deactivate" ? "Désactiver" : "Réactiver"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
