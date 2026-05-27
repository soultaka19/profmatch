"use client";

import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useRhProfesseurDetail } from "@/lib/hooks/useRhProfesseurs";
import { CvStatutBadge } from "./CvStatutBadge";
import { ProfilReadOnlyView } from "./ProfilReadOnlyView";

interface Props {
  professeurId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfesseurCvDrawer({ professeurId, open, onOpenChange }: Props) {
  const { data, isLoading, error } = useRhProfesseurDetail(open ? professeurId : null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto p-7">
        <SheetHeader>
          <SheetTitle>{data?.nom_complet ?? "Profil du professeur"}</SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            {data?.email}
            {data && <CvStatutBadge statut={data.cv_statut} />}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-8">
          {isLoading && (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-xs italic text-fg-subtle">Chargement du profil…</p>
            </div>
          )}
          {error && !isLoading && (
            <p className="py-8 text-sm text-destructive">
              Impossible de charger le profil. Réessayez.
            </p>
          )}
          {data && !isLoading && !error && <ProfilReadOnlyView detail={data} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
