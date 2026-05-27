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
    <div>
      <h1 className="text-display font-semibold text-fg">{title}</h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-fg-muted">{lead}</p>

      <div className="mt-8 flex items-center gap-5 rounded-md border border-border bg-canvas-pure px-6 py-5">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
          {heroIcon}
        </div>
        <div className="flex-1">
          <div className="text-[15px] font-semibold text-fg">{heroTitle}</div>
          <div className="mt-1 text-sm leading-relaxed text-fg-muted">{heroSub}</div>
        </div>
        {heroEta && (
          <div className="rounded-md border border-border bg-surface-hover px-3 py-1.5 text-sm text-fg-muted">
            ETA <strong className="ml-1 text-primary">{heroEta}</strong>
          </div>
        )}
      </div>

      <div className="mt-10 mb-4 text-eyebrow font-semibold uppercase tracking-[0.12em] text-primary">
        Ce qui arrive ici
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.title}
            className="relative rounded-md border border-border bg-canvas-pure px-5 py-5 transition-shadow hover:shadow-card"
          >
            <span className="absolute right-4 top-4 rounded-md border border-warning/30 bg-warning-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning">
              {card.badge ?? "Bientôt"}
            </span>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft text-primary">
                {card.icon}
              </div>
              <div className="text-[15px] font-semibold text-fg">{card.title}</div>
            </div>
            <div className="mt-3 text-sm leading-relaxed text-fg-muted">{card.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
