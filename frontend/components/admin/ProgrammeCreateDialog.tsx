"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { programmesApi } from "@/lib/api/programmes";

interface Props {
  onCreated: () => void;
}

export function ProgrammeCreateDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [nom, setNom] = useState("");
  const [departement, setDepartement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setCode("");
    setNom("");
    setDepartement("");
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await programmesApi.create({
        code: code.trim(),
        nom: nom.trim(),
        departement: departement.trim() || null,
      });
      onCreated();
      setOpen(false);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de création");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = code.trim().length > 0 && nom.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau programme
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau programme</DialogTitle>
          <DialogDescription>
            Le code est unique (ex. 51046). Il ne pourra plus être modifié après création.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="51046" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Programmation informatique" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dept">Département (optionnel)</Label>
            <Input id="dept" value={departement} onChange={(e) => setDepartement(e.target.value)} placeholder="Technologies de l'information" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); setOpen(false); }}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création…</> : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
