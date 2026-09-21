export type Language = "ko" | "ja";
export type SourceLanguage = Language | "auto";
export type ThemePreference = "system" | "light" | "dark";
export type SizeKey = "top" | "bottom" | "shoe";

/** Size labels are deliberately not converted between country/brand standards. */
export interface Profile {
  nickname: string;
  sizes: Record<SizeKey, string>;
}
export interface Translation {
  id: string;
  source: Language;
  target: Language;
  original: string;
  translated: string;
  provider: string;
  createdAt: number;
}
export interface LocalState {
  version: 1;
  onboarded: boolean;
  profile: Profile;
  theme: ThemePreference;
  history: Translation[];
  favorites: Translation[];
}
export const initialState = (): LocalState => ({
  version: 1,
  onboarded: false,
  profile: { nickname: "", sizes: { top: "", bottom: "", shoe: "" } },
  theme: "system",
  history: [],
  favorites: [],
});
export const languageNames: Record<Language, string> = {
  ko: "한국어",
  ja: "일본어",
};
