import type { ThemeId, ThemeMeta } from "./types";

export const THEMES: ThemeMeta[] = [
  { id: "anthraciteIvory", label: "Anthracite ivoire" },
  { id: "institutionalBurgundy", label: "Bordeaux institutionnel" },
];

export const DEFAULT_THEME: ThemeId = "anthraciteIvory";

export const THEME_STORAGE_KEY = "profmatch-theme";

export function isThemeId(value: unknown): value is ThemeId {
  return value === "anthraciteIvory" || value === "institutionalBurgundy";
}
