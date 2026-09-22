import { couponCatalog as coupons } from "./catalog";
import { couponStatus } from "./model";
export interface Coordinate {
  latitude: number;
  longitude: number;
}
export interface NearbyStore extends Coordinate {
  id: string;
  name: string;
  distance: number;
  couponIds: string[];
}
const brands: [RegExp, string[]][] = [
  [/ドン.?キホーテ|don.?quijote|donki/i, ["donki-visitor"]],
  [/ビックカメラ|コジマ|bic.?camera|kojima/i, ["biccamera-livejapan"]],
  [/エディオン|edion/i, ["edion-taxfree"]],
  [/スギ薬局|スギドラッグ|sugi/i, ["sugi-taxfree"]],
  [/サツドラ|satudora/i, ["satudora-taxfree"]],
  [/ユニクロ|uniqlo/i, ["uniqlo-new-app"]],
  [/マクドナルド|mcdonald/i, ["mcdonalds-app"]],
  [/スターバックス|starbucks/i, ["starbucks-personal-cup"]],
  [/高島屋|髙島屋|takashimaya/i, ["takashimaya-shoppers"]],
  [/三越|伊勢丹|mitsukoshi|isetan/i, ["mistore-rewards"]],
  [
    /阪急うめだ|阪急百貨店うめだ|hankyu.*umeda/i,
    ["hankyu-guest", "hankyu-vip"],
  ],
  [/大丸東京|daimaru.*tokyo/i, ["daimaru-tokyo"]],
];
export function distanceMeters(a: Coordinate, b: Coordinate) {
  const rad = (n: number) => (n * Math.PI) / 180;
  const dlat = rad(b.latitude - a.latitude),
    dlon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(dlon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export function parseNearby(
  json: unknown,
  origin: Coordinate,
  now = Date.now(),
): NearbyStore[] {
  const elements = (json as { elements?: unknown[] })?.elements;
  if (!Array.isArray(elements))
    throw new Error("주변 매장 응답을 읽지 못했어요.");
  return elements
    .flatMap((v): NearbyStore[] => {
      if (!v || typeof v !== "object") return [];
      const e = v as {
        type?: string;
        id?: number;
        lat?: number;
        lon?: number;
        center?: { lat?: number; lon?: number };
        tags?: Record<string, string>;
      };
      const name = e.tags?.name ?? e.tags?.["name:en"] ?? e.tags?.brand ?? "";
      const latitude = e.lat ?? e.center?.lat,
        longitude = e.lon ?? e.center?.lon;
      if (
        typeof name !== "string" ||
        name.length > 200 ||
        typeof latitude !== "number" ||
        typeof longitude !== "number" ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        Math.abs(latitude) > 90 ||
        Math.abs(longitude) > 180 ||
        !Number.isSafeInteger(e.id) ||
        !["node", "way", "relation"].includes(e.type ?? "")
      )
        return [];
      const couponIds = [
        ...new Set(
          brands
            .filter(([re]) => re.test(`${name} ${e.tags?.brand ?? ""}`))
            .flatMap(([, ids]) => ids),
        ),
      ].filter((id) =>
        coupons.some((c) => c.id === id && couponStatus(c, now) !== "expired"),
      );
      const distance = distanceMeters(origin, { latitude, longitude });
      return couponIds.length && distance <= 2100
        ? [
            {
              id: `${e.type}-${e.id}`,
              name,
              latitude,
              longitude,
              distance,
              couponIds,
            },
          ]
        : [];
    })
    .filter(
      (s, i, a) =>
        a.findIndex((x) => x.name === s.name && distanceMeters(x, s) < 50) ===
        i,
    )
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 40);
}
export async function findNearby(origin: Coordinate, signal: AbortSignal) {
  if (
    !Number.isFinite(origin.latitude) ||
    !Number.isFinite(origin.longitude) ||
    origin.latitude < 20 ||
    origin.latitude > 46 ||
    origin.longitude < 122 ||
    origin.longitude > 154
  )
    throw new Error("일본 안에서 주변 매장을 검색할 수 있어요.");
  // Explicit request only; coarse coordinates (~110 m), no user identifiers or background updates.
  const lat = origin.latitude.toFixed(3),
    lon = origin.longitude.toFixed(3);
  const query = `[out:json][timeout:20];nwr(around:2000,${lat},${lon})["name"~"ドン|ビックカメラ|コジマ|エディオン|スギ|サツドラ|ユニクロ|マクドナルド|スターバックス|高島屋|髙島屋|三越|伊勢丹|阪急|大丸|Don|Bic|Kojima|Edion|Sugi|Satudora|Uniqlo|McDonald|Starbucks|Takashimaya|Mitsukoshi|Isetan|Hankyu|Daimaru",i];out center tags 100;`;
  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
    signal,
  });
  if (!response.ok)
    throw new Error(
      "주변 매장 서버가 응답하지 않아요. 잠시 후 다시 시도해 주세요.",
    );
  return parseNearby(await response.json(), origin);
}
