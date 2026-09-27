import type { AirportReminder } from "../features/trip/countdown";
import type { TransitCard } from "../features/cards/model";
import type { ExchangeRate } from "../features/pay/calculator";
import type { TripItem } from "../features/trip/itinerary";
import type { DutyFreeReceipt } from "../features/pay/taxFreeTracker";
import {
  defaultNotificationSettings,
  type NotificationSettings,
} from "../features/today/model";
import type { WeatherCityId, WeatherSnapshot } from "../features/today/weather";
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
  savedCouponIds: string[];
  airportReminders: AirportReminder[];
  guideChecks: string[];
  transitCards: TransitCard[];
  exchangeRate: ExchangeRate | null;
  tripItems: TripItem[];
  dutyFreeReceipts: DutyFreeReceipt[];
  autoRefreshRate: boolean;
  notifications: NotificationSettings;
  /** Unset until the user picks a city, so no forecast request happens before. */
  weatherCity: WeatherCityId | null;
  weather: WeatherSnapshot | null;
}
export const initialState = (): LocalState => ({
  version: 1,
  onboarded: false,
  profile: { nickname: "", sizes: { top: "", bottom: "", shoe: "" } },
  theme: "system",
  history: [],
  favorites: [],
  savedCouponIds: [],
  airportReminders: [],
  guideChecks: [],
  transitCards: [],
  exchangeRate: null,
  tripItems: [],
  dutyFreeReceipts: [],
  // Opt-in: the rate server only sees requests the user has allowed.
  autoRefreshRate: false,
  notifications: defaultNotificationSettings(),
  weatherCity: null,
  weather: null,
});
export const languageNames: Record<Language, string> = {
  ko: "한국어",
  ja: "일본어",
};
