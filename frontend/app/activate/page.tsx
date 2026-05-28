import { Suspense } from "react";
import { ActivateForm } from "@/components/auth/ActivateForm";
import { CheckCircle2 } from "lucide-react";

const promises = [
  "Définissez un mot de passe que vous seul connaissez.",
  "Le lien d'activation est valable une seule fois.",
  "Après activation, vous serez automatiquement connecté.",
];

export default function ActivatePage() {
  return (
    <main className="flex min-h-screen flex-col md:flex-row">
      <section className="relative flex flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-primary to-primary-dark px-14 py-14 text-primary-foreground">
        <div className="pointer-events-none absolute -top-1/3 -right-1/4 h-3/5 w-3/5 rounded-full bg-[radial-gradient(circle,rgba(251,247,240,0.06)_0%,transparent_70%)]" />
        <div className="relative">
          <div className="text-eyebrow font-semibold uppercase tracking-eyebrow text-primary-foreground/70">
            Collège La Cité · Ottawa
          </div>
          <h1 className="mt-8 max-w-[440px] text-display-xl font-bold text-primary-foreground">
            Bienvenue sur ProfMatch.
          </h1>
          <p className="mt-5 max-w-[400px] text-body-lg text-primary-foreground/80">
            Pour finaliser la création de votre compte, choisissez votre mot de passe à l&apos;aide du lien que l&apos;administrateur vous a transmis.
          </p>
          <ul className="mt-10 flex flex-col gap-3.5">
            {promises.map((feat) => (
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
        <div className="relative text-caption text-primary-foreground/55">
          Défi Informatique La Cité 2026 · 2ᵉ édition
        </div>
      </section>

      <section className="flex flex-1 flex-col justify-center bg-canvas px-16 py-14">
        <div className="text-eyebrow font-semibold uppercase tracking-eyebrow text-primary">
          Activation du compte
        </div>
        <h2 className="mt-3 text-display-lg font-semibold text-fg">
          Définissez votre mot de passe
        </h2>
        <p className="mt-3 text-body text-fg-muted">
          Choisissez un mot de passe d&apos;au moins 8 caractères. Conservez-le précieusement.
        </p>
        <Suspense fallback={<p className="mt-8 text-body-sm text-fg-muted">Chargement…</p>}>
          <ActivateForm />
        </Suspense>
      </section>
    </main>
  );
}
