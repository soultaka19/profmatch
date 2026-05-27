"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { extractionApi, type CompetenceDto, type CompetenceNiveau } from "@/lib/api/extraction";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  open: boolean;
  initial?: CompetenceDto;
  onOpenChange: (o: boolean) => void;
  onMutate: () => void;
}

const NIVEAUX: { value: CompetenceNiveau; label: string }[] = [
  { value: "debutant", label: "Débutant" },
  { value: "intermediaire", label: "Intermédiaire" },
  { value: "avance", label: "Avancé" },
  { value: "expert", label: "Expert" },
];

export function CompetenceForm({ open, initial, onOpenChange, onMutate }: Props) {
  const [nom, setNom] = useState("");
  const [niveau, setNiveau] = useState<CompetenceNiveau>("intermediaire");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNom(initial?.nom ?? "");
      setNiveau(initial?.niveau ?? "intermediaire");
    }
  }, [open, initial]);

  const handleSave = async () => {
    if (!nom.trim()) return;
    setSaving(true);
    try {
      if (initial) {
        await extractionApi.competences.update(initial.id, { nom: nom.trim(), niveau });
        toast.success("Compétence mise à jour");
      } else {
        await extractionApi.competences.add({ nom: nom.trim(), niveau });
        toast.success("Compétence ajoutée");
      }
      onMutate();
      onOpenChange(false);
    } catch {
      toast.error("Échec de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{initial ? "Modifier une compétence" : "Nouvelle compétence"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="comp-nom" className="text-xs font-medium uppercase tracking-wider text-fg-muted">
              Compétence
            </Label>
            <Input
              id="comp-nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex. Python, Pédagogie active, Gestion de projet…"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-fg-muted">Niveau</Label>
            <Select value={niveau} onValueChange={(v) => setNiveau(v as CompetenceNiveau)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NIVEAUX.map((n) => (
                  <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving || !nom.trim()}>
            {saving ? "Sauvegarde…" : "Enregistrer"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
