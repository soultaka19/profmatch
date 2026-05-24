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
import { sessionsApi } from "@/lib/api/sessions";
import type { Semestre, SessionStatut } from "@/lib/types/api";
import { SEMESTRE_LABEL_LONG, STATUT_LABEL } from "@/lib/types/sessions";

const SEMESTRES: Semestre[] = ["printemps", "automne", "hiver", "ete"];
const STATUTS: SessionStatut[] = ["planifiee", "ouverte", "fermee"];

interface Props {
  onCreated: () => void;
}

export function SessionCreateDialog({ onCreated }: Props) {
  const currentYear = new Date().getFullYear();
  const [open, setOpen] = useState(false);
  const [annee, setAnnee] = useState<number>(currentYear);
  const [semestre, setSemestre] = useState<Semestre>("automne");
  const [statut, setStatut] = useState<SessionStatut>("planifiee");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setAnnee(currentYear);
    setSemestre("automne");
    setStatut("planifiee");
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await sessionsApi.create({ annee, semestre, statut });
      onCreated();
      setOpen(false);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de création");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = Number.isInteger(annee) && annee >= 2020 && annee <= 2100;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle session
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle session académique</DialogTitle>
          <DialogDescription>
            Les pondérations W1–W4 sont créées automatiquement avec leurs valeurs par défaut.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="annee">Année</Label>
            <Input
              id="annee"
              type="number"
              min={2020}
              max={2100}
              value={annee}
              onChange={(e) => setAnnee(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="semestre">Semestre</Label>
            <select
              id="semestre"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
              value={semestre}
              onChange={(e) => setSemestre(e.target.value as Semestre)}
            >
              {SEMESTRES.map((s) => (
                <option key={s} value={s}>
                  {SEMESTRE_LABEL_LONG[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="statut">Statut initial</Label>
            <select
              id="statut"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
              value={statut}
              onChange={(e) => setStatut(e.target.value as SessionStatut)}
            >
              {STATUTS.map((s) => (
                <option key={s} value={s}>
                  {STATUT_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              setOpen(false);
            }}
          >
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création…
              </>
            ) : (
              "Créer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
