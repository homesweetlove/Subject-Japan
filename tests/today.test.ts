import { describe, expect, it } from "vitest";
import {
  nextReminder,
  nextTripItem,
  planNotifications,
  relativeTime,
  NOTIFICATION_CAP,
} from "../src/features/today/model";
import {
  amedasUrl,
  describeWeather,
  forecastUrl,
  isWeatherStale,
  parseAmedas,
  parseJmaForecast,
  validWeather,
  type WeatherSnapshot,
  WEATHER_TTL_MS,
} from "../src/features/today/weather";
import type { TripItem } from "../src/features/trip/itinerary";
import type { AirportReminder } from "../src/features/trip/countdown";
import { decodeState } from "../src/storage/state";
import { initialState } from "../src/domain/models";
import forecast130000 from "./fixtures/jma-forecast-130000.json";
import amedas44132 from "./fixtures/jma-amedas-44132.json";
import { JMA_WEATHER } from "../src/features/today/jmaCodes";

const now = Date.parse("2026-10-03T12:00:00+09:00");
const item = (id: string, when: string, done = false): TripItem => ({
  id,
  title: `일정 ${id}`,
  when,
  place: "도쿄 신주쿠 호텔 1-2-3",
  reservation: "SECRET-123",
  note: "개인 메모",
  done,
});
const reminder: AirportReminder = {
  id: "r1",
  routeId: "haneda-keikyu",
  origin: "시나가와",
  terminal: "T3",
  departureAt: Date.parse("2026-10-03T23:00:00+09:00"),
  bufferMinutes: 40,
  verifiedAt: now,
};
const settings = { enabled: true, tripLeadMinutes: 60 as const };

describe("today summary", () => {
  it("picks the next unfinished future trip and upcoming train", () => {
    const items = [
      item("a", "2026-10-03 11:00"),
      item("b", "2026-10-04 09:00"),
      item("c", "2026-10-03 18:00", true),
      item("d", "2026-10-03 15:30"),
    ];
    expect(nextTripItem(items, now)?.id).toBe("d");
    expect(nextTripItem([], now)).toBeNull();
    expect(nextReminder([reminder], now)?.id).toBe("r1");
    expect(nextReminder([reminder], reminder.departureAt + 1)).toBeNull();
  });
  it("formats relative times", () => {
    expect(relativeTime(0)).toBe("지금");
    expect(relativeTime(5 * 60000)).toBe("5분 후");
    expect(relativeTime(90 * 60000)).toBe("1시간 30분 후");
    expect(relativeTime(2 * 3600000)).toBe("2시간 후");
    expect(relativeTime(50 * 3600000)).toBe("2일 후");
  });
});

describe("notification plan", () => {
  it("is empty when disabled", () => {
    expect(
      planNotifications(
        {
          tripItems: [item("a", "2026-10-03 18:00")],
          airportReminders: [reminder],
          settings: { ...settings, enabled: false },
        },
        now,
      ),
    ).toEqual([]);
  });
  it("schedules early and leave alerts for trains and lead alerts for trips", () => {
    const plan = planNotifications(
      {
        tripItems: [
          item("a", "2026-10-03 18:00"),
          item("b", "2026-10-03 12:30"),
        ],
        airportReminders: [reminder],
        settings,
      },
      now,
    );
    const leaveAt = reminder.departureAt - 40 * 60000;
    expect(plan.map((p) => [p.key, p.at])).toEqual([
      ["trip:a", Date.parse("2026-10-03T17:00:00+09:00")],
      ["airport:r1:early", leaveAt - 30 * 60000],
      ["airport:r1:leave", leaveAt],
    ]);
    expect(plan[2].title).toBe("지금 역으로 출발할 시간이에요");
    expect(plan[2].body).toContain("시나가와 → 하네다 HND");
    expect(plan[2].body).toContain("23:00");
  });
  it("never puts reservation numbers, notes or addresses on the lock screen", () => {
    const plan = planNotifications(
      {
        tripItems: [item("a", "2026-10-03 18:00")],
        airportReminders: [],
        settings,
      },
      now,
    );
    const text = plan.map((p) => p.title + p.body).join(" ");
    expect(text).not.toContain("SECRET-123");
    expect(text).not.toContain("개인 메모");
    expect(text).not.toContain("신주쿠 호텔");
  });
  it("skips trip alerts when the lead is off, and caps the total", () => {
    const many = Array.from({ length: 100 }, (_, i) =>
      item(
        `t${i}`,
        `2026-10-${String(4 + (i % 20)).padStart(2, "0")} ${String(i % 24).padStart(2, "0")}:00`,
      ),
    );
    expect(
      planNotifications(
        {
          tripItems: many,
          airportReminders: [],
          settings: { enabled: true, tripLeadMinutes: 0 },
        },
        now,
      ),
    ).toEqual([]);
    expect(
      planNotifications(
        { tripItems: many, airportReminders: [], settings },
        now,
      ),
    ).toHaveLength(NOTIFICATION_CAP);
  });
});

// Real JMA responses captured 2026-09-27 (05:00 JST forecast, 09:30 observation).
const reportMorning = Date.parse("2026-09-27T10:00:00+09:00");
const tokyoWeather = (): WeatherSnapshot => ({
  source: "JMA",
  cityId: "tokyo",
  fetchedAt: reportMorning,
  temperature: 20.6,
  observedAt: "2026-09-27T09:30",
  days: parseJmaForecast(forecast130000, "tokyo", reportMorning),
});

describe("weather (JMA)", () => {
  it("merges short-term and weekly forecasts into three days from today", () => {
    expect(parseJmaForecast(forecast130000, "tokyo", reportMorning)).toEqual([
      // Morning report repeats the high in today's low slot, so no low.
      { date: "2026-09-27", code: 200, max: 24, min: null, rainChance: 20 },
      { date: "2026-09-28", code: 200, max: 26, min: 20, rainChance: 40 },
      // Beyond the short-term range the weekly forecast fills in.
      { date: "2026-09-29", code: 202, max: 24, min: 19, rainChance: 60 },
    ]);
  });
  it("reads the latest normal AMeDAS temperature", () => {
    expect(parseAmedas(amedas44132)).toEqual({
      temperature: 20.6,
      observedAt: "2026-09-27T09:30",
    });
    expect(
      parseAmedas({
        "20260927093000": { temp: [99.9, 0] },
        "20260927092000": { temp: [20.1, 1] },
        "20260927091000": { temp: [20.0, 0] },
      }),
    ).toEqual({ temperature: 20.0, observedAt: "2026-09-27T09:10" });
    expect(parseAmedas(null)).toBeNull();
    expect(parseAmedas({ bad: { temp: [1, 0] } })).toBeNull();
  });
  it("builds fixed JMA URLs from the chosen city only", () => {
    expect(forecastUrl("tokyo")).toBe(
      "https://www.jma.go.jp/bosai/forecast/data/forecast/130000.json",
    );
    expect(amedasUrl("okinawa", "2026-09-27T10:40:00+09:00\n")).toBe(
      "https://www.jma.go.jp/bosai/amedas/data/point/91197/20260927_09.json",
    );
    expect(() => amedasUrl("tokyo", "<html>")).toThrow();
  });
  it("rejects malformed responses", () => {
    expect(() => parseJmaForecast({}, "tokyo")).toThrow();
    expect(() => parseJmaForecast([], "tokyo")).toThrow();
    // A forecast for another day has nothing for "today".
    expect(() =>
      parseJmaForecast(
        forecast130000,
        "tokyo",
        Date.parse("2026-12-01T10:00:00+09:00"),
      ),
    ).toThrow();
    expect(validWeather({ ...tokyoWeather(), temperature: 999 })).toBe(false);
    expect(validWeather({ ...tokyoWeather(), source: "Open-Meteo" })).toBe(
      false,
    );
    expect(validWeather(tokyoWeather())).toBe(true);
  });
  it("labels every JMA code in Korean with an icon", () => {
    expect(Object.keys(JMA_WEATHER)).toHaveLength(118);
    expect(describeWeather(100)).toEqual({
      label: "맑음",
      icon: "sunny-outline",
    });
    expect(describeWeather(202).label).toBe("흐림 한때 비");
    expect(describeWeather(350).icon).toBe("thunderstorm-outline");
    expect(describeWeather(405).icon).toBe("snow-outline");
    for (const [label] of Object.values(JMA_WEATHER))
      expect(label).not.toMatch(/[぀-ヿ一-龯]/);
  });
  it("treats old, other-city or previous-day caches as stale", () => {
    const w = tokyoWeather();
    expect(isWeatherStale(w, "tokyo", reportMorning + 60000)).toBe(false);
    expect(isWeatherStale(w, "tokyo", reportMorning + WEATHER_TTL_MS + 1)).toBe(
      true,
    );
    expect(isWeatherStale(w, "osaka", reportMorning)).toBe(true);
    expect(isWeatherStale(w, "tokyo", reportMorning - 1)).toBe(true);
    expect(isWeatherStale(null, "tokyo", reportMorning)).toBe(true);
  });
});

describe("state migration", () => {
  it("defaults to no city, no weather and notifications off", () => {
    const s = decodeState(JSON.stringify({ version: 1 }));
    expect(s.weatherCity).toBeNull();
    expect(s.weather).toBeNull();
    expect(s.notifications).toEqual(initialState().notifications);
    expect(s.notifications.enabled).toBe(false);
  });
  it("keeps valid settings and drops invalid or mismatched ones", () => {
    const weather = tokyoWeather();
    const ok = decodeState(
      JSON.stringify({
        version: 1,
        weatherCity: "tokyo",
        weather,
        notifications: { enabled: true, tripLeadMinutes: 30 },
      }),
    );
    expect(ok.weather?.temperature).toBe(20.6);
    expect(ok.notifications).toEqual({ enabled: true, tripLeadMinutes: 30 });
    const bad = decodeState(
      JSON.stringify({
        version: 1,
        weatherCity: "osaka",
        weather,
        notifications: { enabled: "yes", tripLeadMinutes: 45 },
      }),
    );
    expect(bad.weatherCity).toBe("osaka");
    expect(bad.weather).toBeNull();
    expect(bad.notifications.enabled).toBe(false);
    expect(
      decodeState(JSON.stringify({ version: 1, weatherCity: "seoul" }))
        .weatherCity,
    ).toBeNull();
  });
});
