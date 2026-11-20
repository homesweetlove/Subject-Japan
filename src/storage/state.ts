import {
  initialState,
  type LocalState,
  type Translation,
} from "../domain/models";
import { validReminder, REMINDER_LIMIT } from "../features/trip/countdown";
import { validCard } from "../features/cards/model";
import { validRate } from "../features/pay/calculator";
import { validTripItem } from "../features/trip/itinerary";
import {
  defaultNotificationSettings,
  validNotificationSettings,
} from "../features/today/model";
import { isWeatherCity, validWeather } from "../features/today/weather";
import {
  validReceipt,
  RECEIPT_LIMIT,
  type DutyFreeReceipt,
} from "../features/pay/taxFreeTracker";
import {
  EXPENSE_LIMIT,
  validExpense,
  type Expense,
} from "../features/pay/expenses";
import { validDeparture } from "../features/trip/departure";
import {
  MEMBERSHIP_LIMIT,
  validMembershipCard,
  type MembershipCard,
} from "../features/membership/model";

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
export function saveDutyFreeReceipt(
  state: LocalState,
  receipt: DutyFreeReceipt,
): LocalState {
  if (!validReceipt(receipt)) throw new Error("영수증 정보를 확인해 주세요.");
  const existing = state.dutyFreeReceipts.findIndex((r) => r.id === receipt.id);
  let updated: DutyFreeReceipt[];
  if (existing >= 0) {
    updated = state.dutyFreeReceipts.map((r) =>
      r.id === receipt.id ? receipt : r,
    );
  } else {
    if (state.dutyFreeReceipts.length >= RECEIPT_LIMIT)
      throw new Error(`영수증은 ${RECEIPT_LIMIT}개까지 등록할 수 있어요.`);
    updated = [receipt, ...state.dutyFreeReceipts];
  }
  return { ...state, dutyFreeReceipts: updated };
}
export function deleteDutyFreeReceipt(
  state: LocalState,
  id: string,
): LocalState {
  return {
    ...state,
    dutyFreeReceipts: state.dutyFreeReceipts.filter((r) => r.id !== id),
  };
}
export function setAutoRefreshRate(
  state: LocalState,
  enabled: boolean,
): LocalState {
  return { ...state, autoRefreshRate: enabled };
}
function validTranslation(value: unknown): value is Translation {
  if (!value || typeof value !== "object") return false;
  const t = value as Translation;
  return (
    typeof t.id === "string" &&
    t.id.length > 0 &&
    t.id.length <= 120 &&
    ["ko", "ja"].includes(t.source) &&
    ["ko", "ja"].includes(t.target) &&
    t.source !== t.target &&
    typeof t.original === "string" &&
    t.original.length <= 2000 &&
    typeof t.translated === "string" &&
    t.translated.length <= 4000 &&
    typeof t.provider === "string" &&
    t.provider.length <= 60 &&
    Number.isFinite(t.createdAt)
  );
}
export function decodeState(raw: string | null): LocalState {
  // Only an absent key is a new installation. Empty/truncated documents must
  // surface as read failures so the caller cannot silently overwrite them.
  if (raw === null) return initialState();
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
  state.membershipCards = Array.isArray(value.membershipCards)
    ? value.membershipCards
        .filter(validMembershipCard)
        .filter(
          (v: MembershipCard, i: number, a: MembershipCard[]) =>
            a.findIndex((x) => x.id === v.id) === i,
        )
        .slice(0, MEMBERSHIP_LIMIT)
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
  state.dutyFreeReceipts = Array.isArray(value.dutyFreeReceipts)
    ? value.dutyFreeReceipts
        .filter(validReceipt)
        .filter(
          (v: { id: string }, i: number, a: { id: string }[]) =>
            a.findIndex((x) => x.id === v.id) === i,
        )
        .slice(0, RECEIPT_LIMIT)
    : [];
  state.autoRefreshCoupons = value.autoRefreshCoupons === true;
  state.autoRefreshRate = value.autoRefreshRate === true;
  state.notifications = validNotificationSettings(value.notifications)
    ? {
        enabled: value.notifications.enabled,
        tripLeadMinutes: value.notifications.tripLeadMinutes,
      }
    : defaultNotificationSettings();
  state.weatherCity = isWeatherCity(value.weatherCity)
    ? value.weatherCity
    : null;
  state.weather =
    validWeather(value.weather) && value.weather.cityId === state.weatherCity
      ? value.weather
      : null;
  state.expenses = Array.isArray(value.expenses)
    ? value.expenses
        .filter(validExpense)
        .filter(
          (v: { id: string }, i: number, a: { id: string }[]) =>
            a.findIndex((x) => x.id === v.id) === i,
        )
        .slice(0, EXPENSE_LIMIT)
    : [];
  state.departure = validDeparture(value.departure) ? value.departure : null;
  return state;
}

export function saveExpense(state: LocalState, expense: Expense): LocalState {
  if (!validExpense(expense)) throw new Error("지출 금액을 확인해 주세요.");
  const exists = state.expenses.some((e) => e.id === expense.id);
  if (!exists && state.expenses.length >= EXPENSE_LIMIT)
    throw new Error(`지출은 ${EXPENSE_LIMIT}개까지 기록할 수 있어요.`);
  return {
    ...state,
    expenses: exists
      ? state.expenses.map((e) => (e.id === expense.id ? expense : e))
      : [expense, ...state.expenses],
  };
}
export function deleteExpense(state: LocalState, id: string): LocalState {
  return { ...state, expenses: state.expenses.filter((e) => e.id !== id) };
}

export function saveMembership(
  state: LocalState,
  card: MembershipCard,
): LocalState {
  if (!validMembershipCard(card))
    throw new Error("멤버십 정보를 확인해 주세요.");
  const exists = state.membershipCards.some((c) => c.id === card.id);
  if (!exists && state.membershipCards.length >= MEMBERSHIP_LIMIT)
    throw new Error(`멤버십은 ${MEMBERSHIP_LIMIT}개까지 저장할 수 있어요.`);
  return {
    ...state,
    membershipCards: exists
      ? state.membershipCards.map((c) => (c.id === card.id ? card : c))
      : [card, ...state.membershipCards],
  };
}

export function deleteMembership(state: LocalState, id: string): LocalState {
  return {
    ...state,
    membershipCards: state.membershipCards.filter((c) => c.id !== id),
  };
}
