"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { User, Lock, Shield } from "lucide-react";
import { profilApi } from "@/lib/api/profil";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLE_LABELS: Record<string, string> = {
  prof: "Professeur",
  rh: "Ressources humaines",
  admin: "Administrateur",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ProfilPage() {
  const { data: profil, mutate } = useSWR("/api/profil/me", () => profilApi.getMe());

  const [nomComplet, setNomComplet] = useState("");
  const [nomLoading, setNomLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  async function handleUpdateNom(e: React.FormEvent) {
    e.preventDefault();
    if (!nomComplet.trim()) return;
    setNomLoading(true);
    try {
      await profilApi.updateMe(nomComplet.trim());
      await mutate();
      setNomComplet("");
      toast.success("Nom mis à jour.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erreur inattendue.");
    } finally {
      setNomLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    setPwLoading(true);
    try {
      await profilApi.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Mot de passe mis à jour.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erreur inattendue.");
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-display font-semibold text-fg">Mon profil</h1>
        <p className="mt-1 text-sm text-fg-muted">Gérez vos informations personnelles et votre sécurité.</p>
      </div>

      {/* Info card */}
      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-fg">
          <User className="h-4 w-4 text-primary" />
          Informations du compte
        </div>
        {profil ? (
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-fg-muted">Nom complet</dt>
              <dd className="font-medium text-fg">{profil.nom_complet}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-fg-muted">Adresse e-mail</dt>
              <dd className="text-fg">{profil.email}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-fg-muted">Rôle</dt>
              <dd>
                <Badge variant="secondary">{ROLE_LABELS[profil.role] ?? profil.role}</Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-fg-muted">Membre depuis</dt>
              <dd className="text-fg">{formatDate(profil.cree_le)}</dd>
            </div>
          </dl>
        ) : (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-5 animate-pulse rounded bg-canvas" />
            ))}
          </div>
        )}
      </section>

      {/* Edit name */}
      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-fg">
          <Shield className="h-4 w-4 text-primary" />
          Modifier le nom affiché
        </div>
        <form onSubmit={handleUpdateNom} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nom_complet">Nouveau nom complet</Label>
            <Input
              id="nom_complet"
              value={nomComplet}
              onChange={(e) => setNomComplet(e.target.value)}
              placeholder={profil?.nom_complet ?? "Chargement…"}
              maxLength={255}
            />
          </div>
          <Button type="submit" disabled={nomLoading || !nomComplet.trim()} size="sm">
            {nomLoading ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      </section>

      {/* Change password */}
      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-fg">
          <Lock className="h-4 w-4 text-primary" />
          Changer le mot de passe
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current_password">Mot de passe actuel</Label>
            <Input
              id="current_password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new_password">Nouveau mot de passe</Label>
            <Input
              id="new_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
            />
            <p className="text-xs text-fg-subtle">Minimum 8 caractères.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm_password">Confirmer le nouveau mot de passe</Label>
            <Input
              id="confirm_password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Button
            type="submit"
            disabled={pwLoading || !currentPassword || !newPassword || !confirmPassword}
            size="sm"
          >
            {pwLoading ? "Mise à jour…" : "Changer le mot de passe"}
          </Button>
        </form>
      </section>
    </div>
  );
}
