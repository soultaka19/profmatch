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
import { Loader2 } from "lucide-react";
import { coursApi } from "@/lib/api/cours";
import type { Cours } from "@/lib/types/cours";

interface Props {
  cours: Cours | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function CoursEditDialog({ cours, onClose, onUpdated }: Props) {
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [credits, setCredits] = useState<string>("");
  const [heures, setHeures] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cours) {
      setNom(cours.nom);
      setDescription(cours.description ?? "");
      setCredits(cours.credits !== null ? String(cours.credits) : "");
      setHeures(cours.heures !== null ? String(cours.heures) : "");
      setError(null);
    }
  }, [cours]);

  async function handleSubmit() {
    if (!cours) return;
    setSubmitting(true);
    setError(null);
    try {
      await coursApi.update(cours.id, {
        nom: nom.trim() || undefined,
        description: description.trim() || null,
        credits: credits.trim() === "" ? null : Number(credits),
        heures: heures.trim() === "" ? null : Number(heures),
      });
      onUpdated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={!!cours} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Modifier le cours</SheetTitle>
          <SheetDescription>
            Code <span className="font-mono">{cours?.code}</span> (immuable).
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="enom">Nom</Label>
            <Input id="enom" value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edesc">Description</Label>
            <Input id="edesc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ecredits">Crédits</Label>
              <Input id="ecredits" type="number" min={0} max={20} value={credits} onChange={(e) => setCredits(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eheures">Heures</Label>
              <Input id="eheures" type="number" min={0} max={999} value={heures} onChange={(e) => setHeures(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <SheetFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={submitting || !nom.trim()}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enregistrement…</> : "Enregistrer"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
