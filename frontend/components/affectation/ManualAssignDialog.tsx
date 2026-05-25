"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { affectationsApi } from "@/lib/api/affectations";
import { ApiError } from "@/lib/api/client";
import type { ProfesseurDisponibleOut } from "@/lib/types/api";
import { toast } from "sonner";

interface ManualAssignDialogProps {
  sessionId: number;
  coursId: number;
  onAssigned: () => void;
}

export function ManualAssignDialog({
  sessionId,
  coursId,
  onAssigned,
}: ManualAssignDialogProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const { data: profs } = useSWR<ProfesseurDisponibleOut[]>(
    open
      ? `/api/affectations/professeurs-disponibles?session_id=${sessionId}&cours_id=${coursId}`
      : null,
    open ? () => affectationsApi.listProfesseursDisponibles(sessionId, coursId) : null
  );

  const handleConfirm = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await affectationsApi.createManuelle({
        session_id: sessionId,
        professeur_id: Number(selected),
        cours_id: coursId,
      });
      toast.success("Professeur affecté manuellement");
      setOpen(false);
      setSelected("");
      onAssigned();
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError && err.status === 409
          ? "Ce professeur n'a pas de CV traité."
          : "Échec de l'affectation manuelle.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="mr-1 h-4 w-4" />
          Affecter un autre professeur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Affecter manuellement un professeur</DialogTitle>
        </DialogHeader>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir un professeur disponible" />
          </SelectTrigger>
          <SelectContent>
            {(profs ?? []).map((p) => (
              <SelectItem key={p.professeur_id} value={String(p.professeur_id)}>
                {p.nom_complet}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button onClick={handleConfirm} disabled={!selected || submitting}>
            Affecter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
