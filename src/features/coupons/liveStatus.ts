declare const process: {
  env: Record<string, string | undefined>;
};

export type RemoteSourceState = "fresh" | "stale";

export interface CouponSourceStatus {
  sourceId: string;
  state: RemoteSourceState;
  checkedAt: string | null;
  lastSuccessfulAt: string | null;
  changed: boolean;
}

interface ApiSourceStatus {
  id?: unknown;
  status?: unknown;
  checkedAt?: unknown;
  lastSuccessfulAt?: unknown;
  changed?: unknown;
}

const couponSourceIds: Record<string, string> = {
  "donki-visitor": "donki-coupon",
  "takashimaya-shoppers": "takashimaya-shoppers",
  "daimaru-tokyo": "daimaru-tokyo",
  "uniqlo-new-app": "uniqlo-coupon",
  "mcdonalds-app": "mcdonalds-coupon",
  "starbucks-personal-cup": "starbucks-cup",
  "satudora-taxfree": "satudora-taxfree",
  "biccamera-livejapan": "biccamera-livejapan",
  "edion-taxfree": "edion-taxfree",
  "sugi-taxfree": "sugi-taxfree",
  "hankyu-guest": "hankyu-service",
  "hankyu-vip": "hankyu-service",
  "mistore-rewards": "mistore-rewards",
};

const DEFAULT_DATA_API_BASE = "https://subject-japan-data.vercel.app";

export function dataApiBase(): string {
  const raw = process.env.EXPO_PUBLIC_SUBJECT_JAPAN_API_BASE?.trim();
  const value = raw || DEFAULT_DATA_API_BASE;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return "";
    return url.origin + url.pathname.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

export function parseCouponSourceStatuses(
  value: unknown,
  now = Date.now(),
): Record<string, CouponSourceStatus> {
  const payload = value as { items?: unknown };
  if (!payload || !Array.isArray(payload.items)) throw new Error("출처 확인 응답 형식이 올바르지 않아요.");
  const bySource: Record<string, CouponSourceStatus> = {};
  for (const raw of payload.items as ApiSourceStatus[]) {
    if (
      typeof raw?.id !== "string" ||
      (raw.status !== "fresh" && raw.status !== "stale")
    ) {
      continue;
    }
    // Collectors run every three hours. A stalled deployment can still serve "fresh".
    const last = Date.parse(stringOrNull(raw.lastSuccessfulAt) ?? stringOrNull(raw.checkedAt) ?? "");
    const recent = Number.isFinite(last) && last <= now && now - last <= 24 * 3600000;
    bySource[raw.id] = {
      sourceId: raw.id,
      state: recent ? raw.status : "stale",
      checkedAt: stringOrNull(raw.checkedAt),
      lastSuccessfulAt: stringOrNull(raw.lastSuccessfulAt),
      changed: raw.changed === true,
    };
  }
  const byCoupon: Record<string, CouponSourceStatus> = {};
  for (const [couponId, sourceId] of Object.entries(couponSourceIds)) {
    const status = bySource[sourceId];
    if (status) byCoupon[couponId] = status;
  }
  return byCoupon;
}

export async function fetchCouponSourceStatuses(
  signal?: AbortSignal,
  base = dataApiBase(),
): Promise<Record<string, CouponSourceStatus>> {
  if (!base) return {};
  const response = await fetch(`${base}/v1/source-status`, {
    signal,
    headers: { "X-Subject-Japan-App-Version": "0.1.0" },
  });
  if (!response.ok) throw new Error("혜택 최신 확인 서버가 응답하지 않아요.");
  return parseCouponSourceStatuses(await response.json());
}

export function couponSourceStatusLabel(
  status: CouponSourceStatus | undefined,
) {
  if (!status) return null;
  if (status.changed) return "공식 페이지 변경 감지 · 조건 재확인";
  if (status.state === "stale") return "자동 확인 지연 · 공식 페이지 확인 권장";
  return "공식 페이지 자동 확인됨";
}

export function formatRemoteCheckedAt(value: string | null): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  return new Date(time).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
