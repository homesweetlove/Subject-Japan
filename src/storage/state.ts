import {
  initialState,
  type LocalState,
  type Translation,
} from "../domain/models";
import { validReminder, REMINDER_LIMIT } from "../features/trip/countdown";
import { validCard } from "../features/cards/model";
import { validRate } from "../features/pay/calculator";
import { validTripItem } from "../features/trip/itinerary";

export const STORAGE_KEY = "subject-japan.local.v1";
export const HISTORY_LIMIT = 100;
export const FAVORITES_LIMIT = 100;
export const SAVED_COUPON_LIMIT = 200;
export function toggleSavedCoupon(state: LocalState, id: string): LocalState {
  const exists = state.savedCouponIds.includes(id);
  if (!exists && state.savedCouponIds.length >= SAVED_COUPON_LIMIT)
    throw new Error("혜택은 200개까지 저장할 수 있어요.");
  return {
    ...state,
    savedCouponIds: exists
      ? state.savedCouponIds.filter((value) => value !== id)
      : [...state.savedCouponIds, id],
  };
}
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
  // Additive v1 migration: earlier installations have no savedCouponIds field.
  state.savedCouponIds = Array.isArray(value.savedCouponIds)
    ? [
        ...new Set<string>(
          value.savedCouponIds.filter(
            (id: unknown): id is string =>
              typeof id === "string" && /^[a-z0-9-]{1,80}$/.test(id),
          ),
        ),
      ].slice(0, SAVED_COUPON_LIMIT)
    : [];
  state.airportReminders = Array.isArray(value.airportReminders)
    ? value.airportReminders
        .filter(validReminder)
        .filter(
          (r: { id: string }, index: number, all: { id: string }[]) =>
            all.findIndex((item) => item.id === r.id) === index,
        )
        .slice(0, REMINDER_LIMIT)
    : [];
  state.guideChecks = Array.isArray(value.guideChecks)
    ? [
        ...new Set<string>(
          value.guideChecks.filter(
            (id: unknown): id is string =>
              typeof id === "string" && /^[a-z0-9-]{1,100}$/.test(id),
          ),
        ),
      ].slice(0, 300)
    : [];
  state.transitCards = Array.isArray(value.transitCards)
    ? value.transitCards
        .filter(validCard)
        .filter(
          (v: { id: string }, i: number, a: { id: string }[]) =>
            a.findIndex((x) => x.id === v.id) === i,
        )
        .slice(0, 20)
    : [];
  state.exchangeRate = validRate(value.exchangeRate)
    ? value.exchangeRate
    : null;
  state.tripItems = Array.isArray(value.tripItems)
    ? value.tripItems
        .filter(validTripItem)
        .filter(
          (v: { id: string }, i: number, a: { id: string }[]) =>
            a.findIndex((x) => x.id === v.id) === i,
        )
        .slice(0, 200)
    : [];
  return state;
}
