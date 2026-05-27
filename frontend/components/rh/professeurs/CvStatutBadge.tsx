import { Badge } from "@/components/ui/badge";
import type { CvStatut } from "@/lib/api/rhProfesseurs";

type Variant = "default" | "secondary" | "destructive" | "outline";

const CONFIG: Record<string, { label: string; variant: Variant }> = {
  traite: { label: "Traité", variant: "default" },
  en_cours: { label: "En cours", variant: "secondary" },
  en_attente: { label: "En attente", variant: "outline" },
  erreur: { label: "Erreur", variant: "destructive" },
};

const NONE = { label: "Aucun CV", variant: "outline" as Variant };

export function CvStatutBadge({ statut }: { statut: CvStatut | null }) {
  const { label, variant } = statut ? CONFIG[statut] ?? NONE : NONE;
  return <Badge variant={variant}>{label}</Badge>;
}
