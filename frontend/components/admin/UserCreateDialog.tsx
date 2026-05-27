"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
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
import type { CreatableRole, UserCreateResponse } from "@/lib/types/api";
import { UserPlus, Loader2 } from "lucide-react";
import { ActivationLinkPanel } from "./ActivationLinkPanel";

interface Props {
  onCreated: () => void;
}

export function UserCreateDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CreatableRole>("prof");
  const [nom, setNom] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdResponse, setCreatedResponse] = useState<UserCreateResponse | null>(null);

  function reset() {
    setEmail("");
    setRole("prof");
    setNom("");
    setError(null);
    setCreatedResponse(null);
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await usersApi.create({ email, role, nom_complet: nom });
      setCreatedResponse(res);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = email.length > 0 && nom.length >= 1;

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <SheetTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Inviter un utilisateur
        </Button>
      </SheetTrigger>
      <SheetContent>
        {createdResponse ? (
          <>
            <SheetHeader>
              <SheetTitle>Compte créé</SheetTitle>
              <SheetDescription>
                {createdResponse.user.nom_complet} ({createdResponse.user.email}) doit définir son mot de passe via le lien ci-dessous.
              </SheetDescription>
            </SheetHeader>
            <div className="py-2">
              <ActivationLinkPanel
                url={createdResponse.activation_url}
                email={createdResponse.user.email}
              />
            </div>
            <SheetFooter>
              <Button
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
                Fermer
              </Button>
            </SheetFooter>
          </>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>Inviter un nouvel utilisateur</SheetTitle>
              <SheetDescription>
                L&apos;utilisateur recevra un lien d&apos;activation pour définir lui-même son mot de passe. Seuls les rôles
                professeur et RH peuvent être créés ici.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="nom">Nom complet</Label>
                <Input
                  id="nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Jean Tremblay"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jean@defi-lacite.ca"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rôle</Label>
                <Select value={role} onValueChange={(v) => setRole(v as CreatableRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prof">Professeur</SelectItem>
                    <SelectItem value="rh">Responsable RH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <SheetFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  reset();
                  setOpen(false);
                }}
              >
                Annuler
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création…
                  </>
                ) : (
                  "Inviter"
                )}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
