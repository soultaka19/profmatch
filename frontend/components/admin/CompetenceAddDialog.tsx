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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { coursCompetencesApi } from "@/lib/api/coursCompetences";
import { toastSuccess, toastError } from "@/lib/toast";
import { IMPORTANCE_OPTIONS } from "./competence-options";

interface Props {
  coursId: number;
  onAdded: () => void;
}

export function CompetenceAddDialog({ coursId, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [nom, setNom] = useState("");
  const [importance, setImportance] = useState<string>("3");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setNom("");
    setImportance("3");
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await coursCompetencesApi.create(coursId, {
        nom: nom.trim(),
        importance: Number(importance),
      });
      toastSuccess("Compétence ajoutée.");
      onAdded();
      setOpen(false);
      reset();
    } catch (e) {
      toastError(e, "Ajout impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-2 h-4 w-4" />Ajouter une compétence
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Nouvelle compétence requise</SheetTitle>
          <SheetDescription>
            L&apos;importance (1-5) modulera le poids de cette compétence dans le scoring W1.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="cnom">Nom de la compétence</Label>
            <Input id="cnom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Python" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cimp">Importance</Label>
            <Select value={importance} onValueChange={setImportance}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMPORTANCE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <SheetFooter>
          <Button variant="ghost" onClick={() => { reset(); setOpen(false); }}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={submitting || !nom.trim()}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Ajout…</> : "Ajouter"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
