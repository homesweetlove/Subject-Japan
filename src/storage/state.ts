import {
  initialState,
  type LocalState,
  type Translation,
} from "../domain/models";

export const STORAGE_KEY = "subject-japan.local.v1";
export const HISTORY_LIMIT = 100;
export const FAVORITES_LIMIT = 100;
export function sameTranslation(a: Translation, b: Translation) {
  return (
    a.original === b.original &&
    a.translated === b.translated &&
    a.source === b.source
  );
}
export function recordTranslation(
  state: LocalState,
  translation: Translation,
): LocalState {
  return {
    ...state,
    history: [
      translation,
      ...state.history.filter((t) => !sameTranslation(t, translation)),
    ].slice(0, HISTORY_LIMIT),
  };
}
export function toggleFavorite(
  state: LocalState,
  translation: Translation,
): LocalState {
  const exists = state.favorites.some((t) => sameTranslation(t, translation));
  if (!exists && state.favorites.length >= FAVORITES_LIMIT)
    throw new Error("즐겨찾기는 100개까지 저장할 수 있어요.");
  return {
    ...state,
    favorites: exists
      ? state.favorites.filter((t) => !sameTranslation(t, translation))
      : [translation, ...state.favorites],
  };
}
function validTranslation(value: unknown): value is Translation {
  if (!value || typeof value !== "object") return false;
  const t = value as Translation;
  return (
    typeof t.id === "string" &&
    ["ko", "ja"].includes(t.source) &&
    ["ko", "ja"].includes(t.target) &&
    t.source !== t.target &&
    typeof t.original === "string" &&
    t.original.length <= 2000 &&
    typeof t.translated === "string" &&
    typeof t.provider === "string" &&
    Number.isFinite(t.createdAt)
  );
}
export function decodeState(raw: string | null): LocalState {
  if (!raw) return initialState();
  const value = JSON.parse(raw);
  if (!value || value.version !== 1)
    throw new Error("저장 데이터 버전을 확인할 수 없어요.");
  const state = initialState();
  const limit = (value: unknown, max: number) =>
    typeof value === "string" ? value.slice(0, max) : "";
  state.onboarded = value.onboarded === true;
  state.profile = {
    nickname: limit(value.profile?.nickname, 24),
    sizes: {
      top: limit(value.profile?.sizes?.top, 24),
      bottom: limit(value.profile?.sizes?.bottom, 24),
      shoe: limit(value.profile?.sizes?.shoe, 24),
    },
  };
  state.theme = ["system", "light", "dark"].includes(value.theme)
    ? value.theme
    : "system";
  state.history = Array.isArray(value.history)
    ? value.history.filter(validTranslation).slice(0, HISTORY_LIMIT)
    : [];
  state.favorites = Array.isArray(value.favorites)
    ? value.favorites.filter(validTranslation).slice(0, FAVORITES_LIMIT)
    : [];
  return state;
}
