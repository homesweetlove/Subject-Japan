/**
 * Recent earthquakes from the Japan Meteorological Agency's public feed
 * (www.jma.go.jp/bosai/quake/data/list.json, the data behind the JMA
 * earthquake pages; free, no key). Only a fixed URL is requested; nothing
 * about the user is sent. Results are shown, never stored.
 */
export const QUAKE_LIST_URL =
  "https://www.jma.go.jp/bosai/quake/data/list.json";
export const QUAKE_PAGE_URL = "https://www.jma.go.jp/bosai/map.html#contents=earthquake_map";

export interface Quake {
  /** Origin time, epoch ms. */
  at: number;
  /** Epicentre region name in Japanese, as JMA publishes it. */
  place: string;
  magnitude: number | null;
  /** JMA seismic intensity code: "1".."4", "5-", "5+", "6-", "6+", "7". */
  intensity: string;
}

const INTENSITY_ORDER = ["1", "2", "3", "4", "5-", "5+", "6-", "6+", "7"];

export function intensityRank(code: string): number {
  return INTENSITY_ORDER.indexOf(code);
}

/** Korean reading of the JMA intensity scale (5- is "5약", 5+ is "5강"). */
export function intensityLabel(code: string): string {
  if (code.endsWith("-")) return `${code.slice(0, -1)}약`;
  if (code.endsWith("+")) return `${code.slice(0, -1)}강`;
  return code;
}

/** What a traveller should take from the intensity. */
export function intensityAdvice(code: string): string {
  const rank = intensityRank(code);
  if (rank >= intensityRank("5-"))
    return "강한 흔들림이었어요. 여진에 대비하고 열차 운행 정보와 지자체 안내를 확인하세요.";
  if (rank >= intensityRank("4"))
    return "꽤 흔들렸어요. 열차가 잠시 멈추거나 늦어질 수 있어요.";
  return "약한 흔들림이에요. 일본에서는 자주 있는 일이에요.";
}

/**
 * Domestic quakes that JMA measured an intensity for, newest first, one
 * entry per event. Overseas quakes (no intensity) and bulletins without a
 * place or time are skipped; unexpected shapes never throw.
 */
export function parseQuakes(json: unknown): Quake[] {
  if (!Array.isArray(json)) return [];
  const seen = new Set<string>();
  const list: Quake[] = [];
  for (const raw of json) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const eid = typeof r.eid === "string" ? r.eid : "";
    const intensity = typeof r.maxi === "string" ? r.maxi : "";
    const place = typeof r.anm === "string" ? r.anm : "";
    const at = typeof r.at === "string" ? Date.parse(r.at) : NaN;
    if (!eid || seen.has(eid) || intensityRank(intensity) < 0) continue;
    if (!place || !Number.isFinite(at)) continue;
    const mag = Number(r.mag);
    seen.add(eid);
    list.push({
      at,
      place,
      magnitude: Number.isFinite(mag) && mag > 0 ? mag : null,
      intensity,
    });
  }
  return list.sort((a, b) => b.at - a.at);
}

/**
 * The quake worth showing on Today: the strongest of the last 24 hours at
 * intensity 3 or more, otherwise null (the card then says it was quiet).
 */
export function notableQuake(
  quakes: Quake[],
  now = Date.now(),
): Quake | null {
  const recent = quakes.filter(
    (q) => now - q.at <= 24 * 3600000 && q.at <= now + 60000,
  );
  const strong = recent.filter(
    (q) => intensityRank(q.intensity) >= intensityRank("3"),
  );
  if (!strong.length) return null;
  return strong.reduce((best, q) =>
    intensityRank(q.intensity) > intensityRank(best.intensity) ||
    (q.intensity === best.intensity && q.at > best.at)
      ? q
      : best,
  );
}

export async function fetchQuakes(signal?: AbortSignal): Promise<Quake[]> {
  let response: Response;
  try {
    response = await fetch(QUAKE_LIST_URL, { signal });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw e;
    throw new Error("기상청 지진 정보에 연결하지 못했어요.");
  }
  if (!response.ok) throw new Error("기상청 지진 정보가 응답하지 않아요.");
  return parseQuakes(await response.json());
}
