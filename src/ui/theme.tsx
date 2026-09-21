import { createContext, useContext } from "react";
export const light = {
  bg: "#F5F4F0",
  surface: "#FFFFFF",
  ink: "#202722",
  muted: "#727870",
  line: "#E5E7DF",
  accent: "#27634A",
  soft: "#EAF0E7",
  inverse: "#FFFFFF",
  error: "#B44236",
};
export type Palette = typeof light;
export const dark: Palette = {
  bg: "#101713",
  surface: "#1B241E",
  ink: "#F1F3EA",
  muted: "#A3AEA4",
  line: "#344038",
  accent: "#A9D2B7",
  soft: "#293B2E",
  inverse: "#15271D",
  error: "#FFAAA0",
};
export const ThemeContext = createContext<Palette>(light);
export const useTheme = () => useContext(ThemeContext);
