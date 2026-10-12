export const themes = [
  { id: "dark-plus", label: "Dark+", type: "dark", shiki: "dark-plus" },
  { id: "light-plus", label: "Light+", type: "light", shiki: "light-plus" },
  { id: "dracula", label: "Dracula", type: "dark", shiki: "dracula" },
  { id: "github-dark", label: "GitHub Dark", type: "dark", shiki: "github-dark" },
  { id: "one-dark-pro", label: "One Dark Pro", type: "dark", shiki: "one-dark-pro" },
] as const;

export type Theme = (typeof themes)[number];
export type ThemeId = Theme["id"];

export const DEFAULT_THEME: ThemeId = "dracula";
export const THEME_STORAGE_KEY = "portfolio-theme";

export function isThemeId(value: unknown): value is ThemeId {
  return themes.some((t) => t.id === value);
}

export function getTheme(id: ThemeId): Theme {
  return themes.find((t) => t.id === id) ?? themes[0];
}
