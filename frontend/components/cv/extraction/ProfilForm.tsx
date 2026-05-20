"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { extractionApi } from "@/lib/api/extraction";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  initialResume: string;
  onOpenChange: (open: boolean) => void;
  onMutate: () => void;
}

const MAX = 1000;

export function ProfilForm({ open, initialResume, onOpenChange, onMutate }: Props) {
  const [value, setValue] = useState(initialResume);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(initialResume);
      setError(null);
    }
  }, [open, initialResume]);

  const handleSave = async () => {
    if (value.length > MAX) {
      setError(`${MAX} caractères max — vous en avez ${value.length}.`);
      return;
    }
    setSaving(true);
    try {
      await extractionApi.profil.update({ resume: value.trim() || null });
      toast.success("Profil mis à jour");
      onMutate();
      onOpenChange(false);
    } catch {
      toast.error("Échec de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const remaining = MAX - value.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Votre profil</DialogTitle>
          <DialogDescription>
            Un résumé de votre parcours en quelques phrases. Visible par l&apos;équipe RH.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Textarea
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(null); }}
            rows={6}
            placeholder="Ex. : Enseignant en informatique avec 12 ans d'expérience, spécialisé en pédagogie active et développement web fullstack…"
            className="resize-none font-display text-base italic leading-relaxed"
            autoFocus
          />
          <div className="flex items-center justify-between text-xs">
            <span className={remaining < 0 ? "text-destructive" : "text-fg-subtle"}>
              {value.length} / {MAX}
            </span>
            {error && <span className="text-destructive">{error}</span>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving || remaining < 0}>
            {saving ? "Sauvegarde…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
