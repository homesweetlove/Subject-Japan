import type { AirportReminder } from "../trip/countdown";
import { countdown, japanDateTime } from "../trip/countdown";
import { airportRoutes } from "../trip/airports";
import type { TripItem } from "../trip/itinerary";

export const tripItemTime = (item: TripItem) =>
  Date.parse(`${item.when.replace(" ", "T")}:00+09:00`);

/** Next unfinished itinerary entry that has not started yet. */
export function nextTripItem(items: TripItem[], now = Date.now()) {
  return (
    items
      .filter((t) => !t.done && tripItemTime(t) > now)
      .sort((a, b) => tripItemTime(a) - tripItemTime(b))[0] ?? null
  );
}

/** Soonest last-train timer whose train has not departed. */
export function nextReminder(reminders: AirportReminder[], now = Date.now()) {
  return (
    reminders
      .filter((r) => r.departureAt > now)
      .sort((a, b) => a.departureAt - b.departureAt)[0] ?? null
  );
}

export function relativeTime(ms: number): string {
  if (ms <= 0) return "지금";
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `${minutes}분 후`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `${hours}시간 ${rest}분 후` : `${hours}시간 후`;
  }
  return `${Math.floor(hours / 24)}일 후`;
}

export const jstClock = (timestamp: number) =>
  japanDateTime(timestamp).slice(11);

export function jstHeadline(now = Date.now()) {
  const d = new Date(now + 9 * 3600000);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${days[d.getUTCDay()]}) ${jstClock(now)}`;
}

// ── Local notifications ─────────────────────────────────────────────────────

export const TRIP_LEAD_OPTIONS = [0, 30, 60, 120] as const;
export type TripLead = (typeof TRIP_LEAD_OPTIONS)[number];
export interface NotificationSettings {
  enabled: boolean;
  tripLeadMinutes: TripLead;
}
export const defaultNotificationSettings = (): NotificationSettings => ({
  enabled: false,
  tripLeadMinutes: 60,
});
export function validNotificationSettings(
  v: unknown,
): v is NotificationSettings {
  const s = v as NotificationSettings;
  return (
    !!s &&
    typeof s.enabled === "boolean" &&
    (TRIP_LEAD_OPTIONS as readonly number[]).includes(s.tripLeadMinutes)
  );
}

export interface PlannedNotification {
  key: string;
  at: number;
  title: string;
  body: string;
  target: "airport" | "itinerary";
}
/** iOS keeps at most 64 pending local notifications per app. */
export const NOTIFICATION_CAP = 60;
export const LAST_TRAIN_EARLY_MINUTES = 30;

/**
 * Pure schedule derived from saved data. Notification text shows on the lock
 * screen, so it never includes reservation numbers, notes or addresses.
 */
export function planNotifications(
  input: {
    tripItems: TripItem[];
    airportReminders: AirportReminder[];
    settings: NotificationSettings;
  },
  now = Date.now(),
): PlannedNotification[] {
  if (!input.settings.enabled) return [];
  const plan: PlannedNotification[] = [];
  for (const r of input.airportReminders) {
    const { leaveAt } = countdown(r, now);
    const route = airportRoutes.find((a) => a.id === r.routeId);
    const where = `${r.origin} → ${route?.airport ?? "공항"}`;
    const train = `막차 ${jstClock(r.departureAt)}(일본 시각)`;
    const early = leaveAt - LAST_TRAIN_EARLY_MINUTES * 60000;
    if (early > now)
      plan.push({
        key: `airport:${r.id}:early`,
        at: early,
        title: `${LAST_TRAIN_EARLY_MINUTES}분 뒤 역으로 출발하세요`,
        body: `${where} · ${train}`,
        target: "airport",
      });
    if (leaveAt > now)
      plan.push({
        key: `airport:${r.id}:leave`,
        at: leaveAt,
        title: "지금 역으로 출발할 시간이에요",
        body: `${where} · ${train} · 공식 시간표를 다시 확인하세요.`,
        target: "airport",
      });
  }
  const lead = input.settings.tripLeadMinutes;
  if (lead > 0)
    for (const t of input.tripItems) {
      if (t.done) continue;
      const at = tripItemTime(t) - lead * 60000;
      if (at > now)
        plan.push({
          key: `trip:${t.id}`,
          at,
          title: `${lead >= 60 ? `${lead / 60}시간` : `${lead}분`} 뒤 일정`,
          body: `${t.title} · ${t.when.slice(11)}(일본 시각)`,
          target: "itinerary",
        });
    }
  return plan.sort((a, b) => a.at - b.at).slice(0, NOTIFICATION_CAP);
}
