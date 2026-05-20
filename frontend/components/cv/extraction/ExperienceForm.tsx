"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { extractionApi, type ExperienceDto } from "@/lib/api/extraction";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  initial?: ExperienceDto;
  onOpenChange: (o: boolean) => void;
  onMutate: () => void;
}

export function ExperienceForm({ open, initial, onOpenChange, onMutate }: Props) {
  const [poste, setPoste] = useState("");
  const [employeur, setEmployeur] = useState("");
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [actuel, setActuel] = useState(false);
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPoste(initial?.poste ?? "");
      setEmployeur(initial?.employeur ?? "");
      setDebut(initial?.annee_debut?.toString() ?? "");
      setFin(initial?.annee_fin?.toString() ?? "");
      setActuel(initial ? initial.annee_fin === null : false);
      setDesc(initial?.description_courte ?? "");
    }
  }, [open, initial]);

  const valid = poste.trim() && employeur.trim() && debut;

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    const payload = {
      poste: poste.trim(),
      employeur: employeur.trim(),
      annee_debut: parseInt(debut, 10),
      annee_fin: actuel ? null : (fin ? parseInt(fin, 10) : null),
      description_courte: desc.trim() || null,
    };
    try {
      if (initial) await extractionApi.experiences.update(initial.id, payload);
      else await extractionApi.experiences.add(payload);
      toast.success(initial ? "Expérience mise à jour" : "Expérience ajoutée");
      onMutate();
      onOpenChange(false);
    } catch { toast.error("Échec de la sauvegarde"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier l'expérience" : "Nouvelle expérience"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="exp-poste" className="text-xs font-medium uppercase tracking-wider text-fg-muted">Poste</Label>
            <Input id="exp-poste" value={poste} onChange={(e) => setPoste(e.target.value)} placeholder="Ex. Enseignant en informatique" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-emp" className="text-xs font-medium uppercase tracking-wider text-fg-muted">Employeur</Label>
            <Input id="exp-emp" value={employeur} onChange={(e) => setEmployeur(e.target.value)} placeholder="Ex. Collège La Cité" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="exp-debut" className="text-xs font-medium uppercase tracking-wider text-fg-muted">Année début</Label>
              <Input id="exp-debut" type="number" value={debut} onChange={(e) => setDebut(e.target.value)} placeholder="2020" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-fin" className="text-xs font-medium uppercase tracking-wider text-fg-muted">Année fin</Label>
              <Input id="exp-fin" type="number" value={fin} onChange={(e) => setFin(e.target.value)} disabled={actuel} placeholder={actuel ? "Actuel" : "2024"} />
              <label className="mt-1 flex items-center gap-2 text-xs text-fg-muted cursor-pointer">
                <input type="checkbox" checked={actuel} onChange={(e) => setActuel(e.target.checked)} className="accent-primary" />
                Toujours en poste
              </label>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-desc" className="text-xs font-medium uppercase tracking-wider text-fg-muted">Description <span className="text-fg-subtle normal-case tracking-normal">(optionnel)</span></Label>
            <Textarea id="exp-desc" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="Brève description des responsabilités…" />
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
