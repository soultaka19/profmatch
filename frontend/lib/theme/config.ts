import type { ThemeId, ThemeMeta } from "./types";

export const THEMES: ThemeMeta[] = [
  { id: "anthraciteIvory", label: "Anthracite ivoire", swatch: "#27352F" },
  { id: "institutionalBurgundy", label: "Bordeaux institutionnel", swatch: "#A01835" },
  { id: "slateViolet", label: "Violet ardoise", swatch: "#4A3F5C" },
];

export const DEFAULT_THEME: ThemeId = "anthraciteIvory";

export const THEME_STORAGE_KEY = "profmatch-theme";

export function isThemeId(value: unknown): value is ThemeId {
  return value === "anthraciteIvory" || value === "institutionalBurgundy" || value === "slateViolet";
}
