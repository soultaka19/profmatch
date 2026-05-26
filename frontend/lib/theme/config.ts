import type { ThemeId, ThemeMeta } from "./types";

export const THEMES: ThemeMeta[] = [
  { id: "anthraciteIvory", label: "Anthracite ivoire", swatch: "#27352F" },
  { id: "institutionalBurgundy", label: "Bordeaux — Professeur", swatch: "#8B2332" },
  { id: "vertSapin", label: "Vert sapin — RH", swatch: "#1F4D3F" },
  { id: "slateViolet", label: "Violet ardoise — Admin", swatch: "#4A3F5C" },
];

export const DEFAULT_THEME: ThemeId = "anthraciteIvory";

export const THEME_STORAGE_KEY = "profmatch-theme";

/** Associe un rôle utilisateur à son thème de marque. */
export const ROLE_THEME_MAP: Record<string, ThemeId> = {
  prof: "institutionalBurgundy",
  rh: "vertSapin",
  admin: "slateViolet",
};

export function isThemeId(value: unknown): value is ThemeId {
  return (
    value === "anthraciteIvory" ||
    value === "institutionalBurgundy" ||
    value === "vertSapin" ||
    value === "slateViolet"
  );
}
