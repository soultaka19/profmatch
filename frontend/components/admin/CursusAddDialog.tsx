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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Plus, Loader2, Check, ChevronsUpDown, BookPlus } from "lucide-react";
import { coursApi } from "@/lib/api/cours";
import { cursusApi } from "@/lib/api/cursus";
import type { CoursReadOnly } from "@/lib/types/programmes";

interface Props {
  programmeId: number;
  etapeId: number;
  onAdded: () => void;
}

type Mode = "select" | "create";

export function CursusAddDialog({ programmeId, etapeId, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("select");
  const [cours, setCours] = useState<CoursReadOnly[]>([]);
  const [coursId, setCoursId] = useState<number | null>(null);
  const [comboOpen, setComboOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Création inline
  const [newCode, setNewCode] = useState("");
  const [newNom, setNewNom] = useState("");
  const [newCredits, setNewCredits] = useState<string>("");
  const [newHeures, setNewHeures] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    coursApi.list().then((r) => {
      if (!cancelled) setCours(r);
    });
    return () => { cancelled = true; };
  }, [open]);

  function resetAll() {
    setMode("select");
    setCoursId(null);
    setSearch("");
    setComboOpen(false);
    setNewCode("");
    setNewNom("");
    setNewCredits("");
    setNewHeures("");
    setError(null);
  }

  function switchToCreate(prefillNom?: string) {
    setMode("create");
    setNewCode("");
    setNewNom(prefillNom ?? search.trim());
    setNewCredits("");
    setNewHeures("");
    setError(null);
  }

  const selectedCours = cours.find((c) => c.id === coursId) ?? null;

  async function handleAttachExisting() {
    if (coursId === null) return;
    setSubmitting(true);
    setError(null);
    try {
      await cursusApi.create(programmeId, etapeId, { cours_id: coursId });
      onAdded();
      setOpen(false);
      resetAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateAndAttach() {
    setSubmitting(true);
    setError(null);
    try {
      const created = await coursApi.create({
        code: newCode.trim(),
        nom: newNom.trim(),
        description: null,
        credits: newCredits.trim() === "" ? null : Number(newCredits),
        heures: newHeures.trim() === "" ? null : Number(newHeures),
      });
      await cursusApi.create(programmeId, etapeId, { cours_id: created.id });
      onAdded();
      setOpen(false);
      resetAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  const canAttach = coursId !== null;
  const canCreate = newCode.trim().length > 0 && newNom.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetAll(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-2 h-4 w-4" />Ajouter un cours
        </Button>
      </DialogTrigger>
      <DialogContent>
        {mode === "select" ? (
          <>
            <DialogHeader>
              <DialogTitle>Ajouter un cours à cette étape</DialogTitle>
              <DialogDescription>
                Sélectionnez un cours existant ou créez-en un nouveau qui sera automatiquement rattaché.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Cours</Label>
                <Popover open={comboOpen} onOpenChange={setComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal"
                    >
                      {selectedCours
                        ? <span className="truncate"><span className="font-mono">{selectedCours.code}</span> — {selectedCours.nom}</span>
                        : <span className="text-fg-muted">Rechercher par code ou nom…</span>}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Code ou nom du cours…"
                        value={search}
                        onValueChange={setSearch}
                      />
                      <CommandList>
                        <CommandEmpty className="py-6 text-center text-sm">
                          <p className="text-fg-muted">Aucun cours trouvé.</p>
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="mt-1"
                            onClick={() => {
                              setComboOpen(false);
                              switchToCreate();
                            }}
                          >
                            <BookPlus className="mr-2 h-4 w-4" />
                            Créer un nouveau cours{search.trim() ? ` « ${search.trim()} »` : ""}
                          </Button>
                        </CommandEmpty>
                        <CommandGroup heading="Cours">
                          {cours.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={`${c.code} ${c.nom}`}
                              onSelect={() => {
                                setCoursId(c.id);
                                setComboOpen(false);
                              }}
                            >
                              <Check
                                className={
                                  "mr-2 h-4 w-4 " +
                                  (c.id === coursId ? "opacity-100" : "opacity-0")
                                }
                              />
                              <span className="font-mono mr-2">{c.code}</span>
                              <span className="truncate">{c.nom}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup>
                          <CommandItem
                            value="__create__"
                            onSelect={() => {
                              setComboOpen(false);
                              switchToCreate();
                            }}
                          >
                            <BookPlus className="mr-2 h-4 w-4" />
                            Créer un nouveau cours…
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => { resetAll(); setOpen(false); }}>Annuler</Button>
              <Button onClick={handleAttachExisting} disabled={!canAttach || submitting}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Rattachement…</> : "Ajouter"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Créer un nouveau cours</DialogTitle>
              <DialogDescription>
                Le cours sera créé dans le référentiel et automatiquement rattaché à cette étape.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="ncode">Code</Label>
                <Input id="ncode" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="INF1001" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nnom">Nom</Label>
                <Input id="nnom" value={newNom} onChange={(e) => setNewNom(e.target.value)} placeholder="Introduction à la programmation" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="ncredits">Crédits (optionnel)</Label>
                  <Input id="ncredits" type="number" min={0} max={20} value={newCredits} onChange={(e) => setNewCredits(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nheures">Heures (optionnel)</Label>
                  <Input id="nheures" type="number" min={0} max={999} value={newHeures} onChange={(e) => setNewHeures(e.target.value)} />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setMode("select")}>Retour</Button>
              <Button onClick={handleCreateAndAttach} disabled={!canCreate || submitting}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création…</> : "Créer et rattacher"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
