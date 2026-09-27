import { airportRoutes } from "./airports";
export interface AirportReminder {
  id: string;
  routeId: string;
  origin: string;
  terminal: string;
  departureAt: number;
  bufferMinutes: number;
  verifiedAt: number;
}
export const REMINDER_LIMIT = 12;
export function japanDateTime(timestamp: number) {
  return new Date(timestamp + 9 * 3600000)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
}
export function parseJapanDateTime(date: string, time: string): number {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  )
    throw new Error("날짜는 YYYY-MM-DD, 시간은 HH:mm 형식으로 입력해 주세요.");
  const value = Date.parse(`${date}T${time}:00+09:00`);
  if (!Number.isFinite(value) || japanDateTime(value) !== `${date} ${time}`)
    throw new Error("실제 존재하는 날짜와 시간을 입력해 주세요.");
  return value;
}
export function createReminder(
  input: {
    id: string;
    routeId: string;
    origin: string;
    terminal: string;
    date: string;
    time: string;
    buffer: string;
    confirmed: boolean;
  },
  now = Date.now(),
): AirportReminder {
  if (!airportRoutes.some((r) => r.id === input.routeId))
    throw new Error("공항 노선을 선택해 주세요.");
  if (!input.origin.trim() || input.origin.trim().length > 60)
    throw new Error("출발역을 60자 이내로 입력해 주세요.");
  if (!input.terminal.trim() || input.terminal.trim().length > 40)
    throw new Error("이용 터미널을 입력해 주세요.");
  if (!input.confirmed)
    throw new Error("공식 시간표의 이용일·출발역·공항 방향을 확인해 주세요.");
  const departureAt = parseJapanDateTime(input.date.trim(), input.time.trim());
  if (departureAt <= now)
    throw new Error(
      "이미 지난 시각이에요. 자정 이후 출발은 다음 날짜로 입력해 주세요.",
    );
  if (departureAt - now > 366 * 86400000)
    throw new Error("1년 이내의 이용일을 입력해 주세요.");
  if (
    !/^\d{1,3}$/.test(input.buffer) ||
    Number(input.buffer) < 5 ||
    Number(input.buffer) > 180
  )
    throw new Error("역까지 이동·승차 여유는 5~180분으로 입력해 주세요.");
  return {
    id: input.id,
    routeId: input.routeId,
    origin: input.origin.trim(),
    terminal: input.terminal.trim(),
    departureAt,
    bufferMinutes: Number(input.buffer),
    verifiedAt: now,
  };
}
export function countdown(reminder: AirportReminder, now = Date.now()) {
  const departureMs = reminder.departureAt - now;
  const leaveAt = reminder.departureAt - reminder.bufferMinutes * 60000;
  return {
    departureMs,
    leaveAt,
    leaveMs: leaveAt - now,
    phase:
      departureMs <= 0
        ? ("departed" as const)
        : now >= leaveAt
          ? ("leave-now" as const)
          : ("upcoming" as const),
    needsReview:
      now - reminder.verifiedAt >= 86400000 || now < reminder.verifiedAt,
  };
}
export function duration(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(seconds / 3600);
  return `${h.toString().padStart(2, "0")}:${Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
export function validReminder(value: unknown): value is AirportReminder {
  if (!value || typeof value !== "object") return false;
  const r = value as AirportReminder;
  return (
    typeof r.id === "string" &&
    /^[a-z0-9-]{1,80}$/.test(r.id) &&
    airportRoutes.some((route) => route.id === r.routeId) &&
    typeof r.origin === "string" &&
    r.origin.length > 0 &&
    r.origin.length <= 60 &&
    typeof r.terminal === "string" &&
    r.terminal.length > 0 &&
    r.terminal.length <= 40 &&
    Number.isFinite(r.departureAt) &&
    r.departureAt > 0 &&
    r.departureAt < 8640000000000000 - 32400000 &&
    Number.isInteger(r.bufferMinutes) &&
    r.bufferMinutes >= 5 &&
    r.bufferMinutes <= 180 &&
    Number.isFinite(r.verifiedAt) &&
    r.verifiedAt > 0
  );
}

export const JAPAN_DAYS_OF_WEEK = ["일", "월", "화", "수", "목", "금", "토"];

export function formatLiveJapanTime(now = Date.now()): {
  date: string;
  time: string;
  dayOfWeek: string;
  fullText: string;
} {
  const jstDate = new Date(now + 9 * 3600000);
  const iso = jstDate.toISOString();
  const date = iso.slice(0, 10);
  const time = iso.slice(11, 19);
  const dayOfWeek = JAPAN_DAYS_OF_WEEK[jstDate.getUTCDay()];
  return {
    date,
    time,
    dayOfWeek,
    fullText: `${date} (${dayOfWeek}) ${time} JST`,
  };
}
