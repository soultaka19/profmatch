export type ThemeId =
  | "anthraciteIvory"
  | "institutionalBurgundy"
  | "vertSapin"
  | "slateViolet";

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  swatch: string;
}
