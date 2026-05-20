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
    <div className="max-w-5xl">
      <h1 className="font-display italic text-[40px] leading-[1.05] tracking-[-0.025em] text-fg">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-fg-muted">{lead}</p>

      <div className="mt-10 flex items-center gap-6 rounded-lg border border-border bg-surface px-8 py-7">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-canvas text-2xl">
          {heroIcon}
        </div>
        <div className="flex-1">
          <div className="font-display italic text-xl text-fg">{heroTitle}</div>
          <div className="mt-1.5 text-sm leading-relaxed text-fg-muted">{heroSub}</div>
        </div>
        {heroEta && (
          <div className="rounded-md border border-border bg-canvas px-4 py-2 text-sm text-fg-muted">
            ETA <strong className="ml-1 text-primary">{heroEta}</strong>
          </div>
        )}
      </div>

      <div className="mt-12 mb-5 text-eyebrow font-semibold uppercase tracking-[0.12em] text-primary">
        Ce qui arrive ici
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.title}
            className="relative rounded-md border border-border bg-canvas px-6 py-6 transition-shadow hover:shadow-card"
          >
            <span className="absolute right-4 top-4 rounded-full bg-warning/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-warning">
              {card.badge ?? "Bientôt"}
            </span>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-base">
                {card.icon}
              </div>
              <div className="text-[15px] font-semibold text-fg">{card.title}</div>
            </div>
            <div className="mt-3 text-sm leading-relaxed text-fg-subtle">{card.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
