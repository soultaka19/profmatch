"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { coursApi } from "@/lib/api/cours";
import { cursusApi } from "@/lib/api/cursus";
import type {
  CategorieCours,
  CoursReadOnly,
} from "@/lib/types/programmes";
import { CATEGORIE_LABEL } from "@/lib/types/programmes";

interface Props {
  programmeId: number;
  etapeId: number;
  onAdded: () => void;
}

export function CursusAddDialog({ programmeId, etapeId, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [cours, setCours] = useState<CoursReadOnly[]>([]);
  const [coursId, setCoursId] = useState<number | null>(null);
  const [categorie, setCategorie] = useState<CategorieCours>("obligatoire");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    coursApi.list(search).then((r) => {
      if (!cancelled) setCours(r);
    });
    return () => { cancelled = true; };
  }, [open, search]);

  const options = useMemo(() => cours, [cours]);

  function reset() {
    setSearch("");
    setCoursId(null);
    setCategorie("obligatoire");
    setError(null);
  }

  async function handleSubmit() {
    if (coursId === null) return;
    setSubmitting(true);
    setError(null);
    try {
      await cursusApi.create(programmeId, etapeId, { cours_id: coursId, categorie });
      onAdded();
      setOpen(false);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-2 h-4 w-4" />Ajouter un cours
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un cours à cette étape</DialogTitle>
          <DialogDescription>Choisissez un cours existant dans le référentiel.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="search">Rechercher (code ou nom)</Label>
            <Input
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="INF1001"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cours">Cours</Label>
            <Select
              value={coursId !== null ? String(coursId) : undefined}
              onValueChange={(v) => setCoursId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder={options.length === 0 ? "Aucun résultat" : "Choisir un cours"} />
              </SelectTrigger>
              <SelectContent>
                {options.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.code} — {c.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat">Catégorie</Label>
            <Select value={categorie} onValueChange={(v) => setCategorie(v as CategorieCours)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="obligatoire">{CATEGORIE_LABEL.obligatoire}</SelectItem>
                <SelectItem value="choix_francais">{CATEGORIE_LABEL.choix_francais}</SelectItem>
                <SelectItem value="choix_anglais">{CATEGORIE_LABEL.choix_anglais}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); setOpen(false); }}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={submitting || coursId === null}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Ajout…</> : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
