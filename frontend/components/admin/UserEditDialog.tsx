"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usersApi } from "@/lib/api/utilisateurs";
import type { UserAdmin, UserRole, UserUpdateInput } from "@/lib/types/api";
import { Loader2 } from "lucide-react";
import { toastSuccess, toastError } from "@/lib/toast";

interface Props {
  user: UserAdmin | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function UserEditDialog({ user, onClose, onUpdated }: Props) {
  const [nom, setNom] = useState("");
  const [role, setRole] = useState<UserRole>("prof");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setNom(user.nom_complet);
      setRole(user.role);
    }
  }, [user]);

  async function handleSubmit() {
    if (!user) return;
    setSubmitting(true);
    try {
      const payload: UserUpdateInput = {};
      if (nom !== user.nom_complet) payload.nom_complet = nom;
      if (role !== user.role) payload.role = role;
      await usersApi.update(user.id, payload);
      toastSuccess("Utilisateur mis à jour.");
      onUpdated();
      onClose();
    } catch (err) {
      toastError(err, "Mise à jour impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet
      open={!!user}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Modifier l&apos;utilisateur</SheetTitle>
          <SheetDescription>
            Pour réinitialiser le mot de passe, utilisez le bouton « Réinitialiser le mot de passe » dans la table.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nom-edit">Nom complet</Label>
            <Input
              id="nom-edit"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role-edit">Rôle</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prof">Professeur</SelectItem>
                <SelectItem value="rh">Responsable RH</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement…
              </>
            ) : (
              "Enregistrer"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
