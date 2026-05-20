"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { extractionApi, type LangueDto, type LangueNiveau } from "@/lib/api/extraction";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  open: boolean;
  initial?: LangueDto;
  onOpenChange: (o: boolean) => void;
  onMutate: () => void;
}

const NIVEAUX: { value: LangueNiveau; label: string }[] = [
  { value: "A1", label: "A1 — Débutant" },
  { value: "A2", label: "A2 — Élémentaire" },
  { value: "B1", label: "B1 — Intermédiaire" },
  { value: "B2", label: "B2 — Intermédiaire avancé" },
  { value: "C1", label: "C1 — Autonome" },
  { value: "C2", label: "C2 — Maîtrise" },
  { value: "natif", label: "Natif" },
];

export function LangueForm({ open, initial, onOpenChange, onMutate }: Props) {
  const [langue, setLangue] = useState("");
  const [niveau, setNiveau] = useState<LangueNiveau>("B2");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLangue(initial?.langue ?? "");
      setNiveau(initial?.niveau ?? "B2");
    }
  }, [open, initial]);

  const handleSave = async () => {
    if (!langue.trim()) return;
    setSaving(true);
    try {
      if (initial) await extractionApi.langues.update(initial.id, { langue: langue.trim(), niveau });
      else await extractionApi.langues.add({ langue: langue.trim(), niveau });
      toast.success(initial ? "Langue mise à jour" : "Langue ajoutée");
      onMutate();
      onOpenChange(false);
    } catch { toast.error("Échec de la sauvegarde"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier la langue" : "Nouvelle langue"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lang-nom" className="text-xs font-medium uppercase tracking-wider text-fg-muted">Langue</Label>
            <Input id="lang-nom" value={langue} onChange={(e) => setLangue(e.target.value)} placeholder="Ex. Français, Anglais, Espagnol…" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-fg-muted">Niveau (CECRL)</Label>
            <Select value={niveau} onValueChange={(v) => setNiveau(v as LangueNiveau)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NIVEAUX.map((n) => (
                  <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving || !langue.trim()}>{saving ? "Sauvegarde…" : "Enregistrer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
