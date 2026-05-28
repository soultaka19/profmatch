"use client";

import { useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { extractionApi, type CompetenceDto } from "@/lib/api/extraction";
import { CompetenceForm } from "./CompetenceForm";

interface Props {
  items: CompetenceDto[];
  onMutate: () => void;
}

const NIVEAU_LABEL: Record<string, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
  expert: "Expert",
};

export function CompetenceSection({ items, onMutate }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CompetenceDto | undefined>();
  const [deleting, setDeleting] = useState<CompetenceDto | null>(null);

  const openAdd = () => { setEditing(undefined); setFormOpen(true); };
  const openEdit = (c: CompetenceDto) => { setEditing(c); setFormOpen(true); };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await extractionApi.competences.remove(deleting.id);
      toast.success("Compétence supprimée");
      onMutate();
    } catch { toast.error("Échec de la suppression"); }
    setDeleting(null);
  };

  return (
    <section className="mt-6 rounded-md border border-border bg-canvas-pure shadow-soft">
      <header className="flex items-center justify-between border-b border-border-soft px-7 py-4">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] tracking-[0.18em] text-fg-subtle">01</span>
          <h3 className="text-eyebrow font-bold tracking-eyebrow text-fg">Compétences</h3>
          <span className="text-xs text-fg-subtle tabular-nums">{items.length}</span>
        </div>
        <Button variant="outline" size="sm" onClick={openAdd}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />Ajouter
        </Button>
      </header>

      {items.length === 0 ? (
        <button
          onClick={openAdd}
          className="block w-full px-7 py-6 text-left text-sm italic text-fg-subtle hover:text-fg-muted transition-colors"
        >
          Aucune compétence détectée — cliquez pour en ajouter.
        </button>
      ) : (
        <div className="flex flex-wrap gap-2 px-7 py-5">
          {items.map((c) => (
            <div
              key={c.id}
              className="group/chip inline-flex items-center gap-2 rounded-full border border-border bg-surface-hover pl-3 pr-1 py-1 transition-all hover:border-primary-border hover:bg-primary-soft"
            >
              <button
                type="button"
                onClick={() => openEdit(c)}
                className="flex items-baseline gap-1.5 outline-none"
                aria-label={`Modifier ${c.nom}`}
              >
                <span className="text-sm font-medium text-fg">{c.nom}</span>
                <span className="text-[11px] text-fg-subtle">·</span>
                <span className="text-[11px] text-fg-muted">{NIVEAU_LABEL[c.niveau] ?? c.niveau}</span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 rounded-full opacity-0 transition-opacity group-hover/chip:opacity-100 focus-visible:opacity-100 hover:bg-destructive-soft hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); setDeleting(c); }}
                aria-label={`Supprimer ${c.nom}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1 text-sm text-fg-subtle hover:border-primary-border hover:bg-primary-soft hover:text-fg-muted transition-colors"
            aria-label="Ajouter une compétence"
          >
            <Pencil className="h-3 w-3" />
            <span className="text-[11px]">ajouter</span>
          </button>
        </div>
      )}

      <CompetenceForm open={formOpen} initial={editing} onOpenChange={setFormOpen} onMutate={onMutate} />

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette compétence ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {deleting?.nom} » sera supprimée définitivement de votre profil.
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
