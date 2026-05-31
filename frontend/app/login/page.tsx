import { LoginForm } from "@/components/auth/LoginForm";
import { CheckCircle2 } from "lucide-react";

const features = [
  "Extraction automatique des compétences et expériences depuis le CV.",
  "Scoring composite W1–W4 ajustable par le responsable RH.",
  "Justifications narratives par l'IA pour chaque affectation proposée.",
];

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col md:flex-row">

      {/* ── Panneau gauche — Hero ─────────────────────────────────── */}
      <section className="relative flex flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-primary to-primary-dark px-14 py-14 text-primary-foreground">
        <div className="pointer-events-none absolute -top-1/3 -right-1/4 h-3/5 w-3/5 rounded-full bg-[radial-gradient(circle,rgba(251,247,240,0.06)_0%,transparent_70%)]" />

        <div className="relative">
          {/* Eyebrow — text-eyebrow (11px) + tracking-eyebrow (0.10em) */}
          <p className="text-eyebrow font-semibold uppercase tracking-eyebrow text-primary-foreground/70">
            Collège La Cité · Ottawa
          </p>

          {/* H1 — Inter bold, text-display-xl (48px, lh 1.08, ls −0.03em) */}
          <h1 className="mt-8 max-w-[440px] text-display-xl font-bold text-primary-foreground">
            Affecter les bons profs aux bons cours.
          </h1>

          {/* Lead — text-body-lg (18px, lh 1.625) */}
          <p className="mt-5 max-w-[400px] text-body-lg text-primary-foreground/80">
            Analyse IA des CV, scoring pondéré et justifications explicables.
            Tout ce qui prenait des semaines, en quelques minutes.
          </p>

          {/* Features — text-body-sm (14px, lh 1.5) */}
          <ul className="mt-10 flex flex-col gap-3.5">
            {features.map((feat) => (
              <li
                key={feat}
                className="flex items-start gap-3 text-body-sm text-primary-foreground/90"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-foreground/80" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer — text-caption (12px) */}
        <p className="relative text-caption text-primary-foreground/75">
          Défi Informatique La Cité 2026 · 2ᵉ édition
        </p>
      </section>

      {/* ── Panneau droit — Formulaire ───────────────────────────────── */}
      <section className="flex flex-1 flex-col justify-center bg-canvas px-16 py-14">

        {/* Eyebrow — text-eyebrow (11px) + tracking-eyebrow (0.10em) */}
        <p className="text-eyebrow font-semibold uppercase tracking-eyebrow text-primary">
          ProfMatch
        </p>

        {/* H2 — Inter semibold, text-display-lg (40px, lh 1.1, ls −0.025em) */}
        <h2 className="mt-3 text-display-lg font-semibold text-fg">
          Bon retour
        </h2>

        {/* Subtitle — text-body (16px, lh 1.5) */}
        <p className="mt-3 text-body text-fg-muted">
          Connectez-vous pour accéder à votre espace — professeur, ressources
          humaines ou administration.
        </p>

        <LoginForm />
      </section>

    </main>
  );
}
