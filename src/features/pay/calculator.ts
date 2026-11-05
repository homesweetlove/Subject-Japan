export interface ExchangeRate {
  krwPer100Jpy: number;
  date: string;
  fetchedAt: number;
  source: "manual" | "Frankfurter";
  /** US dollars per yen from the same rate server, for Korea's $800 limit. */
  usdPerJpy?: number;
  /** Day of the dollar rate (it may be older than a later manual won rate). */
  usdDate?: string;
}
/** Plausible USD per JPY (about 50 to 400 yen per dollar). */
export const USD_PER_JPY_RANGE = [1 / 400, 1 / 50] as const;
const validUsd = (v: unknown) =>
  typeof v === "number" &&
  Number.isFinite(v) &&
  v >= USD_PER_JPY_RANGE[0] &&
  v <= USD_PER_JPY_RANGE[1];
export interface PaymentInput {
  price: number;
  includesTax: boolean;
  taxRate: number;
  discount: number;
  coupon: number;
  stackConfirmed: boolean;
  taxMode: "none" | "immediate" | "refund";
  refundFee: number;
  cardFee: number;
  cashback: number;
  cashbackCap: number | null;
  krwPer100Jpy: number;
}
export function calculatePayment(i: PaymentInput) {
  const percentages = [
    i.discount,
    i.coupon,
    i.refundFee,
    i.cardFee,
    i.cashback,
  ];
  if (
    !Number.isFinite(i.price) ||
    i.price <= 0 ||
    i.price > 100000000 ||
    ![0, 8, 10].includes(i.taxRate) ||
    percentages.some((n) => !Number.isFinite(n) || n < 0 || n > 100) ||
    !Number.isFinite(i.krwPer100Jpy) ||
    i.krwPer100Jpy <= 0 ||
    i.krwPer100Jpy > 100000 ||
    (i.cashbackCap !== null &&
      (!Number.isFinite(i.cashbackCap) ||
        i.cashbackCap < 0 ||
        i.cashbackCap > 100000000))
  )
    throw new Error(
      "금액·환율은 양수, 할인율·수수료는 0~100%로 입력해 주세요.",
    );
  if (i.discount > 0 && i.coupon > 0 && !i.stackConfirmed)
    throw new Error("두 할인을 함께 쓸 수 있는지 확인해 주세요.");
  if (!["none", "immediate", "refund"].includes(i.taxMode))
    throw new Error("면세 방식을 확인해 주세요.");
  const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const gross = round(i.price * (i.includesTax ? 1 : 1 + i.taxRate / 100));
  const discounted = round(
    gross * (1 - i.discount / 100) * (1 - i.coupon / 100),
  );
  const tax = round(discounted - discounted / (1 + i.taxRate / 100));
  const refund =
    i.taxMode === "none" ? 0 : round(tax * (1 - i.refundFee / 100));
  const paid = round(discounted - (i.taxMode === "immediate" ? refund : 0));
  const laterRefund = i.taxMode === "refund" ? refund : 0;
  const fee = round((paid * i.cardFee) / 100);
  // Cashback is based on retained purchase cost, not tax subsequently refunded.
  const cashback = round(
    Math.min(
      ((paid - laterRefund) * i.cashback) / 100,
      i.cashbackCap ?? Infinity,
    ),
  );
  const final = round(paid + fee - laterRefund - cashback);
  return {
    gross,
    discounted,
    tax,
    refund,
    paid,
    laterRefund,
    fee,
    cashback,
    final,
    krw: Math.round((final * i.krwPer100Jpy) / 100),
  };
}
export function validRate(v: unknown): v is ExchangeRate {
  const r = v as ExchangeRate;
  return (
    !!r &&
    Number.isFinite(r.krwPer100Jpy) &&
    r.krwPer100Jpy > 0 &&
    r.krwPer100Jpy <= 100000 &&
    typeof r.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
    Number.isFinite(r.fetchedAt) &&
    ["manual", "Frankfurter"].includes(r.source) &&
    (r.usdPerJpy === undefined ||
      (validUsd(r.usdPerJpy) &&
        typeof r.usdDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(r.usdDate)))
  );
}
/** Plausible KRW per 100 JPY for server responses; manual input stays wide. */
export const FETCHED_RATE_RANGE = [200, 5000] as const;
export async function fetchRate(signal?: AbortSignal): Promise<ExchangeRate> {
  const response = await fetch(
    "https://api.frankfurter.dev/v2/rates?base=JPY&quotes=KRW,USD",
    { signal },
  );
  if (!response.ok)
    throw new Error(
      "환율 제공 서버에 연결하지 못했어요. 직접 입력할 수 있어요.",
    );
  const json = await response.json();
  const rate = Array.isArray(json)
    ? json.find((r) => r.base === "JPY" && r.quote === "KRW")
    : null;
  const usd = Array.isArray(json)
    ? json.find((r) => r.base === "JPY" && r.quote === "USD")
    : null;
  const value: ExchangeRate = {
    krwPer100Jpy: rate?.rate * 100,
    date: rate?.date,
    fetchedAt: Date.now(),
    source: "Frankfurter",
    // The dollar rate is optional: a missing or odd value never blocks KRW.
    ...(validUsd(usd?.rate) &&
    typeof usd.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(usd.date)
      ? { usdPerJpy: usd.rate, usdDate: usd.date }
      : {}),
  };
  // A compromised or buggy upstream must not silently skew every price.
  if (
    !validRate(value) ||
    value.krwPer100Jpy < FETCHED_RATE_RANGE[0] ||
    value.krwPer100Jpy > FETCHED_RATE_RANGE[1]
  )
    throw new Error("환율 응답을 확인할 수 없어요.");
  return value;
}

export const RATE_TTL_MS = 6 * 3600 * 1000; // 6 hours

export function isRateStale(
  rate: ExchangeRate | null,
  maxAgeMs = RATE_TTL_MS,
  now = Date.now(),
): boolean {
  if (!rate || !rate.fetchedAt) return true;
  return now - rate.fetchedAt > maxAgeMs || rate.fetchedAt > now;
}

export function formatRateAge(fetchedAt: number, now = Date.now()): string {
  const diffMs = Math.max(0, now - fetchedAt);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

export const QUICK_CONVERSION_AMOUNTS = [
  100, 500, 1000, 3000, 5000, 10000, 30000, 50000,
];

export function quickConversions(
  krwPer100Jpy: number,
): { jpy: number; krw: number }[] {
  if (!Number.isFinite(krwPer100Jpy) || krwPer100Jpy <= 0) return [];
  return QUICK_CONVERSION_AMOUNTS.map((jpy) => ({
    jpy,
    krw: Math.round((jpy * krwPer100Jpy) / 100),
  }));
}
