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
import { Plus, Loader2 } from "lucide-react";
import { etapesApi } from "@/lib/api/etapes";

interface Props {
  programmeId: number;
  onCreated: () => void;
}

export function EtapeCreateDialog({ programmeId, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [ordre, setOrdre] = useState<number>(1);
  const [nom, setNom] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setOrdre(1);
    setNom("");
    setError(null);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await etapesApi.create(programmeId, { ordre, nom: nom.trim() || null });
      onCreated();
      setOpen(false);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-2 h-4 w-4" />Ajouter une étape
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Nouvelle étape</SheetTitle>
          <SheetDescription>L&apos;ordre doit être unique dans le programme.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ordre">Ordre</Label>
            <Input
              id="ordre"
              type="number"
              min={1}
              max={20}
              value={ordre}
              onChange={(e) => setOrdre(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="enom">Nom (optionnel)</Label>
            <Input id="enom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Étape 1" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <SheetFooter>
          <Button variant="ghost" onClick={() => { reset(); setOpen(false); }}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={submitting || ordre < 1}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création…</> : "Créer"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
