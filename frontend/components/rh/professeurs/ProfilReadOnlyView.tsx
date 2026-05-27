import type { ProfesseurDetail } from "@/lib/api/rhProfesseurs";

const NIVEAU_COMP: Record<string, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
  expert: "Expert",
};

const NIVEAU_LANG: Record<string, string> = {
  A1: "A1", A2: "A2", B1: "B1", B2: "B2", C1: "C1", C2: "C2", natif: "Natif",
};

function SectionTitle({ index, label, count }: { index: string; label: string; count?: number }) {
  return (
    <header className="flex items-baseline gap-3 border-b border-border-soft px-1 pb-2">
      <span className="font-mono text-[11px] tracking-[0.18em] text-fg-subtle">{index}</span>
      <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-fg">{label}</h3>
      {count !== undefined && (
        <span className="text-xs text-fg-subtle tabular-nums">{count}</span>
      )}
    </header>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-1 py-3 text-sm italic text-fg-subtle">{children}</p>;
}

export function ProfilReadOnlyView({ detail }: { detail: ProfesseurDetail }) {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionTitle index="00" label="Résumé" />
        {detail.profil.resume ? (
          <p className="px-1 py-3 text-sm leading-relaxed text-fg-muted">{detail.profil.resume}</p>
        ) : (
          <Empty>Aucun résumé de profil.</Empty>
        )}
      </section>

      <section>
        <SectionTitle index="01" label="Compétences" count={detail.competences.length} />
        {detail.competences.length === 0 ? (
          <Empty>Aucune compétence.</Empty>
        ) : (
          <div className="flex flex-wrap gap-2 px-1 py-3">
            {detail.competences.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-baseline gap-1.5 rounded-full border border-border bg-surface-hover px-3 py-1"
              >
                <span className="text-sm font-medium text-fg">{c.nom}</span>
                <span className="text-[11px] text-fg-subtle">·</span>
                <span className="text-[11px] text-fg-muted">{NIVEAU_COMP[c.niveau] ?? c.niveau}</span>
              </span>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle index="02" label="Expériences" count={detail.experiences.length} />
        {detail.experiences.length === 0 ? (
          <Empty>Aucune expérience.</Empty>
        ) : (
          <ul className="flex flex-col gap-4 px-1 py-3">
            {detail.experiences.map((e) => (
              <li key={e.id}>
                <p className="text-sm font-medium text-fg">
                  {e.poste} · {e.employeur}
                </p>
                <p className="text-[11px] text-fg-subtle tabular-nums">
                  {e.annee_debut} – {e.annee_fin ?? "présent"}
                </p>
                {e.description_courte && (
                  <p className="mt-1 text-sm text-fg-muted">{e.description_courte}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionTitle index="03" label="Formations" count={detail.formations.length} />
        {detail.formations.length === 0 ? (
          <Empty>Aucune formation.</Empty>
        ) : (
          <ul className="flex flex-col gap-3 px-1 py-3">
            {detail.formations.map((f) => (
              <li key={f.id}>
                <p className="text-sm font-medium text-fg">{f.diplome}</p>
                <p className="text-[11px] text-fg-subtle tabular-nums">
                  {f.etablissement} · {f.annee}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionTitle index="04" label="Langues" count={detail.langues.length} />
        {detail.langues.length === 0 ? (
          <Empty>Aucune langue.</Empty>
        ) : (
          <div className="flex flex-wrap gap-2 px-1 py-3">
            {detail.langues.map((l) => (
              <span
                key={l.id}
                className="inline-flex items-baseline gap-1.5 rounded-full border border-border bg-surface-hover px-3 py-1"
              >
                <span className="text-sm font-medium text-fg">{l.langue}</span>
                <span className="text-[11px] text-fg-subtle">·</span>
                <span className="text-[11px] text-fg-muted">{NIVEAU_LANG[l.niveau] ?? l.niveau}</span>
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
