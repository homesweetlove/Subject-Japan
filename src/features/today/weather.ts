import type { ComponentProps } from "react";
import type Ionicons from "@expo/vector-icons/Ionicons";
import { JMA_WEATHER } from "./jmaCodes";

type IconName = ComponentProps<typeof Ionicons>["name"];

/**
 * Japan Meteorological Agency (気象庁) open data: free, including commercial use,
 * with attribution under the JMA website terms (compatible with CC BY 4.0).
 * Requests only name a fixed forecast office and observation station for the
 * city the user picked; the device location is never sent.
 */
export const weatherCities = [
  {
    id: "tokyo",
    name: "도쿄",
    office: "130000",
    area: "130010",
    point: "44132",
  },
  {
    id: "osaka",
    name: "오사카",
    office: "270000",
    area: "270000",
    point: "62078",
  },
  {
    id: "kyoto",
    name: "교토",
    office: "260000",
    area: "260010",
    point: "61286",
  },
  {
    id: "fukuoka",
    name: "후쿠오카",
    office: "400000",
    area: "400010",
    point: "82182",
  },
  {
    id: "sapporo",
    name: "삿포로",
    office: "016000",
    area: "016010",
    point: "14163",
  },
  {
    id: "nagoya",
    name: "나고야",
    office: "230000",
    area: "230010",
    point: "51106",
  },
  {
    id: "okinawa",
    name: "오키나와",
    office: "471000",
    area: "471010",
    point: "91197",
  },
  {
    id: "yokohama",
    name: "요코하마",
    office: "140000",
    area: "140010",
    point: "46106",
  },
] as const;
export type WeatherCity = (typeof weatherCities)[number];
export type WeatherCityId = WeatherCity["id"];
export const isWeatherCity = (v: unknown): v is WeatherCityId =>
  weatherCities.some((c) => c.id === v);
const cityOf = (id: WeatherCityId) => weatherCities.find((c) => c.id === id)!;

export interface WeatherDay {
  date: string;
  max: number | null;
  min: number | null;
  rainChance: number | null;
  /** JMA 3-digit weather (telop) code. */
  code: number;
}
export interface WeatherSnapshot {
  source: "JMA";
  cityId: WeatherCityId;
  fetchedAt: number;
  /** Latest AMeDAS observation, when the station reported one. */
  temperature: number | null;
  observedAt: string | null;
  days: WeatherDay[];
}

export const WEATHER_TTL_MS = 30 * 60 * 1000;
export const WEATHER_ATTRIBUTION =
  "출처: 気象庁ホームページ (일본 기상청 데이터를 가공해 표시)";
const BASE = "https://www.jma.go.jp/bosai";

const isTemp = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v > -60 && v < 60;
const isCode = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v in JMA_WEATHER;
const nullable = (v: unknown, ok: (x: unknown) => boolean) =>
  v === null || ok(v);
const isChance = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100;

export function validWeather(value: unknown): value is WeatherSnapshot {
  const w = value as WeatherSnapshot;
  return (
    !!w &&
    w.source === "JMA" &&
    isWeatherCity(w.cityId) &&
    Number.isFinite(w.fetchedAt) &&
    w.fetchedAt > 0 &&
    nullable(w.temperature, isTemp) &&
    (w.observedAt === null ||
      (typeof w.observedAt === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(w.observedAt))) &&
    Array.isArray(w.days) &&
    w.days.length > 0 &&
    w.days.length <= 3 &&
    w.days.every(
      (d) =>
        !!d &&
        typeof d.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(d.date) &&
        nullable(d.max, isTemp) &&
        nullable(d.min, isTemp) &&
        nullable(d.rainChance, isChance) &&
        isCode(d.code),
    )
  );
}

const jstDate = (ms: number) =>
  new Date(ms + 9 * 3600000).toISOString().slice(0, 10);
const num = (v: unknown) =>
  typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : null;
type Series = {
  timeDefines?: unknown[];
  areas?: { area?: { code?: string }; [k: string]: unknown }[];
};
const areaOf = (s: Series | undefined, code: string) =>
  s?.areas?.find((a) => a.area?.code === code);
const defs = (s: Series | undefined) =>
  (s?.timeDefines ?? []).map((t) => (typeof t === "string" ? t : ""));

/**
 * Merges the short-term forecast (today/tomorrow, 6-hour rain chance) with the
 * weekly forecast (later days) into three daily summaries starting today (JST).
 */
export function parseJmaForecast(
  json: unknown,
  cityId: WeatherCityId,
  now = Date.now(),
): WeatherDay[] {
  if (!Array.isArray(json) || !json.length)
    throw new Error("날씨 응답을 확인할 수 없어요.");
  const city = cityOf(cityId);
  const short = (json[0] as { timeSeries?: Series[] })?.timeSeries ?? [];
  const week = (json[1] as { timeSeries?: Series[] } | undefined)?.timeSeries;
  const [sCodes, sPops, sTemps] = short;
  const codeArea = areaOf(sCodes, city.area);
  const popArea = areaOf(sPops, city.area);
  const tempArea = areaOf(sTemps, city.point);
  const weekArea = week?.[0]?.areas?.[0];
  const weekTemp = areaOf(week?.[1], city.point);
  const today = jstDate(now);
  const dates = [0, 1, 2].map((i) => jstDate(now + i * 86400000));
  const days = dates.map((date): WeatherDay | null => {
    const at = (s: Series | undefined, i: number) => defs(s)[i]?.slice(0, 10);
    const pick = (s: Series | undefined, a: unknown, key: string) => {
      const values = (a as Record<string, unknown[]> | undefined)?.[key] ?? [];
      return values.filter((_, i) => at(s, i) === date);
    };
    const code =
      num(pick(sCodes, codeArea, "weatherCodes")[0]) ??
      num(pick(week?.[0], weekArea, "weatherCodes")[0]);
    if (code === null || !(code in JMA_WEATHER)) return null;
    const pops = pick(sPops, popArea, "pops")
      .map(num)
      .filter((p): p is number => p !== null);
    const weekPop = num(pick(week?.[0], weekArea, "pops")[0]);
    // Short-term temps: the 00:00 slot is the morning low, 09:00 the daytime high.
    const tIdx = defs(sTemps)
      .map((t, i) => [t, i] as const)
      .filter(([t]) => t.slice(0, 10) === date);
    const tAt = (hour: string) => {
      const hit = tIdx.find(([t]) => t.slice(11, 13) === hour);
      return hit ? num((tempArea?.temps as unknown[])?.[hit[1]]) : null;
    };
    let max = tAt("09") ?? num(pick(week?.[1], weekTemp, "tempsMax")[0]);
    let min = tAt("00") ?? num(pick(week?.[1], weekTemp, "tempsMin")[0]);
    // After the morning, JMA repeats the high in today's low slot; hide it.
    if (date === today && min !== null && min === max) min = null;
    if (max !== null && !isTemp(max)) max = null;
    if (min !== null && !isTemp(min)) min = null;
    return {
      date,
      code,
      max,
      min,
      rainChance: pops.length ? Math.max(...pops) : weekPop,
    };
  });
  if (!days[0]) throw new Error("오늘 날씨 예보를 찾지 못했어요.");
  const result: WeatherDay[] = [];
  for (const d of days) {
    if (!d) break;
    if (d.rainChance !== null && !isChance(d.rainChance)) d.rainChance = null;
    result.push(d);
  }
  return result;
}

/** Latest valid temperature from an AMeDAS 3-hour point file. */
export function parseAmedas(
  json: unknown,
): { temperature: number; observedAt: string } | null {
  if (!json || typeof json !== "object") return null;
  const entries = Object.entries(json as Record<string, { temp?: unknown }>)
    .filter(([k]) => /^\d{14}$/.test(k))
    .sort(([a], [b]) => (a < b ? 1 : -1));
  for (const [k, v] of entries) {
    const t = Array.isArray(v?.temp) ? v.temp : null;
    // Second element is the quality flag; 0 means a normal observation.
    if (t && isTemp(t[0]) && t[1] === 0)
      return {
        temperature: t[0],
        observedAt: `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}T${k.slice(8, 10)}:${k.slice(10, 12)}`,
      };
  }
  return null;
}

export const forecastUrl = (cityId: WeatherCityId) =>
  `${BASE}/forecast/data/forecast/${cityOf(cityId).office}.json`;
export function amedasUrl(cityId: WeatherCityId, latestTime: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):/.exec(latestTime.trim());
  if (!m) throw new Error("관측 시각을 확인할 수 없어요.");
  const block = String(Math.floor(Number(m[4]) / 3) * 3).padStart(2, "0");
  return `${BASE}/amedas/data/point/${cityOf(cityId).point}/${m[1]}${m[2]}${m[3]}_${block}.json`;
}

async function getJson(url: string, signal?: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw e;
    throw new Error("기상청 서버에 연결하지 못했어요.");
  }
  if (!response.ok) throw new Error("기상청 서버가 응답하지 않아요.");
  return response;
}

export async function fetchWeather(
  cityId: WeatherCityId,
  signal?: AbortSignal,
  now = Date.now(),
): Promise<WeatherSnapshot> {
  const [forecast, observation] = await Promise.all([
    getJson(forecastUrl(cityId), signal).then((r) => r.json()),
    // The current reading is optional; the forecast alone is still useful.
    getJson(`${BASE}/amedas/data/latest_time.txt`, signal)
      .then((r) => r.text())
      .then((t) => getJson(amedasUrl(cityId, t), signal))
      .then((r) => r.json())
      .then(parseAmedas)
      .catch((e) => {
        if (e instanceof Error && e.name === "AbortError") throw e;
        return null;
      }),
  ]);
  const snapshot: WeatherSnapshot = {
    source: "JMA",
    cityId,
    fetchedAt: now,
    temperature: observation?.temperature ?? null,
    observedAt: observation?.observedAt ?? null,
    days: parseJmaForecast(forecast, cityId, now),
  };
  if (!validWeather(snapshot)) throw new Error("날씨 응답을 확인할 수 없어요.");
  return snapshot;
}

export const isWeatherStale = (
  w: WeatherSnapshot | null,
  cityId: WeatherCityId,
  now = Date.now(),
) =>
  !w ||
  w.cityId !== cityId ||
  now - w.fetchedAt > WEATHER_TTL_MS ||
  w.fetchedAt > now ||
  w.days[0]?.date !== jstDate(now);

export function describeWeather(code: number): {
  label: string;
  icon: IconName;
} {
  const entry = JMA_WEATHER[code];
  if (!entry) return { label: "날씨 정보", icon: "cloud-outline" };
  const [label, category, thunder] = entry;
  const icon: IconName = thunder
    ? "thunderstorm-outline"
    : category === 1
      ? label.includes("흐림")
        ? "partly-sunny-outline"
        : "sunny-outline"
      : category === 2
        ? "cloudy-outline"
        : category === 3
          ? "rainy-outline"
          : "snow-outline";
  return { label, icon };
}
