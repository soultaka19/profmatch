import { type ReactNode } from "react";

export interface RoadmapCard {
  icon: ReactNode;
  title: string;
  description: string;
  badge?: string;
}

interface Props {
  title: string;
  lead: string;
  heroIcon: ReactNode;
  heroTitle: string;
  heroSub: string;
  heroEta?: string;
  cards: RoadmapCard[];
}

export function RoadmapPlaceholder({
  title,
  lead,
  heroIcon,
  heroTitle,
  heroSub,
  heroEta,
  cards,
}: Props) {
  return (
    <div className="max-w-4xl">
      <h1 className="font-display italic text-display text-fg">{title}</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-fg-muted">{lead}</p>

      <div className="mt-6 flex items-center gap-5 rounded-lg border border-border bg-surface px-6 py-6">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-canvas text-2xl">
          {heroIcon}
        </div>
        <div className="flex-1">
          <div className="font-display italic text-lg text-fg">{heroTitle}</div>
          <div className="mt-1 text-xs leading-relaxed text-fg-muted">{heroSub}</div>
        </div>
        {heroEta && (
          <div className="rounded-md border border-border bg-canvas px-3 py-1.5 text-xs text-fg-muted">
            ETA <strong className="text-primary">{heroEta}</strong>
          </div>
        )}
      </div>

      <div className="mt-8 mb-3 text-eyebrow font-semibold uppercase text-primary">
        Ce qui arrive ici
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.title}
            className="relative rounded-md border border-border bg-canvas px-4 py-4"
          >
            <span className="absolute right-3 top-3 rounded-full bg-warning/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-warning">
              {card.badge ?? "Bientôt"}
            </span>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-sm">
                {card.icon}
              </div>
              <div className="text-[13.5px] font-medium text-fg">{card.title}</div>
            </div>
            <div className="mt-2 text-xs leading-relaxed text-fg-subtle">{card.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
