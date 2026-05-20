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
        bordeaux: "#8B2332",
        "vert-sapin": "#1F4D3F",
        creme: "#FBF7F0",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        surface: "var(--surface)",
        canvas: "var(--canvas)",
        fg: {
          DEFAULT: "var(--fg)",
          muted: "var(--fg-muted)",
          subtle: "var(--fg-subtle)",
        },
        border: {
          DEFAULT: "var(--border)",
          soft: "var(--border-soft)",
        },
        success: "var(--success)",
        destructive: "var(--destructive)",
        warning: "var(--warning)",
        info: "var(--info)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-instrument-serif)", "Georgia", "serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        display: ["1.875rem", { lineHeight: "1.05", letterSpacing: "-0.025em" }],
        "display-lg": ["2.375rem", { lineHeight: "1.1", letterSpacing: "-0.025em" }],
        eyebrow: ["0.6875rem", { lineHeight: "1", letterSpacing: "0.075em" }],
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "14px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.03)",
        card: "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(139,35,50,0.06)",
        lift: "0 4px 12px rgba(0,0,0,0.06), 0 16px 40px rgba(139,35,50,0.08)",
        active: "0 1px 2px rgba(139,35,50,0.18), 0 4px 12px rgba(139,35,50,0.12)",
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
    },
  },
  plugins: [],
};

export default config;
