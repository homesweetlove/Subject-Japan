import { createContext, useContext } from "react";
import { Platform, type ViewStyle } from "react-native";

/**
 * "Washi & Shu" palette: warm paper, sumi ink, and vermilion (朱) reserved for
 * the one primary action on a screen. Selection uses ink so it never competes
 * with the call to action. Every text pair below meets WCAG AA (4.5:1).
 */
export const light = {
  bg: "#F7F4EF",
  surface: "#FFFFFF",
  ink: "#16181D",
  muted: "#5F636B",
  line: "#E9E3DA",
  accent: "#C8401F",
  soft: "#EFEAE2",
  inverse: "#FFFFFF",
  error: "#B3261E",
  accentSoft: "#FBE9E3",
  accentInk: "#A8341A",
  success: "#2F7A4F",
  successSoft: "#E4F2E9",
  selected: "#16181D",
  onSelected: "#FFFFFF",
  overlay: "rgba(16,18,22,0.55)",
  shadow: "#3A2A1A",
};
export type Palette = typeof light;
export const dark: Palette = {
  bg: "#101216",
  surface: "#1A1D23",
  ink: "#F2EFE9",
  muted: "#A0A5AF",
  line: "#2A2E36",
  accent: "#FF8466",
  soft: "#252932",
  inverse: "#1B0F0B",
  error: "#FF8A80",
  accentSoft: "#3A1F18",
  accentInk: "#FFB39F",
  success: "#7FD3A0",
  successSoft: "#1B2E23",
  selected: "#F2EFE9",
  onSelected: "#101216",
  overlay: "rgba(0,0,0,0.7)",
  shadow: "#000000",
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/** Soft, low elevation used for cards; flat hairline in dark mode. */
export function elevation(c: Palette, level: 1 | 2 = 1): ViewStyle {
  if (c === dark) return { borderWidth: 1, borderColor: c.line };
  const blur = level === 1 ? 18 : 28;
  const alpha = level === 1 ? 0.06 : 0.1;
  return Platform.select<ViewStyle>({
    web: {
      boxShadow: `0 ${level * 4}px ${blur}px rgba(58,42,26,${alpha}), 0 1px 2px rgba(58,42,26,0.04)`,
    } as ViewStyle,
    android: { elevation: level * 2 },
    default: {
      shadowColor: c.shadow,
      shadowOpacity: alpha,
      shadowRadius: blur / 2,
      shadowOffset: { width: 0, height: level * 3 },
    },
  })!;
}

export const ThemeContext = createContext<Palette>(light);
export const useTheme = () => useContext(ThemeContext);
