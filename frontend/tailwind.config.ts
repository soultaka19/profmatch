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
        // Palette académique ProfMatch (voir CLAUDE.md)
        bordeaux: "#8B2332",
        "vert-sapin": "#1F4D3F",
        "gris-violet": "#4A3F5C",
        creme: "#FBF7F0",
      },
    },
  },
  plugins: [],
};

export default config;
