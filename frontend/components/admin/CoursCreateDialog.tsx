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
import { coursApi } from "@/lib/api/cours";
import { toastSuccess, toastError } from "@/lib/toast";

interface Props {
  onCreated: () => void;
}

export function CoursCreateDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [credits, setCredits] = useState<string>("");
  const [heures, setHeures] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setCode("");
    setNom("");
    setDescription("");
    setCredits("");
    setHeures("");
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await coursApi.create({
        code: code.trim(),
        nom: nom.trim(),
        description: description.trim() || null,
        credits: credits.trim() === "" ? null : Number(credits),
        heures: heures.trim() === "" ? null : Number(heures),
      });
      toastSuccess(`Cours ${code.trim()} créé.`);
      onCreated();
      setOpen(false);
      reset();
    } catch (e) {
      toastError(e, "Création impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = code.trim().length > 0 && nom.trim().length > 0;

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau cours
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Nouveau cours</SheetTitle>
          <SheetDescription>
            Le code est unique (ex. INF1001). Il ne pourra plus être modifié après création.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="INF1001" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Introduction à la programmation" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="credits">Crédits</Label>
              <Input id="credits" type="number" min={0} max={20} value={credits} onChange={(e) => setCredits(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heures">Heures</Label>
              <Input id="heures" type="number" min={0} max={999} value={heures} onChange={(e) => setHeures(e.target.value)} />
            </div>
          </div>
        </div>
        <SheetFooter>
          <Button variant="ghost" onClick={() => { reset(); setOpen(false); }}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création…</> : "Créer"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
