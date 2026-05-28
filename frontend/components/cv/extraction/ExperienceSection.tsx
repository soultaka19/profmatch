"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { extractionApi, type ExperienceDto } from "@/lib/api/extraction";
import { ExperienceForm } from "./ExperienceForm";

interface Props {
  items: ExperienceDto[];
  onMutate: () => void;
}

function formatPeriode(debut: number, fin: number | null): string {
  return `${debut} → ${fin ?? "actuel"}`;
}

export function ExperienceSection({ items, onMutate }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExperienceDto | undefined>();
  const [deleting, setDeleting] = useState<ExperienceDto | null>(null);

  const openAdd = () => { setEditing(undefined); setFormOpen(true); };
  const openEdit = (e: ExperienceDto) => { setEditing(e); setFormOpen(true); };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await extractionApi.experiences.remove(deleting.id);
      toast.success("Expérience supprimée");
      onMutate();
    } catch { toast.error("Échec de la suppression"); }
    setDeleting(null);
  };

  return (
    <section className="mt-6 rounded-md border border-border bg-canvas-pure shadow-soft">
      <header className="flex items-center justify-between border-b border-border-soft px-7 py-4">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] tracking-[0.18em] text-fg-subtle">02</span>
          <h3 className="text-eyebrow font-bold tracking-eyebrow text-fg">Expériences</h3>
          <span className="text-xs text-fg-subtle tabular-nums">{items.length}</span>
        </div>
        <Button variant="outline" size="sm" onClick={openAdd}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />Ajouter
        </Button>
      </header>

      {items.length === 0 ? (
        <button onClick={openAdd} className="block w-full px-7 py-6 text-left text-sm italic text-fg-subtle hover:text-fg-muted transition-colors">
          Aucune expérience détectée — cliquez pour en ajouter.
        </button>
      ) : (
        <ul className="divide-y divide-border-soft">
          {items.map((exp) => (
            <li key={exp.id} className="group/item px-7 py-5 transition-colors hover:bg-surface-subtle">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {/* Ligne 1 : poste + période alignée à droite */}
                  <div className="flex items-baseline justify-between gap-4">
                    <h4 className="text-body font-semibold text-fg truncate">{exp.poste}</h4>
                    <span className="flex-shrink-0 font-mono text-[11px] tabular-nums text-fg-subtle">
                      {formatPeriode(exp.annee_debut, exp.annee_fin)}
                    </span>
                  </div>
                  {/* Ligne 2 : employeur */}
                  <p className="mt-0.5 text-sm text-fg-muted">{exp.employeur}</p>
                  {/* Ligne 3 : description, séparée par une marge */}
                  {exp.description_courte && (
                    <p className="mt-2.5 text-sm leading-relaxed text-fg-muted max-w-[64ch]">
                      {exp.description_courte}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 transition-opacity group-hover/item:opacity-100 focus-within:opacity-100">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(exp)} aria-label={`Modifier ${exp.poste}`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => setDeleting(exp)} aria-label={`Supprimer ${exp.poste}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ExperienceForm open={formOpen} initial={editing} onOpenChange={setFormOpen} onMutate={onMutate} />

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette expérience ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {deleting?.poste} · {deleting?.employeur} » sera supprimée définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
