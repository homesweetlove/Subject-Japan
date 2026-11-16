import { createContext, useContext } from "react";
import { type ViewStyle } from "react-native";

/**
 * Plain, readable palette: a white page, near-black text, and one blue kept
 * for the primary action and for whatever is currently selected. Red is only
 * for danger. Every text pair below meets WCAG AA (4.5:1).
 */
export const light = {
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  ink: "#17191C",
  muted: "#5A6270",
  line: "#E8EAED",
  accent: "#2B5BE8",
  soft: "#F3F5F7",
  inverse: "#FFFFFF",
  error: "#B3241F",
  errorSoft: "#FDECEC",
  accentSoft: "#EAF0FF",
  accentInk: "#1F47C4",
  success: "#1F7A4D",
  successSoft: "#E3F3EA",
  selected: "#2B5BE8",
  onSelected: "#FFFFFF",
  overlay: "rgba(23,25,28,0.55)",
  shadow: "#000000",
  /** Held-down shades: one step deeper than the resting fill. */
  accentPressed: "#1F47C4",
  softPressed: "#E6E9ED",
  surfacePressed: "#F3F5F7",
  accentSoftPressed: "#D5E0FF",
  errorSoftPressed: "#F9D5D3",
};
export type Palette = typeof light;
export const dark: Palette = {
  bg: "#111315",
  surface: "#1A1D21",
  ink: "#F1F3F5",
  muted: "#A3ABB6",
  line: "#2A2F36",
  accent: "#7DA2FF",
  soft: "#23272D",
  inverse: "#0B1530",
  error: "#FF8A80",
  errorSoft: "#3A1C1A",
  accentSoft: "#1B2A52",
  accentInk: "#A9C1FF",
  success: "#7FD3A0",
  successSoft: "#17301F",
  selected: "#7DA2FF",
  onSelected: "#0B1530",
  overlay: "rgba(0,0,0,0.7)",
  shadow: "#000000",
  accentPressed: "#6690F5",
  softPressed: "#2F343B",
  surfacePressed: "#22262B",
  accentSoftPressed: "#24376B",
  errorSoftPressed: "#4A2421",
};

export const radius = { sm: 10, md: 14, lg: 16, xl: 24, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/**
 * Cards sit flat on the page and are told apart by a hairline, not a shadow,
 * in both themes. `level` is kept so call sites need no change.
 */
export function elevation(c: Palette, _level: 1 | 2 = 1): ViewStyle {
  return { borderWidth: 1, borderColor: c.line };
}

export const ThemeContext = createContext<Palette>(light);
export const useTheme = () => useContext(ThemeContext);
