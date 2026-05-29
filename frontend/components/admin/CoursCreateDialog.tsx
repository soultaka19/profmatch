"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, X } from "lucide-react";
import { coursApi } from "@/lib/api/cours";
import { coursCompetencesApi } from "@/lib/api/coursCompetences";
import { toastSuccess, toastError } from "@/lib/toast";
import { IMPORTANCE_OPTIONS } from "./competence-options";

interface Props {
  onCreated: () => void;
}

type DraftComp = { nom: string; importance: number };

function importanceLabel(importance: number): string {
  return (
    IMPORTANCE_OPTIONS.find((o) => o.value === String(importance))?.label ??
    String(importance)
  );
}

export function CoursCreateDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [credits, setCredits] = useState<string>("");
  const [heures, setHeures] = useState<string>("");
  const [comps, setComps] = useState<DraftComp[]>([]);
  const [compNom, setCompNom] = useState("");
  const [compImp, setCompImp] = useState("3");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setCode("");
    setNom("");
    setDescription("");
    setCredits("");
    setHeures("");
    setComps([]);
    setCompNom("");
    setCompImp("3");
  }

  function addComp() {
    const nom = compNom.trim();
    if (!nom) return;
    setComps((prev) => [...prev, { nom, importance: Number(compImp) }]);
    setCompNom("");
    setCompImp("3");
  }

  function removeComp(i: number) {
    setComps((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const cours = await coursApi.create({
        code: code.trim(),
        nom: nom.trim(),
        description: description.trim() || null,
        credits: credits.trim() === "" ? null : Number(credits),
        heures: heures.trim() === "" ? null : Number(heures),
      });
      const echecs: string[] = [];
      for (const c of comps) {
        try {
          await coursCompetencesApi.create(cours.id, { nom: c.nom, importance: c.importance });
        } catch {
          echecs.push(c.nom);
        }
      }
      if (echecs.length === 0) {
        toastSuccess(`Cours ${cours.code} créé${comps.length ? ` avec ${comps.length} compétence(s)` : ""}.`);
      } else {
        toastError(null, `Cours créé, mais ces compétences n'ont pas été ajoutées : ${echecs.join(", ")}. Complétez-les depuis le détail du cours.`);
      }
      onCreated();
      setOpen(false);
      reset();
    } catch (e) {
      toastError(e, "Création impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = code.trim().length > 0 && nom.trim().length > 0;

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau cours
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Nouveau cours</SheetTitle>
          <SheetDescription>
            Le code est unique (ex. INF1001). Il ne pourra plus être modifié après création.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="INF1001" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Introduction à la programmation" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="credits">Crédits</Label>
              <Input id="credits" type="number" min={0} max={20} value={credits} onChange={(e) => setCredits(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heures">Heures</Label>
              <Input id="heures" type="number" min={0} max={999} value={heures} onChange={(e) => setHeures(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="comp-nom">Compétence requise</Label>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  id="comp-nom"
                  value={compNom}
                  onChange={(e) => setCompNom(e.target.value)}
                  placeholder="Python"
                />
              </div>
              <Select value={compImp} onValueChange={setCompImp}>
                <SelectTrigger className="w-[160px]" aria-label="Importance">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPORTANCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addComp} disabled={!compNom.trim()}>
              <Plus className="mr-2 h-4 w-4" />Ajouter à la liste
            </Button>
            {comps.length > 0 && (
              <ul className="space-y-1 pt-1">
                {comps.map((c, i) => (
                  <li key={`${c.nom}-${i}`} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
                    <span>
                      {c.nom} <span className="text-muted-foreground">· {importanceLabel(c.importance)}</span>
                    </span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeComp(i)} aria-label={`Retirer ${c.nom}`}>
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <SheetFooter>
          <Button variant="ghost" onClick={() => { reset(); setOpen(false); }}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création…</> : "Créer"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
