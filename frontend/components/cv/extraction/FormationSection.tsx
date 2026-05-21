"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { extractionApi, type FormationDto } from "@/lib/api/extraction";
import { FormationForm } from "./FormationForm";

interface Props {
  items: FormationDto[];
  onMutate: () => void;
}

export function FormationSection({ items, onMutate }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FormationDto | undefined>();
  const [deleting, setDeleting] = useState<FormationDto | null>(null);

  const openAdd = () => { setEditing(undefined); setFormOpen(true); };
  const openEdit = (f: FormationDto) => { setEditing(f); setFormOpen(true); };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await extractionApi.formations.remove(deleting.id);
      toast.success("Formation supprimée");
      onMutate();
    } catch { toast.error("Échec de la suppression"); }
    setDeleting(null);
  };

  return (
    <section className="mt-6 rounded-md border border-border bg-canvas-pure shadow-soft">
      <header className="flex items-center justify-between border-b border-border-soft px-7 py-4">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] tracking-[0.18em] text-fg-subtle">03</span>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-fg">Formations</h3>
          <span className="text-xs text-fg-subtle tabular-nums">{items.length}</span>
        </div>
        <Button variant="outline" size="sm" onClick={openAdd}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />Ajouter
        </Button>
      </header>

      {items.length === 0 ? (
        <button onClick={openAdd} className="block w-full px-7 py-6 text-left text-sm italic text-fg-subtle hover:text-fg-muted transition-colors">
          Aucune formation détectée — cliquez pour en ajouter.
        </button>
      ) : (
        <ul className="divide-y divide-border-soft">
          {items.map((f) => (
            <li key={f.id} className="group/item flex items-baseline justify-between px-7 py-3.5 transition-colors hover:bg-surface/40 gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <h4 className="font-medium text-fg truncate">{f.diplome}</h4>
                  <span className="text-fg-subtle">·</span>
                  <span className="text-sm text-fg-muted">{f.etablissement}</span>
                  <span className="font-mono text-xs text-fg-subtle tabular-nums">{f.annee}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/item:opacity-100 focus-within:opacity-100">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(f)} aria-label={`Modifier ${f.diplome}`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => setDeleting(f)} aria-label={`Supprimer ${f.diplome}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <FormationForm open={formOpen} initial={editing} onOpenChange={setFormOpen} onMutate={onMutate} />

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette formation ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {deleting?.diplome} » sera supprimée définitivement.
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
