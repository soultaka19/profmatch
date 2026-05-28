import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--primary)",
          dark: "var(--primary-dark)",
          soft: "var(--primary-soft)",
          foreground: "var(--primary-foreground)",
          ring: "var(--primary-ring)",
          border: "var(--primary-border)",
          tint: "var(--primary-tint)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          hover: "var(--surface-hover)",
          subtle: "var(--surface-subtle)",
        },
        canvas: {
          DEFAULT: "var(--canvas)",
          pure: "var(--canvas-pure)",
        },
        fg: {
          DEFAULT: "var(--fg)",
          muted: "var(--fg-muted)",
          subtle: "var(--fg-subtle)",
        },
        border: {
          DEFAULT: "var(--border)",
          soft: "var(--border-soft)",
          surface: "var(--surface-border)",
        },
        success: {
          DEFAULT: "var(--success)",
          bg: "var(--success-bg)",
          border: "var(--success-border)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          bg: "var(--destructive-bg)",
          hover: "var(--destructive-hover)",
          soft: "var(--destructive-soft)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          bg: "var(--warning-bg)",
        },
        info: "var(--info)",
        overlay: "var(--overlay)",
        score: {
          competences: "var(--score-competences)",
          experience: "var(--score-experience)",
          historique: "var(--score-historique)",
          semantique: "var(--score-semantique)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-instrument-serif)", "Georgia", "serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // ─── Micro-typographie ─────────────────────────────────────────────
        eyebrow:       ["0.6875rem", { lineHeight: "1",     letterSpacing: "0.08em"   }], // 11px — labels UPPERCASE
        caption:       ["0.75rem",   { lineHeight: "1.4",   letterSpacing: "0.01em"   }], // 12px — timestamps, metadata

        // ─── Body ─────────────────────────────────────────────────────────
        "body-sm":     ["0.875rem",  { lineHeight: "1.5",   letterSpacing: "0"        }], // 14px — UI compact, labels
        body:          ["1rem",      { lineHeight: "1.5",   letterSpacing: "0"        }], // 16px — UI par défaut
        "body-lg":     ["1.125rem",  { lineHeight: "1.625", letterSpacing: "0"        }], // 18px — lead, intro

        // ─── Titres UI ────────────────────────────────────────────────────
        "title-sm":    ["1.25rem",   { lineHeight: "1.3",   letterSpacing: "-0.01em"  }], // 20px — H4, sous-titres
        title:         ["1.5rem",    { lineHeight: "1.25",  letterSpacing: "-0.015em" }], // 24px — H3, cartes
        "title-lg":    ["1.75rem",   { lineHeight: "1.2",   letterSpacing: "-0.02em"  }], // 28px — H2, sections

        // ─── Display — H1 → Super hero ────────────────────────────────────
        display:       ["2rem",      { lineHeight: "1.15",  letterSpacing: "-0.02em"  }], // 32px — H1 dashboards ✓
        "display-lg":  ["2.5rem",    { lineHeight: "1.1",   letterSpacing: "-0.025em" }], // 40px — H1 pages ✓
        "display-xl":  ["3rem",      { lineHeight: "1.08",  letterSpacing: "-0.03em"  }], // 48px — hero sections
        "display-2xl": ["3.5rem",    { lineHeight: "1.05",  letterSpacing: "-0.035em" }], // 56px — hero landing
        "display-3xl": ["4rem",      { lineHeight: "1.0",   letterSpacing: "-0.04em"  }], // 64px — super display
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter:  "-0.03em",
        tight:    "-0.02em",
        snug:     "-0.01em",
        normal:   "0em",
        wide:     "0.01em",
        wider:    "0.05em",
        widest:   "0.08em",
        eyebrow:  "0.10em",
      },
      lineHeight: {
        none:    "1",
        tightest:"1.05",
        tighter: "1.1",
        tight:   "1.15",
        snug:    "1.2",
        normal:  "1.3",
        relaxed: "1.5",
        loose:   "1.625",
        looser:  "1.75",
      },
      borderRadius: {
        sm: "8px",
        md: "10px",
        lg: "12px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(17,24,39,0.04)",
        card: "0 1px 3px rgba(17,24,39,0.04), 0 8px 24px rgba(17,24,39,0.04)",
        lift: "0 4px 12px rgba(17,24,39,0.06), 0 16px 40px rgba(17,24,39,0.06)",
        active: "0 1px 2px rgba(17,24,39,0.16), 0 4px 12px rgba(17,24,39,0.10)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "progress-slide": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "dot-pulse": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.4", transform: "scale(0.85)" },
        },
        "halo-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 3px rgba(180,83,9,0.18)" },
          "50%": { boxShadow: "0 0 0 6px rgba(180,83,9,0.06)" },
        },
        "spinner-conic": {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "progress-slide": "progress-slide 1.6s ease-in-out infinite",
        shimmer: "shimmer 2.4s ease-in-out infinite",
        "dot-pulse": "dot-pulse 1.4s ease-in-out infinite",
        "halo-pulse": "halo-pulse 1.4s ease-in-out infinite",
        "spinner-conic": "spinner-conic 1.1s linear infinite",
      },
      transitionDuration: {
        DEFAULT: "180ms",
      },
    },
  },
  plugins: [],
};

export default config;
