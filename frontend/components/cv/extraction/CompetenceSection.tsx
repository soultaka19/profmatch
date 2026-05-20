"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { extractionApi, type CompetenceDto } from "@/lib/api/extraction";
import { SourceBadge } from "./SourceBadge";
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
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-fg">Compétences</h3>
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
        <ul className="divide-y divide-border-soft">
          {items.map((c) => (
            <li
              key={c.id}
              className="group/item flex items-center justify-between px-7 py-3.5 transition-colors hover:bg-surface/40"
            >
              <div className="flex items-baseline gap-4 min-w-0 flex-1">
                <span className="font-medium text-fg truncate">{c.nom}</span>
                <span className="text-xs text-fg-muted whitespace-nowrap">
                  {NIVEAU_LABEL[c.niveau] ?? c.niveau}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <SourceBadge source={c.source} />
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/item:opacity-100 focus-within:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openEdit(c)}
                    aria-label={`Modifier ${c.nom}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:text-destructive"
                    onClick={() => setDeleting(c)}
                    aria-label={`Supprimer ${c.nom}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
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
