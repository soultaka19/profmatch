"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { programmesApi } from "@/lib/api/programmes";
import type { Programme } from "@/lib/types/api";
import type { SemestreAdmission } from "@/lib/types/programmes";
import { SEMESTRES_ADMISSION } from "@/lib/types/programmes";
import { SemestresAdmissionPicker } from "./SemestresAdmissionPicker";

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (programme) {
      setNom(programme.nom);
      setDepartement(programme.departement ?? "");
      setSemestres(filterDisplayable(programme.semestres_admission));
      setError(null);
    }
  }, [programme]);

  async function handleSubmit() {
    if (!programme) return;
    setSubmitting(true);
    setError(null);
    try {
      await programmesApi.update(programme.id, {
        nom: nom.trim() || undefined,
        departement: departement.trim() || null,
        semestres_admission: semestres,
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
    <Dialog open={!!programme} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le programme</DialogTitle>
          <DialogDescription>Code <span className="font-mono">{programme?.code}</span> (immuable).</DialogDescription>
        </DialogHeader>
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
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={submitting || !nom.trim() || semestres.length === 0}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enregistrement…</> : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
