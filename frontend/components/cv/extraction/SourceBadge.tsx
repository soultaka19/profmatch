import type { SourceOrigine } from "@/lib/api/extraction";
import { cn } from "@/lib/utils";

interface Props {
  source: SourceOrigine;
  className?: string;
}

/**
 * Marqueur typographique signalant l'origine d'une donnée.
 * - IA : italique serif primaire (signature "artisanale" du LLM)
 * - Manuel : sans-serif neutre (édition humaine)
 *
 * Inspiration éditoriale — un colophon plutôt qu'un tag.
 */
export function SourceBadge({ source, className }: Props) {
  if (source === "llm") {
    return (
      <span
        className={cn(
          "inline-flex items-baseline gap-1 font-display italic text-primary text-[12px] leading-none tracking-tight",
          className
        )}
        aria-label="Extrait par l'IA"
      >
        <span className="h-1 w-1 rounded-full bg-primary translate-y-[-2px]" aria-hidden />
        ia
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] font-medium text-fg-subtle",
        className
      )}
      aria-label="Édité manuellement"
    >
      manuel
    </span>
  );
}
