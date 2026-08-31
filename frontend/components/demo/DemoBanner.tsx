"use client";

import { Clock, FlaskConical, Sparkles } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { useDemo } from "@/components/demo/DemoProvider";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/types/api";
import { cn } from "@/lib/utils";

const ROLES: { valeur: UserRole; libelle: string }[] = [
  { valeur: "prof", libelle: "Professeur" },
  { valeur: "rh", libelle: "RH" },
  { valeur: "admin", libelle: "Admin" },
];

function formaterDuree(secondes: number): string {
  const m = Math.floor(secondes / 60);
  const s = secondes % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Bandeau permanent de la démonstration.
 *
 * Il répond, sans qu'on ait à le demander : combien de temps cet espace vit,
 * combien d'appels à l'IA restent, et sous quel rôle on se trouve. Le
 * changement de rôle est ici parce que la valeur du produit ne se voit qu'en
 * enchaînant les trois.
 */
export function DemoBanner() {
  const { estDemo, resteSecondes, expire, appelsTotal, appelsRestants, changerDeRole, quitter } =
    useDemo();
  const { user } = useAuth();

  if (!estDemo) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2 text-body-sm",
        expire
          ? "border-destructive bg-destructive-bg text-destructive"
          : "border-border bg-primary-soft text-fg"
      )}
    >
      <span className="flex items-center gap-1.5 font-semibold uppercase tracking-eyebrow">
        <FlaskConical className="h-4 w-4" />
        Démonstration
      </span>

      {expire ? (
        <span>Cet espace a expiré — ses données ont été effacées.</span>
      ) : (
        <>
          <span className="flex items-center gap-1.5 tabular-nums">
            <Clock className="h-4 w-4" />
            effacé dans {formaterDuree(resteSecondes)}
          </span>
          <span
            className={cn(
              "flex items-center gap-1.5 tabular-nums",
              appelsRestants === 0 && "opacity-70"
            )}
            title="Extraction d'un CV et narration XAI : chaque analyse consomme un appel."
          >
            <Sparkles className="h-4 w-4" />
            {appelsRestants}/{appelsTotal} appels IA
          </span>

          <span className="flex items-center gap-1">
            {ROLES.map((role) => (
              <Button
                key={role.valeur}
                size="sm"
                variant={user?.role === role.valeur ? "default" : "ghost"}
                onClick={() => changerDeRole(role.valeur)}
              >
                {role.libelle}
              </Button>
            ))}
          </span>
        </>
      )}

      <span className="ml-auto flex items-center gap-3">
        <span className="hidden text-fg-muted md:inline">
          Données fictives, supprimées automatiquement.
        </span>
        <Button size="sm" variant="outline" onClick={quitter}>
          Quitter
        </Button>
      </span>
    </div>
  );
}
