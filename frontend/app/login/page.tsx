import { LoginForm } from "@/components/auth/LoginForm";
import { IconSettings, IconBrain, IconChartBar } from "@tabler/icons-react";

const features = [
  {
    icon: IconSettings,
    title: "Analyse automatique des CV",
    desc: "Extraction IA des compétences et expériences depuis PDF ou DOCX.",
  },
  {
    icon: IconChartBar,
    title: "Scoring pondéré W1–W4",
    desc: "Compétences, expérience, historique et similarité sémantique.",
  },
  {
    icon: IconBrain,
    title: "Justifications narratives XAI",
    desc: "Chaque proposition est expliquée en langage naturel par l'IA.",
  },
];

const showDemoCreds = process.env.NEXT_PUBLIC_SHOW_DEMO_CREDS !== "false";

export default function LoginPage() {
  return (
    <main
      className="flex min-h-screen flex-col md:flex-row"
      style={{ background: "#FBF7F0" }}
    >
      {/* ── Panneau gauche — identité bordeaux ──────────────────────── */}
      <section
        className="relative flex flex-1 flex-col justify-between overflow-hidden px-12 py-14"
        style={{ background: "#8B2332" }}
      >
        {/* Cercle décoratif */}
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(251,247,240,0.08) 0%, transparent 65%)",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 h-[300px] w-[300px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(251,247,240,0.05) 0%, transparent 65%)",
          }}
        />

        <div className="relative">
          {/* Eyebrow */}
          <div
            className="text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{ color: "rgba(251,247,240,0.55)" }}
          >
            Collège La Cité · Ottawa
          </div>

          {/* Headline */}
          <h1
            className="mt-8 max-w-[440px] font-display italic leading-[1.08] tracking-[-0.025em]"
            style={{ fontSize: "clamp(2rem,3.5vw,2.75rem)", color: "#FBF7F0" }}
          >
            Affectez vos professeurs aux bons cours, intelligemment.
          </h1>

          {/* Feature bullets */}
          <ul className="mt-12 flex flex-col gap-5">
            {features.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-4">
                <span
                  className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[8px]"
                  style={{ background: "rgba(251,247,240,0.12)" }}
                >
                  <Icon size={18} stroke={1.6} style={{ color: "#FBF7F0" }} />
                </span>
                <span>
                  <span
                    className="block text-sm font-semibold"
                    style={{ color: "#FBF7F0" }}
                  >
                    {title}
                  </span>
                  <span
                    className="mt-0.5 block text-sm leading-relaxed"
                    style={{ color: "rgba(251,247,240,0.65)" }}
                  >
                    {desc}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div
          className="relative text-xs"
          style={{ color: "rgba(251,247,240,0.40)" }}
        >
          Défi Informatique La Cité 2026 · 2ᵉ édition
        </div>
      </section>

      {/* ── Panneau droit — formulaire crème ──────────────────────────── */}
      <section
        className="flex flex-1 flex-col justify-center px-12 py-14"
        style={{ background: "#FBF7F0" }}
      >
        <div className="mx-auto w-full max-w-[360px]">
          {/* Logo + titre */}
          <div className="flex items-center gap-3 mb-8">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-[8px] font-display italic text-[15px] font-bold text-white"
              style={{ background: "#8B2332" }}
            >
              LC
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[15px] font-semibold" style={{ color: "#111827" }}>
                ProfMatch
              </span>
              <span className="text-[11px]" style={{ color: "#8B95A1" }}>
                Collège La Cité
              </span>
            </span>
          </div>

          {/* Card formulaire */}
          <div
            className="rounded-[14px] border p-8"
            style={{
              background: "#FFFFFF",
              borderColor: "#E7DFD2",
              boxShadow: "0 2px 8px rgba(17,24,39,0.06), 0 12px 32px rgba(17,24,39,0.04)",
            }}
          >
            <h2
              className="font-display italic text-[28px] leading-tight tracking-[-0.02em]"
              style={{ color: "#111827" }}
            >
              Bienvenue
            </h2>
            <p className="mt-1.5 text-sm" style={{ color: "#5F6673" }}>
              Connectez-vous pour accéder à votre espace.
            </p>

            <div className="mt-6">
              <LoginForm />
            </div>
          </div>

          {/* Comptes démo */}
          {showDemoCreds && (
            <div
              className="mt-6 rounded-[10px] border p-4 text-xs leading-relaxed"
              style={{
                background: "rgba(139,35,50,0.04)",
                borderColor: "rgba(139,35,50,0.12)",
                color: "#5F6673",
              }}
            >
              <p className="font-semibold mb-2" style={{ color: "#8B2332" }}>
                Comptes de démonstration
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["prof@defi-lacite.ca", "rh@defi-lacite.ca", "admin@defi-lacite.ca"].map(
                  (email) => (
                    <code
                      key={email}
                      className="rounded-[5px] px-1.5 py-0.5 font-mono text-[11px]"
                      style={{ background: "rgba(139,35,50,0.07)", color: "#8B2332" }}
                    >
                      {email}
                    </code>
                  )
                )}
              </div>
              <p className="mt-2 text-[11px]" style={{ color: "#8B95A1" }}>
                Mot de passe : <code className="font-mono">profmatch2026</code>
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
