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
import { programmesApi } from "@/lib/api/programmes";
import type { Programme } from "@/lib/types/api";
import type { SemestreAdmission } from "@/lib/types/programmes";
import { SEMESTRES_ADMISSION } from "@/lib/types/programmes";
import { SemestresAdmissionPicker } from "./SemestresAdmissionPicker";
import { toastSuccess, toastError } from "@/lib/toast";

interface Props {
  programme: Programme | null;
  onClose: () => void;
  onUpdated: () => void;
}

function filterDisplayable(values: string[]): SemestreAdmission[] {
  const allowed: readonly string[] = SEMESTRES_ADMISSION;
  return values.filter((v): v is SemestreAdmission => allowed.includes(v));
}

export function ProgrammeEditDialog({ programme, onClose, onUpdated }: Props) {
  const [nom, setNom] = useState("");
  const [departement, setDepartement] = useState("");
  const [semestres, setSemestres] = useState<SemestreAdmission[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (programme) {
      setNom(programme.nom);
      setDepartement(programme.departement ?? "");
      setSemestres(filterDisplayable(programme.semestres_admission));
    }
  }, [programme]);

  async function handleSubmit() {
    if (!programme) return;
    setSubmitting(true);
    try {
      await programmesApi.update(programme.id, {
        nom: nom.trim() || undefined,
        departement: departement.trim() || null,
        semestres_admission: semestres,
      });
      toastSuccess("Programme mis à jour.");
      onUpdated();
      onClose();
    } catch (e) {
      toastError(e, "Mise à jour impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={!!programme} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Modifier le programme</SheetTitle>
          <SheetDescription>Code <span className="font-mono">{programme?.code}</span> (immuable).</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="enom">Nom</Label>
            <Input id="enom" value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edept">Département</Label>
            <Input id="edept" value={departement} onChange={(e) => setDepartement(e.target.value)} />
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
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={submitting || !nom.trim() || semestres.length === 0}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enregistrement…</> : "Enregistrer"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
