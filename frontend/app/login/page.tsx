import { LoginForm } from "@/components/auth/LoginForm";
import { CheckCircle2 } from "lucide-react";

const features = [
  "Extraction automatique des compétences et expériences depuis le CV.",
  "Scoring composite W1–W4 ajustable par le responsable RH.",
  "Justifications narratives par l'IA pour chaque affectation proposée.",
];

const showDemoCreds = process.env.NEXT_PUBLIC_SHOW_DEMO_CREDS !== "false";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col md:flex-row">
      <section className="relative flex flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-primary to-[#6B1A28] px-14 py-14 text-primary-foreground">
        <div className="pointer-events-none absolute -top-1/3 -right-1/4 h-3/5 w-3/5 rounded-full bg-[radial-gradient(circle,rgba(251,247,240,0.06)_0%,transparent_70%)]" />
        <div className="relative">
          <div className="text-eyebrow font-semibold uppercase tracking-[0.15em] text-primary-foreground/70">
            Collège La Cité · Ottawa
          </div>
          <h1 className="mt-8 max-w-[440px] font-display italic text-[44px] leading-[1.1] tracking-[-0.025em] text-primary-foreground">
            Affecter les bons profs aux bons cours.
          </h1>
          <p className="mt-5 max-w-[400px] text-base leading-relaxed text-primary-foreground/80">
            Analyse IA des CV, scoring pondéré et justifications explicables. Tout ce qui prenait des semaines, en quelques minutes.
          </p>
          <ul className="mt-10 flex flex-col gap-3.5">
            {features.map((feat) => (
              <li
                key={feat}
                className="flex items-start gap-3 text-sm leading-relaxed text-primary-foreground/90"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-foreground/80" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative text-xs text-primary-foreground/55">
          Défi Informatique La Cité 2026 · 2ᵉ édition
        </div>
      </section>

      <section className="flex flex-1 flex-col justify-center bg-canvas px-16 py-14">
        <div className="text-eyebrow font-semibold uppercase tracking-[0.12em] text-primary">
          ProfMatch
        </div>
        <h2 className="mt-3 font-display italic text-[38px] leading-none text-fg">Bon retour</h2>
        <p className="mt-3 text-base text-fg-muted">Connectez-vous pour accéder à votre espace.</p>
        <LoginForm />
        {showDemoCreds && (
          <div className="mt-6 max-w-[360px] text-xs leading-relaxed text-fg-subtle">
            Comptes de démonstration :<br />
            <code className="mt-1 inline-block rounded bg-surface px-1.5 py-0.5 font-mono text-[11px] text-fg-muted">
              prof@defi-lacite.ca
            </code>{" "}
            ·{" "}
            <code className="inline-block rounded bg-surface px-1.5 py-0.5 font-mono text-[11px] text-fg-muted">
              rh@defi-lacite.ca
            </code>{" "}
            ·{" "}
            <code className="inline-block rounded bg-surface px-1.5 py-0.5 font-mono text-[11px] text-fg-muted">
              admin@defi-lacite.ca
            </code>
          </div>
        )}
      </section>
    </main>
  );
}
