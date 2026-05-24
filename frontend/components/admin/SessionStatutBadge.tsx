import type { SessionStatut } from "@/lib/types/api";
import { STATUT_CLASSES, STATUT_LABEL } from "@/lib/types/sessions";

interface Props {
  statut: SessionStatut;
}

export function SessionStatutBadge({ statut }: Props) {
  return (
    <span
      className={
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium " +
        STATUT_CLASSES[statut]
      }
    >
      {STATUT_LABEL[statut]}
    </span>
  );
}
