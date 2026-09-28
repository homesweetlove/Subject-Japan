import { createContext, useContext, type ReactNode } from "react";
import type { ViewStyle } from "react-native";

/**
 * Subject Japan UI: quiet utility first.
 * Neutral surfaces, compact corners and one Japanese-red action color.
 * Decoration is deliberately minimal so travel information stays primary.
 */
export const light = {
  bg: "#F6F6F4",
  surface: "#FFFFFF",
  ink: "#151515",
  muted: "#6F7175",
  line: "#E2E2DF",
  accent: "#D92D32",
  soft: "#F0F0ED",
  inverse: "#FFFFFF",
  error: "#B42318",
  accentSoft: "#FBE9E9",
  accentInk: "#A61F24",
  success: "#24734B",
  successSoft: "#E8F2EC",
  selected: "#151515",
  onSelected: "#FFFFFF",
  overlay: "rgba(0,0,0,0.52)",
  shadow: "#000000",
};
export type Palette = typeof light;
export const dark: Palette = {
  bg: "#111211",
  surface: "#1A1B1A",
  ink: "#F4F4F1",
  muted: "#A2A39F",
  line: "#30312F",
  accent: "#FF666B",
  soft: "#242522",
  inverse: "#171717",
  error: "#FF8D87",
  accentSoft: "#3A2021",
  accentInk: "#FF9A9E",
  success: "#75C99A",
  successSoft: "#1C3025",
  selected: "#F4F4F1",
  onSelected: "#111211",
  overlay: "rgba(0,0,0,0.72)",
  shadow: "#000000",
};

export const radius = { sm: 5, md: 7, lg: 10, xl: 14, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, xxl: 30 };

/** Flat bordered surfaces; elevation is intentionally avoided. */
export function elevation(c: Palette, _level: 1 | 2 = 1): ViewStyle {
  return { borderWidth: 1, borderColor: c.line };
}

export const ThemeContext = createContext<Palette>(light);
export const useTheme = () => useContext(ThemeContext);
