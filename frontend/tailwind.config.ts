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
        },
        surface: "var(--surface)",
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
        },
        warning: {
          DEFAULT: "var(--warning)",
          bg: "var(--warning-bg)",
        },
        info: "var(--info)",
        score: {
          competences: "var(--score-competences)",
          experience: "var(--score-experience)",
          historique: "var(--score-historique)",
          semantique: "var(--score-semantique)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-bg)",
          border: "var(--sidebar-border)",
          fg: "var(--sidebar-fg)",
          "fg-muted": "var(--sidebar-fg-muted)",
          "section-label": "var(--sidebar-section-label)",
          "item-active": "var(--sidebar-item-active-bg)",
          "item-hover": "var(--sidebar-item-hover-bg)",
          accent: "var(--sidebar-accent)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-instrument-serif)", "Georgia", "serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        display: ["2rem", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "display-lg": ["2.5rem", { lineHeight: "1.1", letterSpacing: "-0.025em" }],
        eyebrow: ["0.6875rem", { lineHeight: "1", letterSpacing: "0.075em" }],
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
