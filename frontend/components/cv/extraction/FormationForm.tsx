"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { extractionApi, type FormationDto } from "@/lib/api/extraction";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  initial?: FormationDto;
  onOpenChange: (o: boolean) => void;
  onMutate: () => void;
}

export function FormationForm({ open, initial, onOpenChange, onMutate }: Props) {
  const [diplome, setDiplome] = useState("");
  const [etablissement, setEtablissement] = useState("");
  const [annee, setAnnee] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDiplome(initial?.diplome ?? "");
      setEtablissement(initial?.etablissement ?? "");
      setAnnee(initial?.annee?.toString() ?? "");
    }
  }, [open, initial]);

  const valid = diplome.trim() && etablissement.trim() && annee;

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    const payload = {
      diplome: diplome.trim(),
      etablissement: etablissement.trim(),
      annee: parseInt(annee, 10),
    };
    try {
      if (initial) await extractionApi.formations.update(initial.id, payload);
      else await extractionApi.formations.add(payload);
      toast.success(initial ? "Formation mise à jour" : "Formation ajoutée");
      onMutate();
      onOpenChange(false);
    } catch { toast.error("Échec de la sauvegarde"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier la formation" : "Nouvelle formation"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="form-dip" className="text-xs font-medium uppercase tracking-wider text-fg-muted">Diplôme</Label>
            <Input id="form-dip" value={diplome} onChange={(e) => setDiplome(e.target.value)} placeholder="Ex. Maîtrise en informatique" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="form-eta" className="text-xs font-medium uppercase tracking-wider text-fg-muted">Établissement</Label>
            <Input id="form-eta" value={etablissement} onChange={(e) => setEtablissement(e.target.value)} placeholder="Ex. Université Laval" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="form-an" className="text-xs font-medium uppercase tracking-wider text-fg-muted">Année d&apos;obtention</Label>
            <Input id="form-an" type="number" value={annee} onChange={(e) => setAnnee(e.target.value)} placeholder="2018" className="max-w-[140px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving || !valid}>{saving ? "Sauvegarde…" : "Enregistrer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
