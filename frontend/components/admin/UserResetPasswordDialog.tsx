"use client";

import { useEffect, useState } from "react";
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
import type { UserAdmin, UserCreateResponse } from "@/lib/types/api";
import { ActivationLinkPanel } from "./ActivationLinkPanel";
import { toastSuccess, toastError } from "@/lib/toast";

interface Props {
  user: UserAdmin | null;
  onClose: () => void;
  onDone: () => void;
}

export function UserResetPasswordDialog({ user, onClose, onDone }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [response, setResponse] = useState<UserCreateResponse | null>(null);

  useEffect(() => {
    if (!user) {
      setResponse(null);
      setSubmitting(false);
    }
  }, [user]);

  async function handleConfirm() {
    if (!user) return;
    setSubmitting(true);
    try {
      const res = await usersApi.reinitPassword(user.id);
      setResponse(res);
      toastSuccess("Mot de passe réinitialisé.");
      onDone();
    } catch (err) {
      toastError(err, "Réinitialisation impossible.");
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
        {response ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Nouveau lien d&apos;activation</AlertDialogTitle>
              <AlertDialogDescription>
                Le mot de passe précédent a été effacé. Transmettez le lien ci-dessous à {response.user.nom_complet}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <ActivationLinkPanel
                url={response.activation_url}
                email={response.user.email}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogAction onClick={onClose}>Fermer</AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Réinitialiser le mot de passe ?</AlertDialogTitle>
              <AlertDialogDescription>
                Le mot de passe actuel de {user?.nom_complet} sera effacé. Un nouveau lien d&apos;activation
                sera généré (valable 72h, usage unique). Cette opération invalide tous les liens précédents.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirm} disabled={submitting}>
                Réinitialiser
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
