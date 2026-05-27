"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { extractionApi, type LangueDto } from "@/lib/api/extraction";
import { LangueForm } from "./LangueForm";

interface Props {
  items: LangueDto[];
  onMutate: () => void;
}

export function LangueSection({ items, onMutate }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LangueDto | undefined>();
  const [deleting, setDeleting] = useState<LangueDto | null>(null);

  const openAdd = () => { setEditing(undefined); setFormOpen(true); };
  const openEdit = (l: LangueDto) => { setEditing(l); setFormOpen(true); };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await extractionApi.langues.remove(deleting.id);
      toast.success("Langue supprimée");
      onMutate();
    } catch { toast.error("Échec de la suppression"); }
    setDeleting(null);
  };

  return (
    <section className="mt-6 rounded-md border border-border bg-canvas-pure shadow-soft">
      <header className="flex items-center justify-between border-b border-border-soft px-7 py-4">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] tracking-[0.18em] text-fg-subtle">04</span>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-fg">Langues</h3>
          <span className="text-xs text-fg-subtle tabular-nums">{items.length}</span>
        </div>
        <Button variant="outline" size="sm" onClick={openAdd}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />Ajouter
        </Button>
      </header>

      {items.length === 0 ? (
        <button onClick={openAdd} className="block w-full px-7 py-6 text-left text-sm italic text-fg-subtle hover:text-fg-muted transition-colors">
          Aucune langue détectée — cliquez pour en ajouter.
        </button>
      ) : (
        <ul className="divide-y divide-border-soft">
          {items.map((l) => (
            <li key={l.id} className="group/item flex items-baseline justify-between px-7 py-3 transition-colors hover:bg-surface-subtle gap-4">
              <div className="flex items-baseline gap-3 min-w-0 flex-1">
                <span className="font-medium text-fg">{l.langue}</span>
                <span className="font-mono text-xs text-fg-subtle">{l.niveau}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/item:opacity-100 focus-within:opacity-100">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(l)} aria-label={`Modifier ${l.langue}`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => setDeleting(l)} aria-label={`Supprimer ${l.langue}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <LangueForm open={formOpen} initial={editing} onOpenChange={setFormOpen} onMutate={onMutate} />

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette langue ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {deleting?.langue} » sera supprimée définitivement.
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
