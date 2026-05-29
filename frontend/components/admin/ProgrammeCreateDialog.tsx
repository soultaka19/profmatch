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
import { programmesApi } from "@/lib/api/programmes";
import type { SemestreAdmission } from "@/lib/types/programmes";
import { SemestresAdmissionPicker } from "./SemestresAdmissionPicker";
import { toastSuccess, toastError } from "@/lib/toast";

interface Props {
  onCreated: () => void;
}

export function ProgrammeCreateDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [nom, setNom] = useState("");
  const [departement, setDepartement] = useState("");
  const [semestres, setSemestres] = useState<SemestreAdmission[]>(["automne"]);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setCode("");
    setNom("");
    setDepartement("");
    setSemestres(["automne"]);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await programmesApi.create({
        code: code.trim(),
        nom: nom.trim(),
        departement: departement.trim() || null,
        semestres_admission: semestres,
      });
      toastSuccess(`Programme ${code.trim()} créé.`);
      onCreated();
      setOpen(false);
      reset();
    } catch (e) {
      toastError(e, "Création impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    code.trim().length > 0 && nom.trim().length > 0 && semestres.length > 0;

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau programme
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Nouveau programme</SheetTitle>
          <SheetDescription>
            Le code est unique (ex. 51046). Il ne pourra plus être modifié après création.
          </SheetDescription>
        </SheetHeader>
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
          <div className="space-y-2">
            <Label>Rythme d&apos;admission</Label>
            <p className="text-xs text-fg-muted">
              Sessions où une nouvelle cohorte entre dans le programme.
            </p>
            <SemestresAdmissionPicker value={semestres} onChange={setSemestres} />
            {semestres.length === 0 && (
              <p className="text-xs text-destructive">Sélectionnez au moins un semestre.</p>
            )}
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
